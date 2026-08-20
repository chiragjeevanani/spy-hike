import mongoose from 'mongoose';

// Sub-schemas mirror the exact nested shapes the frontend already uses
// (context.md §6.1) so API responses are drop-in compatible.
const pricingTierSchema = new mongoose.Schema(
  { id: String, label: String, price: Number },
  { _id: false },
);
const itineraryDaySchema = new mongoose.Schema(
  { day: Number, title: String, description: String },
  { _id: false },
);
const faqSchema = new mongoose.Schema(
  { question: String, answer: String },
  { _id: false },
);
const reviewSchema = new mongoose.Schema(
  { id: String, userName: String, userAvatar: String, rating: Number, comment: String, date: String },
  { _id: false },
);
// Optional (default undefined) so seed-catalog trips — which carry no separate
// per-person pickup fee — don't get an empty {} that the booking flow would
// misread as a real (zero/undefined-priced) pickup.
const pickupSchema = new mongoose.Schema(
  { location: String, price: Number },
  { _id: false },
);

// A trip is one organizer's listing of a trek. `_id` is the human-readable
// string id the frontend already keys on (e.g. "himalayan-ridge-pass-trek");
// `trekId` is the slug of the trek name shared across every organizer's
// offering of the same trek — the grouping key that replaces the old
// fragile exact-name matching.
const tripSchema = new mongoose.Schema(
  {
    _id: { type: String }, // trip id/slug
    trekId: { type: String, index: true, required: true },
    organizerEmail: { type: String, index: true, required: true },
    organizer: {
      name: String,
      avatar: String,
      rating: Number,
      verified: Boolean,
    },
    name: { type: String, required: true },
    location: { type: String, required: true },
    state: String,
    city: String,
    pricingTiers: { type: [pricingTierSchema], default: [] },
    pickup: { type: pickupSchema, default: undefined },
    startPoint: {
      lat: Number,
      lng: Number,
      label: String,
    },
    departureDates: { type: [String], default: [] },
    price: Number, // headline "from" price (= pickup.price)
    difficulty: { type: String, enum: ['Easy', 'Moderate', 'Difficult'], default: 'Moderate' },
    // Snapshotted from the Trek — low end of the range, with the high end in
    // the matching `*Max` field (null when the trek is a single value).
    durationDays: Number,
    durationDaysMax: { type: Number, default: null },
    maxGroupSize: Number,
    availableSeats: Number,
    distanceKm: Number,
    distanceKmMax: { type: Number, default: null },
    elevationMeters: Number,
    category: String,
    featured: { type: Boolean, default: false },
    popular: { type: Boolean, default: false }, // admin-curated "Popular Treks" strip on the customer home page
    coverImage: String,
    galleryImages: { type: [String], default: [] },
    description: String,
    highlights: { type: [String], default: [] },
    included: { type: [String], default: [] },
    notIncluded: { type: [String], default: [] },
    safetyGuidelines: { type: [String], default: [] },
    cancellationPolicy: { type: [String], default: [] },
    itinerary: { type: [itineraryDaySchema], default: [] },
    faqs: { type: [faqSchema], default: [] },
    status: { type: String, enum: ['Draft', 'Published', 'Paused'], default: 'Draft' },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    reviews: { type: [reviewSchema], default: [] },
  },
  { timestamps: true, _id: false },
);

// Indexes for the queries the catalog actually runs. Every public list filters
// on `status`, so it leads each compound key; the trailing fields then let
// Mongo satisfy the sort from the index instead of loading the matches and
// sorting them in memory.
tripSchema.index({ status: 1, featured: -1, rating: -1 }); // GET /trips default sort
tripSchema.index({ status: 1, category: 1 });              // ?category= filter
tripSchema.index({ trekId: 1, status: 1 });                // trek offers + "has any trip"
tripSchema.index({ organizerEmail: 1, status: 1 });        // organizer's own listings

// Frontend-shaped object: `id` (not `_id`), everything else flat as §6.1.
tripSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = obj._id;
  delete obj._id;
  return obj;
};

export default mongoose.model('Trip', tripSchema);
