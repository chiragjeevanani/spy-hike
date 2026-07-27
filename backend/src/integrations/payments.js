/*
================================================================================
RAZORPAY INTEGRATION MODULE (CURRENTLY DISABLED FOR PAY ON ARRIVAL FLOW)
================================================================================
To re-enable online Razorpay payments in the future:
1. Uncomment the paymentProvider.createOrder & paymentProvider.verifyPayment calls in bookingController.js.
2. Initialize the official Razorpay SDK instance here:
   import Razorpay from 'razorpay';
   export const razorpayInstance = new Razorpay({
     key_id: process.env.RAZORPAY_KEY_ID,
     key_secret: process.env.RAZORPAY_KEY_SECRET,
   });
================================================================================
*/

import crypto from 'node:crypto';

export const paymentProvider = {
  // Razorpay order creation (Disabled for Pay on Arrival)
  async createOrder({ amount, currency = 'INR', receipt }) {
    /*
    // Uncomment for real Razorpay SDK order creation:
    // return await razorpayInstance.orders.create({ amount: amount * 100, currency, receipt });
    */
    return {
      id: `order_${crypto.randomBytes(8).toString('hex')}`,
      amount,
      currency,
      receipt: receipt || null,
      status: 'created',
      provider: 'stub',
    };
  },

  // Razorpay webhook/signature verification (Disabled for Pay on Arrival)
  async verifyPayment({ orderId } = {}) {
    /*
    // Uncomment for real Razorpay signature verification:
    // const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(orderId + "|" + paymentId).digest('hex');
    */
    return {
      verified: true,
      orderId: orderId || null,
      paymentRef: `POA_${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    };
  },
};

export default paymentProvider;
