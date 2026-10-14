import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Admin from '../../src/models/Admin.js';
import Trip from '../../src/models/Trip.js';
import Booking from '../../src/models/Booking.js';
import Chat from '../../src/models/Chat.js';
import Payout from '../../src/models/Payout.js';
import Notification from '../../src/models/Notification.js';
import Voucher from '../../src/models/Voucher.js';
import PromotionRequest from '../../src/models/PromotionRequest.js';
import TrekRequest from '../../src/models/TrekRequest.js';
import { signToken } from '../../src/utils/jwt.js';

const app = createApp();
const api = '/api/v1';
const details = { name: 'Same Phone Guide', email: 'reused@example.com', mobile: '9876543210',
  password: 'pass1234', agencyName: 'Fresh Guides', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' };
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

async function seed() {
  const admin = await Admin.create({ name: 'Admin', email: 'isolation-admin@example.com', passwordHash: 'unused' });
  const adminToken = signToken({ sub: admin.id, role: 'admin', email: admin.email });
  const reg = await request(app).post(`${api}/auth/organizer/register`).send(details);
  expect(reg.status).toBe(201);
  const user = await User.findById(reg.body.account.id);
  user.organizer.isApproved = true;
  user.organizer.isPendingApproval = false;
  user.fcmToken = 'old-device';
  user.fcmTokens = ['old-device'];
  await user.save();
  await Trip.create({ _id: 'old-trip', trekId: 'old-trek', organizerEmail: details.email,
    name: 'Old Trek', location: 'Sankri', status: 'Published' });
  const booking = await Booking.create({ bookingId: 'TG-OLD', tripId: 'old-trip', tripName: 'Old Trek',
    userEmail: 'traveller@example.com', userName: 'Traveller', organizerEmail: details.email,
    selectedDate: '2030-12-01', finalAmount: 1000, organizerPayout: 900, travelersCount: 1, status: 'Upcoming' });
  const chat = await Chat.create({ tripId: 'old-trip', userEmail: 'traveller@example.com', organizerEmail: details.email,
    messages: [{ sender: 'user', text: 'Private old conversation' }] });
  await Payout.create({ organizerEmail: details.email, amount: 200, status: 'Paid' });
  await Notification.create({ ownerType: 'organizer', ownerKey: details.email, title: 'Private old notification' });
  await Notification.create({ ownerType: 'customer', ownerKey: details.email, title: 'Keep my traveller notification' });
  await Voucher.create({ ownerType: 'organizer', ownerKey: details.email, milestoneNumber: 1 });
  await PromotionRequest.create({ _id: 'old-promo', organizerEmail: details.email });
  await TrekRequest.create({ _id: 'old-proposal', requestedByEmail: details.email, title: 'Proposal', location: 'Sankri',
    difficulty: 'Easy', durationDays: 2, distanceKm: 10, coverImage: 'https://example.com/a.jpg' });
  return { user, adminToken, oldToken: reg.body.token, booking, chat };
}

async function assertFreshAccount(token) {
  for (const [path, field] of [['trips', 'trips'], ['bookings', 'bookings'], ['chats', 'chats'],
    ['payouts', 'payouts'], ['notifications', 'notifications'], ['promotion-requests', 'requests'], ['trek-requests', 'requests']]) {
    const res = await request(app).get(`${api}/organizer/${path}`).set(bearer(token));
    expect(res.status, path).toBe(200);
    expect(res.body[field], path).toEqual([]);
  }
  const financials = await request(app).get(`${api}/organizer/financials`).set(bearer(token));
  expect(financials.body.financials.available).toBe(0);
}

describe('Organizer account lifecycle isolation', () => {
  it('does not create an ambiguous phone login for a different email', async () => {
    const { user, adminToken } = await seed();
    await request(app).delete(`${api}/admin/organizers/${user.id}`).set(bearer(adminToken)).expect(200);
    const reg = await request(app).post(`${api}/auth/organizer/register`).send({ ...details, email: 'different@example.com' });
    expect(reg.status).toBe(409);
    expect(await User.countDocuments({ mobile: details.mobile })).toBe(1);
  });

  it('uses the current account email rather than a stale email claim in a valid token', async () => {
    const { user } = await seed();
    const token = signToken({ sub: user.id, role: 'customer', email: 'traveller@example.com' });
    const res = await request(app).get(`${api}/bookings`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.bookings).toEqual([]);
  });

  it.each(['organizer', 'user'])('reusing email and phone after deleting the %s cannot inherit private records or tokens', async (kind) => {
    const { user, adminToken, oldToken, booking, chat } = await seed();
    const removed = await request(app).delete(`${api}/admin/${kind === 'organizer' ? 'organizers' : 'users'}/${user.id}`).set(bearer(adminToken));
    expect(removed.status).toBe(200);
    const reg = await request(app).post(`${api}/auth/organizer/register`).send(details);
    expect(reg.status).toBe(201);
    expect((await User.findById(reg.body.account.id)).fcmTokens).toEqual([]);
    await request(app).patch(`${api}/admin/organizers/${reg.body.account.id}/status`).set(bearer(adminToken)).send({ action: 'approve' }).expect(200);
    await assertFreshAccount(reg.body.token);
    await request(app).get(`${api}/organizer/trips`).set(bearer(oldToken)).expect(401);
    await request(app).put(`${api}/organizer/trips/old-trip`).set(bearer(reg.body.token)).send({}).expect(403);
    await request(app).post(`${api}/organizer/chats/${chat.id}/messages`).set(bearer(reg.body.token)).send({ text: 'Access old chat' }).expect(403);
    const archivedBooking = await Booking.findById(booking.id);
    expect(archivedBooking.organizerEmail).not.toBe(details.email);
    expect(archivedBooking.archivedOrganizer.email).toBe(details.email);
    expect((await Trip.findById('old-trip')).status).toBe('Draft');
    expect(await Payout.countDocuments()).toBe(1);
    expect(await Chat.countDocuments()).toBe(1);
    expect(await Voucher.findOne({ ownerType: 'organizer', ownerKey: details.email })).toBeNull();
    if (kind === 'organizer') expect(await Notification.countDocuments({ ownerType: 'customer', ownerKey: details.email })).toBe(1);
  });

  it('finishes a partially failed retirement before allowing re-registration', async () => {
    const { user, adminToken } = await seed();
    const failure = vi.spyOn(Chat, 'updateMany').mockRejectedValueOnce(new Error('temporary write failure'));
    const removed = await request(app).delete(`${api}/admin/organizers/${user.id}`).set(bearer(adminToken));
    expect(removed.status).toBe(500);
    failure.mockRestore();
    expect((await User.findById(user.id)).organizerRetirementKey).toBeTruthy();
    const reg = await request(app).post(`${api}/auth/organizer/register`).send(details);
    expect(reg.status).toBe(201);
    expect((await User.findById(user.id)).organizerRetirementKey).toBeUndefined();
    await request(app).patch(`${api}/admin/organizers/${user.id}/status`).set(bearer(adminToken)).send({ action: 'approve' }).expect(200);
    await assertFreshAccount(reg.body.token);
  });
});
