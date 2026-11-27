import { it, expect, vi } from 'vitest';
import { makeTripId } from '../../src/utils/slug.js';

it('gives offers for the same trek distinct IDs even in the same millisecond', () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1800000000000);
  try {
    const ids = Array.from({ length: 100 }, () => makeTripId('Himalayan Summit Trek'));
    expect(new Set(ids).size).toBe(100);
    expect(ids.every(id => id.startsWith('himalayan-summit-trek-'))).toBe(true);
  } finally { clock.mockRestore(); }
});
