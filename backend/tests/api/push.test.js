import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Trek from '../../src/models/Trek.js';
import Notification from '../../src/models/Notification.js';
import { pushProvider } from '../../src/services/fcmService.js';

const app = createApp();
const api = '/api/v1';

// ─── FCM double ──────────────────────────────────────────────────────────────
// pushProvider is the single object every push goes through, so swapping its
// send here intercepts the only call that would reach Firebase.
const realProvider = { ...pushProvider };
let sends = [];
let deadTokensToReport = [];

beforeEach(() => {
  sends = [];
  deadTokensToReport = [];
  pushProvider.sendToTokens = async (tokens, title, body, data) => {
    sends.push({ tokens, title, body, data });
    return { sent: tokens.length, failed: 0, deadTokens: deadTokensToReport };
  };
});
afterEach(() => { Object.assign(pushProvider, realProvider); });

// Pushes are fired without being awaited (a booking must not wait on FCM), so
// tests wait for the delivery rather than assuming it has already happened.
async function waitForSends(count, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (sends.length < count && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25));
  }
  return sends;
}

const sendTo = (token) => sends.find((s) => s.tokens.includes(token));

// ─── Fixtures ────────────────────────────────────────────────────────────────
let trekSeq = 0;
const DEPARTURE = '2027-09-01';
const TRAVELER = { name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' };

async function customerToken(email = 'pushcust@example.com') {
  const reg = await request(app).post(`${api}/auth/register`).send({ name: 'Cust', email, password: 'pass1234' });
  return reg.body.token;
}

async function approvedOrganizerToken(email = 'pushorg@example.com') {
  const reg = await request(app).post(`${api}/auth/organizer/register`).send({
    name: 'Org', email, password: 'pass1234', agencyName: 'Guides',
    socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  });
  await User.findByIdAndUpdate(reg.body.account.id, {
    'organizer.isApproved': true, 'organizer.isPendingApproval': false,
  });
  const login = await request(app).post(`${api}/auth/organizer/login`).send({ email, password: 'pass1234' });
  return login.body.token;
}

const registerDevice = (token, fcmToken) =>
  request(app).post(`${api}/auth/fcm-token`).set('Authorization', `Bearer ${token}`).send({ fcmToken });

async function makeTrip(orgToken) {
  const trek = await Trek.create({
    _id: `push-trek-${Date.now()}-${trekSeq++}`,
    title: 'Push Trek', location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(app).post(`${api}/organizer/trips`).set('Authorization', `Bearer ${orgToken}`).send({
    trekId: trek._id,
    pricingTiers: [{ label: 'Solo', price: 1000 }],
    pickup: { location: 'Manali', price: 100 },
    startPoint: { lat: 32.24, lng: 77.18, label: 'Base' },
    departureDates: [DEPARTURE],
    maxGroupSize: 10, availableSeats: 5, category: 'Trekking', status: 'Published',
  });
  return res.body.trip;
}

const book = (token, trip) => request(app).post(`${api}/bookings`).set('Authorization', `Bearer ${token}`).send({
  tripId: trip.id, selectedDate: DEPARTURE,
  selections: [{ label: 'Solo', count: 1 }], travelers: [TRAVELER],
});

describe('Device registration', () => {
  it('keeps every device an account signs in from, newest first', async () => {
    const token = await customerToken();
    await registerDevice(token, 'phone-token');
    await registerDevice(token, 'laptop-token');

    const user = await User.findOne({ email: 'pushcust@example.com' });
    expect(user.fcmTokens).toEqual(['laptop-token', 'phone-token']);
    expect(user.fcmToken).toBe('laptop-token'); // legacy field tracks the newest
  });

  it('does not duplicate a device that re-registers the same token', async () => {
    const token = await customerToken();
    await registerDevice(token, 'phone-token');
    await registerDevice(token, 'phone-token');

    const user = await User.findOne({ email: 'pushcust@example.com' });
    expect(user.fcmTokens).toEqual(['phone-token']);
  });
});

describe('A booking pushes to the organizer', () => {
  it('sends a push as well as the in-app notification when a hiker books', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    await registerDevice(org, 'org-phone');
    const trip = await makeTrip(org);

    const res = await book(cust, trip);
    expect(res.status).toBe(201);

    await waitForSends(1);
    const push = sendTo('org-phone');
    expect(push).toBeTruthy();
    expect(push.title).toContain('New Booking');
    expect(push.body).toContain(trip.name || 'Push Trek');
    expect(push.body).toContain(DEPARTURE);
    expect(push.data).toMatchObject({ ownerType: 'organizer', type: 'Booking' });

    // The in-app notification the organizer already received still exists.
    expect(await Notification.countDocuments({ ownerType: 'organizer' })).toBe(1);
  });

  it('reaches every device the organizer is signed in on', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    await registerDevice(org, 'org-phone');
    await registerDevice(org, 'org-laptop');
    const trip = await makeTrip(org);

    await book(cust, trip);
    await waitForSends(1);

    const push = sendTo('org-phone');
    expect(push.tokens).toEqual(expect.arrayContaining(['org-phone', 'org-laptop']));
  });

  it('pushes the confirmation to the hiker too', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    await registerDevice(cust, 'cust-phone');
    const trip = await makeTrip(org);

    await book(cust, trip);
    await waitForSends(1);

    expect(sendTo('cust-phone')).toBeTruthy();
  });

  it('still completes the booking when the push fails', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    await registerDevice(org, 'org-phone');
    const trip = await makeTrip(org);

    pushProvider.sendToTokens = async () => { throw new Error('FCM unavailable'); };

    const res = await book(cust, trip);
    expect(res.status).toBe(201);
    expect(await Notification.countDocuments({ ownerType: 'organizer' })).toBe(1);
  });

  it('drops device tokens Firebase reports as dead', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    await registerDevice(org, 'org-old');
    await registerDevice(org, 'org-current');
    const trip = await makeTrip(org);

    deadTokensToReport = ['org-old'];
    await book(cust, trip);
    await waitForSends(1);

    // The prune runs after the send resolves.
    const deadline = Date.now() + 3000;
    let user;
    do {
      user = await User.findOne({ email: 'pushorg@example.com' });
      if (!user.fcmTokens.includes('org-old')) break;
      await new Promise((r) => setTimeout(r, 25));
    } while (Date.now() < deadline);

    expect(user.fcmTokens).toEqual(['org-current']);
  });

  it('respects an account that switched booking push off', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    await registerDevice(org, 'org-phone');
    await User.updateOne({ email: 'pushorg@example.com' }, { $set: { notificationBookings: false } });
    const trip = await makeTrip(org);

    await book(cust, trip);
    await new Promise((r) => setTimeout(r, 300));

    expect(sendTo('org-phone')).toBeUndefined();
    // …but the in-app notification is still delivered.
    expect(await Notification.countDocuments({ ownerType: 'organizer' })).toBe(1);
  });

  it('still pushes a booking to someone who only switched general updates off', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    await registerDevice(org, 'org-phone');
    // Bookings and Updates are separate switches: turning off Updates must not
    // silence the notification that someone booked this organizer's trek.
    await User.updateOne({ email: 'pushorg@example.com' }, { $set: { notificationUpdates: false } });
    const trip = await makeTrip(org);

    await book(cust, trip);
    await waitForSends(1);

    expect(sendTo('org-phone')).toBeTruthy();
  });
});
