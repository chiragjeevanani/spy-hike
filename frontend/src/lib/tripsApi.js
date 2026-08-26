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
  // Explore's browse feed: one entry per trek with every organizer's offering
  // already collapsed, filtered/sorted/paged by the server. Returns the whole
  // envelope because the caller needs `hasMore` to drive paging.
  listTrekGroups: (params = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const qs = new URLSearchParams(clean).toString();
    return api.get(`/trek-groups${qs ? `?${qs}` : ''}`, { auth: false });
  },
  listPickupCities: () => api.get('/pickup-cities', { auth: false }).then((r) => r.cities),
  // Every city the catalog can actually show treks for, busiest first, each
  // with its trek count and a representative coordinate. Powers the city
  // picker — see the note on listTrekCities in the backend controller.
  listTrekCities: () => api.get('/trek-cities', { auth: false }).then((r) => r.cities || []),
  getTrip: (id) => api.get(`/trips/${encodeURIComponent(id)}`, { auth: false }).then((r) => r.trip),
  getTripDepartures: (id) =>
    api.get(`/trips/${encodeURIComponent(id)}/departures`, { auth: false }).then((r) => r.departures),
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
  adminSetTripFeatured: (id, featured) => api.patch(`/admin/trips/${encodeURIComponent(id)}/featured`, { featured }).then((r) => r.trip),
  adminSetTripPopular: (id, popular) => api.patch(`/admin/trips/${encodeURIComponent(id)}/popular`, { popular }).then((r) => r.trip),
  adminDeleteTrip: (id) => api.del(`/admin/trips/${encodeURIComponent(id)}`),
};

export default tripsApi;
