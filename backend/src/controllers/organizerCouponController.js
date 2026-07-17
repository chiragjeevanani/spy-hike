import Coupon from '../models/Coupon.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { refreshExpiries } from '../services/couponService.js';
import { applyCouponFields, assertTripsOwnedByOrganizer } from '../utils/couponValidation.js';

// An organizer's own discount coupons — codes are unique per-organizer (two
// organizers can both use "SUMMER25"), scoped to either all of their trips or
// a hand-picked subset. See backend/src/models/Coupon.js for the shared shape
// with admin's platform coupons.

export const listMyCoupons = asyncHandler(async (req, res) => {
  await refreshExpiries();
  const coupons = await Coupon.find({ scope: 'organizer', organizerEmail: req.organizer.email }).sort({ createdAt: -1 });
  res.json({ coupons: coupons.map((c) => c.toPublicJSON()) });
});

export const createMyCoupon = asyncHandler(async (req, res) => {
  const f = req.body;
  const code = (f.code || '').trim().toUpperCase();
  if (!code) throw ApiError.badRequest('Coupon code is required');
  if (await Coupon.exists({ scope: 'organizer', organizerEmail: req.organizer.email, code })) {
    throw ApiError.conflict('You already have a coupon with this code');
  }

  const coupon = new Coupon({
    // Random suffix, not just Date.now() — two coupons created in the same
    // millisecond (plausible under load/tests) would otherwise collide.
    _id: `oc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    scope: 'organizer',
    organizerEmail: req.organizer.email,
    usedCount: 0,
  });
  applyCouponFields(coupon, f, { isNew: true });
  await assertTripsOwnedByOrganizer(coupon.tripIds, req.organizer.email);
  await coupon.save();
  res.status(201).json({ coupon: coupon.toPublicJSON() });
});

async function findOwnCoupon(req) {
  const coupon = await Coupon.findOne({ _id: req.params.id, scope: 'organizer' });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  if (coupon.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('You can only manage your own coupons');
  }
  return coupon;
}

export const updateMyCoupon = asyncHandler(async (req, res) => {
  const coupon = await findOwnCoupon(req);
  if (req.body.code !== undefined) {
    const nextCode = String(req.body.code).trim().toUpperCase();
    if (nextCode !== coupon.code && await Coupon.exists({ scope: 'organizer', organizerEmail: req.organizer.email, code: nextCode })) {
      throw ApiError.conflict('You already have a coupon with this code');
    }
  }
  applyCouponFields(coupon, req.body, { isNew: false });
  await assertTripsOwnedByOrganizer(coupon.tripIds, req.organizer.email);
  await coupon.save();
  res.json({ coupon: coupon.toPublicJSON() });
});

export const toggleMyCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await findOwnCoupon(req);
  if (coupon.status === 'Expired') {
    throw ApiError.badRequest('Renew this coupon\'s expiry before reactivating it');
  }
  coupon.status = coupon.status === 'Active' ? 'Inactive' : 'Active';
  await coupon.save();
  res.json({ coupon: coupon.toPublicJSON() });
});

export const deleteMyCoupon = asyncHandler(async (req, res) => {
  const coupon = await findOwnCoupon(req);
  await coupon.deleteOne();
  res.json({ ok: true });
});
