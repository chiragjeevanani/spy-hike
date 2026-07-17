import Trip from '../models/Trip.js';
import { ApiError } from './ApiError.js';

// Shared by organizerCouponController (organizer's own CRUD) and
// adminOrganizerCouponController (admin moderation of the same documents) so
// both enforce identical field rules on an organizer-scoped coupon.
export function applyCouponFields(coupon, f, { isNew }) {
  if (f.code !== undefined) coupon.code = String(f.code).trim().toUpperCase();
  if (!coupon.code) throw ApiError.badRequest('Coupon code is required');

  if (f.type !== undefined) coupon.type = f.type === 'flat' ? 'flat' : 'percentage';
  if (f.value !== undefined) coupon.value = Math.max(0, Number(f.value) || 0);
  if (!coupon.value || coupon.value <= 0) throw ApiError.badRequest('Discount value must be greater than 0');
  if (coupon.type === 'percentage' && coupon.value > 100) throw ApiError.badRequest('Percentage discount cannot exceed 100');

  if (f.maxDiscount !== undefined) coupon.maxDiscount = f.maxDiscount ? Math.max(0, Number(f.maxDiscount)) : null;
  if (f.minBookingAmount !== undefined) coupon.minBookingAmount = f.minBookingAmount ? Math.max(0, Number(f.minBookingAmount)) : 0;
  if (f.startsAt !== undefined) coupon.startsAt = f.startsAt || null;
  if (f.expiresAt !== undefined) coupon.expiresAt = f.expiresAt || null;
  if (coupon.startsAt && coupon.expiresAt && coupon.startsAt > coupon.expiresAt) {
    throw ApiError.badRequest('Start date must be before the expiry date');
  }
  if (f.maxRedemptions !== undefined) {
    coupon.maxRedemptions = f.maxRedemptions ? Math.max(1, Math.round(Number(f.maxRedemptions))) : null;
  }
  if (f.status !== undefined && ['Active', 'Inactive'].includes(f.status)) coupon.status = f.status;
  if (isNew && !coupon.status) coupon.status = 'Active';

  if (f.appliesTo !== undefined) coupon.appliesTo = f.appliesTo === 'selected' ? 'selected' : 'all';
  if (f.tripIds !== undefined) coupon.tripIds = Array.isArray(f.tripIds) ? f.tripIds : [];
  if (coupon.appliesTo === 'selected' && coupon.tripIds.length === 0) {
    throw ApiError.badRequest('Select at least one trip, or switch to "All Trips"');
  }
}

// Confirms every id in tripIds is actually one of this organizer's own trips
// — prevents a coupon being scoped to (or leaking discounts onto) someone
// else's listing.
export async function assertTripsOwnedByOrganizer(tripIds, organizerEmail) {
  if (!tripIds || tripIds.length === 0) return;
  const count = await Trip.countDocuments({ _id: { $in: tripIds }, organizerEmail });
  if (count !== tripIds.length) {
    throw ApiError.badRequest('One or more selected trips are invalid or not yours');
  }
}
