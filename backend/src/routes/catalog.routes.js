import { Router } from 'express';
import { listTrips, getTrip, getTrekOffers, listCategories } from '../controllers/tripController.js';

// Public, unauthenticated catalog endpoints consumed by the customer app.
const router = Router();

router.get('/trips', listTrips);
router.get('/trips/:id', getTrip);
router.get('/treks/:trekId/offers', getTrekOffers);
router.get('/categories', listCategories);

export default router;
