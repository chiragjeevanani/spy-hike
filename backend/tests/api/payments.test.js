import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Booking from '../../src/models/Booking.js';
import Trek from '../../src/models/Trek.js';
import Coupon from '../../src/models/Coupon.js';
import Voucher from '../../src/models/Voucher.js';
import Departure from '../../src/models/Departure.js';
import Notification from '../../src/models/Notification.js';
import WebhookEvent from '../../src/models/WebhookEvent.js';
import LoyaltyConfig from '../../src/models/LoyaltyConfig.js';
import { paymentProvider } from '../../src/integrations/payments.js';
import { expireStalePayments } from '../../src/services/paymentService.js';

const app = createApp();
const api = '/api/v1';
const WEBHOOK_URL = `${api}/webhooks/payu`;
const RETURN_URL = `${api}/payments/payu/return`;
const KEY = 'TESTKEY';
const SALT = 'TESTSALT';

// ─── Gateway double ──────────────────────────────────────────────────────────
// paymentProvider is a plain object shared by every module that imports it, so
// swapping its network methods here intercepts the only calls that would leave
// the process. buildCheckout and verifyResponseHash are deliberately left real:
// the hashes are the part under test.
const realProvider = { ...paymentProvider };
let lastRefundRequest = null;
let refundSeq = 0;

function stubGateway() {
  refundSeq = 0;
  env.paymentMode = 'online';
  env.payuMerchantKey = KEY;
  env.payuMerchantSalt = SALT;
  env.payuEnv = 'test';
  env.apiPublicUrl = 'https://api.example.com';
  env.frontendUrl = 'https://app.example.com';

  // Default: PayU has never heard of the txnid (the customer hasn't paid).
  paymentProvider.verifyPayment = async () => null;
  paymentProvider.refund = async ({ paymentId, amount, token }) => {
    lastRefundRequest = { paymentId, amount, token };
    return { id: `REQ${++refundSeq}`, status: 'queued' };
  };
  paymentProvider.fetchRefund = async () => null;
}

function restoreGateway() {
  Object.assign(paymentProvider, realProvider);
  env.paymentMode = 'arrival';
  env.payuMerchantKey = '';
  env.payuMerchantSalt = '';
  env.apiPublicUrl = '';
  lastRefundRequest = null;
}

const sha512 = (v) => crypto.createHash('sha512').update(v).digest('hex');

// What PayU posts back for a checkout: the fields we sent, plus the outcome,
// signed with the reverse hash exactly as PayU computes it.
function paymentResult(payment, { status = 'success', mihpayid = '403993715500001', amount, salt = SALT, extra = {} } = {}) {
  const p = payment.checkout.params;
  const fields = {
    key: p.key, txnid: p.txnid, amount: amount ?? p.amount, productinfo: p.productinfo,
    firstname: p.firstname, email: p.email, phone: p.phone,
    udf1: p.udf1, udf2: p.udf2, udf3: p.udf3, udf4: p.udf4, udf5: p.udf5,
    status, mihpayid, mode: 'UPI', ...extra,
  };
  fields.hash = sha512([
    salt, fields.status, '', '', '', '', '',
    fields.udf5, fields.udf4, fields.udf3, fields.udf2, fields.udf1,
    fields.email, fields.firstname, fields.productinfo, fields.amount, fields.txnid, fields.key,
  ].join('|'));
  return fields;
}

// PayU posts form-encoded bodies to both the return URL and the webhook.
const deliverWebhook = (fields) => request(app).post(WEBHOOK_URL).type('form').send(fields);
const deliverReturn = (fields) => request(app).post(RETURN_URL).type('form').send(fields);

// ─── Fixtures ────────────────────────────────────────────────────────────────
let trekSeq = 0;

async function customerToken(email = 'payer@example.com') {
  const reg = await request(app).post(`${api}/auth/register`).send({ name: 'Payer', email, password: 'pass1234' });
  return reg.body.token;
}

async function approvedOrganizerToken(email = 'payorg@example.com') {
  const reg = await request(app).post(`${api}/auth/organizer/register`).send({
    name: 'Org', email, password: 'pass1234', agencyName: 'Guides',
    socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  });
  await User.findByIdAndUpdate(reg.body.account.id, {
    'organizer.isApproved': true, 'organizer.isPendingApproval': false,
  });
  const login = await request(app).post(`${api}/auth/organizer/login`).send({ email, password: 'pass1234' });
  return login.body.token;
}

async function adminToken() {
  const { hashPassword } = await import('../../src/utils/password.js');
  await Admin.create({ name: 'Admin', email: 'admin@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post(`${api}/auth/admin/login`).send({ email: 'admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}

async function makeTrip(orgToken, over) {
  const trek = await Trek.create({
    _id: `pay-trek-${Date.now()}-${trekSeq++}`,
    title: 'Payment Trek', location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(orgToken ? app : app)
    .post(`${api}/organizer/trips`)
    .set('Authorization', `Bearer ${orgToken}`)
    .send({
      trekId: trek._id,
      pricingTiers: [{ label: 'Solo', price: 1000 }],
      pickup: { location: 'Manali', price: 100 },
      startPoint: { lat: 32.24, lng: 77.18, label: 'Base' },
      departureDates: [DEPARTURE],
      maxGroupSize: 10,
      availableSeats: 5,
      category: 'Trekking',
      status: 'Published',
      ...over,
    });
  return res.body.trip;
}

const TRAVELER = { name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' };
// Comfortably beyond the 15-day full-refund tier, so cancellation tests exercise
// a real refund rather than the 0% "too late" branch.
const DEPARTURE = '2027-08-01';

const book = (token, body) =>
  request(app).post(`${api}/bookings`).set('Authorization', `Bearer ${token}`).send(body);

// Books one Solo seat and returns { token, trip, booking, payment }.
async function bookOnline(over = {}) {
  const org = await approvedOrganizerToken();
  const token = await customerToken();
  const trip = await makeTrip(org);
  const res = await book(token, {
    tripId: trip.id, selectedDate: DEPARTURE,
    selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
    ...over,
  });
  return { org, token, trip, booking: res.body.booking, payment: res.body.payment, status: res.status };
}

beforeEach(stubGateway);
afterEach(restoreGateway);

describe('Online checkout (PayU hosted checkout)', () => {
  it('returns a pending booking plus the signed form the browser posts to PayU', async () => {
    const { status, booking, payment } = await bookOnline();

    expect(status).toBe(201);
    expect(payment).toMatchObject({ required: true, provider: 'payu', currency: 'INR', amount: booking.finalAmount });
    expect(payment.checkout.action).toBe('https://test.payu.in/_payment');
    expect(booking.payment.status).toBe('pending');
    expect(booking.payment.method).toBe('payu');
    expect(booking.payment.orderId).toBe(payment.txnId);

    const p = payment.checkout.params;
    expect(p).toMatchObject({
      key: KEY, txnid: payment.txnId, amount: booking.finalAmount.toFixed(2),
      email: 'payer@example.com', udf1: booking.bookingId,
      surl: 'https://api.example.com/api/v1/payments/payu/return',
      furl: 'https://api.example.com/api/v1/payments/payu/return',
    });
    expect(p.phone).toMatch(/^\d{10}$/);
    expect(p.txnid.length).toBeLessThanOrEqual(25);
    // PayU's documented request hash.
    expect(p.hash).toBe(sha512(
      `${KEY}|${p.txnid}|${p.amount}|${p.productinfo}|${p.firstname}|${p.email}|${p.udf1}|${p.udf2}|${p.udf3}|${p.udf4}|${p.udf5}||||||${SALT}`,
    ));
    // The salt itself never goes to the browser.
    expect(JSON.stringify(payment)).not.toContain(SALT);
  });

  it('uses the production checkout host when PAYU_ENV is production', async () => {
    env.payuEnv = 'production';
    const { payment } = await bookOnline();
    expect(payment.checkout.action).toBe('https://secure.payu.in/_payment');
  });

  it('holds the seats while the payment is pending, so the departure cannot be oversold', async () => {
    const { trip } = await bookOnline();
    const departure = await Departure.findOne({ tripId: trip.id, date: DEPARTURE });
    expect(departure.availableSeats).toBe(4);
  });

  it('keeps an unpaid booking out of the customer and organizer lists', async () => {
    const { token, org } = await bookOnline();

    const mine = await request(app).get(`${api}/bookings`).set('Authorization', `Bearer ${token}`);
    expect(mine.body.bookings).toHaveLength(0);

    const theirs = await request(app).get(`${api}/organizer/bookings`).set('Authorization', `Bearer ${org}`);
    expect(theirs.body.bookings).toHaveLength(0);
  });

  it('still serves the pending booking by id, so the checkout screen can show it', async () => {
    const { token, booking } = await bookOnline();
    const res = await request(app).get(`${api}/bookings/${booking.bookingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.payment.status).toBe('pending');
  });

  it('leaves no orphan booking behind when the checkout cannot be built', async () => {
    paymentProvider.buildCheckout = () => { throw new Error('PayU: misconfigured'); };
    const { status, trip } = await bookOnline();

    expect(status).toBe(500);
    expect(await Booking.countDocuments()).toBe(0);
    // …and the seats it had reserved are back.
    const departure = await Departure.findOne({ tripId: trip.id, date: DEPARTURE });
    expect(departure.availableSeats).toBe(5);
  });
});

describe('PayU return (surl / furl)', () => {
  it('confirms the booking on a genuine success and sends the browser back into the app', async () => {
    const { trip, booking, payment } = await bookOnline();

    const res = await deliverReturn(paymentResult(payment));

    expect(res.status).toBe(303);
    const target = new URL(res.headers.location);
    expect(target.origin).toBe('https://app.example.com');
    expect(target.pathname).toBe(`/app/book/${trip.id}`);
    expect(target.searchParams.get('booking')).toBe(booking.bookingId);
    expect(target.searchParams.get('payment')).toBe('return');

    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('paid');
    expect(after.payment.confirmedVia).toBe('checkout');
    expect(after.payment.paymentId).toBe('403993715500001');
    expect(after.payment.amountPaid).toBe(booking.finalAmount);
  });

  it('records a failure without cancelling, and still redirects', async () => {
    const { booking, payment } = await bookOnline();

    const res = await deliverReturn(paymentResult(payment, {
      status: 'failure', extra: { error_Message: 'Bank declined the transaction' },
    }));

    expect(res.status).toBe(303);
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('pending');
    expect(after.payment.failureReason).toBe('Bank declined the transaction');
    expect(after.payment.failedAt).toBeTruthy();
  });

  it('changes nothing when the hash is forged', async () => {
    const { booking, payment } = await bookOnline();

    const res = await deliverReturn(paymentResult(payment, { salt: 'WRONGSALT' }));

    expect(res.status).toBe(303); // the customer is still sent back to the app…
    // …but the booking is untouched.
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('pending');
  });

  it('rejects a success whose signed amount was tampered with', async () => {
    const { booking, payment } = await bookOnline();
    const fields = paymentResult(payment);
    fields.amount = '1.00';

    await deliverReturn(fields);
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('pending');
  });

  it('sends an unknown transaction to the bookings list', async () => {
    const res = await deliverReturn({ txnid: 'NOTOURS', status: 'success', hash: 'x' });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('https://app.example.com/app/bookings');
  });
});

describe('PayU webhook — authentication', () => {
  it('rejects a payment delivery whose hash does not verify', async () => {
    const { booking, payment } = await bookOnline();
    const res = await deliverWebhook(paymentResult(payment, { salt: 'not-the-salt' }));

    expect(res.status).toBe(400);
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('pending');
  });

  it('rejects a delivery signed for a different merchant key', async () => {
    const { booking, payment } = await bookOnline();
    const res = await deliverWebhook({ ...paymentResult(payment), key: 'SOMEONEELSE' });

    expect(res.status).toBe(400);
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('pending');
  });

  it('answers 200 when the transaction is unknown, so PayU stops retrying', async () => {
    const { payment } = await bookOnline();
    const fields = paymentResult({ checkout: { params: { ...payment.checkout.params, txnid: 'NOTOURS', udf1: '' } } });
    const res = await deliverWebhook(fields);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
  });
});

describe('PayU webhook — payment success', () => {
  it('confirms the booking, notifies both sides and seeds the organizer chat', async () => {
    const { token, booking, payment } = await bookOnline();

    const res = await deliverWebhook(paymentResult(payment));
    expect(res.status).toBe(200);
    expect(res.body.note).toBe('Booking confirmed');

    const confirmed = await Booking.findOne({ bookingId: booking.bookingId });
    expect(confirmed.payment.status).toBe('paid');
    expect(confirmed.payment.confirmedVia).toBe('webhook');
    expect(confirmed.paymentRef).toBe('403993715500001');

    const mine = await request(app).get(`${api}/bookings`).set('Authorization', `Bearer ${token}`);
    expect(mine.body.bookings).toHaveLength(1);

    const notes = await Notification.find({});
    expect(notes.filter((n) => n.ownerType === 'customer')).toHaveLength(1);
    expect(notes.filter((n) => n.ownerType === 'organizer')).toHaveLength(1);
  });

  it('runs the side effects exactly once when the same event is redelivered', async () => {
    const { payment } = await bookOnline();
    const fields = paymentResult(payment);

    const first = await deliverWebhook(fields);
    const second = await deliverWebhook(fields);

    expect(first.body.note).toBe('Booking confirmed');
    expect(second.body).toMatchObject({ ok: true, duplicate: true });
    expect(await Notification.countDocuments({ ownerType: 'customer' })).toBe(1);
    expect(await WebhookEvent.countDocuments()).toBe(1);
  });

  it('runs them once when the return post and the webhook both arrive', async () => {
    const { payment } = await bookOnline();

    await deliverReturn(paymentResult(payment));
    const hook = await deliverWebhook(paymentResult(payment));

    expect(hook.body.note).toBe('Already confirmed');
    expect(await Notification.countDocuments({ ownerType: 'customer' })).toBe(1);
    const organizer = await User.findOne({ email: 'payorg@example.com' });
    expect(organizer.organizer.totalBookings).toBe(1);
  });

  it('refuses to confirm a booking whose total no longer matches what was paid', async () => {
    const { booking, payment } = await bookOnline();
    await Booking.updateOne({ bookingId: booking.bookingId }, { $set: { 'payment.amountDue': 999999 } });

    const res = await deliverWebhook(paymentResult(payment));

    expect(res.status).toBe(500); // asks PayU to retry; the money is visible in the dashboard
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('pending');
    expect(after.payment.failureReason).toMatch(/Underpaid/);
  });

  it('lets a retried delivery re-run after processing failed', async () => {
    const { booking, payment } = await bookOnline();
    const fields = paymentResult(payment);

    await Booking.updateOne({ bookingId: booking.bookingId }, { $set: { 'payment.amountDue': 999999 } });
    const failed = await deliverWebhook(fields);
    expect(failed.status).toBe(500);
    const row = await WebhookEvent.findOne({});
    expect(row.status).toBe('failed');

    await Booking.updateOne({ bookingId: booking.bookingId }, { $set: { 'payment.amountDue': booking.finalAmount } });
    const retried = await deliverWebhook(fields);
    expect(retried.status).toBe(200);
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('paid');
    expect((await WebhookEvent.findOne({ eventId: row.eventId })).attempts).toBe(2);
  });
});

describe('PayU webhook — payment failure', () => {
  it('records the attempt without cancelling a booking the customer may still pay for', async () => {
    const { booking, payment, trip } = await bookOnline();

    const res = await deliverWebhook(paymentResult(payment, {
      status: 'failure', extra: { error_Message: 'Card declined by issuer' },
    }));
    expect(res.status).toBe(200);

    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('pending');
    expect(after.status).not.toBe('Cancelled');
    expect(after.payment.failureReason).toBe('Card declined by issuer');
    expect((await Departure.findOne({ tripId: trip.id, date: DEPARTURE })).availableSeats).toBe(4);
  });

  it('still confirms the booking when a retried attempt succeeds', async () => {
    const { token, booking, payment } = await bookOnline();
    await deliverWebhook(paymentResult(payment, { status: 'failure', mihpayid: '111' }));

    const retry = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/payment/retry`)
      .set('Authorization', `Bearer ${token}`);
    expect(retry.status).toBe(200);
    expect(retry.body.payment.txnId).not.toBe(payment.txnId); // PayU needs a fresh txnid

    const ok = await deliverWebhook(paymentResult(retry.body.payment, { mihpayid: '222' }));
    expect(ok.body.note).toBe('Booking confirmed');
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('paid');
    expect(after.payment.paymentId).toBe('222');
  });

  it('still finds the booking when an older attempt is paid after a retry', async () => {
    const { token, booking, payment } = await bookOnline();
    await request(app).post(`${api}/bookings/${booking.bookingId}/payment/retry`).set('Authorization', `Bearer ${token}`);

    const res = await deliverWebhook(paymentResult(payment)); // the ORIGINAL txnid
    expect(res.body.note).toBe('Booking confirmed');
  });
});

describe('Payment status polling and reconciliation', () => {
  const poll = (token, bookingId) =>
    request(app).get(`${api}/bookings/${bookingId}/payment`).set('Authorization', `Bearer ${token}`);

  it('confirms from PayU\'s verify API when neither the return nor the webhook arrived', async () => {
    const { token, booking, payment } = await bookOnline();
    paymentProvider.verifyPayment = async (txnid) => (txnid === payment.txnId
      ? { status: 'success', paymentId: '999', amount: booking.finalAmount }
      : null);

    const res = await poll(token, booking.bookingId);
    expect(res.body.payment.status).toBe('paid');
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.confirmedVia).toBe('reconcile');
  });

  it('reports a failed attempt so the app can offer a retry', async () => {
    const { token, booking } = await bookOnline();
    paymentProvider.verifyPayment = async () => ({ status: 'failure', paymentId: '5', amount: 0, reason: 'Cancelled by user' });

    const res = await poll(token, booking.bookingId);
    expect(res.body.payment.status).toBe('pending');
    expect(res.body.payment.failedAt).toBeTruthy();
    expect(res.body.payment.failureReason).toBe('Cancelled by user');
  });

  it('still answers when PayU is unreachable', async () => {
    const { token, booking } = await bookOnline();
    paymentProvider.verifyPayment = async () => { throw new Error('PayU: timeout'); };

    const res = await poll(token, booking.bookingId);
    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe('pending');
  });

  it('does not expire a hold that PayU says was paid', async () => {
    const { booking } = await bookOnline();
    paymentProvider.verifyPayment = async () => ({ status: 'success', paymentId: '77', amount: booking.finalAmount });
    await Booking.updateOne({ bookingId: booking.bookingId }, { $set: { 'payment.expiresAt': new Date(Date.now() - 1000) } });

    const expired = await expireStalePayments();
    expect(expired).not.toContain(booking.bookingId);
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('paid');
    expect(after.status).toBe('Upcoming');
  });

  it('refuses to open a second transaction for a booking that turned out to be paid', async () => {
    const { token, booking } = await bookOnline();
    paymentProvider.verifyPayment = async () => ({ status: 'success', paymentId: '78', amount: booking.finalAmount });

    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/payment/retry`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/already paid/);
  });
});

describe('Abandoned checkouts', () => {
  it('gives back the seats, the coupon redemption and the loyalty voucher when the hold expires', async () => {
    const org = await approvedOrganizerToken();
    const token = await customerToken();
    const trip = await makeTrip(org);
    await Coupon.create({ _id: 'cp-pay-1', scope: 'platform', code: 'SAVE10', type: 'percentage', value: 10, status: 'Active', maxRedemptions: 5 });

    const res = await book(token, {
      tripId: trip.id, selectedDate: DEPARTURE,
      selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
      couponCode: 'SAVE10',
    });
    const { bookingId } = res.body.booking;
    expect((await Coupon.findOne({ code: 'SAVE10' })).usedCount).toBe(1);

    // Wind the hold back into the past, then sweep.
    await Booking.updateOne({ bookingId }, { $set: { 'payment.expiresAt': new Date(Date.now() - 1000) } });
    const expired = await expireStalePayments();
    expect(expired).toContain(bookingId);

    const after = await Booking.findOne({ bookingId });
    expect(after.status).toBe('Cancelled');
    expect(after.payment.status).toBe('failed');
    expect((await Departure.findOne({ tripId: trip.id, date: DEPARTURE })).availableSeats).toBe(5);
    expect((await Coupon.findOne({ code: 'SAVE10' })).usedCount).toBe(0);
  });

  it('returns the customer their free-booking voucher rather than burning it on a checkout they abandoned', async () => {
    const org = await approvedOrganizerToken();
    const token = await customerToken();
    const trip = await makeTrip(org);
    const me = await User.findOne({ email: 'payer@example.com' });
    await Voucher.create({ ownerType: 'customer', ownerKey: me.email, milestoneNumber: 1, status: 'available' });
    // A reward that covers only part of the trip, so there is still a balance
    // to pay through PayU.
    await LoyaltyConfig.findByIdAndUpdate('loyalty', { $set: { 'customer.maxDiscountAmount': 500 } }, { upsert: true });

    const res = await book(token, {
      tripId: trip.id, selectedDate: DEPARTURE,
      selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
      useLoyaltyReward: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.payment.required).toBe(true);
    expect((await Voucher.findOne({ ownerKey: me.email })).status).toBe('used');

    await Booking.updateOne({ bookingId: res.body.booking.bookingId }, { $set: { 'payment.expiresAt': new Date(Date.now() - 1000) } });
    await expireStalePayments();

    expect((await Voucher.findOne({ ownerKey: me.email })).status).toBe('available');
  });

  it('confirms a booking the reward covers in full without sending the customer to PayU', async () => {
    const org = await approvedOrganizerToken();
    const token = await customerToken();
    const trip = await makeTrip(org);
    const me = await User.findOne({ email: 'payer@example.com' });
    await Voucher.create({ ownerType: 'customer', ownerKey: me.email, milestoneNumber: 1, status: 'available' });

    const res = await book(token, {
      tripId: trip.id, selectedDate: DEPARTURE,
      selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
      useLoyaltyReward: true,
    });
    expect(res.body.booking.finalAmount).toBe(0);
    expect(res.body.payment.required).toBe(false);
    expect(res.body.booking.payment.status).toBe('not_required');
  });

  it('frees an expired hold in time for the next customer to take the seat', async () => {
    const org = await approvedOrganizerToken();
    const first = await customerToken('first@example.com');
    const second = await customerToken('second@example.com');
    const trip = await makeTrip(org, { availableSeats: 1, maxGroupSize: 1 });

    const one = await book(first, {
      tripId: trip.id, selectedDate: DEPARTURE,
      selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
    });
    expect(one.status).toBe(201);

    // The departure is full while the first customer is paying.
    const blocked = await book(second, {
      tripId: trip.id, selectedDate: DEPARTURE,
      selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
    });
    expect(blocked.status).toBe(409);

    await Booking.updateOne({ bookingId: one.body.booking.bookingId }, { $set: { 'payment.expiresAt': new Date(Date.now() - 1000) } });

    const allowed = await book(second, {
      tripId: trip.id, selectedDate: DEPARTURE,
      selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
    });
    expect(allowed.status).toBe(201);
  });
});

describe('Refunds', () => {
  async function paidBooking() {
    const ctx = await bookOnline();
    await deliverWebhook(paymentResult(ctx.payment, { mihpayid: 'PAID1' }));
    return ctx;
  }

  it('queues the policy refund through the PayU API when the customer cancels', async () => {
    const { token, booking } = await paidBooking();

    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.booking.refundAmount).toBeGreaterThan(0);
    expect(lastRefundRequest).toMatchObject({ paymentId: 'PAID1', amount: res.body.booking.refundAmount });
    expect(lastRefundRequest.token.length).toBeLessThanOrEqual(23);

    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('refund_pending'); // PayU always queues
    expect(after.payment.refundId).toBe('REQ1');
    expect(after.payment.amountRefunded).toBe(res.body.booking.refundAmount);
  });

  it('still cancels the booking when the gateway refund call fails', async () => {
    const { token, booking } = await paidBooking();
    paymentProvider.refund = async () => { throw new Error('PayU: refund unavailable'); };

    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.status).toBe('Cancelled');
    expect(after.payment.status).toBe('paid'); // left for an admin to retry
  });

  it('lets an admin refund from the dashboard, and settles it from a verified refund webhook', async () => {
    const { booking } = await paidBooking();
    const admin = await adminToken();

    const res = await request(app)
      .post(`${api}/admin/bookings/${booking.bookingId}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ amount: 400, reason: 'Goodwill' });

    expect(res.status).toBe(200);
    expect(res.body.settled).toBe(false);
    expect(res.body.booking.payment.status).toBe('refund_pending');
    expect(res.body.booking.payment.amountRefunded).toBe(400);

    // The webhook body is only a hint; the status comes from PayU's API.
    paymentProvider.fetchRefund = async (requestId) => ({ status: 'success', amount: 400, paymentId: 'PAID1', requestId });
    const hook = await request(app).post(WEBHOOK_URL).type('form')
      .send({ request_id: 'REQ1', mihpayid: 'PAID1', action: 'refund', status: 'success', amt: '400.00' });

    expect(hook.body.note).toBe('Refund recorded');
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('partially_refunded');
    expect(after.payment.amountRefunded).toBe(400);
  });

  it('ignores a refund webhook naming a request_id we never issued, without calling PayU\'s API', async () => {
    let fetchRefundCalls = 0;
    paymentProvider.fetchRefund = async () => { fetchRefundCalls += 1; return null; };

    const hook = await request(app).post(WEBHOOK_URL).type('form')
      .send({ request_id: 'REQ_NEVER_ISSUED', mihpayid: 'NOPE', action: 'refund', status: 'success', amt: '999.00' });

    expect(hook.status).toBe(200);
    expect(hook.body.status).toBe('ignored');
    // No booking recognised this request_id/token/txnid/paymentId combination,
    // so PayU's API is never asked about it — an unsigned delivery naming an
    // arbitrary id can't be used to spend our API quota.
    expect(fetchRefundCalls).toBe(0);
  });

  it('matches a refund webhook by our idempotency token even if request_id were somehow wrong', async () => {
    const { booking } = await paidBooking();
    const admin = await adminToken();
    await request(app).post(`${api}/admin/bookings/${booking.bookingId}/refund`)
      .set('Authorization', `Bearer ${admin}`).send({ amount: 400 });

    const stored = await Booking.findOne({ bookingId: booking.bookingId });
    expect(stored.payment.refundToken).toBeTruthy();

    paymentProvider.fetchRefund = async (requestId) => ({ status: 'success', amount: 400, paymentId: 'PAID1', requestId });
    const hook = await request(app).post(WEBHOOK_URL).type('form').send({
      request_id: 'REQ1', token: stored.payment.refundToken, merchantTxnId: stored.payment.orderId,
      mihpayid: 'PAID1', action: 'refund', status: 'success', amt: '400.00',
    });

    expect(hook.body.note).toBe('Refund recorded');
  });

  it('ignores a forged refund webhook that PayU\'s API does not confirm', async () => {
    const { booking } = await paidBooking();
    const admin = await adminToken();
    await request(app).post(`${api}/admin/bookings/${booking.bookingId}/refund`)
      .set('Authorization', `Bearer ${admin}`).send({ amount: 400 });

    paymentProvider.fetchRefund = async (requestId) => ({ status: 'queued', amount: 400, paymentId: 'PAID1', requestId });
    const hook = await request(app).post(WEBHOOK_URL).type('form')
      .send({ request_id: 'REQ1', mihpayid: 'PAID1', action: 'refund', status: 'success' });

    expect(hook.body.status).toBe('ignored');
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('refund_pending');
  });

  it('hands the amount back when PayU reports the refund failed', async () => {
    const { booking } = await paidBooking();
    const admin = await adminToken();
    await request(app).post(`${api}/admin/bookings/${booking.bookingId}/refund`)
      .set('Authorization', `Bearer ${admin}`).send({ amount: 400 });

    paymentProvider.fetchRefund = async (requestId) => ({ status: 'failure', amount: 400, paymentId: 'PAID1', requestId });
    await request(app).post(WEBHOOK_URL).type('form').send({ request_id: 'REQ1', action: 'refund' });

    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('paid');
    expect(after.payment.amountRefunded).toBe(0);
  });

  it('refuses to refund more than was actually paid', async () => {
    const { booking } = await paidBooking();
    const admin = await adminToken();

    const res = await request(app)
      .post(`${api}/admin/bookings/${booking.bookingId}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ amount: 99999 });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/still refundable/);
  });
});

describe('PayU hash helpers', () => {
  beforeEach(stubGateway);

  it('verifies a response carrying additionalCharges using PayU\'s extended formula', () => {
    const fields = {
      key: KEY, txnid: 'T1', amount: '100.00', productinfo: 'Trek', firstname: 'A', email: 'a@b.co',
      udf1: 'TG-1', udf2: '', udf3: '', udf4: '', udf5: '', status: 'success', additionalCharges: '2.00',
    };
    fields.hash = sha512(`2.00|${SALT}|success||||||||||TG-1|a@b.co|A|Trek|100.00|T1|${KEY}`);
    expect(paymentProvider.verifyResponseHash(fields)).toBe(true);
    expect(paymentProvider.verifyResponseHash({ ...fields, additionalCharges: '0.00' })).toBe(false);
  });

  it('strips pipes from free-text fields so they cannot shift hash positions', () => {
    const { params } = paymentProvider.buildCheckout({
      txnid: 'T2', amount: 10, productinfo: 'Trek | Hampta', firstname: 'A|B', email: 'a@b.co', phone: '9876543210',
      surl: 's', furl: 'f',
    });
    expect(params.productinfo).not.toContain('|');
    expect(params.firstname).not.toContain('|');
  });

  // "Salt v1" and "Salt v2" in the PayU dashboard are two rotatable salt
  // VALUES, not different hash formulas — both verified below with the exact
  // same formula. PAYU_MERCHANT_SALT_PREVIOUS exists purely to bridge a
  // rotation window.
  // Builds the exact reverse-hash string PayU's formula specifies, so the
  // test can't drift from the source by a stray (or missing) pipe.
  const reverseHash = (salt, fields) => sha512([
    salt, fields.status, '', '', '', '', '',
    fields.udf5, fields.udf4, fields.udf3, fields.udf2, fields.udf1,
    fields.email, fields.firstname, fields.productinfo, fields.amount, fields.txnid, fields.key,
  ].join('|'));

  it('accepts a hash signed with the current salt', () => {
    const fields = {
      key: KEY, txnid: 'T3', amount: '50.00', productinfo: 'Trek', firstname: 'A', email: 'a@b.co',
      udf1: '', udf2: '', udf3: '', udf4: '', udf5: '', status: 'success',
    };
    fields.hash = reverseHash(SALT, fields);
    expect(paymentProvider.verifyResponseHash(fields)).toBe(true);
  });

  it('falls back to the previous salt during a rotation window', () => {
    const oldSalt = 'OLD_SALT_BEFORE_ROTATION';
    env.payuMerchantSaltPrevious = oldSalt;

    const fields = {
      key: KEY, txnid: 'T4', amount: '50.00', productinfo: 'Trek', firstname: 'A', email: 'a@b.co',
      udf1: '', udf2: '', udf3: '', udf4: '', udf5: '', status: 'success',
    };
    // Signed with the OLD salt, as an in-flight transaction from before the
    // rotation would be.
    fields.hash = reverseHash(oldSalt, fields);

    expect(paymentProvider.verifyResponseHash(fields)).toBe(true);

    env.payuMerchantSaltPrevious = '';
  });

  it('rejects a hash that matches neither salt', () => {
    env.payuMerchantSaltPrevious = 'OLD_SALT_BEFORE_ROTATION';
    const fields = {
      key: KEY, txnid: 'T5', amount: '50.00', productinfo: 'Trek', firstname: 'A', email: 'a@b.co',
      udf1: '', udf2: '', udf3: '', udf4: '', udf5: '', status: 'success',
      hash: sha512('completely-unrelated-string'),
    };
    expect(paymentProvider.verifyResponseHash(fields)).toBe(false);
    env.payuMerchantSaltPrevious = '';
  });
});

describe('Money and loyalty never count an unpaid checkout', () => {
  it('keeps a pending booking out of the organizer\'s payable balance', async () => {
    const { org, booking, payment } = await bookOnline();

    const pending = await request(app).get(`${api}/organizer/financials`).set('Authorization', `Bearer ${org}`);
    expect(pending.body.financials.totalEarned).toBe(0);
    expect(pending.body.financials.available).toBe(0);

    await deliverWebhook(paymentResult(payment));

    const paid = await request(app).get(`${api}/organizer/financials`).set('Authorization', `Bearer ${org}`);
    expect(paid.body.financials.totalEarned).toBe(booking.organizerPayout);
    expect(paid.body.financials.available).toBe(booking.organizerPayout);
  });

  it('does not move the customer toward a free trek until the payment lands', async () => {
    const { token, booking, payment } = await bookOnline();

    const before = await request(app).get(`${api}/loyalty/me`).set('Authorization', `Bearer ${token}`);
    expect(before.body.progress.count).toBe(0);
    expect(before.body.progress.lifetime).toBe(0);

    await deliverWebhook(paymentResult(payment));

    const after = await request(app).get(`${api}/loyalty/me`).set('Authorization', `Bearer ${token}`);
    expect(after.body.progress.count).toBe(1);
  });

  it('leaves a pending booking out of platform analytics revenue', async () => {
    const { booking, payment } = await bookOnline();
    const admin = await adminToken();

    const before = await request(app).get(`${api}/admin/analytics`).set('Authorization', `Bearer ${admin}`);
    expect(before.body.overview.gmv).toBe(0);

    await deliverWebhook(paymentResult(payment));

    const after = await request(app).get(`${api}/admin/analytics`).set('Authorization', `Bearer ${admin}`);
    expect(after.body.overview.gmv).toBe(booking.finalAmount);
  });
});

describe('Pay on Arrival is unaffected', () => {
  it('confirms inline and never touches the gateway when PAYMENT_MODE is arrival', async () => {
    restoreGateway(); // back to the default configuration
    paymentProvider.buildCheckout = () => { throw new Error('the gateway must not be called'); };

    const { status, booking, payment } = await bookOnline();

    expect(status).toBe(201);
    expect(payment).toEqual({ required: false, provider: 'arrival' });
    expect(booking.payment.status).toBe('not_required');
    expect(booking.paymentRef).toMatch(/^POA_/);
    expect(await Notification.countDocuments({ ownerType: 'customer' })).toBe(1);
  });

  it('falls back to arrival when PAYMENT_MODE is online but the key and salt are missing', async () => {
    env.paymentMode = 'online';
    env.payuMerchantKey = '';
    env.payuMerchantSalt = '';

    const { booking, payment } = await bookOnline();
    expect(payment.required).toBe(false);
    expect(booking.payment.status).toBe('not_required');
  });

  it('reports the mode to the client without leaking credentials', async () => {
    const token = await customerToken();
    const res = await request(app).get(`${api}/payments/config`).set('Authorization', `Bearer ${token}`);
    expect(res.body.payment).toMatchObject({ mode: 'online', provider: 'payu', currency: 'INR' });
    expect(JSON.stringify(res.body)).not.toContain(SALT);
  });
});
