import mongoose from 'mongoose';

// A delivered notification for one recipient. Emitted on booking events and by
// admin broadcasts (context.md §7). `ownerKey` is the recipient's email.
const notificationSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ['customer', 'organizer'], required: true, index: true },
    ownerKey: { type: String, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    type: { type: String, default: 'System' }, // Booking|Payment|Promo|Updates|System
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Automatically delete notifications older than 30 days (1 month) to keep storage minimal on MongoDB free tier.
// 30 days * 24 hours * 60 minutes * 60 seconds = 2,592,000 seconds.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound index for recipient queries sorted newest-first
notificationSchema.index({ ownerType: 1, ownerKey: 1, createdAt: -1 });

notificationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    title: this.title,
    content: this.content,
    type: this.type,
    read: this.read,
    timestamp: this.createdAt,
  };
};

export default mongoose.model('Notification', notificationSchema);
