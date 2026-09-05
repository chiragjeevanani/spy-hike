import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications = [],
  onMarkRead,
  onClearAll,
  onNavigate,
  darkMode,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end overflow-hidden select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className={`relative w-full max-w-md h-full flex flex-col justify-between p-5 shadow-2xl z-10 ${
              darkMode ? 'bg-zinc-950 text-white border-l border-white/10' : 'bg-white text-zinc-900 border-l border-zinc-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 font-serif font-bold text-base text-forest-600 dark:text-forest-400">
                <Bell size={18} className="text-spy-orange" />
                <span>Notification Center</span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="text-[10px] bg-spy-orange text-white px-2 py-0.5 rounded-full font-sans font-bold">
                    {notifications.filter(n => !n.read).length} new
                  </span>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                  <span className="text-5xl mb-3 opacity-60">📭</span>
                  <h4 className="font-serif text-lg font-semibold">No notifications</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    You're all caught up! Booking updates, special discounts, and expedition alerts will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onMarkRead) onMarkRead(item.id);
                      if (onClose) onClose();
                      if (onNavigate) {
                        const title = (item.title || '').toLowerCase();
                        const content = (item.content || '').toLowerCase();
                        if (title.includes('booking') || content.includes('booking') || content.includes('booked')) {
                          onNavigate('Bookings');
                        } else if (title.includes('explore') || title.includes('trek') || content.includes('trek')) {
                          onNavigate('Explore');
                        } else if (title.includes('reward') || title.includes('loyalty') || content.includes('loyalty')) {
                          onNavigate('Profile');
                        } else {
                          onNavigate('Bookings');
                        }
                      }
                    }}
                    className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 cursor-pointer transition-all hover:scale-[0.99] active:scale-98 ${
                      item.read
                        ? darkMode
                          ? 'bg-zinc-900/40 border-white/5 text-zinc-400'
                          : 'bg-zinc-50 border-zinc-200/70 text-zinc-600'
                        : darkMode
                          ? 'bg-forest-950/30 border-forest-500/30 text-white shadow-xs'
                          : 'bg-forest-50/70 border-forest-200 text-zinc-900 shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-start text-xs font-bold gap-2">
                      <span className="leading-snug">{item.title}</span>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-spy-orange shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed opacity-85">{item.content}</p>
                    <span className="text-[10px] opacity-45 font-mono self-end">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer controls */}
            {notifications.length > 0 && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => notifications.forEach(n => onMarkRead && onMarkRead(n.id))}
                  className="text-forest-600 dark:text-forest-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-zinc-400 hover:text-red-500 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 size={14} /> Clear all
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
