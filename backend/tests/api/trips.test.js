import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Category from '../../src/models/Category.js';
import Trek from '../../src/models/Trek.js';
import { slugify } from '../../src/utils/slug.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

// Seeds an admin-curated Trek (the catalog entry an organizer must select
// when posting a trip) and returns its id ("slug of the title").
async function createTrek(overrides = {}) {
  const title = overrides.title || 'Test Summit Trek';
  const trek = await Trek.create({
    _id: slugify(title),
    title,
    location: overrides.location || 'Manali, Himachal',
    state: overrides.state || 'Himachal Pradesh',
    city: overrides.city || 'Manali',
    difficulty: overrides.difficulty || 'Moderate',
    durationDays: overrides.durationDays || 5,
    distanceKm: overrides.distanceKm ?? 10,
    coverImage: overrides.coverImage || 'https://example.com/x.jpg',
    description: overrides.description || 'A test trek',
  });
  return trek._id;
}

// A complete, valid organizer trip payload referencing a given trek.
const validTrip = (trekId, over = {}) => ({
  trekId,
  pricingTiers: [
    { label: 'Solo', price: 500 },
    { label: 'Couple', price: 450 },
  ],
  pickup: { location: 'Manali', price: 50 },
  startPoint: { lat: 32.24, lng: 77.18, label: 'Manali Base' },
  departureDates: ['2026-08-01', '2026-08-15'],
  maxGroupSize: 15,
  availableSeats: 15,
  category: 'Trekking',
  status: 'Published',
  ...over,
});

// Registers an organizer and approves them, returning their bearer token.
async function approvedOrganizerToken(email = 'org@example.com') {
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({
    name: 'Org Owner', email, password: 'pass1234', agencyName: 'Peak Guides', socialMediaLink: 'https://instagram.com/test',
    govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  });
  const user = await User.findById(reg.body.account.id);
  user.organizer.isApproved = true;
  user.organizer.isPendingApproval = false;
  await user.save();
  // Re-login so the token reflects nothing stale (approval isn't in the token,
  // but this mirrors the real flow).
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email, password: 'pass1234' });
  return login.body.token;
}

async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}

describe('Public catalog', () => {
  it('lists only Published trips', async () => {
    const token = await approvedOrganizerToken();
    const published = await createTrek({ title: 'Published One' });
    const draft = await createTrek({ title: 'Draft One' });
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip(published, { status: 'Published' }));
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip(draft, { status: 'Draft' }));

    const res = await request(app).get('/api/v1/trips');
    expect(res.status).toBe(200);
    const names = res.body.trips.map((t) => t.name);
    expect(names).toContain('Published One');
    expect(names).not.toContain('Draft One');
    // Paging is answered by hasMore; `total` costs a second full scan and is
    // only computed when a caller explicitly asks for it.
    expect(res.body).toHaveProperty('hasMore', false);
    expect(res.body).not.toHaveProperty('total');

    const withTotal = await request(app).get('/api/v1/trips?withTotal=true');
    expect(withTotal.body.total).toBe(1);
  });

  it('omits detail-only fields from the list but returns them on a single trip', async () => {
    const token = await approvedOrganizerToken();
    const trek = await createTrek({ title: 'Projection Trek' });
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`)
      .send(validTrip(trek, { status: 'Published' }));

    const list = await request(app).get('/api/v1/trips');
    const card = list.body.trips[0];
    for (const field of ['itinerary', 'faqs', 'reviews', 'galleryImages', 'description', 'included']) {
      expect(card[field]).toBeUndefined();
    }
    // Everything a browse card actually renders must survive the projection.
    for (const field of ['id', 'name', 'location', 'coverImage', 'price', 'difficulty', 'durationDays', 'availableSeats', 'pricingTiers', 'organizer']) {
      expect(card[field]).toBeDefined();
    }

    const detail = await request(app).get(`/api/v1/trips/${card.id}`);
    expect(detail.body.trip.itinerary).toBeDefined();
    expect(detail.body.trip.included).toBeDefined();
  });

  it('filters by search term', async () => {
    const token = await approvedOrganizerToken();
    const kasol = await createTrek({ title: 'Kasol Adventure' });
    const coorg = await createTrek({ title: 'Coorg Walk', location: 'Coorg, Karnataka' });
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip(kasol));
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip(coorg));

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
    const trekId = await createTrek();
    const create = await request(app)
      .post('/api/v1/organizer/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(validTrip(trekId));
    expect(create.status).toBe(201);
    expect(create.body.trip.id).toBeTruthy();
    expect(create.body.trip.trekId).toBe('test-summit-trek');
    expect(create.body.trip.pricingTiers).toHaveLength(2);
    expect(create.body.trip.organizer.verified).toBe(true);
    expect(create.body.trip.price).toBe(500); // = pricingTiers[0].price (starting price)

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
    const trekId = await createTrek();
    const res = await request(app)
      .post('/api/v1/organizer/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(validTrip(trekId, override));
    expect(res.status).toBe(400);
  });

  it('a pending (unapproved) organizer cannot create trips (403)', async () => {
    const trekId = await createTrek();
    const reg = await request(app).post('/api/v1/auth/organizer/register').send({
      name: 'Pending', email: 'pending@example.com', password: 'pass1234', agencyName: 'Newbie', socialMediaLink: 'https://instagram.com/test',
      govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
    });
    const res = await request(app)
      .post('/api/v1/organizer/trips')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send(validTrip(trekId));
    expect(res.status).toBe(403);
  });

  it("an organizer cannot edit another organizer's trip (403)", async () => {
    const tokenA = await approvedOrganizerToken('a@example.com');
    const tokenB = await approvedOrganizerToken('b@example.com');
    const trekId = await createTrek();
    const hijackedTrekId = await createTrek({ title: 'Hijacked' });
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenA}`).send(validTrip(trekId));
    const res = await request(app)
      .put(`/api/v1/organizer/trips/${create.body.trip.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send(validTrip(hijackedTrekId));
    expect(res.status).toBe(403);
  });

  it('lists only the calling organizer\'s own trips', async () => {
    const tokenA = await approvedOrganizerToken('a@example.com');
    const tokenB = await approvedOrganizerToken('b@example.com');
    const aTrek = await createTrek({ title: 'A Trip' });
    const bTrek = await createTrek({ title: 'B Trip' });
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenA}`).send(validTrip(aTrek));
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenB}`).send(validTrip(bTrek));

    const res = await request(app).get('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenA}`);
    expect(res.body.trips.map((t) => t.name)).toEqual(['A Trip']);
  });
});

describe('Trek offers grouping', () => {
  it('groups multiple organizers offering the same trek with min/max price + count', async () => {
    const tokenA = await approvedOrganizerToken('a@example.com');
    const tokenB = await approvedOrganizerToken('b@example.com');
    // Same trek → same trekId; different starting (tier) prices.
    const sharedTrekId = await createTrek({ title: 'Shared Trek' });
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenA}`).send(validTrip(sharedTrekId, { pricingTiers: [{ label: 'Solo', price: 100 }] }));
    await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${tokenB}`).send(validTrip(sharedTrekId, { pricingTiers: [{ label: 'Solo', price: 200 }] }));

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
    const trekId = await createTrek({ title: 'Moderated Trek' });
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(validTrip(trekId));
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
    const trekId = await createTrek();
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(validTrip(trekId));
    const res = await request(app).patch(`/api/v1/admin/trips/${create.body.trip.id}/status`).set('Authorization', `Bearer ${orgToken}`).send({ status: 'Paused' });
    expect(res.status).toBe(403);
  });

  it('admin can mark a trip featured, and it headlines the public catalog + featured filter', async () => {
    const orgToken = await approvedOrganizerToken();
    const admin = await adminToken();
    const trekId = await createTrek({ title: 'Featured Candidate Trek' });
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(validTrip(trekId));
    const id = create.body.trip.id;
    expect(create.body.trip.featured).toBe(false);

    const on = await request(app).patch(`/api/v1/admin/trips/${id}/featured`).set('Authorization', `Bearer ${admin}`).send({ featured: true });
    expect(on.status).toBe(200);
    expect(on.body.trip.featured).toBe(true);

    const featuredList = await request(app).get('/api/v1/trips?featured=true');
    expect(featuredList.body.trips.some((t) => t.id === id)).toBe(true);

    const off = await request(app).patch(`/api/v1/admin/trips/${id}/featured`).set('Authorization', `Bearer ${admin}`).send({ featured: false });
    expect(off.body.trip.featured).toBe(false);
  });

  it('a non-admin cannot mark a trip featured (403)', async () => {
    const orgToken = await approvedOrganizerToken();
    const trekId = await createTrek();
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(validTrip(trekId));
    const res = await request(app).patch(`/api/v1/admin/trips/${create.body.trip.id}/featured`).set('Authorization', `Bearer ${orgToken}`).send({ featured: true });
    expect(res.status).toBe(403);
  });

  it('admin can mark a trip popular, and it shows in the public ?popular=true filter', async () => {
    const orgToken = await approvedOrganizerToken();
    const admin = await adminToken();
    const trekId = await createTrek({ title: 'Popular Candidate Trek' });
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(validTrip(trekId));
    const id = create.body.trip.id;
    expect(create.body.trip.popular).toBe(false);

    const on = await request(app).patch(`/api/v1/admin/trips/${id}/popular`).set('Authorization', `Bearer ${admin}`).send({ popular: true });
    expect(on.status).toBe(200);
    expect(on.body.trip.popular).toBe(true);

    const popularList = await request(app).get('/api/v1/trips?popular=true');
    expect(popularList.body.trips.some((t) => t.id === id)).toBe(true);

    const off = await request(app).patch(`/api/v1/admin/trips/${id}/popular`).set('Authorization', `Bearer ${admin}`).send({ popular: false });
    expect(off.body.trip.popular).toBe(false);
  });

  it('a non-admin cannot mark a trip popular (403)', async () => {
    const orgToken = await approvedOrganizerToken();
    const trekId = await createTrek();
    const create = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send(validTrip(trekId));
    const res = await request(app).patch(`/api/v1/admin/trips/${create.body.trip.id}/popular`).set('Authorization', `Bearer ${orgToken}`).send({ popular: true });
    expect(res.status).toBe(403);
  });
});
