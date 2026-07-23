/**
 * Dynamic booking status evaluator based on current date, check-in status, and rescheduling requests.
 * @param {Object} booking 
 * @param {string|Date} currentDateStr 
 * @returns {string} Status string: 'Completed' | 'Upcoming' | 'Missed' | 'Cancelled' | 'Reschedule Requested'
 */
export function getComputedBookingStatus(booking, currentDateStr = new Date()) {
  if (!booking) return 'Upcoming';

  // 1. Explicitly cancelled or checked-in/completed status
  if (booking.status === 'Cancelled') return 'Cancelled';
  if (booking.isCheckedIn || booking.status === 'Completed' || booking.status === 'Checked-In') {
    return 'Completed';
  }

  // 2. Rescheduling request status
  if (booking.rescheduleStatus === 'Pending') {
    return 'Reschedule Requested';
  }

  // 3. Date comparison: check if departure date has passed
  const depDate = booking.selectedDate || booking.departureDate;
  if (!depDate) return booking.status || 'Upcoming';

  const today = new Date(currentDateStr);
  today.setHours(0, 0, 0, 0);

  const departure = new Date(depDate);
  departure.setHours(0, 0, 0, 0);

  // If departure date is before today and hiker did not check in, mark as Missed
  if (departure < today && !booking.isCheckedIn) {
    return 'Missed';
  }

  return booking.status || 'Upcoming';
}

export function getStatusBadgeStyle(computedStatus) {
  switch (computedStatus) {
    case 'Completed':
      return { label: 'Checked In ✓', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    case 'Upcoming':
      return { label: 'Upcoming', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    case 'Missed':
      return { label: 'Missed Trek ⚠️', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    case 'Reschedule Requested':
      return { label: 'Reschedule Pending ⏳', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    case 'Cancelled':
    default:
      return { label: 'Cancelled', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
  }
}
