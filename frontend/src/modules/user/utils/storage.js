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
    if (val) return JSON.parse(val);
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

