import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('trekigo_org_walkthrough_completed', 'true'));
});

const API = `http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1`;
const headers = (token) => ({ Authorization: `Bearer ${token}` });
const stale = { id: 'deleted-account', email: 'deleted@example.com', name: 'Deleted Guide',
  agencyName: 'Deleted Agency', isAuthenticated: true, isOnboarded: true,
  isApproved: true, isPendingApproval: false, bankDetails: {} };
test.use({ viewport: { width: 425, height: 865 } });

async function seedStale(page, token) {
  await page.addInitScript(({ stale, token }) => {
    localStorage.setItem('trekigo_org_user', JSON.stringify(stale));
    localStorage.setItem('trekigo_user', JSON.stringify(stale));
    for (const type of ['trips', 'bookings', 'chats', 'notifications', 'payouts']) {
      localStorage.setItem(`trekigo_org_${type}`, JSON.stringify([{ id: 'deleted-private-data' }]));
    }
    if (token) localStorage.setItem('trekigo_auth_token', token);
    else localStorage.removeItem('trekigo_auth_token');
  }, { stale, token });
}

for (const token of [null, 'invalid-deleted-account-token']) {
  test(`signup ignores a saved approved profile with ${token ? 'an invalid token' : 'no token'}`, async ({ page }) => {
    await seedStale(page, token);
    await page.goto('/organizer/register', { waitUntil: 'domcontentloaded' });
    await expect(page.getByPlaceholder('Your full name')).toBeVisible();
    await expect(page.getByPlaceholder('Your full name')).toHaveValue('');
    await expect(page.getByText('Add payout details to continue')).toHaveCount(0);
    await expect(page.locator('#org-nav-tab-dashboard')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('trekigo_auth_token'))).toBeNull();
    expect(await page.evaluate(() => ['trips', 'bookings', 'chats', 'notifications', 'payouts']
      .every((type) => localStorage.getItem(`trekigo_org_${type}`) === null))).toBe(true);
  });
}

test('the organizer signup button opens registration despite an old saved approved profile', async ({ page }) => {
  await seedStale(page, null);
  await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#btn-switch-role').click();
  await page.getByRole('button', { name: 'Apply as Organizer', exact: true }).click();
  await expect(page).toHaveURL(/\/organizer\/register$/);
  await expect(page.getByPlaceholder('Your full name')).toBeVisible();
  await expect(page.getByPlaceholder('Your full name')).toHaveValue('');
  await expect(page.getByText('Add payout details to continue')).toHaveCount(0);
});

async function createOrganizer(request) {
  const email = `verified-${crypto.randomUUID()}@example.com`;
  const registration = await request.post(`${API}/auth/organizer/register`, { data: {
    name: 'Verified New Guide', email, password: 'pass1234', mobile: `9${Date.now().toString().slice(-9)}`,
    agencyName: 'Verified New Agency', govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  } });
  expect(registration.ok()).toBeTruthy();
  const organizer = await registration.json();
  const login = await request.post(`${API}/auth/admin/login`, { data: { email: 'admin@findyourtrek.com', password: 'admin123' } });
  const admin = await login.json();
  const approved = await request.patch(`${API}/admin/organizers/${organizer.account.id}/status`, {
    headers: headers(admin.token), data: { action: 'approve' },
  });
  expect(approved.ok()).toBeTruthy();
  return { ...organizer, admin };
}

test('a deleted server account cannot enter payout setup using its saved profile and token', async ({ page, request }) => {
  const organizer = await createOrganizer(request);
  const deletion = await request.delete(`${API}/admin/organizers/${organizer.account.id}`, { headers: headers(organizer.admin.token) });
  expect(deletion.ok()).toBeTruthy();
  await seedStale(page, organizer.token);
  await page.goto('/organizer/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('Your full name')).toBeVisible();
  await expect(page.getByText('Add payout details to continue')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_org_user')).isAuthenticated)).toBe(false);
});

test('verification outage blocks stale approval; retry verifies the account and saving bank details opens dashboard with navigation', async ({ page, request }) => {
  const organizer = await createOrganizer(request);
  await seedStale(page, organizer.token);
  let unavailable = true;
  await page.route('**/api/v1/auth/organizer-status', (route) => unavailable
    ? route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } }) : route.continue());
  await page.goto('/organizer/register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Retry verification' })).toBeVisible();
  await expect(page.getByText('Add payout details to continue')).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await expect(page).toHaveURL(/\/organizer\/dashboard$/);
  await expect(page.getByText('Add payout details to continue')).toBeVisible();
  await page.getByPlaceholder('As per bank records').fill('Verified New Guide');
  await page.getByPlaceholder('yourname@upi').fill('verified@okhdfcbank');
  const saved = page.waitForResponse((response) => response.url().endsWith('/organizer/bank-details') && response.request().method() === 'PATCH');
  await page.locator('#btn-complete-payout-setup').click();
  expect((await saved).ok()).toBeTruthy();
  await expect(page.locator('#org-nav-tab-dashboard')).toBeVisible();
  await page.locator('#org-nav-tab-trips').click();
  await expect(page.getByRole('heading', { name: 'Expeditions & Treks' })).toBeVisible();
  expect(await page.evaluate(() => ['trips', 'bookings', 'chats', 'notifications', 'payouts']
    .every((type) => localStorage.getItem(`trekigo_org_${type}`) === null))).toBe(true);
});

test('clearing the session in another tab immediately removes payout access', async ({ page, request }) => {
  const organizer = await createOrganizer(request);
  await seedStale(page, organizer.token);
  await page.goto('/organizer/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Add payout details to continue')).toBeVisible();
  const otherTab = await page.context().newPage();
  await otherTab.goto('/offline.html', { waitUntil: 'domcontentloaded' });
  await otherTab.evaluate(() => localStorage.removeItem('trekigo_auth_token'));
  await expect(page.getByPlaceholder('Your full name')).toBeVisible();
  await expect(page.getByText('Add payout details to continue')).toHaveCount(0);
  await otherTab.close();
});
