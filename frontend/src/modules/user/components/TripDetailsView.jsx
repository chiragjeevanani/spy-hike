/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Heart, Star, MapPin, Milestone, TrendingUp, ShieldCheck, Users, 
  CheckCircle, XCircle, ChevronDown, CalendarDays, Award, MessageSquare, AlertTriangle, ScrollText
} from 'lucide-react';

export default function TripDetailsView({
  trip,
  onBack,
  wishlist,
  onToggleWishlist,
  onTriggerBooking,
  onSelectOrganizer,
  darkMode
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const isSaved = wishlist.includes(trip.id);

  const stats = [
    { label: 'Difficulty', value: trip.difficulty, icon: <Award className="w-5 h-5 text-spy-orange" /> },
    { label: 'Distance', value: `${trip.distanceKm} Km`, icon: <Milestone className="w-5 h-5 text-forest-500" /> },
    { label: 'Duration', value: `${trip.durationDays} Days`, icon: <CalendarDays className="w-5 h-5 text-forest-500" /> },
    { label: 'Group Size', value: `Max ${trip.maxGroupSize}`, icon: <Users className="w-5 h-5 text-forest-500" /> },
    { label: 'Elevation', value: `${trip.elevationMeters}m`, icon: <TrendingUp className="w-5 h-5 text-spy-orange" /> },
  ];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden relative font-sans ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-55 text-zinc-900'
    }`}>
      
      {/* Sticky top headers */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center z-30 pointer-events-none">
        <button
          id="btn-back-to-explore"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 flex items-center justify-center active:scale-90 pointer-events-auto shadow-md"
        >
          <ArrowLeft size={18} />
        </button>

        <button
          id="btn-toggle-wishlist-details"
          onClick={() => onToggleWishlist(trip.id)}
          className={`w-10 h-10 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition pointer-events-auto shadow-md ${
            isSaved ? 'bg-rose-500 text-white border-rose-405' : 'bg-black/40 text-white'
          }`}
        >
          <Heart size={18} fill={isSaved ? 'white' : 'none'} />
        </button>
      </div>

      {/* Scrollable primary details container */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* 1. HERO BAR & IMAGE SLIDER */}
        <div className="h-72 relative shrink-0 overflow-hidden bg-zinc-950">
          <AnimatePresence mode="wait">
            <motion.img 
              key={activeImageIdx}
              src={trip.galleryImages[activeImageIdx]} 
              alt={trip.name} 
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full object-cover brightness-[0.7]" 
            />
          </AnimatePresence>

          {/* Dot switcher indices */}
          <div className="absolute bottom-4 left-4 flex gap-1.5 z-20">
            {trip.galleryImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIdx(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeImageIdx ? 'w-5 bg-forest-500' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>

          {/* Floater overlay title */}
          <div className="absolute bottom-4 right-4 z-20 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10 text-white text-[10px] font-mono">
            {activeImageIdx + 1} / {trip.galleryImages.length} Photos
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent"></div>
        </div>

        {/* Small thumbnail strip selector */}
        <div className={`p-4 flex gap-2.5 overflow-x-auto no-scrollbar ${darkMode ? 'bg-zinc-900/40' : 'bg-zinc-50/50'}`}>
          {trip.galleryImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImageIdx(idx)}
              className={`w-12 h-12 rounded-lg shrink-0 overflow-hidden border transition ${
                idx === activeImageIdx ? 'border-forest-500 scale-103 ring-2 ring-forest-500/20' : 'border-zinc-200 dark:border-white/10 opacity-60'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {/* 2. CORE TRIP INFORMATION ROW */}
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold uppercase text-spy-orange tracking-widest block">
              ⭐ VERIFIED HIKE ORGANIZER
            </span>
            <h1 className="text-xl font-display font-black leading-snug">
              {trip.name}
            </h1>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <MapPin size={12} className="text-forest-500" />
              {trip.location}, {trip.state}
            </p>
          </div>

          {/* Rating metadata & Organizer Info card */}
          <div 
            onClick={() => onSelectOrganizer && onSelectOrganizer(trip.organizer)}
            className={`p-3 rounded-2xl flex items-center justify-between transition-transform duration-200 hover:scale-[1.01] cursor-pointer ${
              darkMode ? 'bg-zinc-900/40 hover:bg-zinc-900/60' : 'bg-gray-55 shadow-xs hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <img 
                src={trip.organizer.avatar} 
                alt={trip.organizer.name} 
                className="w-10 h-10 rounded-full object-cover border border-forest-500" 
              />
              <div>
                <span className="text-[9px] opacity-50 block">CREATED BY</span>
                <span className="text-xs font-bold font-display flex items-center gap-0.5">
                  {trip.organizer.name}
                  {trip.organizer.verified && <ShieldCheck size={12} className="text-emerald-400 fill-emerald-400/25 shrink-0" />}
                </span>
                <span className="text-[9px] text-amber-500 font-bold block">★ {trip.organizer.rating} Organizer Rating</span>
              </div>
            </div>

            <div className={`text-right border-l pl-4 ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-0.5 text-xs font-extrabold text-amber-400">
                <Star size={12} className="fill-amber-400" /> {trip.rating}
              </div>
              <span className="text-[9px] opacity-50 block">{trip.reviewsCount} Reviews</span>
            </div>
          </div>
        </div>

        {/* 3. TRIP INFOMATION STATS GRID */}
        <div className="px-4 mt-2">
          <div className="grid grid-cols-5 gap-2">
            {stats.map((st, i) => (
              <div 
                key={i}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center text-center shadow-xs ${
                  darkMode ? 'bg-zinc-900/30' : 'bg-white shadow-xs'
                }`}
              >
                {st.icon}
                <span className={`text-[11px] font-black font-display tracking-tight mt-1 ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>{st.value}</span>
                <span className="text-[8px] opacity-45 uppercase mt-0.5 block scale-90">{st.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. TABS NAVIGATION PANEL */}
        <div className="mt-6 px-4">
          <div className={`flex rounded-xl p-1 border justify-around relative overflow-hidden ${
            darkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-100/80 border-zinc-200/60'
          }`}>
            {['Overview', 'Itinerary', 'Checklist', 'Reviews'].map(tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  id={`details-tab-${tab.toLowerCase()}`}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative z-10 ${
                    isActive
                      ? 'text-white font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-500'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="tripDetailsTabCapsule"
                      className="absolute inset-0 bg-forest-600 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. TAB DETAILS CONTENT SWITCHER */}
        <div className="px-4 mt-5 min-h-[250px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
          {activeTab === 'Overview' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
                  <ScrollText size={13} className="text-forest-400" /> Extended Description
                </h3>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {trip.description}
                </p>
              </div>

              {/* Highlights List */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider opacity-85">Expedition Highlights</h3>
                <ul className="space-y-2">
                  {trip.highlights.map((hlt, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-spy-orange shrink-0 mt-1.5 animate-pulse" />
                      <span className={darkMode ? 'text-zinc-300' : 'text-zinc-700'}>{hlt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Safety guidelines */}
              <div className={`p-4 rounded-2xl ${
                darkMode ? 'bg-zinc-900/20' : 'bg-orange-50/50'
              }`}>
                <h4 className="text-xs font-display font-bold text-spy-orange flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} /> Critical Safety Guidelines
                </h4>
                <ul className="space-y-1.5 text-[11px] leading-relaxed">
                  {trip.safetyGuidelines.map((safe, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-zinc-400 dark:text-zinc-300">
                      <span>•</span>
                      <span>{safe}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cancellation policy */}
              <div className={`space-y-1 text-xs opacity-80 pt-2 border-t ${darkMode ? 'border-white/10' : 'border-zinc-200/60'}`}>
                <span className="text-[10px] font-bold uppercase opacity-60">Cancellation & Refund Policy</span>
                <p className="text-[11px] leading-normal">{trip.cancellationPolicy[0]}</p>
              </div>
            </div>
          )}

          {activeTab === 'Itinerary' && (
            <div className="space-y-4">
              <h3 className="text-xs font-display font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5 mb-2">
                <CalendarDays size={13} className="text-forest-400" /> Day-wise Timeline Plan
              </h3>

              <div className="relative pl-6 border-l-2 border-dashed border-forest-500/30 space-y-5 ml-2.5">
                {trip.itinerary.map((dayPlan, i) => (
                  <div key={i} className="relative">
                    {/* Circle tracker pin */}
                    <div className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-forest-600 border-2 border-zinc-950 flex items-center justify-center font-mono text-[8px] font-black text-white">
                      {dayPlan.day}
                    </div>

                    <div>
                      <h4 className="text-xs font-extrabold font-display leading-tight">{dayPlan.title}</h4>
                      <p className={`text-[11px] leading-relaxed mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {dayPlan.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Checklist' && (
            <div className="space-y-5">
              {/* Included Checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-display font-bold text-green-500 flex items-center gap-1.5">
                  <CheckCircle size={14} /> Backed / What is Included
                </h4>
                <div className="space-y-2 pl-1">
                  {trip.included.map((inc, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-green-500 shrink-0 select-none">✓</span>
                      <p className={darkMode ? 'text-zinc-300' : 'text-zinc-700'}>{inc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Not Included Checklist */}
              <div className={`space-y-2 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-zinc-200/60'}`}>
                <h4 className="text-xs font-display font-bold text-rose-500 flex items-center gap-1.5">
                  <XCircle size={14} /> Exclusions / Not Included
                </h4>
                <div className="space-y-2 pl-1">
                  {trip.notIncluded.map((notInc, i) => (
                    <div key={i} className="flex gap-2 text-xs opacity-75">
                      <span className="text-rose-500 shrink-0 select-none">✗</span>
                      <p className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>{notInc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold uppercase tracking-wider opacity-85 flex items-center gap-1">
                  <MessageSquare size={13} className="text-forest-400" /> Travelers Comments
                </span>
                <span className="text-[10px] font-mono text-zinc-405 block font-bold underline">
                  ★ {trip.rating} average
                </span>
              </div>

              <div className="space-y-4">
                {trip.reviews.map((rev) => (
                  <div 
                    key={rev.id}
                    className={`p-3 rounded-2xl ${
                      darkMode ? 'bg-zinc-900/30' : 'bg-white shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <img src={rev.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <h5 className="text-[11px] font-bold">{rev.userName}</h5>
                          <span className="text-[8px] opacity-40 font-mono block">Reviewed {rev.date}</span>
                        </div>
                      </div>

                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, starI) => (
                          <Star 
                            key={starI} 
                            size={9} 
                            className={starI < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'} 
                          />
                        ))}
                      </div>
                    </div>

                    <p className={`text-[11px] leading-relaxed mt-2.5 ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 6. EXPANDABLE FAQs COLLAPSIBLE */}
        <div className={`px-4 mt-8 pt-6 border-t space-y-3 ${darkMode ? 'border-white/10' : 'border-zinc-200/60'}`}>
          <span className="text-xs font-display font-bold uppercase tracking-wider opacity-85 block">
            Frequently Asked Questions
          </span>

          <div className="space-y-2">
            {trip.faqs.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className={`rounded-xl transition ${
                    darkMode ? 'bg-zinc-900/20' : 'bg-white shadow-xs'
                  }`}
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-3 flex justify-between items-center text-xs font-bold text-left cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={14} className={`transform transition ${isExpanded ? 'rotate-180 text-forest-500' : 'opacity-50'}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className={`px-3 pb-3 text-[11px] leading-normal opacity-85 -mt-1 ${
                          darkMode ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 7. STICKY BOOK NOW BOTTOM BAR */}
      <div className={`absolute bottom-0 inset-x-0 p-4 border-t flex justify-between items-center z-30 backdrop-blur-md ${
        darkMode 
          ? 'bg-zinc-950/95 border-white/5' 
          : 'bg-white/95 border-zinc-200/60'
      }`}>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold block">
            TOTAL BASE COST
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-black font-sans ${darkMode ? 'text-forest-400' : 'text-forest-650'}`}>₹{trip.price}</span>
            <span className="text-[10px] opacity-55">/ traveler</span>
          </div>
          <span className="text-[8px] opacity-45 block">
            Taxes & Permit guides included
          </span>
        </div>

        <button
          id="btn-details-book-now"
          onClick={() => onTriggerBooking(trip)}
          className="bg-forest-600 hover:bg-forest-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg border border-forest-500 flex items-center justify-center gap-1.5 animate-pulse-subtle active:scale-95 cursor-pointer"
        >
          Book Expedition Now
        </button>
      </div>

    </div>
  );
}
