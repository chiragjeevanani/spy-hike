import dotenv from 'dotenv';

// Load .env once, as early as possible. Tests set their own env (and use an
// in-memory Mongo), so a missing .env is not fatal here — only server.js
// treats an absent MONGO_URI as a hard error at boot.
dotenv.config();

const isTestEnv = () => (process.env.NODE_ENV || 'development') === 'test';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/spy-hike',
  adminEmail: process.env.ADMIN_EMAIL || 'superadmin@gmail.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'password123',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Optional. Unset (as in tests) falls back to an in-process response cache —
  // see src/lib/cache.js. Never set during tests, so runs stay isolated.
  redisUrl: isTestEnv() ? '' : (process.env.REDIS_URL || ''),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  // Firebase Cloud Messaging credentials
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  // Google Maps API Key for reverse-geocoding
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '',
  // ─── PayU ──────────────────────────────────────────────────────────────────
  // Leaving the key/salt unset keeps the platform on Pay on Arrival: the
  // provider refuses to make a gateway call and resolvePaymentMode() falls back
  // to 'arrival', so dev machines and CI need no credentials to boot or test.
  payuMerchantKey: (process.env.PAYU_MERCHANT_KEY || '').trim(),
  // Signs every hop — the checkout form, the return post, payment webhooks and
  // the merchant API. Server-side only; it must never reach the browser.
  payuMerchantSalt: (process.env.PAYU_MERCHANT_SALT || '').trim(),
  // 'test' (test.payu.in) or 'production' (secure.payu.in / info.payu.in).
  // Test credentials only work against test, and live only against production.
  payuEnv: (process.env.PAYU_ENV || 'test').trim().toLowerCase() === 'production' ? 'production' : 'test',
  // Public origin of THIS API as PayU's servers and the customer's browser see
  // it (e.g. https://api.example.com). PayU posts the payment result to
  // <API_PUBLIC_URL>/api/v1/payments/payu/return. Falls back to the request's
  // own host, which is wrong behind a proxy that doesn't forward it.
  apiPublicUrl: (process.env.API_PUBLIC_URL || '').trim().replace(/\/+$/, ''),
  // Public origin of the customer web app, where the browser is sent back to
  // once the payment result has been recorded.
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/+$/, ''),
  // 'arrival' (default) keeps today's Pay-on-Arrival flow; 'online' routes
  // checkout through PayU. Only honoured when the key and salt are present.
  paymentMode: (process.env.PAYMENT_MODE || 'arrival').trim().toLowerCase(),
  // How long an unpaid online booking holds its reserved seats before the
  // sweeper cancels it and hands them back (see services/paymentService.js).
  paymentPendingTtlMinutes: Number(process.env.PAYMENT_PENDING_TTL_MINUTES) || 20,
  // Comma-separated list of allowed browser origins for CORS. Defaults cover
  // the Vite dev server on its usual ports.
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export const isProd = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
