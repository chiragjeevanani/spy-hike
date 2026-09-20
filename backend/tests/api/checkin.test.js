import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Trek from '../../src/models/Trek.js';

const app = createApp();

async function customerToken(email = 'hiker@example.com') {
  const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Hiker', email, password: 'pass1234' });
  return reg.body.token;
}
async function approvedOrganizerToken(email = 'org@example.com') {
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({ name: 'Org', email, password: 'pass1234', agencyName: 'Guides', socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
  await User.findByIdAndUpdate(reg.body.account.id, { 'organizer.isApproved': true, 'organizer.isPendingApproval': false });
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email, password: 'pass1234' });
  return login.body.token;
}
let trekSeq = 0;
async function makeTrip(orgToken) {
  const seq = trekSeq++;
  const trek = await Trek.create({
    _id: `checkin-trek-${Date.now()}-${seq}`,
    title: `Checkin Trek ${seq}`, location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${orgToken}`).send({
    trekId: trek._id,
    pricingTiers: [{ label: 'Solo', price: 500 }],
    pickup: { location: 'Manali', price: 0 },
    startPoint: { lat: 32.2, lng: 77.1, label: 'Base' },
    departureDates: ['2026-08-01'], maxGroupSize: 10, availableSeats: 10,
    category: 'Trekking', status: 'Published',
  });
  return res.body.trip;
}
async function makeBooking(custToken, tripId) {
  const res = await request(app).post('/api/v1/bookings').set('Authorization', `Bearer ${custToken}`).send({
    tripId, selectedDate: '2026-08-01', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Traveler One', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
  });
  return res.body.booking;
}
const checkin = (orgToken, bookingId) =>
  request(app).post(`/api/v1/organizer/bookings/${bookingId}/checkin`).set('Authorization', `Bearer ${orgToken}`);

describe('Booking check-in', () => {
  it('checks a valid ticket in and stamps checkedInAt/checkedInBy', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const booking = await makeBooking(cust, trip.id);

    const res = await checkin(org, booking.bookingId);
    expect(res.status).toBe(200);
    expect(res.body.alreadyCheckedIn).toBe(false);
    expect(res.body.booking.checkedInAt).toBeTruthy();
    expect(res.body.booking.checkedInBy).toBe('org@example.com');
  });

  it('is idempotent — a second scan reports alreadyCheckedIn without erroring', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const booking = await makeBooking(cust, trip.id);

    const first = await checkin(org, booking.bookingId);
    const second = await checkin(org, booking.bookingId);
    expect(second.status).toBe(200);
    expect(second.body.alreadyCheckedIn).toBe(true);
    // Same timestamp as the first check-in (not re-stamped).
    expect(second.body.booking.checkedInAt).toBe(first.body.booking.checkedInAt);
  });

  it("refuses to check in another organizer's ticket (403)", async () => {
    const orgA = await approvedOrganizerToken('a@example.com');
    const orgB = await approvedOrganizerToken('b@example.com');
    const cust = await customerToken();
    const trip = await makeTrip(orgA);
    const booking = await makeBooking(cust, trip.id);

    const res = await checkin(orgB, booking.bookingId);
    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown ticket code', async () => {
    const org = await approvedOrganizerToken();
    const res = await checkin(org, 'TG-0000-Z');
    expect(res.status).toBe(404);
  });

  it('refuses to check in a cancelled booking (400)', async () => {
    const org = await approvedOrganizerToken();
    const cust = await customerToken();
    const trip = await makeTrip(org);
    const booking = await makeBooking(cust, trip.id);

    // Cancel via the model directly (admin cancel is covered elsewhere).
    const Booking = (await import('../../src/models/Booking.js')).default;
    await Booking.updateOne({ bookingId: booking.bookingId }, { status: 'Cancelled' });

    const res = await checkin(org, booking.bookingId);
    expect(res.status).toBe(400);
  });

  it('a pending (unapproved) organizer cannot check in tickets (403)', async () => {
    const reg = await request(app).post('/api/v1/auth/organizer/register').send({ name: 'P', email: 'p@example.com', password: 'pass1234', agencyName: 'New', socialMediaLink: 'https://instagram.com/test', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
    const res = await request(app).post('/api/v1/organizer/bookings/TG-1234-A/checkin').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(403);
  });
});
