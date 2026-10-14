import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { it, expect, vi } from 'vitest';
const source = readFileSync(new URL('../../public/firebase-messaging-sw.js', import.meta.url), 'utf8');
function worker() {
  const listeners = {};
  const order = [];
  let background;
  const client = { navigate: vi.fn().mockResolvedValue(undefined), focus: vi.fn().mockResolvedValue(undefined) };
  const self = { location: { origin: 'https://trek.test', search: '?apiKey=test' },
    registration: { showNotification: vi.fn() },
    addEventListener: (type, handler) => { order.push(type); listeners[type] = handler; },
    clients: { matchAll: vi.fn().mockResolvedValue([client]), openWindow: vi.fn() } };
  runInNewContext(source, { self, URL, URLSearchParams, importScripts: () => order.push('firebase-import'),
    firebase: { initializeApp: vi.fn(), messaging: () => ({ onBackgroundMessage: (handler) => { background = handler; } }) } });
  return { self, client, listeners, order, background };
}
it('shows data-only pushes once and registers click handling before Firebase', () => {
  const w = worker();
  expect(w.order[0]).toBe('notificationclick');
  w.background({ data: { title: 'New organizer', content: 'Please review', url: '/admin/organizers' } });
  expect(w.self.registration.showNotification).toHaveBeenCalledWith('New organizer', expect.objectContaining({ data: { title: 'New organizer', content: 'Please review', url: '/admin/organizers' } }));
  w.background({ notification: { title: 'Firebase displays this' } });
  expect(w.self.registration.showNotification).toHaveBeenCalledTimes(1);
});
for (const url of ['/admin/organizers', '/organizer/dashboard']) {
  it(`opens the correct ${url} page when a push is clicked`, async () => {
    const w = worker();
    let navigation;
    w.listeners.notificationclick({ notification: { close: vi.fn(), data: { url } }, stopImmediatePropagation: vi.fn(), waitUntil: (promise) => { navigation = promise; } });
    await navigation;
    expect(w.client.navigate).toHaveBeenCalledWith(`https://trek.test${url}`);
    expect(w.client.focus).toHaveBeenCalled();
  });
}
it('does not navigate to an external origin from notification data', () => {
  const w = worker();
  w.listeners.notificationclick({ notification: { close: vi.fn(), data: { url: 'https://outside.test' } }, stopImmediatePropagation: vi.fn(), waitUntil: vi.fn() });
  expect(w.self.clients.matchAll).not.toHaveBeenCalled();
});
