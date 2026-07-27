// Idempotent seed of platform reference data (categories, coupons, the trip
// catalog) plus the admin login. Does NOT create demo customer/organizer
// accounts — the admin console should only ever show real signups.
// Run with: `npm run seed` (needs MONGO_URI in .env). Safe to run repeatedly.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import Admin from './models/Admin.js';
import Trip from './models/Trip.js';
import Trek from './models/Trek.js';
import Category from './models/Category.js';
import Coupon from './models/Coupon.js';
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

async function upsertAdmin() {
  const email = (env.adminEmail || process.env.ADMIN_EMAIL || 'superadmin@gmail.com').toLowerCase();
  const password = env.adminPassword || process.env.ADMIN_PASSWORD || 'password123';
  const passwordHash = await hashPassword(password);

  let admin = await Admin.findOne({ email });
  if (!admin) {
    admin = await Admin.findOne();
  }

  if (admin) {
    admin.email = email;
    admin.passwordHash = passwordHash;
    admin.name = admin.name || 'System Administrator';
    admin.displayRole = 'Super Admin';
    await admin.save();
  } else {
    await Admin.create({
      name: 'System Administrator',
      email,
      passwordHash,
      displayRole: 'Super Admin',
    });
  }
}

async function upsertCategories() {
  for (const c of CANONICAL_CATEGORIES) {
    await Category.updateOne({ _id: c._id }, { $set: c }, { upsert: true });
  }
}

// The three promo codes referenced by the customer home-feed banners.
const SEED_COUPONS = [
  { _id: 'cp-seed-1', code: 'FYT20', type: 'percentage', value: 20, maxDiscount: null, minBookingAmount: 0, expiresAt: '2026-12-31', status: 'Active', usedCount: 0 },
  { _id: 'cp-seed-2', code: 'VALLEY50', type: 'flat', value: 50, maxDiscount: null, minBookingAmount: 0, expiresAt: '2026-12-31', status: 'Active', usedCount: 0 },
  { _id: 'cp-seed-3', code: 'GHATS15', type: 'percentage', value: 15, maxDiscount: null, minBookingAmount: 0, expiresAt: '2026-12-31', status: 'Active', usedCount: 0 },
];

async function upsertCoupons() {
  for (const c of SEED_COUPONS) {
    await Coupon.updateOne({ _id: c._id }, { $setOnInsert: c }, { upsert: true });
  }
}

// Maps a frontend HIKING_TRIPS entry onto a Trip document. Seed trips use the
// legacy `pickupPoints` array (no separate pickup fee), so `pickup` is left
// unset and the tier prices stand alone — matching current display behavior.
function toTripDoc(t) {
  return {
    _id: t.id,
    trekId: slugify(t.name),
    organizerEmail: `${slugify(t.organizer?.name || 'partner')}@seed.findyourtrek.local`,
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
  // Clear existing live records to guarantee a clean slate
  await Trip.deleteMany({});
  try {
    await mongoose.connection.db.dropCollection('bookings');
  } catch (e) {}
  try {
    await mongoose.connection.db.dropCollection('departures');
  } catch (e) {}

  for (const t of HIKING_TRIPS) {
    const doc = toTripDoc(t);
    await Trip.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
    // Provision per-date seat inventory for each seeded trip.
    await provisionDepartures(doc);
  }
}

async function upsertTreks() {
  for (const t of HIKING_TRIPS) {
    const trekId = slugify(t.name);
    const trekDoc = {
      _id: trekId,
      title: t.name,
      location: t.location,
      startingPoint: t.startingPoint || t.pickupPoints?.[0] || t.location,
      state: t.state || '',
      city: t.city || '',
      difficulty: t.difficulty || 'Moderate',
      durationDays: t.durationDays || 2,
      distanceKm: t.distanceKm || 10,
      elevationMeters: t.elevationMeters || 1000,
      coverImage: t.coverImage,
      galleryImages: t.galleryImages || [],
      category: t.category || '',
      description: t.description || '',
      itinerary: t.itinerary || [],
      thingsToCarry: t.thingsToCarry || [
        'Personal medication (if any)',
        'Strong backpack (Preferably water proof)',
        'Fresh pair of clothes',
        'Toiletries',
        'Mosquito Repellent Cream',
        'Water bottles (at least 2 liters of water)',
        'Torch with new batteries (must in case of emergency)',
        'Energy snacks & drinks (Chocolate bars, Electrolyte drinks)',
        'Sunglasses & Sunscreen',
        'Rain Coat (Highly Suggested)',
        'Shoes with good grip'
      ],
      included: t.included && t.included.length ? t.included : [
        'Forest permission & entry permits',
        'Transport from base city to trek start point',
        'Accommodation in Geodesic Dome Tents / Homestays',
        'Veg Meals (Breakfast, Packed Lunch, Evening Snacks & Dinner)',
        'Certified Wilderness Sherpa Guides & Safety Equipment'
      ],
      notIncluded: t.notIncluded && t.notIncluded.length ? t.notIncluded : [
        'GST 5%',
        'Personal luggage offloading charges',
        'Medical emergency evacuation costs',
        'Anything not explicitly mentioned under Inclusions'
      ],
      highlights: t.highlights || [],
      status: 'Active',
      trending: !!t.featured,
    };
    await Trek.updateOne({ _id: trekId }, { $set: trekDoc }, { upsert: true });
  }
}

async function seed() {
  await connectDB();
  await upsertAdmin();
  await upsertCategories();
  await upsertCoupons();
  await upsertTreks();
  await upsertTrips();
  console.log(`✓ Seeded ${CANONICAL_CATEGORIES.length} categories, ${SEED_COUPONS.length} coupons, ${HIKING_TRIPS.length} catalog treks, ${HIKING_TRIPS.length} trips`);
  console.log('✓ Seed complete: admin account updated from ENV credentials.');
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

export { seed, upsertAdmin, upsertCategories, upsertCoupons, upsertTrips };
