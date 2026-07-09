import Trip from '../models/Trip.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify, makeTripId } from '../utils/slug.js';
import { validateTripPayload, groupTripsByTrek } from '../services/tripService.js';

// ─── Public catalog ────────────────────────────────────────────────────────

// GET /trips — published trips only, with optional category/search filters and
// pagination. Returns { trips, total, page, limit }.
export const listTrips = asyncHandler(async (req, res) => {
  const { category, search, page = 1, limit = 50, featured } = req.query;
  const filter = { status: 'Published' };
  if (category && category !== 'All') filter.category = category;
  if (featured === 'true') filter.featured = true;
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

// GET /treks/:trekId/offers — every published organizer offering of one trek,
// grouped (min/max price + organizer count) for the "N organizers offering
// this trek" view.
export const getTrekOffers = asyncHandler(async (req, res) => {
  const offers = await Trip.find({ trekId: req.params.trekId, status: 'Published' });
  if (offers.length === 0) throw ApiError.notFound('No offers found for this trek');
  const [group] = groupTripsByTrek(offers);
  res.json(group);
});

// GET /categories — canonical category list.
export const listCategories = asyncHandler(async (req, res) => {
  const cats = await Category.find().sort({ order: 1 });
  res.json({ categories: cats.map((c) => c.toPublicJSON()) });
});

// ─── Organizer trip CRUD (approved organizers only) ─────────────────────────

// Builds the persisted fields from an organizer payload, stamping the
// organizer snapshot + derived trekId/price so the frontend shape is complete.
function buildTripFields(body, organizer) {
  const pricingTiers = (body.pricingTiers || []).map((t, i) => ({
    id: t.id || slugify(t.label) || `tier-${i}`,
    label: t.label,
    price: Number(t.price),
  }));
  return {
    trekId: slugify(body.name),
    organizerEmail: organizer.email,
    organizer: {
      name: organizer.agencyName || organizer.name,
      avatar: organizer.avatar,
      rating: organizer.rating || 0,
      verified: !!organizer.isApproved,
    },
    name: body.name,
    location: body.location,
    state: body.state,
    city: body.city,
    pricingTiers,
    pickup: { location: body.pickup.location, price: Number(body.pickup.price) },
    startPoint: body.startPoint,
    departureDates: [...body.departureDates].sort(),
    price: Number(body.pickup.price),
    difficulty: body.difficulty,
    durationDays: body.durationDays,
    maxGroupSize: body.maxGroupSize,
    availableSeats: body.availableSeats,
    distanceKm: body.distanceKm,
    elevationMeters: body.elevationMeters,
    category: body.category,
    coverImage: body.coverImage,
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
  const fields = buildTripFields(req.body, req.organizer);
  const trip = await Trip.create({
    _id: makeTripId(req.body.name),
    ...fields,
    status: req.body.status === 'Published' ? 'Published' : 'Draft',
  });
  res.status(201).json({ trip: trip.toPublicJSON() });
});

export const updateTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('You can only edit your own trips');
  }
  validateTripPayload(req.body);
  const fields = buildTripFields(req.body, req.organizer);
  Object.assign(trip, fields);
  if (req.body.status) trip.status = req.body.status;
  await trip.save();
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

export const adminDeleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findByIdAndDelete(req.params.id);
  if (!trip) throw ApiError.notFound('Trip not found');
  res.json({ ok: true });
});
