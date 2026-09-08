/**
 * API client for Customer App Home Promotional Banners CMS
 */
import api, { getToken } from './apiClient.js';
import { PROMOTIONAL_BANNERS } from '../modules/user/data/trips.js';

const STORAGE_KEY = 'fyt_promotional_banners';

const loadLocalBanners = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return PROMOTIONAL_BANNERS;
};

const saveLocalBanners = (banners) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(banners));
  } catch {}
};

export const bannersApi = {
  // Public read for customer app (returns active banners only)
  getBanners: async () => {
    try {
      const res = await api.get('/promotional-banners', { auth: false });
      if (res && Array.isArray(res.banners) && res.banners.length > 0) {
        saveLocalBanners(res.banners);
        return res.banners;
      }
      return loadLocalBanners();
    } catch {
      return loadLocalBanners();
    }
  },

  // Admin read (returns all banners including inactive ones)
  adminGetBanners: async () => {
    try {
      const res = await api.get('/admin/promotional-banners');
      if (res && Array.isArray(res.banners) && res.banners.length > 0) {
        saveLocalBanners(res.banners);
        return res.banners;
      }
      return loadLocalBanners();
    } catch {
      return loadLocalBanners();
    }
  },

  // Admin update
  adminUpdateBanners: async (banners) => {
    saveLocalBanners(banners);
    if (!getToken()) return { banners, synced: false };
    try {
      const res = await api.put('/admin/promotional-banners', { banners });
      if (res && Array.isArray(res.banners)) {
        saveLocalBanners(res.banners);
        return { banners: res.banners, synced: true };
      }
      return { banners, synced: false };
    } catch {
      return { banners, synced: false };
    }
  },

  // Admin reset to defaults
  adminResetBanners: async () => {
    saveLocalBanners(PROMOTIONAL_BANNERS);
    if (!getToken()) return { banners: PROMOTIONAL_BANNERS, synced: false };
    try {
      const res = await api.put('/admin/promotional-banners', { reset: true });
      if (res && Array.isArray(res.banners)) {
        saveLocalBanners(res.banners);
        return { banners: res.banners, synced: true };
      }
      return { banners: PROMOTIONAL_BANNERS, synced: false };
    } catch {
      return { banners: PROMOTIONAL_BANNERS, synced: false };
    }
  },
};

export default bannersApi;

