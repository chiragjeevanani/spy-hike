import { safeSetItem } from '../../../utils/safeStorage';

const ORG_USER_KEY = 'trekigo_org_user';
const ORG_TRIPS_KEY = 'trekigo_org_trips';
const ORG_BOOKINGS_KEY = 'trekigo_org_bookings';
const ORG_NOTIFICATIONS_KEY = 'trekigo_org_notifications';
const ORG_CHATS_KEY = 'trekigo_org_chats';
const ORG_DARK_MODE_KEY = 'trekigo_org_darkmode_v2';
const ORG_PAYOUTS_KEY = 'trekigo_org_payouts';
const ORG_DATA_OWNER_KEY = 'trekigo_org_data_owner';

export const organizerCacheIdentity = (user) => user?.isAuthenticated
  ? `${user.id || user.email}:${user.sessionVersion || 0}` : null;

export const clearOrgData = () => {
  for (const key of [ORG_TRIPS_KEY, ORG_BOOKINGS_KEY, ORG_NOTIFICATIONS_KEY,
    ORG_CHATS_KEY, ORG_PAYOUTS_KEY, ORG_DATA_OWNER_KEY,
    'trekigo_loyalty_org_vouchers', 'trekigo_loyalty_org_progress']) {
    try { localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
  }
};

const ensureOrgDataOwner = (user) => {
  try {
    const owner = organizerCacheIdentity(user);
    if (!owner || localStorage.getItem(ORG_DATA_OWNER_KEY) !== owner) {
      clearOrgData();
      if (owner) localStorage.setItem(ORG_DATA_OWNER_KEY, owner);
    }
  } catch { /* Real sessions can still load directly from the API. */ }
};

export const DEFAULT_ORG_USER = {
  isAuthenticated: false,
  isOnboarded: false,
  isApproved: false,       // Must be approved by admin
  isPendingApproval: false, // Set to true after registration, waiting for admin
  name: '',
  email: '',
  mobile: '',
  agencyName: '',
  agencyWebsite: '',
  socialMediaLink: '', // required — e.g. Instagram/Facebook page for the agency
  govtIdType: 'Aadhaar', // 'Aadhaar', 'PAN', 'GST', 'Passport'
  govtIdNumber: '',
  yearsExperience: 1,
  bio: '',
  avatar: '',
  verificationDocumentUrl: '',
  rating: 0,
  totalTrips: 0,
  totalBookings: 0,
  rememberMe: false,
  coreCapabilities: ['Snow Expedition Specialists', 'Eco-Friendly Leave-No-Trace', 'Emergency Medical Rescue', 'Naturalist Guided Hiking'],
  bankDetails: {
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    panNumber: '',
  },
};

// Saved display profiles must never authenticate an organizer on startup.
export const loadOrgUser = () => {
  clearOrgData();
  return { ...DEFAULT_ORG_USER, isOnboarded: true };
};

export const saveOrgUser = (state) => {
  ensureOrgDataOwner(state);
  safeSetItem(ORG_USER_KEY, state);
  if (state?.isAuthenticated) {
    safeSetItem('trekigo_active_role', 'organizer');
    try {
      const userState = localStorage.getItem('trekigo_user');
      if (userState) {
        const parsed = JSON.parse(userState);
        // Only clear user session if it belongs to a completely different email/user
        if (parsed?.isAuthenticated && parsed?.email && state?.email && parsed.email !== state.email) {
          safeSetItem('trekigo_user', { ...parsed, isAuthenticated: false });
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
    if (active === 'organizer') {
      localStorage.removeItem('trekigo_active_role');
    }
  }
};

export const loadOrgTrips = () => [];
export const saveOrgTrips = () => {
  try { localStorage.removeItem(ORG_TRIPS_KEY); } catch { /* Storage unavailable. */ }
};
export const loadOrgBookings = () => [];
export const saveOrgBookings = () => {
  try { localStorage.removeItem(ORG_BOOKINGS_KEY); } catch { /* Storage unavailable. */ }
};
export const loadOrgNotifications = () => [];
export const saveOrgNotifications = () => {
  try { localStorage.removeItem(ORG_NOTIFICATIONS_KEY); } catch { /* Storage unavailable. */ }
};
export const loadOrgChats = () => [];
export const saveOrgChats = () => {
  try { localStorage.removeItem(ORG_CHATS_KEY); } catch { /* Storage unavailable. */ }
};
export const loadOrgDarkMode = () => {
  try {
    const val = localStorage.getItem(ORG_DARK_MODE_KEY);
    if (val !== null) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return false; // Light mode by default
};

export const saveOrgDarkMode = (val) => {
  safeSetItem(ORG_DARK_MODE_KEY, val);
};

export const loadOrgPayouts = () => [];
export const saveOrgPayouts = () => {
  try { localStorage.removeItem(ORG_PAYOUTS_KEY); } catch { /* Storage unavailable. */ }
};
