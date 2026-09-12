import mongoose from 'mongoose';
import { isPromotedNow } from '../utils/promotion.js';

// Bank/payout details stored inside the organizer sub-document.
const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, default: '' },
    bankName:          { type: String, default: '' },
    accountNumber:     { type: String, default: '' },
    ifsc:              { type: String, default: '' },
    upiId:             { type: String, default: '' },
    panNumber:         { type: String, default: '' },
  },
  { _id: false },
);

// Organizer-specific fields stored as a nested sub-document.
// Only populated when isOrganizer === true; absent for pure customers.
const organizerSubSchema = new mongoose.Schema(
  {
    agencyName:        { type: String, default: '' },
    agencyWebsite:     { type: String, default: '' },
    socialMediaLink:   { type: String, default: '' },
    govtIdType: {
      type: String,
      enum: ['Aadhaar', 'PAN', 'GST', 'Passport', 'TIN'],
      default: 'Aadhaar',
    },
    govtIdNumber:      { type: String, default: '' },
    // Photo of the physical ID/license itself, uploaded at registration —
    // a Cloudinary URL (see POST /auth/upload), never a base64 blob. Optional:
    // an organizer can still apply without one, but the admin review screen
    // has nothing to show until they do.
    govtIdImageUrl:    { type: String, default: '' },
    yearsExperience:   { type: Number, default: 1 },
    bio:               { type: String, default: '' },
    coreCapabilities:  { type: [String], default: [] },
    supportEmail:      { type: String, default: '' },
    supportPhone:      { type: String, default: '' },
    headline:          { type: String, default: '' },
    rating:            { type: Number, default: 0 },
    totalTrips:        { type: Number, default: 0 },
    totalBookings:     { type: Number, default: 0 },
    isApproved:        { type: Boolean, default: false },
    isPendingApproval: { type: Boolean, default: true },
    isRejected:        { type: Boolean, default: false },
    bankDetails:       { type: bankDetailsSchema, default: () => ({}) },
    // Admin-granted priority window — see utils/promotion.js. Set together;
    // "promoted" is never a stored boolean, just promotedUntil > now.
    promotedFrom:      { type: Date, default: null },
    promotedUntil:     { type: Date, default: null },
    promotionPriority: { type: Number, default: 0 },
  },
  { _id: false },
);

// Unified customer + organizer account.
// Everyone who registers is a customer (hiker). If they apply as an organizer
// and get approved, isOrganizer flips to true and the `organizer` sub-document
// is populated. The same email + password works for both the customer app and
// the organizer panel — no second account needed.
const userSchema = new mongoose.Schema(
  {
    // ── Core fields (always present) ──────────────────────────────────────
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    passwordHash:  { type: String },   // absent for OTP/Google-only accounts
    mobile: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (v) => { if (!v) return true; return /^\d{10}$/.test(v); },
        message: (props) => `${props.value} is not a valid 10-digit phone number!`,
      },
    },
    mobileVerified:    { type: Boolean, default: false },
    age:               { type: Number, default: 24 },
    gender:            { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
    avatar:            { type: String, default: '' },
    hikingExperience: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    fitnessLevel:      { type: String, enum: ['Low', 'Moderate', 'High'], default: 'Moderate' },
    emergencyContact:  { type: String, default: '' },
    isOnboarded:       { type: Boolean, default: false },
    status:            { type: String, enum: ['Active', 'Banned', 'Deactivated'], default: 'Active' },
    authProvider:      { type: String, enum: ['password', 'otp', 'google'], default: 'password' },
    wishlist:          { type: [String], default: [] },
    profileSetupComplete: { type: Boolean, default: false },
    notificationBookings: { type: Boolean, default: true },
    notificationUpdates:  { type: Boolean, default: true },
    notificationPromo:    { type: Boolean, default: false },
    referralCode:  { type: String, unique: true },
    referredBy:    { type: String, default: null },
    fcmToken:      { type: String, default: '' },

    // ── Organizer fields (only populated when isOrganizer: true) ──────────
    isOrganizer:   { type: Boolean, default: false },
    organizer:     { type: organizerSubSchema, default: null },
  },
  { timestamps: true },
);

userSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = 'TRK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// ── Serialisers ────────────────────────────────────────────────────────────────

// Customer-role public object. Always sets isAuthenticated + role.
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id:    this._id.toString(),
    role:  'customer',
    isAuthenticated: true,
    isOnboarded: this.isOnboarded,
    profileSetupComplete: this.profileSetupComplete,
    isOrganizer: this.isOrganizer,
    name:   this.name,
    email:  this.email,
    mobile: this.mobile,
    mobileVerified: this.mobileVerified,
    age:    this.age,
    gender: this.gender,
    avatar: this.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=2D5A27&color=fff`,
    hikingExperience: this.hikingExperience,
    fitnessLevel:     this.fitnessLevel,
    emergencyContact: this.emergencyContact,
    status: this.status,
    joinedDate: this.createdAt ? this.createdAt.toISOString().split('T')[0] : '',
    notificationBookings: this.notificationBookings,
    notificationUpdates:  this.notificationUpdates,
    notificationPromo:    this.notificationPromo,
    referralCode: this.referralCode || ('TRK-' + this._id.toString().substring(18).toUpperCase()),
    referredBy:   this.referredBy,
  };
};

// Organizer-role public object — returned when logging in / acting as an
// organizer. Merges core identity with the organizer sub-document.
userSchema.methods.toOrganizerJSON = function toOrganizerJSON() {
  const org = this.organizer || {};
  return {
    id:    this._id.toString(),
    role:  'organizer',
    isAuthenticated: true,
    isOnboarded:     true,
    isOrganizer:     true,
    isApproved:        org.isApproved        ?? false,
    isPendingApproval: org.isPendingApproval ?? true,
    isRejected:        org.isRejected        ?? false,
    name:   this.name,
    email:  this.email,
    mobile: this.mobile,
    mobileVerified: this.mobileVerified,
    avatar: this.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(org.agencyName || this.name)}&background=F27D26&color=fff`,
    agencyName:       org.agencyName      || '',
    agencyWebsite:    org.agencyWebsite   || '',
    socialMediaLink:  org.socialMediaLink || '',
    govtIdType:       org.govtIdType      || 'Aadhaar',
    govtIdNumber:     org.govtIdNumber    || '',
    govtIdImageUrl:   org.govtIdImageUrl  || '',
    yearsExperience:  org.yearsExperience ?? 1,
    bio:              org.bio             || '',
    coreCapabilities: org.coreCapabilities || [],
    supportEmail:     org.supportEmail    || '',
    supportPhone:     org.supportPhone    || '',
    headline:         org.headline        || '',
    rating:           org.rating          ?? 0,
    totalTrips:       org.totalTrips      ?? 0,
    totalBookings:    org.totalBookings   ?? 0,
    bankDetails:      org.bankDetails     || {},
    isPromoted:       isPromotedNow(org.promotedUntil),
    promotedFrom:     org.promotedFrom  || null,
    promotedUntil:    org.promotedUntil || null,
    promotionPriority: org.promotionPriority ?? 0,
    joinedDate: this.createdAt ? this.createdAt.toISOString().split('T')[0] : '',
  };
};

export default mongoose.model('User', userSchema);
