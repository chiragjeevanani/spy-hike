// Idempotent seed of the demo accounts the frontend has always shipped with,
// so the existing "Quick Demo Access" logins keep working against the real API.
// Run with: `npm run seed` (needs MONGO_URI in .env). Safe to run repeatedly.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import User from './models/User.js';
import Organizer from './models/Organizer.js';
import Admin from './models/Admin.js';
import Trip from './models/Trip.js';
import Category from './models/Category.js';
import { hashPassword } from './utils/password.js';
import { slugify } from './utils/slug.js';
import { provisionDepartures } from './services/inventoryService.js';
// The frontend trip catalog is pure data (no JSX/asset imports), so the seed
// imports it directly to stay in lock-step with what the app shipped.
import { HIKING_TRIPS } from '../../frontend/src/modules/user/data/trips.js';

// Canonical, reconciled category set: the customer-facing list (with its
// lucide icons) plus the organizer form's extra categories, unified so both
// apps can share one source (context.md §5/§10.11).
const CANONICAL_CATEGORIES = [
  { _id: 'Trekking', label: 'Trekking', icon: 'Mountain', order: 1 },
  { _id: 'Hiking', label: 'Hiking', icon: 'Compass', order: 2 },
  { _id: 'Camping', label: 'Camping', icon: 'Tent', order: 3 },
  { _id: 'Adventure Tours', label: 'Adventure Tours', icon: 'Flame', order: 4 },
  { _id: 'Nature Walks', label: 'Nature Walks', icon: 'Trees', order: 5 },
  { _id: 'Weekend Trips', label: 'Weekend Trips', icon: 'CalendarDays', order: 6 },
  { _id: 'Summit', label: 'Summit', icon: 'Mountain', order: 7 },
  { _id: 'Desert', label: 'Desert', icon: 'Sun', order: 8 },
  { _id: 'Wildlife', label: 'Wildlife', icon: 'Bird', order: 9 },
  { _id: 'Cultural', label: 'Cultural', icon: 'Landmark', order: 10 },
];

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

async function upsertCategories() {
  for (const c of CANONICAL_CATEGORIES) {
    await Category.updateOne({ _id: c._id }, { $set: c }, { upsert: true });
  }
}

// Maps a frontend HIKING_TRIPS entry onto a Trip document. Seed trips use the
// legacy `pickupPoints` array (no separate pickup fee), so `pickup` is left
// unset and the tier prices stand alone — matching current display behavior.
function toTripDoc(t) {
  return {
    _id: t.id,
    trekId: slugify(t.name),
    organizerEmail: `${slugify(t.organizer?.name || 'partner')}@seed.trekigo.local`,
    organizer: t.organizer,
    name: t.name,
    location: t.location,
    state: t.state,
    city: t.city,
    pricingTiers: t.pricingTiers || [],
    startPoint: t.startPoint,
    departureDates: t.departureDates || [],
    price: t.price,
    difficulty: t.difficulty,
    durationDays: t.durationDays,
    maxGroupSize: t.maxGroupSize,
    availableSeats: t.availableSeats,
    distanceKm: t.distanceKm,
    elevationMeters: t.elevationMeters,
    category: t.category,
    featured: !!t.featured,
    coverImage: t.coverImage,
    galleryImages: t.galleryImages || [],
    description: t.description,
    highlights: t.highlights || [],
    included: t.included || [],
    notIncluded: t.notIncluded || [],
    safetyGuidelines: t.safetyGuidelines || [],
    cancellationPolicy: t.cancellationPolicy || [],
    itinerary: t.itinerary || [],
    faqs: t.faqs || [],
    status: 'Published',
    rating: t.rating || 0,
    reviewsCount: t.reviewsCount || 0,
    reviews: t.reviews || [],
  };
}

async function upsertTrips() {
  for (const t of HIKING_TRIPS) {
    const doc = toTripDoc(t);
    await Trip.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    // Provision per-date seat inventory for each seeded trip.
    await provisionDepartures(doc);
  }
}

async function seed() {
  await connectDB();
  await upsertUser();
  await upsertOrganizers();
  await upsertAdmin();
  await upsertCategories();
  await upsertTrips();
  console.log(`✓ Seeded ${CANONICAL_CATEGORIES.length} categories, ${HIKING_TRIPS.length} trips`);
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

export { seed, upsertUser, upsertOrganizers, upsertAdmin, upsertCategories, upsertTrips };
