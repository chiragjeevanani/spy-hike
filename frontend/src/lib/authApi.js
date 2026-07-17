/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Auth calls against the Find Your Trek backend. Each login/register resolves to the
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
  updateProfile: (payload) => api.patch('/auth/profile', payload).then(accept),
  checkAvailability: (params) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/auth/check-availability${qs ? `?${qs}` : ''}`, { auth: false });
  },
  uploadImage: (fileBase64) => api.post('/auth/upload', { file: fileBase64 }),
  requestEmailOtp: (email) => api.post('/auth/email-otp/request', { email }),
  updateProfileVerify: (payload) => api.post('/auth/profile/update-verify', payload).then(accept),
  changePassword: (currentPassword, newPassword) => api.patch('/auth/password/change', { currentPassword, newPassword }),
  resetPasswordOtp: (payload) => api.post('/auth/password/reset-otp', payload),
  updateFcmToken: (fcmToken) => api.post('/auth/fcm-token', { fcmToken }),

  // ─── Organizer ───
  registerOrganizer: (payload) =>
    api.post('/auth/organizer/register', payload, { auth: false }).then(accept),
  // For an already-logged-in customer applying to become an organizer — uses
  // their JWT and existing passwordHash, so the same email + password works
  // in both apps (same User document, no second account).
  applyAsOrganizer: (payload) =>
    api.post('/auth/organizer/apply', payload).then(accept),
  loginOrganizer: (email, password) =>
    api.post('/auth/organizer/login', { email, password }, { auth: false }).then(accept),
  // Also mints and stores an organizer-scoped token (via the customer's
  // existing token) so subsequent organizer-only calls carry the right role —
  // switching roles for a unified account needs no password re-entry.
  getLinkedOrganizerStatus: () =>
    api.get('/auth/organizer-status').then((res) => {
      if (res?.token) setToken(res.token);
      return res;
    }),
  // Mints a customer-scoped token for the current account (used when an
  // organizer switches back to the traveller app).
  getCustomerToken: () => api.get('/auth/customer-token').then(accept),
  updateOrganizerProfile: (payload) => api.patch('/auth/organizer/profile', payload),
  getPublicOrganizerProfile: (name) => api.get(`/auth/organizer/public/${encodeURIComponent(name)}`),

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
