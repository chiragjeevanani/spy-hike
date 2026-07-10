import mongoose from 'mongoose';

// Singleton loyalty-program configuration, mirroring the frontend's
// DEFAULT_LOYALTY_CONFIG (utils/loyalty.js). Admin writes it; the customer and
// organizer apps read it for thresholds, reward copy, and banners.
const bannerSchema = new mongoose.Schema(
  { enabled: { type: Boolean, default: true }, image: { type: String, default: '' }, title: String, subtitle: String },
  { _id: false },
);

const loyaltyConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'loyalty' },
    customer: {
      enabled: { type: Boolean, default: true },
      thresholdPersons: { type: Number, default: 30 },
      rewardTitle: { type: String, default: 'Free Trek Booking' },
      rewardDescription: {
        type: String,
        default: 'Book 30 travelers cumulatively — solo or in groups, across any treks — and your next booking is completely free, on us.',
      },
      banner: {
        type: bannerSchema,
        default: () => ({ enabled: true, image: '', title: 'Trek 30, Get 1 Free!', subtitle: 'Every 30 travelers you book unlocks one free adventure.' }),
      },
    },
    organizer: {
      enabled: { type: Boolean, default: true },
      thresholdBookings: { type: Number, default: 1000 },
      rewardTitle: { type: String, default: 'Zero-Commission Booking' },
      rewardDescription: {
        type: String,
        default: 'Cross 1000 bookings via Trekigo and earn a zero-commission credit — apply it to any upcoming booking to keep 100% of that payout.',
      },
      banner: {
        type: bannerSchema,
        default: () => ({ enabled: true, image: '', title: '1000 Bookings Milestone', subtitle: 'Every 1000 trips hosted unlocks a free, zero-commission booking.' }),
      },
    },
  },
  { timestamps: true, _id: false },
);

loyaltyConfigSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject({ versionKey: false });
  return { customer: o.customer, organizer: o.organizer, updatedAt: o.updatedAt || null };
};

const LoyaltyConfig = mongoose.model('LoyaltyConfig', loyaltyConfigSchema);

export async function getLoyaltyConfig() {
  let cfg = await LoyaltyConfig.findById('loyalty');
  if (!cfg) cfg = await LoyaltyConfig.create({ _id: 'loyalty' });
  return cfg;
}

export default LoyaltyConfig;
