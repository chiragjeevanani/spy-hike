/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Landing-page CMS content. The marketing page reads it publicly; the admin
// console reads + writes it. Offline-first (matching the rest of the app): the
// API is the source of truth when reachable, but everything falls back to a
// same-origin localStorage cache so the CMS keeps working with no backend.
import api, { getToken } from './apiClient.js';
import {
  mergeLandingContent, loadLandingContentLocal, saveLandingContentLocal,
} from '../modules/landing/landingContent.js';

export const landingApi = {
  // Public read for the landing page: API → cache; falls back to the local
  // cache (or built-in defaults) when the backend is unreachable.
  getContent: async () => {
    try {
      const content = await api.get('/landing-content', { auth: false }).then((r) => r.content);
      const merged = mergeLandingContent(content);
      saveLandingContentLocal(merged);
      return merged;
    } catch {
      return loadLandingContentLocal();
    }
  },

  // Admin read: same fallback behavior, admin-scoped endpoint.
  adminGetContent: async () => {
    try {
      const content = await api.get('/admin/landing-content').then((r) => r.content);
      const merged = mergeLandingContent(content);
      saveLandingContentLocal(merged);
      return merged;
    } catch {
      return loadLandingContentLocal();
    }
  },

  // Admin save: always persist to the local cache, then best-effort sync to the
  // API when authenticated. Resolves to { content, synced } — `synced:false`
  // means it was saved locally but the server could not be reached, so the CMS
  // can tell the admin instead of hard-failing with "Failed to fetch".
  saveContent: async (payload) => {
    const localMerged = mergeLandingContent(payload);
    saveLandingContentLocal(localMerged);
    if (!getToken()) return { content: localMerged, synced: false };
    try {
      const content = await api.patch('/admin/landing-content', payload).then((r) => r.content);
      const serverMerged = mergeLandingContent(content);
      saveLandingContentLocal(serverMerged);
      return { content: serverMerged, synced: true };
    } catch {
      return { content: localMerged, synced: false };
    }
  },
};

export default landingApi;
