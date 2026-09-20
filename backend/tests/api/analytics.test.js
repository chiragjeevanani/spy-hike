import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Trek from '../../src/models/Trek.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

let userSeq = 0;
async function customerToken(email) {
  const e = email || `hiker-analytics-${Date.now()}-${userSeq++}@example.com`;
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email: e, password: 'pass1234' });
  return reg.body.token;
}
async function approvedOrganizerToken(email) {
  const e = email || `org-analytics-${Date.now()}-${userSeq++}@example.com`;
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({ name: 'Org', email: e, password: 'pass1234', agencyName: 'Peak Guides', socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
  await User.findByIdAndUpdate(reg.body.account.id, { 'organizer.isApproved': true, 'organizer.isPendingApproval': false });
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email: e, password: 'pass1234' });
  return login.body.token;
}
async function adminToken() {
  await Admin.findOneAndUpdate(
    { email: 'admin@findyourtrek.com' },
    { name: 'Admin', email: 'admin@findyourtrek.com', passwordHash: await hashPassword('admin123') },
    { upsert: true, new: true },
  );
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}
async function makeTrip(orgToken, over = {}) {
  const rand = Math.random().toString(36).slice(2, 7);
  const trek = await Trek.create({
    _id: `analytics-trek-${Date.now()}-${rand}`,
    title: `Analytics Trek ${rand}`, location: 'Manali', state: 'Himachal Pradesh', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send({
    trekId: trek._id,
    pricingTiers: [{ label: 'Solo', price: 1000 }], pickup: { location: 'Manali', price: 0 },
    startPoint: { lat: 32.2, lng: 77.1, label: 'Base' }, departureDates: ['2026-08-01'],
    maxGroupSize: 10, availableSeats: 10, category: 'Trekking', status: 'Published', ...over,
  });
  return res.body.trip;
}

describe('Admin analytics', () => {
  it('requires an admin (403 for others)', async () => {
    const cust = await customerToken();
    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${cust}`);
    expect(res.status).toBe(403);
  });

  it('reports GMV, commission and counts from real data', async () => {
    const admin = await adminToken();
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust}`).send({ tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 2 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }, { name: 'Traveler Two', age: 28, gender: 'Female', emergencyContact: '9876543211' }] });

    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    // 2 Solo = 2000 base, tax-inclusive → 2000 GMV; commission 10% = 200.
    expect(res.body.overview.gmv).toBe(2000);
    expect(res.body.overview.commission).toBe(200);
    expect(res.body.overview.bookings).toBe(1);
    expect(res.body.overview.trips).toBe(1);
    expect(res.body.overview.users).toBeGreaterThanOrEqual(1);
    expect(res.body.overview.pendingOrgs).toBe(0);
  });

  it('excludes cancelled bookings from GMV and reflects them in the status chart', async () => {
    const admin = await adminToken();
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const b = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust}`).send({ tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    await request(app).post(`/api/v1/bookings/${b.body.booking.bookingId}/cancel`).set('Authorization', `Bearer ${cust}`);

    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.body.overview.gmv).toBe(0); // the only booking was cancelled
    const cancelled = res.body.bookingStatus.find((s) => s.name === 'Cancelled');
    expect(cancelled.value).toBe(1);
  });

  it('surfaces a pending organizer in the overview', async () => {
    const admin = await adminToken();
    await request(app).post('/api/v1/auth/organizer/register').send({ name: 'Pending', email: `pending-${Date.now()}@example.com`, password: 'pass1234', agencyName: 'Newbie', socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.body.overview.pendingOrgs).toBe(1);
  });

  it('ranks top organizers by revenue and buckets trips by category', async () => {
    const admin = await adminToken();
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org, { category: 'Camping' });
    await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust}`).send({ tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });

    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.body.topOrganizers[0].revenue).toBeGreaterThan(0);
    expect(res.body.categoryDist.find((c) => c.name === 'Camping').value).toBe(1);
    expect(res.body.revenueTrend).toHaveLength(6);
  });
});
