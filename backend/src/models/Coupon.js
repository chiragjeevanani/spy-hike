import mongoose from 'mongoose';

// Discount coupon, either admin-managed platform-wide ("scope: platform") or
// organizer-authored and scoped to their own trips ("scope: organizer").
// `_id` is the coupon id the frontend uses (e.g. "cp-1712..."); `code` is the
// uppercased redemption code. Shape mirrors frontend/src/utils/coupons.js
// (context.md §6.5), extended for the organizer-coupons feature.
const couponSchema = new mongoose.Schema(
  {
    _id: { type: String }, // coupon id
    code: { type: String, required: true, uppercase: true, trim: true }, // uniqueness: compound index below
    type: { type: String, enum: ['flat', 'percentage'], default: 'percentage' },
    value: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null }, // percentage cap in ₹ (optional)
    minBookingAmount: { type: Number, default: 0 },
    startsAt: { type: String, default: null }, // "YYYY-MM-DD" or null = active immediately
    expiresAt: { type: String, default: null }, // "YYYY-MM-DD" or null = never
    status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
    usedCount: { type: Number, default: 0 },
    maxRedemptions: { type: Number, default: null, min: 1 }, // null = unlimited
    // Organizer-coupon fields (unused/default for scope='platform').
    scope: { type: String, enum: ['platform', 'organizer'], default: 'platform', index: true },
    organizerEmail: { type: String, default: null, index: true },
    appliesTo: { type: String, enum: ['all', 'selected'], default: 'all' },
    tripIds: { type: [String], default: [] }, // used when appliesTo='selected'
  },
  { timestamps: true, _id: false },
);

// Platform codes (organizerEmail always null) stay globally unique among
// themselves — same as before. Organizer codes are unique per-organizer only,
// so two different organizers can both use e.g. "SUMMER25".
couponSchema.index({ scope: 1, organizerEmail: 1, code: 1 }, { unique: true });

couponSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    code: this.code,
    type: this.type,
    value: this.value,
    maxDiscount: this.maxDiscount,
    minBookingAmount: this.minBookingAmount,
    startsAt: this.startsAt,
    expiresAt: this.expiresAt,
    status: this.status,
    usedCount: this.usedCount,
    maxRedemptions: this.maxRedemptions,
    scope: this.scope,
    organizerEmail: this.organizerEmail,
    appliesTo: this.appliesTo,
    tripIds: this.tripIds,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model('Coupon', couponSchema);
