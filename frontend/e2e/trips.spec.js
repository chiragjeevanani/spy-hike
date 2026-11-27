import { futureDate } from './fixtures/dates.js';
import { createTrip } from './fixtures/api.js';
import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 2 — Trips catalog. Drives the real customer Explore + admin Trips UIs
// against the API-served catalog. Organizer trip creation is exercised via the
// API (the TripFormView's Leaflet map picker is impractical to drive headless;
// creation/validation is covered by backend/tests/api/trips.test.js).

const API = 'http://localhost:4000/api/v1';
const DEMO_CUSTOMER = { email: 'chiragjeevanani333@gmail.com', password: 'findyourtrek123' };
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };
const DEMO_ADMIN = { email: 'admin@findyourtrek.com', password: 'admin123' };

async function dismissOnboarding(page) {
  const skip = page.getByText('Skip Onboarding');
  const email = page.getByPlaceholder('Email address or 10-digit phone number');
  await expect(skip.or(email).first()).toBeVisible({ timeout: 10000 });
  if (await skip.count()) await skip.first().click();
  await expect(email).toBeVisible({ timeout: 10000 });
}

async function customerLogin(page) {
  await page.goto('/app/login');
  await dismissOnboarding(page);
  await page.getByPlaceholder('Email address or 10-digit phone number').fill(DEMO_CUSTOMER.email);
  await page.fill('input[type="password"]', DEMO_CUSTOMER.password);
  await page.click('#btn-login-email-submit');
  await expect(page.getByText(/Find your next/i)).toBeVisible({ timeout: 10000 });
}

// Creates a published trip through the API as the (approved) demo organizer.
async function createOrganizerTrip(name) {
  const ctx = await pwRequest.newContext();
  const login = await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG });
  const token = (await login.json()).token;
  const res = await createTrip(ctx, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      location: 'Spiti Valley, Himachal',
      state: 'Himachal Pradesh',
      city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 700 }, { label: 'Group of 4+', price: 600 }],
      pickup: { location: 'Manali', price: 80 },
      startPoint: { lat: 32.22, lng: 78.07, label: 'Kaza Base' },
      departureDates: [futureDate(30), futureDate(44)],
      difficulty: 'Difficult',
      durationDays: 7,
      maxGroupSize: 12,
      availableSeats: 12,
      category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'An e2e-created high-altitude trek.',
      status: 'Published',
    },
  });
  const body = await res.json();
  await ctx.dispose();
  return body.trip;
}

test.describe('Phase 2 — Customer catalog', () => {
  test.use({ viewport: { width: 460, height: 950 } });

  test('Explore lists seeded trips and trip details show batch pricing tiers', async ({ page }) => {
    await customerLogin(page);
    await page.goto('/app/explore');
    await page.getByPlaceholder('Search treks or locations…').fill('Valley of Flowers');
    // Search the paginated catalog rather than depending on its first page.
    await expect(page.getByText('Valley of Flowers Scenic Valley').first()).toBeVisible({ timeout: 10000 });

    // Tapping the trek card opens the organizers list (offers for this trek),
    // which already surfaces the per-tier prices from the API.
    await page.getByText('Valley of Flowers Scenic Valley').first().click();
    await page.locator('#view-organisers-btn').click();
    await expect(page.getByText(/ORGANIZER OFFERING THIS TREK/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Solo:/i).first()).toBeVisible();

    // Drilling into an organizer's offering shows the full Batch Pricing block.
    await page.getByText(/VIEW DETAILS/i).first().click();
    await expect(page.getByText(/Batch Pricing/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Phase 2 — Organizer trip appears; admin pauses its offer', () => {
  test('admin pause removes the bookable offer and leaves a Coming soon catalog preview', async ({ page, browser }) => {
    const name = `E2E Spiti Expedition ${Date.now()}`;
    const trip = await createOrganizerTrip(name);
    expect(trip.id).toBeTruthy();

    // Customer sees it in Explore (search narrows to the new trek).
    const cctx = await browser.newContext({ viewport: { width: 460, height: 950 } });
    const cpage = await cctx.newPage();
    await customerLogin(cpage);
    await cpage.goto('/app/explore');
    const search = cpage.locator('input[type="text"], input[type="search"]').first();
    await search.fill('Spiti Expedition');
    await expect(cpage.getByText(name).first()).toBeVisible({ timeout: 10000 });

    // Admin pauses the trip through the admin Trips UI.
    const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const apage = await actx.newPage();
    apage.on('dialog', (d) => d.accept()); // confirm() for the status change
    await apage.goto('/admin/login');
    await apage.fill('input[type="email"]', DEMO_ADMIN.email);
    await apage.fill('input[type="password"]', DEMO_ADMIN.password);
    await apage.click('button[type="submit"]');
    await expect(apage).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
    await apage.goto('/admin/trips');
    await apage.locator('input[placeholder*="Search"]').first().fill('Spiti Expedition');
    await expect(apage.getByText(name).first()).toBeVisible({ timeout: 10000 });
    // The trip card's Pause button.
    await apage.getByRole('button', { name: /pause/i }).first().click();
    await apage.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(apage.getByRole('button', { name: /activate/i }).first()).toBeVisible();

    // The curated trek remains a Coming soon preview; its offer is no longer bookable.
    await cpage.reload();
    await cpage.waitForTimeout(1000);
    await search.fill('Spiti Expedition');
    await expect(cpage.getByRole('heading', { name, level: 3 })).toHaveCount(0);
    await expect(cpage.getByRole('heading', { name, level: 5 })).toBeVisible();
    await expect.poll(async () => {
      const res = await cpage.request.get(`${API}/treks/${trip.trekId}/offers`);
      return (await res.json()).offers.length;
    }).toBe(0);

    await cctx.close();
    await actx.close();
  });
});
