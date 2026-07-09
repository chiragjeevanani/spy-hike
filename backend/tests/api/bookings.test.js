import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Organizer from '../../src/models/Organizer.js';
import Admin from '../../src/models/Admin.js';
import Coupon from '../../src/models/Coupon.js';
import Departure from '../../src/models/Departure.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

async function customerToken(email = 'hiker@example.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email, password: 'pass1234' });
  return reg.body.token;
}
async function approvedOrganizerToken(email = 'org@example.com') {
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({ name: 'Org', email, password: 'pass1234', agencyName: 'Guides' });
  await Organizer.findByIdAndUpdate(reg.body.account.id, { isApproved: true, isPendingApproval: false });
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email, password: 'pass1234' });
  return login.body.token;
}
async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@trekigo.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@trekigo.com', password: 'admin123' });
  return res.body.token;
}

const tripPayload = (over = {}) => ({
  name: 'Booking Trek',
  location: 'Manali',
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
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(tripPayload(over));
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
      travelers: [{ name: 'A' }, { name: 'B' }],
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
      selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'A' }],
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
    await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 2 }], travelers: [{}, {}] });
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

  it('snapshots the commission rate — a later admin change does not alter past bookings', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org);

    const res = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] });
    expect(res.body.booking.commissionRate).toBe(10);

    // Admin raises commission to 25%.
    await request(app).patch('/api/v1/admin/config').set('Authorization', `Bearer ${admin}`).send({ commissionRate: 25 });

    // The existing booking still reflects the 10% it was created with.
    const list = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${cust}`);
    expect(list.body.bookings[0].commissionRate).toBe(10);

    // A new booking picks up the new 25%.
    const res2 = await book(cust, { tripId: trip.id, selectedDate: '2026-08-15', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] });
    expect(res2.body.booking.commissionRate).toBe(25);
  });

  it('a loyalty-reward booking is fully comped (tax + final = 0)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const res = await book(cust, {
      tripId: trip.id, selectedDate: '2026-08-01',
      selections: [{ label: 'Solo', count: 1 }], travelers: [{}], useLoyaltyReward: true,
    });
    expect(res.body.booking.finalAmount).toBe(0);
    expect(res.body.booking.taxAmount).toBe(0);
    expect(res.body.booking.loyaltyRewardApplied).toBe(true);
  });

  it('rejects an invalid departure date (400)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const res = await book(cust, { tripId: trip.id, selectedDate: '2099-01-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] });
    expect(res.status).toBe(400);
  });
});

describe('Booking visibility per role', () => {
  it('shows the booking to the customer, its organizer, and admin with matching amounts', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org);
    const created = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] });
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
    await book(custA, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] });

    const bList = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${custB}`);
    expect(bList.body.bookings).toHaveLength(0);
  });

  it('admin can update a booking status', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org);
    const created = await book(cust, { tripId: trip.id, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] });

    const res = await request(app)
      .patch(`/api/v1/admin/bookings/${created.body.booking.bookingId}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'Completed' });
    expect(res.body.booking.status).toBe('Completed');
  });
});
