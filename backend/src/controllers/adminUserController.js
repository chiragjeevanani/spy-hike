import User from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/;

// Admin roster of customer/hiker accounts. Mirrors the organizer list endpoint
// so the console's Users view can read real registrations instead of seeds.

// GET /admin/users?search=&status= — all customers, newest first.
export const listUsers = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const filter = {};
  if (['Active', 'Banned', 'Deactivated'].includes(status)) filter.status = status;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }];
  }
  // _id tiebreaker: ObjectIds are strictly insertion-ordered even when two
  // records share the same createdAt millisecond, which plain createdAt
  // sorting can't guarantee.
  const users = await User.find(filter).sort({ createdAt: -1, _id: -1 });
  res.json({ users: users.map((u) => u.toPublicJSON()) });
});

// GET /admin/users/:id — single hiker by MongoDB id or email address.
export const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = /^[0-9a-f]{24}$/i.test(id)
    ? await User.findById(id)
    : await User.findOne({ email: id.toLowerCase() });
  if (!user) throw ApiError.notFound('User not found');

  let referredUsers = [];
  if (user.referralCode) {
    const list = await User.find({ referredBy: user.referralCode }).select('name email _id');
    referredUsers = list.map(ru => ({
      id: ru._id.toString(),
      name: ru.name,
      email: ru.email
    }));
  }

  const userJSON = user.toPublicJSON();

  res.json({
    user: {
      ...userJSON,
      referredUsers
    }
  });
});


// PATCH /admin/users/:id/status { status: 'Active' | 'Banned' } — ban/unban.
export const setUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Active', 'Banned'].includes(status)) {
    throw ApiError.badRequest("status must be 'Active' or 'Banned'");
  }
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user: user.toPublicJSON() });
});

// DELETE /admin/users/:id — remove a customer account.
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ ok: true, id: req.params.id });
});

// PATCH /admin/users/:id — admin edits a hiker's profile fields.
export const updateUser = asyncHandler(async (req, res) => {
  const {
    name, mobile, age, gender, hikingExperience, fitnessLevel, emergencyContact,
  } = req.body;

  if (name !== undefined && !name.trim()) {
    throw ApiError.badRequest('Name is required');
  }
  if (mobile !== undefined && mobile.trim() && !MOBILE_REGEX.test(mobile.trim())) {
    throw ApiError.badRequest('Enter a valid 10-digit mobile number');
  }
  if (age !== undefined && (Number.isNaN(Number(age)) || Number(age) < 12 || Number(age) > 99)) {
    throw ApiError.badRequest('Please enter a valid age between 12 and 99');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (name              !== undefined) user.name              = name.trim();
  if (mobile            !== undefined) user.mobile             = mobile.trim();
  if (age                !== undefined) user.age                = Number(age);
  if (gender             !== undefined) user.gender             = gender;
  if (hikingExperience   !== undefined) user.hikingExperience   = hikingExperience;
  if (fitnessLevel       !== undefined) user.fitnessLevel       = fitnessLevel;
  if (emergencyContact   !== undefined) user.emergencyContact   = emergencyContact.trim();

  await user.save();
  res.json({ user: user.toPublicJSON() });
});

// POST /admin/users — admin creates a hiker roster entry. Password is optional
// (admin-added accounts may be placeholders); email must be unique.
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, mobile, age, gender, hikingExperience, fitnessLevel, password } = req.body;
  if (!name?.trim() || !email?.trim()) throw ApiError.badRequest('name and email are required');
  if (!EMAIL_REGEX.test(email.trim())) throw ApiError.badRequest('Please enter a valid email address');
  if (mobile && !MOBILE_REGEX.test(mobile.trim())) {
    throw ApiError.badRequest('Enter a valid 10-digit mobile number');
  }
  if (age !== undefined && (Number.isNaN(Number(age)) || Number(age) < 12 || Number(age) > 99)) {
    throw ApiError.badRequest('Please enter a valid age between 12 and 99');
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    throw ApiError.conflict('A user with this email already exists');
  }
  const user = await User.create({
    name, email, mobile, age, gender, hikingExperience, fitnessLevel,
    passwordHash: password ? await hashPassword(password) : undefined,
    isOnboarded: true,
    authProvider: 'password',
  });
  res.status(201).json({ user: user.toPublicJSON() });
});
