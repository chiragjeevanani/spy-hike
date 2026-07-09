import { Router } from 'express';
import {
  listTrips, getTrip, getTripDepartures, getTrekOffers, listCategories,
} from '../controllers/tripController.js';
import { listActiveCoupons, validateCouponEndpoint } from '../controllers/couponController.js';

// Public, unauthenticated catalog endpoints consumed by the customer app.
const router = Router();

router.get('/trips', listTrips);
router.get('/trips/:id', getTrip);
router.get('/trips/:id/departures', getTripDepartures);
router.get('/treks/:trekId/offers', getTrekOffers);
router.get('/categories', listCategories);

router.get('/coupons', listActiveCoupons);
router.post('/coupons/validate', validateCouponEndpoint);

export default router;
