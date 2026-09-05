/**
 * Geocoding and Reverse-Geocoding service for Find Your Trek.
 * Coordinates with backend Google Maps Geocoding proxy to eliminate browser CORS errors.
 */

import { api } from './apiClient';

/**
 * Reverse geocodes latitude and longitude into city, state, and formatted location.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{city: string, state: string, district?: string, country?: string, formattedAddress?: string, provider?: string}>}
 */
export async function reverseGeocode(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }

  // 1. Try Google Maps JS Geocoder if the Google Maps script is initialized on the window
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } });
      if (response && response.results && response.results.length > 0) {
        let city = '';
        let state = '';
        let district = '';
        let country = '';

        for (const res of response.results) {
          for (const comp of res.address_components || []) {
            const types = comp.types || [];
            if (!city && types.includes('locality')) city = comp.long_name;
            if (!city && (types.includes('sublocality_level_1') || types.includes('postal_town'))) city = comp.long_name;
            if (!district && types.includes('administrative_area_level_2')) district = comp.long_name;
            if (!state && types.includes('administrative_area_level_1')) state = comp.long_name;
            if (!country && types.includes('country')) country = comp.long_name;
          }
        }

        return {
          city: (city || district || '').trim(),
          district: district.trim(),
          state: state.trim(),
          country: country.trim() || 'India',
          formattedAddress: response.results[0]?.formatted_address || '',
          provider: 'google-js-sdk',
        };
      }
    } catch (e) {
      console.warn('Google JS Geocoder error, falling back to backend API proxy:', e.message);
    }
  }

  // 2. Query backend reverse-geocoding API proxy (server-side Google Geocoding with no CORS issues)
  try {
    const data = await api.get(`/reverse-geocode?lat=${lat}&lng=${lng}`, { auth: false });
    if (data && (data.city || data.state)) {
      return {
        city: (data.city || data.district || '').trim(),
        district: (data.district || '').trim(),
        state: (data.state || '').trim(),
        country: data.country || 'India',
        postalCode: data.postalCode || '',
        formattedAddress: data.formattedAddress || '',
        provider: data.provider || 'api',
      };
    }
  } catch (err) {
    console.warn('Backend reverse-geocode failed, attempting direct fallback:', err.message);
  }

  // 3. Last-resort fallback for local/offline testing
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    const a = data?.address || {};
    const city = a.city || a.town || a.village || a.state_district || a.county || '';
    return {
      city: city.trim(),
      district: (a.state_district || a.county || '').trim(),
      state: (a.state || '').trim(),
      country: a.country || 'India',
      formattedAddress: data?.display_name || '',
      provider: 'client-fallback',
    };
  } catch {
    return null;
  }
}
