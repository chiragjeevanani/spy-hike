import { test, expect, request as pwRequest } from '@playwright/test';

// Phase 10 — admin analytics. The dashboard's KPIs + charts now come from the
// API aggregates, not localStorage mocks (which, for the admin app, would read
// as zero). A booking's revenue is reflected in the analytics overview.

const API = 'http://localhost:4000/api/v1';
const DEMO_ADMIN = { email: 'admin@findyourtrek.com', password: 'admin123' };
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };

test.use({ viewport: { width: 1280, height: 900 } });

test('admin dashboard shows real trip + revenue KPIs from the API', async ({ page }) => {
  // Seed a booking so there is revenue in the aggregates.
  const ctx = await pwRequest.newContext();
  const orgToken = (await (await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const trip = (await (await ctx.post(`${API}/organizer/trips`, {
    headers: { Authorization: `Bearer ${orgToken}` },
    data: {
      name: `E2E Analytics Trek ${Date.now()}`, location: 'Kaza', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 1000 }], pickup: { location: 'Manali', price: 0 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' }, departureDates: ['2026-11-05'],
      maxGroupSize: 20, availableSeats: 20, category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Analytics e2e', status: 'Published',
    },
  })).json()).trip;
  const custToken = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'C', email: `an-${Date.now()}@example.com`, password: 'pass1234' } })).json()).token;
  await ctx.post(`${API}/bookings`, { headers: { Authorization: `Bearer ${custToken}` }, data: { tripId: trip.id, selectedDate: '2026-11-05', selections: [{ label: 'Solo', count: 1 }], travelers: [{}] } });
  await ctx.dispose();

  // Admin logs in and opens the dashboard.
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', DEMO_ADMIN.email);
  await page.fill('input[type="password"]', DEMO_ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

  // Total Trips reflects the seeded catalog (>=9) — the localStorage fallback
  // would read 0, so a non-zero value proves the API aggregates loaded.
  const tripsCard = page.locator('.rounded-2xl').filter({ hasText: 'Total Trips' });
  await expect(tripsCard.locator('.text-2xl')).not.toHaveText('0', { timeout: 10000 });

  // Revenue KPI is populated too.
  const revenueCard = page.locator('.rounded-2xl').filter({ hasText: 'Total Revenue' });
  await expect(revenueCard.locator('.text-2xl')).not.toHaveText('₹0');
});
