// Idempotent seed of the demo accounts the frontend has always shipped with,
// so the existing "Quick Demo Access" logins keep working against the real API.
// Run with: `npm run seed` (needs MONGO_URI in .env). Safe to run repeatedly.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import User from './models/User.js';
import Organizer from './models/Organizer.js';
import Admin from './models/Admin.js';
import { hashPassword } from './utils/password.js';

async function upsertUser() {
  const email = 'chiragjeevanani333@gmail.com';
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({
    name: 'Chirag Jeevanani',
    email,
    passwordHash: await hashPassword('trekigo123'),
    mobile: '+91 98765 43210',
    age: 24,
    gender: 'Male',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    hikingExperience: 'Intermediate',
    fitnessLevel: 'High',
    emergencyContact: 'Asha Jeevanani (+91 98765 43219)',
    isOnboarded: true,
  });
}

async function upsertOrganizers() {
  // The shared-login demo organizer uses the same credentials as the customer
  // demo (so the login form's role toggle works), and is pre-approved.
  const shared = 'chiragjeevanani333@gmail.com';
  if (!(await Organizer.findOne({ email: shared }))) {
    await Organizer.create({
      name: 'Chirag Jeevanani',
      email: shared,
      passwordHash: await hashPassword('trekigo123'),
      mobile: '+91 98765 43210',
      agencyName: 'Trekigo Verified Organizer',
      socialMediaLink: 'https://instagram.com/trekigoorganizer',
      bio: 'Verified Trekigo organizer.',
      coreCapabilities: ['Certified Trek Leader'],
      yearsExperience: 5,
      rating: 4.8,
      isApproved: true,
      isPendingApproval: false,
    });
  }

  // The Himalayan Guides demo organizer referenced by seed bookings/admin data.
  const himalayan = 'demo@himalayan.com';
  if (!(await Organizer.findOne({ email: himalayan }))) {
    await Organizer.create({
      name: 'Himalayan Guides Ltd',
      email: himalayan,
      passwordHash: await hashPassword('organizer123'),
      mobile: '+91 98765 09876',
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
    });
  }
}

async function upsertAdmin() {
  const email = 'admin@trekigo.com';
  if (await Admin.findOne({ email })) return;
  await Admin.create({
    name: 'System Administrator',
    email,
    passwordHash: await hashPassword('admin123'),
    displayRole: 'Super Admin',
  });
}

async function seed() {
  await connectDB();
  await upsertUser();
  await upsertOrganizers();
  await upsertAdmin();
  console.log('✓ Seed complete:');
  console.log('  customer  chiragjeevanani333@gmail.com / trekigo123');
  console.log('  organizer chiragjeevanani333@gmail.com / trekigo123  (approved)');
  console.log('  organizer demo@himalayan.com / organizer123  (approved)');
  console.log('  admin     admin@trekigo.com / admin123');
  await disconnectDB();
}

// Only auto-run when invoked directly (node src/seed.js), not when imported.
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('✗ Seed failed:', err.message);
      process.exit(1);
    });
}

export { seed, upsertUser, upsertOrganizers, upsertAdmin };
