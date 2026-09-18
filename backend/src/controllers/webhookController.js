import Booking from '../models/Booking.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paymentProvider } from '../integrations/payments.js';
import { applyRefundUpdate } from '../services/paymentService.js';
import { findBookingForTxn, applyPayuResult } from './paymentController.js';

/*
================================================================================
PAYU WEBHOOK RECEIVER
================================================================================
The server-to-server record of what happened to a payment. The return post
(POST /payments/payu/return) is faster but rides on the customer's browser —
customers close tabs, lose signal and background the app mid-redirect — so the
state changes that matter also arrive here, and are retried by PayU until
acknowledged.

Three things make this safe, and all three are load-bearing:

  1. Authentication — this endpoint carries no JWT.
       Payment events carry PayU's reverse hash, keyed by our SALT.
       Refund events are treated as a hint only: the refund's status is
       re-fetched from PayU's API with our own credentials before anything is
       recorded, so a forged delivery can at most trigger a harmless lookup.
  2. Idempotency — PayU sends no event id, so one is derived from the
     transaction and its status. The unique index on WebhookEvent.eventId is
     the lock.
  3. Non-destructive failure handling — see recordPaymentFailure().

Configure in PayU Dashboard → Developers → Webhooks: Payment (successful and
failed) and Refund events, pointed at /api/v1/webhooks/payu.
================================================================================
*/

const isRefundDelivery = (fields) =>
  !!fields.request_id || String(fields.action || '').toLowerCase() === 'refund';

async function processPayment(fields) {
  const booking = await findBookingForTxn({ txnid: fields.txnid, udf1: fields.udf1 });
  const base = { orderId: fields.txnid || null, paymentId: fields.mihpayid ? String(fields.mihpayid) : null };
  if (!booking) return { ...base, status: 'ignored', note: `No booking for txnid ${fields.txnid}` };

  const outcome = await applyPayuResult(booking, fields, 'webhook');
  // An underpaid "success" must not be acknowledged as handled.
  if (outcome.status === 'error') throw new Error(outcome.note);
  return { ...base, ...outcome, bookingId: booking.bookingId };
}

async function processRefund(fields, refund) {
  const requestId = refund.requestId;
  const paymentId = refund.paymentId || (fields.mihpayid ? String(fields.mihpayid) : null);
  const base = { paymentId, orderId: null };

  const booking = await Booking.findOne({
    $or: [
      { 'payment.refundId': requestId },
      ...(paymentId ? [{ 'payment.paymentId': paymentId }] : []),
    ],
  });
  if (!booking) return { ...base, status: 'ignored', note: `No booking for refund ${requestId}` };

  if (refund.status === 'success') {
    await applyRefundUpdate(booking, { requestId, amount: refund.amount });
    return { ...base, status: 'processed', note: 'Refund recorded', bookingId: booking.bookingId };
  }
  if (refund.status === 'failure' || refund.status === 'failed') {
    // Only hand back an amount this system actually counted — a failed refund
    // someone raised by hand in the PayU dashboard was never added locally.
    if (booking.payment?.refundId === requestId) {
      await applyRefundUpdate(booking, { requestId, amount: refund.amount, failed: true });
    }
    return { ...base, status: 'processed', note: 'Refund failure recorded', bookingId: booking.bookingId };
  }
  return { ...base, status: 'ignored', note: `Refund is ${refund.status || 'in progress'}`, bookingId: booking.bookingId };
}

// Claims this delivery, or reports that another one already has it.
//
// The create is the lock: a unique index means only one of two simultaneous
// deliveries of the same event can insert. A row left in 'failed' is
// reclaimable, so PayU's retry of a delivery that genuinely errored gets a
// real second attempt instead of being deduped into permanent silence.
async function claim({ eventId, event, payload, orderId, paymentId }) {
  try {
    return await WebhookEvent.create({
      provider: 'payu', eventId, event, status: 'processing', payload, orderId, paymentId,
    });
  } catch (err) {
    if (err?.code !== 11000) throw err;
    return WebhookEvent.findOneAndUpdate(
      { eventId, status: 'failed' },
      { $set: { status: 'processing', error: '' }, $inc: { attempts: 1 } },
      { new: true },
    ); // null → someone else has it, or it is already done
  }
}

// POST /api/v1/webhooks/payu — public by necessity. Mounted before any auth
// middleware and exempted from maintenance mode in app.js, because a 503 here
// becomes a lost payment. PayU posts form-encoded bodies; JSON is accepted too.
export const payuWebhook = asyncHandler(async (req, res) => {
  const fields = req.body || {};
  let event;
  let eventId;
  let handler;
  let ids;

  if (isRefundDelivery(fields)) {
    const requestId = String(fields.request_id || '');
    if (!requestId) return res.status(400).json({ error: { message: 'Missing refund request id' } });

    // The delivery itself is not signed in a way we can rely on — ask PayU.
    let refund;
    try {
      refund = await paymentProvider.fetchRefund(requestId);
    } catch (err) {
      console.error(`[payu-webhook] could not verify refund ${requestId}:`, err);
      return res.status(502).json({ error: { message: 'Could not verify refund with PayU' } });
    }
    if (!refund) return res.json({ ok: true, status: 'ignored', note: 'Unknown refund request' });

    event = `refund.${refund.status || 'unknown'}`;
    eventId = `refund:${requestId}:${refund.status || 'unknown'}`;
    ids = { orderId: null, paymentId: refund.paymentId };
    handler = () => processRefund(fields, refund);
  } else {
    if (!paymentProvider.verifyResponseHash(fields)) {
      // 400 rather than 401: this is malformed input, not a credentials prompt.
      return res.status(400).json({ error: { message: 'Invalid webhook hash' } });
    }
    const status = String(fields.status || '').toLowerCase();
    event = `payment.${status}`;
    eventId = `payment:${fields.txnid}:${fields.mihpayid || ''}:${status}`;
    ids = { orderId: fields.txnid || null, paymentId: fields.mihpayid ? String(fields.mihpayid) : null };
    handler = () => processPayment(fields);
  }

  const ledger = await claim({ eventId, event, payload: { ...fields }, ...ids });
  if (!ledger) {
    // Already handled. A plain 200 stops the retries.
    return res.json({ ok: true, duplicate: true });
  }

  try {
    const outcome = await handler();
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
    console.error(`[payu-webhook] ${event} (${eventId}) failed:`, err);
    ledger.status = 'failed';
    ledger.error = String(err?.message || err).slice(0, 500);
    await ledger.save();
    // 500 asks PayU to retry; the reclaim path above lets that retry actually
    // re-run rather than being dismissed as a duplicate.
    return res.status(500).json({ error: { message: 'Webhook processing failed' } });
  }
});
