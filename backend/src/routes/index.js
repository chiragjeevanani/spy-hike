import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import catalogRoutes from './catalog.routes.js';
import landingRoutes from './landing.routes.js';
import loyaltyRoutes from './loyalty.routes.js';
import bookingRoutes from './booking.routes.js';
import organizerRoutes from './organizer.routes.js';
import adminRoutes from './admin.routes.js';

// Aggregates every resource router under the /api/v1 mount (see app.js).
// New phases add their routers here.
const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(catalogRoutes);
router.use(landingRoutes);
router.use(loyaltyRoutes);
router.use(bookingRoutes);
router.use(organizerRoutes);
router.use(adminRoutes);

export default router;
