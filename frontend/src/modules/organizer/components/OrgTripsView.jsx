import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Map, Pencil, Eye, Pause, Play, Trash2, Search, Filter, ChevronRight } from 'lucide-react';

export default function OrgTripsView({ trips, onNewTrip, onEditTrip, onToggleStatus, onDeleteTrip, darkMode }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filters = ['All', 'Published', 'Draft', 'Paused'];

  const filtered = trips.filter(t => {
    const matchSearch = t.name?.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || t.status === filter;
    return matchSearch && matchFilter;
  });

  const statusColor = (s) => {
    if (s === 'Published') return 'bg-emerald-500/15 text-emerald-400';
    if (s === 'Draft') return 'bg-zinc-400/15 text-zinc-400';
    return 'bg-amber-500/15 text-amber-400';
  };

  const difficultyColor = (d) => {
    if (d === 'Easy') return 'text-emerald-400';
    if (d === 'Moderate') return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className={`h-full flex flex-col font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      
      {/* Header */}
      <div className={`px-5 pt-5 pb-4 shrink-0 ${darkMode ? 'bg-gradient-to-b from-zinc-900/80 to-transparent' : 'bg-gradient-to-b from-orange-50 to-transparent'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-display font-black tracking-tight">My Trips</h1>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{trips.length} total expedition{trips.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            type="button"
            onClick={onNewTrip}
            className="flex items-center gap-1.5 bg-spy-orange text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-lg shadow-spy-orange/20 active:scale-95 transition-all"
          >
            <Plus size={15} /> New Trip
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search trips..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition ${
              darkMode ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/40' : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/40'
            }`}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-spy-orange text-white shadow-sm shadow-spy-orange/30'
                  : darkMode ? 'bg-zinc-900 text-zinc-400 border border-white/10' : 'bg-white text-zinc-500 border border-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Trips list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center pt-16 text-center"
            >
              <Map size={40} className="text-zinc-300 mb-3" />
              <p className="font-bold text-sm mb-1">No trips found</p>
              <p className={`text-xs mb-4 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {search ? 'Try a different search term' : 'Start by posting your first trip'}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={onNewTrip}
                  className="inline-flex items-center gap-2 bg-spy-orange text-white text-sm font-bold px-5 py-2.5 rounded-xl active:scale-95"
                >
                  <Plus size={16} /> Post First Trip
                </button>
              )}
            </motion.div>
          ) : (
            filtered.map((trip, i) => (
              <motion.div
                key={trip.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}
              >
                {/* Cover image */}
                <div className="relative h-32">
                  <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {/* Status badge */}
                  <span className={`absolute top-3 left-3 text-[10px] font-black px-2.5 py-1 rounded-full ${statusColor(trip.status)}`}>
                    {trip.status}
                  </span>
                  {/* Price badge */}
                  <span className="absolute top-3 right-3 text-white text-xs font-black bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    ₹{trip.price?.toLocaleString('en-IN')}
                  </span>
                  {/* Trip name */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-black text-sm leading-tight">{trip.name}</p>
                    <p className="text-white/70 text-xs">{trip.location}</p>
                  </div>
                </div>

                {/* Meta row */}
                <div className={`px-4 py-3 flex items-center justify-between border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-bold ${difficultyColor(trip.difficulty)}`}>{trip.difficulty}</span>
                    <span className={darkMode ? 'text-zinc-500' : 'text-zinc-400'}>·</span>
                    <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>{trip.durationDays}D trek</span>
                    <span className={darkMode ? 'text-zinc-500' : 'text-zinc-400'}>·</span>
                    <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>{trip.availableSeats}/{trip.maxGroupSize} seats</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className={`px-4 py-3 flex items-center gap-2`}>
                  <button
                    type="button"
                    onClick={() => onEditTrip(trip)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition flex-1 justify-center ${
                      darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(trip)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition flex-1 justify-center ${
                      trip.status === 'Published'
                        ? (darkMode ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-600')
                        : (darkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600')
                    }`}
                  >
                    {trip.status === 'Published' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Publish</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTrip(trip.id)}
                    className={`p-2 rounded-xl transition ${darkMode ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-500'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
