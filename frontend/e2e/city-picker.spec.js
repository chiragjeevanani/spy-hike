import { test, expect, request as pwRequest } from '@playwright/test';

// City selection, end to end against real catalog data.
//
// The picker used to offer ten hardcoded towns and nothing else: a customer
// whose city wasn't on that list could neither find the city nor the treks in
// it. These specs assert the replacement is driven by the catalog — every city
// offered has treks, and picking one shows them.

const API = 'http://localhost:4000/api/v1';
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com',
  password: process.env.ADMIN_PASSWORD || 'password123',
};

const COVER = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80';

// Cities deliberately absent from the old hardcoded POPULAR_LOCATIONS list.
// "Dharamshala" is seeded with the trip's city/state fields left BLANK, so it
// only exists inside `location` — the case that used to make a trek
// unreachable by city entirely.
const SEED = [
  { trek: 'E2E Kumara Parvatha', location: 'Kukke Subramanya, Karnataka', state: 'Karnataka', city: 'Bengaluru', lat: 12.97, lng: 77.59 },
  { trek: 'E2E Skandagiri Night Trek', location: 'Chikkaballapur, Karnataka', state: 'Karnataka', city: 'Bengaluru', lat: 13.4, lng: 77.7 },
  { trek: 'E2E Rajgad Fort Trek', location: 'Pune, Maharashtra', state: 'Maharashtra', city: 'Pune', lat: 18.52, lng: 73.85 },
  { trek: 'E2E Triund Ridge Walk', location: 'Dharamshala, Himachal Pradesh', state: '', city: '', lat: 32.21, lng: 76.32 },
];

let seeded = false;

// Mirrors the backend's slugify for trek ids, so a re-run can adopt the trek a
// previous run already created instead of tripping over the 409.
const slugOf = (title) => title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Publishes the seed catalog once per run: an approved organizer plus one
// published offer per trek.
async function seedCatalog() {
  if (seeded) return;
  const ctx = await pwRequest.newContext();

  const adminLogin = await ctx.post(`${API}/auth/admin/login`, { data: ADMIN });
  expect(adminLogin.ok(), `admin login failed for ${ADMIN.email}: ${await adminLogin.text()}`).toBeTruthy();
  const adminHeaders = { Authorization: `Bearer ${(await adminLogin.json()).token}` };

  const stamp = Date.now();
  const orgEmail = `e2e-cityorg-${stamp}@example.com`;
  const orgRes = await ctx.post(`${API}/admin/organizers`, {
    headers: adminHeaders,
    data: {
      name: 'E2E City Org', email: orgEmail, mobile: `9${String(stamp).slice(-9)}`,
      password: 'pass1234', agencyName: 'E2E City Treks', approved: true,
      govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
    },
  });
  expect(orgRes.ok(), `organizer create failed: ${await orgRes.text()}`).toBeTruthy();

  const orgLogin = await ctx.post(`${API}/auth/organizer/login`, { data: { email: orgEmail, password: 'pass1234' } });
  const orgHeaders = { Authorization: `Bearer ${(await orgLogin.json()).token}` };

  for (const s of SEED) {
    const trekRes = await ctx.post(`${API}/admin/treks`, {
      headers: adminHeaders,
      data: {
        title: s.trek, location: s.location, startingPoint: s.location,
        state: s.state, city: s.city, difficulty: 'Moderate',
        durationDays: 3, distanceKm: 20, elevationMeters: 1200,
        coverImage: COVER, category: 'Trekking', description: 'City picker e2e trek.',
      },
    });
    // 409 just means a previous run in this same backend already made it.
    expect(trekRes.ok() || trekRes.status() === 409, `trek create failed: ${await trekRes.text()}`).toBeTruthy();
    const trekId = trekRes.ok() ? (await trekRes.json()).trek.id : slugOf(s.trek);

    const tripRes = await ctx.post(`${API}/organizer/trips`, {
      headers: orgHeaders,
      data: {
        name: s.trek, trekId, location: s.location, state: s.state, city: s.city,
        pricingTiers: [{ label: 'Solo', price: 4999 }],
        pickup: { location: s.location.split(',')[0], price: 300 },
        startPoint: { lat: s.lat, lng: s.lng, label: `${s.location.split(',')[0]} Base` },
        departureDates: ['2026-11-10', '2026-11-24'],
        difficulty: 'Moderate', durationDays: 3, maxGroupSize: 15, availableSeats: 15,
        category: 'Trekking', coverImage: COVER,
        description: 'City picker e2e trek.', status: 'Published',
      },
    });
    expect(tripRes.ok(), `trip create failed: ${await tripRes.text()}`).toBeTruthy();
  }

  await ctx.dispose();
  seeded = true;
}

// Explore sits behind the auth gate, so each run needs a real signed-in
// traveller. Registered through the API and seeded into localStorage the way a
// login would, skipping the sign-in form.
let customer = null;
async function getCustomer() {
  if (customer) return customer;
  const ctx = await pwRequest.newContext();
  const stamp = Date.now();
  const email = `e2e-citycust-${stamp}@example.com`;
  const res = await ctx.post(`${API}/auth/register`, {
    data: { name: 'E2E City Hiker', email, password: 'pass1234', mobile: `8${String(stamp).slice(-9)}` },
  });
  expect(res.ok(), `customer register failed: ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  customer = { account: body.account, token: body.token };
  return customer;
}

async function openApp(page, path = '/app') {
  const { account, token } = await getCustomer();
  // Seeded once, not on every navigation: the chosen city also lives in
  // localStorage, and re-running the seed would wipe it between page loads.
  await page.addInitScript((seed) => {
    if (localStorage.getItem('trekigo_auth_token')) return;
    localStorage.setItem('trekigo_user', JSON.stringify({
      ...seed.account,
      isAuthenticated: true,
      isOnboarded: true,
      profileSetupComplete: true,
      rememberMe: true,
    }));
    localStorage.setItem('trekigo_auth_token', seed.token);
  }, { account, token });
  await page.goto(path);
}

// Opens the picker from the Home header chip — the entry point that exists
// regardless of which Explore header is shipped.
async function openCityPicker(page) {
  await page.click('#btn-location');
  await expect(page.getByText('Select your city')).toBeVisible({ timeout: 10000 });
}

test.describe('City selection', () => {
  test.use({ viewport: { width: 460, height: 950 } });
  test.beforeEach(async () => { await seedCatalog(); });

  test('the picker lists real catalog cities, and picking one shows that city’s treks', async ({ page }) => {
    await openApp(page);
    await openCityPicker(page);

    // Bengaluru is not in any hardcoded list — it exists because two treks
    // there do — and it reports its real trek count.
    const bengaluru = page.getByRole('button', { name: /Bengaluru/ }).last();
    await expect(bengaluru).toBeVisible({ timeout: 10000 });
    await expect(bengaluru).toContainText('2 treks');

    await bengaluru.click();

    // Picker closes, the chip switches city, and Explore shows exactly that
    // city's treks.
    await expect(page.getByText('Select your city')).toHaveCount(0);
    await expect(page.locator('#btn-location')).toContainText('Bengaluru');

    // The choice carries into Explore, which shows exactly that city's treks.
    await openApp(page, '/app/explore');
    await expect(page.getByText('E2E Kumara Parvatha').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('E2E Skandagiri Night Trek').first()).toBeVisible();
    // A different city's trek must not leak through.
    await expect(page.getByText('E2E Rajgad Fort Trek')).toHaveCount(0);
  });

  test('search finds a city whose trips never tagged a city field', async ({ page }) => {
    await openApp(page);
    await openCityPicker(page);

    // Dharamshala lives only inside the trek's `location` string; the picker
    // still surfaces it, and selecting it returns the trek.
    await page.fill('#input-city-search', 'dharam');
    const match = page.getByRole('button', { name: /Dharamshala/ });
    await expect(match).toBeVisible({ timeout: 10000 });
    await match.click();

    await expect(page.locator('#btn-location')).toContainText('Dharamshala');
    await openApp(page, '/app/explore');
    await expect(page.getByText('E2E Triund Ridge Walk').first()).toBeVisible({ timeout: 15000 });
  });

  test('a city with no treks is not offered, and says so honestly', async ({ page }) => {
    await openApp(page);
    await openCityPicker(page);

    await page.fill('#input-city-search', 'Kochi');
    await expect(page.getByText(/No treks in .Kochi. yet/i)).toBeVisible({ timeout: 10000 });

    // The escape hatch clears the filter rather than stranding the customer.
    await page.getByRole('button', { name: /Browse all of India/i }).click();
    await expect(page.locator('#btn-location')).toContainText('India');
    await openApp(page, '/app/explore');
    await expect(page.getByText('E2E Rajgad Fort Trek').first()).toBeVisible({ timeout: 15000 });
  });

  test('a GPS fix far from every trekking city snaps to the nearest covered city', async ({ page, context }) => {
    // Mysuru — no treks of its own, ~140km from Bengaluru, which has two.
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 12.2958, longitude: 76.6394 });
    await openApp(page);
    await openCityPicker(page);

    await page.click('#btn-use-current-location');

    await expect(page.locator('#btn-location')).toContainText('Bengaluru', { timeout: 20000 });
    await openApp(page, '/app/explore');
    await expect(page.getByText('E2E Kumara Parvatha').first()).toBeVisible({ timeout: 15000 });
  });

  test('Explore has its own city chip, so switching city needs no empty result set', async ({ page }) => {
    await openApp(page, '/app/explore');
    await page.click('#btn-location-explore');
    await expect(page.getByText('Select your city')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Pune/ }).last().click();
    await expect(page.locator('#btn-location-explore')).toContainText('Pune');
    await expect(page.getByText('E2E Rajgad Fort Trek').first()).toBeVisible({ timeout: 15000 });
  });
});
