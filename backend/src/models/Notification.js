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
