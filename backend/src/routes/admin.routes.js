import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { setOrganizerStatus, listOrganizers } from '../controllers/adminOrganizerController.js';

// Everything under here requires an authenticated admin.
const router = Router();

router.use('/admin', requireAuth, requireRole('admin'));

router.get('/admin/organizers', listOrganizers);
router.patch('/admin/organizers/:id/status', setOrganizerStatus);

export default router;
