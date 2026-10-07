import { test, expect } from '@playwright/test';
import { ORG_USER, seedLocalStorage } from './fixtures/seed.js';

test.use({ viewport: { width: 425, height: 865 } });

test.describe('Organizer — Payout Details Bottom Sheet', () => {
  test('opens as a bottom sheet modal, saves UPI payout details, and closes cleanly', async ({ page }) => {
    await seedLocalStorage(page, {
      trekigo_org_user: ORG_USER,
    });

    await page.goto('/organizer/profile');
    const openFinBtn = page.locator('#btn-open-financials-profile');
    await openFinBtn.scrollIntoViewIfNeeded();
    await openFinBtn.click();

    await expect(page.getByText('Financials & Settlements')).toBeVisible();

    // Click "Add Method"
    const addMethodBtn = page.locator('#btn-edit-bank-details');
    await expect(addMethodBtn).toBeVisible();
    await addMethodBtn.click();

    // Verify Bottom Sheet elements are rendered
    await expect(page.locator('h2', { hasText: 'Payout Details' })).toBeVisible();
    const saveBtn = page.locator('#btn-save-bank-details');
    await expect(saveBtn).toBeVisible();

    // Fill in payout details
    await page.getByPlaceholder('As per bank records').fill('Sherpa Guides');
    await page.getByPlaceholder('yourname@upi').fill('sherpa@okhdfcbank');

    // Save
    await saveBtn.click();

    // Verify sheet closes
    await expect(page.locator('h2', { hasText: 'Payout Details' })).not.toBeVisible();
    await expect(page.getByText('sherpa@okhdfcbank')).toBeVisible();

    // Open again to verify Escape key closes the bottom sheet
    await page.locator('#btn-edit-bank-details').click();
    await expect(page.locator('h2', { hasText: 'Payout Details' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('h2', { hasText: 'Payout Details' })).not.toBeVisible();
  });

  test('saves bank account details (Bank, Account, IFSC, PAN) and closes via close button', async ({ page }) => {
    await seedLocalStorage(page, {
      trekigo_org_user: ORG_USER,
    });

    await page.goto('/organizer/profile');
    const openFinBtn = page.locator('#btn-open-financials-profile');
    await openFinBtn.scrollIntoViewIfNeeded();
    await openFinBtn.click();

    await page.locator('#btn-edit-bank-details').click();
    await expect(page.locator('h2', { hasText: 'Payout Details' })).toBeVisible();

    // Fill full bank details
    await page.getByPlaceholder('As per bank records').fill('Himalayan Sherpa Guides Ltd');
    await page.getByPlaceholder('e.g. HDFC Bank').fill('HDFC Bank');
    await page.getByPlaceholder('XXXXXXXXXXXX').fill('987654321012');
    await page.getByPlaceholder('e.g. HDFC0001234').fill('HDFC0001234');
    await page.getByPlaceholder('ABCDE1234F').fill('ABCDE1234F');

    await page.locator('#btn-save-bank-details').click();

    // Verify sheet closed and masked account is displayed
    await expect(page.locator('h2', { hasText: 'Payout Details' })).not.toBeVisible();
    await expect(page.getByText('HDFC Bank')).toBeVisible();
    await expect(page.getByText('IFSC: HDFC0001234')).toBeVisible();
    await expect(page.getByText(/Verified recipient: Himalayan Sherpa Guides Ltd/i)).toBeVisible();

    // Reopen and test close button (X)
    await page.locator('#btn-edit-bank-details').click();
    await expect(page.locator('h2', { hasText: 'Payout Details' })).toBeVisible();
    await page.locator('#btn-close-payout-modal').click();
    await expect(page.locator('h2', { hasText: 'Payout Details' })).not.toBeVisible();
  });

  test('validates required fields and renders in dark mode cleanly', async ({ page }) => {
    await seedLocalStorage(page, {
      trekigo_org_user: ORG_USER,
      trekigo_theme: 'dark',
    });

    await page.goto('/organizer/profile');
    const openFinBtn = page.locator('#btn-open-financials-profile');
    await openFinBtn.scrollIntoViewIfNeeded();
    await openFinBtn.click();

    await page.locator('#btn-edit-bank-details').click();
    await expect(page.locator('h2', { hasText: 'Payout Details' })).toBeVisible();

    await page.getByPlaceholder('As per bank records').fill('');
    await page.getByPlaceholder('e.g. HDFC Bank').fill('');
    await page.getByPlaceholder('XXXXXXXXXXXX').fill('');
    await page.getByPlaceholder('e.g. HDFC0001234').fill('');

    // Click save without inputs
    await page.locator('#btn-save-bank-details').click();
    await expect(page.getByText('Account holder name is required.').first()).toBeVisible();

    // Fill only name without payout method
    await page.getByPlaceholder('As per bank records').fill('Trek Leader');
    await page.locator('#btn-save-bank-details').click();
    await expect(page.getByText(/Add either a UPI ID or full bank account details/i).first()).toBeVisible();

    // Close via close button
    await page.locator('#btn-close-payout-modal').click();
    await expect(page.locator('h2', { hasText: 'Payout Details' })).not.toBeVisible();
  });
});
