import Notification from '../models/Notification.js';

// Emits one notification to a specific recipient.
export const emitNotification = (ownerType, ownerKey, { title, content, type = 'System' }) =>
  Notification.create({ ownerType, ownerKey, title, content, type });

// Convenience wrappers for the two audiences.
export const notifyCustomer = (email, payload) => emitNotification('customer', email, payload);
export const notifyOrganizer = (email, payload) => emitNotification('organizer', email, payload);
