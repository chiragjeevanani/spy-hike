import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Departure from '../../src/models/Departure.js';
import Trek from '../../src/models/Trek.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

// A future date `n` days out, formatted YYYY-MM-DD.
function dateInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

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
async function makeTrip(orgToken, departDays) {
  const trek = await Trek.create({
    _id: `refund-trek-${Date.now()}-${trekSeq++}`,
    title: 'Refund Trek', location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send({
    trekId: trek._id,
    pricingTiers: [{ label: 'Solo', price: 1000 }],
    pickup: { location: 'Manali', price: 0 },
    startPoint: { lat: 32.2, lng: 77.1, label: 'Base' },
    departureDates: departDays.map(dateInDays), maxGroupSize: 10, availableSeats: 10, category: 'Trekking', status: 'Published',
  });
  return res.body.trip;
}
async function book(custToken, tripId, date) {
  const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${custToken}`).send({
    tripId, selectedDate: date, selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
  });
  return res.body.booking;
}

describe('Cancellation & policy refund', () => {
  it('gives a full refund when cancelling well before departure (>=15 days)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org, [30]);
    const booking = await book(cust, trip.id, dateInDays(30));
    // final = (1000) + 5% tax = 1050.
    const res = await request(app).post(`/api/v1/bookings/${booking.bookingId}/cancel`).set('Authorization', `Bearer ${cust}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('Cancelled');
    expect(res.body.booking.refundPercent).toBe(100);
    expect(res.body.booking.refundAmount).toBe(1050);
  });

  it('gives a 50% refund in the 7–14 day window and releases the seats', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org, [10]);
    const date = dateInDays(10);
    const booking = await book(cust, trip.id, date);
    const before = await Departure.findOne({ tripId: trip.id, date });
    expect(before.availableSeats).toBe(9); // 10 - 1 booked

    const res = await request(app).post(`/api/v1/bookings/${booking.bookingId}/cancel`).set('Authorization', `Bearer ${cust}`);
    expect(res.body.booking.refundPercent).toBe(50);
    expect(res.body.booking.refundAmount).toBe(525); // 50% of 1050

    const after = await Departure.findOne({ tripId: trip.id, date });
    expect(after.availableSeats).toBe(10); // seat returned
  });

  it('gives no refund within 7 days of departure', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org, [3]);
    const booking = await book(cust, trip.id, dateInDays(3));
    const res = await request(app).post(`/api/v1/bookings/${booking.bookingId}/cancel`).set('Authorization', `Bearer ${cust}`);
    expect(res.body.booking.refundPercent).toBe(0);
    expect(res.body.booking.refundAmount).toBe(0);
  });

  it('cannot cancel an already-cancelled booking (400)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org, [30]);
    const booking = await book(cust, trip.id, dateInDays(30));
    await request(app).post(`/api/v1/bookings/${booking.bookingId}/cancel`).set('Authorization', `Bearer ${cust}`);
    const again = await request(app).post(`/api/v1/bookings/${booking.bookingId}/cancel`).set('Authorization', `Bearer ${cust}`);
    expect(again.status).toBe(400);
  });
});

describe('Organizer financials & payouts', () => {
  it('reflects earned payout, and a cancelled booking drops from the balance', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org, [30, 40]);
    const b1 = await book(cust, trip.id, dateInDays(30));
    await book(cust, trip.id, dateInDays(40));

    // Each booking: final 1050, commission 10% = 105, payout 945. Two → 1890.
    let fin = await request(app).get('/api/v1/organizer/financials').set('Authorization', `Bearer ${org}`);
    expect(fin.body.financials.available).toBe(1890);

    // Cancel one → its payout leaves the balance.
    await request(app).post(`/api/v1/bookings/${b1.bookingId}/cancel`).set('Authorization', `Bearer ${cust}`);
    fin = await request(app).get('/api/v1/organizer/financials').set('Authorization', `Bearer ${org}`);
    expect(fin.body.financials.available).toBe(945);
  });

  const setBank = (org) => request(app).patch('/api/v1/organizer/bank-details').set('Authorization', `Bearer ${org}`)
    .send({ accountHolderName: 'Guides Ltd', bankName: 'HDFC', ifsc: 'HDFC0001234', accountNumber: '1234567890' });

  it('blocks a payout request when no payout method is configured (400)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org, [30]);
    await book(cust, trip.id, dateInDays(30));
    const res = await request(app).post('/api/v1/organizer/payouts').set('Authorization', `Bearer ${org}`).send({ amount: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/bank account|upi/i);
  });

  it('requests a payout (with a reference + bank snapshot) capped at the balance', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org, [30]);
    await book(cust, trip.id, dateInDays(30)); // available 945
    await setBank(org);

    const over = await request(app).post('/api/v1/organizer/payouts').set('Authorization', `Bearer ${org}`).send({ amount: 5000 });
    expect(over.status).toBe(400);

    const ok = await request(app).post('/api/v1/organizer/payouts').set('Authorization', `Bearer ${org}`).send({ amount: 500 });
    expect(ok.status).toBe(201);
    expect(ok.body.payout.status).toBe('Processing');
    expect(ok.body.payout.reference).toMatch(/^PO-\d{4}-\d{6}$/);
    expect(ok.body.payout.bank.accountNumberMasked).toBe('••••7890');

    const fin = await request(app).get('/api/v1/organizer/financials').set('Authorization', `Bearer ${org}`);
    expect(fin.body.financials.available).toBe(445);
  });

  it('admin settles a payout to Paid with a UTR and notifies the organizer', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org, [30]);
    await book(cust, trip.id, dateInDays(30));
    await setBank(org);
    const req = await request(app).post('/api/v1/organizer/payouts').set('Authorization', `Bearer ${org}`).send({ amount: 500 });

    const settle = await request(app).patch(`/api/v1/admin/payouts/${req.body.payout.id}`).set('Authorization', `Bearer ${admin}`).send({ action: 'approve' });
    expect(settle.status).toBe(200);
    expect(settle.body.payout.status).toBe('Paid');
    expect(settle.body.payout.utr).toBeTruthy();

    const notifs = await request(app).get('/api/v1/organizer/notifications').set('Authorization', `Bearer ${org}`);
    expect(notifs.body.notifications.some((n) => /Payout Settled/i.test(n.title))).toBe(true);
  });

  it('rejecting a payout records the reason and frees the balance back', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org, [30]);
    await book(cust, trip.id, dateInDays(30)); // available 945
    await setBank(org);
    const req = await request(app).post('/api/v1/organizer/payouts').set('Authorization', `Bearer ${org}`).send({ amount: 500 });

    const rej = await request(app).patch(`/api/v1/admin/payouts/${req.body.payout.id}`).set('Authorization', `Bearer ${admin}`).send({ action: 'reject', reason: 'KYC mismatch' });
    expect(rej.body.payout.status).toBe('Rejected');
    expect(rej.body.payout.rejectionReason).toBe('KYC mismatch');

    // Rejected amount returns to available.
    const fin = await request(app).get('/api/v1/organizer/financials').set('Authorization', `Bearer ${org}`);
    expect(fin.body.financials.available).toBe(945);
  });

  it('cannot settle an already-settled payout (400)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org, [30]);
    await book(cust, trip.id, dateInDays(30));
    await setBank(org);
    const req = await request(app).post('/api/v1/organizer/payouts').set('Authorization', `Bearer ${org}`).send({ amount: 500 });
    await request(app).patch(`/api/v1/admin/payouts/${req.body.payout.id}`).set('Authorization', `Bearer ${admin}`).send({ action: 'approve' });
    const again = await request(app).patch(`/api/v1/admin/payouts/${req.body.payout.id}`).set('Authorization', `Bearer ${admin}`).send({ action: 'reject' });
    expect(again.status).toBe(400);
  });

  it('admin payout list returns a report summary and supports status filtering', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const admin = await adminToken();
    const trip = await makeTrip(org, [30, 40]);
    await book(cust, trip.id, dateInDays(30));
    await book(cust, trip.id, dateInDays(40));
    await setBank(org);
    const p1 = await request(app).post('/api/v1/organizer/payouts').set('Authorization', `Bearer ${org}`).send({ amount: 300 });
    await request(app).post('/api/v1/organizer/payouts').set('Authorization', `Bearer ${org}`).send({ amount: 200 });
    await request(app).patch(`/api/v1/admin/payouts/${p1.body.payout.id}`).set('Authorization', `Bearer ${admin}`).send({ action: 'approve' });

    const all = await request(app).get('/api/v1/admin/payouts').set('Authorization', `Bearer ${admin}`);
    expect(all.body.summary.paidAmount).toBe(300);
    expect(all.body.summary.pendingAmount).toBe(200);
    expect(all.body.summary.totalCount).toBe(2);

    const paidOnly = await request(app).get('/api/v1/admin/payouts?status=Paid').set('Authorization', `Bearer ${admin}`);
    expect(paidOnly.body.payouts).toHaveLength(1);
    expect(paidOnly.body.payouts[0].status).toBe('Paid');
  });

  it('saves organizer bank details', async () => {
    const org = await approvedOrganizerToken();
    const res = await setBank(org);
    expect(res.status).toBe(200);
    expect(res.body.organizer.bankDetails.accountHolderName).toBe('Guides Ltd');
  });

  it('rejects a malformed IFSC code (400)', async () => {
    const org = await approvedOrganizerToken();
    const res = await request(app).patch('/api/v1/organizer/bank-details').set('Authorization', `Bearer ${org}`)
      .send({ accountHolderName: 'Guides Ltd', bankName: 'HDFC', ifsc: 'NOTREAL', accountNumber: '1234567890' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid bank account number (400)', async () => {
    const org = await approvedOrganizerToken();
    const res = await request(app).patch('/api/v1/organizer/bank-details').set('Authorization', `Bearer ${org}`)
      .send({ accountHolderName: 'Guides Ltd', bankName: 'HDFC', ifsc: 'HDFC0001234', accountNumber: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects partial bank details (bank name without account number/IFSC) (400)', async () => {
    const org = await approvedOrganizerToken();
    const res = await request(app).patch('/api/v1/organizer/bank-details').set('Authorization', `Bearer ${org}`)
      .send({ accountHolderName: 'Guides Ltd', bankName: 'HDFC' });
    expect(res.status).toBe(400);
  });

  it('rejects a malformed UPI ID (400), accepts a valid one', async () => {
    const org = await approvedOrganizerToken();
    const bad = await request(app).patch('/api/v1/organizer/bank-details').set('Authorization', `Bearer ${org}`)
      .send({ accountHolderName: 'Guides Ltd', upiId: 'not-a-upi-id' });
    expect(bad.status).toBe(400);

    const good = await request(app).patch('/api/v1/organizer/bank-details').set('Authorization', `Bearer ${org}`)
      .send({ accountHolderName: 'Guides Ltd', upiId: 'guides@okhdfcbank' });
    expect(good.status).toBe(200);
  });

  it('rejects a malformed PAN number (400)', async () => {
    const org = await approvedOrganizerToken();
    const res = await request(app).patch('/api/v1/organizer/bank-details').set('Authorization', `Bearer ${org}`)
      .send({ accountHolderName: 'Guides Ltd', panNumber: 'invalid' });
    expect(res.status).toBe(400);
  });
});
