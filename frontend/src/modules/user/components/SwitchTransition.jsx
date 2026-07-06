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
export default function SwitchTransition({ darkMode, label = 'Switching to Organizer Panel', showScene = false, flipDurationSec = 2.6 }) {
  // End the flip on the world we're heading into.
  const toTraveller = /Traveller/i.test(label);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`absolute inset-0 z-60 flex flex-col items-center justify-center gap-7 px-6 backdrop-blur-md ${
        darkMode ? 'bg-black/50' : 'bg-white/60'
      }`}
    >
      {showScene && (
        <motion.div
          // Rises up from the bottom as it appears (Airbnb sheet-style entrance).
          initial={{ opacity: 0, y: 90, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="w-full max-w-[240px] aspect-square"
        >
          <ModuleSwitchAnimation toTraveller={toTraveller} flipDurationSec={flipDurationSec} />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.1 }}
        className="flex items-center gap-2.5 bg-zinc-900 text-white pl-4 pr-5 py-3.5 rounded-full shadow-2xl"
      >
        <Repeat size={18} className="shrink-0" />
        <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
      </motion.div>
    </motion.div>
  );
}
