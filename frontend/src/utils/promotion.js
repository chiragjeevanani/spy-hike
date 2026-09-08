/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mirrors backend/src/utils/promotion.js — a promotion is just a
// `promotedUntil` timestamp on the organizer, never a stored boolean, so it
// silently stops being "promoted" the moment that date passes.
export const isPromotedNow = (promotedUntil, now = new Date()) => {
  if (!promotedUntil) return false;
  return new Date(promotedUntil).getTime() > now.getTime();
};
