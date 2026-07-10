import Broadcast from '../models/Broadcast.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Organizer from '../models/Organizer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// POST /admin/broadcast { title, content, type, target } — records the
// announcement and fans out a notification to every recipient in the audience.
export const createBroadcast = asyncHandler(async (req, res) => {
  const { title, content = '', type = 'System', target = 'both' } = req.body;
  if (!title) throw ApiError.badRequest('title is required');
  if (!['users', 'organizers', 'both'].includes(target)) {
    throw ApiError.badRequest("target must be 'users', 'organizers' or 'both'");
  }

  const broadcast = await Broadcast.create({ title, content, type, target });

  const rows = [];
  if (target === 'users' || target === 'both') {
    const users = await User.find({ status: { $ne: 'Banned' } }).select('email');
    users.forEach((u) => rows.push({ ownerType: 'customer', ownerKey: u.email, title, content, type }));
  }
  if (target === 'organizers' || target === 'both') {
    const orgs = await Organizer.find().select('email');
    orgs.forEach((o) => rows.push({ ownerType: 'organizer', ownerKey: o.email, title, content, type }));
  }
  if (rows.length) await Notification.insertMany(rows);

  res.status(201).json({ broadcast: broadcast.toPublicJSON(), delivered: rows.length });
});

// GET /admin/broadcasts — announcement history.
export const listBroadcasts = asyncHandler(async (req, res) => {
  const items = await Broadcast.find().sort({ createdAt: -1 }).limit(100);
  res.json({ broadcasts: items.map((b) => b.toPublicJSON()) });
});
