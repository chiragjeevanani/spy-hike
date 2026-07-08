import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Gift, Building2, Sparkles, CheckCircle2, Ticket, Clock, CalendarCheck } from 'lucide-react';
import { loadLoyaltyConfig, loadOrganizerVouchers, getOrganizerProgress } from '../../../utils/loyalty';

export default function OrgLoyaltyView({ organizer, onBack, onGoBookings, darkMode }) {
  const config = loadLoyaltyConfig();
  const { organizer: orgConfig } = config;
  const lifetimeBookings = organizer?.totalBookings || 0;
  const progress = getOrganizerProgress(lifetimeBookings, config);
  const vouchers = loadOrganizerVouchers();
  const availableVouchers = vouchers.filter(v => v.status === 'available');

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (progress.percent / 100) * circumference;

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>

      {/* Header */}
      <div className={`px-5 py-4 shrink-0 flex items-center gap-3 border-b ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
        <button
          onClick={onBack}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 ${darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-sm font-display font-black tracking-tight">Loyalty Rewards</h2>
          <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">TREKIGO PARTNER PERKS</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 pb-10">

        {/* Hero banner */}
        {orgConfig.banner.enabled && (
          <div className="relative h-36 rounded-3xl overflow-hidden shadow-lg">
            {orgConfig.banner.image ? (
              <img src={orgConfig.banner.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-zinc-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-4 flex flex-col justify-end">
              <span className="bg-spy-orange text-white text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full uppercase w-fit mb-1.5">
                Partner Loyalty
              </span>
              <h3 className="text-lg font-display font-black text-white leading-tight">{orgConfig.banner.title}</h3>
              <p className="text-xs text-white/80 mt-0.5">{orgConfig.banner.subtitle}</p>
            </div>
          </div>
        )}

        {!orgConfig.enabled && (
          <div className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
            <Clock size={15} className="shrink-0" />
            New progress tracking is paused right now — vouchers already earned are still valid below.
          </div>
        )}

        {/* Progress ring card */}
        <div className={`p-5 rounded-3xl flex items-center gap-5 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white shadow-sm'}`}>
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="10" className={darkMode ? 'stroke-white/10' : 'stroke-zinc-100'} />
              <circle
                cx="60" cy="60" r="54" fill="none" strokeWidth="10" strokeLinecap="round"
                className="stroke-spy-orange transition-all duration-700"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-display font-black leading-none">{progress.withinCycle}</span>
              <span className="text-[9px] opacity-50 font-bold uppercase mt-0.5">of {progress.threshold}</span>
            </div>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-50 flex items-center gap-1">
              <Building2 size={11} className="text-spy-orange" /> Bookings via App
            </span>
            <p className="text-sm font-bold mt-1 leading-snug">
              {progress.remaining > 0
                ? <>{progress.remaining} more booking{progress.remaining !== 1 ? 's' : ''} to a zero-commission credit</>
                : <>Milestone reached — check your rewards below!</>}
            </p>
            <p className={`text-[11px] mt-1.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Lifetime total: {lifetimeBookings} bookings received
            </p>
          </div>
        </div>

        {/* Available voucher(s) */}
        {availableVouchers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-spy-orange to-orange-700 text-white shadow-lg shadow-orange-900/20"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="animate-pulse" />
              <span className="font-display font-black text-sm">
                {availableVouchers.length} Zero-Commission Credit{availableVouchers.length > 1 ? 's' : ''} Ready!
              </span>
            </div>
            <p className="text-xs text-white/85 mt-1.5 leading-relaxed">
              {orgConfig.rewardDescription}
            </p>
            <button
              onClick={onGoBookings}
              className="mt-3 bg-white text-orange-700 text-xs font-bold px-4 py-2.5 rounded-full active:scale-95 transition shadow-sm flex items-center gap-1.5"
            >
              <CalendarCheck size={13} /> Apply to a Booking
            </button>
          </motion.div>
        )}

        {/* Reward explainer */}
        <div className={`p-4 rounded-2xl space-y-1.5 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white shadow-sm'}`}>
          <h4 className="text-xs font-black uppercase tracking-wider opacity-85 flex items-center gap-1.5">
            <Gift size={14} className="text-spy-orange" /> {orgConfig.rewardTitle}
          </h4>
          <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {orgConfig.rewardDescription}
          </p>
        </div>

        {/* Voucher history */}
        {vouchers.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-45 pl-1 block">Reward History</span>
            <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white shadow-sm'}`}>
              {vouchers.slice().reverse().map((v, i, arr) => (
                <div
                  key={v.id}
                  className={`px-4 py-3 flex items-center justify-between gap-2 ${i < arr.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      v.status === 'available' ? 'bg-orange-500/15 text-spy-orange' : 'bg-zinc-500/10 text-zinc-400'
                    }`}>
                      {v.status === 'available' ? <Ticket size={14} /> : <CheckCircle2 size={14} />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block">Milestone #{v.milestoneNumber} Reward</span>
                      <span className="text-[10px] opacity-50 block">Earned {v.earnedAt?.split('T')[0]}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                    v.status === 'available' ? 'bg-orange-500/15 text-spy-orange' : (darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500')
                  }`}>
                    {v.status === 'available' ? 'Ready' : 'Applied'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vouchers.length === 0 && (
          <div className="text-center py-8">
            <span className="text-4xl block">🧭</span>
            <p className={`text-xs mt-3 leading-relaxed px-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Keep hosting treks — every {orgConfig.thresholdBookings} bookings received via Trekigo earns a zero-commission credit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
