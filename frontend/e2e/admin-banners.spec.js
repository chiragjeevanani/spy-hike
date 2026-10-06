import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

async function loginAsAdmin(page) {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', 'superadmin@gmail.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
}

test.describe('Admin Promotional Banners CMS', () => {
  test('reset defaults button shows modal, can be cancelled, and when confirmed resets banners to platform defaults', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/admin/banners');
    await expect(page.getByRole('heading', { name: /Customer App Home Banners/i })).toBeVisible({ timeout: 10000 });

    // Locate the first banner title input
    const firstTitleInput = page.locator('label', { hasText: 'Banner Title' }).first().locator('..').locator('input');
    await expect(firstTitleInput).toBeVisible({ timeout: 10000 });

    // Edit the title
    await firstTitleInput.fill('Custom Himalayan Adventure');
    await expect(page.getByText('Unsaved Changes')).toBeVisible();

    // Click "Reset Defaults" button in the action header
    const resetBtn = page.getByRole('button', { name: /Reset Defaults/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // The ConfirmDialog modal should appear
    const modalTitle = page.getByRole('heading', { name: /Reset to Platform Defaults\?/i });
    await expect(modalTitle).toBeVisible();

    // Test cancelling the dialog
    const cancelBtn = page.getByRole('button', { name: /^Cancel$/i });
    await cancelBtn.click();
    await expect(modalTitle).not.toBeVisible();
    // Input should still retain our edit
    expect(await firstTitleInput.inputValue()).toBe('Custom Himalayan Adventure');

    // Click "Reset Defaults" again and confirm
    await resetBtn.click();
    await expect(modalTitle).toBeVisible();

    // Click "Reset Defaults" inside the dialog
    const confirmBtn = page.locator('button', { hasText: /^Reset Defaults$/i }).last();
    await confirmBtn.click();

    // Title should be restored back to "Himalayan Ridge Pass"
    await expect(firstTitleInput).toHaveValue('Himalayan Ridge Pass', { timeout: 5000 });
    await expect(page.getByText('Unsaved Changes')).not.toBeVisible();
  });
});
