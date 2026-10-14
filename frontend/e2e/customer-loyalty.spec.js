import { test, expect, request as pwRequest } from '@playwright/test';
import { CUSTOMER_USER, seedLocalStorage } from './fixtures/seed.js';

const API = `http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1`;

test.use({ viewport: { width: 480, height: 900 } });

// Earn progress through the real API. Cached bookings alone must never grant
// a server-verified reward or stand in for an authenticated account.
async function seedCustomerProgress(page, threshold = 2) {
  const ctx = await pwRequest.newContext();
  try {
    const admin = await ctx.post(`${API}/auth/admin/login`, { data: { email: 'admin@findyourtrek.com', password: 'admin123' } });
    expect(admin.ok()).toBeTruthy();
    const { token: adminToken } = await admin.json();
    const config = await ctx.patch(`${API}/admin/loyalty/config`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { customer: { enabled: true, thresholdPersons: threshold, maxDiscountAmount: 5000 } },
    });
    expect(config.ok()).toBeTruthy();
    const email = `loyalty-${crypto.randomUUID()}@example.com`;
    const registration = await ctx.post(`${API}/auth/register`, { data: { name: 'Loyalty Hiker', email, password: 'pass1234' } });
    expect(registration.ok()).toBeTruthy();
    const { token } = await registration.json();
    const booking = await ctx.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tripId: 'himalayan-ridge-pass-trek', selectedDate: '2026-11-05', selections: [{ label: 'Solo', count: 2 }],
        travelers: [
          { name: 'Loyalty Hiker', age: 25, gender: 'Male', emergencyContact: '9876543210' },
          { name: 'Friend Hiker', age: 26, gender: 'Female', emergencyContact: '9876543211' },
        ] },
    });
    expect(booking.ok()).toBeTruthy();
    await seedLocalStorage(page, { trekigo_user: { ...CUSTOMER_USER, email, name: 'Loyalty Hiker' } });
    await page.addInitScript((value) => localStorage.setItem('trekigo_auth_token', value), token);
  } finally {
    await ctx.dispose();
  }
}

const seedAtMilestone = (page) => seedCustomerProgress(page, 2);

test.describe('Customer — Loyalty Rewards', () => {
  test('crossing the threshold mints an available voucher and shows it on Home', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/app', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#btn-open-loyalty-home')).toBeVisible();
    await expect(page.getByText('2/2')).toBeVisible();

    const vouchers = await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_loyalty_customer_vouchers')));
    expect(vouchers).toHaveLength(1);
    expect(vouchers[0].status).toBe('available');
  });

  test('Profile menu shows unlocked messaging and opens the Loyalty Rewards page', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/app', { waitUntil: 'domcontentloaded' });

    // Wait for the client-side mint to settle before navigating, so "unlocked"
    // is reliably present (the mint runs in a mount effect).
    await expect
      .poll(async () => page.evaluate(() => {
        const raw = localStorage.getItem('trekigo_loyalty_customer_vouchers');
        return raw ? JSON.parse(raw).filter((v) => v.status === 'available').length : 0;
      }), { timeout: 10000 })
      .toBeGreaterThan(0);

    await page.locator('#nav-tab-profile').click();
    await expect(page.getByText('Free booking unlocked')).toBeVisible();

    await page.click('#btn-open-loyalty-rewards');
    await expect(page.getByText('Free Booking Ready!')).toBeVisible();
    await expect(page.getByText('Milestone #1 Reward')).toBeVisible();
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  });

  test('redeeming the reward in checkout zeroes the booking and consumes the voucher', async ({ page }) => {
    // Server-verified reward now: lower the threshold, mint a real voucher via
    // an API booking, then redeem it through the UI.
    const ctx = await pwRequest.newContext();
    const adminToken = (await (await ctx.post(`${API}/auth/admin/login`, { data: { email: 'admin@findyourtrek.com', password: 'admin123' } })).json()).token;
    await ctx.patch(`${API}/admin/loyalty/config`, { headers: { Authorization: `Bearer ${adminToken}` }, data: { customer: { enabled: true, thresholdPersons: 2, maxDiscountAmount: 5000 } } });
    const email = `loyalty-${Date.now()}@example.com`;
    const custToken = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'Loyalty Hiker', email, password: 'pass1234' } })).json()).token;
    // A 2-traveler booking crosses threshold=2 → mints one server voucher.
    await ctx.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${custToken}` },
      data: {
        tripId: 'himalayan-ridge-pass-trek',
        selectedDate: '2026-11-05',
        selections: [{ label: 'Solo', count: 2 }],
        travelers: [
          { name: 'Loyalty Hiker', age: 25, gender: 'Male', emergencyContact: '9876543210' },
          { name: 'Friend Hiker', age: 26, gender: 'Female', emergencyContact: '9876543211' },
        ],
      },
    });
    await ctx.dispose();

    await page.addInitScript((data) => {
      localStorage.setItem('trekigo_user', JSON.stringify({ isAuthenticated: true, isOnboarded: true, profileSetupComplete: true, name: 'Loyalty Hiker', email: data.email }));
      localStorage.setItem('trekigo_auth_token', data.token);
    }, { email, token: custToken });

    // Home first so the server voucher hydrates into the local cache.
    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    await expect
      .poll(async () => page.evaluate(() => {
        const raw = localStorage.getItem('trekigo_loyalty_customer_vouchers');
        return raw ? JSON.parse(raw).filter((v) => v.status === 'available').length : 0;
      }), { timeout: 10000 })
      .toBeGreaterThan(0);

    // Deep-link straight into the booking flow (more robust than the
    // details → Book-Now click chain under load).
    await page.goto('/app/book/himalayan-ridge-pass-trek', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#btn-booking-step-1-continue')).toBeVisible({ timeout: 15000 });
    await page.click('#btn-booking-step-1-continue', { force: true });
    await page.click('#btn-booking-step-2-continue', { force: true });

    const rewardCard = page.getByText(/Loyalty Reward Available!/i);
    await expect(rewardCard).toBeVisible({ timeout: 10000 });

    await page.click('#btn-toggle-loyalty-reward', { force: true });
    await expect(page.locator('#btn-pay-and-confirm')).toHaveText(/Confirm Free Booking/);

    await page.click('#btn-pay-and-confirm', { force: true });
    await expect(page.locator('#btn-booking-done-finish')).toBeVisible({ timeout: 10000 });
    await page.click('#btn-booking-done-finish', { force: true });

    // Poll until the consumed voucher + comped booking land in the cache
    // (re-hydration after the booking is async).
    await expect
      .poll(async () => page.evaluate(() => {
        const vraw = localStorage.getItem('trekigo_loyalty_customer_vouchers');
        const braw = localStorage.getItem('trekigo_bookings');
        const used = (vraw ? JSON.parse(vraw) : []).find((v) => v.status === 'used');
        if (!used) return null;
        const free = (braw ? JSON.parse(braw) : []).find((b) => b.bookingId === used.usedRef);
        return free ? { finalAmount: free.finalAmount, applied: free.loyaltyRewardApplied } : null;
      }), { timeout: 10000 })
      .toEqual({ finalAmount: 0, applied: true });
  });

  test('below-threshold progress shows remaining count, not a false reward', async ({ page }) => {
    await seedCustomerProgress(page, 30);
    await page.goto('/app', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('2/30')).toBeVisible();
    const vouchers = await page.evaluate(() => {
      const raw = localStorage.getItem('trekigo_loyalty_customer_vouchers');
      return raw ? JSON.parse(raw) : [];
    });
    expect(vouchers).toHaveLength(0);
  });
});
