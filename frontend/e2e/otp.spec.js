import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 460, height: 950 } });

test('OTP login rejects wrong codes; resend dispatches another API request', async ({ page }) => {
  test.setTimeout(60_000);
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
  const resend = page.getByRole('button', { name: 'Resend OTP', exact: true });
  await expect(resend).toBeDisabled();
  await expect(resend).toBeEnabled({ timeout: 35_000 });
  await resend.click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(resend).toBeDisabled();
  await page.getByPlaceholder('Enter 6-digit OTP').fill('123456');
  await page.locator('#btn-verify-otp-submit').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('trekigo_auth_token'))).toBeTruthy();
});
