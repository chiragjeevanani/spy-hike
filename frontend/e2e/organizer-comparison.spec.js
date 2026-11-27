import { test, expect } from '@playwright/test';

const API = `http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1`;
let fixture;
async function json(response) {
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

test.beforeAll(async ({ request }) => {
  const stamp = Date.now();
  const admin = await json(await request.post(`${API}/auth/admin/login`, {
    data: { email: 'admin@findyourtrek.com', password: 'admin123' },
  }));
  const headers = { Authorization: `Bearer ${admin.token}` };
  const title = `Comparison Trek ${stamp}`;
  const { trek } = await json(await request.post(`${API}/admin/treks`, { headers, data: {
    title, location: 'Sankri, Uttarakhand', startingPoint: 'Sankri',
    state: 'Uttarakhand', city: 'Dehradun', difficulty: 'Moderate',
    durationDays: 4, durationDaysMax: 5, distanceKm: 20, elevationMeters: 3500,
    coverImage: 'https://example.com/trek.jpg', category: 'Trekking',
  } }));
  const departure = new Date();
  departure.setDate(departure.getDate() + 45);
  const date = departure.toISOString().slice(0, 10);
  const trips = [];
  const organizerHeaders = [];
  for (let i = 0; i < 3; i++) {
    const email = `compare-${stamp}-${i}@example.com`;
    await json(await request.post(`${API}/admin/organizers`, { headers, data: {
      name: `Guide ${i}`, email, password: 'pass1234', agencyName: `Compare Guides ${i}`,
      approved: true, govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
    } }));
    const org = await json(await request.post(`${API}/auth/organizer/login`, { data: { email, password: 'pass1234' } }));
    const orgHeaders = { Authorization: `Bearer ${org.token}` };
    organizerHeaders.push(orgHeaders);
    await json(await request.patch(`${API}/organizer/bank-details`, { headers: orgHeaders, data: {
      accountHolderName: `Guide ${i}`, bankName: 'HDFC Bank', accountNumber: '987654321012', ifsc: 'HDFC0001234',
    } }));
    const { trip } = await json(await request.post(`${API}/organizer/trips`, { headers: orgHeaders, data: {
      trekId: trek.id, name: title, location: trek.location,
      pricingTiers: [{ label: 'Solo', price: 5000 + i * 1000 }, { label: 'Group of 4+', price: 4500 + i * 1000 }],
      pickup: { location: i === 0 ? 'Dehradun' : 'Rishikesh', price: i * 200 },
      startPoint: { lat: 31.08, lng: 78.19, label: 'Sankri Base' },
      departureDates: [date], maxGroupSize: 12 + i, availableSeats: i === 2 ? 0 : 8 + i,
      description: `Trip run by guide ${i}`, status: 'Published',
      included: i === 0 ? ['Meals and tents'] : [], notIncluded: ['Personal equipment'],
      cancellationPolicy: [`Guide ${i} cancellation terms`],
      safetyGuidelines: ['Follow your trek leader'], highlights: ['Summit views'],
      itinerary: [{ day: 1, title: 'Arrive at base', description: 'Meet your guide' }],
      faqs: [{ question: 'Is equipment included?', answer: 'Bring your own boots' }],
    } }));
    trips.push(trip);
  }
  const customer = await json(await request.post(`${API}/auth/register`, { data: {
    name: 'Comparison Hiker', email: `compare-hiker-${stamp}@example.com`, password: 'pass1234',
  } }));
  fixture = { title, trek, trips, customer, organizerHeaders };
});

async function openOrganizers(page) {
  await page.addInitScript(({ customer }) => {
    localStorage.setItem('trekigo_user', JSON.stringify({ ...customer.account,
      isAuthenticated: true, isOnboarded: true, profileSetupComplete: true,
    }));
    localStorage.setItem('trekigo_auth_token', customer.token);
  }, fixture);
  await page.goto('/app', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem('trekigo_trips') || '[]').some((t) => t.id === id), fixture.trips[0].id)).toBe(true);
  await page.goto(`/app/trek/${fixture.trek.id}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#view-organisers-btn').click();
  await expect(page.getByRole('button', { name: 'Compare Compare Guides 0', exact: true })).toBeVisible();
}

test('a failed detail request can be retried without losing the selection', async ({ page }) => {
  await page.setViewportSize({ width: 425, height: 865 });
  await openOrganizers(page);
  const url = `${API}/trips/${fixture.trips[0].id}`;
  await page.route(url, (route) => route.fulfill({ status: 503, json: { message: 'Temporarily unavailable' } }));
  await page.getByRole('button', { name: 'Compare Compare Guides 0', exact: true }).click();
  await page.getByRole('button', { name: 'Compare Compare Guides 1', exact: true }).click();
  await page.getByRole('button', { name: 'Compare organizers', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare organizers' });
  await expect(dialog.getByRole('alert')).toContainText('Could not load the trip details');
  await page.unroute(url);
  await dialog.getByRole('button', { name: 'Retry comparison' }).click();
  await expect(dialog.getByRole('rowheader', { name: 'Starting price', exact: true })).toBeVisible();
  await expect(dialog.getByRole('columnheader', { name: /Compare Guides 0/ })).toBeVisible();
});


for (const viewport of [{ width: 425, height: 865 }, { width: 1280, height: 900 }]) {
  test(`compare real organizer offers at ${viewport.width}px, then open the selected trip`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript((dark) => localStorage.setItem('trekigo_darkmode_v2', JSON.stringify(dark)), viewport.width > 1000);
    await openOrganizers(page);
    const select = (i) => page.getByRole('button', { name: `Compare Compare Guides ${i}`, exact: true });
    await select(0).click();
    await expect(page.getByRole('button', { name: 'Compare organizers', exact: true })).toBeDisabled();
    // Filtering must preserve the selected organizer even when its card disappears.
    await page.locator('#organizer-search-input').fill('Compare Guides 1');
    await select(1).click();
    await page.locator('#organizer-search-input').fill('');
    await expect(select(2)).toBeDisabled();
    await page.getByRole('button', { name: 'Compare organizers', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Compare organizers' });
    await expect(dialog).toBeVisible();
    const row = (label) => dialog.getByRole('row').filter({ has: page.getByRole('rowheader', { name: label, exact: true }) });
    await expect(row('Starting price')).toContainText('₹5,000');
    await expect(row('Starting price')).toContainText('₹6,000');
    await expect(row('Pricing tiers (per person)')).toContainText('Group of 4+: ₹4,500');
    await expect(row('Pickup / boarding')).toContainText('Dehradun · ₹0');
    await expect(row('Pickup / boarding')).toContainText('Rishikesh · ₹200');
    await expect(row('Duration')).toContainText('4-5 days / 3-4 nights');
    await expect(row('Included')).toContainText('Meals and tents');
    await expect(row('Included')).toContainText('Not provided');
    await expect(row('Itinerary')).toContainText('Meet your guide');
    await expect(row('Cancellation policy')).toContainText('Guide 1 cancellation terms');
    await expect(row('FAQs')).toContainText('Bring your own boots');
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('comparison.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Compare organizers', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Remove Compare Guides 1 from comparison' }).click();
    await expect(select(2)).toBeEnabled();
    await select(2).click();
    await page.getByRole('button', { name: 'Compare organizers', exact: true }).click();
    await expect(row('Available seats')).toContainText('0');
    await dialog.getByRole('button', { name: 'Close comparison' }).click();
    await page.getByRole('button', { name: 'Clear comparison' }).click();
    await expect(page.getByLabel('Comparison selection')).toHaveCount(0);
    await select(0).click();
    await select(1).click();
    await page.getByRole('button', { name: 'Compare organizers', exact: true }).click();
    await dialog.getByRole('button', { name: 'View trip details for Compare Guides 1' }).click();
    await expect(page).toHaveURL(new RegExp(`/app/trip/${fixture.trips[1].id}$`));
    await expect(page.getByText('Batch Pricing', { exact: true })).toBeVisible();
  });
}

test('one organizer explains comparison availability, and zero offers retains the opening-soon screen', async ({ page, request }) => {
  for (const i of [1, 2]) {
    await json(await request.patch(`${API}/organizer/trips/${fixture.trips[i].id}/status`, {
      headers: fixture.organizerHeaders[i], data: { status: 'Paused' },
    }));
  }
  await openOrganizers(page);
  await expect(page.getByText('Comparison will be available when another organizer offers this trek.')).toBeVisible();
  await page.getByRole('button', { name: 'Compare Compare Guides 0', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Compare organizers', exact: true })).toBeDisabled();
  await json(await request.patch(`${API}/organizer/trips/${fixture.trips[0].id}/status`, {
    headers: fixture.organizerHeaders[0], data: { status: 'Paused' },
  }));
  await page.goto('/app', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem('trekigo_trips') || '[]').some((t) => t.id === id), fixture.trips[0].id)).toBe(false);
  await page.goto('/app/explore', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Search treks or locations…').fill(fixture.title);
  await page.locator('h5', { hasText: fixture.title }).first().click();
  await page.locator('#view-organisers-btn').click();
  await expect(page.getByText('Opening soon', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare organizers', exact: true })).toHaveCount(0);
});
