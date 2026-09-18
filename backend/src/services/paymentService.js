import crypto from 'node:crypto';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { paymentProvider, PAYU_RETURN_PATH } from '../integrations/payments.js';
import { releaseSeats } from './inventoryService.js';
import { releaseCouponRedemption } from './couponService.js';
import { finalizeConfirmedBooking, releaseBookingVoucher } from './bookingFinalizeService.js';
import { notifyCustomer } from './notificationService.js';

// Money is compared in whole paise so float noise from a percentage coupon
// can never make a correct payment look short.
const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const paiseToRupees = (paise) => Math.round(Number(paise || 0)) / 100;

// Whether checkout goes through PayU or stays on Pay on Arrival.
//
// Deliberately a runtime check rather than a boot-time one: PAYMENT_MODE=online
// with missing or half-configured keys degrades to 'arrival' instead of taking
// the booking flow down, so a credentials mistake in production costs the
// online payment option rather than every sale.
export function resolvePaymentMode() {
  return env.paymentMode === 'online' && paymentProvider.isConfigured() ? 'online' : 'arrival';
}

// What the client needs to decide how to label and run checkout. Safe to serve
// to an authenticated customer: nothing here is secret.
export function publicPaymentConfig() {
  const mode = resolvePaymentMode();
  return {
    mode,
    provider: mode === 'online' ? 'payu' : 'arrival',
    currency: 'INR',
    pendingTtlMinutes: env.paymentPendingTtlMinutes,
  };
}

// Where PayU posts the payment result (used as both surl and furl). PayU's
// servers and the customer's browser must be able to reach it, so the configured
// public origin wins; the request's own host is only a development fallback.
export function paymentReturnUrl(req) {
  const origin = env.apiPublicUrl || (req ? `${req.protocol}://${req.get('host')}` : '');
  return `${origin}${PAYU_RETURN_PATH}`;
}

// PayU needs a unique txnid for every attempt (a retry cannot reuse one) and
// caps it at 25 characters. The booking id prefix keeps it human-traceable in
// the PayU dashboard.
function newTxnId(booking) {
  const prefix = String(booking.bookingId || 'BK').replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
  const suffix = `${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`.toUpperCase();
  return `${prefix}${suffix}`.slice(0, 25);
}

// The shape the client receives to redirect to PayU — shared by booking
// creation and the retry endpoint so both stay in lockstep.
export function checkoutResponse(booking, checkout) {
  return {
    required: true,
    provider: 'payu',
    txnId: booking.payment.orderId,
    amount: booking.payment.amountDue,
    currency: booking.payment.currency || 'INR',
    expiresAt: booking.payment.expiresAt,
    // A form the browser POSTs as-is: { action, method, params }.
    checkout,
  };
}

// Marks a booking as collected at the trailhead. Pay on Arrival owes nothing to
// a gateway, so it is confirmed the moment it is created — this only records
// that fact in the same shape the online flow uses, so downstream code never
// has to branch on the mode.
export function markPayOnArrival(booking) {
  booking.paymentRef = `POA_${Date.now()}`;
  booking.payment = {
    method: 'arrival',
    status: 'not_required',
    amountDue: booking.finalAmount,
    currency: 'INR',
  };
  return booking;
}

// Opens a PayU transaction against an already-created (pending) booking and
// records it. The seats are already reserved by this point, and `expiresAt` is
// the promise that they won't be held forever if the customer walks away.
//
// Returns the signed hosted-checkout form. Building it is local (no network),
// but it still throws when PayU isn't configured, which the booking controller
// relies on to leave no orphan booking behind.
export async function startBookingPayment(booking, { returnUrl } = {}) {
  const txnid = newTxnId(booking);

  // PayU requires a phone number. The account's verified mobile is the right
  // one; the lead traveller's contact (validated to 10 digits at booking) is
  // the fallback for accounts that never added one.
  const account = await User.findOne({ email: booking.userEmail }).select('mobile name').lean();
  const phone = account?.mobile || booking.travelers?.[0]?.emergencyContact || '';

  const checkout = paymentProvider.buildCheckout({
    txnid,
    amount: booking.finalAmount,
    productinfo: `${booking.tripName || 'Trek'} ${booking.selectedDate || ''}`,
    firstname: booking.userName || account?.name || 'Traveller',
    email: booking.userEmail,
    phone,
    surl: returnUrl || paymentReturnUrl(),
    furl: returnUrl || paymentReturnUrl(),
    udf: { udf1: booking.bookingId, udf2: String(booking.tripId || '') },
  });

  booking.payment = {
    method: 'payu',
    status: 'pending',
    orderId: txnid,
    currency: 'INR',
    amountDue: booking.finalAmount,
    amountPaid: 0,
    amountRefunded: 0,
    expiresAt: new Date(Date.now() + env.paymentPendingTtlMinutes * 60_000),
  };
  booking.paymentRef = txnid;
  await booking.save();

  return checkout;
}

// The single confirmation path, shared by the PayU return post, the webhook and
// API reconciliation.
//
// These routinely fire for the same payment, and any can arrive first — the
// webhook regularly beats a customer on a slow connection, and the return post
// beats a delayed delivery. The atomic pending → paid transition below is what
// makes that a non-event: exactly one caller matches the filter, so the
// notifications, vouchers and counters in finalizeConfirmedBooking() run once.
// The loser is told `alreadyConfirmed` and returns the same booking.
export async function confirmBookingPayment(booking, {
  paymentId,
  orderId,
  amountPaid,
  via = 'webhook',
  signatureVerified = false,
} = {}) {
  const current = await Booking.findById(booking._id ?? booking);
  if (!current) return { booking: null, alreadyConfirmed: false, error: 'Booking not found' };

  // Nothing to confirm — Pay on Arrival, or a payment already settled.
  if (current.payment?.status !== 'pending') {
    return { booking: current, alreadyConfirmed: true };
  }

  // The order amount is set by the server, so a short payment means something
  // is wrong (a tampered client, a partial capture, the wrong order). Refuse
  // rather than confirm: the booking stays pending, the money is visible in the
  // dashboard, and the sweeper will not silently pocket it because a paid
  // payment id is recorded below for reconciliation.
  const duePaise = toPaise(current.payment.amountDue ?? current.finalAmount);
  const paidPaise = amountPaid == null ? duePaise : toPaise(amountPaid);
  if (paidPaise < duePaise) {
    await Booking.updateOne({ _id: current._id }, {
      $set: {
        'payment.paymentId': paymentId || current.payment.paymentId,
        'payment.amountPaid': paiseToRupees(paidPaise),
        'payment.failureReason': `Underpaid: received ₹${paiseToRupees(paidPaise)} of ₹${paiseToRupees(duePaise)}`,
      },
    });
    return { booking: current, alreadyConfirmed: false, error: 'Paid amount does not match the booking total' };
  }

  const claimed = await Booking.findOneAndUpdate(
    { _id: current._id, 'payment.status': 'pending' },
    {
      $set: {
        'payment.status': 'paid',
        'payment.paymentId': paymentId || null,
        'payment.orderId': orderId || current.payment.orderId,
        'payment.amountPaid': paiseToRupees(paidPaise),
        'payment.paidAt': new Date(),
        'payment.confirmedVia': via,
        'payment.signatureVerified': !!signatureVerified,
        'payment.expiresAt': null,
        'payment.failureReason': '',
        paymentRef: paymentId || current.paymentRef,
      },
    },
    { new: true },
  );

  // Lost the race to the other channel; it is running the side effects.
  if (!claimed) {
    return { booking: await Booking.findById(current._id), alreadyConfirmed: true };
  }

  await finalizeConfirmedBooking(claimed);
  return { booking: claimed, alreadyConfirmed: false };
}

// Records a failed attempt WITHOUT cancelling the booking.
//
// A failure result fires on every declined card, expired UPI collect request
// and abandoned netbanking page — including ones the customer immediately
// retries and pays. Cancelling here would destroy bookings that are minutes
// from succeeding, so the booking stays pending and holds its seats until
// expireStalePayments() decides the customer really is gone.
export async function recordPaymentFailure(booking, { paymentId, reason } = {}) {
  return Booking.findOneAndUpdate(
    { _id: booking._id ?? booking, 'payment.status': 'pending' },
    {
      $set: {
        'payment.failedAt': new Date(),
        'payment.failureReason': String(reason || 'Payment attempt failed').slice(0, 300),
        ...(paymentId ? { 'payment.paymentId': paymentId } : {}),
      },
    },
    { new: true },
  );
}

// Releases everything an unpaid booking is holding: its seats, its coupon
// redemption slot and its loyalty voucher. The atomic pending → failed
// transition means a payment that lands mid-sweep either wins (and keeps the
// booking) or loses (and is refunded by hand from the dashboard) — never both.
//
// Returns null when the booking wasn't pending any more, which is what makes
// this safe to call from the sweeper and from an explicit cancellation without
// the two ever double-releasing.
export async function releasePendingBooking(booking, { reason, notify = true } = {}) {
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, 'payment.status': 'pending' },
    {
      $set: {
        'payment.status': 'failed',
        'payment.failedAt': new Date(),
        'payment.failureReason':
          reason || booking.payment?.failureReason || 'Payment was not completed in time',
        'payment.expiresAt': null,
        status: 'Cancelled',
        cancelledAt: new Date().toISOString(),
      },
    },
    { new: true },
  );
  if (!claimed) return null;

  await releaseSeats(claimed.tripId, claimed.selectedDate, claimed.travelersCount);
  if (claimed.couponUsed) {
    await releaseCouponRedemption({
      code: claimed.couponUsed,
      organizerEmail: claimed.organizerEmail,
    });
  }
  await releaseBookingVoucher(claimed);

  if (notify) {
    await notifyCustomer(claimed.userEmail, {
      title: '⌛ Booking Expired',
      content: `Your payment for ${claimed.tripName} wasn't completed in time, so the hold on your seats has been released. You can book again any time.`,
      type: 'Booking',
    });
  }

  return claimed;
}

// Asks PayU directly what happened to a pending booking's current transaction
// and applies it. This is the safety net for a return post that never arrived
// (tab closed mid-redirect) and a webhook that is late or misconfigured.
//
// Returns 'paid' | 'failed' | 'pending' | 'unknown' (PayU has no record — the
// customer never reached the payment page) | 'skipped' (nothing to check).
export async function reconcileBookingPayment(booking) {
  const payment = booking.payment || {};
  if (payment.method !== 'payu' || payment.status !== 'pending' || !payment.orderId) return 'skipped';
  if (!paymentProvider.isConfigured()) return 'skipped';

  const txn = await paymentProvider.verifyPayment(payment.orderId);
  if (!txn) return 'unknown';

  if (txn.status === 'success') {
    const result = await confirmBookingPayment(booking, {
      paymentId: txn.paymentId,
      orderId: payment.orderId,
      amountPaid: txn.amount,
      via: 'reconcile',
      // Fetched from PayU's API with our own credentials, not client input.
      signatureVerified: true,
    });
    return result.error ? 'pending' : 'paid';
  }
  if (['failure', 'failed', 'usercancelled', 'dropped', 'bounced'].includes(txn.status)) {
    await recordPaymentFailure(booking, { paymentId: txn.paymentId, reason: txn.reason || `Payment ${txn.status}` });
    return 'failed';
  }
  return 'pending';
}

// Sweeps every pending booking whose hold has run out. Called opportunistically
// on the paths that care (a new booking wanting those seats, a payment status
// poll) — the same lazy-sweep pattern autoResolveBookingStatuses uses, so no
// scheduler is required for correctness. Safe to also run from cron.
//
// Before releasing anything it checks with PayU: a payment that succeeded but
// whose notification never reached us must be confirmed, not cancelled.
export async function expireStalePayments() {
  const stale = await Booking.find({
    'payment.status': 'pending',
    'payment.expiresAt': { $ne: null, $lt: new Date() },
  }).limit(100);

  const expired = [];
  for (const booking of stale) {
    try {
      let outcome;
      try {
        outcome = await reconcileBookingPayment(booking);
      } catch (err) {
        // PayU unreachable. Holding the seats a little longer is far cheaper
        // than cancelling a booking that was paid — but not forever, or an
        // outage would lock departures indefinitely.
        const overdueMs = Date.now() - new Date(booking.payment.expiresAt).getTime();
        if (overdueMs < STALE_RECONCILE_GRACE_MS) {
          console.warn(`[payments] could not reconcile ${booking.bookingId} before expiry; will retry:`, err?.message || err);
          continue;
        }
      }
      if (outcome === 'paid' || outcome === 'pending') continue;

      const done = await releasePendingBooking(booking);
      if (done) expired.push(done.bookingId);
    } catch (err) {
      console.error(`[payments] failed to expire booking ${booking.bookingId}:`, err);
    }
  }
  return expired;
}

const STALE_RECONCILE_GRACE_MS = 60 * 60_000;

// A payment is fully refunded only once the returned total reaches what was
// paid; anything short of that is a partial.
const refundStatusFor = (amountPaid, amountRefunded) =>
  (Number(amountRefunded) >= Number(amountPaid) ? 'refunded' : 'partially_refunded');

// Issues a refund through the PayU API. `amount` is in rupees and defaults to
// whatever is still refundable.
//
// PayU never settles a refund synchronously: the API only queues it. The
// booking is marked 'refund_pending' with the amount counted immediately (so a
// second request can't over-refund), and the refund webhook — re-checked
// against the API — moves it to refunded, or hands the amount back on failure.
// A booking paid on arrival has nothing to refund here — that money never went
// through the gateway and is settled off-platform.
export async function refundBookingPayment(booking, { amount, reason = '' } = {}) {
  const payment = booking.payment || {};
  if (payment.method !== 'payu' || !payment.paymentId) {
    return { refunded: false, reason: 'This booking was not paid online' };
  }
  if (!['paid', 'partially_refunded', 'refund_pending'].includes(payment.status)) {
    return { refunded: false, reason: `A ${payment.status} payment cannot be refunded` };
  }

  const alreadyRefunded = Number(payment.amountRefunded || 0);
  const refundable = Math.round((Number(payment.amountPaid || 0) - alreadyRefunded) * 100) / 100;
  const requested = amount == null ? refundable : Math.round(Number(amount) * 100) / 100;
  if (requested <= 0) return { refunded: false, reason: 'Nothing left to refund' };
  if (requested > refundable) {
    return { refunded: false, reason: `Only ₹${refundable} is still refundable on this payment` };
  }

  // Unique per refund and ≤ 23 chars, as PayU requires. PayU rejects a reused
  // token, which is what stops a retried call from refunding twice.
  const token = `RF${String(booking.bookingId).replace(/[^A-Za-z0-9]/g, '').slice(0, 9)}${Date.now().toString(36).toUpperCase()}`.slice(0, 23);
  const refund = await paymentProvider.refund({
    paymentId: payment.paymentId,
    amount: requested,
    token,
    note: `${booking.bookingId} ${reason}`.trim(),
  });

  const total = Math.round((alreadyRefunded + requested) * 100) / 100;
  const updated = await Booking.findByIdAndUpdate(
    booking._id,
    {
      $set: {
        'payment.refundId': refund?.id || null,
        'payment.amountRefunded': total,
        'payment.status': 'refund_pending',
      },
    },
    { new: true },
  );

  return { refunded: true, settled: false, refund: { ...refund, amount: requested }, booking: updated };
}

// Applies a refund outcome reported by PayU (already verified against the API
// by the caller). `amount` is in rupees.
//
// Success closes the refund out. Failure gives the amount back: it was counted
// the moment the refund was requested, and the money is still with us.
export async function applyRefundUpdate(booking, { requestId, amount, failed = false } = {}) {
  const paid = Number(booking.payment?.amountPaid || 0);
  const counted = Number(booking.payment?.amountRefunded || 0);

  if (failed) {
    const remaining = Math.max(0, Math.round((counted - Number(amount || 0)) * 100) / 100);
    return Booking.findByIdAndUpdate(booking._id, {
      $set: {
        'payment.amountRefunded': remaining,
        'payment.status': remaining > 0 ? refundStatusFor(paid, remaining) : 'paid',
        'payment.failureReason': 'Refund failed at the gateway — retry it from the dashboard',
      },
    }, { new: true });
  }

  // A refund issued by hand in the PayU dashboard was never counted locally;
  // take the larger figure so it reconciles itself here instead of drifting.
  const total = Math.max(counted, Number(amount || 0));
  return Booking.findByIdAndUpdate(booking._id, {
    $set: {
      'payment.refundId': requestId || booking.payment?.refundId || null,
      'payment.amountRefunded': total,
      'payment.refundedAt': new Date(),
      'payment.status': refundStatusFor(paid, total),
      'payment.failureReason': '',
    },
  }, { new: true });
}
