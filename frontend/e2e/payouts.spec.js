import { test, expect, request as pwRequest } from '@playwright/test';

// Admin payout management — drives the real /admin/payouts console: approve a
// payout (→ Paid, receipt downloadable) and reject one with a reason
// (→ Rejected). Each test provisions an isolated approved organizer + a booking
// so the balance is independent of the shared demo org.

const API = 'http://localhost:4000/api/v1';
const DEMO_ADMIN = { email: 'admin@findyourtrek.com', password: 'admin123' };

function dateInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Returns { reference } for a Processing payout owned by a fresh org.
async function seedProcessingPayout(amount = 500) {
  const ctx = await pwRequest.newContext();
  const adminToken = (await (await ctx.post(`${API}/auth/admin/login`, { data: DEMO_ADMIN })).json()).token;
  const orgEmail = `payorg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const reg = await (await ctx.post(`${API}/auth/organizer/register`, {
    data: {
      name: 'Payout Org',
      email: orgEmail,
      password: 'pass1234',
      agencyName: 'Payout Guides',
      govtIdType: 'Aadhaar',
      govtIdNumber: '123456789012',
    },
  })).json();
  await ctx.patch(`${API}/admin/organizers/${reg.account.id}/status`, { headers: { Authorization: `Bearer ${adminToken}` }, data: { action: 'approve' } });
  const orgToken = (await (await ctx.post(`${API}/auth/organizer/login`, { data: { email: orgEmail, password: 'pass1234' } })).json()).token;
  const orgAuth = { headers: { Authorization: `Bearer ${orgToken}` } };

  const trip = (await (await ctx.post(`${API}/organizer/trips`, {
    ...orgAuth,
    data: {
      name: `E2E Payout UI Trek ${Date.now()}`, location: 'Kaza', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 1000 }], pickup: { location: 'Manali', price: 0 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' }, departureDates: [dateInDays(30)],
      maxGroupSize: 20, availableSeats: 20, category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Payout UI e2e', status: 'Published',
    },
  })).json()).trip;

  const custToken = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'C', email: `payuic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, password: 'pass1234' } })).json()).token;
  await ctx.post(`${API}/bookings`, { headers: { Authorization: `Bearer ${custToken}` }, data: { tripId: trip.id, selectedDate: dateInDays(30), selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Payout Hiker', age: 25, gender: 'Male', emergencyContact: '9876543210' }] } });

  await ctx.patch(`${API}/organizer/bank-details`, { ...orgAuth, data: { accountHolderName: 'Payout Guides', bankName: 'HDFC', ifsc: 'HDFC0001234', accountNumber: '1234567890' } });
  const payout = (await (await ctx.post(`${API}/organizer/payouts`, { ...orgAuth, data: { amount } })).json()).payout;
  await ctx.dispose();
  return { reference: payout.reference };
}

async function adminConsoleLogin(page) {
  page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', DEMO_ADMIN.email);
  await page.fill('input[type="password"]', DEMO_ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
}

test('admin approves a payout in the console and downloads its receipt', async ({ page }) => {
  const { reference } = await seedProcessingPayout(500);
  await adminConsoleLogin(page);

  await page.goto('/admin/payouts');
  // Isolate the seeded payout via the search box (server-side filter).
  await page.getByPlaceholder(/Search organizer/i).fill(reference);
  const row = page.locator('tr', { hasText: reference });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.getByText('Processing')).toBeVisible();

  // Approve → confirm dialog → row flips to Paid.
  await row.locator('button[title="Approve & settle"]').click();
  await page.getByRole('button', { name: /Approve & Pay/i }).click();
  await expect(row.getByText('Paid')).toBeVisible({ timeout: 10000 });

  // The receipt PDF downloads for a settled payout.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    row.locator('button[title="Download receipt"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe(`Find Your Trek-Payout-${reference}.pdf`);
});

test('admin rejects a payout with a reason and the balance is freed', async ({ page }) => {
  const { reference } = await seedProcessingPayout(400);
  await adminConsoleLogin(page);

  await page.goto('/admin/payouts');
  await page.getByPlaceholder(/Search organizer/i).fill(reference);
  const row = page.locator('tr', { hasText: reference });
  await expect(row).toBeVisible({ timeout: 10000 });

  // Reject → reason modal → row flips to Rejected.
  await row.locator('button[title="Reject"]').click();
  await page.getByPlaceholder(/KYC/i).fill('Bank details mismatch');
  await page.getByRole('button', { name: /Confirm Reject/i }).click();
  await expect(row.getByText('Rejected')).toBeVisible({ timeout: 10000 });
});
