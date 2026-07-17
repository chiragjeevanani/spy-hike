/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// "My trek isn't in the catalog" requests — an organizer proposes a new trek,
// an admin reviews/edits/approves or rejects it. Approval promotes it into
// the real Trek catalog (see treksApi.js).

import api from './apiClient.js';

export const trekRequestsApi = {
  // ─── Organizer ───
  create: (payload) => api.post('/organizer/trek-requests', payload).then((r) => r.request),
  listMine: () => api.get('/organizer/trek-requests').then((r) => r.requests),

  // ─── Admin ───
  listAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/trek-requests${qs ? `?${qs}` : ''}`).then((r) => r.requests);
  },
  update: (id, payload) => api.put(`/admin/trek-requests/${encodeURIComponent(id)}`, payload).then((r) => r.request),
  setStatus: (id, action, reviewNote) =>
    api.patch(`/admin/trek-requests/${encodeURIComponent(id)}/status`, { action, reviewNote }),
};

export default trekRequestsApi;
