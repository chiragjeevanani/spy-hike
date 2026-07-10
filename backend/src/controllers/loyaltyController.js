import { getLoyaltyConfig } from '../models/LoyaltyConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listVouchers, computeLifetimePersons, computeLifetimeOrganizerBookings,
  syncCustomerVouchers, syncOrganizerVouchers, cycleProgress,
} from '../services/loyaltyService.js';

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /loyalty/config — thresholds, reward copy, banners (both apps read this).
export const getPublicLoyaltyConfig = asyncHandler(async (req, res) => {
  const cfg = await getLoyaltyConfig();
  res.json({ config: cfg.toPublicJSON() });
});

// ─── Customer ────────────────────────────────────────────────────────────────

// GET /loyalty/me — the customer's progress + voucher ledger.
export const getCustomerLoyalty = asyncHandler(async (req, res) => {
  const cfg = await getLoyaltyConfig();
  await syncCustomerVouchers(req.user.email, cfg); // mint any owed before reporting
  const lifetime = await computeLifetimePersons(req.user.email);
  const vouchers = await listVouchers('customer', req.user.email);
  res.json({
    progress: cycleProgress(lifetime, cfg.customer.thresholdPersons),
    vouchers: vouchers.map((v) => v.toPublicJSON()),
  });
});

// ─── Organizer ───────────────────────────────────────────────────────────────

// GET /organizer/loyalty — the organizer's progress + voucher ledger.
export const getOrganizerLoyalty = asyncHandler(async (req, res) => {
  const cfg = await getLoyaltyConfig();
  await syncOrganizerVouchers(req.organizer.email, cfg);
  const lifetime = await computeLifetimeOrganizerBookings(req.organizer.email);
  const vouchers = await listVouchers('organizer', req.organizer.email);
  res.json({
    progress: cycleProgress(lifetime, cfg.organizer.thresholdBookings),
    vouchers: vouchers.map((v) => v.toPublicJSON()),
  });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const getAdminLoyaltyConfig = asyncHandler(async (req, res) => {
  const cfg = await getLoyaltyConfig();
  res.json({ config: cfg.toPublicJSON() });
});

// PATCH /admin/loyalty/config — replace the customer/organizer config blocks.
// The admin UI sends complete blocks, so a shallow merge per side is enough.
export const updateAdminLoyaltyConfig = asyncHandler(async (req, res) => {
  const cfg = await getLoyaltyConfig();
  const current = cfg.toObject();
  if (req.body.customer) cfg.set('customer', { ...current.customer, ...req.body.customer });
  if (req.body.organizer) cfg.set('organizer', { ...current.organizer, ...req.body.organizer });
  await cfg.save();
  res.json({ config: cfg.toPublicJSON() });
});
