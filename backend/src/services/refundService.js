import { getConfig } from '../models/AdminConfig.js';

// Whole days between today and the departure date (floored, never negative).
export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dep = new Date(`${dateStr}T00:00:00`);
  return Math.max(0, Math.floor((dep - today) / (1000 * 60 * 60 * 24)));
}

// Computes the refund for cancelling `finalAmount` on a departure `dateStr`,
// applying the highest refund tier whose threshold the lead time still meets.
export async function computeRefund(finalAmount, dateStr) {
  const config = await getConfig();
  const days = daysUntil(dateStr);
  const tiers = [...(config.refundTiers || [])].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
  const tier = tiers.find((t) => days >= t.minDaysBefore) || { percent: 0 };
  const refundPercent = tier.percent;
  const refundAmount = Math.round((finalAmount * refundPercent) / 100 * 100) / 100;
  return { daysBefore: days, refundPercent, refundAmount };
}
