import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

import User from '../models/User.js';

// Requires a valid Bearer JWT. Attaches { sub, role, email } to req.user.
export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Authentication required');
  try {
    req.user = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  // Load the user from DB to verify status is not Banned/Deactivated. Checked
  // for both customer- and organizer-scoped tokens since they're the same
  // underlying User document in the unified account model — a ban/deactivation
  // must hold regardless of which role the caller's token happens to be
  // scoped to, and takes effect immediately even mid-session.
  if (req.user.role === 'customer' || req.user.role === 'organizer') {
    const user = await User.findById(req.user.sub).select('status');
    if (!user) {
      throw ApiError.unauthorized('User account has been deleted');
    }
    if (user.status === 'Banned') {
      throw ApiError.forbidden('User is banned');
    }
    if (user.status === 'Deactivated') {
      throw ApiError.forbidden('This account has been deactivated. Kindly contact customer support for more details.');
    }
  }
  next();
});

// Restricts a route to one or more roles. Use after requireAuth. Suitable for
// roles that only ever have one identity (admin) — for the customer/organizer
// unified account, prefer requireOrganizerAccount, which checks the DB rather
// than trusting the token's role claim (a still-valid token minted before a
// role switch would otherwise be wrongly rejected).
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have access to this resource');
    }
    next();
  };

// Gates /organizer/* on the account actually having an organizer profile
// (User.isOrganizer), not on the JWT's role claim — a customer-scoped token
// for the same unified account should still work here. Use after requireAuth.
export const requireOrganizerAccount = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.sub);
  if (!user || !user.isOrganizer) {
    throw ApiError.forbidden('You do not have access to this resource');
  }
  next();
});

// Loads the organizer and blocks access until an admin has approved them.
// Use after requireAuth + requireOrganizerAccount. Attaches req.organizer.
// Organizers are unified User documents (isOrganizer: true) — there is no
// separate Organizer collection.
export const requireApprovedOrganizer = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.sub);
  if (!user || !user.isOrganizer) throw ApiError.notFound('Organizer not found');
  if (!user.organizer?.isApproved) {
    throw ApiError.forbidden('Your organizer account is pending admin approval');
  }
  req.organizer = user.toOrganizerJSON();
  next();
});
