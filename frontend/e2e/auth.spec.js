import { test, expect } from '@playwright/test';

// Phase 1 — Auth & identity. Drives the real login/registration flows against
// the backend API (started by playwright.config's webServer against an
// in-memory Mongo seeded with the demo accounts).

const DEMO_CUSTOMER = { email: 'chiragjeevanani333@gmail.com', password: 'trekigo123' };
const DEMO_ADMIN = { email: 'admin@trekigo.com', password: 'admin123' };

// A fresh context shows the onboarding carousel before the login form. Wait
// for whichever appears first; if it's onboarding, skip it, then wait for the
// email field so the caller can drive the form.
async function dismissOnboarding(page) {
  const skip = page.getByText('Skip Onboarding');
  const email = page.locator('input[type="email"]');
  await expect(skip.or(email).first()).toBeVisible({ timeout: 10000 });
  if (await skip.count()) {
    await skip.first().click();
  }
  await expect(email).toBeVisible({ timeout: 10000 });
}

test.describe('Phase 1 — Customer auth', () => {
  test.use({ viewport: { width: 460, height: 950 } });

  test('demo customer logs in and lands on the home feed with a stored JWT', async ({ page }) => {
    await page.goto('/app/login');
    await dismissOnboarding(page);
    await page.fill('input[type="email"]', DEMO_CUSTOMER.email);
    await page.fill('input[type="password"]', DEMO_CUSTOMER.password);
    await page.click('#btn-login-email-submit');

    await expect(page.getByText(/Find your next/i)).toBeVisible({ timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('trekigo_auth_token'));
    expect(token).toBeTruthy();
  });

  test('new customer must verify mobile via OTP before signing up', async ({ page }) => {
    const email = `e2e-hiker-${Date.now()}@example.com`;
    // Seed an onboarded-but-unauthenticated session so /app/register shows the
    // registration form directly (same pattern as the organizer spec).
    await page.addInitScript(() => {
      localStorage.setItem('trekigo_user', JSON.stringify({ isOnboarded: true, isAuthenticated: false }));
    });
    await page.goto('/app/register');
    await expect(page.getByText('Register Account')).toBeVisible({ timeout: 10000 });

    await page.fill('input[placeholder="Chirag Jeevanani"]', 'E2E Hiker');
    await page.fill('input[placeholder="+91 98765 43210"]', '9876543210');
    await page.fill('input[placeholder="chiragjeevanani333@gmail.com"]', email);
    await page.fill('input[placeholder="Minimum 6 characters"]', 'pass1234');

    // Sign-up is blocked until the mobile is verified.
    await expect(page.locator('#btn-register-submit')).toBeDisabled();

    await page.click('#btn-reg-send-otp');
    await page.fill('input[placeholder="Enter OTP (123456)"]', '123456');
    await page.click('#btn-reg-verify-otp');
    await expect(page.getByText('Verified', { exact: true })).toBeVisible({ timeout: 10000 });

    await expect(page.locator('#btn-register-submit')).toBeEnabled();
    await page.click('#btn-register-submit');

    // Registration succeeded → JWT stored for the new account.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('trekigo_auth_token'))).not.toBeNull();
  });

  test('wrong credentials show an error and do not authenticate', async ({ page }) => {
    await page.goto('/app/login');
    await dismissOnboarding(page);
    await page.fill('input[type="email"]', 'nobody@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('#btn-login-email-submit');

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('trekigo_auth_token'));
    expect(token).toBeFalsy();
  });
});

test.describe('Phase 1 — Admin auth', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('demo admin logs in and reaches the dashboard', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', DEMO_ADMIN.email);
    await page.fill('input[type="password"]', DEMO_ADMIN.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('trekigo_auth_token'));
    expect(token).toBeTruthy();
  });

  test('bad admin credentials are rejected', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', DEMO_ADMIN.email);
    await page.fill('input[type="password"]', 'nope');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid admin credentials/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Phase 1 — Organizer registration → pending approval', () => {
  test.use({ viewport: { width: 460, height: 950 } });

  test('new organizer registers and lands on the pending-approval screen (no self-approve)', async ({ page }) => {
    const email = `e2e-org-${Date.now()}@example.com`;

    // Mark organizer onboarding done (unauthenticated) so /organizer/register
    // shows the registration form directly — same localStorage-seeding pattern
    // the other specs use, avoiding the fragile onboarding-redirect race.
    await page.addInitScript(() => {
      localStorage.setItem(
        'trekigo_org_user',
        JSON.stringify({ isOnboarded: true, isAuthenticated: false, isApproved: false, isPendingApproval: false }),
      );
    });
    await page.goto('/organizer/register');
    await expect(page.locator('input[placeholder="Your full name"]')).toBeVisible({ timeout: 10000 });

    // Step 1 — personal info + mobile OTP verification (required to continue)
    await page.fill('input[placeholder="Your full name"]', 'E2E Org Owner');
    await page.fill('input[placeholder="your@email.com"]', email);
    await page.fill('input[placeholder="+91 XXXXX XXXXX"]', '9876543210');
    await page.fill('input[placeholder="Min 8 characters"]', 'pass1234');
    await page.getByRole('button', { name: 'Send OTP' }).click();
    await page.fill('input[placeholder="Enter OTP (123456)"]', '123456');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByText('Verified', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2 — agency details
    await page.fill('input[placeholder="e.g. Himalayan Guides Ltd"]', 'E2E Trails');
    await page.fill('input[placeholder="https://instagram.com/youragency"]', 'https://instagram.com/e2etrails');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3 — verification
    await page.fill('input[placeholder="Enter your ID number"]', 'ABCD-1234-5678');
    await page.getByRole('button', { name: /submit application/i }).click();

    await expect(page.getByText(/Application Under Review/i)).toBeVisible({ timeout: 10000 });
    // The old "auto-approves in demo mode" caption must be gone.
    await expect(page.getByText(/auto-approves in demo mode/i)).toHaveCount(0);
  });
});
