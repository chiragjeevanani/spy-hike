import Trip from '../models/Trip.js';
import Trek from '../models/Trek.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify, makeTripId } from '../utils/slug.js';
import { validateTripPayload } from '../services/tripService.js';
import { provisionDepartures, getDepartures } from '../services/inventoryService.js';

// ─── Public catalog ────────────────────────────────────────────────────────

// GET /trips — published trips only, with optional category/search filters and
// pagination. Returns { trips, total, page, limit }.
export const listTrips = asyncHandler(async (req, res) => {
  const { category, search, page = 1, limit = 50, featured, popular } = req.query;
  const filter = { status: 'Published' };
  if (category && category !== 'All') filter.category = category;
  if (featured === 'true') filter.featured = true;
  if (popular === 'true') filter.popular = true;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { location: rx }, { state: rx }, { city: rx }, { category: rx }];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const lim = Math.min(100, Math.max(1, Number(limit) || 50));
  const [docs, total] = await Promise.all([
    Trip.find(filter).sort({ featured: -1, rating: -1 }).skip((pageNum - 1) * lim).limit(lim),
    Trip.countDocuments(filter),
  ]);

  res.json({ trips: docs.map((t) => t.toPublicJSON()), total, page: pageNum, limit: lim });
});

// GET /trips/:id — a single trip (used by the details page). Available
// regardless of status so an organizer/admin deep-link resolves.
export const getTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw ApiError.notFound('Trip not found');
  res.json({ trip: trip.toPublicJSON() });
});

// GET /trips/:id/departures — per-date batches with live seat availability.
export const getTripDepartures = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw ApiError.notFound('Trip not found');
  res.json({ departures: await getDepartures(trip._id) });
});

// GET /treks/:trekId/offers — every published organizer offering of one trek,
// with the trek's own canonical identity (title/location/difficulty/duration/
// distance/image) as the header — not inferred from whichever offer happens
// to have the highest rating.
export const getTrekOffers = asyncHandler(async (req, res) => {
  const trek = await Trek.findById(req.params.trekId);
  if (!trek) throw ApiError.notFound('Trek not found');

  const offers = await Trip.find({ trekId: req.params.trekId, status: 'Published' });
  const prices = offers.map((o) => o.price).filter((p) => Number.isFinite(p));

  res.json({
    trekId: trek._id,
    trekName: trek.title,
    trek: trek.toPublicJSON(),
    offers: offers.map((o) => o.toPublicJSON()),
    organizerCount: offers.length,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
  });
});

// GET /categories — canonical category list.
export const listCategories = asyncHandler(async (req, res) => {
  const cats = await Category.find().sort({ order: 1 });
  res.json({ categories: cats.map((c) => c.toPublicJSON()) });
});

// ─── Organizer trip CRUD (approved organizers only) ─────────────────────────

// Builds the persisted fields from an organizer payload, stamping the
// organizer snapshot + price so the frontend shape is complete. Trek identity
// (name/location/state/city/difficulty/duration/distance/elevation/cover
// image) is not taken from the organizer's payload at all — it's inherited
// from the admin-curated Trek the organizer selected, so every organizer's
// offering of the same trek shows identical stats.
async function buildTripFields(body, organizer) {
  const trek = await Trek.findById(body.trekId);
  if (!trek) throw ApiError.badRequest('Select a valid trek before publishing');
  if (trek.status !== 'Active') throw ApiError.badRequest('This trek is no longer available for new listings');

  const pricingTiers = (body.pricingTiers || []).map((t, i) => ({
    id: t.id || slugify(t.label) || `tier-${i}`,
    label: t.label,
    price: Number(t.price),
  }));
  return {
    trekId: trek._id,
    organizerEmail: organizer.email,
    organizer: {
      name: organizer.agencyName || organizer.name,
      avatar: organizer.avatar,
      rating: organizer.rating || 0,
      verified: !!organizer.isApproved,
    },
    name: trek.title,
    location: trek.location,
    state: trek.state,
    city: trek.city,
    difficulty: trek.difficulty,
    durationDays: trek.durationDays,
    distanceKm: trek.distanceKm,
    elevationMeters: trek.elevationMeters,
    coverImage: trek.coverImage,
    pricingTiers,
    pickup: { location: body.pickup.location, price: Number(body.pickup.price) },
    startPoint: body.startPoint,
    departureDates: [...body.departureDates].sort(),
    price: pricingTiers[0]?.price ?? Number(body.pickup.price),
    maxGroupSize: body.maxGroupSize,
    availableSeats: body.availableSeats,
    category: body.category || trek.category,
    galleryImages: body.galleryImages || [],
    description: body.description,
    highlights: body.highlights || [],
    included: body.included || [],
    notIncluded: body.notIncluded || [],
    safetyGuidelines: body.safetyGuidelines || [],
    cancellationPolicy: body.cancellationPolicy || [],
    itinerary: body.itinerary || [],
    faqs: body.faqs || [],
  };
}

export const listOrganizerTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find({ organizerEmail: req.organizer.email }).sort({ updatedAt: -1 });
  res.json({ trips: trips.map((t) => t.toPublicJSON()) });
});

export const createTrip = asyncHandler(async (req, res) => {
  validateTripPayload(req.body);
  const fields = await buildTripFields(req.body, req.organizer);
  const trip = await Trip.create({
    _id: makeTripId(fields.name),
    ...fields,
    status: req.body.status === 'Published' ? 'Published' : 'Draft',
  });
  await provisionDepartures(trip);
  res.status(201).json({ trip: trip.toPublicJSON() });
});

export const updateTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('You can only edit your own trips');
  }
  validateTripPayload(req.body);
  const fields = await buildTripFields(req.body, req.organizer);
  Object.assign(trip, fields);
  if (req.body.status) trip.status = req.body.status;
  await trip.save();
  await provisionDepartures(trip);
  res.json({ trip: trip.toPublicJSON() });
});

export const setOrganizerTripStatus = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('You can only change your own trips');
  }
  const { status } = req.body;
  if (!['Draft', 'Published', 'Paused'].includes(status)) {
    throw ApiError.badRequest('status must be Draft, Published or Paused');
  }
  trip.status = status;
  await trip.save();
  res.json({ trip: trip.toPublicJSON() });
});

export const deleteOrganizerTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('You can only delete your own trips');
  }
  await trip.deleteOne();
  res.json({ ok: true });
});

// ─── Admin trip moderation ──────────────────────────────────────────────────

export const listAllTrips = asyncHandler(async (req, res) => {
  const trips = await Trip.find().sort({ updatedAt: -1 });
  res.json({ trips: trips.map((t) => t.toPublicJSON()) });
});

export const adminSetTripStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Draft', 'Published', 'Paused'].includes(status)) {
    throw ApiError.badRequest('status must be Draft, Published or Paused');
  }
  const trip = await Trip.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!trip) throw ApiError.notFound('Trip not found');
  res.json({ trip: trip.toPublicJSON() });
});

// PATCH /admin/trips/:id/featured { featured } — headlines the customer
// app's "Featured trek" hero. Unlike Trek-level flags this lives on the
// individual organizer listing, since that's the bookable thing being promoted.
export const adminSetTripFeatured = asyncHandler(async (req, res) => {
  const trip = await Trip.findByIdAndUpdate(req.params.id, { featured: !!req.body.featured }, { new: true });
  if (!trip) throw ApiError.notFound('Trip not found');
  res.json({ trip: trip.toPublicJSON() });
});

// PATCH /admin/trips/:id/popular { popular } — curates the customer app's
// "Popular Treks" strip. Explicit like `featured`, so the strip only ever
// shows what an admin actually chose rather than whatever's left over.
export const adminSetTripPopular = asyncHandler(async (req, res) => {
  const trip = await Trip.findByIdAndUpdate(req.params.id, { popular: !!req.body.popular }, { new: true });
  if (!trip) throw ApiError.notFound('Trip not found');
  res.json({ trip: trip.toPublicJSON() });
});

export const adminDeleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findByIdAndDelete(req.params.id);
  if (!trip) throw ApiError.notFound('Trip not found');
  res.json({ ok: true });
});
