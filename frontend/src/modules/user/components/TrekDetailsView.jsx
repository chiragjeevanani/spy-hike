import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, MapPin, Clock, Compass, Users, Sparkles, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Star, ShieldCheck, Footprints, Flame,
  FileText, Backpack, Info, CalendarDays, Award
} from 'lucide-react';
import { durationRange, distanceRange } from '../../../utils/rangeFormat';

export default function TrekDetailsView({
  trek,
  offers = [],
  onBack,
  onViewOrganisers,
  wishlist = [],
  onToggleWishlist,
  darkMode
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'itinerary' | 'thingsToCarry' | 'inclusions'
  const [expandedDay, setExpandedDay] = useState(1);

  if (!trek) return null;

  const trekTitle = trek.title || trek.name;
  const trekLocation = trek.location || trek.startingPoint;
  const stateCity = [trek.city, trek.state].filter(Boolean).join(', ');
  const startingPoint = trek.startingPoint || trek.location;
  // Ranges — "5" for an exact trek, "5-6" when the trek spans a range.
  const duration = durationRange(trek) || '2';
  const distance = distanceRange(trek) || '10';
  const elevation = trek.elevationMeters || 1000;
  const difficulty = trek.difficulty || 'Moderate';
  const description = trek.description || `${trekTitle} offers an extraordinary trekking experience with panoramic mountain vistas, wilderness trails, and high-altitude adventure.`;
  const coverImage = trek.coverImage || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80';

  // Available organizers count
  const organizerCount = offers.length;
  const minPrice = offers.length ? Math.min(...offers.map(o => o.price || 0)) : null;

  // Itinerary default fallback if empty
  const itinerary = (trek.itinerary && trek.itinerary.length)
    ? trek.itinerary
    : [
        { day: 1, title: 'Arrival & Base Camp Assembly', description: `Reach ${startingPoint}. Meet your Sherpa team, verify permits, receive briefing, and assemble at base camp.` },
        { day: 2, title: 'Summit Ascent & Wilderness Trek', description: `Early morning start to conquer peak altitudes up to ${elevation}m. Experience breathtaking scenic ridges.` },
      ];

  // Things to carry list
  const thingsToCarry = (trek.thingsToCarry && trek.thingsToCarry.length)
    ? trek.thingsToCarry
    : [
        'Personal medication (if any)',
        'Strong backpack (Preferably water proof)',
        'Fresh pair of clothes',
        'Toiletries',
        'Mosquito Repellent Cream',
        'Water bottles (at least 2 liters of water)',
        'Torch with new batteries (must in case of emergency)',
        'Energy snacks & drinks (Chocolate bars, Electrolyte drinks)',
        'Sunglasses & Sunscreen',
        'Rain Coat / Poncho',
        'Hiking shoes with good grip'
      ];

  // Inclusions & Exclusions
  const inclusions = (trek.included && trek.included.length)
    ? trek.included
    : [
        'Forest permission & entry permits',
        'Transport from base location to trek starting point',
        'Accommodation in Geodesic Dome Tents / Homestays',
        'Fresh Veg Meals (Breakfast, Packed Lunch, Snacks & Dinner)',
        'Certified Sherpa Guides & Safety Equipment'
      ];

  const exclusions = (trek.notIncluded && trek.notIncluded.length)
    ? trek.notIncluded
    : [
        'GST 5%',
        'Personal luggage offloading charges',
        'Medical emergency evacuation costs',
        'Anything not explicitly mentioned under Inclusions'
      ];

  const difficultyBg = difficulty === 'Easy'
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
    : difficulty === 'Moderate'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';

  return (
    <div className={`relative flex flex-col h-full overflow-hidden ${darkMode ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-zinc-900'}`}>
      
      {/* 1. TOP NAV BAR */}
      <div className={`sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-b backdrop-blur-md transition-colors ${
        darkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-zinc-200'
      }`}>
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className={`p-2 rounded-full border transition active:scale-95 cursor-pointer ${
              darkMode ? 'border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800' : 'border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
            }`}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          <span className="font-display font-bold text-sm sm:text-base tracking-tight truncate max-w-md">
            {trekTitle}
          </span>

          <div className="w-9" /> {/* Spacer */}
        </div>
      </div>

      {/* 2. SCROLLABLE BODY CONTENT */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-5xl mx-auto w-full px-0 sm:px-4">
        
        {/* Cover Hero Banner */}
        <div className="relative h-64 sm:h-96 w-full overflow-hidden sm:rounded-3xl sm:mt-4">
          <img
            src={coverImage}
            alt={trekTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${difficultyBg}`}>
                {difficulty}
              </span>
              {stateCity && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/40 backdrop-blur-md text-zinc-200 border border-white/10 flex items-center gap-1">
                  <MapPin size={12} className="text-spy-orange" />
                  {stateCity}
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">
              {trekTitle}
            </h1>
            <p className="text-xs text-zinc-300 flex items-center gap-1 mt-1">
              <Compass size={13} className="text-spy-orange shrink-0" />
              Starting Point: <strong className="text-white font-semibold">{startingPoint}</strong>
            </p>
          </div>
        </div>

        {/* Key Timeline & Stats Bar */}
        <div className={`mx-4 -mt-4 relative z-10 p-4 rounded-2xl border shadow-lg grid grid-cols-4 gap-2 text-center backdrop-blur-md ${
          darkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/95 border-zinc-200'
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Duration</span>
            <span className="font-bold text-sm flex items-center justify-center gap-1 text-spy-orange">
              <Clock size={13} /> {duration} Days
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Distance</span>
            <span className="font-bold text-sm flex items-center justify-center gap-1 text-emerald-500">
              <Footprints size={13} /> {distance} Km
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Elevation</span>
            <span className="font-bold text-sm flex items-center justify-center gap-1 text-sky-500">
              <Flame size={13} /> {elevation}m
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Organisers</span>
            <span className="font-bold text-sm flex items-center justify-center gap-1 text-purple-500">
              <Users size={13} /> {organizerCount}
            </span>
          </div>
        </div>

        {/* SECTION TABS */}
        <div className={`flex border-b px-4 mt-6 sticky top-12 z-20 backdrop-blur-md overflow-x-auto no-scrollbar ${
          darkMode ? 'bg-zinc-950/90 border-zinc-800' : 'bg-slate-50/90 border-zinc-200'
        }`}>
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'itinerary', label: 'Itinerary', icon: CalendarDays },
            { id: 'thingsToCarry', label: 'Things to Carry', icon: Backpack },
            { id: 'inclusions', label: 'Inclusions', icon: CheckCircle2 },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-3 px-4 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-spy-orange text-spy-orange font-bold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="p-4 space-y-6">

          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                <h3 className="font-serif text-lg font-bold mb-2 flex items-center gap-2">
                  <Info size={16} className="text-spy-orange" />
                  About {trekTitle}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              </div>

              {/* Location & Starting Point Box */}
              <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <MapPin size={14} className="text-spy-orange" />
                  Trek Location & Starting Point
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-forest-500/10 border border-forest-500/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest-600 dark:text-forest-400 block mb-1">
                      Starting Base Location
                    </span>
                    <p className="font-semibold text-sm">{startingPoint}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-1">
                      City & State
                    </span>
                    <p className="font-semibold text-sm">{stateCity || trekLocation}</p>
                  </div>
                </div>
              </div>

              {/* Highlights / Important Specs */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-spy-orange" />
                  Key Features & Highlights
                </h3>

                <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-forest-500 shrink-0 mt-0.5" />
                    <span><strong>Difficulty Level:</strong> {difficulty} — Ideal for outdoor adventure lovers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-forest-500 shrink-0 mt-0.5" />
                    <span><strong>Trek Length:</strong> {distance} Kms total expedition.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-forest-500 shrink-0 mt-0.5" />
                    <span><strong>Max Elevation:</strong> {elevation} Meters above sea level.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-forest-500 shrink-0 mt-0.5" />
                    <span><strong>Base Camp Access:</strong> Direct pickup and guide assembly from {startingPoint}.</span>
                  </li>
                </ul>
              </div>

            </motion.div>
          )}

          {/* 2. ITINERARY TAB */}
          {activeTab === 'itinerary' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <h3 className="font-serif text-base font-bold mb-1 flex items-center gap-2">
                <CalendarDays size={16} className="text-spy-orange" />
                Day-by-Day Trek Timeline
              </h3>

              {itinerary.map((item, idx) => {
                const dayNum = item.day || idx + 1;
                const isExpanded = expandedDay === dayNum;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      darkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : dayNum)}
                      className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-spy-orange/15 text-spy-orange font-bold text-xs flex items-center justify-center shrink-0">
                          Day {dayNum}
                        </span>
                        <div>
                          <h4 className="font-semibold text-sm leading-tight">{item.title}</h4>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 text-xs text-zinc-500 dark:text-zinc-300 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/60">
                        {item.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* 3. THINGS TO CARRY TAB */}
          {activeTab === 'thingsToCarry' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                <h3 className="font-serif text-base font-bold mb-1 flex items-center gap-2">
                  <Backpack size={16} className="text-spy-orange" />
                  Things to Carry
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 font-medium uppercase tracking-wider">
                  Pack light, carry only what is necessary
                </p>

                <div className="space-y-2.5">
                  {thingsToCarry.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-200">
                      <Star size={14} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 4. INCLUSIONS / EXCLUSIONS TAB */}
          {activeTab === 'inclusions' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Included */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                <h3 className="font-serif text-base font-bold text-forest-600 dark:text-forest-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  What is included in the tour
                </h3>

                <div className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-200">
                  {inclusions.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="text-forest-500 fill-forest-500/20 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Not Included */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
                <h3 className="font-serif text-base font-bold text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
                  <XCircle size={18} />
                  What is NOT included in the tour
                </h3>

                <div className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-200">
                  {exclusions.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <XCircle size={15} className="text-rose-500 fill-rose-500/20 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

        </div>
        </div>
      </div>

      {/* 3. BOTTOM FLOATING ACTION BAR FOR "VIEW ORGANISERS" */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 p-4 border-t backdrop-blur-lg shadow-2xl ${
        darkMode ? 'bg-zinc-950/95 border-zinc-800' : 'bg-white/95 border-zinc-200'
      }`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-2 sm:px-4">
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400 block whitespace-nowrap">
              Starting From
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-lg sm:text-xl font-bold text-spy-orange whitespace-nowrap">
                {minPrice ? `₹${minPrice}` : 'Check Listings'}
              </span>
              {minPrice && <span className="text-[9px] sm:text-[10px] text-zinc-400 whitespace-nowrap">/ person</span>}
            </div>
          </div>

          <button
            id="view-organisers-btn"
            onClick={() => onViewOrganisers(trekTitle)}
            className="flex-1 max-w-[240px] py-3 px-3 sm:px-5 rounded-2xl bg-gradient-to-r from-spy-orange to-orange-600 hover:from-orange-600 hover:to-spy-orange text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap"
          >
            <Users size={15} className="shrink-0" />
            <span>View Organisers</span>
            {organizerCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-white/20 text-white font-bold">
                {organizerCount}
              </span>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
