import { getConfig } from '../models/AdminConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/User.js';
import Trip from '../models/Trip.js';
import Booking from '../models/Booking.js';
import Departure from '../models/Departure.js';
import Payout from '../models/Payout.js';
import Review from '../models/Review.js';
import Broadcast from '../models/Broadcast.js';
import AdminConfig from '../models/AdminConfig.js';
import { hashPassword } from '../utils/password.js';
import { upsertCategories, upsertCoupons, upsertTrips } from '../seed.js';

// GET /admin/config — current platform config (commission %, tax %, maintenanceMode).
export const getAdminConfig = asyncHandler(async (req, res) => {
  const cfg = await getConfig();
  res.json({ config: cfg.toPublicJSON() });
});

// PATCH /admin/config — update the commission, tax rate, or maintenance mode.
export const updateAdminConfig = asyncHandler(async (req, res) => {
  const cfg = await getConfig();
  const clampPct = (n) => Math.max(0, Math.min(100, Number(n)));
  if (req.body.commissionRate !== undefined) cfg.commissionRate = clampPct(req.body.commissionRate);
  if (req.body.taxRate !== undefined) cfg.taxRate = clampPct(req.body.taxRate);
  if (req.body.maintenanceMode !== undefined) cfg.maintenanceMode = !!req.body.maintenanceMode;
  await cfg.save();
  res.json({ config: cfg.toPublicJSON() });
});

// POST /admin/reset-database — purge and restore MongoDB database collections to initial seed data.
export const resetPlatformDatabase = asyncHandler(async (req, res) => {
  // 1. Delete transient collections
  await Promise.all([
    Booking.deleteMany({}),
    Departure.deleteMany({}),
    Payout.deleteMany({}),
    Review.deleteMany({}),
    Broadcast.deleteMany({}),
    AdminConfig.deleteMany({}),
  ]);

  // 2. Clear all users (hikers and organizers)
  await User.deleteMany({});

  // 3. Re-create the default seed users (matching what seed.js/frontends expect)
  const sharedEmail = 'chiragjeevanani333@gmail.com';
  const hashedPassword = await hashPassword('findyourtrek123');
  await User.create({
    name: 'Chirag Jeevanani',
    email: sharedEmail,
    passwordHash: hashedPassword,
    mobile: '+91 98765 43210',
    age: 24,
    gender: 'Male',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    hikingExperience: 'Intermediate',
    fitnessLevel: 'High',
    emergencyContact: 'Asha Jeevanani (+91 98765 43219)',
    isOnboarded: true,
    profileSetupComplete: true,
    isOrganizer: true,
    organizer: {
      agencyName: 'Find Your Trek Verified Organizer',
      socialMediaLink: 'https://instagram.com/findyourtrekorganizer',
      bio: 'Verified Find Your Trek organizer.',
      coreCapabilities: ['Certified Trek Leader'],
      yearsExperience: 5,
      rating: 4.8,
      isApproved: true,
      isPendingApproval: false,
    }
  });

  // Himalayan guides demo organizer account
  await User.create({
    name: 'Himalayan Guides Ltd',
    email: 'demo@himalayan.com',
    passwordHash: await hashPassword('organizer123'),
    mobile: '+91 98765 09876',
    isOnboarded: true,
    profileSetupComplete: true,
    isOrganizer: true,
    organizer: {
      agencyName: 'Himalayan Guides Ltd',
      agencyWebsite: 'https://himalayan.com',
      govtIdType: 'Aadhaar',
      govtIdNumber: '1234-5678-9012',
      yearsExperience: 8,
      bio: 'Premium Himalayan expedition organizers with 8+ years experience.',
      avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=150&q=80',
      rating: 4.9,
      totalTrips: 42,
      totalBookings: 380,
      isApproved: true,
      isPendingApproval: false,
    }
  });

  // 4. Restore categories, coupons, and trips
  await upsertCategories();
  await upsertCoupons();
  await upsertTrips();

  res.json({ ok: true, message: 'Database reset to demo seeds successfully' });
});
