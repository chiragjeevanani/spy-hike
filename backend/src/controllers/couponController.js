import Coupon from '../models/Coupon.js';
import Trip from '../models/Trip.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { refreshExpiries, validateCoupon, todayStr } from '../services/couponService.js';
import { applyCouponFields } from '../utils/couponValidation.js';

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /coupons?tripId= — currently-active coupons, for the checkout
// quick-apply chips: every active platform coupon, plus (when tripId is
// given) that trip's organizer's active coupons that actually apply to it.
export const listActiveCoupons = asyncHandler(async (req, res) => {
  await refreshExpiries();
  const platform = await Coupon.find({ scope: 'platform', status: 'Active' }).sort({ createdAt: 1 });

  let organizerCoupons = [];
  const { tripId } = req.query;
  if (tripId) {
    const trip = await Trip.findById(tripId);
    if (trip?.organizerEmail) {
      organizerCoupons = await Coupon.find({
        scope: 'organizer',
        organizerEmail: trip.organizerEmail,
        status: 'Active',
        $or: [{ appliesTo: 'all' }, { tripIds: tripId }],
      }).sort({ createdAt: 1 });
    }
  }

  res.json({ coupons: [...platform, ...organizerCoupons].map((c) => c.toPublicJSON()) });
});

// POST /coupons/validate { code, bookingAmount, tripId } — checkout coupon check.
export const validateCouponEndpoint = asyncHandler(async (req, res) => {
  const { code, bookingAmount = 0, tripId } = req.body;
  const trip = tripId ? await Trip.findById(tripId) : null;
  const result = await validateCoupon(code, Number(bookingAmount) || 0, trip);
  if (!result.ok) return res.json({ ok: false, message: result.message });
  res.json({
    ok: true,
    message: result.message,
    discountAmount: result.discountAmount,
    coupon: result.coupon.toPublicJSON(),
  });
});

// ─── Admin CRUD (platform coupons only — organizer coupons are managed via
// adminOrganizerCouponController) ────────────────────────────────────────────

export const listCoupons = asyncHandler(async (req, res) => {
  await refreshExpiries();
  const coupons = await Coupon.find({ scope: 'platform' }).sort({ createdAt: -1 });
  res.json({ coupons: coupons.map((c) => c.toPublicJSON()) });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const f = req.body;
  const code = (f.code || '').trim().toUpperCase();
  if (!code) throw ApiError.badRequest('Coupon code is required');
  if (await Coupon.exists({ scope: 'platform', code })) throw ApiError.conflict('A coupon with this code already exists');

  // Random suffix, not just Date.now() — two coupons created in the same
  // millisecond (plausible under load/tests) would otherwise collide.
  const id = `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const coupon = new Coupon({ _id: id, scope: 'platform', usedCount: 0 });
  applyCouponFields(coupon, f, { isNew: true });
  await coupon.save();
  res.status(201).json({ coupon: coupon.toPublicJSON() });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOne({ _id: req.params.id, scope: 'platform' });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  const f = req.body;
  const wasExpired = coupon.status === 'Expired';

  if (f.code !== undefined) {
    const nextCode = String(f.code).trim().toUpperCase();
    if (nextCode !== coupon.code && await Coupon.exists({ scope: 'platform', code: nextCode })) {
      throw ApiError.conflict('A coupon with this code already exists');
    }
  }
  applyCouponFields(coupon, f, { isNew: false });

  // Renewing an expired coupon's date revives it to Active, unless the admin
  // explicitly set Inactive in the same edit.
  if (coupon.expiresAt && coupon.expiresAt >= todayStr() && wasExpired && f.status !== 'Inactive') {
    coupon.status = 'Active';
  }

  await coupon.save();
  res.json({ coupon: coupon.toPublicJSON() });
});

// PATCH /admin/coupons/:id/toggle — manual Active <-> Inactive. An Expired
// coupon can't be reactivated this way; its expiry must be renewed first.
export const toggleCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOne({ _id: req.params.id, scope: 'platform' });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  if (coupon.status === 'Expired') {
    throw ApiError.badRequest('Renew this coupon\'s expiry before reactivating it');
  }
  coupon.status = coupon.status === 'Active' ? 'Inactive' : 'Active';
  await coupon.save();
  res.json({ coupon: coupon.toPublicJSON() });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, scope: 'platform' });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  res.json({ ok: true });
});
