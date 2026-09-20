import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Departure from '../../src/models/Departure.js';
import Trek from '../../src/models/Trek.js';
import { reserveSeats, releaseSeats } from '../../src/services/inventoryService.js';

const app = createApp();

let trekSeq = 0;
async function seedTrek() {
  const seq = trekSeq++;
  return Trek.create({
    _id: `inventory-trek-${Date.now()}-${seq}`,
    title: `Inventory Trek ${seq}`, location: 'Manali', difficulty: 'Easy', durationDays: 3, distanceKm: 10,
    coverImage: 'https://example.com/trek.jpg',
  });
}

const validTrip = (trekId, over = {}) => ({
  trekId,
  pricingTiers: [{ label: 'Solo', price: 500 }],
  pickup: { location: 'Manali', price: 50 },
  startPoint: { lat: 32.24, lng: 77.18, label: 'Base' },
  departureDates: ['2026-08-01', '2026-08-15', '2026-09-01'],
  maxGroupSize: 10,
  availableSeats: 5,
  category: 'Trekking',
  status: 'Published',
  ...over,
});

async function approvedOrganizerToken(email = 'org@example.com') {
  const reg = await request(app).post('/api/v1/auth/organizer/register').send({
    name: 'Org', email, password: 'pass1234', agencyName: 'Guides', socialMediaLink: 'https://instagram.com/test',
    govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  });
  await User.findByIdAndUpdate(reg.body.account.id, { 'organizer.isApproved': true, 'organizer.isPendingApproval': false });
  const login = await request(app).post('/api/v1/auth/organizer/login').send({ email, password: 'pass1234' });
  return login.body.token;
}

async function createTrip(token, over) {
  const trek = await seedTrek();
  const res = await request(app).post('/api/v1/organizer/trips').set('Authorization', `Bearer ${token}`).send(validTrip(trek._id, over));
  return res.body.trip;
}

describe('Departure provisioning', () => {
  it('creates one departure per departure date, seeded with the trip seat counts', async () => {
    const token = await approvedOrganizerToken();
    const trip = await createTrip(token);

    const res = await request(app).get(`/api/v1/trips/${trip.id}/departures`);
    expect(res.status).toBe(200);
    expect(res.body.departures).toHaveLength(3);
    const first = res.body.departures[0];
    expect(first.date).toBe('2026-08-01'); // sorted ascending
    expect(first.totalSeats).toBe(10); // maxGroupSize
    expect(first.availableSeats).toBe(5); // trip.availableSeats
    expect(first.soldOut).toBe(false);
  });

  it('re-provisions on update: adds new dates, drops removed (empty) dates', async () => {
    const token = await approvedOrganizerToken();
    const trip = await createTrip(token);
    await request(app)
      .put(`/api/v1/organizer/trips/${trip.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(validTrip(trip.trekId, { departureDates: ['2026-08-01', '2026-12-25'] })); // drop two, add one

    const res = await request(app).get(`/api/v1/trips/${trip.id}/departures`);
    const dates = res.body.departures.map((d) => d.date);
    expect(dates).toEqual(['2026-08-01', '2026-12-25']);
  });
});

describe('Seat reservation (atomic)', () => {
  it('decrements availableSeats on reserve', async () => {
    const token = await approvedOrganizerToken();
    const trip = await createTrip(token);
    const dep = await reserveSeats(trip.id, '2026-08-01', 2);
    expect(dep.availableSeats).toBe(3); // 5 - 2
  });

  it('refuses to reserve more than are available (no oversell)', async () => {
    const token = await approvedOrganizerToken();
    const trip = await createTrip(token);
    const dep = await reserveSeats(trip.id, '2026-08-01', 6); // only 5 available
    expect(dep).toBeNull();
    const check = await Departure.findOne({ tripId: trip.id, date: '2026-08-01' });
    expect(check.availableSeats).toBe(5); // untouched
  });

  it('concurrent reservations never oversell', async () => {
    const token = await approvedOrganizerToken();
    const trip = await createTrip(token); // 5 seats on each departure

    // Fire 10 concurrent single-seat reservations at a 5-seat departure.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => reserveSeats(trip.id, '2026-08-01', 1)),
    );
    const succeeded = results.filter((r) => r !== null).length;
    expect(succeeded).toBe(5); // exactly the 5 available

    const dep = await Departure.findOne({ tripId: trip.id, date: '2026-08-01' });
    expect(dep.availableSeats).toBe(0);
  });

  it('releaseSeats returns seats, capped at totalSeats', async () => {
    const token = await approvedOrganizerToken();
    const trip = await createTrip(token);
    await reserveSeats(trip.id, '2026-08-01', 3); // 5 -> 2
    const dep = await releaseSeats(trip.id, '2026-08-01', 2); // 2 -> 4
    expect(dep.availableSeats).toBe(4);

    // Over-release is capped at totalSeats (10).
    const capped = await releaseSeats(trip.id, '2026-08-01', 100);
    expect(capped.availableSeats).toBe(10);
  });
});
