/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Cross-module loyalty program config + voucher ledgers. Admin writes the
// config (thresholds, reward copy, banner assets); the customer and
// organizer mini-SPAs both read it and manage their own voucher ledger.
// Everything lives in localStorage (same-origin, shared across /app,
// /organizer and /admin) — no server, consistent with the rest of this demo.

const CONFIG_KEY = 'spyhike_loyalty_config';
const CUSTOMER_VOUCHERS_KEY = 'spyhike_loyalty_customer_vouchers';
const ORG_VOUCHERS_KEY = 'spyhike_loyalty_org_vouchers';

export const DEFAULT_LOYALTY_CONFIG = {
  customer: {
    enabled: true,
    thresholdPersons: 30,
    rewardTitle: 'Free Trek Booking',
    rewardDescription: 'Book 30 travelers cumulatively — solo or in groups, across any treks — and your next booking is completely free, on us.',
    banner: {
      enabled: true,
      image: '',
      title: 'Trek 30, Get 1 Free!',
      subtitle: 'Every 30 travelers you book unlocks one free adventure.',
    },
  },
  organizer: {
    enabled: true,
    thresholdBookings: 1000,
    rewardTitle: 'Zero-Commission Booking',
    rewardDescription: 'Cross 1000 bookings via Spy Hike and earn a zero-commission credit — apply it to any upcoming booking to keep 100% of that payout.',
    banner: {
      enabled: true,
      image: '',
      title: '1000 Bookings Milestone',
      subtitle: 'Every 1000 trips hosted unlocks a free, zero-commission booking.',
    },
  },
  updatedAt: null,
};

// Deep-merge onto defaults so older stored configs (missing newer fields)
// never crash a render.
const mergeConfig = (stored) => ({
  customer: { ...DEFAULT_LOYALTY_CONFIG.customer, ...(stored?.customer || {}), banner: { ...DEFAULT_LOYALTY_CONFIG.customer.banner, ...(stored?.customer?.banner || {}) } },
  organizer: { ...DEFAULT_LOYALTY_CONFIG.organizer, ...(stored?.organizer || {}), banner: { ...DEFAULT_LOYALTY_CONFIG.organizer.banner, ...(stored?.organizer?.banner || {}) } },
  updatedAt: stored?.updatedAt || null,
});

export const loadLoyaltyConfig = () => {
  try {
    const val = localStorage.getItem(CONFIG_KEY);
    if (val) return mergeConfig(JSON.parse(val));
  } catch (e) { console.error(e); }
  return DEFAULT_LOYALTY_CONFIG;
};

export const saveLoyaltyConfig = (config) => {
  const withStamp = { ...config, updatedAt: new Date().toISOString() };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(withStamp));
  return withStamp;
};

// ─── Generic voucher ledger helpers (shared shape for both sides) ──────────
// Voucher: { id, earnedAt, milestoneNumber, status: 'available'|'used', usedRef }

const loadVouchers = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [];
};

const saveVouchers = (key, vouchers) => {
  localStorage.setItem(key, JSON.stringify(vouchers));
};

// Compares lifetime progress against the threshold and mints any newly
// crossed milestone vouchers. Safe to call every render — it only ever
// appends when `lifetimeCount` has crossed a fresh multiple of `threshold`.
const syncVouchers = (key, lifetimeCount, threshold) => {
  if (!threshold || threshold <= 0) return loadVouchers(key);
  const vouchers = loadVouchers(key);
  const milestonesEarned = Math.floor(lifetimeCount / threshold);
  const milestonesIssued = vouchers.length;

  if (milestonesEarned > milestonesIssued) {
    for (let m = milestonesIssued + 1; m <= milestonesEarned; m++) {
      vouchers.push({
        id: `${key}-${m}-${Date.now()}`,
        earnedAt: new Date().toISOString(),
        milestoneNumber: m,
        status: 'available',
        usedRef: null,
      });
    }
    saveVouchers(key, vouchers);
  }
  return vouchers;
};

const markVoucherUsed = (key, voucherId, usedRef) => {
  const vouchers = loadVouchers(key);
  const idx = vouchers.findIndex(v => v.id === voucherId);
  if (idx >= 0) {
    vouchers[idx] = { ...vouchers[idx], status: 'used', usedRef, usedAt: new Date().toISOString() };
    saveVouchers(key, vouchers);
  }
  return vouchers;
};

// ─── Customer-side (persons booked) ────────────────────────────────────────

// Lifetime "persons booked" = sum of travelersCount across every booking that
// isn't cancelled (cancellations shouldn't count toward the reward).
export const computeLifetimePersons = (bookings = []) =>
  bookings
    .filter(b => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + (b.travelersCount || b.travelers?.length || 0), 0);

export const syncCustomerVouchers = (bookings, config = loadLoyaltyConfig()) =>
  syncVouchers(CUSTOMER_VOUCHERS_KEY, computeLifetimePersons(bookings), config.customer.thresholdPersons);

export const loadCustomerVouchers = () => loadVouchers(CUSTOMER_VOUCHERS_KEY);

export const getAvailableCustomerVoucher = () =>
  loadCustomerVouchers().find(v => v.status === 'available') || null;

export const markCustomerVoucherUsed = (voucherId, bookingId) =>
  markVoucherUsed(CUSTOMER_VOUCHERS_KEY, voucherId, bookingId);

// Progress within the current milestone cycle. Landing exactly on a multiple
// of the threshold (lifetime % threshold === 0, lifetime > 0) means a cycle
// just completed — report it as 100%/0-remaining rather than wrapping back
// to a fresh "0 of threshold", which would misleadingly read as no progress
// right at the moment a reward was earned.
const computeCycleProgress = (lifetime, threshold) => {
  if (threshold <= 0) return { withinCycle: 0, remaining: 0, percent: 0 };
  const atCompletedMilestone = lifetime > 0 && lifetime % threshold === 0;
  const withinCycle = atCompletedMilestone ? threshold : lifetime % threshold;
  return {
    withinCycle,
    remaining: threshold - withinCycle,
    percent: Math.round((withinCycle / threshold) * 100),
  };
};

export const getCustomerProgress = (bookings, config = loadLoyaltyConfig()) => {
  const threshold = config.customer.thresholdPersons;
  const lifetime = computeLifetimePersons(bookings);
  return { lifetime, threshold, ...computeCycleProgress(lifetime, threshold) };
};

// ─── Organizer-side (bookings via app) ─────────────────────────────────────

export const syncOrganizerVouchers = (lifetimeBookings, config = loadLoyaltyConfig()) =>
  syncVouchers(ORG_VOUCHERS_KEY, lifetimeBookings, config.organizer.thresholdBookings);

export const loadOrganizerVouchers = () => loadVouchers(ORG_VOUCHERS_KEY);

export const getAvailableOrganizerVoucher = () =>
  loadOrganizerVouchers().find(v => v.status === 'available') || null;

export const markOrganizerVoucherUsed = (voucherId, bookingId) =>
  markVoucherUsed(ORG_VOUCHERS_KEY, voucherId, bookingId);

export const getOrganizerProgress = (lifetimeBookings, config = loadLoyaltyConfig()) => {
  const threshold = config.organizer.thresholdBookings;
  return { lifetime: lifetimeBookings, threshold, ...computeCycleProgress(lifetimeBookings, threshold) };
};
