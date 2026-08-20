import { ApiError } from './ApiError.js';

// Shared by trekController (direct admin create/update) and
// trekRequestController (organizer proposals + the admin edit that can
// precede approving one) so both enforce identical mandatory fields.
const isPresent = (v) => v !== undefined && v !== null && v !== '';

export function validateTrekFields(f) {
  const errors = {};
  if (!f.title || !String(f.title).trim()) errors.title = 'Title is required';
  if (!f.location || !String(f.location).trim()) errors.location = 'Location is required';
  if (!['Easy', 'Moderate', 'Difficult'].includes(f.difficulty)) errors.difficulty = 'A valid difficulty is required';
  if (!Number.isFinite(Number(f.durationDays)) || Number(f.durationDays) <= 0) errors.durationDays = 'Duration (days) is required';
  if (!Number.isFinite(Number(f.distanceKm)) || Number(f.distanceKm) < 0) errors.distanceKm = 'Distance (km) is required';
  // The `*Max` half of each range is optional (an exact-value trek leaves it
  // empty), but when supplied it has to sit at or above the low end.
  if (isPresent(f.durationDaysMax)) {
    if (!Number.isFinite(Number(f.durationDaysMax)) || Number(f.durationDaysMax) <= 0) {
      errors.durationDaysMax = 'Max duration (days) must be a number greater than 0';
    } else if (Number(f.durationDaysMax) < Number(f.durationDays)) {
      errors.durationDaysMax = 'Max duration cannot be less than min duration';
    }
  }
  if (isPresent(f.distanceKmMax)) {
    if (!Number.isFinite(Number(f.distanceKmMax)) || Number(f.distanceKmMax) < 0) {
      errors.distanceKmMax = 'Max distance (km) must be a number';
    } else if (Number(f.distanceKmMax) < Number(f.distanceKm)) {
      errors.distanceKmMax = 'Max distance cannot be less than min distance';
    }
  }
  if (!f.coverImage || !String(f.coverImage).trim()) errors.coverImage = 'A cover image is required';
  if (Object.keys(errors).length > 0) throw ApiError.badRequest('Trek validation failed', errors);
}

// Normalises the high end of a range for storage: an empty/absent value and a
// value that does not exceed the low end both collapse to null, which is what
// "this trek is a single exact number" looks like in the database.
export function normalizeRangeMax(max, min) {
  if (!isPresent(max)) return null;
  const hi = Number(max);
  if (!Number.isFinite(hi) || hi <= Number(min)) return null;
  return hi;
}
