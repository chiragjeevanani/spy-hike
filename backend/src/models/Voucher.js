import mongoose from 'mongoose';

// A milestone reward voucher. Shared shape for both sides (context.md §4.3):
// customer vouchers comp a whole booking; organizer vouchers zero a booking's
// commission. `ownerKey` is the customer/organizer email.
const voucherSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ['customer', 'organizer'], required: true },
    ownerKey: { type: String, required: true, index: true },
    milestoneNumber: { type: Number, required: true },
    earnedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['available', 'used'], default: 'available' },
    usedRef: { type: String, default: null }, // bookingId it was redeemed against
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

voucherSchema.index({ ownerType: 1, ownerKey: 1 });

// Frontend-shaped voucher (utils/loyalty.js): id/earnedAt/milestoneNumber/
// status/usedRef/usedAt.
voucherSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    earnedAt: this.earnedAt,
    milestoneNumber: this.milestoneNumber,
    status: this.status,
    usedRef: this.usedRef,
    usedAt: this.usedAt,
  };
};

export default mongoose.model('Voucher', voucherSchema);
