import { getConfig } from '../models/AdminConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /admin/config — current platform config (commission %, tax %).
export const getAdminConfig = asyncHandler(async (req, res) => {
  const cfg = await getConfig();
  res.json({ config: cfg.toPublicJSON() });
});

// PATCH /admin/config — update the commission (and optionally tax) rate.
export const updateAdminConfig = asyncHandler(async (req, res) => {
  const cfg = await getConfig();
  const clampPct = (n) => Math.max(0, Math.min(100, Number(n)));
  if (req.body.commissionRate !== undefined) cfg.commissionRate = clampPct(req.body.commissionRate);
  if (req.body.taxRate !== undefined) cfg.taxRate = clampPct(req.body.taxRate);
  await cfg.save();
  res.json({ config: cfg.toPublicJSON() });
});
