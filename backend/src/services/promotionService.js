import Trip from '../models/Trip.js';

// Sets (or clears) an organizer's promotion window on their User doc and
// keeps every trip they've already posted in sync, so the boost/highlight
// takes effect immediately without the organizer re-saving a single trip.
// Shared by the admin "direct promote" endpoint and the promotion-request
// approval flow — both just resolve a { from, until } and hand it here.
export async function promoteOrganizer(user, from, until) {
  const org = user.organizer || {};
  org.promotedFrom = from;
  org.promotedUntil = until;
  user.organizer = org;
  await user.save();
  await Trip.updateMany(
    { organizerEmail: user.email },
    { $set: { 'organizer.promotedUntil': until } },
  );
  return user;
}

export async function unpromoteOrganizer(user) {
  return promoteOrganizer(user, null, null);
}
