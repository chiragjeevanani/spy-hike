/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, SlidersHorizontal, Star, MapPin, Calendar, DollarSign, Clock, Users, ArrowUpAZ, X, Sparkles, Check, Heart
} from 'lucide-react';

export default function ExploreView({
  trips,
  wishlist,
  onToggleWishlist,
  onSelectTrip,
  searchQuery,
  onSetSearchQuery,
  selectedCategory,
  onSetCategory,
  darkMode
}) {
  
  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterBudget, setFilterBudget] = useState(400);
  const [filterDuration, setFilterDuration] = useState(8);
  const [filterMinSeats, setFilterMinSeats] = useState(1);
  const [sortOption, setSortOption] = useState('Popular');

  // Categories quick toggles
  const categoriesList = ['All', 'Trekking', 'Hiking', 'Camping', 'Adventure Tours', 'Nature Walks', 'Weekend Trips'];

  // Dynamic search + filters + sort core mathematical calculation
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    // 1. Search Query (checks Name, Location, City, State)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => 
        t.name.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.state.toLowerCase().includes(q)
      );
    }

    // 2. Quick category selector
    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter(t => t.category === selectedCategory);
    }

    // 3. Difficulty Level
    if (filterDifficulty !== 'All') {
      result = result.filter(t => t.difficulty === filterDifficulty);
    }

    // 4. Budget Range
    result = result.filter(t => t.price <= filterBudget);

    // 5. Duration days
    result = result.filter(t => t.durationDays <= filterDuration);

    // 6. Minimum available seats
    result = result.filter(t => t.availableSeats >= filterMinSeats);

    // 7. Sort core criteria
    if (sortOption === 'Popular') {
      result.sort((a, b) => b.reviewsCount - a.reviewsCount);
    } else if (sortOption === 'PriceLowToHigh') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'PriceHighToLow') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'HighestRated') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortOption === 'Newest') {
      // simulated newest by sorting ID length
      result.sort((a, b) => b.id.localeCompare(a.id));
    }

    return result;
  }, [trips, searchQuery, selectedCategory, filterDifficulty, filterBudget, filterDuration, filterMinSeats, sortOption]);

  const resetFilters = () => {
    setFilterDifficulty('All');
    setFilterBudget(400);
    setFilterDuration(8);
    setFilterMinSeats(1);
    setSortOption('Popular');
    onSetSearchQuery('');
    onSetCategory('All');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterDifficulty !== 'All') count++;
    if (filterBudget < 400) count++;
    if (filterDuration < 8) count++;
    if (filterMinSeats > 1) count++;
    if (sortOption !== 'Popular') count++;
    if (selectedCategory !== 'All') count++;
    return count;
  }, [filterDifficulty, filterBudget, filterDuration, filterMinSeats, sortOption, selectedCategory]);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans ${
      darkMode ? 'bg-elegant-app text-elegant-text' : 'bg-gray-50 text-zinc-900'
    }`}>
      
      {/* Search Header Row */}
      <div className={`p-4 border-b shrink-0 flex flex-col gap-3 ${
        darkMode ? 'bg-elegant-app border-white/5' : 'bg-white border-gray-100'
      }`}>
        <div className="flex gap-2">
          {/* Main search */}
          <div className="relative flex-1">
            <input
              type="text"
              id="explore-search-input"
              placeholder="Search destination, state, city..."
              value={searchQuery}
              onChange={e => onSetSearchQuery(e.target.value)}
              className={`w-full text-xs pl-9 pr-8 py-3 rounded-xl outline-hidden border ${
                darkMode ? 'bg-elegant-card border-white/5 text-white' : 'bg-gray-100 border-gray-200 text-zinc-800'
              }`}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            {searchQuery && (
              <button 
                onClick={() => onSetSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            id="btn-toggle-filters"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 rounded-xl border flex items-center justify-center relative active:scale-95 cursor-pointer ${
              showFilters || activeFiltersCount > 0
                ? 'bg-forest-600 border-forest-500 text-white'
                : (darkMode ? 'bg-elegant-card border-white/5 text-zinc-300' : 'bg-white border-gray-200 text-zinc-700')
            }`}
          >
            <SlidersHorizontal size={16} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white dark:border-elegant-app">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Horizontal Quick filter categories select */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categoriesList.map(cat => (
            <button
              key={cat}
              id={`quick-cat-${cat.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => onSetCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider shrink-0 border transition ${
                selectedCategory === cat
                  ? 'bg-forest-600 border-forest-500 text-white shadow-xs'
                  : (darkMode ? 'bg-elegant-card border-white/5 text-zinc-400' : 'bg-white border-gray-100 text-zinc-650')
              }`}
            >
              {cat}
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
            className={`p-4 border-b shrink-0 space-y-4 shadow-inner max-h-[360px] overflow-y-auto no-scrollbar overflow-hidden ${
              darkMode ? 'bg-elegant-card border-white/5' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-extrabold flex items-center gap-1">
                <Sparkles size={13} className="text-spy-orange" /> Refine Adventures
              </span>
              <button 
                onClick={resetFilters}
                className="text-[10px] font-bold text-rose-500 hover:underline"
              >
                Reset Filters
              </button>
            </div>

            {/* 1. Difficulty levels filters */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Difficulty</label>
              <div className="grid grid-cols-4 gap-1.5">
                {['All', 'Easy', 'Moderate', 'Difficult'].map(diff => (
                  <button
                    key={diff}
                    onClick={() => setFilterDifficulty(diff)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold transition border ${
                      filterDifficulty === diff
                        ? 'bg-forest-600 border-forest-500 text-white'
                        : (darkMode ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-gray-100 border-gray-100 text-zinc-655')
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Slide budget slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider opacity-70">
                <span>Max Budget Limit</span>
                <span className={`font-sans font-extrabold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>₹{filterBudget}</span>
              </div>
              <input
                type="range"
                min={40}
                max={400}
                step={10}
                value={filterBudget}
                onChange={e => setFilterBudget(Number(e.target.value))}
                className="w-full accent-forest-600 pointer-events-auto h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] opacity-40 font-mono">
                <span>₹40</span>
                <span>₹400</span>
              </div>
            </div>

            {/* 3. Duration days limit slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider opacity-70">
                <span>Max Trek Duration</span>
                <span className="font-mono text-spy-orange font-extrabold">{filterDuration} Days</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                value={filterDuration}
                onChange={e => setFilterDuration(Number(e.target.value))}
                className="w-full accent-forest-600 pointer-events-auto h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] opacity-40 font-mono">
                <span>1 Day</span>
                <span>8 Days</span>
              </div>
            </div>

            {/* 4. Sorting & Seats available side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Sort By</label>
                <select
                  value={sortOption}
                  onChange={e => setSortOption(e.target.value)}
                  className={`w-full text-[10px] px-2 py-2 rounded-lg outline-hidden border ${
                    darkMode ? 'bg-zinc-950 border-zinc-850 text-zinc-300' : 'bg-gray-150 border-gray-250 text-zinc-800'
                  }`}
                >
                  <option value="Popular">Most Popular</option>
                  <option value="PriceLowToHigh">Price: Low to High</option>
                  <option value="PriceHighToLow">Price: High to Low</option>
                  <option value="HighestRated">Highest Rated</option>
                  <option value="Newest">Newest Launch</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Min Available Seats</label>
                <select
                  value={filterMinSeats}
                  onChange={e => setFilterMinSeats(Number(e.target.value))}
                  className={`w-full text-[10px] px-2 py-2 rounded-lg outline-hidden border ${
                    darkMode ? 'bg-zinc-950 border-zinc-850 text-zinc-300' : 'bg-gray-150 border-gray-250 text-zinc-800'
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
              className="w-full bg-forest-650 hover:bg-forest-750 text-white text-[11px] font-bold py-2 rounded-xl active:scale-95 cursor-pointer"
            >
              Apply Active Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main results list container scroll */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
        
        {/* Results Metadata */}
        <div className="flex justify-between items-center text-[10px] opacity-60">
          <span>SHOWING {filteredTrips.length} EXPEDITIONS</span>
          {activeFiltersCount > 0 && (
            <span className="text-spy-orange font-semibold">FILTERS APPLIED</span>
          )}
        </div>

        {/* Empty list screen */}
        {filteredTrips.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl block">🗺️</span>
            <h3 className="text-sm font-display font-black mt-3">No Hiking Trails Matched</h3>
            <p className={`text-xs mt-1 px-6 leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Your active combination of difficulty limits, budget slider, and keyword searches returned zero results.
            </p>
            <button
              onClick={resetFilters}
              className="mt-3 bg-forest-600 hover:bg-forest-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredTrips.map((trip, idx) => {
            const isSaved = wishlist.includes(trip.id);
            return (
              <motion.div
                key={trip.id}
                id={`trip-list-card-${trip.id}`}
                onClick={() => onSelectTrip(trip)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.25), duration: 0.25 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className={`rounded-xl overflow-hidden flex flex-col relative shadow-xs hover:shadow-sm transition active:scale-[0.99] group ${
                  darkMode ? 'bg-elegant-card' : 'bg-white'
                }`}
              >
                
                {/* Visual Image Banner with details overlay floaters */}
                <div className="h-34 relative overflow-hidden">
                  <img 
                    src={trip.coverImage} 
                    alt={trip.name} 
                    className="w-full h-full object-cover group-hover:scale-103 duration-300 brightness-[0.75] dark:brightness-[0.7]" 
                  />
                  
                  {/* Floating Left: Difficulty tag */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm ${
                      trip.difficulty === 'Easy' 
                        ? 'bg-green-500 border-green-400 text-white' 
                        : trip.difficulty === 'Moderate' 
                        ? 'bg-orange-505 border-orange-400 text-white'
                        : 'bg-red-505 border-red-400 text-white'
                    }`}>
                      {trip.difficulty}
                    </span>
                    
                    <span className="bg-black/55 text-white/90 text-[7px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full backdrop-blur-xs border border-white/15 self-start">
                      {trip.category}
                    </span>
                  </div>

                  {/* Floating Right: Wishlist Toggle Button */}
                  <button
                    id={`btn-toggle-wishlist-explore-${trip.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(trip.id);
                    }}
                    className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center border backdrop-blur-md active:scale-90 transition z-20 ${
                      isSaved
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'bg-black/30 border-white/25 text-white hover:bg-black/50'
                    }`}
                  >
                    <Heart size={12} fill={isSaved ? 'white' : 'none'} />
                  </button>

                  {/* Bottom: Dynamic Location label */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-0.5 text-white text-xs font-semibold drop-shadow-md">
                    <MapPin size={11} className="text-spy-orange fill-spy-orange shrink-0" />
                    <span>{trip.location}</span>
                  </div>
                </div>

                {/* Info block */}
                <div className="p-3 space-y-2">
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="font-display font-black text-xs group-hover:text-forest-505 leading-snug">
                      {trip.name}
                    </h3>
                    <div className="flex items-center gap-0.5 text-[11px] font-black shrink-0 text-amber-500">
                      <Star size={10} className="fill-amber-400" />
                      <span>{trip.rating}</span>
                      <span className="opacity-50 text-[9px] font-normal">({trip.reviewsCount})</span>
                    </div>
                  </div>

                  {/* Dynamic specs row icons */}
                  <div className="flex items-center gap-3 text-[9px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Clock size={11} className="text-forest-400" />
                      {trip.durationDays}D / {trip.durationDays - 1}N
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Users size={11} className="text-forest-400" />
                      Max: {trip.maxGroupSize}
                    </span>
                    <span className="flex items-center gap-0.5 ml-auto font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${trip.availableSeats <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                      {trip.availableSeats} seats left
                    </span>
                  </div>

                  {/* Primary Call Action divider lines */}
                  <div className={`flex items-center justify-between pt-2 border-t ${
                    darkMode ? 'border-white/5' : 'border-zinc-100'
                  }`}>
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-wider opacity-55 font-bold">STARTING PRICE</span>
                      <span className={`text-xs font-black font-sans ${darkMode ? 'text-[#F27D26]' : 'text-forest-655'}`}>₹{trip.price}</span>
                    </div>

                    <button
                      className={`text-[9px] uppercase font-black px-3.5 py-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer active:scale-95 transition ${
                        darkMode ? 'bg-elegant-green text-white hover:bg-forest-600' : 'bg-forest-600 group-hover:bg-forest-700 text-white'
                      }`}
                    >
                      Book Trek <Sparkles size={10} />
                    </button>
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
