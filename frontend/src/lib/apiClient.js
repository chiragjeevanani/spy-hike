/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Thin fetch wrapper for the Find Your Trek backend API. Every module's storage
// helpers call through this instead of touching `fetch` directly, so auth,
// base URL, JSON handling, and error shaping live in one place.
//
// As of Phase 0 nothing calls this yet — it's introduced ahead of the
// per-feature localStorage → API migrations in later phases.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

// JWT persistence. A single shared token key across all three module SPAs —
// the role encoded in the token (customer/organizer/admin) scopes access.
const TOKEN_KEY = 'trekigo_auth_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
};

export const clearToken = () => setToken(null);

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
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
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
  baseUrl: API_BASE_URL,
};

export default api;
