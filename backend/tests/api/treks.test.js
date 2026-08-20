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

describe('Trek catalog — duration and distance ranges', () => {
  it('stores both ends of a range', async () => {
    const admin = await adminToken();
    const res = await request(app).post(`${api}/admin/treks`).set(auth(admin))
      .send(trekPayload({ durationDays: 5, durationDaysMax: 6, distanceKm: 20, distanceKmMax: 23 }));
    expect(res.status).toBe(201);
    expect(res.body.trek).toMatchObject({
      durationDays: 5, durationDaysMax: 6, distanceKm: 20, distanceKmMax: 23,
    });
  });

  it('collapses an omitted or non-exceeding max to null, i.e. an exact value', async () => {
    const admin = await adminToken();
    const omitted = await request(app).post(`${api}/admin/treks`).set(auth(admin))
      .send(trekPayload({ title: 'Omitted Max Trek' }));
    expect(omitted.body.trek.durationDaysMax).toBeNull();
    expect(omitted.body.trek.distanceKmMax).toBeNull();

    const equal = await request(app).post(`${api}/admin/treks`).set(auth(admin))
      .send(trekPayload({ title: 'Equal Max Trek', durationDaysMax: 5, distanceKmMax: 20 }));
    expect(equal.body.trek.durationDaysMax).toBeNull();
    expect(equal.body.trek.distanceKmMax).toBeNull();
  });

  it('rejects a max below the min', async () => {
    const admin = await adminToken();
    const res = await request(app).post(`${api}/admin/treks`).set(auth(admin))
      .send(trekPayload({ durationDays: 5, durationDaysMax: 3 }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.durationDaysMax).toMatch(/less than min/i);
  });

  it('updates both ends of a range, and collapses it when the min catches up', async () => {
    const admin = await adminToken();
    const created = await request(app).post(`${api}/admin/treks`).set(auth(admin)).send(trekPayload());
    const id = created.body.trek.id;

    const updated = await request(app).put(`${api}/admin/treks/${id}`).set(auth(admin))
      .send({ durationDays: 4, durationDaysMax: 7, distanceKm: 18, distanceKmMax: 25 });
    expect(updated.body.trek).toMatchObject({
      durationDays: 4, durationDaysMax: 7, distanceKm: 18, distanceKmMax: 25,
    });

    // Raising the min to the max collapses the range back to a single value.
    const collapsed = await request(app).put(`${api}/admin/treks/${id}`).set(auth(admin))
      .send({ durationDays: 7 });
    expect(collapsed.body.trek.durationDaysMax).toBeNull();
  });
});
