/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Landing-page CMS content. The marketing page reads it publicly; the admin
// console reads + writes it. Content shape matches backend LandingContent.
import api from './apiClient.js';

export const landingApi = {
  // Public — the landing page hydrates from this (no token needed).
  getContent: () => api.get('/landing-content', { auth: false }).then((r) => r.content),

  // Admin.
  adminGetContent: () => api.get('/admin/landing-content').then((r) => r.content),
  adminUpdateContent: (payload) => api.patch('/admin/landing-content', payload).then((r) => r.content),
};

export default landingApi;
