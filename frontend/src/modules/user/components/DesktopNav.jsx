import React from 'react';
import { motion } from 'motion/react';
import {
  Home, Compass, CalendarDays, Heart, User, MapPin,
  ChevronDown, Bell, Sun, Moon, Building2
} from 'lucide-react';
import AppLogo from '../../../components/AppLogo';

export default function DesktopNav({
  activeTab,
  onChangeTab,
  darkMode,
  onToggleDarkMode,
  wishlistCount = 0,
  userLocation,
  onOpenLocationPicker,
  unreadCount = 0,
  onOpenNotifications,
  user,
  onLaunchOrganizer,
}) {
  const navTabs = [
    { id: 'Home', label: 'Home', icon: Home },
    { id: 'Explore', label: 'Explore', icon: Compass },
    { id: 'Bookings', label: 'Bookings', icon: CalendarDays },
    { id: 'Wishlist', label: 'Wishlist', icon: Heart, count: wishlistCount },
    { id: 'Profile', label: 'Profile', icon: User },
  ];

  const cityLabel = (userLocation?.label || 'India').split(',')[0];

  return (
    <header
      id="desktop-navigation-header"
      className={`hidden md:block sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300 select-none ${
        darkMode
          ? 'bg-zinc-950/85 border-white/10 text-white shadow-sm'
          : 'bg-white/90 border-zinc-200/80 text-zinc-900 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onChangeTab('Home')}
            className="flex items-center gap-2.5 cursor-pointer group focus:outline-hidden"
          >
            <AppLogo size={36} className="text-forest-600 dark:text-forest-400 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col text-left">
              <span className="font-serif font-bold text-lg leading-none tracking-tight">
                Find Your Trek
              </span>
              <span className="text-[9px] tracking-widest uppercase opacity-55 font-sans font-semibold mt-0.5">
                Alpine Explorations
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
                id={`desktop-nav-${tab.id.toLowerCase()}`}
                onClick={() => onChangeTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? darkMode
                      ? 'bg-white/10 text-elegant-orange shadow-xs'
                      : 'bg-forest-50 text-forest-600 shadow-xs'
                    : darkMode
                      ? 'text-zinc-300 hover:text-white hover:bg-white/5'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                <span>{tab.label}</span>

                {Boolean(tab.count) && tab.count > 0 && (
                  <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-spy-orange text-white text-[10px] font-bold flex items-center justify-center">
                    {tab.count}
                  </span>
                )}

                {isActive && (
                  <motion.div
                    layoutId="desktop-nav-active-pill"
                    className={`absolute inset-0 rounded-full border pointer-events-none ${
                      darkMode ? 'border-elegant-orange/40' : 'border-forest-600/30'
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
          {/* Location selector */}
          <button
            id="btn-desktop-location"
            onClick={onOpenLocationPicker}
            title="Change City"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-xs ${
              darkMode
                ? 'bg-zinc-900/90 border-white/10 hover:border-white/20 text-zinc-200'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-700'
            }`}
          >
            <MapPin size={13} className="text-spy-orange shrink-0" />
            <span className="truncate max-w-[120px]">{cityLabel}</span>
            <ChevronDown size={12} className="opacity-50" />
          </button>

          {/* Theme toggle */}
          <button
            id="btn-desktop-theme-toggle"
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

          {/* Notifications bell */}
          <button
            id="btn-desktop-notifications"
            onClick={onOpenNotifications}
            title="Notifications"
            className={`w-9 h-9 rounded-full flex items-center justify-center border relative transition-all cursor-pointer shadow-xs ${
              darkMode
                ? 'bg-zinc-900/90 border-white/10 hover:border-white/20 text-zinc-200'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-600'
            }`}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-spy-orange text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-950">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Organizer Link */}
          {onLaunchOrganizer && (
            <button
              id="btn-desktop-organizer"
              onClick={onLaunchOrganizer}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                darkMode
                  ? 'border-white/10 hover:bg-white/5 text-zinc-300'
                  : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'
              }`}
            >
              <Building2 size={13} className="text-spy-orange" />
              <span>Organizer</span>
            </button>
          )}

          {/* User Profile Avatar / Pill */}
          <button
            id="btn-desktop-profile-quick"
            onClick={() => onChangeTab('Profile')}
            className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border cursor-pointer active:scale-95 transition-all shadow-xs ${
              darkMode
                ? 'bg-zinc-900 border-white/10 hover:border-white/20'
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-forest-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.name || 'A')[0].toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs font-semibold max-w-[90px] truncate">
              {user?.name?.split(' ')[0] || 'Explorer'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
