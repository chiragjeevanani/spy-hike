import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Star, ShieldCheck, MapPin, Award, Compass, Heart, Users, ChevronRight, BookOpen, Image as ImageIcon } from 'lucide-react';

export default function OrganizerProfileView({
  organizer,
  trips,
  onBack,
  onSelectTrip,
  darkMode
}) {
  const [activeSubTab, setActiveSubTab] = useState('About');

  // Filter trips managed by this organizer
  const organizerTrips = trips.filter(t => t.organizer.name === organizer.name);

  // Generate dynamic about description if not exists
  const simulatedAbout = `Established in 2018, ${organizer.name} has grown to become one of the premier outdoor expedition operators. We specialize in custom alpine routing, high-altitude trekking courses, and wilderness exploration across diverse terrains. With a 100% safety record and a team of certified Wilderness First Responders (WFR), we focus on delivering immersive, eco-friendly, and educational mountain journeys. Our local guides carry deep geological and cultural knowledge of the valleys, ensuring your expedition is safe, authentic, and unforgettable.`;

  // Collect gallery images from the organizer's trips
  const galleryImages = organizerTrips.reduce((acc, trip) => {
    return [...acc, ...trip.galleryImages];
  }, []).slice(0, 8); // Keep up to 8 images

  // If no gallery images, use default placeholders
  const finalGallery = galleryImages.length > 0 ? galleryImages : [
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=400&q=80'
  ];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans h-full ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-transparent text-zinc-900'
    }`}>
      
      {/* 1. Header Bar */}
      <div className={`px-4 py-3 shrink-0 flex items-center gap-3 border-b ${
        darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200/60 shadow-xs'
      }`}>
        <button
          onClick={onBack}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 ${
            darkMode ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-gray-100 text-zinc-750 hover:bg-gray-200'
          }`}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-sm font-display font-black tracking-tight">Organizer Profile</h2>
          <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">SPY HIKE VERIFIED PARTNER</p>
        </div>
      </div>

      {/* 2. Scrollable Profile Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        
        {/* Hero Section */}
        <div className={`p-5 flex flex-col items-center text-center relative overflow-hidden ${
          darkMode ? 'bg-zinc-900/30' : 'bg-white'
        }`}>
          {/* Subtle decorative background shapes */}
          <div className="absolute -left-12 -top-12 w-28 h-28 bg-forest-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 w-28 h-28 bg-spy-orange/5 rounded-full blur-xl pointer-events-none" />

          {/* Profile Image & Verification Badge */}
          <div className="relative">
            <div className={`w-20 h-20 rounded-full overflow-hidden border-2 shadow-md ${
              darkMode ? 'border-elegant-green' : 'border-forest-500'
            }`}>
              <img src={organizer.avatar} alt={organizer.name} className="w-full h-full object-cover" />
            </div>
            {organizer.verified && (
              <span className="absolute -bottom-1 right-1 bg-emerald-500 border-2 border-white dark:border-zinc-950 text-white rounded-full p-1 shadow-md">
                <ShieldCheck size={14} className="fill-emerald-500/25" />
              </span>
            )}
          </div>

          {/* Profile Basic Info */}
          <h1 className="text-lg font-display font-black mt-3 flex items-center gap-1">
            {organizer.name}
          </h1>

          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center gap-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
              <Star size={10} className="fill-amber-500" />
              {organizer.rating}
            </div>
            <span className="text-[10px] text-zinc-400 font-medium">
              • {organizerTrips.length} Active Hikes
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              • Guided 5,000+ Hikers
            </span>
          </div>

          <p className="text-[10.5px] text-zinc-500 max-w-xs mt-3.5 leading-relaxed">
            Leading high-safety, verified treks across premium alpine trails and scenic valleys.
          </p>

          {/* Fast Stats */}
          <div className="grid grid-cols-3 gap-3 w-full mt-5">
            <div className={`p-3 rounded-xl flex flex-col items-center justify-center ${
              darkMode ? 'bg-zinc-950/40' : 'bg-gray-50'
            }`}>
              <Award className="w-5 h-5 text-spy-orange mb-1" />
              <span className="text-xs font-black font-display">100%</span>
              <span className="text-[8px] opacity-50 uppercase tracking-wider mt-0.5">Safety Log</span>
            </div>
            <div className={`p-3 rounded-xl flex flex-col items-center justify-center ${
              darkMode ? 'bg-zinc-950/40' : 'bg-gray-50'
            }`}>
              <Users className="w-5 h-5 text-forest-500 mb-1" />
              <span className="text-xs font-black font-display">WFR Team</span>
              <span className="text-[8px] opacity-50 uppercase tracking-wider mt-0.5">Certified Guides</span>
            </div>
            <div className={`p-3 rounded-xl flex flex-col items-center justify-center ${
              darkMode ? 'bg-zinc-950/40' : 'bg-gray-50'
            }`}>
              <Compass className="w-5 h-5 text-[#F27D26] mb-1" />
              <span className="text-xs font-black font-display">8+ Years</span>
              <span className="text-[8px] opacity-50 uppercase tracking-wider mt-0.5">Experience</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-4 px-4">
          <div className={`flex rounded-xl p-1 border justify-around relative overflow-hidden ${
            darkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-100/80 border-zinc-200/60'
          }`}>
            {['About', 'Gallery', 'Trips'].map(tab => {
              const isActive = activeSubTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative z-10 ${
                    isActive ? 'text-white font-extrabold' : 'text-zinc-400 hover:text-zinc-500'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="organizerSubTabCapsule"
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

        {/* Dynamic Tab Body */}
        <div className="px-4 mt-5 min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSubTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSubTab === 'About' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-display font-bold uppercase tracking-wider opacity-85 flex items-center gap-1.5">
                      <BookOpen size={13} className="text-forest-400" /> Agency Bio
                    </h3>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {simulatedAbout}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <h3 className="text-xs font-display font-bold uppercase tracking-wider opacity-85">Core Capabilities</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(organizer?.coreCapabilities || [
                        'Snow Expedition Specialists',
                        'Eco-Friendly Leave-No-Trace',
                        'Emergency Medical Rescue',
                        'Naturalist Guided Hiking'
                      ]).map((cap, i) => (
                        <div key={i} className={`p-2 rounded-lg flex items-center gap-1.5 ${darkMode ? 'bg-zinc-900/30' : 'bg-white shadow-xs'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === 'Gallery' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-display font-bold uppercase tracking-wider opacity-85 flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-forest-400" /> Expedition Snapshots
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {finalGallery.map((img, i) => (
                      <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden shadow-xs relative group bg-zinc-900">
                        <img 
                          src={img} 
                          alt="Trek path" 
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSubTab === 'Trips' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase opacity-60 block tracking-wider">Active Expeditions</span>
                    <div className="space-y-2">
                      {organizerTrips.map(trip => (
                        <div
                          key={trip.id}
                          onClick={() => onSelectTrip(trip)}
                          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition hover:-translate-y-0.5 ${
                            darkMode ? 'bg-zinc-900/30 hover:bg-zinc-900/50' : 'bg-white hover:bg-white shadow-xs hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img src={trip.coverImage} alt={trip.name} className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                              <h4 className="text-[11.5px] font-bold font-display line-clamp-1">{trip.name}</h4>
                              <p className="text-[9px] text-zinc-450 flex items-center gap-0.5 mt-0.5">
                                <MapPin size={9} className="text-forest-400" />
                                {trip.location}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <div className="text-right">
                              <span className="text-[11.5px] font-extrabold text-[#F27D26] block">₹{trip.price}</span>
                              <span className="text-[8px] opacity-50 block">{trip.durationDays} Days</span>
                            </div>
                            <ChevronRight size={14} className="opacity-40" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
