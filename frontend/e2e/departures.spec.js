import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 3 — Departures & seat inventory. Verifies the customer booking flow
// reflects real per-date availability: a near-full batch shows the remaining
// seat count, and a sold-out trip blocks selection/booking.

const API = 'http://localhost:4000/api/v1';
const DEMO_CUSTOMER = { email: 'chiragjeevanani333@gmail.com', password: 'trekigo123' };
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

// Creates a published trip with a specific per-batch seat count.
async function createTripWithSeats(name, availableSeats) {
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
      pricingTiers: [{ label: 'Solo', price: 700 }],
      pickup: { location: 'Manali', price: 80 },
      startPoint: { lat: 32.22, lng: 78.07, label: 'Kaza Base' },
      departureDates: ['2026-09-10', '2026-09-24'],
      difficulty: 'Difficult',
      durationDays: 7,
      maxGroupSize: 12,
      availableSeats,
      category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'An e2e inventory trek.',
      status: 'Published',
    },
  });
  const trip = (await res.json()).trip;
  await ctx.dispose();
  return trip;
}

test.use({ viewport: { width: 460, height: 950 } });

test('a near-full departure shows the remaining seat count in the booking flow', async ({ page }) => {
  const trip = await createTripWithSeats(`E2E Nearfull ${Date.now()}`, 2);
  await customerLogin(page);
  await page.goto(`/app/book/${trip.id}`);

  // Live per-date availability (2 seats) surfaces both as the selected-date
  // pill and the traveler-count capacity readout.
  await expect(page.getByText(/2 seats left/i).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Seats Left:\s*2/i)).toBeVisible();
});

test('a sold-out trip disables date selection and blocks booking', async ({ page }) => {
  const trip = await createTripWithSeats(`E2E Soldout ${Date.now()}`, 0);
  await customerLogin(page);
  await page.goto(`/app/book/${trip.id}`);

  // No seats anywhere → capacity reads 0 and the traveler stepper can't add
  // anyone, so Continue stays disabled (can't proceed to book a sold-out batch).
  await expect(page.getByText(/Seats Left:\s*0/i)).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#btn-booking-step-1-continue')).toBeDisabled();
});
