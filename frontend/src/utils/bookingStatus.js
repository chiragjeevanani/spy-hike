/**
 * Dynamic booking status evaluator based on current date, check-in status, duration, and rescheduling requests.
 * @param {Object} booking 
 * @param {string|Date} currentDateStr 
 * @param {number} [durationDays]
 * @returns {string} Status string: 'Completed' | 'Ongoing' | 'Upcoming' | 'Missed' | 'Cancelled' | 'Reschedule Requested'
 */
export function getComputedBookingStatus(booking, currentDateStr = new Date(), durationDays = 1) {
  if (!booking) return 'Upcoming';

  // 1. Explicitly cancelled status
  if (booking.status === 'Cancelled') return 'Cancelled';

  // 2. Rescheduling request status
  if (booking.rescheduleStatus === 'Pending') {
    return 'Reschedule Requested';
  }

  const isCheckedIn = !!(booking.checkedInAt || booking.isCheckedIn || booking.status === 'Checked-In');

  // 3. Date comparison considering departure date and trek duration
  const depDateStr = booking.selectedDate || booking.departureDate;
  if (!depDateStr) {
    if (isCheckedIn && booking.status === 'Ongoing') return 'Ongoing';
    return booking.status || 'Upcoming';
  }

  const today = new Date(currentDateStr);
  today.setHours(0, 0, 0, 0);

  const departure = new Date(depDateStr);
  departure.setHours(0, 0, 0, 0);

  const trekDuration = Number(booking.durationDays || durationDays) || 1;
  const endDate = new Date(departure);
  endDate.setDate(endDate.getDate() + trekDuration);

  // If trip duration has completed
  if (today >= endDate) {
    return isCheckedIn || booking.status === 'Completed' ? 'Completed' : 'Missed';
  }

  // If trip departure has arrived or ticket is scanned
  if (isCheckedIn || booking.status === 'Ongoing' || (today >= departure && today < endDate && isCheckedIn)) {
    return 'Ongoing';
  }

  return booking.status || 'Upcoming';
}

export function getStatusBadgeStyle(computedStatus) {
  switch (computedStatus) {
    case 'Completed':
      return { label: 'Completed ✓', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    case 'Ongoing':
      return { label: 'Ongoing 🏃', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    case 'Upcoming':
      return { label: 'Upcoming', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    case 'Missed':
      return { label: 'Missed Trek ⚠️', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    case 'Reschedule Requested':
      return { label: 'Reschedule Pending ⏳', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    case 'Cancelled':
    default:
      return { label: 'Cancelled', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
  }
}
