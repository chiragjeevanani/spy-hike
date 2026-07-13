/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Auth calls against the Trekigo backend. Each login/register resolves to the
// backend's `{ token, role, account }` envelope; we persist the JWT here and
// hand the caller the `account` object (already frontend-shaped) so existing
// component/session code barely changes.

import api, { setToken, clearToken, getToken } from './apiClient.js';

// Stores the JWT and returns just the account (+ role) to the caller.
function accept(res) {
  if (res?.token) setToken(res.token);
  return res.account ? { ...res.account, role: res.role } : res.account;
}

export const authApi = {
  // ─── Customer ───
  registerCustomer: (payload) => api.post('/auth/register', payload, { auth: false }).then(accept),
  loginCustomer: (email, password) =>
    api.post('/auth/login', { email, password }, { auth: false }).then(accept),
  requestOtp: (mobile) => api.post('/auth/otp/request', { mobile }, { auth: false }),
  verifyOtp: (mobile, code, name) =>
    api.post('/auth/otp/verify', { mobile, code, name }, { auth: false }).then(accept),
  // Signup phone verification: confirms the number and returns a short-lived
  // phoneToken to pass to register (does not create/log in an account).
  verifyPhone: (mobile, code) =>
    api.post('/auth/phone/verify', { mobile, code }, { auth: false }),
  googleAuth: (token) => api.post('/auth/google', { token }, { auth: false }).then(accept),

  // ─── Organizer ───
  registerOrganizer: (payload) =>
    api.post('/auth/organizer/register', payload, { auth: false }).then(accept),
  loginOrganizer: (email, password) =>
    api.post('/auth/organizer/login', { email, password }, { auth: false }).then(accept),

  // ─── Admin ───
  loginAdmin: (email, password) =>
    api.post('/auth/admin/login', { email, password }, { auth: false }).then(accept),

  // ─── Shared ───
  // Revalidates the stored token; returns the current account or null if not
  // signed in / token expired.
  async fetchMe() {
    if (!getToken()) return null;
    try {
      const res = await api.get('/auth/me');
      return { ...res.account, role: res.role };
    } catch {
      clearToken();
      return null;
    }
  },
  logout() {
    clearToken();
  },
};

export default authApi;
