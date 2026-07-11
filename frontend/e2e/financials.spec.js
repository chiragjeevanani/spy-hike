import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 9 — refunds, financials & payouts. Exercises the cancel→refund and the
// earn→request-payout→admin-settle flows end-to-end through the e2e server.

const API = 'http://localhost:4000/api/v1';
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };
const DEMO_ADMIN = { email: 'admin@trekigo.com', password: 'admin123' };

function dateInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

async function ctxWithTrip(departDays) {
  const ctx = await pwRequest.newContext();
  const orgToken = (await (await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const trip = (await (await ctx.post(`${API}/organizer/trips`, {
    headers: { Authorization: `Bearer ${orgToken}` },
    data: {
      name: `E2E Fin Trek ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      location: 'Kaza', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 1000 }], pickup: { location: 'Manali', price: 0 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' }, departureDates: departDays.map(dateInDays),
      maxGroupSize: 20, availableSeats: 20, category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Fin e2e', status: 'Published',
    },
  })).json()).trip;
  const email = `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const custToken = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'Fin Hiker', email, password: 'pass1234' } })).json()).token;
  return { ctx, orgToken, custToken, trip };
}

test('cancelling well before departure refunds fully and frees the seat', async () => {
  const { ctx, custToken, trip } = await ctxWithTrip([30]);
  const auth = { headers: { Authorization: `Bearer ${custToken}` } };
  const date = dateInDays(30);
  const booking = (await (await ctx.post(`${API}/bookings`, { ...auth, data: { tripId: trip.id, selectedDate: date, selections: [{ label: 'Solo', count: 1 }], travelers: [{}] } })).json()).booking;

  const cancel = await (await ctx.post(`${API}/bookings/${booking.bookingId}/cancel`, auth)).json();
  expect(cancel.booking.status).toBe('Cancelled');
  expect(cancel.booking.refundPercent).toBe(100);
  expect(cancel.booking.refundAmount).toBe(booking.finalAmount);

  // Seat returned to inventory.
  const departures = await (await ctx.get(`${API}/trips/${trip.id}/departures`)).json();
  expect(departures.departures.find((d) => d.date === date).availableSeats).toBe(20);
  await ctx.dispose();
});

test('organizer earns, requests a payout, and admin settles it to Paid', async () => {
  // A fresh, admin-approved organizer so the balance is isolated from the
  // shared demo org (whose bookings accumulate across specs).
  const ctx = await pwRequest.newContext();
  const adminToken = (await (await ctx.post(`${API}/auth/admin/login`, { data: DEMO_ADMIN })).json()).token;
  const orgEmail = `finorg-${Date.now()}@example.com`;
  const reg = await (await ctx.post(`${API}/auth/organizer/register`, { data: { name: 'Fin Org', email: orgEmail, password: 'pass1234', agencyName: 'Fin Guides' } })).json();
  await ctx.patch(`${API}/admin/organizers/${reg.account.id}/status`, { headers: { Authorization: `Bearer ${adminToken}` }, data: { action: 'approve' } });
  const orgToken = (await (await ctx.post(`${API}/auth/organizer/login`, { data: { email: orgEmail, password: 'pass1234' } })).json()).token;
  const orgAuth = { headers: { Authorization: `Bearer ${orgToken}` } };

  const trip = (await (await ctx.post(`${API}/organizer/trips`, {
    ...orgAuth,
    data: {
      name: `E2E Payout Trek ${Date.now()}`, location: 'Kaza', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 1000 }], pickup: { location: 'Manali', price: 0 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' }, departureDates: [dateInDays(30)],
      maxGroupSize: 20, availableSeats: 20, category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Payout e2e', status: 'Published',
    },
  })).json()).trip;
  const custToken = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'C', email: `payc-${Date.now()}@example.com`, password: 'pass1234' } })).json()).token;
  await ctx.post(`${API}/bookings`, { headers: { Authorization: `Bearer ${custToken}` }, data: { tripId: trip.id, selectedDate: dateInDays(30), selections: [{ label: 'Solo', count: 1 }], travelers: [{}] } });

  // final 1050, commission 105, payout 945 available (isolated org).
  const fin = await (await ctx.get(`${API}/organizer/financials`, orgAuth)).json();
  expect(fin.financials.available).toBe(945);

  // A payout method is required before requesting — configure a bank account.
  await ctx.patch(`${API}/organizer/bank-details`, { ...orgAuth, data: { accountHolderName: 'Fin Guides', bankName: 'HDFC', ifsc: 'HDFC0001', accountNumber: '1234567890' } });

  const payout = (await (await ctx.post(`${API}/organizer/payouts`, { ...orgAuth, data: { amount: 500 } })).json()).payout;
  expect(payout.status).toBe('Processing');
  expect(payout.reference).toMatch(/^PO-\d{4}-\d{6}$/);
  expect(payout.bank.accountNumberMasked).toBe('••••7890');

  const settled = (await (await ctx.patch(`${API}/admin/payouts/${payout.id}`, { headers: { Authorization: `Bearer ${adminToken}` }, data: { action: 'approve' } })).json()).payout;
  expect(settled.status).toBe('Paid');
  expect(settled.utr).toBeTruthy();
  expect(settled.settledBy).toBe(DEMO_ADMIN.email);

  // Admin payout list now carries a report summary + supports status filtering.
  const adminAuth = { headers: { Authorization: `Bearer ${adminToken}` } };
  const report = await (await ctx.get(`${API}/admin/payouts?status=Paid`, adminAuth)).json();
  expect(report.summary.paidCount).toBeGreaterThanOrEqual(1);
  expect(report.payouts.every((p) => p.status === 'Paid')).toBe(true);
  await ctx.dispose();
});
