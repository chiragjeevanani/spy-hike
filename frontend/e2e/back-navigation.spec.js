import { test, expect } from '@playwright/test';
import { CUSTOMER_USER, seedLocalStorage } from './fixtures/seed.js';

// Back navigation, from the angle iOS cares about.
//
// WebKit's interactive swipe-back animates a SNAPSHOT of the destination page
// and only swaps the live DOM in when the gesture commits. Anything the app
// changed about that page in the meantime — most easily its scroll offset —
// gets painted as a jump the instant the snapshot lifts. That is what "the
// page flickers when I swipe back, but not when I use the in-app back button"
// reports as: the in-app button has no snapshot to disagree with, so the same
// mismatch is invisible there.
//
// Chromium can't reproduce the snapshot, but it CAN pin down every property
// the snapshot is comparing against, which is what these tests do.

test.use({ viewport: { width: 390, height: 664 } });

// Catalog treks with no trip under them are what Home's "Coming soon" tiles
// are built from. Stubbing the API keeps this spec independent of whatever
// the shared in-memory backend happens to be seeded with.
const TREKS = Array.from({ length: 8 }, (_, i) => ({
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

const SCROLLED_TO = 700;

async function openHomeScrolled(page) {
  await seedLocalStorage(page, {
    trekigo_user: { ...CUSTOMER_USER, profileSetupComplete: true },
    trekigo_last_route: '/app',
  });
  // A token the API stub never rejects — without one, the first authed call
  // 401s and the session resets to the login screen.
  await page.addInitScript(() => localStorage.setItem('trekigo_auth_token', 'e2e-token'));

  await page.route('http://localhost:4000/**', (route) => {
    const url = route.request().url();
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

  // #root is the app's scroll surface (html/body are locked — see index.css).
  // The stubbed catalog is shorter than a phone viewport, so give it room to
  // sit scrolled the way a real Home does.
  await page.evaluate((y) => {
    const spacer = document.createElement('div');
    spacer.style.cssText = 'height:1600px;min-height:1600px;flex:none';
    document.getElementById('root').appendChild(spacer);
    document.getElementById('root').scrollTop = y;
  }, SCROLLED_TO);
  await expect.poll(() => scrollTop(page)).toBe(SCROLLED_TO);
}

const scrollTop = (page) => page.evaluate(() => document.getElementById('root').scrollTop);
const openComingSoonTile = (page) =>
  page.locator('h5', { hasText: 'Test Trek 1' }).first().evaluate((el) => el.closest('.cursor-pointer').click());

// Samples the overlay and the scroll offset once per animation frame while a
// navigation plays out — the resolution the flicker actually happens at.
const framesAfter = (page, trigger) => page.evaluate(async (fn) => {
  const out = [];
  // eslint-disable-next-line no-eval
  eval(fn);
  for (let i = 0; i < 10; i += 1) {
    await new Promise(requestAnimationFrame);
    const el = document.querySelector('.z-47');
    out.push({
      overlay: !!el,
      opacity: el ? Number(getComputedStyle(el).opacity) : null,
      scrollTop: document.getElementById('root').scrollTop,
    });
  }
  return out;
}, trigger);

test.describe('Customer — back navigation', () => {
  test('opening a Coming soon tile leaves the page underneath where it was', async ({ page }) => {
    await openHomeScrolled(page);

    await openComingSoonTile(page);
    await expect(page).toHaveURL(/\/app\/trek\/test-trek-1$/);
    await expect(page.locator('.z-47')).toBeVisible();

    // The trek screen is a fullscreen overlay with its own scroller. Home is
    // still mounted underneath and must not have been scrolled to the top:
    // that silent jump is what the swipe-back snapshot exposes.
    expect(await scrollTop(page)).toBe(SCROLLED_TO);
  });

  test('a gesture/hardware back restores the page exactly as it was left', async ({ page }) => {
    await openHomeScrolled(page);
    await openComingSoonTile(page);
    await expect(page.locator('.z-47')).toBeVisible();

    const frames = await framesAfter(page, 'history.back()');

    // No scroll jump at any point — the live DOM matches the snapshot iOS
    // has been animating for the whole gesture.
    expect(frames.map((f) => f.scrollTop)).toEqual(Array(10).fill(SCROLLED_TO));
    // And no fade-out of the screen being left: WebKit lifts its snapshot the
    // moment the navigation commits, so a 180ms fade lands on top of the page
    // it just finished swiping to.
    expect(frames.slice(3).some((f) => f.overlay)).toBe(false);

    await expect(page).toHaveURL(/\/app$/);
    expect(await scrollTop(page)).toBe(SCROLLED_TO);
  });

  test('the in-app back button still fades out, and lands in the same place', async ({ page }) => {
    await openHomeScrolled(page);
    await openComingSoonTile(page);
    await expect(page.locator('.z-47')).toBeVisible();

    const frames = await framesAfter(page, "document.querySelector('.z-47 button').click()");

    // This one has no snapshot to race, so it keeps its transition.
    expect(frames[1].overlay).toBe(true);
    await expect(page).toHaveURL(/\/app$/);
    expect(await scrollTop(page)).toBe(SCROLLED_TO);
  });

  test('switching tabs still opens the new tab at the top', async ({ page }) => {
    await openHomeScrolled(page);

    await page.getByText(/^Explore$/).last().click({ force: true });
    await expect(page).toHaveURL(/\/app\/explore$/);
    expect(await scrollTop(page)).toBe(0);
  });
});
