import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarCheck, Users, IndianRupee, ChevronRight, Search, Filter,
  CheckCircle, XCircle, Clock, Gift, Sparkles, X, Mail, Phone, Calendar
} from 'lucide-react';
import { getAvailableOrganizerVoucher } from '../../../utils/loyalty';

const STATUS_FILTERS = ['All', 'Upcoming', 'Ongoing', 'Completed', 'Missed', 'Cancelled'];

export default function OrgBookingsView({ bookings, onApplyLoyaltyReward, darkMode }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const availableVoucher = getAvailableOrganizerVoucher();

  const handleRedeem = () => {
    if (!availableVoucher || !selectedBooking) return;
    onApplyLoyaltyReward(availableVoucher.id, selectedBooking.bookingId || selectedBooking.id);
    setSelectedBooking(prev => ({ ...prev, commissionAmount: 0, loyaltyRewardApplied: true }));
  };

  const filtered = bookings.filter(b => {
    const matchFilter = filter === 'All' || b.status === filter;
    const matchSearch = b.userName?.toLowerCase().includes(search.toLowerCase()) ||
      b.tripName?.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingId?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusIcon = (s) => {
    if (s === 'Upcoming') return <Clock size={13} className="text-amber-400" />;
    if (s === 'Ongoing') return <Sparkles size={13} className="text-emerald-400" />;
    if (s === 'Completed') return <CheckCircle size={13} className="text-blue-400" />;
    if (s === 'Missed') return <XCircle size={13} className="text-rose-400" />;
    return <XCircle size={13} className="text-red-400" />;
  };

  const statusColor = (s) => {
    if (s === 'Upcoming') return 'bg-amber-500/15 text-amber-400 border border-amber-500/25';
    if (s === 'Ongoing') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
    if (s === 'Completed') return 'bg-blue-500/15 text-blue-400 border border-blue-500/25';
    if (s === 'Missed') return 'bg-rose-500/15 text-rose-400 border border-rose-500/25';
    return 'bg-red-500/15 text-red-400 border border-red-500/25';
  };

  return (
    <div className={`h-full flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight">Hiker Bookings</h1>
          <p className={`text-xs sm:text-sm mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Track and verify {bookings.length} reservations across all expedition departures
          </p>
        </div>

        {/* Toolbar: Search & Status Filters */}
        <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs ${
          darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80'
        }`}>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search hiker name, email, trek title, or booking ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-2xl text-xs sm:text-sm border outline-none transition ${
                darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/50'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filter === s
                    ? 'bg-spy-orange text-white shadow-sm shadow-spy-orange/30'
                    : darkMode ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-white/10' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings Grid */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className={`rounded-3xl p-12 text-center border-2 border-dashed ${
              darkMode ? 'border-white/10' : 'border-zinc-200'
            }`}>
              <CalendarCheck size={48} className="text-zinc-400 mx-auto mb-3" />
              <h3 className="font-bold text-base mb-1">No bookings found</h3>
              <p className={`text-xs sm:text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {search ? 'Try searching with a different keyword or filter' : 'Reservations will appear here once hikers book your treks'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {filtered.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  id={`org-booking-row-${booking.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedBooking(booking)}
                  className={`rounded-3xl p-5 cursor-pointer transition-all border hover:shadow-md ${
                    darkMode ? 'bg-zinc-900/80 border-white/10 hover:border-white/20' : 'bg-white border-zinc-200/80 shadow-xs hover:border-zinc-300'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 shadow-xs ${
                        darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {(booking.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate leading-tight">{booking.userName}</p>
                        <p className={`text-xs truncate mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{booking.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${statusColor(booking.status)}`}>
                        {statusIcon(booking.status)} {booking.status}
                      </span>
                      {booking.loyaltyRewardApplied && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-spy-orange/15 text-spy-orange flex items-center gap-1">
                          <Gift size={9} /> 0% Fee Reward
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trip Title */}
                  <h4 className="text-sm font-bold mb-3 text-spy-orange">{booking.tripName}</h4>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between gap-3 text-xs pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1.5 ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        <Users size={13} className="text-zinc-400" /> {booking.hikersCount} hiker{booking.hikersCount > 1 ? 's' : ''}
                      </span>
                      <span className="opacity-30">·</span>
                      <span className={`flex items-center gap-1.5 ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        <Calendar size={13} className="text-zinc-400" /> {booking.selectedDate}
                      </span>
                    </div>
                    <div className="font-black text-sm text-emerald-400">
                      ₹{booking.finalAmount?.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Bottom booking ID and View CTA */}
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] font-mono opacity-50">{booking.bookingId}</span>
                    <span className="text-spy-orange text-xs font-bold flex items-center gap-0.5">
                      View Details <ChevronRight size={13} />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Booking Detail Modal / Drawer */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedBooking && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
              onClick={() => setSelectedBooking(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-xl rounded-3xl overflow-hidden max-h-[85vh] flex flex-col border shadow-2xl ${
                  darkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                }`}
              >
                {/* Header */}
                <div className={`p-5 sm:p-6 border-b flex items-start justify-between shrink-0 ${
                  darkMode ? 'border-white/10' : 'border-zinc-200'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-display font-black leading-tight">{selectedBooking.userName}</h2>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusColor(selectedBooking.status)}`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {selectedBooking.userEmail} · {selectedBooking.userMobile || 'No contact number'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className={`p-2 rounded-2xl transition cursor-pointer ${
                      darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                  <div className={`rounded-2xl p-4 space-y-3 ${darkMode ? 'bg-zinc-950 border border-white/5' : 'bg-zinc-50 border border-zinc-200'}`}>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="opacity-70">Booking ID</span>
                      <span className="font-bold font-mono">{selectedBooking.bookingId}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="opacity-70">Expedition</span>
                      <span className="font-bold">{selectedBooking.tripName}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="opacity-70">Departure Batch</span>
                      <span className="font-bold">{selectedBooking.selectedDate}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="opacity-70">Hikers On Ticket</span>
                      <span className="font-bold">{selectedBooking.hikersCount} Hiker(s)</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="opacity-70">Gross Hiker Settlement</span>
                      <span className="font-bold">₹{selectedBooking.finalAmount?.toLocaleString('en-IN')}</span>
                    </div>

                    {selectedBooking.loyaltyRewardApplied ? (
                      <div className="flex justify-between text-xs sm:text-sm text-spy-orange">
                        <span className="flex items-center gap-1"><Gift size={13} /> Platform Commission</span>
                        <span className="font-bold">₹0 (Zero Fee Reward Applied)</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-xs sm:text-sm text-rose-400">
                        <span>Platform Commission ({selectedBooking.commissionRate || 10}%)</span>
                        <span className="font-bold">-₹{(selectedBooking.commissionAmount || (selectedBooking.finalAmount * 0.1)).toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className={`pt-2.5 border-t flex justify-between ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                      <span className="font-bold text-sm">Net Partner Disbursal</span>
                      <span className="font-black text-emerald-400 text-base font-mono">
                        ₹{(selectedBooking.loyaltyRewardApplied
                          ? selectedBooking.finalAmount
                          : selectedBooking.finalAmount - (selectedBooking.commissionAmount || (selectedBooking.finalAmount * 0.1))
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Loyalty Voucher Redemption */}
                  {availableVoucher && !selectedBooking.loyaltyRewardApplied && selectedBooking.status === 'Upcoming' && (
                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      darkMode ? 'bg-spy-orange/10 border-spy-orange/30 text-white' : 'bg-orange-50 border-orange-200 text-zinc-900'
                    }`}>
                      <div>
                        <p className="text-xs font-bold text-spy-orange flex items-center gap-1">
                          <Sparkles size={13} /> Milestone Reward Ready
                        </p>
                        <p className="text-[11px] opacity-75 mt-0.5">Waive the 10% platform commission on this booking.</p>
                      </div>
                      <button
                        type="button"
                        id="btn-apply-org-loyalty-reward"
                        onClick={handleRedeem}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-spy-orange hover:bg-[#d96d1a] text-white active:scale-95 transition shadow-sm cursor-pointer shrink-0"
                      >
                        Apply 0% Fee
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
