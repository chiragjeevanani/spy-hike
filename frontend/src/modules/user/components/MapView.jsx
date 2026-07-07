/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Search, Layers, Navigation, Star, MapPin, Heart, SlidersHorizontal, Map } from 'lucide-react';
import { groupTripsByTrekName } from '../utils/trekGroups';

// The list sheet starts covering the screen and swipes DOWN to these snap
// positions (fraction of viewport height pushed off the bottom), revealing the
// map behind it. Default 'peek' leaves the map ~60% visible up top.
const SNAP_FRACTIONS = { full: 0.05, peek: 0.6, map: 0.84 };
const SNAP_ORDER = ['full', 'peek', 'map'];

export default function MapView({ trips, wishlist, onToggleWishlist, onSelectTrek, onClose, darkMode }) {
  const [snap, setSnap] = useState('peek');
  const [query, setQuery] = useState('');

  // Measure the viewport so the swipe-down snaps are pixel-accurate.
  const overlayRef = useRef(null);
  const [vh, setVh] = useState(0);
  useLayoutEffect(() => {
    const measure = () => { if (overlayRef.current) setVh(overlayRef.current.offsetHeight); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const snapY = (s) => Math.round(vh * SNAP_FRACTIONS[s]);

  const trekGroups = useMemo(() => groupTripsByTrekName(trips), [trips]);
  const results = query.trim()
    ? trekGroups.filter(g => `${g.representative.name} ${g.representative.location}`.toLowerCase().includes(query.toLowerCase().trim()))
    : trekGroups;

  const diffPill = (d) => (d === 'Easy' ? 'text-emerald-700' : d === 'Moderate' ? 'text-amber-700' : 'text-rose-700');

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // On close the sheet first slides up to cover the map (see the sheet's
      // exit below); only then does the overlay quickly fade away, so the
      // close reads as "the bottom section rises and swallows the map".
      exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.3 } }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-60 overflow-hidden"
    >
      {/* ── Map surface (placeholder; swap for Google Maps once the key is added) ── */}
      {/* TODO(google-maps): mount the live <GoogleMap> / Map component here as the
          full-bleed background. The chrome below (controls, sheet) stays as-is. */}
      <div className={`absolute inset-0 ${darkMode ? 'bg-[#1c2a1f]' : 'bg-[#dfe9dd]'}`}>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
          <defs>
            <linearGradient id="map-terrain" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={darkMode ? '#233a29' : '#e7efe2'} />
              <stop offset="100%" stopColor={darkMode ? '#182420' : '#d3e2d6'} />
            </linearGradient>
          </defs>
          <rect width="400" height="800" fill="url(#map-terrain)" />
          {/* water body */}
          <path d="M-20 520 Q60 480 120 540 T280 560 Q360 540 420 590 L420 820 L-20 820 Z" fill={darkMode ? '#1c3340' : '#c3dced'} opacity="0.9" />
          {/* faint contour lines */}
          {[...Array(7)].map((_, i) => (
            <path
              key={i}
              d={`M-20 ${120 + i * 70} Q100 ${80 + i * 70} 200 ${140 + i * 70} T420 ${110 + i * 70}`}
              fill="none"
              stroke={darkMode ? '#3a5540' : '#b9cfb7'}
              strokeWidth="1.5"
              opacity="0.5"
            />
          ))}
          {/* roads */}
          <path d="M40 0 L180 400 L120 800" fill="none" stroke={darkMode ? '#4a5f4c' : '#ffffff'} strokeWidth="3" opacity="0.7" />
          <path d="M400 200 L220 380 L320 800" fill="none" stroke={darkMode ? '#4a5f4c' : '#ffffff'} strokeWidth="3" opacity="0.7" />
        </svg>

        {/* region labels */}
        <span className={`absolute top-[32%] right-6 text-[11px] font-bold tracking-widest uppercase ${darkMode ? 'text-white/35' : 'text-zinc-500/60'}`}>Maharashtra</span>
        <span className={`absolute top-[16%] left-8 text-[11px] font-bold tracking-widest uppercase ${darkMode ? 'text-white/30' : 'text-zinc-500/50'}`}>Gujarat</span>

        {/* trail cluster markers */}
        <div className="absolute top-[38%] left-[28%] px-2.5 py-1 rounded-full bg-white text-zinc-800 text-[11px] font-bold shadow-md">12 trails</div>
        <div className="absolute top-[52%] left-[58%] px-2.5 py-1 rounded-full bg-white text-zinc-800 text-[11px] font-bold shadow-md">3 trails</div>

        {/* "you are here" */}
        <div className="absolute top-[45%] left-[46%]">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white shadow" />
          </span>
        </div>

        {/* honest hint that the live map arrives with the API */}
        <div className={`absolute bottom-4 left-4 text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm ${darkMode ? 'bg-black/40 text-white/60' : 'bg-white/70 text-zinc-500'}`}>
          Live map connects with Google Maps
        </div>
      </div>

      {/* ── Top bar: back + controls ── */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl shadow-md active:scale-90 transition ${
            darkMode ? 'bg-black/50 text-white' : 'bg-white/80 text-zinc-800'
          }`}
        >
          <X size={20} />
        </button>

        {/* Map controls */}
        <div className="flex flex-col gap-2 items-end">
          <button className="w-11 h-11 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-xl text-white shadow-md active:scale-90 transition">
            <Layers size={18} />
          </button>
          <button className="w-11 h-11 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-xl text-white text-xs font-bold shadow-md active:scale-90 transition">
            3D
          </button>
        </div>
      </div>

      {/* Locate button just above the resting sheet */}
      <button className="absolute bottom-[42%] right-4 w-12 h-12 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-xl text-white shadow-md active:scale-90 transition z-10">
        <Navigation size={19} className="fill-white" />
      </button>

      {/* ── List sheet: starts covering the screen, swipes down to reveal the map ── */}
      <motion.div
        drag="y"
        dragConstraints={{ top: snapY('full'), bottom: snapY('map') }}
        dragElastic={0.06}
        onDragEnd={(e, info) => {
          const i = SNAP_ORDER.indexOf(snap);
          if ((info.offset.y > 70 || info.velocity.y > 500) && i < SNAP_ORDER.length - 1) setSnap(SNAP_ORDER[i + 1]);
          else if ((info.offset.y < -70 || info.velocity.y < -500) && i > 0) setSnap(SNAP_ORDER[i - 1]);
        }}
        initial={{ y: 0 }}
        animate={{ y: snapY(snap) }}
        // While rising, the sheet solidifies into the app's exact background
        // color so the final frame is a plain surface — the overlay's delayed
        // fade then reads as home content appearing, not a screen swap.
        exit={{
          y: 0,
          backgroundColor: darkMode ? '#241811' : '#faf8f2',
          transition: { type: 'tween', duration: 0.32, ease: [0.32, 0.72, 0, 1] }
        }}
        transition={{ type: 'spring', damping: 34, stiffness: 300 }}
        className={`absolute inset-x-0 bottom-0 h-full z-20 rounded-t-3xl shadow-2xl backdrop-blur-2xl border-t flex flex-col ${
          darkMode ? 'bg-elegant-app/85 border-white/10 text-elegant-text' : 'bg-white/90 border-white/60 text-zinc-900'
        }`}
      >
        {/* Active "Map" pill — anchored just above the sheet, so it travels with
            the sheet instead of jumping to the top. Tap to close the map. */}
        <button
          onClick={onClose}
          className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full bg-forest-600 text-white text-sm font-semibold shadow-lg active:scale-95 z-10"
        >
          <Map size={16} /> Map
        </button>

        {/* Sheet content fades out early in the close so the rising sheet
            ends as a blank surface before home takes over. */}
        <motion.div
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          className="flex-1 min-h-0 flex flex-col"
        >

        {/* grabber */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <div className={`w-10 h-1.5 rounded-full ${darkMode ? 'bg-white/20' : 'bg-zinc-300'}`} />
        </div>

        <div className="px-5 pt-1 shrink-0">
          {/* search */}
          <div className="relative">
            <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white/40' : 'text-zinc-400'}`} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Map area"
              className={`w-full text-sm pl-11 pr-4 py-3 rounded-full outline-hidden border ${
                darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/40' : 'bg-gray-100 border-gray-200 text-zinc-800 placeholder-zinc-500'
              }`}
            />
          </div>

          {/* filter chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            <button className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold shrink-0 ${darkMode ? 'bg-elegant-card text-white' : 'bg-gray-100 text-zinc-700'}`}>
              <SlidersHorizontal size={13} /> All
            </button>
            {['Difficulty', 'Length', 'Elevation gain'].map(f => (
              <button key={f} className={`px-3.5 py-2 rounded-full text-xs font-semibold shrink-0 ${darkMode ? 'bg-elegant-card text-zinc-300' : 'bg-gray-100 text-zinc-600'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* count row */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="text-sm font-semibold">{results.length} trails</span>
            <span className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Most relevant</span>
          </div>
        </div>

        {/* trail list */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6 space-y-4" onPointerDownCapture={(e) => e.stopPropagation()}>
          {results.map(group => {
            const trip = group.representative;
            const isSaved = wishlist.includes(trip.id);
            return (
              <div
                key={group.trekName}
                onClick={() => onSelectTrek(group.trekName)}
                className={`rounded-2xl overflow-hidden cursor-pointer shadow-sm ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}
              >
                <div className="relative h-40 overflow-hidden">
                  <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover" />
                  <span className={`absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm ${diffPill(trip.difficulty)}`}>
                    {trip.difficulty}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleWishlist(trip.id); }}
                    className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 transition ${
                      isSaved ? 'bg-rose-500 text-white' : 'bg-black/35 text-white hover:bg-black/55'
                    }`}
                  >
                    <Heart size={15} fill={isSaved ? 'white' : 'none'} />
                  </button>
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-base font-semibold leading-tight">{trip.name}</h3>
                    <span className="flex items-center gap-1 text-xs font-bold shrink-0 mt-0.5">
                      <Star size={12} className="text-amber-400 fill-amber-400" /> {trip.rating}
                    </span>
                  </div>
                  <p className={`text-xs flex items-center gap-1 mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <MapPin size={12} className="text-spy-orange" /> {trip.location} · {trip.durationDays} Days
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        </motion.div>
      </motion.div>
    </motion.div>
  );
}
