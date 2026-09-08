import mongoose from 'mongoose';

export const DEFAULT_PROMOTIONAL_BANNERS = [
  {
    id: 'promo-1',
    title: 'Himalayan Ridge Pass',
    subtitle: 'Conquer the Snow Peaks',
    tag: 'Trending Adventure',
    discount: 'Flat 20% Off',
    code: 'FYT20',
    img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    tripId: 'himalayan-ridge-pass-trek',
    active: true,
  },
  {
    id: 'promo-2',
    title: 'Valley of Flowers',
    subtitle: 'Uttarakhand Monsoon Special',
    tag: 'Monsoon Trail',
    discount: 'Save ₹50',
    code: 'VALLEY50',
    img: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
    tripId: 'valley-of-flowers-trek',
    active: true,
  },
  {
    id: 'promo-3',
    title: 'Western Ghats Monsoon',
    subtitle: 'Weekend Refresh',
    tag: 'Lush Green Escape',
    discount: '15% Off Group Bookings',
    code: 'GHATS15',
    img: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80',
    tripId: 'western-ghats-monsoon-trail',
    active: true,
  },
];

const bannerItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    tag: { type: String, default: '' },
    discount: { type: String, default: '' },
    code: { type: String, default: '' },
    img: { type: String, default: '' },
    tripId: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const promotionalBannerSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'promo_banners' },
    banners: {
      type: [bannerItemSchema],
      default: () => DEFAULT_PROMOTIONAL_BANNERS,
    },
  },
  { timestamps: true, _id: false },
);

promotionalBannerSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject({ versionKey: false });
  const activeBanners = (o.banners || []).filter((b) => b.active !== false);
  return {
    banners: activeBanners,
    updatedAt: o.updatedAt || null,
  };
};

promotionalBannerSchema.methods.toAdminJSON = function toAdminJSON() {
  const o = this.toObject({ versionKey: false });
  return {
    banners: o.banners || [],
    updatedAt: o.updatedAt || null,
  };
};

const PromotionalBanner = mongoose.model('PromotionalBanner', promotionalBannerSchema);

export async function getPromotionalBannersDoc() {
  let doc = await PromotionalBanner.findById('promo_banners');
  if (!doc) {
    doc = await PromotionalBanner.create({
      _id: 'promo_banners',
      banners: DEFAULT_PROMOTIONAL_BANNERS,
    });
  }
  return doc;
}

export default PromotionalBanner;

