// Listings use calendar dates in the platform's India timezone, independently
// of the host's timezone. Today's departure remains available through today.
export function tripToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const hasUpcomingDeparture = (trip, now = new Date()) =>
  (trip.departureDates || []).some((date) => date >= tripToday(now));
