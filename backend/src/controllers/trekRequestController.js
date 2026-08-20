import TrekRequest from '../models/TrekRequest.js';
import Trek from '../models/Trek.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/slug.js';
import { validateTrekFields, normalizeRangeMax } from '../utils/trekValidation.js';

// ─── Organizer ───────────────────────────────────────────────────────────────

// POST /organizer/trek-requests — an approved organizer proposes a trek that
// isn't in the admin's catalog yet. Goes into the admin's review queue only;
// nothing is added to the live /treks catalog until an admin approves it.
export const createTrekRequest = asyncHandler(async (req, res) => {
  validateTrekFields(req.body);
  const {
    title, location, state, city, difficulty, durationDays, durationDaysMax,
    distanceKm, distanceKmMax, elevationMeters, coverImage, category, description,
  } = req.body;

  const request = await TrekRequest.create({
    _id: `treq-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim(),
    location: location.trim(),
    state: (state || '').trim(),
    city: (city || '').trim(),
    difficulty,
    durationDays: Number(durationDays),
    durationDaysMax: normalizeRangeMax(durationDaysMax, durationDays),
    distanceKm: Number(distanceKm),
    distanceKmMax: normalizeRangeMax(distanceKmMax, distanceKm),
    elevationMeters: Number(elevationMeters) || 0,
    coverImage,
    category: category || '',
    description: description || '',
    requestedByEmail: req.organizer.email,
    requestedByName: req.organizer.agencyName || req.organizer.name,
    status: 'Pending',
  });
  res.status(201).json({ request: request.toPublicJSON() });
});

// GET /organizer/trek-requests — the calling organizer's own requests, so
// the trek picker can show "pending review" instead of letting them
// resubmit blind.
export const listMyTrekRequests = asyncHandler(async (req, res) => {
  const requests = await TrekRequest.find({ requestedByEmail: req.organizer.email }).sort({ createdAt: -1 });
  res.json({ requests: requests.map((r) => r.toPublicJSON()) });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminListTrekRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (['Pending', 'Approved', 'Rejected'].includes(status)) filter.status = status;
  const requests = await TrekRequest.find(filter).sort({ createdAt: -1 });
  res.json({ requests: requests.map((r) => r.toPublicJSON()) });
});

// PUT /admin/trek-requests/:id — admin edits the requested details (e.g.
// swaps in a cleaner cover image) before approving. Locked once decided.
export const adminUpdateTrekRequest = asyncHandler(async (req, res) => {
  const request = await TrekRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');
  if (request.status !== 'Pending') throw ApiError.badRequest('Only pending requests can be edited');

  const f = req.body;
  const merged = {
    title: f.title !== undefined ? f.title : request.title,
    location: f.location !== undefined ? f.location : request.location,
    difficulty: f.difficulty !== undefined ? f.difficulty : request.difficulty,
    durationDays: f.durationDays !== undefined ? f.durationDays : request.durationDays,
    durationDaysMax: f.durationDaysMax !== undefined ? f.durationDaysMax : request.durationDaysMax,
    distanceKm: f.distanceKm !== undefined ? f.distanceKm : request.distanceKm,
    distanceKmMax: f.distanceKmMax !== undefined ? f.distanceKmMax : request.distanceKmMax,
    coverImage: f.coverImage !== undefined ? f.coverImage : request.coverImage,
  };
  validateTrekFields(merged);

  if (f.title !== undefined) request.title = f.title.trim();
  if (f.location !== undefined) request.location = f.location.trim();
  if (f.state !== undefined) request.state = f.state.trim();
  if (f.city !== undefined) request.city = f.city.trim();
  if (f.difficulty !== undefined) request.difficulty = f.difficulty;
  if (f.durationDays !== undefined) request.durationDays = Number(f.durationDays);
  if (f.distanceKm !== undefined) request.distanceKm = Number(f.distanceKm);
  // Same collapse-to-null rule as updateTrek: a max that no longer exceeds the
  // min means the request is back to a single exact number.
  if (f.durationDaysMax !== undefined || f.durationDays !== undefined) {
    const max = f.durationDaysMax !== undefined ? f.durationDaysMax : request.durationDaysMax;
    request.durationDaysMax = normalizeRangeMax(max, request.durationDays);
  }
  if (f.distanceKmMax !== undefined || f.distanceKm !== undefined) {
    const max = f.distanceKmMax !== undefined ? f.distanceKmMax : request.distanceKmMax;
    request.distanceKmMax = normalizeRangeMax(max, request.distanceKm);
  }
  if (f.elevationMeters !== undefined) request.elevationMeters = Number(f.elevationMeters) || 0;
  if (f.coverImage !== undefined) request.coverImage = f.coverImage;
  if (f.category !== undefined) request.category = f.category;
  if (f.description !== undefined) request.description = f.description;

  await request.save();
  res.json({ request: request.toPublicJSON() });
});

// PATCH /admin/trek-requests/:id/status { action: 'approve' | 'reject', reviewNote? }
// Approving creates the real Trek from the (possibly admin-edited) request
// data — the step that gets it "automatically added to that category
// section" for every organizer to pick from.
export const adminSetTrekRequestStatus = asyncHandler(async (req, res) => {
  const request = await TrekRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');
  if (request.status !== 'Pending') {
    throw ApiError.badRequest(`This request is already ${request.status.toLowerCase()}`);
  }

  const { action, reviewNote } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    throw ApiError.badRequest("action must be 'approve' or 'reject'");
  }

  if (action === 'reject') {
    request.status = 'Rejected';
    request.reviewNote = (reviewNote || '').trim();
    await request.save();
    return res.json({ request: request.toPublicJSON() });
  }

  const id = slugify(request.title);
  if (!id) throw ApiError.badRequest('Title must contain at least one letter or number');
  if (await Trek.exists({ _id: id })) {
    throw ApiError.conflict("A trek with this title already exists — edit the request's title first");
  }

  const trek = await Trek.create({
    _id: id,
    title: request.title,
    location: request.location,
    state: request.state,
    city: request.city,
    difficulty: request.difficulty,
    durationDays: request.durationDays,
    durationDaysMax: request.durationDaysMax,
    distanceKm: request.distanceKm,
    distanceKmMax: request.distanceKmMax,
    elevationMeters: request.elevationMeters,
    coverImage: request.coverImage,
    category: request.category,
    description: request.description,
    status: 'Active',
  });

  request.status = 'Approved';
  request.trekId = trek._id;
  request.reviewNote = (reviewNote || '').trim();
  await request.save();

  res.json({ request: request.toPublicJSON(), trek: trek.toPublicJSON() });
});
