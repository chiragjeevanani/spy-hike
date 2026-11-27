import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Check, MapPin, Loader2, LocateFixed, X } from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { reverseGeocode } from '../../../lib/geocoding';
const L = window.L;

const DEFAULT_CENTER = [22.9734, 78.6569]; // India centroid
const DEFAULT_ZOOM = 5;
const SEARCH_DEBOUNCE_MS = 350;

// Hand-drawn on-brand pin rendered as a Leaflet divIcon — sidesteps the
// classic bundler-broken-default-marker-image issue since we never touch
// L.Icon.Default (whose image URLs resolve relative to the wrong base path
// under Vite). iconAnchor lands on the pin's visual tip so it points exactly
// at the clicked/dragged coordinate.
const pinIcon = L ? L.divIcon({
  className: '',
  html: `<svg viewBox="0 0 24 24" width="34" height="34" fill="#F27D26" stroke="#7a3a0f" stroke-width="0.6" style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
    <path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 7 15 7.3 15.4a.9.9 0 0 0 1.4 0C13 23 20 13.4 20 8c0-4.4-3.6-8-8-8z"/>
    <circle cx="12" cy="8" r="3.2" fill="white"/>
  </svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 33],
}) : null;

// Full-screen Leaflet map letting the organizer search for a place or
// click/drag to drop a pin marking the trek's real-world starting point.
// The resulting lat/lng powers a plain Google Maps deep link on the
// customer side.
//
// Rendered through a portal as a `fixed` layer: mounted inline it sat inside
// the form's scrolling, transformed container, so `absolute inset-0` sized it
// to the whole form instead of the screen — the map grew past the viewport
// and pushed the label field and Confirm button out of reach.
export default function OrgStartPointPicker({ open, initialPoint, onConfirm, onClose, darkMode }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  // Whether the label was typed by the organizer. Until they type, tapping the
  // map or picking a search result keeps filling it in for them.
  const labelEditedRef = useRef(false);
  const geocodeSeqRef = useRef(0);
  const [point, setPoint] = useState(initialPoint || null);
  const [label, setLabel] = useState(initialPoint?.label || '');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchDone, setSearchDone] = useState(false);
  const [locating, setLocating] = useState(false);

  // Fill the label from coordinates (tap / drag / current location), unless
  // the organizer has typed their own. Sequenced so a slow lookup for an
  // earlier tap can't overwrite the label for a later one.
  const autoLabel = async (lat, lng) => {
    if (labelEditedRef.current) return;
    const seq = ++geocodeSeqRef.current;
    try {
      const r = await reverseGeocode(lat, lng);
      if (seq !== geocodeSeqRef.current || labelEditedRef.current || !r) return;
      const name = (r.formattedAddress || '').split(',').slice(0, 2).join(',').trim() || [r.city, r.state].filter(Boolean).join(', ');
      if (name) setLabel(name);
    } catch { /* label stays editable */ }
  };

  const placeMarker = (map, lat, lng) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        setPoint({ lat: pos.lat, lng: pos.lng });
        autoLabel(pos.lat, pos.lng);
      });
    }
    setPoint({ lat, lng });
  };

  // (Re)initialize the map every time the overlay opens — Leaflet needs a
  // live DOM container, and AnimatePresence only mounts one while `open`.
  useEffect(() => {
    if (!open || !mapContainerRef.current || mapRef.current || !L) return;

    setPoint(initialPoint || null);
    setLabel(initialPoint?.label || '');
    setQuery('');
    setResults([]);
    labelEditedRef.current = false;

    const startCenter = initialPoint ? [initialPoint.lat, initialPoint.lng] : DEFAULT_CENTER;
    const startZoom = initialPoint ? 13 : DEFAULT_ZOOM;
    const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(startCenter, startZoom);
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    if (initialPoint) {
      placeMarker(map, initialPoint.lat, initialPoint.lng);
    }

    map.on('click', (e) => {
      placeMarker(map, e.latlng.lat, e.latlng.lng);
      autoLabel(e.latlng.lat, e.latlng.lng);
      setResults([]);
    });

    mapRef.current = map;
    // The overlay is still mid slide-in when this effect fires, so the
    // container can briefly report a stale size — force a recompute once
    // the animation settles, and whenever the viewport changes.
    const resize = () => map.invalidateSize();
    const t = setTimeout(resize, 280);
    window.addEventListener('resize', resize);

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', resize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Search as you type (debounced) — results list several matching places.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); setSearchDone(false); return undefined; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get(`/place-search?q=${encodeURIComponent(q)}`, { auth: false });
        if (!cancelled) setResults(data?.results || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) { setSearching(false); setSearchDone(true); }
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const flyTo = (lat, lng, zoom = 15) => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], zoom);
    placeMarker(mapRef.current, lat, lng);
  };

  const handlePickResult = (r) => {
    flyTo(r.lat, r.lng, 15);
    if (!labelEditedRef.current) setLabel(r.name);
    setResults([]);
    setQuery('');
    setSearchDone(false);
  };

  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator) || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyTo(pos.coords.latitude, pos.coords.longitude, 15);
        autoLabel(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (!point) return;
    onConfirm({ lat: point.lat, lng: point.lng, label: label.trim() || 'Trek Start Point' });
  };

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-zinc-50 border-zinc-200 text-zinc-800 focus:border-spy-orange/50'
  }`;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed inset-0 z-1100 h-dvh flex flex-col overflow-hidden ${darkMode ? 'bg-zinc-950 text-white' : 'bg-[#FAF8F2] text-zinc-800'}`}
        >
          {/* Header */}
          <div className={`px-4 py-3 shrink-0 flex items-center gap-3 border-b ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200/80'}`}>
            <button
              type="button"
              id="btn-back-start-point-picker"
              onClick={onClose}
              className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition shrink-0 ${darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-display font-black tracking-tight">Set Trek Start Point</h2>
              <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">Search or tap the map</p>
            </div>
          </div>

          {/* Search bar — results float over the map instead of pushing it down */}
          <div className={`px-4 py-3 shrink-0 relative border-b z-1001 ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200/80'}`}>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  id="input-start-point-search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search basecamp, village, landmark..."
                  autoComplete="off"
                  className={`${inputCls} pl-8 pr-8`}
                />
                {searching ? (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-spy-orange" />
                ) : query && (
                  <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                id="btn-start-point-use-current"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                title="Use my current location"
                className={`px-3 rounded-xl border shrink-0 ${darkMode ? 'border-white/10 text-zinc-300' : 'border-zinc-200 text-zinc-600'}`}
              >
                {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
              </button>
            </div>

            {(results.length > 0 || (searchDone && !searching && query.trim().length >= 3)) && (
              <div className={`absolute left-4 right-4 top-full mt-1 rounded-xl overflow-hidden border shadow-xl max-h-64 overflow-y-auto ${darkMode ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
                {results.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-zinc-400">No places found. Try a nearby town or landmark, or tap the map.</p>
                ) : results.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handlePickResult(r)}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-b last:border-b-0 ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-zinc-100 hover:bg-zinc-50'}`}
                  >
                    <MapPin size={13} className="text-spy-orange shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold truncate">{r.name}</span>
                      {r.address && <span className={`block text-[10px] truncate ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{r.address}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map takes only the space left between the bars — min-h-0 lets it shrink */}
          <div className="flex-1 min-h-0 relative z-0">
            <div ref={mapContainerRef} id="org-start-point-map" className="absolute inset-0" />
            {!point && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none z-400 whitespace-nowrap">
                Tap anywhere on the map to drop a pin
              </div>
            )}
          </div>

          {/* Confirm bar — always visible */}
          <div className={`shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100'}`}>
            {point && (
              <div className="mb-3 space-y-1">
                <input
                  type="text"
                  id="input-start-point-label"
                  value={label}
                  onChange={e => { labelEditedRef.current = true; setLabel(e.target.value); }}
                  placeholder="Label this point, e.g. Sankri Basecamp"
                  className={inputCls}
                />
                <p className={`text-[10px] font-mono ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                </p>
              </div>
            )}
            <button
              type="button"
              id="btn-confirm-start-point"
              onClick={handleConfirm}
              disabled={!point}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 ${
                point ? 'bg-spy-orange text-white shadow-lg shadow-spy-orange/20' : (darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-400')
              }`}
            >
              <Check size={16} /> {point ? 'Confirm Start Point' : 'Search or tap the map first'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
