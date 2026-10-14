import { test, expect } from '@playwright/test';

const API = `http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1`;
const auth = (token) => ({ Authorization: `Bearer ${token}` });
async function body(res) { expect(res.ok(), await res.text()).toBeTruthy(); return res.json(); }

test('organizer renews an expired listing by adding dates, and the same trip returns to the hiker app', async ({ page, request, browser }) => {
  await page.setViewportSize({ width: 425, height: 865 });
  const stamp = Date.now();
  const admin = await body(await request.post(`${API}/auth/admin/login`, { data: { email: 'admin@findyourtrek.com', password: 'admin123' } }));
  const org = await body(await request.post(`${API}/auth/organizer/register`, { data: {
    name: 'Renewal Guide', email: `renewal-${stamp}@example.com`, password: 'pass1234', agencyName: 'Renewal Guides',
    govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
  } }));
  await body(await request.patch(`${API}/admin/organizers/${org.account.id}/status`, { headers: auth(admin.token), data: { action: 'approve' } }));
  org.account = (await body(await request.patch(`${API}/organizer/bank-details`, { headers: auth(org.token), data: {
    accountHolderName: 'Renewal Guide', bankName: 'HDFC Bank', accountNumber: '987654321012', ifsc: 'HDFC0001234',
  } }))).organizer;
  const title = `Renewable Trek ${stamp}`;
  const { trek } = await body(await request.post(`${API}/admin/treks`, { headers: auth(admin.token), data: {
    title, location: 'Sankri', startingPoint: 'Sankri Base', city: 'Dehradun', state: 'Uttarakhand', difficulty: 'Easy',
    durationDays: 3, distanceKm: 12, category: 'Trekking', coverImage: 'https://example.com/trek.jpg',
  } }));
  const oldDate = new Date(); oldDate.setDate(oldDate.getDate() - 3);
  const original = { trekId: trek.id, pricingTiers: [{ label: 'Solo', price: 4500 }], pickup: { location: 'Dehradun', price: 4500 },
    startPoint: { lat: 31.08, lng: 78.19, label: 'Sankri Base' }, departureDates: [oldDate.toISOString().slice(0, 10)],
    maxGroupSize: 12, availableSeats: 10, description: 'This description must survive expiry and renewal.',
    included: ['Meals and tents'], itinerary: [{ day: 1, title: 'Arrive at base', description: 'Meet the guide' }],
    galleryImages: ['https://example.com/gallery.jpg'], status: 'Published' };
  const { trip } = await body(await request.post(`${API}/organizer/trips`, { headers: auth(org.token), data: original }));
  expect(trip.status).toBe('Paused');
  expect(trip.autoPausedReason).toBe('departures_expired');
  const hidden = await body(await request.get(`${API}/trips?search=${encodeURIComponent(title)}`));
  expect(hidden.trips).toEqual([]);
  await page.addInitScript((org) => {
    localStorage.setItem('trekigo_org_user', JSON.stringify(org.account));
    localStorage.setItem('trekigo_auth_token', org.token);
  }, org);
  await page.goto('/organizer/trips', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Automatically paused: all departure dates have passed/)).toBeVisible();
  await page.getByRole('button', { name: 'Add dates', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Edit Trip' })).toBeVisible();
  await page.getByRole('button', { name: /Pricing & Dates/ }).click();
  await expect(page.getByPlaceholder('₹ Price').first()).toHaveValue('4500');
  await page.getByRole('button', { name: 'Select Batch Dates', exact: true }).click();
  const picker = page.locator('#org-batch-date-sheet');
  await picker.getByRole('button', { name: 'Next month' }).click();
  const newDate = await page.evaluate(() => {
    const next = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
  });
  await picker.getByRole('button', { name: '1', exact: true }).click();
  await page.locator('#btn-done-batch-date-picker').click();
  await page.getByRole('button', { name: /Trip Details/ }).click();
  await expect(page.getByPlaceholder('Describe the trek experience...')).toHaveValue(original.description);
  const saved = page.waitForResponse((res) => res.url().endsWith(`/organizer/trips/${trip.id}`) && res.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save & Reactivate' }).click();
  const renewed = await body(await saved);
  expect(renewed.trip).toMatchObject({ id: trip.id, status: 'Published', autoPausedReason: '', description: original.description,
    included: original.included, itinerary: original.itinerary, galleryImages: original.galleryImages });
  expect(renewed.trip.departureDates).toContain(newDate);
  await expect(page.getByRole('heading', { name: 'Expeditions & Treks' })).toBeVisible();
  await expect(page.getByText('Automatically paused:', { exact: false })).toHaveCount(0);
  const listings = await body(await request.get(`${API}/organizer/trips`, { headers: auth(org.token) }));
  expect(listings.trips).toHaveLength(1);
  expect(listings.trips[0].id).toBe(trip.id);

  const customer = await body(await request.post(`${API}/auth/register`, { data: { name: 'Renewal Hiker', email: `renewal-hiker-${stamp}@example.com`, password: 'pass1234' } }));
  const context = await browser.newContext({ viewport: { width: 425, height: 865 } });
  try {
    await context.addInitScript((customer) => {
      localStorage.setItem('trekigo_user', JSON.stringify({ ...customer.account, isAuthenticated: true, isOnboarded: true, profileSetupComplete: true }));
      localStorage.setItem('trekigo_auth_token', customer.token);
    }, customer);
    const hiker = await context.newPage();
    await hiker.goto('/app/explore', { waitUntil: 'domcontentloaded' });
    await hiker.getByPlaceholder('Search treks or locations…').fill(title);
    await hiker.getByRole('heading', { name: title, exact: true }).click();
    await hiker.locator('#view-organisers-btn').click();
    await hiker.getByText('View Details', { exact: false }).first().click();
    await expect(hiker).toHaveURL(new RegExp(`/app/trip/${trip.id}$`));
    await expect(hiker.getByText('Batch Pricing', { exact: true })).toBeVisible();
  } finally { await context.close(); }
});
