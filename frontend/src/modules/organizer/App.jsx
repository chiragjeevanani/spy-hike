import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import {
  loadOrgUser, saveOrgUser,
  loadOrgTrips, saveOrgTrips,
  loadOrgBookings, saveOrgBookings,
  loadOrgNotifications, saveOrgNotifications,
  loadOrgDarkMode, saveOrgDarkMode,
  loadOrgPayouts, saveOrgPayouts,
} from './utils/storage';
import { syncOrganizerVouchers, markOrganizerVoucherUsed } from '../../utils/loyalty';

import OrgOnboarding from './components/OrgOnboarding';
import OrgAuth from './components/OrgAuth';
import PendingApprovalView from './components/PendingApprovalView';
import OrgBottomNav from './components/OrgBottomNav';
import OrgDashboardView from './components/OrgDashboardView';
import OrgTripsView from './components/OrgTripsView';
import TripFormView from './components/TripFormView';
import OrgBookingsView from './components/OrgBookingsView';
import OrgProfileView from './components/OrgProfileView';
import OrgLoyaltyView from './components/OrgLoyaltyView';
import OrgNotificationsView from './components/OrgNotificationsView';
import OrgFinancialsView from './components/OrgFinancialsView';
import OrgScannerView from './components/OrgScannerView';

// ─── Route helpers ───────────────────────────────────────────────────────────

const PATH_PREFIX = '/organizer';
// The traveller app (and its shared Traveller/Organizer login) now lives under /app.
const SHARED_LOGIN_PATH = '/app/login';

function getOrgTab(pathname) {
  const p = pathname.replace(PATH_PREFIX, '').replace(/^\//, '');
  if (!p || p === '' || p === 'dashboard') return 'Dashboard';
  if (p === 'trips') return 'Trips';
  if (p === 'trips/new') return 'NewTrip';
  if (p.startsWith('trips/') && p !== 'trips/new') return 'EditTrip';
  if (p === 'bookings') return 'Bookings';
  if (p === 'profile') return 'Profile';
  if (p === 'register') return 'Register';
  if (p === 'pending') return 'Pending';
  if (p === 'onboarding') return 'Onboarding';
  return 'Dashboard';
}

function tabToPath(tab, tripId = null) {
  if (tab === 'Dashboard') return `${PATH_PREFIX}/dashboard`;
  if (tab === 'Trips') return `${PATH_PREFIX}/trips`;
  if (tab === 'NewTrip') return `${PATH_PREFIX}/trips/new`;
  if (tab === 'EditTrip' && tripId) return `${PATH_PREFIX}/trips/${tripId}`;
  if (tab === 'Bookings') return `${PATH_PREFIX}/bookings`;
  if (tab === 'Profile') return `${PATH_PREFIX}/profile`;
  if (tab === 'Register') return `${PATH_PREFIX}/register`;
  if (tab === 'Pending') return `${PATH_PREFIX}/pending`;
  if (tab === 'Onboarding') return `${PATH_PREFIX}/onboarding`;
  return `${PATH_PREFIX}/dashboard`;
}

// ─── Main organizer App ───────────────────────────────────────────────────────

export default function OrgApp() {
  const [darkMode, setDarkMode] = useState(loadOrgDarkMode());
  const [organizer, setOrganizer] = useState(loadOrgUser());
  const [activeTab, setActiveTab] = useState(() => getOrgTab(window.location.pathname));
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState(loadOrgNotifications());
  const [editingTrip, setEditingTrip] = useState(null);
  const [showOrgLoyalty, setShowOrgLoyalty] = useState(false);
  const [showOrgNotifications, setShowOrgNotifications] = useState(false);
  const [showOrgFinancials, setShowOrgFinancials] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [payouts, setPayouts] = useState(loadOrgPayouts());

  // Load organizer-specific data
  useEffect(() => {
    if (organizer?.isAuthenticated && organizer?.email) {
      const orgTrips = loadOrgTrips(organizer.email);
      const orgBookings = loadOrgBookings(organizer.email);
      setTrips(orgTrips);
      setBookings(orgBookings);

      // Lifetime "bookings via app" backs the loyalty progress bar — keep the
      // organizer's totalBookings stat honest against their actual booking
      // roster, then mint any newly-earned reward vouchers.
      const lifetimeBookings = Math.max(organizer.totalBookings || 0, orgBookings.length);
      syncOrganizerVouchers(lifetimeBookings);
      if (lifetimeBookings > (organizer.totalBookings || 0)) {
        const updated = { ...organizer, totalBookings: lifetimeBookings };
        saveOrgUser(updated);
        setOrganizer(updated);
      }
    }
  }, [organizer?.email, organizer?.isAuthenticated]);

  // History popstate
  useEffect(() => {
    const handlePop = () => setActiveTab(getOrgTab(window.location.pathname));
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Dark mode
  useEffect(() => {
    saveOrgDarkMode(darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // There's no organizer-specific login screen anymore — sign-in happens on the
  // single shared /login (Traveller/Organizer tabs), which hands off back here
  // once authenticated. Bounce anyone who lands here unauthenticated, except
  // the "Apply as Organizer" registration flow which still lives in this module.
  useEffect(() => {
    if (organizer.isOnboarded && !organizer.isAuthenticated && activeTab !== 'Register') {
      window.location.href = SHARED_LOGIN_PATH;
    }
  }, [organizer.isOnboarded, organizer.isAuthenticated, activeTab]);

  const navigateTo = useCallback((tab, replace = false, tripId = null) => {
    const path = tabToPath(tab, tripId);
    if (replace) {
      window.history.replaceState({ tab }, '', path);
    } else {
      window.history.pushState({ tab }, '', path);
    }
    setActiveTab(tab);
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleOnboardingComplete = () => {
    const updated = { ...organizer, isOnboarded: true };
    saveOrgUser(updated);
    setOrganizer(updated);
    window.location.href = SHARED_LOGIN_PATH;
  };

  const handleAuthSuccess = (orgUser) => {
    setOrganizer(orgUser);
    if (!orgUser.isApproved && orgUser.isPendingApproval) {
      navigateTo('Pending', true);
    } else {
      setTrips(loadOrgTrips(orgUser.email));
      setBookings(loadOrgBookings(orgUser.email));
      navigateTo('Dashboard', true);
    }
  };

  const handleLogout = () => {
    const reset = {
      ...organizer,
      isAuthenticated: false,
    };
    saveOrgUser(reset);
    setOrganizer(reset);
    setTrips([]);
    setBookings([]);

    // Also sign the shared traveller session out — otherwise the shared
    // /app/login screen sees an already-authenticated user and bounces
    // straight past the login form into the Traveller Home tab.
    try {
      const rawUser = localStorage.getItem('trekigo_user');
      if (rawUser) {
        const travellerUser = JSON.parse(rawUser);
        localStorage.setItem('trekigo_user', JSON.stringify({ ...travellerUser, isAuthenticated: false }));
      }
    } catch (e) {}

    window.location.href = SHARED_LOGIN_PATH;
  };

  const handleToggleDarkMode = () => setDarkMode(p => !p);

  // Simulate admin approval on "Check Status" click
  const handleCheckApproval = () => {
    const updated = { ...organizer, isApproved: true, isPendingApproval: false };
    saveOrgUser(updated);
    setOrganizer(updated);
    setTrips(loadOrgTrips(updated.email));
    setBookings(loadOrgBookings(updated.email));
    navigateTo('Dashboard', true);
  };

  // Trip CRUD
  const handleSaveTrip = (savedTrip) => {
    // Merge into global trips storage (shared with user app)
    let allTrips;
    try {
      const stored = localStorage.getItem('trekigo_trips');
      allTrips = stored ? JSON.parse(stored) : [];
    } catch { allTrips = []; }
    const idx = allTrips.findIndex(t => t.id === savedTrip.id);
    if (idx >= 0) allTrips[idx] = savedTrip;
    else allTrips.unshift(savedTrip);
    localStorage.setItem('trekigo_trips', JSON.stringify(allTrips));

    // Also update organizer-specific trips
    let orgTrips = loadOrgTrips();
    const orgIdx = orgTrips.findIndex(t => t.id === savedTrip.id);
    if (orgIdx >= 0) orgTrips[orgIdx] = savedTrip;
    else orgTrips.unshift(savedTrip);
    saveOrgTrips(orgTrips);
    setTrips(orgTrips.filter(t => t.organizerEmail === organizer.email));

    setEditingTrip(null);
    navigateTo('Trips', false);
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    navigateTo('EditTrip', false, trip.id);
  };

  const handleNewTrip = () => {
    setEditingTrip(null);
    navigateTo('NewTrip', false);
  };

  const handleToggleTripStatus = (trip) => {
    const newStatus = trip.status === 'Published' ? 'Paused' : 'Published';
    const updated = { ...trip, status: newStatus };
    handleSaveTrip(updated);
  };

  const handleDeleteTrip = (tripId) => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    // Remove from global storage
    try {
      const stored = localStorage.getItem('trekigo_trips');
      if (stored) {
        const all = JSON.parse(stored).filter(t => t.id !== tripId);
        localStorage.setItem('trekigo_trips', JSON.stringify(all));
      }
    } catch {}
    // Remove from org trips
    const orgTrips = loadOrgTrips().filter(t => t.id !== tripId);
    saveOrgTrips(orgTrips);
    setTrips(orgTrips.filter(t => t.organizerEmail === organizer.email));
  };

  // Applies an available zero-commission loyalty voucher to a specific
  // upcoming booking — the organizer keeps 100% of that booking's payout.
  const handleApplyLoyaltyReward = (voucherId, bookingId) => {
    markOrganizerVoucherUsed(voucherId, bookingId);
    const updated = bookings.map(b =>
      (b.id === bookingId || b.bookingId === bookingId)
        ? { ...b, commissionAmount: 0, loyaltyRewardApplied: true }
        : b
    );
    setBookings(updated);
    saveOrgBookings(updated);
  };

  const handleBottomNavChange = (tab) => navigateTo(tab);

  const handleDashboardNavigate = (tab) => {
    if (tab === 'NewTrip') { handleNewTrip(); return; }
    if (tab === 'Notifications') {
      setShowOrgNotifications(true);
      return;
    }
    navigateTo(tab);
  };

  const handleMarkNotificationRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveOrgNotifications(updated);
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveOrgNotifications(updated);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    saveOrgNotifications([]);
  };

  const handleSaveBankDetails = (bankDetails) => {
    const updated = { ...organizer, bankDetails };
    saveOrgUser(updated);
    setOrganizer(updated);
  };

  // Simulates a payout request: creates a "Processing" transaction, then
  // settles it to "Paid" a moment later — there's no real payment gateway
  // behind this demo, so we fake the bank-settlement delay for realism.
  const handleRequestPayout = (amount) => {
    if (amount <= 0) return;
    const payoutId = `PO-${Date.now()}`;
    const method = organizer?.bankDetails?.upiId?.trim() ? 'UPI' : 'Bank Transfer';
    const newPayout = {
      id: payoutId,
      amount,
      method,
      status: 'Processing',
      requestedAt: new Date().toISOString(),
      completedAt: null,
      utr: null,
    };
    setPayouts(prev => {
      const next = [...prev, newPayout];
      saveOrgPayouts(next);
      return next;
    });

    setTimeout(() => {
      setPayouts(prev => {
        const next = prev.map(p => p.id === payoutId
          ? { ...p, status: 'Paid', completedAt: new Date().toISOString(), utr: `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}` }
          : p);
        saveOrgPayouts(next);
        return next;
      });
    }, 2200);
  };

  // ─── Routing render ────────────────────────────────────────────────────────

  const BOTTOM_NAV_TABS = ['Dashboard', 'Trips', 'Bookings', 'Profile'];

  const renderContent = () => {
    // 1. Onboarding gate
    if (!organizer.isOnboarded) {
      return <OrgOnboarding onComplete={handleOnboardingComplete} darkMode={darkMode} />;
    }

    // 2. Auth gate — sign-in lives on the shared /login now (redirected there by
    // the effect above); only the "Apply as Organizer" registration flow renders here.
    if (!organizer.isAuthenticated) {
      if (activeTab === 'Register') {
        return (
          <OrgAuth
            onSuccess={handleAuthSuccess}
            onSwitchMode={() => { window.location.href = SHARED_LOGIN_PATH; }}
            darkMode={darkMode}
          />
        );
      }
      return null;
    }

    // 3. Pending approval
    if (organizer.isPendingApproval && !organizer.isApproved) {
      return (
        <PendingApprovalView
          organizer={organizer}
          onRefresh={handleCheckApproval}
          darkMode={darkMode}
        />
      );
    }

    // 4. Authenticated + approved — main app
    const mainContent = () => {
      if (activeTab === 'NewTrip') {
        return (
          <TripFormView
            trip={null}
            organizer={organizer}
            organizerEmail={organizer.email}
            onSave={handleSaveTrip}
            onBack={() => navigateTo('Trips')}
            darkMode={darkMode}
          />
        );
      }
      if (activeTab === 'EditTrip') {
        return (
          <TripFormView
            trip={editingTrip}
            organizer={organizer}
            organizerEmail={organizer.email}
            onSave={handleSaveTrip}
            onBack={() => navigateTo('Trips')}
            darkMode={darkMode}
          />
        );
      }

      const tabContent = {
        Dashboard: (
          <OrgDashboardView
            organizer={organizer}
            trips={trips}
            bookings={bookings}
            notifications={notifications}
            onNavigate={handleDashboardNavigate}
            onViewTrip={handleEditTrip}
            onOpenLoyalty={() => setShowOrgLoyalty(true)}
            onOpenFinancials={() => setShowOrgFinancials(true)}
            onOpenScanner={() => setShowScanner(true)}
            darkMode={darkMode}
          />
        ),
        Trips: (
          <OrgTripsView
            trips={trips}
            onNewTrip={handleNewTrip}
            onEditTrip={handleEditTrip}
            onToggleStatus={handleToggleTripStatus}
            onDeleteTrip={handleDeleteTrip}
            darkMode={darkMode}
          />
        ),
        Bookings: (
          <OrgBookingsView
            bookings={bookings}
            onApplyLoyaltyReward={handleApplyLoyaltyReward}
            darkMode={darkMode}
          />
        ),
        Profile: (
          <OrgProfileView
            organizer={organizer}
            onLogout={handleLogout}
            onOpenLoyalty={() => setShowOrgLoyalty(true)}
            onOpenFinancials={() => setShowOrgFinancials(true)}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
          />
        ),
      };

      return tabContent[activeTab] || tabContent['Dashboard'];
    };

    const showBottomNav = BOTTOM_NAV_TABS.includes(activeTab);

    return (
      <>
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              {mainContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        {showBottomNav && (
          <OrgBottomNav
            activeTab={activeTab}
            onChangeTab={handleBottomNavChange}
            darkMode={darkMode}
          />
        )}

        {/* Loyalty Rewards full-screen overlay — reachable from both the
            Dashboard banner and the Profile menu row */}
        <AnimatePresence>
          {showOrgLoyalty && (
            <motion.div
              key="overlay-org-loyalty"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`absolute inset-0 z-50 flex flex-col ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
            >
              <OrgLoyaltyView
                organizer={organizer}
                onBack={() => setShowOrgLoyalty(false)}
                onGoBookings={() => { setShowOrgLoyalty(false); navigateTo('Bookings'); }}
                darkMode={darkMode}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications full-screen overlay — reachable from the Dashboard bell */}
        <AnimatePresence>
          {showOrgNotifications && (
            <motion.div
              key="overlay-org-notifications"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`absolute inset-0 z-50 flex flex-col ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
            >
              <OrgNotificationsView
                notifications={notifications}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onClear={handleClearNotifications}
                onBack={() => setShowOrgNotifications(false)}
                darkMode={darkMode}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Financials full-screen overlay — reachable from the Dashboard
            revenue card and the Profile menu row */}
        <AnimatePresence>
          {showOrgFinancials && (
            <motion.div
              key="overlay-org-financials"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`absolute inset-0 z-50 flex flex-col ${darkMode ? 'bg-zinc-950' : 'bg-white'}`}
            >
              <OrgFinancialsView
                organizer={organizer}
                bookings={bookings}
                payouts={payouts}
                onSaveBankDetails={handleSaveBankDetails}
                onRequestPayout={handleRequestPayout}
                onBack={() => setShowOrgFinancials(false)}
                darkMode={darkMode}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanner full-screen overlay */}
        <AnimatePresence>
          {showScanner && (
            <motion.div
              key="overlay-org-scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-50"
            >
              <OrgScannerView
                onBack={() => setShowScanner(false)}
                darkMode={darkMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center transition-colors duration-300 relative overflow-hidden ${darkMode ? 'bg-elegant-bg text-elegant-text' : 'bg-gray-100/60 text-zinc-800'}`}>
      {/* Ambient blobs */}
      {darkMode && (
        <>
          <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-[#F27D26] rounded-full blur-[150px] opacity-8 pointer-events-none" />
          <div className="absolute bottom-[-50px] right-[-50px] w-[300px] h-[300px] bg-[#163321] rounded-full blur-[120px] opacity-30 pointer-events-none" />
        </>
      )}

      <div
        id="trekigo-org-viewport"
        className={`relative w-full h-screen md:max-w-[400px] md:shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          darkMode ? 'bg-elegant-app text-white shadow-[#050807]/90' : 'bg-[#FAF8F2] text-zinc-800 shadow-zinc-200/40'
        }`}
      >
        <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
