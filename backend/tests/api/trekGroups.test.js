import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Trek from '../../src/models/Trek.js';
import Trip from '../../src/models/Trip.js';

const app = createApp();
const api = '/api/v1';

let seq = 0;
async function seedTrip(over = {}) {
  const id = `tg-${Date.now()}-${seq++}`;
  const trekId = over.trekId || `trek-${id}`;
  if (!(await Trek.exists({ _id: trekId }))) {
    await Trek.create({
      _id: trekId, title: over.name || 'Group Trek', location: 'Manali, Himachal Pradesh',
      difficulty: 'Easy', durationDays: 3, distanceKm: 10, coverImage: 'https://example.com/t.jpg',
    });
  }
  return Trip.create({
    _id: id,
    trekId,
    organizerEmail: over.organizerEmail || `org-${id}@x.com`,
    organizer: { name: over.organizerName || 'Org', rating: 4.5, verified: true },
    name: over.name || 'Group Trek',
    location: over.location || 'Manali, Himachal Pradesh',
    state: over.state || 'Himachal Pradesh',
    city: over.city || 'Manali',
    price: over.price ?? 1000,
    pricingTiers: [{ id: 'solo', label: 'Solo', price: over.price ?? 1000 }],
    pickup: { location: over.pickupCity || 'Manali', price: over.price ?? 1000 },
    departureDates: over.departureDates || ['2026-09-01'],
    difficulty: over.difficulty || 'Easy',
    durationDays: over.durationDays ?? 3,
    distanceKm: 10,
    availableSeats: over.availableSeats ?? 10,
    maxGroupSize: 15,
    category: over.category || 'Trekking',
    coverImage: 'https://example.com/t.jpg',
    status: 'Published',
    rating: over.rating ?? 4,
    reviewsCount: over.reviewsCount ?? 5,
    startPoint: { lat: 1, lng: 1, label: over.startLabel || 'Base' },
    ...(over.extra || {}),
  });
}

const get = (qs = '') => request(app).get(`${api}/trek-groups${qs}`);

describe('GET /trek-groups', () => {
  it('collapses every organizer offering one trek into a single entry', async () => {
    await seedTrip({ trekId: 'shared-trek', name: 'Shared Trek', price: 1500, rating: 3, organizerEmail: 'a@x.com' });
    await seedTrip({ trekId: 'shared-trek', name: 'Shared Trek', price: 900, rating: 5, organizerEmail: 'b@x.com' });
    await seedTrip({ trekId: 'shared-trek', name: 'Shared Trek', price: 1200, rating: 4, organizerEmail: 'c@x.com' });

    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(1);

    const g = res.body.groups[0];
    expect(g.trekName).toBe('Shared Trek');
    expect(g.organizerCount).toBe(3);
    expect(g.minPrice).toBe(900);
    expect(g.maxPrice).toBe(1500);
    // The highest-rated offer represents the card.
    expect(g.representative.rating).toBe(5);
  });

  it('returns only card fields on the representative, never detail payloads', async () => {
    await seedTrip({ extra: { itinerary: [{ day: 1, title: 'x' }], faqs: [{ question: 'q', answer: 'a' }], description: 'long text' } });

    const { representative } = (await get()).body.groups[0];
    for (const field of ['itinerary', 'faqs', 'reviews', 'galleryImages', 'description', 'included']) {
      expect(representative[field]).toBeUndefined();
    }
    expect(representative.id).toBeDefined();
    expect(representative.coverImage).toBeDefined();
    expect(representative.organizer).toBeDefined();
  });

  it('pages with hasMore rather than a count pass', async () => {
    for (let i = 0; i < 5; i += 1) await seedTrip({ trekId: `page-trek-${i}`, name: `Page Trek ${i}` });

    const first = await get('?limit=2&page=1');
    expect(first.body.groups).toHaveLength(2);
    expect(first.body.hasMore).toBe(true);

    const last = await get('?limit=2&page=3');
    expect(last.body.groups).toHaveLength(1);
    expect(last.body.hasMore).toBe(false);
  });

  it('filters by difficulty, category and minimum seats', async () => {
    await seedTrip({ trekId: 'easy-trek', name: 'Easy Trek', difficulty: 'Easy', availableSeats: 2 });
    await seedTrip({ trekId: 'hard-trek', name: 'Hard Trek', difficulty: 'Difficult', availableSeats: 20, category: 'Camping' });

    expect((await get('?difficulty=Difficult')).body.groups.map((g) => g.trekName)).toEqual(['Hard Trek']);
    expect((await get('?category=Camping')).body.groups.map((g) => g.trekName)).toEqual(['Hard Trek']);
    expect((await get('?minSeats=10')).body.groups.map((g) => g.trekName)).toEqual(['Hard Trek']);
  });

  it('filters on the cheapest offer, not the representative', async () => {
    // The top-rated offer costs 5000, but a cheaper organizer offers 800 — a
    // "under 1000" search must still surface this trek.
    await seedTrip({ trekId: 'budget-trek', name: 'Budget Trek', price: 5000, rating: 5 });
    await seedTrip({ trekId: 'budget-trek', name: 'Budget Trek', price: 800, rating: 2, organizerEmail: 'cheap@x.com' });

    const res = await get('?maxPrice=1000');
    expect(res.body.groups.map((g) => g.trekName)).toContain('Budget Trek');
    expect(res.body.groups[0].minPrice).toBe(800);
  });

  it('keeps a trek when any organizer departs on the requested date', async () => {
    await seedTrip({ trekId: 'date-trek', name: 'Date Trek', departureDates: ['2026-10-05'] });
    await seedTrip({ trekId: 'other-trek', name: 'Other Trek', departureDates: ['2026-11-20'] });

    const res = await get('?date=2026-10-05');
    expect(res.body.groups.map((g) => g.trekName)).toEqual(['Date Trek']);
  });

  it('matches a search across name, location and pickup city', async () => {
    await seedTrip({ trekId: 'kasol-trek', name: 'Kasol Ridge', city: 'Kasol', pickupCity: 'Bhuntar' });
    await seedTrip({ trekId: 'coorg-trek', name: 'Coorg Walk', city: 'Coorg', state: 'Karnataka', location: 'Coorg, Karnataka', pickupCity: 'Mysore' });

    expect((await get('?search=kasol')).body.groups.map((g) => g.trekName)).toEqual(['Kasol Ridge']);
    expect((await get('?search=karnataka')).body.groups.map((g) => g.trekName)).toEqual(['Coorg Walk']);
    expect((await get('?search=bhuntar')).body.groups.map((g) => g.trekName)).toEqual(['Kasol Ridge']);
  });

  it('sorts by price in both directions', async () => {
    await seedTrip({ trekId: 'cheap', name: 'Cheap', price: 100 });
    await seedTrip({ trekId: 'dear', name: 'Dear', price: 9000 });

    expect((await get('?sort=PriceLowToHigh')).body.groups.map((g) => g.trekName)).toEqual(['Cheap', 'Dear']);
    expect((await get('?sort=PriceHighToLow')).body.groups.map((g) => g.trekName)).toEqual(['Dear', 'Cheap']);
  });

  it('excludes unpublished trips', async () => {
    await seedTrip({ trekId: 'draft-trek', name: 'Draft Trek', extra: { status: 'Draft' } });
    const res = await get();
    expect(res.body.groups.map((g) => g.trekName)).not.toContain('Draft Trek');
  });

  it('survives regex-special characters in a search', async () => {
    await seedTrip({ trekId: 'plus-trek', name: 'C++ Trek' });
    const res = await get('?search=' + encodeURIComponent('C++'));
    expect(res.status).toBe(200);
    expect(res.body.groups.map((g) => g.trekName)).toEqual(['C++ Trek']);
  });
});

describe('GET /pickup-cities', () => {
  it('lists distinct boarding cities across published trips only', async () => {
    await seedTrip({ trekId: 'pc-1', name: 'PC One', pickupCity: 'Manali' });
    await seedTrip({ trekId: 'pc-2', name: 'PC Two', pickupCity: 'Rishikesh' });
    await seedTrip({ trekId: 'pc-3', name: 'PC Three', pickupCity: 'Manali' });
    await seedTrip({ trekId: 'pc-4', name: 'PC Four', pickupCity: 'Hidden', extra: { status: 'Draft' } });

    const res = await request(app).get(`${api}/pickup-cities`);
    expect(res.status).toBe(200);
    expect(res.body.cities).toEqual(['Manali', 'Rishikesh']);
  });

  it('folds case variants of one city into a single label', async () => {
    // Organizers type this freehand; the live data really does contain both
    // "Manali" and "manali".
    await seedTrip({ trekId: 'case-1', name: 'Case One', pickupCity: 'Manali' });
    await seedTrip({ trekId: 'case-2', name: 'Case Two', pickupCity: 'manali' });
    await seedTrip({ trekId: 'case-3', name: 'Case Three', pickupCity: 'sankari' });

    const res = await request(app).get(`${api}/pickup-cities`);
    expect(res.body.cities).toEqual(['Manali', 'Sankari']);
  });

  it('matches a pickup city regardless of how it was capitalised', async () => {
    await seedTrip({ trekId: 'pk-upper', name: 'Upper Trek', pickupCity: 'Manali' });
    await seedTrip({ trekId: 'pk-lower', name: 'Lower Trek', pickupCity: 'manali' });
    await seedTrip({ trekId: 'pk-other', name: 'Other Trek', pickupCity: 'Rishikesh' });

    const res = await get('?pickupCity=Manali');
    const names = res.body.groups.map((g) => g.trekName).sort();
    expect(names).toEqual(['Lower Trek', 'Upper Trek']);
  });
});
