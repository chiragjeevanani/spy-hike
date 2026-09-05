import React, { useState } from 'react';
import {
  ArrowLeft, Bell, Megaphone, Sparkles, CalendarCheck, IndianRupee, Info, Trash2, CheckCircle2,
  Filter, ChevronRight
} from 'lucide-react';

const TYPE_ICON = {
  System: Info,
  Updates: Megaphone,
  Promo: Sparkles,
  Booking: CalendarCheck,
  Payment: IndianRupee,
};

const TYPE_COLOR = {
  System: 'text-blue-400 bg-blue-500/15',
  Updates: 'text-spy-orange bg-spy-orange/15',
  Promo: 'text-pink-400 bg-pink-500/15',
  Booking: 'text-emerald-400 bg-emerald-500/15',
  Payment: 'text-amber-400 bg-amber-500/15',
};

export default function OrgNotificationsView({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClear,
  onBack,
  onNavigateTab,
  darkMode,
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'Unread') return !n.read;
    if (activeFilter === 'Bookings') {
      const type = (n.type || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      return type === 'booking' || title.includes('booking') || title.includes('booked');
    }
    if (activeFilter === 'Financials') {
      const type = (n.type || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      return type === 'payment' || title.includes('payout') || title.includes('settlement');
    }
    return true;
  });

  const handleNotificationClick = (n) => {
    if (!n.read) {
      onMarkRead(n.id);
    }
    if (onNavigateTab) {
      const type = (n.type || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      const content = (n.content || '').toLowerCase();

      if (type === 'booking' || title.includes('booking') || content.includes('booked') || content.includes('traveler')) {
        onNavigateTab('Bookings');
      } else if (type === 'payment' || title.includes('payout') || title.includes('financial')) {
        onNavigateTab('Financials');
      } else if (type === 'promo' || title.includes('reward') || title.includes('loyalty')) {
        onNavigateTab('Loyalty');
      } else if (type === 'chat' || title.includes('message')) {
        onNavigateTab('Chats');
      } else if (type === 'trip' || title.includes('expedition') || title.includes('trek')) {
        onNavigateTab('Trips');
      } else {
        onNavigateTab('Bookings');
      }
    }
  };

  const cardCls = darkMode ? 'bg-zinc-900/80 border border-white/10 shadow-xs' : 'bg-white border border-zinc-200/80 shadow-xs';

  return (
    <div className={`h-full flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3.5">
            <button
              id="btn-back-org-notifications"
              onClick={onBack}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition active:scale-90 cursor-pointer border ${
                darkMode ? 'bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs'
              }`}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight">Notifications</h1>
                {unreadCount > 0 ? (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-spy-orange/15 text-spy-orange border border-spy-orange/20">
                    {unreadCount} Unread
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    All Caught Up
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Booking alerts, traveler payments, reschedule approvals, and platform updates.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                id="btn-mark-all-read"
                onClick={onMarkAllRead}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition active:scale-95 cursor-pointer border ${
                  darkMode ? 'bg-zinc-900 border-white/10 text-spy-orange hover:bg-zinc-800' : 'bg-white border-zinc-200 text-spy-orange hover:bg-orange-50 shadow-xs'
                }`}
              >
                Mark all read
              </button>
            )}

            {notifications.length > 0 && (
              <button
                id="btn-clear-org-notifications"
                onClick={onClear}
                className="px-3.5 py-2 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'All', label: `All (${notifications.length})` },
            { id: 'Unread', label: `Unread (${unreadCount})` },
            { id: 'Bookings', label: 'Bookings' },
            { id: 'Financials', label: 'Payouts' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-spy-orange text-white shadow-sm shadow-spy-orange/30'
                  : darkMode
                  ? 'bg-zinc-900 text-zinc-400 border border-white/10 hover:bg-zinc-800'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl ${cardCls}`}>
            <Bell size={40} className="mx-auto mb-3 text-spy-orange/60" />
            <p className="text-base font-bold mb-1">No notifications found</p>
            <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {activeFilter === 'Unread'
                ? 'You have reviewed all your alerts!'
                : 'Booking updates and payout alerts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const Icon = TYPE_ICON[n.type] || Bell;
              const colorCls = TYPE_COLOR[n.type] || 'text-zinc-400 bg-zinc-400/15';

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 sm:p-5 rounded-3xl flex items-start gap-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.99] border relative ${
                    n.read
                      ? darkMode
                        ? 'bg-zinc-900/60 border-white/5 hover:bg-zinc-900'
                        : 'bg-white border-zinc-200/70 hover:bg-zinc-50'
                      : darkMode
                      ? 'bg-zinc-900 border-spy-orange/30 hover:border-spy-orange/50 shadow-sm shadow-spy-orange/5'
                      : 'bg-white border-orange-200/80 shadow-sm hover:bg-orange-50/20'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${colorCls}`}>
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold leading-snug">{n.title}</span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-spy-orange shrink-0 animate-pulse" />
                        )}
                      </div>

                      <span className={`text-[11px] font-mono shrink-0 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {new Date(n.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {n.content}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-spy-orange">
                      <span>View details</span>
                      <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
