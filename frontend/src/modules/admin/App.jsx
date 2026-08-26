import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { 
  loadAdminUser, saveAdminUser, 
  loadAdminDarkMode, saveAdminDarkMode 
} from './utils/storage';
import api, { clearToken } from '../../lib/apiClient';
import { useToast } from '../../components/ToastProvider';

import AdminLogin from './components/AdminLogin';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import DashboardView from './components/DashboardView';
import UsersView from './components/UsersView';
import AdminUserProfileView from './components/AdminUserProfileView';
import OrganizersView from './components/OrganizersView';
import AdminOrganizerProfileView from './components/AdminOrganizerProfileView';
import TripsView from './components/TripsView';
import TreksView from './components/TreksView';
import TrekRequestsView from './components/TrekRequestsView';
import BookingsView from './components/BookingsView';
import PayoutsView from './components/PayoutsView';
import CouponsView from './components/CouponsView';
import AnalyticsView from './components/AnalyticsView';
import BroadcastView from './components/BroadcastView';
import LoyaltyProgramView from './components/LoyaltyProgramView';
import LandingCmsView from './components/LandingCmsView';
import SiteContentView from './components/SiteContentView';
import SettingsView from './components/SettingsView';
import NotFoundPage from '../../components/NotFoundPage';

const PATH_PREFIX = '/admin';

function getAdminTab(pathname) {
  const p = pathname.replace(PATH_PREFIX, '').replace(/^\//, '');
  if (!p || p === '' || p === 'dashboard') return 'Dashboard';
  if (p === 'users') return 'Users';
  if (p.startsWith('users/')) return 'UserProfile';
  if (p === 'organizers') return 'Organizers';
  if (p.startsWith('organizers/')) return 'OrganizerProfile';
  if (p === 'treks') return 'Treks';
  if (p === 'trek-requests') return 'TrekRequests';
  if (p === 'trips') return 'Trips';
  if (p === 'bookings') return 'Bookings';
  if (p === 'payouts') return 'Payouts';
  if (p === 'coupons') return 'Coupons';
  if (p === 'analytics') return 'Analytics';
  if (p === 'broadcast') return 'Broadcast';
  if (p === 'loyalty') return 'Loyalty';
  if (p === 'landing') return 'Landing';
  if (p === 'legal') return 'Legal';
  if (p === 'settings') return 'Settings';
  if (p === 'login') return 'Login';
  return 'NotFound';
}

// Pulls the :email (or 'new') segment out of /admin/users/:x or
// /admin/organizers/:x — null for every other tab.
function getProfileParam(pathname) {
  const p = pathname.replace(PATH_PREFIX, '').replace(/^\//, '');
  if (p.startsWith('users/')) return decodeURIComponent(p.slice('users/'.length));
  if (p.startsWith('organizers/')) return decodeURIComponent(p.slice('organizers/'.length));
  return null;
}

function tabToPath(tab, param) {
  if (tab === 'Dashboard') return `${PATH_PREFIX}/dashboard`;
  if (tab === 'Users') return `${PATH_PREFIX}/users`;
  if (tab === 'UserProfile') return `${PATH_PREFIX}/users/${param ? encodeURIComponent(param) : 'new'}`;
  if (tab === 'Organizers') return `${PATH_PREFIX}/organizers`;
  if (tab === 'OrganizerProfile') return `${PATH_PREFIX}/organizers/${param ? encodeURIComponent(param) : 'new'}`;
  if (tab === 'Treks') return `${PATH_PREFIX}/treks`;
  if (tab === 'TrekRequests') return `${PATH_PREFIX}/trek-requests`;
  if (tab === 'Trips') return `${PATH_PREFIX}/trips`;
  if (tab === 'Bookings') return `${PATH_PREFIX}/bookings`;
  if (tab === 'Payouts') return `${PATH_PREFIX}/payouts`;
  if (tab === 'Coupons') return `${PATH_PREFIX}/coupons`;
  if (tab === 'Analytics') return `${PATH_PREFIX}/analytics`;
  if (tab === 'Broadcast') return `${PATH_PREFIX}/broadcast`;
  if (tab === 'Loyalty') return `${PATH_PREFIX}/loyalty`;
  if (tab === 'Landing') return `${PATH_PREFIX}/landing`;
  if (tab === 'Legal') return `${PATH_PREFIX}/legal`;
  if (tab === 'Settings') return `${PATH_PREFIX}/settings`;
  if (tab === 'Login') return `${PATH_PREFIX}/login`;
  return `${PATH_PREFIX}/dashboard`;
}

export default function AdminApp() {
  const toast = useToast();
  // One sign-out per dead session. The 401 handler and the check below can both
  // reach the same conclusion (and React's dev double-mount runs each twice),
  // which otherwise stacks up four identical toasts.
  const sessionEndedRef = useRef(false);
  const [darkMode, setDarkMode] = useState(loadAdminDarkMode());
  const [admin, setAdmin] = useState(loadAdminUser());
  const [activeTab, setActiveTab] = useState(() => getAdminTab(window.location.pathname));
  const [profileParam, setProfileParam] = useState(() => getProfileParam(window.location.pathname));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync back-button routing
  useEffect(() => {
    const handlePop = () => {
      setActiveTab(getAdminTab(window.location.pathname));
      setProfileParam(getProfileParam(window.location.pathname));
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Sync theme
  useEffect(() => {
    saveAdminDarkMode(darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const navigateTo = useCallback((tab, replace = false, param = null) => {
    const path = tabToPath(tab, param);
    if (replace) {
      window.history.replaceState({ tab }, '', path);
    } else {
      window.history.pushState({ tab }, '', path);
    }
    setActiveTab(tab);
    setProfileParam(param);
  }, []);

  const openUserProfile = useCallback((email) => navigateTo('UserProfile', false, email), [navigateTo]);
  const openOrganizerProfile = useCallback((email) => navigateTo('OrganizerProfile', false, email), [navigateTo]);

  const handleLoginSuccess = (profile) => {
    sessionEndedRef.current = false;
    const updated = { ...profile, isAuthenticated: true };
    saveAdminUser(updated);
    setAdmin(updated);
    navigateTo('Dashboard', true);
  };

  const handleLogout = () => {
    // Drop the JWT with the session — leaving it behind means the next sign-in
    // carries a stale token.
    clearToken();
    const reset = { ...admin, isAuthenticated: false };
    saveAdminUser(reset);
    setAdmin(reset);
    navigateTo('Login', true);
  };

  // The panel's "signed in" flag lives in localStorage while the credentials
  // live in a JWT — check the two still agree, against the server.
  //
  // Without this the console renders in full on a token that is missing,
  // expired, or scoped to another role, and every API call is rejected. Reads
  // hide it (views fall back to an empty list), so the first thing an admin
  // notices is a write failing with "You do not have access to this resource".
  useEffect(() => {
    if (!admin.isAuthenticated) return;
    let cancelled = false;

    const endSession = () => {
      if (cancelled || sessionEndedRef.current) return;
      sessionEndedRef.current = true;
      clearToken();
      const reset = { ...admin, isAuthenticated: false };
      saveAdminUser(reset);
      setAdmin(reset);
      navigateTo('Login', true);
      toast.error('Your admin session has ended. Please sign in again.');
    };

    // Deliberately calls the endpoint directly instead of authApi.fetchMe():
    // fetchMe reports every failure as "not signed in" AND drops the token on
    // the way out, so a request merely aborted by the admin clicking through to
    // the next page would sign them out. Only an outright rejection counts.
    const verify = async () => {
      try {
        const res = await api.get('/auth/me', { cache: false });
        if (!cancelled && res?.role !== 'admin') endSession();
      } catch (err) {
        if (!cancelled && (err?.status === 401 || err?.status === 403)) endSession();
      }
    };

    verify();
    // Re-check when the tab comes back to the front: a 7-day token can lapse
    // while the console sits open.
    const onWake = () => { if (document.visibilityState === 'visible') verify(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('auth-session-expired', endSession);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('auth-session-expired', endSession);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin.isAuthenticated, admin.email]);

  const handleToggleDarkMode = () => setDarkMode(p => !p);

  // Routing gate
  if (!admin.isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Active view switcher
  const renderView = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardView onNavigate={navigateTo} darkMode={darkMode} />;
      case 'Users':
        return <UsersView onOpenProfile={openUserProfile} darkMode={darkMode} />;
      case 'UserProfile':
        return (
          <AdminUserProfileView
            email={profileParam === 'new' ? null : profileParam}
            onBack={() => navigateTo('Users')}
            onNavigateToUser={openUserProfile}
            onNavigateToOrganizer={openOrganizerProfile}
            darkMode={darkMode}
          />
        );
      case 'Organizers':
        return <OrganizersView onOpenProfile={openOrganizerProfile} darkMode={darkMode} />;
      case 'OrganizerProfile':
        return (
          <AdminOrganizerProfileView
            email={profileParam === 'new' ? null : profileParam}
            onBack={() => navigateTo('Organizers')}
            onNavigateToUser={openUserProfile}
            onNavigateToOrganizer={openOrganizerProfile}
            darkMode={darkMode}
          />
        );
      case 'Treks':
        return <TreksView darkMode={darkMode} />;
      case 'TrekRequests':
        return <TrekRequestsView darkMode={darkMode} />;
      case 'Trips':
        return <TripsView onOpenOrganizer={openOrganizerProfile} darkMode={darkMode} />;
      case 'Bookings':
        return <BookingsView darkMode={darkMode} />;
      case 'Payouts':
        return <PayoutsView darkMode={darkMode} />;
      case 'Coupons':
        return <CouponsView darkMode={darkMode} />;
      case 'Analytics':
        return <AnalyticsView darkMode={darkMode} />;
      case 'Broadcast':
        return <BroadcastView darkMode={darkMode} />;
      case 'Loyalty':
        return <LoyaltyProgramView darkMode={darkMode} />;
      case 'Landing':
        return <LandingCmsView darkMode={darkMode} />;
      case 'Legal':
        return <SiteContentView darkMode={darkMode} />;
      case 'Settings':
        return <SettingsView admin={admin} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />;
      case 'NotFound':
        return (
          <NotFoundPage
            homePath="/admin/dashboard"
            homeLabel="Return to Admin Dashboard"
            darkMode={darkMode}
          />
        );
      default:
        return <DashboardView onNavigate={navigateTo} darkMode={darkMode} />;
    }
  };

  return (
    <div className={`min-h-screen w-full flex font-sans transition-colors duration-300 relative overflow-hidden ${
      darkMode ? 'bg-[#0B132B] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
    }`}>
      {/* Glow ambient design spots */}
      <div className="absolute top-[-250px] left-[-250px] w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-[#2D5A27]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Collapsible sidebar */}
      <AdminSidebar
        activeTab={
          activeTab === 'UserProfile' ? 'Users' :
          activeTab === 'OrganizerProfile' ? 'Organizers' :
          activeTab
        }
        onSelectTab={navigateTo}
        onLogout={handleLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        darkMode={darkMode}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Page Content layout */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <AdminHeader
          activeTab={
            activeTab === 'UserProfile' ? 'Hiker Profile' :
            activeTab === 'OrganizerProfile' ? 'Organizer Profile' :
            activeTab
          }
          admin={admin}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onSelectTab={navigateTo}
          onOpenUserProfile={openUserProfile}
          onOpenOrganizerProfile={openOrganizerProfile}
        />

        {/* Dynamic Inner Panel View with AnimatePresence */}
        <div className="flex-1 relative overflow-hidden bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{ willChange: 'opacity, transform' }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
