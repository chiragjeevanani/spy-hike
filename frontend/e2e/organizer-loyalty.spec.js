import { test, expect } from '@playwright/test';

const API = `http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1`;
const auth = (token) => ({ Authorization: `Bearer ${token}` });
test.use({ viewport: { width: 480, height: 900 } });

async function data(response) {
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  return body;
}

async function earnedReward(page, request, threshold = 1) {
  const stamp = crypto.randomUUID();
  const admin = await data(await request.post(`${API}/auth/admin/login`, { data: { email: 'admin@findyourtrek.com', password: 'admin123' } }));
  await data(await request.patch(`${API}/admin/loyalty/config`, { headers: auth(admin.token), data: {
    organizer: { enabled: true, thresholdBookings: threshold },
  } }));
  const organizer = await data(await request.post(`${API}/auth/organizer/register`, { data: {
    name: 'Reward Guide', agencyName: `Reward Guides ${stamp}`, email: `reward-guide-${stamp}@example.com`,
    mobile: `9${Date.now().toString().slice(-9)}`, password: 'pass1234', govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  } }));
  await data(await request.patch(`${API}/admin/organizers/${organizer.account.id}/status`, { headers: auth(admin.token), data: { action: 'approve' } }));
  await data(await request.patch(`${API}/organizer/bank-details`, { headers: auth(organizer.token), data: { accountHolderName: 'Reward Guide', upiId: 'guide@okhdfcbank' } }));
  const date = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const { trip } = await data(await request.post(`${API}/organizer/trips`, { headers: auth(organizer.token), data: {
    name: `Reward Trek ${stamp}`, location: 'Manali', city: 'Manali', state: 'Himachal Pradesh',
    pricingTiers: [{ label: 'Solo', price: 1000 }], pickup: { location: 'Manali', price: 0 },
    startPoint: { lat: 32.24, lng: 77.18, label: 'Base' }, departureDates: [date],
    difficulty: 'Easy', durationDays: 3, maxGroupSize: 20, availableSeats: 20, category: 'Trekking',
    description: 'Server-earned organizer reward test', coverImage: 'https://example.com/trek.jpg', status: 'Published',
  } }));
  const customer = await data(await request.post(`${API}/auth/register`, { data: { name: 'Reward Hiker', email: `reward-hiker-${stamp}@example.com`, password: 'pass1234' } }));
  const { booking } = await data(await request.post(`${API}/bookings`, { headers: auth(customer.token), data: {
    tripId: trip.id, selectedDate: date, selections: [{ label: 'Solo', count: 1 }],
    travelers: [{ name: 'Reward Hiker', age: 25, gender: 'Male', emergencyContact: '9876543210' }],
  } }));
  await page.addInitScript((token) => localStorage.setItem('trekigo_auth_token', token), organizer.token);
  return { organizer, booking };
}

test('a server-earned organizer voucher appears on the dashboard', async ({ page, request }) => {
  await earnedReward(page, request);
  await page.goto('/organizer/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#btn-open-loyalty-dashboard')).toBeVisible();
  await expect(page.getByText('1/1')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('trekigo_loyalty_org_vouchers') || '[]').filter((voucher) => voucher.status === 'available').length)).toBe(1);
});

test('profile opens the server-earned organizer reward', async ({ page, request }) => {
  await earnedReward(page, request);
  await page.goto('/organizer/profile', { waitUntil: 'domcontentloaded' });
  await page.locator('#btn-open-loyalty-profile').click();
  await expect(page.getByText('Zero-Commission Credit Ready!')).toBeVisible();
  await expect(page.getByText('Milestone #1 Reward')).toBeVisible();
});

test('redeeming in the organizer UI zeroes commission on the server', async ({ page, request }) => {
  const { organizer, booking } = await earnedReward(page, request);
  await page.goto('/organizer/bookings', { waitUntil: 'domcontentloaded' });
  await page.locator(`#org-booking-row-${booking.id}`).click();
  await page.locator('#btn-apply-org-loyalty-reward').click();
  await expect(page.getByText(/₹0 \((?:Zero Fee )?Reward Applied\)/)).toBeVisible();
  const result = await data(await request.get(`${API}/organizer/bookings`, { headers: auth(organizer.token) }));
  const redeemed = result.bookings.find((item) => item.bookingId === booking.bookingId);
  expect(redeemed.commissionAmount).toBe(0);
  expect(redeemed.organizerRewardApplied).toBe(true);
});

test('below-threshold server progress does not mint an organizer voucher', async ({ page, request }) => {
  const { organizer } = await earnedReward(page, request, 1000);
  await page.goto('/organizer/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('1/1000')).toBeVisible();
  const result = await data(await request.get(`${API}/organizer/loyalty`, { headers: auth(organizer.token) }));
  expect(result.vouchers).toEqual([]);
});

test('a rejected redemption cannot mark commission waived in the browser', async ({ page, request }) => {
  const { organizer, booking } = await earnedReward(page, request);
  await page.route('**/redeem-reward', (route) => route.fulfill({ status: 503,
    json: { error: { message: 'Reward service unavailable' } } }));
  await page.goto('/organizer/bookings', { waitUntil: 'domcontentloaded' });
  await page.locator(`#org-booking-row-${booking.id}`).click();
  await page.locator('#btn-apply-org-loyalty-reward').click();
  await expect(page.getByText('Reward service unavailable')).toBeVisible();
  await expect(page.getByText(/₹0 \((?:Zero Fee )?Reward Applied\)/)).toHaveCount(0);
  const result = await data(await request.get(`${API}/organizer/bookings`, { headers: auth(organizer.token) }));
  const unchanged = result.bookings.find((item) => item.bookingId === booking.bookingId);
  expect(unchanged.commissionAmount).toBeGreaterThan(0);
  expect(unchanged.organizerRewardApplied).toBe(false);
});
