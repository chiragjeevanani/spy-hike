/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Mountain, MapPin } from 'lucide-react';
import TicketQRCode from '../../../components/TicketQRCode';

// Helper component for fields

/**
 * Boarding-pass style trek ticket. Renders the booking as a tearable
 * ticket: a main pane + right stub separated by a perforated divider.
 */
export default function TravelTicket({ booking, darkMode, onDownload, notchClass }) {
  const leadHiker = booking.travelers?.[0]?.name || 'Registered Hiker';

  const statusStyles =
    booking.status === 'Upcoming'
      ? 'bg-emerald-500/15 text-emerald-500'
      : booking.status === 'Completed'
      ? 'bg-zinc-500/15 text-zinc-400'
      : 'bg-rose-500/15 text-rose-500';

  // Notch circles punch "holes" at the perforation — they must match the
  // page background behind the ticket.
  const notchBg = notchClass || (darkMode ? 'bg-zinc-950' : 'bg-gray-50');

  const Field = ({ label, value, mono = false }) => (
    <div className="min-w-0">
      <span className="block text-[7px] uppercase tracking-widest opacity-45 font-bold">{label}</span>
      <span className={`block text-[10px] font-bold truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );

  return (
    <div className={`rounded-2xl overflow-hidden relative border shadow-sm ${
      darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200/70'
    }`}>

      {/* Brand band across the top */}
      <div className="bg-forest-600 flex items-stretch text-white">
        <div className="flex-1 flex items-center gap-1.5 px-3.5 py-2">
          <Mountain size={13} className="shrink-0" />
          <span className="text-[10px] font-display font-black tracking-widest">FINDYOURTREK</span>
          <span className="text-[8px] font-mono opacity-80 tracking-widest ml-1 hidden min-[380px]:inline">
            TREK BOARDING PASS
          </span>
        </div>
        <div className="w-24 shrink-0 border-l border-dashed border-white/40 flex items-center justify-center">
          <span className="text-[8px] font-mono font-bold tracking-widest">TREK PASS</span>
        </div>
      </div>

      {/* Ticket body: main pane + stub */}
      <div className="flex items-stretch relative">

        {/* Main pane */}
        <div className="flex-1 min-w-0 p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="block text-[7px] uppercase tracking-widest opacity-45 font-bold">Hiker</span>
              <span className="block text-xs font-display font-black uppercase truncate">{leadHiker}</span>
            </div>
            <span className={`shrink-0 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusStyles}`}>
              {booking.status}
            </span>
          </div>

          <div className="min-w-0">
            <span className="block text-[7px] uppercase tracking-widest opacity-45 font-bold">Expedition</span>
            <span className="block text-[11px] font-bold truncate">{booking.tripName}</span>
            <span className="text-[9px] opacity-60 flex items-center gap-0.5 truncate">
              <MapPin size={9} className="text-forest-500 shrink-0" /> {booking.tripLocation}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Departure" value={booking.selectedDate} mono />
            <Field label="Hikers" value={`${booking.travelersCount} Pax`} />
            <Field label="Organizer" value={booking.organizerName} />
          </div>

          {/* Prominent High-Density Scannable QR Code */}
          <div className="pt-2 pb-1 border-t border-zinc-200/50 dark:border-zinc-800 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-1.5">
              <span className="text-[7px] uppercase tracking-widest opacity-60 font-bold">Scannable Boarding Pass Code</span>
              <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-emerald-500">
                {booking.bookingId || booking.id}
              </span>
            </div>
            <TicketQRCode value={booking.bookingId || booking.id} size={140} darkMode={darkMode} />
          </div>
        </div>

        {/* Perforation divider with punched notches */}
        <div className="relative w-0 border-l-2 border-dashed border-zinc-300 dark:border-white/15">
          <div className={`absolute -top-2 -left-2 w-4 h-4 rounded-full ${notchBg}`} />
          <div className={`absolute -bottom-2 -left-2 w-4 h-4 rounded-full ${notchBg}`} />
        </div>

        {/* Tear-off stub */}
        <div className="w-24 shrink-0 p-2.5 flex flex-col justify-between gap-2">
          <div className="space-y-1.5">
            <Field label="Permit" value={booking.bookingId} mono />
            <Field label="Date" value={booking.selectedDate} mono />
            <Field label="Pax" value={booking.travelersCount} />
            <div>
              <span className="block text-[7px] uppercase tracking-widest opacity-45 font-bold">Fare</span>
              <span className={`block text-[10px] font-black font-sans ${darkMode ? 'text-forest-400' : 'text-forest-650'}`}>
                ₹{booking.finalAmount}
              </span>
            </div>
          </div>

          {onDownload ? (
            <button
              id="btn-download-ticket-pdf"
              onClick={onDownload}
              className="w-full py-1.5 rounded-lg bg-forest-600 hover:bg-forest-700 text-white text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
            >
              <Download size={9} /> PDF
            </button>
          ) : (
            <span className="text-[7px] font-mono opacity-45 leading-tight block">
              SCAN AT BASE CAMP GATE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
