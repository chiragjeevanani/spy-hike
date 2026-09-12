import Trip from '../models/Trip.js';
import Trek from '../models/Trek.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify, makeTripId } from '../utils/slug.js';
import { validateTripPayload } from '../services/tripService.js';
import { provisionDepartures, getDepartures } from '../services/inventoryService.js';
import { isPromotedNow } from '../utils/promotion.js';

// ─── Public catalog ────────────────────────────────────────────────────────

// Fields only ever read by a detail screen, excluded from list responses. A
// browse card needs none of them, and together they were most of what remained
// in the payload once the base64 images were migrated out.
//
// Deliberately an exclusion list rather than an inclusion one: a field added to
// the schema later should show up on cards by default and be removed here
// consciously, rather than silently vanishing from the UI.
const TRIP_LIST_EXCLUDE_FIELDS = [
  'itinerary', 'faqs', 'reviews', 'galleryImages', 'description',
  'highlights', 'included', 'notIncluded', 'safetyGuidelines', 'cancellationPolicy',
];
// Mirrors Trip.toPublicJSON() for plain objects coming back from an
// aggregation pipeline, which — unlike a query's Mongoose documents — don't
// have that method available.
const aggregateTripToPublicJSON = (obj) => {
  const { _id, ...rest } = obj;
  return { id: _id, ...rest };
};

// Case-insensitive regex from user input, with special characters neutralised
// so a search for "C++" can't blow up the query.
const safeRegex = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

// The card fields the grouped browse endpoint returns for the representative
// offer. Mirrors what an Explore card renders — nothing more.
const GROUP_CARD_FIELDS = {
  id: '$_id',
  name: 1, trekId: 1, location: 1, state: 1, city: 1,
  coverImage: 1, difficulty: 1, durationDays: 1, durationDaysMax: 1,
  distanceKm: 1, distanceKmMax: 1,
  price: 1, availableSeats: 1, maxGroupSize: 1, category: 1,
  rating: 1, reviewsCount: 1, featured: 1, popular: 1,
  organizer: 1, pickup: 1, departureDates: 1, startPoint: 1,
};

// GET /trek-groups — one entry per trek, collapsing every organizer's offering
// of it, with filtering/sorting/paging done in the database.
//
// Explore previously fetched the whole catalog and did all of this in the
// browser, which is why the client asked for limit=100: you cannot page a list
// you still have to group. Moving it here lets the client request a dozen
// cards and means the phone never sees offers it won't display.
export const listTrekGroups = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 12, search, category, difficulty, date, pickupCity,
    city, state, maxPrice, maxDuration, minSeats, sort = 'Popular',
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const lim = Math.min(50, Math.max(1, Number(limit) || 12));

  // ── Filters on individual offers, applied before grouping ──
  const offerMatch = { status: 'Published' };
  if (category && category !== 'All') offerMatch.category = category;
  if (difficulty && difficulty !== 'All') offerMatch.difficulty = difficulty;
  if (date) offerMatch.departureDates = date;
  // Anchored + case-insensitive: the stored value may be "manali" while the
  // dropdown offers the canonicalised "Manali" (see listPickupCities).
  if (pickupCity && pickupCity !== 'All') {
    offerMatch['pickup.location'] = new RegExp(`^${String(pickupCity).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  if (search) {
    const rx = safeRegex(search);
    offerMatch.$or = [
      { name: rx }, { location: rx }, { state: rx }, { city: rx },
      { category: rx }, { 'startPoint.label': rx }, { 'pickup.location': rx },
    ];
  }
  // A city/state selection matches any of the place fields, mirroring the
  // client's matchesLocation() which also accepted a pickup or start point.
  if (city || state) {
    const rx = safeRegex(city || state);
    offerMatch.$and = [{
      $or: [
        { city: rx }, { state: rx }, { location: rx },
        { 'startPoint.label': rx }, { 'pickup.location': rx },
      ],
    }];
  }

  // ── Filters that only make sense once offers are grouped ──
  const groupMatch = {};
  if (maxPrice) groupMatch.minPrice = { $lte: Number(maxPrice) };
  // A ranged trek qualifies when its *shortest* possible length fits the
  // budget — "up to 5 days" should still surface a 5-6 day trek.
  if (maxDuration) groupMatch['representative.durationDays'] = { $lte: Number(maxDuration) };
  if (minSeats) groupMatch['representative.availableSeats'] = { $gte: Number(minSeats) };

  const SORTS = {
    Popular: { 'representative.reviewsCount': -1 },
    PriceLowToHigh: { minPrice: 1 },
    PriceHighToLow: { minPrice: -1 },
    HighestRated: { 'representative.rating': -1 },
    Newest: { 'representative.id': -1 },
  };

  const pipeline = [
    { $match: offerMatch },
    // A currently-promoted organizer's offer wins the group's representative
    // card ahead of rating — same "always on top" priority promoted offers
    // get everywhere else. $$NOW is the aggregation-pipeline clock, evaluated
    // once per run, so an expired promotedUntil naturally stops qualifying.
    { $addFields: { promoted: { $cond: [{ $gt: ['$organizer.promotedUntil', '$$NOW'] }, 1, 0] } } },
    { $sort: { promoted: -1, rating: -1, reviewsCount: -1, _id: 1 } },
    // card ahead of rating — highest promotionPriority first, then rating.
    {
      $addFields: {
        promoted: { $cond: [{ $gt: ['$organizer.promotedUntil', '$$NOW'] }, 1, 0] },
        priorityVal: {
          $cond: [
            {
              $and: [
                { $gt: ['$organizer.promotedUntil', '$$NOW'] },
                { $gt: ['$organizer.promotionPriority', 0] },
              ],
            },
            '$organizer.promotionPriority',
            999999,
          ],
        },
      },
    },
    { $sort: { promoted: -1, priorityVal: 1, rating: -1, reviewsCount: -1, _id: 1 } },
    {
      $group: {
        _id: '$trekId',
        trekName: { $first: '$name' },
        representative: { $first: '$$ROOT' },
        organizerCount: { $sum: 1 },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    { $project: { _id: 0, trekName: 1, organizerCount: 1, minPrice: 1, maxPrice: 1, representative: GROUP_CARD_FIELDS } },
    ...(Object.keys(groupMatch).length ? [{ $match: groupMatch }] : []),
    { $sort: { ...(SORTS[sort] || SORTS.Popular), trekName: 1 } },
    { $skip: (pageNum - 1) * lim },
    // One extra row answers hasMore without a second counting pass.
    { $limit: lim + 1 },
  ];

  const rows = await Trip.aggregate(pipeline);
  const hasMore = rows.length > lim;

  res.json({
    groups: hasMore ? rows.slice(0, lim) : rows,
    page: pageNum,
    limit: lim,
    hasMore,
  });
});

// GET /pickup-cities — every boarding city any published trip departs from.
// Explore's pickup filter used to derive this from the full catalog it held in
// memory; now that it only holds one page, the list has to come from the
// database or the dropdown would only ever show the current page's cities.
export const listPickupCities = asyncHandler(async (req, res) => {
  const raw = await Trip.distinct('pickup.location', { status: 'Published' });

  // Organizers type this field freehand, so the same city arrives as "Manali",
  // "manali" and worse. Fold case-insensitively and present one label per city,
  // preferring an already-capitalised spelling — otherwise the dropdown lists
  // the same place three times and the filter matches only one of them.
  const byLower = new Map();
  for (const city of raw.filter(Boolean).map((c) => c.trim()).filter(Boolean)) {
    const key = city.toLowerCase();
    const existing = byLower.get(key);
    if (!existing || (/^[A-Z]/.test(city) && !/^[A-Z]/.test(existing))) {
      byLower.set(key, city);
    }
  }

  const cities = [...byLower.values()]
    .map((c) => (/^[a-z]/.test(c) ? c[0].toUpperCase() + c.slice(1) : c))
    .sort((a, b) => a.localeCompare(b));

  res.json({ cities });
});

// The place fields are freehand, and `city` is frequently left empty while
// `location` carries "Kasol, Parvati Valley". Fall back to the location's
// segments so a trek in an un-tagged city still surfaces one.
const placeOf = (doc) => {
  const segments = String(doc.location || '').split(',').map((s) => s.trim()).filter(Boolean);
  const city = String(doc.city || '').trim() || segments[0] || '';
  const state = String(doc.state || '').trim() || (segments.length > 1 ? segments[segments.length - 1] : '');
  return { city, state };
};

// Prefers an already-capitalised spelling of the same place, so a city typed as
// "manali" by one organizer and "Manali" by another lists once, capitalised.
const preferredSpelling = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  if (/^[A-Z]/.test(b) && !/^[A-Z]/.test(a)) return b;
  return a;
};

// GET /trek-cities — every city the catalog can actually show something for,
// with the number of distinct treks there.
//
// The customer app's city picker is built from this rather than a hardcoded
// list: a city offered by the picker is derived from the very fields
// listTrekGroups filters on, so picking one is guaranteed to return that city's
// treks. A hardcoded list did the opposite — it offered ten cities that
// mostly had nothing, and hid every city that did.
export const listTrekCities = asyncHandler(async (req, res) => {
  const [trips, treks] = await Promise.all([
    Trip.find({ status: 'Published' })
      .select('trekId city state location startPoint')
      .lean(),
    Trek.find({ status: 'Active' }).select('city state location').lean(),
  ]);

  // Keyed on the folded city name; `treks` is a Set so several organizers
  // offering the same trek in the same city still count as one trek.
  const byKey = new Map();
  const upsert = ({ city, state }) => {
    const key = city.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      existing.city = preferredSpelling(existing.city, city);
      existing.state = preferredSpelling(existing.state, state);
      return existing;
    }
    const entry = { city, state, treks: new Set(), bookable: false, lat: null, lng: null };
    byKey.set(key, entry);
    return entry;
  };

  for (const trip of trips) {
    const { city, state } = placeOf(trip);
    if (!city) continue;
    const entry = upsert({ city, state });
    entry.treks.add(trip.trekId || String(trip._id));
    entry.bookable = true;
    // A representative coordinate lets the app snap a GPS fix to the nearest
    // city it actually serves.
    const { lat, lng } = trip.startPoint || {};
    if (entry.lat == null && Number.isFinite(lat) && Number.isFinite(lng)) {
      entry.lat = lat;
      entry.lng = lng;
    }
  }

  // Catalog treks with no published offer yet still show under "Coming soon",
  // so their cities belong in the picker — flagged as not yet bookable.
  for (const trek of treks) {
    const { city, state } = placeOf(trek);
    if (!city) continue;
    upsert({ city, state }).treks.add(String(trek._id));
  }

  const cities = [...byKey.values()]
    .map(({ city, state, treks: trekIds, bookable, lat, lng }) => ({
      city,
      state,
      label: state && state.toLowerCase() !== city.toLowerCase() ? `${city}, ${state}` : city,
      trekCount: trekIds.size,
      bookable,
      lat,
      lng,
    }))
    // Busiest first: the app takes the head of this list as its "popular"
    // shortcuts, and shows the rest A–Z.
    .sort((a, b) => (
      Number(b.bookable) - Number(a.bookable)
      || b.trekCount - a.trekCount
      || a.city.localeCompare(b.city)
    ));

  res.json({ cities });
});

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
  // Fetch one extra row to answer "is there another page?" without a second
  // full countDocuments pass over the collection on every request.
  //
  // An aggregation (rather than .find().sort()) so a currently-promoted
  // organizer's trips can lead the sort at the database level, before
  // skip/limit paginates — a plain in-memory sort can't do that once the
  // list is paged. $$NOW is the pipeline's own clock, so an expired
  // promotedUntil naturally stops qualifying without any background job.
  const excludeProjection = Object.fromEntries(TRIP_LIST_EXCLUDE_FIELDS.map((f) => [f, 0]));
  const [rows, total] = await Promise.all([
    Trip.aggregate([
      { $match: filter },
      { $addFields: { promoted: { $cond: [{ $gt: ['$organizer.promotedUntil', '$$NOW'] }, 1, 0] } } },
      { $sort: { promoted: -1, featured: -1, rating: -1 } },
      {
        $addFields: {
          promoted: { $cond: [{ $gt: ['$organizer.promotedUntil', '$$NOW'] }, 1, 0] },
          priorityVal: {
            $cond: [
              {
                $and: [
                  { $gt: ['$organizer.promotedUntil', '$$NOW'] },
                  { $gt: ['$organizer.promotionPriority', 0] },
                ],
              },
              '$organizer.promotionPriority',
              999999,
            ],
          },
        },
      },
      { $sort: { promoted: -1, priorityVal: 1, featured: -1, rating: -1 } },
      { $skip: (pageNum - 1) * lim },
      { $limit: lim + 1 },
      { $project: { ...excludeProjection, promoted: 0 } },
    ]),
    req.query.withTotal === 'true' ? Trip.countDocuments(filter) : Promise.resolve(undefined),
  ]);

  const hasMore = rows.length > lim;
  const docs = hasMore ? rows.slice(0, lim) : rows;

  res.json({
    trips: docs.map(aggregateTripToPublicJSON),
    page: pageNum,
    limit: lim,
    hasMore,
    ...(total !== undefined ? { total } : {}),
  });
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

  // Currently-promoted organizers' offers always lead the list — the whole
  // point of a promotion is standing out among the organizers competing for
  // the same trek. Stable sort (Array#sort in Node is stable) preserves
  // whatever order they otherwise arrived in.
  const now = new Date();
  const sorted = [...offers].sort((a, b) => (
    Number(isPromotedNow(b.organizer?.promotedUntil, now)) - Number(isPromotedNow(a.organizer?.promotedUntil, now))
  ));
  const sorted = [...offers].sort((a, b) => {
    const aPromoted = isPromotedNow(a.organizer?.promotedUntil, now);
    const bPromoted = isPromotedNow(b.organizer?.promotedUntil, now);
    if (aPromoted !== bPromoted) {
      return Number(bPromoted) - Number(aPromoted);
    }
    if (aPromoted && bPromoted) {
      const aPri = (a.organizer?.promotionPriority > 0) ? a.organizer.promotionPriority : 999999;
      const bPri = (b.organizer?.promotionPriority > 0) ? b.organizer.promotionPriority : 999999;
      if (aPri !== bPri) return aPri - bPri;
    }
    return 0;
  });

  res.json({
    trekId: trek._id,
    trekName: trek.title,
    trek: trek.toPublicJSON(),
    offers: sorted.map((o) => o.toPublicJSON()),
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
      promotedUntil: organizer.promotedUntil || null,
      promotionPriority: organizer.promotionPriority ?? 0,
    },
    name: trek.title,
    location: trek.location,
    state: trek.state,
    city: trek.city,
    difficulty: trek.difficulty,
    durationDays: trek.durationDays,
    durationDaysMax: trek.durationDaysMax,
    distanceKm: trek.distanceKm,
    distanceKmMax: trek.distanceKmMax,
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

  // Check if organizer already has a trip for this same trek or trekId
  const existing = await Trip.findOne({
    organizerEmail: req.organizer.email,
    $or: [{ trekId: fields.trekId }, { name: fields.name }],
  });
  if (existing) {
    throw ApiError.badRequest(`You have already posted a trip for '${fields.name}'. Organizers cannot post multiple trips under the same trek category. You can edit your existing trip instead.`);
  }

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
