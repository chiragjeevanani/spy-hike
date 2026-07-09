import mongoose from 'mongoose';

// A dated batch of one trip, with its own seat inventory. This is the real
// per-departure capacity the frontend never had — a trip's flat
// `departureDates` array is expanded into one Departure per date so seats can
// be reserved and sold out independently.
const departureSchema = new mongoose.Schema(
  {
    tripId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    totalSeats: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
  },
  { timestamps: true },
);

// One departure per (trip, date).
departureSchema.index({ tripId: 1, date: 1 }, { unique: true });

departureSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    tripId: this.tripId,
    date: this.date,
    totalSeats: this.totalSeats,
    availableSeats: this.availableSeats,
    soldOut: this.availableSeats <= 0,
  };
};

export default mongoose.model('Departure', departureSchema);
