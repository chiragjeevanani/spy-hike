/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Trek catalog calls. Public list/get need no auth (used by the organizer's
// "select a trek" picker and the customer app); admin CRUD carries the JWT.

import api from './apiClient.js';

export const treksApi = {
  // ─── Public ───
  listTreks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/treks${qs ? `?${qs}` : ''}`, { auth: false }).then((r) => r.treks);
  },
  getTrek: (id) => api.get(`/treks/${encodeURIComponent(id)}`, { auth: false }).then((r) => r.trek),
  getTrekOffers: (trekId) => api.get(`/treks/${encodeURIComponent(trekId)}/offers`, { auth: false }),
  listHomeFilters: () => api.get('/home-filters', { auth: false }).then((r) => r.filters || []),

  // ─── Admin ───
  listAllTreks: () => api.get('/admin/treks').then((r) => r.treks),
  createTrek: (payload) => api.post('/admin/treks', payload).then((r) => r.trek),
  // The server syncs a trek's identity fields (name/location/difficulty/…) into
  // every trip posted under it, so cached trips go stale on this write too.
  updateTrek: (id, payload) =>
    api.put(`/admin/treks/${encodeURIComponent(id)}`, payload, { invalidates: ['/trips'] }).then((r) => r.trek),
  deleteTrek: (id) => api.del(`/admin/treks/${encodeURIComponent(id)}`),
  listAllHomeFilters: () => api.get('/admin/home-filters').then((r) => r.filters || []),
  createHomeFilter: (payload) => api.post('/admin/home-filters', payload).then((r) => r.filter),
  updateHomeFilter: (id, payload) =>
    api.put(`/admin/home-filters/${encodeURIComponent(id)}`, payload, { invalidates: ['/home-filters', '/treks', '/trek-groups'] }).then((r) => r.filter),
  deleteHomeFilter: (id) => api.del(`/admin/home-filters/${encodeURIComponent(id)}`, { invalidates: ['/home-filters', '/treks', '/trek-groups'] }),
};

export default treksApi;
