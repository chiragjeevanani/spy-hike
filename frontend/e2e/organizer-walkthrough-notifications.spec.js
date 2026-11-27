import { test, expect } from '@playwright/test';
const API = `http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1`;
const auth = (token) => ({ Authorization: `Bearer ${token}` });

for (const finish of ['complete', 'skip']) {
  test(`first organizer walkthrough ${finish} continues to the partner form without a login detour`, async ({ page }) => {
    await page.setViewportSize({ width: 425, height: 865 });
    await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('trekigo_user', JSON.stringify({ isOnboarded: true, isAuthenticated: false }));
    });
    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#btn-switch-role').click();
    await page.getByRole('button', { name: 'Apply as Organizer', exact: true }).click();
    const walkthrough = page.getByTestId('organizer-walkthrough');
    await expect(walkthrough).toBeVisible();
    if (finish === 'skip') await walkthrough.getByRole('button', { name: /skip/i }).click();
    else {
      const slides = await walkthrough.getByRole('button', { name: /Go to slide/ }).count();
      for (let slide = 1; slide < slides; slide++) await walkthrough.getByRole('button', { name: 'Next', exact: true }).click();
      await walkthrough.getByRole('button', { name: 'Get Started', exact: true }).click();
    }
    await expect(page).toHaveURL(/\/organizer\/register$/);
    await expect(page.getByPlaceholder('Your full name')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('trekigo_org_walkthrough_completed'))).toBe('true');
    // The completed walkthrough stays completed after a full page reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(walkthrough).toHaveCount(0);
    await expect(page.getByPlaceholder('Your full name')).toBeVisible();
  });
}

test('admin application alert opens review; approval creates the organizer congratulations with onboarding link', async ({ page, request, browser }) => {
  const stamp = crypto.randomUUID();
  const login = await request.post(`${API}/auth/admin/login`, { data: { email: 'admin@findyourtrek.com', password: 'admin123' } });
  const admin = await login.json();
  const application = await request.post(`${API}/auth/organizer/register`, { data: {
    name: 'Notification Guide', email: `notify-${stamp}@example.com`, password: 'pass1234',
    mobile: `9${Date.now().toString().slice(-9)}`, agencyName: `Notification Guides ${stamp}`, govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  } });
  expect(application.ok()).toBeTruthy();
  const organizer = await application.json();
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=email]').fill('admin@findyourtrek.com');
  await page.locator('input[type=password]').fill('admin123');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await page.getByRole('button', { name: 'Admin notifications', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enable admin push notifications' })).toBeVisible();
  await page.getByRole('button').filter({ hasText: organizer.account.agencyName }).click();
  await expect(page).toHaveURL(/\/admin\/organizers$/);
  await expect(page.getByText(organizer.account.agencyName).first()).toBeVisible();
  const approved = await request.patch(`${API}/admin/organizers/${organizer.account.id}/status`, { headers: auth(admin.token), data: { action: 'approve' } });
  expect(approved.ok()).toBeTruthy();
  const feed = await request.get(`${API}/organizer/notifications`, { headers: auth(organizer.token) });
  const notification = (await feed.json()).notifications.find((item) => item.type === 'OrganizerApproval');
  expect(notification.title).toContain('Congratulations');
  expect(notification.data.url).toBe('/organizer/dashboard');
  const context = await browser.newContext({ viewport: { width: 425, height: 865 } });
  const partner = await context.newPage();
  await partner.addInitScript((token) => localStorage.setItem('trekigo_auth_token', token), organizer.token);
  await partner.goto(notification.data.url, { waitUntil: 'domcontentloaded' });
  await expect(partner.getByText('Add payout details to continue')).toBeVisible();
  await expect(partner.getByTestId('organizer-walkthrough')).toHaveCount(0);
  await context.close();
});
