import Coupon from '../models/Coupon.js';

// Ports the exact behaviour of frontend/src/utils/coupons.js to the server so
// the discount math and eligibility rules are identical on both sides.

export const todayStr = () => new Date().toISOString().split('T')[0];

// Self-healing expiry: any coupon whose expiresAt has passed is flipped to
// 'Expired'. Run before any list/validate so an expired code goes inactive on
// its own with no admin action (the server-side equivalent of applyAutoExpiry).
export async function refreshExpiries() {
  const today = todayStr();
  await Coupon.updateMany(
    { expiresAt: { $ne: null, $lt: today }, status: { $ne: 'Expired' } },
    { $set: { status: 'Expired' } },
  );
}

// Pure discount computation shared by validate + (Phase 5) booking pricing.
export function computeDiscount(coupon, bookingAmount) {
  let discountAmount =
    coupon.type === 'flat' ? coupon.value : (bookingAmount * coupon.value) / 100;
  if (coupon.type === 'percentage' && coupon.maxDiscount) {
    discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  }
  return Math.round(Math.min(discountAmount, bookingAmount) * 100) / 100;
}

// Case-insensitive lookup + full eligibility check. Returns the same
// { ok, coupon, discountAmount, message } envelope the frontend expects.
export async function validateCoupon(code, bookingAmount = 0) {
  const formatted = (code || '').trim().toUpperCase();
  if (!formatted) return { ok: false, message: 'Please enter a coupon code.' };

  await refreshExpiries();
  const coupon = await Coupon.findOne({ code: formatted });
  if (!coupon) return { ok: false, message: 'Invalid coupon code.' };
  if (coupon.status === 'Expired') return { ok: false, message: 'This coupon has expired.' };
  if (coupon.status === 'Inactive') return { ok: false, message: 'This coupon is not currently active.' };
  if (coupon.minBookingAmount && bookingAmount < coupon.minBookingAmount) {
    return {
      ok: false,
      message: `This coupon needs a minimum booking value of ₹${coupon.minBookingAmount}.`,
    };
  }

  const discountAmount = computeDiscount(coupon, bookingAmount);
  return {
    ok: true,
    coupon,
    discountAmount,
    message:
      coupon.type === 'flat'
        ? `Success! Coupon applied: ₹${coupon.value} off.`
        : `Success! Coupon applied: ${coupon.value}% off.`,
  };
}

// Increment redemption count (called on successful booking in Phase 5).
export async function markCouponUsed(codeOrId) {
  const formatted = String(codeOrId || '').trim();
  await Coupon.findOneAndUpdate(
    { $or: [{ _id: formatted }, { code: formatted.toUpperCase() }] },
    { $inc: { usedCount: 1 } },
  );
}
