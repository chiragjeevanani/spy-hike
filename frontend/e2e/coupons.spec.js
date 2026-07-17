import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 4 — Coupons. Admin creates a coupon through the console UI; the
// customer applies a coupon at checkout (total drops) and an invalid code is
// rejected — all against the API-backed coupon service.

const API = 'http://localhost:4000/api/v1';
const DEMO_CUSTOMER = { email: 'chiragjeevanani333@gmail.com', password: 'findyourtrek123' };
const DEMO_ADMIN = { email: 'admin@findyourtrek.com', password: 'admin123' };
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };

async function dismissOnboarding(page) {
  const skip = page.getByText('Skip Onboarding');
  const email = page.locator('input[type="email"]');
  await expect(skip.or(email).first()).toBeVisible({ timeout: 10000 });
  if (await skip.count()) await skip.first().click();
  await expect(email).toBeVisible({ timeout: 10000 });
}

async function customerLogin(page) {
  await page.goto('/app/login');
  await dismissOnboarding(page);
  await page.fill('input[type="email"]', DEMO_CUSTOMER.email);
  await page.fill('input[type="password"]', DEMO_CUSTOMER.password);
  await page.click('#btn-login-email-submit');
  await expect(page.getByText(/Find your next/i)).toBeVisible({ timeout: 10000 });
}

async function createBookableTrip(name) {
  const ctx = await pwRequest.newContext();
  const token = (await (await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const res = await ctx.post(`${API}/organizer/trips`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name, location: 'Kaza, Spiti', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 1000 }],
      pickup: { location: 'Manali', price: 100 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' },
      departureDates: ['2026-10-05', '2026-10-19'],
      difficulty: 'Moderate', durationDays: 5, maxGroupSize: 15, availableSeats: 15,
      category: 'Trekking', coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Coupon e2e trek', status: 'Published',
    },
  });
  const trip = (await res.json()).trip;
  await ctx.dispose();
  return trip;
}

test('admin creates a coupon through the console and it appears in the table', async ({ page }) => {
  page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', DEMO_ADMIN.email);
  await page.fill('input[type="password"]', DEMO_ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

  await page.goto('/admin/coupons');
  const code = `E2E${Date.now().toString().slice(-6)}`;
  await page.getByRole('button', { name: /create coupon/i }).click();
  await page.locator('input[placeholder="e.g. SUMMER25"]').fill(code);
  await page.locator('input[placeholder="e.g. 20"]').fill('25');
  await page.locator('form').getByRole('button', { name: 'Create Coupon' }).click();

  await expect(page.getByText(code)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/25% off/i).first()).toBeVisible();
});

test('customer applies a seeded coupon at checkout and the total drops', async ({ page }) => {
  page.setViewportSize({ width: 460, height: 950 });
  const trip = await createBookableTrip(`E2E Coupon Trek ${Date.now()}`);
  await customerLogin(page);
  await page.goto(`/app/book/${trip.id}`);

  // Step 1 (date + default traveler) → Step 2 → Step 3 checkout.
  await expect(page.locator('#btn-booking-step-1-continue')).toBeEnabled({ timeout: 10000 });
  await page.click('#btn-booking-step-1-continue');
  await page.click('#btn-booking-step-2-continue');
  await expect(page.getByText(/Checkout & Settlement/i)).toBeVisible({ timeout: 10000 });

  // Apply the seeded 20% coupon.
  await page.locator('input[placeholder="CODE (e.g. FYT20)"]').fill('FYT20');
  await page.click('#btn-apply-coupon');
  await expect(page.getByText(/Coupon applied: 20% off/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Coupon Discount \(FYT20\)/i)).toBeVisible();

  // An invalid code is rejected.
  await page.locator('input[placeholder="CODE (e.g. FYT20)"]').fill('NOPE-XYZ-999');
  await page.click('#btn-apply-coupon');
  await expect(page.getByText(/invalid coupon code/i)).toBeVisible({ timeout: 10000 });
});
