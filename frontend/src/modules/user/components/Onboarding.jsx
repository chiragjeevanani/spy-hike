/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Compass, Shield, Users, ArrowLeft } from 'lucide-react';

export default function Onboarding({ onComplete, darkMode }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Discover Amazing Hiking Adventures',
      description: 'Explore hand-picked treks across the majestic Himalayas, deep monsoon valleys, and pristine hidden ranges tailored to your fitness level.',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
      icon: <Compass className="w-8 h-8 text-spy-orange" />,
    },
    {
      title: 'Connect with Trusted Organizers',
      description: 'Interact with certified Sherpa guides, local environmental experts, and veteran peak summit clubs to guarantee safety on every peak.',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      icon: <Users className="w-8 h-8 text-forest-500" />,
    },
    {
      title: 'Book and Explore Nature Safely',
      description: 'Enjoy guaranteed instant bookings, responsive safety guides, real-time weather logs, and simple secure refund policies.',
      image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
      icon: <Shield className="w-8 h-8 text-spy-orange" />,
    }
  ];

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

  const current = slides[currentSlide];

  return (
    <div className={`h-full flex flex-col justify-between overflow-hidden relative font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-800'}`}>
      
      {/* Visual background pattern */}
      <div className="absolute top-0 inset-x-0 h-1/2 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentSlide}
            src={current.image}
            alt={current.title}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full object-cover brightness-[0.7] dark:brightness-[0.5]"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/0 via-black/20 to-black/40"></div>
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-zinc-950 dark:from-zinc-950 via-zinc-950/50 to-transparent"></div>
      </div>

      {/* Skip Button */}
      <div className="relative pt-6 px-6 flex justify-between items-center z-20">
        {currentSlide > 0 ? (
          <button 
            type="button"
            id="onboarding-back-btn"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <div></div> // Empty column for alignment
        )}
        <button
          type="button"
          id="onboarding-skip-btn"
          onClick={onComplete}
          className="text-xs px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 font-medium hover:bg-white/20"
        >
          Skip Onboarding
        </button>
      </div>

      {/* Main card box containing onboarding details */}
      <div className={`relative px-6 pb-8 pt-24 mt-20 md:mt-24 rounded-t-[32px] shadow-2xl flex-1 flex flex-col justify-end z-10 ${
        darkMode ? 'bg-gradient-to-b from-zinc-950 to-zinc-900 border-t border-zinc-850' : 'bg-gradient-to-b from-slate-50 to-white'
      }`}>
        
        {/* Animated Icon badge */}
        <div className="flex justify-start mb-6">
          <motion.div
            key={currentSlide}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className={`p-3.5 rounded-2xl flex justify-center items-center shadow-lg ${
              darkMode ? 'bg-zinc-900' : 'bg-white'
            }`}
          >
            {current.icon}
          </motion.div>
        </div>

        {/* Text information */}
        <div className="space-y-3 mb-10">
          <AnimatePresence mode="wait">
            <motion.h2
              key={`h-${currentSlide}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-display font-black tracking-tight leading-tight"
            >
              {current.title}
            </motion.h2>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p
              key={`p-${currentSlide}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className={`text-sm leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-650'}`}
            >
              {current.description}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Controls slide switcher bottom row */}
        <div className="flex justify-between items-center mt-auto">
          {/* Progress dots */}
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide 
                    ? 'w-6 bg-forest-500' 
                    : `w-2 ${darkMode ? 'bg-zinc-800' : 'bg-gray-300'}`
                }`}
              />
            ))}
          </div>

          {/* Action button */}
          <button
            type="button"
            id="onboarding-next-btn"
            onClick={handleNext}
            className="flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg border border-forest-500 active:scale-95"
          >
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
