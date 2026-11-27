import Notification from '../models/Notification.js';
import Admin from '../models/Admin.js';
import { pushToUser, pushToAdmin } from './pushService.js';

// Emits one notification to a specific recipient.
//
// Two channels, one call: the in-app row (read by the notification drawer) and
// a push to the recipient's registered devices. The push is deliberately NOT
// awaited — it involves a network round trip to FCM, and the booking, payment
// or message that raised the notification must not wait on it, nor fail if a
// device token has gone stale.
export const emitNotification = async (ownerType, ownerKey, { title, content, type = 'System', data = {}, eventKey }) => {
  let notification;
  const key = eventKey ? `${eventKey}:${ownerType}:${ownerKey}` : undefined;
  try {
    notification = await Notification.create({ ownerType, ownerKey, title, content, type, data, ...(key ? { eventKey: key } : {}) });
  } catch (error) {
    if (key && error.code === 11000) return Notification.findOne({ eventKey: key });
    throw error;
  }
  const deliver = ownerType === 'admin' ? pushToAdmin : pushToUser;
  deliver(ownerKey, { title, content, type }, { ownerType, ...data })
    .catch((err) => console.error('[notifications] push failed:', err?.message || err));
  return notification;
};

export async function notifyOrganizerApplication(user) {
  try {
    const admins = await Admin.find().select('email').lean();
    await Promise.all(admins.map((admin) => emitNotification('admin', admin.email, {
      title: 'New organizer application pending approval',
      content: `${user.organizer.agencyName} has applied to become an organizer. Click to review the application.`,
      type: 'OrganizerApplication',
      data: { url: '/admin/organizers', organizerId: user._id.toString() },
      eventKey: `organizer-application:${user._id}:${user.sessionVersion || 0}`,
    })));
  } catch (error) { console.error('[notifications] application alert failed:', error.message); }
}

export async function notifyOrganizerApproved(user) {
  try {
    await emitNotification('organizer', user.email, {
      title: 'Congratulations! Your application is approved',
      content: 'Click here to continue your organizer onboarding journey and add your payout details.',
      type: 'OrganizerApproval', data: { url: '/organizer/dashboard' },
      eventKey: `organizer-approval:${user._id}:${user.sessionVersion || 0}`,
    });
  } catch (error) { console.error('[notifications] approval alert failed:', error.message); }
}

// Convenience wrappers for the two audiences.
export const notifyCustomer = (email, payload) => emitNotification('customer', email, payload);
export const notifyOrganizer = (email, payload) => emitNotification('organizer', email, payload);

// Purges notifications older than specified days (default 30 days / 1 month)
// Useful as an immediate boot cleanup and programmatic safeguard alongside MongoDB TTL index.
export const purgeExpiredNotifications = async (days = 30) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
  if (result?.deletedCount > 0) {
    console.log(`[notifications] Purged ${result.deletedCount} notification(s) older than ${days} days.`);
  }
  return result;
};
