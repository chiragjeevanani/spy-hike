import { test, expect, request as pwRequest } from '@playwright/test';

// Admin roster — the Users and Organizers consoles show real registered
// accounts from the API (not localStorage seeds), and row actions hit the API.

const API = 'http://localhost:4000/api/v1';
const DEMO_ADMIN = { email: 'admin@findyourtrek.com', password: 'admin123' };

async function adminConsoleLogin(page) {
  page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', DEMO_ADMIN.email);
  await page.fill('input[type="password"]', DEMO_ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
}

test('a registered hiker shows in the Users roster and can be banned', async ({ page }) => {
  const email = `roster-hiker-${Date.now()}@example.com`;
  const mobile = `9${String(Date.now()).slice(-9)}`;
  const ctx = await pwRequest.newContext();
  await ctx.post(`${API}/auth/register`, { data: { name: 'Roster Hiker', email, password: 'pass1234', mobile: '9876543210' } });
  await ctx.post(`${API}/auth/register`, { data: { name: 'Roster Hiker', email, password: 'pass1234', mobile } });
  await ctx.dispose();

  await adminConsoleLogin(page);
  await page.goto('/admin/users');

  // Isolate the just-registered hiker via the client-side search.
  await page.getByPlaceholder(/Search by name or email/i).fill(email);
  const row = page.locator('tr', { hasText: email });
  await expect(row).toBeVisible({ timeout: 10000 });

  // Ban → confirm → the row flips to a banned (Unban) state via the API.
  await row.getByTitle('Ban Hiker').click();
  await page.getByRole('button', { name: 'Ban', exact: true }).click();
  await expect(row.getByTitle('Unban Hiker')).toBeVisible({ timeout: 10000 });
});

test('a registered organizer shows in the Organizers roster', async ({ page }) => {
  const agency = `Roster Guides ${Date.now()}`;
  const email = `roster-org-${Date.now()}@example.com`;
  const ctx = await pwRequest.newContext();
  await ctx.post(`${API}/auth/organizer/register`, { data: { name: 'Roster Org', email, password: 'pass1234', agencyName: agency } });
  await ctx.post(`${API}/auth/organizer/register`, {
    data: {
      name: 'Roster Org',
      email,
      password: 'pass1234',
      agencyName: agency,
      govtIdType: 'Aadhaar',
      govtIdNumber: '123456789012',
    },
  });
  await ctx.dispose();

  await adminConsoleLogin(page);
  await page.goto('/admin/organizers');
  // A freshly registered organizer is pending → shows in the default tab.
  await expect(page.getByText(agency).first()).toBeVisible({ timeout: 10000 });
});
