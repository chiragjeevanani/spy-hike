import { Router } from 'express';
import { requireAuth, requireRole, requireApprovedOrganizer } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Organizer-scoped routes. Everything requires an authenticated organizer;
// approved-only features additionally pass requireApprovedOrganizer.
const router = Router();

router.use('/organizer', requireAuth, requireRole('organizer'));

// Lightweight gate-check the organizer app can call to confirm the account is
// cleared for approved-only features (posting trips, financials, payouts).
// Returns 403 while the account is still pending admin approval.
router.get(
  '/organizer/verify-access',
  requireApprovedOrganizer,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, organizerId: req.organizer._id.toString() });
  }),
);

export default router;
