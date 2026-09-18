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
       Refund events carry no hash (per PayU's own docs) and are treated as a
       hint only: request_id/token/merchantTxnId/mihpayid are used to find a
       booking WE already hold a matching refund record for, and only then is
       the refund's real status re-fetched from PayU's API with our own
       credentials. A delivery naming a refund we don't recognise touches
       neither the database nor PayU's API.
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

// PayU's documented refund webhook carries: request_id (their refund id),
// token (the idempotency key WE generated), merchantTxnId (our original
// txnid) and mihpayid (the payment id) — see
// https://docs.payu.in/docs/webhook-events-and-sample-payloads. None of it is
// signed, so it is used only to find a CANDIDATE booking locally; every match
// here still gets its status re-fetched from PayU's own API before anything
// is recorded (see payuWebhook below). Matching first, and only calling PayU
// for a booking we actually recognise, means a delivery naming a request_id
// that isn't ours is dropped for free instead of spending an outbound API
// call on it.
function findBookingForRefundFields(fields) {
  const requestId = String(fields.request_id || '');
  const token = fields.token ? String(fields.token) : null;
  const orderId = fields.merchantTxnId ? String(fields.merchantTxnId) : null;
  const paymentId = fields.mihpayid ? String(fields.mihpayid).trim() : null;

  const or = [{ 'payment.refundId': requestId }];
  if (token) or.push({ 'payment.refundToken': token });
  if (orderId) or.push({ 'payment.orderId': orderId });
  if (paymentId) or.push({ 'payment.paymentId': paymentId });

  return Booking.findOne({ $or: or });
}

async function processRefund(booking, refund) {
  const requestId = refund.requestId;
  const paymentId = refund.paymentId || booking.payment?.paymentId || null;
  const base = { paymentId, orderId: booking.payment?.orderId || null };

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

    // Look up locally FIRST — nothing in this delivery is signed, so a
    // request_id we don't recognise from any of our own refunds is dropped
    // without ever calling PayU's API over it.
    const booking = await findBookingForRefundFields(fields);
    if (!booking) return res.json({ ok: true, status: 'ignored', note: `No booking for refund ${requestId}` });

    // A booking WAS found, so this is worth the round trip — but its status
    // still comes from PayU's own API, never from the unsigned delivery.
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
    ids = { orderId: booking.payment?.orderId || null, paymentId: refund.paymentId };
    handler = () => processRefund(booking, refund);
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
