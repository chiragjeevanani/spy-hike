/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import {
  loadOrgUser, saveOrgUser,
  loadOrgTrips, saveOrgTrips,
  loadOrgBookings, saveOrgBookings,
  loadOrgNotifications, saveOrgNotifications,
  loadOrgDarkMode, saveOrgDarkMode,
} from './utils/storage';

import OrgOnboarding from './components/OrgOnboarding';
import OrgAuth from './components/OrgAuth';
import PendingApprovalView from './components/PendingApprovalView';
import OrgBottomNav from './components/OrgBottomNav';
import OrgDashboardView from './components/OrgDashboardView';
import OrgTripsView from './components/OrgTripsView';
import TripFormView from './components/TripFormView';
import OrgBookingsView from './components/OrgBookingsView';
import OrgProfileView from './components/OrgProfileView';

// ─── Route helpers ───────────────────────────────────────────────────────────

const PATH_PREFIX = '/organizer';

function getOrgTab(pathname) {
  const p = pathname.replace(PATH_PREFIX, '').replace(/^\//, '');
  if (!p || p === '' || p === 'dashboard') return 'Dashboard';
  if (p === 'trips') return 'Trips';
  if (p === 'trips/new') return 'NewTrip';
  if (p.startsWith('trips/') && p !== 'trips/new') return 'EditTrip';
  if (p === 'bookings') return 'Bookings';
  if (p === 'profile') return 'Profile';
  if (p === 'login') return 'Login';
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
  if (tab === 'Login') return `${PATH_PREFIX}/login`;
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

  // Load organizer-specific data
  useEffect(() => {
    if (organizer?.isAuthenticated && organizer?.email) {
      setTrips(loadOrgTrips(organizer.email));
      setBookings(loadOrgBookings(organizer.email));
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
    navigateTo('Login', true);
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
    navigateTo('Login', true);
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
      const stored = localStorage.getItem('spyhike_trips');
      allTrips = stored ? JSON.parse(stored) : [];
    } catch { allTrips = []; }
    const idx = allTrips.findIndex(t => t.id === savedTrip.id);
    if (idx >= 0) allTrips[idx] = savedTrip;
    else allTrips.unshift(savedTrip);
    localStorage.setItem('spyhike_trips', JSON.stringify(allTrips));

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
      const stored = localStorage.getItem('spyhike_trips');
      if (stored) {
        const all = JSON.parse(stored).filter(t => t.id !== tripId);
        localStorage.setItem('spyhike_trips', JSON.stringify(all));
      }
    } catch {}
    // Remove from org trips
    const orgTrips = loadOrgTrips().filter(t => t.id !== tripId);
    saveOrgTrips(orgTrips);
    setTrips(orgTrips.filter(t => t.organizerEmail === organizer.email));
  };

  const handleBottomNavChange = (tab) => navigateTo(tab);

  const handleDashboardNavigate = (tab) => {
    if (tab === 'NewTrip') { handleNewTrip(); return; }
    if (tab === 'Notifications') {
      const cleared = notifications.map(n => ({ ...n, read: true }));
      setNotifications(cleared);
      saveOrgNotifications(cleared);
      return;
    }
    navigateTo(tab);
  };

  // ─── Routing render ────────────────────────────────────────────────────────

  const BOTTOM_NAV_TABS = ['Dashboard', 'Trips', 'Bookings', 'Profile'];

  const renderContent = () => {
    // 1. Onboarding gate
    if (!organizer.isOnboarded) {
      return <OrgOnboarding onComplete={handleOnboardingComplete} darkMode={darkMode} />;
    }

    // 2. Auth gate
    if (!organizer.isAuthenticated) {
      if (activeTab === 'Register') {
        return (
          <OrgAuth
            mode="register"
            onSuccess={handleAuthSuccess}
            onSwitchMode={() => navigateTo('Login', true)}
            darkMode={darkMode}
          />
        );
      }
      return (
        <OrgAuth
          mode="login"
          onSuccess={handleAuthSuccess}
          onSwitchMode={() => navigateTo('Register', true)}
          darkMode={darkMode}
        />
      );
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
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
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
            darkMode={darkMode}
          />
        ),
        Profile: (
          <OrgProfileView
            organizer={organizer}
            onLogout={handleLogout}
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
        id="spyhike-org-viewport"
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
