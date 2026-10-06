import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, CalendarDays, Check } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toDateStr = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Bottom-sheet month calendar for organizers to define batch departure
// dates. Every future day is toggleable — unlike the traveller-facing
// TrekDatePicker (which only lets you *pick* existing departures), this one
// lets you *create* them. Past days are disabled the same way.
export default function OrgBatchDatePicker({ open, selectedDates, onToggleDate, onClose, darkMode }) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const initialMonth = useMemo(() => {
    const upcoming = [...selectedSet].filter(d => d >= todayStr).sort()[0];
    const base = upcoming ? new Date(`${upcoming}T00:00:00`) : today;
    return { y: base.getFullYear(), m: base.getMonth() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [view, setView] = useState(initialMonth);

  useEffect(() => {
    if (open) {
      const upcoming = [...selectedSet].filter(d => d >= todayStr).sort()[0];
      const base = upcoming ? new Date(`${upcoming}T00:00:00`) : new Date();
      setView({ y: base.getFullYear(), m: base.getMonth() });
    }
  }, [open, selectedSet, todayStr]);

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
            id="org-batch-date-picker-overlay"
            className="fixed inset-0 z-[80] flex flex-col justify-end"
            onClick={onClose}
          >
            <motion.div
              key="org-batch-date-backdrop"
              id="org-batch-date-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            <motion.div
              key="org-batch-date-sheet"
              id="org-batch-date-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className={`relative z-10 w-full max-w-lg mx-auto rounded-t-3xl p-5 pb-7 shadow-2xl border-t border-x cursor-default ${
                darkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-[#FAF8F2] border-zinc-200/80 text-zinc-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`w-12 h-1.5 rounded-full mx-auto mb-4 ${darkMode ? 'bg-white/15' : 'bg-zinc-200'}`} />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-black flex items-center gap-2">
                  <CalendarDays size={18} className="text-spy-orange" /> Select Batch Dates
                </h2>
                <button
                  id="btn-close-batch-date-picker"
                  onClick={onClose}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition ${darkMode ? 'bg-white/5 text-zinc-300 hover:bg-white/10' : 'bg-zinc-200/60 text-zinc-600 hover:bg-zinc-200'}`}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  id="btn-batch-date-prev-month"
                  onClick={() => shiftMonth(-1)}
                  disabled={atCurrentMonth}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition disabled:opacity-30 cursor-pointer ${
                    darkMode ? 'border-white/10 text-zinc-300' : 'border-zinc-200 text-zinc-600'
                  }`}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold">{MONTH_NAMES[view.m]} {view.y}</span>
                <button
                  type="button"
                  id="btn-batch-date-next-month"
                  onClick={() => shiftMonth(1)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition cursor-pointer ${
                    darkMode ? 'border-white/10 text-zinc-300' : 'border-zinc-200 text-zinc-600'
                  }`}
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d, i) => (
                  <span key={i} className="text-center text-[10px] font-bold uppercase opacity-45 py-1">{d}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, i) => {
                  if (day === null) return <span key={`blank-${i}`} />;
                  const dateStr = toDateStr(view.y, view.m, day);
                  const isSelected = selectedSet.has(dateStr);
                  const isPast = dateStr < todayStr;
                  return (
                    <button
                      type="button"
                      key={dateStr}
                      disabled={isPast}
                      onClick={() => onToggleDate(dateStr)}
                      className={`h-10 mx-auto w-10 rounded-full text-sm flex flex-col items-center justify-center transition relative ${
                        isPast
                          ? 'opacity-20 cursor-default line-through'
                          : isSelected
                          ? 'bg-spy-orange text-white font-bold shadow-md cursor-pointer'
                          : `font-semibold cursor-pointer ${darkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-zinc-100 text-zinc-800'}`
                      }`}
                    >
                      {isSelected ? <Check size={15} /> : day}
                    </button>
                  );
                })}
              </div>

              <p className={`text-[11px] mt-3 leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Tap any future date to mark a batch departure. Travellers will see these exact dates when booking.
              </p>

              <button
                type="button"
                id="btn-done-batch-date-picker"
                onClick={onClose}
                className="w-full mt-4 py-3 rounded-2xl text-sm font-bold bg-spy-orange hover:bg-[#d96d1a] text-white transition active:scale-95 cursor-pointer"
              >
                Done — {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )
  );
}
