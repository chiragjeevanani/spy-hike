import User from '../models/User.js';
import Organizer from '../models/Organizer.js';
import Admin from '../models/Admin.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { otpProvider } from '../integrations/otp.js';
import { googleProvider } from '../integrations/googleOAuth.js';

// Uniform auth response across all three roles: the signed token, the
// frontend-shaped principal, and its role.
function authResponse(account, role, extra = {}) {
  const token = signToken({ sub: account._id.toString(), role, email: account.email });
  return { token, role, account: account.toPublicJSON(extra) };
}

// Has an organizer account with this email (used to set `isOrganizer` on the
// customer principal so the client's "Switch to Organizer" affordance works).
async function hasOrganizerAccount(email) {
  return !!(await Organizer.exists({ email: email.toLowerCase() }));
}

// ─── Customer ────────────────────────────────────────────────────────────────

export const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password, mobile, age, gender } = req.body;
  if (!name || !email || !password) {
    throw ApiError.badRequest('name, email and password are required');
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    mobile,
    age,
    gender,
    authProvider: 'password',
  });
  res.status(201).json(authResponse(user, 'customer', { isOrganizer: await hasOrganizerAccount(email) }));
});

export const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.status === 'Banned') throw ApiError.forbidden('This account has been banned');
  res.json(authResponse(user, 'customer', { isOrganizer: await hasOrganizerAccount(user.email) }));
});

export const requestOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) throw ApiError.badRequest('mobile is required');
  const result = await otpProvider.sendOtp(mobile);
  res.json({ ok: true, ...result });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, code, name } = req.body;
  if (!mobile) throw ApiError.badRequest('mobile is required');
  const ok = await otpProvider.verifyOtp(mobile, code);
  if (!ok) throw ApiError.unauthorized('Incorrect OTP');

  // Find-or-create a customer keyed by mobile.
  let user = await User.findOne({ mobile });
  if (!user) {
    user = await User.create({
      name: name || 'Trekigo Hiker',
      email: `${mobile.replace(/[^0-9]/g, '')}@otp.trekigo.local`,
      mobile,
      authProvider: 'otp',
      isOnboarded: false,
    });
  }
  res.json(authResponse(user, 'customer', { isOrganizer: await hasOrganizerAccount(user.email) }));
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const profile = await googleProvider.verifyIdToken(token);
  let user = await User.findOne({ email: profile.email });
  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      authProvider: 'google',
      isOnboarded: false,
    });
  }
  res.json(authResponse(user, 'customer', { isOrganizer: await hasOrganizerAccount(user.email) }));
});

// ─── Organizer ───────────────────────────────────────────────────────────────

export const registerOrganizer = asyncHandler(async (req, res) => {
  const {
    name, email, password, mobile, agencyName, agencyWebsite, socialMediaLink,
    govtIdType, govtIdNumber, yearsExperience, bio,
  } = req.body;
  if (!name || !email || !password || !agencyName) {
    throw ApiError.badRequest('name, email, password and agencyName are required');
  }
  const passwordHash = await hashPassword(password);
  // Approval is admin-only: registration always lands pending.
  const organizer = await Organizer.create({
    name, email, passwordHash, mobile, agencyName, agencyWebsite, socialMediaLink,
    govtIdType, govtIdNumber, yearsExperience, bio,
    isApproved: false,
    isPendingApproval: true,
  });
  res.status(201).json(authResponse(organizer, 'organizer'));
});

export const loginOrganizer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const organizer = await Organizer.findOne({ email: (email || '').toLowerCase() });
  if (!organizer || !(await comparePassword(password, organizer.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  res.json(authResponse(organizer, 'organizer'));
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: (email || '').toLowerCase() });
  if (!admin || !(await comparePassword(password, admin.passwordHash))) {
    throw ApiError.unauthorized('Invalid admin credentials');
  }
  res.json(authResponse(admin, 'admin'));
});

// ─── Shared ──────────────────────────────────────────────────────────────────

// Returns the current principal based on the role in the JWT.
export const me = asyncHandler(async (req, res) => {
  const { sub, role } = req.user;
  if (role === 'customer') {
    const user = await User.findById(sub);
    if (!user) throw ApiError.notFound('Account not found');
    return res.json({ role, account: user.toPublicJSON({ isOrganizer: await hasOrganizerAccount(user.email) }) });
  }
  if (role === 'organizer') {
    const organizer = await Organizer.findById(sub);
    if (!organizer) throw ApiError.notFound('Account not found');
    return res.json({ role, account: organizer.toPublicJSON() });
  }
  if (role === 'admin') {
    const admin = await Admin.findById(sub);
    if (!admin) throw ApiError.notFound('Account not found');
    return res.json({ role, account: admin.toPublicJSON() });
  }
  throw ApiError.unauthorized('Unknown role');
});

// JWT is stateless — logout is a client-side token discard. Endpoint exists
// for symmetry and future token-revocation support.
export const logout = asyncHandler(async (req, res) => {
  res.json({ ok: true });
});
