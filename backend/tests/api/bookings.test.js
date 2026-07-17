import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Coupon from '../../src/models/Coupon.js';
import Departure from '../../src/models/Departure.js';
import Trek from '../../src/models/Trek.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

async function customerToken(email = 'hiker@example.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email, password: 'pass1234' });
  return reg.body.token;
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

let trekSeq = 0;
const tripPayload = (trekId, over = {}) => ({
  trekId,
  pricingTiers: [{ label: 'Solo', price: 1000 }, { label: 'Couple', price: 900 }],
  pickup: { location: 'Manali', price: 100 },
  startPoint: { lat: 32.24, lng: 77.18, label: 'Base' },
  departureDates: ['2026-08-01', '2026-08-15'],
  maxGroupSize: 10,
  availableSeats: 5,
  category: 'Trekking',
  status: 'Published',
  ...over,
});

async function makeTrip(orgToken, over) {
  const trek = await Trek.create({
    _id: `booking-trek-${Date.now()}-${trekSeq++}`,
    title: 'Booking Trek', location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(tripPayload(trek._id, over));
  return res.body.trip;
}

const book = (custToken, body) =>
  request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${custToken}`).send(body);

describe('Booking creation & pricing', () => {
  it('computes tiered pricing + pickup add-on + tax + commission and snapshots them', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);

    // 2 Solo: perPerson = 1000 + 100 pickup = 1100; base = 2200.
    // tax = 5% of 2200 = 110; final = 2310; commission 10% = 231; payout 2079.
    const res = await book(cust, {
      tripId: trip.id,
      selectedDate: '2026-08-01',
      selections: [{ label: 'Solo', count: 2 }],
      travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }, { name: 'Traveler Two', age: 28, gender: 'Female', emergencyContact: '9876543211' }],
    });
    expect(res.status).toBe(201);
    const b = res.body.booking;
    expect(b.travelersCount).toBe(2);
    expect(b.baseCost).toBe(2200);
    expect(b.taxAmount).toBe(110);
    expect(b.finalAmount).toBe(2310);
    expect(b.commissionRate).toBe(10);
    expect(b.commissionAmount).toBe(231);
    expect(b.organizerPayout).toBe(2079);
    expect(b.bookingId).toMatch(/^TG-\d{4}-[A-Z]$/);
  });

  it('applies a coupon and increments its usedCount', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    await Coupon.create({ _id: 'cp-x', code: 'SAVE10', type: 'percentage', value: 10, status: 'Active' });

    const res = await book(cust, {
      tripId: trip.id, selectedDate: '2026-08-01',
      selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
      couponCode: 'SAVE10',
    });
    // base = 1100; discount 10% = 110; taxable 990; tax 49.5; final 1039.5.
    expect(res.body.booking.couponUsed).toBe('SAVE10');
    expect(res.body.booking.couponDiscount).toBe(110);
    expect(res.body.booking.finalAmount).toBe(1039.5);
    const coupon = await Coupon.findById('cp-x');
    expect(coupon.usedCount).toBe(1);
  });

  it('decrements the departure seats by the number of travelers', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org); // 5 seats/departure
    await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 2 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }, { name: 'Traveler Two', age: 28, gender: 'Female', emergencyContact: '9876543211' }] });
    const dep = await Departure.findOne({ tripId: trip.id, date: '2026-08-01' });
    expect(dep.availableSeats).toBe(3);
  });

  it('blocks overbooking a departure (409) and leaves seats intact', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org); // 5 seats
    const res = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 6 }], travelers: [] });
    expect(res.status).toBe(409);
    const dep = await Departure.findOne({ tripId: trip.id, date: '2026-08-01' });
    expect(dep.availableSeats).toBe(5); // untouched
  });

  it('rejects a booking whose travelers count does not match the selection (400), releasing the seats', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const res = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 2 }], travelers: [{ name: 'Solo Traveler', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    expect(res.status).toBe(400);
    const dep = await Departure.findOne({ tripId: trip.id, date: '2026-08-01' });
    expect(dep.availableSeats).toBe(5); // reserved seats were released
  });

  it.each([
    ['missing name', { name: '', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
    ['out-of-range age', { name: 'A', age: 5, gender: 'Male', emergencyContact: '9876543210' }],
    ['missing gender', { name: 'A', age: 25, gender: '', emergencyContact: '9876543210' }],
    ['bad emergency contact', { name: 'A', age: 25, gender: 'Male', emergencyContact: '123' }],
  ])('rejects a traveler with %s (400)', async (_label, traveler) => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const res = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [traveler] });
    expect(res.status).toBe(400);
  });

  it('snapshots the commission rate — a later admin change does not alter past bookings', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org);

    const res = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    expect(res.body.booking.commissionRate).toBe(10);

    // Admin raises commission to 25%.
    await request(app).patch('/api/v1/admin/config').set('Authorization', `Bearer ${admin}`).send({ commissionRate: 25 });

    // The existing booking still reflects the 10% it was created with.
    const list = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${cust}`);
    expect(list.body.bookings[0].commissionRate).toBe(10);

    // A new booking picks up the new 25%.
    const res2 = await book(cust, { tripId: trip.id, selectedDate: '2026-08-15', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    expect(res2.body.booking.commissionRate).toBe(25);
  });

  it('a loyalty-reward booking is fully comped (tax + final = 0)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org);

    // Server verifies a real voucher now: lower the threshold and book once to
    // mint one, then redeem it on the next booking.
    await request(app).patch('/api/v1/admin/loyalty/config').set('Authorization', `Bearer ${admin}`).send({ customer: { thresholdPersons: 1, enabled: true } });
    await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });

    const res = await book(cust, {
      tripId: trip.id, selectedDate: '2026-08-15',
      selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }], useLoyaltyReward: true,
    });
    expect(res.body.booking.finalAmount).toBe(0);
    expect(res.body.booking.taxAmount).toBe(0);
    expect(res.body.booking.loyaltyRewardApplied).toBe(true);
  });

  it('rejects an invalid departure date (400)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const res = await book(cust, { tripId: trip.id, selectedDate: '2099-01-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    expect(res.status).toBe(400);
  });
});

describe('Booking visibility per role', () => {
  it('shows the booking to the customer, its organizer, and admin with matching amounts', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org);
    const created = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });
    const amount = created.body.booking.finalAmount;

    const mine = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${cust}`);
    expect(mine.body.bookings.map((b) => b.bookingId)).toContain(created.body.booking.bookingId);

    const orgList = await request(app).get('/api/v1/organizer/bookings').set('Authorization', `Bearer ${org}`);
    expect(orgList.body.bookings[0].finalAmount).toBe(amount);

    const adminList = await request(app).get('/api/v1/admin/bookings').set('Authorization', `Bearer ${admin}`);
    expect(adminList.body.bookings[0].finalAmount).toBe(amount);
  });

  it("does not show a customer another customer's bookings", async () => {
    const org = await approvedOrganizerToken();
    const custA = await customerToken('a@example.com');
    const custB = await customerToken('b@example.com');
    const trip = await makeTrip(org);
    await book(custA, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });

    const bList = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${custB}`);
    expect(bList.body.bookings).toHaveLength(0);
  });

  it('admin can update a booking status', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org);
    const created = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }] });

    const res = await request(app)
      .patch(`/api/v1/admin/bookings/${created.body.booking.bookingId}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'Completed' });
    expect(res.body.booking.status).toBe('Completed');
  });
});
