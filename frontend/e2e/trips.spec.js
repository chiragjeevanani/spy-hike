import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 2 — Trips catalog. Drives the real customer Explore + admin Trips UIs
// against the API-served catalog. Organizer trip creation is exercised via the
// API (the TripFormView's Leaflet map picker is impractical to drive headless;
// creation/validation is covered by backend/tests/api/trips.test.js).

const API = `http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1`;
const DEMO_CUSTOMER = { email: 'chiragjeevanani333@gmail.com', password: 'findyourtrek123' };
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };
const DEMO_ADMIN = { email: 'admin@findyourtrek.com', password: 'admin123' };

async function dismissOnboarding(page) {
  const skip = page.getByText('Skip Onboarding');
  const email = page.locator('input[placeholder*="Email address"], input[type="email"]');
  await expect(skip.or(email).first()).toBeVisible({ timeout: 10000 });
  if (await skip.count()) await skip.first().click();
  await expect(email).toBeVisible({ timeout: 10000 });
}

async function customerLogin(page) {
  await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  await page.fill('input[placeholder*="Email address"], input[type="email"]', DEMO_CUSTOMER.email);
  await page.fill('input[type="password"]', DEMO_CUSTOMER.password);
  await page.click('#btn-login-email-submit');
  await expect(page.getByText(/Find your next/i)).toBeVisible({ timeout: 10000 });
}

// Creates a published trip through the API as the (approved) demo organizer.
async function createOrganizerTrip(name) {
  const ctx = await pwRequest.newContext();
  const login = await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG });
  const token = (await login.json()).token;
  const res = await ctx.post(`${API}/organizer/trips`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      location: 'Spiti Valley, Himachal',
      state: 'Himachal Pradesh',
      city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 700 }, { label: 'Group of 4+', price: 600 }],
      pickup: { location: 'Manali', price: 80 },
      startPoint: { lat: 32.22, lng: 78.07, label: 'Kaza Base' },
      departureDates: ['2099-09-10', '2099-09-24'],
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
    await page.goto('/app/explore', { waitUntil: 'domcontentloaded' });
    // Search narrows to the seeded trek even if earlier specs created trips that push it to page 2.
    const search = page.locator('input[type="text"], input[type="search"]').first();
    await search.fill('Valley of Flowers');
    await expect(page.getByText('Valley of Flowers Scenic Valley').first()).toBeVisible({ timeout: 10000 });

    // Tapping the trek card opens trek details, then clicking View Organisers opens the organizers list
    await page.getByText('Valley of Flowers Scenic Valley').first().click();
    await page.locator('#view-organisers-btn').click();
    await expect(page.getByText(/ORGANIZER OFFERING THIS TREK/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Solo:/i).first()).toBeVisible();

    // Drilling into an organizer's offering shows the full Batch Pricing block.
    await page.getByText(/VIEW DETAILS/i).first().click();
    await expect(page.getByText(/Batch Pricing/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Phase 2 — Organizer trip appears; admin pause removes it', () => {
  test('admin pause removes the bookable offer and keeps its coming-soon catalog preview', async ({ page, browser }) => {
    const name = `E2E Spiti Expedition ${Date.now()}`;
    const trip = await createOrganizerTrip(name);
    expect(trip.id).toBeTruthy();

    // Customer sees it in Explore (search narrows to the new trek).
    const cctx = await browser.newContext({ viewport: { width: 460, height: 950 } });
    const cpage = await cctx.newPage();
    await customerLogin(cpage);
    await cpage.goto('/app/explore', { waitUntil: 'domcontentloaded' });
    const search = cpage.locator('input[type="text"], input[type="search"]').first();
    await search.fill('Spiti Expedition');
    await expect(cpage.getByText(name).first()).toBeVisible({ timeout: 10000 });

    // Admin pauses the trip through the admin Trips UI.
    const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const apage = await actx.newPage();
    apage.on('dialog', (d) => d.accept()); // confirm() for the status change
    await apage.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await apage.fill('input[type="email"]', DEMO_ADMIN.email);
    await apage.fill('input[type="password"]', DEMO_ADMIN.password);
    await apage.click('button[type="submit"]');
    await expect(apage).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
    await apage.goto('/admin/trips', { waitUntil: 'domcontentloaded' });
    await apage.locator('input[placeholder*="Search"]').first().fill('Spiti Expedition');
    await expect(apage.getByText(name).first()).toBeVisible({ timeout: 10000 });
    // The trip card's Pause button triggers ConfirmDialog.
    await apage.getByRole('button', { name: /pause/i }).first().click();
    await apage.getByRole('button', { name: 'Confirm' }).click();
    await apage.waitForTimeout(1000);

    // Pausing removes the organizer's bookable offer. The canonical trek
    // stays in the catalog as a non-bookable Coming soon preview.
    await cpage.reload({ waitUntil: 'domcontentloaded' });
    await search.fill(name);
    await expect(cpage.getByText('0 treks found', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(cpage.getByRole('heading', { name: 'No treks matched', exact: true })).toBeVisible();
    const preview = cpage.getByRole('heading', { name, exact: true, level: 5 });
    await expect(preview).toBeVisible();
    await preview.click();
    await cpage.locator('#view-organisers-btn').click();
    await expect(cpage.getByText('Opening soon', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(cpage.getByRole('button', { name: /^book now/i })).toHaveCount(0);

    await cctx.close();
    await actx.close();
  });
});
