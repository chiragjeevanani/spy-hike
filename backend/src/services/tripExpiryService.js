import Trip from '../models/Trip.js';
import { cacheInvalidate } from '../lib/cache.js';
import { tripToday, hasUpcomingDeparture } from '../utils/tripDate.js';

export const EXPIRED_DEPARTURES = 'departures_expired';
let lastCheckedDay = null;
let pending = null;

export function pauseExpiredListing(trip, now = new Date()) {
  if (trip.status === 'Published' && trip.departureDates?.length && !hasUpcomingDeparture(trip, now)) {
    trip.status = 'Paused';
    trip.autoPausedReason = EXPIRED_DEPARTURES;
    trip.autoPausedAt = now;
  } else if (trip.status !== 'Paused') {
    trip.autoPausedReason = '';
    trip.autoPausedAt = null;
  }
  return trip;
}

// Run before catalog caches on the first request of each day, and periodically
// in the server even with no visitors. The guarded write is safe across PM2
// workers, and only published listings with known dates can expire.
export async function pauseExpiredTrips({ now = new Date(), force = false } = {}) {
  const day = tripToday(now);
  if (!force && lastCheckedDay === day) return;
  if (pending) await pending;
  if (!force && lastCheckedDay === day) return;
  const task = (async () => {
    const result = await Trip.updateMany({
      status: 'Published', 'departureDates.0': { $exists: true },
      departureDates: { $not: { $elemMatch: { $gte: day } } },
    }, { $set: { status: 'Paused', autoPausedReason: EXPIRED_DEPARTURES, autoPausedAt: now } });
    if (result.modifiedCount) await cacheInvalidate('trips', 'treks');
    lastCheckedDay = day;
    return result.modifiedCount;
  })();
  pending = task;
  try { return await task; } finally { if (pending === task) pending = null; }
}

export function startTripExpiryScheduler() {
  const check = () => pauseExpiredTrips({ force: true }).catch((err) => console.error('[trip-expiry]', err.message));
  void check();
  const timer = setInterval(check, 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
