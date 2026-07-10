import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Organizer from '../../src/models/Organizer.js';
import Admin from '../../src/models/Admin.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

async function customerToken(email) {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email, password: 'pass1234' });
  return reg.body.token;
}
async function approvedOrganizerToken(email = 'org@example.com') {
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({ name: 'Org', email, password: 'pass1234', agencyName: 'Peak Guides' });
  await Organizer.findByIdAndUpdate(reg.body.account.id, { isApproved: true, isPendingApproval: false });
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email, password: 'pass1234' });
  return login.body.token;
}
async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@trekigo.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@trekigo.com', password: 'admin123' });
  return res.body.token;
}
async function makeTrip(orgToken, over = {}) {
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send({
    name: 'Analytics Trek', location: 'Manali', state: 'Himachal Pradesh',
    pricingTiers: [{ label: 'Solo', price: 1000 }], pickup: { location: 'Manali', price: 0 },
    startPoint: { lat: 32.2, lng: 77.1, label: 'Base' }, departureDates: ['2026-08-01'],
    maxGroupSize: 10, availableSeats: 10, category: 'Trekking', status: 'Published', ...over,
  });
  return res.body.trip;
}

describe('Admin analytics', () => {
  it('requires an admin (403 for others)', async () => {
    const cust = await customerToken('c@example.com');
    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${cust}`);
    expect(res.status).toBe(403);
  });

  it('reports GMV, commission and counts from real data', async () => {
    const admin = await adminToken();
    const org = await approvedOrganizerToken();
    const cust = await customerToken('c@example.com');
    const trip = await makeTrip(org);
    await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust}`).send({ tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 2 }], travelers: [{}, {}] });

    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    // 2 Solo = 2000 base + 5% tax = 2100 GMV; commission 10% = 210.
    expect(res.body.overview.gmv).toBe(2100);
    expect(res.body.overview.commission).toBe(210);
    expect(res.body.overview.bookings).toBe(1);
    expect(res.body.overview.trips).toBe(1);
    expect(res.body.overview.users).toBeGreaterThanOrEqual(1);
    expect(res.body.overview.pendingOrgs).toBe(0);
  });

  it('excludes cancelled bookings from GMV and reflects them in the status chart', async () => {
    const admin = await adminToken();
    const org = await approvedOrganizerToken();
    const cust = await customerToken('c@example.com');
    const trip = await makeTrip(org);
    const b = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust}`).send({ tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] });
    await request(app).post(`/api/v1/bookings/${b.body.booking.bookingId}/cancel`).set('Authorization', `Bearer ${cust}`);

    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.body.overview.gmv).toBe(0); // the only booking was cancelled
    const cancelled = res.body.bookingStatus.find((s) => s.name === 'Cancelled');
    expect(cancelled.value).toBe(1);
  });

  it('surfaces a pending organizer in the overview', async () => {
    const admin = await adminToken();
    await request(app).post('/api/v1/auth/organizer/register').send({ name: 'Pending', email: 'pending@example.com', password: 'pass1234', agencyName: 'Newbie' });
    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.body.overview.pendingOrgs).toBe(1);
  });

  it('ranks top organizers by revenue and buckets trips by category', async () => {
    const admin = await adminToken();
    const org = await approvedOrganizerToken();
    const cust = await customerToken('c@example.com');
    const trip = await makeTrip(org, { category: 'Camping' });
    await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${cust}`).send({ tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] });

    const res = await request(app).get('/api/v1/admin/analytics').set('Authorization', `Bearer ${admin}`);
    expect(res.body.topOrganizers[0].revenue).toBeGreaterThan(0);
    expect(res.body.categoryDist.find((c) => c.name === 'Camping').value).toBe(1);
    expect(res.body.revenueTrend).toHaveLength(6);
  });
});
