/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Cross-module loyalty program config + voucher ledgers. Admin writes the
// config (thresholds, reward copy, banner assets); the customer and
// organizer mini-SPAs both read it and manage their own voucher ledger.
// Everything lives in localStorage (same-origin, shared across /app,
// /organizer and /admin) — no server, consistent with the rest of this demo.

import loyaltyApi from '../lib/loyaltyApi';
import { getToken } from '../lib/apiClient';
import { safeSetItem } from './safeStorage';

const CONFIG_KEY = 'trekigo_loyalty_config';
const CUSTOMER_VOUCHERS_KEY = 'trekigo_loyalty_customer_vouchers';
const ORG_VOUCHERS_KEY = 'trekigo_loyalty_org_vouchers';
const CUSTOMER_PROGRESS_KEY = 'trekigo_loyalty_customer_progress';
const ORG_PROGRESS_KEY = 'trekigo_loyalty_org_progress';

export const DEFAULT_LOYALTY_CONFIG = {
  customer: {
    enabled: true,
    thresholdPersons: 30,
    maxDiscountAmount: 5000,
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
    rewardDescription: 'Cross 1000 bookings via Find Your Trek and earn a zero-commission credit — apply it to any upcoming booking to keep 100% of that payout.',
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
  safeSetItem(CONFIG_KEY, withStamp);
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
  safeSetItem(key, vouchers);
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

// For a real (token-backed) session the server is authoritative — it mints
// vouchers on booking and hydrateCustomerLoyalty() pulls them into the cache,
// so we must NOT also mint client-side. Only the offline/seeded path mints.
export const syncCustomerVouchers = (bookings, config = loadLoyaltyConfig()) => {
  if (getToken()) return loadVouchers(CUSTOMER_VOUCHERS_KEY);
  return syncVouchers(CUSTOMER_VOUCHERS_KEY, computeLifetimePersons(bookings), config.customer.thresholdPersons);
};

export const loadCustomerVouchers = () => loadVouchers(CUSTOMER_VOUCHERS_KEY);

export const getAvailableCustomerVoucher = () =>
  loadCustomerVouchers().find(v => v.status === 'available') || null;

export const markCustomerVoucherUsed = (voucherId, bookingId) =>
  markVoucherUsed(CUSTOMER_VOUCHERS_KEY, voucherId, bookingId);

// Progress within the current milestone cycle. Landing exactly on a multiple
// of the threshold (count % threshold === 0, count > 0) means a cycle just
// completed — report it as 100%/0-remaining rather than wrapping back to a
// fresh "0 of threshold", which would misleadingly read as no progress right
// at the moment a reward was earned.
const computeCycleProgress = (count, threshold) => {
  if (threshold <= 0) return { withinCycle: 0, remaining: 0, percent: 0 };
  const atCompletedMilestone = count > 0 && count % threshold === 0;
  const withinCycle = atCompletedMilestone ? threshold : count % threshold;
  return {
    withinCycle,
    remaining: threshold - withinCycle,
    percent: Math.round((withinCycle / threshold) * 100),
  };
};

// Offline/demo fallback (no server progress cached): claiming a voucher
// resets progress to 0, which — since each claim consumes exactly one
// threshold's worth of lifetime count, in earn order — is equivalent to
// counting only the lifetime total past what's already been redeemed.
const fallbackCycleCount = (lifetime, vouchers, threshold) => {
  const usedCount = vouchers.filter(v => v.status === 'used').length;
  return Math.max(0, lifetime - usedCount * threshold);
};

const loadCachedProgress = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return null;
};

export const getCustomerProgress = (bookings, config = loadLoyaltyConfig()) => {
  const threshold = config.customer.thresholdPersons;
  const lifetime = computeLifetimePersons(bookings);
  // Signed-in: trust the server's cycle progress (it resets on claim using
  // real redemption timestamps) — same "server is authoritative" rule
  // syncCustomerVouchers already follows.
  if (getToken()) {
    const cached = loadCachedProgress(CUSTOMER_PROGRESS_KEY);
    if (cached) return { ...cached, lifetime };
  }
  const cycleCount = fallbackCycleCount(lifetime, loadCustomerVouchers(), threshold);
  return { lifetime, threshold, ...computeCycleProgress(cycleCount, threshold) };
};

// ─── Organizer-side (bookings via app) ─────────────────────────────────────

export const syncOrganizerVouchers = (lifetimeBookings, config = loadLoyaltyConfig()) => {
  if (getToken()) return loadVouchers(ORG_VOUCHERS_KEY);
  return syncVouchers(ORG_VOUCHERS_KEY, lifetimeBookings, config.organizer.thresholdBookings);
};

export const loadOrganizerVouchers = () => loadVouchers(ORG_VOUCHERS_KEY);

export const getAvailableOrganizerVoucher = () =>
  loadOrganizerVouchers().find(v => v.status === 'available') || null;

export const markOrganizerVoucherUsed = (voucherId, bookingId) =>
  markVoucherUsed(ORG_VOUCHERS_KEY, voucherId, bookingId);

export const getOrganizerProgress = (lifetimeBookings, config = loadLoyaltyConfig()) => {
  const threshold = config.organizer.thresholdBookings;
  if (getToken()) {
    const cached = loadCachedProgress(ORG_PROGRESS_KEY);
    if (cached) return { ...cached, lifetime: lifetimeBookings };
  }
  const cycleCount = fallbackCycleCount(lifetimeBookings, loadOrganizerVouchers(), threshold);
  return { lifetime: lifetimeBookings, threshold, ...computeCycleProgress(cycleCount, threshold) };
};

// ─── API hydration (server → localStorage cache) ────────────────────────────
// These pull the server's authoritative config + voucher ledger into the same
// localStorage keys the synchronous readers above use. Called on app mount and
// after a booking. No-op (keeps the seeded/offline cache) when not signed in.

export async function hydrateLoyaltyConfig() {
  try {
    const config = await loyaltyApi.getConfig();
    if (config) saveVouchersConfig(config);
    return config;
  } catch { return null; }
}

// Writes a server config into the cache without stamping updatedAt anew.
function saveVouchersConfig(config) {
  safeSetItem(CONFIG_KEY, mergeConfig(config));
}

export async function hydrateCustomerLoyalty() {
  if (!getToken()) return null;
  try {
    const [config, me] = await Promise.all([loyaltyApi.getConfig(), loyaltyApi.getCustomerLoyalty()]);
    if (config) saveVouchersConfig(config);
    if (Array.isArray(me?.vouchers)) saveVouchers(CUSTOMER_VOUCHERS_KEY, me.vouchers);
    if (me?.progress) safeSetItem(CUSTOMER_PROGRESS_KEY, me.progress);
    return me;
  } catch { return null; }
}

export async function hydrateOrganizerLoyalty() {
  if (!getToken()) return null;
  try {
    const [config, data] = await Promise.all([loyaltyApi.getConfig(), loyaltyApi.getOrganizerLoyalty()]);
    if (config) saveVouchersConfig(config);
    if (Array.isArray(data?.vouchers)) saveVouchers(ORG_VOUCHERS_KEY, data.vouchers);
    if (data?.progress) safeSetItem(ORG_PROGRESS_KEY, data.progress);
    return data;
  } catch { return null; }
}

// Admin: persist config to the server and refresh the local cache.
export async function saveLoyaltyConfigApi(config) {
  const saved = await loyaltyApi.adminUpdateConfig(config);
  saveVouchersConfig(saved);
  return saved;
}
