import { env } from '../config/env.js';

let admin = null;
let fcmInitialized = false;

// Dynamically load firebase-admin to prevent startup crashes if the package is not yet installed
async function initFcm() {
  if (!env.firebaseProjectId || !env.firebaseClientEmail || !env.firebasePrivateKey) {
    console.warn('⚠️ Firebase credentials not set in .env. FCM push notifications will run in dry-run / stub mode.');
    return;
  }

  try {
    const firebaseModule = await import('firebase-admin');
    admin = firebaseModule.default || firebaseModule;
    
    // Format private key to correctly handle newlines if passed in inline environment
    const privateKey = env.firebasePrivateKey.replace(/\\n/g, '\n');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: privateKey,
      }),
    });
    fcmInitialized = true;
    console.log('✓ Firebase Admin SDK initialized successfully');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.warn('⚠️ firebase-admin package is not installed. FCM push notifications will run in dry-run / stub mode.');
    } else {
      console.error('✗ Failed to initialize Firebase Admin SDK:', error.message);
    }
  }
}

// Invoke the initializer immediately
initFcm().catch((err) => console.error('FCM init error:', err));

/**
 * Sends a push notification to a specific FCM token.
 * 
 * @param {string} token - The user's device FCM token
 * @param {string} title - The notification title
 * @param {string} body - The notification message body
 * @param {object} [data] - Optional metadata key-value payloads
 */
export async function sendPushNotification(token, title, body, data = {}) {
  if (!token) return { success: false, error: 'Token is required' };
  
  if (!fcmInitialized || !admin) {
    console.log(`[FCM STUB] Sending to token: ${token} | Title: "${title}" | Body: "${body}"`);
    return { success: true, stub: true };
  }

  try {
    const response = await admin.messaging().send({
      token,
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    });
    return { success: true, messageId: response };
  } catch (error) {
    console.error(`✗ FCM send to token failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a broadcast push notification to a topic (e.g. 'users', 'organizers', 'both').
 * 
 * @param {string} topic - The FCM topic subscription name
 * @param {string} title - The notification title
 * @param {string} body - The notification message body
 * @param {object} [data] - Optional metadata key-value payloads
 */
export async function sendTopicNotification(topic, title, body, data = {}) {
  if (!topic) return { success: false, error: 'Topic is required' };
  
  if (!fcmInitialized || !admin) {
    console.log(`[FCM STUB] Broadcasting to topic "${topic}" | Title: "${title}" | Body: "${body}"`);
    return { success: true, stub: true };
  }

  try {
    const response = await admin.messaging().send({
      topic,
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    });
    return { success: true, messageId: response };
  } catch (error) {
    console.error(`✗ FCM send to topic "${topic}" failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a push notification to a list of FCM tokens (multicast token-based service).
 * 
 * @param {string[]} tokens - Array of device FCM tokens
 * @param {string} title - The notification title
 * @param {string} body - The notification message body
 * @param {object} [data] - Optional metadata key-value payloads
 */
export async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { success: false, error: 'Tokens array is required and must not be empty' };
  }
  
  if (!fcmInitialized || !admin) {
    console.log(`[FCM STUB] Multicast sending to ${tokens.length} tokens | Title: "${title}" | Body: "${body}"`);
    return { success: true, stub: true };
  }

  try {
    // Send in chunks of 500 (Firebase Admin multicast limit)
    const chunkSize = 500;
    const results = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      });
      results.push(response);
    }
    return { success: true, results };
  } catch (error) {
    console.error(`✗ FCM multicast send failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// ─── Per-user delivery ───────────────────────────────────────────────────────
// Codes FCM returns for a token that will never work again: the app was
// uninstalled, the browser cleared its site data, or the token was rotated.
// Keeping them wastes a send on every future notification, so callers are told
// which ones to drop.
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

// FCM data payloads must be flat strings.
const stringifyData = (data) => Object.fromEntries(
  Object.entries(data || {})
    .filter(([, v]) => v != null)
    .map(([k, v]) => [k, String(v)]),
);

// Exported as an object (rather than loose functions) so tests can swap the
// send out without touching the network — the same pattern paymentProvider
// uses. Everything above it deals in users and notifications; this owns tokens.
export const pushProvider = {
  isConfigured: () => fcmInitialized,

  /**
   * Delivers one notification to every device token of a single recipient.
   * Never throws: a push is a best-effort mirror of an in-app notification.
   *
   * @returns {Promise<{sent: number, failed: number, deadTokens: string[]}>}
   */
  async sendToTokens(tokens, title, body, data = {}) {
    const list = [...new Set((tokens || []).filter(Boolean))];
    if (!list.length) return { sent: 0, failed: 0, deadTokens: [] };

    if (!fcmInitialized || !admin) {
      console.log(`[FCM STUB] Push to ${list.length} token(s) | Title: "${title}" | Body: "${body}"`);
      return { sent: 0, failed: 0, deadTokens: [], stub: true };
    }

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: list,
        notification: { title, body },
        data: { ...stringifyData(data), click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      });

      const deadTokens = [];
      response.responses.forEach((r, i) => {
        if (!r.success && DEAD_TOKEN_CODES.has(r.error?.code)) deadTokens.push(list[i]);
      });
      return { sent: response.successCount, failed: response.failureCount, deadTokens };
    } catch (error) {
      console.error('✗ FCM push send failed:', error.message);
      return { sent: 0, failed: list.length, deadTokens: [], error: error.message };
    }
  },
};
