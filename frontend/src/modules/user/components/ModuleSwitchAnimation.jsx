/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

// Fully original, dependency-free animated illustration built from SVG +
// Framer Motion. Two low-poly isometric dioramas sit on a rounded 3D platform
// (à la a Spline "camping box"), and the whole tile spins 180° to switch
// between them:
//   • Climbing diorama — a faceted peak with a hiker  (the Traveller world)
//   • Camp diorama     — tent, campfire, trees, crew  (the Organizer world)
// Multiple flat-shaded faces per object are what give the low-poly 3D read.

// Rounded 3D platform base: a top face (the ground) plus two darker side faces.
function Platform({ top, left, right, edge }) {
  return (
    <g>
      {/* soft contact shadow on the backdrop */}
      <ellipse cx="100" cy="190" rx="74" ry="12" fill="#0b1220" opacity="0.16" />
      {/* right side face (most in shadow) */}
      <path d="M100 172 L176 138 L176 162 L100 196 Z" fill={right} />
      {/* left side face */}
      <path d="M100 172 L24 138 L24 162 L100 196 Z" fill={left} />
      {/* top face (ground) */}
      <path d="M100 104 L176 138 L100 172 L24 138 Z" fill={top} />
      {/* crisp top edge highlight */}
      <path d="M100 104 L176 138 L100 172 L24 138 Z" fill="none" stroke={edge} strokeWidth="1.4" opacity="0.5" />
    </g>
  );
}

// ─── Scene 1: mountain climbing ──────────────────────────────────────────────
function ClimbingScene() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="climb-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbe8fa" />
          <stop offset="100%" stopColor="#eef7fe" />
        </linearGradient>
        <radialGradient id="climb-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe6ab" />
          <stop offset="55%" stopColor="#ffd27a" />
          <stop offset="100%" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="200" height="200" fill="url(#climb-bg)" />

      {/* Sun + clouds */}
      <circle cx="156" cy="44" r="26" fill="url(#climb-sun)" />
      <circle cx="156" cy="44" r="13" fill="#ffdd92" />
      <motion.g animate={{ x: [0, 12, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} opacity="0.95">
        <ellipse cx="44" cy="42" rx="16" ry="7" fill="#ffffff" />
        <ellipse cx="56" cy="40" rx="10" ry="6" fill="#ffffff" />
      </motion.g>

      <Platform top="#e8f1f8" left="#aebfce" right="#8ea1b2" edge="#ffffff" />

      {/* Back ridge (atmospheric depth) */}
      <path d="M64 138 L92 78 L118 138 Z" fill="#9fb4c6" opacity="0.6" />

      {/* Low-poly mountain — two lit/shaded faces */}
      <path d="M100 46 L60 140 L100 158 Z" fill="#6f8598" />
      <path d="M100 46 L140 140 L100 158 Z" fill="#48596b" />
      {/* faceted snow cap */}
      <path d="M100 46 L84 82 L100 90 Z" fill="#f4f9fc" />
      <path d="M100 46 L116 82 L100 90 Z" fill="#d9e6f0" />

      {/* Summit flag */}
      <line x1="100" y1="46" x2="100" y2="32" stroke="#2f3b48" strokeWidth="2" />
      <motion.path
        d="M100 32 L115 36 L100 41 Z" fill="#F27D26"
        animate={{ scaleX: [1, 0.82, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '100px 36px' }}
      />

      {/* Hiker climbing the lit face */}
      <motion.g
        animate={{ x: [0, 5, 0], y: [0, -4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ellipse cx="83" cy="140" rx="9" ry="3" fill="#0b1220" opacity="0.18" />
        <g transform="translate(82 122) rotate(-30)">
          <rect x="-7" y="-4" width="8" height="12" rx="2.5" fill="#d9661a" />
          <rect x="-7" y="-4" width="4" height="12" rx="2.5" fill="#F27D26" />
          <rect x="-3" y="-4" width="7" height="13" rx="3" fill="#245021" />
          <rect x="-3" y="-4" width="3.5" height="13" rx="3" fill="#2f6b2a" />
          <circle cx="1" cy="-8" r="4" fill="#e6b98f" />
          <motion.rect x="-1" y="8" width="3.4" height="10" rx="1.7" fill="#2f3945"
            animate={{ rotate: [10, -14, 10] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '0px 9px' }} />
          <motion.rect x="1" y="8" width="3.4" height="10" rx="1.7" fill="#4b5766"
            animate={{ rotate: [-12, 12, -12] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '2.5px 9px' }} />
          <motion.rect x="0" y="-3" width="3" height="10" rx="1.5" fill="#2f6b2a"
            animate={{ rotate: [-35, -66, -35] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '1.5px -2px' }} />
        </g>
      </motion.g>
    </svg>
  );
}

// A small low-poly pine (two shaded faces + trunk).
function Pine({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="9" ry="2.6" fill="#0b1220" opacity="0.16" />
      <rect x="-1.6" y="-4" width="3.2" height="8" fill="#6b4a2b" />
      <path d="M0 -30 L-9 -6 L0 -6 Z" fill="#3f8f56" />
      <path d="M0 -30 L9 -6 L0 -6 Z" fill="#2d6b41" />
      <path d="M0 -20 L-11 2 L0 2 Z" fill="#469a5f" />
      <path d="M0 -20 L11 2 L0 2 Z" fill="#347a49" />
    </g>
  );
}

// ─── Scene 2: camp setup ─────────────────────────────────────────────────────
function CampScene() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="camp-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe0b8" />
          <stop offset="55%" stopColor="#ffeede" />
          <stop offset="100%" stopColor="#f5f9f0" />
        </linearGradient>
        <radialGradient id="fire-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#ffb347" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="200" height="200" fill="url(#camp-bg)" />

      {/* Setting sun */}
      <circle cx="100" cy="70" r="24" fill="#ffcf87" opacity="0.55" />
      <circle cx="100" cy="70" r="13" fill="#ffdca0" opacity="0.8" />

      <Platform top="#8cc55f" left="#5f9440" right="#4b7a33" edge="#b6e089" />

      {/* Pine trees (back-left) */}
      <Pine x="46" y="130" s="0.95" />
      <Pine x="30" y="146" s="0.7" />

      {/* Low-poly tent — front gable + receding side face */}
      <g>
        <ellipse cx="140" cy="150" rx="30" ry="4.5" fill="#0b1220" opacity="0.16" />
        {/* right receding roof face (shadow) */}
        <path d="M138 108 L150 102 L172 138 L158 146 Z" fill="#c85f16" />
        {/* front gable face (lit) */}
        <path d="M118 146 L138 108 L158 146 Z" fill="#F27D26" />
        {/* entrance */}
        <path d="M132 146 L138 120 L145 146 Z" fill="#3a2210" />
        {/* ridge pole */}
        <line x1="138" y1="106" x2="150" y2="100" stroke="#7a4212" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Campfire */}
      <g>
        <ellipse cx="82" cy="150" rx="14" ry="3.6" fill="#0b1220" opacity="0.16" />
        <circle cx="82" cy="145" r="16" fill="url(#fire-glow)" />
        <rect x="73" y="148" width="18" height="3.4" rx="1.7" fill="#7a5230" transform="rotate(12 82 149)" />
        <rect x="73" y="148" width="18" height="3.4" rx="1.7" fill="#8a5f39" transform="rotate(-12 82 149)" />
        <motion.path d="M82 149 C76 142 86 138 82 130 C89 136 89 145 82 149 Z" fill="#F27D26"
          animate={{ scaleY: [1, 1.25, 0.92, 1.15, 1], opacity: [0.9, 1, 0.85, 1, 0.9] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '82px 149px' }} />
        <motion.path d="M82 148 C79 144 85 141 82 136 C86 140 86 145 82 148 Z" fill="#ffd15a"
          animate={{ scaleY: [1, 1.3, 1] }} transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '82px 148px' }} />
        <motion.circle cx="82" cy="131" r="1.3" fill="#ffb648"
          animate={{ y: [0, -15], opacity: [1, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />
        <motion.circle cx="86" cy="133" r="1" fill="#ffcf7a"
          animate={{ y: [0, -13], opacity: [1, 0] }} transition={{ duration: 1.7, repeat: Infinity, ease: 'easeOut', delay: 0.5 }} />
      </g>

      {/* Worker — hammering a tent peg */}
      <g transform="translate(108 132)">
        <ellipse cx="0" cy="16" rx="8" ry="2.4" fill="#0b1220" opacity="0.16" />
        <circle cx="0" cy="-9" r="4" fill="#e6b98f" />
        <rect x="-3.5" y="-5" width="7" height="12" rx="3" fill="#245021" />
        <rect x="-3.5" y="-5" width="3.5" height="12" rx="3" fill="#2f6b2a" />
        <rect x="-3" y="7" width="3" height="8" rx="1.5" fill="#2f3945" />
        <rect x="0.5" y="7" width="3" height="8" rx="1.5" fill="#37424f" />
        <motion.g animate={{ rotate: [-18, -72, -18] }} transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '2px -3px' }}>
          <rect x="1" y="-4" width="3" height="11" rx="1.5" fill="#2f6b2a" />
          <rect x="0" y="6" width="7" height="3" rx="1.2" fill="#5b6b7a" />
        </motion.g>
      </g>
    </svg>
  );
}

// ─── Flip container ──────────────────────────────────────────────────────────
export default function ModuleSwitchAnimation({ toTraveller = false, flipDurationSec = 2.6 }) {
  const Front = toTraveller ? CampScene : ClimbingScene;
  const Back = toTraveller ? ClimbingScene : CampScene;

  // NB: keep `filter`/`opacity` off the preserve-3d element — those force it to
  // flatten and break the flip. The card shadow lives on the faces instead.
  const faceClass = 'absolute inset-0 rounded-[26px] overflow-hidden shadow-[0_18px_30px_rgba(11,18,32,0.34)]';
  const faceStyle = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' };
  const gloss = {
    background: 'radial-gradient(120% 85% at 26% 12%, rgba(255,255,255,0.4), rgba(255,255,255,0) 46%)',
    boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -20px 30px rgba(11,18,32,0.18), inset 0 0 0 1px rgba(255,255,255,0.14)',
  };

  return (
    <div className="w-full h-full" style={{ perspective: 820, perspectiveOrigin: '50% 42%' }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateY: 0, scale: 1 }}
        animate={{ rotateY: [0, 0, 180, 180], scale: [1, 0.9, 0.9, 1] }}
        transition={{ duration: flipDurationSec, times: [0, 0.3, 0.72, 1], ease: [0.62, 0, 0.35, 1] }}
      >
        <div className={faceClass} style={faceStyle}>
          <Front />
          <div className="absolute inset-0 pointer-events-none rounded-[26px]" style={gloss} />
        </div>
        <div className={faceClass} style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
          <Back />
          <div className="absolute inset-0 pointer-events-none rounded-[26px]" style={gloss} />
        </div>
      </motion.div>
    </div>
  );
}
