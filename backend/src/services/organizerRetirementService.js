import { randomUUID } from 'node:crypto';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Booking from '../models/Booking.js';
import Chat from '../models/Chat.js';
import Payout from '../models/Payout.js';
import PromotionRequest from '../models/PromotionRequest.js';
import TrekRequest from '../models/TrekRequest.js';
import Notification from '../models/Notification.js';
import Voucher from '../models/Voucher.js';
import Coupon from '../models/Coupon.js';
import { disconnectUser } from '../lib/socket.js';

// Existing collections use email as their ownership key. On removal, move
// that lifecycle to a unique, non-login key; never delete financial history or
// let a later registration with the same contact details inherit it.
export async function completeOrganizerRetirement(user) {
  if (!user.organizerRetirementKey) return;
  const email = user.email;
  const key = user.organizerRetirementKey;
  const archivedOrganizer = user.organizerRetirementSnapshot;
  await Promise.all([
    ...[Trip, Booking, Chat, Payout, PromotionRequest].map((Model) => Model.updateMany(
      { organizerEmail: email },
      { $set: { organizerEmail: key, archivedOrganizer, ...(Model === Trip ? { status: 'Draft', 'organizer.promotedUntil': null, 'organizer.promotedFrom': null } : {}) } },
    )),
    TrekRequest.updateMany({ requestedByEmail: email }, { $set: { requestedByEmail: key, archivedOrganizer } }),
    Notification.updateMany({ ownerType: 'organizer', ownerKey: email }, { $set: { ownerKey: key } }),
    Voucher.updateMany({ ownerType: 'organizer', ownerKey: email }, { $set: { ownerKey: key } }),
    Coupon.deleteMany({ organizerEmail: email }),
  ]);
  // Keep the pending marker until EVERY collection has been moved. A failed
  // removal is retryable, and registration completes it before enabling access.
  await User.updateOne({ _id: user._id, organizerRetirementKey: key }, {
    $unset: { organizerRetirementKey: 1, organizerRetirementSnapshot: 1 },
  });
  user.organizerRetirementKey = undefined;
  user.organizerRetirementSnapshot = undefined;
}

export async function retireOrganizer(user) {
  if (!user.organizerRetirementKey) {
    const org = user.organizer || {};
    const snapshot = {
      userId: user._id.toString(), email: user.email,
      name: org.agencyName || user.name,
      supportEmail: org.supportEmail || user.email,
      supportPhone: org.supportPhone || user.mobile || '',
      avatar: user.avatar || '', retiredAt: new Date(),
    };
    user = await User.findOneAndUpdate({ _id: user._id, organizerRetirementKey: null }, {
      $set: { isOrganizer: false, organizer: null, fcmToken: '', fcmTokens: [], organizerRetirementKey: `retired-organizer:${randomUUID()}`, organizerRetirementSnapshot: snapshot },
      $inc: { sessionVersion: 1 },
    }, { new: true }) || await User.findById(user._id);
  }
  disconnectUser(user.email);
  await completeOrganizerRetirement(user);
  return user;
}
