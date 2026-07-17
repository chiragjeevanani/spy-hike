/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Coupon calls. Public list + validate need no auth; admin CRUD carries the JWT.
// `computeDiscount` is a client-side mirror of the server's discount math so the
// checkout total can recompute synchronously as the booking amount changes,
// without an API round-trip on every render (the server validate remains the
// authority for eligibility at apply time, and Phase 5 recomputes pricing
// server-side at booking).

import api from './apiClient.js';

export function computeDiscount(coupon, bookingAmount) {
  if (!coupon) return 0;
  if (coupon.minBookingAmount && bookingAmount < coupon.minBookingAmount) return 0;
  let discount = coupon.type === 'flat' ? coupon.value : (bookingAmount * coupon.value) / 100;
  if (coupon.type === 'percentage' && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return Math.round(Math.min(discount, bookingAmount) * 100) / 100;
}

export const couponsApi = {
  // ─── Public ───
  // tripId (optional) also surfaces/validates that trip's organizer coupons.
  listActive: (tripId) =>
    api.get(`/coupons${tripId ? `?tripId=${encodeURIComponent(tripId)}` : ''}`, { auth: false }).then((r) => r.coupons),
  validate: (code, bookingAmount, tripId) =>
    api.post('/coupons/validate', { code, bookingAmount, tripId }, { auth: false }),

  // ─── Admin ───
  list: () => api.get('/admin/coupons').then((r) => r.coupons),
  create: (payload) => api.post('/admin/coupons', payload).then((r) => r.coupon),
  update: (id, payload) => api.put(`/admin/coupons/${encodeURIComponent(id)}`, payload).then((r) => r.coupon),
  toggle: (id) => api.patch(`/admin/coupons/${encodeURIComponent(id)}/toggle`).then((r) => r.coupon),
  remove: (id) => api.del(`/admin/coupons/${encodeURIComponent(id)}`),
};

export default couponsApi;
