import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, CalendarCheck, Star, Map, ArrowRight, Plus, Eye, ChevronRight, Bell, Megaphone, Gift, ScanBarcode, MessageCircle } from 'lucide-react';
import { loadLoyaltyConfig, getOrganizerProgress } from '../../../utils/loyalty';

export default function OrgDashboardView({ organizer, trips, bookings, notifications, chats = [], onNavigate, onViewTrip, onOpenLoyalty, onOpenFinancials, onOpenScanner, onOpenChats, darkMode }) {
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
    { label: `Net Revenue (Gross: ₹${grossRevenue.toLocaleString('en-IN')})`, value: `₹${netRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', onClick: onOpenFinancials },
    { label: 'Live Trips', value: publishedTrips.length, icon: Map, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Upcoming Slots', value: upcomingBookings.length, icon: CalendarCheck, color: 'text-spy-orange', bg: 'bg-spy-orange/10' },
    { label: 'Avg Rating', value: organizer?.rating ? organizer.rating.toFixed(1) : '—', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className={`flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      
      {/* Header */}
      <div className={`px-5 pt-5 pb-5 ${darkMode ? 'bg-gradient-to-b from-zinc-900/80 to-transparent' : 'bg-gradient-to-b from-orange-50 to-transparent'}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-semibold tracking-widest uppercase mb-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {greeting()},
            </p>
            <h1 className="text-xl font-display font-black tracking-tight leading-tight">
              {organizer?.agencyName || organizer?.name || 'Partner'}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className={`text-xs font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Verified Partner</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Scan ticket button */}
            <button
              type="button"
              onClick={onOpenScanner}
              className={`p-2.5 rounded-xl transition ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-white shadow-sm hover:shadow'}`}
              title="Scan ticket"
            >
              <ScanBarcode size={18} className="text-spy-orange" />
            </button>

            {/* Messages */}
            <div className="relative">
              <button
                type="button"
                onClick={onOpenChats}
                className={`p-2.5 rounded-xl transition ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-white shadow-sm hover:shadow'}`}
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

            <div className="relative">
              <button
                type="button"
                onClick={() => onNavigate('Notifications')}
                className={`p-2.5 rounded-xl transition ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-white shadow-sm hover:shadow'}`}
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

      <div className="px-5 space-y-5 pb-8">

        {/* Complete Profile banner */}
        {(!organizer?.supportEmail || !organizer?.supportPhone || !organizer?.headline) && (
          <div className={`p-4 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs border ${
            darkMode ? 'bg-amber-500/10 border-amber-500/25 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-850'
          }`}>
            <div className="space-y-1">
              <h3 className="font-display font-black text-sm uppercase tracking-wide">Complete Agency Profile</h3>
              <p className="opacity-80">Please fill in your support email, phone, and agency headline to display correctly on public trek listings.</p>
            </div>
            <button
              onClick={() => onNavigate('Profile')}
              className="self-start sm:self-center px-4 py-2 bg-spy-orange hover:bg-[#d96d1a] text-white rounded-xl font-bold transition-all text-[11px] active:scale-95 shadow-xs"
            >
              Complete Now
            </button>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            const Tag = s.onClick ? motion.button : motion.div;
            return (
              <Tag
                key={s.label}
                type={s.onClick ? 'button' : undefined}
                id={s.onClick ? 'btn-open-financials-dashboard' : undefined}
                onClick={s.onClick}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileTap={s.onClick ? { scale: 0.97 } : undefined}
                className={`rounded-2xl p-4 text-left ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                  <Icon size={18} className={s.color} />
                </div>
                <div className="text-xl font-display font-black tracking-tight">{s.value}</div>
                <div className={`text-xs font-medium mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.label}</div>
              </Tag>
            );
          })}
        </div>

        {/* Loyalty rewards banner — admin-uploaded image/copy + live progress */}
        {showLoyaltyBanner && (
          <motion.button
            type="button"
            id="btn-open-loyalty-dashboard"
            onClick={onOpenLoyalty}
            whileTap={{ scale: 0.99 }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full h-32 rounded-2xl overflow-hidden shadow-lg text-left cursor-pointer"
          >
            {loyaltyConfig.organizer.banner.image ? (
              <img src={loyaltyConfig.organizer.banner.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-zinc-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="bg-spy-orange text-white text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                  <Gift size={10} /> Partner Reward
                </span>
                <ChevronRight size={16} className="text-white/70" />
              </div>
              <div>
                <h3 className="text-sm font-display font-black text-white leading-tight">
                  {loyaltyConfig.organizer.banner.title}
                </h3>
                <p className="text-[11px] text-white/75 mt-0.5">{loyaltyConfig.organizer.banner.subtitle}</p>

                <div className="flex items-center gap-2 mt-2.5">
                  <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-spy-orange rounded-full transition-all duration-700" style={{ width: `${loyaltyProgress.percent}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-white shrink-0">
                    {loyaltyProgress.withinCycle}/{loyaltyProgress.threshold}
                  </span>
                </div>
              </div>
            </div>
          </motion.button>
        )}

        {/* Quick actions */}
        <div>
          <h2 className={`text-xs font-black tracking-widest uppercase mb-3 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('NewTrip')}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-spy-orange text-white font-bold text-sm shadow-lg shadow-spy-orange/20 active:scale-95 transition-all"
            >
              <Plus size={18} />
              Post New Trip
            </button>
            <button
              type="button"
              onClick={() => onNavigate('Bookings')}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold active:scale-95 transition-all border ${
                darkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-zinc-100 text-zinc-700 shadow-sm'
              }`}
            >
              <CalendarCheck size={18} className="text-spy-orange" />
              View Bookings
            </button>
          </div>
        </div>

        {/* My Trips preview */}
        {trips.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xs font-black tracking-widest uppercase ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>My Trips</h2>
              <button type="button" onClick={() => onNavigate('Trips')} className="text-spy-orange text-xs font-bold flex items-center gap-0.5">
                See all <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {trips.slice(0, 3).map((trip, i) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-2xl overflow-hidden flex cursor-pointer active:scale-[0.98] transition-all ${
                    darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'
                  }`}
                  onClick={() => onViewTrip(trip)}
                >
                  <img src={trip.coverImage} alt={trip.name} className="w-20 h-20 object-cover" />
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-bold leading-tight">{trip.name}</p>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{trip.location}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        trip.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' :
                        trip.status === 'Draft' ? 'bg-zinc-400/15 text-zinc-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>{trip.status}</span>
                      <span className="text-spy-orange text-xs font-bold">₹{trip.price?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming bookings preview */}
        {upcomingBookings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xs font-black tracking-widest uppercase ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Upcoming Bookings</h2>
              <button type="button" onClick={() => onNavigate('Bookings')} className="text-spy-orange text-xs font-bold flex items-center gap-0.5">
                All <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {upcomingBookings.slice(0, 3).map((b, i) => (
                <div key={b.id} className={`rounded-xl px-4 py-3 flex items-center justify-between ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                      {(b.userName || 'U').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{b.userName}</p>
                      <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{b.hikersCount} hiker{b.hikersCount > 1 ? 's' : ''} · {b.selectedDate}</p>
                    </div>
                  </div>
                  <span className="text-spy-orange text-xs font-black">₹{b.finalAmount?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for no trips */}
        {trips.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-6 text-center border-2 border-dashed ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}
          >
            <Megaphone size={36} className="mx-auto mb-3 text-spy-orange/60" />
            <p className="font-bold text-sm mb-1">No trips posted yet</p>
            <p className={`text-xs mb-4 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Create your first trip listing to start receiving bookings</p>
            <button
              type="button"
              onClick={() => onNavigate('NewTrip')}
              className="inline-flex items-center gap-2 bg-spy-orange text-white text-sm font-bold px-5 py-2.5 rounded-xl active:scale-95 transition-all"
            >
              <Plus size={16} /> Post First Trip
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
