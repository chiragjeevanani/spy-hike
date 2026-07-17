import { Router } from 'express';
import {
  registerCustomer, loginCustomer, requestOtp, verifyOtp, verifyPhone, googleAuth,
  registerOrganizer, applyAsOrganizer, loginOrganizer,
  loginAdmin, me, logout, updateProfile, checkAvailability, uploadImage,
  requestEmailOtp, updateProfileVerify, updatePassword, resetPasswordOtp,
  getLinkedOrganizerStatus, getCustomerToken, updateOrganizerProfile, getPublicOrganizerProfile,
  updateFcmToken,
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
router.get('/auth/check-availability', checkAvailability);
router.patch('/auth/profile', requireAuth, updateProfile);
router.post('/auth/upload', requireAuth, uploadImage);
router.post('/auth/email-otp/request', requireAuth, requestEmailOtp);
router.post('/auth/profile/update-verify', requireAuth, updateProfileVerify);
router.post('/auth/password/reset-otp', resetPasswordOtp);
router.patch('/auth/password/change', requireAuth, updatePassword);
router.get('/auth/organizer-status', requireAuth, getLinkedOrganizerStatus);
router.get('/auth/customer-token', requireAuth, getCustomerToken);
router.post('/auth/fcm-token', requireAuth, updateFcmToken);
router.get('/auth/organizer/public/:name', getPublicOrganizerProfile);

// Organizer
router.post('/auth/organizer/register', registerOrganizer);      // standalone new-user sign-up
router.post('/auth/organizer/apply', requireAuth, applyAsOrganizer); // existing customer upgrades
router.post('/auth/organizer/login', loginOrganizer);
router.patch('/auth/organizer/profile', requireAuth, updateOrganizerProfile);

// Admin
router.post('/auth/admin/login', loginAdmin);

// Shared
router.get('/auth/me', requireAuth, me);
router.post('/auth/logout', requireAuth, logout);

export default router;
