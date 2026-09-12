import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Trek from '../../src/models/Trek.js';
import { slugify } from '../../src/utils/slug.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();
const api = '/api/v1';

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

const validTrip = (trekId, over = {}) => ({
  trekId,
  pricingTiers: [{ label: 'Solo', price: 500 }],
  pickup: { location: 'Manali', price: 50 },
  startPoint: { lat: 32.24, lng: 77.18, label: 'Manali Base' },
  departureDates: ['2026-08-01', '2026-08-15'],
  maxGroupSize: 15,
  availableSeats: 15,
  category: 'Trekking',
  status: 'Published',
  ...over,
});

async function approvedOrganizer(email = 'org@example.com', agencyName = 'Peak Guides') {
  const reg = await request(app).post(`${api}/auth/organizer/register`).send({
    name: 'Org Owner', email, password: 'pass1234', agencyName, socialMediaLink: 'https://instagram.com/test',
    govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  });
  const user = await User.findById(reg.body.account.id);
  user.organizer.isApproved = true;
  user.organizer.isPendingApproval = false;
  await user.save();
  const login = await request(app).post(`${api}/auth/organizer/login`).send({ email, password: 'pass1234' });
  return { token: login.body.token, id: reg.body.account.id, email };
}

async function customerToken(email = 'hiker@example.com') {
  const reg = await request(app).post(`${api}/auth/register`).send({ name: 'Hiker', email, password: 'pass1234', mobile: '9812345670' });
  return reg.body.token;
}

async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post(`${api}/auth/admin/login`).send({ email: 'admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const isoDate = (d) => d.toISOString().split('T')[0];
const inDays = (n) => isoDate(new Date(Date.now() + n * 86400000));

describe('Organizer promotion requests', () => {
  it('an organizer can request promotion, but not file a second one while pending', async () => {
    const org = await approvedOrganizer();

    const create = await request(app).post(`${api}/organizer/promotion-requests`).set(auth(org.token)).send({ message: 'Please boost me!' });
    expect(create.status).toBe(201);
    expect(create.body.request.status).toBe('Pending');
    expect(create.body.request.organizerEmail).toBe(org.email);

    const dupe = await request(app).post(`${api}/organizer/promotion-requests`).set(auth(org.token)).send({ message: 'Again' });
    expect(dupe.status).toBe(409);

    const mine = await request(app).get(`${api}/organizer/promotion-requests`).set(auth(org.token));
    expect(mine.body.requests).toHaveLength(1);
  });

  it('a non-organizer cannot request promotion (403)', async () => {
    const token = await customerToken();
    const res = await request(app).post(`${api}/organizer/promotion-requests`).set(auth(token)).send({});
    expect(res.status).toBe(403);
  });
});

describe('Admin — reviewing promotion requests', () => {
  it('approves a request with a date range, promoting the organizer and syncing their trips', async () => {
    const org = await approvedOrganizer();
    const admin = await adminToken();
    const trekId = await createTrek();
    const trip = await request(app).post(`${api}/organizer/trips`).set(auth(org.token)).send(validTrip(trekId));

    await request(app).post(`${api}/organizer/promotion-requests`).set(auth(org.token)).send({ message: 'Boost me' });
    const pending = await request(app).get(`${api}/admin/promotion-requests?status=Pending`).set(auth(admin));
    expect(pending.body.requests).toHaveLength(1);
    const requestId = pending.body.requests[0].id;

    const startDate = inDays(0);
    const endDate = inDays(30);
    const review = await request(app).patch(`${api}/admin/promotion-requests/${requestId}`).set(auth(admin)).send({ action: 'approve', startDate, endDate });
    expect(review.status).toBe(200);
    expect(review.body.request.status).toBe('Approved');
    expect(review.body.organizer.isPromoted).toBe(true);

    // Organizer roster reflects it.
    const roster = await request(app).get(`${api}/admin/organizers`).set(auth(admin));
    const listed = roster.body.organizers.find((o) => o.email === org.email);
    expect(listed.isPromoted).toBe(true);
    expect(listed.promotedUntil).toBeTruthy();

    // The trip posted *before* approval is synced too, with no re-save needed.
    const fetchedTrip = await request(app).get(`${api}/trips/${trip.body.trip.id}`);
    expect(fetchedTrip.body.trip.organizer.promotedUntil).toBeTruthy();
  });

  it('rejects a request with a note, leaving the organizer unpromoted', async () => {
    const org = await approvedOrganizer();
    const admin = await adminToken();
    await request(app).post(`${api}/organizer/promotion-requests`).set(auth(org.token)).send({});
    const pending = await request(app).get(`${api}/admin/promotion-requests?status=Pending`).set(auth(admin));
    const requestId = pending.body.requests[0].id;

    const review = await request(app).patch(`${api}/admin/promotion-requests/${requestId}`).set(auth(admin)).send({ action: 'reject', reviewNote: 'Not this cycle' });
    expect(review.status).toBe(200);
    expect(review.body.request.status).toBe('Rejected');
    expect(review.body.request.reviewNote).toBe('Not this cycle');

    const mine = await request(app).get(`${api}/organizer/promotion-requests`).set(auth(org.token));
    expect(mine.body.requests[0].status).toBe('Rejected');

    const roster = await request(app).get(`${api}/admin/organizers`).set(auth(admin));
    expect(roster.body.organizers.find((o) => o.email === org.email).isPromoted).toBe(false);
  });

  it('rejects reviewing a request twice', async () => {
    const org = await approvedOrganizer();
    const admin = await adminToken();
    await request(app).post(`${api}/organizer/promotion-requests`).set(auth(org.token)).send({});
    const pending = await request(app).get(`${api}/admin/promotion-requests?status=Pending`).set(auth(admin));
    const requestId = pending.body.requests[0].id;

    await request(app).patch(`${api}/admin/promotion-requests/${requestId}`).set(auth(admin)).send({ action: 'reject' });
    const again = await request(app).patch(`${api}/admin/promotion-requests/${requestId}`).set(auth(admin)).send({ action: 'approve', startDate: inDays(0), endDate: inDays(10) });
    expect(again.status).toBe(400);
  });

  it('a non-admin cannot review promotion requests (403)', async () => {
    const org = await approvedOrganizer();
    await request(app).post(`${api}/organizer/promotion-requests`).set(auth(org.token)).send({});
    const res = await request(app).get(`${api}/admin/promotion-requests`).set(auth(org.token));
    expect(res.status).toBe(403);
  });
});

describe('Admin — direct promote / unpromote (no request on file)', () => {
  it('promotes and then unpromotes an organizer', async () => {
    const org = await approvedOrganizer();
    const admin = await adminToken();

    const promote = await request(app)
      .patch(`${api}/admin/organizers/${org.id}/promote`)
      .set(auth(admin))
      .send({ startDate: inDays(0), endDate: inDays(15) });
    expect(promote.status).toBe(200);
    expect(promote.body.organizer.isPromoted).toBe(true);

    const unpromote = await request(app).patch(`${api}/admin/organizers/${org.id}/unpromote`).set(auth(admin));
    expect(unpromote.status).toBe(200);
    expect(unpromote.body.organizer.isPromoted).toBe(false);
  });

  it('rejects an end date that is not after the start date, or already in the past', async () => {
    const org = await approvedOrganizer();
    const admin = await adminToken();

    const badOrder = await request(app).patch(`${api}/admin/organizers/${org.id}/promote`).set(auth(admin)).send({ startDate: inDays(10), endDate: inDays(5) });
    expect(badOrder.status).toBe(400);

    const inPast = await request(app).patch(`${api}/admin/organizers/${org.id}/promote`).set(auth(admin)).send({ startDate: inDays(-10), endDate: inDays(-1) });
    expect(inPast.status).toBe(400);
  });

  it('a non-admin cannot promote an organizer (403)', async () => {
    const org = await approvedOrganizer();
    const res = await request(app).patch(`${api}/admin/organizers/${org.id}/promote`).set(auth(org.token)).send({ startDate: inDays(0), endDate: inDays(10) });
    expect(res.status).toBe(403);
  });
});

describe('Promoted organizers always sort first', () => {
  it('GET /treks/:trekId/offers puts the promoted organizer\'s offer first', async () => {
    const orgA = await approvedOrganizer('a@example.com', 'Agency A');
    const orgB = await approvedOrganizer('b@example.com', 'Agency B');
    const admin = await adminToken();
    const trekId = await createTrek({ title: 'Shared Ridge Trek' });

    await request(app).post(`${api}/organizer/trips`).set(auth(orgA.token)).send(validTrip(trekId));
    await request(app).post(`${api}/organizer/trips`).set(auth(orgB.token)).send(validTrip(trekId));

    // Before promotion: no ordering guarantee is asserted, just that both exist.
    const before = await request(app).get(`${api}/treks/${trekId}/offers`);
    expect(before.body.offers).toHaveLength(2);

    // Promote B — it must lead regardless of natural/insertion order.
    await request(app).patch(`${api}/admin/organizers/${orgB.id}/promote`).set(auth(admin)).send({ startDate: inDays(0), endDate: inDays(10) });

    const after = await request(app).get(`${api}/treks/${trekId}/offers`);
    expect(after.body.offers[0].organizerEmail).toBe(orgB.email);
  });

  it('GET /trips (paginated public feed) puts a promoted organizer\'s trip first even over a featured competitor', async () => {
    const orgA = await approvedOrganizer('a@example.com', 'Agency A');
    const orgB = await approvedOrganizer('b@example.com', 'Agency B');
    const admin = await adminToken();
    const trekA = await createTrek({ title: 'Feature Trek A' });
    const trekB = await createTrek({ title: 'Feature Trek B' });

    const tripA = await request(app).post(`${api}/organizer/trips`).set(auth(orgA.token)).send(validTrip(trekA));
    const tripB = await request(app).post(`${api}/organizer/trips`).set(auth(orgB.token)).send(validTrip(trekB));

    // Give A the usual top-of-list edge (featured) — should still lose to a promoted B.
    await request(app).patch(`${api}/admin/trips/${tripA.body.trip.id}/featured`).set(auth(admin)).send({ featured: true });
    await request(app).patch(`${api}/admin/organizers/${orgB.id}/promote`).set(auth(admin)).send({ startDate: inDays(0), endDate: inDays(10) });

    const list = await request(app).get(`${api}/trips`);
    expect(list.body.trips[0].id).toBe(tripB.body.trip.id);
  });

  it('an expired promotion no longer sorts first or reports as promoted', async () => {
    const orgA = await approvedOrganizer('a@example.com', 'Agency A');
    const orgB = await approvedOrganizer('b@example.com', 'Agency B');
    const trekA = await createTrek({ title: 'Expiry Trek A' });
    const trekB = await createTrek({ title: 'Expiry Trek B' });
    const tripA = await request(app).post(`${api}/organizer/trips`).set(auth(orgA.token)).send(validTrip(trekA));
    await request(app).post(`${api}/organizer/trips`).set(auth(orgB.token)).send(validTrip(trekB));

    // Simulate a promotion that has already lapsed (the API itself refuses to
    // create one in the past, same as time simply passing on a real one).
    const userB = await User.findById(orgB.id);
    userB.organizer.promotedFrom = new Date(Date.now() - 20 * 86400000);
    userB.organizer.promotedUntil = new Date(Date.now() - 1 * 86400000);
    await userB.save();

    const admin = await adminToken();
    const roster = await request(app).get(`${api}/admin/organizers`).set(auth(admin));
    expect(roster.body.organizers.find((o) => o.email === orgB.email).isPromoted).toBe(false);

    // Give A a real edge (featured) — B's lapsed promotion must not beat it.
    await request(app).patch(`${api}/admin/trips/${tripA.body.trip.id}/featured`).set(auth(admin)).send({ featured: true });
    const list = await request(app).get(`${api}/trips`);
    expect(list.body.trips[0].id).toBe(tripA.body.trip.id);
  });

  it('admin can reorder multiple promoted organizers and customer offers display in that exact order', async () => {
    const admin = await adminToken();
    const orgA = await approvedOrganizer('orgA@example.com', 'Organizer Alpha');
    const orgB = await approvedOrganizer('orgB@example.com', 'Organizer Beta');
    const orgC = await approvedOrganizer('orgC@example.com', 'Organizer Gamma');

    const trek = await createTrek({ title: 'Shared Himalayan Trek' });

    // Each organizer posts an offer for the same trek
    const tripA = await request(app).post(`${api}/organizer/trips`).set(auth(orgA.token)).send(validTrip(trek, { price: 3000 }));
    const tripB = await request(app).post(`${api}/organizer/trips`).set(auth(orgB.token)).send(validTrip(trek, { price: 2000 }));
    const tripC = await request(app).post(`${api}/organizer/trips`).set(auth(orgC.token)).send(validTrip(trek, { price: 1000 }));

    // Promote all 3 organizers
    await request(app).patch(`${api}/admin/organizers/${orgA.id}/promote`).set(auth(admin)).send({ startDate: inDays(0), endDate: inDays(30) });
    await request(app).patch(`${api}/admin/organizers/${orgB.id}/promote`).set(auth(admin)).send({ startDate: inDays(0), endDate: inDays(30) });
    await request(app).patch(`${api}/admin/organizers/${orgC.id}/promote`).set(auth(admin)).send({ startDate: inDays(0), endDate: inDays(30) });

    // Check list of promoted organizers
    const listRes1 = await request(app).get(`${api}/admin/promoted-organizers`).set(auth(admin));
    expect(listRes1.status).toBe(200);
    expect(listRes1.body.organizers).toHaveLength(3);

    // Admin sets custom priority sequence: Gamma (C) first, Alpha (A) second, Beta (B) third
    const reorderRes = await request(app)
      .put(`${api}/admin/promoted-organizers/order`)
      .set(auth(admin))
      .send({ organizerIds: [orgC.id, orgA.id, orgB.id] });

    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body.organizers[0].email).toBe('orgc@example.com');
    expect(reorderRes.body.organizers[0].promotionPriority).toBe(1);
    expect(reorderRes.body.organizers[1].email).toBe('orga@example.com');
    expect(reorderRes.body.organizers[1].promotionPriority).toBe(2);
    expect(reorderRes.body.organizers[2].email).toBe('orgb@example.com');
    expect(reorderRes.body.organizers[2].promotionPriority).toBe(3);

    // Customer visits trek offers endpoint
    const offersRes = await request(app).get(`${api}/treks/${trek}/offers`);
    expect(offersRes.status).toBe(200);
    expect(offersRes.body.offers).toHaveLength(3);

    // Verify exact sequence matches admin custom order: C -> A -> B
    expect(offersRes.body.offers[0].organizerEmail).toBe('orgc@example.com');
    expect(offersRes.body.offers[1].organizerEmail).toBe('orga@example.com');
    expect(offersRes.body.offers[2].organizerEmail).toBe('orgb@example.com');
  });
});
