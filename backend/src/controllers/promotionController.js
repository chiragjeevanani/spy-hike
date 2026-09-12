import PromotionRequest from '../models/PromotionRequest.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { promoteOrganizer, unpromoteOrganizer, updatePromotedOrganizersOrder } from '../services/promotionService.js';

// Validates an admin-picked { startDate, endDate } pair and returns real Date
// objects. Shared by direct-promote and request-approval, since both end up
// calling promoteOrganizer() with the same window.
function parseWindow(startDate, endDate) {
  if (!startDate || !endDate) throw ApiError.badRequest('startDate and endDate are required');
  const from = new Date(startDate);
  const until = new Date(endDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime())) {
    throw ApiError.badRequest('startDate/endDate must be valid dates');
  }
  if (until <= from) throw ApiError.badRequest('endDate must be after startDate');
  if (until <= new Date()) throw ApiError.badRequest('endDate must be in the future');
  return { from, until };
}

// ─── Organizer ───────────────────────────────────────────────────────────────

// POST /organizer/promotion-requests — an approved organizer asks the admin
// to boost them for a while. Only one open ask at a time so the admin's queue
// can't fill up with duplicates from the same organizer.
export const createPromotionRequest = asyncHandler(async (req, res) => {
  const existing = await PromotionRequest.findOne({ organizerEmail: req.organizer.email, status: 'Pending' });
  if (existing) throw ApiError.conflict('You already have a pending promotion request');

  const { message, requestedDays } = req.body;
  const request = await PromotionRequest.create({
    _id: `promo-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    organizerEmail: req.organizer.email,
    organizerName: req.organizer.agencyName || req.organizer.name,
    message: (message || '').trim(),
    requestedDays: Number(requestedDays) > 0 ? Number(requestedDays) : 30,
    status: 'Pending',
  });
  res.status(201).json({ request: request.toPublicJSON() });
});

// GET /organizer/promotion-requests — the calling organizer's own history,
// newest first, so the profile page can show "pending" / "rejected: <note>"
// without the organizer having to guess.
export const listMyPromotionRequests = asyncHandler(async (req, res) => {
  const requests = await PromotionRequest.find({ organizerEmail: req.organizer.email }).sort({ createdAt: -1 });
  res.json({ requests: requests.map((r) => r.toPublicJSON()) });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminListPromotionRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (['Pending', 'Approved', 'Rejected'].includes(status)) filter.status = status;
  const requests = await PromotionRequest.find(filter).sort({ createdAt: -1 });
  res.json({ requests: requests.map((r) => r.toPublicJSON()) });
});

// PATCH /admin/promotion-requests/:id { action: 'approve'|'reject', startDate, endDate, reviewNote }
export const adminReviewPromotionRequest = asyncHandler(async (req, res) => {
  const request = await PromotionRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Promotion request not found');
  if (request.status !== 'Pending') {
    throw ApiError.badRequest(`This request is already ${request.status.toLowerCase()}`);
  }

  const { action, startDate, endDate, reviewNote } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    throw ApiError.badRequest("action must be 'approve' or 'reject'");
  }

  if (action === 'reject') {
    request.status = 'Rejected';
    request.reviewNote = (reviewNote || '').trim();
    await request.save();
    return res.json({ request: request.toPublicJSON() });
  }

  const { from, until } = parseWindow(startDate, endDate);
  const user = await User.findOne({ email: request.organizerEmail, isOrganizer: true });
  if (!user) throw ApiError.notFound('Organizer not found');

  await promoteOrganizer(user, from, until);

  request.status = 'Approved';
  request.promotedFrom = from;
  request.promotedUntil = until;
  request.reviewNote = (reviewNote || '').trim();
  await request.save();

  res.json({ request: request.toPublicJSON(), organizer: user.toOrganizerJSON() });
});

// PATCH /admin/organizers/:id/promote { startDate, endDate } — admin-initiated,
// no organizer request on file.
export const promoteOrganizerDirect = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.body;
  const { from, until } = parseWindow(startDate, endDate);

  const user = await User.findOne({ _id: req.params.id, isOrganizer: true });
  if (!user) throw ApiError.notFound('Organizer not found');

  await promoteOrganizer(user, from, until);
  res.json({ organizer: user.toOrganizerJSON() });
});

// PATCH /admin/organizers/:id/unpromote
export const adminUnpromoteOrganizer = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, isOrganizer: true });
  if (!user) throw ApiError.notFound('Organizer not found');

  await unpromoteOrganizer(user);
  res.json({ organizer: user.toOrganizerJSON() });
});

// GET /admin/promoted-organizers — lists all currently active promoted organizers sorted by promotionPriority
export const adminListPromotedOrganizers = asyncHandler(async (req, res) => {
  const now = new Date();
  const organizers = await User.find({
    isOrganizer: true,
    'organizer.promotedUntil': { $gt: now },
  });

  const json = organizers.map((o) => o.toOrganizerJSON());
  json.sort((a, b) => {
    const priA = (a.promotionPriority > 0) ? a.promotionPriority : 999999;
    const priB = (b.promotionPriority > 0) ? b.promotionPriority : 999999;
    if (priA !== priB) return priA - priB;
    return new Date(b.promotedUntil || 0) - new Date(a.promotedUntil || 0);
  });

  res.json({ organizers: json });
});

// PUT /admin/promoted-organizers/order { organizerIds: [id1, id2, ...] }
export const adminUpdatePromotedOrganizersOrder = asyncHandler(async (req, res) => {
  const { organizerIds } = req.body;
  if (!Array.isArray(organizerIds)) {
    throw ApiError.badRequest('organizerIds must be an array of organizer user IDs');
  }

  await updatePromotedOrganizersOrder(organizerIds);

  const now = new Date();
  const organizers = await User.find({
    isOrganizer: true,
    'organizer.promotedUntil': { $gt: now },
  });

  const json = organizers.map((o) => o.toOrganizerJSON());
  json.sort((a, b) => {
    const priA = (a.promotionPriority > 0) ? a.promotionPriority : 999999;
    const priB = (b.promotionPriority > 0) ? b.promotionPriority : 999999;
    if (priA !== priB) return priA - priB;
    return new Date(b.promotedUntil || 0) - new Date(a.promotedUntil || 0);
  });

  res.json({ organizers: json });
});

