import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { setOrganizerStatus, listOrganizers } from '../controllers/adminOrganizerController.js';
import { listAllTrips, adminSetTripStatus, adminDeleteTrip } from '../controllers/tripController.js';
import {
  listCoupons, createCoupon, updateCoupon, toggleCouponStatus, deleteCoupon,
} from '../controllers/couponController.js';

// Everything under here requires an authenticated admin.
const router = Router();

router.use('/admin', requireAuth, requireRole('admin'));

router.get('/admin/organizers', listOrganizers);
router.patch('/admin/organizers/:id/status', setOrganizerStatus);

router.get('/admin/trips', listAllTrips);
router.patch('/admin/trips/:id/status', adminSetTripStatus);
router.delete('/admin/trips/:id', adminDeleteTrip);

router.get('/admin/coupons', listCoupons);
router.post('/admin/coupons', createCoupon);
router.put('/admin/coupons/:id', updateCoupon);
router.patch('/admin/coupons/:id/toggle', toggleCouponStatus);
router.delete('/admin/coupons/:id', deleteCoupon);

export default router;
