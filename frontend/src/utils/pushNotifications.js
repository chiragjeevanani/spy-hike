// Browser push registration is scoped to the current server-authenticated
// account. Call with requestPermission from an explicit user action.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import authApi from '../lib/authApi';
import api, { getToken as getAuthToken, sessionIdentity } from '../lib/apiClient';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
let unsubscribeForeground;

export async function initPushNotifications({ requestPermission = false } = {}) {
  try {
    if (!firebaseConfig.apiKey || !vapidKey) return { enabled: false, reason: 'Notifications are not configured yet.' };
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return { enabled: false, reason: 'Push notifications are not supported in this browser.' };
    const identity = sessionIdentity(getAuthToken());
    if (!identity) return { enabled: false, reason: 'Sign in to enable notifications.' };
    // Request permission before async work so it retains the user gesture.
    const permission = requestPermission ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') return { enabled: false, reason: permission === 'denied'
      ? 'Notifications are blocked. Allow them in your browser site settings.' : 'Enable notifications to receive approval updates.' };
    if (!(await isSupported())) return { enabled: false, reason: 'Push notifications are not supported in this browser.' };
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(firebaseConfig)}`, { scope: '/firebase-cloud-messaging-push-scope' });
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    const fcmToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!fcmToken || identity !== sessionIdentity(getAuthToken())) return { enabled: false, reason: 'Please sign in again to enable notifications.' };
    await authApi.updateFcmToken(fcmToken);
    localStorage.setItem('trekigo_fcm_token', fcmToken);
    if (!unsubscribeForeground) {
      unsubscribeForeground = onMessage(messaging, (payload) => {
        const recipient = payload.data?.recipientId;
        if (!getAuthToken() || (recipient && `${recipient}:${payload.data.recipientSessionVersion || 0}` !== sessionIdentity(getAuthToken()))) return;
        window.dispatchEvent(new CustomEvent('push-notification-received', { detail: payload.data || {} }));
        return registration.showNotification(payload.notification?.title || payload.data?.title || 'Find Your Trek', {
          body: payload.notification?.body || payload.data?.content || '', icon: '/logo.png', data: payload.data || {},
        }).catch(() => {});
      });
    }
    return { enabled: true };
  } catch (error) {
    console.warn('Push notifications unavailable:', error?.message || error);
    return { enabled: false, reason: 'Could not enable notifications. Please retry.' };
  }
}

export function unregisterPushNotifications() {
  const deviceToken = localStorage.getItem('trekigo_fcm_token');
  const token = getAuthToken();
  localStorage.removeItem('trekigo_fcm_token');
  if (!deviceToken || !token) return;
  fetch(`${api.baseUrl}/auth/fcm-token`, {
    method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fcmToken: deviceToken, remove: true }),
  }).catch(() => {});
}
