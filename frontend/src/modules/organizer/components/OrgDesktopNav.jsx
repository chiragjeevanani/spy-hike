import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard, Map, CalendarCheck, User,
  Bell, Sun, Moon, ScanBarcode, MessageCircle, Compass
} from 'lucide-react';
import AppLogo from '../../../components/AppLogo';

export default function OrgDesktopNav({
  activeTab,
  onChangeTab,
  darkMode,
  onToggleDarkMode,
  unreadChats = 0,
  onOpenChats,
  unreadNotifs = 0,
  onOpenNotifications,
  onOpenScanner,
  organizer,
  onSwitchToTraveller,
}) {
  const navTabs = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Trips', label: 'My Trips', icon: Map },
    { id: 'Bookings', label: 'Bookings', icon: CalendarCheck },
    { id: 'Profile', label: 'Profile', icon: User },
  ];

  return (
    <header
      id="org-desktop-navigation-header"
      className={`hidden md:block sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300 select-none ${
        darkMode
          ? 'bg-zinc-950/85 border-white/10 text-white shadow-sm'
          : 'bg-white/95 border-zinc-200/80 text-zinc-900 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onChangeTab('Dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group focus:outline-hidden"
          >
            <AppLogo size={36} className="text-spy-orange group-hover:scale-105 transition-transform" />
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg leading-none tracking-tight">
                  Find Your Trek
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-spy-orange/15 text-spy-orange font-bold uppercase tracking-wider">
                  Partner
                </span>
              </div>
              <span className="text-[9px] tracking-widest uppercase opacity-55 font-sans font-semibold mt-0.5">
                Expedition Organizer Portal
              </span>
            </div>
          </button>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-1.5 lg:gap-2">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`org-desktop-nav-${tab.id.toLowerCase()}`}
                onClick={() => onChangeTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? darkMode
                      ? 'bg-white/10 text-spy-orange shadow-xs'
                      : 'bg-orange-50 text-spy-orange shadow-xs'
                    : darkMode
                      ? 'text-zinc-300 hover:text-white hover:bg-white/5'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                <span>{tab.label}</span>

                {isActive && (
                  <motion.div
                    layoutId="org-desktop-nav-active-pill"
                    className={`absolute inset-0 rounded-full border pointer-events-none ${
                      darkMode ? 'border-spy-orange/40' : 'border-spy-orange/30'
                    }`}
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Ticket QR Scanner */}
          {onOpenScanner && (
            <button
              id="btn-org-desktop-scanner"
              onClick={onOpenScanner}
              title="Scan Ticket QR"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-xs ${
                darkMode
                  ? 'bg-zinc-900/90 border-white/10 hover:border-white/20 text-zinc-200'
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-700'
              }`}
            >
              <ScanBarcode size={14} className="text-spy-orange shrink-0" />
              <span className="hidden lg:inline">Scan QR</span>
            </button>
          )}

          {/* Customer Messages */}
          {onOpenChats && (
            <button
              id="btn-org-desktop-chats"
              onClick={onOpenChats}
              title="Customer Inquiries"
              className={`w-9 h-9 rounded-full flex items-center justify-center border relative transition-all cursor-pointer shadow-xs ${
                darkMode
                  ? 'bg-zinc-900/90 border-white/10 hover:border-white/20 text-zinc-200'
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-600'
              }`}
            >
              <MessageCircle size={15} />
              {unreadChats > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-spy-orange text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-950">
                  {unreadChats}
                </span>
              )}
            </button>
          )}

          {/* Notifications */}
          {onOpenNotifications && (
            <button
              id="btn-org-desktop-notifications"
              onClick={onOpenNotifications}
              title="Notifications"
              className={`w-9 h-9 rounded-full flex items-center justify-center border relative transition-all cursor-pointer shadow-xs ${
                darkMode
                  ? 'bg-zinc-900/90 border-white/10 hover:border-white/20 text-zinc-200'
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-600'
              }`}
            >
              <Bell size={15} />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-spy-orange text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-950">
                  {unreadNotifs}
                </span>
              )}
            </button>
          )}

          {/* Theme toggle */}
          <button
            id="btn-org-desktop-theme-toggle"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-xs ${
              darkMode
                ? 'bg-zinc-900/90 border-white/10 hover:border-white/20 text-yellow-400'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-600'
            }`}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Switch to Traveller Portal */}
          {onSwitchToTraveller && (
            <button
              id="btn-org-desktop-switch-traveller"
              onClick={onSwitchToTraveller}
              title="Switch to Traveller View"
              className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                darkMode
                  ? 'border-white/10 hover:bg-white/5 text-zinc-300'
                  : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'
              }`}
            >
              <Compass size={13} className="text-forest-500" />
              <span>Traveller App</span>
            </button>
          )}

          {/* Organizer Profile Avatar / Pill */}
          <button
            id="btn-org-desktop-profile-quick"
            onClick={() => onChangeTab('Profile')}
            className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border cursor-pointer active:scale-95 transition-all shadow-xs ${
              darkMode
                ? 'bg-zinc-900 border-white/10 hover:border-white/20'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-spy-orange text-white font-bold text-xs flex items-center justify-center overflow-hidden">
              {organizer?.avatar ? (
                <img src={organizer.avatar} alt={organizer?.name || 'Partner'} className="w-full h-full object-cover" />
              ) : (
                <span>{(organizer?.agencyName || organizer?.name || 'P')[0].toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs font-semibold max-w-[120px] truncate">
              {organizer?.agencyName || organizer?.name || 'Partner'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
