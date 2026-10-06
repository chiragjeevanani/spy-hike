import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Bell,
  Star,
  MapPin,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Users,
  ArrowUpRight,
  CalendarDays,
  Gift,
  Mountain,
  Trees,
  Leaf,
  Flame,
  Grid2X2,
  CloudRain,
  Compass,
  Tent,
  Sun,
  Map,
  Snowflake,
  Sparkles,
  Tag,
} from "lucide-react";
import { PROMOTIONAL_BANNERS } from "../data/trips";
import { groupTripsByTrekName } from "../utils/trekGroups";
import treksApi from "../../../lib/treksApi";
import bannersApi from "../../../lib/bannersApi";
import { loadLoyaltyConfig, getCustomerProgress } from "../../../utils/loyalty";
import LocationPicker from "./LocationPicker";
import TrekDatePicker from "./TrekDatePicker";
import AppLogo from "../../../components/AppLogo";
import SkeletonCard from "../../../components/SkeletonCard";
import { matchesLocation } from "../utils/locationFilter";
import { durationRange } from "../../../utils/rangeFormat";
import { useAppRefresh, REFRESH_EVENT } from "../../../utils/refreshSignal";

// Promo slides travel in the direction the user is moving: the incoming slide
// enters from the side being swiped away from, the outgoing one leaves the
// opposite way. `custom` carries the sign through AnimatePresence.
const promoVariants = {
  enter: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

const HOME_FILTER_ICONS = { Mountain, Trees, Leaf, Flame, Compass, Tent, Sun, Map, Snowflake };
const DEFAULT_HOME_FILTERS = [
  { id: "himalayas", label: "Himalayas", icon: "Mountain" },
  { id: "south-india", label: "South India", icon: "Trees" },
  { id: "western-ghats", label: "Western Ghats", icon: "Leaf" },
  { id: "popular", label: "Popular", icon: "Flame" },
];

// Persisted chosen location (city / GPS). Google Maps API will later power the
// live search + reverse-geocoding inside LocationPicker.
const loadLocation = () => {
  try {
    const v = localStorage.getItem("trekigo_location");
    if (v) return JSON.parse(v);
  } catch (e) {}
  return { label: "India" };
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
  onApplyHomeFilter,
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
  darkMode,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePromoIdx, setActivePromoIdx] = useState(0);
  const [promoDir, setPromoDir] = useState(1); // +1 = advancing, -1 = going back
  const [promoPaused, setPromoPaused] = useState(false); // held while a finger is down
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAllHomeFilters, setShowAllHomeFilters] = useState(false);
  const [allTreks, setAllTreks] = useState([]);
  const [homeFilters, setHomeFilters] = useState(DEFAULT_HOME_FILTERS);
  // Bumped by a pull-to-refresh to re-run this screen's own fetches.
  const [reloadKey, setReloadKey] = useState(0);

  const activeLocation = userLocation || { label: "India" };

  // One fetch of the active trek catalog serves both the "Trending
  // destinations" grid and the "Coming soon" cards below. `?trending=true` is
  // a strict subset of this list, so asking for it separately was a second
  // round trip for data already on the way.
  useEffect(() => {
    treksApi
      .listTreks()
      .then(setAllTreks)
      .catch(() => setAllTreks([]));
  }, [reloadKey]);

  useEffect(() => {
    treksApi
      .listHomeFilters()
      .then((filters) => setHomeFilters(Array.isArray(filters) ? filters : []))
      .catch(() => setHomeFilters(DEFAULT_HOME_FILTERS));
  }, [reloadKey]);

  const trendingTreks = useMemo(
    () => allTreks.filter((t) => t.trending),
    [allTreks],
  );

  // Filter trips for home view sections based on selected user location
  const locationFilteredTrips = useMemo(() => {
    if (
      !activeLocation ||
      !activeLocation.label ||
      activeLocation.label === "India" ||
      activeLocation.label === "All"
    ) {
      return trips;
    }
    return trips.filter((t) => matchesLocation(t, activeLocation));
  }, [trips, activeLocation]);

  const hasTripsForLocation = locationFilteredTrips.length > 0;

  // Every date any organizer has a batch departing on — the calendar
  // highlights these as pickable.
  const availableDepartureDates = useMemo(
    () => new Set(locationFilteredTrips.flatMap((t) => t.departureDates || [])),
    [locationFilteredTrips],
  );

  const handlePickDate = (dateStr) => {
    setShowDatePicker(false);
    if (onApplyDate) onApplyDate(dateStr);
    if (dateStr) onSwitchTab("Explore");
  };

  const handleSelectLocation = (loc) => {
    if (onSelectLocation) onSelectLocation(loc);
  };

  // Loyalty progress — admin-controlled thresholds/reward copy/banner asset.
  const loyaltyConfig = useMemo(() => loadLoyaltyConfig(), []);
  const loyaltyProgress = useMemo(
    () => getCustomerProgress(bookings, loyaltyConfig),
    [bookings, loyaltyConfig],
  );
  const showLoyaltyBanner =
    loyaltyConfig.customer.enabled && loyaltyConfig.customer.banner.enabled;

  const [promoBanners, setPromoBanners] = useState(() => {
    try {
      const raw = localStorage.getItem("fyt_promotional_banners");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return PROMOTIONAL_BANNERS;
  });

  useEffect(() => {
    const fetchBanners = (forceRefresh = false) => {
      bannersApi
        .getBanners({ forceRefresh })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setPromoBanners(data);
          }
        })
        .catch(() => {});
    };

    fetchBanners();

    // 1. Same-window custom event from admin panel save
    const handleBannersUpdated = (e) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setPromoBanners(e.detail);
      }
    };
    window.addEventListener("fyt-banners-updated", handleBannersUpdated);

    // 2. Cross-tab storage listener
    const handleStorage = (e) => {
      if (e.key === "fyt_promotional_banners" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPromoBanners(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // 3. Re-fetch when user switches back to this tab
    const handleFocus = () => fetchBanners(true);
    window.addEventListener("focus", handleFocus);

    // 4. ...and when the page is pulled down to refresh.
    const handleRefresh = () => fetchBanners(true);
    window.addEventListener(REFRESH_EVENT, handleRefresh);

    return () => {
      window.removeEventListener("fyt-banners-updated", handleBannersUpdated);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(REFRESH_EVENT, handleRefresh);
    };
  }, []);

  useAppRefresh(() => setReloadKey((key) => key + 1));

  const activeBanners = useMemo(() => {
    const list =
      Array.isArray(promoBanners) && promoBanners.length > 0
        ? promoBanners
        : PROMOTIONAL_BANNERS;
    const filtered = list.filter((b) => b.active !== false);
    return filtered.length > 0 ? filtered : PROMOTIONAL_BANNERS;
  }, [promoBanners]);

  // Promo carousel. A timeout keyed on the active slide (rather than one
  // long-lived interval) means every manual swipe or dot tap restarts the
  // 5s countdown, so the banner never jumps a beat after the user moves it.
  const promoCount = activeBanners.length;
  const currentPromo = activeBanners[activePromoIdx] || activeBanners[0] || {};
  const currentPromoTrip = trips.find(
    (trip) =>
      trip.id === currentPromo.tripId ||
      trip.trekId === currentPromo.tripId ||
      trip.name === currentPromo.title,
  );

  const goToPromo = (idx, dir) => {
    if (promoCount === 0) return;
    setPromoDir(dir);
    setActivePromoIdx(((idx % promoCount) + promoCount) % promoCount);
  };
  useEffect(() => {
    if (promoPaused || promoCount < 2) return undefined;
    const timer = setTimeout(() => goToPromo(activePromoIdx + 1, 1), 5000);
    return () => clearTimeout(timer);
  }, [activePromoIdx, promoPaused, promoCount]);

  // Dynamic greeting based on current local hours
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onApplySearch(searchQuery.trim());
      onSwitchTab("Explore");
    }
  };

  const handleDestinationClick = (destName) => {
    if (onSelectTrek) {
      onSelectTrek(destName);
    } else {
      onApplySearch(destName);
      onSwitchTab("Explore");
    }
  };

  // One card per unique trek name — multiple organizers offering the same
  // trek collapse into a single browsable entry (see utils/trekGroups.js).
  const trekGroups = useMemo(
    () => groupTripsByTrekName(locationFilteredTrips),
    [locationFilteredTrips],
  );

  const unreadNotifications = notifications.filter((n) => !n.read);

  // The admin-marked featured trip (Trips admin section, not the trek
  // category) headlines the "Featured trek" hero. No fallback — the section
  // stays hidden entirely until an admin actually marks something featured,
  // rather than arbitrarily spotlighting the first trek in the list.
  const featuredTrip = useMemo(
    () => locationFilteredTrips.find((t) => t.featured),
    [locationFilteredTrips],
  );
  const featured = featuredTrip
    ? trekGroups.find((g) => g.offers.some((o) => o.id === featuredTrip.id)) ||
      null
    : null;

  // "Popular Treks" is likewise admin-curated (Trips admin section's Popular
  // toggle) rather than "everything that isn't featured" — stays empty/hidden
  // until an admin actually marks something popular.
  const popularGroups = useMemo(() => {
    const groups = trekGroups.filter((g) => g.offers.some((o) => o.popular));
    return featured ? groups.filter((g) => g !== featured) : groups;
  }, [trekGroups, featured]);

  // Trending destinations grid — one card per admin-marked trending trek,
  // with the "local expeditions" count reflecting real published trips.
  // `tripCount` is computed server-side, so this no longer needs every trip in
  // memory to count offerings per trek.
  const trendingDestinations = useMemo(
    () =>
      trendingTreks
        .map((trek) => ({
          id: trek.id,
          name: trek.title,
          hikes: trek.tripCount || 0,
          img: trek.coverImage,
        }))
        .filter((dest) => dest.hikes > 0),
    [trendingTreks],
  );

  // "Coming soon" — catalog treks (any admin-added trek, not just trending
  // ones) that no organizer has posted a published trip under yet, so they'd
  // otherwise never appear anywhere in the customer app. Checked against the
  // full unfiltered trip list (a trek posted only in another city still
  // counts as "has a trip"), then matched against the active location using
  // the trek's own location fields.
  const comingSoonTreks = useMemo(
    () =>
      allTreks
        .filter((t) => (t.tripCount || 0) === 0)
        .filter((t) => matchesLocation(t, activeLocation)),
    [allTreks, activeLocation],
  );

  // Home is a digest, not the catalog — bookable treks are the priority here,
  // so "Coming soon" shows a short preview and hands the rest to Explore
  // rather than pushing the real listings off the end of a long scroll.
  const HOME_COMING_SOON_LIMIT = 4;
  const comingSoonPreview = comingSoonTreks.slice(0, HOME_COMING_SOON_LIMIT);

  const difficultyPill = (difficulty) =>
    difficulty === "Easy"
      ? "bg-emerald-500 text-white"
      : difficulty === "Moderate"
        ? "bg-spy-orange text-white"
        : "bg-rose-500 text-white";

  const openHomeFilter = (filterId = "") => {
    if (onApplyHomeFilter) onApplyHomeFilter(filterId);
    if (onApplyCategory) onApplyCategory("All");
    setShowAllHomeFilters(false);
    onSwitchTab("Explore");
  };

  const homeCategories = [
    { id: "all", label: "All", icon: Mountain, active: true, action: () => openHomeFilter("") },
    ...homeFilters.slice(0, 4).map((filter) => ({
      ...filter,
      icon: HOME_FILTER_ICONS[filter.icon] || Mountain,
      action: () => openHomeFilter(filter.id),
    })),
    { id: "more", label: "More", icon: Grid2X2, action: () => setShowAllHomeFilters(true) },
  ];

  return (
    <div
      className={`flex-1 flex flex-col font-sans w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-16 ${
        darkMode
          ? "bg-transparent text-elegant-text"
          : "bg-transparent text-zinc-900"
      }`}>
      {/* Immersive alpine hero — mobile-first, with the desktop nav above it. */}
      <section
        className="customer-home-hero trek-hero-grain relative -mx-4 sm:-mx-6 lg:mx-0 lg:mt-7 lg:rounded-[2.5rem] overflow-visible px-4 sm:px-8 lg:px-12 pb-16 shadow-[0_24px_70px_rgba(31,46,34,0.18)]">
      <div className="customer-home-header relative z-10 flex items-center justify-between pt-5 pb-1 gap-2 md:hidden text-[#201D17]">
        <button
          onClick={() => onSwitchTab("Profile")}
          className="customer-home-brand flex items-center gap-2 cursor-pointer active:scale-95 transition min-w-0">
          <AppLogo size={40} className="shrink-0 bg-white/92 shadow-lg" />
          <span className="leading-none text-left">
            <span className="customer-home-brand-title block font-bold tracking-[0.08em] uppercase whitespace-nowrap">Find Your Trek</span>
            <span className="customer-home-brand-tagline block tracking-[0.18em] uppercase text-[#201D17]/55 mt-1 whitespace-nowrap">Your journey starts here</span>
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {/* Location selector */}
          <button
            id="btn-location"
            onClick={onOpenLocationPicker}
            className="customer-home-location flex items-center gap-1 pl-3 pr-2.5 py-2.5 rounded-full border border-white/35 relative active:scale-95 cursor-pointer shadow-lg bg-white/92 text-[#1D2018] backdrop-blur-md">
            <MapPin size={14} className="text-forest-700 shrink-0" />
            <span className="customer-home-location-label text-xs font-semibold truncate max-w-[120px]">
              {(activeLocation?.label || "India").split(",")[0]}
            </span>
            <ChevronDown size={12} className="opacity-50 shrink-0" />
          </button>

          {/* Bell / notifications */}
          <button
            id="btn-bell-notifications"
            onClick={() => setShowNotificationDrawer(true)}
            className="customer-home-bell w-10 h-10 rounded-full flex items-center justify-center border border-white/35 relative active:scale-90 cursor-pointer shadow-lg bg-white/92 text-[#1D2018] backdrop-blur-md">
            <Bell size={17} />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white dark:border-elegant-app">
                {unreadNotifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="customer-home-copy relative z-10 mt-20 sm:mt-28 lg:mt-24 max-w-3xl text-[#171A15]">
        <p className="text-[10px] sm:text-xs font-bold tracking-[0.28em] uppercase text-[#171A15]/75 mb-3">
          Explore&nbsp;&nbsp;•&nbsp;&nbsp;Trek&nbsp;&nbsp;•&nbsp;&nbsp;Discover
        </p>
        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl leading-[0.98] font-semibold tracking-[-0.035em] drop-shadow-sm">
          Find your next
          <br />
          <span className="text-forest-700 italic tracking-[-0.04em]">
            raw adventure
          </span>
        </h1>
        <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-md text-[#2D342C]/80">
          Handpicked Himalayan treks and wild trails across the country.
        </p>
      </div>

      <div className="absolute z-20 -bottom-7 sm:-bottom-8 left-4 right-4 sm:left-8 sm:right-8 lg:left-12 lg:right-12 flex items-center gap-3">
        <div className="flex items-stretch gap-3 w-full">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1D2018]/65"
              size={18}
            />
            <input
              type="text"
              id="search-input-box"
              placeholder="Search treks, peaks, valleys…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm sm:text-base pl-13 pr-10 py-4 sm:py-4.5 rounded-full outline-hidden border border-white/70 transition-all shadow-xl bg-[#FFFDF8]/95 focus:border-forest-500 text-[#1D2018] placeholder-[#77766D] backdrop-blur-md"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer">
                <X size={16} />
              </button>
            )}
          </form>

          {/* Filter treks by departure date */}
          <button
            id="btn-open-date-filter"
            onClick={() => setShowDatePicker(true)}
            aria-label="Filter treks by date"
            title="Filter by Departure Date"
            className="w-[52px] sm:w-[58px] shrink-0 rounded-full border border-white/70 shadow-xl flex items-center justify-center active:scale-95 transition cursor-pointer bg-[#FFFDF8]/95 text-forest-700 hover:bg-white hover:text-forest-800 backdrop-blur-md">
            <CalendarDays size={20} />
          </button>

          {/* Direct Search / Explore CTA on bigger screens */}
          <button
            type="button"
            onClick={handleSearchSubmit}
            aria-label="Search treks"
            className="hidden md:flex items-center gap-2 px-6 py-4 rounded-full bg-forest-600 hover:bg-forest-700 text-white font-bold text-sm shadow-xl active:scale-95 transition cursor-pointer shrink-0">
            <span>Explore</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      </section>

      {/* Quick region/category rail from the reference home screen. */}
      <div id="customer-category-rail" className="customer-category-rail mt-12 sm:mt-14 lg:mt-16 w-full grid grid-cols-6 gap-2 sm:gap-3.5 lg:gap-4 no-scrollbar">
        {homeCategories.map(({ id, label, icon: Icon, active, action }) => (
          <button
            key={id || label}
            id={`btn-home-category-${id || label.toLowerCase()}`}
            type="button"
            onClick={action}
            className={`customer-category-button min-w-0 aspect-square rounded-[1.1rem] sm:rounded-[1.35rem] lg:rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-2 border shadow-[0_8px_22px_rgba(37,51,39,0.07)] active:scale-95 transition cursor-pointer ${
              active
                ? "bg-forest-700 border-forest-700 text-white"
                : darkMode
                  ? "bg-elegant-card border-white/8 text-elegant-text hover:border-white/20"
                  : "bg-[#FFFDF8] border-forest-700/8 text-forest-800 hover:border-forest-700/20"
            }`}>
            <Icon className="customer-category-icon" size={active ? 25 : 23} strokeWidth={1.8} />
            <span className="text-[7px] min-[360px]:text-[8px] sm:text-[11px] font-semibold leading-tight whitespace-normal w-full px-0.5 text-center flex items-center justify-center">
              {label}
            </span>
          </button>
        ))}
      </div>

      {createPortal(
        <AnimatePresence>
          {showAllHomeFilters && (
            <motion.div
              className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllHomeFilters(false)}>
              <motion.div
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 28, opacity: 0 }}
                onClick={(event) => event.stopPropagation()}
                className={`w-full max-w-lg rounded-[2rem] p-5 shadow-2xl ${
                  darkMode ? "bg-elegant-card text-white" : "bg-[#FFFDF8] text-zinc-900"
                }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">Explore every category</h3>
                    <p className="text-xs opacity-55 mt-1">Choose a collection curated by the admin.</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() => setShowAllHomeFilters(false)}
                    className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center cursor-pointer">
                    <X size={17} />
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => openHomeFilter("")}
                    className="aspect-square rounded-2xl bg-forest-700 text-white flex flex-col items-center justify-center gap-2 text-xs font-semibold cursor-pointer">
                    <Mountain size={24} /> All
                  </button>
                  {homeFilters.map((filter) => {
                    const FilterIcon = HOME_FILTER_ICONS[filter.icon] || Mountain;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => openHomeFilter(filter.id)}
                        className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-2 px-1 text-xs font-semibold text-center cursor-pointer ${
                          darkMode
                            ? "bg-elegant-app border-white/10 text-white"
                            : "bg-white border-forest-700/10 text-forest-800"
                        }`}>
                        <FilterIcon size={24} /> {filter.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* 4. Promotional carousel */}
      <div className="w-full mt-8 sm:mt-10 lg:mt-12 relative select-none group">
        <div className="customer-promo-card w-full overflow-hidden relative aspect-[2/1] sm:aspect-[16/7] md:aspect-auto md:h-72 lg:h-80 rounded-[1.75rem] sm:rounded-[2.25rem] shadow-xl">
          <AnimatePresence initial={false} custom={promoDir}>
            <motion.div
              key={activePromoIdx}
              custom={promoDir}
              variants={promoVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 320, damping: 34, mass: 0.8 },
                opacity: { duration: 0.18 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              dragMomentum={false}
              onDragStart={() => setPromoPaused(true)}
              onDragEnd={(e, info) => {
                setPromoPaused(false);
                // Offset *or* a quick flick counts, so a short fast swipe still
                // turns the page the way it does in a native carousel.
                const { offset, velocity } = info;
                if (offset.x < -40 || velocity.x < -400)
                  goToPromo(activePromoIdx + 1, 1);
                else if (offset.x > 40 || velocity.x > 400)
                  goToPromo(activePromoIdx - 1, -1);
              }}
              className="absolute inset-0 cursor-grab active:cursor-grabbing">
              <img
                key={`${currentPromo.id || activePromoIdx}-${currentPromo.img ? currentPromo.img.slice(0, 40) : ""}`}
                src={currentPromo.img}
                alt={currentPromo.title}
                className="w-full h-full object-cover brightness-[0.72] pointer-events-none"
                draggable={false}
              />
              <div className="customer-promo-overlay absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 md:bg-gradient-to-r md:from-black/95 md:via-black/55 md:to-transparent p-5 sm:p-7 lg:p-9 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="customer-promo-tag bg-spy-orange text-white text-[9px] sm:text-xs font-bold tracking-wider px-3 py-1.5 rounded-full uppercase flex items-center gap-1.5 shadow-sm">
                      <Sparkles size={13} /> {currentPromo.tag}
                    </span>
                    {currentPromo.discount && (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-white/20 backdrop-blur-md border border-white/25 text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full">
                        <Tag size={12} /> {currentPromo.discount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {promoCount > 1 && (
                      <span className="hidden md:inline-flex text-xs font-mono font-bold text-white/80 bg-black/35 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                        {String(activePromoIdx + 1).padStart(2, "0")} / {String(promoCount).padStart(2, "0")}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Save trek"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentPromoTrip?.id) onToggleWishlist(currentPromoTrip.id);
                      }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/25 flex items-center justify-center backdrop-blur-sm transition active:scale-90 cursor-pointer ${
                        currentPromoTrip && wishlist?.includes(currentPromoTrip.id)
                          ? "bg-rose-500/80 text-white border-rose-400"
                          : "bg-black/35 text-white hover:bg-black/55"
                      }`}>
                      <Heart size={18} fill={currentPromoTrip && wishlist?.includes(currentPromoTrip.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-auto">
                  <div className="max-w-xl lg:max-w-2xl min-w-0">
                    <h3 className="customer-promo-title text-xl sm:text-3xl lg:text-4xl font-serif font-semibold text-white leading-tight drop-shadow-md">
                      {currentPromo.title}
                    </h3>
                    <p className="text-white/85 text-xs sm:text-sm font-medium mt-1 line-clamp-1 drop-shadow-xs">
                      {currentPromo.subtitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-white/90 mt-2 sm:mt-3">
                      <span className="flex items-center gap-1.5 bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15">
                        <MapPin size={13} className="text-spy-orange shrink-0" />
                        <span className="truncate max-w-[200px]">{currentPromoTrip?.location || currentPromo.subtitle || "Himalayas"}</span>
                      </span>
                      {currentPromoTrip?.difficulty && (
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${difficultyPill(currentPromoTrip.difficulty)}`}>
                          {currentPromoTrip.difficulty}
                        </span>
                      )}
                      {currentPromoTrip?.durationDays && (
                        <span className="bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 text-[11px] font-semibold">
                          ⏱ {durationRange(currentPromoTrip)} Days
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center md:items-end justify-between md:justify-end gap-4 shrink-0 bg-black/40 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none p-3 md:p-0 rounded-2xl border border-white/10 md:border-none">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/70">Starting at</p>
                      <div className="flex items-baseline md:justify-end">
                        <span className="customer-promo-price text-2xl sm:text-3xl lg:text-4xl font-black text-white drop-shadow-sm">
                          ₹{(currentPromoTrip?.price || 4500).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[11px] sm:text-xs text-white/70 ml-1 font-medium">/ person</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const correlatedTrip = trips.find(
                          (t) =>
                            t.id === currentPromo.tripId ||
                            t.trekId === currentPromo.tripId ||
                            t.name === currentPromo.tripId,
                        );
                        if (correlatedTrip) {
                          onSelectTrek(correlatedTrip.name);
                        } else if (currentPromo.tripId) {
                          onSelectTrek(currentPromo.tripId);
                        }
                      }}
                      className="customer-promo-action bg-white hover:bg-forest-50 text-forest-800 text-xs sm:text-sm font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-full active:scale-95 transition-all shadow-lg hover:shadow-xl cursor-pointer shrink-0 flex items-center gap-1.5 group">
                      <span>View Trek</span>
                      <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Desktop Next/Prev Arrow Controls */}
          {promoCount > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPromo(activePromoIdx - 1, -1);
                }}
                aria-label="Previous banner"
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-lg opacity-80 hover:opacity-100 cursor-pointer">
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPromo(activePromoIdx + 1, 1);
                }}
                aria-label="Next banner"
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-lg opacity-80 hover:opacity-100 cursor-pointer">
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToPromo(idx, idx > activePromoIdx ? 1 : -1)}
              aria-label={`Show promotion ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === activePromoIdx
                  ? "w-6 bg-forest-500"
                  : `w-1.5 ${darkMode ? "bg-white/25 hover:bg-white/40" : "bg-zinc-300 hover:bg-zinc-400"}`
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
          className="customer-loyalty-card mt-5 relative w-full aspect-[3/1] shrink-0 rounded-3xl overflow-hidden shadow-lg text-left cursor-pointer active:scale-[0.99] transition-transform">
          {loyaltyConfig.customer.banner.image ? (
            <img
              src={loyaltyConfig.customer.banner.image}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src="/images/home-hero-himalayas.png"
              alt=""
              className="w-full h-full object-cover object-center"
            />
          )}
          <div className="customer-loyalty-overlay absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="customer-loyalty-tag bg-spy-orange text-white text-[8px] sm:text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                <Gift size={10} /> Loyalty Reward
              </span>
              <ChevronRight size={16} className="text-white/70" />
            </div>
            <div>
              <h3 className="customer-loyalty-title font-serif text-sm sm:text-base font-semibold text-white leading-tight">
                {loyaltyConfig.customer.banner.title}
              </h3>
              <p className="customer-loyalty-subtitle text-[10px] sm:text-[11px] text-white/75 mt-0.5 line-clamp-1">
                {loyaltyConfig.customer.banner.subtitle}
              </p>

              {/* Progress bar */}
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${loyaltyProgress.percent}%` }}
                  />
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
        <div
          className={`mt-6 text-center py-10 px-5 rounded-3xl border border-dashed ${
            darkMode
              ? "bg-zinc-900/40 border-white/10"
              : "bg-white border-zinc-200 shadow-xs"
          }`}>
          <div className="w-14 h-14 rounded-full bg-spy-orange/15 text-spy-orange flex items-center justify-center mx-auto mb-3">
            <MapPin size={28} />
          </div>
          <h3 className="font-serif text-xl font-semibold">
            No treks found in{" "}
            {activeLocation?.label?.split(",")[0] || "this city"}
          </h3>
          <p
            className={`text-xs mt-2 max-w-xs mx-auto leading-relaxed ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
            We couldn't find any active expeditions listed in{" "}
            {activeLocation?.label} right now. Switch city to discover nearby
            treks!
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-5 max-w-xs mx-auto">
            <button
              type="button"
              id="btn-change-city-home-empty"
              onClick={onOpenLocationPicker}
              className="bg-spy-orange hover:bg-orange-600 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-md active:scale-95 transition cursor-pointer">
              Change City to Explore Nearby Treks
            </button>
            <button
              type="button"
              onClick={() => handleSelectLocation({ label: "India" })}
              className={`text-xs font-bold px-4 py-3 rounded-xl border transition cursor-pointer ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850"
                  : "bg-white border-zinc-200 text-zinc-700 hover:bg-gray-50"
              }`}>
              Explore All India Treks
            </button>
          </div>
        </div>
      )}

      {/* 5. Featured trek */}
      {featured && (
        <div className="mt-10">
          <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-4">
            Featured trek
          </h2>
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelectTrek(featured.trekName)}
            className="relative rounded-3xl overflow-hidden cursor-pointer shadow-lg aspect-[5/4] sm:aspect-[16/7] md:aspect-[21/8]">
            <img
              src={featured.representative.coverImage}
              alt={featured.representative.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${difficultyPill(featured.representative.difficulty)}`}>
                {featured.representative.difficulty}
              </span>
              <h3 className="font-serif text-2xl font-semibold text-white leading-tight mt-2">
                {featured.representative.name}
              </h3>
              <p className="text-sm text-white/80 mt-1">
                {featured.representative.location} ·{" "}
                {durationRange(featured.representative)} Days
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
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight">
              Popular Treks
            </h2>
            <button
              onClick={() => onSwitchTab("Explore")}
              className="text-sm text-spy-orange font-semibold flex items-center gap-0.5 hover:underline cursor-pointer">
              View all <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    className={`rounded-3xl overflow-hidden cursor-pointer shadow-md flex flex-col h-full ${darkMode ? "bg-elegant-card" : "bg-white"}`}>
                    {/* Cover */}
                    <div className="relative h-48 sm:h-52 overflow-hidden">
                      <img
                        src={trip.coverImage}
                        alt={trip.name}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${difficultyPill(trip.difficulty)}`}>
                        {trip.difficulty}
                      </span>
                      <button
                        id={`btn-toggle-wishlist-popular-${trip.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWishlist(trip.id);
                        }}
                        className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 transition ${
                          isSaved
                            ? "bg-rose-500 text-white"
                            : "bg-black/35 text-white hover:bg-black/55"
                        }`}>
                        <Heart size={16} fill={isSaved ? "white" : "none"} />
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
                        <h3 className="font-serif text-lg font-semibold leading-tight truncate">
                          {trip.name}
                        </h3>
                        <p
                          className={`text-xs flex items-center gap-1 mt-1 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                          <MapPin
                            size={12}
                            className="text-spy-orange shrink-0"
                          />
                          {trip.location}
                        </p>
                        <div className="flex items-center gap-1 text-xs font-bold mt-2">
                          <Star
                            size={12}
                            className="text-amber-400 fill-amber-400"
                          />
                          {trip.rating}{" "}
                          <span className="opacity-50 font-medium">
                            ({trip.reviewsCount})
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`block text-[10px] uppercase font-bold tracking-wider ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                          Starting from
                        </span>
                        <span
                          className={`text-lg font-bold ${darkMode ? "text-elegant-orange" : "text-forest-600"}`}>
                          ₹{group.minPrice}
                        </span>
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
          <h2 className="font-serif text-2xl font-medium tracking-tight mb-3.5">
            Trending destinations
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {trendingDestinations.map((dest, idx) => (
              <motion.div
                key={dest.id}
                onClick={() => handleDestinationClick(dest.name)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                className="h-28 rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm">
                <img
                  src={dest.img}
                  alt={dest.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 brightness-[0.7] dark:brightness-[0.6]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3 flex flex-col justify-end">
                  <h5 className="text-sm font-semibold text-white leading-tight font-serif">
                    {dest.name}
                  </h5>
                  <span className="text-[10px] text-zinc-300 font-medium">
                    {dest.hikes} local expedition{dest.hikes === 1 ? "" : "s"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 8b. Coming Soon — catalog treks with no published trip yet. Kept
          visually distinct (grayscale + badge, non-bookable) so it reads as
          a preview, not a bookable listing. */}
      {comingSoonTreks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-end justify-between mb-3.5">
            <div className="min-w-0">
              <h2 className="font-serif text-2xl font-medium tracking-tight mb-1">
                Coming soon
              </h2>
              <p
                className={`text-xs ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                New treks awaiting an organizer's first batch.
              </p>
            </div>
            {comingSoonTreks.length > HOME_COMING_SOON_LIMIT && (
              <button
                onClick={() => onSwitchTab("Explore")}
                className="text-xs font-semibold text-forest-600 flex items-center gap-0.5 shrink-0 active:scale-95 transition">
                View all {comingSoonTreks.length} <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {comingSoonPreview.map((trek, idx) => (
              <motion.div
                key={trek.id}
                onClick={() => handleDestinationClick(trek.title)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                className="h-32 sm:h-36 rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm">
                <img
                  src={trek.coverImage}
                  alt={trek.title}
                  className="w-full h-full object-cover grayscale-[35%] transition-transform duration-300 group-hover:scale-105 brightness-[0.6]"
                />
                <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/90 text-zinc-800">
                  Coming soon
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3 flex flex-col justify-end">
                  <h5 className="text-sm font-semibold text-white leading-tight font-serif">
                    {trek.title}
                  </h5>
                  <span className="text-[10px] text-zinc-300 font-medium">
                    {[trek.city, trek.state].filter(Boolean).join(", ") ||
                      trek.location}
                  </span>
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
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`relative w-[85%] max-w-sm h-full flex flex-col justify-between p-4 shadow-2xl ${
                darkMode ? "bg-zinc-950 text-white" : "bg-white text-zinc-800"
              }`}>
              {/* Header drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/10 dark:border-zinc-850">
                <div className="flex items-center gap-1.5 font-display font-extrabold text-sm text-forest-655 dark:text-forest-400">
                  <Bell size={16} /> Notification Center
                </div>

                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-800/10 dark:bg-zinc-855 text-zinc-400 cursor-pointer">
                  <X size={15} />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-2.5">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl">📭</span>
                    <p className="text-xs text-zinc-500 font-semibold mt-3">
                      No dynamic notifications found
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onMarkNotificationRead(item.id);
                        setShowNotificationDrawer(false);
                        const title = (item.title || "").toLowerCase();
                        const content = (item.content || "").toLowerCase();
                        if (
                          title.includes("booking") ||
                          content.includes("booking") ||
                          content.includes("booked")
                        ) {
                          onSwitchTab("Bookings");
                        } else if (
                          title.includes("explore") ||
                          title.includes("trek") ||
                          content.includes("trek")
                        ) {
                          onSwitchTab("Explore");
                        } else if (
                          title.includes("reward") ||
                          title.includes("loyalty") ||
                          content.includes("loyalty")
                        ) {
                          onSwitchTab("Profile");
                        } else {
                          onSwitchTab("Bookings");
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all hover:scale-[0.99] active:scale-95 ${
                        item.read
                          ? darkMode
                            ? "bg-zinc-900/30 border-zinc-900/50 text-zinc-400"
                            : "bg-gray-50 border-gray-100 text-zinc-600"
                          : darkMode
                            ? "bg-forest-950/40 border-forest-500/30 font-medium text-white shadow-xs"
                            : "bg-green-50/80 border-green-200 font-medium text-zinc-900"
                      }`}>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="flex items-center gap-1">
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-spy-orange shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] leading-relaxed opacity-90">
                        {item.content}
                      </p>
                      <span className="text-[8px] opacity-40 font-mono self-end mt-1">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer triggers */}
              <div className="pt-3 border-t border-zinc-800/10 dark:border-zinc-850 flex gap-2">
                <button
                  onClick={() => {
                    onClearNotifications();
                  }}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer text-center animate-pulse-subtle">
                  Clear All
                </button>
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-forest-600 text-white text-center hover:bg-forest-700 cursor-pointer">
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
