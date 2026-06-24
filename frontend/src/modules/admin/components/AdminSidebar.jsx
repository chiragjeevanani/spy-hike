/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Building2, Compass, 
  Ticket, BarChart3, Megaphone, Settings, 
  LogOut, Shield, ChevronLeft, Menu 
} from 'lucide-react';
import { loadAllOrganizers } from '../utils/storage';

export default function AdminSidebar({ activeTab, onSelectTab, onLogout, collapsed, setCollapsed, darkMode }) {
  const [pendingCount, setPendingCount] = useState(0);

  // Compute pending applications dynamically
  useEffect(() => {
    const checkPending = () => {
      const orgs = loadAllOrganizers();
      const pending = orgs.filter(o => o.isPendingApproval && !o.isApproved);
      setPendingCount(pending.length);
    };

    checkPending();
    // Poll every 5 seconds to keep dashboard reactive
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Users', label: 'Users', icon: Users },
    { id: 'Organizers', label: 'Organizers', icon: Building2, badge: pendingCount },
    { id: 'Trips', label: 'Trips', icon: Compass },
    { id: 'Bookings', label: 'Bookings', icon: Ticket },
    { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'Broadcast', label: 'Broadcast', icon: Megaphone },
    { id: 'Settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div 
      className={`h-screen sticky top-0 flex flex-col border-r transition-all duration-300 z-30 shrink-0 ${
        darkMode 
          ? 'bg-[#0E162F] border-slate-800 text-slate-200' 
          : 'bg-white border-slate-200 text-slate-700'
      } ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Sidebar Header Brand */}
      <div className={`p-5 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <Shield className="text-[#F27D26]" size={20} />
          </div>
          {!collapsed && (
            <div className="flex flex-col select-none animate-fadeIn">
              <span className="font-display font-black text-sm tracking-tight text-slate-800 dark:text-white leading-none">Spy Hike</span>
              <span className="text-[10px] font-bold text-[#F27D26] uppercase tracking-wider mt-1">Admin Console</span>
            </div>
          )}
        </div>
        
        {/* Toggle Collapse */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            darkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <ChevronLeft size={16} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all group relative ${
                isActive 
                  ? 'bg-[#F27D26] text-white shadow-lg shadow-orange-500/15' 
                  : darkMode 
                    ? 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-100' 
                    : 'hover:bg-slate-50 text-slate-600 hover:text-[#F27D26]'
              }`}
            >
              <Icon size={18} className={`shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : ''}`} />
              
              {!collapsed && (
                <span className="animate-fadeIn">{item.label}</span>
              )}

              {/* Pending Badge */}
              {item.badge > 0 && (
                <span className={`absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-black ${
                  isActive 
                    ? 'bg-white text-[#F27D26]' 
                    : 'bg-rose-500 text-white animate-pulse'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Tooltip on Collapsed */}
              {collapsed && (
                <div className="absolute left-20 bg-slate-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-md translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap">
                  {item.label}
                  {item.badge > 0 && ` (${item.badge})`}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className={`p-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-colors group relative ${
            darkMode 
              ? 'hover:bg-rose-500/10 text-slate-400 hover:text-rose-400' 
              : 'hover:bg-rose-50 text-slate-600 hover:text-rose-600'
          }`}
        >
          <LogOut size={18} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
          {!collapsed && <span className="animate-fadeIn">Logout</span>}
          
          {collapsed && (
            <div className="absolute left-20 bg-rose-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-md translate-x-2 group-hover:translate-x-0 z-50 whitespace-nowrap">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
