import React from 'react';
import { motion } from 'motion/react';
import { Home, Compass, CalendarDays, Heart, User } from 'lucide-react';

export default function BottomNav({ activeTab, onChangeTab, darkMode, wishlistCount }) {
  const tabs = [
    { id: 'Home', label: 'Home', icon: Home },
    { id: 'Explore', label: 'Explore', icon: Compass },
    { id: 'Bookings', label: 'Bookings', icon: CalendarDays },
    { id: 'Wishlist', label: 'Wishlist', icon: Heart, countKey: true },
    { id: 'Profile', label: 'Profile', icon: User },
  ];

  return (
    // Floating glassmorphic pill — the transparent wrapper reserves height so
    // scrolling content stops above the bar.
    <div className="px-4 pb-3 pt-1 z-40 shrink-0">
      <div
        className={`flex justify-around items-center rounded-3xl px-2 py-2.5 shadow-lg border backdrop-blur-xl ${
          darkMode
            ? 'bg-elegant-card/70 border-white/10 shadow-black/40'
            : 'bg-white/65 border-white/60 shadow-zinc-300/40'
        }`}
      >
        {tabs.map(tab => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id.toLowerCase()}`}
              onClick={() => onChangeTab(tab.id)}
              className="flex flex-col items-center justify-center relative flex-1 cursor-pointer"
            >
              <div className={`relative transition-colors duration-300 ${
                isActive
                  ? (darkMode ? 'text-elegant-orange' : 'text-forest-600')
                  : (darkMode ? 'text-white/45 hover:text-white' : 'text-zinc-400 hover:text-zinc-600')
              }`}>
                <motion.div
                  animate={isActive ? (
                    tab.id === 'Home' ? { y: [0, -4, 0] } :
                    tab.id === 'Explore' ? { rotate: [0, 180, 360] } :
                    tab.id === 'Bookings' ? { rotate: [0, -10, 10, 0], scale: 1.1 } :
                    tab.id === 'Wishlist' ? { scale: [1, 1.3, 0.9, 1.1, 1] } :
                    { y: [0, -2, 0], scale: 1.1 }
                  ) : { y: 0, rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  whileTap={{ scale: 0.85 }}
                  className="flex items-center justify-center"
                >
                  <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>

                {tab.countKey && wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border border-white dark:border-elegant-card scale-90">
                    {wishlistCount}
                  </span>
                )}
              </div>

              <span className={`text-[9px] tracking-wider uppercase font-semibold mt-1 ${
                isActive
                  ? (darkMode ? 'text-elegant-orange font-bold' : 'text-forest-600 font-bold')
                  : (darkMode ? 'text-white/45' : 'text-zinc-400')
              }`}>
                {tab.label}
              </span>

              {isActive && (
                <motion.span
                  layoutId="activeTabIndicator"
                  className={`absolute -bottom-1 w-4 h-0.5 rounded-full ${
                    darkMode ? 'bg-elegant-orange' : 'bg-forest-500'
                  }`}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
