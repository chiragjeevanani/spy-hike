import { Router } from 'express';
import {
  listTrips, getTrip, getTripDepartures, getTrekOffers, listCategories,
  listTrekGroups, listPickupCities,
} from '../controllers/tripController.js';
import { listTreks, getTrek } from '../controllers/trekController.js';
import { listActiveCoupons, validateCouponEndpoint } from '../controllers/couponController.js';
import { listTripReviews } from '../controllers/reviewController.js';
import { cached, TTL } from '../lib/cache.js';

// Public, unauthenticated catalog endpoints consumed by the customer app.
const router = Router();

// Cached: read constantly, written only by an admin or organizer, and every
// write path explicitly invalidates the affected prefix (see cacheInvalidate
// calls in the trip/trek/booking controllers).
//
// Deliberately NOT cached:
//   /trips/:id/departures — live seat availability; a stale count would sell a
//                           seat that no longer exists.
//   /coupons/validate     — a POST, and redemption limits must be exact.
// Params are sorted so ?page=1&limit=8 and ?limit=8&page=1 share one entry
// rather than fragmenting the cache into equivalent-but-distinct keys.
const tripsKey = (req) => {
  const qs = Object.entries(req.query)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
    .sort()
    .join('&');
  return `trips:list:${qs}`;
};
const treksKey = (req) => `treks:list:${req.query.trending === 'true' ? 'trending' : 'all'}`;

// Explore's browse feed: filtered, grouped by trek and paged in the database.
const groupsKey = (req) => {
  const qs = Object.entries(req.query)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
    .sort()
    .join('&');
  return `trips:groups:${qs}`;
};

router.get('/trek-groups', cached(groupsKey, TTL.trips), listTrekGroups);
router.get('/pickup-cities', cached(() => 'trips:pickup-cities', TTL.trips), listPickupCities);
router.get('/trips', cached(tripsKey, TTL.trips), listTrips);
router.get('/trips/:id', cached((req) => `trips:one:${req.params.id}`, TTL.trips), getTrip);
router.get('/trips/:id/departures', getTripDepartures);
router.get('/trips/:id/reviews', listTripReviews);
router.get('/treks', cached(treksKey, TTL.treks), listTreks);
router.get('/treks/:id', cached((req) => `treks:one:${req.params.id}`, TTL.treks), getTrek);
router.get('/treks/:trekId/offers', cached((req) => `trips:offers:${req.params.trekId}`, TTL.trips), getTrekOffers);
router.get('/categories', cached(() => 'categories:list', TTL.categories), listCategories);

router.get('/coupons', listActiveCoupons);
router.post('/coupons/validate', validateCouponEndpoint);

export default router;
