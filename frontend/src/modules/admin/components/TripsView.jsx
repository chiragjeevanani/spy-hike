import React, { useState, useEffect } from 'react';
import { Search, Pause, Play, Trash2, MapPin, Star, TrendingUp, Clock, Eye } from 'lucide-react';
import tripsApi from '../../../lib/tripsApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';
import { AdminSkeletonCard } from './AdminSkeleton';
import { durationRange } from '../../../utils/rangeFormat';

export default function TripsView({ onOpenOrganizer, onOpenTrip, darkMode }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [diffFilter, setDiffFilter] = useState('All');
  const [featuredFilter, setFeaturedFilter] = useState('All');
  const [popularFilter, setPopularFilter] = useState('All');
  const [statusTarget, setStatusTarget] = useState(null); // { id, nextStatus }
  const [deleteTarget, setDeleteTarget] = useState(null); // tripId
  const toast = useToast();

  const refresh = () => {
    setLoading(true);
    return tripsApi.listAllTrips()
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleToggleStatus = (tripId, currentStatus) => {
    const nextStatus = currentStatus === 'Published' ? 'Paused' : 'Published';
    setStatusTarget({ id: tripId, nextStatus });
  };

  const confirmToggleStatus = async () => {
    const { id, nextStatus } = statusTarget;
    setStatusTarget(null);
    try {
      await tripsApi.adminSetTripStatus(id, nextStatus);
      await refresh();
      toast.success(`Trip ${nextStatus === 'Published' ? 'activated' : 'paused'}.`);
    } catch (err) {
      toast.error(err?.message || 'Could not change trip status.');
    }
  };

  const handleToggleFeatured = async (trip) => {
    try {
      await tripsApi.adminSetTripFeatured(trip.id, !trip.featured);
      await refresh();
      toast.success(trip.featured ? 'Removed from featured trek.' : 'Marked as the featured trek!');
    } catch (err) {
      toast.error(err?.message || 'Could not update featured status.');
    }
  };

  const handleTogglePopular = async (trip) => {
    try {
      await tripsApi.adminSetTripPopular(trip.id, !trip.popular);
      await refresh();
      toast.success(trip.popular ? 'Removed from Popular Treks.' : 'Added to Popular Treks!');
    } catch (err) {
      toast.error(err?.message || 'Could not update popular status.');
    }
  };

  const handleDelete = (tripId) => setDeleteTarget(tripId);

  const confirmDelete = async () => {
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await tripsApi.adminDeleteTrip(id);
      await refresh();
      toast.success('Trip deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete trip.');
    }
  };

  const filteredTrips = trips.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                        t.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchDiff = diffFilter === 'All' || t.difficulty === diffFilter;
    const matchFeatured = featuredFilter === 'All' || (featuredFilter === 'Featured' ? t.featured : !t.featured);
    const matchPopular = popularFilter === 'All' || (popularFilter === 'Popular' ? t.popular : !t.popular);
    return matchSearch && matchStatus && matchDiff && matchFeatured && matchPopular;
  });

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode 
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' 
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">All Trips</h1>
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">Manage and moderate trips posted by organizers. Mark a trip Featured to headline it, or Popular to include it in the "Popular Treks" strip on the customer app's home page.</p>
      </div>

      {/* Filters bar */}
      <div className={`${cardCls} py-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by trip name or state..."
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
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Paused">Paused</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Difficulty</span>
            <select
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Difficult">Difficult</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Featured</span>
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">All Trips</option>
              <option value="Featured">Featured Only</option>
              <option value="Not Featured">Not Featured</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Popular</span>
            <select
              value={popularFilter}
              onChange={(e) => setPopularFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">All Trips</option>
              <option value="Popular">Popular Only</option>
              <option value="Not Popular">Not Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trips list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            <AdminSkeletonCard darkMode={darkMode} />
            <AdminSkeletonCard darkMode={darkMode} />
            <AdminSkeletonCard darkMode={darkMode} />
            <AdminSkeletonCard darkMode={darkMode} />
            <AdminSkeletonCard darkMode={darkMode} />
            <AdminSkeletonCard darkMode={darkMode} />
          </>
        ) : filteredTrips.length === 0 ? (
          <div className={`${cardCls} col-span-3 text-center py-12 text-slate-400`}>
            No trips matching criteria found.
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <div key={trip.id} className={`${cardCls} p-0 overflow-hidden flex flex-col`}>
              
              {/* Cover image wrapper */}
              <div className="relative h-44 shrink-0 cursor-pointer group" onClick={() => onOpenTrip?.(trip.id)}>
                <img
                  src={trip.coverImage}
                  alt={trip.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Status indicator badge */}
                <span className={`absolute top-4 left-4 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow ${
                  trip.status === 'Published' ? 'bg-emerald-500' :
                  trip.status === 'Paused' ? 'bg-amber-500' : 'bg-slate-500'
                }`}>
                  {trip.status}
                </span>

                {/* Difficulty badge */}
                <span className={`absolute top-4 right-4 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow ${
                  trip.difficulty === 'Difficult' ? 'bg-rose-500' :
                  trip.difficulty === 'Moderate' ? 'bg-orange-500' : 'bg-emerald-500'
                }`}>
                  {trip.difficulty}
                </span>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                {trip.featured && (
                  <span className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full text-white shadow bg-amber-500" title="Featured trek">
                    <Star size={11} className="fill-white" />
                  </span>
                )}

                {trip.popular && (
                  <span className="absolute bottom-3 right-4 flex items-center justify-center w-6 h-6 rounded-full text-white shadow bg-indigo-500" title="Popular trek">
                    <TrendingUp size={11} />
                  </span>
                )}

                {/* Location text overlay */}
                <div className="absolute bottom-3 left-4 flex items-center gap-1 text-white text-xs font-bold">
                  <MapPin size={12} className="text-[#F27D26]" />
                  <span className="truncate max-w-64">{trip.location}</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3
                    onClick={() => onOpenTrip?.(trip.id)}
                    className="text-sm font-black uppercase tracking-wide line-clamp-1 cursor-pointer hover:text-[#F27D26] transition-colors"
                  >
                    {trip.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold block mt-1">
                    Organizer:{' '}
                    {trip.organizerEmail ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenOrganizer?.(trip.organizerEmail); }}
                        className="text-[#F27D26] hover:underline"
                      >
                        {trip.organizer?.name || trip.organizerEmail}
                      </button>
                    ) : (
                      trip.organizer?.name || 'Unknown'
                    )}
                  </span>
                  
                  {/* Seats count indicator */}
                  <div className="mt-3.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>Available Seats</span>
                      <span>{trip.availableSeats} / {trip.maxGroupSize} left</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#F27D26] rounded-full transition-all duration-300"
                        style={{ width: `${(trip.availableSeats / trip.maxGroupSize) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Specs row & pricing */}
                <div className="flex justify-between items-center py-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3.5 text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{durationRange(trip)} Days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span>{trip.rating || 'New'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold block leading-none">Price per seat</span>
                    <span className="text-base font-black text-[#F27D26] font-display">₹{trip.price}</span>
                  </div>
                </div>

                {/* Moderate buttons */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => onOpenTrip?.(trip.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500"
                  >
                    <Eye size={12} />
                    <span>View Details</span>
                  </button>

                  <button
                    onClick={() => handleToggleFeatured(trip)}
                    className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1 transition-all ${
                      trip.featured
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-amber-100 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                    }`}
                    title={trip.featured ? 'Remove as featured trek' : 'Mark as featured trek'}
                  >
                    <Star size={12} className={trip.featured ? 'fill-white' : ''} />
                  </button>

                  <button
                    onClick={() => handleTogglePopular(trip)}
                    className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1 transition-all ${
                      trip.popular
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-indigo-100 dark:border-indigo-500/20 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                    }`}
                    title={trip.popular ? 'Remove from Popular Treks' : 'Add to Popular Treks'}
                  >
                    <TrendingUp size={12} />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(trip.id, trip.status)}
                    className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1 transition-all ${
                      trip.status === 'Published'
                        ? 'border-amber-100 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                        : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    }`}
                  >
                    {trip.status === 'Published' ? <Pause size={12} /> : <Play size={12} />}
                    <span>{trip.status === 'Published' ? 'Pause' : 'Activate'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(trip.id)}
                    className="p-2 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

              </div>

            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!statusTarget}
        title="Change Trip Status?"
        message={statusTarget ? `Change status to "${statusTarget.nextStatus}" for this trip?` : ''}
        confirmLabel="Confirm"
        tone="default"
        onConfirm={confirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Trip Listing?"
        message="This permanently removes this trip listing. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        darkMode={darkMode}
      />

    </div>
  );
}
