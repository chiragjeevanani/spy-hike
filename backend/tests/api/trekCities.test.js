import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Trek from '../../src/models/Trek.js';
import Trip from '../../src/models/Trip.js';
import { cacheInvalidate } from '../../src/lib/cache.js';

const app = createApp();
const api = '/api/v1';

// The customer app builds its city picker from this endpoint instead of a
// hardcoded list, so the contract that matters is: every city returned here is
// one /trek-groups?city=… can actually answer.

let seq = 0;
async function seedTrip(over = {}) {
  const id = `tc-${Date.now()}-${seq++}`;
  const trekId = over.trekId || `trek-${id}`;
  if (!(await Trek.exists({ _id: trekId }))) {
    await Trek.create({
      _id: trekId,
      title: over.name || 'City Trek',
      location: over.location || 'Manali, Himachal Pradesh',
      state: over.state ?? 'Himachal Pradesh',
      city: over.city ?? 'Manali',
      difficulty: 'Easy',
      durationDays: 3,
      distanceKm: 10,
      coverImage: 'https://example.com/t.jpg',
    });
  }
  return Trip.create({
    _id: id,
    trekId,
    organizerEmail: over.organizerEmail || `org-${id}@x.com`,
    organizer: { name: 'Org', rating: 4.5, verified: true },
    name: over.name || 'City Trek',
    location: over.location || 'Manali, Himachal Pradesh',
    state: over.state ?? 'Himachal Pradesh',
    city: over.city ?? 'Manali',
    price: 1000,
    pricingTiers: [{ id: 'solo', label: 'Solo', price: 1000 }],
    pickup: { location: 'Manali', price: 1000 },
    departureDates: ['2026-09-01'],
    difficulty: 'Easy',
    durationDays: 3,
    distanceKm: 10,
    availableSeats: 10,
    maxGroupSize: 15,
    category: 'Trekking',
    coverImage: 'https://example.com/t.jpg',
    status: over.status || 'Published',
    startPoint: over.startPoint || { lat: 32.24, lng: 77.18, label: 'Base' },
  });
}

const cities = async () => {
  const res = await request(app).get(`${api}/trek-cities`);
  expect(res.status).toBe(200);
  return res.body.cities;
};
const find = (list, name) => list.find((c) => c.city.toLowerCase() === name.toLowerCase());

describe('GET /trek-cities', () => {
  beforeEach(async () => {
    await Trip.deleteMany({});
    await Trek.deleteMany({});
  });

  it('counts distinct treks per city, not offers', async () => {
    await seedTrip({ trekId: 'city-a', city: 'Bengaluru', state: 'Karnataka', organizerEmail: 'a@x.com' });
    await seedTrip({ trekId: 'city-a', city: 'Bengaluru', state: 'Karnataka', organizerEmail: 'b@x.com' });
    await seedTrip({ trekId: 'city-b', city: 'Bengaluru', state: 'Karnataka' });

    const blr = find(await cities(), 'Bengaluru');
    expect(blr.trekCount).toBe(2);
    expect(blr.bookable).toBe(true);
    expect(blr.label).toBe('Bengaluru, Karnataka');
  });

  it('falls back to the location string when the city field is blank', async () => {
    await seedTrip({ city: '', state: '', location: 'Dharamshala, Himachal Pradesh' });

    const found = find(await cities(), 'Dharamshala');
    expect(found).toBeTruthy();
    expect(found.state).toBe('Himachal Pradesh');

    // The point of the fallback: the derived city is one the browse filter can
    // actually answer, because it came out of a field that filter searches.
    const groups = await request(app).get(`${api}/trek-groups?city=Dharamshala`);
    expect(groups.body.groups).toHaveLength(1);
  });

  it('folds case variants of one city into a single capitalised entry', async () => {
    await seedTrip({ trekId: 'case-a', city: 'pune', state: 'Maharashtra' });
    await seedTrip({ trekId: 'case-b', city: 'Pune', state: 'Maharashtra' });

    const list = await cities();
    const punes = list.filter((c) => c.city.toLowerCase() === 'pune');
    expect(punes).toHaveLength(1);
    expect(punes[0].city).toBe('Pune');
    expect(punes[0].trekCount).toBe(2);
  });

  it('includes a catalog trek with no published offer, flagged as not bookable', async () => {
    await Trek.create({
      _id: 'coming-soon-trek',
      title: 'Coming Soon Trek',
      location: 'Sankri, Uttarakhand',
      state: 'Uttarakhand',
      city: 'Dehradun',
      difficulty: 'Easy',
      durationDays: 3,
      distanceKm: 10,
      coverImage: 'https://example.com/t.jpg',
    });

    const ddn = find(await cities(), 'Dehradun');
    expect(ddn).toBeTruthy();
    expect(ddn.bookable).toBe(false);
    expect(ddn.trekCount).toBe(1);
  });

  it('an unpublished offer never makes a city bookable', async () => {
    await seedTrip({ city: 'Draftsville', state: 'Nowhere', status: 'Draft' });

    // The catalog trek behind the draft is still listed, so the city shows —
    // as coming soon, never as somewhere with treks to book.
    expect(find(await cities(), 'Draftsville').bookable).toBe(false);

    // Deactivate that trek too and the city drops out altogether. (The list is
    // cached like the rest of the catalog, so a write has to clear it — the
    // customer app tolerates that couple of minutes of lag.)
    await Trek.updateMany({ city: 'Draftsville' }, { $set: { status: 'Inactive' } });
    await cacheInvalidate('trips');
    expect(find(await cities(), 'Draftsville')).toBeUndefined();
  });

  it('carries a representative coordinate so a GPS fix can snap to a covered city', async () => {
    await seedTrip({ city: 'Pune', state: 'Maharashtra', startPoint: { lat: 18.52, lng: 73.85, label: 'Pune Base' } });

    const pune = find(await cities(), 'Pune');
    expect(pune.lat).toBeCloseTo(18.52);
    expect(pune.lng).toBeCloseTo(73.85);
  });

  it('orders bookable cities first, busiest before quieter ones', async () => {
    await seedTrip({ trekId: 'busy-1', city: 'Bengaluru', state: 'Karnataka' });
    await seedTrip({ trekId: 'busy-2', city: 'Bengaluru', state: 'Karnataka' });
    await seedTrip({ trekId: 'quiet-1', city: 'Pune', state: 'Maharashtra' });
    await Trek.create({
      _id: 'soon-trek', title: 'Soon', location: 'Sankri, Uttarakhand',
      state: 'Uttarakhand', city: 'Dehradun', difficulty: 'Easy',
      durationDays: 3, distanceKm: 10, coverImage: 'https://example.com/t.jpg',
    });

    const list = await cities();
    expect(list.map((c) => c.city)).toEqual(['Bengaluru', 'Pune', 'Dehradun']);
  });
});
