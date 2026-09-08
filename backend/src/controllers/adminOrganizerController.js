import User from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateGovtId } from '../utils/govtIdValidator.js';

// Admin-only organizer moderation. All organizers now live in the User collection
// under the isOrganizer: true flag.
export const setOrganizerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' | 'reject' | 'suspend'

  const user = await User.findOne({ _id: id, isOrganizer: true });
  if (!user) throw ApiError.notFound('Organizer not found');

  const org = user.organizer || {};

  switch (action) {
    case 'approve':
      org.isApproved = true;
      org.isPendingApproval = false;
      org.isRejected = false;
      break;
    case 'reject':
      org.isApproved = false;
      org.isPendingApproval = false;
      org.isRejected = true;
      break;
    case 'suspend':
      org.isApproved = false;
      org.isPendingApproval = false;
      break;
    default:
      throw ApiError.badRequest("action must be one of 'approve', 'reject', 'suspend'");
  }

  user.organizer = org;
  await user.save();
  res.json({ organizer: user.toOrganizerJSON() });
});

// List organizers, optionally filtered by status, for the admin console.
export const listOrganizers = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { isOrganizer: true };

  if (status === 'pending') {
    filter['organizer.isPendingApproval'] = true;
    filter['organizer.isApproved'] = false;
  }
  if (status === 'approved') {
    filter['organizer.isApproved'] = true;
  }
  if (status === 'rejected') {
    filter['organizer.isRejected'] = true;
  }

  const organizers = await User.find(filter).sort({ createdAt: -1 });
  // Currently-promoted organizers lead the roster — same priority they get
  // everywhere else. Stable JS sort (not a Mongo-level one, since "promoted"
  // depends on comparing to *now*, not a static field) preserves the
  // newest-first order within each group.
  const json = organizers.map((o) => o.toOrganizerJSON());
  json.sort((a, b) => Number(b.isPromoted) - Number(a.isPromoted));
  res.json({ organizers: json });
});

// POST /admin/organizers — admin adds a partner directly (already approved).
export const createOrganizer = asyncHandler(async (req, res) => {
  const { name, email, mobile, agencyName, agencyWebsite, socialMediaLink, govtIdType, govtIdNumber, govtIdImageUrl, yearsExperience, bio, password, approved } = req.body;
  if (!name || !email || !agencyName) throw ApiError.badRequest('name, email and agencyName are required');

  const idError = validateGovtId(govtIdType, govtIdNumber);
  if (idError) throw ApiError.badRequest(idError);

  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing && existing.isOrganizer) {
    throw ApiError.conflict('An organizer with this email already exists');
  }

  const isApproved = approved !== false; // admin-added partners default to approved

  let user = existing;
  if (!user) {
    user = new User({
      name,
      email: normalizedEmail,
      passwordHash: await hashPassword(password || Math.random().toString(36).slice(2)),
      mobile,
      isOnboarded: true,
      authProvider: 'password',
    });
  }

  user.isOrganizer = true;
  user.organizer = {
    agencyName: agencyName.trim(),
    agencyWebsite: (agencyWebsite || '').trim(),
    socialMediaLink: (socialMediaLink || '').trim(),
    govtIdType: govtIdType || 'Aadhaar',
    govtIdNumber: (govtIdNumber || '').trim(),
    govtIdImageUrl: (govtIdImageUrl || '').trim(),
    yearsExperience: parseInt(yearsExperience) || 1,
    bio: (bio || '').trim(),
    isApproved,
    isPendingApproval: !isApproved,
    isRejected: false,
  };

  await user.save();
  res.status(201).json({ organizer: user.toOrganizerJSON() });
});

// PATCH /admin/organizers/:id — admin edits organizer fields directly
export const updateOrganizer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: id, isOrganizer: true });
  if (!user) throw ApiError.notFound('Organizer not found');

  const org = user.organizer || {};
  const {
    name, agencyName, mobile, agencyWebsite, socialMediaLink,
    govtIdType, govtIdNumber, govtIdImageUrl,
    yearsExperience, bio, coreCapabilities, supportEmail, supportPhone, headline, avatar,
  } = req.body;

  if (name !== undefined) user.name = name;
  if (mobile !== undefined) user.mobile = mobile;
  if (avatar !== undefined) user.avatar = avatar;
  if (agencyName !== undefined) org.agencyName = agencyName;
  if (agencyWebsite !== undefined) org.agencyWebsite = agencyWebsite;
  if (socialMediaLink !== undefined) org.socialMediaLink = socialMediaLink;
  if (govtIdType !== undefined) org.govtIdType = govtIdType;
  if (govtIdNumber !== undefined) org.govtIdNumber = govtIdNumber;
  if (govtIdImageUrl !== undefined) org.govtIdImageUrl = govtIdImageUrl;
  if (yearsExperience !== undefined) org.yearsExperience = Number(yearsExperience) || 1;
  if (bio !== undefined) org.bio = bio;
  if (coreCapabilities !== undefined) {
    org.coreCapabilities = Array.isArray(coreCapabilities)
      ? coreCapabilities.filter((c) => c.trim())
      : [];
  }
  if (supportEmail !== undefined) org.supportEmail = supportEmail;
  if (supportPhone !== undefined) org.supportPhone = supportPhone;
  if (headline !== undefined) org.headline = headline;

  user.organizer = org;
  await user.save();
  res.json({ organizer: user.toOrganizerJSON() });
});

// DELETE /admin/organizers/:id — remove an organizer account.
// Converts them back to a pure customer account so customer data / bookings are retained.
export const deleteOrganizer = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, isOrganizer: true },
    { $set: { isOrganizer: false, organizer: null } },
    { new: true }
  );
  if (!user) throw ApiError.notFound('Organizer not found');
  res.json({ ok: true, id: req.params.id });
});
