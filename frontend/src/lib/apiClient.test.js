import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import api, { clearApiCache, setToken } from './apiClient.js';

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(body),
});

describe('apiClient account changes', () => {
  beforeEach(() => {
    const data = new Map();
    vi.stubGlobal('localStorage', { getItem: (key) => data.get(key) || null,
      setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) });
    vi.stubGlobal('window', { location: { pathname: '/organizer' } });
    clearApiCache();
  });
  afterEach(() => { clearApiCache(); vi.unstubAllGlobals(); });

  it('discards an old account response that arrives after login switches', async () => {
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    vi.stubGlobal('fetch', vi.fn(async () => { await pending; return jsonResponse({ bookings: ['old-private-booking'] }); }));
    setToken('old-account-token');
    const response = api.get('/organizer/bookings');
    setToken('new-account-token');
    release();
    await expect(response).rejects.toMatchObject({ status: 409 });
  });
});

describe('API reads without response caching', () => {
  beforeEach(() => { setToken(null); vi.restoreAllMocks(); });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches fresh data for repeated reads, including cache: true callers', async () => {
    let version = 0;
    const fetchMock = vi.fn(async () => jsonResponse({ version: ++version }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await api.get('/organizer/bookings', { auth: false })).toEqual({ version: 1 });
    expect(await api.get('/organizer/bookings', { auth: false, cache: true })).toEqual({ version: 2 });
    expect(fetchMock.mock.calls.every(([, options]) => options.cache === 'no-store')).toBe(true);
  });

  it('does not join a request started before the current server read', async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      const call = ++calls;
      if (call === 1) await gate;
      return jsonResponse({ bookings: call === 1 ? ['deleted-booking'] : [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    const old = api.get('/bookings', { auth: false });
    expect(await api.get('/bookings', { auth: false })).toEqual({ bookings: [] });
    release();
    await old;
    expect(await api.get('/bookings', { auth: false })).toEqual({ bookings: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rechecks authorization instead of serving previously successful private data', async () => {
    const storage = new Map();
    vi.stubGlobal('localStorage', { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) });
    vi.stubGlobal('window', { location: { pathname: '/organizer' } });
    setToken('session');
    const fetchMock = vi.fn(async () => jsonResponse({ bookings: ['old'] }));
    vi.stubGlobal('fetch', fetchMock);
    await api.get('/organizer/bookings');
    setToken(null);
    await expect(api.get('/organizer/bookings')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('apiClient 401 session expiration handling', () => {
  let dispatchedEvents;

  beforeEach(() => {
    dispatchedEvents = [];
    const storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => storage[k] ?? null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
    });
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn((evt) => dispatchedEvents.push(evt)),
      location: { pathname: '/app' },
    });
    class MockCustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    }
    vi.stubGlobal('CustomEvent', MockCustomEvent);
    clearApiCache();
    setToken(null);
  });

  afterEach(() => {
    clearApiCache();
    vi.unstubAllGlobals();
  });

  it('does NOT dispatch auth-session-expired when an unauthenticated call (auth: false) returns 401', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'Invalid credentials' } }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.post('/auth/login', { email: 'a@b.com' }, { auth: false })).rejects.toThrow();

    const expiredEvent = dispatchedEvents.find((e) => e.type === 'auth-session-expired');
    expect(expiredEvent).toBeUndefined();
  });

  it('dispatches auth-session-expired and clears token when an authenticated call returns 401', async () => {
    setToken('dummy-jwt-token');

    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'Token expired' } }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.get('/bookings', { auth: true })).rejects.toThrow();

    const expiredEvent = dispatchedEvents.find((e) => e.type === 'auth-session-expired');
    expect(expiredEvent).toBeDefined();
    expect(localStorage.getItem('trekigo_auth_token')).toBeNull();
  });

  it('keeps concurrent deleted-session failures as 401 after the first clears the token', async () => {
    setToken('deleted-session');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401,
      text: async () => JSON.stringify({ error: { message: 'Account deleted' } }) })));
    const failures = await Promise.allSettled([api.get('/auth/organizer-status'), api.get('/auth/organizer-status')]);
    expect(failures.map((result) => result.reason.status)).toEqual([401, 401]);
  });
});

