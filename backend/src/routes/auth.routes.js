import { Router } from 'express';
import {
  registerCustomer, loginCustomer, requestOtp, verifyOtp, verifyPhone, googleAuth,
  registerOrganizer, loginOrganizer, loginAdmin, me, logout,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Customer
router.post('/auth/register', registerCustomer);
router.post('/auth/login', loginCustomer);
router.post('/auth/otp/request', requestOtp);
router.post('/auth/otp/verify', verifyOtp);
router.post('/auth/phone/verify', verifyPhone);
router.post('/auth/google', googleAuth);

// Organizer
router.post('/auth/organizer/register', registerOrganizer);
router.post('/auth/organizer/login', loginOrganizer);

// Admin
router.post('/auth/admin/login', loginAdmin);

// Shared
router.get('/auth/me', requireAuth, me);
router.post('/auth/logout', requireAuth, logout);

export default router;
