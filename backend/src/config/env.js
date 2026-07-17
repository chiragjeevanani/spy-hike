import dotenv from 'dotenv';

// Load .env once, as early as possible. Tests set their own env (and use an
// in-memory Mongo), so a missing .env is not fatal here — only server.js
// treats an absent MONGO_URI as a hard error at boot.
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  // Firebase Cloud Messaging credentials
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || '',
  // Comma-separated list of allowed browser origins for CORS. Defaults cover
  // the Vite dev server on its usual ports.
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export const isProd = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
