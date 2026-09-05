import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Check, MapPin, Loader2, LocateFixed } from 'lucide-react';
const L = window.L;

const DEFAULT_CENTER = [22.9734, 78.6569]; // India centroid
const DEFAULT_ZOOM = 5;

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

// Full-screen Leaflet map (free OpenStreetMap tiles, no API key) letting the
// organizer click/drag to drop a pin marking the trek/travel's real-world
// starting point. The resulting lat/lng powers a plain Google Maps deep link
// on the customer side — no Maps JS API key needed for that part either.
export default function OrgStartPointPicker({ open, initialPoint, onConfirm, onClose, darkMode }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [point, setPoint] = useState(initialPoint || null);
  const [label, setLabel] = useState(initialPoint?.label || '');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [locating, setLocating] = useState(false);

  const placeMarker = (map, lat, lng) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        setPoint({ lat: pos.lat, lng: pos.lng });
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

    map.on('click', (e) => placeMarker(map, e.latlng.lat, e.latlng.lng));

    mapRef.current = map;
    // The overlay is still mid slide-in when this effect fires, so the
    // container can briefly report a stale size — force a recompute once
    // the animation settles.
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open]);

  const flyTo = (lat, lng, zoom = 14) => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], zoom);
    placeMarker(mapRef.current, lat, lng);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const handlePickResult = (r) => {
    flyTo(parseFloat(r.lat), parseFloat(r.lon), 14);
    setLabel(r.display_name.split(',').slice(0, 2).join(',').trim());
    setResults([]);
    setQuery('');
  };

  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator) || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { flyTo(pos.coords.latitude, pos.coords.longitude, 15); setLocating(false); },
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute inset-0 z-60 flex flex-col ${darkMode ? 'bg-zinc-950 text-white' : 'bg-[#FAF8F2] text-zinc-800'}`}
        >
          {/* Header */}
          <div className={`px-5 py-4 shrink-0 flex items-center gap-3 border-b relative z-10 ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white/80 backdrop-blur-md border-zinc-200/80 shadow-xs'}`}>
            <button
              type="button"
              id="btn-back-start-point-picker"
              onClick={onClose}
              className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition ${darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-sm font-display font-black tracking-tight">Set Trek Start Point</h2>
              <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">Tap the map to drop a pin</p>
            </div>
          </div>

          {/* Search bar */}
          <div className={`px-4 py-3 shrink-0 relative z-10 border-b ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white/80 backdrop-blur-md border-zinc-200/80'}`}>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  id="input-start-point-search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search a place to jump to..."
                  className={`${inputCls} pl-8 py-2.5`}
                />
              </div>
              <button type="submit" id="btn-start-point-search-go" disabled={searching} className="px-3.5 rounded-xl bg-spy-orange text-white text-xs font-bold shrink-0">
                {searching ? <Loader2 size={14} className="animate-spin" /> : 'Go'}
              </button>
              <button
                type="button"
                id="btn-start-point-use-current"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className={`px-3 rounded-xl border shrink-0 ${darkMode ? 'border-white/10 text-zinc-300' : 'border-zinc-200 text-zinc-600'}`}
              >
                {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
              </button>
            </form>
            {results.length > 0 && (
              <div className={`mt-2 rounded-xl overflow-hidden border max-h-40 overflow-y-auto ${darkMode ? 'border-white/10 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
                {results.map(r => (
                  <button
                    key={r.place_id}
                    type="button"
                    onClick={() => handlePickResult(r)}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center gap-2 border-b last:border-b-0 ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-zinc-100 hover:bg-zinc-50'}`}
                  >
                    <MapPin size={12} className="text-spy-orange shrink-0" />
                    <span className="truncate">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map fills remaining space */}
          <div className="flex-1 relative">
            <div ref={mapContainerRef} id="org-start-point-map" className="absolute inset-0" />
            {!point && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none z-[400]">
                Tap anywhere on the map to drop a pin
              </div>
            )}
          </div>

          {/* Confirm bar */}
          <div className={`shrink-0 px-5 py-4 border-t relative z-10 ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
            {point && (
              <div className="mb-3 space-y-1.5">
                <input
                  type="text"
                  id="input-start-point-label"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
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
              <Check size={16} /> {point ? 'Confirm Start Point' : 'Tap the map first'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
