import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getPublicLoyaltyConfig, getCustomerLoyalty } from '../controllers/loyaltyController.js';

const router = Router();

// Public: config (thresholds, reward copy, banners) for both apps.
router.get('/loyalty/config', getPublicLoyaltyConfig);

// Customer: own progress + vouchers. Also accepts an organizer-scoped token
// for the same unified account (see booking.routes.js for why).
router.get('/loyalty/me', requireAuth, requireRole('customer', 'organizer'), getCustomerLoyalty);

export default router;
