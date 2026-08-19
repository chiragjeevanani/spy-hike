import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import api, { clearApiCache, setToken } from './apiClient.js';

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(body),
});

describe('apiClient request de-duplication', () => {
  beforeEach(() => {
    clearApiCache();
    setToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearApiCache();
  });

  it('collapses concurrent identical GETs into one network request', async () => {
    let resolve;
    const gate = new Promise((r) => { resolve = r; });
    const fetchMock = vi.fn(async () => { await gate; return jsonResponse({ treks: [{ id: 'a' }] }); });
    vi.stubGlobal('fetch', fetchMock);

    // Four views mounting at once, exactly what Home/Explore/App did.
    const all = Promise.all([
      api.get('/treks', { auth: false }),
      api.get('/treks', { auth: false }),
      api.get('/treks', { auth: false }),
      api.get('/treks', { auth: false }),
    ]);
    resolve();
    const results = await all;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    results.forEach((r) => expect(r.treks).toEqual([{ id: 'a' }]));
  });

  it('gives each caller an independent copy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ treks: [{ id: 'a' }] })));

    const [first, second] = await Promise.all([
      api.get('/treks', { auth: false }),
      api.get('/treks', { auth: false }),
    ]);
    first.treks.push({ id: 'mutated' });

    expect(second.treks).toHaveLength(1);
  });

  it('does not conflate different query strings', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ treks: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      api.get('/treks', { auth: false }),
      api.get('/treks?trending=true', { auth: false }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves a second request from cache after the first settles', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/config', { auth: false });
    await api.get('/config', { auth: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates a failure to every joined caller and re-requests afterwards', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: { message: 'boom' } }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.allSettled([
      api.get('/treks', { auth: false }),
      api.get('/treks', { auth: false }),
    ]);
    results.forEach((r) => expect(r.status).toBe('rejected'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A failure must not be cached — the next call tries again.
    await api.get('/treks', { auth: false }).catch(() => {});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('apiClient scoped invalidation', () => {
  beforeEach(() => {
    clearApiCache();
    setToken(null);
    vi.restoreAllMocks();
  });

  it('a write evicts only its own resource family', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/treks', { auth: false });
    await api.get('/config', { auth: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Toggling a wishlist item used to flush the whole cache.
    await api.post('/wishlist', { id: 'x' }, { auth: false });

    await api.get('/treks', { auth: false });
    await api.get('/config', { auth: false });
    // 2 initial + 1 POST = 3; both GETs still cached.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('evicts the written resource itself', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/bookings', { auth: false });
    await api.post('/bookings', { tripId: 't' }, { auth: false });
    await api.get('/bookings', { auth: false });

    // GET, POST, GET again — the write invalidated its own family.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('honours declared cross-resource invalidations', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/trips', { auth: false });
    await api.post('/bookings', { tripId: 't' }, { auth: false, invalidates: ['/trips'] });
    await api.get('/trips', { auth: false });

    // Booking a seat changes trip availability, so /trips must refetch.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('scopes admin and organizer paths to their resource, not the prefix', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await api.get('/treks', { auth: false });
    await api.put('/admin/treks/kedarkantha', { title: 'x' }, { auth: false });
    await api.get('/treks', { auth: false });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
