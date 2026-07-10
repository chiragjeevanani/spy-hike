import mongoose from 'mongoose';

// An organizer payout request + settlement (context.md §8/§9). Status values
// mirror the frontend OrgFinancialsView: 'Processing' (requested), 'Paid'
// (admin-settled, with a UTR), 'Rejected'.
const payoutSchema = new mongoose.Schema(
  {
    organizerEmail: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    method: { type: String, default: 'Bank Transfer' },
    status: { type: String, enum: ['Processing', 'Paid', 'Rejected'], default: 'Processing' },
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    utr: { type: String, default: null },
  },
  { timestamps: true },
);

payoutSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    organizerEmail: this.organizerEmail,
    amount: this.amount,
    method: this.method,
    status: this.status,
    requestedAt: this.requestedAt,
    completedAt: this.completedAt,
    utr: this.utr,
  };
};

export default mongoose.model('Payout', payoutSchema);
