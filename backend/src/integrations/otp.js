// OTP provider interface. The rest of the app depends only on this module's
// shape (sendOtp / verifyOtp), so swapping the fake for a real MSG91/Twilio
// client later needs no controller changes.
//
// Fake implementation: "sends" a fixed code and accepts the demo codes the
// frontend has always used (1234 / 123456). Never actually sends anything.

const ACCEPTED_CODES = new Set(['1234', '123456']);

export const otpProvider = {
  async sendOtp(mobile) {
    // Real impl would dispatch an SMS. Here we just acknowledge.
    return { sent: true, mobile, provider: 'stub' };
  },

  async verifyOtp(mobile, code) {
    return ACCEPTED_CODES.has(String(code || '').trim());
  },
};

export default otpProvider;
