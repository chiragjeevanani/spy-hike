import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, AlertTriangle } from 'lucide-react';
import { resetPageScroll } from '../../utils/scroll';
import PhoneFrame from './components/PhoneFrame';
import BottomNav from './components/BottomNav';
import DesktopNav from './components/DesktopNav';
import NotificationDrawer from './components/NotificationDrawer';
import Onboarding from './components/Onboarding';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import HomeView from './components/HomeView';
import ExploreView from './components/ExploreView';
import TrekOrganizersView from './components/TrekOrganizersView';
import TrekDetailsView from './components/TrekDetailsView';
import TripDetailsView from './components/TripDetailsView';
import BookingFlow from './components/BookingFlow';
import BookingsView from './components/BookingsView';
import WishlistView from './components/WishlistView';
import ProfileView from './components/ProfileView';
import BookingDetailsView from './components/BookingDetailsView';
import OrganizerProfileView from './components/OrganizerProfileView';
import LoyaltyRewardsView from './components/LoyaltyRewardsView';
import LocationPicker from './components/LocationPicker';
import MapView from './components/MapView';
import LandingView from '../landing/LandingView';
import PrivacyPolicyPage from '../landing/PrivacyPolicyPage';
import SupportPage from '../landing/SupportPage';
import NotFoundPage from '../../components/NotFoundPage';
import treksApi from '../../lib/treksApi';

import {
  loadUserState, saveUserState,
  loadWishlist, saveWishlist,
  loadBookings, saveBookings,
  loadNotifications, saveNotifications,
  loadChats, saveChats,
  loadTrips, saveTrips,
  loadDarkMode, saveDarkMode
} from './utils/storage';
import { slugifyTrekName } from './utils/trekGroups';
import { downloadTicketPDF } from './utils/ticketPdf';
import { syncCustomerVouchers, hydrateCustomerLoyalty } from '../../utils/loyalty';
import { safeSetItem } from '../../utils/safeStorage';
import tripsApi from '../../lib/tripsApi';
import bookingsApi from '../../lib/bookingsApi';
import socialApi from '../../lib/socialApi';
import landingApi from '../../lib/landingApi';
import contentApi from '../../lib/contentApi';
import { getToken, clearToken } from '../../lib/apiClient';
import authApi from '../../lib/authApi';
import { loadLandingContentLocal } from '../landing/landingContent';
import { initPushNotifications } from '../../utils/pushNotifications';
import { requestPushPermission, HikerAlerts } from '../../utils/pushNotificationService';
import { useToast } from '../../components/ToastProvider';

// The traveller app lives entirely under /app (e.g. /app/explore, /app/login);
// the root path (and anything else outside /app, /organizer, /admin) is the
// public marketing Landing page and bypasses onboarding/auth gates entirely.
const APP_PREFIX = '/app';

// Standalone public pages that live outside /app — reachable with zero login
// (unlike everything else, which is gated behind /app's auth/onboarding
// checks below). Raw browser pathname -> the tab that renders it.
const PUBLIC_PAGE_ROUTES = {
  '/privacy-policy': 'PrivacyPolicy',
  '/support': 'SupportPublic',
};

// Deep-linkable Profile sub-pages (each menu item in ProfileView gets a real
// URL). Internal path (post toInternalPath, e.g. '/profile/settings') -> the
// currentSub key ProfileView renders. Absent from this map (or exactly
// '/profile') means the main Profile menu.
const PROFILE_SUB_ROUTES = {
  '/profile/personal-details': 'EDIT_PERSONAL',
  '/profile/athletics': 'EDIT_STATS',
  '/profile/reviews': 'MY_REVIEWS',
  '/profile/settings': 'SETTINGS',
  '/profile/support': 'SUPPORT',
  '/profile/become-organizer': 'BECOME_ORGANIZER',
};
// Reverse lookup used when ProfileView reports a currentSub change so the URL
// can be kept in sync (see onNavigateProfile below).
const PROFILE_SUB_TO_PATH = Object.fromEntries(
  Object.entries(PROFILE_SUB_ROUTES).map(([path, sub]) => [sub, path]),
);

// Raw browser pathname -> internal relative path this router understands
// (e.g. '/app/explore' -> '/explore', '/app' -> '/'). Null means "not under
// /app" — render the Landing page (or one of the standalone public pages
// above, both handled before this ever gets called).
const toInternalPath = (rawPath) => {
  if (rawPath === APP_PREFIX) return '/';
  if (rawPath.startsWith(APP_PREFIX + '/')) return rawPath.slice(APP_PREFIX.length);
  return null;
};

// Internal relative path -> real browser URL (e.g. '/explore' -> '/app/explore').
const toBrowserPath = (internalPath) => (
  internalPath === '/' ? APP_PREFIX : `${APP_PREFIX}${internalPath}`
);

const getInitialStateFromUrl = () => {
  const user = loadUserState();

  let tab = 'Home';
  let trip = null;
  let bookingTrip = null;
  let selectedBooking = null;
  let selectedOrganizer = null;
  let trekName = null;
  let profileSub = null;

  // Standalone public pages (no login, no phone-frame) take priority over
  // everything else — checked against the raw pathname since they live
  // outside /app.
  if (PUBLIC_PAGE_ROUTES[window.location.pathname]) {
    return { tab: PUBLIC_PAGE_ROUTES[window.location.pathname], trip, bookingTrip, selectedBooking, selectedOrganizer, trekName, profileSub };
  }

  // Root path (and anything else outside /app) is the public marketing Landing page.
  const path = toInternalPath(window.location.pathname);
  if (path === null) {
    return { tab: 'Landing', trip, bookingTrip, selectedBooking, selectedOrganizer, trekName, profileSub };
  }

  // 1. Authenticated Profile Setup & Onboarding Gate redirect rules
  if (user.isAuthenticated && path !== '/login' && path !== '/register') {
    if (!user.profileSetupComplete) {
      tab = 'ProfileSetup';
      if (path !== '/profilesetup') {
        const url = toBrowserPath('/profilesetup');
        window.history.replaceState({ path: url }, '', url);
      }
      return { tab, trip, bookingTrip, selectedBooking, selectedOrganizer, trekName };
    } else if (!user.isOnboarded) {
      tab = 'Onboarding';
      if (path !== '/onboardingguide') {
        const url = toBrowserPath('/onboardingguide');
        window.history.replaceState({ path: url }, '', url);
      }
      return { tab, trip, bookingTrip, selectedBooking, selectedOrganizer, trekName };
    }
  }

  // 2. Unauthenticated Gate redirect rules
  if (!user.isAuthenticated) {
    const isProtectedRoute =
      path === '/profile' ||
      path.startsWith('/profile/') ||
      path === '/bookings' ||
      path === '/profilesetup' ||
      path === '/onboardingguide' ||
      path.startsWith('/booking/') ||
      path.startsWith('/book/');

    if (isProtectedRoute) {
      if (path === '/register') {
        tab = 'Register';
      } else {
        tab = 'Login';
        if (path !== '/login') {
          const url = toBrowserPath('/login');
          window.history.replaceState({ path: url }, '', url);
        }
      }
      return { tab, trip, bookingTrip, selectedBooking, selectedOrganizer, trekName };
    }
  }

  // 3. Authenticated, Onboarded & Configured redirect rules
  if (user.isAuthenticated && (path === '/login' || path === '/register' || path === '/onboardingguide' || path === '/profilesetup')) {
    const url = toBrowserPath('/');
    window.history.replaceState({ path: url }, '', url);
    return { tab: 'Home', trip, bookingTrip, selectedBooking, selectedOrganizer, trekName };
  }

  // 4. Normal Tab / Detail routing parsing
  const allTrips = loadTrips();
  const allBookings = loadBookings();

  if (path === '/' || path === '' || path === '/home') {
    tab = 'Home';
  } else if (path === '/explore') {
    tab = 'Explore';
  } else if (path === '/bookings') {
    tab = 'Bookings';
  } else if (path === '/wishlist') {
    tab = 'Wishlist';
  } else if (path === '/profile') {
    tab = 'Profile';
  } else if (PROFILE_SUB_ROUTES[path]) {
    tab = 'Profile';
    profileSub = PROFILE_SUB_ROUTES[path];
  } else if (path.startsWith('/trek/')) {
    const subPath = path.replace('/trek/', '');
    const isOrganizers = subPath.endsWith('/organizers');
    const trekSlug = isOrganizers ? subPath.replace('/organizers', '') : subPath;
    const foundTrip = allTrips.find(t => slugifyTrekName(t.name) === trekSlug);
    if (foundTrip) {
      tab = 'Explore';
      trekName = foundTrip.name;
    }
  } else if (path.startsWith('/trip/')) {
    const tripId = path.replace('/trip/', '');
    const foundTrip = allTrips.find(t => t.id === tripId);
    if (foundTrip) {
      tab = 'Explore';
      trip = foundTrip;
      trekName = foundTrip.name;
    }
  } else if (path.startsWith('/book/')) {
    const tripId = path.replace('/book/', '');
    const foundTrip = allTrips.find(t => t.id === tripId);
    if (foundTrip) {
      tab = 'Explore';
      trip = foundTrip;
      bookingTrip = foundTrip;
      trekName = foundTrip.name;
    }
  } else if (path.startsWith('/booking/')) {
    const bookingId = path.replace('/booking/', '');
    const foundBooking = allBookings.find(b => b.id === bookingId);
    if (foundBooking) {
      tab = 'Bookings';
      selectedBooking = foundBooking;
    }
  } else if (path.startsWith('/organizers/')) {
    const orgNameEncoded = path.replace('/organizers/', '');
    const orgName = decodeURIComponent(orgNameEncoded);
    const foundTrip = allTrips.find(t => t.organizer.name === orgName);
    if (foundTrip) {
      tab = 'Explore';
      selectedOrganizer = foundTrip.organizer;
    }
  } else if (path === '/login') {
    tab = 'Login';
  } else if (path === '/register') {
    tab = 'Register';
  } else {
    tab = 'NotFound';
  }
  return { tab, trip, bookingTrip, selectedBooking, selectedOrganizer, trekName, profileSub };
};

export default function App() {
  const toast = useToast();
  // 1. Core State registers loaded from local persistence
  const [user, setUser] = useState(() => loadUserState());
  const [wishlist, setWishlist] = useState(() => loadWishlist());
  const [bookings, setBookings] = useState(() => loadBookings());
  const [notifications, setNotifications] = useState(() => loadNotifications());
  const [chats, setChats] = useState(() => loadChats());
  // Set when "Message" is tapped from BookingDetailsView, so navigating to
  // Bookings opens that trip's chat drawer immediately instead of just
  // landing on the list. BookingsView clears it once the drawer is open.
  const [pendingChatTripId, setPendingChatTripId] = useState(null);
  // Admin-managed marketing content for the public landing page. Seeded from
  // the same-origin localStorage cache (so offline admin edits show at once),
  // then refreshed from the public endpoint when the backend is reachable.
  const [landingContent, setLandingContent] = useState(loadLandingContentLocal);
  const [trips, setTrips] = useState(() => loadTrips());
  const [tripsLoading, setTripsLoading] = useState(true);
  // Mirrors tripsLoading/bookingsLoading for the trek catalog and the
  // customer's booking roster — used so a deep-linked /trek, /book,
  // /booking or /organizers route isn't declared "not found" (and bounced
  // to Home) just because its backing list hasn't finished its first fetch
  // yet. See the route-resolution reconciliation effect below.
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(() => user.isAuthenticated);
  const [darkMode, setDarkMode] = useState(() => loadDarkMode());
  const [bannedAlert, setBannedAlert] = useState(false);
  const [bannedReason, setBannedReason] = useState('banned');
  // Support contact shown on the deactivated/banned overlay — admin-editable
  // via the CMS (see lib/contentApi.js), with sane fallback defaults.
  const [supportContact, setSupportContact] = useState({ email: 'support@findyourtrek.com', phone: '+91 99999 88888' });
  const [redirectAfterAuth, setRedirectAfterAuth] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showGlobalNotificationDrawer, setShowGlobalNotificationDrawer] = useState(false);
  // Hides the bottom nav while a tab renders a fullscreen flow (e.g. the
  // "Become an Organizer" application form inside Profile).
  const [navHidden, setNavHidden] = useState(false);

  // 2. Navigation registers initialized from URL
  const [activeTab, setActiveTab] = useState(() => getInitialStateFromUrl().tab);
  const [selectedTrip, setSelectedTrip] = useState(() => getInitialStateFromUrl().trip);
  const [activeBookingTrip, setActiveBookingTrip] = useState(() => getInitialStateFromUrl().bookingTrip);
  const [selectedBooking, setSelectedBooking] = useState(() => getInitialStateFromUrl().selectedBooking);
  const [selectedOrganizer, setSelectedOrganizer] = useState(() => getInitialStateFromUrl().selectedOrganizer);
  const [selectedTrekName, setSelectedTrekName] = useState(() => getInitialStateFromUrl().trekName);
  const [showOrganizersList, setShowOrganizersList] = useState(() => {
    const p = window.location.pathname;
    return p.startsWith('/trek/') && p.endsWith('/organizers');
  });
  const [catalogTreks, setCatalogTreks] = useState([]);
  // Which Profile sub-page is deep-linked (e.g. '/app/profile/settings') —
  // null means the main Profile menu. Kept in sync with the URL both ways:
  // ProfileView reads it as `initialSub` and reports taps back via
  // `onNavigateProfile` so the browser's back button works as expected.
  const [profileSub, setProfileSub] = useState(() => getInitialStateFromUrl().profileSub);
  const [showLoyalty, setShowLoyalty] = useState(false);

  // 3. Search & Filter & Location dynamic bindings to propagate to Explore tab
  const [exploreSearchQuery, setExploreSearchQuery] = useState('');
  const [exploreCategory, setExploreCategory] = useState('All');
  // Departure-date filter ('' = off) — set from the Home calendar, applied in Explore.
  const [exploreDate, setExploreDate] = useState('');
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const v = localStorage.getItem('trekigo_location');
      if (v) return JSON.parse(v);
    } catch (e) {}
    return { label: 'India' };
  });
  const [showAppLocationPicker, setShowAppLocationPicker] = useState(false);

  const handleSelectUserLocation = (loc) => {
    setUserLocation(loc);
    try { localStorage.setItem('trekigo_location', JSON.stringify(loc)); } catch (e) {}
    setShowAppLocationPicker(false);
  };

  const navigateTo = (path, replace = false, currentUser = user) => {
    const url = toBrowserPath(path);
    if (replace) {
      window.history.replaceState({ path: url }, '', url);
    } else {
      window.history.pushState({ path: url }, '', url);
    }
    if (url && url !== '/' && url !== '/login') {
      safeSetItem('trekigo_last_route', url);
    }
    handleRouteChange(currentUser);
  };

  // Navigates to a standalone public page that lives outside /app (Privacy
  // Policy, Support) — a raw pathname, not run through toBrowserPath.
  const navigateToPublic = (rawPath) => {
    window.history.pushState({ path: rawPath }, '', rawPath);
    handleRouteChange();
  };

  // ProfileView reports every currentSub change here so the URL stays in
  // sync (deep-linkable, refresh-safe, back-button-friendly). 'MAIN' maps to
  // plain /profile; anything else maps through PROFILE_SUB_TO_PATH.
  const navigateProfileSub = (sub) => {
    navigateTo(sub === 'MAIN' || !PROFILE_SUB_TO_PATH[sub] ? '/profile' : PROFILE_SUB_TO_PATH[sub]);
  };

  const handleRouteChange = (currentUser = user) => {
    // Every navigation should open a page at the top, like a fresh screen —
    // not wherever the previous page happened to be scrolled to. Most tabs
    // (Home, Profile, ...) share #root as their actual scroll surface rather
    // than an internal overflow-y-auto container, so an SPA tab swap
    // otherwise leaves the new page's DOM sitting at the old scroll offset.
    resetPageScroll();

    // Standalone public pages (no login, no phone-frame) take priority over
    // everything else — checked against the raw pathname since they live
    // outside /app.
    if (PUBLIC_PAGE_ROUTES[window.location.pathname]) {
      setActiveTab(PUBLIC_PAGE_ROUTES[window.location.pathname]);
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
      setProfileSub(null);
      return;
    }

    // Root (and anything else outside /app) is the public marketing Landing page — bypasses all gates.
    const path = toInternalPath(window.location.pathname);
    setProfileSub(null); // default; overridden below for /profile/* routes
    if (path === null) {
      setActiveTab('Landing');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
      return;
    }

    // Redirect rules based on user auth/onboard states
    if (currentUser.isAuthenticated && path !== '/login' && path !== '/register') {
      if (!currentUser.profileSetupComplete) {
        setActiveTab('ProfileSetup');
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
        setSelectedTrekName(null);
        if (path !== '/profilesetup') {
          navigateTo('/profilesetup', true, currentUser);
        }
        return;
      } else if (!currentUser.isOnboarded) {
        setActiveTab('Onboarding');
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
        setSelectedTrekName(null);
        if (path !== '/onboardingguide') {
          navigateTo('/onboardingguide', true, currentUser);
        }
        return;
      }
    }

    // 2. Auth Gate redirect rules (only protect profile, bookings, and booking/checkout paths)
    if (!currentUser.isAuthenticated) {
      const isProtectedRoute =
        path === '/profile' ||
        path.startsWith('/profile/') ||
        path === '/bookings' ||
        path === '/profilesetup' ||
        path === '/onboardingguide' ||
        path.startsWith('/booking/') ||
        path.startsWith('/book/');

      if (isProtectedRoute) {
        setRedirectAfterAuth(path);

        if (path === '/register') {
          setActiveTab('Register');
          setSelectedTrip(null);
          setActiveBookingTrip(null);
          setSelectedBooking(null);
          setSelectedOrganizer(null);
          setSelectedTrekName(null);
        } else {
          setActiveTab('Login');
          setSelectedTrip(null);
          setActiveBookingTrip(null);
          setSelectedBooking(null);
          setSelectedOrganizer(null);
          setSelectedTrekName(null);
          if (path !== '/login') {
            navigateTo('/login', true, currentUser);
          }
        }
        return;
      }
    }

    // Authenticated & Onboarded: Redirect away from onboarding guide or profile setup if already complete
    if (currentUser.isAuthenticated && currentUser.profileSetupComplete && currentUser.isOnboarded && (path === '/onboardingguide' || path === '/profilesetup')) {
      navigateTo('/', true, currentUser);
      return;
    }

    // Normal paths parsing
    if (path === '/' || path === '') {
      setActiveTab('Home');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
    } else if (path === '/explore') {
      setActiveTab('Explore');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
    } else if (path === '/bookings') {
      setActiveTab('Bookings');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
    } else if (path === '/wishlist') {
      setActiveTab('Wishlist');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
    } else if (path === '/profile') {
      setActiveTab('Profile');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
    } else if (PROFILE_SUB_ROUTES[path]) {
      setActiveTab('Profile');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
      setProfileSub(PROFILE_SUB_ROUTES[path]);
    } else if (path.startsWith('/trek/')) {
      const subPath = path.replace('/trek/', '');
      const isOrganizers = subPath.endsWith('/organizers');
      const trekSlug = isOrganizers ? subPath.replace('/organizers', '') : subPath;
      const foundTrip = trips.find(t => slugifyTrekName(t.name) === trekSlug);
      const foundCatalog = catalogTreks.find(ct => slugifyTrekName(ct.title || ct.name || '') === trekSlug || ct.id === trekSlug);
      const targetName = foundTrip ? foundTrip.name : (foundCatalog ? (foundCatalog.title || foundCatalog.name) : null);
      if (targetName) {
        setSelectedTrekName(targetName);
        setShowOrganizersList(isOrganizers);
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
      } else if (tripsLoading || catalogLoading) {
        // Catalog hasn't finished its first fetch yet (e.g. a fresh reload
        // triggered by the native back gesture / the app resuming from the
        // background) — a miss here doesn't mean the trek doesn't exist, so
        // don't bounce to Home over it. The reconciliation effect below
        // re-runs this once the catalog lands.
      } else {
        navigateTo('/', true, currentUser);
      }
    } else if (path.startsWith('/trip/')) {
      const tripId = path.replace('/trip/', '');
      const foundTrip = trips.find(t => t.id === tripId);
      if (foundTrip) {
        setSelectedTrip(foundTrip);
        setSelectedTrekName(foundTrip.name);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
      } else if (tripsLoading) {
        setSelectedTrip({ id: tripId, isLoading: true });
        setSelectedTrekName(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
      } else {
        navigateTo('/', true, currentUser);
      }
    } else if (path.startsWith('/book/')) {
      const tripId = path.replace('/book/', '');
      const foundTrip = trips.find(t => t.id === tripId);
      if (foundTrip) {
        setSelectedTrip(foundTrip);
        setSelectedTrekName(foundTrip.name);
        setActiveBookingTrip(foundTrip);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
      } else if (tripsLoading) {
        // See the /trip/ branch above — don't bounce to Home while the
        // catalog is still loading.
      } else {
        navigateTo('/', true, currentUser);
      }
    } else if (path.startsWith('/booking/')) {
      const bookingId = path.replace('/booking/', '');
      const foundBooking = bookings.find(b => b.id === bookingId);
      if (foundBooking) {
        setActiveTab('Bookings');
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(foundBooking);
        setSelectedOrganizer(null);
        setSelectedTrekName(null);
      } else if (bookingsLoading) {
        // Don't bounce away while this customer's booking roster is still
        // being fetched — a cache miss here is often just a timing race.
      } else {
        navigateTo('/bookings', true, currentUser);
      }
    } else if (path.startsWith('/organizers/')) {
      const orgNameEncoded = path.replace('/organizers/', '');
      const orgName = decodeURIComponent(orgNameEncoded);
      const foundTrip = trips.find(t => t.organizer.name === orgName);
      if (foundTrip) {
        setSelectedOrganizer(foundTrip.organizer);
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedTrekName(null);
      } else if (tripsLoading) {
        // Don't bounce to Home while the catalog is still loading.
      } else {
        navigateTo('/', true, currentUser);
      }
    } else if (path === '/login') {
      setActiveTab('Login');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
    } else if (path === '/register') {
      setActiveTab('Register');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
    } else {
      setActiveTab('NotFound');
      setSelectedTrip(null);
      setActiveBookingTrip(null);
      setSelectedBooking(null);
      setSelectedOrganizer(null);
      setSelectedTrekName(null);
    }
  };

  // handleRouteChange is redefined every render (it closes over trips,
  // bookings, catalogTreks, tripsLoading, user, ...). Routing it through a
  // ref rather than re-subscribing the listener on a hand-picked dependency
  // list guarantees popstate — fired by the native back button on Android
  // and the edge-swipe gesture on iOS, not just this app's own back buttons
  // — always runs against the LATEST data. A stale closure here (e.g. one
  // still holding an empty catalogTreks from before it finished loading)
  // was making a real trek/trip look "not found" and silently redirecting
  // to Home, which is exactly what showed up as native-back "flickering
  // back to the home page" instead of the previous screen.
  const handleRouteChangeRef = useRef(handleRouteChange);
  handleRouteChangeRef.current = handleRouteChange;

  useEffect(() => {
    const onPopState = () => handleRouteChangeRef.current();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // One-time reconciliation: if the very first attempt to resolve a
  // data-driven deep link (/trek, /trip, /book, /booking, /organizers) ran
  // before its backing list had finished loading, the guards above leave it
  // unresolved rather than wrongly redirecting to Home. Once every relevant
  // list has finished its first fetch, re-run the router once against the
  // current URL to pick up anything that was left pending.
  const routeReconciledRef = useRef(false);
  useEffect(() => {
    if (tripsLoading || catalogLoading || bookingsLoading) return;
    if (routeReconciledRef.current) return;
    routeReconciledRef.current = true;

    const path = toInternalPath(window.location.pathname);
    if (!path) return;
    const stillUnresolved =
      (path.startsWith('/trek/') && !selectedTrekName) ||
      (path.startsWith('/trip/') && !selectedTrip) ||
      (path.startsWith('/book/') && !activeBookingTrip) ||
      (path.startsWith('/booking/') && !selectedBooking) ||
      (path.startsWith('/organizers/') && !selectedOrganizer);
    if (stillUnresolved) handleRouteChangeRef.current();
  }, [tripsLoading, catalogLoading, bookingsLoading]);

  // Sync state mutations to LocalStorage standard hooks
  useEffect(() => {
    saveUserState(user);
  }, [user]);

  // Opt into web push once signed in — no-ops silently if unsupported/denied.
  useEffect(() => {
    if (user.isAuthenticated) initPushNotifications();
  }, [user.isAuthenticated]);

  useEffect(() => {
    saveWishlist(wishlist);
  }, [wishlist]);

  useEffect(() => {
    saveBookings(bookings);
    // For a real (token) session, pull the server's authoritative voucher
    // ledger into the cache; otherwise mint client-side from the local roster
    // (offline/seeded). Re-runs whenever the booking roster changes.
    if (getToken()) hydrateCustomerLoyalty();
    else syncCustomerVouchers(bookings);
  }, [bookings]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    contentApi.getContent().then((c) => {
      if (c?.support) setSupportContact({ email: c.support.email, phone: c.support.phone });
    });
  }, []);

  // TripDetailsView maps straight over these arrays, so they must always be
  // arrays — a trip opened from a card has none of them until hydration lands
  // (and never, if that request fails). Guarding here keeps one helper honest
  // instead of ten call sites in the view.
  const tripWithDetailDefaults = useMemo(() => {
    if (!selectedTrip) return selectedTrip;
    const filled = { ...selectedTrip };
    for (const key of ['itinerary', 'faqs', 'reviews', 'included', 'notIncluded', 'highlights', 'safetyGuidelines', 'cancellationPolicy']) {
      if (!Array.isArray(filled[key])) filled[key] = [];
    }
    // The cover always exists on a card, so the gallery has something to show
    // rather than flashing an empty "1 / 0 Photos" carousel mid-hydration.
    if (!Array.isArray(filled.galleryImages) || filled.galleryImages.length === 0) {
      filled.galleryImages = filled.coverImage ? [filled.coverImage] : [];
    }
    return filled;
  }, [selectedTrip]);

  // Catalog list responses omit detail-only fields (itinerary, faqs, reviews,
  // gallery, inclusions) so browsing stays light. A record opened from a card
  // therefore arrives partial — fetch the full document once the detail screen
  // is actually on screen. apiClient caches and de-duplicates these, so
  // re-opening the same trip costs nothing.
  useEffect(() => {
    const id = selectedTrip?.id;
    if (!id || selectedTrip.itinerary !== undefined) return undefined;
    let cancelled = false;
    tripsApi.getTrip(id)
      .then((full) => {
        if (cancelled || !full) return;
        setSelectedTrip((prev) => (prev?.id === id ? { ...prev, ...full } : prev));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedTrip?.id, selectedTrip?.itinerary]);

  // Same for the trek detail screen, which reads from the projected catalog.
  const [hydratedTrek, setHydratedTrek] = useState(null);
  useEffect(() => {
    if (!selectedTrekName) { setHydratedTrek(null); return undefined; }
    const match = catalogTreks.find(
      ct => (ct.title || ct.name) === selectedTrekName || ct.id === slugifyTrekName(selectedTrekName)
    );
    if (!match) { setHydratedTrek(null); return undefined; }
    if (match.itinerary !== undefined) { setHydratedTrek(match); return undefined; }
    let cancelled = false;
    treksApi.getTrek(match.id)
      .then((full) => { if (!cancelled && full) setHydratedTrek(full); })
      .catch(() => { if (!cancelled) setHydratedTrek(match); });
    return () => { cancelled = true; };
  }, [selectedTrekName, catalogTreks]);

  useEffect(() => {
    const handleStatusChangeEvent = (e) => {
      const reason = e.detail?.reason || 'banned';
      setBannedReason(reason);
      handleLogoutResets();
      setBannedAlert(true);
    };
    window.addEventListener('hiker-status-changed', handleStatusChangeEvent);
    return () => window.removeEventListener('hiker-status-changed', handleStatusChangeEvent);
  }, []);

  // The stored JWT was rejected (expired, or signed with a different secret).
  // apiClient has already dropped it; end the local session too so the user
  // lands on login instead of a zombie "signed in" state where every authed
  // call 401s.
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!loadUserState().isAuthenticated) return;
      setBannedReason('expired');
      handleLogoutResets();
      setBannedAlert(true);
    };
    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth-session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    saveTrips(trips);
  }, [trips]);

  // Hydrate the catalog from the API on mount. Trips become the source of
  // truth (published only); the saveTrips effect above mirrors them into
  // localStorage so the synchronous route-parser (loadTrips) stays in sync.
  // Falls back silently to the seeded/local trips if the backend is offline.
  useEffect(() => {
    let cancelled = false;
    tripsApi
      .listTrips({ limit: 100 })
      .then((apiTrips) => {
        if (!cancelled && Array.isArray(apiTrips)) setTrips(apiTrips);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTripsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Hydrate this customer's bookings from the API once authenticated. Only
  // replaces state when the API returns some (so localStorage-seeded specs and
  // the offline fallback keep working); the saveBookings effect mirrors them
  // back to localStorage for the synchronous route-parser.
  useEffect(() => {
    if (!user.isAuthenticated) { setBookingsLoading(false); return undefined; }
    setBookingsLoading(true);
    let cancelled = false;
    bookingsApi
      .listMine()
      .then((list) => { if (!cancelled && Array.isArray(list) && list.length) setBookings(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBookingsLoading(false); });
    return () => { cancelled = true; };
  }, [user.isAuthenticated]);

  const knownHikerMsgCountRef = useRef(null);
  const knownHikerNotifCountRef = useRef(null);

  // Live polling interval for instant real-time push alerts of notifications & messages for Hikers
  useEffect(() => {
    if (!user.isAuthenticated || !getToken()) return;

    requestPushPermission();

    const pollHikerUpdates = async () => {
      try {
        // 1. Live Sync Hiker Notifications
        const freshNotifs = await socialApi.getNotifications();
        if (Array.isArray(freshNotifs)) {
          if (knownHikerNotifCountRef.current !== null && freshNotifs.length > knownHikerNotifCountRef.current) {
            const latestNotif = freshNotifs[0];
            if (latestNotif && !latestNotif.read) {
              HikerAlerts.tripNotice(latestNotif.title, latestNotif.content, toast);
            }
          }
          knownHikerNotifCountRef.current = freshNotifs.length;
          setNotifications(freshNotifs);
          saveNotifications(freshNotifs);
        }

        // 2. Live Sync Incoming Organizer Messages
        const freshChats = await socialApi.getChats();
        if (Array.isArray(freshChats)) {
          if (knownHikerMsgCountRef.current !== null) {
            freshChats.forEach(chat => {
              const cId = String(chat.id || chat._id);
              const orgMsgs = (chat.messages || []).filter(m => m.sender === 'organizer');
              const prevCount = knownHikerMsgCountRef.current.get(cId) || 0;

              if (orgMsgs.length > prevCount) {
                const latestOrgMsg = orgMsgs[orgMsgs.length - 1];
                if (latestOrgMsg) {
                  HikerAlerts.newMessage(chat.organizerName || chat.agencyName || 'Organizer', latestOrgMsg.text, toast);
                }
              }
            });
          }

          const newCounts = new Map();
          freshChats.forEach(c => {
            const cId = String(c.id || c._id);
            const orgMsgs = (c.messages || []).filter(m => m.sender === 'organizer');
            newCounts.set(cId, orgMsgs.length);
          });
          knownHikerMsgCountRef.current = newCounts;
          setChats(freshChats);
          saveChats(freshChats);
        }
      } catch (err) {
        /* Ignore background polling errors */
      }
    };

    pollHikerUpdates();
    const timer = setInterval(pollHikerUpdates, 5000);
    return () => clearInterval(timer);
  }, [user.isAuthenticated]);

  // Public landing-page content — fetched once on mount (no auth) so the
  // marketing page reflects whatever the admin has published in the CMS.
  useEffect(() => {
    let cancelled = false;
    try {
      sessionStorage.setItem('fyt_last_module', 'hiker');
      localStorage.setItem('fyt_last_module', 'hiker');
    } catch (e) {}
    landingApi.getContent().then((c) => { if (!cancelled && c) setLandingContent(c); }).catch(() => {});
    treksApi.listTreks()
      .then((list) => { if (!cancelled && Array.isArray(list)) setCatalogTreks(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    saveDarkMode(darkMode);
  }, [darkMode]);

  // Core Actions
  const handleToggleWishlist = (tripId) => {
    const next = wishlist.includes(tripId)
      ? wishlist.filter(id => id !== tripId)
      : [...wishlist, tripId];
    setWishlist(next);
    // Persist to the API for a real session (localStorage mirror still updates
    // via the saveWishlist effect for the offline/seeded path).
    if (getToken()) socialApi.setWishlist(next).catch(() => {});
  };

  const handleApplyCategoryFromHome = (catName) => {
    setExploreCategory(catName);
    setExploreSearchQuery(''); // clear main search query to prevent clash
  };

  const handleApplySearchFromHome = (query) => {
    setExploreSearchQuery(query);
    setExploreCategory('All'); // clear category to prevent block
  };

  // Complete Profile Setup setup helper
  const handleCompleteProfileSetup = (updatedUser) => {
    const updated = {
      ...user,
      ...updatedUser,
      profileSetupComplete: true
    };
    setUser(updated);
    navigateTo('/onboardingguide', false, updated);
  };

  // Complete Onboarding walkthrough helper
  const handleCompleteOnboardingWalkthrough = async () => {
    try {
      const updatedUser = await authApi.updateProfile({ isOnboarded: true });
      setUser(updatedUser);
      navigateTo('/', false, updatedUser);
    } catch (err) {
      console.error('Failed to save onboarding completion:', err);
      const updated = {
        ...user,
        isOnboarded: true
      };
      setUser(updated);
      navigateTo('/', false, updated);
    }
  };

  // Sign In success
  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    if (redirectAfterAuth) {
      navigateTo(redirectAfterAuth, false, authenticatedUser);
      setRedirectAfterAuth(null);
    } else {
      navigateTo('/', false, authenticatedUser);
    }
  };

  // Logout session resets
  const handleLogoutResets = () => {
    // Drop the JWT too — leaving it behind means the next sign-in carries a
    // stale token, and any authed call made before re-login 401s.
    clearToken();
    const resetUser = {
      isAuthenticated: false,
      isOnboarded: true, // Keep onboarding done — logout should land on the login screen, not the onboarding carousel
      isOrganizer: false,
      name: '',
      email: '',
      mobile: '',
      age: 24,
      gender: '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      hikingExperience: 'Beginner',
      fitnessLevel: 'Moderate',
      emergencyContact: '',
      rememberMe: false
    };
    setUser(resetUser);
    navigateTo('/login', true, resetUser);
  };

  // Add review to data dynamically so it displays inside reviews tab instantly
  const handleAddReviewToTrip = (tripId, rating, comment, bookingId) => {
    const newRatingReview = {
      id: 'rev-' + Date.now(),
      userName: user.name || 'Chirag Jeevanani',
      userAvatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      rating,
      comment,
      date: new Date().toISOString().split('T')[0]
    };

    // Optimistic local update (immediate UX + offline path).
    const updatedTrips = trips.map(item => {
      if (item.id === tripId) {
        // `reviews` is absent on catalog list records — it only ships on the
        // single-trip detail response.
        const updatedReviewsList = [newRatingReview, ...(item.reviews || [])];
        const totalRatingPoints = updatedReviewsList.reduce((acc, r) => acc + r.rating, 0);
        const newAveragedRating = Math.round((totalRatingPoints / updatedReviewsList.length) * 10) / 10;
        return { ...item, reviews: updatedReviewsList, reviewsCount: updatedReviewsList.length, rating: newAveragedRating };
      }
      return item;
    });
    setTrips(updatedTrips);

    // Persist server-side (the trip's rollups are recomputed authoritatively);
    // refresh the catalog so the averaged rating reflects the server.
    if (getToken() && bookingId) {
      socialApi.createReview(bookingId, { rating, comment })
        .then(() => Promise.all([
          tripsApi.listTrips({ limit: 100 }),
          socialApi.listMyReviews().catch(() => null),
        ]))
        .then(([apiTrips, myReviews]) => {
          if (Array.isArray(apiTrips) && apiTrips.length) setTrips(apiTrips);
          if (Array.isArray(myReviews)) setUserReviews(myReviews);
        })
        .catch(() => {});
    }
  };

  // Handle finalize successful booking setup
  const handleFinalizeBookingSetup = (rawBooking) => {
    // Stamp the booker's identity onto the record — without this, the booking
    // has no userEmail/userName at all, which breaks admin's per-user booking
    // history (it can't tell who booked what).
    const resolvedBooking = {
      ...rawBooking,
      userEmail: user.email,
      userName: user.name || 'Chirag Jeevanani',
      hikersCount: rawBooking.hikersCount ?? rawBooking.travelersCount,
    };

    // 1. Append booking object to local roster list
    setBookings(prev => [resolvedBooking, ...prev]);

    // For a real (token) session the server already emits the booking
    // notifications + welcome chat, and the social hydration effect (keyed on
    // bookings.length) pulls them in — so skip the local fabrication to avoid
    // duplicates. The offline/seeded path still builds them below.
    if (getToken()) { navigateTo('/bookings'); return; }

    // 2. Generate customized push alerts inside Notification Center stream
    const confirmAlert = {
      id: 'n-new-confirm-' + Date.now(),
      title: '⛰️ Permit Slot Secured!',
      content: `Your high elevation pass to ${resolvedBooking.tripName} is active for ${resolvedBooking.selectedDate}. Booking ID: ${resolvedBooking.bookingId}`,
      timestamp: new Date().toISOString(),
      type: 'Booking',
      read: false
    };

    const paymentAlert = {
      id: 'n-new-pay-' + Date.now(),
      title: '💳 Refund Settlement Rules',
      content: `Total fee settlement values of ₹${resolvedBooking.finalAmount} was secured successfully is secure. Check your ledger files.`,
      timestamp: new Date().toISOString(),
      type: 'Payment',
      read: false
    };

    setNotifications(prev => [confirmAlert, paymentAlert, ...prev]);

    // 3. Auto-populate chat with organizer
    const welcomeMsg = `Hi Chirag! Verified guides from ${resolvedBooking.organizerName} have received your pass application. Looking forward to hiking soon!`;
    const newOrganizerMsg = {
      id: 'm-new-start-' + Date.now(),
      sender: 'organizer',
      text: welcomeMsg,
      timestamp: new Date().toISOString()
    };

    const existingChatSession = chats.find(c => c.tripId === resolvedBooking.tripId);
    if (existingChatSession) {
      const updatedMessages = [...existingChatSession.messages, newOrganizerMsg];
      setChats(prev => prev.map(c => 
        c.tripId === resolvedBooking.tripId ? { ...c, messages: updatedMessages } : c
      ));
    } else {
      const newChatSession = {
        tripId: resolvedBooking.tripId,
        organizerName: resolvedBooking.organizerName,
        organizerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        messages: [newOrganizerMsg]
      };
      setChats(prev => [...prev, newChatSession]);
    }

    // 4. Return viewport to listings or details cleanly
    navigateTo('/bookings');
  };

  // Switch Booking slot states (e.g. Cancel slots)
  const handleModifyBookingStatus = (bookingId, status) => {
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status: status } : b
    ));

    // For a real session, cancellation is server-authoritative: it computes the
    // policy refund, frees the seats, and emits the notification. Refresh
    // bookings + notifications from the API afterward.
    if (status === 'Cancelled' && getToken()) {
      const bObj = bookings.find(b => b.id === bookingId);
      bookingsApi.cancel(bObj?.bookingId || bObj?.id || bookingId)
        .then(() => Promise.all([bookingsApi.listMine(), socialApi.getNotifications()]))
        .then(([bs, ns]) => {
          if (Array.isArray(bs)) setBookings(bs);
          if (Array.isArray(ns)) setNotifications(ns);
        })
        .catch(() => {});
      return;
    }

    // Offline/seeded fallback: fabricate the cancellation notice locally.
    if (status === 'Cancelled') {
      const bObj = bookings.find(b => b.id === bookingId);
      const cancelNotify = {
        id: 'n-cancel-' + Date.now(),
        title: '⚠️ Registration Cancelled',
        content: `Your slot configuration for ${bObj?.tripName || 'hiking trip'} has been cancelled. Refunds will reach your credit bank.`,
        timestamp: new Date().toISOString(),
        type: 'Updates',
        read: false
      };
      setNotifications(prev => [cancelNotify, ...prev]);
    }
  };

  const handleMarkNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (getToken()) socialApi.markNotificationRead(id).catch(() => {});
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Sends a customer chat message to the organizer. For a real (token) session
  // this posts to the API (which creates the thread if needed) and swaps in the
  // authoritative chat; it resolves to that chat. Returns null for the
  // offline/seeded path so BookingsView keeps its local simulated reply.
  const handleSendChatMessage = useCallback(async (tripId, text) => {
    if (!getToken()) return null;
    try {
      const chat = await socialApi.sendMessage(tripId, text);
      setChats((prev) => {
        const exists = prev.some((c) => c.tripId === chat.tripId);
        return exists ? prev.map((c) => (c.tripId === chat.tripId ? chat : c)) : [...prev, chat];
      });
      return chat;
    } catch {
      return null;
    }
  }, []);

  // The customer's own reviews, fetched from the server.
  //
  // This used to scan every trip's embedded `reviews[]` for one whose
  // userName matched the signed-in user. That broke once list responses
  // stopped shipping `reviews` — and it was already wrong, since two
  // customers sharing a display name saw each other's reviews.
  const [userReviews, setUserReviews] = useState([]);
  useEffect(() => {
    if (!user.isAuthenticated || !getToken()) { setUserReviews([]); return undefined; }
    let cancelled = false;
    socialApi.listMyReviews()
      .then((list) => { if (!cancelled) setUserReviews(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) setUserReviews([]); });
    return () => { cancelled = true; };
  }, [user.isAuthenticated, user.email]);

  // Global toggle theme function
  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleTriggerOnboardingWalkthrough = () => {
    setUser(prev => ({ ...prev, isOnboarded: false }));
  };

  // Helper selectors rendering view states inside viewport
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <HomeView
            user={user}
            trips={trips}
            tripsLoading={tripsLoading}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onSelectTrek={(trekName) => navigateTo(`/trek/${slugifyTrekName(trekName)}`)}
            onSwitchTab={(tab) => navigateTo(tab === 'Home' ? '/' : `/${tab.toLowerCase()}`)}
            onApplyCategory={handleApplyCategoryFromHome}
            onApplySearch={handleApplySearchFromHome}
            onApplyDate={setExploreDate}
            onOpenLoyalty={() => setShowLoyalty(true)}
            bookings={bookings}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            onClearNotifications={handleClearNotifications}
            userLocation={userLocation}
            onSelectLocation={handleSelectUserLocation}
            onOpenLocationPicker={() => setShowAppLocationPicker(true)}
            onOpenNotifications={() => setShowGlobalNotificationDrawer(true)}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
          />
        );
      case 'Explore':
        return (
          <ExploreView
            trips={trips}
            tripsLoading={tripsLoading}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onSelectTrek={(trekName) => navigateTo(`/trek/${slugifyTrekName(trekName)}`)}
            searchQuery={exploreSearchQuery}
            onSetSearchQuery={setExploreSearchQuery}
            selectedCategory={exploreCategory}
            onSetCategory={setExploreCategory}
            selectedDate={exploreDate}
            onSetDate={setExploreDate}
            userLocation={userLocation}
            onSelectLocation={handleSelectUserLocation}
            onOpenLocationPicker={() => setShowAppLocationPicker(true)}
            darkMode={darkMode}
          />
        );
      case 'Bookings':
        return (
          <BookingsView
            bookings={bookings}
            trips={trips}
            onSelectTrip={(t) => navigateTo(`/trip/${t.id}`)}
            chats={chats}
            onSaveChats={setChats}
            onSendChatMessage={handleSendChatMessage}
            onModifyBookingStatus={handleModifyBookingStatus}
            onAddReview={handleAddReviewToTrip}
            onSelectBooking={(b) => navigateTo(`/booking/${b.id}`)}
            initialChatTripId={pendingChatTripId}
            onChatOpened={() => setPendingChatTripId(null)}
            darkMode={darkMode}
          />
        );
      case 'Wishlist':
        return (
          <WishlistView
            wishlist={wishlist}
            trips={trips}
            onToggleWishlist={handleToggleWishlist}
            onSelectTrip={(t) => navigateTo(`/trip/${t.id}`)}
            onTriggerBooking={(t) => navigateTo(`/book/${t.id}`)}
            darkMode={darkMode}
          />
        );
      case 'Profile':
        return (
          <ProfileView
            user={user}
            onUpdateUser={setUser}
            onLogout={handleLogoutResets}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            userReviews={userReviews}
            onTriggerOnboarding={handleTriggerOnboardingWalkthrough}
            bookings={bookings}
            onFullscreenChange={setNavHidden}
            onOpenLoyalty={() => setShowLoyalty(true)}
            initialSub={profileSub}
            onNavigateProfile={navigateProfileSub}
            onOpenPrivacyPolicy={() => navigateToPublic('/privacy-policy')}
          />
        );
      default:
        return null;
    }
  };

  if (activeTab === 'PrivacyPolicy') {
    return <PrivacyPolicyPage darkMode={darkMode} />;
  }
  if (activeTab === 'SupportPublic') {
    return <SupportPage darkMode={darkMode} />;
  }
  if (activeTab === 'NotFound') {
    return <NotFoundPage onGoHome={() => navigateTo('/')} darkMode={darkMode} />;
  }

  return activeTab === 'Landing' ? (
    <LandingView
      content={landingContent}
      darkMode={darkMode}
      onToggleDarkMode={handleToggleDarkMode}
      onLaunchApp={() => navigateTo('/')}
      onLaunchOrganizer={() => { window.location.href = '/organizer'; }}
      onLaunchAdmin={() => { window.location.href = '/admin'; }}
    />
  ) : (
    <PhoneFrame darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode}>
      
      {!user.isAuthenticated ? (
        <Auth 
          onSuccess={handleAuthSuccess} 
          darkMode={darkMode} 
          initialMode={activeTab === 'Register' ? 'REGISTER' : 'LOGIN_EMAIL'}
          onSwitchToRegister={() => navigateTo('/register')}
          onSwitchToLogin={() => navigateTo('/login')}
        />
      ) : !user.profileSetupComplete ? (
        <ProfileSetup
          user={user}
          onComplete={handleCompleteProfileSetup}
          darkMode={darkMode}
        />
      ) : !user.isOnboarded ? (
        <Onboarding 
          onComplete={handleCompleteOnboardingWalkthrough} 
          darkMode={darkMode} 
        />
      ) : (
        // No overflow-x-hidden — see PhoneFrame.jsx for why that silently
        // turns a div into its own accidental scroll container.
        <div className="flex-1 flex flex-col min-h-screen relative w-full">
          {/* Top navigation header on tablet and desktop screens */}
          <DesktopNav
            activeTab={activeTab}
            onChangeTab={(tab) => {
              navigateTo(tab === 'Home' ? '/' : `/${tab.toLowerCase()}`);
              if (tab !== 'Explore') {
                setExploreSearchQuery('');
                setExploreCategory('All');
                setExploreDate('');
              }
            }}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            wishlistCount={wishlist.length}
            userLocation={userLocation}
            onOpenLocationPicker={() => setShowAppLocationPicker(true)}
            unreadCount={notifications.filter(n => !n.read).length}
            onOpenNotifications={() => setShowGlobalNotificationDrawer(true)}
            user={user}
            onLaunchOrganizer={() => { window.location.href = '/organizer'; }}
          />

          {/* Global Notification Center Drawer */}
          <NotificationDrawer
            isOpen={showGlobalNotificationDrawer}
            onClose={() => setShowGlobalNotificationDrawer(false)}
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
            onClearAll={handleClearNotifications}
            onNavigate={(tab) => {
              setShowGlobalNotificationDrawer(false);
              navigateTo(tab === 'Home' ? '/' : `/${tab.toLowerCase()}`);
            }}
            darkMode={darkMode}
          />
          
          {/* Dynamic master trek details page overlay */}
          <AnimatePresence mode="wait">
            {selectedTrekName && !showOrganizersList && !selectedTrip && !activeBookingTrip && (
              <motion.div
                key="overlay-trek-details"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ willChange: 'opacity, transform' }}
                className={`fixed inset-0 z-47 flex flex-col w-full h-full overflow-hidden ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
              >
                <TrekDetailsView
                  trek={
                    hydratedTrek
                    || catalogTreks.find(ct => (ct.title || ct.name) === selectedTrekName || ct.id === slugifyTrekName(selectedTrekName))
                    || trips.find(t => t.name === selectedTrekName)
                  }
                  offers={trips.filter(t => t.name === selectedTrekName)}
                  onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/explore'); } }}
                  onViewOrganisers={(tName) => navigateTo(`/trek/${slugifyTrekName(tName)}/organizers`)}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  darkMode={darkMode}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic trek -> choose organizer listing absolute overlay */}
          <AnimatePresence mode="wait">
            {selectedTrekName && showOrganizersList && !selectedTrip && !activeBookingTrip && (
              <motion.div
                key="overlay-trek-organizers"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ willChange: 'opacity, transform' }}
                className={`fixed inset-0 z-48 flex flex-col w-full h-full overflow-hidden ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
              >
                <TrekOrganizersView
                  trekName={selectedTrekName}
                  // Same catalog lookup the detail screen uses — the organizer
                  // list falls back to it to render a real preview of a trek
                  // nobody has posted a batch for yet.
                  trek={
                    hydratedTrek
                    || catalogTreks.find(ct => (ct.title || ct.name) === selectedTrekName || ct.id === slugifyTrekName(selectedTrekName))
                  }
                  offers={trips.filter(t => t.name === selectedTrekName)}
                  onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo(`/trek/${slugifyTrekName(selectedTrekName)}`); } }}
                  onSelectOrganizerOffer={(t) => navigateTo(`/trip/${t.id}`)}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  darkMode={darkMode}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic details page loaded absolute overlay */}
          <AnimatePresence mode="wait">
            {selectedTrip && !activeBookingTrip && (
              <motion.div
                key="overlay-trip-details"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ willChange: 'opacity, transform' }}
                className={`fixed inset-0 z-50 flex flex-col w-full h-full overflow-hidden ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
              >
                <TripDetailsView
                  trip={tripWithDetailDefaults}
                  onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/explore'); } }}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  onTriggerBooking={(t) => navigateTo(`/book/${t.id}`)}
                  onSelectOrganizer={(org) => navigateTo(`/organizers/${encodeURIComponent(org.name)}`)}
                  darkMode={darkMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
 
           {/* Dynamic Booking flow workflow absolute overlay loaded */}
           <AnimatePresence mode="wait">
             {activeBookingTrip && (
               <motion.div
                 key="overlay-booking-flow"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 16 }}
                 transition={{ duration: 0.18, ease: 'easeOut' }}
                 style={{ willChange: 'opacity, transform' }}
                 className={`fixed inset-0 z-45 flex flex-col w-full h-full overflow-hidden ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <BookingFlow
                   trip={activeBookingTrip}
                   onCancel={() => { if (window.history.state) { window.history.back(); } else { navigateTo(selectedTrip ? `/trip/${selectedTrip.id}` : '/explore'); } }}
                   onConfirmBooking={handleFinalizeBookingSetup}
                   onGoHome={() => navigateTo('/')}
                   darkMode={darkMode}
                 />
               </motion.div>
             )}
           </AnimatePresence>
 
           {/* Dynamic Booking Details page absolute overlay */}
           <AnimatePresence mode="wait">
             {selectedBooking && (
               <motion.div
                 key="overlay-booking-details"
                 initial={{ opacity: 0, y: 16 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 12 }}
                 transition={{ duration: 0.18, ease: 'easeOut' }}
                 style={{ willChange: 'opacity, transform' }}
                 className={`fixed inset-0 z-50 flex flex-col w-full h-full overflow-hidden ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <BookingDetailsView
                   booking={selectedBooking}
                   onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/bookings'); } }}
                   onModifyBookingStatus={handleModifyBookingStatus}
                   availableRescheduleDates={(() => {
                     const matchedTrip = trips.find(t => t.id === selectedBooking.tripId || t.name === selectedBooking.tripName);
                     return matchedTrip?.availableDates || [selectedBooking.selectedDate];
                   })()}
                   onRequestReschedule={(bookingId, requestedDate, reason) => {
                     setBookings(prev => prev.map(b => (b.id === bookingId || b.bookingId === bookingId) ? {
                       ...b,
                       rescheduleStatus: 'Pending',
                       requestedDate,
                       rescheduleReason: reason
                     } : b));
                   }}
                   onContactOrganizer={(b) => {
                     setPendingChatTripId(b.tripId);
                     setSelectedBooking(null);
                     navigateTo('/bookings');
                   }}
                   onViewOrganizerProfile={(name) => {
                     setSelectedBooking(null);
                     navigateTo(`/organizers/${encodeURIComponent(name)}`);
                   }}
                   onDownloadInvoice={(b) => downloadTicketPDF(b)}
                   onRateHike={(b, ratingVal, commentVal) => {
                     handleAddReviewToTrip(b.tripId, ratingVal, commentVal, b.bookingId);
                   }}
                   darkMode={darkMode}
                 />
               </motion.div>
             )}
           </AnimatePresence>
 
           {/* Dynamic Organizer Profile page absolute overlay */}
           <AnimatePresence mode="wait">
             {selectedOrganizer && (
               <motion.div
                 key="overlay-organizer-profile"
                 initial={{ opacity: 0, y: 16 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 12 }}
                 transition={{ duration: 0.18, ease: 'easeOut' }}
                 style={{ willChange: 'opacity, transform' }}
                 className={`fixed inset-0 z-55 flex flex-col w-full h-full overflow-hidden ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <OrganizerProfileView
                   organizer={selectedOrganizer}
                   trips={trips}
                   onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/explore'); } }}
                   onSelectTrip={(t) => {
                     setSelectedOrganizer(null);
                     navigateTo(`/trip/${t.id}`);
                   }}
                   darkMode={darkMode}
                 />
               </motion.div>
             )}
           </AnimatePresence>
 
           {/* Dynamic Loyalty Rewards page absolute overlay */}
           <AnimatePresence mode="wait">
             {showLoyalty && (
               <motion.div
                 key="overlay-loyalty-rewards"
                 initial={{ opacity: 0, y: 16 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 12 }}
                 transition={{ duration: 0.18, ease: 'easeOut' }}
                 style={{ willChange: 'opacity, transform' }}
                 className={`fixed inset-0 z-55 flex flex-col w-full h-full overflow-hidden ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <LoyaltyRewardsView
                   bookings={bookings}
                   onBack={() => setShowLoyalty(false)}
                   onGoExplore={() => { setShowLoyalty(false); navigateTo('/explore'); }}
                   darkMode={darkMode}
                 />
               </motion.div>
             )}
           </AnimatePresence>
 
          {/* Main Tabs view renderer */}
          <div className="flex-1 flex flex-col relative w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ willChange: 'opacity, transform' }}
                // overflow-hidden properly bounds this to the space actually
                // available (flexbox min-height:auto rule) — without it, a
                // page that swaps to a sub-view via purely local state (never
                // touching `activeTab`, so this node never remounts) grows to
                // fit content instead, pushing the *outer*, never-remounted
                // wrapper into becoming the real scroller — which then keeps
                // whatever scrollTop the previous view left it at.
                className="flex-1 flex flex-col w-full overflow-hidden"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
            {/* Global Location Picker modal overlay */}
            <LocationPicker
              open={showAppLocationPicker}
              current={userLocation}
              onSelect={handleSelectUserLocation}
              onClose={() => setShowAppLocationPicker(false)}
              darkMode={darkMode}
            />
          </div>
 
          {/* Floating Map button — only on Home & Explore, icon-only, sits with a
              clear gap above the glassmorphic nav. Hides while the map is open
              (the map shows its own labelled "Map" pill). */}
          <AnimatePresence>
            {(activeTab === 'Home' || activeTab === 'Explore') && !showMap && (
              <motion.button
                id="btn-open-map"
                onClick={() => setShowMap(true)}
                aria-label="Open map"
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 8 }}
                whileTap={{ scale: 0.9 }}
                className="fixed right-5 bottom-20 md:bottom-8 z-40 w-12 h-12 rounded-full bg-forest-600 text-white flex items-center justify-center shadow-xl shadow-forest-900/30 hover:bg-forest-700 active:scale-95 transition cursor-pointer"
              >
                <Map size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Sticky bottom navigation system */}
          {!navHidden && <BottomNav
            activeTab={activeTab}
            onChangeTab={(tab) => {
              navigateTo(tab === 'Home' ? '/' : `/${tab.toLowerCase()}`);
              // Clear filters when user actively taps main tabs to feel fresh
              if (tab !== 'Explore') {
                setExploreSearchQuery('');
                setExploreCategory('All');
                setExploreDate('');
              }
            }}
            darkMode={darkMode}
            wishlistCount={wishlist.length}
          />}

          {/* Full-screen map view (draggable list sheet over the map) */}
          <AnimatePresence>
            {showMap && (
              <MapView
                trips={trips}
                wishlist={wishlist}
                onToggleWishlist={handleToggleWishlist}
                onSelectTrek={(trekName) => { setShowMap(false); navigateTo(`/trek/${slugifyTrekName(trekName)}`); }}
                onClose={() => setShowMap(false)}
                darkMode={darkMode}
              />
            )}
          </AnimatePresence>

          {/* 8. Hiker Banned Overlay Dialog */}
          <AnimatePresence>
            {bannedAlert && (
              <div className="absolute inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-6">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-[#1C120C] border border-red-500/30 rounded-3xl p-6 w-full text-center space-y-4 shadow-xl z-[1000]"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif text-base font-bold text-red-600 dark:text-red-500">
                      {bannedReason === 'expired'
                        ? 'Session Expired'
                        : bannedReason === 'deleted'
                          ? 'Account Deleted'
                          : bannedReason === 'deactivated' ? 'Account Deactivated' : 'Account Suspended'}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed">
                      {bannedReason === 'expired'
                        ? 'Your sign-in session has expired. Please sign in again to continue.'
                        : bannedReason === 'deleted'
                          ? 'Your account has been deleted by the admin.'
                          : bannedReason === 'deactivated'
                            ? 'Your account is deactivated. Kindly contact customer support for more details.'
                            : 'You are banned by the admin.'}
                    </p>
                  </div>

                  {bannedReason === 'deactivated' && (
                    <div className="bg-slate-50 dark:bg-[#2A1E17] border border-slate-100 dark:border-white/5 rounded-2xl p-4 text-left space-y-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Customer Support Contacts</div>
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{supportContact.phone}</div>
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{supportContact.email}</div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setBannedAlert(false);
                    }}
                    className="w-full bg-red-650 hover:bg-red-750 text-white text-xs font-bold py-3 rounded-full cursor-pointer active:scale-95 transition-all"
                  >
                    Okay
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}
 
    </PhoneFrame>
  );
}
