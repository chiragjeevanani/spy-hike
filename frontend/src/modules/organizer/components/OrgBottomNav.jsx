import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Map, CalendarCheck, MessageCircle, User } from 'lucide-react';

export default function OrgBottomNav({ activeTab, onChangeTab, darkMode, unreadChats = 0 }) {
  const tabs = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Trips', label: 'My Trips', icon: Map },
    { id: 'Bookings', label: 'Bookings', icon: CalendarCheck },
    { id: 'Profile', label: 'Profile', icon: User },
  ];

  return (
    <div className={`border-t flex justify-around items-center px-2 py-2 select-none z-40 ${
      darkMode ? 'bg-elegant-app border-white/5' : 'bg-white/95 border-gray-100 backdrop-blur-md'
    }`}>
      {tabs.map(tab => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`org-nav-tab-${tab.id.toLowerCase()}`}
            onClick={() => onChangeTab(tab.id)}
            className="flex flex-col items-center justify-center relative py-1 flex-1 cursor-pointer"
          >
            <div className={`p-1 rounded-full relative transition-colors duration-300 ${
              isActive
                ? (darkMode ? 'text-spy-orange' : 'text-spy-orange')
                : (darkMode ? 'text-white/40 hover:text-white' : 'text-zinc-400 hover:text-zinc-650')
            }`}>
              <motion.div
                animate={isActive ? { y: [0, -4, 0], scale: [1, 1.1, 1] } : { y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                whileTap={{ scale: 0.85 }}
                className="flex items-center justify-center"
              >
                <IconComponent size={19} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              {tab.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border border-white dark:border-elegant-app scale-90">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-wider uppercase font-semibold mt-0.5 ${
              isActive ? 'text-spy-orange font-bold' : (darkMode ? 'text-white/40' : 'text-zinc-450')
            }`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.span
                layoutId="orgActiveTabIndicator"
                className="absolute bottom-0 w-3 h-0.5 rounded-full bg-spy-orange"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
