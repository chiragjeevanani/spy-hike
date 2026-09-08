import { test, expect, request as pwRequest } from '@playwright/test';

// Organizer promotion — an organizer asks to be boosted from their profile's
// "Promote Yourself" card, the request lands in the admin's Promotions
// sidebar (new — didn't exist before), and approving it with a date range
// flips the organizer to "Promoted" everywhere. Also covers an admin
// promoting an organizer directly, with no request on file.

const API = 'http://localhost:4000/api/v1';
const DEMO_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com',
  password: process.env.ADMIN_PASSWORD || 'password123',
};
const PASSWORD = 'pass1234';

async function adminLoginToken(ctx) {
  const res = await ctx.post(`${API}/auth/admin/login`, { data: DEMO_ADMIN });
  expect(res.ok(), `admin login failed: ${await res.text()}`).toBeTruthy();
  return (await res.json()).token;
}

// Registers an organizer through the real API and approves them, returning
// the bearer token + account the browser session gets seeded with.
async function createApprovedOrganizer(ctx, adminTok, label) {
  const stamp = Date.now() + Math.floor(Math.random() * 100000);
  const email = `e2e-promo-${label}-${stamp}@example.com`;
  const agencyName = `E2E ${label} Guides ${stamp}`;
  const reg = await ctx.post(`${API}/auth/organizer/register`, {
    data: {
      name: `E2E ${label}`, email, password: PASSWORD, agencyName,
      govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
    },
  });
  expect(reg.ok(), `register failed: ${await reg.text()}`).toBeTruthy();
  const id = (await reg.json()).account.id;

  const approve = await ctx.patch(`${API}/admin/organizers/${id}/status`, {
    headers: { Authorization: `Bearer ${adminTok}` },
    data: { action: 'approve' },
  });
  expect(approve.ok(), `approve failed: ${await approve.text()}`).toBeTruthy();

  const login = await ctx.post(`${API}/auth/organizer/login`, { data: { email, password: PASSWORD } });
  const body = await login.json();
  return { email, agencyName, id, token: body.token, account: body.account };
}

// Seeds the organizer session the way a real login would, so the spec can
// land directly on /organizer/profile.
async function seedOrganizerSession(page, { account, token }) {
  await page.addInitScript((seed) => {
    if (localStorage.getItem('trekigo_auth_token')) return;
    localStorage.setItem('trekigo_org_user', JSON.stringify(seed.account));
    localStorage.setItem('trekigo_auth_token', seed.token);
  }, { account, token });
}

// Seeds an admin console session (apiClient stores the admin JWT under a
// separate key once the page is under /admin).
async function seedAdminSession(page, token) {
  await page.addInitScript((seed) => {
    localStorage.setItem('trekigo_admin_user', JSON.stringify({
      isAuthenticated: true, email: seed.email, name: 'System Administrator', role: 'Super Admin',
    }));
    localStorage.setItem('trekigo_admin_auth_token', seed.token);
  }, { token, email: DEMO_ADMIN.email });
}

test.describe('Organizer promotion — self-service request + admin approval', () => {
  test('a request from the organizer profile shows up in the admin Promotions sidebar, and approving it promotes the organizer', async ({ browser }) => {
    const ctx = await pwRequest.newContext();
    const adminTok = await adminLoginToken(ctx);
    const org = await createApprovedOrganizer(ctx, adminTok, 'req');
    await ctx.dispose();

    // 1. The organizer sends a promotion request from their own profile.
    const orgCtx = await browser.newContext({ viewport: { width: 480, height: 950 } });
    const orgPage = await orgCtx.newPage();
    await seedOrganizerSession(orgPage, org);
    await orgPage.goto('/organizer/profile');

    const promoCard = orgPage.locator('#org-promote-yourself');
    await expect(promoCard).toBeVisible({ timeout: 15000 });
    await promoCard.locator('textarea').fill('We run the safest treks in the valley — happy to be featured!');
    await orgPage.click('#btn-request-promotion');
    await expect(promoCard.getByText(/waiting on admin review/i)).toBeVisible({ timeout: 15000 });

    // 2. It appears in the admin's Promotions sidebar — a section that didn't
    // exist before this feature — with a pending badge.
    const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const adminPage = await adminCtx.newPage();
    await seedAdminSession(adminPage, adminTok);
    await adminPage.goto('/admin/dashboard');
    const sidebarItem = adminPage.locator('button', { hasText: 'Promotion Requests' });
    await expect(sidebarItem).toBeVisible({ timeout: 15000 });
    await expect(sidebarItem.getByText(/^[1-9]\d*$/)).toBeVisible({ timeout: 15000 });
    await sidebarItem.click();
    await expect(adminPage).toHaveURL(/\/admin\/promotions/, { timeout: 10000 });

    // 3. Approve it with a date range, via the real modal (defaults are fine).
    const requestId = await (async () => {
      const c = await pwRequest.newContext();
      const list = await c.get(`${API}/admin/promotion-requests?status=Pending`, { headers: { Authorization: `Bearer ${adminTok}` } });
      const { requests } = await list.json();
      await c.dispose();
      return requests.find((r) => r.organizerEmail === org.email)?.id;
    })();
    expect(requestId, 'no pending promotion request found for the organizer').toBeTruthy();

    const card = adminPage.locator(`#promo-request-${requestId}`);
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.locator(`#promo-open-approve-${requestId}`).click();
    await adminPage.click('#promo-confirm-approve');

    // The card moves off the Pending tab once approved.
    await expect(adminPage.locator(`#promo-request-${requestId}`)).toHaveCount(0, { timeout: 15000 });

    // 4. Back on the organizer's own profile, the boost is now visible.
    await orgPage.reload();
    await expect(orgPage.getByText(/^Promoted$/).first()).toBeVisible({ timeout: 15000 });
    await expect(orgPage.getByText(/Promoted until/i)).toBeVisible({ timeout: 15000 });

    await orgCtx.close();
    await adminCtx.close();
  });
});

test.describe('Organizer promotion — admin can promote directly', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('admin promotes an organizer from the roster with no request on file, then un-promotes them', async ({ page }) => {
    const ctx = await pwRequest.newContext();
    const adminTok = await adminLoginToken(ctx);
    const org = await createApprovedOrganizer(ctx, adminTok, 'direct');
    await ctx.dispose();

    await seedAdminSession(page, adminTok);
    await page.goto('/admin/organizers');
    await page.getByRole('button', { name: /All Organizers/i }).click();

    const row = page.locator('tr', { hasText: org.email });
    await expect(row).toBeVisible({ timeout: 15000 });

    await row.getByTitle('Promote Organizer').click();
    await expect(page.getByText(`Promote ${org.agencyName}`)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Confirm & Promote/i }).click();

    // The row now shows the gold "Promoted" badge and an un-promote control.
    await expect(row.getByText('Promoted', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(row.getByTitle('Remove Promotion')).toBeVisible();

    await row.getByTitle('Remove Promotion').click();
    await expect(row.getByText('Promoted', { exact: true })).toHaveCount(0, { timeout: 15000 });
  });
});
