import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, SlidersHorizontal, Star, MapPin, Calendar, DollarSign, Clock, Users, ArrowUpAZ, X, Sparkles, Check, Heart, Bus
} from 'lucide-react';
import { groupTripsByTrekName } from '../utils/trekGroups';
import SkeletonCard from '../../../components/SkeletonCard';

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
  darkMode
}) {
  
  // Budget slider ceiling — defaults to ₹400 to match this catalog's seed
  // prices, but organizer-created trips can carry real-world per-person
  // pricing (₹1000s via pickup options), so the ceiling scales up to fit
  // whatever's actually listed rather than silently hiding pricier treks.
  const priceCeiling = useMemo(
    () => Math.max(400, ...trips.map(t => t.price || 0)),
    [trips]
  );

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterBudget, setFilterBudget] = useState(() => Math.max(400, ...trips.map(t => t.price || 0)));
  const [filterDuration, setFilterDuration] = useState(8);
  const [filterMinSeats, setFilterMinSeats] = useState(1);
  const [filterPickupCity, setFilterPickupCity] = useState('All');
  const [sortOption, setSortOption] = useState('Popular');

  // Categories quick toggles
  const categoriesList = ['All', 'Trekking', 'Hiking', 'Camping', 'Adventure Tours', 'Nature Walks', 'Weekend Trips'];

  // Every pickup city any organizer offers, across all treks — powers the
  // "Pickup City" filter below so travellers can browse by where they'll board.
  const pickupCities = useMemo(() => {
    const cities = new Set();
    trips.forEach(t => {
      const pickup = t.pickup || t.pickupOptions?.[0];
      if (pickup) {
        cities.add(pickup.location);
      } else if (t.pickupPoints?.length) {
        t.pickupPoints.forEach(p => cities.add(p));
      }
    });
    return [...cities].sort();
  }, [trips]);

  // Dynamic search + filters + sort core mathematical calculation.
  // Operates on one card per unique trek name (see utils/trekGroups.js) —
  // multiple organizers offering the same trek collapse into a single entry,
  // using the highest-rated organizer's trip as the representative for
  // name/location/category/etc, and the cheapest organizer's price for
  // budget filtering & price sorting.
  const filteredTreks = useMemo(() => {
    let result = groupTripsByTrekName(trips);

    // 1. Search Query (checks Name, Location, City, State)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(g => {
        const t = g.representative;
        return (
          t.name.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.state.toLowerCase().includes(q)
        );
      });
    }

    // 2. Quick category selector
    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter(g => g.representative.category === selectedCategory);
    }

    // 3. Departure date (from the Home calendar) — keep the trek if ANY
    // organizer has a batch leaving on that exact day
    if (selectedDate) {
      result = result.filter(g =>
        g.offers.some(o => (o.departureDates || []).includes(selectedDate))
      );
    }

    // 3b. Pickup city — keep the trek if ANY organizer boards from there
    if (filterPickupCity !== 'All') {
      result = result.filter(g =>
        g.offers.some(o => {
          const pickup = o.pickup || o.pickupOptions?.[0];
          const cities = pickup ? [pickup.location] : (o.pickupPoints || []);
          return cities.includes(filterPickupCity);
        })
      );
    }

    // 4. Difficulty Level
    if (filterDifficulty !== 'All') {
      result = result.filter(g => g.representative.difficulty === filterDifficulty);
    }

    // 4. Budget Range (cheapest organizer offering this trek)
    result = result.filter(g => g.minPrice <= filterBudget);

    // 5. Duration days
    result = result.filter(g => g.representative.durationDays <= filterDuration);

    // 6. Minimum available seats
    result = result.filter(g => g.representative.availableSeats >= filterMinSeats);

    // 7. Sort core criteria
    if (sortOption === 'Popular') {
      result.sort((a, b) => b.representative.reviewsCount - a.representative.reviewsCount);
    } else if (sortOption === 'PriceLowToHigh') {
      result.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sortOption === 'PriceHighToLow') {
      result.sort((a, b) => b.minPrice - a.minPrice);
    } else if (sortOption === 'HighestRated') {
      result.sort((a, b) => b.representative.rating - a.representative.rating);
    } else if (sortOption === 'Newest') {
      // simulated newest by sorting ID length
      result.sort((a, b) => b.representative.id.localeCompare(a.representative.id));
    }

    return result;
  }, [trips, searchQuery, selectedCategory, selectedDate, filterPickupCity, filterDifficulty, filterBudget, filterDuration, filterMinSeats, sortOption]);

  const resetFilters = () => {
    setFilterDifficulty('All');
    setFilterBudget(priceCeiling);
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
    if (filterBudget < priceCeiling) count++;
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
        <h1 className="font-serif text-4xl font-medium tracking-tight">Explore</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Search treks across India</p>

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
                  <span className={`text-sm font-bold ${darkMode ? 'text-elegant-orange' : 'text-forest-600'}`}>₹{filterBudget}</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={priceCeiling}
                  step={10}
                  value={filterBudget}
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
          <span className={darkMode ? 'text-zinc-500' : 'text-zinc-400'}>{filteredTreks.length} treks found</span>
          {activeFiltersCount > 0 && (
            <span className="text-spy-orange font-semibold">Filters applied</span>
          )}
        </div>

        {/* Empty state */}
        {tripsLoading ? (
          <div className="space-y-5">
            <SkeletonCard darkMode={darkMode} />
            <SkeletonCard darkMode={darkMode} />
            <SkeletonCard darkMode={darkMode} />
          </div>
        ) : filteredTreks.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block">🗺️</span>
            <h3 className="font-serif text-xl font-semibold mt-3">No treks matched</h3>
            <p className={`text-sm mt-1.5 px-6 leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Try widening your search, budget, or duration — or clear the filters to start fresh.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 bg-forest-600 hover:bg-forest-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredTreks.map((group, idx) => {
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
                    <span className="flex items-center gap-1"><Clock size={13} className="opacity-70" /> {trip.durationDays} Days</span>
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
          })
        )}
      </div>

    </div>
  );
}
