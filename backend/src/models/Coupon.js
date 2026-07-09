import mongoose from 'mongoose';

// Admin-managed discount coupon. `_id` is the coupon id the frontend uses
// (e.g. "cp-1712..."); `code` is the unique, uppercased redemption code.
// Shape mirrors frontend/src/utils/coupons.js (context.md §6.5).
const couponSchema = new mongoose.Schema(
  {
    _id: { type: String }, // coupon id
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['flat', 'percentage'], default: 'percentage' },
    value: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null }, // percentage cap in ₹ (optional)
    minBookingAmount: { type: Number, default: 0 },
    expiresAt: { type: String, default: null }, // "YYYY-MM-DD" or null = never
    status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false },
);

couponSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    code: this.code,
    type: this.type,
    value: this.value,
    maxDiscount: this.maxDiscount,
    minBookingAmount: this.minBookingAmount,
    expiresAt: this.expiresAt,
    status: this.status,
    usedCount: this.usedCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model('Coupon', couponSchema);
