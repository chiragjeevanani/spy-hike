import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('GET /api/v1/reverse-geocode', () => {
  it('returns 400 when lat or lng is missing or non-numeric', async () => {
    const res1 = await request(app).get('/api/v1/reverse-geocode');
    expect(res1.status).toBe(400);

    const res2 = await request(app).get('/api/v1/reverse-geocode?lat=abc&lng=77.1');
    expect(res2.status).toBe(400);
  });

  it('reverse geocodes coordinates and returns a location payload', async () => {
    // Coordinates for Manali, Himachal Pradesh (32.2432, 77.1892)
    const res = await request(app).get('/api/v1/reverse-geocode?lat=32.2432&lng=77.1892');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('city');
    expect(res.body).toHaveProperty('state');
    expect(res.body).toHaveProperty('formattedAddress');
    expect(res.body).toHaveProperty('provider');
  });
});

describe('GET /api/v1/place-search', () => {
  it('returns 400 for a missing or too-short query', async () => {
    expect((await request(app).get('/api/v1/place-search')).status).toBe(400);
    expect((await request(app).get('/api/v1/place-search?q=a')).status).toBe(400);
  });

  it('returns a list of candidate places with coordinates', async () => {
    const res = await request(app).get('/api/v1/place-search?q=Sankri');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body).toHaveProperty('provider');
    for (const r of res.body.results) {
      expect(r).toEqual(expect.objectContaining({ name: expect.any(String), lat: expect.any(Number), lng: expect.any(Number) }));
    }
  });
});
