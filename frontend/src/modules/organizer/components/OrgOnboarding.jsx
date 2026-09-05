import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, ArrowLeft, Compass, TrendingUp, Shield,
  ClipboardList, CheckCircle2, Mountain, Sparkles, MapPin,
  Flame, Award, Users
} from 'lucide-react';
import onboardingApi from '../../../lib/onboardingApi';
import { loadOnboardingContentLocal, DEFAULT_ONBOARDING_CONTENT } from '../../../utils/onboardingContent';

function resolveSlideIcon(iconName, className = 'w-7 h-7') {
  switch (iconName) {
    case 'Mountain': return <Mountain className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Shield': return <Shield className={className} />;
    case 'TrendingUp': return <TrendingUp className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'MapPin': return <MapPin className={className} />;
    case 'ClipboardList': return <ClipboardList className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'Award': return <Award className={className} />;
    case 'Compass':
    default:
      return <Compass className={className} />;
  }
}

export default function OrgOnboarding({ onComplete, darkMode }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [orgConfig, setOrgConfig] = useState(() => {
    const local = loadOnboardingContentLocal();
    return local?.organizer || DEFAULT_ONBOARDING_CONTENT.organizer;
  });

  useEffect(() => {
    let active = true;
    onboardingApi.getContent()
      .then((content) => {
        if (active && content?.organizer) {
          setOrgConfig(content.organizer);
          if (content.organizer.visible === false) {
            onComplete();
          }
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [onComplete]);

  const slides = (orgConfig.slides && orgConfig.slides.length > 0)
    ? orgConfig.slides
    : DEFAULT_ONBOARDING_CONTENT.organizer.slides;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };

  const current = slides[Math.min(currentSlide, slides.length - 1)] || slides[0];

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8 font-sans relative overflow-hidden transition-colors ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-[#FAF8F2] text-zinc-900'
    }`}>
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-spy-orange/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#163321]/30 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Responsive Card Container */}
      <div className={`w-full max-w-5xl rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border-0 sm:border md:grid md:grid-cols-12 min-h-screen sm:min-h-[580px] md:min-h-[600px] flex flex-col z-10 transition-colors ${
        darkMode ? 'bg-zinc-900/90 border-white/10 text-white' : 'bg-white border-zinc-200/90 text-zinc-900'
      }`}>

        {/* Left Column: Visual Showcase (Top on mobile, Left 6 cols on desktop) */}
        <div className="md:col-span-6 lg:col-span-7 relative overflow-hidden bg-zinc-950 flex flex-col justify-between p-5 sm:p-7 md:p-8 shrink-0 min-h-[260px] sm:min-h-[300px] md:min-h-full">
          
          {/* Background Image with crossfade */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSlide}
                src={current.image}
                alt={current.title}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="w-full h-full object-cover brightness-[0.7] dark:brightness-[0.55]"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/50" />
          </div>

          {/* Top Bar on image */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="bg-spy-orange text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase shadow-md flex items-center gap-1.5">
              <Mountain size={11} /> {orgConfig.badgeText || 'Organizer Portal'}
            </span>
            <span className="bg-black/55 backdrop-blur-md text-white/90 text-xs font-mono font-bold px-3 py-1 rounded-full border border-white/10">
              {currentSlide + 1} / {slides.length}
            </span>
          </div>

          {/* Bottom Callout Pill on image */}
          {current.quote && (
            <div className="relative z-10 mt-auto pt-8">
              <motion.div
                key={`quote-${currentSlide}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="p-3.5 sm:p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 max-w-lg"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={13} className="text-spy-orange shrink-0" />
                  <span className="text-[10px] font-bold text-white/90 tracking-wide uppercase">Partner Spotlight</span>
                </div>
                <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                  "{current.quote}"
                </p>
              </motion.div>
            </div>
          )}
        </div>

        {/* Right Column: Interaction & Onboarding Details (Bottom on mobile, Right 6 cols on desktop) */}
        <div className={`md:col-span-6 lg:col-span-5 p-6 sm:p-8 md:p-10 flex flex-col justify-between flex-1 z-10 ${
          darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'
        }`}>

          {/* Top Row: Navigation / Skip */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${darkMode ? 'bg-white/5' : 'bg-zinc-100'}`}>
                <Mountain size={16} className="text-spy-orange" />
              </div>
              <div>
                <p className="text-xs font-display font-black leading-none">Find Your Trek</p>
                <p className={`text-[9px] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Operator Onboarding</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onComplete}
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition active:scale-95 cursor-pointer ${
                darkMode
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              {orgConfig.skipLabel || 'Skip'}
            </button>
          </div>

          {/* Middle: Dynamic Slide Content */}
          <div className="my-auto py-2 space-y-4">
            {/* Icon Pill */}
            <motion.div
              key={`icon-${currentSlide}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-md ${
                current.bgAccent || 'bg-spy-orange/15 border-spy-orange/30'
              } ${current.accent || 'text-spy-orange'}`}
            >
              {resolveSlideIcon(current.icon)}
            </motion.div>

            {/* Title & Description */}
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={`h-${currentSlide}`}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-xl sm:text-2xl lg:text-3xl font-display font-black tracking-tight leading-tight"
                >
                  {current.title}
                </motion.h2>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.p
                  key={`p-${currentSlide}`}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className={`text-xs sm:text-sm leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-650'}`}
                >
                  {current.description}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Feature Perks Checklist */}
            {(current.perks && current.perks.length > 0) && (
              <div className="pt-2 space-y-2">
                {current.perks.map((perk, i) => (
                  <motion.div
                    key={`${currentSlide}-perk-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="p-0.5 rounded-full bg-emerald-500/15 text-emerald-500 shrink-0">
                      <CheckCircle2 size={13} />
                    </div>
                    <span className={`text-xs font-semibold ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {perk}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Controls Row: Dots + Navigation Buttons */}
          <div className="pt-6 border-t flex items-center justify-between gap-4 mt-4 shrink-0 transition-colors border-zinc-200/60 dark:border-white/5">
            
            {/* Progress Pills */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentSlide
                      ? 'w-7 bg-spy-orange'
                      : `w-2 ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-200 hover:bg-zinc-300'}`
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Back & Next Actions */}
            <div className="flex items-center gap-2.5">
              {currentSlide > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`px-4 py-3 rounded-2xl text-xs font-bold border transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    darkMode
                      ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                      : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 bg-spy-orange hover:bg-[#d96d1a] text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-lg shadow-spy-orange/20 border border-spy-orange/40 active:scale-95 transition cursor-pointer"
              >
                <span>{currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
