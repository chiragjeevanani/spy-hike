import mongoose from 'mongoose';
import { env } from './env.js';

// Connect to MongoDB. The URI is passed in explicitly by the caller so tests
// can hand us an in-memory server's URI while server.js uses env.mongoUri.
export async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy backend/.env.example to backend/.env and fill it in.');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
