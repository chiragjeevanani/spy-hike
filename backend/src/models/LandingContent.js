import mongoose from 'mongoose';

// Singleton marketing/landing-page content. The admin CMS writes it; the
// public landing page reads it (no auth). Defaults mirror the previously
// hardcoded LandingView so the page is unchanged until an admin edits it.
//
// Icons are stored as string keys (e.g. 'ShieldCheck') that the frontend maps
// to lucide-react components — the DB never holds JSX. The three portals are
// keyed ('hiker' | 'organizer' | 'admin') because each binds to a real launch
// action + gradient on the client; their copy is fully editable.

const linkSchema = new mongoose.Schema({ label: String, href: String }, { _id: false });
const metricSchema = new mongoose.Schema({ label: String, sub: String }, { _id: false });
const featureSchema = new mongoose.Schema({ icon: String, iconColor: String, title: String, desc: String }, { _id: false });
const portalSchema = new mongoose.Schema(
  { key: String, title: String, badge: String, desc: String, cta: String, features: { type: [String], default: [] } },
  { _id: false },
);
const testimonialSchema = new mongoose.Schema(
  { name: String, role: String, avatar: String, comment: String, rating: { type: Number, default: 5 }, trek: String },
  { _id: false },
);
const faqSchema = new mongoose.Schema({ q: String, a: String }, { _id: false });

const landingContentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'landing' },

    header: {
      logoText: { type: String, default: 'Find Your Trek' },
      ctaLabel: { type: String, default: 'Launch App' },
      navLinks: {
        type: [linkSchema],
        default: () => [
          { label: 'features', href: '#features' },
          { label: 'expeditions', href: '#expeditions' },
          { label: 'gateways', href: '#gateways' },
          { label: 'testimonials', href: '#testimonials' },
          { label: 'faq', href: '#faq' },
        ],
      },
    },

    hero: {
      badge: { type: String, default: 'Conquer Himalayan Altitudes' },
      titleLead: { type: String, default: 'Conquer High Peaks with' },
      titleHighlight: { type: String, default: 'Verified Guides' },
      subtitle: {
        type: String,
        default:
          'Find Your Trek connects hiking enthusiasts with local trekking agencies. Book eco-friendly expeditions, secure wilderness transit permits, and coordinate via simulated payment models and direct organizer chats.',
      },
      primaryCta: { type: String, default: 'Launch Hiker App' },
      secondaryCta: { type: String, default: 'Organizer Panel' },
      metrics: {
        type: [metricSchema],
        default: () => [
          { label: '4.9★', sub: 'Hiker Rating' },
          { label: '100%', sub: 'Verified Guides' },
          { label: '0%', sub: 'Middlemen Fee' },
        ],
      },
    },

    features: {
      visible: { type: Boolean, default: true },
      heading: { type: String, default: 'Smart Trek Platform Features' },
      subheading: {
        type: String,
        default: 'Engineered to offer safe, transparent, and direct connections to high-elevation guides and local trek guides.',
      },
      items: {
        type: [featureSchema],
        default: () => [
          { icon: 'Settings', iconColor: 'text-spy-orange', title: 'AI Recommendation Engine', desc: 'Tailors trek difficulty options dynamically based on your physical fitness level and alpine experience.' },
          { icon: 'ShieldCheck', iconColor: 'text-emerald-500', title: 'Verified Agency Guides', desc: 'Connect directly with local Sherpa guides carrying government-audited permits and zero-accident safety records.' },
          { icon: 'QrCode', iconColor: 'text-[#4A90E2]', title: 'Instant Permit Booking', desc: 'Secure high-altitude transit passes in a streamlined 3-step wizard with simulated Razorpay checkouts.' },
          { icon: 'MessageSquare', iconColor: 'text-purple-500', title: 'Real-time Coordinator Chat', desc: 'Direct communication line with guides and coordinators to plan gear lists and coordinate base assembly.' },
        ],
      },
    },

    expeditions: {
      visible: { type: Boolean, default: true },
      heading: { type: String, default: 'Popular Expeditions' },
      subheading: { type: String, default: 'View our active treks directly managed by local registered agencies.' },
      ctaLabel: { type: String, default: 'Explore Full Catalog' },
    },

    portals: {
      visible: { type: Boolean, default: true },
      heading: { type: String, default: 'Find Your Trek Portal Ecosystem' },
      subheading: {
        type: String,
        default: 'Our application features separate sandboxes representing key roles in the adventure marketplace. Try out each layout.',
      },
      items: {
        type: [portalSchema],
        default: () => [
          { key: 'hiker', title: 'Hiker Mobile App', badge: 'Sandbox Enabled', desc: 'Explore mountain expeditions, toggle wishlist items, customize add-ons, pay via simulated gateways, and manage live ticket bookings.', cta: 'Launch Hiker App', features: ['AI Trek Matching', '3-Step Fast Checkout', 'Direct Guide Chat', 'Notifications Bell'] },
          { key: 'organizer', title: 'Organizer Portal', badge: 'Agency Access', desc: 'Designed for local trekking agencies. Publish multi-day itineraries, manage seat inventory, upload dynamic photo galleries, and coordinate with hikers.', cta: 'Launch Organizer Portal', features: ['Dynamic Hike Form Builder', 'Booking Roster Trackers', 'Simulated Hiker Reply Chat', 'Verification Wizard'] },
        ],
      },
    },

    testimonials: {
      visible: { type: Boolean, default: true },
      heading: { type: String, default: 'Loved by Outdoor Trekkers' },
      subheading: { type: String, default: 'Here is what genuine outdoor lovers have to say about booking high-altitude passes and coordinates.' },
      items: {
        type: [testimonialSchema],
        default: () => [
          { name: 'Chirag Jeevanani', role: 'Intermediate Trekker', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', comment: 'The AI recommendation matched me perfectly with the Western Ghats Monsoon Trail. Using the 3-step checkout was incredibly seamless, and the ticket QR code was instantly generated!', rating: 5, trek: 'Western Ghats Monsoon Trail' },
          { name: 'Priya Patel', role: 'Advanced Mountaineer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', comment: 'Conquering the Himalayan Ridge Pass at 4,200m was a dream. The Sherpa guides verified through Find Your Trek provided top-notch geodesic domes and safety monitoring. Absolute five-star experience.', rating: 5, trek: 'Himalayan Ridge Pass Trek' },
          { name: 'Aarav Sharma', role: 'Weekend Explorer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', comment: 'I loved the Jaisalmer Desert Camp. Being able to chat directly with Desert Nomad Adventures beforehand to verify standard gear rentals was very reassuring. No hassle whatsoever.', rating: 4, trek: 'Stargazing Desert Camp & Trek' },
        ],
      },
    },

    faq: {
      visible: { type: Boolean, default: true },
      heading: { type: String, default: 'Frequently Asked Questions' },
      subheading: { type: String, default: 'Have questions? We have compiled standard logistical queries for your review.' },
      items: {
        type: [faqSchema],
        default: () => [
          { q: 'What makes Find Your Trek different from other booking systems?', a: 'Find Your Trek is built with a dual ecosystem: Hiker App and Organizer Portal. Hikers get direct access to local agencies without middlemen, while agencies get rich tools to manage day-by-day itineraries, add-ons, and safety lists.' },
          { q: 'Is the payment gateway secure?', a: 'Yes! For demonstration purposes, we integrate a simulated Razorpay payment flow which matches the exact steps of a real bank transaction without using real funds.' },
          { q: 'How does the AI Recommendation Engine work?', a: 'By auditing your user profile (Experience: Beginner/Intermediate/Advanced and Fitness Level: Low/Moderate/High), Find Your Trek automatically matches you with hikes that align with your safety limits.' },
        ],
      },
    },

    footer: {
      links: {
        type: [linkSchema],
        default: () => [
          { label: 'Features', href: '#features' },
          { label: 'Expeditions', href: '#expeditions' },
          { label: 'Portals', href: '#gateways' },
          { label: 'Reviews', href: '#testimonials' },
        ],
      },
      copyright: { type: String, default: '© 2026 Find Your Trek. Built with React 19, Tailwind v4 & Motion v12.' },
      subtext: { type: String, default: 'All coordinates, safety logs, and agencies are simulated for demo compliance.' },
    },
  },
  { timestamps: true, _id: false, minimize: false },
);

landingContentSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject({ versionKey: false });
  delete o._id;
  return o;
};

const LandingContent = mongoose.model('LandingContent', landingContentSchema);

// Find-or-create the singleton content document.
export async function getLandingContent() {
  let doc = await LandingContent.findById('landing');
  if (!doc) doc = await LandingContent.create({ _id: 'landing' });
  if (doc?.portals?.items?.some((p) => p.key === 'admin')) {
    doc.portals.items = doc.portals.items.filter((p) => p.key !== 'admin');
    await doc.save().catch(() => {});
  }
  return doc;
}

export default LandingContent;
