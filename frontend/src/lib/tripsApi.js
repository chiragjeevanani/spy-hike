/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Trip catalog + organizer/admin trip management calls. Public catalog reads
// need no auth; organizer/admin calls carry the JWT (attached by apiClient).

import api from './apiClient.js';

export const tripsApi = {
  // ─── Public catalog ───
  listTrips: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/trips${qs ? `?${qs}` : ''}`, { auth: false }).then((r) => r.trips);
  },
  getTrip: (id) => api.get(`/trips/${encodeURIComponent(id)}`, { auth: false }).then((r) => r.trip),
  getTrekOffers: (trekId) => api.get(`/treks/${encodeURIComponent(trekId)}/offers`, { auth: false }),
  listCategories: () => api.get('/categories', { auth: false }).then((r) => r.categories),

  // ─── Organizer ───
  listOrganizerTrips: () => api.get('/organizer/trips').then((r) => r.trips),
  createTrip: (payload) => api.post('/organizer/trips', payload).then((r) => r.trip),
  updateTrip: (id, payload) => api.put(`/organizer/trips/${encodeURIComponent(id)}`, payload).then((r) => r.trip),
  setTripStatus: (id, status) => api.patch(`/organizer/trips/${encodeURIComponent(id)}/status`, { status }).then((r) => r.trip),
  deleteTrip: (id) => api.del(`/organizer/trips/${encodeURIComponent(id)}`),

  // ─── Admin ───
  listAllTrips: () => api.get('/admin/trips').then((r) => r.trips),
  adminSetTripStatus: (id, status) => api.patch(`/admin/trips/${encodeURIComponent(id)}/status`, { status }).then((r) => r.trip),
  adminDeleteTrip: (id) => api.del(`/admin/trips/${encodeURIComponent(id)}`),
};

export default tripsApi;
