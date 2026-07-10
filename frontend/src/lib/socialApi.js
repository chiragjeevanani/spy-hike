/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Wishlist, reviews, notifications, chat, and admin broadcast calls (Phase 8).

import api from './apiClient.js';

export const socialApi = {
  // ─── Wishlist (customer) ───
  getWishlist: () => api.get('/wishlist').then((r) => r.wishlist),
  setWishlist: (wishlist) => api.put('/wishlist', { wishlist }).then((r) => r.wishlist),

  // ─── Reviews ───
  createReview: (bookingId, payload) =>
    api.post(`/bookings/${encodeURIComponent(bookingId)}/review`, payload).then((r) => r.review),
  listTripReviews: (tripId) => api.get(`/trips/${encodeURIComponent(tripId)}/reviews`, { auth: false }).then((r) => r.reviews),

  // ─── Notifications (customer) ───
  getNotifications: () => api.get('/notifications').then((r) => r.notifications),
  markNotificationRead: (id) => api.patch(`/notifications/${encodeURIComponent(id)}/read`),
  markAllNotificationsRead: () => api.patch('/notifications/read-all'),

  // ─── Notifications (organizer) ───
  getOrganizerNotifications: () => api.get('/organizer/notifications').then((r) => r.notifications),
  markOrganizerNotificationRead: (id) => api.patch(`/organizer/notifications/${encodeURIComponent(id)}/read`),
  markAllOrganizerNotificationsRead: () => api.patch('/organizer/notifications/read-all'),

  // ─── Chat (customer) ───
  getChats: () => api.get('/chats').then((r) => r.chats),
  sendMessage: (tripId, text) => api.post(`/chats/${encodeURIComponent(tripId)}/messages`, { text }).then((r) => r.chat),

  // ─── Chat (organizer) ───
  getOrganizerChats: () => api.get('/organizer/chats').then((r) => r.chats),
  sendOrganizerMessage: (chatId, text) =>
    api.post(`/organizer/chats/${encodeURIComponent(chatId)}/messages`, { text }).then((r) => r.chat),

  // ─── Admin broadcast ───
  broadcast: (payload) => api.post('/admin/broadcast', payload).then((r) => r.broadcast),
  listBroadcasts: () => api.get('/admin/broadcasts').then((r) => r.broadcasts),
};

export default socialApi;
