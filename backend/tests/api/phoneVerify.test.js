import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();
const api = '/api/v1';

const verifyPhone = (mobile, code) => request(app).post(`${api}/auth/phone/verify`).send({ mobile, code });

describe('Phone OTP verification during signup', () => {
  it('issues a phoneToken for a correct OTP and rejects a wrong one', async () => {
    const ok = await verifyPhone('9876543210', '123456');
    expect(ok.status).toBe(200);
    expect(ok.body.phoneToken).toBeTruthy();
    expect(ok.body.mobile).toBe('9876543210');

    const bad = await verifyPhone('9876543210', '000000');
    expect(bad.status).toBe(401);

    const noMobile = await request(app).post(`${api}/auth/phone/verify`).send({ code: '123456' });
    expect(noMobile.status).toBe(400);
  });

  it('marks a customer mobileVerified when registered with a matching phoneToken', async () => {
    const { body } = await verifyPhone('9811111111', '123456');
    const reg = await request(app).post(`${api}/auth/register`).send({
      name: 'Verified Hiker', email: 'vhiker@example.com', password: 'pass1234',
      mobile: '9811111111', phoneToken: body.phoneToken,
    });
    expect(reg.status).toBe(201);
    expect(reg.body.account.mobileVerified).toBe(true);
  });

  it('marks an organizer mobileVerified when registered with a matching phoneToken', async () => {
    const { body } = await verifyPhone('9822222222', '1234');
    const reg = await request(app).post(`${api}/auth/organizer/register`).send({
      name: 'Verified Org', email: 'vorg@example.com', password: 'pass1234', agencyName: 'Verified Guides', socialMediaLink: 'https://instagram.com/test',
      govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
      mobile: '9822222222', phoneToken: body.phoneToken,
    });
    expect(reg.status).toBe(201);
    expect(reg.body.account.mobileVerified).toBe(true);
  });

  it('leaves mobileVerified false without a token, or when the token is for a different number', async () => {
    // No token → backward-compatible, unverified.
    const plain = await request(app).post(`${api}/auth/register`).send({
      name: 'Plain Hiker', email: 'plain@example.com', password: 'pass1234', mobile: '9800000000',
    });
    expect(plain.status).toBe(201);
    expect(plain.body.account.mobileVerified).toBe(false);

    // Token issued for a different number must not verify this one.
    const { body } = await verifyPhone('9833333333', '123456');
    const mismatched = await request(app).post(`${api}/auth/register`).send({
      name: 'Spoof Hiker', email: 'spoof@example.com', password: 'pass1234',
      mobile: '9844444444', phoneToken: body.phoneToken,
    });
    expect(mismatched.status).toBe(201);
    expect(mismatched.body.account.mobileVerified).toBe(false);
  });
});
