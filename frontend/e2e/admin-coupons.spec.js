import { test, expect, request as pwRequest } from '@playwright/test';

// Admin coupon creation, and the session bug that blocked it.
//
// All three SPAs used to share ONE localStorage JWT (`trekigo_auth_token`)
// while each kept its own separate "am I signed in" flag. Signing into the
// customer app anywhere in the same browser therefore took over the admin's
// token, and the console — still rendering as signed in — got a 403
// "You do not have access to this resource" on every write. Coupons is where
// it showed up first, because creating one is the first thing that fails loudly
// (the list silently rendered as empty).

const API = 'http://localhost:4000/api/v1';
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com',
  password: process.env.ADMIN_PASSWORD || 'password123',
};

async function adminLogin(page) {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
}

async function createCoupon(page, code) {
  await page.goto('/admin/coupons');
  await page.getByRole('button', { name: /Create Coupon/i }).first().click();
  await page.fill('form input[type=text]', code);
  await page.locator('form input[type=number]').first().fill('20');
  await page.getByRole('button', { name: /^(Create|Save)/i }).last().click();
}

// Signs a real customer in through the API and drops the JWT into the browser
// the way the traveller app would.
async function customerSignsInHere(page) {
  const ctx = await pwRequest.newContext();
  const stamp = Date.now();
  const email = `e2e-couponcust-${stamp}@example.com`;
  const reg = await ctx.post(`${API}/auth/register`, {
    data: { name: 'E2E Coupon Cust', email, password: 'pass1234', mobile: `6${String(stamp).slice(-9)}` },
  });
  expect(reg.ok(), `register failed: ${await reg.text()}`).toBeTruthy();
  const { token } = await reg.json();
  await ctx.dispose();

  await page.evaluate((t) => {
    localStorage.setItem('trekigo_auth_token', t);
    localStorage.setItem('trekigo_user', JSON.stringify({ isAuthenticated: true, isOnboarded: true }));
  }, token);
  return token;
}

test.describe('Admin coupons', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('an admin can create a platform coupon', async ({ page }) => {
    await adminLogin(page);
    const code = `E2ECPN${String(Date.now()).slice(-6)}`;
    await createCoupon(page, code);

    await expect(page.getByText('Coupon created.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(code)).toBeVisible();
  });

  test('a customer signing in elsewhere in the browser cannot break admin writes', async ({ page }) => {
    await adminLogin(page);
    await customerSignsInHere(page);

    // The admin console keeps its own token slot, so this still goes through.
    const code = `E2ESHARED${String(Date.now()).slice(-5)}`;
    await createCoupon(page, code);

    await expect(page.getByText(/do not have access to this resource/i)).toHaveCount(0);
    await expect(page.getByText('Coupon created.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(code)).toBeVisible();
  });

  test('a console left signed in on a dead token lands on login, not a 403 on save', async ({ page }) => {
    await adminLogin(page);

    // The flag says signed in; the credentials are gone. Previously the panel
    // rendered in full and only failed at the point of saving.
    await page.evaluate(() => localStorage.removeItem('trekigo_admin_auth_token'));
    await page.goto('/admin/coupons');

    await expect(page.getByText(/session has ended/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15000 });
  });

  test('a failed coupon load reports the error instead of showing an empty table', async ({ page }) => {
    await adminLogin(page);
    await page.route(`${API}/admin/coupons`, (route) => (
      route.request().method() === 'GET'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Boom' } }) })
        : route.continue()
    ));
    await page.goto('/admin/coupons');

    await expect(page.getByText('Boom')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('No coupons matching criteria found.')).toHaveCount(0);
  });
});
