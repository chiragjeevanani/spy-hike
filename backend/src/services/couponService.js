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

// Case-insensitive lookup + full eligibility check. When `trip` is given, an
// organizer coupon scoped to that trip's organizer takes priority over a
// same-named platform coupon (more specific match wins); trip membership is
// also enforced for organizer coupons scoped to selected trips.
// Returns the same { ok, coupon, discountAmount, message } envelope the
// frontend expects.
export async function validateCoupon(code, bookingAmount = 0, trip = null) {
  const formatted = (code || '').trim().toUpperCase();
  if (!formatted) return { ok: false, message: 'Please enter a coupon code.' };

  await refreshExpiries();

  let coupon = null;
  if (trip?.organizerEmail) {
    coupon = await Coupon.findOne({ scope: 'organizer', organizerEmail: trip.organizerEmail, code: formatted });
  }
  if (!coupon) coupon = await Coupon.findOne({ scope: 'platform', code: formatted });
  if (!coupon) return { ok: false, message: 'Invalid coupon code.' };

  if (coupon.status === 'Expired') return { ok: false, message: 'This coupon has expired.' };
  if (coupon.status === 'Inactive') return { ok: false, message: 'This coupon is not currently active.' };
  if (coupon.startsAt && coupon.startsAt > todayStr()) {
    return { ok: false, message: `This coupon isn't active yet — it starts on ${coupon.startsAt}.` };
  }
  if (coupon.minBookingAmount && bookingAmount < coupon.minBookingAmount) {
    return {
      ok: false,
      message: `This coupon needs a minimum booking value of ₹${coupon.minBookingAmount}.`,
    };
  }
  if (coupon.maxRedemptions != null && coupon.usedCount >= coupon.maxRedemptions) {
    return { ok: false, message: 'This coupon has reached its maximum redemption limit.' };
  }
  if (coupon.scope === 'organizer' && coupon.appliesTo === 'selected' && trip && !coupon.tripIds.includes(trip._id)) {
    return { ok: false, message: 'This coupon isn\'t valid for this trip.' };
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

// Hands a redemption slot back when a booking that claimed one never completed
// (an abandoned online payment). The booking stores the coupon's code rather
// than its id, so the lookup repeats validateCoupon's precedence — an organizer
// coupon for this trip's organizer wins over a same-named platform one — to be
// sure the decrement lands on the coupon that was actually charged.
//
// Floors at zero: a redemption can only ever be given back once, but a manual
// admin edit in between shouldn't be able to drive the counter negative.
export async function releaseCouponRedemption({ code, organizerEmail } = {}) {
  const formatted = (code || '').trim().toUpperCase();
  if (!formatted) return null;

  let coupon = null;
  if (organizerEmail) {
    coupon = await Coupon.findOne({ scope: 'organizer', organizerEmail, code: formatted });
  }
  if (!coupon) coupon = await Coupon.findOne({ scope: 'platform', code: formatted });
  if (!coupon) return null;

  return Coupon.findOneAndUpdate(
    { _id: coupon._id, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
    { new: true },
  );
}

// Atomically increments usedCount only if the redemption cap (if any) isn't
// already reached — the same conditional-update pattern reserveSeats uses to
// avoid overselling, so two concurrent bookings can't both squeeze through a
// coupon's last remaining slot. Returns null if the cap was hit in the race.
export async function redeemCoupon(couponId) {
  return Coupon.findOneAndUpdate(
    {
      _id: couponId,
      $or: [{ maxRedemptions: null }, { $expr: { $lt: ['$usedCount', '$maxRedemptions'] } }],
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );
}
