import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 460, height: 950 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('trekigo_org_walkthrough_completed', 'true'));
});

test('OTP login rejects wrong codes; resend dispatches another API request', async ({ page }) => {
  await page.clock.install();
  const requests = [];
  page.on('request', req => {
    if (req.url().endsWith('/auth/otp/request')) requests.push(req.postDataJSON());
  });
  await page.goto('/app/login');
  await page.getByRole('button', { name: 'Use Mobile OTP' }).click();
  await page.locator('input[type="tel"]').fill('9876543216');
  await page.locator('#btn-send-otp-submit').click();
  await expect(page.getByPlaceholder('Enter 6-digit OTP')).toBeVisible();
  expect(requests).toEqual([{ mobile: '9876543216' }]);
  await page.getByPlaceholder('Enter 6-digit OTP').fill('000000');
  await page.locator('#btn-verify-otp-submit').click();
  await expect(page.getByText('Incorrect OTP', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('trekigo_auth_token'))).toBeNull();
  const resend = page.getByRole('button', { name: /^Resend OTP/ });
  await expect(resend).toHaveText('Resend OTP in 45s');
  await page.clock.fastForward(45_000);
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(resend).toHaveText('Resend OTP in 45s');
  await page.getByPlaceholder('Enter 6-digit OTP').fill('123456');
  await page.locator('#btn-verify-otp-submit').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('trekigo_auth_token'))).toBeTruthy();
});

async function assertResend(page, requests, input) {
  const resend = page.getByRole('button', { name: /^Resend OTP/ });
  await expect(resend).toHaveText('Resend OTP in 45s');
  await expect(resend).toBeDisabled();
  await input.fill('000000');
  await page.clock.fastForward(44_000);
  await expect(resend).toBeDisabled();
  expect(requests.length).toBe(1);
  await page.clock.fastForward(1_000);
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(resend).toHaveText('Resend OTP in 45s');
  await expect(input).toHaveValue('');
  expect(requests[1]).toEqual(requests[0]);
}

function trackSms(page) {
  const requests = [];
  page.on('request', req => {
    if (req.url().endsWith('/auth/otp/request')) requests.push(req.postDataJSON());
  });
  return requests;
}

test('traveller signup can resend after 45 seconds and still register', async ({ page }) => {
  await page.clock.install();
  const requests = trackSms(page);
  await page.addInitScript(() => localStorage.setItem('trekigo_user', JSON.stringify({ isOnboarded: true, isAuthenticated: false })));
  await page.goto('/app/register');
  await page.fill('#reg-name', 'Resend Traveller');
  await page.fill('#reg-email', `resend-${Date.now()}@example.com`);
  await page.fill('#reg-password', 'Pass1234');
  await page.getByRole('button', { name: 'Continue to Mobile Setup' }).click();
  await page.fill('#reg-phone', `98${Date.now().toString().slice(-8)}`);
  await page.getByRole('button', { name: 'Send OTP', exact: true }).click();
  const input = page.locator('#reg-otp');
  await expect(input).toBeVisible();
  await assertResend(page, requests, input);
  await input.fill('123456');
  await page.getByRole('button', { name: 'Verify & Sign Up' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('trekigo_auth_token'))).toBeTruthy();
});

test('organizer signup can resend after 45 seconds and verify', async ({ page }) => {
  await page.clock.install();
  const requests = trackSms(page);
  await page.addInitScript(() => localStorage.setItem('trekigo_org_user', JSON.stringify({ isOnboarded: true, isAuthenticated: false, isApproved: false, isPendingApproval: false })));
  await page.goto('/organizer/register', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('10-digit number').fill('9876543217');
  await page.getByRole('button', { name: 'Send OTP', exact: true }).click();
  const input = page.getByPlaceholder('6-digit OTP', { exact: true });
  await expect(input).toBeVisible();
  await assertResend(page, requests, input);
  await input.fill('123456');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
});

test('password reset can resend after 45 seconds', async ({ page }) => {
  await page.clock.install();
  const requests = trackSms(page);
  await page.goto('/app/login');
  await page.getByRole('button', { name: 'Forgot Password?' }).click();
  await page.locator('input[type="tel"]').fill('9876543210');
  await page.getByRole('button', { name: 'Send Verification Code', exact: true }).click();
  await assertResend(page, requests, page.getByPlaceholder('Enter 6-digit OTP'));
});

test('a failed resend can be retried without starting another cooldown', async ({ page }) => {
  await page.clock.install();
  let sends = 0;
  await page.route('**/auth/otp/request', route => {
    sends++;
    return sends === 2
      ? route.fulfill({ status: 502, json: { error: { message: 'Could not send OTP. Please try again.' } } })
      : route.fulfill({ json: { sent: true, retryAfter: 45 } });
  });
  await page.goto('/app/login');
  await page.getByRole('button', { name: 'Use Mobile OTP' }).click();
  await page.locator('input[type="tel"]').fill('9876543218');
  await page.locator('#btn-send-otp-submit').click();
  const resend = page.getByRole('button', { name: /^Resend OTP/ });
  await expect(resend).toHaveText('Resend OTP in 45s');
  await page.clock.fastForward(45_000);
  await resend.click();
  await expect(page.getByText('Could not send OTP. Please try again.', { exact: true }).first()).toBeVisible();
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect(resend).toBeDisabled();
  expect(sends).toBe(3);
});
