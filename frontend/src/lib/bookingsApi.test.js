import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api, { clearApiCache } from './apiClient.js';
import bookingsApi from './bookingsApi.js';
import loyaltyApi from './loyaltyApi.js';
import tripsApi from './tripsApi.js';

let ledgerVersion;
let fetchMock;
beforeEach(() => {
  clearApiCache();
  ledgerVersion = 'available';
  fetchMock = vi.fn(async (url, options) => {
    const path = new URL(url).pathname;
    if (options.method !== 'GET') ledgerVersion = 'used';
    const data = path.endsWith('/loyalty/me') || path.endsWith('/organizer/loyalty')
      ? { vouchers: [{ id: 'voucher', status: ledgerVersion }] }
      : { booking: { id: 'booking' }, config: { theme: 'unchanged' } };
    return { ok: true, status: 200, text: async () => JSON.stringify(data) };
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { clearApiCache(); vi.unstubAllGlobals(); });

describe('booking and loyalty cache consistency', () => {
  it.each(['create', 'checkout', 'cancel'])('%s refreshes the customer voucher ledger and wallet', async method => {
    expect((await loyaltyApi.getCustomerLoyalty()).vouchers[0].status).toBe('available');
    await api.get('/organizer/financials');
    await api.get('/unrelated-config', { auth: false });
    await bookingsApi[method](method === 'cancel' ? 'booking' : {});
    expect((await loyaltyApi.getCustomerLoyalty()).vouchers[0].status).toBe('used');
    await api.get('/organizer/financials');
    await api.get('/unrelated-config', { auth: false });
    const callsTo = path => fetchMock.mock.calls.filter(([url]) => new URL(url).pathname.endsWith(path)).length;
    expect(callsTo('/loyalty/me')).toBe(2);
    expect(callsTo('/organizer/financials')).toBe(2);
    expect(callsTo('/unrelated-config')).toBe(1);
  });

  it('refreshes the organizer voucher ledger after a zero-commission redemption', async () => {
    expect((await loyaltyApi.getOrganizerLoyalty()).vouchers[0].status).toBe('available');
    await loyaltyApi.organizerRedeemReward('TG-1234-A');
    expect((await loyaltyApi.getOrganizerLoyalty()).vouchers[0].status).toBe('used');
  });
});


it('refreshes trek counts and grouped browse results after an admin pauses an offer', async () => {
  await api.get('/treks', { auth: false });
  await tripsApi.listTrekGroups();
  await api.get('/unrelated-config', { auth: false });
  await tripsApi.adminSetTripStatus('trip', 'Paused');
  await api.get('/treks', { auth: false });
  await tripsApi.listTrekGroups();
  await api.get('/unrelated-config', { auth: false });
  const callsTo = path => fetchMock.mock.calls.filter(([url]) => new URL(url).pathname.endsWith(path)).length;
  expect(callsTo('/treks')).toBe(2);
  expect(callsTo('/trek-groups')).toBe(2);
  expect(callsTo('/unrelated-config')).toBe(1);
});
