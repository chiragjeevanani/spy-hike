import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Bell, Star, MapPin, Heart, ChevronRight, ChevronDown, X, Users, ArrowUpRight, CalendarDays, Gift
} from 'lucide-react';
import { PROMOTIONAL_BANNERS } from '../data/trips';
import { groupTripsByTrekName } from '../utils/trekGroups';
import treksApi from '../../../lib/treksApi';
import { loadLoyaltyConfig, getCustomerProgress } from '../../../utils/loyalty';
import LocationPicker from './LocationPicker';
import TrekDatePicker from './TrekDatePicker';
import AppLogo from '../../../components/AppLogo';
import SkeletonCard from '../../../components/SkeletonCard';
import { matchesLocation } from '../utils/locationFilter';

// Persisted chosen location (city / GPS). Google Maps API will later power the
// live search + reverse-geocoding inside LocationPicker.
const loadLocation = () => {
  try {
    const v = localStorage.getItem('trekigo_location');
    if (v) return JSON.parse(v);
  } catch (e) {}
  return { label: 'India' };
};

export default function HomeView({
  user,
  trips,
  tripsLoading = false,
  wishlist,
  onToggleWishlist,
  onSelectTrek,
  onSwitchTab,
  onApplyCategory,
  onApplySearch,
  onApplyDate,
  onOpenLoyalty,
  bookings = [],
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  userLocation,
  onSelectLocation,
  onOpenLocationPicker,
  darkMode
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activePromoIdx, setActivePromoIdx] = useState(0);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [trendingTreks, setTrendingTreks] = useState([]);

  const activeLocation = userLocation || { label: 'India' };

  // Admin-curated Trending flag (Trek Categories catalog) drives the
  // "Trending destinations" grid below instead of static data.
  useEffect(() => {
    treksApi.listTreks({ trending: 'true' }).then(setTrendingTreks).catch(() => setTrendingTreks([]));
  }, []);

  // Filter trips for home view sections based on selected user location
  const locationFilteredTrips = useMemo(() => {
    if (!activeLocation || !activeLocation.label || activeLocation.label === 'India' || activeLocation.label === 'All') {
      return trips;
    }
    return trips.filter(t => matchesLocation(t, activeLocation));
  }, [trips, activeLocation]);

  const hasTripsForLocation = locationFilteredTrips.length > 0;

  // Every date any organizer has a batch departing on — the calendar
  // highlights these as pickable.
  const availableDepartureDates = useMemo(
    () => new Set(locationFilteredTrips.flatMap(t => t.departureDates || [])),
    [locationFilteredTrips]
  );

  const handlePickDate = (dateStr) => {
    setShowDatePicker(false);
    if (onApplyDate) onApplyDate(dateStr);
    if (dateStr) onSwitchTab('Explore');
  };

  const handleSelectLocation = (loc) => {
    if (onSelectLocation) onSelectLocation(loc);
  };

  // Loyalty progress — admin-controlled thresholds/reward copy/banner asset.
  const loyaltyConfig = useMemo(() => loadLoyaltyConfig(), []);
  const loyaltyProgress = useMemo(() => getCustomerProgress(bookings, loyaltyConfig), [bookings, loyaltyConfig]);
  const showLoyaltyBanner = loyaltyConfig.customer.enabled && loyaltyConfig.customer.banner.enabled;

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

  const handleDestinationClick = (destName) => {
    if (onSelectTrek) {
      onSelectTrek(destName);
    } else {
      onApplySearch(destName);
      onSwitchTab('Explore');
    }
  };

  // One card per unique trek name — multiple organizers offering the same
  // trek collapse into a single browsable entry (see utils/trekGroups.js).
  const trekGroups = useMemo(() => groupTripsByTrekName(locationFilteredTrips), [locationFilteredTrips]);


  const unreadNotifications = notifications.filter(n => !n.read);

  // The admin-marked featured trip (Trips admin section, not the trek
  // category) headlines the "Featured trek" hero. No fallback — the section
  // stays hidden entirely until an admin actually marks something featured,
  // rather than arbitrarily spotlighting the first trek in the list.
  const featuredTrip = useMemo(() => locationFilteredTrips.find(t => t.featured), [locationFilteredTrips]);
  const featured = featuredTrip ? trekGroups.find(g => g.offers.some(o => o.id === featuredTrip.id)) || null : null;

  // "Popular Treks" is likewise admin-curated (Trips admin section's Popular
  // toggle) rather than "everything that isn't featured" — stays empty/hidden
  // until an admin actually marks something popular.
  const popularGroups = useMemo(() => {
    const groups = trekGroups.filter(g => g.offers.some(o => o.popular));
    return featured ? groups.filter(g => g !== featured) : groups;
  }, [trekGroups, featured]);

  // Trending destinations grid — one card per admin-marked trending trek,
  // with the "local expeditions" count reflecting real published trips.
  const trendingDestinations = useMemo(() => trendingTreks.map(trek => ({
    id: trek.id,
    name: trek.title,
    hikes: locationFilteredTrips.filter(t => t.trekId === trek.id && t.status === 'Published').length,
    img: trek.coverImage,
  })).filter(dest => dest.hikes > 0 || !location || location.label === 'India'), [trendingTreks, locationFilteredTrips, location]);

  const difficultyPill = (difficulty) =>
    difficulty === 'Easy'
      ? 'bg-emerald-500 text-white'
      : difficulty === 'Moderate'
      ? 'bg-spy-orange text-white'
      : 'bg-rose-500 text-white';

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto no-scrollbar font-sans px-5 pb-8 ${
      darkMode ? 'bg-elegant-app text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>
      
      {/* 1. Brand header */}
      <div className="flex items-center justify-between pt-5 pb-1 gap-2">
        <button onClick={() => onSwitchTab('Profile')} className="flex items-center gap-2.5 cursor-pointer active:scale-95 transition min-w-0">
          <AppLogo size={36} className="shrink-0" />
          <span className="text-lg font-serif font-semibold tracking-tight truncate">Find Your Trek</span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {/* Location selector */}
          <button
            id="btn-location"
            onClick={onOpenLocationPicker}
            className={`flex items-center gap-1 pl-2.5 pr-2 py-2 rounded-full border relative active:scale-95 cursor-pointer shadow-sm ${
              darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-gray-200'
            }`}
          >
            <MapPin size={14} className="text-spy-orange shrink-0" />
            <span className="text-xs font-semibold truncate max-w-[120px]">{(activeLocation?.label || 'India').split(',')[0]}</span>
            <ChevronDown size={12} className="opacity-50 shrink-0" />
          </button>

          {/* Bell / notifications */}
          <button
            id="btn-bell-notifications"
            onClick={() => setShowNotificationDrawer(true)}
            className={`w-10 h-10 rounded-full flex items-center justify-center border relative active:scale-90 cursor-pointer shadow-sm ${
              darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-gray-200'
            }`}
          >
            <Bell size={17} className={darkMode ? 'text-[#E0E5E2]/80' : 'text-zinc-700'} />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white dark:border-elegant-app">
                {unreadNotifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Serif hero */}
      <div className="mt-5">
        <h1 className="font-serif text-[2.6rem] leading-[1.02] font-medium tracking-tight">
          Find your next<br />
          <span className={darkMode ? 'text-elegant-orange' : 'text-forest-500'}>raw adventure</span>
        </h1>
        <p className={`mt-3.5 text-sm leading-relaxed max-w-[88%] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Handpicked Himalayan treks and wild trails across the country.
        </p>
      </div>

      {/* 3. Search + departure-date calendar */}
      <div className="mt-6 flex items-stretch gap-2.5">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className={`absolute left-5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white/40' : 'text-zinc-400'}`} size={18} />
          <input
            type="text"
            id="search-input-box"
            placeholder="Search treks, peaks, valleys…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full text-sm pl-13 pr-5 py-4 rounded-full outline-hidden border transition-all shadow-sm ${
              darkMode
                ? 'bg-elegant-card border-white/5 focus:border-elegant-green text-white placeholder-white/35'
                : 'bg-white border-gray-200/80 focus:border-forest-500 text-zinc-800 placeholder-zinc-400'
            }`}
          />
        </form>

        {/* Filter treks by departure date */}
        <button
          id="btn-open-date-filter"
          onClick={() => setShowDatePicker(true)}
          aria-label="Filter treks by date"
          className={`w-[52px] shrink-0 rounded-full border shadow-sm flex items-center justify-center active:scale-95 transition cursor-pointer ${
            darkMode ? 'bg-elegant-card border-white/5 text-elegant-orange' : 'bg-white border-gray-200/80 text-forest-600'
          }`}
        >
          <CalendarDays size={20} />
        </button>
      </div>

      {/* 4. Promotional carousel — sits where a stats bar would, as a rounded card */}
      <div className="mt-6 relative select-none">
        <div className="overflow-hidden relative aspect-[16/10] rounded-3xl shadow-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePromoIdx}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                const swipeThreshold = 50;
                if (info.offset.x < -swipeThreshold) {
                  setActivePromoIdx(prev => (prev + 1) % PROMOTIONAL_BANNERS.length);
                } else if (info.offset.x > swipeThreshold) {
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
                className="w-full h-full object-cover brightness-[0.72] pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-5 flex flex-col justify-between">
                <div>
                  <span className="bg-spy-orange text-white text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full uppercase">
                    {PROMOTIONAL_BANNERS[activePromoIdx].tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-serif font-semibold text-white leading-tight">
                    {PROMOTIONAL_BANNERS[activePromoIdx].title}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">{PROMOTIONAL_BANNERS[activePromoIdx].subtitle}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs font-bold text-emerald-300 font-mono">
                      Code: {PROMOTIONAL_BANNERS[activePromoIdx].code} ({PROMOTIONAL_BANNERS[activePromoIdx].discount})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const correlatedTrip = trips.find(t => t.id === PROMOTIONAL_BANNERS[activePromoIdx].tripId);
                        if (correlatedTrip) onSelectTrek(correlatedTrip.name);
                      }}
                      className="bg-white hover:bg-gray-100 text-forest-700 text-[11px] font-bold py-1.5 px-3.5 rounded-full active:scale-95 cursor-pointer shadow-sm z-20 relative pointer-events-auto"
                    >
                      Claim Now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {PROMOTIONAL_BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActivePromoIdx(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === activePromoIdx ? 'w-5 bg-forest-500' : `w-1.5 ${darkMode ? 'bg-white/25' : 'bg-zinc-300'}`
              }`}
            />
          ))}
        </div>
      </div>

      {/* 4b. Loyalty rewards banner — admin-uploaded image/copy + live progress */}
      {showLoyaltyBanner && (
        <button
          type="button"
          id="btn-open-loyalty-home"
          onClick={onOpenLoyalty}
          className="mt-5 relative w-full aspect-[3/1] shrink-0 rounded-3xl overflow-hidden shadow-lg text-left cursor-pointer active:scale-[0.99] transition-transform"
        >
          {loyaltyConfig.customer.banner.image ? (
            <img src={loyaltyConfig.customer.banner.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-forest-600 to-forest-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="bg-spy-orange text-white text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                <Gift size={10} /> Loyalty Reward
              </span>
              <ChevronRight size={16} className="text-white/70" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-white leading-tight">
                {loyaltyConfig.customer.banner.title}
              </h3>
              <p className="text-[11px] text-white/75 mt-0.5">{loyaltyConfig.customer.banner.subtitle}</p>

              {/* Progress bar */}
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${loyaltyProgress.percent}%` }} />
                </div>
                <span className="text-[10px] font-bold text-white shrink-0">
                  {loyaltyProgress.withinCycle}/{loyaltyProgress.threshold}
                </span>
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Location Empty State Card when no treks exist in the selected city */}
      {!hasTripsForLocation && !tripsLoading && (
        <div className={`mt-6 text-center py-10 px-5 rounded-3xl border border-dashed ${
          darkMode ? 'bg-zinc-900/40 border-white/10' : 'bg-white border-zinc-200 shadow-xs'
        }`}>
          <div className="w-14 h-14 rounded-full bg-spy-orange/15 text-spy-orange flex items-center justify-center mx-auto mb-3">
            <MapPin size={28} />
          </div>
          <h3 className="font-serif text-xl font-semibold">
            No treks found in {activeLocation?.label?.split(',')[0] || 'this city'}
          </h3>
          <p className={`text-xs mt-2 max-w-xs mx-auto leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            We couldn't find any active expeditions listed in {activeLocation?.label} right now. Switch city to discover nearby treks!
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-5 max-w-xs mx-auto">
            <button
              type="button"
              id="btn-change-city-home-empty"
              onClick={onOpenLocationPicker}
              className="bg-spy-orange hover:bg-orange-600 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-md active:scale-95 transition cursor-pointer"
            >
              Change City to Explore Nearby Treks
            </button>
            <button
              type="button"
              onClick={() => handleSelectLocation({ label: 'India' })}
              className={`text-xs font-bold px-4 py-3 rounded-xl border transition cursor-pointer ${
                darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-gray-50'
              }`}
            >
              Explore All India Treks
            </button>
          </div>
        </div>
      )}

      {/* 5. Featured trek */}
      {featured && (
        <div className="mt-8">
          <h2 className="font-serif text-2xl font-medium tracking-tight mb-3.5">Featured trek</h2>
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelectTrek(featured.trekName)}
            className="relative rounded-3xl overflow-hidden cursor-pointer shadow-lg aspect-[5/4]"
          >
            <img src={featured.representative.coverImage} alt={featured.representative.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${difficultyPill(featured.representative.difficulty)}`}>
                {featured.representative.difficulty}
              </span>
              <h3 className="font-serif text-2xl font-semibold text-white leading-tight mt-2">
                {featured.representative.name}
              </h3>
              <p className="text-sm text-white/80 mt-1">
                {featured.representative.location} · {featured.representative.durationDays} Days
              </p>
            </div>
            <div className="absolute bottom-5 right-5 w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-md">
              <ArrowUpRight size={20} className="text-forest-700" />
            </div>
          </motion.div>
        </div>
      )}

      {/* 6. Popular Treks — spacious full-width cards. Admin-curated (Trips
          admin section's Popular toggle); hidden entirely — no placeholder
          card — until an admin actually marks something popular. */}
      {(tripsLoading || popularGroups.length > 0) && (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-serif text-2xl font-medium tracking-tight">Popular Treks</h2>
          <button onClick={() => onSwitchTab('Explore')} className="text-sm text-spy-orange font-semibold flex items-center gap-0.5 hover:underline">
            View all <ChevronRight size={15} />
          </button>
        </div>

        <div className="space-y-5">
          {tripsLoading ? (
            <>
              <SkeletonCard darkMode={darkMode} />
              <SkeletonCard darkMode={darkMode} />
            </>
          ) : (
            popularGroups.map((group, idx) => {
              const trip = group.representative;
              const isSaved = wishlist.includes(trip.id);
              return (
                <motion.div
                  key={group.trekName}
                  id={`popular-card-${trip.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  whileHover={{ y: -3 }}
                  onClick={() => onSelectTrek(group.trekName)}
                  className={`rounded-3xl overflow-hidden cursor-pointer shadow-md ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}
                >
                  {/* Cover */}
                  <div className="relative h-44 overflow-hidden">
                    <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover" />
                    <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${difficultyPill(trip.difficulty)}`}>
                      {trip.difficulty}
                    </span>
                    <button
                      id={`btn-toggle-wishlist-popular-${trip.id}`}
                      onClick={(e) => { e.stopPropagation(); onToggleWishlist(trip.id); }}
                      className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 transition ${
                        isSaved ? 'bg-rose-500 text-white' : 'bg-black/35 text-white hover:bg-black/55'
                      }`}
                    >
                      <Heart size={16} fill={isSaved ? 'white' : 'none'} />
                    </button>
                    {group.organizerCount > 1 && (
                      <span className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-black/55 text-white backdrop-blur-xs">
                        <Users size={11} /> {group.organizerCount} organizers
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-semibold leading-tight truncate">{trip.name}</h3>
                      <p className={`text-xs flex items-center gap-1 mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <MapPin size={12} className="text-spy-orange shrink-0" />
                        {trip.location}
                      </p>
                      <div className="flex items-center gap-1 text-xs font-bold mt-2">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        {trip.rating} <span className="opacity-50 font-medium">({trip.reviewsCount})</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`block text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Starting from</span>
                      <span className={`text-lg font-bold ${darkMode ? 'text-elegant-orange' : 'text-forest-600'}`}>₹{group.minPrice}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* 8. Trending Destinations Grid — admin-curated via the Trending flag on
          the Trek Categories catalog; hidden entirely until something is marked. */}
      {trendingDestinations.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-2xl font-medium tracking-tight mb-3.5">Trending destinations</h2>

          <div className="grid grid-cols-2 gap-3">
            {trendingDestinations.map((dest, idx) => (
              <motion.div
                key={dest.id}
                onClick={() => handleDestinationClick(dest.name)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                className="h-28 rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm"
              >
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 brightness-[0.7] dark:brightness-[0.6]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3 flex flex-col justify-end">
                  <h5 className="text-sm font-semibold text-white leading-tight font-serif">{dest.name}</h5>
                  <span className="text-[10px] text-zinc-300 font-medium">{dest.hikes} local expedition{dest.hikes === 1 ? '' : 's'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}


      <TrekDatePicker
        open={showDatePicker}
        current=""
        availableDates={availableDepartureDates}
        onSelect={handlePickDate}
        onClose={() => setShowDatePicker(false)}
        darkMode={darkMode}
      />

      {/* ===================================== */}
      {/* 8. Notification Center overlay Drawer */}
      {/* ===================================== */}
      <AnimatePresence>
        {showNotificationDrawer && (
          // absolute (not fixed) so the drawer is constrained to the phone-frame
          // viewport rather than spanning the whole browser window on desktop.
          <div className="absolute inset-0 z-50 flex justify-end overflow-hidden">
            {/* Tap-outside backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotificationDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`relative w-[85%] max-w-sm h-full flex flex-col justify-between p-4 shadow-2xl ${
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
                      onClick={() => {
                        onMarkNotificationRead(item.id);
                        setShowNotificationDrawer(false);
                        const title = (item.title || '').toLowerCase();
                        const content = (item.content || '').toLowerCase();
                        if (title.includes('booking') || content.includes('booking') || content.includes('booked')) {
                          onSwitchTab('Bookings');
                        } else if (title.includes('explore') || title.includes('trek') || content.includes('trek')) {
                          onSwitchTab('Explore');
                        } else if (title.includes('reward') || title.includes('loyalty') || content.includes('loyalty')) {
                          onSwitchTab('Profile');
                        } else {
                          onSwitchTab('Bookings');
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all hover:scale-[0.99] active:scale-95 ${
                        item.read 
                          ? (darkMode ? 'bg-zinc-900/30 border-zinc-900/50 text-zinc-400' : 'bg-gray-50 border-gray-100 text-zinc-600')
                          : (darkMode ? 'bg-forest-950/40 border-forest-500/30 font-medium text-white shadow-xs' : 'bg-green-50/80 border-green-200 font-medium text-zinc-900')
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
