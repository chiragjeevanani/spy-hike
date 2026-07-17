import mongoose from 'mongoose';

const travelerSchema = new mongoose.Schema(
  { name: String, age: Number, gender: String, emergencyContact: String },
  { _id: false },
);
const breakdownSchema = new mongoose.Schema(
  { id: String, label: String, count: Number, perPersonPrice: Number, subtotal: Number },
  { _id: false },
);

// A confirmed booking. Money fields are snapshotted at creation from the
// pricing service (context.md §6.2) — notably commissionRate/commissionAmount/
// organizerPayout, so a later change to the platform commission rate never
// retroactively alters historical bookings.
const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true }, // "TG-XXXX-X"
    tripId: { type: String, required: true, index: true },
    tripName: String,
    tripImage: String,
    tripLocation: String,
    organizerEmail: { type: String, index: true },
    organizerName: String,
    userEmail: { type: String, index: true },
    userName: String,
    bookingDate: String, // "YYYY-MM-DD"
    selectedDate: String, // departure date
    travelersCount: Number,
    travelers: { type: [travelerSchema], default: [] },
    travelerBreakdown: { type: [breakdownSchema], default: [] },
    pickupLocation: String,
    pickupPrice: Number,
    baseCost: { type: Number, default: 0 },
    couponUsed: { type: String, default: '' },
    couponDiscount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    commissionRate: Number,
    commissionAmount: Number,
    organizerPayout: Number,
    loyaltyRewardApplied: { type: Boolean, default: false }, // customer free booking
    loyaltyDiscountAmount: { type: Number, default: 0 }, // how much the reward actually comped, capped by admin config
    organizerRewardApplied: { type: Boolean, default: false }, // organizer zero-commission
    // Refund snapshot on cancellation (policy-driven).
    refundAmount: { type: Number, default: 0 },
    refundPercent: { type: Number, default: 0 },
    cancelledAt: { type: String, default: null },
    paymentRef: String,
    status: { type: String, enum: ['Upcoming', 'Completed', 'Cancelled'], default: 'Upcoming' },
    // Phase 6 (check-in) fields, present but unused until then.
    checkedInAt: { type: String, default: null },
    checkedInBy: { type: String, default: null },
  },
  { timestamps: true },
);

bookingSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject({ versionKey: false });
  o.id = o._id.toString();
  delete o._id;
  return o;
};

export default mongoose.model('Booking', bookingSchema);
