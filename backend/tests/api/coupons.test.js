import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Admin from '../../src/models/Admin.js';
import Coupon from '../../src/models/Coupon.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@trekigo.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@trekigo.com', password: 'admin123' });
  return res.body.token;
}

const create = (token, body) =>
  request(app).post('/api/v1/admin/coupons').set('Authorization', `Bearer ${token}`).send(body);

describe('Admin coupon CRUD', () => {
  it('creates a flat and a percentage coupon', async () => {
    const token = await adminToken();
    const flat = await create(token, { code: 'flat50', type: 'flat', value: 50 });
    expect(flat.status).toBe(201);
    expect(flat.body.coupon.code).toBe('FLAT50'); // uppercased
    expect(flat.body.coupon.type).toBe('flat');

    const pct = await create(token, { code: 'PCT20', type: 'percentage', value: 20 });
    expect(pct.body.coupon.type).toBe('percentage');
  });

  it('rejects a duplicate code with 409', async () => {
    const token = await adminToken();
    await create(token, { code: 'DUP', type: 'flat', value: 10 });
    const dup = await create(token, { code: 'dup', type: 'flat', value: 10 });
    expect(dup.status).toBe(409);
  });

  it('a non-admin cannot manage coupons (403)', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'U', email: 'u@x.com', password: 'pass1234' });
    const res = await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(403);
  });

  it('toggles Active <-> Inactive but refuses to reactivate an Expired coupon', async () => {
    const token = await adminToken();
    const c = await create(token, { code: 'TOG', type: 'flat', value: 10 });
    const id = c.body.coupon.id;

    const off = await request(app).patch(`/api/v1/admin/coupons/${id}/toggle`).set('Authorization', `Bearer ${token}`);
    expect(off.body.coupon.status).toBe('Inactive');
    const on = await request(app).patch(`/api/v1/admin/coupons/${id}/toggle`).set('Authorization', `Bearer ${token}`);
    expect(on.body.coupon.status).toBe('Active');

    // Force expired, then toggle should fail.
    await Coupon.findByIdAndUpdate(id, { status: 'Expired' });
    const bad = await request(app).patch(`/api/v1/admin/coupons/${id}/toggle`).set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);
  });

  it('auto-expires a past-dated coupon on the next list', async () => {
    const token = await adminToken();
    await create(token, { code: 'OLD', type: 'flat', value: 10, expiresAt: '2020-01-01' });
    const list = await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${token}`);
    const old = list.body.coupons.find((c) => c.code === 'OLD');
    expect(old.status).toBe('Expired');
  });

  it('renewing an expired coupon\'s date revives it to Active', async () => {
    const token = await adminToken();
    const c = await create(token, { code: 'RENEW', type: 'flat', value: 10, expiresAt: '2020-01-01' });
    await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${token}`); // triggers expiry
    const upd = await request(app)
      .put(`/api/v1/admin/coupons/${c.body.coupon.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expiresAt: '2030-12-31' });
    expect(upd.body.coupon.status).toBe('Active');
  });
});

describe('Public coupon validation', () => {
  it('validates a percentage coupon and respects the max-discount cap', async () => {
    const token = await adminToken();
    await create(token, { code: 'CAP20', type: 'percentage', value: 20, maxDiscount: 100 });

    // 20% of 1000 = 200, capped at 100.
    const res = await request(app).post('/api/v1/coupons/validate').send({ code: 'cap20', bookingAmount: 1000 });
    expect(res.body.ok).toBe(true);
    expect(res.body.discountAmount).toBe(100);
  });

  it('applies a flat discount and never exceeds the booking total', async () => {
    const token = await adminToken();
    await create(token, { code: 'FLAT500', type: 'flat', value: 500 });
    const res = await request(app).post('/api/v1/coupons/validate').send({ code: 'FLAT500', bookingAmount: 300 });
    expect(res.body.discountAmount).toBe(300); // min(500, 300)
  });

  it('rejects when below the minimum booking amount', async () => {
    const token = await adminToken();
    await create(token, { code: 'MIN', type: 'flat', value: 50, minBookingAmount: 500 });
    const res = await request(app).post('/api/v1/coupons/validate').send({ code: 'MIN', bookingAmount: 200 });
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/minimum booking/i);
  });

  it('rejects an unknown, inactive, or expired code', async () => {
    const token = await adminToken();
    await create(token, { code: 'INACT', type: 'flat', value: 10 });
    const c = await request(app).get('/api/v1/admin/coupons').set('Authorization', `Bearer ${token}`);
    const inact = c.body.coupons.find((x) => x.code === 'INACT');
    await request(app).patch(`/api/v1/admin/coupons/${inact.id}/toggle`).set('Authorization', `Bearer ${token}`); // -> Inactive

    expect((await request(app).post('/api/v1/coupons/validate').send({ code: 'NOPE', bookingAmount: 100 })).body.ok).toBe(false);
    expect((await request(app).post('/api/v1/coupons/validate').send({ code: 'INACT', bookingAmount: 100 })).body.ok).toBe(false);
  });

  it('GET /coupons lists only active coupons', async () => {
    const token = await adminToken();
    await create(token, { code: 'ACT1', type: 'flat', value: 10 });
    const c2 = await create(token, { code: 'ACT2', type: 'flat', value: 10 });
    await request(app).patch(`/api/v1/admin/coupons/${c2.body.coupon.id}/toggle`).set('Authorization', `Bearer ${token}`); // -> Inactive

    const res = await request(app).get('/api/v1/coupons');
    const codes = res.body.coupons.map((c) => c.code);
    expect(codes).toContain('ACT1');
    expect(codes).not.toContain('ACT2');
  });
});
