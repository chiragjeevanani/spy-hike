import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Trek from '../../src/models/Trek.js';
import Notification from '../../src/models/Notification.js';
import { purgeExpiredNotifications } from '../../src/services/notificationService.js';
import { hashPassword } from '../../src/utils/password.js';

const app = createApp();

let userSeq = 0;
async function customerToken(email) {
  const e = email || `hiker-${Date.now()}-${userSeq++}@example.com`;
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email: e, password: 'pass1234' });
  return { token: reg.body.token, email: e };
}

async function approvedOrganizerToken(email) {
  const e = email || `org-${Date.now()}-${userSeq++}@example.com`;
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({ name: 'Org', email: e, password: 'pass1234', agencyName: 'Guides', socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
  await User.findByIdAndUpdate(reg.body.account.id, { 'organizer.isApproved': true, 'organizer.isPendingApproval': false });
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email: e, password: 'pass1234' });
  return login.body.token;
}
async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'admin@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post('/api/v1/auth/admin/login').send({ email: 'admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}
let trekSeq = 0;
async function makeTrip(orgToken) {
  const seq = trekSeq++;
  const trek = await Trek.create({
    _id: `social-trek-${Date.now()}-${seq}`,
    title: `Social Trek ${seq}`, location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send({
    trekId: trek._id,
    pricingTiers: [{ label: 'Solo', price: 500 }],
    pickup: { location: 'Manali', price: 0 },
    startPoint: { lat: 32.2, lng: 77.1, label: 'Base' },
    departureDates: ['2026-08-01'], maxGroupSize: 10, availableSeats: 10, category: 'Trekking', status: 'Published',
  });
  return res.body.trip;
}
async function makeBooking(custToken, tripId) {
  const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${custToken}`).send({
    tripId, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
  });
  return res.body.booking;
}

describe('Wishlist', () => {
  it('starts empty and persists a saved list per user', async () => {
    const { token } = await customerToken();
    const empty = await request(app).get('/api/v1/wishlist').set('Authorization', `Bearer ${token}`);
    expect(empty.body.wishlist).toEqual([]);

    await request(app).put('/api/v1/wishlist').set('Authorization', `Bearer ${token}`).send({ wishlist: ['trek-a', 'trek-b', 'trek-a'] });
    const saved = await request(app).get('/api/v1/wishlist').set('Authorization', `Bearer ${token}`);
    expect(saved.body.wishlist.sort()).toEqual(['trek-a', 'trek-b']); // de-duped
  });

  it('is isolated per customer', async () => {
    const a = await customerToken('a@example.com');
    const b = await customerToken('b@example.com');
    await request(app).put('/api/v1/wishlist').set('Authorization', `Bearer ${a.token}`).send({ wishlist: ['x'] });
    const bList = await request(app).get('/api/v1/wishlist').set('Authorization', `Bearer ${b.token}`);
    expect(bList.body.wishlist).toEqual([]);
  });
});

describe('Reviews', () => {
  it('a customer reviews their booking; the trip rollups update', async () => {
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    const booking = await makeBooking(token, trip.id);

    const res = await request(app).post(`/api/v1/bookings/${booking.bookingId}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 5, comment: 'Epic!' });
    expect(res.status).toBe(201);

    const tripAfter = await request(app).get(`/api/v1/trips/${trip.id}`);
    expect(tripAfter.body.trip.reviewsCount).toBe(1);
    expect(tripAfter.body.trip.rating).toBe(5);
    expect(tripAfter.body.trip.reviews[0].comment).toBe('Epic!');
  });

  it('returns the caller their own reviews, with the trip name attached', async () => {
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    const booking = await makeBooking(token, trip.id);
    await request(app).post(`/api/v1/bookings/${booking.bookingId}/review`)
      .set('Authorization', `Bearer ${token}`).send({ rating: 5, comment: 'Epic!' });

    const mine = await request(app).get('/api/v1/reviews/mine').set('Authorization', `Bearer ${token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.reviews).toHaveLength(1);
    expect(mine.body.reviews[0].comment).toBe('Epic!');
    expect(mine.body.reviews[0].tripId).toBe(trip.id);
    expect(mine.body.reviews[0].tripName).toBe(trip.name);
  });

  it("never returns another customer's reviews, even to a same-named user", async () => {
    const org = await approvedOrganizerToken();
    const a = await customerToken('a@example.com');
    const b = await customerToken('b@example.com');
    const trip = await makeTrip(org);
    const booking = await makeBooking(a.token, trip.id);
    await request(app).post(`/api/v1/bookings/${booking.bookingId}/review`)
      .set('Authorization', `Bearer ${a.token}`).send({ rating: 5, comment: 'Mine alone' });

    // The old client-side version matched on display name, so these two
    // fixtures — which share a name — saw each other's reviews.
    const mine = await request(app).get('/api/v1/reviews/mine').set('Authorization', `Bearer ${b.token}`);
    expect(mine.body.reviews).toEqual([]);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/reviews/mine');
    expect(res.status).toBe(401);
  });

  it('rejects a second review of the same booking (409)', async () => {
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    const booking = await makeBooking(token, trip.id);
    await request(app).post(`/api/v1/bookings/${booking.bookingId}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 4, comment: 'Great trip.' });
    const dup = await request(app).post(`/api/v1/bookings/${booking.bookingId}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 3, comment: 'Trying again.' });
    expect(dup.status).toBe(409);
  });

  it("rejects reviewing someone else's booking (404)", async () => {
    const org = await approvedOrganizerToken();
    const a = await customerToken('a@example.com');
    const b = await customerToken('b@example.com');
    const trip = await makeTrip(org);
    const booking = await makeBooking(a.token, trip.id);
    const res = await request(app).post(`/api/v1/bookings/${booking.bookingId}/review`).set('Authorization', `Bearer ${b.token}`).send({ rating: 5 });
    expect(res.status).toBe(404);
  });

  it('rejects a review with a blank comment (400)', async () => {
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    const booking = await makeBooking(token, trip.id);
    const res = await request(app).post(`/api/v1/bookings/${booking.bookingId}/review`).set('Authorization', `Bearer ${token}`).send({ rating: 5, comment: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('Notifications', () => {
  it('a booking emits a notification to the customer and the organizer', async () => {
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    await makeBooking(token, trip.id);

    const cust = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(cust.body.notifications.some((n) => /Permit Slot Secured/i.test(n.title))).toBe(true);

    const orgN = await request(app).get('/api/v1/organizer/notifications').set('Authorization', `Bearer ${org}`);
    expect(orgN.body.notifications.some((n) => /New Booking/i.test(n.title))).toBe(true);
  });

  it('admin broadcast fans out to the target audience and is markable read', async () => {
    const admin = await adminToken();
    const { token } = await customerToken();

    const bc = await request(app).post('/api/v1/admin/broadcast').set('Authorization', `Bearer ${admin}`).send({ title: 'Monsoon Alert', content: 'Carry rain gear', type: 'Updates', target: 'users' });
    expect(bc.status).toBe(201);
    expect(bc.body.delivered).toBeGreaterThan(0);

    const list = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    const notif = list.body.notifications.find((n) => n.title === 'Monsoon Alert');
    expect(notif).toBeTruthy();
    expect(notif.read).toBe(false);

    await request(app).patch(`/api/v1/notifications/${notif.id}/read`).set('Authorization', `Bearer ${token}`);
    const after = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(after.body.notifications.find((n) => n.id === notif.id).read).toBe(true);
  });

  it('rejects a broadcast with a blank title or blank content', async () => {
    const admin = await adminToken();
    const noTitle = await request(app).post('/api/v1/admin/broadcast').set('Authorization', `Bearer ${admin}`).send({ title: '   ', content: 'Carry rain gear' });
    expect(noTitle.status).toBe(400);
    const noContent = await request(app).post('/api/v1/admin/broadcast').set('Authorization', `Bearer ${admin}`).send({ title: 'Monsoon Alert', content: '   ' });
    expect(noContent.status).toBe(400);
  });

  it('defines a 30-day TTL index on createdAt', () => {
    const indexes = Notification.schema.indexes();
    const ttlIndex = indexes.find(([fields, opts]) => fields.createdAt === 1 && opts?.expireAfterSeconds);
    expect(ttlIndex).toBeTruthy();
    expect(ttlIndex[1].expireAfterSeconds).toBe(30 * 24 * 60 * 60);
  });

  it('purges notifications older than 30 days and retains recent ones', async () => {
    const { token, email } = await customerToken('retention@example.com');

    // Create an old notification (40 days ago) and a recent one (2 days ago)
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const oldNotif = await Notification.create({
      ownerType: 'customer',
      ownerKey: email,
      title: 'Old Notification',
      content: 'Should be purged',
    });
    // Use raw collection update so Mongoose timestamp immutability does not override the past date
    await Notification.collection.updateOne({ _id: oldNotif._id }, { $set: { createdAt: fortyDaysAgo } });

    const recentNotif = await Notification.create({
      ownerType: 'customer',
      ownerKey: email,
      title: 'Recent Notification',
      content: 'Should stay',
    });
    await Notification.collection.updateOne({ _id: recentNotif._id }, { $set: { createdAt: twoDaysAgo } });

    // Endpoint query filter excludes the old notification
    const res = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.body.notifications.some((n) => n.title === 'Recent Notification')).toBe(true);
    expect(res.body.notifications.some((n) => n.title === 'Old Notification')).toBe(false);

    // Purge service physically removes expired records from database
    const purgeRes = await purgeExpiredNotifications(30);
    expect(purgeRes.deletedCount).toBeGreaterThanOrEqual(1);

    const checkOld = await Notification.findById(oldNotif._id);
    expect(checkOld).toBeNull();

    const checkRecent = await Notification.findById(recentNotif._id);
    expect(checkRecent).not.toBeNull();
  });
});

describe('Chat', () => {
  it('booking auto-creates an organizer welcome chat visible to both sides', async () => {
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    await makeBooking(token, trip.id);

    const custChats = await request(app).get('/api/v1/chats').set('Authorization', `Bearer ${token}`);
    expect(custChats.body.chats).toHaveLength(1);
    expect(custChats.body.chats[0].messages[0].sender).toBe('organizer');

    const orgChats = await request(app).get('/api/v1/organizer/chats').set('Authorization', `Bearer ${org}`);
    expect(orgChats.body.chats).toHaveLength(1);
  });

  it('customer sends a message and the organizer replies', async () => {
    const org = await approvedOrganizerToken();
    const { token } = await customerToken();
    const trip = await makeTrip(org);
    await makeBooking(token, trip.id);

    const sent = await request(app).post(`/api/v1/chats/${trip.id}/messages`).set('Authorization', `Bearer ${token}`).send({ text: 'What should I pack?' });
    expect(sent.status).toBe(201);
    expect(sent.body.chat.messages.some((m) => m.sender === 'user' && m.text === 'What should I pack?')).toBe(true);

    // Organizer receives an in-app notification with sender name
    const orgNotifs = await request(app).get('/api/v1/organizer/notifications').set('Authorization', `Bearer ${org}`);
    expect(orgNotifs.body.notifications.some((n) => /Message from Hiker/i.test(n.title))).toBe(true);

    const orgChats = await request(app).get('/api/v1/organizer/chats').set('Authorization', `Bearer ${org}`);
    const chatId = orgChats.body.chats[0].id;
    expect(orgChats.body.chats[0].userName).toBe('Hiker');

    const reply = await request(app).post(`/api/v1/organizer/chats/${chatId}/messages`).set('Authorization', `Bearer ${org}`).send({ text: 'Warm layers + boots.' });
    expect(reply.body.chat.messages.some((m) => m.sender === 'organizer' && m.text === 'Warm layers + boots.')).toBe(true);

    // Customer receives an in-app notification from organizer
    const custNotifs = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
    expect(custNotifs.body.notifications.some((n) => /Message from (Guides|Org)/i.test(n.title))).toBe(true);

    // Customer chats list includes organizer details
    const custChatsAfter = await request(app).get('/api/v1/chats').set('Authorization', `Bearer ${token}`);
    expect(custChatsAfter.body.chats[0].organizerName).toMatch(/Guides|Org/);
  });

  it("an organizer cannot post to another organizer's chat (403)", async () => {
    const orgA = await approvedOrganizerToken('a@example.com');
    const orgB = await approvedOrganizerToken('b@example.com');
    const { token } = await customerToken();
    const trip = await makeTrip(orgA);
    await makeBooking(token, trip.id);
    const orgChats = await request(app).get('/api/v1/organizer/chats').set('Authorization', `Bearer ${orgA}`);
    const chatId = orgChats.body.chats[0].id;
    const res = await request(app).post(`/api/v1/organizer/chats/${chatId}/messages`).set('Authorization', `Bearer ${orgB}`).send({ text: 'hi' });
    expect(res.status).toBe(403);
  });

  it('customer can fetch historical trip chat via GET /api/v1/chats/:tripId upon opening chat drawer', async () => {
    const org = await approvedOrganizerToken('host@example.com');
    const { token } = await customerToken('hiker-chat@example.com');
    const trip = await makeTrip(org);
    await makeBooking(token, trip.id);

    // Initial fetch without sending any message
    const initialFetch = await request(app).get(`/api/v1/chats/${trip.id}`).set('Authorization', `Bearer ${token}`);
    expect(initialFetch.status).toBe(200);
    expect(initialFetch.body.chat).toBeDefined();
    expect(initialFetch.body.chat.tripId).toBe(trip.id);
    expect(initialFetch.body.chat.messages.length).toBeGreaterThanOrEqual(1);
    expect(initialFetch.body.chat.messages[0].sender).toBe('organizer');

    // Send a message and re-fetch via GET to verify history persists and is returned automatically
    await request(app).post(`/api/v1/chats/${trip.id}/messages`).set('Authorization', `Bearer ${token}`).send({ text: 'Hello from hiker!' });

    const refetch = await request(app).get(`/api/v1/chats/${trip.id}`).set('Authorization', `Bearer ${token}`);
    expect(refetch.status).toBe(200);
    expect(refetch.body.chat.messages.some((m) => m.sender === 'user' && m.text === 'Hello from hiker!')).toBe(true);
    expect(refetch.body.chat.organizerName).toMatch(/Guides|Org/);
  });

  it('rejects GET /api/v1/chats/:tripId if trip does not exist (404)', async () => {
    const { token } = await customerToken('stranger@example.com');
    const res = await request(app).get('/api/v1/chats/nonexistent-trip-id').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('rejects GET /api/v1/chats/:tripId if unauthenticated (401)', async () => {
    const res = await request(app).get('/api/v1/chats/any-trip-id');
    expect(res.status).toBe(401);
  });
});
