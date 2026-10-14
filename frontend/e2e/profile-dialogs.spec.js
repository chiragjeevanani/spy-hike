import { test, expect } from '@playwright/test';
import { CUSTOMER_USER, ORG_USER, seedLocalStorage } from './fixtures/seed.js';

async function seed(page) {
  // These checks isolate dialog geometry and draft editing from API state.
  await page.addInitScript(() => localStorage.setItem('trekigo_auth_token', 'profile-ui-session'));
  await page.route(`http://localhost:${process.env.E2E_API_PORT || 4013}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    let json = { trips: [], bookings: [], payouts: [], chats: [], notifications: [], requests: [], vouchers: [] };
    if (path.endsWith('/auth/me')) json = { account: CUSTOMER_USER, role: 'customer' };
    else if (path.endsWith('/auth/organizer-status')) json = { isOrganizer: true, isApproved: true, organizer: ORG_USER };
    else if (path.endsWith('/auth/profile')) json = { account: { ...CUSTOMER_USER, ...route.request().postDataJSON() } };
    return route.fulfill({ json });
  });
  await seedLocalStorage(page, {
    trekigo_user: { ...CUSTOMER_USER, mobile: '9876543210' },
    trekigo_org_user: ORG_USER,
  });
}

async function expectViewportDialog(page, title) {
  const dialog = page.getByRole('dialog', { name: title });
  await expect(dialog).toBeVisible();
  await expect(page.locator('#root')).toHaveAttribute('inert', '');
  await expect(page.locator('[data-bottom-nav]')).not.toBeVisible();
  await expect.poll(async () => {
    const rect = await dialog.boundingBox();
    const viewport = page.viewportSize();
    return rect.y >= 0 && rect.y + rect.height <= viewport.height && rect.width < viewport.width && Math.abs(rect.x + rect.width / 2 - viewport.width / 2) < 2;
  }).toBe(true);
  const before = await page.locator('#root').evaluate(el => el.scrollTop);
  await page.mouse.move(10, 10);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.locator('#root').evaluate(el => el.scrollTop)).toBe(before);
}

for (const viewport of [{ width: 390, height: 664 }, { width: 1280, height: 900 }]) {
  test.describe(`Profile dialogs at ${viewport.width}px`, () => {
    test.use({ viewport });
    for (const app of ['hiker', 'organizer']) {
      test(`${app} logout is centered over a scrolled page`, async ({ page }) => {
        await seed(page);
        await page.goto(app === 'hiker' ? '/app/profile' : '/organizer/profile', { waitUntil: 'domcontentloaded' });
        const button = page.getByRole('button', { name: app === 'hiker' ? 'Log Out Session' : 'Sign Out Session', exact: true }).filter({ visible: true });
        await button.click();
        await expectViewportDialog(page, 'Log Out?');
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page.locator('#root')).not.toHaveAttribute('inert');
        if (viewport.width < 768) await expect(page.locator('[data-bottom-nav]')).toBeVisible();
      });
    }
    test('deactivation stays in the viewport and cancel restores the page', async ({ page }) => {
      await seed(page);
      await page.goto('/app/profile/settings', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Delete / Deactivate Account', exact: true }).click();
      await expectViewportDialog(page, 'Deactivate Your Account?');
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.locator('#root')).not.toHaveAttribute('inert');
    });
    test('phone OTP uses the same viewport layer', async ({ page }) => {
      await seed(page);
      await page.route('**/auth/otp/request', route => route.fulfill({ json: { success: true } }));
      await page.goto('/app/profile/personal-details', { waitUntil: 'domcontentloaded' });
      await page.locator('input[type="tel"]').first().fill('9876543211');
      await page.getByRole('button', { name: 'Save Account Details', exact: true }).click();
      await expectViewportDialog(page, 'Verify Identity Change');
      await page.getByRole('dialog', { name: 'Verify Identity Change' }).getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.locator('#root')).not.toHaveAttribute('inert');
    });
  });
}

test.describe('Profile editing', () => {
  test.use({ viewport: { width: 390, height: 664 } });
  test('athletics drafts are discarded on Back and persisted only on Save', async ({ page }) => {
    await seed(page);
    await page.goto('/app/profile', { waitUntil: 'domcontentloaded' });
    const openStats = () => page.getByRole('button', { name: 'Athletics & Experience', exact: true }).filter({ visible: true }).click();
    await openStats();
    await page.getByRole('radio', { name: 'Beginner', exact: true }).locator('..').click();
    await page.getByRole('radio', { name: 'Low', exact: true }).locator('..').click();
    await page.getByRole('button', { name: 'Back to profile', exact: true }).click();
    await openStats();
    await expect(page.getByRole('radio', { name: 'Intermediate', exact: true })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'High', exact: true })).toBeChecked();
    await page.getByRole('radio', { name: 'Beginner', exact: true }).locator('..').click();
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(/\/app\/profile$/);
    await openStats();
    await expect(page.getByRole('radio', { name: 'Intermediate', exact: true })).toBeChecked();
    await page.getByRole('radio', { name: 'Beginner', exact: true }).locator('..').click();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_user')).hikingExperience)).toBe('Beginner');
    await openStats();
    await expect(page.getByRole('radio', { name: 'Beginner', exact: true })).toBeChecked();
  });

  test('agency editing has a route, discards cancelled drafts, and saves without a reload', async ({ page }) => {
    await seed(page);
    await page.addInitScript(() => localStorage.setItem('trekigo_auth_token', 'profile-test-token'));
    let savedOrganizer = ORG_USER;
    await page.route(`http://localhost:${process.env.E2E_API_PORT || 4013}/**`, async route => {
      const url = route.request().url();
      let json = { trips: [], bookings: [], payouts: [], chats: [], notifications: [], requests: [], vouchers: [] };
      if (url.endsWith('/auth/organizer/profile') && route.request().method() === 'PATCH') {
        savedOrganizer = { ...savedOrganizer, ...route.request().postDataJSON() };
        json = { organizer: savedOrganizer };
      } else if (url.includes('/auth/organizer-status')) {
        json = { isOrganizer: true, isApproved: true, organizer: savedOrganizer };
      }
      await route.fulfill({ json, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' } });
    });
    await page.goto('/organizer/profile', { waitUntil: 'domcontentloaded' });
    await page.locator('#btn-edit-org-profile').click();
    await expect(page).toHaveURL(/\/organizer\/profile\/edit$/);
    await expect(page.getByRole('heading', { name: 'Edit Agency Profile' })).toBeVisible();
    await expect(page.locator('[data-app-overlay]')).toHaveCount(0);
    await expect(page.locator('[data-bottom-nav]')).not.toBeVisible();
    await page.getByPlaceholder('Agency name', { exact: true }).fill('Unsaved Agency');
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(/\/organizer\/profile$/);
    await page.locator('#btn-edit-org-profile').click();
    await expect(page.getByPlaceholder('Agency name', { exact: true })).toHaveValue(ORG_USER.agencyName);
    await page.getByPlaceholder('Agency name', { exact: true }).fill('Summit Trail Guides');
    await page.getByRole('button', { name: 'Save Profile Changes' }).click();
    await expect(page).toHaveURL(/\/organizer\/profile$/);
    await expect(page.getByRole('heading', { name: 'Summit Trail Guides', exact: true })).toBeVisible();
    await page.goto('/organizer/profile/edit', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Edit Agency Profile' })).toBeVisible();
  });
});
