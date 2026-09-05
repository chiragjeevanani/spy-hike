/**
 * Utility helpers for filtering treks by user location & search query
 */

export function normalizeLocationText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/uttrakhand/g, 'uttarakhand')
    .replace(/urrtakhand/g, 'uttarakhand')
    .replace(/himachal/g, 'himachal pradesh');
}

/**
 * Checks if a trip matches the user's selected location (city, state, region).
 * Returns true if location is "India", empty, or matches trip details.
 */
export function matchesLocation(trip, userLocation) {
  if (!userLocation || !userLocation.label) return true;
  const label = userLocation.label.trim();
  if (label === 'India' || label === 'All' || !label) return true;

  // Split label into components e.g. "Manali, Himachal Pradesh" -> city="manali", state="himachal pradesh"
  const parts = label.split(',').map(s => normalizeLocationText(s)).filter(Boolean);
  const selectedCity = normalizeLocationText(userLocation.city || parts[0]);
  const selectedState = normalizeLocationText(userLocation.state || (parts.length > 1 ? parts[1] : null));

  const tripCity = normalizeLocationText(trip.city);
  const tripState = normalizeLocationText(trip.state);
  const tripLocation = normalizeLocationText(trip.location);
  const tripStart = normalizeLocationText(trip.startingPoint || trip.startPoint?.label);

  const pickupLocations = [
    trip.pickup?.location,
    ...(trip.pickupOptions ? trip.pickupOptions.map(p => p.location) : []),
    ...(trip.pickupPoints || [])
  ].filter(Boolean).map(p => normalizeLocationText(p));

  // 1. Primary city match (e.g. "manali", "rishikesh", "sankri", "leh", "pune")
  if (selectedCity && selectedCity !== 'india' && selectedCity !== 'all') {
    const cityMatch =
      (tripCity && (tripCity.includes(selectedCity) || selectedCity.includes(tripCity))) ||
      (tripLocation && tripLocation.includes(selectedCity)) ||
      (tripStart && tripStart.includes(selectedCity)) ||
      pickupLocations.some(p => p.includes(selectedCity) || selectedCity.includes(p));

    if (cityMatch) return true;
  }

  // 2. State-wide match (e.g. user selected "Uttarakhand" or "Himachal Pradesh" directly)
  if (selectedCity && (!selectedState || selectedCity === selectedState)) {
    if (
      (tripState && (tripState.includes(selectedCity) || selectedCity.includes(tripState))) ||
      (tripLocation && tripLocation.includes(selectedCity))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a trip matches a search query (name, location, city, state, starting point, category).
 * Supports city, state, and trek category keyword searching.
 */
export function matchesQuery(trip, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) return true;
  const q = normalizeLocationText(searchQuery);

  const fields = [
    trip.name,
    trip.title,
    trip.location,
    trip.city,
    trip.state,
    trip.startingPoint,
    trip.startPoint?.label,
    trip.pickup?.location,
    ...(trip.pickupOptions ? trip.pickupOptions.map(p => p.location) : []),
    ...(trip.pickupPoints || []),
    trip.category,
    trip.overview,
    trip.description
  ].filter(Boolean).map(f => normalizeLocationText(f));

  return fields.some(field => field.includes(q));
}
