import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Trek from '../../src/models/Trek.js';
import { cacheGet, cacheSet, cacheInvalidate, closeCache } from '../../src/lib/cache.js';
import { hashPassword } from '../../src/utils/password.js';
import Admin from '../../src/models/Admin.js';

const app = createApp();
const api = '/api/v1';

async function adminToken() {
  await Admin.create({ name: 'Admin', email: 'cache-admin@findyourtrek.com', passwordHash: await hashPassword('admin123') });
  const res = await request(app).post(`${api}/auth/admin/login`).send({ email: 'cache-admin@findyourtrek.com', password: 'admin123' });
  return res.body.token;
}

const trekPayload = (over = {}) => ({
  title: 'Cache Trek', location: 'Manali, Himachal Pradesh', difficulty: 'Easy',
  durationDays: 2, distanceKm: 8, coverImage: 'https://example.com/c.jpg', ...over,
});

describe('Response cache primitives', () => {
  beforeEach(async () => {
    await cacheInvalidate('');
  });

  it('stores and returns a value', async () => {
    await cacheSet('unit:a', { hello: 'world' }, 60);
    expect(await cacheGet('unit:a')).toEqual({ hello: 'world' });
  });

  it('misses for an unknown key', async () => {
    expect(await cacheGet('unit:never-set')).toBeNull();
  });

  it('expires an entry once its TTL has passed', async () => {
    await cacheSet('unit:ttl', { v: 1 }, -1); // already expired
    expect(await cacheGet('unit:ttl')).toBeNull();
  });

  it('invalidates by prefix without touching other families', async () => {
    await cacheSet('trips:list:a', { v: 1 }, 60);
    await cacheSet('trips:list:b', { v: 2 }, 60);
    await cacheSet('treks:list:all', { v: 3 }, 60);

    await cacheInvalidate('trips');

    expect(await cacheGet('trips:list:a')).toBeNull();
    expect(await cacheGet('trips:list:b')).toBeNull();
    expect(await cacheGet('treks:list:all')).toEqual({ v: 3 });
  });
});

describe('Cached catalog endpoints', () => {
  beforeEach(async () => {
    await cacheInvalidate('');
  });

  it('serves a MISS then a HIT, and returns identical bodies', async () => {
    await Trek.create({ _id: 'cache-trek-1', ...trekPayload() });

    const first = await request(app).get(`${api}/treks`);
    expect(first.headers['x-cache']).toBe('MISS');

    const second = await request(app).get(`${api}/treks`);
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);
  });

  it('a trek write evicts the cached catalog so the next read is fresh', async () => {
    const token = await adminToken();
    await request(app).get(`${api}/treks`); // warm

    const created = await request(app).post(`${api}/admin/treks`)
      .set('Authorization', `Bearer ${token}`)
      .send(trekPayload({ title: 'Freshly Added Trek' }));
    expect(created.status).toBe(201);

    const after = await request(app).get(`${api}/treks`);
    expect(after.headers['x-cache']).toBe('MISS');
    expect(after.body.treks.map((t) => t.title)).toContain('Freshly Added Trek');
  });

  it('keeps the trending and full catalog under separate keys', async () => {
    await Trek.create({ _id: 'cache-trek-plain', ...trekPayload({ title: 'Plain' }) });
    await Trek.create({ _id: 'cache-trek-hot', ...trekPayload({ title: 'Hot', trending: true }) });

    const all = await request(app).get(`${api}/treks`);
    const trending = await request(app).get(`${api}/treks?trending=true`);

    expect(all.headers['x-cache']).toBe('MISS');
    expect(trending.headers['x-cache']).toBe('MISS'); // not served the full list
    expect(all.body.treks).toHaveLength(2);
    expect(trending.body.treks).toHaveLength(1);
  });

  it('treats differently-ordered query params as one entry', async () => {
    const a = await request(app).get(`${api}/trips?page=1&limit=5`);
    expect(a.headers['x-cache']).toBe('MISS');

    const b = await request(app).get(`${api}/trips?limit=5&page=1`);
    expect(b.headers['x-cache']).toBe('HIT');
  });

  it('does not cache live seat availability', async () => {
    // Departures must always hit the database — a stale count sells a seat
    // that no longer exists.
    const res = await request(app).get(`${api}/trips/does-not-exist/departures`);
    expect(res.headers['x-cache']).toBeUndefined();
  });

  it('a failed write leaves the warm cache intact', async () => {
    await Trek.create({ _id: 'cache-trek-keep', ...trekPayload() });
    await request(app).get(`${api}/treks`); // warm

    // Unauthenticated — should be rejected and must not evict anything.
    const denied = await request(app).post(`${api}/admin/treks`).send(trekPayload({ title: 'Nope' }));
    expect(denied.status).toBeGreaterThanOrEqual(400);

    const after = await request(app).get(`${api}/treks`);
    expect(after.headers['x-cache']).toBe('HIT');
  });
});

describe('Cache resilience', () => {
  it('keeps serving after the cache is closed mid-flight', async () => {
    await Trek.create({ _id: 'cache-trek-resilient', ...trekPayload() });
    await closeCache();

    const res = await request(app).get(`${api}/treks`);
    expect(res.status).toBe(200);
    expect(res.body.treks.length).toBeGreaterThan(0);
  });
});
