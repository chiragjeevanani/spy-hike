import mongoose from 'mongoose';

// An organizer payout request + settlement (context.md §8/§9). Status values
// mirror the frontend OrgFinancialsView: 'Processing' (requested), 'Paid'
// (admin-settled, with a UTR), 'Rejected'.
// Snapshot of the destination account at request time, so the receipt/report
// is accurate even if the organizer later edits their bank details.
const bankSnapshotSchema = new mongoose.Schema(
  { accountHolderName: String, bankName: String, accountNumber: String, ifsc: String, upiId: String },
  { _id: false },
);

const payoutSchema = new mongoose.Schema(
  {
    organizerEmail: { type: String, required: true, index: true },
    organizerName: String,
    agencyName: String,
    amount: { type: Number, required: true },
    method: { type: String, default: 'Bank Transfer' },
    status: { type: String, enum: ['Processing', 'Paid', 'Rejected'], default: 'Processing' },
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    utr: { type: String, default: null },
    reference: { type: String }, // human payout id e.g. PO-2026-0042
    bankSnapshot: { type: bankSnapshotSchema, default: () => ({}) },
    rejectionReason: { type: String, default: null },
    settledBy: { type: String, default: null }, // admin email
  },
  { timestamps: true },
);

// Masks all but the last 4 of the account number for display/receipt.
function maskAccount(num) {
  if (!num) return '';
  const s = String(num);
  return s.length > 4 ? `••••${s.slice(-4)}` : s;
}

payoutSchema.methods.toPublicJSON = function toPublicJSON() {
  const bank = this.bankSnapshot || {};
  return {
    id: this._id.toString(),
    reference: this.reference,
    organizerEmail: this.organizerEmail,
    organizerName: this.organizerName,
    agencyName: this.agencyName,
    amount: this.amount,
    method: this.method,
    status: this.status,
    requestedAt: this.requestedAt,
    completedAt: this.completedAt,
    utr: this.utr,
    rejectionReason: this.rejectionReason,
    settledBy: this.settledBy,
    bank: {
      accountHolderName: bank.accountHolderName || '',
      bankName: bank.bankName || '',
      accountNumberMasked: maskAccount(bank.accountNumber),
      ifsc: bank.ifsc || '',
      upiId: bank.upiId || '',
    },
  };
};

export default mongoose.model('Payout', payoutSchema);
