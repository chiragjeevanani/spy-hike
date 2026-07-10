import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createBooking, listMyBookings, getMyBooking } from '../controllers/bookingController.js';
import { createReview } from '../controllers/reviewController.js';
import { getWishlist, setWishlist } from '../controllers/wishlistController.js';
import {
  listCustomerNotifications, markCustomerNotificationRead, markAllCustomerNotificationsRead,
} from '../controllers/notificationController.js';
import { listCustomerChats, sendCustomerMessage } from '../controllers/chatController.js';

// Customer-authenticated endpoints.
const router = Router();

const customerOnly = [requireAuth, requireRole('customer')];

router.post('/bookings', ...customerOnly, createBooking);
router.get('/bookings', ...customerOnly, listMyBookings);
router.get('/bookings/:id', ...customerOnly, getMyBooking);
router.post('/bookings/:bookingId/review', ...customerOnly, createReview);

router.get('/wishlist', ...customerOnly, getWishlist);
router.put('/wishlist', ...customerOnly, setWishlist);

router.get('/notifications', ...customerOnly, listCustomerNotifications);
router.patch('/notifications/:id/read', ...customerOnly, markCustomerNotificationRead);
router.patch('/notifications/read-all', ...customerOnly, markAllCustomerNotificationsRead);

router.get('/chats', ...customerOnly, listCustomerChats);
router.post('/chats/:tripId/messages', ...customerOnly, sendCustomerMessage);

export default router;
