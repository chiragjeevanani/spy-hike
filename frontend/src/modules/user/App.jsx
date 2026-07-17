import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, AlertTriangle } from 'lucide-react';
import PhoneFrame from './components/PhoneFrame';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import HomeView from './components/HomeView';
import ExploreView from './components/ExploreView';
import TrekOrganizersView from './components/TrekOrganizersView';
import TripDetailsView from './components/TripDetailsView';
import BookingFlow from './components/BookingFlow';
import BookingsView from './components/BookingsView';
import WishlistView from './components/WishlistView';
import ProfileView from './components/ProfileView';
import BookingDetailsView from './components/BookingDetailsView';
import OrganizerProfileView from './components/OrganizerProfileView';
import LoyaltyRewardsView from './components/LoyaltyRewardsView';
import MapView from './components/MapView';
import LandingView from '../landing/LandingView';

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
import tripsApi from '../../lib/tripsApi';
import bookingsApi from '../../lib/bookingsApi';
import socialApi from '../../lib/socialApi';
import landingApi from '../../lib/landingApi';
import { loadLandingContentLocal } from '../landing/landingContent';
import { getToken } from '../../lib/apiClient';
import { initPushNotifications } from '../../utils/pushNotifications';

// The traveller app lives entirely under /app (e.g. /app/explore, /app/login);
// the root path (and anything else outside /app, /organizer, /admin) is the
// public marketing Landing page and bypasses onboarding/auth gates entirely.
const APP_PREFIX = '/app';

// Raw browser pathname -> internal relative path this router understands
// (e.g. '/app/explore' -> '/explore', '/app' -> '/'). Null means "not under
// /app" — render the Landing page.
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

  // Root path (and anything outside /app) is the public marketing Landing page.
  const path = toInternalPath(window.location.pathname);
  if (path === null) {
    return { tab: 'Landing', trip, bookingTrip, selectedBooking, selectedOrganizer, trekName };
  }

  // 1. Authenticated Profile Setup & Onboarding Gate redirect rules
  if (user.isAuthenticated) {
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

  if (path === '/explore') {
    tab = 'Explore';
  } else if (path === '/bookings') {
    tab = 'Bookings';
  } else if (path === '/wishlist') {
    tab = 'Wishlist';
  } else if (path === '/profile') {
    tab = 'Profile';
  } else if (path.startsWith('/trek/')) {
    const trekSlug = path.replace('/trek/', '');
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
  }
  return { tab, trip, bookingTrip, selectedBooking, selectedOrganizer, trekName };
};

export default function App() {
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
  const [darkMode, setDarkMode] = useState(() => loadDarkMode());
  const [bannedAlert, setBannedAlert] = useState(false);
  const [bannedReason, setBannedReason] = useState('banned');
  const [redirectAfterAuth, setRedirectAfterAuth] = useState(null);
  const [showMap, setShowMap] = useState(false);
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
  const [showLoyalty, setShowLoyalty] = useState(false);

  // 3. Search & Filter dynamic bindings to propagate to Explore tab
  const [exploreSearchQuery, setExploreSearchQuery] = useState('');
  const [exploreCategory, setExploreCategory] = useState('All');
  // Departure-date filter ('' = off) — set from the Home calendar, applied in Explore.
  const [exploreDate, setExploreDate] = useState('');

  const navigateTo = (path, replace = false, currentUser = user) => {
    const url = toBrowserPath(path);
    if (replace) {
      window.history.replaceState({ path: url }, '', url);
    } else {
      window.history.pushState({ path: url }, '', url);
    }
    handleRouteChange(currentUser);
  };

  const handleRouteChange = (currentUser = user) => {
    // Root (and anything outside /app) is the public marketing Landing page — bypasses all gates.
    const path = toInternalPath(window.location.pathname);
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
    if (currentUser.isAuthenticated) {
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

    // Authenticated & Onboarded: Redirect away from auth/onboard pages
    if (currentUser.isAuthenticated && (path === '/login' || path === '/register' || path === '/onboardingguide' || path === '/profilesetup')) {
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
    } else if (path.startsWith('/trek/')) {
      const trekSlug = path.replace('/trek/', '');
      const foundTrip = trips.find(t => slugifyTrekName(t.name) === trekSlug);
      if (foundTrip) {
        setSelectedTrekName(foundTrip.name);
        setSelectedTrip(null);
        setActiveBookingTrip(null);
        setSelectedBooking(null);
        setSelectedOrganizer(null);
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
      navigateTo('/', true, currentUser);
    }
  };

  useEffect(() => {
    const onPopState = () => handleRouteChange();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [trips, bookings, user]);

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
    const handleStatusChangeEvent = (e) => {
      const reason = e.detail?.reason || 'banned';
      setBannedReason(reason);
      handleLogoutResets();
      setBannedAlert(true);
    };
    window.addEventListener('hiker-status-changed', handleStatusChangeEvent);
    return () => window.removeEventListener('hiker-status-changed', handleStatusChangeEvent);
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
    if (!user.isAuthenticated) return;
    let cancelled = false;
    bookingsApi
      .listMine()
      .then((list) => { if (!cancelled && Array.isArray(list) && list.length) setBookings(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user.isAuthenticated]);

  // Hydrate wishlist / notifications / chats from the API for a real (token)
  // session. Notifications + the welcome chat are emitted server-side on
  // booking, so re-run when the booking roster changes. Tokenless (seeded)
  // sessions keep their localStorage state.
  useEffect(() => {
    if (!user.isAuthenticated || !getToken()) return;
    let cancelled = false;
    socialApi.getWishlist().then((w) => { if (!cancelled && Array.isArray(w)) setWishlist(w); }).catch(() => {});
    socialApi.getNotifications().then((n) => { if (!cancelled && Array.isArray(n) && n.length) setNotifications(n); }).catch(() => {});
    socialApi.getChats().then((c) => { if (!cancelled && Array.isArray(c) && c.length) setChats(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user.isAuthenticated, bookings.length]);

  // Public landing-page content — fetched once on mount (no auth) so the
  // marketing page reflects whatever the admin has published in the CMS.
  useEffect(() => {
    let cancelled = false;
    landingApi.getContent().then((c) => { if (!cancelled && c) setLandingContent(c); }).catch(() => {});
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
        const updatedReviewsList = [newRatingReview, ...item.reviews];
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
        .then(() => tripsApi.listTrips({ limit: 100 }))
        .then((apiTrips) => { if (Array.isArray(apiTrips) && apiTrips.length) setTrips(apiTrips); })
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

  // Gather user drafted comments metadata
  const getUserDraftedReviews = () => {
    const list = [];
    trips.forEach(t => {
      t.reviews.forEach(r => {
        if (r.userName === user.name) {
          list.push({
            tripId: t.id,
            tripName: t.name,
            rating: r.rating,
            comment: r.comment,
            date: r.date
          });
        }
      });
    });
    return list;
  };

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
            userReviews={getUserDraftedReviews()}
            onTriggerOnboarding={handleTriggerOnboardingWalkthrough}
            bookings={bookings}
            onFullscreenChange={setNavHidden}
            onOpenLoyalty={() => setShowLoyalty(true)}
          />
        );
      default:
        return null;
    }
  };

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
        /* 3. Main Dashboard flow viewport screen */
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
          
          {/* Dynamic trek -> choose organizer listing absolute overlay */}
          <AnimatePresence mode="wait">
            {selectedTrekName && !selectedTrip && !activeBookingTrip && (
              <motion.div
                key="overlay-trek-organizers"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className={`absolute inset-0 z-48 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
              >
                <TrekOrganizersView
                  trekName={selectedTrekName}
                  offers={trips.filter(t => t.name === selectedTrekName)}
                  onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/explore'); } }}
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
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className={`absolute inset-0 z-50 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
              >
                <TripDetailsView
                  trip={selectedTrip}
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
                 initial={{ y: '100%' }}
                 animate={{ y: 0 }}
                 exit={{ y: '100%' }}
                 transition={{ type: 'spring', damping: 26, stiffness: 200 }}
                 className={`absolute inset-0 z-45 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <BookingFlow
                   trip={activeBookingTrip}
                   onCancel={() => { if (window.history.state) { window.history.back(); } else { navigateTo(selectedTrip ? `/trip/${selectedTrip.id}` : '/explore'); } }}
                   onConfirmBooking={handleFinalizeBookingSetup}
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
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                 className={`absolute inset-0 z-50 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
               >
                 <BookingDetailsView
                   booking={selectedBooking}
                   onBack={() => { if (window.history.state) { window.history.back(); } else { navigateTo('/bookings'); } }}
                   onModifyBookingStatus={handleModifyBookingStatus}
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
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                 className={`absolute inset-0 z-55 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
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
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                 className={`absolute inset-0 z-55 flex flex-col h-full ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
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
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
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
                className="absolute left-0 right-0 mx-auto w-12 h-12 bottom-[96px] z-40 rounded-full bg-forest-600 text-white flex items-center justify-center shadow-xl shadow-forest-900/30 active:scale-95"
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
                      {bannedReason === 'deleted' ? 'Account Deleted' : 'Account Suspended'}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed">
                      {bannedReason === 'deleted' ? 'Your account has been deleted by the admin.' : 'You are banned by the admin.'}
                    </p>
                  </div>
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
