import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 7 — server-side loyalty engine. Verifies (end-to-end through the API)
// that a customer earns a voucher by crossing the persons threshold, that a
// loyalty booking is server-verified (rejected without a voucher, comped with
// one), and that an organizer can redeem a zero-commission voucher.

const API = 'http://localhost:4000/api/v1';
const DEMO_ADMIN = { email: 'admin@trekigo.com', password: 'admin123' };
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };

async function adminSetThresholds(ctx, { customer, organizer }) {
  const token = (await (await ctx.post(`${API}/auth/admin/login`, { data: DEMO_ADMIN })).json()).token;
  const data = {};
  if (customer != null) data.customer = { enabled: true, thresholdPersons: customer };
  if (organizer != null) data.organizer = { enabled: true, thresholdBookings: organizer };
  await ctx.patch(`${API}/admin/loyalty/config`, { headers: { Authorization: `Bearer ${token}` }, data });
}

async function makeTrip(ctx, orgToken, name) {
  return (await (await ctx.post(`${API}/organizer/trips`, {
    headers: { Authorization: `Bearer ${orgToken}` },
    data: {
      name, location: 'Kaza', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 1000 }],
      pickup: { location: 'Manali', price: 0 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' },
      departureDates: ['2026-11-05', '2026-11-19'], difficulty: 'Easy', durationDays: 3,
      maxGroupSize: 20, availableSeats: 20, category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Loyalty engine e2e', status: 'Published',
    },
  })).json()).trip;
}

test('customer earns a voucher and redeems a server-verified free booking', async () => {
  const ctx = await pwRequest.newContext();
  await adminSetThresholds(ctx, { customer: 2 });
  const orgToken = (await (await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const trip = await makeTrip(ctx, orgToken, `E2E Loyalty Trek ${Date.now()}`);
  const email = `loy-${Date.now()}@example.com`;
  const token = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'Loy', email, password: 'pass1234' } })).json()).token;
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  // Redeeming with no voucher is rejected.
  const noVoucher = await ctx.post(`${API}/bookings`, { ...auth, data: { tripId: trip.id, selectedDate: '2026-11-05', selections: [{ label: 'Solo', count: 1 }], travelers: [{}], useLoyaltyReward: true } });
  expect(noVoucher.status()).toBe(400);

  // A 2-traveler booking crosses threshold=2 → mints a voucher.
  await ctx.post(`${API}/bookings`, { ...auth, data: { tripId: trip.id, selectedDate: '2026-11-05', selections: [{ label: 'Solo', count: 2 }], travelers: [{}, {}] } });
  const me = await (await ctx.get(`${API}/loyalty/me`, auth)).json();
  expect(me.vouchers.filter((v) => v.status === 'available')).toHaveLength(1);

  // Now the loyalty booking is accepted and fully comped.
  const free = await (await ctx.post(`${API}/bookings`, { ...auth, data: { tripId: trip.id, selectedDate: '2026-11-19', selections: [{ label: 'Solo', count: 1 }], travelers: [{}], useLoyaltyReward: true } })).json();
  expect(free.booking.finalAmount).toBe(0);
  expect(free.booking.loyaltyRewardApplied).toBe(true);

  const after = await (await ctx.get(`${API}/loyalty/me`, auth)).json();
  expect(after.vouchers.some((v) => v.status === 'used' && v.usedRef === free.booking.bookingId)).toBe(true);
  await ctx.dispose();
});

test('organizer earns and redeems a zero-commission voucher on a booking', async () => {
  const ctx = await pwRequest.newContext();
  await adminSetThresholds(ctx, { organizer: 1 });
  const orgToken = (await (await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const trip = await makeTrip(ctx, orgToken, `E2E OrgLoyalty Trek ${Date.now()}`);
  const email = `oloy-${Date.now()}@example.com`;
  const token = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'C', email, password: 'pass1234' } })).json()).token;

  const created = await (await ctx.post(`${API}/bookings`, { headers: { Authorization: `Bearer ${token}` }, data: { tripId: trip.id, selectedDate: '2026-11-05', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] } })).json();
  expect(created.booking.commissionAmount).toBeGreaterThan(0);

  const redeem = await (await ctx.post(`${API}/organizer/bookings/${created.booking.bookingId}/redeem-reward`, { headers: { Authorization: `Bearer ${orgToken}` } })).json();
  expect(redeem.booking.commissionAmount).toBe(0);
  expect(redeem.booking.organizerPayout).toBe(redeem.booking.finalAmount);
  await ctx.dispose();
});
