import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Trip from '../../src/models/Trip.js';
import Trek from '../../src/models/Trek.js';
import Booking from '../../src/models/Booking.js';
import Departure from '../../src/models/Departure.js';
import { signToken } from '../../src/utils/jwt.js';
import { pauseExpiredTrips } from '../../src/services/tripExpiryService.js';
import { tripToday } from '../../src/utils/tripDate.js';

const app = createApp();
const api = '/api/v1';
let token;
const payload = (over = {}) => ({ trekId: 'expiry-trek', pricingTiers: [{ id: 'solo', label: 'Solo', price: 4500 }],
  pickup: { location: 'Dehradun', price: 4500 }, startPoint: { lat: 31, lng: 78, label: 'Base Camp' },
  departureDates: ['2026-10-14'], maxGroupSize: 12, availableSeats: 10,
  description: 'Keep my complete trip description', included: ['Meals and tents'],
  galleryImages: ['https://example.com/photo.jpg'], itinerary: [{ day: 1, title: 'Arrive', description: 'Meet the guide' }],
  status: 'Published', ...over });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-14T06:00:00Z'));
  const user = await User.create({ name: 'Expiry Guide', email: 'expiry@example.com', isOrganizer: true,
    organizer: { agencyName: 'Expiry Guides', isApproved: true, isPendingApproval: false } });
  token = signToken({ sub: user.id, role: 'organizer', email: user.email });
  await Trek.create({ _id: 'expiry-trek', title: 'Expiry Trek', location: 'Sankri', difficulty: 'Easy', durationDays: 3,
    distanceKm: 12, coverImage: 'https://example.com/photo.jpg' });
});
afterEach(() => vi.useRealTimers());
const create = (data = payload()) => request(app).post(`${api}/organizer/trips`).set('Authorization', `Bearer ${token}`).send(data);
const update = (id, data) => request(app).put(`${api}/organizer/trips/${id}`).set('Authorization', `Bearer ${token}`).send(data);

describe('Trip expiry and renewal', () => {
  it('expires after the last departure day ends in India, including cached catalog reads', async () => {
    const made = await create();
    expect(made.status).toBe(201);
    const id = made.body.trip.id;
    vi.setSystemTime(new Date('2026-10-14T18:29:00Z'));
    await pauseExpiredTrips({ force: true });
    expect(tripToday()).toBe('2026-10-14');
    expect((await request(app).get(`${api}/trips`)).body.trips).toHaveLength(1);
    expect((await request(app).get(`${api}/treks`)).body.treks[0].tripCount).toBe(1);
    expect((await request(app).get(`${api}/trips`)).headers['x-cache']).toBe('HIT');

    vi.setSystemTime(new Date('2026-10-14T18:30:00Z'));
    const expired = await request(app).get(`${api}/trips`);
    expect(expired.body.trips).toEqual([]);
    expect(expired.headers['x-cache']).toBe('MISS');
    const trip = await Trip.findById(id);
    expect(trip.status).toBe('Paused');
    expect(trip.autoPausedReason).toBe('departures_expired');
    expect(trip.description).toBe(payload().description);
    expect((await request(app).get(`${api}/treks/expiry-trek/offers`)).body.offers).toEqual([]);
    expect((await request(app).get(`${api}/trek-groups`)).body.groups).toEqual([]);
    expect((await request(app).get(`${api}/treks`)).body.treks[0].tripCount).toBe(0);
    const org = await request(app).get(`${api}/organizer/trips`).set('Authorization', `Bearer ${token}`);
    expect(org.body.trips[0].id).toBe(id);
    expect(org.body.trips[0].autoPausedReason).toBe('departures_expired');
  });

  it('keeps a mixed-date listing active while any departure is still upcoming', async () => {
    const made = await create(payload({ departureDates: ['2026-09-01', '2026-10-20'] }));
    await pauseExpiredTrips({ force: true });
    expect((await Trip.findById(made.body.trip.id)).status).toBe('Published');
  });

  it('renews the same expired listing with future dates, retaining details and booked history', async () => {
    const made = await create(payload({ departureDates: ['2026-10-01'] }));
    const id = made.body.trip.id;
    expect(made.body.trip.status).toBe('Paused');
    await Booking.create({ bookingId: 'TG-HISTORY', tripId: id, tripName: 'Expiry Trek', userEmail: 'traveller@example.com',
      organizerEmail: 'expiry@example.com', selectedDate: '2026-10-01', finalAmount: 4500, travelersCount: 1, status: 'Completed' });
    const oldBatch = await Departure.findOne({ tripId: id, date: '2026-10-01' });
    oldBatch.availableSeats = 9;
    await oldBatch.save();
    const body = payload({ departureDates: ['2026-11-01'] });
    delete body.status;
    const renewed = await update(id, body);
    expect(renewed.status).toBe(200);
    expect(renewed.body.trip).toMatchObject({ id, status: 'Published', autoPausedReason: '', autoPausedAt: null,
      description: payload().description, included: payload().included, itinerary: payload().itinerary, galleryImages: payload().galleryImages });
    expect(await Trip.countDocuments()).toBe(1);
    expect(await Booking.countDocuments({ bookingId: 'TG-HISTORY' })).toBe(1);
    expect((await Departure.findOne({ tripId: id, date: '2026-10-01' })).availableSeats).toBe(9);
    expect((await Departure.findOne({ tripId: id, date: '2026-11-01' })).availableSeats).toBe(10);
    expect((await request(app).get(`${api}/trips`)).body.trips.map((t) => t.id)).toContain(id);
  });

  it('keeps manual pauses and drafts private when dates are edited', async () => {
    const made = await create(payload({ status: 'Paused' }));
    // Create only accepts Draft/Published, so explicitly pause the listing.
    await Trip.updateOne({ _id: made.body.trip.id }, { $set: { status: 'Paused', autoPausedReason: '' } });
    const body = payload({ departureDates: ['2026-11-01'] });
    delete body.status;
    expect((await update(made.body.trip.id, body)).body.trip.status).toBe('Paused');
    await Trip.updateOne({ _id: made.body.trip.id }, { $set: { autoPausedReason: 'departures_expired' } });
    expect((await update(made.body.trip.id, { ...body, status: 'Draft' })).body.trip.status).toBe('Draft');
    expect((await request(app).get(`${api}/trips`)).body.trips).toEqual([]);
  });

  it('requires upcoming dates to manually publish an expired listing', async () => {
    const made = await create(payload({ departureDates: ['2026-10-01'] }));
    const res = await request(app).patch(`${api}/organizer/trips/${made.body.trip.id}/status`)
      .set('Authorization', `Bearer ${token}`).send({ status: 'Published' });
    expect(res.status).toBe(400);
    expect((await Trip.findById(made.body.trip.id)).status).toBe('Paused');
  });

  it('rejects invalid dates rather than leaving un-expirable listings', async () => {
    expect((await create(payload({ departureDates: ['2026-02-30'] }))).status).toBe(400);
  });
});
