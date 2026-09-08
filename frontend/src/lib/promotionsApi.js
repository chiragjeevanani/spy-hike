/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// "Promote Yourself" requests — an organizer asks to be boosted, an admin
// reviews it from the Promotions sidebar (approve with a date range, or
// reject). Admin can also promote/unpromote an organizer directly, with no
// request on file. Mirrors trekRequestsApi.js.

import api from './apiClient.js';

export const promotionsApi = {
  // ─── Organizer ───
  create: (payload) => api.post('/organizer/promotion-requests', payload).then((r) => r.request),
  listMine: () => api.get('/organizer/promotion-requests').then((r) => r.requests),

  // ─── Admin ───
  listAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/promotion-requests${qs ? `?${qs}` : ''}`).then((r) => r.requests);
  },
  review: (id, payload) => api.patch(`/admin/promotion-requests/${encodeURIComponent(id)}`, payload),
  promoteOrganizer: (id, startDate, endDate) =>
    api.patch(`/admin/organizers/${encodeURIComponent(id)}/promote`, { startDate, endDate }).then((r) => r.organizer),
  unpromoteOrganizer: (id) =>
    api.patch(`/admin/organizers/${encodeURIComponent(id)}/unpromote`).then((r) => r.organizer),
};

export default promotionsApi;
