import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 8 — notifications, wishlist, reviews. Drives the customer app against
// the API: a booking's server-emitted notification surfaces in the bell
// drawer, the wishlist persists to the API, and a review updates the trip's
// rating. (Chat + broadcast fan-out are covered by the backend API tests.)

const API = 'http://localhost:4000/api/v1';
const WISHLIST_TRIP = 'himalayan-ridge-pass-trek'; // seeded, resolvable in the UI
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };

async function freshCustomerCtx() {
  const ctx = await pwRequest.newContext();
  const email = `soc-${Date.now()}@example.com`;
  const token = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'Social Hiker', email, password: 'pass1234' } })).json()).token;
  return { ctx, email, token, auth: { headers: { Authorization: `Bearer ${token}` } } };
}

// A dedicated trip with ample seats, so social bookings never contend with
// other specs for the shared seed trip's inventory.
async function makeFreshTrip(ctx) {
  const orgToken = (await (await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const trip = (await (await ctx.post(`${API}/organizer/trips`, {
    headers: { Authorization: `Bearer ${orgToken}` },
    data: {
      name: `E2E Social Trek ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      location: 'Kaza', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 500 }], pickup: { location: 'Manali', price: 0 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' }, departureDates: ['2026-11-05'],
      maxGroupSize: 20, availableSeats: 20, category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Social e2e', status: 'Published',
    },
  })).json()).trip;
  return trip;
}

async function seedSession(page, email, token) {
  await page.addInitScript((d) => {
    localStorage.setItem('trekigo_user', JSON.stringify({ isAuthenticated: true, isOnboarded: true, name: 'Social Hiker', email: d.email }));
    localStorage.setItem('trekigo_user', JSON.stringify({ isAuthenticated: true, isOnboarded: true, profileSetupComplete: true, name: 'Social Hiker', email: d.email }));
    localStorage.setItem('trekigo_auth_token', d.token);
  }, { email, token });
}

test.use({ viewport: { width: 460, height: 950 } });

test('a booking notification surfaces in the customer bell drawer', async ({ page }) => {
  const { ctx, email, token, auth } = await freshCustomerCtx();
  const trip = await makeFreshTrip(ctx);
  await ctx.post(`${API}/bookings`, { ...auth, data: { tripId: trip.id, selectedDate: '2026-11-05', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Social Hiker' }] } });
  await ctx.post(`${API}/bookings`, {
    ...auth,
    data: {
      tripId: trip.id,
      selectedDate: '2026-11-05',
      selections: [{ label: 'Solo', count: 1 }],
      travelers: [{ name: 'Social Hiker', age: 24, gender: 'Male', emergencyContact: '9876543210' }],
    },
  });
  await ctx.dispose();

  await seedSession(page, email, token);
  await page.goto('/app');
  await expect(page.locator('#btn-bell-notifications')).toBeVisible({ timeout: 10000 });
  // Give the social hydration (keyed on the booking roster) a beat to land.
  await page.click('#btn-bell-notifications');
  await expect(page.getByText(/Permit Slot Secured/i)).toBeVisible({ timeout: 10000 });
});

test('toggling a wishlist heart persists to the API', async ({ page }) => {
  const { ctx, email, token, auth } = await freshCustomerCtx();

  await seedSession(page, email, token);
  await page.goto(`/app/trip/${WISHLIST_TRIP}`);
  await page.click('#btn-toggle-wishlist-details', { force: true });

  await expect
    .poll(async () => (await (await ctx.get(`${API}/wishlist`, auth)).json()).wishlist, { timeout: 10000 })
    .toContain(WISHLIST_TRIP);
  await ctx.dispose();
});

test('submitting a review updates the trip rating on the server', async ({ page }) => {
  const { ctx, email, token, auth } = await freshCustomerCtx();
  const trip = await makeFreshTrip(ctx);
  const booking = (await (await ctx.post(`${API}/bookings`, {
    ...auth,
    data: {
      tripId: trip.id,
      selectedDate: '2026-11-05',
      selections: [{ label: 'Solo', count: 1 }],
      travelers: [{ name: 'Social Hiker', age: 24, gender: 'Male', emergencyContact: '9876543210' }],
    },
  })).json()).booking;

  // Review via the API (the UI path prompts via window.prompt, which is
  // awkward to drive; the frontend calls this same endpoint).
  const res = await ctx.post(`${API}/bookings/${booking.bookingId}/review`, { ...auth, data: { rating: 5, comment: 'Unreal ridgeline.' } });
  expect(res.status()).toBe(201);

  const after = await (await ctx.get(`${API}/trips/${trip.id}`)).json();
  expect(after.trip.reviews.some((r) => r.comment === 'Unreal ridgeline.')).toBe(true);
  expect(after.trip.rating).toBe(5);
  await ctx.dispose();
});
