import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ update: vi.fn(), getToken: vi.fn(), onMessage: vi.fn(), isSupported: vi.fn(), identity: 'account-one' }));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})), getApps: () => [], getApp: () => ({}) }));
vi.mock('firebase/messaging', () => ({ getMessaging: () => ({}), getToken: mocks.getToken, onMessage: mocks.onMessage, isSupported: mocks.isSupported }));
vi.mock('../lib/authApi', () => ({ default: { updateFcmToken: mocks.update } }));
vi.mock('../lib/apiClient', () => ({ default: { baseUrl: '/api/v1' }, getToken: () => mocks.identity, sessionIdentity: (token) => token }));
let registration;
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key');
  vi.stubEnv('VITE_FIREBASE_VAPID_KEY', 'test-vapid');
  mocks.identity = 'account-one';
  mocks.getToken.mockResolvedValue('device-token');
  mocks.isSupported.mockResolvedValue(true);
  mocks.update.mockResolvedValue({ ok: true });
  registration = { showNotification: vi.fn().mockResolvedValue(undefined) };
  vi.stubGlobal('window', { Notification: {}, dispatchEvent: vi.fn() });
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') });
  vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockResolvedValue(registration) } });
  vi.stubGlobal('localStorage', { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() });
  vi.stubGlobal('CustomEvent', class { constructor(type, init) { this.type = type; this.detail = init.detail; } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('waits for explicit consent, then registers this device and shows foreground approval pushes', async () => {
  const { initPushNotifications } = await import('./pushNotifications');
  expect((await initPushNotifications()).enabled).toBe(false);
  expect(Notification.requestPermission).not.toHaveBeenCalled();
  expect((await initPushNotifications({ requestPermission: true })).enabled).toBe(true);
  expect(mocks.update).toHaveBeenCalledWith('device-token');
  const receive = mocks.onMessage.mock.calls[0][1];
  await receive({ data: { title: 'Congratulations!', content: 'Continue onboarding', url: '/organizer/dashboard' } });
  expect(registration.showNotification).toHaveBeenCalledWith('Congratulations!', expect.objectContaining({ data: expect.objectContaining({ url: '/organizer/dashboard' }) }));
});

it('does not register a blocked browser or an account that changed during token acquisition', async () => {
  const { initPushNotifications } = await import('./pushNotifications');
  Notification.requestPermission.mockResolvedValueOnce('denied');
  expect((await initPushNotifications({ requestPermission: true })).enabled).toBe(false);
  mocks.getToken.mockImplementationOnce(async () => { mocks.identity = 'account-two'; return 'device-token'; });
  expect((await initPushNotifications({ requestPermission: true })).enabled).toBe(false);
  expect(mocks.update).not.toHaveBeenCalled();
});

it('registers a device for a subsequent account instead of reusing a completed registration promise', async () => {
  const { initPushNotifications } = await import('./pushNotifications');
  Notification.permission = 'granted';
  await initPushNotifications();
  mocks.identity = 'account-two';
  await initPushNotifications();
  expect(mocks.update).toHaveBeenCalledTimes(2);
});

it('ignores queued foreground messages for an old account or session', async () => {
  const { initPushNotifications } = await import('./pushNotifications');
  mocks.identity = 'guide:2';
  Notification.permission = 'granted';
  await initPushNotifications();
  const receive = mocks.onMessage.mock.calls[0][1];
  await receive({ data: { recipientId: 'guide', recipientSessionVersion: '1', title: 'Old approval' } });
  expect(registration.showNotification).not.toHaveBeenCalled();
  await receive({ data: { recipientId: 'guide', recipientSessionVersion: '2', title: 'Current approval' } });
  expect(registration.showNotification).toHaveBeenCalledTimes(1);
  mocks.identity = null;
  await receive({ data: { title: 'After logout' } });
  expect(registration.showNotification).toHaveBeenCalledTimes(1);
});

it('unregisters this device with the current identity before logout navigation', async () => {
  const { unregisterPushNotifications } = await import('./pushNotifications');
  localStorage.getItem.mockReturnValue('device-token');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  unregisterPushNotifications();
  expect(fetch).toHaveBeenCalledWith('/api/v1/auth/fcm-token', expect.objectContaining({
    keepalive: true, headers: expect.objectContaining({ Authorization: 'Bearer account-one' }),
    body: JSON.stringify({ fcmToken: 'device-token', remove: true }),
  }));
  expect(localStorage.removeItem).toHaveBeenCalledWith('trekigo_fcm_token');
});
