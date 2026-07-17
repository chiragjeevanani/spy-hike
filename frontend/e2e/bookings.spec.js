import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 5 — Bookings + commission engine. Drives the full 3-step booking flow
// against the API (server-authoritative pricing/commission, atomic seat
// reservation, backend-owned bookingId) and confirms the booking surfaces to
// the customer, its organizer, and admin with matching amounts.

const API = 'http://localhost:4000/api/v1';
const DEMO_ADMIN = { email: 'admin@findyourtrek.com', password: 'admin123' };
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };

async function dismissOnboarding(page) {
  const skip = page.getByText('Skip Onboarding');
  const email = page.locator('input[type="email"]');
  await expect(skip.or(email).first()).toBeVisible({ timeout: 10000 });
  if (await skip.count()) await skip.first().click();
  await expect(email).toBeVisible({ timeout: 10000 });
}

// A unique customer so the booking is isolated from other specs on the shared
// in-memory backend. Returns { token, email }.
async function freshCustomer() {
  const ctx = await pwRequest.newContext();
  const email = `booker-${Date.now()}@example.com`;
  const token = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'Booker', email, password: 'pass1234' } })).json()).token;
  await ctx.dispose();
  return { token, email };
}

async function createBookableTrip(name) {
  const ctx = await pwRequest.newContext();
  const token = (await (await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const trip = (await (await ctx.post(`${API}/organizer/trips`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name, location: 'Kaza, Spiti', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 1000 }],
      pickup: { location: 'Manali', price: 100 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' },
      departureDates: ['2026-11-05', '2026-11-19'],
      difficulty: 'Moderate', durationDays: 5, maxGroupSize: 15, availableSeats: 15,
      category: 'Trekking', coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Booking e2e trek', status: 'Published',
    },
  })).json()).trip;
  await ctx.dispose();
  return trip;
}

test('full booking flow: pay, then the booking shows for customer, organizer and admin with matching amounts', async ({ page, browser }) => {
  const trip = await createBookableTrip(`E2E Booking Trek ${Date.now()}`);
  const { token, email } = await freshCustomer();

  // Seed an authenticated session directly: the app gates on
  // trekigo_user.isAuthenticated (session object) while the raw JWT authorizes
  // the API calls.
  page.setViewportSize({ width: 460, height: 950 });
  await page.addInitScript((data) => {
    localStorage.setItem('trekigo_user', JSON.stringify({
      isAuthenticated: true, isOnboarded: true, name: 'Booker', email: data.email,
    }));
    localStorage.setItem('trekigo_auth_token', data.token);
  }, { token, email });

  // Land on Home first so the catalog hydrates from the API into localStorage;
  // the /book/:id route-parser then resolves the freshly-created trip on reload.
  await page.goto('/app');
  await expect
    .poll(async () => page.evaluate((id) => {
      const raw = localStorage.getItem('trekigo_trips');
      return raw ? JSON.parse(raw).some((t) => t.id === id) : false;
    }, trip.id), { timeout: 10000 })
    .toBe(true);
  await page.goto(`/app/book/${trip.id}`);

  // Step 1 (date + default 1 Solo) → Step 2 → Step 3.
  await expect(page.locator('#btn-booking-step-1-continue')).toBeEnabled({ timeout: 10000 });
  await page.click('#btn-booking-step-1-continue');
  await page.click('#btn-booking-step-2-continue');
  await expect(page.getByText(/Checkout & Settlement/i)).toBeVisible({ timeout: 10000 });

  // Pay. Base 1 Solo = 1000 + 100 pickup = 1100; +5% tax = 1155.
  await page.click('#btn-pay-and-confirm');
  await expect(page.getByText(/Booking Succeeded!/i)).toBeVisible({ timeout: 10000 });
  const receiptText = await page.locator('body').innerText();
  const bookingId = receiptText.match(/TG-\d{4}-[A-Z]/)?.[0];
  expect(bookingId).toBeTruthy();

  // Customer sees it in their bookings list.
  await page.click('#btn-booking-done-finish');
  await expect(page.getByText(bookingId).first()).toBeVisible({ timeout: 10000 });

  // Organizer sees it with the matching amount.
  const orgCtx = await browser.newContext();
  const orgToken = (await (await orgCtx.request.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const orgBookings = await (await orgCtx.request.get(`${API}/organizer/bookings`, { headers: { Authorization: `Bearer ${orgToken}` } })).json();
  const orgBooking = orgBookings.bookings.find((b) => b.bookingId === bookingId);
  expect(orgBooking).toBeTruthy();
  expect(orgBooking.finalAmount).toBe(1155);
  expect(orgBooking.commissionAmount).toBe(115.5); // 10% snapshot
  await orgCtx.close();

  // Admin sees it too.
  const adminCtx = await browser.newContext();
  const adminToken = (await (await adminCtx.request.post(`${API}/auth/admin/login`, { data: DEMO_ADMIN })).json()).token;
  const adminBookings = await (await adminCtx.request.get(`${API}/admin/bookings`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
  const adminBooking = adminBookings.bookings.find((b) => b.bookingId === bookingId);
  expect(adminBooking).toBeTruthy();
  expect(adminBooking.finalAmount).toBe(1155);
  await adminCtx.close();
});
