import mongoose from 'mongoose';

// Singleton onboarding content for both Customer and Organizer flows.
// The admin CMS writes it; public unauthenticated endpoints read it with caching.

const customerSlideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    icon: { type: String, default: 'Compass' },
    badge: { type: String, default: '' },
  },
  { _id: false }
);

const organizerSlideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    icon: { type: String, default: 'Compass' },
    accent: { type: String, default: 'text-spy-orange' },
    bgAccent: { type: String, default: 'bg-spy-orange/15 border-spy-orange/30' },
    quote: { type: String, default: '' },
    perks: { type: [String], default: [] },
  },
  { _id: false }
);

const onboardingContentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'onboarding' },

    customer: {
      visible: { type: Boolean, default: true },
      skipLabel: { type: String, default: 'Skip Onboarding' },
      slides: {
        type: [customerSlideSchema],
        default: () => [
          {
            title: 'Discover Amazing Hiking Adventures',
            description: 'Explore hand-picked treks across the majestic Himalayas, deep monsoon valleys, and pristine hidden ranges tailored to your fitness level.',
            image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
            icon: 'Compass',
            badge: 'Explore',
          },
          {
            title: 'Connect with Trusted Organizers',
            description: 'Interact with certified Sherpa guides, local environmental experts, and veteran peak summit clubs to guarantee safety on every peak.',
            image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
            icon: 'Users',
            badge: 'Community',
          },
          {
            title: 'Book and Explore Nature Safely',
            description: 'Enjoy guaranteed instant bookings, responsive safety guides, real-time weather logs, and simple secure refund policies.',
            image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
            icon: 'Shield',
            badge: 'Safety',
          },
        ],
      },
    },

    organizer: {
      visible: { type: Boolean, default: true },
      badgeText: { type: String, default: 'Organizer Portal' },
      skipLabel: { type: String, default: 'Skip' },
      slides: {
        type: [organizerSlideSchema],
        default: () => [
          {
            title: 'Welcome to Find Your Trek Partners',
            description: 'Join our verified network of trek organizers. Reach thousands of adventurers looking for their next expedition.',
            image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80',
            icon: 'Compass',
            accent: 'text-spy-orange',
            bgAccent: 'bg-spy-orange/15 border-spy-orange/30',
            quote: 'Trusted by 250+ certified mountain guides and adventure operators across India.',
            perks: ['Reach 50,000+ passionate hikers', 'Official verified partner badge', 'Zero setup or listing fees'],
          },
          {
            title: 'Post and Manage Your Trips',
            description: 'Create detailed trip listings with itineraries, galleries, pricing tiers, and real-time seat availability from one unified console.',
            image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
            icon: 'ClipboardList',
            accent: 'text-emerald-500',
            bgAccent: 'bg-emerald-500/15 border-emerald-500/30',
            quote: 'Full control over multiple batch dates, group tiers, and trailhead coordinates.',
            perks: ['Multiple departure batches', 'Tiered pricing (Solo/Duo/Group)', 'Interactive trailhead map pin'],
          },
          {
            title: 'Track Bookings & Fast Payouts',
            description: 'Monitor incoming bookings in real-time, chat with hikers, unlock 0% commission rewards, and receive direct bank disbursements.',
            image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
            icon: 'TrendingUp',
            accent: 'text-amber-500',
            bgAccent: 'bg-amber-500/15 border-amber-500/30',
            quote: 'Transparent automated commission accounting and 1-click bank settlement.',
            perks: ['Real-time push notifications', 'Automated bank payouts & UTR', '0% commission loyalty vouchers'],
          },
          {
            title: 'Get Verified & Go Live',
            description: 'Submit your agency details and identification. Once our team verifies your credentials, your treks go live to travelers immediately.',
            image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
            icon: 'Shield',
            accent: 'text-blue-500',
            bgAccent: 'bg-blue-500/15 border-blue-500/30',
            quote: 'Safety and authenticity come first. Verification protects both guides and hikers.',
            perks: ['Fast 24–48 hour turnaround', 'Trusted Partner certificate', 'Dedicated 24/7 operator support'],
          },
        ],
      },
    },
  },
  { timestamps: true, _id: false, minimize: false }
);

onboardingContentSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject({ versionKey: false });
  delete o._id;
  return o;
};

const OnboardingContent = mongoose.model('OnboardingContent', onboardingContentSchema);

// Find-or-create singleton document
export async function getOnboardingContent() {
  let doc = await OnboardingContent.findById('onboarding');
  if (!doc) {
    doc = await OnboardingContent.create({ _id: 'onboarding' });
  }
  return doc;
}

export default OnboardingContent;
