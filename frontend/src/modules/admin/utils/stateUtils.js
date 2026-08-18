/**
 * Utility functions for state extraction, normalization, and grouping of catalog treks.
 */

export const POPULAR_TREK_STATES = [
  'Uttarakhand',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Ladakh',
  'Sikkim',
  'Maharashtra',
  'Kerala',
  'Karnataka',
  'West Bengal',
  'Meghalaya',
  'Arunachal Pradesh',
  'Tamil Nadu',
];

/**
 * Normalizes a state string (corrects common typos and formatting).
 */
export function normalizeStateName(rawState) {
  if (!rawState || typeof rawState !== 'string') return '';
  const s = rawState.trim();
  if (!s) return '';

  const lower = s.toLowerCase();
  if (lower.includes('uttrakhand') || lower.includes('uttarakhand') || lower.includes('uk')) {
    return 'Uttarakhand';
  }
  if (lower.includes('himachal')) {
    return 'Himachal Pradesh';
  }
  if (lower.includes('jammu') || lower.includes('kashmir') || lower.includes('j&k')) {
    return 'Jammu & Kashmir';
  }
  if (lower.includes('ladakh') || lower.includes('leh')) {
    return 'Ladakh';
  }
  if (lower.includes('sikkim')) {
    return 'Sikkim';
  }
  if (lower.includes('maharashtra') || lower.includes('sahyadri')) {
    return 'Maharashtra';
  }
  if (lower.includes('kerala')) {
    return 'Kerala';
  }
  if (lower.includes('karnataka')) {
    return 'Karnataka';
  }
  if (lower.includes('west bengal') || lower.includes('darjeeling')) {
    return 'West Bengal';
  }
  if (lower.includes('meghalaya')) {
    return 'Meghalaya';
  }
  if (lower.includes('arunachal')) {
    return 'Arunachal Pradesh';
  }

  // Capitalize words for custom states
  return s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Tries to detect state from location text if state field is not explicitly set.
 */
export function extractStateFromLocation(locationStr) {
  if (!locationStr) return 'Other Regions';
  const norm = normalizeStateName(locationStr);
  if (norm) return norm;

  // Split by comma e.g. "Manali, Himachal Pradesh" -> "Himachal Pradesh"
  const parts = locationStr.split(',').map((p) => p.trim());
  for (const part of parts) {
    const matched = normalizeStateName(part);
    if (matched) return matched;
  }

  return 'Other Regions';
}

/**
 * Resolves the canonical state name for a trek.
 */
export function resolveTrekState(trek) {
  if (!trek) return 'Other Regions';
  if (trek.state && trek.state.trim()) {
    return normalizeStateName(trek.state);
  }
  return extractStateFromLocation(trek.location);
}

/**
 * Groups an array of treks by state.
 * Returns an array of objects: [{ state: 'Himachal Pradesh', treks: [...], count: 4 }, ...]
 */
export function groupTreksByState(treks = []) {
  const map = new Map();

  treks.forEach((trek) => {
    const stateName = resolveTrekState(trek);
    if (!map.has(stateName)) {
      map.set(stateName, []);
    }
    map.get(stateName).push(trek);
  });

  const result = [];
  // Sort states: Popular states in defined order first, then alphabetical, "Other Regions" at the end
  const keys = Array.from(map.keys()).sort((a, b) => {
    if (a === 'Other Regions') return 1;
    if (b === 'Other Regions') return -1;
    const idxA = POPULAR_TREK_STATES.indexOf(a);
    const idxB = POPULAR_TREK_STATES.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  keys.forEach((state) => {
    result.push({
      state,
      treks: map.get(state),
      count: map.get(state).length,
    });
  });

  return result;
}
