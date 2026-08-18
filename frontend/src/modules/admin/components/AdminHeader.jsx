import React, { useState, useEffect, useRef } from 'react';
import {
  Sun, Moon, Bell, Search, ChevronRight, Check, Menu, X, Shield,
  Building2, Users, Mountain, Compass, Ticket, ClipboardList, Loader2, ArrowRight
} from 'lucide-react';
import { loadBroadcastHistory } from '../utils/storage';
import { performGlobalAdminSearch } from '../utils/adminSearch';

export default function AdminHeader({
  activeTab,
  admin,
  darkMode,
  onToggleDarkMode,
  onOpenMobileMenu,
  onSelectTab,
  onOpenUserProfile,
  onOpenOrganizerProfile,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const recentAlerts = loadBroadcastHistory().slice(0, 4);

  // Debounce search query input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute global fuzzy search when debounced query updates
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(null);
      setSearching(false);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    setShowSearchResults(true);

    performGlobalAdminSearch(debouncedQuery)
      .then((results) => {
        setSearchResults(results);
      })
      .catch(() => {
        setSearchResults({ organizers: [], users: [], treks: [], trips: [], bookings: [], requests: [], totalCount: 0 });
      })
      .finally(() => {
        setSearching(false);
      });
  }, [debouncedQuery]);

  // Close search overlay on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setShowNotifications(false);
      }
    };
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectResult = (type, item) => {
    setShowSearchResults(false);
    setSearchQuery('');

    if (type === 'organizer' && onOpenOrganizerProfile) {
      onOpenOrganizerProfile(item.email);
    } else if (type === 'user' && onOpenUserProfile) {
      onOpenUserProfile(item.email);
    } else if (type === 'trek' && onSelectTab) {
      onSelectTab('Treks');
    } else if (type === 'trip' && onSelectTab) {
      onSelectTab('Trips');
    } else if (type === 'booking' && onSelectTab) {
      onSelectTab('Bookings');
    } else if (type === 'request' && onSelectTab) {
      onSelectTab('TrekRequests');
    }
  };

  return (
    <header
      className={`h-16 sticky top-0 px-4 sm:px-6 border-b flex items-center justify-between z-30 transition-all duration-300 ${
        darkMode
          ? 'bg-[#0E162F]/95 border-slate-800 text-slate-100 backdrop-blur-md'
          : 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-md'
      }`}
    >
      {/* Mobile Hamburger & Breadcrumb info */}
      <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-semibold tracking-wide min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className={`p-2 rounded-lg border md:hidden transition-colors mr-1 ${
            darkMode ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
          title="Open Admin Menu"
        >
          <Menu size={16} />
        </button>

        <span className="text-slate-400 hidden sm:inline truncate">Find Your Trek Admin</span>
        <ChevronRight size={12} className="text-slate-400 hidden sm:inline shrink-0" />
        <span className={`truncate font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeTab}</span>
      </div>

      {/* Global Controls */}
      <div className="flex items-center gap-3.5">

        {/* Global Fuzzy Search Bar */}
        <div ref={searchRef} className="relative w-48 sm:w-64 md:w-80">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search hikers, organizers, treks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (debouncedQuery && searchResults) setShowSearchResults(true); }}
              className={`w-full pl-9 pr-8 py-1.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
                darkMode
                  ? 'bg-slate-900/90 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-[#F27D26]/80 focus:bg-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#F27D26]/80 focus:bg-white'
              }`}
            />
            {searching ? (
              <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F27D26] animate-spin" />
            ) : searchQuery ? (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(null); setShowSearchResults(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          {/* Categorized Fuzzy Search Overlay */}
          {showSearchResults && (
            <div
              className={`absolute left-0 right-0 md:w-96 mt-2 rounded-2xl border shadow-2xl p-3.5 z-50 max-h-[80vh] overflow-y-auto no-scrollbar animate-scaleIn ${
                darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              {searching ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                  <Loader2 size={16} className="animate-spin text-[#F27D26]" />
                  <span>Searching resources...</span>
                </div>
              ) : !searchResults || searchResults.totalCount === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                  No matching resources found for "{debouncedQuery}".
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Search Results ({searchResults.totalCount})
                    </span>
                  </div>

                  {/* Organizers */}
                  {searchResults.organizers.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Building2 size={11} className="text-[#F27D26]" /> Organizers ({searchResults.organizers.length})
                      </span>
                      {searchResults.organizers.map((org) => (
                        <div
                          key={org.email}
                          onClick={() => handleSelectResult('organizer', org)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-900/80 bg-slate-900/40' : 'hover:bg-slate-100 bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{org.agencyName || org.name}</div>
                            <div className="text-[10px] text-slate-400">{org.email} • {org.location || 'Partner'}</div>
                          </div>
                          <ArrowRight size={12} className="text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hikers / Users */}
                  {searchResults.users.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Users size={11} className="text-emerald-500" /> Hikers & Users ({searchResults.users.length})
                      </span>
                      {searchResults.users.map((u) => (
                        <div
                          key={u.email}
                          onClick={() => handleSelectResult('user', u)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-900/80 bg-slate-900/40' : 'hover:bg-slate-100 bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{u.name}</div>
                            <div className="text-[10px] text-slate-400">{u.email} • {u.hikingExperience || 'Hiker'}</div>
                          </div>
                          <ArrowRight size={12} className="text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trek Categories */}
                  {searchResults.treks.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Mountain size={11} className="text-amber-500" /> Trek Categories ({searchResults.treks.length})
                      </span>
                      {searchResults.treks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleSelectResult('trek', t)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-900/80 bg-slate-900/40' : 'hover:bg-slate-100 bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{t.title}</div>
                            <div className="text-[10px] text-slate-400">{t.location} • {t.difficulty}</div>
                          </div>
                          <ArrowRight size={12} className="text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trips */}
                  {searchResults.trips.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Compass size={11} className="text-blue-500" /> Trips ({searchResults.trips.length})
                      </span>
                      {searchResults.trips.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleSelectResult('trip', t)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-900/80 bg-slate-900/40' : 'hover:bg-slate-100 bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{t.name}</div>
                            <div className="text-[10px] text-slate-400">{t.location} • ₹{t.price}</div>
                          </div>
                          <ArrowRight size={12} className="text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bookings */}
                  {searchResults.bookings.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Ticket size={11} className="text-purple-500" /> Bookings ({searchResults.bookings.length})
                      </span>
                      {searchResults.bookings.map((b) => (
                        <div
                          key={b.bookingId || b.id}
                          onClick={() => handleSelectResult('booking', b)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-900/80 bg-slate-900/40' : 'hover:bg-slate-100 bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{b.bookingId} — {b.tripName}</div>
                            <div className="text-[10px] text-slate-400">{b.userName} • {b.status}</div>
                          </div>
                          <ArrowRight size={12} className="text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Category Requests */}
                  {searchResults.requests.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <ClipboardList size={11} className="text-rose-500" /> Category Requests ({searchResults.requests.length})
                      </span>
                      {searchResults.requests.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => handleSelectResult('request', r)}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            darkMode ? 'hover:bg-slate-900/80 bg-slate-900/40' : 'hover:bg-slate-100 bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{r.title}</div>
                            <div className="text-[10px] text-slate-400">{r.location} • {r.organizerEmail}</div>
                          </div>
                          <ArrowRight size={12} className="text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          className={`p-2 rounded-lg border transition-colors hover:scale-105 active:scale-95 ${
            darkMode
              ? 'border-slate-800 bg-slate-900 text-amber-400'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0); }}
            className={`p-2 rounded-lg border transition-colors relative hover:scale-105 active:scale-95 ${
              darkMode
                ? 'border-slate-800 bg-slate-900 text-slate-400'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
            title="System Broadcasts & Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F27D26] rounded-full border border-white dark:border-slate-900 animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div
                className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl p-4 z-50 animate-scaleIn ${
                  darkMode
                    ? 'bg-[#152243] border-slate-800 text-white'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
                    <Bell size={13} className="text-[#F27D26]" /> System Broadcasts
                  </span>
                  <button
                    onClick={() => {
                      if (onSelectTab) onSelectTab('Broadcast');
                      setShowNotifications(false);
                    }}
                    className="text-[10px] text-[#F27D26] font-bold hover:underline"
                  >
                    View Feed →
                  </button>
                </div>
                <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar">
                  {recentAlerts.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No system broadcasts yet.</p>
                  ) : (
                    recentAlerts.map((alert, i) => (
                      <div
                        key={alert.id || i}
                        className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                          darkMode ? 'bg-slate-900/60 border border-slate-800' : 'bg-slate-50 border border-slate-100'
                        }`}
                      >
                        <div className="flex justify-between font-bold text-[11px] mb-0.5">
                          <span className="text-[#F27D26]">{alert.title}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {alert.type || 'Updates'}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{alert.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Info - Avatar Photo Image Removed as requested */}
        <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold text-xs shrink-0 border border-[#F27D26]/20">
            <Shield size={16} />
          </div>
          <div className="hidden md:flex flex-col text-left leading-tight select-none">
            <span className="text-xs font-bold text-slate-800 dark:text-white">{admin.name}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#F27D26]">{admin.role}</span>
          </div>
        </div>

      </div>
    </header>
  );
}
