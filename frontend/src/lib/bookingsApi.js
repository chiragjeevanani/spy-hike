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
  // Reserving seats changes live availability on the trip and its departures.
  create: (payload) =>
    api.post('/bookings', payload, { invalidates: ['/trips', '/departures', '/loyalty'] }).then((r) => r.booking),
  // Same call, keeping the payment instructions: { booking, payment }. When
  // `payment.required` is true the booking is pending and `payment.checkout`
  // is the signed PayU form to redirect to (see lib/payu.js).
  checkout: (payload) =>
    api.post('/bookings', payload, { invalidates: ['/trips', '/departures', '/loyalty'] }),
  listMine: (opts) => api.get('/bookings', opts).then((r) => r.bookings),
  getMine: (id) => api.get(`/bookings/${encodeURIComponent(id)}`).then((r) => r.booking),
  // Cancelling releases the seats back to the trip and its departures.
  cancel: (id) =>
    api.post(`/bookings/${encodeURIComponent(id)}/cancel`, undefined, { invalidates: ['/trips', '/departures', '/loyalty'] })
      .then((r) => r.booking),

  // ─── Online payment (PayU) ───
  // 'online' or 'arrival' — decides how checkout is labelled and run.
  getPaymentConfig: () => api.get('/payments/config', { ttlMs: 5 * 60 * 1000 }).then((r) => r.payment),
  // Polled after PayU redirects back. Never cached: each call may settle the
  // booking server-side by asking PayU what happened.
  getPaymentStatus: (id) =>
    api.get(`/bookings/${encodeURIComponent(id)}/payment`, { cache: false }),
  // A fresh PayU transaction for a pending booking. Resolves to the same
  // `payment` shape the checkout call returns.
  retryPayment: (id) =>
    api.post(`/bookings/${encodeURIComponent(id)}/payment/retry`).then((r) => r.payment),

  // ─── Organizer financials & payouts ───
  getFinancials: () => api.get('/organizer/financials'),
  listPayouts: () => api.get('/organizer/payouts').then((r) => r.payouts),
  requestPayout: (amount) => api.post('/organizer/payouts', { amount }).then((r) => r.payout),
  saveBankDetails: (bankDetails) => api.patch('/organizer/bank-details', bankDetails).then((r) => r.organizer),

  // ─── Admin payouts ───
  adminListPayouts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/payouts${qs ? `?${qs}` : ''}`); // { payouts, summary }
  },
  adminSettlePayout: (id, action, reason) =>
    api.patch(`/admin/payouts/${encodeURIComponent(id)}`, { action, reason }).then((r) => r.payout),

  // ─── Organizer ───
  listOrganizer: (opts) => api.get('/organizer/bookings', opts).then((r) => r.bookings),
  // Scan-to-check-in. Resolves to { booking, alreadyCheckedIn }.
  checkin: (bookingId) => api.post(`/organizer/bookings/${encodeURIComponent(bookingId)}/checkin`),

  // ─── Admin ───
  listAll: () => api.get('/admin/bookings').then((r) => r.bookings),
  adminSetStatus: (id, status) =>
    api.patch(`/admin/bookings/${encodeURIComponent(id)}/status`, { status }).then((r) => r.booking),

  // ─── Admin platform config (commission / tax) ───
  getConfig: () => api.get('/admin/config').then((r) => r.config),
  updateConfig: (payload) => api.patch('/admin/config', payload).then((r) => r.config),

  // ─── Admin analytics ───
  getAnalytics: () => api.get('/admin/analytics'),
};

export default bookingsApi;
