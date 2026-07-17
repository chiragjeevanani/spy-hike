import { test, expect, request as pwRequest } from '@playwright/test';
import { CUSTOMER_USER, makeLoyaltyConfig, makeCustomerBooking, seedLocalStorage } from './fixtures/seed.js';

const API = 'http://localhost:4000/api/v1';

test.use({ viewport: { width: 480, height: 900 } });

// Registers a unique customer via the API and returns a { token, user } pair.
// Booking now goes through the authenticated API, so the checkout test needs a
// real session; a fresh user also keeps its server-side bookings isolated from
// other specs sharing the in-memory backend.
async function freshCustomer() {
  const ctx = await pwRequest.newContext();
  const email = `loyalty-${Date.now()}@example.com`;
  const res = await ctx.post(`${API}/auth/register`, { data: { name: 'Loyalty Hiker', email, password: 'pass1234' } });
  const body = await res.json();
  await ctx.dispose();
  return { token: body.token, user: { ...CUSTOMER_USER, email, name: 'Loyalty Hiker' } };
}

// Threshold=2 with a single 2-traveler booking lands exactly on a milestone,
// so a voucher should already be minted the moment Home mounts.
async function seedAtMilestone(page) {
  await seedLocalStorage(page, {
    trekigo_loyalty_config: makeLoyaltyConfig({ customerThreshold: 2 }),
    trekigo_user: CUSTOMER_USER,
    trekigo_bookings: [makeCustomerBooking({ travelersCount: 2 })],
  });
}

test.describe('Customer — Loyalty Rewards', () => {
  test('crossing the threshold mints an available voucher and shows it on Home', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/app');

    await expect(page.locator('#btn-open-loyalty-home')).toBeVisible();
    await expect(page.getByText('2/2')).toBeVisible();

    const vouchers = await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_loyalty_customer_vouchers')));
    expect(vouchers).toHaveLength(1);
    expect(vouchers[0].status).toBe('available');
  });

  test('Profile menu shows unlocked messaging and opens the Loyalty Rewards page', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/app');

    // Wait for the client-side mint to settle before navigating, so "unlocked"
    // is reliably present (the mint runs in a mount effect).
    await expect
      .poll(async () => page.evaluate(() => {
        const raw = localStorage.getItem('trekigo_loyalty_customer_vouchers');
        return raw ? JSON.parse(raw).filter((v) => v.status === 'available').length : 0;
      }), { timeout: 10000 })
      .toBeGreaterThan(0);

    await page.getByText('Profile', { exact: true }).click();
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
    await ctx.patch(`${API}/admin/loyalty/config`, { headers: { Authorization: `Bearer ${adminToken}` }, data: { customer: { enabled: true, thresholdPersons: 2 } } });
    const email = `loyalty-${Date.now()}@example.com`;
    const custToken = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'Loyalty Hiker', email, password: 'pass1234' } })).json()).token;
    // A 2-traveler booking crosses threshold=2 → mints one server voucher.
    await ctx.post(`${API}/bookings`, {
      headers: { Authorization: `Bearer ${custToken}` },
      data: { tripId: 'himalayan-ridge-pass-trek', selectedDate: '2026-07-20', selections: [{ label: 'Solo', count: 2 }], travelers: [{}, {}] },
    });
    await ctx.dispose();

    await page.addInitScript((data) => {
      localStorage.setItem('trekigo_user', JSON.stringify({ isAuthenticated: true, isOnboarded: true, name: 'Loyalty Hiker', email: data.email }));
      localStorage.setItem('trekigo_auth_token', data.token);
    }, { email, token: custToken });

    // Home first so the server voucher hydrates into the local cache.
    await page.goto('/app');
    await expect
      .poll(async () => page.evaluate(() => {
        const raw = localStorage.getItem('trekigo_loyalty_customer_vouchers');
        return raw ? JSON.parse(raw).filter((v) => v.status === 'available').length : 0;
      }), { timeout: 10000 })
      .toBeGreaterThan(0);

    // Deep-link straight into the booking flow (more robust than the
    // details → Book-Now click chain under load).
    await page.goto('/app/book/himalayan-ridge-pass-trek');
    await expect(page.locator('#btn-booking-step-1-continue')).toBeVisible({ timeout: 15000 });
    await page.click('#btn-booking-step-1-continue', { force: true });
    await page.click('#btn-booking-step-2-continue', { force: true });

    const rewardCard = page.getByText('Free Booking Reward Available!');
    await expect(rewardCard).toBeVisible({ timeout: 10000 });

    await page.click('#btn-toggle-loyalty-reward', { force: true });
    await expect(page.locator('#btn-pay-and-confirm')).toHaveText(/Confirm Free Booking/);

    await page.click('#btn-pay-and-confirm', { force: true });
    await expect(page.getByText('Booking Succeeded!')).toBeVisible({ timeout: 10000 });
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
    await seedLocalStorage(page, {
      trekigo_loyalty_config: makeLoyaltyConfig({ customerThreshold: 30 }),
      trekigo_user: CUSTOMER_USER,
      trekigo_bookings: [makeCustomerBooking({ travelersCount: 2 })],
    });
    await page.goto('/app');

    await expect(page.getByText('2/30')).toBeVisible();
    const vouchers = await page.evaluate(() => {
      const raw = localStorage.getItem('trekigo_loyalty_customer_vouchers');
      return raw ? JSON.parse(raw) : [];
    });
    expect(vouchers).toHaveLength(0);
  });
});
