import { describe, it, expect } from 'vitest';
import { isPromotedNow } from '../../src/utils/promotion.js';

describe('isPromotedNow', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('is false when there is no promotedUntil at all', () => {
    expect(isPromotedNow(null, now)).toBe(false);
    expect(isPromotedNow(undefined, now)).toBe(false);
  });

  it('is true while promotedUntil is still in the future', () => {
    expect(isPromotedNow(new Date('2026-06-20T00:00:00.000Z'), now)).toBe(true);
    // Also accepts an ISO string, the shape it arrives in over JSON.
    expect(isPromotedNow('2026-06-20T00:00:00.000Z', now)).toBe(true);
  });

  it('is false once promotedUntil has passed — no separate expiry step needed', () => {
    expect(isPromotedNow(new Date('2026-06-10T00:00:00.000Z'), now)).toBe(false);
  });

  it('treats the exact boundary instant as no longer promoted', () => {
    expect(isPromotedNow(now, now)).toBe(false);
  });
});
