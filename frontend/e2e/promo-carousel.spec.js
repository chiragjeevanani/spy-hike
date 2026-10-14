import { test, expect } from '@playwright/test';
import { CUSTOMER_USER, seedLocalStorage } from './fixtures/seed.js';
const banners = ['First', 'Second', 'Third'].map((title, index) => ({
  id: `swipe-${index}`, title, subtitle: 'Mountain trail', tag: 'Explore', active: true,
  img: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="${['green', 'blue', 'purple'][index]}"/></svg>`)}`,
}));
test.beforeEach(async ({ page, request }) => {
  const response = await request.post(`http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1/auth/login`, {
    data: { email: 'chiragjeevanani333@gmail.com', password: 'findyourtrek123' },
  });
  const { token } = await response.json();
  await page.addInitScript(value => localStorage.setItem('trekigo_auth_token', value), token);
  await seedLocalStorage(page, { trekigo_user: CUSTOMER_USER, fyt_promotional_banners: banners });
  await page.route('**/api/v1/promotional-banners*', route => route.fulfill({ json: { banners } }));
  await page.goto('/app', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('promo-slide')).toHaveCount(5);
  await page.getByTestId('promo-track').scrollIntoViewIfNeeded();
  await expectSlot(page, 1);
});
async function expectSlot(page, slot) {
  await expect.poll(() => page.getByTestId('promo-track').evaluate(el => el.scrollLeft / el.clientWidth)).toBeCloseTo(slot, 1);
}
async function expectNoGap(page) {
  const result = await page.getByTestId('promo-track').evaluate(el => {
    const frame = el.getBoundingClientRect();
    const visible = [...el.children].map(slide => ({ box: slide.getBoundingClientRect(), img: slide.querySelector('img') }))
      .filter(({ box }) => box.right > frame.left + 1 && box.left < frame.right - 1);
    return {
      count: visible.length,
      loaded: visible.every(({ img }) => img.complete && img.naturalWidth > 0),
      covered: visible[0].box.left <= frame.left && visible.at(-1).box.right >= frame.right,
      touching: visible.every(({ box }, i) => !i || Math.abs(box.left - visible[i - 1].box.right) < 1),
    };
  });
  expect(result).toEqual({ count: 2, loaded: true, covered: true, touching: true });
}
test('desktop drag shows adjacent images and arrows loop in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await expectSlot(page, 1);
  const box = await page.getByTestId('promo-track').boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 8 });
  await expectNoGap(page);
  await page.mouse.up();
  await expectSlot(page, 2);
  await page.getByRole('button', { name: 'Next banner', exact: true }).click();
  await expectSlot(page, 3);
  await page.getByRole('button', { name: 'Next banner', exact: true }).click();
  await expectSlot(page, 1);
  await page.getByRole('button', { name: 'Previous banner', exact: true }).click();
  await expectSlot(page, 3);
  await page.getByRole('button', { name: 'Show promotion 2', exact: true }).click();
  await expectSlot(page, 2);
});
test.describe('mobile', () => {
  test.use({ viewport: { width: 425, height: 865 }, hasTouch: true, isMobile: true });
  test('native touch swipe keeps both images visible without blank space', async ({ page, context }) => {
    const session = await context.newCDPSession(page);
    const box = await page.getByTestId('promo-track').boundingBox();
    const x = box.x + box.width * 0.8;
    const y = box.y + box.height * 0.5;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - box.width * 0.4 * i / 8, y }] });
    }
    await expectNoGap(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expectSlot(page, 2);
    await expect(page.locator('.customer-promo-card')).toHaveCSS('height', '200px');
  });
});
