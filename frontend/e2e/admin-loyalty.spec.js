import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

async function loginAsAdmin(page) {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'admin@spyhike.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe('Admin — Loyalty Program', () => {
  test('renders both reward cards with their defaults', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loyalty');

    await expect(page.getByRole('heading', { name: 'Loyalty Program' })).toBeVisible();
    await expect(page.getByText('Customer Rewards')).toBeVisible();
    await expect(page.getByText('Organizer Rewards')).toBeVisible();

    // Defaults from DEFAULT_LOYALTY_CONFIG in src/utils/loyalty.js
    const numberInputs = page.locator('input[type="number"]');
    await expect(numberInputs).toHaveCount(2);
    await expect(numberInputs.nth(0)).toHaveValue('30');
    await expect(numberInputs.nth(1)).toHaveValue('1000');
  });

  test('editing thresholds persists to localStorage and survives reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loyalty');

    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('12');
    await numberInputs.nth(1).fill('250');

    await page.getByRole('button', { name: 'Save Loyalty Settings' }).click();
    await expect(page.getByRole('button', { name: 'Saved!' })).toBeVisible();

    const configAfterSave = await page.evaluate(() => JSON.parse(localStorage.getItem('spyhike_loyalty_config')));
    expect(configAfterSave.customer.thresholdPersons).toBe(12);
    expect(configAfterSave.organizer.thresholdBookings).toBe(250);

    // Reload — the page should read the persisted config back, not the defaults.
    await page.reload();
    await expect(numberInputs.nth(0)).toHaveValue('12');
    await expect(numberInputs.nth(1)).toHaveValue('250');
  });

  test('disabling a reward banner reflects a "Hidden in app" preview state', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/loyalty');

    // The banner enable toggle is the small pill switch beside "Reward Banner".
    const customerCard = page.locator('.rounded-2xl', { hasText: 'Customer Rewards' }).first();
    await customerCard.getByText('Reward Banner').locator('xpath=following-sibling::button[1]').click();

    await expect(page.getByText('Hidden in app')).toBeVisible();
  });

  test('quick voucher insight tiles reflect ledger counts', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('spyhike_loyalty_customer_vouchers', JSON.stringify([
        { id: 'v1', earnedAt: new Date().toISOString(), milestoneNumber: 1, status: 'available', usedRef: null },
        { id: 'v2', earnedAt: new Date().toISOString(), milestoneNumber: 2, status: 'used', usedRef: 'SH-1', usedAt: new Date().toISOString() },
      ]));
    });
    await loginAsAdmin(page);
    await page.goto('/admin/loyalty');

    const issuedTile = page.locator('.rounded-2xl', { hasText: 'Customer Vouchers Issued' });
    await expect(issuedTile.locator('div').first()).toHaveText('2');

    const availableTile = page.locator('.rounded-2xl', { hasText: 'Customer Vouchers Available' });
    await expect(availableTile.locator('div').first()).toHaveText('1');
  });
});
