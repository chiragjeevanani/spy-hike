import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

// GET /catalog/reverse-geocode?lat=...&lng=...
// Reverse geocodes coordinates into city, state, and formatted location.
// Uses Google Maps Geocoding API if GOOGLE_MAPS_API_KEY is configured.
// Falls back gracefully to OpenStreetMap/Nominatim if no key is provided or on failure.
export const reverseGeocodeLocation = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
  }

  const apiKey = env.googleMapsApiKey;

  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(apiKey)}`;
      const gRes = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const gData = await gRes.json();

      if (gData.status === 'OK' && Array.isArray(gData.results) && gData.results.length > 0) {
        let city = '';
        let state = '';
        let country = '';
        let postalCode = '';
        let district = '';

        // Search through results to extract canonical city and state
        for (const result of gData.results) {
          for (const comp of result.address_components || []) {
            const types = comp.types || [];
            if (!city && types.includes('locality')) {
              city = comp.long_name;
            }
            if (!city && (types.includes('sublocality_level_1') || types.includes('postal_town'))) {
              city = comp.long_name;
            }
            if (!district && types.includes('administrative_area_level_2')) {
              district = comp.long_name;
            }
            if (!state && types.includes('administrative_area_level_1')) {
              state = comp.long_name;
            }
            if (!country && types.includes('country')) {
              country = comp.long_name;
            }
            if (!postalCode && types.includes('postal_code')) {
              postalCode = comp.long_name;
            }
          }
        }

        const resolvedCity = city || district || '';
        const formattedAddress = gData.results[0]?.formatted_address || `${resolvedCity}, ${state}`.trim();

        return res.json({
          city: resolvedCity,
          district,
          state,
          country,
          postalCode,
          formattedAddress,
          provider: 'google',
        });
      }
    } catch (err) {
      console.warn('Google reverse-geocode failed, attempting fallback:', err.message);
    }
  }

  // Fallback to open reverse geocoding
  try {
    const fallbackUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const fRes = await fetch(fallbackUrl, {
      headers: { 'User-Agent': 'FindYourTrek/2.0 (contact@findyourtrek.com)' },
      signal: AbortSignal.timeout(5000),
    });
    const fData = await fRes.json();
    const a = fData?.address || {};
    const city = a.city || a.town || a.village || a.state_district || a.county || '';
    const state = a.state || '';
    const country = a.country || 'India';
    const formattedAddress = fData?.display_name || `${city}, ${state}`.trim();

    return res.json({
      city: city.trim(),
      district: (a.state_district || a.county || '').trim(),
      state: state.trim(),
      country: country.trim(),
      postalCode: (a.postcode || '').trim(),
      formattedAddress,
      provider: 'osm-fallback',
    });
  } catch {
    return res.json({
      city: '',
      district: '',
      state: '',
      country: 'India',
      postalCode: '',
      formattedAddress: '',
      provider: 'none',
    });
  }
});

// GET /place-search?q=...
// Free-text place search for map pickers (e.g. the organizer's trek start
// point). Returns several candidates with coordinates so the user can choose.
// Uses Google Places Text Search when GOOGLE_MAPS_API_KEY is configured —
// server-side, so the key never ships in the browser bundle — and falls back
// to OpenStreetMap/Nominatim when there's no key or Google fails.
export const searchPlaces = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 200);
  if (q.length < 2) {
    return res.status(400).json({ error: 'Query parameter q must be at least 2 characters' });
  }

  const apiKey = env.googleMapsApiKey;
  if (apiKey) {
    try {
      const gRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({ textQuery: q, regionCode: 'IN', languageCode: 'en', pageSize: 8 }),
        signal: AbortSignal.timeout(6000),
      });
      const gData = await gRes.json();
      if (gRes.ok && Array.isArray(gData.places)) {
        const results = gData.places
          .filter((p) => Number.isFinite(p.location?.latitude) && Number.isFinite(p.location?.longitude))
          .map((p) => ({
            id: p.id,
            name: p.displayName?.text || p.formattedAddress || q,
            address: p.formattedAddress || '',
            lat: p.location.latitude,
            lng: p.location.longitude,
          }));
        return res.json({ results, provider: 'google' });
      }
      console.warn('Google place search failed, attempting fallback:', gData?.error?.message || gRes.status);
    } catch (err) {
      console.warn('Google place search failed, attempting fallback:', err.message);
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=in&q=${encodeURIComponent(q)}`;
    const fRes = await fetch(url, {
      headers: { 'User-Agent': 'FindYourTrek/2.0 (contact@findyourtrek.com)' },
      signal: AbortSignal.timeout(5000),
    });
    const fData = await fRes.json();
    const results = (Array.isArray(fData) ? fData : []).map((r) => {
      const [name, ...rest] = String(r.display_name || '').split(',');
      return {
        id: String(r.place_id),
        name: name.trim(),
        address: rest.join(',').trim(),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      };
    }).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
    return res.json({ results, provider: 'osm-fallback' });
  } catch {
    return res.json({ results: [], provider: 'none' });
  }
});
