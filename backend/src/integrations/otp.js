import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import OtpChallenge from '../models/OtpChallenge.js';
import { ApiError } from '../utils/ApiError.js';

const TTL_SECONDS = 300;
const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 5;
const digest = (mobile, code) => createHmac('sha256', env.jwtSecret)
  .update(`${mobile}:${code}`).digest('hex');

function validateMobile(mobile) {
  if (typeof mobile !== 'string' || !/^\d{10}$/.test(mobile)) {
    throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
  }
}

export const otpProvider = {
  async sendOtp(mobile) {
    validateMobile(mobile);
    if (env.otpMock) return { sent: true, mobile, provider: 'mock' };
    if (!env.smsindiahubApiKey || !env.smsindiahubSenderId || !env.smsindiahubPeId
      || !env.smsindiahubTemplateId || !env.smsindiahubBrand) {
      throw new ApiError(503, 'SMS gateway is not configured. Contact support.');
    }
    const code = String(randomInt(100000, 1000000));
    const codeHash = digest(mobile, code);
    const now = new Date();
    let challenge;
    try {
      // The unique index makes send cooldown atomic across API workers.
      challenge = await OtpChallenge.findOneAndUpdate(
        { mobile, resendAt: { $lte: now } },
        { $set: { codeHash, expiresAt: new Date(+now + TTL_SECONDS * 1000),
          resendAt: new Date(+now + RESEND_SECONDS * 1000), attempts: 0, delivered: false } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (err) {
      if (err.code === 11000) throw new ApiError(429, 'Please wait 30 seconds before requesting another OTP.');
      throw err;
    }
    const url = new URL('https://cloud.smsindiahub.in/api/mt/SendSMS');
    url.search = new URLSearchParams({
      APIKey: env.smsindiahubApiKey, senderid: env.smsindiahubSenderId,
      channel: 'Trans', DCS: '0', flashsms: '0', number: `91${mobile}`,
      text: `Welcome to the ${env.smsindiahubBrand} powered by Appzeto.Your OTP for registration is ${code}.BGADEC`,
      PEId: env.smsindiahubPeId, DLTTemplateId: env.smsindiahubTemplateId,
    }).toString();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
      const result = await response.json();
      if (!response.ok || result?.ErrorCode !== '000' || !result.JobId) throw new Error('SMS rejected');
      await OtpChallenge.updateOne({ _id: challenge._id, codeHash }, { $set: { delivered: true } });
    } catch {
      await OtpChallenge.deleteOne({ _id: challenge._id, codeHash });
      // Never expose the URL, API key, OTP or provider response.
      throw new ApiError(502, 'Could not send OTP. Please try again.');
    }
    return { sent: true, mobile, provider: 'smsindiahub', expiresIn: TTL_SECONDS, retryAfter: RESEND_SECONDS };
  },

  async verifyOtp(mobile, code) {
    validateMobile(mobile);
    const value = String(code || '').trim();
    if (env.otpMock) return /^\d{6}$/.test(value) && value === env.otpMockCode;
    // Count malformed guesses too; deny every attempt after the fifth.
    const challenge = await OtpChallenge.findOneAndUpdate(
      { mobile, delivered: true, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } }, { new: true },
    );
    if (!challenge || !/^\d{6}$/.test(value)) return false;
    if (!timingSafeEqual(Buffer.from(challenge.codeHash, 'hex'), Buffer.from(digest(mobile, value), 'hex'))) return false;
    // Keep the record for send cooldown, but allow only one successful verifier.
    const consumed = await OtpChallenge.updateOne(
      { _id: challenge._id, codeHash: challenge.codeHash, delivered: true, expiresAt: { $gt: new Date() } },
      { $set: { delivered: false } },
    );
    return consumed.modifiedCount === 1;
  },
};
export default otpProvider;
