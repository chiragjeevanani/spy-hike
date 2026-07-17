/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// An organizer's own coupon CRUD — codes are unique per-organizer (see
// backend/src/controllers/organizerCouponController.js). All calls carry the
// organizer's JWT.

import api from './apiClient.js';

export const orgCouponsApi = {
  list: () => api.get('/organizer/coupons').then((r) => r.coupons),
  create: (payload) => api.post('/organizer/coupons', payload).then((r) => r.coupon),
  update: (id, payload) => api.put(`/organizer/coupons/${encodeURIComponent(id)}`, payload).then((r) => r.coupon),
  toggle: (id) => api.patch(`/organizer/coupons/${encodeURIComponent(id)}/toggle`).then((r) => r.coupon),
  remove: (id) => api.del(`/organizer/coupons/${encodeURIComponent(id)}`),
};

export default orgCouponsApi;
