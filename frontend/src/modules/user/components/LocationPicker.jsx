/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Search, LocateFixed, Loader2, Mountain, Globe2, Check, AlertCircle } from 'lucide-react';
import tripsApi from '../../../lib/tripsApi';
import { normalizeLocationText } from '../utils/locationFilter';

// The whole-country option — both HomeView and ExploreView read the label
// 'India' as "no location filter".
const ALL_INDIA = { label: 'India', city: 'India', state: '' };

const POPULAR_COUNT = 8;

// Reverse-geocodes a GPS fix into a place. Returns null rather than guessing a
// city: a wrong guess silently filters the whole catalog to somewhere the
// customer has never been, which is worse than asking them to pick.
//
// TODO(google-maps): swap Nominatim for the Google Geocoding API once a key is
// wired up — https://maps.googleapis.com/maps/api/geocode/json?latlng=…
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const a = data?.address || {};
    const city = a.city || a.town || a.village || a.state_district || a.county || '';
    return { city: city.trim(), state: (a.state || '').trim() };
  } catch {
    return null;
  }
}

// Great-circle distance in km — used to snap a GPS fix to the nearest city the
// catalog actually covers.
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function LocationPicker({ open, current, onSelect, onClose, darkMode }) {
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Cities come from the catalog, never a hardcoded list: every entry here is
  // derived from the same place fields the trek search filters on, so picking
  // one always brings back that city's treks.
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadCities = useCallback(() => {
    setLoadingCities(true);
    setLoadError(false);
    tripsApi.listTrekCities()
      .then((list) => setCities(Array.isArray(list) ? list : []))
      .catch(() => setLoadError(true))
      .finally(() => setLoadingCities(false));
  }, []);

  // Refresh on every open — organizers publish into new cities all the time,
  // and a sheet opened an hour ago shouldn't still be offering the old set.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setError('');
    setNotice('');
    loadCities();
  }, [open, loadCities]);

  const currentLabel = current?.label || 'India';
  const isAllIndia = currentLabel === 'India' || currentLabel === 'All';

  // Busiest cities first (the server sorts by trek count), which is what makes
  // a shortcut row worth tapping.
  const popular = useMemo(
    () => cities.filter((c) => c.bookable).slice(0, POPULAR_COUNT),
    [cities],
  );

  const alphabetical = useMemo(
    () => [...cities].sort((a, b) => a.city.localeCompare(b.city)),
    [cities],
  );

  const results = useMemo(() => {
    const q = normalizeLocationText(query);
    if (!q) return alphabetical;
    return alphabetical.filter((c) => (
      normalizeLocationText(c.city).includes(q) || normalizeLocationText(c.state).includes(q)
    ));
  }, [alphabetical, query]);

  const choose = (city) => {
    onSelect({
      label: city.label,
      city: city.city,
      state: city.state,
      lat: city.lat ?? undefined,
      lng: city.lng ?? undefined,
      source: 'manual',
    });
  };

  const handleUseCurrent = () => {
    setError('');
    setNotice('');
    if (!('geolocation' in navigator)) {
      setError('Location isn’t available on this device. Pick a city below.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const place = await reverseGeocode(latitude, longitude);
        setLocating(false);

        // Snap the fix onto a city the catalog covers. Handing the raw
        // geocoded name straight to the filter was the old behaviour, and it
        // left anyone outside the handful of trekking towns staring at an
        // empty Explore with no idea why.
        const detected = normalizeLocationText(place?.city);
        const named = detected && cities.find((c) => {
          const name = normalizeLocationText(c.city);
          return name === detected || name.includes(detected) || detected.includes(name);
        });
        if (named) {
          onSelect({
            label: named.label,
            city: named.city,
            state: named.state,
            lat: latitude,
            lng: longitude,
            source: 'gps',
          });
          return;
        }

        const withCoords = cities.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
        if (withCoords.length) {
          const nearest = withCoords.reduce((best, c) => {
            const d = distanceKm(latitude, longitude, c.lat, c.lng);
            return !best || d < best.d ? { city: c, d } : best;
          }, null);
          setNotice(
            place?.city
              ? `No treks around ${place.city} yet — showing ${nearest.city.city}, the closest city we cover.`
              : `Showing ${nearest.city.city}, the closest city we cover.`,
          );
          onSelect({
            label: nearest.city.label,
            city: nearest.city.city,
            state: nearest.city.state,
            lat: latitude,
            lng: longitude,
            source: 'gps-nearest',
          });
          return;
        }

        setError(
          place?.city
            ? `We don’t have treks around ${place.city} yet. Try another city below.`
            : 'Couldn’t match your location to a city. Pick one below.',
        );
      },
      () => {
        setLocating(false);
        setError('Couldn’t get your location. Allow access or pick a city below.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const rowCls = (active) => `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${
    active
      ? (darkMode ? 'bg-forest-500/10 ring-1 ring-forest-500/40' : 'bg-forest-50 ring-1 ring-forest-200')
      : (darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50')
  }`;

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-60 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Near-fullscreen sheet: the city list is the task, so it gets the
              screen rather than a 260px window onto ten hardcoded names. */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className={`relative w-full h-[92%] rounded-t-3xl flex flex-col overflow-hidden shadow-2xl ${
              darkMode ? 'bg-elegant-card text-elegant-text' : 'bg-white text-zinc-900'
            }`}
          >
            {/* Sticky header: grabber, title, search */}
            <div className={`px-5 pt-3 pb-3 shrink-0 border-b ${darkMode ? 'border-white/10' : 'border-zinc-100'}`}>
              <div className={`w-10 h-1 rounded-full mx-auto mb-3 ${darkMode ? 'bg-white/15' : 'bg-zinc-200'}`} />

              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-serif text-xl font-semibold leading-tight">Select your city</h2>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Every city here has treks waiting
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    darkMode ? 'bg-white/5 text-zinc-300' : 'bg-gray-100 text-zinc-500'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative">
                <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white/40' : 'text-zinc-400'}`} />
                <input
                  id="input-city-search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setError(''); setNotice(''); }}
                  placeholder="Search for your city"
                  className={`w-full text-sm pl-11 pr-4 py-3 rounded-full outline-hidden border ${
                    darkMode ? 'bg-elegant-app border-white/10 text-white placeholder-white/35' : 'bg-gray-50 border-gray-200 text-zinc-800 placeholder-zinc-400'
                  }`}
                />
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-8">
              {/* Detect location */}
              <button
                id="btn-use-current-location"
                onClick={handleUseCurrent}
                disabled={locating || loadingCities}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-forest-600 hover:bg-forest-700 text-white active:scale-[0.99] transition disabled:opacity-70"
              >
                {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
                <span className="text-sm font-semibold">
                  {locating ? 'Getting your location…' : 'Use my current location'}
                </span>
              </button>

              {error && (
                <p className="text-xs text-rose-500 mt-3 flex gap-1.5 items-start">
                  <AlertCircle size={13} className="mt-px shrink-0" /> {error}
                </p>
              )}
              {notice && (
                <p className="text-xs text-spy-orange mt-3 flex gap-1.5 items-start">
                  <MapPin size={13} className="mt-px shrink-0" /> {notice}
                </p>
              )}

              {/* Whole-country reset */}
              <button onClick={() => onSelect(ALL_INDIA)} className={`${rowCls(isAllIndia)} mt-3`}>
                <Globe2 size={18} className="text-spy-orange shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block">All of India</span>
                  <span className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Browse every trek on Find Your Trek</span>
                </span>
                {isAllIndia && <Check size={16} className="text-forest-600 dark:text-forest-400 shrink-0" />}
              </button>

              {loadingCities && (
                <div className="flex items-center justify-center gap-2 py-10 opacity-60">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm font-semibold">Loading cities…</span>
                </div>
              )}

              {!loadingCities && loadError && (
                <div className="text-center py-10 px-4">
                  <p className="text-sm opacity-60 leading-relaxed">Couldn’t load cities. Check your connection.</p>
                  <button onClick={loadCities} className="mt-3 text-sm font-bold text-spy-orange">Try again</button>
                </div>
              )}

              {!loadingCities && !loadError && cities.length === 0 && (
                <p className="text-sm opacity-50 text-center py-10 px-4 leading-relaxed">
                  No treks are listed yet. Check back soon!
                </p>
              )}

              {/* Popular cities — hidden while searching, like a real city picker */}
              {!loadingCities && !query.trim() && popular.length > 0 && (
                <div className="mt-5">
                  <span className={`text-xs font-black tracking-widest uppercase ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Popular cities
                  </span>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {popular.map((c) => {
                      const active = currentLabel === c.label;
                      return (
                        <button
                          key={c.label}
                          onClick={() => choose(c)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition active:scale-95 ${
                            active
                              ? 'border-forest-500 bg-forest-500/10'
                              : darkMode ? 'border-white/10 hover:border-spy-orange/40' : 'border-zinc-200 hover:border-spy-orange/50'
                          }`}
                        >
                          <Mountain size={20} className={active ? 'text-forest-600 dark:text-forest-400' : 'text-spy-orange'} />
                          <span className="text-[11px] font-semibold leading-tight text-center truncate w-full px-0.5">
                            {c.city}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full list */}
              {!loadingCities && cities.length > 0 && (
                <div className="mt-5">
                  <span className={`text-xs font-black tracking-widest uppercase ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {query.trim() ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}` : 'All cities'}
                  </span>

                  {results.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <p className="text-sm font-semibold">No treks in “{query.trim()}” yet</p>
                      <p className={`text-xs mt-1.5 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        We only list cities that have treks. Try a nearby city, or browse everything.
                      </p>
                      <button onClick={() => onSelect(ALL_INDIA)} className="mt-3 text-sm font-bold text-spy-orange">
                        Browse all of India
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-0.5">
                      {results.map((c) => {
                        const active = currentLabel === c.label;
                        return (
                          <button key={c.label} onClick={() => choose(c)} className={rowCls(active)}>
                            <MapPin size={16} className="text-spy-orange shrink-0" />
                            <span className="flex-1 min-w-0">
                              <span className="text-sm font-semibold block truncate">{c.city}</span>
                              {c.state && (
                                <span className={`text-xs block truncate ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{c.state}</span>
                              )}
                            </span>
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${
                              c.bookable
                                ? (darkMode ? 'bg-forest-500/15 text-forest-400' : 'bg-forest-50 text-forest-700')
                                : (darkMode ? 'bg-white/5 text-zinc-400' : 'bg-zinc-100 text-zinc-500')
                            }`}>
                              {c.bookable ? `${c.trekCount} ${c.trekCount === 1 ? 'trek' : 'treks'}` : 'Coming soon'}
                            </span>
                            {active && <Check size={16} className="text-forest-600 dark:text-forest-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
