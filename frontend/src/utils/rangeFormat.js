// Trek duration and distance are stored as a range: `durationDays`/`distanceKm`
// hold the low end and the optional `*Max` field holds the high end. A trek
// with no max (or a max equal to the min) is a plain single value, which is
// how every trek created before ranges existed reads.
//
// These helpers return just the number part ("5" or "5-6") so call sites keep
// owning their own unit and spacing ("5-6D", "5-6 Days", "5-6 km").

/** "5" when there is no distinct high end, "5-6" when there is, "" when unset. */
export function formatRange(min, max) {
  const lo = Number(min);
  if (!Number.isFinite(lo)) return '';
  const hi = Number(max);
  if (!Number.isFinite(hi) || hi <= lo) return String(lo);
  return `${lo}-${hi}`;
}

/** Duration range of a trek / trip / trek request: "5" or "5-6". */
export function durationRange(o) {
  return formatRange(o?.durationDays, o?.durationDaysMax);
}

/** Distance range of a trek / trip / trek request: "20" or "20-23". */
export function distanceRange(o) {
  return formatRange(o?.distanceKm, o?.distanceKmMax);
}

/** Nights — one less than each end of the duration range: "4" or "4-5". */
export function nightsRange(o) {
  const lo = Number(o?.durationDays);
  if (!Number.isFinite(lo)) return '';
  const hi = Number(o?.durationDaysMax);
  return formatRange(Math.max(0, lo - 1), Number.isFinite(hi) ? Math.max(0, hi - 1) : undefined);
}
