import mongoose from 'mongoose';

// Admin-managed taxonomy used by the square filters on the customer home page.
// Kept separate from Category, which describes a trip's activity type
// (Trekking, Camping, etc.). A trek can belong to any number of home filters.
const homeFilterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    label: { type: String, required: true, trim: true, maxlength: 40 },
    icon: {
      type: String,
      enum: ['Mountain', 'Trees', 'Leaf', 'Flame', 'Compass', 'Tent', 'Sun', 'Map', 'Snowflake'],
      default: 'Mountain',
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, _id: false },
);

homeFilterSchema.index({ active: 1, order: 1, label: 1 });

homeFilterSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    label: this.label,
    icon: this.icon,
    order: this.order,
    active: this.active,
  };
};

export default mongoose.model('HomeFilter', homeFilterSchema);
