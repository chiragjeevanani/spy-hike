/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarCheck, Users, IndianRupee, ChevronRight, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_FILTERS = ['All', 'Upcoming', 'Completed', 'Cancelled'];

export default function OrgBookingsView({ bookings, darkMode }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'All' || b.status === filter;
    const matchSearch = b.userName?.toLowerCase().includes(search.toLowerCase()) || b.tripName?.toLowerCase().includes(search.toLowerCase()) || b.bookingId?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusIcon = (s) => {
    if (s === 'Upcoming') return <Clock size={13} className="text-amber-400" />;
    if (s === 'Completed') return <CheckCircle size={13} className="text-emerald-400" />;
    return <XCircle size={13} className="text-red-400" />;
  };

  const statusColor = (s) => {
    if (s === 'Upcoming') return 'bg-amber-500/15 text-amber-400';
    if (s === 'Completed') return 'bg-emerald-500/15 text-emerald-400';
    return 'bg-red-500/15 text-red-400';
  };

  return (
    <div className={`h-full flex flex-col font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      
      {/* Header */}
      <div className={`px-5 pt-5 pb-4 shrink-0 ${darkMode ? 'bg-gradient-to-b from-zinc-900/80 to-transparent' : 'bg-gradient-to-b from-orange-50 to-transparent'}`}>
        <h1 className="text-xl font-display font-black tracking-tight mb-1">Bookings</h1>
        <p className={`text-xs mb-4 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{bookings.length} total booking{bookings.length !== 1 ? 's' : ''} received</p>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search hiker, trip or booking ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition ${
              darkMode ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/40' : 'bg-white border-zinc-200 focus:border-spy-orange/40'
            }`}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === f ? 'bg-spy-orange text-white shadow-sm shadow-spy-orange/30' : darkMode ? 'bg-zinc-900 text-zinc-400 border border-white/10' : 'bg-white text-zinc-500 border border-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <CalendarCheck size={40} className="text-zinc-300 mb-3" />
            <p className="font-bold text-sm mb-1">No bookings found</p>
            <p className={`text-xs ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Bookings will appear here once users book your trips</p>
          </div>
        ) : (
          filtered.map((booking, i) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedBooking(booking)}
              className={`rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-all ${
                darkMode ? 'bg-zinc-900 border border-white/5 hover:border-white/10' : 'bg-white border border-zinc-100 shadow-sm hover:shadow'
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    {(booking.userName || 'U').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{booking.userName}</p>
                    <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{booking.userEmail}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColor(booking.status)}`}>
                  {statusIcon(booking.status)} {booking.status}
                </span>
              </div>

              {/* Trip name */}
              <p className={`text-xs font-semibold mb-3 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{booking.tripName}</p>

              {/* Details row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Users size={11} /> {booking.hikersCount} hiker{booking.hikersCount > 1 ? 's' : ''}
                  </span>
                  <span className={`flex items-center gap-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <CalendarCheck size={11} /> {booking.selectedDate}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-spy-orange font-black text-sm">
                  <IndianRupee size={12} />{booking.finalAmount?.toLocaleString('en-IN')}
                </div>
              </div>

              <div className={`mt-2 pt-2 border-t flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                <span className={`text-[10px] font-mono ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{booking.bookingId}</span>
                <span className="text-spy-orange text-xs font-semibold flex items-center gap-0.5">View <ChevronRight size={13} /></span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Booking Detail Drawer */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`absolute inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden ${darkMode ? 'bg-zinc-900' : 'bg-white'}`}
            style={{ maxHeight: '80%' }}
          >
            <div className="overflow-y-auto h-full pb-8">
              {/* Drag indicator */}
              <div className="flex justify-center pt-3 pb-2">
                <div className={`w-8 h-1 rounded-full ${darkMode ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
              </div>

              <div className="px-5 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-display font-black">{selectedBooking.userName}</h2>
                    <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{selectedBooking.userEmail} · {selectedBooking.userMobile}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedBooking(null)} className={`p-2 rounded-xl text-xs ${darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                    Close
                  </button>
                </div>

                <div className={`rounded-2xl p-4 space-y-3 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>Booking ID</span>
                    <span className="font-bold font-mono">{selectedBooking.bookingId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>Trip</span>
                    <span className="font-bold">{selectedBooking.tripName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>Date</span>
                    <span className="font-bold">{selectedBooking.selectedDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>Hikers</span>
                    <span className="font-bold">{selectedBooking.hikersCount}</span>
                  </div>
                   <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>Gross Amount</span>
                    <span className="font-bold">₹{selectedBooking.finalAmount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-400">
                    <span>Platform Commission ({selectedBooking.commissionRate || 10}%)</span>
                    <span className="font-bold">-₹{(selectedBooking.commissionAmount || (selectedBooking.finalAmount * 0.1)).toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`pt-2 border-t flex justify-between ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                    <span className="font-black">Your Net Payout</span>
                    <span className="font-black text-emerald-450">₹{(selectedBooking.finalAmount - (selectedBooking.commissionAmount || (selectedBooking.finalAmount * 0.1))).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusColor(selectedBooking.status)}`}>
                  {statusIcon(selectedBooking.status)} {selectedBooking.status}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
