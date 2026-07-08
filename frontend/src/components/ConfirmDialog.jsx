/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

// Shared confirmation modal used across the user, organizer and admin apps —
// a themed replacement for window.confirm() so destructive/session actions
// (like logout) get a proper in-app popup instead of a native browser alert.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  darkMode,
  tone = 'danger',
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className={`relative w-full max-w-xs rounded-3xl p-6 text-center shadow-2xl ${
              darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
              tone === 'danger' ? 'bg-rose-500/15 text-rose-500' : 'bg-forest-500/15 text-forest-500'
            }`}>
              <AlertTriangle size={22} />
            </div>

            <h3 className="text-base font-display font-black">{title}</h3>
            <p className={`text-xs mt-1.5 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {message}
            </p>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={onCancel}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                  darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition cursor-pointer active:scale-95 ${
                  tone === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-forest-600 hover:bg-forest-700'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
