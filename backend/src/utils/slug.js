// URL-safe slug, matching the frontend's slugifyTrekName so a trek's grouping
// id is identical on both sides (frontend: modules/user/utils/trekGroups.js).
export const slugify = (str) =>
  String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Unique trip id derived from the trek slug plus a short base36 timestamp,
// e.g. "himalayan-ridge-pass-trek-l9x2a1". Keeps ids human-readable while
// staying unique across multiple organizers listing the same trek.
export const makeTripId = (name) => `${slugify(name)}-${Date.now().toString(36)}`;
