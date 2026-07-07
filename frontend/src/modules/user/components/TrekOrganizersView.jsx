/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Search, SlidersHorizontal, Star, MapPin, ShieldCheck, Users,
  Clock, Milestone, Heart, Sparkles, X, Check, Bus
} from 'lucide-react';

// Boarding cities this organizer picks travellers up from; older records
// without the field fall back to the trek's base city.
const getPickupPoints = (offer) =>
  offer.pickupPoints?.length
    ? offer.pickupPoints
    : [offer.city || offer.location?.split(',')[0]].filter(Boolean);

export default function TrekOrganizersView({
  trekName,
  offers,
  onBack,
  onSelectOrganizerOffer,
  wishlist,
  onToggleWishlist,
  darkMode
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortOption, setSortOption] = useState('PriceLowToHigh');

  const representative = useMemo(
    () => [...offers].sort((a, b) => b.rating - a.rating)[0],
    [offers]
  );

  const filteredOffers = useMemo(() => {
    let result = [...offers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => o.organizer.name.toLowerCase().includes(q));
    }

    if (verifiedOnly) {
      result = result.filter(o => o.organizer.verified);
    }

    if (sortOption === 'PriceLowToHigh') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'PriceHighToLow') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'HighestRated') {
      result.sort((a, b) => b.organizer.rating - a.organizer.rating);
    } else if (sortOption === 'Popular') {
      result.sort((a, b) => b.reviewsCount - a.reviewsCount);
    }

    return result;
  }, [offers, searchQuery, verifiedOnly, sortOption]);

  const resetFilters = () => {
    setSearchQuery('');
    setVerifiedOnly(false);
    setSortOption('PriceLowToHigh');
  };

  const activeFiltersCount = (verifiedOnly ? 1 : 0) + (sortOption !== 'PriceLowToHigh' ? 1 : 0);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-55 text-zinc-900'
    }`}>

      {/* Sticky back button over hero */}
      <div className="absolute top-4 left-4 z-30">
        <button
          id="btn-back-to-trek-source"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 flex items-center justify-center active:scale-90 shadow-md"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* 1. Hero banner using the top-rated organizer's cover image */}
        <div className="h-44 relative shrink-0 overflow-hidden bg-zinc-950">
          <img
            src={representative.coverImage}
            alt={trekName}
            className="absolute inset-0 w-full h-full object-cover brightness-[0.6]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
          <div className="absolute bottom-7 left-4 right-4">
            <span className={`text-[9px] font-mono font-bold uppercase tracking-widest block mb-0.5 ${
              darkMode ? 'text-elegant-orange' : 'text-forest-200'
            }`}>
              {offers.length} Organizer{offers.length > 1 ? 's' : ''} Offering This Trek
            </span>
            <h1 className="text-lg font-display font-black text-white leading-snug">{trekName}</h1>
            <p className="text-xs text-zinc-200/90 flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-spy-orange" />
              {representative.location}, {representative.state}
            </p>
          </div>
        </div>

        {/* 2. Shared trek stats row (same route across all organizers) */}
        <div className="px-4 -mt-3 relative z-10">
          <div className={`grid grid-cols-4 gap-2 p-2 rounded-2xl shadow-sm ${darkMode ? 'bg-zinc-900' : 'bg-white'}`}>
            {[
              { label: 'Difficulty', value: representative.difficulty },
              { label: 'Duration', value: `${representative.durationDays}D` },
              { label: 'Distance', value: `${representative.distanceKm}km` },
              { label: 'Max Group', value: representative.maxGroupSize }
            ].map((st, i) => (
              <div key={i} className="flex flex-col items-center text-center py-1">
                <span className={`text-[11px] font-black font-display ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>{st.value}</span>
                <span className="text-[8px] opacity-45 uppercase mt-0.5">{st.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Search + filter row */}
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                id="organizer-search-input"
                placeholder="Search organizers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full text-xs pl-9 pr-8 py-3 rounded-xl outline-hidden border ${
                  darkMode ? 'bg-zinc-900 border-white/5 text-white' : 'bg-white border-gray-200 text-zinc-800'
                }`}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              id="btn-toggle-organizer-filters"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3.5 rounded-xl border flex items-center justify-center relative active:scale-95 cursor-pointer ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-forest-600 border-forest-500 text-white'
                  : (darkMode ? 'bg-zinc-900 border-white/5 text-zinc-300' : 'bg-white border-gray-200 text-zinc-700')
              }`}
            >
              <SlidersHorizontal size={16} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white dark:border-zinc-950">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-zinc-900' : 'bg-white shadow-xs'}`}
              >
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-extrabold flex items-center gap-1">
                      <Sparkles size={13} className="text-spy-orange" /> Refine Organizers
                    </span>
                    <button onClick={resetFilters} className="text-[10px] font-bold text-rose-500 hover:underline">
                      Reset
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">Sort By</label>
                    <select
                      value={sortOption}
                      onChange={e => setSortOption(e.target.value)}
                      className={`w-full text-[11px] px-2.5 py-2 rounded-lg outline-hidden border ${
                        darkMode ? 'bg-zinc-950 border-zinc-850 text-zinc-300' : 'bg-gray-150 border-gray-250 text-zinc-800'
                      }`}
                    >
                      <option value="PriceLowToHigh">Price: Low to High</option>
                      <option value="PriceHighToLow">Price: High to Low</option>
                      <option value="HighestRated">Highest Rated</option>
                      <option value="Popular">Most Reviewed</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                      verifiedOnly
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                        : (darkMode ? 'border-white/10 text-zinc-400' : 'border-zinc-200 text-zinc-500')
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Verified Organizers Only
                    </span>
                    {verifiedOnly && <Check size={14} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results metadata */}
          <div className="flex justify-between items-center text-[10px] opacity-60">
            <span>SHOWING {filteredOffers.length} OF {offers.length} ORGANIZERS</span>
            {activeFiltersCount > 0 && <span className="text-spy-orange font-semibold">FILTERS APPLIED</span>}
          </div>

          {/* 4. Organizer offer cards */}
          {filteredOffers.length === 0 ? (
            <div className="text-center py-14">
              <span className="text-4xl block">🔍</span>
              <h3 className="text-sm font-display font-black mt-3">No Organizers Matched</h3>
              <p className={`text-xs mt-1 px-6 leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Try clearing your search or filters to see all organizers offering this trek.
              </p>
              <button
                onClick={resetFilters}
                className="mt-3 bg-forest-600 hover:bg-forest-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOffers.map((offer, idx) => {
                const isSaved = wishlist.includes(offer.id);
                return (
                  <motion.div
                    key={offer.id}
                    id={`organizer-offer-card-${offer.id}`}
                    onClick={() => onSelectOrganizerOffer(offer)}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.25), duration: 0.2 }}
                    whileHover={{ y: -2, scale: 1.005 }}
                    className={`p-3 rounded-2xl cursor-pointer active:scale-[0.99] transition relative ${
                      darkMode ? 'bg-zinc-900 hover:bg-zinc-900/80' : 'bg-white shadow-xs hover:shadow-sm'
                    }`}
                  >
                    <button
                      id={`btn-toggle-wishlist-offer-${offer.id}`}
                      onClick={(e) => { e.stopPropagation(); onToggleWishlist(offer.id); }}
                      className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center border active:scale-90 transition ${
                        isSaved
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : (darkMode ? 'bg-zinc-950/60 border-white/10 text-zinc-400' : 'bg-gray-55 border-gray-200 text-zinc-400')
                      }`}
                    >
                      <Heart size={12} fill={isSaved ? 'white' : 'none'} />
                    </button>

                    <div className="flex items-center gap-3 pr-9">
                      <img
                        src={offer.organizer.avatar}
                        alt={offer.organizer.name}
                        className="w-12 h-12 rounded-full object-cover border border-forest-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold font-display flex items-center gap-1 truncate">
                          {offer.organizer.name}
                          {offer.organizer.verified && <ShieldCheck size={12} className="text-emerald-400 fill-emerald-400/25 shrink-0" />}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          <span className="flex items-center gap-0.5 font-bold text-amber-500">
                            <Star size={10} className="fill-amber-400" /> {offer.organizer.rating}
                          </span>
                          <span className="opacity-50">({offer.reviewsCount} reviews)</span>
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 mt-2.5 pt-2.5 border-t text-[9px] ${darkMode ? 'border-white/5 text-zinc-400' : 'border-zinc-100 text-zinc-500'}`}>
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} className="text-forest-400" /> {offer.durationDays}D / {offer.durationDays - 1}N
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Milestone size={10} className="text-forest-400" /> {offer.distanceKm} Km
                      </span>
                      <span className="flex items-center gap-0.5 ml-auto font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${offer.availableSeats <= 5 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        {offer.availableSeats} seats left
                      </span>
                    </div>

                    {/* Boarding / pickup points this organizer supports */}
                    <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-45 flex items-center gap-1">
                        <Bus size={11} className="text-forest-400" /> Pickup
                      </span>
                      {getPickupPoints(offer).map(p => (
                        <span
                          key={p}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            darkMode ? 'bg-forest-500/15 text-forest-400' : 'bg-forest-500/10 text-forest-600'
                          }`}
                        >
                          Ex-{p}
                        </span>
                      ))}
                    </div>

                    {/* Batch pricing tier chips (falls back to a single rate for
                        legacy trip records saved before batch pricing existed) */}
                    <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
                      {(offer.pricingTiers && offer.pricingTiers.length > 0
                        ? offer.pricingTiers
                        : [{ id: 'base', label: 'Per Person', price: offer.price }]
                      ).map(tier => (
                        <span
                          key={tier.id}
                          className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap border ${
                            darkMode ? 'bg-zinc-950/60 border-white/10 text-zinc-300' : 'bg-zinc-50 border-zinc-150 text-zinc-600'
                          }`}
                        >
                          {tier.label.replace(' (per person)', '')}: ₹{tier.price}
                        </span>
                      ))}
                    </div>

                    <div className={`flex items-center justify-between mt-2.5 pt-2.5 border-t ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-wider opacity-55 font-bold">STARTING FROM</span>
                        <span className={`text-sm font-black font-sans ${darkMode ? 'text-forest-400' : 'text-forest-650'}`}>₹{offer.price}</span>
                      </div>
                      <button
                        className={`text-[9px] uppercase font-black px-3.5 py-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer active:scale-95 transition ${
                          darkMode ? 'bg-elegant-green text-white hover:bg-forest-600' : 'bg-forest-600 hover:bg-forest-700 text-white'
                        }`}
                      >
                        View Details <Sparkles size={10} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
