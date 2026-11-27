import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import { signToken } from '../../src/utils/jwt.js';

const app = createApp();
const api = '/api/v1';

let userSeq = 0;
let mobileSeq = 0;
async function customerToken(email, name = 'Hiker') {
  const e = email || `hiker-${Date.now()}-${userSeq++}@example.com`;
  const mobile = `98765${String(mobileSeq++).padStart(5, '0')}`;
  await User.deleteOne({ email: e });
  const reg = await request(app).post(`${api}/auth/register`).send({ name, email: e, password: 'pass1234', mobile });
  return reg.body;
}
function adminToken() {
  return signToken({ sub: 'admin-test-id', role: 'admin', email: 'admin@findyourtrek.com' });
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('Admin — users roster', () => {
  it('lists every registered customer, newest first', async () => {
    await customerToken('a@example.com', 'Alpha');
    await customerToken('b@example.com', 'Beta');
    const admin = adminToken();

    const res = await request(app).get(`${api}/admin/users`).set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.users.map((u) => u.email)).toEqual(['b@example.com', 'a@example.com']);
    expect(res.body.users[0].name).toBe('Beta');
  });

  it('supports search + status filtering', async () => {
    await customerToken('search-me@example.com', 'Findable Hiker');
    await customerToken('other@example.com', 'Someone Else');
    const admin = adminToken();

    const found = await request(app).get(`${api}/admin/users?search=Findable`).set(auth(admin));
    expect(found.body.users).toHaveLength(1);
    expect(found.body.users[0].email).toBe('search-me@example.com');
  });

  it('bans and unbans a customer', async () => {
    const reg = await customerToken();
    const admin = adminToken();

    const banned = await request(app).patch(`${api}/admin/users/${reg.account.id}/status`).set(auth(admin)).send({ status: 'Banned' });
    expect(banned.status).toBe(200);
    expect(banned.body.user.status).toBe('Banned');

    // A banned customer can no longer log in.
    const login = await request(app).post(`${api}/auth/login`).send({ email: reg.account.email, password: 'pass1234' });
    expect(login.status).toBe(403);

    const active = await request(app).patch(`${api}/admin/users/${reg.account.id}/status`).set(auth(admin)).send({ status: 'Active' });
    expect(active.body.user.status).toBe('Active');
  });

  it('deletes a customer and creates one from the console', async () => {
    const reg = await customerToken();
    const admin = adminToken();

    const del = await request(app).delete(`${api}/admin/users/${reg.account.id}`).set(auth(admin));
    expect(del.status).toBe(200);
    const after = await request(app).get(`${api}/admin/users`).set(auth(admin));
    expect(after.body.users.find((u) => u.email === reg.account.email)).toBeUndefined();

    const created = await request(app).post(`${api}/admin/users`).set(auth(admin)).send({ name: 'Admin Made', email: 'made@example.com', mobile: '9811111111' });
    expect(created.status).toBe(201);
    expect(created.body.user.name).toBe('Admin Made');
  });

  it('rejects creating a user with an invalid email or malformed mobile', async () => {
    const admin = adminToken();
    const badEmail = await request(app).post(`${api}/admin/users`).set(auth(admin)).send({ name: 'Bad Email', email: 'not-an-email' });
    expect(badEmail.status).toBe(400);
    const badMobile = await request(app).post(`${api}/admin/users`).set(auth(admin)).send({ name: 'Bad Mobile', email: 'badmobile@example.com', mobile: '123' });
    expect(badMobile.status).toBe(400);
  });

  it("admin edits a hiker's profile and it actually persists", async () => {
    const reg = await customerToken();
    const admin = adminToken();

    const updated = await request(app).patch(`${api}/admin/users/${reg.account.id}`).set(auth(admin)).send({
      name: 'Edited Name', mobile: '9822222222', age: 30, emergencyContact: 'Someone (9822222222)',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.user.name).toBe('Edited Name');
    expect(updated.body.user.age).toBe(30);

    // Persisted for real — a fresh fetch reflects the change.
    const fetched = await request(app).get(`${api}/admin/users/${reg.account.id}`).set(auth(admin));
    expect(fetched.body.user.name).toBe('Edited Name');
    expect(fetched.body.user.mobile).toBe('9822222222');
  });

  it('rejects an admin edit with an empty name, bad mobile, or out-of-range age', async () => {
    const reg = await customerToken();
    const admin = adminToken();

    const emptyName = await request(app).patch(`${api}/admin/users/${reg.account.id}`).set(auth(admin)).send({ name: '   ' });
    expect(emptyName.status).toBe(400);
    const badMobile = await request(app).patch(`${api}/admin/users/${reg.account.id}`).set(auth(admin)).send({ mobile: '123' });
    expect(badMobile.status).toBe(400);
    const badAge = await request(app).patch(`${api}/admin/users/${reg.account.id}`).set(auth(admin)).send({ age: 5 });
    expect(badAge.status).toBe(400);
  });

  it('rejects roster access from a non-admin', async () => {
    const reg = await customerToken();
    const res = await request(app).get(`${api}/admin/users`).set(auth(reg.token));
    expect(res.status).toBe(403);
    const anon = await request(app).get(`${api}/admin/users`);
    expect(anon.status).toBe(401);
  });
});

describe('Admin — organizers roster', () => {
  it('creates an approved organizer and deletes one', async () => {
    const admin = adminToken();

    const created = await request(app).post(`${api}/admin/organizers`).set(auth(admin)).send({ name: 'New Partner', email: 'partner@example.com', agencyName: 'Partner Guides', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
    expect(created.status).toBe(201);
    expect(created.body.organizer.isApproved).toBe(true);

    const list = await request(app).get(`${api}/admin/organizers`).set(auth(admin));
    expect(list.body.organizers.some((o) => o.email === 'partner@example.com')).toBe(true);

    const del = await request(app).delete(`${api}/admin/organizers/${created.body.organizer.id}`).set(auth(admin));
    expect(del.status).toBe(200);
    const after = await request(app).get(`${api}/admin/organizers`).set(auth(admin));
    expect(after.body.organizers.some((o) => o.email === 'partner@example.com')).toBe(false);
  });
});
