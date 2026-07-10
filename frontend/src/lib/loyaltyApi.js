/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Loyalty HTTP calls. utils/loyalty.js wraps these to hydrate its localStorage
// cache, keeping the rest of the app's synchronous loyalty readers unchanged.

import api from './apiClient.js';

export const loyaltyApi = {
  getConfig: () => api.get('/loyalty/config', { auth: false }).then((r) => r.config),
  getCustomerLoyalty: () => api.get('/loyalty/me'), // { progress, vouchers }
  getOrganizerLoyalty: () => api.get('/organizer/loyalty'), // { progress, vouchers }
  organizerRedeemReward: (bookingId) =>
    api.post(`/organizer/bookings/${encodeURIComponent(bookingId)}/redeem-reward`).then((r) => r.booking),

  // Admin
  adminGetConfig: () => api.get('/admin/loyalty/config').then((r) => r.config),
  adminUpdateConfig: (config) => api.patch('/admin/loyalty/config', config).then((r) => r.config),
};

export default loyaltyApi;
