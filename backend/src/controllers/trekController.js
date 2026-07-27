import Trek from '../models/Trek.js';
import Trip from '../models/Trip.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/slug.js';
import { validateTrekFields } from '../utils/trekValidation.js';

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /treks?trending=true — active treks only, for the organizer's "select a
// trek" picker and the customer app's trek catalog. The optional flag lets
// the customer app pull just the admin-curated trending subset without
// filtering the full list client-side.
export const listTreks = asyncHandler(async (req, res) => {
  const filter = { status: 'Active' };
  if (req.query.trending === 'true') filter.trending = true;
  const treks = await Trek.find(filter).sort({ title: 1 });
  res.json({ treks: treks.map((t) => t.toPublicJSON()) });
});

// GET /treks/:id — single trek (used to populate a trek's public detail page
// header alongside GET /treks/:id/offers).
export const getTrek = asyncHandler(async (req, res) => {
  const trek = await Trek.findById(req.params.id);
  if (!trek) throw ApiError.notFound('Trek not found');
  res.json({ trek: trek.toPublicJSON() });
});

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

export const adminListTreks = asyncHandler(async (req, res) => {
  const treks = await Trek.find().sort({ createdAt: -1 });
  res.json({ treks: treks.map((t) => t.toPublicJSON()) });
});

export const createTrek = asyncHandler(async (req, res) => {
  validateTrekFields(req.body);
  const {
    title, location, startingPoint, state, city, difficulty, durationDays,
    distanceKm, elevationMeters, coverImage, galleryImages, category, description,
    itinerary, thingsToCarry, included, notIncluded, highlights, trending
  } = req.body;

  const id = slugify(title);
  if (!id) throw ApiError.badRequest('Title must contain at least one letter or number');
  if (await Trek.exists({ _id: id })) {
    throw ApiError.conflict('A trek with this title already exists');
  }

  const trek = await Trek.create({
    _id: id,
    title: title.trim(),
    location: location.trim(),
    startingPoint: (startingPoint || '').trim(),
    state: (state || '').trim(),
    city: (city || '').trim(),
    difficulty,
    durationDays: Number(durationDays),
    distanceKm: Number(distanceKm),
    elevationMeters: Number(elevationMeters) || 0,
    coverImage,
    galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
    category: category || '',
    description: description || '',
    itinerary: Array.isArray(itinerary) ? itinerary : [],
    thingsToCarry: Array.isArray(thingsToCarry) ? thingsToCarry : [],
    included: Array.isArray(included) ? included : [],
    notIncluded: Array.isArray(notIncluded) ? notIncluded : [],
    highlights: Array.isArray(highlights) ? highlights : [],
    status: 'Active',
    trending: !!trending,
  });
  res.status(201).json({ trek: trek.toPublicJSON() });
});

export const updateTrek = asyncHandler(async (req, res) => {
  const trek = await Trek.findById(req.params.id);
  if (!trek) throw ApiError.notFound('Trek not found');

  const f = req.body;
  const merged = {
    title: f.title !== undefined ? f.title : trek.title,
    location: f.location !== undefined ? f.location : trek.location,
    difficulty: f.difficulty !== undefined ? f.difficulty : trek.difficulty,
    durationDays: f.durationDays !== undefined ? f.durationDays : trek.durationDays,
    distanceKm: f.distanceKm !== undefined ? f.distanceKm : trek.distanceKm,
    coverImage: f.coverImage !== undefined ? f.coverImage : trek.coverImage,
  };
  validateTrekFields(merged);

  if (f.title !== undefined) trek.title = f.title.trim();
  if (f.location !== undefined) trek.location = f.location.trim();
  if (f.startingPoint !== undefined) trek.startingPoint = f.startingPoint.trim();
  if (f.state !== undefined) trek.state = f.state.trim();
  if (f.city !== undefined) trek.city = f.city.trim();
  if (f.difficulty !== undefined) trek.difficulty = f.difficulty;
  if (f.durationDays !== undefined) trek.durationDays = Number(f.durationDays);
  if (f.distanceKm !== undefined) trek.distanceKm = Number(f.distanceKm);
  if (f.elevationMeters !== undefined) trek.elevationMeters = Number(f.elevationMeters) || 0;
  if (f.coverImage !== undefined) trek.coverImage = f.coverImage;
  if (f.galleryImages !== undefined) trek.galleryImages = Array.isArray(f.galleryImages) ? f.galleryImages : [];
  if (f.category !== undefined) trek.category = f.category;
  if (f.description !== undefined) trek.description = f.description;
  if (f.itinerary !== undefined) trek.itinerary = Array.isArray(f.itinerary) ? f.itinerary : [];
  if (f.thingsToCarry !== undefined) trek.thingsToCarry = Array.isArray(f.thingsToCarry) ? f.thingsToCarry : [];
  if (f.included !== undefined) trek.included = Array.isArray(f.included) ? f.included : [];
  if (f.notIncluded !== undefined) trek.notIncluded = Array.isArray(f.notIncluded) ? f.notIncluded : [];
  if (f.highlights !== undefined) trek.highlights = Array.isArray(f.highlights) ? f.highlights : [];
  if (f.status !== undefined) trek.status = f.status === 'Inactive' ? 'Inactive' : 'Active';
  if (f.trending !== undefined) trek.trending = !!f.trending;

  await trek.save();

  // Trips already posted under this trek show a stale name/location/etc.
  // (they were snapshotted at creation) unless synced — refresh every trip's
  // inherited identity fields so an admin correction propagates immediately.
  await Trip.updateMany(
    { trekId: trek._id },
    {
      $set: {
        name: trek.title,
        location: trek.location,
        state: trek.state,
        city: trek.city,
        difficulty: trek.difficulty,
        durationDays: trek.durationDays,
        distanceKm: trek.distanceKm,
        elevationMeters: trek.elevationMeters,
        coverImage: trek.coverImage,
      },
    },
  );

  res.json({ trek: trek.toPublicJSON() });
});

// DELETE /admin/treks/:id — blocked while trips still reference this trek, so
// an organizer's published listing never ends up pointing at nothing.
export const deleteTrek = asyncHandler(async (req, res) => {
  const inUse = await Trip.exists({ trekId: req.params.id });
  if (inUse) {
    throw ApiError.conflict('This trek has trips posted under it — pause or remove those first');
  }
  const trek = await Trek.findByIdAndDelete(req.params.id);
  if (!trek) throw ApiError.notFound('Trek not found');
  res.json({ ok: true, id: req.params.id });
});
