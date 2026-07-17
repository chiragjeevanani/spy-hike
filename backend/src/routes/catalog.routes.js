import { Router } from 'express';
import {
  listTrips, getTrip, getTripDepartures, getTrekOffers, listCategories,
} from '../controllers/tripController.js';
import { listTreks, getTrek } from '../controllers/trekController.js';
import { listActiveCoupons, validateCouponEndpoint } from '../controllers/couponController.js';
import { listTripReviews } from '../controllers/reviewController.js';

// Public, unauthenticated catalog endpoints consumed by the customer app.
const router = Router();

router.get('/trips', listTrips);
router.get('/trips/:id', getTrip);
router.get('/trips/:id/departures', getTripDepartures);
router.get('/trips/:id/reviews', listTripReviews);
router.get('/treks', listTreks);
router.get('/treks/:id', getTrek);
router.get('/treks/:trekId/offers', getTrekOffers);
router.get('/categories', listCategories);

router.get('/coupons', listActiveCoupons);
router.post('/coupons/validate', validateCouponEndpoint);

export default router;
