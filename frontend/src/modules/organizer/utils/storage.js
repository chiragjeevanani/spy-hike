import { safeSetItem } from '../../../utils/safeStorage';

const ORG_USER_KEY = 'trekigo_org_user';
const ORG_TRIPS_KEY = 'trekigo_org_trips';
const ORG_BOOKINGS_KEY = 'trekigo_org_bookings';
const ORG_NOTIFICATIONS_KEY = 'trekigo_org_notifications';
const ORG_CHATS_KEY = 'trekigo_org_chats';
const ORG_DARK_MODE_KEY = 'trekigo_org_darkmode';
const ORG_PAYOUTS_KEY = 'trekigo_org_payouts';

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

const DEMO_ORG_TRIPS = [];

const DEMO_ORG_BOOKINGS = [];

export const loadOrgUser = () => {
  try {
    const val = localStorage.getItem(ORG_USER_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return DEFAULT_ORG_USER;
};

export const saveOrgUser = (state) => {
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

export const loadOrgTrips = (orgEmail) => {
  try {
    const val = localStorage.getItem(ORG_TRIPS_KEY);
    if (val) {
      const all = JSON.parse(val);
      return orgEmail ? all.filter(t => t.organizerEmail === orgEmail) : all;
    }
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgTrips = (trips) => {
  safeSetItem(ORG_TRIPS_KEY, trips);
};

export const loadOrgBookings = (orgEmail) => {
  try {
    const val = localStorage.getItem(ORG_BOOKINGS_KEY);
    if (val) {
      const all = JSON.parse(val);
      return orgEmail ? all.filter(b => b.organizerEmail === orgEmail) : all;
    }
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgBookings = (bookings) => {
  safeSetItem(ORG_BOOKINGS_KEY, bookings);
};

export const loadOrgNotifications = () => {
  try {
    const val = localStorage.getItem(ORG_NOTIFICATIONS_KEY);
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return parsed.filter(
          (n) => !n.timestamp || new Date(n.timestamp).getTime() >= thirtyDaysAgo
        );
      }
    }
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgNotifications = (val) => {
  safeSetItem(ORG_NOTIFICATIONS_KEY, val);
};

export const loadOrgChats = () => {
  try {
    const val = localStorage.getItem(ORG_CHATS_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgChats = (val) => {
  safeSetItem(ORG_CHATS_KEY, val);
};

export const loadOrgDarkMode = () => {
  try {
    const val = localStorage.getItem(ORG_DARK_MODE_KEY);
    if (val !== null) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return true;
};

export const saveOrgDarkMode = (val) => {
  safeSetItem(ORG_DARK_MODE_KEY, val);
};

export const loadOrgPayouts = () => {
  try {
    const val = localStorage.getItem(ORG_PAYOUTS_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgPayouts = (val) => {
  safeSetItem(ORG_PAYOUTS_KEY, val);
};

