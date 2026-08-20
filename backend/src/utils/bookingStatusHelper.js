import Booking from '../models/Booking.js';
import Trip from '../models/Trip.js';

/**
 * Automatically updates booking statuses based on trip duration and check-in status.
 * Rules:
 * - If status is Cancelled, leave as Cancelled.
 * - End date = departure date (selectedDate) + the trip's longest possible
 *   duration (durationDaysMax, else durationDays; default 1 day), so a ranged
 *   trek is never marked Completed/Missed while it could still be running.
 * - If current date >= end date:
 *     - If checkedInAt is present -> 'Completed'
 *     - If checkedInAt is NOT present -> 'Missed'
 * - Else if checkedInAt is present -> 'Ongoing'
 * - Else -> 'Upcoming'
 */
export async function autoResolveBookingStatuses() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    const activeBookings = await Booking.find({ status: { $ne: 'Cancelled' } });
    if (!activeBookings.length) return;

    // Cache trips duration to minimize DB lookups
    const tripIds = [...new Set(activeBookings.map((b) => b.tripId))];
    const trips = await Trip.find({ _id: { $in: tripIds } }).select('_id durationDays durationDaysMax');
    const durationMap = new Map(trips.map((t) => [t._id.toString(), t.durationDaysMax || t.durationDays || 1]));

    const bulkOps = [];

    for (const booking of activeBookings) {
      if (!booking.selectedDate) continue;

      const durationDays = durationMap.get(booking.tripId?.toString()) || 1;
      const departure = new Date(booking.selectedDate);
      departure.setHours(0, 0, 0, 0);
      
      // Calculate end date: departure date + durationDays
      const endDate = new Date(departure);
      endDate.setDate(endDate.getDate() + durationDays);

      const isCheckedIn = !!(booking.checkedInAt || booking.status === 'Checked-In');

      let targetStatus = booking.status;

      if (today >= endDate) {
        // Trip duration has completed
        targetStatus = (isCheckedIn || booking.status === 'Completed') ? 'Completed' : 'Missed';
      } else if (isCheckedIn || booking.status === 'Ongoing') {
        // Ticket scanned, trip currently ongoing
        targetStatus = 'Ongoing';
      } else if (booking.status === 'Completed') {
        targetStatus = 'Completed';
      } else {
        targetStatus = 'Upcoming';
      }

      if (targetStatus !== booking.status) {
        bulkOps.push({
          updateOne: {
            filter: { _id: booking._id },
            update: { $set: { status: targetStatus } },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Booking.bulkWrite(bulkOps);
    }
  } catch (err) {
    console.error('Error auto-resolving booking statuses:', err);
  }
}
