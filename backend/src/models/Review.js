import mongoose from 'mongoose';

// A trip review left by a customer. The trip document also keeps a denormalized
// copy in its reviews[] plus rolled-up rating/reviewsCount for fast catalog
// rendering (context.md §5).
const reviewSchema = new mongoose.Schema(
  {
    tripId: { type: String, required: true, index: true },
    bookingId: { type: String, default: null },
    userEmail: { type: String, required: true },
    userName: String,
    userAvatar: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    date: { type: String }, // "YYYY-MM-DD"
  },
  { timestamps: true },
);

// One review per booking (prevents a customer double-reviewing the same trip
// off one booking). Sparse so non-booking reviews aren't constrained.
reviewSchema.index({ bookingId: 1 }, { unique: true, sparse: true });

reviewSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    tripId: this.tripId,
    userName: this.userName,
    userAvatar: this.userAvatar,
    rating: this.rating,
    comment: this.comment,
    date: this.date,
  };
};

export default mongoose.model('Review', reviewSchema);
