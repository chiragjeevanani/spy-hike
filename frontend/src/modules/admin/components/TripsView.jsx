import React, { useState, useEffect } from 'react';
import { Search, Compass, Pause, Play, Trash2, MapPin, Star, Users, Clock, Eye, X } from 'lucide-react';
import { loadAllTrips, saveTripStatus, deleteTripAdmin } from '../utils/storage';

export default function TripsView({ darkMode }) {
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [diffFilter, setDiffFilter] = useState('All');
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    setTrips(loadAllTrips());
  }, []);

  const handleToggleStatus = (tripId, currentStatus) => {
    const nextStatus = currentStatus === 'Published' ? 'Paused' : 'Published';
    if (!window.confirm(`Are you sure you want to change status to "${nextStatus}" for this trip?`)) return;
    saveTripStatus(tripId, nextStatus);
    setTrips(loadAllTrips()); // refresh
  };

  const handleDelete = (tripId) => {
    if (!window.confirm('CRITICAL: Delete this trip listing permanently? This cannot be undone.')) return;
    deleteTripAdmin(tripId);
    setTrips(loadAllTrips()); // refresh
  };

  const filteredTrips = trips.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                        t.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchDiff = diffFilter === 'All' || t.difficulty === diffFilter;
    return matchSearch && matchStatus && matchDiff;
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
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">Manage and moderate trips posted by organizers.</p>
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
        </div>
      </div>

      {/* Trips list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrips.length === 0 ? (
          <div className={`${cardCls} col-span-3 text-center py-12 text-slate-400`}>
            No trips matching criteria found.
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <div key={trip.id} className={`${cardCls} p-0 overflow-hidden flex flex-col`}>
              
              {/* Cover image wrapper */}
              <div className="relative h-44 shrink-0">
                <img
                  src={trip.coverImage}
                  alt={trip.name}
                  className="w-full h-full object-cover"
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
                
                {/* Location text overlay */}
                <div className="absolute bottom-3 left-4 flex items-center gap-1 text-white text-xs font-bold">
                  <MapPin size={12} className="text-[#F27D26]" />
                  <span className="truncate max-w-64">{trip.location}</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide line-clamp-1">{trip.name}</h3>
                  <span className="text-[10px] text-slate-400 font-bold block mt-1">Organizer: {trip.organizerName || 'Partner Network'}</span>
                  
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
                      <span>{trip.durationDays} Days</span>
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
                    onClick={() => setSelectedTrip(trip)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500"
                  >
                    <Eye size={12} />
                    <span>Itinerary</span>
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

      {/* Trip Details Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            {/* Pinned close button */}
            <button
              onClick={() => setSelectedTrip(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-20 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1 mt-2">
              {/* Header info */}
              <div className="mb-5">
                <span className="text-[10px] text-[#F27D26] font-black uppercase tracking-wider">{selectedTrip.category || 'Expedition'}</span>
                <h3 className="font-display font-black text-xl leading-tight mt-1">{selectedTrip.name}</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-1">
                  <MapPin size={11} className="text-slate-400" />
                  {selectedTrip.location} ({selectedTrip.state})
                </p>
              </div>

              {/* Details content */}
              <div className="space-y-5 text-xs leading-relaxed font-semibold">
                
                {/* Description */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Description</span>
                  <p className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl text-slate-500 dark:text-slate-400">
                    {selectedTrip.description}
                  </p>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Price</span>
                    <span className="text-sm font-black text-[#F27D26]">₹{selectedTrip.price}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Elevation</span>
                    <span>{selectedTrip.elevationMeters || 'N/A'} meters</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Distance</span>
                    <span>{selectedTrip.distanceKm || 'N/A'} km</span>
                  </div>
                </div>

                {/* Highlights */}
                {selectedTrip.highlights && selectedTrip.highlights.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Highlights</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                      {selectedTrip.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Day-by-day Itinerary */}
                {selectedTrip.itinerary && selectedTrip.itinerary.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Day-by-Day Itinerary</span>
                    <div className="space-y-2">
                      {selectedTrip.itinerary.map((day, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[#F27D26] font-bold text-[10px] uppercase">Day {day.day || idx + 1}: {day.title}</span>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal">{day.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
