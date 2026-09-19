import mongoose from 'mongoose';
import { env } from './env.js';

const LOCAL_FALLBACK_URI = 'mongodb://localhost:27017/spy-hike';

// Connect to MongoDB. The URI is passed in explicitly by the caller so tests
// can hand us an in-memory server's URI while server.js uses env.mongoUri.
export async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy backend/.env.example to backend/.env and fill it in.');
  }
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    return mongoose.connection;
  } catch (err) {
    const isRemote = !uri.includes('localhost') && !uri.includes('127.0.0.1');
    // In non-production environments, if remote MongoDB fails (e.g. Atlas IP whitelist restriction),
    // attempt fallback to local MongoDB so local development does not break.
    if (env.nodeEnv !== 'production' && isRemote) {
      const sanitizedUri = uri.replace(/:([^:@]+)@/, ':****@');
      console.warn(`[db] Warning: Failed to connect to remote MongoDB (${sanitizedUri}): ${err.message}`);
      console.warn('[db] Note: For MongoDB Atlas, ensure your current public IP is whitelisted in Atlas Network Access (https://www.mongodb.com/docs/atlas/security-whitelist/).');
      console.warn(`[db] Attempting fallback to local MongoDB (${LOCAL_FALLBACK_URI})...`);
      try {
        await mongoose.connect(LOCAL_FALLBACK_URI, { serverSelectionTimeoutMS: 3000 });
        console.log('✓ MongoDB connected (using local fallback)');
        return mongoose.connection;
      } catch (fallbackErr) {
        console.error(`[db] Local fallback also failed: ${fallbackErr.message}`);
      }
    }
    throw err;
  }
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
