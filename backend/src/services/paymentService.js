import Booking from '../models/Booking.js';
import { env } from '../config/env.js';
import { paymentProvider, toRupees, toPaise } from '../integrations/payments.js';
import { releaseSeats } from './inventoryService.js';
import { releaseCouponRedemption } from './couponService.js';
import { finalizeConfirmedBooking, releaseBookingVoucher } from './bookingFinalizeService.js';
import { notifyCustomer } from './notificationService.js';

// Whether checkout goes through Razorpay or stays on Pay on Arrival.
//
// Deliberately a runtime check rather than a boot-time one: PAYMENT_MODE=online
// with missing or half-configured keys degrades to 'arrival' instead of taking
// the booking flow down, so a credentials mistake in production costs the
// online payment option rather than every sale.
export function resolvePaymentMode() {
  return env.paymentMode === 'online' && paymentProvider.isConfigured() ? 'online' : 'arrival';
}

// What the browser needs to open Checkout, plus enough for the client to know
// whether to bother. Safe to serve to an authenticated customer: the key id is
// public and the secret never appears here.
export function publicPaymentConfig() {
  const mode = resolvePaymentMode();
  return {
    mode,
    currency: 'INR',
    keyId: mode === 'online' ? paymentProvider.publicKeyId() : null,
    pendingTtlMinutes: env.paymentPendingTtlMinutes,
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

// Opens a Razorpay order against an already-created (pending) booking and
// records it. The seats are already reserved by this point, and `expiresAt` is
// the promise that they won't be held forever if the customer walks away.
export async function startBookingPayment(booking) {
  const order = await paymentProvider.createOrder({
    amount: booking.finalAmount,
    receipt: booking.bookingId,
    notes: {
      bookingId: booking.bookingId,
      tripId: String(booking.tripId),
      userEmail: booking.userEmail,
    },
  });

  booking.payment = {
    method: 'razorpay',
    status: 'pending',
    orderId: order.id,
    currency: order.currency || 'INR',
    amountDue: booking.finalAmount,
    amountPaid: 0,
    amountRefunded: 0,
    expiresAt: new Date(Date.now() + env.paymentPendingTtlMinutes * 60_000),
  };
  booking.paymentRef = order.id;
  await booking.save();

  return order;
}

// The single confirmation path, shared by the browser handshake and the webhook.
//
// Both routinely fire for the same payment, and either can arrive first — the
// webhook regularly beats a customer on a slow connection, and the handshake
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
        'payment.amountPaid': toRupees(paidPaise),
        'payment.failureReason': `Underpaid: received ₹${toRupees(paidPaise)} of ₹${toRupees(duePaise)}`,
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
        'payment.amountPaid': toRupees(paidPaise),
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
// `payment.failed` fires on every declined card, expired UPI collect request
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

// Sweeps every pending booking whose hold has run out. Called opportunistically
// on the paths that care (a new booking wanting those seats, a payment status
// poll) — the same lazy-sweep pattern autoResolveBookingStatuses uses, so no
// scheduler is required for correctness. Safe to also run from cron.
export async function expireStalePayments() {
  const stale = await Booking.find({
    'payment.status': 'pending',
    'payment.expiresAt': { $ne: null, $lt: new Date() },
  }).limit(100);

  const expired = [];
  for (const booking of stale) {
    try {
      const done = await releasePendingBooking(booking);
      if (done) expired.push(done.bookingId);
    } catch (err) {
      console.error(`[payments] failed to expire booking ${booking.bookingId}:`, err);
    }
  }
  return expired;
}

// A payment is fully refunded only once the returned total reaches what was
// paid; anything short of that is a partial.
const refundStatusFor = (amountPaid, amountRefunded) =>
  (Number(amountRefunded) >= Number(amountPaid) ? 'refunded' : 'partially_refunded');

// Issues a refund through the Razorpay API. `amount` is in rupees and defaults
// to whatever is still refundable.
//
// Razorpay may settle instantly or asynchronously; the response says which, and
// the `refund.processed` / `refund.failed` webhooks close the loop on the slow
// path. A booking paid on arrival has nothing to refund here — that money never
// went through the gateway and is settled off-platform.
export async function refundBookingPayment(booking, { amount, reason = '' } = {}) {
  const payment = booking.payment || {};
  if (payment.method !== 'razorpay' || !payment.paymentId) {
    return { refunded: false, reason: 'This booking was not paid online' };
  }
  if (!['paid', 'partially_refunded'].includes(payment.status)) {
    return { refunded: false, reason: `A ${payment.status} payment cannot be refunded` };
  }

  const alreadyRefunded = Number(payment.amountRefunded || 0);
  const refundable = Math.round((Number(payment.amountPaid || 0) - alreadyRefunded) * 100) / 100;
  const requested = amount == null ? refundable : Math.round(Number(amount) * 100) / 100;
  if (requested <= 0) return { refunded: false, reason: 'Nothing left to refund' };
  if (requested > refundable) {
    return { refunded: false, reason: `Only ₹${refundable} is still refundable on this payment` };
  }

  const refund = await paymentProvider.refund({
    paymentId: payment.paymentId,
    amount: requested,
    notes: { bookingId: booking.bookingId, reason: String(reason).slice(0, 250) },
  });

  const settled = refund?.status === 'processed';
  const total = Math.round((alreadyRefunded + requested) * 100) / 100;
  const updated = await Booking.findByIdAndUpdate(
    booking._id,
    {
      $set: {
        'payment.refundId': refund?.id || null,
        'payment.amountRefunded': total,
        'payment.refundedAt': settled ? new Date() : null,
        'payment.status': settled ? refundStatusFor(payment.amountPaid, total) : 'refund_pending',
      },
    },
    { new: true },
  );

  return { refunded: true, settled, refund, booking: updated };
}

// Applies a refund webhook to the booking. Razorpay reports the refund's own
// total, so this takes the gateway's number as authoritative rather than adding
// to a locally-tracked one — a manual refund issued straight from the dashboard
// then reconciles itself here instead of drifting.
export async function applyRefundUpdate(booking, refundEntity, { failed = false } = {}) {
  const amount = toRupees(refundEntity?.amount);
  const paid = Number(booking.payment?.amountPaid || 0);
  const total = Math.max(Number(booking.payment?.amountRefunded || 0), amount);

  // A failed refund leaves the money with us: fall back to what the booking's
  // *successful* refunds add up to, which for the common case (a single failed
  // refund) is nothing, and the payment reads as fully paid again.
  const settledRefunds = Number(booking.payment?.amountRefunded || 0);
  const update = failed
    ? {
      'payment.status': settledRefunds > 0 ? refundStatusFor(paid, settledRefunds) : 'paid',
      'payment.failureReason': 'Refund failed at the gateway — retry it from the dashboard',
    }
    : {
      'payment.refundId': refundEntity?.id || booking.payment?.refundId || null,
      'payment.amountRefunded': total,
      'payment.refundedAt': new Date(),
      'payment.status': refundStatusFor(paid, total),
      'payment.failureReason': '',
    };

  return Booking.findByIdAndUpdate(booking._id, { $set: update }, { new: true });
}
