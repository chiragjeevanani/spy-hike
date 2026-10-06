import { test, expect } from '@playwright/test';
import { CUSTOMER_USER, seedLocalStorage } from './fixtures/seed.js';

test.use({ viewport: { width: 425, height: 865 } });

test.describe('Customer Home — Departure Date Picker Modal', () => {
  test('opens as a bottom sheet modal when clicking calendar icon, handles navigation, dismisses cleanly', async ({ page }) => {
    await seedLocalStorage(page, {
      trekigo_user: CUSTOMER_USER,
    });

    await page.goto('/app');
    await expect(page.locator('#search-input-box')).toBeVisible();

    // Click calendar icon next to the search input
    const calendarBtn = page.locator('#btn-open-date-filter');
    await expect(calendarBtn).toBeVisible();
    await calendarBtn.click();

    // Verify Bottom Sheet Departure Date picker appears
    const sheetTitle = page.locator('h2', { hasText: 'Departure date' });
    await expect(sheetTitle).toBeVisible();
    await expect(page.locator('#btn-close-date-picker')).toBeVisible();
    await expect(page.locator('#btn-date-picker-prev-month')).toBeVisible();
    await expect(page.locator('#btn-date-picker-next-month')).toBeVisible();

    // Test dismiss via Close button (X)
    await page.locator('#btn-close-date-picker').click();
    await expect(sheetTitle).not.toBeVisible();

    // Reopen and test dismiss via Escape key
    await calendarBtn.click();
    await expect(sheetTitle).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheetTitle).not.toBeVisible();

    // Reopen and test dismiss via backdrop click
    await calendarBtn.click();
    await expect(sheetTitle).toBeVisible();
    await page.locator('#trek-date-picker-backdrop').click({ position: { x: 20, y: 50 } });
    await expect(sheetTitle).not.toBeVisible();
  });
});

