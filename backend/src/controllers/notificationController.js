import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const RETENTION_DAYS = 30;

// Lists notifications for the caller's audience (customer or organizer) up to 1 month old.
function listFor(ownerType, keyFrom) {
  return asyncHandler(async (req, res) => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const notifs = await Notification.find({
      ownerType,
      ownerKey: keyFrom(req),
      createdAt: { $gte: cutoff },
    })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ notifications: notifs.map((n) => n.toPublicJSON()) });
  });
}

function markReadFor(ownerType, keyFrom) {
  return asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid notification id');
    await Notification.updateOne({ _id: id, ownerType, ownerKey: keyFrom(req) }, { read: true });
    res.json({ ok: true });
  });
}

function markAllReadFor(ownerType, keyFrom) {
  return asyncHandler(async (req, res) => {
    await Notification.updateMany({ ownerType, ownerKey: keyFrom(req) }, { read: true });
    res.json({ ok: true });
  });
}

// The email is in the JWT for both roles, so notifications don't depend on the
// approval-gated req.organizer being present.
const customerKey = (req) => req.user.email;
const organizerKey = (req) => req.user.email;

// Customer
export const listCustomerNotifications = listFor('customer', customerKey);
export const markCustomerNotificationRead = markReadFor('customer', customerKey);
export const markAllCustomerNotificationsRead = markAllReadFor('customer', customerKey);

// Organizer
export const listOrganizerNotifications = listFor('organizer', organizerKey);
export const markOrganizerNotificationRead = markReadFor('organizer', organizerKey);
export const markAllOrganizerNotificationsRead = markAllReadFor('organizer', organizerKey);
