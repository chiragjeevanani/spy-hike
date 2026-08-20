import mongoose from 'mongoose';

// A "the trek I need isn't in the catalog" proposal from an organizer. Same
// shape as Trek (title/location/difficulty/duration/distance/image are what
// get promoted into a real Trek on approval) plus who asked and the admin's
// review state. Never appears in the live /treks catalog itself — only
// approval creates an actual Trek document.
const trekRequestSchema = new mongoose.Schema(
  {
    _id: { type: String },
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    state: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    difficulty: { type: String, enum: ['Easy', 'Moderate', 'Difficult'], required: true },
    // Ranges, matching Trek — see the note there.
    durationDays: { type: Number, required: true, min: 1 },
    durationDaysMax: { type: Number, default: null, min: 1 },
    distanceKm: { type: Number, required: true, min: 0 },
    distanceKmMax: { type: Number, default: null, min: 0 },
    elevationMeters: { type: Number, default: 0, min: 0 },
    coverImage: { type: String, required: true },
    category: { type: String, default: '' },
    description: { type: String, default: '' },
    requestedByEmail: { type: String, required: true, index: true },
    requestedByName: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    reviewNote: { type: String, default: '' },
    trekId: { type: String, default: null }, // set to the created Trek's id on approval
  },
  { timestamps: true, _id: false },
);

trekRequestSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = obj._id;
  delete obj._id;
  return obj;
};

export default mongoose.model('TrekRequest', trekRequestSchema);
