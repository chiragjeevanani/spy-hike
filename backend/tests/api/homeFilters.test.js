import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Admin from '../../src/models/Admin.js';
import Trek from '../../src/models/Trek.js';
import Trip from '../../src/models/Trip.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();
const api = '/api/v1';
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'filters@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const response = await request(app).post(`${api}/auth/admin/login`).send({ email: 'filters@findyourtrek.com', password: 'admin123' });
  return response.body.token;
}

const trekPayload = (over = {}) => ({
  title: 'Filter Test Trek', location: 'Manali, Himachal Pradesh', difficulty: 'Moderate',
  durationDays: 4, distanceKm: 18, coverImage: 'https://example.com/trek.jpg', ...over,
});

async function seedTrip(trekId, name) {
  return Trip.create({
    _id: `trip-${trekId}`, trekId, organizerEmail: `${trekId}@example.com`,
    organizer: { name: 'Test Organizer', rating: 4.5, verified: true }, name,
    location: 'Manali, Himachal Pradesh', state: 'Himachal Pradesh', city: 'Manali',
    price: 1500, pricingTiers: [{ id: 'solo', label: 'Solo', price: 1500 }],
    pickup: { location: 'Manali', price: 1500 }, departureDates: ['2026-10-10'],
    difficulty: 'Moderate', durationDays: 4, distanceKm: 18, availableSeats: 10,
    maxGroupSize: 15, category: 'Trekking', coverImage: 'https://example.com/trek.jpg',
    status: 'Published', rating: 4.5, reviewsCount: 8,
  });
}

describe('Homepage filter CMS', () => {
  it('supports admin create, edit, hide, list, and delete', async () => {
    const token = await adminToken();
    const created = await request(app).post(`${api}/admin/home-filters`).set(auth(token))
      .send({ label: 'Monsoon Trails', icon: 'Leaf', order: 3 });
    expect(created.status).toBe(201);
    expect(created.body.filter).toMatchObject({ id: 'monsoon-trails', active: true, icon: 'Leaf' });

    const publicList = await request(app).get(`${api}/home-filters`);
    expect(publicList.body.filters.map((filter) => filter.id)).toContain('monsoon-trails');

    const hidden = await request(app).put(`${api}/admin/home-filters/monsoon-trails`).set(auth(token))
      .send({ label: 'Rain Treks', active: false, order: 1 });
    expect(hidden.body.filter).toMatchObject({ label: 'Rain Treks', active: false, order: 1 });
    expect((await request(app).get(`${api}/home-filters`)).body.filters).toHaveLength(0);
    expect((await request(app).get(`${api}/admin/home-filters`).set(auth(token))).body.filters).toHaveLength(1);

    expect((await request(app).delete(`${api}/admin/home-filters/monsoon-trails`).set(auth(token))).status).toBe(200);
    expect((await request(app).get(`${api}/admin/home-filters`).set(auth(token))).body.filters).toHaveLength(0);
  });

  it('stores multiple assignments and filters both trek lists and Explore groups', async () => {
    const token = await adminToken();
    await request(app).post(`${api}/admin/home-filters`).set(auth(token)).send({ label: 'Himalayas', icon: 'Mountain' });
    await request(app).post(`${api}/admin/home-filters`).set(auth(token)).send({ label: 'Popular', icon: 'Flame' });
    const trek = await request(app).post(`${api}/admin/treks`).set(auth(token))
      .send(trekPayload({ homeFilterIds: ['himalayas', 'popular'] }));
    await Trek.create({ _id: 'other-trek', ...trekPayload({ title: 'Other Trek' }), homeFilterIds: [] });
    await seedTrip(trek.body.trek.id, trek.body.trek.title);
    await seedTrip('other-trek', 'Other Trek');

    expect(trek.body.trek.homeFilterIds).toEqual(['himalayas', 'popular']);
    const catalog = await request(app).get(`${api}/treks?homeFilter=himalayas`);
    expect(catalog.body.treks.map((item) => item.id)).toEqual([trek.body.trek.id]);

    const groups = await request(app).get(`${api}/trek-groups?homeFilter=himalayas`);
    expect(groups.body.groups.map((group) => group.trekName)).toEqual(['Filter Test Trek']);
  });

  it('pulls a deleted filter from every trek assignment', async () => {
    const token = await adminToken();
    await request(app).post(`${api}/admin/home-filters`).set(auth(token)).send({ label: 'Himalayas' });
    const created = await request(app).post(`${api}/admin/treks`).set(auth(token))
      .send(trekPayload({ homeFilterIds: ['himalayas'] }));
    await request(app).delete(`${api}/admin/home-filters/himalayas`).set(auth(token));
    expect((await Trek.findById(created.body.trek.id)).homeFilterIds).toEqual([]);
  });
});
