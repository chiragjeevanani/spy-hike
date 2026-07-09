import { getConfig } from '../models/AdminConfig.js';
import { validateCoupon } from './couponService.js';
import { ApiError } from '../utils/ApiError.js';

const round2 = (n) => Math.round(n * 100) / 100;

// Authoritatively computes a booking's money breakdown from the trip + the
// customer's tier selection, mirroring BookingFlow.jsx exactly:
//   perPersonPrice = tier.price + pickupAddOn
//   baseCost       = Σ (count × perPersonPrice)
//   discount       = coupon (flat/%/capped, min-booking gated)
//   tax            = round((baseCost − discount) × taxRate%)
//   final          = baseCost − discount + tax
//   commission     = round(final × commissionRate%)   (snapshotted on booking)
//   payout         = final − commission
// A redeemed loyalty voucher comps the whole booking (tax + final = 0).
//
// `selections` is [{ id?, label?, count }]. Returns the full breakdown the
// Booking document snapshots.
export async function computeBookingPricing(trip, { selections, couponCode, useLoyaltyReward }) {
  const config = await getConfig();

  // Resolve the effective tier list (implicit single tier for legacy/untiered
  // trips) and the flat pickup add-on.
  const hasTiers = Array.isArray(trip.pricingTiers) && trip.pricingTiers.length > 0;
  const pickup = trip.pickup && Number.isFinite(trip.pickup.price) ? trip.pickup : null;
  const unitPrice = pickup ? pickup.price : trip.price;
  const tiers = hasTiers ? trip.pricingTiers : [{ id: 'standard', label: 'Per Traveler', price: unitPrice }];
  const pickupAddOn = hasTiers && pickup ? pickup.price : 0;

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
    const perPersonPrice = tier.price + pickupAddOn;
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

  // Coupon (re-validated server-side against the live base cost).
  let couponUsed = '';
  let couponDiscount = 0;
  if (couponCode) {
    const result = await validateCoupon(couponCode, baseCost);
    if (!result.ok) throw ApiError.badRequest(result.message);
    couponUsed = result.coupon.code;
    couponDiscount = result.discountAmount;
  }

  const taxable = baseCost - couponDiscount;
  const taxAmount = useLoyaltyReward ? 0 : round2(taxable * (config.taxRate / 100));
  const finalAmount = useLoyaltyReward ? 0 : round2(taxable + taxAmount);

  const commissionRate = config.commissionRate;
  const commissionAmount = round2(finalAmount * (commissionRate / 100));
  const organizerPayout = round2(finalAmount - commissionAmount);

  return {
    travelerBreakdown,
    travelersCount,
    baseCost,
    couponUsed,
    couponDiscount,
    taxAmount,
    finalAmount,
    commissionRate,
    commissionAmount,
    organizerPayout,
    loyaltyRewardApplied: !!useLoyaltyReward,
    pickupLocation: pickup?.location || trip.city || (trip.location || '').split(',')[0],
    pickupPrice: unitPrice,
  };
}
