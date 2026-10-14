import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import Admin from '../../src/models/Admin.js';
import User from '../../src/models/User.js';
import Notification from '../../src/models/Notification.js';
import { hashPassword } from '../../src/utils/password.js';
import { pushProvider } from '../../src/services/fcmService.js';

const app = createApp();
const api = '/api/v1';
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const realSend = pushProvider.sendToTokens;
let sends;
beforeEach(() => {
  sends = [];
  pushProvider.sendToTokens = async (tokens, title, content, data) => {
    sends.push({ tokens, title, content, data });
    return { sent: tokens.length, failed: 0, deadTokens: tokens.filter((token) => token === 'dead-admin-device') };
  };
});
afterEach(() => { pushProvider.sendToTokens = realSend; });
async function operator(email = 'operator@example.com') {
  await Admin.create({ name: 'Operator', email, passwordHash: await hashPassword('pass1234') });
  const login = await request(app).post(`${api}/auth/admin/login`).send({ email, password: 'pass1234' });
  return login.body.token;
}
const device = (token, fcmToken, remove = false) => request(app).post(`${api}/auth/fcm-token`).set(auth(token)).send({ fcmToken, remove });
const apply = () => request(app).post(`${api}/auth/organizer/register`).send({ name: 'New Guide', email: 'guide@example.com', password: 'pass1234', agencyName: 'New Guides', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
async function waitForPush(count) {
  await expect.poll(() => sends.length).toBe(count);
}

describe('Organizer application and approval notifications', () => {
  it('registers admin devices, alerts every admin and links to the review queue', async () => {
    const first = await operator();
    const second = await operator('second@example.com');
    expect((await device(first, 'admin-laptop')).status).toBe(200);
    await device(first, 'admin-phone');
    await device(second, 'second-admin-phone');
    const registration = await apply();
    expect(registration.status).toBe(201);
    await waitForPush(2);
    expect(sends.find((send) => send.tokens.includes('admin-laptop')).tokens).toEqual(expect.arrayContaining(['admin-laptop', 'admin-phone']));
    expect(sends.every((send) => send.data.url === '/admin/organizers')).toBe(true);
    const feed = await request(app).get(`${api}/admin/notifications`).set(auth(first));
    expect(feed.body.notifications).toHaveLength(1);
    expect(feed.body.notifications[0].data.organizerId).toBe(registration.body.account.id);
    expect(feed.body.notifications[0].title).toMatch(/pending approval/);
    expect((await request(app).get(`${api}/admin/notifications`).set(auth(registration.body.token))).status).toBe(403);
  });

  it('pushes congratulations to a pending organizer on approval only once, with onboarding URL', async () => {
    const admin = await operator();
    const registration = await apply();
    const token = registration.body.token;
    await device(token, 'guide-phone');
    const status = () => request(app).patch(`${api}/admin/organizers/${registration.body.account.id}/status`).set(auth(admin)).send({ action: 'approve' });
    expect((await status()).status).toBe(200);
    await waitForPush(1);
    expect(sends[0]).toMatchObject({ tokens: ['guide-phone'], title: 'Congratulations! Your application is approved', data: { url: '/organizer/dashboard', ownerType: 'organizer' } });
    expect(sends[0].content).toMatch(/continue your organizer onboarding journey/);
    await status();
    const rows = await Notification.find({ ownerType: 'organizer', type: 'OrganizerApproval' });
    expect(rows).toHaveLength(1);
    expect(sends).toHaveLength(1);
  });

  it('alerts admins for an existing hiker application but not for an idempotent repeat', async () => {
    const admin = await operator();
    await device(admin, 'admin-device');
    const customer = await request(app).post(`${api}/auth/register`).send({ name: 'Hiker', email: 'hiker@example.com', password: 'pass1234' });
    const submit = () => request(app).post(`${api}/auth/organizer/apply`).set(auth(customer.body.token)).send({ agencyName: 'Hiker Guides', govtIdType: 'Aadhaar', govtIdNumber: '123456789012' });
    expect((await submit()).status).toBe(201);
    await waitForPush(1);
    expect((await submit()).status).toBe(200);
    expect(await Notification.countDocuments({ ownerType: 'admin' })).toBe(1);
    expect(sends).toHaveLength(1);
  });

  it('moves a device between separate identities and unregisters only that device on logout', async () => {
    const admin = await operator();
    const customer = await request(app).post(`${api}/auth/register`).send({ name: 'Hiker', email: 'hiker@example.com', password: 'pass1234' });
    await device(customer.body.token, 'shared-browser');
    await device(admin, 'shared-browser');
    await device(admin, 'other-admin-device');
    expect((await User.findOne({ email: 'hiker@example.com' })).fcmTokens).toEqual([]);
    await device(admin, 'shared-browser', true);
    expect((await Admin.findOne({ email: 'operator@example.com' })).fcmTokens).toEqual(['other-admin-device']);
  });

  it('prunes a dead admin device while preserving its in-app pending alert', async () => {
    const admin = await operator();
    await device(admin, 'dead-admin-device');
    await apply();
    await waitForPush(1);
    await expect.poll(async () => (await Admin.findOne({ email: 'operator@example.com' })).fcmTokens.length).toBe(0);
    expect(await Notification.countDocuments({ ownerType: 'admin' })).toBe(1);
  });
});
