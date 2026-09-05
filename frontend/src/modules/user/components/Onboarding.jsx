import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, Compass, Shield, Users, ArrowLeft, Mountain,
  TrendingUp, Sparkles, MapPin, ClipboardList, Flame, Award
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

export default function Onboarding({ onComplete, darkMode }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [customerConfig, setCustomerConfig] = useState(() => {
    const local = loadOnboardingContentLocal();
    return local?.customer || DEFAULT_ONBOARDING_CONTENT.customer;
  });

  useEffect(() => {
    let active = true;
    onboardingApi.getContent()
      .then((content) => {
        if (active && content?.customer) {
          setCustomerConfig(content.customer);
          if (content.customer.visible === false) {
            onComplete();
          }
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [onComplete]);

  const slides = (customerConfig.slides && customerConfig.slides.length > 0)
    ? customerConfig.slides
    : DEFAULT_ONBOARDING_CONTENT.customer.slides;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const safeIdx = Math.min(currentSlide, slides.length - 1);
  const current = slides[safeIdx] || slides[0];

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-0 sm:p-4 md:p-6 font-sans relative overflow-hidden transition-colors ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-[#FAF8F2] text-zinc-900'
    }`}>
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] bg-forest-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[450px] h-[450px] bg-spy-orange/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Responsive Card Container */}
      <div className={`w-full max-w-4xl rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border-0 sm:border md:grid md:grid-cols-12 min-h-screen sm:min-h-[520px] md:min-h-[550px] flex flex-col z-10 transition-colors ${
        darkMode ? 'bg-zinc-900/90 border-white/10 text-white' : 'bg-white border-zinc-200/90 text-zinc-900'
      }`}>

        {/* Left Column: Visual Showcase (Top on mobile, Left 6 cols on desktop) */}
        <div className="md:col-span-6 relative overflow-hidden bg-zinc-950 flex flex-col justify-between p-5 sm:p-6 shrink-0 min-h-[260px] sm:min-h-[300px] md:min-h-full">
          
          {/* Background Image with crossfade */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={safeIdx}
                src={current.image}
                alt={current.title}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="w-full h-full object-cover brightness-[0.7] dark:brightness-[0.55]"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50" />
          </div>

          {/* Top Bar on image */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="bg-forest-600 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase shadow-md flex items-center gap-1.5">
              <Mountain size={11} /> {current.badge || 'Hiker Guide'}
            </span>
            <span className="bg-black/55 backdrop-blur-md text-white/90 text-xs font-mono font-bold px-3 py-1 rounded-full border border-white/10">
              {safeIdx + 1} / {slides.length}
            </span>
          </div>

          {/* Subtle bottom brand tag on image */}
          <div className="relative z-10 mt-auto pt-4">
            <div className="p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 max-w-sm">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-forest-400 shrink-0" />
                <span className="text-[11px] font-bold text-white/90">Find Your Trek • Verified Expeditions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Content & Interaction (Bottom on mobile, Right 6 cols on desktop) */}
        <div className={`md:col-span-6 p-6 sm:p-8 flex flex-col justify-between flex-1 z-10 ${
          darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'
        }`}>

          {/* Top Row: Navigation / Skip */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${darkMode ? 'bg-white/5' : 'bg-zinc-100'}`}>
                <Mountain size={16} className="text-forest-500" />
              </div>
              <div>
                <p className="text-xs font-display font-black leading-none">Find Your Trek</p>
                <p className={`text-[9px] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Hiker Walkthrough</p>
              </div>
            </div>

            <button
              type="button"
              id="onboarding-skip-btn"
              onClick={onComplete}
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition active:scale-95 cursor-pointer ${
                darkMode
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              {customerConfig.skipLabel || 'Skip Onboarding'}
            </button>
          </div>

          {/* Middle: Dynamic Slide Content */}
          <div className="my-auto py-2 space-y-4">
            {/* Icon Pill */}
            <motion.div
              key={`icon-${safeIdx}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-md bg-forest-500/15 border-forest-500/30 text-forest-500`}
            >
              {resolveSlideIcon(current.icon)}
            </motion.div>

            {/* Title & Description */}
            <div className="space-y-2">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={`h-${safeIdx}`}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-xl sm:text-2xl font-display font-black tracking-tight leading-tight"
                >
                  {current.title}
                </motion.h2>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.p
                  key={`p-${safeIdx}`}
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
          </div>

          {/* Bottom Controls Row: Dots + Action Buttons */}
          <div className="pt-6 border-t flex items-center justify-between gap-4 mt-4 shrink-0 transition-colors border-zinc-200/60 dark:border-white/5">
            
            {/* Progress Dots */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === safeIdx
                      ? 'w-7 bg-forest-500'
                      : `w-2 ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-200 hover:bg-zinc-300'}`
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Back & Next Actions */}
            <div className="flex items-center gap-2.5">
              {safeIdx > 0 && (
                <button
                  type="button"
                  id="onboarding-back-btn"
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
                id="onboarding-next-btn"
                onClick={handleNext}
                className="flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-lg shadow-forest-600/20 border border-forest-500 active:scale-95 transition cursor-pointer"
              >
                <span>{safeIdx === slides.length - 1 ? 'Get Started' : 'Next'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
