import { test, expect } from '@playwright/test';
import { CUSTOMER_USER, makeLoyaltyConfig, makeCustomerBooking, seedLocalStorage } from './fixtures/seed.js';

test.use({ viewport: { width: 480, height: 900 } });

// Threshold=2 with a single 2-traveler booking lands exactly on a milestone,
// so a voucher should already be minted the moment Home mounts.
async function seedAtMilestone(page) {
  await seedLocalStorage(page, {
    spyhike_loyalty_config: makeLoyaltyConfig({ customerThreshold: 2 }),
    spyhike_user: CUSTOMER_USER,
    spyhike_bookings: [makeCustomerBooking({ travelersCount: 2 })],
  });
}

test.describe('Customer — Loyalty Rewards', () => {
  test('crossing the threshold mints an available voucher and shows it on Home', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/app');

    await expect(page.locator('#btn-open-loyalty-home')).toBeVisible();
    await expect(page.getByText('2/2')).toBeVisible();

    const vouchers = await page.evaluate(() => JSON.parse(localStorage.getItem('spyhike_loyalty_customer_vouchers')));
    expect(vouchers).toHaveLength(1);
    expect(vouchers[0].status).toBe('available');
  });

  test('Profile menu shows unlocked messaging and opens the Loyalty Rewards page', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/app');

    await page.getByText('Profile', { exact: true }).click();
    await expect(page.getByText('Free booking unlocked')).toBeVisible();

    await page.click('#btn-open-loyalty-rewards');
    await expect(page.getByText('Free Booking Ready!')).toBeVisible();
    await expect(page.getByText('Milestone #1 Reward')).toBeVisible();
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  });

  test('redeeming the reward in checkout zeroes the booking and consumes the voucher', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/app/trip/himalayan-ridge-pass-trek');

    await page.click('#btn-details-book-now', { force: true });
    await page.click('#btn-booking-step-1-continue', { force: true });
    await page.click('#btn-booking-step-2-continue', { force: true });

    const rewardCard = page.getByText('Free Booking Reward Available!');
    await expect(rewardCard).toBeVisible();

    await page.click('#btn-toggle-loyalty-reward', { force: true });
    await expect(page.locator('#btn-pay-and-confirm')).toHaveText(/Confirm Free Booking/);

    await page.click('#btn-pay-and-confirm', { force: true });
    await expect(page.getByText('Booking Succeeded!')).toBeVisible({ timeout: 5000 });

    // This is the step that actually commits the new booking into app state
    // (and from there into localStorage) — the success screen alone doesn't.
    await page.click('#btn-booking-done-finish', { force: true });
    await page.waitForTimeout(300);

    const vouchers = await page.evaluate(() => JSON.parse(localStorage.getItem('spyhike_loyalty_customer_vouchers')));
    expect(vouchers[0].status).toBe('used');
    expect(vouchers[0].usedRef).toBeTruthy();

    const bookings = await page.evaluate(() => JSON.parse(localStorage.getItem('spyhike_bookings')));
    const freeBooking = bookings.find(b => b.bookingId === vouchers[0].usedRef);
    expect(freeBooking).toBeTruthy();
    expect(freeBooking.finalAmount).toBe(0);
    expect(freeBooking.loyaltyRewardApplied).toBe(true);
  });

  test('below-threshold progress shows remaining count, not a false reward', async ({ page }) => {
    await seedLocalStorage(page, {
      spyhike_loyalty_config: makeLoyaltyConfig({ customerThreshold: 30 }),
      spyhike_user: CUSTOMER_USER,
      spyhike_bookings: [makeCustomerBooking({ travelersCount: 2 })],
    });
    await page.goto('/app');

    await expect(page.getByText('2/30')).toBeVisible();
    const vouchers = await page.evaluate(() => {
      const raw = localStorage.getItem('spyhike_loyalty_customer_vouchers');
      return raw ? JSON.parse(raw) : [];
    });
    expect(vouchers).toHaveLength(0);
  });
});
