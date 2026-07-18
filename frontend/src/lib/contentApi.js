/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Legal/support CMS content (Privacy Policy + Support page + the deactivated-
// account contact details). Offline-first, same pattern as landingApi.js.
import api, { getToken } from './apiClient.js';
import {
  mergeSiteContent, loadSiteContentLocal, saveSiteContentLocal,
} from '../utils/siteContent.js';

export const contentApi = {
  // Public read: API → cache; falls back to the local cache (or built-in
  // defaults) when the backend is unreachable.
  getContent: async () => {
    try {
      const content = await api.get('/site-content', { auth: false }).then((r) => r.content);
      const merged = mergeSiteContent(content);
      saveSiteContentLocal(merged);
      return merged;
    } catch {
      return loadSiteContentLocal();
    }
  },

  // Admin read: same fallback behavior, admin-scoped endpoint.
  adminGetContent: async () => {
    try {
      const content = await api.get('/admin/site-content').then((r) => r.content);
      const merged = mergeSiteContent(content);
      saveSiteContentLocal(merged);
      return merged;
    } catch {
      return loadSiteContentLocal();
    }
  },

  // Admin save: always persist to the local cache, then best-effort sync to
  // the API when authenticated. Resolves to { content, synced }.
  saveContent: async (payload) => {
    const localMerged = mergeSiteContent(payload);
    saveSiteContentLocal(localMerged);
    if (!getToken()) return { content: localMerged, synced: false };
    try {
      const content = await api.patch('/admin/site-content', payload).then((r) => r.content);
      const serverMerged = mergeSiteContent(content);
      saveSiteContentLocal(serverMerged);
      return { content: serverMerged, synced: true };
    } catch {
      return { content: localMerged, synced: false };
    }
  },
};

export default contentApi;
