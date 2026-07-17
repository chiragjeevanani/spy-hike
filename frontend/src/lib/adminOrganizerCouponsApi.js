/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Admin moderation of organizer-authored coupons: edit/pause/delete only —
// there's deliberately no create() here (organizers remain the sole authors,
// see backend/src/controllers/adminOrganizerCouponController.js).

import api from './apiClient.js';

const qs = (params) => {
  const entries = Object.entries(params || {}).filter(([, v]) => v);
  return entries.length ? `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : '';
};

export const adminOrganizerCouponsApi = {
  list: (params) => api.get(`/admin/organizer-coupons${qs(params)}`).then((r) => r.coupons),
  update: (id, payload) => api.put(`/admin/organizer-coupons/${encodeURIComponent(id)}`, payload).then((r) => r.coupon),
  toggle: (id) => api.patch(`/admin/organizer-coupons/${encodeURIComponent(id)}/toggle`).then((r) => r.coupon),
  remove: (id) => api.del(`/admin/organizer-coupons/${encodeURIComponent(id)}`),
};

export default adminOrganizerCouponsApi;
