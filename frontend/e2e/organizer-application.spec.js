import { test, expect, request as pwRequest } from '@playwright/test';

// "Become an Organizer" application lifecycle, driven end-to-end against the
// real API:
//   1. An admin approval reaches the waiting applicant on its own — no manual
//      refresh, no "Check Status" tap.
//   2. An account that has already applied can never reach the application
//      form again (menu tap or direct URL), so it can't file a duplicate.

const API = 'http://localhost:4000/api/v1';
// Matches backend/.env (ADMIN_EMAIL/ADMIN_PASSWORD), falling back to the
// defaults seed.js uses when neither is set.
const DEMO_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com',
  password: process.env.ADMIN_PASSWORD || 'password123',
};
const PASSWORD = 'pass1234';

// Registers a fresh traveller straight through the API — every test needs an
// account with no organizer profile yet.
async function createCustomer() {
  const ctx = await pwRequest.newContext();
  const stamp = Date.now();
  const email = `e2e-applicant-${stamp}@example.com`;
  const res = await ctx.post(`${API}/auth/register`, {
    data: {
      name: 'E2E Applicant',
      email,
      password: PASSWORD,
      mobile: `9${String(stamp).slice(-9)}`,
    },
  });
  expect(res.ok(), `register failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return { email, token: body.token, account: body.account };
}

// Seeds the traveller session the way a real login would, so specs can land
// directly on /app/profile without driving the login form.
async function seedCustomerSession(page, { account, token }) {
  await page.addInitScript((seed) => {
    // Init scripts re-run on every navigation, including the hand-off to
    // /organizer — seed only once, or the organizer-scoped token minted during
    // the flow gets clobbered with the customer one.
    if (localStorage.getItem('trekigo_auth_token')) return;
    localStorage.setItem('trekigo_user', JSON.stringify({
      ...seed.account,
      isAuthenticated: true,
      isOnboarded: true,
      // Skips the "Set Up Your Hiker Profile" gate a brand-new account hits.
      profileSetupComplete: true,
      rememberMe: true,
    }));
    localStorage.setItem('trekigo_auth_token', seed.token);
  }, { account, token });
}

// Fills and submits the partner application from the traveller Profile tab.
async function applyAsOrganizer(page) {
  await page.goto('/app/profile');
  await page.click('#btn-become-organizer');

  const agency = page.locator('input[placeholder="e.g. Himalayan Guides Ltd"]');
  await expect(agency).toBeVisible({ timeout: 15000 });
  await agency.fill('E2E Summit Collective');
  await page.fill('input[placeholder="12-digit Aadhaar number"]', '123456789012');
  await page.getByRole('button', { name: /submit application/i }).click();

  // Hands off to the organizer module, which parks the applicant on the
  // pending-approval screen.
  await expect(page.getByText(/Application Under Review/i)).toBeVisible({ timeout: 20000 });
}

async function adminApprove(email) {
  const ctx = await pwRequest.newContext();
  const login = await ctx.post(`${API}/auth/admin/login`, { data: DEMO_ADMIN });
  expect(login.ok(), `admin login failed for ${DEMO_ADMIN.email}: ${await login.text()}`).toBeTruthy();
  const token = (await login.json()).token;
  const headers = { Authorization: `Bearer ${token}` };

  const list = await ctx.get(`${API}/admin/organizers?status=pending`, { headers });
  const { organizers } = await list.json();
  const target = organizers.find((o) => o.email === email);
  expect(target, `no pending organizer for ${email}`).toBeTruthy();

  const res = await ctx.patch(`${API}/admin/organizers/${target.id}/status`, {
    headers,
    data: { action: 'approve' },
  });
  expect(res.ok(), `approve failed: ${await res.text()}`).toBeTruthy();
  await ctx.dispose();
}

test.describe('Organizer application — approval reaches the applicant', () => {
  test.use({ viewport: { width: 460, height: 950 } });

  test('admin approval moves the waiting applicant to the organizer home on its own', async ({ page }) => {
    const customer = await createCustomer();
    await seedCustomerSession(page, customer);
    await applyAsOrganizer(page);

    // The applicant just sits on the pending screen — no reload, no tap.
    await adminApprove(customer.email);

    await expect(page.getByText(/Application Under Review/i)).toHaveCount(0, { timeout: 30000 });
    await expect(page).toHaveURL(/\/organizer\/dashboard/, { timeout: 30000 });
  });
});

test.describe('Organizer application — no duplicate submissions', () => {
  test.use({ viewport: { width: 460, height: 950 } });

  test('a returning applicant gets the review screen, not a second blank form', async ({ page }) => {
    const customer = await createCustomer();
    await seedCustomerSession(page, customer);
    await applyAsOrganizer(page);

    // Reopening the app: straight back to the traveller Profile tab.
    await page.goto('/app/profile');
    await expect(page.locator('#btn-become-organizer')).toContainText(/Organizer Application/i, { timeout: 15000 });
    await expect(page.getByText('Under Review', { exact: true })).toBeVisible();

    // ...and the deep link that renders the form directly is gated too — this
    // is the route that used to hand an applicant a fresh, submittable form.
    await page.goto('/app/profile/become-organizer');
    await expect(page.getByText(/your details are under review/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /submit application/i })).toHaveCount(0);
    await expect(page.locator('input[placeholder="e.g. Himalayan Guides Ltd"]')).toHaveCount(0);

    // The account still holds exactly one organizer profile, still pending.
    const ctx = await pwRequest.newContext();
    const status = await ctx.get(`${API}/auth/organizer-status`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    const body = await status.json();
    await ctx.dispose();
    expect(body.isOrganizer).toBe(true);
    expect(body.isApproved).toBe(false);
  });
});
