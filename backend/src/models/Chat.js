import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['user', 'organizer'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

// A conversation thread between one customer and one organizer about a trip
// (context.md §5). Keyed by (tripId, userEmail, organizerEmail).
const chatSchema = new mongoose.Schema(
  {
    tripId: { type: String, required: true },
    tripName: String,
    userEmail: { type: String, required: true, index: true },
    userName: String,
    userAvatar: String,
    organizerEmail: { type: String, required: true, index: true },
    organizerName: String,
    organizerAvatar: String,
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

chatSchema.index({ tripId: 1, userEmail: 1, organizerEmail: 1 }, { unique: true });

chatSchema.methods.toPublicJSON = function toPublicJSON(extra = {}) {
  return {
    id: this._id.toString(),
    tripId: this.tripId,
    tripName: this.tripName,
    userEmail: this.userEmail,
    userName: extra.userName || this.userName || '',
    userAvatar: extra.userAvatar || this.userAvatar || '',
    organizerName: extra.organizerName || this.organizerName || '',
    organizerAvatar: extra.organizerAvatar || this.organizerAvatar || '',
    messages: this.messages.map((m) => ({
      id: `${this._id}-${m.timestamp?.getTime?.() || Date.now()}`,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
    })),
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model('Chat', chatSchema);
