/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// URL-safe slug for a trek name, e.g. "Himalayan Ridge Pass Trek" -> "himalayan-ridge-pass-trek".
export const slugifyTrekName = (name) => (
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
);

// Collapses multiple organizer offerings of the same trek name into a single
// browsable entry: one card in Home/Explore, with the price range and
// organizer count surfaced, and the highest-rated offering used as the
// representative (cover image, description, stats) for the card itself.
export const groupTripsByTrekName = (trips) => {
  const groups = new Map();

  trips.forEach(trip => {
    if (!groups.has(trip.name)) {
      groups.set(trip.name, []);
    }
    groups.get(trip.name).push(trip);
  });

  return Array.from(groups.entries()).map(([trekName, offers]) => {
    const representative = [...offers].sort((a, b) => b.rating - a.rating)[0];
    const prices = offers.map(o => o.price);
    return {
      trekName,
      representative,
      organizerCount: offers.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices)
    };
  });
};
