import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Trek from '../../src/models/Trek.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

async function customerToken(email = 'hiker@example.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email, password: 'pass1234' });
  return { token: reg.body.token, email };
}
async function approvedOrganizerToken(email = 'org@example.com') {
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({ name: 'Org', email, password: 'pass1234', agencyName: 'Guides', socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
  await User.findByIdAndUpdate(reg.body.account.id, { 'organizer.isApproved': true, 'organizer.isPendingApproval': false });
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email, password: 'pass1234' });
  return login.body.token;
}
async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}
async function makeTrip(orgToken) {
  const rand = Math.random().toString(36).slice(2, 7);
  const trek = await Trek.create({
    _id: `loyalty-trek-${Date.now()}-${rand}`,
    title: `Loyalty Trek ${rand}`, location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send({
    trekId: trek._id,
    pricingTiers: [{ label: 'Solo', price: 1000 }],
    pickup: { location: 'Manali', price: 0 },
    startPoint: { lat: 32.2, lng: 77.1, label: 'Base' },
    departureDates: ['2026-08-01', '2026-08-15', '2026-08-20'], maxGroupSize: 20, availableSeats: 20,
    category: 'Trekking', status: 'Published',
  });
  return res.body.trip;
}
const book = (token, body) => request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${token}`).send(body);
const setConfig = (admin, body) => request(app).patch('/api/v1/admin/loyalty/config').set('Authorization', `Bearer ${admin}`).send(body);

describe('Loyalty config', () => {
  it('serves default config publicly and lets admin update it', async () => {
    const pub = await request(app).get('/api/v1/loyalty/config');
    expect(pub.body.config.customer.thresholdPersons).toBe(30);

    const admin = await adminToken();
    await setConfig(admin, { customer: { thresholdPersons: 5, enabled: true } });
    const after = await request(app).get('/api/v1/loyalty/config');
    expect(after.body.config.customer.thresholdPersons).toBe(5);
  });

  it('rejects an invalid threshold or a negative max discount', async () => {
    const admin = await adminToken();
    const badThreshold = await setConfig(admin, { customer: { thresholdPersons: 0 } });
    expect(badThreshold.status).toBe(400);
    const badDiscount = await setConfig(admin, { customer: { maxDiscountAmount: -50 } });
    expect(badDiscount.status).toBe(400);
    const badOrgThreshold = await setConfig(admin, { organizer: { thresholdBookings: -1 } });
    expect(badOrgThreshold.status).toBe(400);
  });
});

describe('Customer voucher minting & redemption', () => {
  it('mints a voucher once cumulative travelers cross the threshold', async () => {
    const admin = await adminToken();
    await setConfig(admin, { customer: { thresholdPersons: 2, enabled: true } });
    const org = await approvedOrganizerToken();
    const { token, email } = await customerToken();
    const trip = await makeTrip(org);

    await book(token, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 2 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }, { name: 'Traveler Two', age: 28, gender: 'Female', emergencyContact: '9876543211' }] });

    const me = await request(app).get('/api/v1/loyalty/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.vouchers.filter((v) => v.status === 'available')).toHaveLength(1);
    expect(me.body.progress.threshold).toBe(2);
  });

  it('redeems the voucher on the next booking (comped) and consumes it', async () => {
    const admin = await adminToken();
    await setConfig(admin, { customer: { thresholdPersons: 2, enabled: true } });
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);

    await book(token, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 2 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }, { name: 'Traveler Two', age: 28, gender: 'Female', emergencyContact: '9876543211' }] });
    const free = await book(token, {
      tripId: trip.id, selectedDate: '2026-08-15', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
      useLoyaltyReward: true,
    });
    expect(free.status).toBe(201);
    expect(free.body.booking.finalAmount).toBe(0);
    expect(free.body.booking.loyaltyRewardApplied).toBe(true);

    const me = await request(app).get('/api/v1/loyalty/me').set('Authorization', `Bearer ${token}`);
    const used = me.body.vouchers.filter((v) => v.status === 'used');
    expect(used).toHaveLength(1);
    expect(used[0].usedRef).toBe(free.body.booking.bookingId);
  });

  it('resets progress to 0 after a reward is claimed, instead of the lifetime total instantly re-triggering another', async () => {
    const admin = await adminToken();
    await setConfig(admin, { customer: { thresholdPersons: 2, enabled: true } });
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);

    // Cross the threshold (2 travelers) → 1 voucher minted, progress at 2/2.
    await book(token, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 2 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }, { name: 'Traveler Two', age: 28, gender: 'Female', emergencyContact: '9876543211' }] });
    const before = await request(app).get('/api/v1/loyalty/me').set('Authorization', `Bearer ${token}`);
    expect(before.body.progress.count).toBe(2);
    expect(before.body.progress.percent).toBe(100);

    // Claim it (1 traveler, comped) — this alone must NOT count toward the next cycle.
    const free = await book(token, {
      tripId: trip.id, selectedDate: '2026-08-15', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
      useLoyaltyReward: true,
    });
    expect(free.body.booking.finalAmount).toBe(0);

    const rightAfterClaim = await request(app).get('/api/v1/loyalty/me').set('Authorization', `Bearer ${token}`);
    expect(rightAfterClaim.body.progress.count).toBe(0);
    expect(rightAfterClaim.body.progress.percent).toBe(0);
    expect(rightAfterClaim.body.progress.lifetime).toBe(3); // lifetime total keeps climbing…
    expect(rightAfterClaim.body.vouchers.filter((v) => v.status === 'available')).toHaveLength(0); // …but no free re-mint.

    // One more (non-reward) booking of 1 traveler: cycle count should be 1 (not 4),
    // and still no new voucher until the *new* cycle itself crosses the threshold.
    await book(token, { tripId: trip.id, selectedDate: '2026-08-20', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    const after = await request(app).get('/api/v1/loyalty/me').set('Authorization', `Bearer ${token}`);
    expect(after.body.progress.count).toBe(1);
    expect(after.body.progress.lifetime).toBe(4);
    expect(after.body.vouchers.filter((v) => v.status === 'available')).toHaveLength(0);
  });

  it('rejects a loyalty booking when no voucher is available (400)', async () => {
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    const res = await book(token, {
      tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
      useLoyaltyReward: true,
    });
    expect(res.status).toBe(400);
  });
});

describe('Organizer voucher minting & zero-commission redemption', () => {
  it('mints an organizer voucher and applies it to zero a booking\'s commission', async () => {
    const admin = await adminToken();
    await setConfig(admin, { organizer: { thresholdBookings: 1, enabled: true } });
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);

    const created = await book(token, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    const bookingId = created.body.booking.bookingId;
    expect(created.body.booking.commissionAmount).toBeGreaterThan(0);

    // The 1st booking crosses threshold=1 → organizer earns a voucher.
    const loyalty = await request(app).get('/api/v1/organizer/loyalty').set('Authorization', `Bearer ${org}`);
    expect(loyalty.body.vouchers.some((v) => v.status === 'available')).toBe(true);

    const redeem = await request(app)
      .post(`/api/v1/organizer/bookings/${bookingId}/redeem-reward`)
      .set('Authorization', `Bearer ${org}`);
    expect(redeem.status).toBe(200);
    expect(redeem.body.booking.commissionAmount).toBe(0);
    expect(redeem.body.booking.organizerPayout).toBe(redeem.body.booking.finalAmount);

    // Re-applying is rejected.
    const again = await request(app).post(`/api/v1/organizer/bookings/${bookingId}/redeem-reward`).set('Authorization', `Bearer ${org}`);
    expect(again.status).toBe(400);
  });

  it('resets organizer progress to 0 after zero-commission reward is redeemed', async () => {
    const admin = await adminToken();
    await setConfig(admin, { organizer: { thresholdBookings: 1, enabled: true } });
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);

    const created = await book(token, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    const before = await request(app).get('/api/v1/organizer/loyalty').set('Authorization', `Bearer ${org}`);
    expect(before.body.progress.count).toBe(1);

    await request(app)
      .post(`/api/v1/organizer/bookings/${created.body.booking.bookingId}/redeem-reward`)
      .set('Authorization', `Bearer ${org}`);

    const rightAfterClaim = await request(app).get('/api/v1/organizer/loyalty').set('Authorization', `Bearer ${org}`);
    expect(rightAfterClaim.body.progress.count).toBe(0);
    expect(rightAfterClaim.body.progress.lifetime).toBe(1);
    expect(rightAfterClaim.body.vouchers.filter((v) => v.status === 'available')).toHaveLength(0);

    await book(token, { tripId: trip.id, selectedDate: '2026-08-15', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    const after = await request(app).get('/api/v1/organizer/loyalty').set('Authorization', `Bearer ${org}`);
    expect(after.body.progress.count).toBe(1);
    expect(after.body.progress.lifetime).toBe(2);
    expect(after.body.vouchers.filter((v) => v.status === 'available')).toHaveLength(1); // new cycle earned its own voucher
  });

  it('rejects redeem-reward when no organizer voucher is available (400)', async () => {
    const admin = await adminToken();
    await setConfig(admin, { organizer: { thresholdBookings: 1000, enabled: true } });
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    const created = await book(token, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });

    const res = await request(app).post(`/api/v1/organizer/bookings/${created.body.booking.bookingId}/redeem-reward`).set('Authorization', `Bearer ${org}`);
    expect(res.status).toBe(400);
  });
});
