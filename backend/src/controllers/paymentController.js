import Booking from '../models/Booking.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { paymentProvider, toRupees } from '../integrations/payments.js';
import {
  publicPaymentConfig, resolvePaymentMode, confirmBookingPayment,
  startBookingPayment, refundBookingPayment, expireStalePayments,
} from '../services/paymentService.js';
import { idMatch } from './bookingController.js';

// Loads a booking the signed-in customer owns, by bookingId or ObjectId.
async function ownedBooking(req) {
  const booking = await Booking.findOne({ userEmail: req.user.email, ...idMatch(req.params.id) });
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

// GET /payments/config — tells the client whether to open Razorpay Checkout and
// with which public key, so the payment mode lives in one place (the server)
// instead of being duplicated into a frontend build flag.
export const getPaymentConfig = asyncHandler(async (req, res) => {
  res.json({ payment: publicPaymentConfig() });
});

// POST /bookings/:id/payment/verify — the browser handshake.
//
// Checkout hands the client `razorpay_order_id`, `razorpay_payment_id` and a
// signature over the two. Verifying it here is what stops a client simply
// POSTing "I paid": only Razorpay can produce that HMAC, because only Razorpay
// and this server know the key secret.
//
// This is the FAST path, not the authoritative one. The webhook confirms the
// same payment independently, so a customer who closes the tab mid-redirect
// still ends up with a confirmed booking. Whichever arrives first wins; the
// other is told the booking was already confirmed.
export const verifyBookingPayment = asyncHandler(async (req, res) => {
  const orderId = req.body.razorpay_order_id || req.body.orderId;
  const paymentId = req.body.razorpay_payment_id || req.body.paymentId;
  const signature = req.body.razorpay_signature || req.body.signature;

  if (!orderId || !paymentId || !signature) {
    throw ApiError.badRequest('razorpay_order_id, razorpay_payment_id and razorpay_signature are all required');
  }

  const booking = await ownedBooking(req);
  if (booking.payment?.orderId && booking.payment.orderId !== orderId) {
    throw ApiError.badRequest('This payment belongs to a different booking');
  }
  if (!paymentProvider.verifyCheckoutSignature({ orderId, paymentId, signature })) {
    throw ApiError.badRequest('Payment signature verification failed');
  }

  // Ask the gateway what was actually paid rather than trusting the amount the
  // client reports. The signature proves the payment exists, not its value.
  let amountPaid;
  try {
    const payment = await paymentProvider.fetchPayment(paymentId);
    amountPaid = toRupees(payment.amount);
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throw ApiError.badRequest(`This payment is ${payment.status}, not captured`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // The gateway is unreachable: leave the booking pending and let the webhook
    // settle it rather than confirming on an unverified amount.
    console.error('[payments] could not fetch payment during verify:', err);
    throw new ApiError(502, 'Could not confirm the payment with Razorpay — it will be confirmed automatically in a moment');
  }

  const result = await confirmBookingPayment(booking, {
    paymentId, orderId, amountPaid, via: 'checkout', signatureVerified: true,
  });
  if (result.error) throw ApiError.badRequest(result.error);

  res.json({
    booking: result.booking.toPublicJSON(),
    alreadyConfirmed: result.alreadyConfirmed,
  });
});

// POST /bookings/:id/payment/retry — a fresh order for a booking whose first
// attempt failed. Reuses the existing seat hold and extends it, so the customer
// isn't sent back to a departure that filled up while their card was declined.
export const retryBookingPayment = asyncHandler(async (req, res) => {
  if (resolvePaymentMode() !== 'online') throw ApiError.badRequest('Online payments are not enabled');

  const booking = await ownedBooking(req);
  if (booking.payment?.status === 'paid') throw ApiError.badRequest('This booking is already paid');
  if (booking.payment?.status !== 'pending') {
    throw ApiError.badRequest('This booking is no longer awaiting payment — please book again');
  }

  const order = await startBookingPayment(booking);
  res.json({
    payment: {
      required: true,
      provider: 'razorpay',
      keyId: publicPaymentConfig().keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      expiresAt: booking.payment.expiresAt,
    },
  });
});

// GET /bookings/:id/payment — what the checkout screen polls after Checkout
// closes, while waiting for whichever confirmation path lands first.
export const getBookingPaymentStatus = asyncHandler(async (req, res) => {
  await expireStalePayments();
  const booking = await ownedBooking(req);
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
      failureReason: payment.failureReason || '',
    },
    bookingStatus: booking.status,
  });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// POST /admin/bookings/:id/refund { amount?, reason? } — refund through the
// Razorpay API without leaving the dashboard. Omit `amount` for a full refund
// of whatever is still refundable.
export const adminRefundBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne(idMatch(req.params.id));
  if (!booking) throw ApiError.notFound('Booking not found');

  const amount = req.body.amount == null ? null : Number(req.body.amount);
  if (amount != null && !(amount > 0)) throw ApiError.badRequest('Refund amount must be greater than zero');

  const result = await refundBookingPayment(booking, { amount, reason: req.body.reason || 'Admin refund' });
  if (!result.refunded) throw ApiError.badRequest(result.reason);

  res.json({
    booking: result.booking.toPublicJSON(),
    // false means Razorpay accepted it but is still settling; the
    // refund.processed webhook closes it out.
    settled: result.settled,
    refund: { id: result.refund?.id, status: result.refund?.status, amount: toRupees(result.refund?.amount) },
  });
});

// GET /admin/payments/webhooks?status=&event= — the delivery log, so a payment
// that didn't behave can be diagnosed here rather than in the Razorpay console.
export const listWebhookEvents = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.event) filter.event = String(req.query.event);
  if (req.query.bookingId) filter.bookingId = String(req.query.bookingId);

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const events = await WebhookEvent.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json({ events: events.map((e) => e.toPublicJSON()) });
});
