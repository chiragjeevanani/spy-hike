import mongoose from 'mongoose';

// Admin-curated trek catalog (e.g. "KedarKantha", "Hampta Pass", "Leh Ladakh").
// This is the trek's canonical identity — title, location, difficulty,
// duration, distance, cover image — shared by every organizer who posts a
// batch under it. Organizers pick one of these when creating a trip instead
// of typing trek details freely, so every offering of the same trek shows
// identical stats on the public trek page.
//
// Distinct from the Category model (Trekking/Hiking/Camping — an activity
// type tag on individual trips), which this does not replace.
const itineraryDaySchema = new mongoose.Schema(
  { day: Number, title: String, description: String },
  { _id: false },
);

const trekSchema = new mongoose.Schema(
  {
    _id: { type: String }, // slug, e.g. "kedarkantha"
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    startingPoint: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    difficulty: { type: String, enum: ['Easy', 'Moderate', 'Difficult'], required: true },
    durationDays: { type: Number, required: true, min: 1 },
    distanceKm: { type: Number, required: true, min: 0 },
    elevationMeters: { type: Number, default: 0, min: 0 },
    coverImage: { type: String, required: true },
    galleryImages: { type: [String], default: [] },
    category: { type: String, default: '' }, // optional activity-type tag
    description: { type: String, default: '' },
    itinerary: { type: [itineraryDaySchema], default: [] },
    thingsToCarry: { type: [String], default: [] },
    included: { type: [String], default: [] },
    notIncluded: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    trending: { type: Boolean, default: false }, // drives the customer app's "Trending destinations" grid
  },
  { timestamps: true, _id: false },
);

// The catalog had no indexes at all, so every public list was a collection
// scan plus an in-memory sort. Both public reads filter on `status`.
// `title` trails each key so the { title: 1 } sort is served by the index
// rather than an in-memory SORT stage.
trekSchema.index({ status: 1, title: 1 });               // GET /treks
trekSchema.index({ status: 1, trending: 1, title: 1 });  // GET /treks?trending=true

trekSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject({ versionKey: false });
  obj.id = obj._id;
  delete obj._id;
  return obj;
};

export default mongoose.model('Trek', trekSchema);
