import mongoose from 'mongoose';

// Admin announcement history. Each broadcast also fans out a Notification to
// every recipient in the target audience (context.md §7/§9).
const broadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, default: '' },
    type: { type: String, default: 'System' },
    target: { type: String, enum: ['users', 'organizers', 'both'], default: 'both' },
  },
  { timestamps: true },
);

broadcastSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    title: this.title,
    content: this.content,
    type: this.type,
    target: this.target,
    timestamp: this.createdAt,
  };
};

export default mongoose.model('Broadcast', broadcastSchema);
