import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createBooking, listMyBookings, getMyBooking, cancelBooking } from '../controllers/bookingController.js';
import {
  getPaymentConfig, retryBookingPayment, getBookingPaymentStatus,
} from '../controllers/paymentController.js';
import { createReview, listMyReviews } from '../controllers/reviewController.js';
import { getWishlist, setWishlist } from '../controllers/wishlistController.js';
import {
  listCustomerNotifications, markCustomerNotificationRead, markAllCustomerNotificationsRead,
} from '../controllers/notificationController.js';
import { listCustomerChats, sendCustomerMessage } from '../controllers/chatController.js';
import { listCustomerChats, getCustomerTripChat, sendCustomerMessage } from '../controllers/chatController.js';

// Customer-authenticated endpoints.
const router = Router();

// Accepts a customer- or organizer-scoped token: both roles are the same
// underlying User document in the unified account model, so an organizer
// holding an organizer-scoped token can still book/wishlist/chat as a
// traveller without needing to switch roles first. Only Admin (a separate
// collection/identity) is excluded.
const customerOnly = [requireAuth, requireRole('customer', 'organizer')];

router.post('/bookings', ...customerOnly, createBooking);
router.get('/bookings', ...customerOnly, listMyBookings);
router.get('/bookings/:id', ...customerOnly, getMyBooking);
router.post('/bookings/:id/cancel', ...customerOnly, cancelBooking);

// Online payment (PayU). Inert while PAYMENT_MODE is 'arrival' — the config
// endpoint reports mode 'arrival' and the client never redirects to PayU. The
// unauthenticated return and webhook routes live in webhook.routes.js.
router.get('/payments/config', ...customerOnly, getPaymentConfig);
router.get('/bookings/:id/payment', ...customerOnly, getBookingPaymentStatus);
router.post('/bookings/:id/payment/retry', ...customerOnly, retryBookingPayment);
router.post('/bookings/:bookingId/review', ...customerOnly, createReview);
router.get('/reviews/mine', ...customerOnly, listMyReviews);

router.get('/wishlist', ...customerOnly, getWishlist);
router.put('/wishlist', ...customerOnly, setWishlist);

router.get('/notifications', ...customerOnly, listCustomerNotifications);
router.patch('/notifications/:id/read', ...customerOnly, markCustomerNotificationRead);
router.patch('/notifications/read-all', ...customerOnly, markAllCustomerNotificationsRead);

router.get('/chats', ...customerOnly, listCustomerChats);
router.get('/chats/:tripId', ...customerOnly, getCustomerTripChat);
router.post('/chats/:tripId/messages', ...customerOnly, sendCustomerMessage);

export default router;
