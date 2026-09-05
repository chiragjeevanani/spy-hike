/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Onboarding CMS content (Customer onboarding + Organizer onboarding slides).
// Offline-first, same pattern as contentApi.js and landingApi.js.
import api, { getToken } from './apiClient.js';
import {
  mergeOnboardingContent, loadOnboardingContentLocal, saveOnboardingContentLocal,
} from '../utils/onboardingContent.js';

export const onboardingApi = {
  // Public read: API → cache; falls back to local cache or defaults if backend is unreachable
  getContent: async () => {
    try {
      const content = await api.get('/onboarding-content', { auth: false }).then((r) => r.content);
      const merged = mergeOnboardingContent(content);
      saveOnboardingContentLocal(merged);
      return merged;
    } catch {
      return loadOnboardingContentLocal();
    }
  },

  // Admin read: same fallback behavior, admin-scoped endpoint
  adminGetContent: async () => {
    try {
      const content = await api.get('/admin/onboarding-content').then((r) => r.content);
      const merged = mergeOnboardingContent(content);
      saveOnboardingContentLocal(merged);
      return merged;
    } catch {
      return loadOnboardingContentLocal();
    }
  },

  // Admin save: always persist to local cache, then sync to API
  saveContent: async (payload) => {
    const localMerged = mergeOnboardingContent(payload);
    saveOnboardingContentLocal(localMerged);
    if (!getToken()) return { content: localMerged, synced: false };
    try {
      const content = await api.patch('/admin/onboarding-content', payload).then((r) => r.content);
      const serverMerged = mergeOnboardingContent(content);
      saveOnboardingContentLocal(serverMerged);
      return { content: serverMerged, synced: true };
    } catch {
      return { content: localMerged, synced: false };
    }
  },
};

export default onboardingApi;
