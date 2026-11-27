import { test, expect } from '@playwright/test';

const API = `http://localhost:${process.env.E2E_API_PORT || 4013}/api/v1`;
const auth = (token) => ({ Authorization: `Bearer ${token}` });
async function body(response) {
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

async function recreateOrganizer(request) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const admin = await body(await request.post(`${API}/auth/admin/login`, { data: { email: 'admin@findyourtrek.com', password: 'admin123' } }));
  const details = { name: 'Account Lifecycle Guide', email: `lifecycle-${stamp}@example.com`, mobile: `9${String(Date.now()).slice(-9)}`,
    password: 'pass1234', agencyName: `Lifecycle Guides ${stamp}`, govtIdType: 'Aadhaar', govtIdNumber: '123456789012' };
  const old = await body(await request.post(`${API}/auth/organizer/register`, { data: details }));
  const approve = async (id) => body(await request.patch(`${API}/admin/organizers/${id}/status`, { headers: auth(admin.token), data: { action: 'approve' } }));
  const bank = async (token) => body(await request.patch(`${API}/organizer/bank-details`, { headers: auth(token), data: {
    accountHolderName: details.name, bankName: 'HDFC Bank', accountNumber: '987654321012', ifsc: 'HDFC0001234',
  } }));
  await approve(old.account.id);
  await bank(old.token);
  const title = `Old Private Trek ${stamp}`;
  const { trek } = await body(await request.post(`${API}/admin/treks`, { headers: auth(admin.token), data: {
    title, location: 'Sankri', startingPoint: 'Sankri', state: 'Uttarakhand', city: 'Dehradun',
    difficulty: 'Easy', durationDays: 3, distanceKm: 12, category: 'Trekking', coverImage: 'https://example.com/trek.jpg',
  } }));
  const date = new Date();
  date.setDate(date.getDate() + 60);
  const departure = date.toISOString().slice(0, 10);
  const { trip } = await body(await request.post(`${API}/organizer/trips`, { headers: auth(old.token), data: {
    trekId: trek.id, name: title, location: 'Sankri', pricingTiers: [{ label: 'Solo', price: 1000 }],
    pickup: { location: 'Dehradun', price: 0 }, startPoint: { lat: 31.08, lng: 78.19, label: 'Sankri Base' },
    departureDates: [departure], maxGroupSize: 12, availableSeats: 12, description: 'Old private organizer listing', status: 'Published',
  } }));
  const customer = await body(await request.post(`${API}/auth/register`, { data: {
    name: 'Lifecycle Traveller', email: `traveller-${stamp}@example.com`, password: 'pass1234',
  } }));
  const { booking } = await body(await request.post(`${API}/bookings`, { headers: auth(customer.token), data: {
    tripId: trip.id, selectedDate: departure, selections: [{ label: 'Solo', count: 1 }],
    travelers: [{ name: 'Lifecycle Traveller', age: 28, gender: 'Male', emergencyContact: '9876543219' }],
  } }));
  await body(await request.post(`${API}/chats/${trip.id}/messages`, { headers: auth(customer.token), data: { text: 'Old private message' } }));
  const { chats } = await body(await request.get(`${API}/organizer/chats`, { headers: auth(old.token) }));
  const { notifications } = await body(await request.get(`${API}/organizer/notifications`, { headers: auth(old.token) }));
  const { payout } = await body(await request.post(`${API}/organizer/payouts`, { headers: auth(old.token), data: { amount: 100 } }));
  await body(await request.delete(`${API}/admin/organizers/${old.account.id}`, { headers: auth(admin.token) }));
  const fresh = await body(await request.post(`${API}/auth/organizer/register`, { data: details }));
  await approve(fresh.account.id);
  fresh.account = (await bank(fresh.token)).organizer;
  expect(fresh.account.id).toBe(old.account.id);
  expect(fresh.account.sessionVersion).toBeGreaterThan(old.account.sessionVersion);
  expect((await request.get(`${API}/organizer/bookings`, { headers: auth(old.token) })).status()).toBe(401);
  expect((await body(await request.get(`${API}/organizer/bookings`, { headers: auth(fresh.token) }))).bookings).toEqual([]);
  // The customer's historical booking and original agency contacts survive.
  const historical = await body(await request.get(`${API}/bookings/${booking.bookingId}`, { headers: auth(customer.token) }));
  expect(historical.booking.organizer.name).toBe(details.agencyName);
  return { fresh, old, trip, booking, chats, notifications, payout, title };
}

for (const failedRequest of [false, true]) {
  test(`recreated organizer ignores old browser records${failedRequest ? ' even when the API fails' : ''}`, async ({ page, request }) => {
    await page.setViewportSize({ width: 425, height: 865 });
    const fixture = await recreateOrganizer(request);
    await page.addInitScript(({ fresh, old, trip, booking, chats, notifications, payout, failedRequest }) => {
      localStorage.setItem('trekigo_org_user', JSON.stringify(fresh.account));
      localStorage.setItem('trekigo_auth_token', fresh.token);
      // Cover both a previous-lifecycle cache and stale lists inside the current scope.
      const scope = failedRequest ? fresh.account : old.account;
      localStorage.setItem('trekigo_org_data_owner', `${scope.id}:${scope.sessionVersion || 0}`);
      localStorage.setItem('trekigo_org_trips', JSON.stringify([trip]));
      localStorage.setItem('trekigo_org_bookings', JSON.stringify([booking]));
      localStorage.setItem('trekigo_org_chats', JSON.stringify(chats));
      localStorage.setItem('trekigo_org_notifications', JSON.stringify(notifications));
      localStorage.setItem('trekigo_org_payouts', JSON.stringify([payout]));
    }, { ...fixture, failedRequest });
    if (failedRequest) {
      await page.route('**/api/v1/organizer/trips', (route) => route.fulfill({ status: 503, json: { error: { message: 'Temporary failure' } } }));
      await page.route('**/api/v1/organizer/bookings', (route) => route.fulfill({ status: 503, json: { error: { message: 'Temporary failure' } } }));
    }
    await page.goto('/organizer/trips', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Expeditions & Treks' })).toBeVisible();
    await expect(page.getByText(fixture.title, { exact: true })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => ['trips', 'bookings', 'chats', 'notifications', 'payouts'].map(
      (key) => JSON.parse(localStorage.getItem(`trekigo_org_${key}`) || '[]').length,
    ))).toEqual([0, 0, 0, 0, 0]);
    const socketResult = await page.evaluate(async ({ oldToken, freshToken, tripId, chatId }) => {
      const { getSocket } = await import('/src/lib/socket.js');
      const socket = getSocket();
      if (!socket.connected) await new Promise((resolve) => socket.once('connect', resolve));
      const rejected = new Promise((resolve) => socket.once('auth_error', () => resolve(true)));
      socket.emit('authenticate', oldToken);
      const oldRejected = await rejected;
      const accepted = new Promise((resolve) => socket.once('authenticated', resolve));
      socket.emit('authenticate', freshToken);
      await accepted;
      const canJoinOldChat = await socket.timeout(5000).emitWithAck('join_chat', { tripId, chatId });
      return { oldRejected, canJoinOldChat };
    }, { oldToken: fixture.old.token, freshToken: fixture.fresh.token, tripId: fixture.trip.id, chatId: fixture.chats[0].id });
    expect(socketResult).toEqual({ oldRejected: true, canJoinOldChat: false });
    await page.goto('/organizer/bookings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(fixture.booking.bookingId, { exact: true })).toHaveCount(0);
    await page.goto('/organizer/dashboard?tab=chats', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Old private message', { exact: true })).toHaveCount(0);
  });
}
