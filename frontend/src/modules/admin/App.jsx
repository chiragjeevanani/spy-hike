import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { 
  loadAdminUser, saveAdminUser, 
  loadAdminDarkMode, saveAdminDarkMode 
} from './utils/storage';

import AdminLogin from './components/AdminLogin';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import DashboardView from './components/DashboardView';
import UsersView from './components/UsersView';
import AdminUserProfileView from './components/AdminUserProfileView';
import OrganizersView from './components/OrganizersView';
import AdminOrganizerProfileView from './components/AdminOrganizerProfileView';
import TripsView from './components/TripsView';
import BookingsView from './components/BookingsView';
import PayoutsView from './components/PayoutsView';
import CouponsView from './components/CouponsView';
import AnalyticsView from './components/AnalyticsView';
import BroadcastView from './components/BroadcastView';
import LoyaltyProgramView from './components/LoyaltyProgramView';
import LandingCmsView from './components/LandingCmsView';
import SettingsView from './components/SettingsView';

const PATH_PREFIX = '/admin';

function getAdminTab(pathname) {
  const p = pathname.replace(PATH_PREFIX, '').replace(/^\//, '');
  if (!p || p === '' || p === 'dashboard') return 'Dashboard';
  if (p === 'users') return 'Users';
  if (p.startsWith('users/')) return 'UserProfile';
  if (p === 'organizers') return 'Organizers';
  if (p.startsWith('organizers/')) return 'OrganizerProfile';
  if (p === 'trips') return 'Trips';
  if (p === 'bookings') return 'Bookings';
  if (p === 'payouts') return 'Payouts';
  if (p === 'coupons') return 'Coupons';
  if (p === 'analytics') return 'Analytics';
  if (p === 'broadcast') return 'Broadcast';
  if (p === 'loyalty') return 'Loyalty';
  if (p === 'landing') return 'Landing';
  if (p === 'settings') return 'Settings';
  if (p === 'login') return 'Login';
  return 'Dashboard';
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
  if (tab === 'Trips') return `${PATH_PREFIX}/trips`;
  if (tab === 'Bookings') return `${PATH_PREFIX}/bookings`;
  if (tab === 'Payouts') return `${PATH_PREFIX}/payouts`;
  if (tab === 'Coupons') return `${PATH_PREFIX}/coupons`;
  if (tab === 'Analytics') return `${PATH_PREFIX}/analytics`;
  if (tab === 'Broadcast') return `${PATH_PREFIX}/broadcast`;
  if (tab === 'Loyalty') return `${PATH_PREFIX}/loyalty`;
  if (tab === 'Landing') return `${PATH_PREFIX}/landing`;
  if (tab === 'Settings') return `${PATH_PREFIX}/settings`;
  if (tab === 'Login') return `${PATH_PREFIX}/login`;
  return `${PATH_PREFIX}/dashboard`;
}

export default function AdminApp() {
  const [darkMode, setDarkMode] = useState(loadAdminDarkMode());
  const [admin, setAdmin] = useState(loadAdminUser());
  const [activeTab, setActiveTab] = useState(() => getAdminTab(window.location.pathname));
  const [profileParam, setProfileParam] = useState(() => getProfileParam(window.location.pathname));
  const [collapsed, setCollapsed] = useState(false);

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
    const updated = { ...profile, isAuthenticated: true };
    saveAdminUser(updated);
    setAdmin(updated);
    navigateTo('Dashboard', true);
  };

  const handleLogout = () => {
    const reset = { ...admin, isAuthenticated: false };
    saveAdminUser(reset);
    setAdmin(reset);
    navigateTo('Login', true);
  };

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
      case 'Trips':
        return <TripsView darkMode={darkMode} />;
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
      case 'Settings':
        return <SettingsView admin={admin} darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />;
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
        />

        {/* Dynamic Inner Panel View with AnimatePresence */}
        <div className="flex-1 relative overflow-hidden bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
