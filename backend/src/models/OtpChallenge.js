import mongoose from 'mongoose';

// Shared across workers; only a keyed hash is stored. Check expiry explicitly
// during verification since MongoDB TTL cleanup is asynchronous.
const schema = new mongoose.Schema({
  mobile: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  resendAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  delivered: { type: Boolean, default: false },
});
export default mongoose.model('OtpChallenge', schema);
