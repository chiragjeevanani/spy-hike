import mongoose from 'mongoose';

// An organizer's "please boost my listings" ask from their profile's
// "Promote Yourself" section — sits in the admin's Promotions review queue
// until approved (with an admin-chosen date range, via promotionService) or
// rejected. Mirrors TrekRequest's request/review shape.
const promotionRequestSchema = new mongoose.Schema(
  {
    _id: { type: String },
    organizerEmail: { type: String, required: true, index: true },
    organizerName: { type: String, default: '' }, // agencyName snapshot, for the admin list
    message: { type: String, default: '', trim: true }, // organizer's optional pitch
    requestedDays: { type: Number, default: 30, min: 1 }, // organizer's suggested duration; admin picks the real dates
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    reviewNote: { type: String, default: '' },
    promotedFrom: { type: Date, default: null }, // set on approval
    promotedUntil: { type: Date, default: null }, // set on approval
  },
  { timestamps: true, _id: false },
);

promotionRequestSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = obj._id;
  delete obj._id;
  return obj;
};

export default mongoose.model('PromotionRequest', promotionRequestSchema);
