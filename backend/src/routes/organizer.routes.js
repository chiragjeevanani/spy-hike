import { Router } from 'express';
import { requireAuth, requireOrganizerAccount, requireApprovedOrganizer } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listOrganizerTrips, createTrip, updateTrip, setOrganizerTripStatus, deleteOrganizerTrip,
} from '../controllers/tripController.js';
import { listOrganizerBookings, checkinBooking, redeemOrganizerReward } from '../controllers/bookingController.js';
import { getOrganizerLoyalty } from '../controllers/loyaltyController.js';
import {
  listOrganizerNotifications, markOrganizerNotificationRead, markAllOrganizerNotificationsRead,
} from '../controllers/notificationController.js';
import { listOrganizerChats, sendOrganizerMessage, markOrganizerChatRead } from '../controllers/chatController.js';
import {
  getOrganizerFinancials, listOrganizerPayouts, requestPayout, updateBankDetails,
} from '../controllers/financialsController.js';
import { createTrekRequest, listMyTrekRequests } from '../controllers/trekRequestController.js';
import {
  listMyCoupons, createMyCoupon, updateMyCoupon, toggleMyCouponStatus, deleteMyCoupon,
} from '../controllers/organizerCouponController.js';

// Organizer-scoped routes. Everything requires an authenticated organizer;
// approved-only features additionally pass requireApprovedOrganizer.
const router = Router();

router.use('/organizer', requireAuth, requireOrganizerAccount);

// Lightweight gate-check the organizer app can call to confirm the account is
// cleared for approved-only features (posting trips, financials, payouts).
// Returns 403 while the account is still pending admin approval.
router.get(
  '/organizer/verify-access',
  requireApprovedOrganizer,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, organizerId: req.organizer.id });
  }),
);

// Trip management — approved organizers only.
router.get('/organizer/trips', requireApprovedOrganizer, listOrganizerTrips);
router.post('/organizer/trips', requireApprovedOrganizer, createTrip);
router.put('/organizer/trips/:id', requireApprovedOrganizer, updateTrip);
router.patch('/organizer/trips/:id/status', requireApprovedOrganizer, setOrganizerTripStatus);
router.delete('/organizer/trips/:id', requireApprovedOrganizer, deleteOrganizerTrip);

// Coupons — approved organizers only.
router.get('/organizer/coupons', requireApprovedOrganizer, listMyCoupons);
router.post('/organizer/coupons', requireApprovedOrganizer, createMyCoupon);
router.put('/organizer/coupons/:id', requireApprovedOrganizer, updateMyCoupon);
router.patch('/organizer/coupons/:id/toggle', requireApprovedOrganizer, toggleMyCouponStatus);
router.delete('/organizer/coupons/:id', requireApprovedOrganizer, deleteMyCoupon);

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
router.patch('/organizer/chats/:chatId/read', requireApprovedOrganizer, markOrganizerChatRead);

router.get('/organizer/financials', requireApprovedOrganizer, getOrganizerFinancials);
router.get('/organizer/payouts', requireApprovedOrganizer, listOrganizerPayouts);
router.post('/organizer/payouts', requireApprovedOrganizer, requestPayout);
router.patch('/organizer/bank-details', requireApprovedOrganizer, updateBankDetails);

// "My trek isn't in the catalog" proposals — approved organizers only, same
// gate as posting trips, since that's the only thing this unlocks.
router.post('/organizer/trek-requests', requireApprovedOrganizer, createTrekRequest);
router.get('/organizer/trek-requests', requireApprovedOrganizer, listMyTrekRequests);

export default router;
