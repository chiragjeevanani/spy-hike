/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared legal/support CMS content: defaults + deep-merge + offline-first
// localStorage cache. Mirrors modules/landing/landingContent.js — imported by
// both the customer app's Privacy Policy / Support pages and the admin CMS
// editor so the two never drift. Defaults mirror backend models/SiteContent.js.

export const DEFAULT_SITE_CONTENT = {
  privacyPolicy: {
    heading: 'Privacy Policy',
    effectiveDate: '1 January 2026',
    intro:
      'Find Your Trek ("we", "our", "us") respects your privacy. This policy explains what information we collect, how we use it, and the choices you have.',
    sections: [
      { title: 'Information We Collect', body: 'We collect account details (name, email, mobile), booking and payment information, device/location data used for trek safety features, and any content you submit (reviews, chat messages, support tickets).' },
      { title: 'How We Use Your Information', body: 'To process bookings and payments, verify your identity, coordinate trek safety and emergency contacts, send booking and trail-safety notifications, and improve our services.' },
      { title: 'Sharing Your Information', body: 'We share booking details with the trek organizer you book with. We never sell your personal data. Payment details are processed by our payment partner and are not stored on our servers.' },
      { title: 'Data Retention', body: 'We retain your account data while your account is active. If you deactivate your account, your data is retained but access is suspended until an admin reactivates it or you request deletion.' },
      { title: 'Your Rights', body: 'You may access, update, or request deletion of your personal data at any time from the app, or by contacting customer support below.' },
    ],
  },
  support: {
    heading: 'Support & Help Center',
    intro: 'Have a question or an issue with a booking? Reach out to our support team — we typically respond within 24 hours.',
    email: 'support@findyourtrek.com',
    phone: '+91 99999 88888',
    whatsapp: '',
    hours: 'Mon–Sat, 9:00 AM – 7:00 PM IST',
    faqs: [
      { q: 'How soon can I cancel my trek departure?', a: 'Full booking refund settlements are executed up to 15 days before the departure slot.' },
      { q: 'Are park mountain permits physical documents?', a: 'No, Find Your Trek coordinates verified digital QR pass entries directly with forest control gates.' },
    ],
  },
};

// Shallow-per-section merge of a (possibly partial) API payload over the
// defaults, so pages always have every section/field even if the backend
// omits one. Arrays are taken as-is from the source when present.
export function mergeSiteContent(partial) {
  if (!partial || typeof partial !== 'object') return DEFAULT_SITE_CONTENT;
  const out = {};
  for (const section of Object.keys(DEFAULT_SITE_CONTENT)) {
    out[section] = { ...DEFAULT_SITE_CONTENT[section], ...(partial[section] || {}) };
  }
  return out;
}

// ─── Offline-first localStorage cache ───────────────────────────────────────
// Same-origin localStorage is shared across the /app and /admin SPAs, so an
// admin edit is visible to the customer app in the same browser even when the
// backend is unreachable.

export const SITE_CONTENT_KEY = 'trekigo_site_content';

export function loadSiteContentLocal() {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_KEY);
    return mergeSiteContent(raw ? JSON.parse(raw) : null);
  } catch {
    return mergeSiteContent(null);
  }
}

export function saveSiteContentLocal(content) {
  try {
    localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(content));
  } catch {
    /* ignore storage failures (private mode, quota, etc.) */
  }
}
