import { test, expect } from '@playwright/test';
import { CUSTOMER_USER, ORG_USER, seedLocalStorage } from './fixtures/seed.js';

test.use({ viewport: { width: 425, height: 865 } });

test.describe('Organizer — required payout setup after approval', () => {
  for (const backMethod of ['browser', 'button']) {
    test(`${backMethod} back asks before returning to a working hiker app`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      // This transition check uses an approved organizer with missing payout
      // details. Keep both role sessions authenticated in the UI fixture.
      await page.addInitScript(() => localStorage.setItem('trekigo_auth_token', 'payout-ui-session'));
      await page.route(`http://localhost:${process.env.E2E_API_PORT || 4013}/**`, (route) => {
        const path = new URL(route.request().url()).pathname;
        let body = { trips: [], treks: [], bookings: [], payouts: [], chats: [], notifications: [], requests: [], vouchers: [] };
        if (path.endsWith('/auth/me') || path.endsWith('/auth/customer-token')) {
          body = { account: CUSTOMER_USER, role: 'customer', token: 'payout-ui-session' };
        } else if (path.endsWith('/auth/organizer-status')) {
          body = { isOrganizer: true, isApproved: true, organizer: { ...ORG_USER, bankDetails: {} } };
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      });
      await seedLocalStorage(page, {
        trekigo_user: CUSTOMER_USER,
        trekigo_org_user: { ...ORG_USER, bankDetails: {} },
      });
      await page.goto('/app', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#nav-tab-profile')).toBeVisible();
      await page.evaluate(() => {
        localStorage.setItem('trekigo_active_role', 'organizer');
        window.location.assign('/organizer/dashboard');
      });
      await expect(page.getByRole('heading', { name: 'Add payout details to continue' })).toBeVisible();
      await page.getByPlaceholder('As per bank records').fill('Unsaved account holder');

      const goBack = async () => {
        if (backMethod === 'browser') {
          await page.evaluate(() => window.history.back());
        } else {
          await page.getByRole('button', { name: 'Back to hiker app' }).click();
        }
      };
      await goBack();
      await expect(page.getByRole('heading', { name: 'Go back to the hiker app?' })).toBeVisible();
      await expect(page).toHaveURL(/\/organizer\/dashboard$/);
      await page.getByRole('button', { name: 'Stay here' }).click();
      await expect(page.getByRole('heading', { name: 'Go back to the hiker app?' })).not.toBeVisible();
      await expect(page.getByPlaceholder('As per bank records')).toHaveValue('Unsaved account holder');

      await goBack();
      await page.getByRole('button', { name: 'Go back', exact: true }).click();
      await expect(page).toHaveURL(/\/app$/);
      await expect(page.locator('#nav-tab-profile')).toBeVisible();
      await page.locator('#nav-tab-profile').click();
      await expect(page).toHaveURL(/\/app\/profile$/);
      expect(await page.evaluate(() => localStorage.getItem('trekigo_active_role'))).toBe('hiker');
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_user')).isAuthenticated)).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test('blocks the organizer app until payout details are saved', async ({ page }) => {
    await seedLocalStorage(page, {
      trekigo_org_user: { ...ORG_USER, bankDetails: {} },
    });

    await page.goto('/organizer/trips/new', { waitUntil: 'domcontentloaded' });

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

    await page.goto('/organizer/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('As per bank records').fill('Himalayan Sherpa Guides');
    await page.locator('#btn-complete-payout-setup').click();

    await expect(page.getByText(/Add either a UPI ID or full bank account details/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add payout details to continue' })).toBeVisible();
  });
});
