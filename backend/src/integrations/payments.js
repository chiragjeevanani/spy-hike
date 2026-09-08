import crypto from 'node:crypto';
import { env } from '../config/env.js';

/*
================================================================================
RAZORPAY INTEGRATION MODULE
================================================================================
The single place that talks to Razorpay. Everything above it (paymentService,
the webhook controller, the booking controller) deals in rupees and booking
records; this module owns the paise conversion, the SDK client, and the two
signature schemes.

Two secrets, two different jobs — mixing them up is the classic failure:
  RAZORPAY_KEY_SECRET     signs the browser handshake `order_id|payment_id`
                          (verifyCheckoutSignature) and authenticates API calls.
  RAZORPAY_WEBHOOK_SECRET signs the raw webhook request body
                          (verifyWebhookSignature). We choose it in the
                          dashboard when registering the endpoint.

With no keys configured every gateway call throws, resolvePaymentMode() reports
'arrival', and the platform behaves exactly as it did before Razorpay existed.
================================================================================
*/

// Mounted in routes/webhook.routes.js. Exported because app.js has to special
// case this exact path twice — raw body capture and the maintenance-mode
// bypass — before any router has had a chance to run.
export const RAZORPAY_WEBHOOK_PATH = '/api/v1/webhooks/razorpay';

// Razorpay speaks paise; bookings are priced in rupees and may carry decimals
// from a percentage coupon, so every crossing rounds rather than truncates.
export const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
export const toRupees = (paise) => Math.round(Number(paise || 0)) / 100;

const isConfigured = () => !!(env.razorpayKeyId && env.razorpayKeySecret);

// The SDK is imported lazily so an unconfigured deployment never pays for it at
// boot, and so the module stays importable if the dependency is ever absent.
let clientPromise = null;
async function gateway() {
  if (!isConfigured()) {
    throw new Error('Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
  }
  if (!clientPromise) {
    clientPromise = import('razorpay').then(({ default: Razorpay }) =>
      new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret }));
  }
  return clientPromise;
}

// Razorpay rejects with `{ statusCode, error: { code, description, reason } }`
// rather than an Error, which reads as "undefined" everywhere it's logged.
// Normalise it into a real Error while keeping the original on `cause`.
async function call(fn) {
  let client;
  try {
    client = await gateway();
  } catch (err) {
    throw err; // configuration problem, not a gateway failure
  }
  try {
    return await fn(client);
  } catch (err) {
    const description = err?.error?.description || err?.description || err?.message || 'request failed';
    const wrapped = new Error(`Razorpay: ${description}`);
    wrapped.cause = err;
    wrapped.razorpayCode = err?.error?.code || null;
    wrapped.statusCode = err?.statusCode || 502;
    throw wrapped;
  }
}

// Constant-time compare that tolerates a wrong-length (or absent) candidate —
// timingSafeEqual throws outright when the buffers differ in size.
function safeEqualHex(expected, received) {
  const a = Buffer.from(String(expected), 'utf8');
  const b = Buffer.from(String(received || ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const paymentProvider = {
  isConfigured,

  // Public key id handed to the browser so Checkout can open. Safe to expose —
  // it is half of the pair, and the secret never leaves the server.
  publicKeyId: () => env.razorpayKeyId,

  // Creates the order the browser will pay against. `amount` is in rupees.
  // Notes travel with the payment and come back on every webhook, which is the
  // fallback used to find a booking when the order id lookup misses.
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    return call((client) => client.orders.create({
      amount: toPaise(amount),
      currency,
      // Razorpay caps the receipt at 40 characters and rejects longer ones.
      receipt: String(receipt || '').slice(0, 40),
      notes,
    }));
  },

  async fetchOrder(orderId) {
    return call((client) => client.orders.fetch(orderId));
  },

  async fetchPayment(paymentId) {
    return call((client) => client.payments.fetch(paymentId));
  },

  // Every payment recorded against an order — used when `order.paid` arrives
  // without the payment entity we need.
  async fetchOrderPayments(orderId) {
    const result = await call((client) => client.orders.fetchPayments(orderId));
    return result?.items || [];
  },

  // `amount` in rupees; omit it for a full refund. 'normal' settles in the
  // usual 5-7 working days; 'optimum' pays Razorpay's fee for an instant one.
  async refund({ paymentId, amount, speed = 'normal', notes = {} }) {
    const payload = { speed, notes };
    if (amount != null) payload.amount = toPaise(amount);
    return call((client) => client.payments.refund(paymentId, payload));
  },

  async fetchRefund({ paymentId, refundId }) {
    return call((client) => client.payments.fetchRefund(paymentId, refundId));
  },

  // Browser handshake: Checkout hands the client back an order id, a payment id
  // and a signature over `order_id|payment_id`, keyed by the API secret.
  verifyCheckoutSignature({ orderId, paymentId, signature }) {
    if (!isConfigured() || !orderId || !paymentId) return false;
    const expected = crypto
      .createHmac('sha256', env.razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return safeEqualHex(expected, signature);
  },

  // Webhook delivery: HMAC over the EXACT bytes Razorpay sent. Re-serialising
  // the parsed body will not reproduce them (key order, whitespace), so this
  // takes the Buffer captured by the raw-body hook in app.js and nothing else.
  verifyWebhookSignature({ rawBody, signature }) {
    if (!env.razorpayWebhookSecret || !Buffer.isBuffer(rawBody) || !rawBody.length) return false;
    const expected = crypto
      .createHmac('sha256', env.razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');
    return safeEqualHex(expected, signature);
  },
};

export default paymentProvider;
