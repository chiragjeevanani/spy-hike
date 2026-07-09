import Departure from '../models/Departure.js';

// Keeps a trip's Departure batches in sync with its `departureDates`:
// - creates a batch for any new date (seeded with the trip's current
//   availableSeats / maxGroupSize),
// - removes batches for dates the organizer no longer offers.
// Idempotent: safe to call on every trip create/update.
//
// NOTE (Phase 3): removal is unconditional because no bookings exist yet.
// Phase 5 introduces bookings and will preserve any departure that already
// has seats booked into it rather than deleting it out from under a booking.
export async function provisionDepartures(trip) {
  const dates = Array.isArray(trip.departureDates) ? trip.departureDates : [];
  const totalSeats = Number(trip.maxGroupSize) || Number(trip.availableSeats) || 0;
  const startingSeats = Number.isFinite(Number(trip.availableSeats))
    ? Number(trip.availableSeats)
    : totalSeats;

  const existing = await Departure.find({ tripId: trip._id });
  const existingByDate = new Map(existing.map((d) => [d.date, d]));

  // Create missing dates.
  const toCreate = dates
    .filter((date) => !existingByDate.has(date))
    .map((date) => ({
      tripId: trip._id,
      date,
      totalSeats,
      availableSeats: Math.min(startingSeats, totalSeats),
    }));
  if (toCreate.length) await Departure.insertMany(toCreate);

  // Remove batches for dates that are no longer offered.
  const wanted = new Set(dates);
  const removable = existing.filter((d) => !wanted.has(d.date));
  if (removable.length) {
    await Departure.deleteMany({ _id: { $in: removable.map((d) => d._id) } });
  }
}

export async function getDepartures(tripId) {
  const departures = await Departure.find({ tripId }).sort({ date: 1 });
  return departures.map((d) => d.toPublicJSON());
}

// Atomically reserve `n` seats on a (trip, date) batch. The guarded $inc means
// two concurrent reservations can never drive availableSeats below zero —
// whichever loses the race matches zero documents and returns null.
// Returns the updated departure, or null if there weren't enough seats.
export async function reserveSeats(tripId, date, n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return Departure.findOneAndUpdate(
    { tripId, date, availableSeats: { $gte: n } },
    { $inc: { availableSeats: -n } },
    { new: true },
  );
}

// Return `n` seats to a batch (e.g. on cancellation), capped at totalSeats.
export async function releaseSeats(tripId, date, n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  const dep = await Departure.findOne({ tripId, date });
  if (!dep) return null;
  dep.availableSeats = Math.min(dep.totalSeats, dep.availableSeats + n);
  await dep.save();
  return dep;
}
