import Voucher from '../models/Voucher.js';
import Booking from '../models/Booking.js';
import { getLoyaltyConfig } from '../models/LoyaltyConfig.js';

// Server port of utils/loyalty.js. Vouchers are minted whenever lifetime
// progress crosses a fresh multiple of the threshold.

// Lifetime "persons booked" for a customer = Σ travelersCount across their
// non-cancelled bookings.
export async function computeLifetimePersons(userEmail) {
  const bookings = await Booking.find({ userEmail, status: { $ne: 'Cancelled' } });
  return bookings.reduce((sum, b) => sum + (b.travelersCount || b.travelers?.length || 0), 0);
}

// Lifetime bookings for an organizer = count of their non-cancelled bookings.
export async function computeLifetimeOrganizerBookings(organizerEmail) {
  return Booking.countDocuments({ organizerEmail, status: { $ne: 'Cancelled' } });
}

// Mints any newly-earned milestone vouchers for an owner. Idempotent: it only
// appends when milestonesEarned exceeds the number already issued.
async function mintVouchers(ownerType, ownerKey, lifetimeCount, threshold) {
  if (!threshold || threshold <= 0) return;
  const milestonesEarned = Math.floor(lifetimeCount / threshold);
  const issued = await Voucher.countDocuments({ ownerType, ownerKey });
  const toMint = [];
  for (let m = issued + 1; m <= milestonesEarned; m++) {
    toMint.push({ ownerType, ownerKey, milestoneNumber: m, status: 'available' });
  }
  if (toMint.length) await Voucher.insertMany(toMint);
}

export async function syncCustomerVouchers(userEmail, config) {
  const cfg = config || (await getLoyaltyConfig());
  if (!cfg.customer.enabled) return;
  const lifetime = await computeLifetimePersons(userEmail);
  await mintVouchers('customer', userEmail, lifetime, cfg.customer.thresholdPersons);
}

export async function syncOrganizerVouchers(organizerEmail, config) {
  const cfg = config || (await getLoyaltyConfig());
  if (!cfg.organizer.enabled) return;
  const lifetime = await computeLifetimeOrganizerBookings(organizerEmail);
  await mintVouchers('organizer', organizerEmail, lifetime, cfg.organizer.thresholdBookings);
}

export const listVouchers = (ownerType, ownerKey) =>
  Voucher.find({ ownerType, ownerKey }).sort({ milestoneNumber: 1 });

export const getAvailableVoucher = (ownerType, ownerKey) =>
  Voucher.findOne({ ownerType, ownerKey, status: 'available' }).sort({ milestoneNumber: 1 });

export async function markVoucherUsed(voucher, bookingId) {
  voucher.status = 'used';
  voucher.usedRef = bookingId;
  voucher.usedAt = new Date();
  await voucher.save();
  return voucher;
}

// Progress within the current milestone cycle (matches computeCycleProgress).
export function cycleProgress(lifetime, threshold) {
  if (!threshold || threshold <= 0) return { lifetime, threshold, withinCycle: 0, remaining: 0, percent: 0 };
  const atMilestone = lifetime > 0 && lifetime % threshold === 0;
  const withinCycle = atMilestone ? threshold : lifetime % threshold;
  return {
    lifetime,
    threshold,
    withinCycle,
    remaining: threshold - withinCycle,
    percent: Math.round((withinCycle / threshold) * 100),
  };
}
