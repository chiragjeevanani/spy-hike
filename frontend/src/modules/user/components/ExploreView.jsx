import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, SlidersHorizontal, Star, MapPin, Calendar, DollarSign, Clock, Users, ArrowUpAZ, X, Sparkles, Check, Heart, Bus, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { matchesLocation, matchesQuery } from '../utils/locationFilter';
import SkeletonCard from '../../../components/SkeletonCard';
import treksApi from '../../../lib/treksApi';
import tripsApi from '../../../lib/tripsApi';
import { durationRange } from '../../../utils/rangeFormat';

export default function ExploreView({
  trips,
  tripsLoading = false,
  wishlist,
  onToggleWishlist,
  onSelectTrek,
  searchQuery,
  onSetSearchQuery,
  selectedCategory,
  onSetCategory,
  selectedDate,
  onSetDate,
  userLocation,
  onSelectLocation,
  onOpenLocationPicker,
  darkMode
}) {
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [allTreks, setAllTreks] = useState([]);

  // Full active trek catalog — used to surface "Coming soon" cards for
  // treks an admin has added that no organizer has posted a trip under yet
  // (otherwise those treks are invisible anywhere in the customer app).
  useEffect(() => {
    treksApi.listTreks().then(setAllTreks).catch(() => setAllTreks([]));
  }, []);

  // Pagination state
  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  // Browse feed, fetched a page at a time from the server.
  const [groups, setGroups] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [pickupCities, setPickupCities] = useState([]);

  // Budget slider ceiling — defaults to ₹400 to match this catalog's seed
  // prices, but organizer-created trips can carry real-world per-person
  // pricing (₹1000s via pickup options), so the ceiling scales up to fit
  // whatever's actually listed rather than silently hiding pricier treks.
  // Derived from the current page plus whatever the parent already holds, so
  // the slider can't cap below a price the user can actually see.
  const priceCeiling = useMemo(
    () => Math.max(400, ...trips.map(t => t.price || 0), ...groups.map(g => g.maxPrice || 0)),
    [trips, groups]
  );

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  // null means "no cap" rather than a number derived from whatever happened to
  // be loaded — otherwise a small first page would pin the slider low and hide
  // every trek above it.
  const [filterBudget, setFilterBudget] = useState(null);
  const [filterDuration, setFilterDuration] = useState(8);
  const [filterMinSeats, setFilterMinSeats] = useState(1);
  const [filterPickupCity, setFilterPickupCity] = useState('All');
  const [sortOption, setSortOption] = useState('Popular');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedDate, filterPickupCity, filterDifficulty, filterBudget, filterDuration, filterMinSeats, sortOption, userLocation]);

  // Categories quick toggles
  const categoriesList = ['All', 'Trekking', 'Hiking', 'Camping', 'Adventure Tours', 'Nature Walks', 'Weekend Trips'];

  // Every pickup city any organizer offers, across all treks — powers the
  // "Pickup City" filter below. Comes from the server rather than the current
  // page, or the dropdown would only ever list the cities you can already see.
  useEffect(() => {
    tripsApi.listPickupCities().then(setPickupCities).catch(() => setPickupCities([]));
  }, []);

  // The whole filter/group/sort pipeline runs in the database now. It used to
  // live here, which is why the app had to fetch the entire catalog up front:
  // you cannot page a list you still have to group yourself.
  const cityFilter = useMemo(() => {
    const label = userLocation?.label?.trim();
    if (!label || label === 'India' || label === 'All') return '';
    return label.split(',')[0].trim();
  }, [userLocation]);

  const query = useMemo(() => ({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchQuery.trim() || undefined,
    category: selectedCategory !== 'All' ? selectedCategory : undefined,
    difficulty: filterDifficulty !== 'All' ? filterDifficulty : undefined,
    date: selectedDate || undefined,
    pickupCity: filterPickupCity !== 'All' ? filterPickupCity : undefined,
    city: cityFilter || undefined,
    maxPrice: filterBudget != null && filterBudget < priceCeiling ? filterBudget : undefined,
    maxDuration: filterDuration < 8 ? filterDuration : undefined,
    minSeats: filterMinSeats > 1 ? filterMinSeats : undefined,
    sort: sortOption,
  }), [
    currentPage, searchQuery, selectedCategory, filterDifficulty, selectedDate,
    filterPickupCity, cityFilter, filterBudget, priceCeiling, filterDuration,
    filterMinSeats, sortOption,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoadingGroups(true);
    tripsApi.listTrekGroups(query)
      .then((res) => {
        if (cancelled) return;
        setGroups(res.groups || []);
        setHasMore(!!res.hasMore);
      })
      .catch(() => {
        if (cancelled) return;
        setGroups([]);
        setHasMore(false);
      })
      .finally(() => { if (!cancelled) setLoadingGroups(false); });
    return () => { cancelled = true; };
  }, [query]);

  const filteredTreks = groups;

  // "Coming soon" — catalog treks with no published trip yet. Kept out of
  // filteredTreks/pagination above since Trek objects don't carry the
  // price/seats/rating fields those filters and sorts depend on; only
  // location + free-text search apply here.
  const comingSoonTreks = useMemo(() => {
    // tripCount comes from the server — deriving it here would mean holding
    // every trip in memory again, which is exactly what paging removed.
    let result = allTreks.filter(t => (t.tripCount || 0) === 0);
    if (userLocation && userLocation.label && userLocation.label !== 'India' && userLocation.label !== 'All') {
      result = result.filter(t => matchesLocation(t, userLocation));
    }
    if (searchQuery.trim()) {
      result = result.filter(t => matchesQuery(t, searchQuery));
    }
    return result;
  }, [allTreks, trips, userLocation, searchQuery]);

  // Bookable results are what Explore is for, so the coming-soon strip starts
  // collapsed to a short preview and expands on demand instead of adding an
  // unbounded grid to the bottom of every scroll.
  const EXPLORE_COMING_SOON_LIMIT = 4;
  const [showAllComingSoon, setShowAllComingSoon] = useState(false);
  const visibleComingSoon = showAllComingSoon
    ? comingSoonTreks
    : comingSoonTreks.slice(0, EXPLORE_COMING_SOON_LIMIT);

  const resetFilters = () => {
    setFilterDifficulty('All');
    setFilterBudget(null);
    setFilterDuration(8);
    setFilterMinSeats(1);
    setFilterPickupCity('All');
    setSortOption('Popular');
    onSetSearchQuery('');
    onSetCategory('All');
    if (onSetDate) onSetDate('');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterDifficulty !== 'All') count++;
    if (filterBudget != null && filterBudget < priceCeiling) count++;
    if (filterDuration < 8) count++;
    if (filterMinSeats > 1) count++;
    if (filterPickupCity !== 'All') count++;
    if (sortOption !== 'Popular') count++;
    if (selectedCategory !== 'All') count++;
    if (selectedDate) count++;
    return count;
  }, [filterDifficulty, filterBudget, filterDuration, filterMinSeats, filterPickupCity, sortOption, selectedCategory, selectedDate, priceCeiling]);

  // "Sat, 20 Aug" style label for the active departure-date chip
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

  return (
    <div className={`flex-1 overflow-y-auto no-scrollbar font-sans ${
      darkMode ? 'bg-elegant-app text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>

      {/* Header */}
      <div className="px-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl font-medium tracking-tight">Explore</h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {userLocation?.label && userLocation.label !== 'India'
                ? `Treks around ${userLocation.label.split(',')[0]}`
                : 'Search treks across India'}
            </p>
          </div>

          {/* City selector — Explore is where you browse, so changing city
              shouldn't require emptying the results first (which is where the
              only other entry point lives). */}
          <button
            id="btn-location-explore"
            onClick={onOpenLocationPicker}
            className={`flex items-center gap-1 pl-2.5 pr-2 py-2 mt-1.5 rounded-full border shrink-0 active:scale-95 cursor-pointer shadow-sm ${
              darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-gray-200'
            }`}
          >
            <MapPin size={14} className="text-spy-orange shrink-0" />
            <span className="text-xs font-semibold truncate max-w-[110px]">
              {(userLocation?.label || 'India').split(',')[0]}
            </span>
            <ChevronDown size={12} className="opacity-50 shrink-0" />
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2.5 mt-5">
          <div className="relative flex-1">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white/40' : 'text-zinc-400'}`} size={17} />
            <input
              type="text"
              id="explore-search-input"
              placeholder="Search treks or locations…"
              value={searchQuery}
              onChange={e => onSetSearchQuery(e.target.value)}
              className={`w-full text-sm pl-12 pr-10 py-3.5 rounded-full outline-hidden border shadow-sm ${
                darkMode ? 'bg-elegant-card border-white/5 text-white placeholder-white/35' : 'bg-white border-gray-200/80 text-zinc-800 placeholder-zinc-400'
              }`}
            />
            {searchQuery && (
              <button onClick={() => onSetSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <X size={16} />
              </button>
            )}
          </div>

          <button
            id="btn-toggle-filters"
            onClick={() => setShowFilters(!showFilters)}
            className={`w-[52px] shrink-0 rounded-2xl flex items-center justify-center relative active:scale-95 cursor-pointer shadow-sm text-white ${
              showFilters || activeFiltersCount > 0 ? 'bg-forest-700' : (darkMode ? 'bg-elegant-green' : 'bg-forest-600')
            }`}
          >
            <SlidersHorizontal size={18} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white dark:border-elegant-app">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Active departure-date / pickup-city filter chips */}
        {(selectedDate || filterPickupCity !== 'All') && (
          <div className="flex items-center flex-wrap gap-2 mt-4">
            {selectedDate && (
              <span className={`flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-full text-sm font-semibold shadow-sm ${
                darkMode ? 'bg-forest-500/15 text-forest-400' : 'bg-forest-500/10 text-forest-700'
              }`}>
                <Calendar size={14} /> Departing {selectedDateLabel}
                <button
                  onClick={() => onSetDate && onSetDate('')}
                  aria-label="Clear date filter"
                  className={`w-5 h-5 rounded-full flex items-center justify-center ml-0.5 ${
                    darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-forest-500/15 hover:bg-forest-500/25'
                  }`}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {filterPickupCity !== 'All' && (
              <span className={`flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-full text-sm font-semibold shadow-sm ${
                darkMode ? 'bg-forest-500/15 text-forest-400' : 'bg-forest-500/10 text-forest-700'
              }`}>
                <Bus size={14} /> Ex-{filterPickupCity}
                <button
                  onClick={() => setFilterPickupCity('All')}
                  aria-label="Clear pickup city filter"
                  className={`w-5 h-5 rounded-full flex items-center justify-center ml-0.5 ${
                    darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-forest-500/15 hover:bg-forest-500/25'
                  }`}
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Difficulty pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-0.5">
          {['All', 'Easy', 'Moderate', 'Difficult'].map(diff => (
            <button
              key={diff}
              onClick={() => setFilterDifficulty(diff)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium shrink-0 transition ${
                filterDifficulty === diff
                  ? 'bg-spy-orange text-white shadow-sm'
                  : (darkMode ? 'bg-elegant-card text-zinc-300' : 'bg-white text-zinc-600 border border-gray-200/70')
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Advanced Filters drawer */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`mx-5 mt-3 rounded-3xl p-5 space-y-5 shadow-sm ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                  <Sparkles size={16} className="text-spy-orange" /> Refine adventures
                </h3>
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-rose-500 hover:underline"
                >
                  Reset
                </button>
              </div>

              {/* 1. Category filter (difficulty lives in the primary pills above) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider opacity-55 block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categoriesList.map(cat => (
                    <button
                      key={cat}
                      id={`quick-cat-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => onSetCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                        selectedCategory === cat
                          ? 'bg-forest-600 text-white'
                          : (darkMode ? 'bg-elegant-app text-zinc-300' : 'bg-gray-100 text-zinc-600')
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1b. Pickup city filter */}
              {pickupCities.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider opacity-55 block mb-2">Pickup City</label>
                  <select
                    value={filterPickupCity}
                    onChange={e => setFilterPickupCity(e.target.value)}
                    className={`w-full text-xs px-3 py-2.5 rounded-xl outline-hidden border ${
                      darkMode ? 'bg-elegant-app border-white/10 text-zinc-200' : 'bg-gray-50 border-gray-200 text-zinc-800'
                    }`}
                  >
                    <option value="All">All Cities</option>
                    {pickupCities.map(city => (
                      <option key={city} value={city}>Ex-{city}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2. Budget slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider opacity-55">Max budget</label>
                  <span className={`text-sm font-bold ${darkMode ? 'text-elegant-orange' : 'text-forest-600'}`}>₹{filterBudget ?? priceCeiling}</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={priceCeiling}
                  step={10}
                  value={filterBudget ?? priceCeiling}
                  onChange={e => setFilterBudget(Number(e.target.value))}
                  className={`w-full accent-forest-600 pointer-events-auto h-1.5 rounded-lg cursor-pointer ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'}`}
                />
                <div className="flex justify-between text-[10px] opacity-40 mt-1.5">
                  <span>₹40</span>
                  <span>₹{priceCeiling}</span>
                </div>
              </div>

              {/* 3. Duration slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider opacity-55">Max duration</label>
                  <span className={`text-sm font-bold ${darkMode ? 'text-elegant-orange' : 'text-forest-600'}`}>{filterDuration} Days</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={filterDuration}
                  onChange={e => setFilterDuration(Number(e.target.value))}
                  className={`w-full accent-forest-600 pointer-events-auto h-1.5 rounded-lg cursor-pointer ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'}`}
                />
                <div className="flex justify-between text-[10px] opacity-40 mt-1.5">
                  <span>1 Day</span>
                  <span>8 Days</span>
                </div>
              </div>

              {/* 4. Sort & seats */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider opacity-55 block mb-2">Sort by</label>
                  <select
                    value={sortOption}
                    onChange={e => setSortOption(e.target.value)}
                    className={`w-full text-xs px-3 py-2.5 rounded-xl outline-hidden border ${
                      darkMode ? 'bg-elegant-app border-white/10 text-zinc-200' : 'bg-gray-50 border-gray-200 text-zinc-800'
                    }`}
                  >
                    <option value="Popular">Most Popular</option>
                    <option value="PriceLowToHigh">Price: Low to High</option>
                    <option value="PriceHighToLow">Price: High to Low</option>
                    <option value="HighestRated">Highest Rated</option>
                    <option value="Newest">Newest Launch</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider opacity-55 block mb-2">Min seats</label>
                  <select
                    value={filterMinSeats}
                    onChange={e => setFilterMinSeats(Number(e.target.value))}
                    className={`w-full text-xs px-3 py-2.5 rounded-xl outline-hidden border ${
                      darkMode ? 'bg-elegant-app border-white/10 text-zinc-200' : 'bg-gray-50 border-gray-200 text-zinc-800'
                    }`}
                  >
                    <option value={1}>1+ Seat</option>
                    <option value={3}>3+ Seats</option>
                    <option value={5}>5+ Seats</option>
                    <option value={10}>10+ Seats</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowFilters(false)}
                className="w-full bg-forest-600 hover:bg-forest-700 text-white text-sm font-semibold py-3 rounded-full active:scale-95 cursor-pointer"
              >
                Apply filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="px-5 pt-5 pb-8 space-y-5">

        {/* Results meta */}
        <div className="flex justify-between items-center text-xs">
          <span className={darkMode ? 'text-zinc-500' : 'text-zinc-400'}>
            {/* Only this page is loaded, so an exact total would cost an extra
                count query — say what's shown instead of claiming a total. */}
            {filteredTreks.length} trek{filteredTreks.length === 1 ? '' : 's'}
            {(hasMore || currentPage > 1) ? ` on page ${currentPage}` : ' found'}
          </span>
          {activeFiltersCount > 0 && (
            <span className="text-spy-orange font-semibold">Filters applied</span>
          )}
        </div>

        {/* Empty state */}
        {loadingGroups ? (
          <div className="space-y-5">
            <SkeletonCard darkMode={darkMode} />
            <SkeletonCard darkMode={darkMode} />
            <SkeletonCard darkMode={darkMode} />
          </div>
        ) : filteredTreks.length === 0 ? (
          <div className={`text-center py-12 px-5 rounded-3xl border border-dashed ${
            darkMode ? 'bg-zinc-900/40 border-white/10' : 'bg-white border-zinc-200 shadow-xs'
          }`}>
            <div className="w-14 h-14 rounded-full bg-spy-orange/15 text-spy-orange flex items-center justify-center mx-auto mb-3">
              <MapPin size={28} />
            </div>
            <h3 className="font-serif text-xl font-semibold">
              {userLocation?.label && userLocation.label !== 'India'
                ? `No treks found in ${userLocation.label.split(',')[0]}`
                : 'No treks matched'}
            </h3>
            <p className={`text-xs mt-2 max-w-xs mx-auto leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {userLocation?.label && userLocation.label !== 'India'
                ? `We couldn't find any listed expeditions in ${userLocation.label} right now. Switch city to discover nearby adventures!`
                : 'Try widening your search, budget, or duration — or clear the active filters to start fresh.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-5 max-w-xs mx-auto">
              {userLocation?.label && userLocation.label !== 'India' && (
                <button
                  type="button"
                  id="btn-change-city-explore-empty"
                  onClick={onOpenLocationPicker}
                  className="bg-spy-orange hover:bg-orange-600 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-md active:scale-95 transition cursor-pointer"
                >
                  Change City to Explore Nearby Treks
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  if (onSelectLocation) onSelectLocation({ label: 'India' });
                }}
                className={`text-xs font-bold px-4 py-3 rounded-xl border transition cursor-pointer ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-gray-50'
                }`}
              >
                Explore All India Treks
              </button>
            </div>
          </div>
        ) : (
          (() => {
            // The server already returned exactly this page.
            const paginated = filteredTreks;
            return (
              <>
                {paginated.map((group, idx) => {
                  const trip = group.representative;
                  const isSaved = wishlist.includes(trip.id);
                  const diffText = trip.difficulty === 'Easy' ? 'text-emerald-700' : trip.difficulty === 'Moderate' ? 'text-amber-700' : 'text-rose-700';
                  return (
                    <motion.div
                      key={group.trekName}
                      id={`trip-list-card-${trip.id}`}
                      onClick={() => onSelectTrek(group.trekName)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.25), duration: 0.25 }}
                      whileHover={{ y: -3 }}
                      className={`rounded-3xl overflow-hidden cursor-pointer shadow-md ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}
                    >
                      {/* Cover */}
                      <div className="relative h-52 overflow-hidden">
                        <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover" />
                        <span className={`absolute top-3.5 left-3.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm ${diffText}`}>
                          {trip.difficulty}
                        </span>
                        <button
                          id={`btn-toggle-wishlist-explore-${trip.id}`}
                          onClick={(e) => { e.stopPropagation(); onToggleWishlist(trip.id); }}
                          className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 transition z-20 ${
                            isSaved ? 'bg-rose-500 text-white' : 'bg-black/35 text-white hover:bg-black/55'
                          }`}
                        >
                          <Heart size={16} fill={isSaved ? 'white' : 'none'} />
                        </button>
                      </div>

                      {/* Details */}
                      <div className="p-5">
                        <h3 className="font-serif text-xl font-semibold leading-tight">{trip.name}</h3>

                        <div className={`flex items-center gap-x-4 gap-y-1.5 flex-wrap text-xs mt-2.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          <span className="flex items-center gap-1"><MapPin size={13} className="opacity-70" /> {trip.location}</span>
                          <span className="flex items-center gap-1"><Clock size={13} className="opacity-70" /> {durationRange(trip)} Days</span>
                          <span className="flex items-center gap-1"><Users size={13} className="opacity-70" /> {trip.availableSeats} slots</span>
                          {group.organizerCount > 1 && (
                            <span className="flex items-center gap-1"><Sparkles size={12} className="opacity-70" /> {group.organizerCount} organizers</span>
                          )}
                        </div>

                        <div className="flex items-end justify-between mt-4">
                          <div>
                            <span className={`text-[11px] font-semibold block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Starting from</span>
                            <span className={`font-serif text-2xl font-semibold ${darkMode ? 'text-elegant-text' : 'text-zinc-900'}`}>₹{group.minPrice}</span>
                          </div>
                          <span className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>per person</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Pagination. There is no page count — the server reports
                    whether another page exists rather than paying for a full
                    count on every request. */}
                {(hasMore || currentPage > 1) && (
                  <div className="col-span-full flex items-center justify-between pt-6 border-t border-zinc-200/60 dark:border-white/10 mt-4">
                    <button
                      type="button"
                      disabled={currentPage === 1 || loadingGroups}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        currentPage === 1 || loadingGroups
                          ? 'opacity-40 cursor-not-allowed text-zinc-400'
                          : darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-xs'
                      }`}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>

                    <span className={`text-xs font-semibold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Page <span className={darkMode ? 'text-white font-bold' : 'text-zinc-900 font-bold'}>{currentPage}</span>
                    </span>

                    <button
                      type="button"
                      disabled={!hasMore || loadingGroups}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        !hasMore || loadingGroups
                          ? 'opacity-40 cursor-not-allowed text-zinc-400'
                          : darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-xs'
                      }`}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            );
          })()
        )}

        {/* Coming soon — catalog treks with no published trip yet. Non-
            bookable preview cards, kept separate from the filtered/paginated
            results above. */}
        {!loadingGroups && comingSoonTreks.length > 0 && (
          <div className="pt-2">
            <h2 className="font-serif text-lg font-semibold tracking-tight mb-1">Coming soon</h2>
            <p className={`text-xs mb-3.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              New treks awaiting an organizer's first batch.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {visibleComingSoon.map((trek, idx) => (
                <motion.div
                  key={trek.id}
                  onClick={() => onSelectTrek(trek.title)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.25), duration: 0.25 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="h-28 rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm"
                >
                  <img
                    src={trek.coverImage}
                    alt={trek.title}
                    className="w-full h-full object-cover grayscale-[35%] transition-transform duration-300 group-hover:scale-105 brightness-[0.6]"
                  />
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/90 text-zinc-800">
                    Coming soon
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3 flex flex-col justify-end">
                    <h5 className="text-sm font-semibold text-white leading-tight font-serif">{trek.title}</h5>
                    <span className="text-[10px] text-zinc-300 font-medium">{[trek.city, trek.state].filter(Boolean).join(', ') || trek.location}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {comingSoonTreks.length > EXPLORE_COMING_SOON_LIMIT && (
              <button
                onClick={() => setShowAllComingSoon(v => !v)}
                className={`w-full mt-3 py-2.5 rounded-xl text-xs font-semibold border transition active:scale-[0.98] ${
                  darkMode
                    ? 'border-white/10 text-zinc-300 hover:bg-white/5'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {showAllComingSoon
                  ? 'Show less'
                  : `View all ${comingSoonTreks.length} coming soon`}
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
