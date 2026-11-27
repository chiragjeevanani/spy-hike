import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { env } from '../../src/config/env.js';
import { otpProvider } from '../../src/integrations/otp.js';
import OtpChallenge from '../../src/models/OtpChallenge.js';
import { createApp } from '../../src/app.js';

const mobile = '9876543210';
const app = createApp();
let fetchMock;
const sentCode = () => new URL(fetchMock.mock.calls.at(-1)[0]).searchParams.get('text').match(/is (\d{6})\.BGADEC$/)[1];
const success = () => ({ ok: true, json: async () => ({ ErrorCode: '000', JobId: 'test-job' }) });

beforeAll(async () => { await OtpChallenge.init(); });
beforeEach(() => {
  env.otpMock = false;
  env.smsindiahubApiKey = 'test-api-key';
  fetchMock = vi.fn().mockImplementation(async () => success());
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('SMSINDIAHUB OTP', () => {
  it('sends the exact DLT text, sender and IDs without exposing the code in the API response', async () => {
    const res = await request(app).post('/api/v1/auth/otp/request').send({ mobile });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ provider: 'smsindiahub', expiresIn: 300, retryAfter: 45 });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://cloud.smsindiahub.in/api/mt/SendSMS');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      APIKey: 'test-api-key', senderid: 'BGADEC', number: `91${mobile}`, channel: 'Trans',
      PEId: '1001164203633432409', DLTTemplateId: '1007282516644508833',
    });
    const code = sentCode();
    expect(url.searchParams.get('text')).toBe(`Welcome to the Find Your Trek powered by Appzeto.Your OTP for registration is ${code}.BGADEC`);
    expect(JSON.stringify(res.body)).not.toContain(code);
    expect((await OtpChallenge.findOne({ mobile })).codeHash).not.toBe(code);
    expect(await otpProvider.verifyOtp('9876543211', code)).toBe(false);
    expect(await otpProvider.verifyOtp(mobile, code)).toBe(true);
    expect(await otpProvider.verifyOtp(mobile, code)).toBe(false);
  });

  it('rejects demo codes and verification without a requested challenge', async () => {
    expect(await otpProvider.verifyOtp(mobile, '123456')).toBe(false);
    expect(await otpProvider.verifyOtp(mobile, '1234')).toBe(false);
  });

  it('rejects expired codes without relying on TTL cleanup', async () => {
    await otpProvider.sendOtp(mobile);
    await OtpChallenge.updateOne({ mobile }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await otpProvider.verifyOtp(mobile, sentCode())).toBe(false);
  });

  it('locks out after five wrong guesses, including malformed codes', async () => {
    await otpProvider.sendOtp(mobile);
    const code = sentCode();
    for (let i = 0; i < 5; i++) expect(await otpProvider.verifyOtp(mobile, 'bad')).toBe(false);
    expect(await otpProvider.verifyOtp(mobile, code)).toBe(false);
  });

  it('enforces a 45-second cooldown and permits resend at the deadline', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const started = Date.now();
    await otpProvider.sendOtp(mobile);
    expect(+(await OtpChallenge.findOne({ mobile })).resendAt - started).toBe(45_000);
    vi.setSystemTime(started + 44_999);
    await expect(otpProvider.sendOtp(mobile)).rejects.toMatchObject({ statusCode: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(started + 45_000);
    await otpProvider.sendOtp(mobile);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Random generation may repeat a value; the replacement challenge still resets attempts.
    expect((await OtpChallenge.findOne({ mobile })).attempts).toBe(0);
    expect(await otpProvider.verifyOtp(mobile, sentCode())).toBe(true);
  });

  it('allows only one concurrent successful verification', async () => {
    await otpProvider.sendOtp(mobile);
    const code = sentCode();
    const results = await Promise.all([otpProvider.verifyOtp(mobile, code), otpProvider.verifyOtp(mobile, code)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('allows only one concurrent SMS dispatch', async () => {
    const results = await Promise.allSettled([otpProvider.sendOtp(mobile), otpProvider.sendOtp(mobile)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['provider', 'http', 'malformed', 'network'])(
    'handles %s failures without activating a challenge or falling back to mock', async (failure) => {
      if (failure === 'provider') fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ErrorCode: '006', ErrorMessage: 'secret' }) });
      if (failure === 'http') fetchMock.mockResolvedValue({ ok: false, json: async () => ({ ErrorCode: '000', JobId: 'job' }) });
      if (failure === 'malformed') fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new Error('secret'); } });
      if (failure === 'network') fetchMock.mockRejectedValue(new Error('secret'));
      await expect(otpProvider.sendOtp(mobile)).rejects.toMatchObject({ statusCode: 502, message: 'Could not send OTP. Please try again.' });
      expect(await OtpChallenge.findOne({ mobile })).toBeNull();
      expect(await otpProvider.verifyOtp(mobile, '123456')).toBe(false);
    },
  );

  it('fails closed when live credentials are missing', async () => {
    env.smsindiahubApiKey = '';
    await expect(otpProvider.sendOtp(mobile)).rejects.toMatchObject({ statusCode: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses only the configured mock code with no network request', async () => {
    env.otpMock = true;
    env.otpMockCode = '654321';
    expect(await otpProvider.sendOtp(mobile)).toMatchObject({ provider: 'mock' });
    expect(await otpProvider.verifyOtp(mobile, '654321')).toBe(true);
    expect(await otpProvider.verifyOtp(mobile, '123456')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('wires signup verification and OTP login to live challenges', async () => {
    await otpProvider.sendOtp(mobile);
    const verified = await request(app).post('/api/v1/auth/phone/verify').send({ mobile, code: sentCode() });
    expect(verified.status).toBe(200);
    expect(verified.body.phoneToken).toBeTruthy();
    await OtpChallenge.updateOne({ mobile }, { $set: { resendAt: new Date(0) } });
    await otpProvider.sendOtp(mobile);
    const login = await request(app).post('/api/v1/auth/otp/verify').send({ mobile, code: sentCode() });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });
});


describe('Live OTP account changes', () => {
  const register = () => request(app).post('/api/v1/auth/register').send({
    name: 'OTP Hiker', email: 'otp@example.com', password: 'pass1234', mobile,
  });

  it('requires a real challenge for password reset and consumes it', async () => {
    await register();
    const payload = { mobile, newPassword: 'updated1234' };
    const fake = await request(app).post('/api/v1/auth/password/reset-otp').send({ ...payload, otpCode: '123456' });
    expect(fake.status).toBe(401);
    await otpProvider.sendOtp(mobile);
    const code = sentCode();
    const reset = await request(app).post('/api/v1/auth/password/reset-otp').send({ ...payload, otpCode: code });
    expect(reset.status).toBe(200);
    const replay = await request(app).post('/api/v1/auth/password/reset-otp').send({ ...payload, otpCode: code });
    expect(replay.status).toBe(401);
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'otp@example.com', password: 'updated1234' });
    expect(login.status).toBe(200);
  });

  it('requires the SMS code for the new mobile number when updating a profile', async () => {
    const { body } = await register();
    const newMobile = '9876543211';
    const fake = await request(app).post('/api/v1/auth/profile/update-verify')
      .set('Authorization', `Bearer ${body.token}`).send({ mobile: newMobile, mobileOtp: '123456' });
    expect(fake.status).toBe(401);
    await otpProvider.sendOtp(newMobile);
    const res = await request(app).post('/api/v1/auth/profile/update-verify')
      .set('Authorization', `Bearer ${body.token}`).send({ mobile: newMobile, mobileOtp: sentCode() });
    expect(res.status).toBe(200);
    expect(res.body.account.mobile).toBe(newMobile);
  });
});
