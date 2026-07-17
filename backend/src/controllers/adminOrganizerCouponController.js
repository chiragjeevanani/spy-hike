import Coupon from '../models/Coupon.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { refreshExpiries } from '../services/couponService.js';
import { applyCouponFields, assertTripsOwnedByOrganizer } from '../utils/couponValidation.js';

// Admin moderation of organizer-authored coupons: edit/pause/delete only —
// organizers remain the sole authors (no admin "create on behalf of" here,
// mirroring how trekRequestController lets admins edit but not fabricate an
// organizer's own submission out of thin air).

// GET /admin/organizer-coupons?search=&organizerEmail=
export const adminListOrganizerCoupons = asyncHandler(async (req, res) => {
  await refreshExpiries();
  const { search, organizerEmail } = req.query;
  const filter = { scope: 'organizer' };
  if (organizerEmail) filter.organizerEmail = organizerEmail;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ code: rx }, { organizerEmail: rx }];
  }
  const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
  res.json({ coupons: coupons.map((c) => c.toPublicJSON()) });
});

async function findOrganizerCoupon(req) {
  const coupon = await Coupon.findOne({ _id: req.params.id, scope: 'organizer' });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  return coupon;
}

export const adminUpdateOrganizerCoupon = asyncHandler(async (req, res) => {
  const coupon = await findOrganizerCoupon(req);
  if (req.body.code !== undefined) {
    const nextCode = String(req.body.code).trim().toUpperCase();
    if (nextCode !== coupon.code && await Coupon.exists({ scope: 'organizer', organizerEmail: coupon.organizerEmail, code: nextCode })) {
      throw ApiError.conflict('This organizer already has a coupon with this code');
    }
  }
  applyCouponFields(coupon, req.body, { isNew: false });
  await assertTripsOwnedByOrganizer(coupon.tripIds, coupon.organizerEmail);
  await coupon.save();
  res.json({ coupon: coupon.toPublicJSON() });
});

export const adminToggleOrganizerCoupon = asyncHandler(async (req, res) => {
  const coupon = await findOrganizerCoupon(req);
  if (coupon.status === 'Expired') {
    throw ApiError.badRequest('Renew this coupon\'s expiry before reactivating it');
  }
  coupon.status = coupon.status === 'Active' ? 'Inactive' : 'Active';
  await coupon.save();
  res.json({ coupon: coupon.toPublicJSON() });
});

export const adminDeleteOrganizerCoupon = asyncHandler(async (req, res) => {
  const coupon = await findOrganizerCoupon(req);
  await coupon.deleteOne();
  res.json({ ok: true });
});
