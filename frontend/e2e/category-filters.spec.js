import { test, expect } from '@playwright/test';
import { CUSTOMER_USER, ORG_USER, seedLocalStorage } from './fixtures/seed.js';

test.use({ viewport: { width: 425, height: 865 } });

test.describe('Trek Categories and Explore Filters', () => {
  test('verifies category rail removed from home and category filters rail active on explore', async ({ page }) => {
    // 1. Seed customer login and navigate to Home
    await seedLocalStorage(page, {
      trekigo_user: CUSTOMER_USER,
    });

    await page.goto('/app');
    await expect(page.locator('#search-input-box')).toBeVisible();

    // Verify showcase category rail is no longer on Home
    await expect(page.locator('#customer-category-rail')).toHaveCount(0);

    // 2. Navigate to Explore
    await page.goto('/app/explore');
    await expect(page.locator('#explore-search-input')).toBeVisible();

    // Verify Category filter rail on Explore
    const allCatBtn = page.locator('#filter-cat-all');
    await expect(allCatBtn).toBeVisible();

    // Check if any admin-defined category pills are rendered
    const categoryPills = page.locator('button[id^="filter-cat-"]');
    const pillCount = await categoryPills.count();
    expect(pillCount).toBeGreaterThanOrEqual(1);

    // If there is an admin category pill, test clicking it
    if (pillCount > 1) {
      const firstCategoryPill = categoryPills.nth(1);
      await firstCategoryPill.click();

      // Verify active category chip appears with clear button
      const activeChip = page.locator('button[aria-label="Clear category filter"]');
      await expect(activeChip).toBeVisible();

      // Click clear button to reset
      await activeChip.click();
      await expect(activeChip).not.toBeVisible();
    }
  });

  test('verifies organizer trek picker category filters', async ({ page }) => {
    // Seed organizer auth
    await seedLocalStorage(page, {
      trekigo_org_user: ORG_USER,
    });

    // Go to new trip page
    await page.goto('/organizer/trips/new');

    // Trek picker search input should be present
    const trekSearch = page.locator('input[placeholder="Search treks..."]');
    await expect(trekSearch).toBeVisible({ timeout: 10000 });

    // Category pills should be present in the trek picker
    const allTrekPill = page.locator('button', { hasText: /^All$/ }).first();
    await expect(allTrekPill).toBeVisible();
  });
});

