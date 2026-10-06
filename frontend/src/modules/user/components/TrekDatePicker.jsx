/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    () => new Set([...(availableDates || [])].filter(d => d >= todayStr)),
    [availableDates, todayStr]
  );

  // Start the view on the month of the earliest upcoming departure (or today).
  const initialMonth = useMemo(() => {
    const upcoming = [...futureDates].sort()[0];
    const base = upcoming ? new Date(`${upcoming}T00:00:00`) : today;
    return { y: base.getFullYear(), m: base.getMonth() };
  }, [futureDates]);

  const [view, setView] = useState(initialMonth);

  // Sync view when opened so it always starts on the month with upcoming departures
  useEffect(() => {
    if (open) {
      const upcoming = [...futureDates].sort()[0];
      const base = upcoming ? new Date(`${upcoming}T00:00:00`) : new Date();
      setView({ y: base.getFullYear(), m: base.getMonth() });
    }
  }, [open, futureDates]);

  // Lock body scroll and listen for Escape key when open
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

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
    typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {open && (
          <div
            id="trek-date-picker-overlay"
            className="fixed inset-0 z-[80] flex flex-col justify-end"
            onClick={onClose}
          >
            {/* Dimmed backdrop */}
            <motion.div
              key="trek-date-picker-backdrop"
              id="trek-date-picker-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Bottom sheet popup */}
            <motion.div
              key="trek-date-picker-sheet"
              id="trek-date-picker-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className={`relative z-10 w-full max-w-lg mx-auto rounded-t-3xl p-5 pb-7 shadow-2xl border-t border-x cursor-default ${
                darkMode ? 'bg-elegant-card border-white/10 text-elegant-text' : 'bg-white border-zinc-200/80 text-zinc-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pull handle bar */}
              <div className={`w-12 h-1.5 rounded-full mx-auto mb-4 ${darkMode ? 'bg-white/15' : 'bg-zinc-200'}`} />

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-semibold flex items-center gap-2">
                  <CalendarDays size={19} className="text-forest-500" /> Departure date
                </h2>
                <button
                  type="button"
                  id="btn-close-date-picker"
                  onClick={onClose}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                    darkMode ? 'bg-white/5 text-zinc-300 hover:bg-white/10' : 'bg-gray-100 text-zinc-500 hover:bg-gray-200'
                  }`}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Month switcher */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  id="btn-date-picker-prev-month"
                  onClick={() => shiftMonth(-1)}
                  disabled={atCurrentMonth}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition disabled:opacity-30 disabled:active:scale-100 cursor-pointer ${
                    darkMode ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold">{MONTH_NAMES[view.m]} {view.y}</span>
                <button
                  type="button"
                  id="btn-date-picker-next-month"
                  onClick={() => shiftMonth(1)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition cursor-pointer ${
                    darkMode ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                  aria-label="Next month"
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
                      type="button"
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
                  type="button"
                  id="btn-clear-date-filter"
                  onClick={() => onSelect('')}
                  className="w-full mt-3 py-3 rounded-2xl text-sm font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition cursor-pointer"
                >
                  Clear date filter
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )
  );
}
