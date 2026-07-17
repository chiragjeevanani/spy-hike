import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Admin from '../../src/models/Admin.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();
const api = '/api/v1';

async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post(`${api}/auth/admin/login`).send({ email: 'admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });

const trekPayload = (over = {}) => ({
  title: 'Kedarkantha Trek',
  location: 'Sankri, Uttarakhand',
  difficulty: 'Moderate',
  durationDays: 5,
  distanceKm: 20,
  coverImage: 'https://example.com/kedar.jpg',
  ...over,
});

describe('Trek catalog — trending flag', () => {
  it('creates a trek as not-trending by default', async () => {
    const admin = await adminToken();
    const res = await request(app).post(`${api}/admin/treks`).set(auth(admin)).send(trekPayload());
    expect(res.status).toBe(201);
    expect(res.body.trek.trending).toBe(false);
    expect(res.body.trek.featured).toBeUndefined(); // no such flag on the trek catalog
  });

  it('creates a trek with trending set explicitly', async () => {
    const admin = await adminToken();
    const res = await request(app).post(`${api}/admin/treks`).set(auth(admin)).send(trekPayload({ trending: true }));
    expect(res.status).toBe(201);
    expect(res.body.trek.trending).toBe(true);
  });

  it('toggles trending via update', async () => {
    const admin = await adminToken();
    const created = await request(app).post(`${api}/admin/treks`).set(auth(admin)).send(trekPayload());
    const id = created.body.trek.id;

    const trendOn = await request(app).put(`${api}/admin/treks/${id}`).set(auth(admin)).send({ trending: true });
    expect(trendOn.body.trek.trending).toBe(true);

    const trendOff = await request(app).put(`${api}/admin/treks/${id}`).set(auth(admin)).send({ trending: false });
    expect(trendOff.body.trek.trending).toBe(false);
  });

  it('public listTreks filters by ?trending=true', async () => {
    const admin = await adminToken();
    await request(app).post(`${api}/admin/treks`).set(auth(admin)).send(trekPayload({ title: 'Trending Only Trek', trending: true }));
    await request(app).post(`${api}/admin/treks`).set(auth(admin)).send(trekPayload({ title: 'Plain Trek' }));

    const trendingList = await request(app).get(`${api}/treks?trending=true`);
    expect(trendingList.body.treks.map((t) => t.title)).toEqual(['Trending Only Trek']);

    const allList = await request(app).get(`${api}/treks`);
    expect(allList.body.treks).toHaveLength(2);
  });

  it('admin listTreks returns every trek regardless of the trending flag', async () => {
    const admin = await adminToken();
    await request(app).post(`${api}/admin/treks`).set(auth(admin)).send(trekPayload({ title: 'A Trek' }));
    await request(app).post(`${api}/admin/treks`).set(auth(admin)).send(trekPayload({ title: 'B Trek', trending: true }));

    const res = await request(app).get(`${api}/admin/treks`).set(auth(admin));
    expect(res.body.treks).toHaveLength(2);
  });
});
