import { HIKING_TRIPS } from '../data/trips';

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
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state));
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
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(val));
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
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(val));
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
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(val));
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
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(val));
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
  localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(val));
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
  localStorage.setItem(DARK_MODE_KEY, JSON.stringify(val));
};
