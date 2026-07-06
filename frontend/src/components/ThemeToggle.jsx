/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';

// Shared Light/Dark segmented control used across the user, organizer and
// admin apps so the theme switch looks and behaves identically everywhere.
// `onToggle` is a flip function — clicking the already-active side is a no-op.
export default function ThemeToggle({ darkMode, onToggle, size = 'md', className = '' }) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';
  const icon = size === 'sm' ? 13 : 14;

  const seg = (active) =>
    `flex items-center gap-1.5 ${pad} rounded-full font-semibold cursor-pointer transition-all ${
      active
        ? 'bg-forest-500 text-white shadow-sm'
        : darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
    }`;

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`inline-flex p-1 rounded-full border ${
        darkMode ? 'bg-black/30 border-white/10' : 'bg-gray-100 border-gray-200'
      } ${className}`}
    >
      <button type="button" aria-pressed={!darkMode} onClick={() => { if (darkMode) onToggle(); }} className={seg(!darkMode)}>
        <Sun size={icon} /> Light
      </button>
      <button type="button" aria-pressed={darkMode} onClick={() => { if (!darkMode) onToggle(); }} className={seg(darkMode)}>
        <Moon size={icon} /> Dark
      </button>
    </div>
  );
}
