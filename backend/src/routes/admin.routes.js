import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { setOrganizerStatus, listOrganizers, createOrganizer, updateOrganizer, deleteOrganizer } from '../controllers/adminOrganizerController.js';
import { listUsers, getUser, setUserStatus, deleteUser, createUser, updateUser } from '../controllers/adminUserController.js';
import { listAllTrips, adminSetTripStatus, adminSetTripFeatured, adminSetTripPopular, adminDeleteTrip } from '../controllers/tripController.js';
import { adminListTreks, createTrek, updateTrek, deleteTrek } from '../controllers/trekController.js';
import { adminListTrekRequests, adminUpdateTrekRequest, adminSetTrekRequestStatus } from '../controllers/trekRequestController.js';
import {
  listCoupons, createCoupon, updateCoupon, toggleCouponStatus, deleteCoupon,
} from '../controllers/couponController.js';
import {
  adminListOrganizerCoupons, adminUpdateOrganizerCoupon, adminToggleOrganizerCoupon, adminDeleteOrganizerCoupon,
} from '../controllers/adminOrganizerCouponController.js';
import { listAllBookings, adminSetBookingStatus } from '../controllers/bookingController.js';
import { getAdminConfig, updateAdminConfig, resetPlatformDatabase } from '../controllers/configController.js';
import { getAdminLandingContent, updateAdminLandingContent } from '../controllers/landingController.js';
import { getAdminLoyaltyConfig, updateAdminLoyaltyConfig } from '../controllers/loyaltyController.js';
import { createBroadcast, listBroadcasts } from '../controllers/broadcastController.js';
import { listAllPayouts, settlePayout } from '../controllers/financialsController.js';
import { getAnalytics } from '../controllers/analyticsController.js';
import { updateAdminProfile } from '../controllers/authController.js';

// Everything under here requires an authenticated admin.
const router = Router();

router.use('/admin', requireAuth, requireRole('admin'));

router.patch('/admin/profile', updateAdminProfile);

router.get('/admin/users', listUsers);
router.post('/admin/users', createUser);
router.get('/admin/users/:id', getUser);
router.patch('/admin/users/:id/status', setUserStatus);
router.patch('/admin/users/:id', updateUser);
router.delete('/admin/users/:id', deleteUser);

router.get('/admin/organizers', listOrganizers);
router.post('/admin/organizers', createOrganizer);
router.patch('/admin/organizers/:id/status', setOrganizerStatus);
router.patch('/admin/organizers/:id', updateOrganizer);
router.delete('/admin/organizers/:id', deleteOrganizer);

router.get('/admin/trips', listAllTrips);
router.patch('/admin/trips/:id/status', adminSetTripStatus);
router.patch('/admin/trips/:id/featured', adminSetTripFeatured);
router.patch('/admin/trips/:id/popular', adminSetTripPopular);
router.delete('/admin/trips/:id', adminDeleteTrip);

router.get('/admin/treks', adminListTreks);
router.post('/admin/treks', createTrek);
router.put('/admin/treks/:id', updateTrek);
router.delete('/admin/treks/:id', deleteTrek);

router.get('/admin/trek-requests', adminListTrekRequests);
router.put('/admin/trek-requests/:id', adminUpdateTrekRequest);
router.patch('/admin/trek-requests/:id/status', adminSetTrekRequestStatus);

router.get('/admin/coupons', listCoupons);
router.post('/admin/coupons', createCoupon);
router.put('/admin/coupons/:id', updateCoupon);
router.patch('/admin/coupons/:id/toggle', toggleCouponStatus);
router.delete('/admin/coupons/:id', deleteCoupon);

// Organizer coupons — moderation only (edit/pause/delete); organizers remain
// the sole authors, so there's deliberately no admin "create" route here.
router.get('/admin/organizer-coupons', adminListOrganizerCoupons);
router.put('/admin/organizer-coupons/:id', adminUpdateOrganizerCoupon);
router.patch('/admin/organizer-coupons/:id/toggle', adminToggleOrganizerCoupon);
router.delete('/admin/organizer-coupons/:id', adminDeleteOrganizerCoupon);

router.get('/admin/bookings', listAllBookings);
router.patch('/admin/bookings/:id/status', adminSetBookingStatus);

router.get('/admin/config', getAdminConfig);
router.patch('/admin/config', updateAdminConfig);
router.post('/admin/reset-database', resetPlatformDatabase);

router.get('/admin/landing-content', getAdminLandingContent);
router.patch('/admin/landing-content', updateAdminLandingContent);

router.get('/admin/loyalty/config', getAdminLoyaltyConfig);
router.patch('/admin/loyalty/config', updateAdminLoyaltyConfig);

router.post('/admin/broadcast', createBroadcast);
router.get('/admin/broadcasts', listBroadcasts);

router.get('/admin/payouts', listAllPayouts);
router.patch('/admin/payouts/:id', settlePayout);

router.get('/admin/analytics', getAnalytics);

export default router;
