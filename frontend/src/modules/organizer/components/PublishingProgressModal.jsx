import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  X,
  FileCheck,
  MapPin,
} from 'lucide-react';

const STAGES = [
  { id: 'photos', label: 'Photos & Media', desc: 'Uploading gallery images' },
  { id: 'validation', label: 'Validation', desc: 'Checking trip details & batch pricing' },
  { id: 'checks', label: 'Safety & Checks', desc: 'Verifying guidelines & pickup info' },
  { id: 'registration', label: 'Registration', desc: 'Registering trek in Hike catalog' },
];

export default function PublishingProgressModal({
  isOpen,
  isEdit = false,
  isDraft = false,
  progress = 0,
  currentStageIndex = 0,
  statusMessage = 'Initializing publication...',
  error = null,
  isSuccess = false,
  onRetry,
  onClose,
  darkMode = true,
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border ${
            darkMode
              ? 'bg-zinc-900/95 border-white/10 text-white'
              : 'bg-white/95 border-zinc-200 text-zinc-800'
          } backdrop-blur-xl overflow-hidden`}
        >
          {/* Ambient background glow */}
          <div
            className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
              isSuccess
                ? 'bg-emerald-500/20'
                : error
                ? 'bg-red-500/20'
                : 'bg-spy-orange/20'
            }`}
          />
          <div
            className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
              darkMode ? 'bg-blue-500/10' : 'bg-orange-500/10'
            }`}
          />

          {error ? (
            /* Error State */
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 animate-bounce">
                <AlertTriangle size={32} />
              </div>

              <div>
                <h3 className="text-lg font-black tracking-tight text-red-500">
                  Publication Paused
                </h3>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    darkMode ? 'text-zinc-300' : 'text-zinc-600'
                  }`}
                >
                  {error || 'An unexpected issue occurred while saving your trek.'}
                </p>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                    darkMode
                      ? 'border-white/10 hover:bg-white/5 text-zinc-300'
                      : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  Back to Form
                </button>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-spy-orange hover:bg-[#d96d1a] text-white shadow-lg shadow-spy-orange/25 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Retry Now
                  </button>
                )}
              </div>
            </div>
          ) : isSuccess ? (
            /* Success State */
            <div className="text-center space-y-4 py-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400"
              >
                <CheckCircle2 size={44} />
              </motion.div>

              <div>
                <h3 className="text-xl font-black tracking-tight text-emerald-400">
                  {isDraft ? 'Draft Saved Successfully!' : isEdit ? 'Trek Updated!' : 'Trek Published!'}
                </h3>
                <p
                  className={`text-xs mt-1 ${
                    darkMode ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  {isDraft
                    ? 'Your trek draft is safely stored in your organizer portal.'
                    : 'Your trek is live and ready for travellers to discover & book!'}
                </p>
              </div>
            </div>
          ) : (
            /* Active Loading State */
            <div className="space-y-6">
              {/* Header Icon & Title */}
              <div className="flex items-center gap-3.5">
                <div className="relative w-12 h-12 rounded-2xl bg-spy-orange/15 border border-spy-orange/30 flex items-center justify-center text-spy-orange shrink-0">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-2xl border border-dashed border-spy-orange/40"
                  />
                  <UploadCloud size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-tight">
                      {isDraft ? 'Saving Trek Draft...' : isEdit ? 'Updating Trek...' : 'Publishing Trek...'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-spy-orange/20 text-spy-orange">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 truncate font-medium ${
                      darkMode ? 'text-spy-orange/90' : 'text-spy-orange'
                    }`}
                  >
                    {statusMessage}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div
                  className={`h-3 w-full rounded-full overflow-hidden p-0.5 border ${
                    darkMode ? 'bg-zinc-950 border-white/10' : 'bg-zinc-100 border-zinc-200'
                  }`}
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-spy-orange shadow-md relative overflow-hidden"
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-white/25"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                  <span>Processing Media & Data</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
              </div>

              {/* Dynamic Stage Checklist */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {STAGES.map((stg, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <div
                      key={stg.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-start gap-2 ${
                        isDone
                          ? darkMode
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : isCurrent
                          ? darkMode
                            ? 'bg-spy-orange/15 border-spy-orange/40 text-spy-orange'
                            : 'bg-orange-50 border-spy-orange/30 text-spy-orange'
                          : darkMode
                          ? 'bg-zinc-950/40 border-white/5 text-zinc-500'
                          : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 size={13} className="text-emerald-500" />
                        ) : isCurrent ? (
                          <RefreshCw size={13} className="animate-spin text-spy-orange" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-current opacity-40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold truncate">{stg.label}</p>
                        <p className="text-[9px] opacity-75 truncate">{stg.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Warning Box */}
              <div
                className={`p-3 rounded-2xl border flex items-center gap-3 ${
                  darkMode
                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <AlertTriangle size={18} className="shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Important Notice</p>
                  <p className="text-[10px] opacity-90 leading-tight">
                    Please <span className="font-extrabold underline">do not press back or close the app</span> while your trek photos and data are uploading.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
