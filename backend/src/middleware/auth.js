import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Organizer from '../models/Organizer.js';

// Requires a valid Bearer JWT. Attaches { sub, role, email } to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Authentication required');
  try {
    req.user = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  next();
}

// Restricts a route to one or more roles. Use after requireAuth.
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have access to this resource');
    }
    next();
  };

// Loads the organizer and blocks access until an admin has approved them.
// Use after requireAuth + requireRole('organizer'). Attaches req.organizer.
export const requireApprovedOrganizer = asyncHandler(async (req, res, next) => {
  const organizer = await Organizer.findById(req.user.sub);
  if (!organizer) throw ApiError.notFound('Organizer not found');
  if (!organizer.isApproved) {
    throw ApiError.forbidden('Your organizer account is pending admin approval');
  }
  req.organizer = organizer;
  next();
});
