import { ApiError } from '../utils/ApiError.js';

// Validates an organizer-submitted trip payload against the same rules the
// frontend TripFormView enforces before publish: name + location, at least one
// priced tier, a pickup point, a start-point pin, and at least one departure.
export function validateTripPayload(body) {
  const errors = {};

  if (!body.name || !body.name.trim()) errors.name = 'Trip name is required';
  if (!body.location || !body.location.trim()) errors.location = 'Location is required';

  const tiers = Array.isArray(body.pricingTiers) ? body.pricingTiers : [];
  const validTiers = tiers.filter(
    (t) => t && t.label && String(t.label).trim() && Number.isFinite(Number(t.price)),
  );
  if (validTiers.length === 0) {
    errors.pricingTiers = 'At least one pricing tier with a label and numeric price is required';
  }

  if (!body.pickup || !body.pickup.location || !Number.isFinite(Number(body.pickup.price))) {
    errors.pickup = 'A pickup location and per-person price are required';
  }

  if (
    !body.startPoint ||
    !Number.isFinite(Number(body.startPoint.lat)) ||
    !Number.isFinite(Number(body.startPoint.lng))
  ) {
    errors.startPoint = 'A start-point location (lat/lng) is required';
  }

  if (!Array.isArray(body.departureDates) || body.departureDates.length === 0) {
    errors.departureDates = 'At least one departure date is required';
  }

  if (Object.keys(errors).length > 0) {
    throw ApiError.badRequest('Trip validation failed', errors);
  }
}

// Collapses multiple organizer offerings of the same trek (same trekId) into a
// single browsable entry — the server-side equivalent of the frontend's
// groupTripsByTrekName. The highest-rated offering is the representative.
export function groupTripsByTrek(trips) {
  const groups = new Map();
  for (const trip of trips) {
    if (!groups.has(trip.trekId)) groups.set(trip.trekId, []);
    groups.get(trip.trekId).push(trip);
  }

  return Array.from(groups.entries()).map(([trekId, offers]) => {
    const representative = [...offers].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    const prices = offers.map((o) => o.price).filter((p) => Number.isFinite(p));
    return {
      trekId,
      trekName: representative.name,
      representative: representative.toPublicJSON ? representative.toPublicJSON() : representative,
      offers: offers.map((o) => (o.toPublicJSON ? o.toPublicJSON() : o)),
      organizerCount: offers.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
    };
  });
}
