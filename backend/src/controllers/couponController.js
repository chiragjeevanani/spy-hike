import Coupon from '../models/Coupon.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { refreshExpiries, validateCoupon, todayStr } from '../services/couponService.js';

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /coupons — currently-active coupons, for the checkout quick-apply chips.
export const listActiveCoupons = asyncHandler(async (req, res) => {
  await refreshExpiries();
  const coupons = await Coupon.find({ status: 'Active' }).sort({ createdAt: 1 });
  res.json({ coupons: coupons.map((c) => c.toPublicJSON()) });
});

// POST /coupons/validate { code, bookingAmount } — checkout coupon check.
export const validateCouponEndpoint = asyncHandler(async (req, res) => {
  const { code, bookingAmount = 0 } = req.body;
  const result = await validateCoupon(code, Number(bookingAmount) || 0);
  if (!result.ok) return res.json({ ok: false, message: result.message });
  res.json({
    ok: true,
    message: result.message,
    discountAmount: result.discountAmount,
    coupon: result.coupon.toPublicJSON(),
  });
});

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

export const listCoupons = asyncHandler(async (req, res) => {
  await refreshExpiries();
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons: coupons.map((c) => c.toPublicJSON()) });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const f = req.body;
  const code = (f.code || '').trim().toUpperCase();
  if (!code) throw ApiError.badRequest('Coupon code is required');
  if (await Coupon.exists({ code })) throw ApiError.conflict('A coupon with this code already exists');

  const coupon = await Coupon.create({
    _id: `cp-${Date.now()}`,
    code,
    type: f.type === 'flat' ? 'flat' : 'percentage',
    value: Math.max(0, Number(f.value) || 0),
    maxDiscount: f.maxDiscount ? Math.max(0, Number(f.maxDiscount)) : null,
    minBookingAmount: f.minBookingAmount ? Math.max(0, Number(f.minBookingAmount)) : 0,
    expiresAt: f.expiresAt || null,
    status: 'Active',
    usedCount: 0,
  });
  res.status(201).json({ coupon: coupon.toPublicJSON() });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  const f = req.body;
  const wasExpired = coupon.status === 'Expired';

  if (f.code !== undefined) coupon.code = f.code.trim().toUpperCase();
  if (f.type !== undefined) coupon.type = f.type === 'flat' ? 'flat' : 'percentage';
  if (f.value !== undefined) coupon.value = Math.max(0, Number(f.value) || 0);
  if (f.maxDiscount !== undefined) coupon.maxDiscount = f.maxDiscount ? Math.max(0, Number(f.maxDiscount)) : null;
  if (f.minBookingAmount !== undefined) coupon.minBookingAmount = f.minBookingAmount ? Math.max(0, Number(f.minBookingAmount)) : 0;
  if (f.expiresAt !== undefined) coupon.expiresAt = f.expiresAt || null;
  if (f.status !== undefined) coupon.status = f.status;

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
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  if (coupon.status === 'Expired') {
    throw ApiError.badRequest('Renew this coupon\'s expiry before reactivating it');
  }
  coupon.status = coupon.status === 'Active' ? 'Inactive' : 'Active';
  await coupon.save();
  res.json({ coupon: coupon.toPublicJSON() });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  res.json({ ok: true });
});
