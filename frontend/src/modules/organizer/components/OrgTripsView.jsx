import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Map, Pencil, Eye, Pause, Play, Trash2, Search, Filter, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { durationRange } from '../../../utils/rangeFormat';

export default function OrgTripsView({ trips, onNewTrip, onEditTrip, onToggleStatus, onDeleteTrip, darkMode }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 9; // Upgraded from 6 to 9 for a 3-column desktop grid

  const filters = ['All', 'Published', 'Draft', 'Paused'];

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const filtered = trips.filter(t => {
    const matchSearch = t.name?.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || t.status === filter;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedTrips = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const statusColor = (s) => {
    if (s === 'Published') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
    if (s === 'Draft') return 'bg-zinc-400/15 text-zinc-300 border border-zinc-400/25';
    return 'bg-amber-500/15 text-amber-400 border border-amber-500/25';
  };

  const difficultyColor = (d) => {
    if (d === 'Easy') return 'text-emerald-400';
    if (d === 'Moderate') return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className={`h-full flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight">Expeditions & Treks</h1>
            <p className={`text-xs sm:text-sm mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Manage {trips.length} active catalog listings, batch departure schedules, and hiker capacities
            </p>
          </div>
          <button
            type="button"
            onClick={onNewTrip}
            className="flex items-center gap-2 bg-spy-orange hover:bg-[#d96d1a] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg shadow-spy-orange/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} /> Post New Trip
          </button>
        </div>

        {/* Toolbar: Search and Status Filters */}
        <div className={`p-4 rounded-3xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs ${
          darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80'
        }`}>
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search expeditions by trek name, mountain state or trail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-2xl text-xs sm:text-sm border outline-none transition ${
                darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/50'
              }`}
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {filters.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-spy-orange text-white shadow-sm shadow-spy-orange/30'
                    : darkMode ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-white/10' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Trips Grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`rounded-3xl p-12 text-center border-2 border-dashed ${
                darkMode ? 'border-white/10' : 'border-zinc-200'
              }`}
            >
              <Map size={48} className="text-zinc-400 mx-auto mb-3" />
              <h3 className="font-bold text-base mb-1">No expeditions found</h3>
              <p className={`text-xs sm:text-sm mb-5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {search ? 'Try adjusting your search query or status filter' : 'Begin by publishing your verified mountain route'}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={onNewTrip}
                  className="inline-flex items-center gap-2 bg-spy-orange text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-2xl active:scale-95 shadow-md shadow-spy-orange/20 cursor-pointer"
                >
                  <Plus size={16} /> Post First Trip
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedTrips.map((trip, i) => (
                  <motion.div
                    key={trip.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    className={`rounded-3xl overflow-hidden flex flex-col border transition-all hover:shadow-md ${
                      darkMode ? 'bg-zinc-900/80 border-white/10 hover:border-white/20' : 'bg-white border-zinc-200/80 shadow-xs hover:border-zinc-300'
                    }`}
                  >
                    {/* Cover image banner */}
                    <div className="relative h-44 w-full overflow-hidden">
                      <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Status badge */}
                      <span className={`absolute top-3 left-3 text-[11px] font-black px-3 py-1 rounded-full ${statusColor(trip.status)}`}>
                        {trip.status}
                      </span>

                      {/* Price badge */}
                      <span className="absolute top-3 right-3 text-white text-xs font-black bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full border border-white/20">
                        ₹{trip.price?.toLocaleString('en-IN')}
                      </span>

                      {/* Title & Location inside hero bottom */}
                      <div className="absolute bottom-3 left-3.5 right-3.5">
                        <p className="text-white font-black text-base leading-snug drop-shadow-xs">{trip.name}</p>
                        <p className="text-white/80 text-xs mt-0.5 drop-shadow-xs">{trip.location}</p>
                      </div>
                    </div>

                    {/* Metadata specs */}
                    <div className={`px-4 sm:px-5 py-3.5 flex items-center justify-between border-b text-xs ${
                      darkMode ? 'border-white/5 bg-zinc-900/40' : 'border-zinc-100 bg-zinc-50/50'
                    }`}>
                      <span className={`font-bold ${difficultyColor(trip.difficulty)}`}>{trip.difficulty}</span>
                      <span className="opacity-40">·</span>
                      <span className={darkMode ? 'text-zinc-300' : 'text-zinc-600'}>{durationRange(trip)}D trek</span>
                      <span className="opacity-40">·</span>
                      <span className={darkMode ? 'text-zinc-300' : 'text-zinc-600'}>{trip.availableSeats || 0}/{trip.maxGroupSize || 15} seats</span>
                    </div>

                    {/* Action buttons */}
                    <div className="p-3 sm:p-4 flex items-center gap-2 mt-auto">
                      <button
                        type="button"
                        onClick={() => onEditTrip(trip)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl transition flex-1 justify-center cursor-pointer active:scale-95 ${
                          darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        <Pencil size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(trip)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl transition flex-1 justify-center cursor-pointer active:scale-95 ${
                          trip.status === 'Published'
                            ? (darkMode ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200')
                            : (darkMode ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200')
                        }`}
                      >
                        {trip.status === 'Published' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Publish</>}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteTrip(trip.id)}
                        className={`p-2.5 rounded-xl transition cursor-pointer active:scale-95 ${
                          darkMode ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200'
                        }`}
                        title="Delete listing"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className={`p-4 rounded-3xl border flex items-center justify-between ${
                  darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80'
                }`}>
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      page === 1
                        ? 'opacity-40 cursor-not-allowed text-zinc-400'
                        : darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-xs'
                    }`}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <span className={`text-xs font-semibold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Page <span className={darkMode ? 'text-white font-bold' : 'text-zinc-900 font-bold'}>{page}</span> of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      page === totalPages
                        ? 'opacity-40 cursor-not-allowed text-zinc-400'
                        : darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-xs'
                    }`}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
