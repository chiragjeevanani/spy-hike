import { test, expect, request as pwRequest } from '@playwright/test';

// The "Organizing Agency" block at the bottom of a customer's ticket.
//
// A booking stores only the organizer's email, so the ticket rendered a blank
// agency name, the organizer's login email under "Email", and a hardcoded
// "+91 98765 43210" under "Phone". These assert it shows the agency's real,
// published details instead.

const API = 'http://localhost:4000/api/v1';
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com',
  password: process.env.ADMIN_PASSWORD || 'password123',
};
const COVER = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80';
const DEPARTURE = '2026-12-11';

const AGENCY = {
  name: 'Sherpa Summit Collective',
  supportEmail: 'help@sherpasummit.example.com',
  supportPhone: '9000011111', // the backend stores a bare 10-digit number
};

// Publishes an approved organizer with real support contacts, a trek, a trip,
// and a booking on it for a fresh customer. Returns the customer session.
async function seedBooking() {
  const ctx = await pwRequest.newContext();
  const stamp = Date.now();

  const adminLogin = await ctx.post(`${API}/auth/admin/login`, { data: ADMIN });
  expect(adminLogin.ok(), `admin login failed: ${await adminLogin.text()}`).toBeTruthy();
  const adminHeaders = { Authorization: `Bearer ${(await adminLogin.json()).token}` };

  const orgEmail = `e2e-ticketorg-${stamp}@example.com`;
  const orgRes = await ctx.post(`${API}/admin/organizers`, {
    headers: adminHeaders,
    data: {
      name: 'Pemba Sherpa', email: orgEmail, mobile: `9${String(stamp).slice(-9)}`,
      password: 'pass1234', agencyName: AGENCY.name, approved: true,
      govtIdType: 'Aadhaar', govtIdNumber: '123456789012',
    },
  });
  expect(orgRes.ok(), `organizer create failed: ${await orgRes.text()}`).toBeTruthy();

  const orgLogin = await ctx.post(`${API}/auth/organizer/login`, { data: { email: orgEmail, password: 'pass1234' } });
  const orgHeaders = { Authorization: `Bearer ${(await orgLogin.json()).token}` };

  // The support contacts the agency publishes — what a traveller should see,
  // rather than the login email the booking happens to store.
  const profileRes = await ctx.patch(`${API}/auth/organizer/profile`, {
    headers: orgHeaders,
    data: { supportEmail: AGENCY.supportEmail, supportPhone: AGENCY.supportPhone },
  });
  expect(profileRes.ok(), `organizer profile update failed: ${await profileRes.text()}`).toBeTruthy();

  const title = `E2E Ticket Trek ${stamp}`;
  const trekRes = await ctx.post(`${API}/admin/treks`, {
    headers: adminHeaders,
    data: {
      title, location: 'Sankri, Uttarakhand', startingPoint: 'Sankri',
      state: 'Uttarakhand', city: 'Dehradun', difficulty: 'Moderate',
      durationDays: 3, distanceKm: 20, elevationMeters: 1200,
      coverImage: COVER, category: 'Trekking', description: 'Ticket e2e trek.',
    },
  });
  expect(trekRes.ok(), `trek create failed: ${await trekRes.text()}`).toBeTruthy();
  const trekId = (await trekRes.json()).trek.id;

  const tripRes = await ctx.post(`${API}/organizer/trips`, {
    headers: orgHeaders,
    data: {
      name: title, trekId, location: 'Sankri, Uttarakhand',
      state: 'Uttarakhand', city: 'Dehradun',
      pricingTiers: [{ label: 'Solo', price: 2599 }],
      pickup: { location: 'Dehradun', price: 0 },
      startPoint: { lat: 31.08, lng: 78.19, label: 'Sankri Base' },
      departureDates: [DEPARTURE],
      difficulty: 'Moderate', durationDays: 3, maxGroupSize: 15, availableSeats: 15,
      category: 'Trekking', coverImage: COVER,
      description: 'Ticket e2e trek.', status: 'Published',
    },
  });
  expect(tripRes.ok(), `trip create failed: ${await tripRes.text()}`).toBeTruthy();
  const tripId = (await tripRes.json()).trip.id;

  const custEmail = `e2e-ticketcust-${stamp}@example.com`;
  const reg = await ctx.post(`${API}/auth/register`, {
    data: { name: 'E2E Ticket Holder', email: custEmail, password: 'pass1234', mobile: `8${String(stamp).slice(-9)}` },
  });
  expect(reg.ok(), `customer register failed: ${await reg.text()}`).toBeTruthy();
  const { account, token } = await reg.json();

  const bookingRes = await ctx.post(`${API}/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      tripId,
      selectedDate: DEPARTURE,
      selections: [{ label: 'Solo', count: 1 }],
      travelers: [{ name: 'E2E Ticket Holder', age: 28, gender: 'Male', emergencyContact: '9876543219' }],
    },
  });
  expect(bookingRes.ok(), `booking failed: ${await bookingRes.text()}`).toBeTruthy();
  const { booking } = await bookingRes.json();

  await ctx.dispose();
  return { account, token, booking, orgEmail, title };
}

test.describe('Ticket — organizing agency', () => {
  test.use({ viewport: { width: 460, height: 950 } });

  test('shows the agency name and its published support contacts, not placeholders', async ({ page }) => {
    const { account, token, booking } = await seedBooking();

    await page.addInitScript((seed) => {
      localStorage.setItem('trekigo_user', JSON.stringify({
        ...seed.account, isAuthenticated: true, isOnboarded: true,
        profileSetupComplete: true, rememberMe: true,
      }));
      localStorage.setItem('trekigo_auth_token', seed.token);
    }, { account, token });

    await page.goto('/app/bookings');
    await page.getByText(booking.tripName).first().click();

    const agency = page.getByText('Organizing Agency');
    await expect(agency).toBeVisible({ timeout: 15000 });

    await expect(page.getByText(AGENCY.name).first()).toBeVisible();
    await expect(page.getByText(AGENCY.supportPhone)).toBeVisible();
    await expect(page.getByText(AGENCY.supportEmail)).toBeVisible();

    // The two values that used to be wrong.
    await expect(page.getByText('+91 98765 43210')).toHaveCount(0);
    await expect(page.getByText(/^e2e-ticketorg-/)).toHaveCount(0);
  });

  test('the agency name reaches the organizer profile behind "View Profile"', async ({ page }) => {
    const { account, token, booking } = await seedBooking();

    await page.addInitScript((seed) => {
      localStorage.setItem('trekigo_user', JSON.stringify({
        ...seed.account, isAuthenticated: true, isOnboarded: true,
        profileSetupComplete: true, rememberMe: true,
      }));
      localStorage.setItem('trekigo_auth_token', seed.token);
    }, { account, token });

    await page.goto('/app/bookings');
    await page.getByText(booking.tripName).first().click();
    await expect(page.getByText('Organizing Agency')).toBeVisible({ timeout: 15000 });

    // Previously this passed an undefined name and the lookup 404'd.
    await page.getByRole('button', { name: /View Profile/i }).click();
    await expect(page.getByText(AGENCY.name).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(AGENCY.supportPhone).first()).toBeVisible();
  });
});
