import mongoose from 'mongoose';

// Singleton platform configuration. The commission rate is the single source
// of truth for the money split (resolves context.md §4.1 — the frontend
// previously had an admin setting AND a hardcoded 10% fallback that could
// disagree). Tax rate is stored here too for parity (frontend still shows a
// flat 5% today, but pricing reads it from config so it's configurable).
const adminConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'platform' },
    commissionRate: { type: Number, default: 10 }, // percent
    taxRate: { type: Number, default: 5 }, // percent
  },
  { timestamps: true, _id: false },
);

adminConfigSchema.methods.toPublicJSON = function toPublicJSON() {
  return { commissionRate: this.commissionRate, taxRate: this.taxRate };
};

const AdminConfig = mongoose.model('AdminConfig', adminConfigSchema);

// Find-or-create the singleton config document.
export async function getConfig() {
  let cfg = await AdminConfig.findById('platform');
  if (!cfg) cfg = await AdminConfig.create({ _id: 'platform' });
  return cfg;
}

export default AdminConfig;
