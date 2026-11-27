import { expect } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

// Organizer offers now reference an admin-curated trek. Create that real
// catalog entry first instead of relying on the removed free-text contract.
export async function createTrip(ctx, options) {
  if (!options.data.trekId) {
    const login = await ctx.post(`${API}/auth/admin/login`, {
      data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    });
    expect(login.ok(), await login.text()).toBeTruthy();
    const { token } = await login.json();
    const data = options.data;
    const trek = await ctx.post(`${API}/admin/treks`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: data.name, location: data.location || 'Himalayas',
        state: data.state || 'Himachal Pradesh', city: data.city || 'Manali',
        difficulty: data.difficulty || 'Moderate', durationDays: data.durationDays || 5,
        distanceKm: data.distanceKm || 10, coverImage: data.coverImage || 'https://example.com/trek.jpg',
        category: data.category || 'Trekking', description: data.description || 'Browser test trek' },
    });
    expect(trek.ok(), await trek.text()).toBeTruthy();
    options = { ...options, data: { ...data, trekId: (await trek.json()).trek.id } };
  }
  const response = await ctx.post(`${API}/organizer/trips`, options);
  expect(response.ok(), await response.text()).toBeTruthy();
  return response;
}

export const makeTravelers = (count = 1) => Array.from({ length: count }, () => ({
  name: 'Browser Hiker', age: 28, gender: 'Male', emergencyContact: '9876543219',
}));

export async function fillTravelerDetails(page) {
  const names = page.locator('input[name="name"]');
  await expect(names.first()).toBeVisible();
  for (let i = 0; i < await names.count(); i++) {
    await names.nth(i).fill('Browser Hiker');
    await page.locator('input[name="age"]').nth(i).fill('28');
    await page.locator('select[name="gender"]').nth(i).selectOption('Male');
    await page.locator('input[name="emergencyContact"]').nth(i).fill('9876543219');
  }
}

export async function selectDeparture(page) {
  // The calendar intentionally starts with no date selected. Pick its first
  // enabled departure just as a customer must before Continue is enabled.
  const day = page.locator('div.grid.grid-cols-7').last().locator('button:enabled').first();
  await expect(day).toBeVisible();
  await day.click();
}
