/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bell, Star, MapPin, Sparkles, Flame, Mountain, Compass, Tent, Trees, CalendarDays, Heart, ChevronRight, X, Sun, Moon
} from 'lucide-react';
import { CATEGORIES_LIST, PROMOTIONAL_BANNERS, TRENDING_DESTINATIONS } from '../data/trips';

export default function HomeView({
  user,
  trips,
  wishlist,
  onToggleWishlist,
  onSelectTrip,
  onSwitchTab,
  onApplyCategory,
  onApplySearch,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  darkMode,
  onToggleDarkMode
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activePromoIdx, setActivePromoIdx] = useState(0);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Auto-cycle banner slides every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePromoIdx(prev => (prev + 1) % PROMOTIONAL_BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic greeting based on current local hours
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onApplySearch(searchQuery.trim());
      onSwitchTab('Explore');
    }
  };

  const handleCategoryClick = (catName) => {
    onApplyCategory(catName);
    onSwitchTab('Explore');
  };

  const handleDestinationClick = (destName) => {
    onApplySearch(destName);
    onSwitchTab('Explore');
  };

  // AI-Style recommendation core logic:
  // Match hikes based on user fitness and hiking experience
  // Beginner experience -> Easy diff hikes
  // Intermediate -> Easy and Moderate hikes
  // Advanced -> Moderate and Difficult hikes
  const getSmartRecommendations = () => {
    let experienceMatched = trips;
    if (user.hikingExperience === 'Beginner') {
      experienceMatched = trips.filter(t => t.difficulty === 'Easy');
    } else if (user.hikingExperience === 'Intermediate') {
      experienceMatched = trips.filter(t => t.difficulty === 'Easy' || t.difficulty === 'Moderate');
    } else if (user.hikingExperience === 'Advanced') {
      experienceMatched = trips.filter(t => t.difficulty === 'Moderate' || t.difficulty === 'Difficult');
    }

    // fallback to list all if none or empty
    if (experienceMatched.length === 0) return trips.slice(0, 2);
    return experienceMatched.slice(0, 3);
  };

  const recommendedTrips = getSmartRecommendations();
  const unreadNotifications = notifications.filter(n => !n.read);

  // Categories helper icons mapping
  const getCatIcon = (iconName) => {
    switch (iconName) {
      case 'Mountain': return <Mountain className="w-5 h-5" />;
      case 'Compass': return <Compass className="w-5 h-5" />;
      case 'Tent': return <Tent className="w-5 h-5" />;
      case 'Flame': return <Flame className="w-5 h-5" />;
      case 'Trees': return <Trees className="w-5 h-5" />;
      case 'CalendarDays': return <CalendarDays className="w-5 h-5" />;
      default: return <Compass className="w-5 h-5" />;
    }
  };

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto no-scrollbar font-sans px-3 pb-4 ${
      darkMode ? 'bg-elegant-app text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>
      
      {/* 1. Header Row */}
      <div className="flex items-center justify-between pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onSwitchTab('Profile')}
            className={`w-9 h-9 rounded-full overflow-hidden border-2 shadow-md transform hover:scale-105 active:scale-95 cursor-pointer ${
              darkMode ? 'border-elegant-green' : 'border-forest-500'
            }`}
          >
            <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
          </button>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-0.5">
              🏔️ SPY HIKE ADVENTURER
            </span>
            <h2 className="text-xs font-display font-black leading-tight flex items-center gap-0.5">
              Hi, {user.name ? user.name.split(' ')[0] : 'Explorer'} <span className="animate-bounce">👋</span>
            </h2>
          </div>
        </div>

        {/* Header Actions: Toggle Theme + Bell Notify */}
        <div className="flex items-center gap-1.5">
          {onToggleDarkMode && (
            <button
              id="btn-toggle-darkmode"
              onClick={onToggleDarkMode}
              className={`w-8 h-8 rounded-full flex items-center justify-center border active:scale-90 transition-all cursor-pointer ${
                darkMode 
                  ? 'bg-elegant-card border-white/5 text-[#F27D26] hover:bg-elegant-card/80' 
                  : 'bg-white border-gray-200 text-forest-500 hover:bg-gray-50'
              }`}
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}

          {/* Bell Notify Button */}
          <button
            id="btn-bell-notifications"
            onClick={() => setShowNotificationDrawer(true)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border relative active:scale-90 cursor-pointer ${
              darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-gray-200'
            }`}
          >
            <Bell size={15} className={darkMode ? 'text-[#E0E5E2]/80' : 'text-zinc-650'} />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-spy-orange text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white dark:border-elegant-app">
                {unreadNotifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Search Section */}
      <form onSubmit={handleSearchSubmit} className="mt-1 relative">
        <input
          type="text"
          id="search-input-box"
          placeholder="Search hikes, mountains, destinations..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full text-xs pl-8 pr-12 py-2.5 rounded-xl outline-hidden border transition-all shadow-xs ${
            darkMode 
              ? 'bg-elegant-card border-white/5 focus:border-elegant-green text-white placeholder-white/30' 
              : 'bg-white border-gray-200 focus:bg-white text-zinc-800 placeholder-zinc-450 focus:border-forest-500'
          }`}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 dark:text-white/30 text-zinc-500" size={13} />
        
        <button
          type="submit"
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold px-2.5 py-1.2 rounded-lg cursor-pointer ${
            darkMode ? 'bg-elegant-green text-white hover:bg-forest-605' : 'bg-forest-600 hover:bg-forest-700 text-white'
          }`}
        >
          Search
        </button>
      </form>

      {/* 3. Horizontal Categories */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-display font-black uppercase tracking-wider opacity-85 text-[11px]">Curated Experiences</span>
          <button onClick={() => onSwitchTab('Explore')} className="text-[9px] text-spy-orange font-bold flex items-center gap-0.5 hover:underline">
            View All Explore
          </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES_LIST.map((cat, idx) => (
            <motion.button
              key={cat.id}
              id={`cat-btn-${cat.id.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => handleCategoryClick(cat.id)}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border shrink-0 transition-all cursor-pointer ${
                darkMode 
                  ? 'bg-elegant-card border-white/5 hover:bg-[#1C2520] text-white/70 hover:text-white' 
                  : 'bg-white border-gray-100 hover:bg-zinc-50 text-zinc-700'
              }`}
            >
              <span className={darkMode ? 'text-elegant-orange scale-90' : 'text-forest-500 scale-90'}>{getCatIcon(cat.icon)}</span>
              {cat.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 4. Promotional Banner Slider (Edge-to-Edge & Swipeable Carousel) */}
      <div className="mt-3 relative -mx-3 select-none">
        <div className="overflow-hidden relative aspect-[16/9] rounded-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePromoIdx}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                const swipeThreshold = 50;
                if (info.offset.x < -swipeThreshold) {
                  // Swiped left -> next slide
                  setActivePromoIdx(prev => (prev + 1) % PROMOTIONAL_BANNERS.length);
                } else if (info.offset.x > swipeThreshold) {
                  // Swiped right -> previous slide
                  setActivePromoIdx(prev => (prev - 1 + PROMOTIONAL_BANNERS.length) % PROMOTIONAL_BANNERS.length);
                }
              }}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              <img 
                src={PROMOTIONAL_BANNERS[activePromoIdx].img} 
                alt={PROMOTIONAL_BANNERS[activePromoIdx].title} 
                className="w-full h-full object-cover brightness-[0.7] dark:brightness-[0.6] pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/30 to-transparent p-4 flex flex-col justify-between">
                <div>
                  <span className="bg-spy-orange text-white font-mono text-[7px] font-black tracking-widest px-1.5 py-0.2 rounded-full uppercase">
                    {PROMOTIONAL_BANNERS[activePromoIdx].tag}
                  </span>
                  <h3 className="text-sm font-display font-black text-white mt-1 leading-tight">
                    {PROMOTIONAL_BANNERS[activePromoIdx].title}
                  </h3>
                  <p className="text-[9px] text-zinc-205/90">{PROMOTIONAL_BANNERS[activePromoIdx].subtitle}</p>
                </div>

                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">
                    Code: {PROMOTIONAL_BANNERS[activePromoIdx].code} ({PROMOTIONAL_BANNERS[activePromoIdx].discount})
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const correlatedTrip = trips.find(t => t.id === PROMOTIONAL_BANNERS[activePromoIdx].tripId);
                      if (correlatedTrip) onSelectTrip(correlatedTrip);
                    }}
                    className="bg-white hover:bg-gray-100 text-forest-955 text-[8px] font-black py-1 px-2.5 rounded-md active:scale-95 cursor-pointer shadow-sm z-20 relative pointer-events-auto"
                  >
                    Claim Now
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots spacer */}
        <div className="flex justify-center gap-1 mt-1.5">
          {PROMOTIONAL_BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActivePromoIdx(idx)}
              className={`h-1 rounded-full transition-all ${
                idx === activePromoIdx ? 'w-3 bg-forest-500' : 'w-1 bg-zinc-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 5. Popular Trips Carousel */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-display font-black uppercase tracking-wider opacity-85 text-[11px]">Popular Hiking Expeditions</span>
          <button onClick={() => onSwitchTab('Explore')} className="text-[9px] text-spy-orange font-bold flex items-center gap-0.5 hover:underline">
            See All <ChevronRight size={11} />
          </button>
        </div>

        {/* Carousel flex content wrapper */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-0.5">
          {trips.map((trip, idx) => {
            const isSaved = wishlist.includes(trip.id);
            return (
              <motion.div
                key={trip.id}
                id={`popular-card-${trip.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.35 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className={`w-[180px] shrink-0 rounded-xl overflow-hidden flex flex-col relative transition shadow-xs hover:shadow-sm ${
                  darkMode ? 'bg-elegant-card' : 'bg-white'
                }`}
              >
                {/* Wishlist toggle absolute floating helper */}
                <button
                  id={`btn-toggle-wishlist-popular-${trip.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWishlist(trip.id);
                  }}
                  className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center border backdrop-blur-md z-15 active:scale-90 transition ${
                    isSaved
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-black/30 border-white/20 text-white hover:bg-black/50'
                  }`}
                >
                  <Heart size={12} fill={isSaved ? 'white' : 'none'} />
                </button>

                {/* Cover visual segment */}
                <div 
                  onClick={() => onSelectTrip(trip)}
                  className="h-28 overflow-hidden cursor-pointer relative"
                >
                  <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover" />
                  <span className={`absolute bottom-1.5 left-1.5 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full border ${
                    trip.difficulty === 'Easy' 
                      ? 'bg-green-500/90 text-white border-green-400' 
                      : trip.difficulty === 'Moderate' 
                      ? 'bg-orange-500/90 text-white border-orange-400'
                      : 'bg-red-500/90 text-white border-red-400'
                  }`}>
                    {trip.difficulty}
                  </span>
                </div>

                {/* Details segment */}
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 
                      onClick={() => onSelectTrip(trip)}
                      className={`text-[11px] font-display font-extrabold line-clamp-1 cursor-pointer ${
                        darkMode ? 'hover:text-elegant-orange text-white' : 'hover:text-forest-500 text-zinc-800'
                      }`}
                    >
                      {trip.name}
                    </h4>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5 mt-0.5">
                      <MapPin size={9} className="text-[#F27D26] shrink-0" />
                      {trip.location}
                    </p>
                  </div>

                  <div className={`flex items-center justify-between mt-2 pt-1.5 border-t ${
                    darkMode ? 'border-white/5' : 'border-zinc-100'
                  }`}>
                    <div className="flex items-center gap-0.5 text-[9px] font-bold">
                      <Star size={9} className="text-amber-400 fill-amber-400" />
                      {trip.rating} <span className="opacity-50 text-[8px]">({trip.reviewsCount})</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-extrabold ${darkMode ? 'text-[#F27D26]' : 'text-forest-650'}`}>₹{trip.price}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 6. AI Recommendations System Block */}
      <div className={`mt-4 rounded-xl p-3 relative overflow-hidden backdrop-blur-md ${
        darkMode 
          ? 'bg-gradient-to-tr from-elegant-card to-elegant-app' 
          : 'bg-gradient-to-tr from-white to-forest-50'
      }`}>
        
        {/* Glow vector circle */}
        <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-elegant-green/10 rounded-full blur-lg pointer-events-none" />

        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1 text-[11px] font-display font-medium text-forest-600 dark:text-[#E0E5E2]">
            <Sparkles size={12} className="text-spy-orange animate-pulse" />
            <span className="font-black uppercase tracking-wider">AI Recommendations</span>
          </div>
          <span className={`text-[7px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
            darkMode ? 'bg-elegant-green text-white' : 'bg-forest-100'
          }`}>
            MATCH: {user.hikingExperience.toUpperCase()}
          </span>
        </div>

        <p className={`text-[9.5px] leading-normal mb-2.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-650'}`}>
          Based on your fitness <span className="font-semibold text-[#F27D26]">({user.fitnessLevel} Level)</span> and hiking experience, we recommend:
        </p>

        {/* Recommendations list */}
        <div className="space-y-1.5">
          {recommendedTrips.map((trip, idx) => (
            <motion.div
              key={`ai-${trip.id}`}
              onClick={() => onSelectTrip(trip)}
              whileHover={{ x: 3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
              className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                darkMode ? 'bg-elegant-app/60 hover:bg-elegant-app' : 'bg-white hover:bg-white shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <img src={trip.coverImage} alt="" className="w-8 h-8 rounded-md object-cover text-xs" />
                <div>
                  <h4 className="text-[11px] font-bold font-display line-clamp-1">{trip.name}</h4>
                  <p className="text-[8px] text-zinc-500 flex items-center gap-0.5">
                    <MapPin size={8} /> {trip.city}, {trip.state}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[9px] font-extrabold text-[#F27D26] font-sans block">₹{trip.price}</span>
                <span className="text-[7.5px] opacity-65 font-medium">{trip.durationDays} Days</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 7. Trending Destinations Grid */}
      <div className="mt-4">
        <h4 className="font-display font-black uppercase text-[11px] tracking-wider opacity-85 mb-2">
          Trending Destinations
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          {TRENDING_DESTINATIONS.map((dest, idx) => (
            <motion.div
              key={dest.id}
              onClick={() => handleDestinationClick(dest.name)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.25 }}
              className="h-20 rounded-xl overflow-hidden relative group cursor-pointer shadow-xs"
            >
              <img src={dest.img} alt={dest.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 brightness-[0.7] dark:brightness-[0.6]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-2 flex flex-col justify-end">
                <h5 className="text-[11px] font-bold text-white leading-tight font-display">{dest.name}</h5>
                <span className="text-[8px] text-zinc-300 font-medium">{dest.hikes} Local Expeditions</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ===================================== */}
      {/* 8. Notification Center overlay Drawer */}
      {/* ===================================== */}
      <AnimatePresence>
        {showNotificationDrawer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`w-[85%] max-w-sm h-full flex flex-col justify-between p-4 shadow-2xl relative ${
                darkMode ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-800'
              }`}
            >
              {/* Header drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/10 dark:border-zinc-850">
                <div className="flex items-center gap-1.5 font-display font-extrabold text-sm text-forest-655 dark:text-forest-400">
                  <Bell size={16} /> Notification Center
                </div>
                
                <button 
                  onClick={() => setShowNotificationDrawer(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800/10 dark:bg-zinc-855 text-zinc-400 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-2.5">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl">📭</span>
                    <p className="text-xs text-zinc-500 font-semibold mt-3">No dynamic notifications found</p>
                  </div>
                ) : (
                  notifications.map(item => (
                    <div
                      key={item.id}
                      onClick={() => onMarkNotificationRead(item.id)}
                      className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                        item.read 
                          ? (darkMode ? 'bg-zinc-900/30 border-zinc-900/50 text-zinc-400' : 'bg-gray-55 border-gray-100 text-zinc-502')
                          : (darkMode ? 'bg-forest-950/20 border-forest-900/30 font-medium text-white shadow-xs' : 'bg-green-50/70 border-green-100 font-medium')
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="flex items-center gap-1">{item.title}</span>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-spy-orange shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] leading-relaxed opacity-90">{item.content}</p>
                      <span className="text-[8px] opacity-40 font-mono self-end mt-1">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer triggers */}
              <div className="pt-3 border-t border-zinc-800/10 dark:border-zinc-850 flex gap-2">
                <button
                  onClick={() => { onClearNotifications(); }}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer text-center animate-pulse-subtle"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-forest-600 text-white text-center hover:bg-forest-700 cursor-pointer"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
