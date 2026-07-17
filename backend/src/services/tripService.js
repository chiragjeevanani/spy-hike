import { ApiError } from '../utils/ApiError.js';

// Validates an organizer-submitted trip payload against the same rules the
// frontend TripFormView enforces before publish: a selected trek, at least
// one priced tier, a pickup point, a start-point pin, and at least one
// departure. Trek identity fields (name/location/difficulty/etc.) are no
// longer typed by the organizer — they're inherited from the selected Trek,
// so only trekId presence is checked here (existence is checked where the
// Trek is actually looked up, in tripController's buildTripFields).
export function validateTripPayload(body) {
  const errors = {};

  if (!body.trekId || !String(body.trekId).trim()) errors.trekId = 'Select a trek';

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
