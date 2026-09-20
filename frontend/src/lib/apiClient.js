/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Thin fetch wrapper for the Find Your Trek backend API with built-in
// in-memory GET request caching to prevent redundant API re-fetching.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

// JWT persistence. The customer and organizer apps deliberately SHARE one token
// slot: they are the same unified account, and switching roles re-mints the JWT
// in place (see authApi.getLinkedOrganizerStatus).
//
// The admin console does NOT belong in that slot. It's a separate account
// entirely (the Admin collection, its own login), and each SPA tracks "am I
// signed in" in its own localStorage flag rather than in the token — so sharing
// one key meant whichever app authenticated last silently owned the JWT for all
// three. Signing into the customer app anywhere in the same browser left the
// admin panel rendering as usual while every admin call came back 403 "You do
// not have access to this resource". Giving admin its own key removes the
// collision in both directions.
const TOKEN_KEY = 'trekigo_auth_token';
const ADMIN_TOKEN_KEY = 'trekigo_admin_auth_token';

// Read per call rather than once at import: cheap, and it can't go stale if the
// module is ever loaded before the URL settles.
const tokenKey = () => {
  try {
    const path = window.location.pathname;
    return path === '/admin' || path.startsWith('/admin/') ? ADMIN_TOKEN_KEY : TOKEN_KEY;
  } catch {
    return TOKEN_KEY;
  }
};

export const getToken = () => {
  try {
    return localStorage.getItem(tokenKey()) || null;
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(tokenKey(), token);
    else localStorage.removeItem(tokenKey());
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
};

export const clearToken = () => setToken(null);

// In-Memory GET Response Cache Map
const responseCache = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds TTL

// GET requests currently awaiting a response, keyed identically to the cache.
// The cache alone can't stop duplicate traffic because it only fills *after* a
// response lands — several views mounting at once all miss the empty cache and
// all hit the network. Joining the in-flight promise instead collapses them
// into a single request.
const inFlight = new Map();

// Callers get their own copy so one view mutating a result can't corrupt
// another's — they may be handed the same underlying object otherwise.
const copy = (data) => (data == null ? data : JSON.parse(JSON.stringify(data)));

/**
 * Clears the in-memory API response cache.
 * Pass a path substring to selectively invalidate matching endpoints (e.g. '/treks').
 */
export const clearApiCache = (pathSubstring = null) => {
  if (!pathSubstring) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(pathSubstring)) {
      responseCache.delete(key);
    }
  }
};

// The resource family a mutation belongs to, so writing one thing doesn't
// discard everything else. `/admin/treks/x` and `/organizer/trips` both scope
// to their second segment; `/bookings` to its first.
const SCOPE_PREFIXES = ['admin', 'organizer'];
const resourceScopeOf = (path) => {
  const segments = path.split('?')[0].split('/').filter(Boolean);
  if (segments.length === 0) return null;
  const head = SCOPE_PREFIXES.includes(segments[0]) ? segments[1] : segments[0];
  return head ? `/${head}` : null;
};

// Error thrown for any non-2xx response, carrying the HTTP status and the
// server's `{ error: { message, details } }` body so callers can branch on it.
export class ApiClientError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.auth]          send the bearer token
 * @param {boolean} [opts.cache]         read/write the GET cache
 * @param {boolean} [opts.forceRefresh]  bypass a cache hit (still de-duplicated)
 * @param {number}  [opts.ttlMs]         cache lifetime for this call
 * @param {string[]} [opts.invalidates]  extra path substrings a mutation should
 *   evict beyond its own resource — for writes with cross-resource effects,
 *   e.g. booking a seat changes trip availability.
 */
async function request(method, path, body, { auth = true, cache = true, forceRefresh = false, ttlMs = DEFAULT_TTL_MS, invalidates } = {}) {
  const isGet = method === 'GET';
  const cacheKey = `${path}:${auth}:${getToken() || ''}`;

  // 1. Check in-memory cache for GET requests
  if (isGet && cache && !forceRefresh && responseCache.has(cacheKey)) {
    const entry = responseCache.get(cacheKey);
    if (Date.now() - entry.timestamp < ttlMs) {
      return copy(entry.data);
    }
    responseCache.delete(cacheKey); // expired
  }

  // 2. Join an identical request already on the wire rather than starting a
  //    second one. Applies even to forceRefresh — a refresh still only needs
  //    one round trip, however many callers asked for it at once.
  if (isGet && cache) {
    const pending = inFlight.get(cacheKey);
    if (pending) return pending.then(copy);
  }

  const send = doRequest(method, path, body, { auth, isGet, cache, cacheKey, invalidates });

  if (isGet && cache) {
    inFlight.set(cacheKey, send);
    try {
      return copy(await send);
    } finally {
      inFlight.delete(cacheKey);
    }
  }

  return send;
}

async function doRequest(method, path, body, { auth, isGet, cache, cacheKey, invalidates }) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    else throw new ApiClientError(401, 'No authorization token available');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  // 204 No Content and empty bodies return null rather than throwing on parse.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    if (res.status === 403 && message.toLowerCase().includes('deactivated')) {
      window.dispatchEvent(new CustomEvent('hiker-status-changed', { detail: { reason: 'deactivated' } }));
    } else if (res.status === 403 && message.toLowerCase().includes('banned')) {
      window.dispatchEvent(new CustomEvent('hiker-status-changed', { detail: { reason: 'banned' } }));
    } else if (res.status === 401 && message.toLowerCase().includes('deleted')) {
      window.dispatchEvent(new CustomEvent('hiker-status-changed', { detail: { reason: 'deleted' } }));
    } else if (res.status === 401) {
      // Any other 401 means the stored JWT is absent, malformed, expired, or
      // was signed with a different JWT_SECRET than the server now runs with.
      // Drop it — otherwise the app keeps believing it's signed in (auth state
      // lives in `trekigo_user`, separate from this token) and every authed
      // call fails forever with no way back to a login screen.
      clearToken();
      responseCache.clear();
      window.dispatchEvent(new CustomEvent('auth-session-expired'));
    }
    throw new ApiClientError(res.status, message, data?.error?.details);
  }

  // Cache successful GET responses
  if (isGet && cache) {
    responseCache.set(cacheKey, { timestamp: Date.now(), data });
  }

  // Invalidate on mutations (POST, PUT, PATCH, DELETE) — but only the resource
  // family that was written, plus anything the caller declares it affects.
  // Flushing the whole cache meant toggling a wishlist item discarded the trek
  // catalog, config and content blocks, and every view refetched them.
  if (!isGet) {
    const scope = resourceScopeOf(path);
    if (scope) clearApiCache(scope);
    else clearApiCache();
    for (const extra of invalidates || []) clearApiCache(extra);
  }

  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, undefined, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  put: (path, body, opts) => request('PUT', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  del: (path, opts) => request('DELETE', path, undefined, opts),
  clearCache: clearApiCache,
  baseUrl: API_BASE_URL,
};

export default api;
