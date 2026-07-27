/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Search, LocateFixed, Loader2 } from 'lucide-react';

// Static fallback list — stands in for Google Places predictions until the
// Maps API key is wired up (see the TODO in `results` below).
const POPULAR_LOCATIONS = [
  'Manali, Himachal Pradesh',
  'Kasol, Himachal Pradesh',
  'Rishikesh, Uttarakhand',
  'Sankri, Uttarakhand',
  'Leh, Ladakh',
  'Munnar, Kerala',
  'Lonavala, Maharashtra',
  'Coorg, Karnataka',
  'Darjeeling, West Bengal',
  'Gangtok, Sikkim',
];

// TODO(google-maps): reverse-geocode coordinates into a readable place name via
// the Google Geocoding API, e.g.
//   GET https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=API_KEY
// then use results[0].formatted_address. For now we show the raw coordinates.
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const city = data?.address?.city || data?.address?.town || data?.address?.state_district || data?.address?.county || data?.address?.state || 'Dehradun';
    return city;
  } catch (e) {
    return 'Dehradun';
  }
}

export default function LocationPicker({ open, current, onSelect, onClose, darkMode }) {
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const handleUseCurrent = () => {
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Location isn’t available on this device. Pick a city below.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        setLocating(false);
        onSelect({ label, lat: latitude, lng: longitude, source: 'gps' });
      },
      () => {
        setLocating(false);
        setError('Couldn’t get your location. Allow access or pick a city below.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // TODO(google-maps): replace this static filter with Google Places Autocomplete
  // predictions for `query` (AutocompleteService.getPlacePredictions).
  const results = query.trim()
    ? POPULAR_LOCATIONS.filter(l => l.toLowerCase().includes(query.toLowerCase().trim()))
    : POPULAR_LOCATIONS;

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-60 flex items-end justify-center">
          {/* backdrop (constrained to the phone frame) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`relative w-full rounded-t-3xl p-5 pb-7 shadow-2xl ${
              darkMode ? 'bg-elegant-card text-elegant-text' : 'bg-white text-zinc-900'
            }`}
          >
            <div className={`w-10 h-1 rounded-full mx-auto mb-4 ${darkMode ? 'bg-white/15' : 'bg-zinc-200'}`} />

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-semibold">Choose location</h2>
              <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-white/5 text-zinc-300' : 'bg-gray-100 text-zinc-500'}`}>
                <X size={16} />
              </button>
            </div>

            {/* Use current location */}
            <button
              id="btn-use-current-location"
              onClick={handleUseCurrent}
              disabled={locating}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-forest-600 hover:bg-forest-700 text-white active:scale-[0.99] transition disabled:opacity-70 mb-3"
            >
              {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
              <span className="text-sm font-semibold">{locating ? 'Getting your location…' : 'Use my current location'}</span>
            </button>

            {error && <p className="text-xs text-rose-500 mb-3">{error}</p>}

            {/* Manual search */}
            <div className="relative mb-3">
              <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white/40' : 'text-zinc-400'}`} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search city or area…"
                className={`w-full text-sm pl-11 pr-4 py-3 rounded-full outline-hidden border ${
                  darkMode ? 'bg-elegant-app border-white/10 text-white placeholder-white/35' : 'bg-gray-50 border-gray-200 text-zinc-800 placeholder-zinc-400'
                }`}
              />
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto no-scrollbar">
              {results.length === 0 ? (
                <p className="text-sm opacity-50 text-center py-6 px-4 leading-relaxed">
                  No matches yet. Live place search turns on once the Google Maps API key is added.
                </p>
              ) : (
                results.map(loc => {
                  const isActive = current?.label === loc;
                  return (
                    <button
                      key={loc}
                      onClick={() => onSelect({ label: loc, source: 'manual' })}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${
                        isActive
                          ? (darkMode ? 'bg-elegant-app' : 'bg-forest-50')
                          : (darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50')
                      }`}
                    >
                      <MapPin size={16} className="text-spy-orange shrink-0" />
                      <span className="text-sm">{loc}</span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
