import { ApiError } from './ApiError.js';

// Shared by trekController (direct admin create/update) and
// trekRequestController (organizer proposals + the admin edit that can
// precede approving one) so both enforce identical mandatory fields.
export function validateTrekFields(f) {
  const errors = {};
  if (!f.title || !String(f.title).trim()) errors.title = 'Title is required';
  if (!f.location || !String(f.location).trim()) errors.location = 'Location is required';
  if (!['Easy', 'Moderate', 'Difficult'].includes(f.difficulty)) errors.difficulty = 'A valid difficulty is required';
  if (!Number.isFinite(Number(f.durationDays)) || Number(f.durationDays) <= 0) errors.durationDays = 'Duration (days) is required';
  if (!Number.isFinite(Number(f.distanceKm)) || Number(f.distanceKm) < 0) errors.distanceKm = 'Distance (km) is required';
  if (!f.coverImage || !String(f.coverImage).trim()) errors.coverImage = 'A cover image is required';
  if (Object.keys(errors).length > 0) throw ApiError.badRequest('Trek validation failed', errors);
}
