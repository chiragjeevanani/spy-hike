import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Admin from '../../src/models/Admin.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

// Helpers
const registerCustomer = (over = {}) =>
  request(app).post('/api/v1/auth/register').send({
    name: 'Test Hiker',
    email: 'hiker@example.com',
    password: 'pass1234',
    ...over,
  });

const registerOrganizer = (over = {}) =>
  request(app).post('/api/v1/auth/organizer/register').send({
    name: 'Org Owner',
    email: 'org@example.com',
    password: 'pass1234',
    agencyName: 'Peak Guides',
    ...over,
  });

async function seedAdmin() {
  await Admin.create({
    name: 'Admin',
    email: 'admin@trekigo.com',
    passwordHash: await hashPassword('admin123'),
  });
}

describe('Customer auth', () => {
  it('registers then logs in (happy path), returns a token + customer account', async () => {
    const reg = await registerCustomer();
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    expect(reg.body.role).toBe('customer');
    expect(reg.body.account.email).toBe('hiker@example.com');
    expect(reg.body.account).not.toHaveProperty('passwordHash');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hiker@example.com', password: 'pass1234' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.account.isAuthenticated).toBe(true);
  });

  it('rejects duplicate email with 409', async () => {
    await registerCustomer();
    const dup = await registerCustomer();
    expect(dup.status).toBe(409);
  });

  it('rejects wrong password with 401', async () => {
    await registerCustomer();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hiker@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects missing required fields with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
  });
});

describe('OTP login (stub)', () => {
  it('accepts the demo code 123456 and creates/returns a customer', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '+91 90000 00000', code: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe('customer');
  });

  it('rejects an incorrect OTP with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '+91 90000 00000', code: '000000' });
    expect(res.status).toBe(401);
  });
});

describe('Google auth (stub)', () => {
  it('signs in and provisions a customer from the google profile', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ token: JSON.stringify({ email: 'g@example.com', name: 'G User' }) });
    expect(res.status).toBe(200);
    expect(res.body.account.email).toBe('g@example.com');
  });
});

describe('Organizer auth + approval gate', () => {
  it('registers as pending (not approved) and can log in', async () => {
    const reg = await registerOrganizer();
    expect(reg.status).toBe(201);
    expect(reg.body.role).toBe('organizer');
    expect(reg.body.account.isPendingApproval).toBe(true);
    expect(reg.body.account.isApproved).toBe(false);

    const login = await request(app)
      .post('/api/v1/auth/organizer/login')
      .send({ email: 'org@example.com', password: 'pass1234' });
    expect(login.status).toBe(200);
  });

  it('a pending organizer is blocked from approved-only routes (403)', async () => {
    const reg = await registerOrganizer();
    const res = await request(app)
      .get('/api/v1/organizer/verify-access')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(403);
  });

  it('after an admin approves, the organizer passes the gate (200)', async () => {
    await seedAdmin();
    const reg = await registerOrganizer();
    const adminLogin = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@trekigo.com', password: 'admin123' });
    const adminToken = adminLogin.body.token;

    const approve = await request(app)
      .patch(`/api/v1/admin/organizers/${reg.body.account.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });
    expect(approve.status).toBe(200);
    expect(approve.body.organizer.isApproved).toBe(true);

    // Re-login to get a token (same token still valid; re-login proves flag flip)
    const orgLogin = await request(app)
      .post('/api/v1/auth/organizer/login')
      .send({ email: 'org@example.com', password: 'pass1234' });
    expect(orgLogin.body.account.isApproved).toBe(true);

    const res = await request(app)
      .get('/api/v1/organizer/verify-access')
      .set('Authorization', `Bearer ${orgLogin.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Admin auth', () => {
  it('logs in with seeded credentials', async () => {
    await seedAdmin();
    const res = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@trekigo.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.body.account.displayRole).toBe('Super Admin');
  });

  it('rejects bad admin credentials with 401', async () => {
    await seedAdmin();
    const res = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@trekigo.com', password: 'nope' });
    expect(res.status).toBe(401);
  });
});

describe('JWT + role protection', () => {
  it('GET /auth/me requires a token (401 without)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns the current principal', async () => {
    const reg = await registerCustomer();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.account.email).toBe('hiker@example.com');
    expect(res.body.role).toBe('customer');
  });

  it('a customer token cannot access admin routes (403)', async () => {
    const reg = await registerCustomer();
    const res = await request(app)
      .get('/api/v1/admin/organizers')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(403);
  });

  it('rejects a malformed token with 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
