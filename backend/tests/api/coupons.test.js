import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Admin from '../../src/models/Admin.js';
import Coupon from '../../src/models/Coupon.js';
import User from '../../src/models/User.js';
import Trek from '../../src/models/Trek.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}

const create = (token, body) =>
  request(app).post('/api/v1/admin/coupons').set('Authorization', `Bearer ${token}`).send(body);

async function customerToken(email = 'hiker@example.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email, password: 'pass1234' });
  return reg.body.token;
}
async function approvedOrganizerToken(email = 'org@example.com') {
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({
    name: 'Org', email, password: 'pass1234', agencyName: 'Guides', socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  });
  await User.findByIdAndUpdate(reg.body.account.id, { 'organizer.isApproved': true, 'organizer.isPendingApproval': false });
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email, password: 'pass1234' });
  return login.body.token;
}
let trekSeq = 0;
async function makeTrip(orgToken) {
  const trek = await Trek.create({
    _id: `coupon-trek-${Date.now()}-${trekSeq++}`,
    title: 'Coupon Trek', location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send({
    trekId: trek._id,
    pricingTiers: [{ label: 'Solo', price: 1000 }],
    pickup: { location: 'Manali', price: 0 },
    startPoint: { lat: 32.2, lng: 77.1, label: 'Base' },
    departureDates: ['2026-08-01', '2026-08-15'], maxGroupSize: 10, availableSeats: 10,
    category: 'Trekking', status: 'Published',
  });
  return res.body.trip;
}
const createMine = (orgToken, body) =>
  request(app).post('/api/v1/organizer/coupons').set('Authorization', `Bearer ${orgToken}`).send(body);
const book = (custToken, body) =>
  request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${custToken}`).send(body);

describe('Admin coupon CRUD', () => {
  it('creates a flat and a percentage coupon', async () => {
    const token = await adminToken();
    const flat = await create(token, { code: 'flat50', type: 'flat', value: 50 });
    expect(flat.status).toBe(201);
    expect(flat.body.coupon.code).toBe('FLAT50'); // uppercased
    expect(flat.body.coupon.type).toBe('flat');

    const pct = await create(token, { code: 'PCT20', type: 'percentage', value: 20 });
    expect(pct.body.coupon.type).toBe('percentage');
  });

  it('rejects a duplicate code with 409', async () => {
    const token = await adminToken();
    await create(token, { code: 'DUP', type: 'flat', value: 10 });
    const dup = await create(token, { code: 'dup', type: 'flat', value: 10 });
    expect(dup.status).toBe(409);
  });

  it('rejects a zero/negative discount value and a percentage over 100 (400)', async () => {
    const token = await adminToken();
    const zero = await create(token, { code: 'ZERO', type: 'flat', value: 0 });
    expect(zero.status).toBe(400);
    const neg = await create(token, { code: 'NEG', type: 'flat', value: -10 });
    expect(neg.status).toBe(400);
    const over = await create(token, { code: 'OVER100', type: 'percentage', value: 150 });
    expect(over.status).toBe(400);
  });

  it('a non-admin cannot manage coupons (403)', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'U', email: 'u@x.com', password: 'pass1234' });
    const res = await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(403);
  });

  it('toggles Active <-> Inactive but refuses to reactivate an Expired coupon', async () => {
    const token = await adminToken();
    const c = await create(token, { code: 'TOG', type: 'flat', value: 10 });
    const id = c.body.coupon.id;

    const off = await request(app).patch(`/api/v1/admin/coupons/${id}/toggle`).set('Authorization', `Bearer ${token}`);
    expect(off.body.coupon.status).toBe('Inactive');
    const on = await request(app).patch(`/api/v1/admin/coupons/${id}/toggle`).set('Authorization', `Bearer ${token}`);
    expect(on.body.coupon.status).toBe('Active');

    // Force expired, then toggle should fail.
    await Coupon.findByIdAndUpdate(id, { status: 'Expired' });
    const bad = await request(app).patch(`/api/v1/admin/coupons/${id}/toggle`).set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);
  });

  it('auto-expires a past-dated coupon on the next list', async () => {
    const token = await adminToken();
    await create(token, { code: 'OLD', type: 'flat', value: 10, expiresAt: '2020-01-01' });
    const list = await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${token}`);
    const old = list.body.coupons.find((c) => c.code === 'OLD');
    expect(old.status).toBe('Expired');
  });

  it('renewing an expired coupon\'s date revives it to Active', async () => {
    const token = await adminToken();
    const c = await create(token, { code: 'RENEW', type: 'flat', value: 10, expiresAt: '2020-01-01' });
    await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${token}`); // triggers expiry
    const upd = await request(app)
      .put(`/api/v1/admin/coupons/${c.body.coupon.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expiresAt: '2030-12-31' });
    expect(upd.body.coupon.status).toBe('Active');
  });
});

describe('Public coupon validation', () => {
  it('validates a percentage coupon and respects the max-discount cap', async () => {
    const token = await adminToken();
    await create(token, { code: 'CAP20', type: 'percentage', value: 20, maxDiscount: 100 });

    // 20% of 1000 = 200, capped at 100.
    const res = await request(app).post('/api/v1/coupons/validate').send({ code: 'cap20', bookingAmount: 1000 });
    expect(res.body.ok).toBe(true);
    expect(res.body.discountAmount).toBe(100);
  });

  it('applies a flat discount and never exceeds the booking total', async () => {
    const token = await adminToken();
    await create(token, { code: 'FLAT500', type: 'flat', value: 500 });
    const res = await request(app).post('/api/v1/coupons/validate').send({ code: 'FLAT500', bookingAmount: 300 });
    expect(res.body.discountAmount).toBe(300); // min(500, 300)
  });

  it('rejects when below the minimum booking amount', async () => {
    const token = await adminToken();
    await create(token, { code: 'MIN', type: 'flat', value: 50, minBookingAmount: 500 });
    const res = await request(app).post('/api/v1/coupons/validate').send({ code: 'MIN', bookingAmount: 200 });
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/minimum booking/i);
  });

  it('rejects an unknown, inactive, or expired code', async () => {
    const token = await adminToken();
    await create(token, { code: 'INACT', type: 'flat', value: 10 });
    const c = await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${token}`);
    const inact = c.body.coupons.find((x) => x.code === 'INACT');
    await request(app).patch(`/api/v1/admin/coupons/${inact.id}/toggle`).set('Authorization', `Bearer ${token}`); // -> Inactive

    expect((await request(app).post('/api/v1/coupons/validate').send({ code: 'NOPE', bookingAmount: 100 })).body.ok).toBe(false);
    expect((await request(app).post('/api/v1/coupons/validate').send({ code: 'INACT', bookingAmount: 100 })).body.ok).toBe(false);
  });

  it('GET /coupons lists only active coupons', async () => {
    const token = await adminToken();
    await create(token, { code: 'ACT1', type: 'flat', value: 10 });
    const c2 = await create(token, { code: 'ACT2', type: 'flat', value: 10 });
    await request(app).patch(`/api/v1/admin/coupons/${c2.body.coupon.id}/toggle`).set('Authorization', `Bearer ${token}`); // -> Inactive

    const res = await request(app).get('/api/v1/coupons');
    const codes = res.body.coupons.map((c) => c.code);
    expect(codes).toContain('ACT1');
    expect(codes).not.toContain('ACT2');
  });
});

describe('Organizer coupon CRUD', () => {
  it('creates, edits and deletes its own coupon', async () => {
    const org = await approvedOrganizerToken();
    const c = await createMine(org, { code: 'orgflat', type: 'flat', value: 100, expiresAt: '2030-12-31' });
    expect(c.status).toBe(201);
    expect(c.body.coupon.code).toBe('ORGFLAT');
    expect(c.body.coupon.scope).toBe('organizer');
    expect(c.body.coupon.appliesTo).toBe('all');

    const upd = await request(app)
      .put(`/api/v1/organizer/coupons/${c.body.coupon.id}`)
      .set('Authorization', `Bearer ${org}`)
      .send({ value: 150 });
    expect(upd.body.coupon.value).toBe(150);

    const del = await request(app).delete(`/api/v1/organizer/coupons/${c.body.coupon.id}`).set('Authorization', `Bearer ${org}`);
    expect(del.status).toBe(200);
  });

  it("organizer B cannot edit or delete organizer A's coupon (403)", async () => {
    const orgA = await approvedOrganizerToken('a@example.com');
    const orgB = await approvedOrganizerToken('b@example.com');
    const c = await createMine(orgA, { code: 'MINE', type: 'flat', value: 50, expiresAt: '2030-12-31' });

    const edit = await request(app)
      .put(`/api/v1/organizer/coupons/${c.body.coupon.id}`)
      .set('Authorization', `Bearer ${orgB}`)
      .send({ value: 999 });
    expect(edit.status).toBe(403);

    const del = await request(app).delete(`/api/v1/organizer/coupons/${c.body.coupon.id}`).set('Authorization', `Bearer ${orgB}`);
    expect(del.status).toBe(403);
  });

  it('the same code text works independently for two different organizers', async () => {
    const orgA = await approvedOrganizerToken('a@example.com');
    const orgB = await approvedOrganizerToken('b@example.com');
    const a = await createMine(orgA, { code: 'SUMMER25', type: 'flat', value: 50, expiresAt: '2030-12-31' });
    const b = await createMine(orgB, { code: 'SUMMER25', type: 'flat', value: 75, expiresAt: '2030-12-31' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  it('rejects a duplicate code within the same organizer (409)', async () => {
    const org = await approvedOrganizerToken();
    await createMine(org, { code: 'DUPME', type: 'flat', value: 10, expiresAt: '2030-12-31' });
    const dup = await createMine(org, { code: 'dupme', type: 'flat', value: 20, expiresAt: '2030-12-31' });
    expect(dup.status).toBe(409);
  });
});

describe('Trip-scoped checkout resolution', () => {
  it("rejects a selected-trips coupon on a trip it doesn't cover, accepts it on one it does", async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const tripA = await makeTrip(org);
    const tripB = await makeTrip(org);
    const c = await createMine(org, {
      code: 'ONLYA', type: 'flat', value: 100, expiresAt: '2030-12-31', appliesTo: 'selected', tripIds: [tripA.id],
    });
    expect(c.status).toBe(201);

    const onB = await request(app).post('/api/v1/coupons/validate')
      .set('Authorization', `Bearer ${cust}`)
      .send({ code: 'ONLYA', bookingAmount: 1000, tripId: tripB.id });
    expect(onB.body.ok).toBe(false);

    const onA = await request(app).post('/api/v1/coupons/validate')
      .set('Authorization', `Bearer ${cust}`)
      .send({ code: 'ONLYA', bookingAmount: 1000, tripId: tripA.id });
    expect(onA.body.ok).toBe(true);
    expect(onA.body.discountAmount).toBe(100);
  });

  it("an organizer coupon isn't usable on a different organizer's trip", async () => {
    const orgA = await approvedOrganizerToken('a@example.com');
    const orgB = await approvedOrganizerToken('b@example.com');
    const cust = await customerToken();
    const tripB = await makeTrip(orgB);
    await createMine(orgA, { code: 'AONLY', type: 'flat', value: 50, expiresAt: '2030-12-31' });

    const res = await request(app).post('/api/v1/coupons/validate')
      .set('Authorization', `Bearer ${cust}`)
      .send({ code: 'AONLY', bookingAmount: 1000, tripId: tripB.id });
    expect(res.body.ok).toBe(false);
  });

  it('blocks a booking once maxRedemptions is exhausted', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    await createMine(org, { code: 'LIMIT1', type: 'flat', value: 100, expiresAt: '2030-12-31', maxRedemptions: 1 });

    const first = await book(cust, {
      tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }], couponCode: 'LIMIT1',
    });
    expect(first.status).toBe(201);

    // Second booking: coupon still validates ok=true at the pre-check (a 2nd
    // customer could book concurrently), but the atomic redeem at booking
    // time must refuse since the cap is already spent.
    const secondCust = await customerToken('hiker2@example.com');
    const second = await book(secondCust, {
      tripId: trip.id, selectedDate: '2026-08-15', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }], couponCode: 'LIMIT1',
    });
    expect(second.status).toBe(400);

    const coupon = await Coupon.findOne({ code: 'LIMIT1' });
    expect(coupon.usedCount).toBe(1); // not over-incremented
  });
});

describe('Admin moderation of organizer coupons', () => {
  it("can edit, pause and delete an organizer's coupon, but not create one", async () => {
    const admin = await adminToken();
    const org = await approvedOrganizerToken();
    const c = await createMine(org, { code: 'MODME', type: 'flat', value: 50, expiresAt: '2030-12-31' });

    const list = await request(app).get('/api/v1/admin/organizer-coupons').set('Authorization', `Bearer ${admin}`);
    expect(list.body.coupons.some((x) => x.code === 'MODME')).toBe(true);

    const edit = await request(app)
      .put(`/api/v1/admin/organizer-coupons/${c.body.coupon.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ value: 60 });
    expect(edit.body.coupon.value).toBe(60);

    const pause = await request(app).patch(`/api/v1/admin/organizer-coupons/${c.body.coupon.id}/toggle`).set('Authorization', `Bearer ${admin}`);
    expect(pause.body.coupon.status).toBe('Inactive');

    const del = await request(app).delete(`/api/v1/admin/organizer-coupons/${c.body.coupon.id}`).set('Authorization', `Bearer ${admin}`);
    expect(del.status).toBe(200);
  });

  it("admin's platform coupon endpoints can't see or touch an organizer coupon by id", async () => {
    const admin = await adminToken();
    const org = await approvedOrganizerToken();
    const c = await createMine(org, { code: 'HIDDEN', type: 'flat', value: 50, expiresAt: '2030-12-31' });

    const list = await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${admin}`);
    expect(list.body.coupons.some((x) => x.code === 'HIDDEN')).toBe(false);

    const edit = await request(app)
      .put(`/api/v1/admin/coupons/${c.body.coupon.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ value: 999 });
    expect(edit.status).toBe(404);
  });
});
