import { getConfig } from '../models/AdminConfig.js';
import { getLoyaltyConfig } from '../models/LoyaltyConfig.js';
import { validateCoupon } from './couponService.js';
import { ApiError } from '../utils/ApiError.js';

const round2 = (n) => Math.round(n * 100) / 100;

// Authoritatively computes a booking's money breakdown from the trip + the
// customer's tier selection, mirroring BookingFlow.jsx exactly:
//   perPersonPrice = tier.price          (already inclusive — see below)
//   baseCost       = Σ (count × perPersonPrice)
//   discount       = coupon (flat/%/capped, min-booking gated)
//   loyalty        = min(admin's maxDiscountAmount, taxable) when redeemed
//   final          = taxable − loyalty
//   commission     = round(final × commissionRate%)   (snapshotted on booking)
//   payout         = final − commission
// A redeemed loyalty voucher comps up to the admin-configured cap, not the
// whole booking — a trip priced above the cap still charges the remainder.
//
// Two things this deliberately does NOT add, because the tier price already
// contains both — adding either charged the customer more than the checkout
// quoted them:
//   • pickup.price is the per-person price *departing from that city*, not a
//     surcharge on top of it ("the per-person price from there — e.g. Manali
//     ₹6000", TripFormView), and trip.price is stored as the same figure.
//     Adding it double-counted the identical amount.
//   • Trip prices are tax-inclusive ("already includes taxes & permits").
//     config.taxRate is kept for reporting and stays on the response as
//     taxAmount: 0, but never inflates what the customer owes.
//
// `selections` is [{ id?, label?, count }]. Returns the full breakdown the
// Booking document snapshots.
export async function computeBookingPricing(trip, { selections, couponCode, useLoyaltyReward }) {
  const config = await getConfig();

  // Resolve the effective tier list (implicit single tier for legacy/untiered
  // trips). `unitPrice` backs the implicit tier only.
  const hasTiers = Array.isArray(trip.pricingTiers) && trip.pricingTiers.length > 0;
  const pickup = trip.pickup && Number.isFinite(trip.pickup.price) ? trip.pickup : null;
  const unitPrice = pickup ? pickup.price : trip.price;
  const tiers = hasTiers ? trip.pricingTiers : [{ id: 'standard', label: 'Per Traveler', price: unitPrice }];

  // Build the per-tier breakdown from the customer's selection.
  const tierByKey = new Map();
  tiers.forEach((t) => {
    tierByKey.set(t.id, t);
    tierByKey.set((t.label || '').toLowerCase(), t);
  });

  const travelerBreakdown = [];
  for (const sel of selections || []) {
    const count = Number(sel.count) || 0;
    if (count <= 0) continue;
    const tier = tierByKey.get(sel.id) || tierByKey.get((sel.label || '').toLowerCase());
    if (!tier) throw ApiError.badRequest(`Unknown pricing tier: ${sel.label || sel.id}`);
    const perPersonPrice = tier.price;
    travelerBreakdown.push({
      id: tier.id,
      label: tier.label,
      count,
      perPersonPrice,
      subtotal: count * perPersonPrice,
    });
  }

  const travelersCount = travelerBreakdown.reduce((s, t) => s + t.count, 0);
  if (travelersCount <= 0) throw ApiError.badRequest('Select at least one traveler');
  const baseCost = travelerBreakdown.reduce((s, t) => s + t.subtotal, 0);

  // Coupon (re-validated server-side against the live base cost + trip scope).
  let couponUsed = '';
  let couponId = null;
  let couponDiscount = 0;
  if (couponCode) {
    const result = await validateCoupon(couponCode, baseCost, trip);
    if (!result.ok) throw ApiError.badRequest(result.message);
    couponUsed = result.coupon.code;
    couponId = result.coupon._id;
    couponDiscount = result.discountAmount;
  }

  const taxable = baseCost - couponDiscount;

  // The loyalty reward comps up to the admin's configured cap, not the whole
  // booking — so a customer can't redeem a milestone meant for an average
  // trek against an unlimited high-value one.
  let loyaltyDiscountAmount = 0;
  if (useLoyaltyReward) {
    const loyaltyCfg = await getLoyaltyConfig();
    const cap = Number(loyaltyCfg.customer?.maxDiscountAmount) || 0;
    loyaltyDiscountAmount = round2(Math.max(0, Math.min(cap, taxable)));
  }

  const afterLoyalty = round2(Math.max(0, taxable - loyaltyDiscountAmount));
  // Tax-inclusive pricing: the customer owes exactly what checkout quoted.
  const taxAmount = 0;
  const finalAmount = afterLoyalty;

  const commissionRate = config.commissionRate;
  const commissionAmount = round2(finalAmount * (commissionRate / 100));
  const organizerPayout = round2(finalAmount - commissionAmount);

  return {
    travelerBreakdown,
    travelersCount,
    baseCost,
    couponUsed,
    couponId,
    couponDiscount,
    taxAmount,
    finalAmount,
    commissionRate,
    commissionAmount,
    organizerPayout,
    loyaltyRewardApplied: !!useLoyaltyReward,
    loyaltyDiscountAmount,
    pickupLocation: pickup?.location || trip.city || (trip.location || '').split(',')[0],
    pickupPrice: unitPrice,
  };
}
