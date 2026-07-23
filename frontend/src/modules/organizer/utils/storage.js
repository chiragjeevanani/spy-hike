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
  localStorage.setItem(ORG_USER_KEY, JSON.stringify(state));
  if (state?.isAuthenticated) {
    // Single-role session enforcement: clear active customer & admin sessions
    try {
      const userState = localStorage.getItem('trekigo_user');
      if (userState) {
        const parsed = JSON.parse(userState);
        if (parsed?.isAuthenticated) {
          localStorage.setItem('trekigo_user', JSON.stringify({ ...parsed, isAuthenticated: false }));
        }
      }
      const adminState = localStorage.getItem('trekigo_admin_user');
      if (adminState) {
        const parsed = JSON.parse(adminState);
        if (parsed?.isAuthenticated) {
          localStorage.setItem('trekigo_admin_user', JSON.stringify({ ...parsed, isAuthenticated: false }));
        }
      }
    } catch (e) {
      console.error('Error clearing secondary role sessions:', e);
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
  localStorage.setItem(ORG_TRIPS_KEY, JSON.stringify(trips));
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
  localStorage.setItem(ORG_BOOKINGS_KEY, JSON.stringify(bookings));
};

export const loadOrgNotifications = () => {
  try {
    const val = localStorage.getItem(ORG_NOTIFICATIONS_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgNotifications = (val) => {
  localStorage.setItem(ORG_NOTIFICATIONS_KEY, JSON.stringify(val));
};

export const loadOrgChats = () => {
  try {
    const val = localStorage.getItem(ORG_CHATS_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgChats = (val) => {
  localStorage.setItem(ORG_CHATS_KEY, JSON.stringify(val));
};

export const loadOrgDarkMode = () => {
  try {
    const val = localStorage.getItem(ORG_DARK_MODE_KEY);
    if (val !== null) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return true;
};

export const saveOrgDarkMode = (val) => {
  localStorage.setItem(ORG_DARK_MODE_KEY, JSON.stringify(val));
};

export const loadOrgPayouts = () => {
  try {
    const val = localStorage.getItem(ORG_PAYOUTS_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgPayouts = (val) => {
  localStorage.setItem(ORG_PAYOUTS_KEY, JSON.stringify(val));
};
