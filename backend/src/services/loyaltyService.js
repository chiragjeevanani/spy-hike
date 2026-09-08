import Voucher from '../models/Voucher.js';
import Booking, { SETTLED_BOOKING_FILTER } from '../models/Booking.js';
import { getLoyaltyConfig } from '../models/LoyaltyConfig.js';

// Server port of utils/loyalty.js. Vouchers are minted whenever *cycle*
// progress (see getCycleStart below) crosses a fresh multiple of the
// threshold — claiming a reward resets the counter to 0 rather than letting
// the account's all-time lifetime total immediately re-trigger another.

// Every count below is over non-cancelled bookings that were actually paid for:
// an abandoned online checkout must not move anyone closer to a free trek.
//
// Lifetime "persons booked" for a customer = Σ travelersCount across their
// non-cancelled bookings. Kept for historical/"lifetime total" display only —
// progress-toward-next-reward uses the cycle-scoped counters below instead.
export async function computeLifetimePersons(userEmail) {
  const bookings = await Booking.find({ userEmail, status: { $ne: 'Cancelled' }, ...SETTLED_BOOKING_FILTER });
  return bookings.reduce((sum, b) => sum + (b.travelersCount || b.travelers?.length || 0), 0);
}

// Lifetime bookings for an organizer = count of their non-cancelled bookings.
export async function computeLifetimeOrganizerBookings(organizerEmail) {
  return Booking.countDocuments({ organizerEmail, status: { $ne: 'Cancelled' }, ...SETTLED_BOOKING_FILTER });
}

// The start of the owner's *current* reward cycle: the moment their most
// recently redeemed voucher was used, or the epoch if they've never redeemed
// one. Bookings before this already earned/paid for a reward that's been
// claimed, so they shouldn't count toward the next one too.
async function getCycleStart(ownerType, ownerKey) {
  const lastUsed = await Voucher.findOne({ ownerType, ownerKey, status: 'used' }).sort({ usedAt: -1 });
  return lastUsed?.usedAt || new Date(0);
}

async function cyclePersonsSince(userEmail, since) {
  const bookings = await Booking.find({
    userEmail, status: { $ne: 'Cancelled' }, createdAt: { $gt: since }, ...SETTLED_BOOKING_FILTER,
  });
  return bookings.reduce((sum, b) => sum + (b.travelersCount || b.travelers?.length || 0), 0);
}

async function cycleOrganizerBookingsSince(organizerEmail, since) {
  return Booking.countDocuments({
    organizerEmail, status: { $ne: 'Cancelled' }, createdAt: { $gt: since }, ...SETTLED_BOOKING_FILTER,
  });
}

// Travelers counted toward the customer's *next* milestone since their last
// redemption (0 immediately after claiming a reward).
export async function computeCyclePersons(userEmail) {
  const since = await getCycleStart('customer', userEmail);
  return cyclePersonsSince(userEmail, since);
}

// Bookings counted toward the organizer's *next* milestone since their last
// redemption (0 immediately after claiming a reward).
export async function computeCycleOrganizerBookings(organizerEmail) {
  const since = await getCycleStart('organizer', organizerEmail);
  return cycleOrganizerBookingsSince(organizerEmail, since);
}

// Mints any newly-earned milestone vouchers within the current cycle.
// Idempotent: only appends when cycle progress has crossed a fresh multiple
// of the threshold that hasn't already been issued since the cycle started.
// milestoneNumber keeps climbing across the account's whole history (for the
// "Milestone #N" reward-history label) even though the progress basis that
// triggers minting resets each cycle.
async function mintVouchers(ownerType, ownerKey, cycleCount, threshold, since) {
  if (!threshold || threshold <= 0) return;
  const milestonesEarned = Math.floor(cycleCount / threshold);
  const issuedThisCycle = await Voucher.countDocuments({ ownerType, ownerKey, earnedAt: { $gt: since } });
  if (milestonesEarned <= issuedThisCycle) return;

  const totalIssuedEver = await Voucher.countDocuments({ ownerType, ownerKey });
  const toMint = [];
  for (let i = 0; i < milestonesEarned - issuedThisCycle; i++) {
    toMint.push({ ownerType, ownerKey, milestoneNumber: totalIssuedEver + i + 1, status: 'available' });
  }
  await Voucher.insertMany(toMint);
}

export async function syncCustomerVouchers(userEmail, config) {
  const cfg = config || (await getLoyaltyConfig());
  if (!cfg.customer.enabled) return;
  const since = await getCycleStart('customer', userEmail);
  const cycleCount = await cyclePersonsSince(userEmail, since);
  await mintVouchers('customer', userEmail, cycleCount, cfg.customer.thresholdPersons, since);
}

export async function syncOrganizerVouchers(organizerEmail, config) {
  const cfg = config || (await getLoyaltyConfig());
  if (!cfg.organizer.enabled) return;
  const since = await getCycleStart('organizer', organizerEmail);
  const cycleCount = await cycleOrganizerBookingsSince(organizerEmail, since);
  await mintVouchers('organizer', organizerEmail, cycleCount, cfg.organizer.thresholdBookings, since);
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
// `count` should be the *cycle* count (computeCyclePersons /
// computeCycleOrganizerBookings), not the account's all-time lifetime total.
export function cycleProgress(count, threshold) {
  if (!threshold || threshold <= 0) return { count, threshold, withinCycle: 0, remaining: 0, percent: 0 };
  const atMilestone = count > 0 && count % threshold === 0;
  const withinCycle = atMilestone ? threshold : count % threshold;
  return {
    count,
    threshold,
    withinCycle,
    remaining: threshold - withinCycle,
    percent: Math.round((withinCycle / threshold) * 100),
  };
}
