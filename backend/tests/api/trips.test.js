import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Organizer from '../../src/models/Organizer.js';
import Admin from '../../src/models/Admin.js';
import Category from '../../src/models/Category.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

// A complete, valid organizer trip payload.
const validTrip = (over = {}) => ({
  name: 'Test Summit Trek',
  location: 'Manali, Himachal',
  state: 'Himachal Pradesh',
  city: 'Manali',
  pricingTiers: [
    { label: 'Solo', price: 500 },
    { label: 'Couple', price: 450 },
  ],
  pickup: { location: 'Manali', price: 50 },
  startPoint: { lat: 32.24, lng: 77.18, label: 'Manali Base' },
  departureDates: ['2026-08-01', '2026-08-15'],
  difficulty: 'Moderate',
  durationDays: 5,
  maxGroupSize: 15,
  availableSeats: 15,
  category: 'Trekking',
  coverImage: 'https://example.com/x.jpg',
  description: 'A test trek',
  status: 'Published',
  ...over,
});

// Registers an organizer and approves them, returning their bearer token.
async function approvedOrganizerToken(email = 'org@example.com') {
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({
    name: 'Org Owner', email, password: 'pass1234', agencyName: 'Peak Guides',
  });
  const org = await Organizer.findById(reg.body.account.id);
  org.isApproved = true;
  org.isPendingApproval = false;
  await org.save();
  // Re-login so the token reflects nothing stale (approval isn't in the token,
  // but this mirrors the real flow).
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email, password: 'pass1234' });
  return login.body.token;
}

async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@trekigo.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@trekigo.com', password: 'admin123' });
  return res.body.token;
}

describe('Public catalog', () => {
  it('lists only Published trips', async () => {
    const token = await approvedOrganizerToken();
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip({ name: 'Published One', status: 'Published' }));
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip({ name: 'Draft One', status: 'Draft' }));

    const res = await request(app).get('/api/v1/trips');
    expect(res.status).toBe(200);
    const names = res.body.trips.map((t) => t.name);
    expect(names).toContain('Published One');
    expect(names).not.toContain('Draft One');
    expect(res.body).toHaveProperty('total');
  });

  it('filters by search term', async () => {
    const token = await approvedOrganizerToken();
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip({ name: 'Kasol Adventure' }));
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip({ name: 'Coorg Walk', location: 'Coorg, Karnataka' }));

    const res = await request(app).get('/api/v1/trips?search=kasol');
    expect(res.body.trips.map((t) => t.name)).toEqual(['Kasol Adventure']);
  });

  it('serves the canonical category list', async () => {
    await Category.create({ _id: 'Trekking', label: 'Trekking', icon: 'Mountain', order: 1 });
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories[0]).toMatchObject({ id: 'Trekking', label: 'Trekking' });
  });
});

describe('Organizer trip CRUD', () => {
  it('creates a trip with tiers that then appears in the public catalog', async () => {
    const token = await approvedOrganizerToken();
    const create = await request(app)
      .post('/api/v1/organizer/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(validTrip());
    expect(create.status).toBe(201);
    expect(create.body.trip.id).toBeTruthy();
    expect(create.body.trip.trekId).toBe('test-summit-trek');
    expect(create.body.trip.pricingTiers).toHaveLength(2);
    expect(create.body.trip.organizer.verified).toBe(true);
    expect(create.body.trip.price).toBe(50); // = pickup.price

    const list = await request(app).get('/api/v1/trips?search=summit');
    expect(list.body.trips.map((t) => t.id)).toContain(create.body.trip.id);
  });

  it.each([
    ['zero pricing tiers', { pricingTiers: [] }],
    ['missing pickup', { pickup: undefined }],
    ['missing startPoint', { startPoint: undefined }],
    ['empty departureDates', { departureDates: [] }],
  ])('rejects a trip with %s (400)', async (_label, override) => {
    const token = await approvedOrganizerToken();
    const res = await request(app)
      .post('/api/v1/organizer/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(validTrip(override));
    expect(res.status).toBe(400);
  });

  it('a pending (unapproved) organizer cannot create trips (403)', async () => {
    const reg = await request(app).post('/api/v1/auth/organizer/register').send({
      name: 'Pending', email: 'pending@example.com', password: 'pass1234', agencyName: 'Newbie',
    });
    const res = await request(app)
      .post('/api/v1/organizer/trips')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send(validTrip());
    expect(res.status).toBe(403);
  });

  it("an organizer cannot edit another organizer's trip (403)", async () => {
    const tokenA = await approvedOrganizerToken('a@example.com');
    const tokenB = await approvedOrganizerToken('b@example.com');
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenA}`).send(validTrip());
    const res = await request(app)
      .put(`/api/v1/organizer/trips/${create.body.trip.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send(validTrip({ name: 'Hijacked' }));
    expect(res.status).toBe(403);
  });

  it('lists only the calling organizer\'s own trips', async () => {
    const tokenA = await approvedOrganizerToken('a@example.com');
    const tokenB = await approvedOrganizerToken('b@example.com');
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenA}`).send(validTrip({ name: 'A Trip' }));
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenB}`).send(validTrip({ name: 'B Trip' }));

    const res = await request(app).get('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenA}`);
    expect(res.body.trips.map((t) => t.name)).toEqual(['A Trip']);
  });
});

describe('Trek offers grouping', () => {
  it('groups multiple organizers offering the same trek with min/max price + count', async () => {
    const tokenA = await approvedOrganizerToken('a@example.com');
    const tokenB = await approvedOrganizerToken('b@example.com');
    // Same trek name → same trekId; different tier prices.
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenA}`).send(validTrip({ name: 'Shared Trek', pickup: { location: 'X', price: 100 } }));
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenB}`).send(validTrip({ name: 'Shared Trek', pickup: { location: 'Y', price: 200 } }));

    const res = await request(app).get('/api/v1/treks/shared-trek/offers');
    expect(res.status).toBe(200);
    expect(res.body.organizerCount).toBe(2);
    expect(res.body.minPrice).toBe(100);
    expect(res.body.maxPrice).toBe(200);
    expect(res.body.offers).toHaveLength(2);
  });
});

describe('Admin trip moderation', () => {
  it('admin can pause a trip (removing it from the public catalog) and delete it', async () => {
    const orgToken = await approvedOrganizerToken();
    const admin = await adminToken();
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(validTrip({ name: 'Moderated Trek' }));
    const id = create.body.trip.id;

    // Visible while published
    let list = await request(app).get('/api/v1/trips?search=moderated');
    expect(list.body.trips).toHaveLength(1);

    // Pause → drops off the public catalog
    const pause = await request(app).patch(`/api/v1/admin/trips/${id}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'Paused' });
    expect(pause.status).toBe(200);
    list = await request(app).get('/api/v1/trips?search=moderated');
    expect(list.body.trips).toHaveLength(0);

    // Delete
    const del = await request(app).delete(`/api/v1/admin/trips/${id}`).set('Authorization', `Bearer ${admin}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/v1/trips/${id}`);
    expect(get.status).toBe(404);
  });

  it('a non-admin cannot moderate trips (403)', async () => {
    const orgToken = await approvedOrganizerToken();
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(validTrip());
    const res = await request(app).patch(`/api/v1/admin/trips/${create.body.trip.id}/status`).set('Authorization', `Bearer ${orgToken}`).send({ status: 'Paused' });
    expect(res.status).toBe(403);
  });
});
