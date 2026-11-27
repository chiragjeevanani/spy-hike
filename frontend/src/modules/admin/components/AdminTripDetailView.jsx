import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, MapPin, Clock, Mountain, Route, Users, Star, TrendingUp, Pause, Play, Trash2,
  CalendarDays, IndianRupee, Ticket, CheckCircle2, XCircle, ShieldCheck, FileText, HelpCircle,
  Image as ImageIcon, Compass, BadgeCheck,
} from 'lucide-react';
import tripsApi from '../../../lib/tripsApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';
import { durationRange, distanceRange } from '../../../utils/rangeFormat';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const BOOKING_STATUS_CLS = {
  Upcoming: 'bg-blue-500/10 text-blue-500',
  Ongoing: 'bg-amber-500/10 text-amber-500',
  Completed: 'bg-emerald-500/10 text-emerald-500',
  Missed: 'bg-slate-500/10 text-slate-400',
  Cancelled: 'bg-rose-500/10 text-rose-500',
};

export default function AdminTripDetailView({ tripId, onBack, onOpenOrganizer, onOpenUser, darkMode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    return tripsApi.adminGetTrip(tripId)
      .then((res) => { setData(res); setLoadError(null); })
      .catch((err) => setLoadError(err?.message || 'Could not load trip.'))
      .finally(() => setLoading(false));
  }, [tripId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const cardCls = `p-5 rounded-2xl border shadow-sm ${
    darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
  }`;
  const labelCls = 'text-[10px] text-slate-400 font-bold uppercase tracking-wider';
  const sectionTitle = (Icon, text) => (
    <h2 className="flex items-center gap-2 text-sm font-black mb-3.5">
      <Icon size={15} className="text-[#F27D26]" /> {text}
    </h2>
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar animate-pulse">
        <div className={`h-10 w-64 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <div className={`h-72 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className={`h-20 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />)}
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <Compass size={40} className="text-slate-300" />
        <p className="text-sm font-bold text-slate-400 text-center max-w-md">{loadError || 'Trip not found. It may have been deleted.'}</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl bg-[#F27D26] text-white text-xs font-bold">Back to Trips</button>
      </div>
    );
  }

  const { trip, departures = [], stats = {}, recentBookings = [] } = data;
  const images = [trip.coverImage, ...(trip.galleryImages || [])].filter(Boolean);
  const heroImage = activeImage || images[0];
  const seatPct = trip.maxGroupSize ? Math.round((trip.availableSeats / trip.maxGroupSize) * 100) : 0;

  const runAction = async (fn, success) => {
    try {
      await fn();
      await load();
      toast.success(success);
    } catch (err) {
      toast.error(err?.message || 'Action failed.');
    }
  };

  const confirmStatus = () => {
    const next = statusTarget;
    setStatusTarget(null);
    runAction(() => tripsApi.adminSetTripStatus(trip.id, next), `Trip ${next === 'Published' ? 'activated' : 'paused'}.`);
  };

  const confirmDelete = async () => {
    setShowDelete(false);
    try {
      await tripsApi.adminDeleteTrip(trip.id);
      toast.success('Trip deleted.');
      onBack();
    } catch (err) {
      toast.error(err?.message || 'Could not delete trip.');
    }
  };

  const listSection = (Icon, title, items, ItemIcon, iconCls) => items?.length > 0 && (
    <div className={cardCls}>
      {sectionTitle(Icon, title)}
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
            <ItemIcon size={13} className={`shrink-0 mt-0.5 ${iconCls}`} /> <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

      {/* Header bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={onBack} className={`p-2 rounded-xl border transition-all shrink-0 ${darkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white ${
                trip.status === 'Published' ? 'bg-emerald-500' : trip.status === 'Paused' ? 'bg-amber-500' : 'bg-slate-500'
              }`}>{trip.status}</span>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white ${
                trip.difficulty === 'Difficult' ? 'bg-rose-500' : trip.difficulty === 'Moderate' ? 'bg-orange-500' : 'bg-emerald-500'
              }`}>{trip.difficulty}</span>
              {trip.category && <span className="text-[10px] text-[#F27D26] font-black uppercase tracking-wider">{trip.category}</span>}
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white mt-1.5">{trip.name}</h1>
            <p className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1">
              <MapPin size={12} /> {trip.location}{trip.state && !trip.location?.includes(trip.state) ? `, ${trip.state}` : ''}
              <span className="mx-1.5">·</span> ID: <span className="font-mono">{trip.id}</span>
            </p>
          </div>
        </div>

        {/* Moderation actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => runAction(() => tripsApi.adminSetTripFeatured(trip.id, !trip.featured), trip.featured ? 'Removed from featured trek.' : 'Marked as the featured trek!')}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              trip.featured ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
            }`}
          >
            <Star size={12} className={trip.featured ? 'fill-white' : ''} /> {trip.featured ? 'Featured' : 'Feature'}
          </button>
          <button
            onClick={() => runAction(() => tripsApi.adminSetTripPopular(trip.id, !trip.popular), trip.popular ? 'Removed from Popular Treks.' : 'Added to Popular Treks!')}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              trip.popular ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-indigo-200 dark:border-indigo-500/20 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
            }`}
          >
            <TrendingUp size={12} /> {trip.popular ? 'Popular' : 'Mark Popular'}
          </button>
          <button
            onClick={() => setStatusTarget(trip.status === 'Published' ? 'Paused' : 'Published')}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              trip.status === 'Published'
                ? 'border-amber-200 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                : 'border-emerald-200 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
            }`}
          >
            {trip.status === 'Published' ? <Pause size={12} /> : <Play size={12} />}
            {trip.status === 'Published' ? 'Pause' : 'Activate'}
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Ticket, label: 'Bookings', value: stats.totalBookings ?? 0, sub: stats.cancelledBookings ? `${stats.cancelledBookings} cancelled` : 'No cancellations' },
          { icon: Users, label: 'Travelers', value: stats.travelers ?? 0, sub: 'Excluding cancelled' },
          { icon: IndianRupee, label: 'Revenue', value: inr(stats.revenue), sub: 'Gross, excl. cancelled' },
          { icon: Star, label: 'Rating', value: trip.rating ? trip.rating.toFixed(1) : 'New', sub: `${trip.reviewsCount || 0} reviews` },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className={`${cardCls} flex items-center gap-3.5`}>
            <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <span className={labelCls}>{label}</span>
              <div className="text-lg font-black font-display leading-tight">{value}</div>
              <span className="text-[10px] text-slate-400 font-semibold">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Main column */}
        <div className="xl:col-span-2 space-y-6">

          {/* Gallery */}
          <div className={`${cardCls} p-3`}>
            <div className="relative h-72 sm:h-80 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900">
              {heroImage
                ? <img src={heroImage} alt={trip.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={32} /></div>}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(src)}
                    className={`w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${heroImage === src ? 'border-[#F27D26]' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Overview */}
          <div className={cardCls}>
            {sectionTitle(FileText, 'Overview')}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              {[
                { icon: Clock, label: 'Duration', value: `${durationRange(trip)} Days` },
                { icon: Route, label: 'Distance', value: distanceRange(trip) ? `${distanceRange(trip)} km` : 'N/A' },
                { icon: Mountain, label: 'Elevation', value: trip.elevationMeters ? `${trip.elevationMeters.toLocaleString('en-IN')} m` : 'N/A' },
                { icon: Users, label: 'Group Size', value: trip.maxGroupSize ? `Up to ${trip.maxGroupSize}` : 'N/A' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <span className={`${labelCls} flex items-center gap-1`}><Icon size={11} /> {label}</span>
                  <span className="text-sm font-black block mt-1">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400 whitespace-pre-line">
              {trip.description || 'No description provided.'}
            </p>
          </div>

          {/* Highlights */}
          {listSection(Star, 'Highlights', trip.highlights, CheckCircle2, 'text-[#F27D26]')}

          {/* Itinerary */}
          {trip.itinerary?.length > 0 && (
            <div className={cardCls}>
              {sectionTitle(CalendarDays, 'Day-by-Day Itinerary')}
              <ol className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-5">
                {trip.itinerary.map((day, idx) => (
                  <li key={idx} className="pl-5 relative">
                    <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-[#F27D26] text-white text-[10px] font-black flex items-center justify-center">
                      {day.day || idx + 1}
                    </span>
                    <h3 className="text-xs font-black">{day.title}</h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed">{day.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Inclusions */}
          {(trip.included?.length > 0 || trip.notIncluded?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listSection(CheckCircle2, "What's Included", trip.included, CheckCircle2, 'text-emerald-500')}
              {listSection(XCircle, 'Not Included', trip.notIncluded, XCircle, 'text-rose-500')}
            </div>
          )}

          {/* Policies */}
          {listSection(ShieldCheck, 'Safety Guidelines', trip.safetyGuidelines, ShieldCheck, 'text-blue-500')}
          {listSection(FileText, 'Cancellation Policy', trip.cancellationPolicy, FileText, 'text-slate-400')}

          {/* FAQs */}
          {trip.faqs?.length > 0 && (
            <div className={cardCls}>
              {sectionTitle(HelpCircle, 'FAQs')}
              <div className="space-y-3">
                {trip.faqs.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <p className="text-xs font-black">{f.question}</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent bookings */}
          <div className={cardCls}>
            {sectionTitle(Ticket, 'Recent Bookings')}
            {recentBookings.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold py-4 text-center">No bookings yet for this trip.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={`${labelCls} text-left`}>
                      <th className="px-1 pb-2 font-bold">Booking</th>
                      <th className="px-1 pb-2 font-bold">Hiker</th>
                      <th className="px-1 pb-2 font-bold">Departure</th>
                      <th className="px-1 pb-2 font-bold text-center">Pax</th>
                      <th className="px-1 pb-2 font-bold text-right">Amount</th>
                      <th className="px-1 pb-2 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => (
                      <tr key={b.bookingId} className="border-t border-slate-100 dark:border-slate-800 font-semibold">
                        <td className="px-1 py-2.5 font-mono text-[11px]">{b.bookingId}</td>
                        <td className="px-1 py-2.5">
                          {b.userEmail && onOpenUser ? (
                            <button onClick={() => onOpenUser(b.userEmail)} className="text-[#F27D26] hover:underline text-left">{b.userName || b.userEmail}</button>
                          ) : (b.userName || '—')}
                        </td>
                        <td className="px-1 py-2.5 text-slate-400">{fmtDate(b.selectedDate)}</td>
                        <td className="px-1 py-2.5 text-center">{b.travelersCount || 0}</td>
                        <td className="px-1 py-2.5 text-right font-black">{inr(b.finalAmount)}</td>
                        <td className="px-1 py-2.5 text-right">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${BOOKING_STATUS_CLS[b.status] || BOOKING_STATUS_CLS.Missed}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">

          {/* Pricing */}
          <div className={cardCls}>
            {sectionTitle(IndianRupee, 'Pricing')}
            <span className={labelCls}>Starting from</span>
            <div className="text-3xl font-black font-display text-[#F27D26] leading-tight">{inr(trip.price)}</div>
            <span className="text-[10px] text-slate-400 font-semibold">per person</span>
            {trip.pricingTiers?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {trip.pricingTiers.map((t) => (
                  <div key={t.id || t.label} className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{t.label}</span>
                    <span className="font-black">{inr(t.price)}</span>
                  </div>
                ))}
              </div>
            )}
            {trip.pickup?.location && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
                <span className={labelCls}>Pickup</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><MapPin size={12} /> {trip.pickup.location}</span>
                  <span className="font-black">{inr(trip.pickup.price)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Organizer */}
          <div className={cardCls}>
            {sectionTitle(BadgeCheck, 'Organizer')}
            <div className="flex items-center gap-3">
              {trip.organizer?.avatar
                ? <img src={trip.organizer.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                : <div className="w-11 h-11 rounded-full bg-[#F27D26]/10 text-[#F27D26] font-black flex items-center justify-center">{(trip.organizer?.name || '?').charAt(0)}</div>}
              <div className="min-w-0">
                <p className="text-sm font-black flex items-center gap-1 truncate">
                  {trip.organizer?.name || 'Unknown'}
                  {trip.organizer?.verified && <BadgeCheck size={14} className="text-blue-500 shrink-0" />}
                </p>
                <p className="text-[11px] text-slate-400 font-semibold truncate">{trip.organizerEmail}</p>
                {trip.organizer?.rating ? (
                  <p className="text-[11px] font-bold flex items-center gap-1 mt-0.5"><Star size={11} className="text-amber-400 fill-amber-400" /> {trip.organizer.rating.toFixed(1)}</p>
                ) : null}
              </div>
            </div>
            {trip.organizerEmail && onOpenOrganizer && (
              <button
                onClick={() => onOpenOrganizer(trip.organizerEmail)}
                className={`w-full mt-4 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                View Organizer Profile
              </button>
            )}
          </div>

          {/* Seats & departures */}
          <div className={cardCls}>
            {sectionTitle(CalendarDays, 'Departures')}
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
              <span>Available Seats</span>
              <span>{trip.availableSeats ?? 0} / {trip.maxGroupSize ?? 0} left</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-[#F27D26] rounded-full" style={{ width: `${seatPct}%` }} />
            </div>
            {departures.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold mt-4">No departure dates scheduled.</p>
            ) : (
              <ul className="mt-4 space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {departures.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <span>{fmtDate(d.date)}</span>
                    {d.soldOut
                      ? <span className="text-[10px] font-black text-rose-500">SOLD OUT</span>
                      : <span className="text-slate-400">{d.availableSeats} / {d.totalSeats} seats</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Meta */}
          <div className={`${cardCls} text-xs font-semibold space-y-2`}>
            <div className="flex justify-between"><span className="text-slate-400">Created</span><span>{fmtDate(trip.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Last updated</span><span>{fmtDate(trip.updatedAt)}</span></div>
            {trip.startPoint?.label && (
              <div className="flex justify-between gap-3"><span className="text-slate-400 shrink-0">Start point</span><span className="text-right">{trip.startPoint.label}</span></div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!statusTarget}
        title="Change Trip Status?"
        message={statusTarget ? `Change status to "${statusTarget}" for this trip?` : ''}
        confirmLabel="Confirm"
        tone="default"
        onConfirm={confirmStatus}
        onCancel={() => setStatusTarget(null)}
        darkMode={darkMode}
      />
      <ConfirmDialog
        open={showDelete}
        title="Delete Trip Listing?"
        message="This permanently removes this trip listing. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDelete(false)}
        darkMode={darkMode}
      />
    </div>
  );
}
