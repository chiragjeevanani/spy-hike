import { HIKING_TRIPS } from '../data/trips';
import { safeSetItem } from '../../../utils/safeStorage';

const USER_STORAGE_KEY = 'trekigo_user';
const WISHLIST_STORAGE_KEY = 'trekigo_wishlist';
const BOOKINGS_STORAGE_KEY = 'trekigo_bookings';
const NOTIFICATIONS_STORAGE_KEY = 'trekigo_notifications';
const CHAT_STORAGE_KEY = 'trekigo_chats';
const TRIPS_STORAGE_KEY = 'trekigo_trips';
const DARK_MODE_KEY = 'trekigo_darkmode';

const DEFAULT_USER = {
  isAuthenticated: false,
  isOnboarded: false,
  profileSetupComplete: false,
  isOrganizer: false,
  name: '',
  email: '',
  mobile: '',
  age: 24,
  avatar: '',
  hikingExperience: '',
  fitnessLevel: '',
  emergencyContact: '',
  rememberMe: false,
};

const STARTER_BOOKINGS = [];

const STARTER_NOTIFICATIONS = [];

const STARTER_CHATS = [];

export const loadUserState = () => {
  try {
    const val = localStorage.getItem(USER_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_USER;
};

export const saveUserState = (state) => {
  safeSetItem(USER_STORAGE_KEY, state);
  if (state?.isAuthenticated) {
    safeSetItem('trekigo_active_role', 'hiker');
    try {
      const orgState = localStorage.getItem('trekigo_org_user');
      if (orgState) {
        const parsed = JSON.parse(orgState);
        // Only clear organizer session if it belongs to a completely different email/user
        if (parsed?.isAuthenticated && parsed?.email && state?.email && parsed.email !== state.email) {
          safeSetItem('trekigo_org_user', { ...parsed, isAuthenticated: false });
        }
      }
      const adminState = localStorage.getItem('trekigo_admin_user');
      if (adminState) {
        const parsed = JSON.parse(adminState);
        if (parsed?.isAuthenticated && parsed?.email && state?.email && parsed.email !== state.email) {
          safeSetItem('trekigo_admin_user', { ...parsed, isAuthenticated: false });
        }
      }
    } catch (e) {
      console.error('Error managing secondary role sessions:', e);
    }
  } else {
    const active = localStorage.getItem('trekigo_active_role');
    if (active === 'hiker') {
      localStorage.removeItem('trekigo_active_role');
    }
  }
};

export const loadWishlist = () => {
  try {
    const val = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  // Default wishlist seed (none)
  return [];
};

export const saveWishlist = (val) => {
  safeSetItem(WISHLIST_STORAGE_KEY, val);
};

export const loadBookings = () => {
  try {
    const val = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return STARTER_BOOKINGS;
};

export const saveBookings = (val) => {
  safeSetItem(BOOKINGS_STORAGE_KEY, val);
};

export const loadNotifications = () => {
  try {
    const val = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return parsed.filter(
          (n) => !n.timestamp || new Date(n.timestamp).getTime() >= thirtyDaysAgo
        );
      }
    }
  } catch (e) {
    console.error(e);
  }
  return STARTER_NOTIFICATIONS;
};

export const saveNotifications = (val) => {
  safeSetItem(NOTIFICATIONS_STORAGE_KEY, val);
};

export const loadChats = () => {
  try {
    const val = localStorage.getItem(CHAT_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return STARTER_CHATS;
};

export const saveChats = (val) => {
  safeSetItem(CHAT_STORAGE_KEY, val);
};

export const loadTrips = () => {
  try {
    const val = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return HIKING_TRIPS;
};

export const saveTrips = (val) => {
  safeSetItem(TRIPS_STORAGE_KEY, val);
};

export const loadDarkMode = () => {
  try {
    const val = localStorage.getItem(DARK_MODE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return true; // Deep premium look as default, togglable!
};

export const saveDarkMode = (val) => {
  safeSetItem(DARK_MODE_KEY, val);
};

// ─── Saved Hikers / Frequent Travelers Auto-Fill ───────────────────────────

const SAVED_HIKERS_KEY_PREFIX = 'ft_saved_hikers_';

export const getSavedHikersStorageKey = (userEmail) => {
  const normalized = userEmail ? String(userEmail).toLowerCase().trim() : 'guest';
  return `${SAVED_HIKERS_KEY_PREFIX}${normalized}`;
};

export const loadSavedHikers = (userEmail, pastBookings = [], currentUser = null) => {
  const key = getSavedHikersStorageKey(userEmail || currentUser?.email);
  let saved = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        saved = parsed;
      }
    }
  } catch (e) {
    console.error('[storage] loadSavedHikers failed:', e);
  }

  // Deduplicate and index by normalized name
  const hikerMap = new Map();
  saved.forEach((h) => {
    if (h && h.name && h.name.trim()) {
      hikerMap.set(h.name.trim().toLowerCase(), {
        name: h.name.trim(),
        age: h.age ? Number(h.age) : '',
        gender: h.gender || 'Male',
        emergencyContact: h.emergencyContact || '',
      });
    }
  });

  // Seed from current user account profile if present and not yet in list
  if (currentUser && currentUser.name && currentUser.name.trim()) {
    const userNorm = currentUser.name.trim().toLowerCase();
    if (!hikerMap.has(userNorm)) {
      hikerMap.set(userNorm, {
        name: currentUser.name.trim(),
        age: currentUser.age ? Number(currentUser.age) : 24,
        gender: currentUser.gender || 'Male',
        emergencyContact: currentUser.mobile || currentUser.emergencyContact || '',
      });
    }
  }

  // Seed from past bookings if present
  if (Array.isArray(pastBookings) && pastBookings.length > 0) {
    pastBookings.forEach((b) => {
      const travelers = b?.travelers || [];
      if (Array.isArray(travelers)) {
        travelers.forEach((t) => {
          if (t && t.name && t.name.trim()) {
            const norm = t.name.trim().toLowerCase();
            if (!hikerMap.has(norm)) {
              hikerMap.set(norm, {
                name: t.name.trim(),
                age: t.age ? Number(t.age) : '',
                gender: t.gender || 'Male',
                emergencyContact: t.emergencyContact || '',
              });
            }
          }
        });
      }
    });
  }

  const list = Array.from(hikerMap.values());
  // If we seeded new ones and had no stored entry, persist them
  if (saved.length === 0 && list.length > 0) {
    safeSetItem(key, list);
  }
  return list;
};

export const saveSavedHikers = (userEmail, hikers) => {
  const key = getSavedHikersStorageKey(userEmail);
  const cleanList = (Array.isArray(hikers) ? hikers : []).filter(
    (h) => h && h.name && h.name.trim()
  );
  safeSetItem(key, cleanList);
  return cleanList;
};

export const mergeNewHikers = (userEmail, newTravelers) => {
  const existing = loadSavedHikers(userEmail);
  const hikerMap = new Map();
  existing.forEach((h) => {
    if (h && h.name) hikerMap.set(h.name.trim().toLowerCase(), h);
  });

  (Array.isArray(newTravelers) ? newTravelers : []).forEach((t) => {
    if (t && t.name && t.name.trim()) {
      const norm = t.name.trim().toLowerCase();
      hikerMap.set(norm, {
        name: t.name.trim(),
        age: t.age ? Number(t.age) : (hikerMap.get(norm)?.age || ''),
        gender: t.gender || (hikerMap.get(norm)?.gender || 'Male'),
        emergencyContact: t.emergencyContact || (hikerMap.get(norm)?.emergencyContact || ''),
      });
    }
  });

  const merged = Array.from(hikerMap.values());
  saveSavedHikers(userEmail, merged);
  return merged;
};

export const removeSavedHiker = (userEmail, nameToRemove) => {
  if (!nameToRemove) return [];
  const existing = loadSavedHikers(userEmail);
  const target = String(nameToRemove).trim().toLowerCase();
  const filtered = existing.filter((h) => h.name.trim().toLowerCase() !== target);
  saveSavedHikers(userEmail, filtered);
  return filtered;
};

