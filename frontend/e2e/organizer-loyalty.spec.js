import { test, expect } from '@playwright/test';
import { ORG_USER, makeLoyaltyConfig, makeOrgBooking, seedLocalStorage } from './fixtures/seed.js';

test.use({ viewport: { width: 480, height: 900 } });

// Threshold=1 with a single received booking lands exactly on a milestone,
// so a zero-commission voucher should already be minted once data loads.
async function seedAtMilestone(page) {
  await seedLocalStorage(page, {
    trekigo_loyalty_config: makeLoyaltyConfig({ organizerThreshold: 1 }),
    trekigo_org_user: ORG_USER,
    trekigo_org_bookings: [makeOrgBooking({ hikersCount: 2 })],
  });
}

test.describe('Organizer — Loyalty Rewards', () => {
  test('a received booking crossing the threshold mints a voucher and shows the Dashboard banner', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/organizer/dashboard');

    await expect(page.locator('#btn-open-loyalty-dashboard')).toBeVisible();
    await expect(page.getByText('1/1')).toBeVisible();

    const vouchers = await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_loyalty_org_vouchers')));
    expect(vouchers).toHaveLength(1);
    expect(vouchers[0].status).toBe('available');

    // totalBookings on the organizer profile should be kept in sync with
    // their actual booking roster, since the loyalty progress depends on it.
    const orgUser = await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_org_user')));
    expect(orgUser.totalBookings).toBe(1);
  });

  test('Profile menu shows unlocked messaging and opens the Loyalty Rewards overlay', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/organizer/dashboard'); // let the sync effect mint the voucher first
    await page.waitForTimeout(300);

    await page.goto('/organizer/profile');
    await expect(page.getByText(/Zero-commission voucher ready to apply|Zero-commission credit unlocked/i)).toBeVisible();

    await page.click('#btn-open-loyalty-profile');
    await expect(page.getByText('Zero-Commission Credit Ready!')).toBeVisible();
    await expect(page.getByText('Milestone #1 Reward')).toBeVisible();
  });

  test('redeeming the reward on a booking zeroes its commission and marks the voucher used', async ({ page }) => {
    await seedAtMilestone(page);
    await page.goto('/organizer/dashboard'); // mint the voucher
    await page.waitForTimeout(300);

    await page.goto('/organizer/bookings');
    await page.click('#org-booking-row-ob-e2e-1', { force: true });

    const redeemBtn = page.locator('#btn-apply-org-loyalty-reward');
    await expect(redeemBtn).toBeVisible();
    await redeemBtn.click();

    await expect(page.getByText(/₹0 \((?:Zero Fee )?Reward Applied\)/)).toBeVisible();

    const vouchers = await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_loyalty_org_vouchers')));
    expect(vouchers[0].status).toBe('used');
    expect(vouchers[0].usedRef).toBe('TG-ORGE2E-1');

    const bookings = await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_org_bookings')));
    const redeemed = bookings.find(b => b.bookingId === 'TG-ORGE2E-1');
    expect(redeemed.commissionAmount).toBe(0);
    expect(redeemed.loyaltyRewardApplied).toBe(true);
  });

  test('below-threshold progress shows remaining count, not a false reward', async ({ page }) => {
    await seedLocalStorage(page, {
      trekigo_loyalty_config: makeLoyaltyConfig({ organizerThreshold: 1000 }),
      trekigo_org_user: ORG_USER,
      trekigo_org_bookings: [makeOrgBooking({ hikersCount: 2 })],
    });
    await page.goto('/organizer/dashboard');

    await expect(page.getByText('1/1000')).toBeVisible();
    const vouchers = await page.evaluate(() => {
      const raw = localStorage.getItem('trekigo_loyalty_org_vouchers');
      return raw ? JSON.parse(raw) : [];
    });
    expect(vouchers).toHaveLength(0);
  });
});
