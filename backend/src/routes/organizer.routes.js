import { Router } from 'express';
import { requireAuth, requireRole, requireApprovedOrganizer } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listOrganizerTrips, createTrip, updateTrip, setOrganizerTripStatus, deleteOrganizerTrip,
} from '../controllers/tripController.js';
import { listOrganizerBookings, checkinBooking, redeemOrganizerReward } from '../controllers/bookingController.js';
import { getOrganizerLoyalty } from '../controllers/loyaltyController.js';
import {
  listOrganizerNotifications, markOrganizerNotificationRead, markAllOrganizerNotificationsRead,
} from '../controllers/notificationController.js';
import { listOrganizerChats, sendOrganizerMessage } from '../controllers/chatController.js';
import {
  getOrganizerFinancials, listOrganizerPayouts, requestPayout, updateBankDetails,
} from '../controllers/financialsController.js';

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
router.post('/organizer/bookings/:bookingId/redeem-reward', requireApprovedOrganizer, redeemOrganizerReward);

router.get('/organizer/loyalty', requireApprovedOrganizer, getOrganizerLoyalty);

// Notifications + chats don't require approval (a pending organizer can still
// receive/read platform notices).
router.get('/organizer/notifications', listOrganizerNotifications);
router.patch('/organizer/notifications/read-all', markAllOrganizerNotificationsRead);
router.patch('/organizer/notifications/:id/read', markOrganizerNotificationRead);
router.get('/organizer/chats', requireApprovedOrganizer, listOrganizerChats);
router.post('/organizer/chats/:chatId/messages', requireApprovedOrganizer, sendOrganizerMessage);

router.get('/organizer/financials', requireApprovedOrganizer, getOrganizerFinancials);
router.get('/organizer/payouts', requireApprovedOrganizer, listOrganizerPayouts);
router.post('/organizer/payouts', requireApprovedOrganizer, requestPayout);
router.patch('/organizer/bank-details', requireApprovedOrganizer, updateBankDetails);

export default router;
