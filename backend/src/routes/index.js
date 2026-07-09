import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import organizerRoutes from './organizer.routes.js';
import adminRoutes from './admin.routes.js';

// Aggregates every resource router under the /api/v1 mount (see app.js).
// New phases add their routers here.
const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(organizerRoutes);
router.use(adminRoutes);

export default router;
