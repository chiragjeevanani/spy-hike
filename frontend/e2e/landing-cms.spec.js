import { test, expect } from '@playwright/test';

// Landing-page CMS — the admin edits marketing copy in /admin/landing and the
// public landing page (served at "/") reflects it after saving.

const DEMO_ADMIN = { email: 'admin@trekigo.com', password: 'admin123' };

async function adminConsoleLogin(page) {
  page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', DEMO_ADMIN.email);
  await page.fill('input[type="password"]', DEMO_ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
}

test('admin edits the hero headline in the CMS and it shows on the landing page', async ({ page }) => {
  const highlight = `Legend Peaks ${Date.now().toString().slice(-5)}`;
  await adminConsoleLogin(page);

  await page.goto('/admin/landing');
  // The Hero section is expanded by default.
  const highlightInput = page.locator('label', { hasText: 'Title (highlighted)' }).locator('input');
  await expect(highlightInput).toBeVisible({ timeout: 10000 });
  // Editor hydrated real content (non-empty) before we overwrite it.
  expect((await highlightInput.inputValue()).length).toBeGreaterThan(0);
  await highlightInput.fill(highlight);

  await page.getByRole('button', { name: /Save Changes/i }).click();
  await expect(page.getByRole('button', { name: /Saved/i })).toBeVisible({ timeout: 10000 });

  // Public landing page (root path) reflects the new headline.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(highlight, { timeout: 10000 });
});

test('hiding a section in the CMS removes it from the landing page', async ({ page }) => {
  await adminConsoleLogin(page);
  await page.goto('/admin/landing');

  // The FAQ section header carries a visibility (eye) toggle; turning it off
  // hides the whole section on the public page.
  const faqHeader = page.locator('div.rounded-2xl').filter({ has: page.getByRole('heading', { name: 'FAQ' }) }).first();
  await expect(faqHeader).toBeVisible({ timeout: 10000 });
  await faqHeader.getByRole('button', { name: 'Section visible' }).click();

  await page.getByRole('button', { name: /Save Changes/i }).click();
  await expect(page.getByRole('button', { name: /Saved/i })).toBeVisible({ timeout: 10000 });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toHaveCount(0);
});
