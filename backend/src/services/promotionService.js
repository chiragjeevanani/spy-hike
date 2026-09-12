import User from '../models/User.js';
import Trip from '../models/Trip.js';

// Sets (or clears) an organizer's promotion window on their User doc and
// keeps every trip they've already posted in sync, so the boost/highlight
// takes effect immediately without the organizer re-saving a single trip.
// Shared by the admin "direct promote" endpoint and the promotion-request
// approval flow — both just resolve a { from, until } and hand it here.
export async function promoteOrganizer(user, from, until, priority) {
  const org = user.organizer || {};
  org.promotedFrom = from;
  org.promotedUntil = until;

  if (!until) {
    org.promotionPriority = 0;
  } else if (priority !== undefined) {
    org.promotionPriority = priority;
  } else if (!org.promotionPriority || org.promotionPriority <= 0) {
    // Assign next available priority so new promotions sit at the end of the promoted list
    const highest = await User.findOne({
      isOrganizer: true,
      'organizer.promotedUntil': { $gt: new Date() },
    })
      .sort({ 'organizer.promotionPriority': -1 })
      .select('organizer.promotionPriority');

    org.promotionPriority = (highest?.organizer?.promotionPriority || 0) + 1;
  }

  user.organizer = org;
  await user.save();

  await Trip.updateMany(
    { organizerEmail: user.email },
    {
      $set: {
        'organizer.promotedUntil': until,
        'organizer.promotionPriority': org.promotionPriority || 0,
      },
    },
  );
  return user;
}

export async function unpromoteOrganizer(user) {
  return promoteOrganizer(user, null, null, 0);
}

// Reorders promoted organizers according to the given array of user IDs.
// Sets promotionPriority = 1 for the 1st organizer, 2 for the 2nd, etc.
// Instantly synchronizes both User.organizer and all associated Trip listings.
export async function updatePromotedOrganizersOrder(organizerIds = []) {
  const updatedUsers = [];
  for (let i = 0; i < organizerIds.length; i++) {
    const id = organizerIds[i];
    const priority = i + 1;

    const user = await User.findOne({ _id: id, isOrganizer: true });
    if (user) {
      const org = user.organizer || {};
      org.promotionPriority = priority;
      user.organizer = org;
      await user.save();

      await Trip.updateMany(
        { organizerEmail: user.email },
        { $set: { 'organizer.promotionPriority': priority } },
      );
      updatedUsers.push(user);
    }
  }
  return updatedUsers;
}
