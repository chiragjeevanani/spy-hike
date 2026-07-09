import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { setOrganizerStatus, listOrganizers } from '../controllers/adminOrganizerController.js';
import { listAllTrips, adminSetTripStatus, adminDeleteTrip } from '../controllers/tripController.js';

// Everything under here requires an authenticated admin.
const router = Router();

router.use('/admin', requireAuth, requireRole('admin'));

router.get('/admin/organizers', listOrganizers);
router.patch('/admin/organizers/:id/status', setOrganizerStatus);

router.get('/admin/trips', listAllTrips);
router.patch('/admin/trips/:id/status', adminSetTripStatus);
router.delete('/admin/trips/:id', adminDeleteTrip);

export default router;
