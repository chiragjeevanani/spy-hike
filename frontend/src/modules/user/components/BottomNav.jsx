/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
    <div className={`border-t flex justify-around items-center px-2 py-2 select-none z-40 ${
      darkMode 
        ? 'bg-elegant-app border-white/5' 
        : 'bg-white/95 border-gray-100 backdrop-blur-md'
    }`}>
      {tabs.map(tab => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id.toLowerCase()}`}
            onClick={() => onChangeTab(tab.id)}
            className="flex flex-col items-center justify-center relative py-1 flex-1 cursor-pointer"
          >
            <div className={`p-1 rounded-full relative transition-colors duration-300 ${
              isActive 
                ? (darkMode ? 'text-elegant-orange' : 'text-forest-600') 
                : (darkMode ? 'text-white/40 hover:text-white' : 'text-zinc-400 hover:text-zinc-650')
            }`}>
              <motion.div
                animate={isActive ? (
                  tab.id === 'Home' ? { y: [0, -4, 0] } :
                  tab.id === 'Explore' ? { rotate: [0, 180, 360] } :
                  tab.id === 'Bookings' ? { rotate: [0, -10, 10, 0], scale: 1.1 } :
                  tab.id === 'Wishlist' ? { scale: [1, 1.3, 0.9, 1.1, 1] } :
                  { y: [0, -2, 0], scale: 1.1 } // Profile default
                ) : { y: 0, rotate: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                whileTap={{ scale: 0.85 }}
                className="flex items-center justify-center"
              >
                <IconComponent size={19} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              
              {/* Hot dot count badges for wishlist */}
              {tab.countKey && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border border-white dark:border-elegant-app scale-90">
                  {wishlistCount}
                </span>
              )}
            </div>
            
            <span className={`text-[10px] tracking-wider uppercase font-semibold mt-0.5 ${
              isActive 
                ? (darkMode ? 'text-elegant-orange font-bold' : 'text-forest-600 font-bold') 
                : (darkMode ? 'text-white/40' : 'text-zinc-450')
            }`}>
              {tab.label}
            </span>

            {/* Micro horizontal active line indicator */}
            {isActive && (
              <motion.span 
                layoutId="activeTabIndicator"
                className={`absolute bottom-0 w-3 h-0.5 rounded-full ${
                  darkMode ? 'bg-elegant-orange' : 'bg-forest-500'
                }`}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
