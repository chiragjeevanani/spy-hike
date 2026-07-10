import { test, expect, request as pwRequest } from '@playwright/test';
import { ORG_USER } from './fixtures/seed.js';

// Phase 6 — Check-in / QR redemption. The organizer opens the ticket scanner
// and checks a booking in via the manual-entry fallback (headless has no
// camera); a second check-in reports the ticket as already checked in.

const API = 'http://localhost:4000/api/v1';
const DEMO_ORG = { email: 'demo@himalayan.com', password: 'organizer123' };

test.use({ viewport: { width: 460, height: 950 } });

// Creates a demo-org trip + a booking on it (fresh customer), returning the
// bookingId and the demo org's JWT.
async function seedBookingAndOrgToken() {
  const ctx = await pwRequest.newContext();
  const orgToken = (await (await ctx.post(`${API}/auth/organizer/login`, { data: DEMO_ORG })).json()).token;
  const trip = (await (await ctx.post(`${API}/organizer/trips`, {
    headers: { Authorization: `Bearer ${orgToken}` },
    data: {
      name: `E2E Checkin Trek ${Date.now()}`, location: 'Kaza', state: 'HP', city: 'Kaza',
      pricingTiers: [{ label: 'Solo', price: 500 }],
      pickup: { location: 'Manali', price: 0 },
      startPoint: { lat: 32.2, lng: 78.0, label: 'Base' },
      departureDates: ['2026-11-05'], difficulty: 'Easy', durationDays: 3,
      maxGroupSize: 10, availableSeats: 10, category: 'Trekking',
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      description: 'Check-in e2e', status: 'Published',
    },
  })).json()).trip;

  const custEmail = `checkin-${Date.now()}@example.com`;
  const custToken = (await (await ctx.post(`${API}/auth/register`, { data: { name: 'Booker', email: custEmail, password: 'pass1234' } })).json()).token;
  const booking = (await (await ctx.post(`${API}/bookings`, {
    headers: { Authorization: `Bearer ${custToken}` },
    data: { tripId: trip.id, selectedDate: '2026-11-05', selections: [{ label: 'Solo', count: 1 }], travelers: [{ name: 'Booker' }] },
  })).json()).booking;

  await ctx.dispose();
  return { bookingId: booking.bookingId, orgToken };
}

test('organizer scans a ticket to check it in; a second scan shows already checked in', async ({ page }) => {
  const { bookingId, orgToken } = await seedBookingAndOrgToken();

  // Seed an authenticated, approved organizer session.
  await page.addInitScript((data) => {
    localStorage.setItem('trekigo_org_user', JSON.stringify(data.org));
    localStorage.setItem('trekigo_auth_token', data.token);
  }, { org: { ...ORG_USER, email: DEMO_ORG.email }, token: orgToken });

  await page.goto('/organizer');
  await page.getByTitle('Scan ticket').click();

  // Camera is unavailable headless → the manual-entry fallback is shown.
  const codeInput = page.locator('#scanner-manual-code');
  await expect(codeInput).toBeVisible({ timeout: 10000 });
  await codeInput.fill(bookingId);
  await page.click('#scanner-manual-checkin');

  await expect(page.getByText('Checked in ✓')).toBeVisible({ timeout: 10000 });

  // Scan again → idempotent "already checked in".
  await page.getByRole('button', { name: /Scan Another Ticket/i }).click();
  const codeInput2 = page.locator('#scanner-manual-code');
  await expect(codeInput2).toBeVisible({ timeout: 10000 });
  await codeInput2.fill(bookingId);
  await page.click('#scanner-manual-checkin');
  await expect(page.getByText('Already checked in')).toBeVisible({ timeout: 10000 });
});
