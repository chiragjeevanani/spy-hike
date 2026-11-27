import { randomUUID } from 'node:crypto';

// URL-safe slug, matching the frontend's slugifyTrekName so a trek's grouping
// id is identical on both sides (frontend: modules/user/utils/trekGroups.js).
export const slugify = (str) =>
  String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Different organizers can publish the same trek in the same millisecond.
// A timestamp alone collides; a UUID keeps each offer independently addressable.
export const makeTripId = (name) => `${slugify(name)}-${randomUUID()}`;

// Customer-facing booking code in the frontend's "TG-XXXX-X" format
// (4 digits + a letter), e.g. "TG-9921-U". Uniqueness is enforced by the
// caller retrying on the rare collision.
export const makeBookingId = () => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `TG-${digits}-${letter}`;
};
