import Notification from '../models/Notification.js';
import { pushToUser } from './pushService.js';

// Emits one notification to a specific recipient.
//
// Two channels, one call: the in-app row (read by the notification drawer) and
// a push to the recipient's registered devices. The push is deliberately NOT
// awaited — it involves a network round trip to FCM, and the booking, payment
// or message that raised the notification must not wait on it, nor fail if a
// device token has gone stale.
export const emitNotification = async (ownerType, ownerKey, { title, content, type = 'System', data = {} }) => {
  const notification = await Notification.create({ ownerType, ownerKey, title, content, type });

  // Admins are a separate collection with no devices registered; pushToUser
  // resolves to a no-op for them rather than needing a branch here.
  pushToUser(ownerKey, { title, content, type }, { ownerType, ...data })
    .catch((err) => console.error('[notifications] push failed:', err?.message || err));

  return notification;
};

// Convenience wrappers for the two audiences.
export const notifyCustomer = (email, payload) => emitNotification('customer', email, payload);
export const notifyOrganizer = (email, payload) => emitNotification('organizer', email, payload);
