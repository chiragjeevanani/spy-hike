import mongoose from 'mongoose';

const travelerSchema = new mongoose.Schema(
  { name: String, age: Number, gender: String, emergencyContact: String },
  { _id: false },
);
const breakdownSchema = new mongoose.Schema(
  { id: String, label: String, count: Number, perPersonPrice: Number, subtotal: Number },
  { _id: false },
);

// How this booking's money was (or wasn't) collected. Kept as a subdocument so
// every gateway identifier a support query needs — order, payment, refund —
// lives on the booking itself rather than in gateway-only state.
//
// Legacy bookings predate this field entirely and simply have no `payment`
// object; every query below is written so a missing subdocument reads as
// "settled", never as "unpaid".
const paymentSchema = new mongoose.Schema(
  {
    // 'arrival' — cash at the trailhead, no gateway involved.
    // 'razorpay' — an online order exists and `status` tracks its lifecycle.
    method: { type: String, enum: ['arrival', 'razorpay'], default: 'arrival' },
    status: {
      type: String,
      enum: ['not_required', 'pending', 'paid', 'failed', 'refund_pending', 'refunded', 'partially_refunded'],
      default: 'not_required',
    },
    orderId: { type: String, default: null },
    paymentId: { type: String, default: null },
    refundId: { type: String, default: null },
    currency: { type: String, default: 'INR' },
    amountDue: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountRefunded: { type: Number, default: 0 },
    // 'checkout' (the browser handshake) or 'webhook' — whichever won the race
    // to confirm. Purely diagnostic, but the first thing worth knowing when a
    // payment lands without the customer ever seeing a success screen.
    confirmedVia: { type: String, default: null },
    signatureVerified: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    // Last gateway-reported failure. Recorded even while the booking stays
    // pending, because a customer may retry after a declined card.
    failureReason: { type: String, default: '' },
    // When an unpaid order stops holding its seats — see expireStalePayments().
    expiresAt: { type: Date, default: null },
  },
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
    // Kept as-is for existing clients: a human-readable reference, either the
    // Razorpay payment id or a POA_ marker for Pay on Arrival.
    paymentRef: String,
    payment: { type: paymentSchema, default: () => ({}) },
    status: { type: String, enum: ['Upcoming', 'Ongoing', 'Completed', 'Missed', 'Cancelled'], default: 'Upcoming' },
    // Phase 6 (check-in) fields, present but unused until then.
    checkedInAt: { type: String, default: null },
    checkedInBy: { type: String, default: null },
  },
  { timestamps: true },
);

// Webhooks and the checkout handshake both arrive knowing only a gateway id,
// and both are on the hot path of a payment landing.
bookingSchema.index({ 'payment.orderId': 1 }, { sparse: true });
bookingSchema.index({ 'payment.paymentId': 1 }, { sparse: true });
// Drives the stale-order sweep.
bookingSchema.index({ 'payment.status': 1, 'payment.expiresAt': 1 });

// A booking whose online payment never completed has reserved seats and a money
// snapshot, but is not a real sale: it must stay out of the customer's list, the
// organizer's list, and — most importantly — out of the organizer's payable
// balance. Mix this into any query that treats bookings as revenue.
//
// `$nin` matches documents where the field is absent, so the pre-Razorpay
// bookings that have no payment subdocument are included exactly as before.
export const SETTLED_BOOKING_FILTER = Object.freeze({
  'payment.status': { $nin: ['pending', 'failed'] },
});

bookingSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject({ versionKey: false });
  o.id = o._id.toString();
  delete o._id;
  return o;
};

export default mongoose.model('Booking', bookingSchema);
