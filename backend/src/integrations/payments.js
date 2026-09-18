import crypto from 'node:crypto';
import { env } from '../config/env.js';

/*
================================================================================
PAYU INTEGRATION MODULE
================================================================================
The single place that talks to PayU. Everything above it (paymentService, the
return/webhook controllers, the booking controller) deals in rupees and booking
records; this module owns the amount formatting, the hash schemes and the
merchant postservice API.

PayU is a redirect gateway: the browser POSTs a signed form to PayU's hosted
checkout, and PayU POSTs the result back to our surl/furl (and, separately, to
the webhook). Every hop is authenticated the same way — a SHA-512 hash keyed by
the merchant SALT, which never leaves this server:

  request hash   sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT)
  response hash  sha512([additionalCharges|]SALT|status||||||udf5..udf1|email|firstname|productinfo|amount|txnid|key)
  API hash       sha512(key|command|var1|SALT)

With no key/salt configured every gateway call throws, resolvePaymentMode()
reports 'arrival', and the platform behaves exactly as it does without a gateway.
================================================================================
*/

// Both are mounted under /api/v1 and exported because app.js has to exempt them
// from maintenance mode before any router runs: a 503 on either means a payment
// that was taken but never recorded here.
export const PAYU_WEBHOOK_PATH = '/api/v1/webhooks/payu';
export const PAYU_RETURN_PATH = '/api/v1/payments/payu/return';

const HOSTS = {
  test: { checkout: 'https://test.payu.in/_payment', api: 'https://test.payu.in/merchant/postservice.php?form=2' },
  production: { checkout: 'https://secure.payu.in/_payment', api: 'https://info.payu.in/merchant/postservice.php?form=2' },
};
const hosts = () => (env.payuEnv === 'production' ? HOSTS.production : HOSTS.test);

// PayU hashes the amount exactly as it was sent, so every crossing uses one
// canonical two-decimal string. Bookings may carry decimals from a percentage
// coupon, so this rounds rather than truncates.
export const formatAmount = (rupees) => (Math.round(Number(rupees || 0) * 100) / 100).toFixed(2);
export const toRupees = (value) => Math.round(Number(value || 0) * 100) / 100;

const isConfigured = () => !!(env.payuMerchantKey && env.payuMerchantSalt);

function assertConfigured() {
  if (!isConfigured()) {
    throw new Error('PayU is not configured — set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT');
  }
}

const sha512 = (value) => crypto.createHash('sha512').update(value).digest('hex');

// Constant-time compare that tolerates a wrong-length (or absent) candidate —
// timingSafeEqual throws outright when the buffers differ in size.
function safeEqualHex(expected, received) {
  const a = Buffer.from(String(expected).toLowerCase(), 'utf8');
  const b = Buffer.from(String(received || '').toLowerCase(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// A pipe inside any hashed field silently shifts every position after it, so
// the hash PayU computes no longer matches ours. Free-text fields are scrubbed
// of it (and of characters PayU's form validation rejects) before they're sent.
const clean = (value, max = 100) =>
  String(value ?? '').replace(/[|<>"'`\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const UDFS = ['udf1', 'udf2', 'udf3', 'udf4', 'udf5'];

// POST to the merchant postservice API. PayU answers 200 for most business
// failures and reports them in `status: 0`, so the caller inspects the body.
async function postservice(command, vars) {
  assertConfigured();
  const var1 = String(vars.var1 ?? '');
  const body = new URLSearchParams({
    key: env.payuMerchantKey,
    command,
    hash: sha512(`${env.payuMerchantKey}|${command}|${var1}|${env.payuMerchantSalt}`),
  });
  for (const [k, v] of Object.entries(vars)) {
    if (v != null) body.set(k, String(v));
  }

  let res;
  try {
    res = await fetch(hosts().api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const wrapped = new Error(`PayU: ${command} request failed — ${err?.message || err}`);
    wrapped.cause = err;
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`PayU: ${command} returned HTTP ${res.status}`);
    err.statusCode = 502;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error(`PayU: ${command} returned a non-JSON response`);
    err.statusCode = 502;
    throw err;
  }
}

export const paymentProvider = {
  isConfigured,

  // Everything the browser needs to POST the hosted-checkout form. `amount` is
  // in rupees. udf1 carries our booking id, which comes back on the return
  // post and every webhook — the fallback used to find a booking when the
  // txnid lookup misses (e.g. an older attempt paid after a retry).
  buildCheckout({ txnid, amount, productinfo, firstname, email, phone, surl, furl, udf = {} }) {
    assertConfigured();
    const params = {
      key: env.payuMerchantKey,
      txnid: String(txnid),
      amount: formatAmount(amount),
      productinfo: clean(productinfo, 100) || 'Trek booking',
      firstname: clean(firstname, 60) || 'Traveller',
      email: String(email || '').trim(),
      phone: String(phone || '').replace(/\D/g, '').slice(-10),
      surl,
      furl,
    };
    for (const name of UDFS) params[name] = clean(udf[name] ?? '', 255);

    params.hash = sha512([
      params.key, params.txnid, params.amount, params.productinfo, params.firstname, params.email,
      ...UDFS.map((n) => params[n]), '', '', '', '', '', env.payuMerchantSalt,
    ].join('|'));

    return { action: hosts().checkout, method: 'POST', params };
  },

  // Reverse hash over a return post or payment webhook. This is the ONLY thing
  // that makes those unauthenticated requests trustworthy: without the SALT
  // nobody can produce a matching hash for a `success` status.
  verifyResponseHash(fields = {}) {
    if (!isConfigured() || !fields.hash || !fields.txnid || !fields.status) return false;
    if (fields.key && fields.key !== env.payuMerchantKey) return false;

    const parts = [
      env.payuMerchantSalt, fields.status, '', '', '', '', '',
      ...[...UDFS].reverse().map((n) => fields[n] ?? ''),
      fields.email ?? '', fields.firstname ?? '', fields.productinfo ?? '',
      fields.amount ?? '', fields.txnid, env.payuMerchantKey,
    ];
    const charges = fields.additionalCharges ?? fields.additional_charges;
    if (charges != null && String(charges) !== '') parts.unshift(charges);

    return safeEqualHex(sha512(parts.join('|')), fields.hash);
  },

  // Asks PayU what really happened to a txnid. Returns null when PayU has no
  // record of it (the customer never reached the payment page), otherwise
  // { status: 'success'|'failure'|'pending'|..., paymentId, amount, reason }.
  async verifyPayment(txnid) {
    const result = await postservice('verify_payment', { var1: txnid });
    const details = result?.transaction_details?.[txnid];
    if (!details || typeof details !== 'object' || details.status === 'Not Found') return null;
    return {
      status: String(details.status || '').toLowerCase(),
      paymentId: details.mihpayid ? String(details.mihpayid) : null,
      amount: toRupees(details.transaction_amount ?? details.amt),
      reason: details.error_Message || details.field9 || '',
      raw: details,
    };
  },

  // `amount` in rupees. PayU always queues refunds, so this returns the refund
  // request id to poll (or be told about by webhook) — never a settled refund.
  // `token` is our idempotency key: PayU refuses a second refund with the same
  // one, so a retried HTTP call can't refund twice.
  async refund({ paymentId, amount, token, note = '' }) {
    const result = await postservice('cancel_refund_transaction', {
      var1: paymentId,
      var2: String(token).slice(0, 23),
      var3: formatAmount(amount),
      ...(note ? { var9: clean(note, 1000) } : {}),
    });
    if (Number(result?.status) !== 1) {
      const err = new Error(`PayU: ${result?.msg || 'refund request rejected'}`);
      err.statusCode = 502;
      throw err;
    }
    return {
      id: result.request_id ? String(result.request_id) : (result.txn_update_id ? String(result.txn_update_id) : null),
      status: 'queued',
      message: result.msg || '',
    };
  },

  // Current state of a refund request: { status: 'success'|'failure'|'queued'|
  // 'in progress'|..., amount, paymentId }, or null if PayU doesn't know it.
  async fetchRefund(requestId) {
    const result = await postservice('check_action_status', { var1: requestId });
    const outer = result?.transaction_details?.[requestId];
    if (!outer || typeof outer !== 'object') return null;
    // Nested one level per PayU id: { <request_id>: { <id>: { ...entry } } }.
    const entry = Object.values(outer).find((v) => v && typeof v === 'object') || outer;
    return {
      status: String(entry.status || '').toLowerCase(),
      amount: toRupees(entry.amt ?? entry.amount),
      paymentId: entry.mihpayid ? String(entry.mihpayid) : null,
      requestId: String(entry.request_id || requestId),
    };
  },
};

export default paymentProvider;
