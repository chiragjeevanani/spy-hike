import React from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, Users, CalendarCheck, Star, Map, ArrowRight, Plus,
  Eye, ChevronRight, Bell, Megaphone, Gift, ScanBarcode, MessageCircle,
  Calendar, ShieldCheck, Wallet, TicketPercent
} from 'lucide-react';
import { loadLoyaltyConfig, getOrganizerProgress } from '../../../utils/loyalty';

export default function OrgDashboardView({
  organizer,
  trips,
  bookings,
  notifications,
  chats = [],
  onNavigate,
  onViewTrip,
  onOpenLoyalty,
  onOpenFinancials,
  onOpenScanner,
  onOpenChats,
  onApproveReschedule,
  onRejectReschedule,
  darkMode
}) {
  const loyaltyConfig = loadLoyaltyConfig();
  const loyaltyProgress = getOrganizerProgress(organizer?.totalBookings || 0, loyaltyConfig);
  const showLoyaltyBanner = loyaltyConfig.organizer.enabled && loyaltyConfig.organizer.banner.enabled;
  const activeBookings = bookings.filter(b => b.status === 'Upcoming' || b.status === 'Completed');
  const grossRevenue = activeBookings.reduce((s, b) => s + (b.finalAmount || 0), 0);
  const totalCommission = activeBookings.reduce((s, b) => {
    const commission = b.commissionAmount !== undefined ? b.commissionAmount : (b.finalAmount * 0.1);
    return s + commission;
  }, 0);
  const netRevenue = grossRevenue - totalCommission;

  const upcomingBookings = bookings.filter(b => b.status === 'Upcoming');
  const publishedTrips = trips.filter(t => t.status === 'Published');
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const unreadChats = chats.reduce((s, c) => s + (c.messages || []).filter(m => m.sender === 'user' && !m.read).length, 0);

  const statCards = [
    { label: 'Net Revenue', sub: `Gross: ₹${grossRevenue.toLocaleString('en-IN')}`, value: `₹${netRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20', onClick: onOpenFinancials },
    { label: 'Live Expeditions', sub: `${trips.length} Total Registered`, value: publishedTrips.length, icon: Map, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/20', onClick: () => onNavigate('Trips') },
    { label: 'Upcoming Slots', sub: 'Booked Hikers', value: upcomingBookings.length, icon: CalendarCheck, color: 'text-spy-orange', bg: 'bg-spy-orange/10', border: 'border-spy-orange/20', onClick: () => onNavigate('Bookings') },
    { label: 'Organizer Rating', sub: 'Hiker Reviews', value: organizer?.rating ? organizer.rating.toFixed(1) : '5.0', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-500/20' },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className={`flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 sm:space-y-8">

        {/* Top Greeting & Header Bar */}
        <div className={`rounded-3xl p-5 sm:p-7 border relative overflow-hidden transition-colors ${
          darkMode
            ? 'bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-900/90 border-white/10'
            : 'bg-gradient-to-r from-orange-50/70 via-white to-orange-50/50 border-orange-200/60 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold tracking-widest uppercase ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {greeting()},
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={12} /> Verified Agency Partner
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight leading-tight">
                {organizer?.agencyName || organizer?.name || 'Partner'}
              </h1>
              <p className={`text-xs sm:text-sm mt-1 max-w-xl leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Monitor your expedition bookings, route availability, ticket redemptions, and net revenue settlements.
              </p>
            </div>

            {/* Header Quick Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('NewTrip')}
                className="flex items-center gap-2 bg-spy-orange hover:bg-[#d96d1a] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-spy-orange/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={16} /> Post New Trip
              </button>

              <button
                type="button"
                onClick={onOpenScanner}
                className={`p-2.5 rounded-2xl border transition cursor-pointer active:scale-95 ${
                  darkMode ? 'bg-zinc-800/80 border-white/10 hover:bg-zinc-800' : 'bg-white border-zinc-200 shadow-xs hover:bg-zinc-50'
                }`}
                title="Scan QR Ticket"
              >
                <ScanBarcode size={18} className="text-spy-orange" />
              </button>

              <div className="relative md:hidden">
                <button
                  type="button"
                  onClick={onOpenChats}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer active:scale-95 ${
                    darkMode ? 'bg-zinc-800/80 border-white/10 hover:bg-zinc-800' : 'bg-white border-zinc-200 shadow-xs hover:bg-zinc-50'
                  }`}
                  title="Messages"
                >
                  <MessageCircle size={18} className={darkMode ? 'text-white/70' : 'text-zinc-600'} />
                </button>
                {unreadChats > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-spy-orange text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-950">
                    {unreadChats}
                  </span>
                )}
              </div>

              <div className="relative md:hidden">
                <button
                  type="button"
                  onClick={() => onNavigate('Notifications')}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer active:scale-95 ${
                    darkMode ? 'bg-zinc-800/80 border-white/10 hover:bg-zinc-800' : 'bg-white border-zinc-200 shadow-xs hover:bg-zinc-50'
                  }`}
                  title="Notifications"
                >
                  <Bell size={18} className={darkMode ? 'text-white/70' : 'text-zinc-600'} />
                </button>
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-spy-orange text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-950">
                    {unreadNotifs}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Complete Profile Warning Banner */}
        {(!organizer?.supportEmail || !organizer?.supportPhone || !organizer?.headline) && (
          <div className={`p-4 sm:p-5 rounded-3xl text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs border ${
            darkMode ? 'bg-amber-500/10 border-amber-500/25 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="space-y-1">
              <h3 className="font-display font-black text-sm uppercase tracking-wide flex items-center gap-1.5">
                Complete Agency Profile
              </h3>
              <p className="opacity-85 text-xs sm:text-sm">Please fill in your support email, phone, and agency headline to display certified badges on public trek listings.</p>
            </div>
            <button
              type="button"
              id="btn-complete-profile-dashboard"
              onClick={() => onNavigate('Profile', { edit: true })}
              className="self-start sm:self-center px-4.5 py-2.5 bg-spy-orange hover:bg-[#d96d1a] text-white rounded-xl font-bold transition-all text-xs active:scale-95 shadow-md shadow-spy-orange/20 cursor-pointer shrink-0"
            >
              Complete Now
            </button>
          </div>
        )}

        {/* 4-Column Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            const Tag = s.onClick ? motion.button : motion.div;
            return (
              <Tag
                key={s.label}
                type={s.onClick ? 'button' : undefined}
                id={s.onClick ? `btn-org-stat-${i}` : undefined}
                onClick={s.onClick}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={s.onClick ? { scale: 0.98 } : undefined}
                className={`rounded-3xl p-4 sm:p-5 text-left border transition-all ${
                  s.onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
                } ${darkMode ? `bg-zinc-900/80 ${s.border} hover:bg-zinc-900` : 'bg-white border-zinc-200/80 shadow-xs hover:shadow-sm'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.bg}`}>
                    <Icon size={20} className={s.color} />
                  </div>
                  {s.onClick && (
                    <ChevronRight size={14} className="opacity-30" />
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-display font-black tracking-tight">{s.value}</div>
                <div className={`text-xs font-bold mt-1 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{s.label}</div>
                <div className={`text-[11px] mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.sub}</div>
              </Tag>
            );
          })}
        </div>

        {/* 2-Column Responsive Dashboard Layout on Desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start space-y-6 lg:space-y-0">
          {/* Main Area: Column 8 */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">

            {/* Pending Reschedule Requests */}
            {bookings.some(b => b.rescheduleStatus === 'Pending') && (
              <div className={`p-5 rounded-3xl border space-y-4 shadow-sm ${
                darkMode ? 'bg-zinc-900/90 border-amber-500/30' : 'bg-amber-50/80 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-500">
                    <Calendar size={18} />
                    <h3 className="font-display font-black text-sm uppercase tracking-wide">
                      Pending Reschedule Requests ({bookings.filter(b => b.rescheduleStatus === 'Pending').length})
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {bookings.filter(b => b.rescheduleStatus === 'Pending').map(b => (
                    <div key={b.id || b.bookingId} className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                      darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm leading-tight">{b.userName} <span className="text-xs opacity-60 font-mono">({b.bookingId})</span></p>
                          <p className="text-xs opacity-75 mt-0.5">{b.tripName}</p>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          {b.selectedDate} → {b.requestedDate}
                        </span>
                      </div>

                      {b.rescheduleReason && (
                        <p className={`text-xs italic p-2 rounded-xl border ${darkMode ? 'bg-zinc-900/60 border-white/5 text-zinc-300' : 'bg-zinc-50 border-zinc-100 text-zinc-600'}`}>
                          "{b.rescheduleReason}"
                        </p>
                      )}

                      <div className="flex gap-2.5 pt-1">
                        <button
                          onClick={() => onApproveReschedule?.(b.id || b.bookingId)}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                        >
                          Approve Date
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Please enter the rejection reason for the hiker:', 'No batch availability on requested date');
                            if (reason !== null) {
                              onRejectReschedule?.(b.id || b.bookingId, reason);
                            }
                          }}
                          className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer ${
                            darkMode ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20' : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                          }`}
                        >
                          Reject Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loyalty rewards banner */}
            {showLoyaltyBanner && (
              <motion.button
                type="button"
                id="btn-open-loyalty-dashboard"
                onClick={onOpenLoyalty}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full h-36 rounded-3xl overflow-hidden shadow-lg text-left cursor-pointer border border-white/10 group"
              >
                {loyaltyConfig.organizer.banner.image ? (
                  <img src={loyaltyConfig.organizer.banner.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-800 via-indigo-950 to-zinc-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 sm:p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="bg-spy-orange text-white text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase flex items-center gap-1.5 shadow-sm">
                      <Gift size={12} /> Partner Milestone Reward
                    </span>
                    <ChevronRight size={18} className="text-white/80 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-black text-white leading-tight">
                      {loyaltyConfig.organizer.banner.title}
                    </h3>
                    <p className="text-xs text-white/80 mt-0.5">{loyaltyConfig.organizer.banner.subtitle}</p>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                        <div className="h-full bg-spy-orange rounded-full transition-all duration-700" style={{ width: `${loyaltyProgress.percent}%` }} />
                      </div>
                      <span className="text-xs font-bold text-white shrink-0">
                        {loyaltyProgress.withinCycle}/{loyaltyProgress.threshold} Bookings
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            )}

            {/* My Trips Preview (Responsive Grid) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-display font-black tracking-tight">Active Expeditions</h2>
                  <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Treks currently available for hiker reservations</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('Trips')}
                  className="text-spy-orange hover:text-[#d96d1a] text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  See all ({trips.length}) <ChevronRight size={14} />
                </button>
              </div>

              {trips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trips.slice(0, 4).map((trip, i) => (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => onViewTrip(trip)}
                      className={`rounded-3xl overflow-hidden flex flex-col border cursor-pointer hover:shadow-md transition-all group ${
                        darkMode ? 'bg-zinc-900/80 border-white/10 hover:border-white/20' : 'bg-white border-zinc-200/80 shadow-xs hover:border-zinc-300'
                      }`}
                    >
                      <div className="relative h-32 w-full overflow-hidden">
                        <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          trip.status === 'Published' ? 'bg-emerald-500/90 text-white' :
                          trip.status === 'Draft' ? 'bg-zinc-700/90 text-zinc-200' :
                          'bg-amber-500/90 text-white'
                        }`}>
                          {trip.status}
                        </span>
                        <span className="absolute top-2.5 right-2.5 text-xs font-black px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white">
                          ₹{trip.price?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold leading-tight group-hover:text-spy-orange transition-colors">{trip.name}</h4>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{trip.location}</p>
                        </div>
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[11px] opacity-75">
                          <span>{trip.difficulty || 'Moderate'}</span>
                          <span>{trip.availableSeats || 15} seats left</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={`rounded-3xl p-8 text-center border-2 border-dashed ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                  <Megaphone size={40} className="mx-auto mb-3 text-spy-orange/60" />
                  <p className="font-bold text-base mb-1">No trips posted yet</p>
                  <p className={`text-xs mb-4 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Create your first trip listing to start receiving bookings</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('NewTrip')}
                    className="inline-flex items-center gap-2 bg-spy-orange text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-2xl active:scale-95 shadow-md shadow-spy-orange/20 cursor-pointer"
                  >
                    <Plus size={16} /> Post First Trip
                  </button>
                </div>
              )}
            </div>

            {/* Upcoming Bookings Preview */}
            {upcomingBookings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-display font-black tracking-tight">Recent Bookings</h2>
                    <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Hikers awaiting upcoming departures</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('Bookings')}
                    className="text-spy-orange hover:text-[#d96d1a] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    All Bookings ({bookings.length}) <ChevronRight size={14} />
                  </button>
                </div>

                <div className="space-y-3">
                  {upcomingBookings.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onNavigate('Bookings')}
                      className={`rounded-2xl p-4 flex items-center justify-between border cursor-pointer transition-all hover:shadow-xs ${
                        darkMode ? 'bg-zinc-900/80 border-white/10 hover:border-white/20' : 'bg-white border-zinc-200/80 shadow-xs hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                          darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {(b.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-tight">{b.userName}</p>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {b.tripName} · {b.hikersCount} hiker{b.hikersCount > 1 ? 's' : ''} · {b.selectedDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-spy-orange text-sm font-black block">₹{b.finalAmount?.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] font-mono opacity-50">{b.bookingId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Area: Column 4 */}
          <div className="lg:col-span-4 space-y-6">

            {/* Quick Actions Panel */}
            <div className={`rounded-3xl p-5 sm:p-6 border shadow-xs ${
              darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80'
            }`}>
              <h3 className="text-xs font-black tracking-widest uppercase mb-4 opacity-70">
                Partner Quick Actions
              </h3>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('NewTrip')}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-spy-orange hover:bg-[#d96d1a] text-white font-bold text-xs sm:text-sm shadow-md shadow-spy-orange/20 transition cursor-pointer active:scale-98"
                >
                  <span className="flex items-center gap-2.5">
                    <Plus size={16} /> Post New Expedition
                  </span>
                  <ChevronRight size={14} className="opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('Bookings')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm border transition cursor-pointer active:scale-98 ${
                    darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <CalendarCheck size={16} className="text-spy-orange" /> View All Bookings
                  </span>
                  <ChevronRight size={14} className="opacity-40" />
                </button>

                <button
                  type="button"
                  onClick={onOpenScanner}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm border transition cursor-pointer active:scale-98 ${
                    darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <ScanBarcode size={16} className="text-blue-400" /> Verify Ticket QR
                  </span>
                  <ChevronRight size={14} className="opacity-40" />
                </button>

                <button
                  type="button"
                  onClick={onOpenFinancials}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm border transition cursor-pointer active:scale-98 ${
                    darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Wallet size={16} className="text-emerald-400" /> Bank Payouts & Settlement
                  </span>
                  <ChevronRight size={14} className="opacity-40" />
                </button>

                <button
                  type="button"
                  onClick={onOpenChats}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs sm:text-sm border transition cursor-pointer active:scale-98 ${
                    darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-200' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <MessageCircle size={16} className="text-amber-400" /> Customer Inquiries
                  </span>
                  {unreadChats > 0 ? (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-spy-orange text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadChats}
                    </span>
                  ) : (
                    <ChevronRight size={14} className="opacity-40" />
                  )}
                </button>
              </div>
            </div>

            {/* Financials Overview Card */}
            <div className={`rounded-3xl p-5 sm:p-6 border shadow-xs space-y-4 ${
              darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black tracking-widest uppercase opacity-70">
                  Settlement Snapshot
                </h3>
                <button
                  type="button"
                  onClick={onOpenFinancials}
                  className="text-spy-orange hover:underline text-xs font-bold"
                >
                  Details
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-70">Gross Bookings Cleared</span>
                  <span className="font-mono font-bold">₹{grossRevenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-70">Platform Fee (10%)</span>
                  <span className="font-mono font-bold text-rose-500">-₹{totalCommission.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-bold">
                  <span>Net Disbursable</span>
                  <span className="text-emerald-400 font-mono font-black text-base">₹{netRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Safety & Compliance Badge Card */}
            <div className={`rounded-3xl p-5 border text-xs leading-relaxed space-y-2 ${
              darkMode ? 'bg-forest-900/20 border-forest-500/30 text-zinc-300' : 'bg-emerald-50/70 border-emerald-200 text-zinc-700'
            }`}>
              <div className="flex items-center gap-2 font-bold text-forest-500">
                <ShieldCheck size={16} /> Certified Expeditions Standard
              </div>
              <p className="opacity-80">
                All scheduled batch departures must adhere to state alpine safety protocols and permit verification.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
