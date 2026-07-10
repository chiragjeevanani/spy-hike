import { Router } from 'express';
import { requireAuth, requireRole, requireApprovedOrganizer } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listOrganizerTrips, createTrip, updateTrip, setOrganizerTripStatus, deleteOrganizerTrip,
} from '../controllers/tripController.js';
import { listOrganizerBookings, checkinBooking } from '../controllers/bookingController.js';

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

// Trip management — approved organizers only.
router.get('/organizer/trips', requireApprovedOrganizer, listOrganizerTrips);
router.post('/organizer/trips', requireApprovedOrganizer, createTrip);
router.put('/organizer/trips/:id', requireApprovedOrganizer, updateTrip);
router.patch('/organizer/trips/:id/status', requireApprovedOrganizer, setOrganizerTripStatus);
router.delete('/organizer/trips/:id', requireApprovedOrganizer, deleteOrganizerTrip);

router.get('/organizer/bookings', requireApprovedOrganizer, listOrganizerBookings);
router.post('/organizer/bookings/:bookingId/checkin', requireApprovedOrganizer, checkinBooking);

export default router;
