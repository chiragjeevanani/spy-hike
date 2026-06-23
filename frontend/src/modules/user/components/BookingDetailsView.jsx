/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Download, MessageSquare, Star, CalendarDays, Receipt, ShieldAlert 
} from 'lucide-react';

export default function BookingDetailsView({
  booking,
  onBack,
  onModifyBookingStatus,
  onContactOrganizer,
  onDownloadInvoice,
  onRateHike,
  darkMode
}) {
  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden font-sans relative ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-900'
    }`}>
      
      {/* 1. Header Sticky Nav Bar */}
      <div className={`p-4 border-b flex items-center gap-3 shrink-0 ${
        darkMode ? 'bg-zinc-950 border-white/5' : 'bg-white border-zinc-200/60'
      }`}>
        <button
          onClick={onBack}
          className={`w-9 h-9 rounded-full flex items-center justify-center border transition active:scale-90 cursor-pointer ${
            darkMode ? 'bg-zinc-900 border-white/10 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200'
          }`}
          title="Go Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xs uppercase font-mono font-black tracking-widest text-[#F27D26]">
            Booking Details
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono">
            Permit ID: {booking.bookingId}
          </p>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5 pb-28">
        
        {/* Cover visual row */}
        <div className="rounded-2xl overflow-hidden h-40 relative bg-zinc-900 shrink-0">
          <img src={booking.tripImage} alt={booking.tripName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 inset-x-4 flex justify-between items-end">
            <div>
              <span className={`text-[10px] font-sans font-black tracking-wider px-2.5 py-0.5 rounded-full ${
                booking.status === 'Upcoming'
                  ? 'bg-emerald-600 text-white'
                  : booking.status === 'Completed'
                  ? 'bg-zinc-605 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {booking.status.toUpperCase()}
              </span>
              <h3 className="text-base font-display font-black text-white mt-1 leading-tight">{booking.tripName}</h3>
            </div>
          </div>
        </div>

        {/* Schedule & Information Details */}
        <div className={`p-4 rounded-2xl border space-y-3.5 ${
          darkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-200/60 shadow-xs'
        }`}>
          <h4 className="text-xs font-display font-bold uppercase tracking-wider opacity-85">
            Expedition Parameters
          </h4>
          
          <div className="grid grid-cols-2 gap-3.5 text-xs pt-1">
            <div className="space-y-1">
              <span className="opacity-50 text-[10px] uppercase font-bold block">Departure Date</span>
              <span className="font-semibold flex items-center gap-1">
                <CalendarDays size={12} className="text-forest-500" /> {booking.selectedDate}
              </span>
            </div>
            <div className="space-y-1">
              <span className="opacity-50 text-[10px] uppercase font-bold block">Hikers Roster</span>
              <span className="font-semibold">
                {booking.travelersCount} Hiker(s) Registered
              </span>
            </div>
            <div className="space-y-1">
              <span className="opacity-50 text-[10px] uppercase font-bold block">Permit Reference</span>
              <span className="font-mono font-bold">{booking.bookingId}</span>
            </div>
            <div className="space-y-1">
              <span className="opacity-50 text-[10px] uppercase font-bold block">Organizer</span>
              <span className="font-semibold">{booking.organizerName}</span>
            </div>
          </div>
        </div>

        {/* Settled Cost Receipt Sheet */}
        <div className={`p-4 rounded-2xl border space-y-3.5 ${
          darkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-200/60 shadow-xs'
        }`}>
          <h4 className="text-xs font-display font-bold uppercase tracking-wider opacity-85 flex items-center gap-1">
            <Receipt size={14} className="text-emerald-400" /> Settled Bill Summary
          </h4>
          
          <div className="space-y-2 text-xs pt-1">
            <div className="flex justify-between">
              <span className="opacity-60">Base Booking Fee</span>
              <span className="font-sans">₹{booking.finalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Permit Royalties & Tax</span>
              <span className="text-emerald-500 font-mono">Included</span>
            </div>
            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2 pt-2 flex justify-between font-black text-sm">
              <span>Total Value Cleared</span>
              <span className={`font-sans ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>₹{booking.finalAmount}</span>
            </div>
          </div>
        </div>

        {/* Cancellation warning clause */}
        {booking.status === 'Upcoming' && (
          <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
            darkMode ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50/50 border-rose-100'
          }`}>
            <ShieldAlert size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              <span className="font-bold text-rose-500 block mb-0.5">Flexible Cancellation Policy</span>
              Hassle-free 100% refund is available up to 48 hours prior to Departure Date. Refunds will route back to your banking ledger instantly.
            </div>
          </div>
        )}

      </div>

      {/* 3. Sticky Action Buttons Row Footer */}
      <div className={`absolute bottom-0 inset-x-0 p-3 border-t flex gap-2 z-10 backdrop-blur-md ${
        darkMode ? 'bg-zinc-950/95 border-white/5' : 'bg-white/95 border-zinc-200/60'
      }`}>
        <button
          onClick={() => onDownloadInvoice(booking)}
          className={`flex-1 py-2 border rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all duration-200 ${
            darkMode 
              ? 'border-white/10 hover:bg-white/5 text-zinc-350' 
              : 'border-zinc-200 hover:bg-zinc-50 text-zinc-650'
          }`}
        >
          Invoice <Download size={10} />
        </button>



        {booking.status === 'Completed' && (
          <button
            onClick={() => onRateHike(booking)}
            className="flex-1 py-2 bg-spy-orange hover:bg-spy-orange-hover text-white rounded-full text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all duration-200"
          >
            Rate Hike <Star size={10} className="fill-white" />
          </button>
        )}

        {booking.status === 'Upcoming' && (
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to cancel the registration for ${booking.tripName}? 100% refund is credited back to your original source.`)) {
                onModifyBookingStatus(booking.id, 'Cancelled');
                onBack();
              }
            }}
            className="flex-1 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 text-[9px] uppercase font-black tracking-wider cursor-pointer active:scale-95 transition-all text-center"
          >
            Cancel Slot
          </button>
        )}
      </div>

    </div>
  );
}
