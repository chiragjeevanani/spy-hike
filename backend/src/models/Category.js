import mongoose from 'mongoose';

// Trip category. `_id` is the stable category id/slug the frontend filters by
// (e.g. "Trekking"); `icon` names a lucide-react icon the client renders.
const categorySchema = new mongoose.Schema(
  {
    _id: { type: String }, // category id (also its label today)
    label: { type: String, required: true },
    icon: { type: String, default: 'Mountain' },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

categorySchema.methods.toPublicJSON = function toPublicJSON() {
  return { id: this._id, label: this.label, icon: this.icon };
};

export default mongoose.model('Category', categorySchema);
