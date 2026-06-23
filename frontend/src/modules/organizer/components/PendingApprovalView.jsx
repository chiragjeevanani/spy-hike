/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Clock, Shield, CheckCircle, Mail, PhoneCall, RefreshCw } from 'lucide-react';

export default function PendingApprovalView({ organizer, onRefresh, darkMode }) {
  const steps = [
    { label: 'Application Submitted', done: true },
    { label: 'Documents Under Review', done: false, current: true },
    { label: 'Admin Verification', done: false },
    { label: 'Go Live!', done: false },
  ];

  return (
    <div className={`h-full flex flex-col overflow-y-auto font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>
      
      {/* Top illustration block */}
      <div className={`px-6 pt-6 pb-8 text-center relative overflow-hidden ${darkMode ? 'bg-gradient-to-b from-zinc-900 to-zinc-950' : 'bg-gradient-to-b from-amber-50 to-gray-50'}`}>
        {/* Animated ambient blob */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-64 h-64 rounded-full bg-spy-orange/30 blur-[80px]"
          />
        </div>

        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full border-4 border-spy-orange/30 border-t-spy-orange flex items-center justify-center mx-auto mb-6 relative"
        >
          <Clock size={32} className="text-spy-orange" />
        </motion.div>

        <h1 className="text-2xl font-display font-black tracking-tight mb-2">Application Under Review</h1>
        <p className={`text-sm leading-relaxed max-w-xs mx-auto ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Hello <strong>{organizer?.name || 'Partner'}</strong>! Your application is being reviewed by our admin team.
        </p>
      </div>

      {/* Progress tracker */}
      <div className="px-6 py-6">
        <h3 className={`text-xs font-black tracking-widest uppercase mb-4 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Verification Progress</h3>
        <div className="relative space-y-0">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3 items-start relative">
              {/* Vertical connector */}
              {i < steps.length - 1 && (
                <div className={`absolute left-[13px] top-7 w-0.5 h-8 ${s.done ? 'bg-spy-orange' : darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              )}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                s.done
                  ? 'border-spy-orange bg-spy-orange'
                  : s.current
                  ? 'border-spy-orange bg-spy-orange/10 animate-pulse'
                  : darkMode ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-white'
              }`}>
                {s.done ? <CheckCircle size={14} className="text-white" /> : s.current ? <Clock size={13} className="text-spy-orange" /> : <div className="w-2 h-2 rounded-full bg-zinc-400/40" />}
              </div>
              <div className="pb-8">
                <p className={`text-sm font-semibold ${s.done || s.current ? (darkMode ? 'text-white' : 'text-zinc-800') : darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {s.label}
                </p>
                {s.current && (
                  <p className="text-xs text-spy-orange mt-0.5 font-medium">In progress · 24–48 hrs</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div className="px-6 space-y-3 pb-4">
        <div className={`rounded-2xl p-4 space-y-3 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
              <Shield size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold">What we're verifying</p>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Government ID, Agency credentials, Safety certifications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Mail size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold">Email notification</p>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                We'll notify <span className="text-spy-orange font-medium">{organizer?.email}</span> once approved
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${darkMode ? 'bg-spy-orange/10' : 'bg-orange-50'}`}>
              <PhoneCall size={16} className="text-spy-orange" />
            </div>
            <div>
              <p className="text-sm font-bold">Support</p>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>partners@spyhike.com · 1800-SPY-HIKE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulate approval (dev helper) */}
      <div className="px-6 pb-8 mt-2 space-y-3">
        <button
          type="button"
          onClick={onRefresh}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold border transition-all active:scale-95 ${
            darkMode ? 'border-white/10 text-white/60 hover:border-spy-orange/40 hover:text-spy-orange' : 'border-zinc-200 text-zinc-500 hover:border-spy-orange hover:text-spy-orange'
          }`}
        >
          <RefreshCw size={16} />
          Check Approval Status
        </button>
        <p className={`text-center text-[10px] ${darkMode ? 'text-zinc-700' : 'text-zinc-400'}`}>
          Simulate approval: this button auto-approves in demo mode
        </p>
      </div>
    </div>
  );
}
