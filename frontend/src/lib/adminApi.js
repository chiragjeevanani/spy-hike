/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Admin console roster calls — real customer + organizer accounts. The Users
// and Organizers views hydrate from these when the admin is signed in, and
// fall back to their localStorage seeds when there's no backend.
import api from './apiClient.js';

export const adminApi = {
  // ─── Users (hikers) ───
  listUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/users${qs ? `?${qs}` : ''}`).then((r) => r.users);
  },
  getUser: (id) => api.get(`/admin/users/${encodeURIComponent(id)}`).then((r) => r.user),
  createUser: (payload) => api.post('/admin/users', payload).then((r) => r.user),
  updateUser: (id, payload) => api.patch(`/admin/users/${encodeURIComponent(id)}`, payload).then((r) => r.user),
  setUserStatus: (id, status) =>
    api.patch(`/admin/users/${encodeURIComponent(id)}/status`, { status }).then((r) => r.user),
  deleteUser: (id) => api.del(`/admin/users/${encodeURIComponent(id)}`),

  // ─── Organizers ───
  listOrganizers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/organizers${qs ? `?${qs}` : ''}`).then((r) => r.organizers);
  },
  createOrganizer: (payload) => api.post('/admin/organizers', payload).then((r) => r.organizer),
  updateOrganizer: (id, payload) =>
    api.patch(`/admin/organizers/${encodeURIComponent(id)}`, payload).then((r) => r.organizer),
  setOrganizerStatus: (id, action) =>
    api.patch(`/admin/organizers/${encodeURIComponent(id)}/status`, { action }).then((r) => r.organizer),
  deleteOrganizer: (id) => api.del(`/admin/organizers/${encodeURIComponent(id)}`),

  // ─── Admin Profile & Config ───
  updateProfile: (payload) => api.patch('/admin/profile', payload).then((r) => r.admin),
  changePassword: (currentPassword, newPassword) =>
    api.patch('/auth/password/change', { currentPassword, newPassword }),
  resetDatabase: () => api.post('/admin/reset-database'),
};

export default adminApi;
