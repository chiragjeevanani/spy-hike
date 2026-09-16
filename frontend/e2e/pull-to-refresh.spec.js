import { test, expect } from '@playwright/test';
import { CUSTOMER_USER, seedLocalStorage } from './fixtures/seed.js';

// Pull-to-refresh on the customer app.
//
// The gesture is served by the overscroll guard (utils/preventOverscrollBounce
// .js) rather than by listeners of its own: at the top of #root, the native
// rubber-band pull and this are the same finger movement. So these tests drive
// real touch events through CDP — a synthetic TouchEvent wouldn't exercise the
// same path, and `page.touchscreen` only taps.

test.use({ viewport: { width: 390, height: 664 }, hasTouch: true });

const TREKS = Array.from({ length: 4 }, (_, i) => ({
  id: `trek-${i + 1}`,
  name: `Test Trek ${i + 1}`,
  title: `Test Trek ${i + 1}`,
  coverImage: 'https://example.com/cover.jpg',
  city: 'Manali',
  state: 'Himachal Pradesh',
  location: 'Manali, Himachal Pradesh',
  difficulty: 'Moderate',
  tripCount: 0,
  status: 'active',
}));

async function openApp(page, counters) {
  await seedLocalStorage(page, {
    trekigo_user: { ...CUSTOMER_USER, profileSetupComplete: true },
    trekigo_last_route: '/app',
  });
  await page.addInitScript(() => localStorage.setItem('trekigo_auth_token', 'e2e-token'));

  await page.route('http://localhost:4000/**', (route) => {
    const url = route.request().url();
    if (counters) {
      if (url.includes('/treks')) counters.treks += 1;
      if (url.includes('/trips')) counters.trips += 1;
    }
    const json = (body) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      body: JSON.stringify(body),
    });
    if (/\/treks\/[^/?]+$/.test(url)) return json({ trek: TREKS[0] });
    if (url.includes('/treks')) return json({ treks: TREKS });
    if (url.includes('/trips')) return json({ trips: [], page: 1, limit: 100, hasMore: false });
    return json({});
  });

  await page.goto('/app');
  await expect(page.locator('h5', { hasText: 'Test Trek 1' }).first()).toBeVisible();
}

// Drags a finger down the screen from the top of the page, one touch event at
// a time so the guard sees a real gesture rather than a teleport.
async function pullDown(page, totalPx, { release = true } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const x = 195;
  const startY = 120;
  const send = (type, y) => cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
  });

  await send('touchStart', startY);
  const steps = 10;
  for (let i = 1; i <= steps; i += 1) {
    await send('touchMove', startY + (totalPx * i) / steps);
  }
  if (release) await send('touchEnd', startY + totalPx);
  await cdp.detach();
}

const indicator = (page) => page.getByTestId('pull-to-refresh');

test.describe('Customer — pull to refresh', () => {
  test('pulling down at the top of the page shows the indicator', async ({ page }) => {
    await openApp(page);
    await expect(indicator(page)).toHaveCount(0);

    await pullDown(page, 140, { release: false });

    await expect(indicator(page)).toBeVisible();
    await expect(indicator(page)).toHaveAttribute('data-state', 'armed');
  });

  test('releasing past the threshold refetches the page data', async ({ page }) => {
    const counters = { treks: 0, trips: 0 };
    await openApp(page, counters);
    const before = { ...counters };

    await pullDown(page, 140);

    await expect(indicator(page)).toHaveAttribute('data-state', 'refreshing');
    // App's own catalog + trips, and each screen re-reading what it owns.
    await expect.poll(() => counters.trips).toBeGreaterThan(before.trips);
    await expect.poll(() => counters.treks).toBeGreaterThan(before.treks);

    // The spinner clears itself once the refresh settles.
    await expect(indicator(page)).toHaveCount(0, { timeout: 5000 });
  });

  test('a short pull refreshes nothing', async ({ page }) => {
    const counters = { treks: 0, trips: 0 };
    await openApp(page, counters);
    const before = { ...counters };

    await pullDown(page, 40);

    await expect(indicator(page)).toHaveCount(0);
    expect(counters.trips).toBe(before.trips);
    expect(counters.treks).toBe(before.treks);
  });

  test('it does not fire part-way down a page', async ({ page }) => {
    const counters = { treks: 0, trips: 0 };
    await openApp(page, counters);
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.cssText = 'height:1600px;min-height:1600px;flex:none';
      document.getElementById('root').appendChild(spacer);
      document.getElementById('root').scrollTop = 600;
    });
    const before = { ...counters };

    await pullDown(page, 140);

    await expect(indicator(page)).toHaveCount(0);
    expect(counters.trips).toBe(before.trips);
  });

  test('it is off while a fullscreen route is open', async ({ page }) => {
    const counters = { treks: 0, trips: 0 };
    await openApp(page, counters);

    await page.locator('h5', { hasText: 'Test Trek 1' }).first()
      .evaluate((el) => el.closest('.cursor-pointer').click());
    await expect(page).toHaveURL(/\/app\/trek\/test-trek-1$/);
    const before = { ...counters };

    await pullDown(page, 140);

    await expect(indicator(page)).toHaveCount(0);
    expect(counters.trips).toBe(before.trips);
  });
});
