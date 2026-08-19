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

  // ─── Admin ───
  listAllTreks: () => api.get('/admin/treks').then((r) => r.treks),
  createTrek: (payload) => api.post('/admin/treks', payload).then((r) => r.trek),
  // The server syncs a trek's identity fields (name/location/difficulty/…) into
  // every trip posted under it, so cached trips go stale on this write too.
  updateTrek: (id, payload) =>
    api.put(`/admin/treks/${encodeURIComponent(id)}`, payload, { invalidates: ['/trips'] }).then((r) => r.trek),
  deleteTrek: (id) => api.del(`/admin/treks/${encodeURIComponent(id)}`),
};

export default treksApi;
