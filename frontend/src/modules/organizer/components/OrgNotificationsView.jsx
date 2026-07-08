import React from 'react';
import { ArrowLeft, Bell, Megaphone, Sparkles, CalendarCheck, IndianRupee, Info, Trash2 } from 'lucide-react';

const TYPE_ICON = {
  System: Info,
  Updates: Megaphone,
  Promo: Sparkles,
  Booking: CalendarCheck,
  Payment: IndianRupee,
};

const TYPE_COLOR = {
  System: 'text-blue-400 bg-blue-400/10',
  Updates: 'text-spy-orange bg-spy-orange/10',
  Promo: 'text-pink-400 bg-pink-400/10',
  Booking: 'text-emerald-400 bg-emerald-400/10',
  Payment: 'text-amber-400 bg-amber-400/10',
};

export default function OrgNotificationsView({ notifications, onMarkRead, onMarkAllRead, onClear, onBack, darkMode }) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>

      <div className={`px-5 py-4 shrink-0 flex items-center justify-between border-b ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <button id="btn-back-org-notifications" onClick={onBack} className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition ${darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-sm font-display font-black tracking-tight">Notifications</h2>
            <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            id="btn-mark-all-read"
            onClick={onMarkAllRead}
            className="text-xs font-bold text-spy-orange hover:underline shrink-0"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-2.5 pb-8">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block">📭</span>
            <p className={`text-sm font-bold mt-3 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>No notifications yet</p>
            <p className={`text-xs mt-1 leading-relaxed px-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Booking updates, payouts, and platform announcements will show up here.
            </p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = TYPE_ICON[n.type] || Bell;
            const colorCls = TYPE_COLOR[n.type] || 'text-zinc-400 bg-zinc-400/10';
            return (
              <button
                type="button"
                key={n.id}
                onClick={() => !n.read && onMarkRead(n.id)}
                className={`w-full text-left p-3.5 rounded-2xl flex gap-3 transition ${
                  n.read
                    ? (darkMode ? 'bg-zinc-900/40' : 'bg-white shadow-xs')
                    : (darkMode ? 'bg-zinc-900 border border-spy-orange/20' : 'bg-white border border-spy-orange/25 shadow-sm')
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorCls}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold leading-snug">{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-spy-orange shrink-0 mt-1.5" />}
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{n.content}</p>
                  <span className={`text-[10px] mt-1.5 block font-mono ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {new Date(n.timestamp).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {notifications.length > 0 && (
        <div className={`shrink-0 px-5 py-4 border-t ${darkMode ? 'bg-zinc-900/80 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <button
            id="btn-clear-org-notifications"
            onClick={onClear}
            className="w-full py-3 rounded-xl text-sm font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition flex items-center justify-center gap-1.5"
          >
            <Trash2 size={14} /> Clear All Notifications
          </button>
        </div>
      )}
    </div>
  );
}
