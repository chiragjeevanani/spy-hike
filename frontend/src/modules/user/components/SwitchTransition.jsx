/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Repeat } from 'lucide-react';
import ModuleSwitchAnimation from './ModuleSwitchAnimation';

// Airbnb-style module-switch pattern: the current screen blurs/dims behind a
// floating badge, with an animated card that flips 180° between the Traveller
// (climbing) and Organizer (camp) worlds above the pill.
export default function SwitchTransition({ darkMode, label = 'Switching to Organizer Panel', showScene = false, flipDurationSec = 1.2 }) {
  // End the flip on the world we're heading into.
  const toTraveller = /Traveller/i.test(label);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`fixed inset-0 z-[999999] w-full h-full flex flex-col items-center justify-center gap-7 px-6 backdrop-blur-2xl ${
        darkMode ? 'bg-zinc-950 text-white' : 'bg-slate-950 text-white'
      }`}
    >
      {showScene && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[220px] aspect-square transform-gpu"
        >
          <ModuleSwitchAnimation toTraveller={toTraveller} flipDurationSec={flipDurationSec} />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="flex items-center gap-3 bg-zinc-900/90 text-white border border-white/15 pl-4 pr-5 py-3.5 rounded-full shadow-2xl backdrop-blur-md"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-sm font-bold tracking-wide whitespace-nowrap">{label}</span>
      </motion.div>
    </motion.div>
  );
}
