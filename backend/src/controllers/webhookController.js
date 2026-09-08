import Booking from '../models/Booking.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paymentProvider, toRupees } from '../integrations/payments.js';
import {
  confirmBookingPayment, recordPaymentFailure, applyRefundUpdate,
} from '../services/paymentService.js';

/*
================================================================================
RAZORPAY WEBHOOK RECEIVER
================================================================================
The authoritative record of what happened to a payment. The browser handshake
(POST /bookings/:id/payment/verify) is faster but optional — customers close
tabs, lose signal and background the app mid-redirect — so every state change
that matters also arrives here, signed, and retried until acknowledged.

Three things make this safe, and all three are load-bearing:

  1. Signature — the HMAC is computed over the RAW request bytes captured in
     app.js. This endpoint is unauthenticated by necessity (Razorpay carries no
     JWT); the signature is its authentication.
  2. Idempotency — Razorpay retries anything that isn't 2xx and can repeat a
     delivery that was. The unique index on WebhookEvent.eventId is the lock.
  3. Non-destructive failure handling — see recordPaymentFailure().

Register the endpoint at Settings → Webhooks with the events listed in
HANDLED_EVENTS below, in both Test and Live mode (their config is separate).
================================================================================
*/

export const HANDLED_EVENTS = [
  'payment.captured',
  'payment.failed',
  'order.paid',
  'refund.processed',
  'refund.failed',
];

// A webhook knows a gateway order id and, because we set them at order
// creation, our own booking id in the payment notes. The order id is the
// primary key here; the note is the fallback for the rare event that arrives
// without one (or for a payment created outside the normal booking flow).
async function findBooking({ orderId, notes }) {
  if (orderId) {
    const byOrder = await Booking.findOne({ 'payment.orderId': orderId });
    if (byOrder) return byOrder;
  }
  if (notes?.bookingId) {
    return Booking.findOne({ bookingId: notes.bookingId });
  }
  return null;
}

// Returns { status, note } describing what was done, which is recorded on the
// ledger row. Throwing means "not handled" — the row is marked failed and the
// non-2xx response asks Razorpay to try again.
async function processEvent(event) {
  const payment = event.payload?.payment?.entity || null;
  const order = event.payload?.order?.entity || null;
  const refund = event.payload?.refund?.entity || null;

  switch (event.event) {
    // The money is ours. Both events mean the same thing for a single-payment
    // order, and Razorpay sends both — the idempotency ledger keys them apart,
    // and the atomic transition inside confirmBookingPayment() means the second
    // one to arrive is a no-op rather than a duplicate confirmation.
    case 'payment.captured':
    case 'order.paid': {
      const orderId = payment?.order_id || order?.id;
      const booking = await findBooking({ orderId, notes: payment?.notes || order?.notes });
      if (!booking) return { status: 'ignored', note: `No booking for order ${orderId}`, orderId };

      const result = await confirmBookingPayment(booking, {
        paymentId: payment?.id,
        orderId,
        amountPaid: toRupees(payment?.amount ?? order?.amount_paid),
        via: 'webhook',
        // The signature on the delivery itself is the proof here; there is no
        // separate per-payment handshake on this path.
        signatureVerified: true,
      });
      if (result.error) throw new Error(result.error);

      return {
        status: 'processed',
        note: result.alreadyConfirmed ? 'Already confirmed' : 'Booking confirmed',
        bookingId: booking.bookingId,
        orderId,
        paymentId: payment?.id,
      };
    }

    // Recorded, deliberately without cancelling anything. This fires on every
    // declined card and abandoned UPI collect — including attempts the customer
    // immediately retries and pays. Tearing the booking down here would destroy
    // bookings that are seconds from succeeding; the seat hold's own expiry is
    // what decides the customer has really gone.
    case 'payment.failed': {
      const orderId = payment?.order_id;
      const booking = await findBooking({ orderId, notes: payment?.notes });
      if (!booking) return { status: 'ignored', note: `No booking for order ${orderId}`, orderId };

      await recordPaymentFailure(booking, {
        paymentId: payment?.id,
        reason: payment?.error_description || payment?.error_reason || 'Payment attempt failed',
      });
      return {
        status: 'processed',
        note: 'Failed attempt recorded; the seat hold stands until it expires',
        bookingId: booking.bookingId,
        orderId,
        paymentId: payment?.id,
      };
    }

    // Closes out a refund — including one issued by hand in the Razorpay
    // dashboard, which is how a booking refunded outside this system still ends
    // up accurate here.
    case 'refund.processed':
    case 'refund.failed': {
      const paymentId = refund?.payment_id;
      const booking = paymentId ? await Booking.findOne({ 'payment.paymentId': paymentId }) : null;
      if (!booking) return { status: 'ignored', note: `No booking for payment ${paymentId}`, paymentId };

      await applyRefundUpdate(booking, refund, { failed: event.event === 'refund.failed' });
      return {
        status: 'processed',
        note: event.event === 'refund.failed' ? 'Refund failure recorded' : 'Refund recorded',
        bookingId: booking.bookingId,
        paymentId,
      };
    }

    default:
      return { status: 'ignored', note: `Unsubscribed event ${event.event}` };
  }
}

// Claims this delivery, or reports that another one already has it.
//
// The create is the lock: a unique index means only one of two simultaneous
// deliveries of the same event can insert. A row left in 'failed' is
// reclaimable, so Razorpay's retry of a delivery that genuinely errored gets a
// real second attempt instead of being deduped into permanent silence.
async function claim(eventId, event) {
  const base = {
    eventId,
    event: event.event,
    status: 'processing',
    payload: event,
    orderId: event.payload?.order?.entity?.id || event.payload?.payment?.entity?.order_id || null,
    paymentId: event.payload?.payment?.entity?.id || null,
  };

  try {
    return await WebhookEvent.create(base);
  } catch (err) {
    if (err?.code !== 11000) throw err;
    const reclaimed = await WebhookEvent.findOneAndUpdate(
      { eventId, status: 'failed' },
      { $set: { status: 'processing', error: '' }, $inc: { attempts: 1 } },
      { new: true },
    );
    return reclaimed; // null → someone else has it, or it is already done
  }
}

// POST /api/v1/webhooks/razorpay — public by necessity; the signature is the
// authentication. Mounted before any auth middleware and exempted from
// maintenance mode in app.js, because a 503 here becomes a lost payment.
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');

  // req.rawBody is set by the verify hook in app.js. Its absence means the
  // route was mounted somewhere that hook doesn't cover — a wiring bug, and one
  // that must fail loudly rather than silently accepting unverified payloads.
  if (!paymentProvider.verifyWebhookSignature({ rawBody: req.rawBody, signature })) {
    // 400 rather than 401: this is malformed input, not a credentials prompt.
    // Razorpay will retry, which is the right behaviour if the mismatch was
    // caused by a secret that is mid-rotation.
    return res.status(400).json({ error: { message: 'Invalid webhook signature' } });
  }

  let event;
  try {
    event = JSON.parse(req.rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: { message: 'Malformed webhook payload' } });
  }

  const eventId = req.get('x-razorpay-event-id') || event.id;
  if (!eventId) return res.status(400).json({ error: { message: 'Missing event id' } });

  const ledger = await claim(eventId, event);
  if (!ledger) {
    // Already handled. A plain 200 stops the retries.
    return res.json({ ok: true, duplicate: true });
  }

  try {
    const outcome = await processEvent(event);
    Object.assign(ledger, {
      status: outcome.status,
      note: outcome.note || '',
      bookingId: outcome.bookingId || null,
      orderId: outcome.orderId || ledger.orderId,
      paymentId: outcome.paymentId || ledger.paymentId,
    });
    await ledger.save();
    return res.json({ ok: true, status: outcome.status, note: outcome.note });
  } catch (err) {
    console.error(`[razorpay-webhook] ${event.event} (${eventId}) failed:`, err);
    ledger.status = 'failed';
    ledger.error = String(err?.message || err).slice(0, 500);
    await ledger.save();
    // 500 asks Razorpay to retry; the reclaim path above lets that retry
    // actually re-run rather than being dismissed as a duplicate.
    return res.status(500).json({ error: { message: 'Webhook processing failed' } });
  }
});
