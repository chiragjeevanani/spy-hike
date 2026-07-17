/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web push opt-in: registers the FCM service worker, requests browser
// notification permission, and registers the resulting device token with
// the backend (POST /auth/fcm-token) so admin broadcasts can reach it.
// No-ops quietly (never throws) whenever the environment can't support push
// — missing browser APIs, no Firebase config, non-HTTPS/localhost, or a
// denied/dismissed permission prompt — since this is a progressive
// enhancement, not a requirement for the app to function.

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import authApi from '../lib/authApi';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const FCM_TOKEN_STORAGE_KEY = 'trekigo_fcm_token';

let initPromise = null;

// Call once a user is signed in (safe to call on every app mount — it's
// idempotent and the browser remembers a prior grant/denial itself).
export function initPushNotifications() {
  if (initPromise) return initPromise;
  initPromise = run().catch((err) => {
    console.warn('Push notifications unavailable:', err?.message || err);
  });
  return initPromise;
}

async function run() {
  if (!firebaseConfig.apiKey || !vapidKey) return; // not configured
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (!(await isSupported())) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const swParams = new URLSearchParams(firebaseConfig).toString();
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${swParams}`);

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  const fcmToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (fcmToken) {
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
    await authApi.updateFcmToken(fcmToken);
  }
}
