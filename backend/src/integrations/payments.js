// Payment provider interface (Razorpay-shaped). Callers depend only on
// createOrder / verifyPayment, so a real Razorpay client can replace the fake
// without touching the booking flow.
//
// Fake implementation: mints a pseudo order id and always "verifies"
// successfully. No network, no real charge — matches the frontend's simulated
// 2-second checkout. Phase-later work can add real order creation + webhook
// signature verification here.

import crypto from 'node:crypto';

export const paymentProvider = {
  async createOrder({ amount, currency = 'INR', receipt }) {
    return {
      id: `order_${crypto.randomBytes(8).toString('hex')}`,
      amount,
      currency,
      receipt: receipt || null,
      status: 'created',
      provider: 'stub',
    };
  },

  // Real impl verifies the Razorpay webhook/signature; the stub trusts it.
  async verifyPayment({ orderId } = {}) {
    return {
      verified: true,
      orderId: orderId || null,
      paymentRef: `pay_${crypto.randomBytes(8).toString('hex')}`,
    };
  },
};

export default paymentProvider;
