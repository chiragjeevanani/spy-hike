import React, { useState, useEffect } from 'react';
import { Search, Calendar, IndianRupee, User, Eye, X, FileText, TrendingUp } from 'lucide-react';
import { loadAllBookings, saveBookingStatusAdmin } from '../utils/storage';

export default function BookingsView({ darkMode }) {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    setBookings(loadAllBookings());
  }, []);

  const handleCancelBooking = (bookingId) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${bookingId}? This will notify the hiker and update status to Cancelled.`)) return;
    saveBookingStatusAdmin(bookingId, 'Cancelled');
    setBookings(loadAllBookings()); // refresh
  };

  const filteredBookings = bookings.filter(b => {
    const matchSearch = (b.bookingId || '').toLowerCase().includes(search.toLowerCase()) ||
                        (b.userName || '').toLowerCase().includes(search.toLowerCase()) ||
                        (b.tripName || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate metrics
  const totalCount = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'Completed' || b.status === 'Upcoming');
  const activeAmount = activeBookings.reduce((sum, b) => sum + (parseFloat(b.finalAmount) || 0), 0);
  const cancelledAmount = bookings
    .filter(b => b.status === 'Cancelled')
    .reduce((sum, b) => sum + (parseFloat(b.finalAmount) || 0), 0);
  const totalCommission = activeBookings.reduce((sum, b) => {
    const commission = b.commissionAmount !== undefined ? b.commissionAmount : (parseFloat(b.finalAmount) * 0.1);
    return sum + commission;
  }, 0);

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode 
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' 
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">All Bookings</h1>
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">View and manage bookings, check revenue, and cancel reservations.</p>
      </div>

      {/* Mini summary stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`${cardCls} flex items-center justify-between py-4`}>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Bookings</span>
            <span className="text-xl font-black mt-1 font-display">{totalCount} slots</span>
          </div>
          <Calendar className="text-blue-500 bg-blue-500/10 p-2 rounded-xl shrink-0" size={36} />
        </div>

        <div className={`${cardCls} flex items-center justify-between py-4`}>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Revenue</span>
            <span className="text-xl font-black text-emerald-500 mt-1 font-display">₹{activeAmount.toLocaleString('en-IN')}</span>
          </div>
          <IndianRupee className="text-emerald-500 bg-emerald-500/10 p-2 rounded-xl shrink-0" size={36} />
        </div>

        <div className={`${cardCls} flex items-center justify-between py-4`}>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Commission Earned</span>
            <span className="text-xl font-black text-pink-500 mt-1 font-display">₹{totalCommission.toLocaleString('en-IN')}</span>
          </div>
          <TrendingUp className="text-pink-500 bg-pink-500/10 p-2 rounded-xl shrink-0" size={36} />
        </div>

        <div className={`${cardCls} flex items-center justify-between py-4`}>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cancelled Value</span>
            <span className="text-xl font-black text-rose-500 mt-1 font-display">₹{cancelledAmount.toLocaleString('en-IN')}</span>
          </div>
          <X className="text-rose-500 bg-rose-500/10 p-2 rounded-xl shrink-0" size={36} />
        </div>
      </div>

      {/* Filters bar */}
      <div className={`${cardCls} py-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Hiker, Trip, or Ticket ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-xs font-semibold transition-all ${
              darkMode 
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-[#F27D26]/60' 
                : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#F27D26]/60'
            }`}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Status Filter</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings table */}
      <div className={`${cardCls} overflow-hidden p-0 border border-slate-100 dark:border-slate-800`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <th className="py-3.5 px-6">Ticket ID</th>
                <th className="py-3.5 px-6">Trip Name</th>
                <th className="py-3.5 px-6">Hiker Details</th>
                <th className="py-3.5 px-6">Departure Date</th>
                <th className="py-3.5 px-6">Amount Paid</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${
              darkMode ? 'divide-slate-850' : 'divide-slate-100'
            }`}>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.bookingId || b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    
                    {/* Booking ID */}
                    <td className="py-4 px-6 text-[#F27D26] font-mono">
                      {b.bookingId || 'SH-DEMO'}
                    </td>

                    {/* Trip Name */}
                    <td className="py-4 px-6 max-w-64 truncate">
                      <div className="flex flex-col">
                        <span className="font-bold">{b.tripName}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{b.organizerName}</span>
                      </div>
                    </td>

                    {/* Hiker Info */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span>{b.userName || 'Active User'}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{b.userEmail || 'user@example.com'}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6">
                      {b.selectedDate}
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-6 font-display font-black">
                      ₹{parseFloat(b.finalAmount).toLocaleString('en-IN')}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                        b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                        b.status === 'Upcoming' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {b.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>

                      {b.status === 'Upcoming' && (
                        <button
                          onClick={() => handleCancelBooking(b.bookingId || b.id)}
                          className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                          title="Cancel Slot"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            {/* Header info */}
            <div className="pb-5 mb-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <FileText className="text-[#F27D26] bg-orange-500/10 p-2 rounded-xl shrink-0" size={36} />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Booking Receipt</span>
                <h3 className="font-display font-black text-base mt-1">{selectedBooking.bookingId || 'SH-DEMO-R'}</h3>
              </div>
            </div>

            {/* Details content */}
            <div className="space-y-4 text-xs font-semibold">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Trip Name</span>
                <span className="text-sm font-bold block">{selectedBooking.tripName}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Guide: {selectedBooking.organizerName}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Traveler</span>
                  <span>{selectedBooking.userName || 'Active User'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Email</span>
                  <span>{selectedBooking.userEmail || 'user@example.com'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Date Selected</span>
                  <span>{selectedBooking.selectedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Hikers Count</span>
                  <span>{selectedBooking.hikersCount} Pax</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Platform Commission ({selectedBooking.commissionRate || 10}%)</span>
                  <span className="text-pink-500 font-bold">₹{(selectedBooking.commissionAmount || (selectedBooking.finalAmount * 0.1)).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Organizer Payout</span>
                  <span className="text-emerald-500 font-bold">₹{(selectedBooking.finalAmount - (selectedBooking.commissionAmount || (selectedBooking.finalAmount * 0.1))).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm font-black">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Amount Paid</span>
                  <span className="text-base text-[#F27D26] font-display">₹{parseFloat(selectedBooking.finalAmount).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Booking Status</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                    selectedBooking.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                    selectedBooking.status === 'Upcoming' ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
