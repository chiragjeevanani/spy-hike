import Organizer from '../models/Organizer.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Admin-only organizer moderation. This is the ONLY path that can approve an
// organizer — the old client-side "instant self-approve" shortcut is removed.
// Introduced in Phase 1; the admin UI wires reject/suspend fully in Phase 9.
export const setOrganizerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' | 'reject' | 'suspend'

  const organizer = await Organizer.findById(id);
  if (!organizer) throw ApiError.notFound('Organizer not found');

  switch (action) {
    case 'approve':
      organizer.isApproved = true;
      organizer.isPendingApproval = false;
      organizer.isRejected = false;
      break;
    case 'reject':
      organizer.isApproved = false;
      organizer.isPendingApproval = false;
      organizer.isRejected = true;
      break;
    case 'suspend':
      organizer.isApproved = false;
      organizer.isPendingApproval = false;
      break;
    default:
      throw ApiError.badRequest("action must be one of 'approve', 'reject', 'suspend'");
  }

  await organizer.save();
  res.json({ organizer: organizer.toPublicJSON() });
});

// List organizers, optionally filtered by status, for the admin console.
// Fuller admin organizer CRUD lands in Phase 9; this supports the Phase 1
// approval flow + its tests.
export const listOrganizers = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status === 'pending') Object.assign(filter, { isPendingApproval: true, isApproved: false });
  if (status === 'approved') Object.assign(filter, { isApproved: true });
  if (status === 'rejected') Object.assign(filter, { isRejected: true });

  const organizers = await Organizer.find(filter).sort({ createdAt: -1 });
  res.json({ organizers: organizers.map((o) => o.toPublicJSON()) });
});
