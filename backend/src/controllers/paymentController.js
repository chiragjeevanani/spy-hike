import Booking from '../models/Booking.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { paymentProvider } from '../integrations/payments.js';
import {
  publicPaymentConfig, resolvePaymentMode, confirmBookingPayment, recordPaymentFailure,
  startBookingPayment, refundBookingPayment, expireStalePayments, reconcileBookingPayment,
  paymentReturnUrl, checkoutResponse,
} from '../services/paymentService.js';
import { idMatch } from './bookingController.js';

// Loads a booking the signed-in customer owns, by bookingId or ObjectId.
async function ownedBooking(req) {
  const booking = await Booking.findOne({ userEmail: req.user.email, ...idMatch(req.params.id) });
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

// GET /payments/config — tells the client whether checkout goes through PayU,
// so the payment mode lives in one place (the server) instead of being
// duplicated into a frontend build flag.
export const getPaymentConfig = asyncHandler(async (req, res) => {
  res.json({ payment: publicPaymentConfig() });
});

// A PayU post-back names our transaction by txnid and our booking in udf1.
// The txnid is the primary key; udf1 covers an older attempt that was paid
// after the customer had already started a retry with a fresh txnid.
export async function findBookingForTxn({ txnid, udf1 }) {
  if (txnid) {
    const byTxn = await Booking.findOne({ 'payment.orderId': txnid });
    if (byTxn) return byTxn;
  }
  if (udf1) return Booking.findOne({ bookingId: udf1 });
  return null;
}

// Applies a hash-verified PayU payment result (return post or webhook) to its
// booking. Returns { status, note } for the caller to log or record.
export async function applyPayuResult(booking, fields, via) {
  const status = String(fields.status || '').toLowerCase();

  if (status === 'success') {
    const result = await confirmBookingPayment(booking, {
      paymentId: fields.mihpayid ? String(fields.mihpayid) : null,
      orderId: fields.txnid,
      // `amount` is covered by the hash; it's the amount we asked PayU to
      // collect, excluding any convenience fee PayU added on top.
      amountPaid: Number(fields.amount),
      via,
      signatureVerified: true,
    });
    if (result.error) return { status: 'error', note: result.error };
    return { status: 'processed', note: result.alreadyConfirmed ? 'Already confirmed' : 'Booking confirmed' };
  }

  if (status === 'failure' || status === 'failed' || status === 'usercancelled') {
    await recordPaymentFailure(booking, {
      paymentId: fields.mihpayid ? String(fields.mihpayid) : null,
      reason: fields.error_Message || fields.field9 || fields.unmappedstatus || 'Payment attempt failed',
    });
    return { status: 'processed', note: 'Failed attempt recorded; the seat hold stands until it expires' };
  }

  // 'pending' (e.g. a UPI collect still awaiting approval) — nothing to do yet;
  // the webhook or reconciliation settles it.
  return { status: 'ignored', note: `Payment is ${status || 'in an unknown state'}` };
}

// POST /api/v1/payments/payu/return — PayU's surl AND furl.
//
// The customer's browser arrives here as a cross-site form POST from PayU, so
// there is no JWT: the reverse hash is the authentication. Whatever happens,
// the browser is redirected back into the app, which then polls the payment
// status endpoint for the authoritative answer. That means a tampered or
// unverifiable post changes nothing — it only sends the customer back to a
// screen that asks PayU's API what really happened.
export const payuReturn = asyncHandler(async (req, res) => {
  const fields = req.body || {};
  const booking = await findBookingForTxn({ txnid: fields.txnid, udf1: fields.udf1 });

  if (!booking) {
    console.warn(`[payu-return] no booking for txnid ${fields.txnid}`);
    return res.redirect(303, `${env.frontendUrl}/app/bookings`);
  }

  if (paymentProvider.verifyResponseHash(fields)) {
    try {
      const outcome = await applyPayuResult(booking, fields, 'checkout');
      if (outcome.status === 'error') console.warn(`[payu-return] ${booking.bookingId}: ${outcome.note}`);
    } catch (err) {
      // Never strand the customer on a JSON error page mid-checkout; the status
      // poll's reconciliation will settle this booking.
      console.error(`[payu-return] failed to apply result for ${booking.bookingId}:`, err);
    }
  } else {
    console.warn(`[payu-return] hash verification failed for txnid ${fields.txnid}; deferring to reconciliation`);
  }

  const target = new URL(`${env.frontendUrl}/app/book/${encodeURIComponent(booking.tripId)}`);
  target.searchParams.set('booking', booking.bookingId);
  target.searchParams.set('payment', 'return');
  return res.redirect(303, target.toString());
});

// POST /bookings/:id/payment/retry — a fresh PayU transaction for a booking
// whose attempt failed or was abandoned. Reuses the existing seat hold and
// extends it, so the customer isn't sent back to a departure that filled up
// while their card was declined.
export const retryBookingPayment = asyncHandler(async (req, res) => {
  if (resolvePaymentMode() !== 'online') throw ApiError.badRequest('Online payments are not enabled');

  const booking = await ownedBooking(req);

  // The previous attempt may have succeeded after all (a UPI approval that
  // landed late). Check before opening a second transaction the customer
  // could pay twice.
  try {
    await reconcileBookingPayment(booking);
  } catch (err) {
    console.warn(`[payments] could not reconcile ${booking.bookingId} before retry:`, err?.message || err);
  }
  const current = await Booking.findById(booking._id);

  if (current.payment?.status === 'paid') throw ApiError.badRequest('This booking is already paid');
  if (current.payment?.status !== 'pending') {
    throw ApiError.badRequest('This booking is no longer awaiting payment — please book again');
  }

  const checkout = await startBookingPayment(current, { returnUrl: paymentReturnUrl(req) });
  res.json({ payment: checkoutResponse(current, checkout) });
});

// GET /bookings/:id/payment — what the app polls after PayU redirects back,
// while waiting for whichever confirmation path lands first. A still-pending
// booking is checked against PayU's API on each poll, so the answer doesn't
// depend on the return post or the webhook having arrived.
export const getBookingPaymentStatus = asyncHandler(async (req, res) => {
  await expireStalePayments();
  let booking = await ownedBooking(req);

  if (booking.payment?.status === 'pending') {
    try {
      const outcome = await reconcileBookingPayment(booking);
      if (outcome !== 'skipped') booking = await Booking.findById(booking._id);
    } catch (err) {
      console.warn(`[payments] reconcile failed for ${booking.bookingId}:`, err?.message || err);
    }
  }

  const payment = booking.payment || {};
  res.json({
    payment: {
      status: payment.status || 'not_required',
      method: payment.method || 'arrival',
      orderId: payment.orderId || null,
      paymentId: payment.paymentId || null,
      amountDue: payment.amountDue ?? booking.finalAmount,
      amountPaid: payment.amountPaid ?? 0,
      amountRefunded: payment.amountRefunded ?? 0,
      expiresAt: payment.expiresAt || null,
      failedAt: payment.failedAt || null,
      failureReason: payment.failureReason || '',
    },
    bookingStatus: booking.status,
  });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// POST /admin/bookings/:id/refund { amount?, reason? } — refund through the
// PayU API without leaving the dashboard. Omit `amount` for a full refund of
// whatever is still refundable.
export const adminRefundBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne(idMatch(req.params.id));
  if (!booking) throw ApiError.notFound('Booking not found');

  const amount = req.body.amount == null ? null : Number(req.body.amount);
  if (amount != null && !(amount > 0)) throw ApiError.badRequest('Refund amount must be greater than zero');

  const result = await refundBookingPayment(booking, { amount, reason: req.body.reason || 'Admin refund' });
  if (!result.refunded) throw ApiError.badRequest(result.reason);

  res.json({
    booking: result.booking.toPublicJSON(),
    // PayU always queues refunds; the refund webhook closes it out.
    settled: result.settled,
    refund: { id: result.refund?.id, status: result.refund?.status, amount: result.refund?.amount },
  });
});

// GET /admin/payments/webhooks?status=&event= — the delivery log, so a payment
// that didn't behave can be diagnosed here rather than in the PayU dashboard.
export const listWebhookEvents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.event) filter.event = String(req.query.event);
  if (req.query.bookingId) filter.bookingId = String(req.query.bookingId);

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const events = await WebhookEvent.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json({ events: events.map((e) => e.toPublicJSON()) });
});
