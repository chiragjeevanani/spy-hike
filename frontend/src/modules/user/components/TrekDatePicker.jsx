/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toDateStr = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Bottom-sheet month calendar for filtering treks by departure date.
// Only days present in `availableDates` (any organizer has a batch leaving
// that day) are tappable; the rest render muted.
export default function TrekDatePicker({ open, current, availableDates, onSelect, onClose, darkMode }) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Only today-or-later departures are pickable — past batches are gone.
  const futureDates = useMemo(
    () => new Set([...availableDates].filter(d => d >= todayStr)),
    [availableDates, todayStr]
  );

  // Start the view on the month of the earliest upcoming departure (or today).
  const initialMonth = useMemo(() => {
    const upcoming = [...futureDates].sort()[0];
    const base = upcoming ? new Date(`${upcoming}T00:00:00`) : today;
    return { y: base.getFullYear(), m: base.getMonth() };
  }, [futureDates]);

  const [view, setView] = useState(initialMonth);

  // Never navigate into months before the current one.
  const atCurrentMonth = view.y * 12 + view.m <= today.getFullYear() * 12 + today.getMonth();

  const shiftMonth = (delta) => {
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      if (next.getFullYear() * 12 + next.getMonth() < today.getFullYear() * 12 + today.getMonth()) {
        return { y, m };
      }
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  };

  // Leading blanks + day numbers for the viewed month (Sunday-first grid).
  const cells = useMemo(() => {
    const firstWeekday = new Date(view.y, view.m, 1).getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];
  }, [view]);

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-60 flex items-end justify-center">
          {/* backdrop (constrained to the phone frame) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`relative w-full rounded-t-3xl p-5 pb-7 shadow-2xl ${
              darkMode ? 'bg-elegant-card text-elegant-text' : 'bg-white text-zinc-900'
            }`}
          >
            <div className={`w-10 h-1 rounded-full mx-auto mb-4 ${darkMode ? 'bg-white/15' : 'bg-zinc-200'}`} />

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-semibold flex items-center gap-2">
                <CalendarDays size={19} className="text-forest-500" /> Departure date
              </h2>
              <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-white/5 text-zinc-300' : 'bg-gray-100 text-zinc-500'}`}>
                <X size={16} />
              </button>
            </div>

            {/* Month switcher */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => shiftMonth(-1)}
                disabled={atCurrentMonth}
                className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition disabled:opacity-30 disabled:active:scale-100 ${
                  darkMode ? 'border-white/10 text-zinc-300' : 'border-zinc-200 text-zinc-600'
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold">{MONTH_NAMES[view.m]} {view.y}</span>
              <button
                onClick={() => shiftMonth(1)}
                className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition ${
                  darkMode ? 'border-white/10 text-zinc-300' : 'border-zinc-200 text-zinc-600'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="text-center text-[10px] font-bold uppercase opacity-45 py-1">{d}</span>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => {
                if (day === null) return <span key={`blank-${i}`} />;
                const dateStr = toDateStr(view.y, view.m, day);
                const hasDeparture = futureDates.has(dateStr);
                const isPast = dateStr < todayStr;
                const isSelected = current === dateStr;
                return (
                  <button
                    key={dateStr}
                    disabled={!hasDeparture}
                    onClick={() => onSelect(dateStr)}
                    className={`h-10 mx-auto w-10 rounded-full text-sm flex flex-col items-center justify-center transition ${
                      isSelected
                        ? 'bg-forest-600 text-white font-bold shadow-md'
                        : hasDeparture
                        ? `font-bold cursor-pointer ${darkMode ? 'text-forest-400 hover:bg-white/5' : 'text-forest-600 hover:bg-forest-500/10'}`
                        : isPast
                        ? 'opacity-15 cursor-default line-through'
                        : 'opacity-30 cursor-default'
                    }`}
                  >
                    {day}
                    {hasDeparture && !isSelected && <span className="w-1 h-1 rounded-full bg-spy-orange mt-0.5" />}
                  </button>
                );
              })}
            </div>

            <p className={`text-[11px] mt-3 leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Highlighted days have trek batches departing. Pick one to see every trek leaving that day.
            </p>

            {current && (
              <button
                onClick={() => onSelect('')}
                className="w-full mt-3 py-3 rounded-2xl text-sm font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition"
              >
                Clear date filter
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
