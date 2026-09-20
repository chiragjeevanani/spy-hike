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
    agencyName: 'Peak Guides', socialMediaLink: 'https://instagram.com/test',
    govtIdType: 'Aadhaar',
    govtIdNumber: '123456789012',
    ...over,
  });

async function seedAdmin() {
  await Admin.create({
    name: 'Admin',
    email: 'admin@findyourtrek.com',
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

  it.each(['short1', 'nodigitshere', '12345678'])('rejects a weak password "%s" with 400', async (password) => {
    const res = await registerCustomer({ password });
    expect(res.status).toBe(400);
  });

  it('rejects a weak password on organizer registration with 400', async () => {
    const res = await registerOrganizer({ password: 'weak' });
    expect(res.status).toBe(400);
  });

  it('allows organizer registration without a social media link (optional)', async () => {
    const res = await registerOrganizer({ socialMediaLink: '' });
    expect(res.status).toBe(201);
  });

  it('rejects organizer registration with an invalid social media link (400)', async () => {
    const res = await registerOrganizer({ email: 'invalid-social@example.com', socialMediaLink: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('rejects a weak password on change-password (400), accepts a strong one', async () => {
    const reg = await registerCustomer();
    const weak = await request(app)
      .patch('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ currentPassword: 'pass1234', newPassword: 'weak' });
    expect(weak.status).toBe(400);

    const strong = await request(app)
      .patch('/api/v1/auth/password/change')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ currentPassword: 'pass1234', newPassword: 'newpass5678' });
    expect(strong.status).toBe(200);
  });
});

describe('Hiker profile setup (PATCH /auth/profile)', () => {
  const validSetup = {
    hikingExperience: 'Beginner',
    fitnessLevel: 'Moderate',
    gender: 'Male',
    age: 28,
    emergencyContact: 'Asha Jeevanani (+91 98765 43219)',
  };

  it('completes profile setup with valid data', async () => {
    const reg = await registerCustomer();
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send(validSetup);
    expect(res.status).toBe(200);
    expect(res.body.account.age).toBe(28);
  });

  it.each([11, 100, -5])('rejects an out-of-range age %s with 400', async (age) => {
    const reg = await registerCustomer();
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ ...validSetup, age });
    expect(res.status).toBe(400);
  });

  it('rejects an empty emergency contact with 400', async () => {
    const reg = await registerCustomer();
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ ...validSetup, emergencyContact: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects an emergency contact with fewer than 10 digits with 400', async () => {
    const reg = await registerCustomer();
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({ ...validSetup, emergencyContact: 'Asha (12345)' });
    expect(res.status).toBe(400);
  });
});

describe('OTP login (stub)', () => {
  it('accepts the demo code 123456 and creates/returns a customer', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '9000000000', code: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe('customer');
  });

  it('rejects an incorrect OTP with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ mobile: '9000000000', code: '000000' });
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
      .send({ email: 'admin@findyourtrek.com', password: 'admin123' });
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
      .send({ email: 'admin@findyourtrek.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.body.account.displayRole).toBe('Super Admin');
  });

  it('rejects bad admin credentials with 401', async () => {
    await seedAdmin();
    const res = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@findyourtrek.com', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rejects a blank name on admin profile update, accepts a real one', async () => {
    await seedAdmin();
    const login = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@findyourtrek.com', password: 'admin123' });
    const blank = await request(app)
      .patch('/api/v1/admin/profile')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ name: '   ' });
    expect(blank.status).toBe(400);

    const ok = await request(app)
      .patch('/api/v1/admin/profile')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ name: 'New Admin Name' });
    expect(ok.status).toBe(200);
    expect(ok.body.admin.name).toBe('New Admin Name');
  });
});

describe('JWT + role protection', () => {
  it('GET /auth/me requires a token (401 without)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns the current principal', async () => {
    const email = `hiker-me-${Date.now()}@example.com`;
    const reg = await registerCustomer({ email });
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.account.email).toBe(email);
    expect(res.body.role).toBe('customer');
  });

  it('a customer token cannot access admin routes (403)', async () => {
    const email = `hiker-admin-${Date.now()}@example.com`;
    const reg = await registerCustomer({ email });
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
