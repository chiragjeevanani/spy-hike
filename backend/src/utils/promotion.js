// Shared "is this organizer currently boosted?" check. A promotion is just a
// `promotedUntil` timestamp — there's no separate on/off flag and nothing to
// expire in the background: once `promotedUntil` slips into the past this
// simply starts returning false again, so every caller (sort, badge, gate)
// automatically stops treating the organizer as promoted the moment it lapses.
export const isPromotedNow = (promotedUntil, now = new Date()) => {
  if (!promotedUntil) return false;
  return new Date(promotedUntil).getTime() > now.getTime();
};
