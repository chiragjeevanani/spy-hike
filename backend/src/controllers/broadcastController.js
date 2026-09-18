import Broadcast from '../models/Broadcast.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendMulticastNotification } from '../services/fcmService.js';

// POST /admin/broadcast { title, content, type, target } — records the
// announcement, fans out database notifications, and broadcasts via FCM tokens list.
export const createBroadcast = asyncHandler(async (req, res) => {
  const { type = 'System', target = 'both' } = req.body;
  if (!req.body.title?.trim()) throw ApiError.badRequest('Message title is required');
  if (!req.body.content?.trim()) throw ApiError.badRequest('Message details are required');
  if (!['users', 'organizers', 'both'].includes(target)) {
    throw ApiError.badRequest("target must be 'users', 'organizers' or 'both'");
  }
  const title = req.body.title.trim();
  const content = req.body.content.trim();

  const broadcast = await Broadcast.create({ title, content, type, target });

  const rows = [];
  const fcmTokens = [];
  if (target === 'users' || target === 'both') {
    const users = await User.find({ status: { $ne: 'Banned' } }).select('email fcmToken fcmTokens');
    users.forEach((u) => {
      rows.push({ ownerType: 'customer', ownerKey: u.email, title, content, type });
      fcmTokens.push(u.fcmToken, ...(u.fcmTokens || []));
    });
  }
  if (target === 'organizers' || target === 'both') {
    const orgs = await User.find({ isOrganizer: true }).select('email fcmToken fcmTokens');
    orgs.forEach((o) => {
      rows.push({ ownerType: 'organizer', ownerKey: o.email, title, content, type });
      fcmTokens.push(o.fcmToken, ...(o.fcmTokens || []));
    });
  }
  if (rows.length) await Notification.insertMany(rows);

  // Send Firebase Cloud Messaging token-based push notifications
  try {
    // One account can have several devices, and the same device can appear
    // under both audiences — dedupe so nobody gets the announcement twice.
    const tokens = [...new Set(fcmTokens.filter(Boolean))];
    if (tokens.length > 0) {
      await sendMulticastNotification(tokens, title, content, { type });
    }
  } catch (err) {
    console.error('FCM token-based multicast send failed:', err.message);
  }

  res.status(201).json({ broadcast: broadcast.toPublicJSON(), delivered: rows.length });
});

// GET /admin/broadcasts — announcement history.
export const listBroadcasts = asyncHandler(async (req, res) => {
  const items = await Broadcast.find().sort({ createdAt: -1 }).limit(100);
  res.json({ broadcasts: items.map((b) => b.toPublicJSON()) });
});
