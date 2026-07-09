/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Booking calls. Customer create/list carry the JWT; organizer/admin views
// read their own scopes. The server computes all pricing/commission and owns
// the bookingId, so the client sends the selection and renders what comes back.

import api from './apiClient.js';

export const bookingsApi = {
  // ─── Customer ───
  create: (payload) => api.post('/bookings', payload).then((r) => r.booking),
  listMine: () => api.get('/bookings').then((r) => r.bookings),
  getMine: (id) => api.get(`/bookings/${encodeURIComponent(id)}`).then((r) => r.booking),

  // ─── Organizer ───
  listOrganizer: () => api.get('/organizer/bookings').then((r) => r.bookings),

  // ─── Admin ───
  listAll: () => api.get('/admin/bookings').then((r) => r.bookings),
  adminSetStatus: (id, status) =>
    api.patch(`/admin/bookings/${encodeURIComponent(id)}/status`, { status }).then((r) => r.booking),

  // ─── Admin platform config (commission / tax) ───
  getConfig: () => api.get('/admin/config').then((r) => r.config),
  updateConfig: (payload) => api.patch('/admin/config', payload).then((r) => r.config),
};

export default bookingsApi;
