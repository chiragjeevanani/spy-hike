import { ApiError } from './ApiError.js';
import { isValidPhone, PHONE_RULE_MESSAGE } from './phone.js';

// Traveler details go straight into a real trek's emergency permits and
// safety register — required, not just for form completeness. Mirrors the
// same rule the frontend enforces in BookingFlow.jsx, so a request that
// bypasses the UI (or a bug in it) can't create a booking with placeholder
// or missing traveler data.
export function validateTravelers(travelers, expectedCount) {
  if (!Array.isArray(travelers) || travelers.length !== expectedCount) {
    throw ApiError.badRequest(`Traveler details are required for all ${expectedCount} traveler${expectedCount === 1 ? '' : 's'}`);
  }
  travelers.forEach((t, idx) => {
    const label = `Traveler #${idx + 1}`;
    if (!t?.name || !String(t.name).trim()) throw ApiError.badRequest(`${label}: full name is required`);
    const age = Number(t.age);
    if (!t.age || Number.isNaN(age) || age < 12 || age > 90) {
      throw ApiError.badRequest(`${label}: age must be between 12 and 90`);
    }
    if (!['Male', 'Female', 'Other'].includes(t.gender)) throw ApiError.badRequest(`${label}: gender is required`);
    if (!isValidPhone(t.emergencyContact)) {
      throw ApiError.badRequest(`${label}: the emergency contact must be ${PHONE_RULE_MESSAGE}`);
    }
  });
}
