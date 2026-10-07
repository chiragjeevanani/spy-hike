import { test, expect } from '@playwright/test';
import { ORG_USER, seedLocalStorage } from './fixtures/seed.js';

test.use({ viewport: { width: 425, height: 865 } });

test.describe('Organizer — required payout setup after approval', () => {
  test('blocks the organizer app until payout details are saved', async ({ page }) => {
    await seedLocalStorage(page, {
      trekigo_org_user: { ...ORG_USER, bankDetails: {} },
    });

    await page.goto('/organizer/trips/new');

    await expect(page.getByRole('heading', { name: 'Add payout details to continue' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Post New Trip' })).toHaveCount(0);
    await expect(page.locator('nav')).toHaveCount(0);

    await page.getByPlaceholder('As per bank records').fill('Himalayan Sherpa Guides');
    await page.getByPlaceholder('yourname@upi').fill('sherpa@okhdfcbank');
    await page.locator('#btn-complete-payout-setup').click();

    await expect(page.getByRole('heading', { name: 'Add payout details to continue' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Post New Trip' })).toBeVisible();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_org_user')));
    expect(stored.bankDetails.upiId).toBe('sherpa@okhdfcbank');
  });

  test('does not unlock without a complete payout method', async ({ page }) => {
    await seedLocalStorage(page, {
      trekigo_org_user: { ...ORG_USER, bankDetails: {} },
    });

    await page.goto('/organizer/dashboard');
    await page.getByPlaceholder('As per bank records').fill('Himalayan Sherpa Guides');
    await page.locator('#btn-complete-payout-setup').click();

    await expect(page.getByText(/Add either a UPI ID or full bank account details/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add payout details to continue' })).toBeVisible();
  });
});
