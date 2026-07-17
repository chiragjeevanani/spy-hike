import crypto from 'crypto';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken, signPhoneToken, verifyPhoneToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { otpProvider } from '../integrations/otp.js';
import { googleProvider } from '../integrations/googleOAuth.js';
import { validateGovtId } from '../utils/govtIdValidator.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;
const URL_REGEX = /^https?:\/\/[^\s]+\.[^\s]+$/;
// Same strength rule the frontend enforces at signup and reset — at least 8
// characters with a letter and a number — so a weaker password can't be set
// by calling the API directly.
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_HELP = 'Password must be at least 8 characters, with at least one letter and one number';

// ── Auth response helpers ─────────────────────────────────────────────────────

// Customer-role token + public JSON.
function customerAuthResponse(user) {
  const token = signToken({ sub: user._id.toString(), role: 'customer', email: user.email });
  return { token, role: 'customer', account: user.toPublicJSON() };
}

// Organizer-role token + organizer-shaped JSON.
function organizerAuthResponse(user) {
  const token = signToken({ sub: user._id.toString(), role: 'organizer', email: user.email });
  return { token, role: 'organizer', account: user.toOrganizerJSON() };
}

// True when a phone-verification token proves the given mobile passed OTP.
function isPhoneVerified(mobile, phoneToken) {
  if (!phoneToken || !mobile) return false;
  const verifiedMobile = verifyPhoneToken(phoneToken);
  return !!verifiedMobile && verifiedMobile === mobile;
}

// ── Customer ──────────────────────────────────────────────────────────────────

export const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password, mobile, age, gender, phoneToken, referredBy } = req.body;
  if (!name || !email || !password) {
    throw ApiError.badRequest('name, email and password are required');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw ApiError.badRequest('Please enter a valid email address');
  }
  if (!PASSWORD_REGEX.test(password)) {
    throw ApiError.badRequest(PASSWORD_HELP);
  }
  if (mobile && !MOBILE_REGEX.test(mobile)) {
    throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
  }

  const normalizedEmail = email.toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) {
    throw ApiError.conflict('An account with this email already exists');
  }
  if (mobile && await User.findOne({ mobile })) {
    throw ApiError.conflict('An account with this mobile number already exists');
  }

  let referrerCode = null;
  if (referredBy) {
    const exists = await User.exists({ referralCode: referredBy.trim().toUpperCase() });
    if (exists) referrerCode = referredBy.trim().toUpperCase();
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    mobile,
    mobileVerified: isPhoneVerified(mobile, phoneToken),
    age,
    gender,
    authProvider: 'password',
    profileSetupComplete: false,
    referredBy: referrerCode,
  });
  res.status(201).json(customerAuthResponse(user));
});

export const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.status === 'Banned') throw ApiError.forbidden('This account has been banned');
  res.json(customerAuthResponse(user));
});

export const requestOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) throw ApiError.badRequest('mobile is required');
  if (!MOBILE_REGEX.test(mobile)) {
    throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
  }
  const result = await otpProvider.sendOtp(mobile);
  res.json({ ok: true, ...result });
});

export const verifyPhone = asyncHandler(async (req, res) => {
  const { mobile, code } = req.body;
  if (!mobile) throw ApiError.badRequest('mobile is required');
  if (!MOBILE_REGEX.test(mobile)) {
    throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
  }
  const ok = await otpProvider.verifyOtp(mobile, code);
  if (!ok) throw ApiError.unauthorized('Incorrect OTP');
  res.json({ ok: true, mobile, phoneToken: signPhoneToken(mobile) });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, code, name } = req.body;
  if (!mobile) throw ApiError.badRequest('mobile is required');
  if (!MOBILE_REGEX.test(mobile)) {
    throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
  }
  const ok = await otpProvider.verifyOtp(mobile, code);
  if (!ok) throw ApiError.unauthorized('Incorrect OTP');

  let user = await User.findOne({ mobile });
  if (!user) {
    user = await User.create({
      name: name || 'Find Your Trek Hiker',
      email: `${mobile.replace(/[^0-9]/g, '')}@otp.findyourtrek.local`,
      mobile,
      authProvider: 'otp',
      isOnboarded: false,
      profileSetupComplete: false,
    });
  } else if (user.status === 'Banned') {
    throw ApiError.forbidden('This account has been banned');
  }
  res.json(customerAuthResponse(user));
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const profile = await googleProvider.verifyIdToken(token);
  let user = await User.findOne({ email: profile.email });
  if (!user) {
    user = await User.create({
      name:  profile.name,
      email: profile.email,
      avatar: profile.avatar,
      authProvider: 'google',
      isOnboarded: false,
      profileSetupComplete: false,
    });
  } else if (user.status === 'Banned') {
    throw ApiError.forbidden('This account has been banned');
  }
  res.json(customerAuthResponse(user));
});

// Updates the account's hiker-profile fields. Works for a customer- or
// organizer-scoped token alike (same underlying User document in the unified
// account model) — only an Admin token (a separate identity) is rejected.
export const updateProfile = asyncHandler(async (req, res) => {
  const { sub, role } = req.user;
  if (role === 'admin') {
    throw ApiError.forbidden('Only customers can update their hiker profile');
  }
  const {
    hikingExperience, fitnessLevel, emergencyContact, avatar, gender, age,
    notificationBookings, notificationUpdates, notificationPromo, isOnboarded,
  } = req.body;

  if (age !== undefined && (Number.isNaN(Number(age)) || Number(age) < 12 || Number(age) > 99)) {
    throw ApiError.badRequest('Please enter a valid age between 12 and 99');
  }
  if (emergencyContact !== undefined && !emergencyContact.trim()) {
    throw ApiError.badRequest('Emergency contact is required');
  }
  if (emergencyContact !== undefined && emergencyContact.trim() && emergencyContact.replace(/\D/g, '').length < 10) {
    throw ApiError.badRequest('Emergency contact phone number must be at least 10 digits');
  }

  const user = await User.findById(sub);
  if (!user) throw ApiError.notFound('User not found');

  if (hikingExperience   !== undefined) user.hikingExperience   = hikingExperience;
  if (fitnessLevel       !== undefined) user.fitnessLevel       = fitnessLevel;
  if (emergencyContact   !== undefined) user.emergencyContact   = emergencyContact;
  if (avatar             !== undefined) user.avatar             = avatar;
  if (gender             !== undefined) user.gender             = gender;
  if (age                !== undefined) user.age                = Number(age);
  if (notificationBookings !== undefined) user.notificationBookings = !!notificationBookings;
  if (notificationUpdates  !== undefined) user.notificationUpdates  = !!notificationUpdates;
  if (notificationPromo    !== undefined) user.notificationPromo    = !!notificationPromo;
  if (isOnboarded          !== undefined) user.isOnboarded          = !!isOnboarded;

  user.profileSetupComplete = true;
  await user.save();
  res.json(customerAuthResponse(user));
});

export const requestEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest('email is required');
  if (!EMAIL_REGEX.test(email)) throw ApiError.badRequest('Please enter a valid email address');
  const duplicate = await User.findOne({ email: email.toLowerCase() });
  if (duplicate && duplicate._id.toString() !== req.user?.sub) {
    throw ApiError.badRequest('An account with this email already exists');
  }
  res.json({ sent: true, email, provider: 'stub' });
});

// Same rationale as updateProfile above: any non-admin token for this
// account may update it.
export const updateProfileVerify = asyncHandler(async (req, res) => {
  const { sub, role } = req.user;
  if (role === 'admin') {
    throw ApiError.forbidden('Only customers can update their profile');
  }
  const { name, emergencyContact, email, emailOtp, mobile, mobileOtp } = req.body;
  const user = await User.findById(sub);
  if (!user) throw ApiError.notFound('User not found');

  if (name !== undefined) {
    if (!name.trim()) throw ApiError.badRequest('Full name is required');
    user.name = name;
  }
  if (emergencyContact !== undefined) {
    // A real 10-digit number must be embedded in it — the field feeds
    // safety-critical outreach, not just profile completeness.
    if ((emergencyContact.match(/\d/g) || []).length < 10) {
      throw ApiError.badRequest('A valid emergency contact with a 10-digit phone number is required');
    }
    user.emergencyContact = emergencyContact;
  }

  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    if (!EMAIL_REGEX.test(email)) throw ApiError.badRequest('Please enter a valid email address');
    if (!emailOtp) throw ApiError.badRequest('OTP code is required to update email');
    if (!['1234', '123456'].includes(String(emailOtp).trim())) {
      throw ApiError.unauthorized('Incorrect email verification code. Use 123456.');
    }
    const dup = await User.findOne({ email: email.toLowerCase() });
    if (dup && dup._id.toString() !== sub) throw ApiError.badRequest('An account with this email already exists');
    user.email = email.toLowerCase();
  }

  if (mobile && mobile !== user.mobile) {
    if (!MOBILE_REGEX.test(mobile)) throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
    if (!mobileOtp) throw ApiError.badRequest('OTP code is required to update mobile number');
    if (!['1234', '123456'].includes(String(mobileOtp).trim())) {
      throw ApiError.unauthorized('Incorrect mobile verification code. Use 123456.');
    }
    const dup = await User.findOne({ mobile });
    if (dup && dup._id.toString() !== sub) throw ApiError.badRequest('An account with this mobile number already exists');
    user.mobile = mobile;
  }

  await user.save();
  res.json(customerAuthResponse(user));
});

export const checkAvailability = asyncHandler(async (req, res) => {
  const { email, mobile } = req.query;
  if (email && await User.findOne({ email: email.toLowerCase() })) {
    return res.json({ available: false, field: 'email', message: 'An account with this email already exists' });
  }
  if (mobile && await User.findOne({ mobile })) {
    return res.json({ available: false, field: 'mobile', message: 'An account with this mobile number already exists' });
  }
  res.json({ available: true });
});

export const uploadImage = asyncHandler(async (req, res) => {
  const { file } = req.body;
  if (!file) throw ApiError.badRequest('file base64 data is required');

  const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = env;
  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    console.warn('Cloudinary credentials not set in .env. Falling back to local base64 URI.');
    return res.json({ url: file });
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = crypto
      .createHash('sha1')
      .update(`timestamp=${timestamp}` + cloudinaryApiSecret)
      .digest('hex');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, api_key: cloudinaryApiKey, timestamp, signature }),
      },
    );
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || 'Cloudinary upload failed');
    res.json({ url: data.secure_url });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.json({ url: file, error: err.message });
  }
});

// ── Organizer ─────────────────────────────────────────────────────────────────
// The organizer is the same User document — no separate collection.
// Applying as an organizer writes organizer fields into the user's own record.

// POST /auth/organizer/register — standalone organizer sign-up (new user).
export const registerOrganizer = asyncHandler(async (req, res) => {
  const {
    name, email, password, mobile, agencyName, agencyWebsite, socialMediaLink,
    govtIdType, govtIdNumber, yearsExperience, bio, phoneToken,
  } = req.body;
  if (!name || !email || !password || !agencyName) {
    throw ApiError.badRequest('name, email, password and agencyName are required');
  }
  if (!EMAIL_REGEX.test(email)) throw ApiError.badRequest('Please enter a valid email address');
  if (!PASSWORD_REGEX.test(password)) throw ApiError.badRequest(PASSWORD_HELP);
  if (mobile && !MOBILE_REGEX.test(mobile)) throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
  if (!socialMediaLink || !URL_REGEX.test(socialMediaLink.trim())) {
    throw ApiError.badRequest('A valid social media link is required');
  }

  const idError = validateGovtId(govtIdType, govtIdNumber);
  if (idError) throw ApiError.badRequest(idError);

  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    // Customer already exists — upgrade them to organizer in-place.
    if (user.isOrganizer) throw ApiError.conflict('An organizer account with this email already exists');
  } else {
    // Brand new user registering directly as organizer.
    user = new User({
      name,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      mobile,
      mobileVerified: isPhoneVerified(mobile, phoneToken),
      authProvider: 'password',
      isOnboarded: true,
      profileSetupComplete: true,
    });
  }

  user.isOrganizer = true;
  user.organizer = {
    agencyName: agencyName.trim(),
    agencyWebsite: (agencyWebsite || '').trim(),
    socialMediaLink: (socialMediaLink || '').trim(),
    govtIdType: govtIdType || 'Aadhaar',
    govtIdNumber: (govtIdNumber || '').trim(),
    yearsExperience: parseInt(yearsExperience) || 1,
    bio: (bio || '').trim(),
    isApproved: false,
    isPendingApproval: true,
    isRejected: false,
  };
  await user.save();
  res.status(201).json(organizerAuthResponse(user));
});

// POST /auth/organizer/apply — authenticated customer applies to become organizer.
// Uses the customer's existing passwordHash — no re-entry needed.
export const applyAsOrganizer = asyncHandler(async (req, res) => {
  const { sub } = req.user;
  const { agencyName, agencyWebsite, socialMediaLink, govtIdType, govtIdNumber, yearsExperience, bio } = req.body;

  if (!agencyName) throw ApiError.badRequest('agencyName is required');
  if (!socialMediaLink || !URL_REGEX.test(socialMediaLink.trim())) {
    throw ApiError.badRequest('A valid social media link is required');
  }

  const idError = validateGovtId(govtIdType, govtIdNumber);
  if (idError) throw ApiError.badRequest(idError);

  const user = await User.findById(sub);
  if (!user) throw ApiError.notFound('User not found');

  if (user.isOrganizer) {
    // Already an organizer — return current organizer data (idempotent).
    return res.json(organizerAuthResponse(user));
  }

  user.isOrganizer = true;
  user.organizer = {
    agencyName: agencyName.trim(),
    agencyWebsite: (agencyWebsite || '').trim(),
    socialMediaLink: (socialMediaLink || '').trim(),
    govtIdType: govtIdType || 'Aadhaar',
    govtIdNumber: (govtIdNumber || '').trim(),
    yearsExperience: parseInt(yearsExperience) || 1,
    bio: (bio || '').trim(),
    isApproved: false,
    isPendingApproval: true,
    isRejected: false,
  };
  await user.save();
  res.status(201).json(organizerAuthResponse(user));
});

// POST /auth/organizer/login — organizer panel login.
// Finds the User by email, checks password, requires isOrganizer === true.
export const loginOrganizer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isOrganizer) {
    throw ApiError.forbidden("This account has no organizer profile. Apply from the customer app first.");
  }
  if (user.status === 'Banned') throw ApiError.forbidden('This account has been banned');
  res.json(organizerAuthResponse(user));
});

// GET /auth/organizer-status — check if the logged-in customer also has an
// organizer profile (used by the "Switch to Organizer" button). Also mints an
// organizer-scoped token: the caller already proved ownership of the account
// via their (customer-scoped) token, so no re-login/password is needed to
// pick up the role the organizer-only routes require.
export const getLinkedOrganizerStatus = asyncHandler(async (req, res) => {
  const { sub } = req.user;
  const user = await User.findById(sub);
  if (!user || !user.isOrganizer) {
    return res.json({ isOrganizer: false });
  }
  const org = user.organizer || {};
  res.json({
    isOrganizer: true,
    isApproved: org.isApproved ?? false,
    isPendingApproval: org.isPendingApproval ?? true,
    organizer: user.toOrganizerJSON(),
    token: signToken({ sub: user._id.toString(), role: 'organizer', email: user.email }),
  });
});

// GET /auth/customer-token — mint a customer-scoped token for the current
// account. Used when an organizer switches back to the traveller app; every
// unified account has a customer identity, so no extra checks are needed.
export const getCustomerToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) throw ApiError.notFound('Account not found');
  res.json(customerAuthResponse(user));
});

// PATCH /auth/organizer/profile — update organizer-specific fields.
// Gated on the account's isOrganizer flag (the DB, not the JWT's role claim)
// so a still-valid customer-scoped token for the same account isn't rejected
// just because it predates a role switch.
export const updateOrganizerProfile = asyncHandler(async (req, res) => {
  const { sub } = req.user;
  const user = await User.findById(sub);
  if (!user || !user.isOrganizer) throw ApiError.notFound('Organizer profile not found');

  const org = user.organizer || {};
  const {
    name, agencyName, mobile, agencyWebsite, socialMediaLink,
    yearsExperience, bio, coreCapabilities, supportEmail, supportPhone, headline, avatar,
  } = req.body;

  if (name !== undefined) {
    if (!name.trim() || !NAME_REGEX.test(name.trim())) {
      throw ApiError.badRequest('Full name can only contain letters, spaces, apostrophes and hyphens');
    }
    user.name = name.trim();
  }
  if (mobile !== undefined && mobile !== '') {
    if (!MOBILE_REGEX.test(mobile)) throw ApiError.badRequest('Mobile number must be a valid 10-digit number');
    user.mobile = mobile;
  }
  if (avatar !== undefined) user.avatar = avatar;
  if (agencyName !== undefined) {
    if (!agencyName.trim()) throw ApiError.badRequest('Agency name is required');
    org.agencyName = agencyName.trim();
  }
  if (agencyWebsite !== undefined) {
    if (agencyWebsite.trim() && !URL_REGEX.test(agencyWebsite.trim())) {
      throw ApiError.badRequest('Website must be a valid URL (starting with http:// or https://)');
    }
    org.agencyWebsite = agencyWebsite.trim();
  }
  if (socialMediaLink !== undefined) {
    if (!socialMediaLink.trim() || !URL_REGEX.test(socialMediaLink.trim())) {
      throw ApiError.badRequest('Social media link must be a valid URL (starting with http:// or https://)');
    }
    org.socialMediaLink = socialMediaLink.trim();
  }
  if (yearsExperience !== undefined) org.yearsExperience = Number(yearsExperience) || 1;
  if (bio              !== undefined) org.bio                 = bio;
  if (coreCapabilities !== undefined) {
    org.coreCapabilities = Array.isArray(coreCapabilities)
      ? coreCapabilities.filter((c) => c.trim())
      : [];
  }
  if (supportEmail !== undefined) {
    if (supportEmail.trim() && !EMAIL_REGEX.test(supportEmail.trim())) {
      throw ApiError.badRequest('Support email must be a valid email address');
    }
    org.supportEmail = supportEmail.trim();
  }
  if (supportPhone !== undefined) {
    if (supportPhone.trim() && !MOBILE_REGEX.test(supportPhone.trim())) {
      throw ApiError.badRequest('Support phone must be a valid 10-digit number');
    }
    org.supportPhone = supportPhone.trim();
  }
  if (headline !== undefined) org.headline = headline;

  user.organizer = org;
  await user.save();
  res.json({ ok: true, organizer: user.toOrganizerJSON() });
});

// GET /auth/organizer/public/:name — public organizer profile page.
export const getPublicOrganizerProfile = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const decoded = decodeURIComponent(name).replace(/-/g, ' ');
  const rx = new RegExp(`^${decoded}$`, 'i');
  const user = await User.findOne({
    isOrganizer: true,
    $or: [{ name: rx }, { 'organizer.agencyName': rx }],
  });
  if (!user) throw ApiError.notFound('Organizer profile not found');
  res.json({ organizer: user.toOrganizerJSON() });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: (email || '').toLowerCase() });
  if (!admin || !(await comparePassword(password, admin.passwordHash))) {
    throw ApiError.unauthorized('Invalid admin credentials');
  }
  const token = signToken({ sub: admin._id.toString(), role: 'admin', email: admin.email });
  res.json({ token, role: 'admin', account: admin.toPublicJSON() });
});

// ── Shared ────────────────────────────────────────────────────────────────────

export const me = asyncHandler(async (req, res) => {
  const { sub, role } = req.user;
  if (role === 'customer') {
    const user = await User.findById(sub);
    if (!user) throw ApiError.notFound('Account not found');
    return res.json({ role, account: user.toPublicJSON() });
  }
  if (role === 'organizer') {
    const user = await User.findById(sub);
    if (!user || !user.isOrganizer) throw ApiError.notFound('Account not found');
    return res.json({ role, account: user.toOrganizerJSON() });
  }
  if (role === 'admin') {
    const { Admin: AdminModel } = await import('../models/Admin.js');
    const admin = await Admin.findById(sub);
    if (!admin) throw ApiError.notFound('Account not found');
    return res.json({ role, account: admin.toPublicJSON() });
  }
  throw ApiError.unauthorized('Unknown role');
});

export const logout = asyncHandler(async (req, res) => {
  res.json({ ok: true });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { sub, role } = req.user;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw ApiError.badRequest('Both current and new passwords are required');
  if (!PASSWORD_REGEX.test(newPassword)) throw ApiError.badRequest(PASSWORD_HELP);

  let account;
  if (role === 'admin') {
    account = await Admin.findById(sub);
  } else {
    account = await User.findById(sub);
  }

  if (!account) throw ApiError.notFound('Account not found');
  if (account.passwordHash) {
    if (!(await comparePassword(currentPassword, account.passwordHash))) {
      throw ApiError.unauthorized('Incorrect current password');
    }
  }
  account.passwordHash = await hashPassword(newPassword);
  await account.save();
  res.json({ ok: true, message: 'Password updated successfully' });
});

export const resetPasswordOtp = asyncHandler(async (req, res) => {
  const { mobile, otpCode, newPassword } = req.body;
  if (!mobile || !otpCode || !newPassword) throw ApiError.badRequest('mobile, otpCode and newPassword are required');
  if (!PASSWORD_REGEX.test(newPassword)) throw ApiError.badRequest(PASSWORD_HELP);

  const ok = await otpProvider.verifyOtp(mobile, otpCode);
  if (!ok) throw ApiError.unauthorized('Incorrect OTP code. Use 123456.');

  const user = await User.findOne({ mobile });
  if (!user) throw ApiError.notFound('No account found with this mobile number');
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  res.json({ ok: true, message: 'Password reset successfully' });
});

// POST /auth/fcm-token { fcmToken } — registers/updates the FCM push token for the active user.
export const updateFcmToken = asyncHandler(async (req, res) => {
  const { sub } = req.user;
  const { fcmToken } = req.body;
  if (fcmToken === undefined) throw ApiError.badRequest('fcmToken is required');

  const user = await User.findById(sub);
  if (!user) throw ApiError.notFound('Account not found');

  user.fcmToken = String(fcmToken).trim();
  await user.save();

  res.json({ ok: true, message: 'FCM token registered successfully' });
});

// PATCH /admin/profile — update admin profile details.
export const updateAdminProfile = asyncHandler(async (req, res) => {
  const { sub, role } = req.user;
  if (role !== 'admin') throw ApiError.forbidden('Only admins can update admin profile');

  const { name, email, avatar } = req.body;
  if (name !== undefined && !name.trim()) throw ApiError.badRequest('Name is required');
  const admin = await Admin.findById(sub);
  if (!admin) throw ApiError.notFound('Admin account not found');

  if (name !== undefined) admin.name = name.trim();
  if (email !== undefined) {
    if (!EMAIL_REGEX.test(email)) throw ApiError.badRequest('Please enter a valid email address');
    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing && existing._id.toString() !== sub) {
      throw ApiError.conflict('An admin account with this email already exists');
    }
    admin.email = email.toLowerCase();
  }
  if (avatar !== undefined) admin.avatar = avatar;

  await admin.save();
  res.json({ ok: true, admin: admin.toPublicJSON() });
});

