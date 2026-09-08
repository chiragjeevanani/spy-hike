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
import { paymentProvider } from '../../src/integrations/payments.js';
import { expireStalePayments } from '../../src/services/paymentService.js';

const app = createApp();
const api = '/api/v1';
const WEBHOOK_URL = `${api}/webhooks/razorpay`;
const WEBHOOK_SECRET = 'whsec_test_findyourtrek';

// ─── Gateway double ──────────────────────────────────────────────────────────
// paymentProvider is a plain object shared by every module that imports it, so
// swapping its methods here intercepts the only calls that would reach the
// network. The signature helpers are deliberately left real: they are the part
// under test.
const realProvider = { ...paymentProvider };
let orderSeq = 0;
let lastRefundRequest = null;

function stubGateway() {
  env.paymentMode = 'online';
  env.razorpayKeyId = 'rzp_test_key';
  env.razorpayKeySecret = 'rzp_test_secret';
  env.razorpayWebhookSecret = WEBHOOK_SECRET;

  paymentProvider.createOrder = async ({ amount, currency = 'INR', receipt, notes }) => ({
    id: `order_TEST${++orderSeq}`,
    amount: Math.round(amount * 100),
    currency,
    receipt,
    notes,
    status: 'created',
  });
  paymentProvider.fetchPayment = async (id) => ({
    id, status: 'captured', amount: paymentProvider.__paidPaise ?? 0, currency: 'INR',
  });
  paymentProvider.refund = async ({ paymentId, amount }) => {
    lastRefundRequest = { paymentId, amount };
    return { id: `rfnd_TEST${orderSeq}`, payment_id: paymentId, amount: Math.round(amount * 100), status: 'processed' };
  };
}

function restoreGateway() {
  Object.assign(paymentProvider, realProvider);
  delete paymentProvider.__paidPaise;
  env.paymentMode = 'arrival';
  env.razorpayKeyId = '';
  env.razorpayKeySecret = '';
  env.razorpayWebhookSecret = '';
  lastRefundRequest = null;
}

// Posts a webhook the way Razorpay does: a JSON body plus an HMAC of the exact
// bytes sent. `.send(Buffer)` with an explicit content type is what keeps
// supertest from re-serialising the object (which would change those bytes).
function deliver(event, { eventId = `evt_${crypto.randomBytes(6).toString('hex')}`, secret = WEBHOOK_SECRET, signature } = {}) {
  // A string body, not an object: superagent would re-serialise an object (and
  // a Buffer) and the bytes the server hashes would no longer be the bytes we
  // signed — which is exactly the bug this endpoint is written to survive.
  const raw = JSON.stringify(event);
  const sig = signature ?? crypto.createHmac('sha256', secret).update(Buffer.from(raw)).digest('hex');
  return request(app)
    .post(WEBHOOK_URL)
    .set('Content-Type', 'application/json')
    .set('x-razorpay-signature', sig)
    .set('x-razorpay-event-id', eventId)
    .send(raw);
}

const capturedEvent = ({ orderId, paymentId = 'pay_TEST1', amountPaise, bookingId }) => ({
  entity: 'event',
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: paymentId, order_id: orderId, amount: amountPaise, currency: 'INR',
        status: 'captured', notes: { bookingId },
      },
    },
  },
});

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

describe('Online checkout (Razorpay order creation)', () => {
  it('returns a pending booking plus the order the browser needs to open Checkout', async () => {
    const { status, booking, payment } = await bookOnline();

    expect(status).toBe(201);
    expect(payment).toMatchObject({ required: true, provider: 'razorpay', keyId: 'rzp_test_key', currency: 'INR' });
    expect(payment.orderId).toMatch(/^order_TEST/);
    expect(payment.amount).toBe(booking.finalAmount * 100); // paise, as Checkout expects
    expect(booking.payment.status).toBe('pending');
    expect(booking.payment.method).toBe('razorpay');
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

  it('leaves no orphan booking behind when Razorpay rejects the order', async () => {
    paymentProvider.createOrder = async () => { throw new Error('Razorpay: order creation failed'); };
    const { status, trip } = await bookOnline();

    expect(status).toBe(500);
    expect(await Booking.countDocuments()).toBe(0);
    // …and the seats it had reserved are back.
    const departure = await Departure.findOne({ tripId: trip.id, date: DEPARTURE });
    expect(departure.availableSeats).toBe(5);
  });
});

describe('Razorpay webhook — authentication', () => {
  it('rejects a delivery whose signature does not match the raw body', async () => {
    const { booking, payment } = await bookOnline();
    const res = await deliver(
      capturedEvent({ orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId }),
      { signature: 'not-a-real-signature' },
    );

    expect(res.status).toBe(400);
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('pending'); // untouched
  });

  it('rejects a delivery signed with the API key secret instead of the webhook secret', async () => {
    const { booking, payment } = await bookOnline();
    const res = await deliver(
      capturedEvent({ orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId }),
      { secret: env.razorpayKeySecret },
    );

    expect(res.status).toBe(400);
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('pending');
  });

  it('answers 200 without a booking when the order is unknown, so Razorpay stops retrying', async () => {
    const res = await deliver(capturedEvent({ orderId: 'order_NOTOURS', amountPaise: 5000 }));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
  });
});

describe('Razorpay webhook — payment.captured', () => {
  it('confirms the booking, notifies both sides and seeds the organizer chat', async () => {
    const { token, booking, payment } = await bookOnline();

    const res = await deliver(capturedEvent({
      orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    }));
    expect(res.status).toBe(200);
    expect(res.body.note).toBe('Booking confirmed');

    const confirmed = await Booking.findOne({ bookingId: booking.bookingId });
    expect(confirmed.payment.status).toBe('paid');
    expect(confirmed.payment.paymentId).toBe('pay_TEST1');
    expect(confirmed.payment.confirmedVia).toBe('webhook');
    expect(confirmed.payment.amountPaid).toBe(booking.finalAmount);
    expect(confirmed.paymentRef).toBe('pay_TEST1');

    // Now it is a real booking everywhere.
    const mine = await request(app).get(`${api}/bookings`).set('Authorization', `Bearer ${token}`);
    expect(mine.body.bookings).toHaveLength(1);

    const notes = await Notification.find({});
    expect(notes.filter((n) => n.ownerType === 'customer')).toHaveLength(1);
    expect(notes.filter((n) => n.ownerType === 'organizer')).toHaveLength(1);
  });

  it('runs the side effects exactly once when the same event is redelivered', async () => {
    const { booking, payment } = await bookOnline();
    const event = capturedEvent({
      orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    });

    const first = await deliver(event, { eventId: 'evt_same' });
    const second = await deliver(event, { eventId: 'evt_same' });

    expect(first.body.note).toBe('Booking confirmed');
    expect(second.body).toMatchObject({ ok: true, duplicate: true });

    expect(await Notification.countDocuments({ ownerType: 'customer' })).toBe(1);
    expect(await WebhookEvent.countDocuments()).toBe(1);
  });

  it('runs them once even when order.paid follows payment.captured as a separate event', async () => {
    const { org, booking, payment } = await bookOnline();

    await deliver(capturedEvent({
      orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    }), { eventId: 'evt_captured' });

    const second = await deliver({
      entity: 'event',
      event: 'order.paid',
      payload: {
        order: { entity: { id: payment.orderId, amount_paid: booking.finalAmount * 100, notes: { bookingId: booking.bookingId } } },
        payment: { entity: { id: 'pay_TEST1', order_id: payment.orderId, amount: booking.finalAmount * 100, status: 'captured' } },
      },
    }, { eventId: 'evt_orderpaid' });

    expect(second.body.note).toBe('Already confirmed');
    expect(await Notification.countDocuments({ ownerType: 'customer' })).toBe(1);

    // The organizer's lifetime counter — which backs loyalty progress — moved
    // by one, not two.
    const organizer = await User.findOne({ email: 'payorg@example.com' });
    expect(organizer.organizer.totalBookings).toBe(1);
  });

  it('refuses to confirm a booking that was underpaid', async () => {
    const { booking, payment } = await bookOnline();

    const res = await deliver(capturedEvent({
      orderId: payment.orderId, amountPaise: 100, bookingId: booking.bookingId, // ₹1 against ₹1000
    }));

    expect(res.status).toBe(500); // asks Razorpay to retry; the money is visible in the dashboard
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('pending');
    expect(after.payment.failureReason).toMatch(/Underpaid/);
  });

  it('lets a retried delivery re-run after processing failed', async () => {
    const { booking, payment } = await bookOnline();
    const event = capturedEvent({
      orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    });

    // First delivery fails inside processing…
    await Booking.updateOne({ bookingId: booking.bookingId }, { $set: { 'payment.amountDue': 999999 } });
    const failed = await deliver(event, { eventId: 'evt_retry' });
    expect(failed.status).toBe(500);
    expect((await WebhookEvent.findOne({ eventId: 'evt_retry' })).status).toBe('failed');

    // …and Razorpay's retry of that same event is allowed a real second run
    // rather than being dismissed as a duplicate.
    await Booking.updateOne({ bookingId: booking.bookingId }, { $set: { 'payment.amountDue': booking.finalAmount } });
    const retried = await deliver(event, { eventId: 'evt_retry' });
    expect(retried.status).toBe(200);
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('paid');
    expect((await WebhookEvent.findOne({ eventId: 'evt_retry' })).attempts).toBe(2);
  });
});

describe('Razorpay webhook — payment.failed', () => {
  it('records the attempt without cancelling a booking the customer may still pay for', async () => {
    const { booking, payment, trip } = await bookOnline();

    const res = await deliver({
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_FAILED', order_id: payment.orderId, amount: booking.finalAmount * 100,
            status: 'failed', error_description: 'Card declined by issuer',
            notes: { bookingId: booking.bookingId },
          },
        },
      },
    });
    expect(res.status).toBe(200);

    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('pending'); // still payable
    expect(after.status).not.toBe('Cancelled');
    expect(after.payment.failureReason).toBe('Card declined by issuer');

    // The seats are still held for the retry.
    const departure = await Departure.findOne({ tripId: trip.id, date: DEPARTURE });
    expect(departure.availableSeats).toBe(4);
  });

  it('still lets the booking be confirmed if a later attempt succeeds', async () => {
    const { booking, payment } = await bookOnline();
    await deliver({
      entity: 'event',
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_FAILED', order_id: payment.orderId, amount: booking.finalAmount * 100, error_description: 'Declined' } } },
    }, { eventId: 'evt_fail' });

    const ok = await deliver(capturedEvent({
      orderId: payment.orderId, paymentId: 'pay_RETRY_OK',
      amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    }), { eventId: 'evt_ok' });

    expect(ok.body.note).toBe('Booking confirmed');
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('paid');
    expect(after.payment.paymentId).toBe('pay_RETRY_OK');
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

    const res = await book(token, {
      tripId: trip.id, selectedDate: DEPARTURE,
      selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
      useLoyaltyReward: true,
    });
    expect(res.status).toBe(201);
    expect((await Voucher.findOne({ ownerKey: me.email })).status).toBe('used');

    await Booking.updateOne({ bookingId: res.body.booking.bookingId }, { $set: { 'payment.expiresAt': new Date(Date.now() - 1000) } });
    await expireStalePayments();

    expect((await Voucher.findOne({ ownerKey: me.email })).status).toBe('available');
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

describe('Browser handshake (POST /bookings/:id/payment/verify)', () => {
  const sign = (orderId, paymentId) =>
    crypto.createHmac('sha256', env.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex');

  it('confirms the booking when the checkout signature is genuine', async () => {
    const { token, booking, payment } = await bookOnline();
    paymentProvider.__paidPaise = booking.finalAmount * 100;

    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/payment/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        razorpay_order_id: payment.orderId,
        razorpay_payment_id: 'pay_BROWSER',
        razorpay_signature: sign(payment.orderId, 'pay_BROWSER'),
      });

    expect(res.status).toBe(200);
    expect(res.body.booking.payment.status).toBe('paid');
    expect(res.body.booking.payment.confirmedVia).toBe('checkout');
  });

  it('rejects a forged signature', async () => {
    const { token, booking, payment } = await bookOnline();

    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/payment/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        razorpay_order_id: payment.orderId,
        razorpay_payment_id: 'pay_FORGED',
        razorpay_signature: 'deadbeef',
      });

    expect(res.status).toBe(400);
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.status).toBe('pending');
  });

  it('is a no-op when the webhook already confirmed the same payment', async () => {
    const { token, booking, payment } = await bookOnline();
    paymentProvider.__paidPaise = booking.finalAmount * 100;

    await deliver(capturedEvent({
      orderId: payment.orderId, paymentId: 'pay_RACE',
      amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    }));

    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/payment/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        razorpay_order_id: payment.orderId,
        razorpay_payment_id: 'pay_RACE',
        razorpay_signature: sign(payment.orderId, 'pay_RACE'),
      });

    expect(res.status).toBe(200);
    expect(res.body.alreadyConfirmed).toBe(true);
    expect(await Notification.countDocuments({ ownerType: 'customer' })).toBe(1);
  });

  it('will not confirm one customer\'s booking with another booking\'s order', async () => {
    const { token, booking } = await bookOnline();
    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/payment/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        razorpay_order_id: 'order_SOMEONEELSE',
        razorpay_payment_id: 'pay_X',
        razorpay_signature: sign('order_SOMEONEELSE', 'pay_X'),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/different booking/);
  });
});

describe('Refunds', () => {
  async function paidBooking() {
    const ctx = await bookOnline();
    await deliver(capturedEvent({
      orderId: ctx.payment.orderId, paymentId: 'pay_PAID',
      amountPaise: ctx.booking.finalAmount * 100, bookingId: ctx.booking.bookingId,
    }));
    return ctx;
  }

  it('pushes the policy refund back through the Razorpay API when the customer cancels', async () => {
    const { token, booking } = await paidBooking();

    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.booking.refundAmount).toBeGreaterThan(0);
    expect(lastRefundRequest).toEqual({ paymentId: 'pay_PAID', amount: res.body.booking.refundAmount });

    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.payment.status).toBe('refunded');
    expect(after.payment.amountRefunded).toBe(res.body.booking.refundAmount);
  });

  it('still cancels the booking when the gateway refund call fails', async () => {
    const { token, booking } = await paidBooking();
    paymentProvider.refund = async () => { throw new Error('Razorpay: refund unavailable'); };

    const res = await request(app)
      .post(`${api}/bookings/${booking.bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const after = await Booking.findOne({ bookingId: booking.bookingId });
    expect(after.status).toBe('Cancelled');
    expect(after.payment.status).toBe('paid'); // left for an admin to retry
  });

  it('lets an admin refund from the dashboard, and reconciles the refund webhook', async () => {
    const { booking } = await paidBooking();
    const admin = await adminToken();

    const res = await request(app)
      .post(`${api}/admin/bookings/${booking.bookingId}/refund`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ amount: 400, reason: 'Goodwill' });

    expect(res.status).toBe(200);
    expect(res.body.booking.payment.status).toBe('partially_refunded');
    expect(res.body.booking.payment.amountRefunded).toBe(400);

    // Razorpay confirms the same refund independently.
    const hook = await deliver({
      entity: 'event',
      event: 'refund.processed',
      payload: { refund: { entity: { id: 'rfnd_TEST1', payment_id: 'pay_PAID', amount: 40000, status: 'processed' } } },
    });
    expect(hook.body.note).toBe('Refund recorded');
    expect((await Booking.findOne({ bookingId: booking.bookingId })).payment.amountRefunded).toBe(400);
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

describe('Money and loyalty never count an unpaid checkout', () => {
  it('keeps a pending booking out of the organizer\'s payable balance', async () => {
    const { org, booking, payment } = await bookOnline();

    const pending = await request(app).get(`${api}/organizer/financials`).set('Authorization', `Bearer ${org}`);
    expect(pending.body.financials.totalEarned).toBe(0);
    expect(pending.body.financials.available).toBe(0);

    await deliver(capturedEvent({
      orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    }));

    const paid = await request(app).get(`${api}/organizer/financials`).set('Authorization', `Bearer ${org}`);
    expect(paid.body.financials.totalEarned).toBe(booking.organizerPayout);
    expect(paid.body.financials.available).toBe(booking.organizerPayout);
  });

  it('does not move the customer toward a free trek until the payment lands', async () => {
    const { token, booking, payment } = await bookOnline();

    const before = await request(app).get(`${api}/loyalty/me`).set('Authorization', `Bearer ${token}`);
    expect(before.body.progress.count).toBe(0);
    expect(before.body.progress.lifetime).toBe(0);

    await deliver(capturedEvent({
      orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    }));

    const after = await request(app).get(`${api}/loyalty/me`).set('Authorization', `Bearer ${token}`);
    expect(after.body.progress.count).toBe(1);
  });

  it('leaves a pending booking out of platform analytics revenue', async () => {
    const { booking, payment } = await bookOnline();
    const admin = await adminToken();

    const before = await request(app).get(`${api}/admin/analytics`).set('Authorization', `Bearer ${admin}`);
    expect(before.body.overview.gmv).toBe(0);

    await deliver(capturedEvent({
      orderId: payment.orderId, amountPaise: booking.finalAmount * 100, bookingId: booking.bookingId,
    }));

    const after = await request(app).get(`${api}/admin/analytics`).set('Authorization', `Bearer ${admin}`);
    expect(after.body.overview.gmv).toBe(booking.finalAmount);
  });
});

describe('Pay on Arrival is unaffected', () => {
  it('confirms inline and never touches the gateway when PAYMENT_MODE is arrival', async () => {
    restoreGateway(); // back to the default configuration
    paymentProvider.createOrder = async () => { throw new Error('the gateway must not be called'); };

    const { status, booking, payment } = await bookOnline();

    expect(status).toBe(201);
    expect(payment).toEqual({ required: false, provider: 'arrival' });
    expect(booking.payment.status).toBe('not_required');
    expect(booking.paymentRef).toMatch(/^POA_/);
    expect(await Notification.countDocuments({ ownerType: 'customer' })).toBe(1);
  });

  it('falls back to arrival when PAYMENT_MODE is online but the keys are missing', async () => {
    env.paymentMode = 'online';
    env.razorpayKeyId = '';
    env.razorpayKeySecret = '';

    const { booking, payment } = await bookOnline();
    expect(payment.required).toBe(false);
    expect(booking.payment.status).toBe('not_required');
  });
});
