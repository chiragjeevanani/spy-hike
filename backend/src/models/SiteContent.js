import mongoose from 'mongoose';

// Singleton legal/support content — same pattern as LandingContent (see that
// file for the rationale). The admin CMS writes it; the public endpoint and
// the customer app's Privacy Policy / Support pages read it unauthenticated,
// so the copy (and the support contact details shown on the "account
// deactivated" popup) stays fully editable without a redeploy.

const policySectionSchema = new mongoose.Schema({ title: String, body: String }, { _id: false });
const faqSchema = new mongoose.Schema({ q: String, a: String }, { _id: false });

const siteContentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'site' },

    privacyPolicy: {
      heading: { type: String, default: 'Privacy Policy' },
      effectiveDate: { type: String, default: '1 January 2026' },
      intro: {
        type: String,
        default:
          'Find Your Trek ("we", "our", "us") respects your privacy. This policy explains what information we collect, how we use it, and the choices you have.',
      },
      sections: {
        type: [policySectionSchema],
        default: () => [
          { title: 'Information We Collect', body: 'We collect account details (name, email, mobile), booking and payment information, device/location data used for trek safety features, and any content you submit (reviews, chat messages, support tickets).' },
          { title: 'How We Use Your Information', body: 'To process bookings and payments, verify your identity, coordinate trek safety and emergency contacts, send booking and trail-safety notifications, and improve our services.' },
          { title: 'Sharing Your Information', body: 'We share booking details with the trek organizer you book with. We never sell your personal data. Payment details are processed by our payment partner and are not stored on our servers.' },
          { title: 'Data Retention', body: 'We retain your account data while your account is active. If you deactivate your account, your data is retained but access is suspended until an admin reactivates it or you request deletion.' },
          { title: 'Your Rights', body: 'You may access, update, or request deletion of your personal data at any time from the app, or by contacting customer support below.' },
        ],
      },
    },

    support: {
      heading: { type: String, default: 'Support & Help Center' },
      intro: {
        type: String,
        default: 'Have a question or an issue with a booking? Reach out to our support team — we typically respond within 24 hours.',
      },
      email: { type: String, default: 'support@findyourtrek.com' },
      phone: { type: String, default: '+91 99999 88888' },
      whatsapp: { type: String, default: '' },
      hours: { type: String, default: 'Mon–Sat, 9:00 AM – 7:00 PM IST' },
      faqs: {
        type: [faqSchema],
        default: () => [
          { q: 'How soon can I cancel my trek departure?', a: 'Full booking refund settlements are executed up to 15 days before the departure slot.' },
          { q: 'Are park mountain permits physical documents?', a: 'No, Find Your Trek coordinates verified digital QR pass entries directly with forest control gates.' },
        ],
      },
    },
  },
  { timestamps: true, _id: false, minimize: false },
);

siteContentSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject({ versionKey: false });
  delete o._id;
  return o;
};

const SiteContent = mongoose.model('SiteContent', siteContentSchema);

// Find-or-create the singleton content document.
export async function getSiteContent() {
  let doc = await SiteContent.findById('site');
  if (!doc) doc = await SiteContent.create({ _id: 'site' });
  return doc;
}

export default SiteContent;
