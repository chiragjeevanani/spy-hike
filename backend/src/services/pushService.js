import User from '../models/User.js';
import { pushProvider } from './fcmService.js';

// Mirrors an in-app notification onto the recipient's devices.
//
// Every notification the platform raises goes through notificationService's
// emitNotification(), which writes the in-app row and then calls this. Before
// it existed, only admin broadcasts ever sent a push — so a booking landed in
// the organizer's notification list but their phone stayed silent.

// A person's customer and organizer roles are one account (the unified model),
// so tokens are stored once per account and a push reaches whichever app that
// device has installed.
const tokensOf = (user) =>
  [...new Set([...(user.fcmTokens || []), user.fcmToken].filter(Boolean))];

// Drops tokens FCM has told us are dead, so the next notification doesn't pay
// for them again.
async function pruneTokens(user, deadTokens) {
  if (!deadTokens?.length) return;
  const update = { $pull: { fcmTokens: { $in: deadTokens } } };
  if (user.fcmToken && deadTokens.includes(user.fcmToken)) update.$set = { fcmToken: '' };
  await User.updateOne({ _id: user._id }, update);
}

// Which per-account switch governs each kind of notification. The account has
// three (Bookings, Updates, Promotions) and they are independent: someone who
// turns Updates off has NOT asked to stop hearing that their trek was booked.
// An unknown type falls back to the general Updates switch.
const PREFERENCE_FOR_TYPE = {
  Booking: 'notificationBookings',
  Payment: 'notificationBookings',
  Promo: 'notificationPromo',
  Offer: 'notificationPromo',
};

const allowsPush = (user, type) => {
  const flag = PREFERENCE_FOR_TYPE[type] || 'notificationUpdates';
  return user[flag] !== false;
};

/**
 * Sends `{ title, content, type }` to every device belonging to `email`.
 * Resolves to a summary; never rejects — a failing device token must not break
 * the booking, payment or chat that produced the notification.
 */
export async function pushToUser(email, { title, content, type = 'System' } = {}, extraData = {}) {
  try {
    if (!email) return { sent: 0, skipped: 'no recipient' };

    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
      .select('fcmToken fcmTokens notificationBookings notificationUpdates notificationPromo status')
      .lean();
    if (!user) return { sent: 0, skipped: 'no account' };
    // Someone who switched this category off in their settings still gets the
    // in-app notification — push is the channel they opted out of.
    if (!allowsPush(user, type)) return { sent: 0, skipped: 'opted out' };
    if (user.status === 'Banned') return { sent: 0, skipped: 'banned' };

    const tokens = tokensOf(user);
    if (!tokens.length) return { sent: 0, skipped: 'no device registered' };

    const result = await pushProvider.sendToTokens(tokens, title, content, { type, ...extraData });
    await pruneTokens(user, result.deadTokens);
    return result;
  } catch (err) {
    console.error('[push] delivery failed:', err?.message || err);
    return { sent: 0, error: err?.message || String(err) };
  }
}

export default pushToUser;
