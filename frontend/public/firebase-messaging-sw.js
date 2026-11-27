/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Background push handler. The Firebase web config is not secret (it's
// meant to ship in client code) but this file is a plain static asset, not
// part of the Vite build — it can't read import.meta.env directly. Instead
// the registering page passes the config as URL query params (Firebase's
// own documented pattern for this exact situation), read here via
// self.location.search, so there's a single source of truth in .env.production.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.stopImmediatePropagation();
  const metadata = event.notification.data || {};
  const data = metadata.FCM_MSG?.data || metadata;
  const destination = data.url || data.link || '/';
  const targetUrl = new URL(destination, self.location.origin);
  if (targetUrl.origin !== self.location.origin) return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl.href);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl.href);
      }
    })
  );
});

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    // Firebase displays notification payloads itself; avoid a duplicate.
    if (payload.notification) return;
    const title = payload.notification?.title || payload.data?.title || 'Find Your Trek';
    const body = payload.notification?.body || payload.data?.content || '';
    self.registration.showNotification(title, {
      body,
      icon: '/logo.png',
      data: payload.data || {},
    });
  });
}
