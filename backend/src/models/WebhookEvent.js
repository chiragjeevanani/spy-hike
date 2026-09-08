import mongoose from 'mongoose';

// The idempotency ledger for inbound gateway webhooks.
//
// Razorpay retries any delivery that doesn't answer 2xx, and can repeat one
// that did. Without a ledger a retry would re-run the post-payment side effects
// — a second confirmation notification, a duplicate loyalty voucher, a second
// increment of the organizer's booking counter. The unique index on `eventId`
// is what makes that impossible: the insert is the lock, so two concurrent
// deliveries of the same event cannot both proceed.
//
// The payload is retained for support and replay; a TTL keeps the collection
// from growing without bound.
const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, default: 'razorpay', index: true },
    // Razorpay's `x-razorpay-event-id` header — stable across retries of the
    // same event, which is precisely the property this relies on.
    eventId: { type: String, required: true, unique: true },
    event: { type: String, index: true },
    status: {
      type: String,
      enum: ['processing', 'processed', 'ignored', 'failed'],
      default: 'processing',
    },
    // Denormalised for support lookups ("what happened to booking TG-1234?").
    bookingId: { type: String, default: null, index: true },
    orderId: { type: String, default: null },
    paymentId: { type: String, default: null },
    note: { type: String, default: '' },
    // A delivery that errored is left reclaimable, so Razorpay's retry gets a
    // second run at it instead of being deduped into silence.
    attempts: { type: Number, default: 1 },
    error: { type: String, default: '' },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// Ninety days is well past any realistic reconciliation or dispute window.
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

webhookEventSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject({ versionKey: false });
  o.id = o._id.toString();
  delete o._id;
  return o;
};

export default mongoose.model('WebhookEvent', webhookEventSchema);
