// Zero-setup dev/e2e server: boots the real Express app against an ephemeral
// in-memory MongoDB (no Atlas needed) and seeds reference data. Handy for
// local end-to-end runs and for anyone who wants to try the full stack
// without provisioning a database.
//
//   node src/dev-memory-server.js         (defaults to PORT 4000)
//
// Data is wiped when the process exits — this is NOT for real persistence;
// use `npm start` (server.js + Atlas) for that.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { upsertAdmin, upsertCategories, upsertCoupons, upsertTrips } from './seed.js';
import Admin from './models/Admin.js';
import User from './models/User.js';
import Trek from './models/Trek.js';
import Trip from './models/Trip.js';
import { provisionDepartures } from './services/inventoryService.js';
import { hashPassword } from './utils/password.js';

async function seedCatalogTrips() {
  const trekId = 'valley-of-flowers-scenic-valley';
  await Trek.findOneAndUpdate(
    { _id: trekId },
    {
      _id: trekId,
      title: 'Valley of Flowers Scenic Valley',
      location: 'Chamoli, Uttarakhand',
      state: 'Uttarakhand',
      city: 'Joshimath',
      difficulty: 'Moderate',
      durationDays: 6,
      distanceKm: 38,
      elevationMeters: 3658,
      coverImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
      category: 'Trekking',
      status: 'Active',
      trending: true,
    },
    { upsert: true, new: true },
  );

  const trip = await Trip.findOneAndUpdate(
    { _id: 'vof-himalayan-guides' },
    {
      _id: 'vof-himalayan-guides',
      trekId,
      name: 'Valley of Flowers Scenic Valley',
      organizerEmail: 'demo@himalayan.com',
      organizer: {
        name: 'Himalayan Guides Ltd',
        avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=150&q=80',
        rating: 4.9,
        verified: true,
      },
      location: 'Chamoli, Uttarakhand',
      state: 'Uttarakhand',
      city: 'Joshimath',
      pricingTiers: [
        { id: 'solo', label: 'Solo', price: 1200 },
        { id: 'couple', label: 'Couple', price: 2200 },
      ],
      pickup: { location: 'Haridwar', price: 100 },
      startPoint: { lat: 30.72, lng: 79.6, label: 'Govindghat' },
      departureDates: ['2026-11-05', '2026-11-19', '2026-12-03'],
      difficulty: 'Moderate',
      durationDays: 6,
      maxGroupSize: 20,
      availableSeats: 20,
      category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
      description: 'UNESCO World Heritage alpine valley blanketed with hundreds of endemic wildflower species.',
      status: 'Published',
    },
    { upsert: true, new: true },
  );
  await provisionDepartures(trip);

  const trekId2 = 'himalayan-ridge-pass-trek';
  await Trek.findOneAndUpdate(
    { _id: trekId2 },
    {
      _id: trekId2,
      title: 'Himalayan Ridge Pass Trek',
      location: 'Manali, Himachal Pradesh',
      state: 'Himachal Pradesh',
      city: 'Manali',
      difficulty: 'Moderate',
      durationDays: 5,
      distanceKm: 32,
      elevationMeters: 4200,
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      category: 'Trekking',
      status: 'Active',
      trending: true,
    },
    { upsert: true, new: true },
  );

  const trip2 = await Trip.findOneAndUpdate(
    { _id: 'himalayan-ridge-pass-trek' },
    {
      _id: 'himalayan-ridge-pass-trek',
      trekId: trekId2,
      name: 'Himalayan Ridge Pass Trek',
      organizerEmail: 'demo@himalayan.com',
      organizer: {
        name: 'Himalayan Guides Ltd',
        avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=150&q=80',
        rating: 4.9,
        verified: true,
      },
      location: 'Manali, Himachal Pradesh',
      state: 'Himachal Pradesh',
      city: 'Manali',
      pricingTiers: [
        { id: 'solo', label: 'Solo', price: 1000 },
        { id: 'couple', label: 'Couple', price: 1900 },
      ],
      pickup: { location: 'Manali Bus Stand', price: 0 },
      startPoint: { lat: 32.24, lng: 77.18, label: 'Manali' },
      departureDates: ['2026-07-20', '2026-11-05', '2026-11-19', '2026-12-03'],
      difficulty: 'Moderate',
      durationDays: 5,
      maxGroupSize: 20,
      availableSeats: 20,
      category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Stunning alpine trek along ridge lines with sweeping Himalayan views.',
      status: 'Published',
    },
    { upsert: true, new: true },
  );
  await provisionDepartures(trip2);
}

async function seedDemoAccounts() {
  await Admin.findOneAndUpdate(
    { email: 'admin@findyourtrek.com' },
    {
      name: 'System Administrator',
      email: 'admin@findyourtrek.com',
      passwordHash: await hashPassword('admin123'),
      displayRole: 'Super Admin',
    },
    { upsert: true, new: true },
  );

  await User.findOneAndUpdate(
    { email: 'chiragjeevanani333@gmail.com' },
    {
      name: 'Chirag Jeevanani',
      email: 'chiragjeevanani333@gmail.com',
      passwordHash: await hashPassword('findyourtrek123'),
      mobile: '9876543210',
      age: 24,
      gender: 'Male',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      hikingExperience: 'Intermediate',
      fitnessLevel: 'High',
      emergencyContact: 'Asha Jeevanani (+91 98765 43219)',
      referralCode: 'TRK-CHIRAG',
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
      },
    },
    { upsert: true, new: true },
  );

  await User.findOneAndUpdate(
    { email: 'demo@himalayan.com' },
    {
      name: 'Himalayan Guides Ltd',
      email: 'demo@himalayan.com',
      passwordHash: await hashPassword('organizer123'),
      mobile: '9876509876',
      referralCode: 'TRK-HIMALAY',
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
      },
    },
    { upsert: true, new: true },
  );
  console.log('✓ Demo accounts seeded');
}

async function start() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('✓ In-memory MongoDB started');

  await upsertAdmin();
  await upsertCategories();
  await upsertCoupons();
  await upsertTrips();
  await seedCatalogTrips();
  await seedDemoAccounts();
  console.log('✓ Trip catalog + coupons seeded');

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`✓ Find Your Trek API (in-memory) on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.connection.close();
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('✗ Failed to start in-memory server:', err);
  process.exit(1);
});
