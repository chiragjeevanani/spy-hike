/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// API responses always come from the server. Account and booking data are
// never replayed from an in-memory response cache.

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
  if (getToken() !== token) clearApiCache();
  try {
    if (token) localStorage.setItem(tokenKey(), token);
    else localStorage.removeItem(tokenKey());
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
};

export const clearToken = () => setToken(null);

export const sessionIdentity = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return `${payload.sub}:${payload.sessionVersion || 0}`;
  } catch { return token; }
};

// Kept for existing callers; there is no response cache to invalidate.
export const clearApiCache = () => {};

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

async function request(method, path, body, { auth = true } = {}) {
  return doRequest(method, path, body, { auth, sessionToken: getToken() });
}

async function doRequest(method, path, body, { auth, sessionToken }) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    else throw new ApiClientError(401, 'No authorization token available');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    cache: 'no-store',
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  // 204 No Content and empty bodies return null rather than throwing on parse.
  const text = await res.text();
  if (auth && sessionIdentity(sessionToken) !== sessionIdentity(getToken())
    && !(res.status === 401 && !getToken())) {
    throw new ApiClientError(409, 'The account changed while this request was loading');
  }
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    const isAuthedCall = Boolean(auth && headers.Authorization);
    if (isAuthedCall && res.status === 403 && message.toLowerCase().includes('deactivated')) {
      window.dispatchEvent(new CustomEvent('hiker-status-changed', { detail: { reason: 'deactivated' } }));
    } else if (isAuthedCall && res.status === 403 && message.toLowerCase().includes('banned')) {
      window.dispatchEvent(new CustomEvent('hiker-status-changed', { detail: { reason: 'banned' } }));
    } else if (isAuthedCall && res.status === 401 && message.toLowerCase().includes('deleted')) {
      clearToken();
      window.dispatchEvent(new CustomEvent('auth-session-expired', { detail: { reason: 'deleted' } }));
      window.dispatchEvent(new CustomEvent('hiker-status-changed', { detail: { reason: 'deleted' } }));
    } else if (isAuthedCall && res.status === 401) {
      // Any other 401 on an authenticated call means the stored JWT is absent,
      // malformed, expired, or was signed with a different JWT_SECRET than the
      // server now runs with. Drop it so the active session can reset.
      clearToken();
      window.dispatchEvent(new CustomEvent('auth-session-expired'));
    } else if (isAuthedCall && (res.status === 403 || res.status === 404) && (message.toLowerCase().includes('access to this resource') || message.toLowerCase().includes('organizer not found'))) {
      window.dispatchEvent(new CustomEvent('organizer-status-revoked', { detail: { message } }));
    }
    throw new ApiClientError(res.status, message, data?.error?.details);
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
