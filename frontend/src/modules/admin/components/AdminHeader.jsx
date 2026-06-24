/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sun, Moon, Bell, Search, ChevronRight, Check } from 'lucide-react';
import { loadBroadcastHistory } from '../utils/storage';

export default function AdminHeader({ activeTab, admin, darkMode, onToggleDarkMode }) {
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Load some notifications/broadcasts as recent items
  const recentAlerts = loadBroadcastHistory().slice(0, 3);

  return (
    <header 
      className={`h-16 sticky top-0 px-6 border-b flex items-center justify-between z-20 transition-all duration-300 ${
        darkMode 
          ? 'bg-[#0E162F]/90 border-slate-800 text-slate-100 backdrop-blur-md' 
          : 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-md'
      }`}
    >
      {/* Breadcrumb info */}
      <div className="flex items-center gap-2.5 text-xs font-semibold tracking-wide">
        <span className="text-slate-400">Spy Hike Admin</span>
        <ChevronRight size={12} className="text-slate-400" />
        <span className={darkMode ? 'text-white' : 'text-slate-800'}>{activeTab}</span>
      </div>

      {/* Global Controls */}
      <div className="flex items-center gap-4">
        
        {/* Search */}
        <div className="relative max-w-64 hidden sm:block">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search resources..."
            className={`w-full pl-9 pr-4 py-1.5 rounded-lg border outline-none text-xs font-semibold transition-all ${
              darkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-[#F27D26]/60' 
                : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#F27D26]/60'
            }`}
          />
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
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-lg border transition-colors relative hover:scale-105 active:scale-95 ${
              darkMode 
                ? 'border-slate-800 bg-slate-900 text-slate-400' 
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            <Bell size={15} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F27D26] rounded-full border border-white dark:border-slate-900" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)} 
              />
              <div 
                className={`absolute right-0 mt-2 w-80 rounded-xl border shadow-xl p-4 z-50 animate-scaleIn ${
                  darkMode 
                    ? 'bg-[#152243] border-slate-800 text-white' 
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black tracking-wider uppercase">Recent System Broadcasts</span>
                  <span className="text-[10px] text-[#F27D26] font-bold">Live Feed</span>
                </div>
                <div className="space-y-2.5">
                  {recentAlerts.map((alert, i) => (
                    <div 
                      key={alert.id || i}
                      className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                        darkMode ? 'bg-slate-900/60' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between font-bold text-[11px] mb-0.5">
                        <span className="text-[#F27D26]">{alert.title}</span>
                        <span className="text-[9px] text-slate-400">{alert.type}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">{alert.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
          <img
            src={admin.avatar}
            alt={admin.name}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 object-cover shrink-0"
          />
          <div className="hidden md:flex flex-col text-left leading-tight select-none">
            <span className="text-xs font-bold">{admin.name}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#F27D26]">{admin.role}</span>
          </div>
        </div>

      </div>
    </header>
  );
}
