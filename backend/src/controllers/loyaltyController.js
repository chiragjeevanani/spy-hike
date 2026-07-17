import { getLoyaltyConfig } from '../models/LoyaltyConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  listVouchers, computeLifetimePersons, computeLifetimeOrganizerBookings,
  computeCyclePersons, computeCycleOrganizerBookings,
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
  const [lifetime, cycleCount] = await Promise.all([
    computeLifetimePersons(req.user.email),
    computeCyclePersons(req.user.email),
  ]);
  const vouchers = await listVouchers('customer', req.user.email);
  res.json({
    progress: { ...cycleProgress(cycleCount, cfg.customer.thresholdPersons), lifetime },
    vouchers: vouchers.map((v) => v.toPublicJSON()),
  });
});

// ─── Organizer ───────────────────────────────────────────────────────────────

// GET /organizer/loyalty — the organizer's progress + voucher ledger.
export const getOrganizerLoyalty = asyncHandler(async (req, res) => {
  const cfg = await getLoyaltyConfig();
  await syncOrganizerVouchers(req.organizer.email, cfg);
  const [lifetime, cycleCount] = await Promise.all([
    computeLifetimeOrganizerBookings(req.organizer.email),
    computeCycleOrganizerBookings(req.organizer.email),
  ]);
  const vouchers = await listVouchers('organizer', req.organizer.email);
  res.json({
    progress: { ...cycleProgress(cycleCount, cfg.organizer.thresholdBookings), lifetime },
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

  if (req.body.customer) {
    const { thresholdPersons, maxDiscountAmount } = req.body.customer;
    if (thresholdPersons !== undefined && (!Number.isFinite(Number(thresholdPersons)) || Number(thresholdPersons) < 1)) {
      throw ApiError.badRequest('Customer reward threshold must be at least 1');
    }
    if (maxDiscountAmount !== undefined && (!Number.isFinite(Number(maxDiscountAmount)) || Number(maxDiscountAmount) < 0)) {
      throw ApiError.badRequest('Max discount amount cannot be negative');
    }
    cfg.set('customer', { ...current.customer, ...req.body.customer });
  }
  if (req.body.organizer) {
    const { thresholdBookings } = req.body.organizer;
    if (thresholdBookings !== undefined && (!Number.isFinite(Number(thresholdBookings)) || Number(thresholdBookings) < 1)) {
      throw ApiError.badRequest('Organizer reward threshold must be at least 1');
    }
    cfg.set('organizer', { ...current.organizer, ...req.body.organizer });
  }

  await cfg.save();
  res.json({ config: cfg.toPublicJSON() });
});
