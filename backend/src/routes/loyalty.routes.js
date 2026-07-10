import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getPublicLoyaltyConfig, getCustomerLoyalty } from '../controllers/loyaltyController.js';

const router = Router();

// Public: config (thresholds, reward copy, banners) for both apps.
router.get('/loyalty/config', getPublicLoyaltyConfig);

// Customer: own progress + vouchers.
router.get('/loyalty/me', requireAuth, requireRole('customer'), getCustomerLoyalty);

export default router;
