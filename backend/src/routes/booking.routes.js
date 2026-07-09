import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createBooking, listMyBookings, getMyBooking } from '../controllers/bookingController.js';

// Customer booking endpoints (authenticated customer).
const router = Router();

router.use('/bookings', requireAuth, requireRole('customer'));
router.post('/bookings', createBooking);
router.get('/bookings', listMyBookings);
router.get('/bookings/:id', getMyBooking);

export default router;
