import mongoose from 'mongoose';

// Bank/payout details captured in the organizer Financials view. Optional at
// registration; filled in later before requesting a payout (Phase 9).
const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    upiId: { type: String, default: '' },
    panNumber: { type: String, default: '' },
  },
  { _id: false },
);

// Organizer / partner-agency account. First-class entity (context.md §6.4).
// Approval is admin-driven only: registration always lands pending.
const organizerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    mobile: { type: String, trim: true, default: '' },
    mobileVerified: { type: Boolean, default: false }, // phone confirmed via OTP
    agencyName: { type: String, default: '' },
    agencyWebsite: { type: String, default: '' },
    socialMediaLink: { type: String, default: '' },
    govtIdType: {
      type: String,
      enum: ['Aadhaar', 'PAN', 'GST', 'Passport', 'TIN'],
      default: 'Aadhaar',
    },
    govtIdNumber: { type: String, default: '' },
    yearsExperience: { type: Number, default: 1 },
    bio: { type: String, default: '' },
    coreCapabilities: { type: [String], default: [] },
    avatar: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    totalTrips: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    isPendingApproval: { type: Boolean, default: true },
    isRejected: { type: Boolean, default: false },
    bankDetails: { type: bankDetailsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

organizerSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    role: 'organizer',
    isAuthenticated: true,
    isOnboarded: true,
    isApproved: this.isApproved,
    isPendingApproval: this.isPendingApproval,
    isRejected: this.isRejected,
    name: this.name,
    email: this.email,
    mobile: this.mobile,
    mobileVerified: this.mobileVerified,
    agencyName: this.agencyName,
    agencyWebsite: this.agencyWebsite,
    socialMediaLink: this.socialMediaLink,
    govtIdType: this.govtIdType,
    govtIdNumber: this.govtIdNumber,
    yearsExperience: this.yearsExperience,
    bio: this.bio,
    coreCapabilities: this.coreCapabilities,
    avatar: this.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.agencyName || this.name)}&background=F27D26&color=fff`,
    rating: this.rating,
    totalTrips: this.totalTrips,
    totalBookings: this.totalBookings,
    bankDetails: this.bankDetails,
  };
};

export default mongoose.model('Organizer', organizerSchema);
