import mongoose from 'mongoose';

// Customer / hiker account. Shapes the public serializer to match the
// frontend user object (context.md §6.3) so the client can swap localStorage
// for the API with minimal churn.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String }, // absent for OTP/Google-only accounts
    mobile: { type: String, trim: true, default: '' },
    mobileVerified: { type: Boolean, default: false }, // phone confirmed via OTP
    age: { type: Number, default: 24 },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    avatar: { type: String, default: '' },
    hikingExperience: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    fitnessLevel: { type: String, enum: ['Low', 'Moderate', 'High'], default: 'Moderate' },
    emergencyContact: { type: String, default: '' },
    isOnboarded: { type: Boolean, default: false },
    status: { type: String, enum: ['Active', 'Banned'], default: 'Active' },
    authProvider: { type: String, enum: ['password', 'otp', 'google'], default: 'password' },
    wishlist: { type: [String], default: [] }, // bookmarked trip ids
  },
  { timestamps: true },
);

// Frontend-shaped public object. `isAuthenticated: true` because this is only
// ever serialized for the authenticated principal. `isOrganizer` is filled in
// by the caller (it depends on the organizers collection), defaulting false.
userSchema.methods.toPublicJSON = function toPublicJSON({ isOrganizer = false } = {}) {
  return {
    id: this._id.toString(),
    role: 'customer',
    isAuthenticated: true,
    isOnboarded: this.isOnboarded,
    isOrganizer,
    name: this.name,
    email: this.email,
    mobile: this.mobile,
    mobileVerified: this.mobileVerified,
    age: this.age,
    gender: this.gender,
    avatar: this.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=2D5A27&color=fff`,
    hikingExperience: this.hikingExperience,
    fitnessLevel: this.fitnessLevel,
    emergencyContact: this.emergencyContact,
    status: this.status,
  };
};

export default mongoose.model('User', userSchema);
