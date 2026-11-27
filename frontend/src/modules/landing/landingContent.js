/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared landing-page content: the default (fallback) content, the icon
// registry used to render string icon keys, and a deep-merge helper. Imported
// by both the public LandingView and the admin LandingCmsView so the two never
// drift. Defaults mirror backend models/LandingContent.js.

import {
  Settings, ShieldCheck, QrCode, MessageSquare, Compass, Mountain, Tent, Flame,
  Trees, CalendarDays, Star, MapPin, Users, Clock, CheckCircle2, Heart, Award,
  Zap, Globe, Camera, Map, Sparkles, Wallet,
} from 'lucide-react';

// String key → lucide component. The DB stores the key; the page renders the
// component. Any unknown key falls back to Compass.
export const LANDING_ICONS = {
  Settings, ShieldCheck, QrCode, MessageSquare, Compass, Mountain, Tent, Flame,
  Trees, CalendarDays, Star, MapPin, Users, Clock, CheckCircle2, Heart, Award,
  Zap, Globe, Camera, Map, Sparkles, Wallet,
};

export const ICON_OPTIONS = Object.keys(LANDING_ICONS);

export const resolveIcon = (key) => LANDING_ICONS[key] || Compass;

// Preset icon colors offered in the CMS (Tailwind text classes).
export const ICON_COLOR_OPTIONS = [
  { label: 'Orange', value: 'text-spy-orange' },
  { label: 'Emerald', value: 'text-emerald-500' },
  { label: 'Blue', value: 'text-[#4A90E2]' },
  { label: 'Purple', value: 'text-purple-500' },
  { label: 'Rose', value: 'text-rose-500' },
  { label: 'Amber', value: 'text-amber-500' },
  { label: 'Forest', value: 'text-forest-500' },
];

export const DEFAULT_LANDING_CONTENT = {
  header: {
    logoText: 'Find Your Trek',
    ctaLabel: 'Launch App',
    navLinks: [
      { label: 'features', href: '#features' },
      { label: 'expeditions', href: '#expeditions' },
      { label: 'gateways', href: '#gateways' },
      { label: 'testimonials', href: '#testimonials' },
      { label: 'faq', href: '#faq' },
    ],
  },
  hero: {
    badge: 'Conquer Himalayan Altitudes',
    titleLead: 'Conquer High Peaks with',
    titleHighlight: 'Verified Guides',
    subtitle:
      'Find Your Trek connects hiking enthusiasts with local trekking agencies. Book eco-friendly expeditions, secure wilderness transit permits, and coordinate via simulated payment models and direct organizer chats.',
    primaryCta: 'Launch Hiker App',
    secondaryCta: 'Organizer Panel',
    metrics: [
      { label: '4.9★', sub: 'Hiker Rating' },
      { label: '100%', sub: 'Verified Guides' },
      { label: '0%', sub: 'Middlemen Fee' },
    ],
  },
  features: {
    visible: true,
    heading: 'Smart Trek Platform Features',
    subheading: 'Engineered to offer safe, transparent, and direct connections to high-elevation guides and local trek guides.',
    items: [
      { icon: 'Settings', iconColor: 'text-spy-orange', title: 'AI Recommendation Engine', desc: 'Tailors trek difficulty options dynamically based on your physical fitness level and alpine experience.' },
      { icon: 'ShieldCheck', iconColor: 'text-emerald-500', title: 'Verified Agency Guides', desc: 'Connect directly with local Sherpa guides carrying government-audited permits and zero-accident safety records.' },
      { icon: 'QrCode', iconColor: 'text-[#4A90E2]', title: 'Instant Permit Booking', desc: 'Secure high-altitude transit passes in a streamlined 3-step wizard with secure PayU checkout.' },
      { icon: 'MessageSquare', iconColor: 'text-purple-500', title: 'Real-time Coordinator Chat', desc: 'Direct communication line with guides and coordinators to plan gear lists and coordinate base assembly.' },
    ],
  },
  expeditions: {
    visible: true,
    heading: 'Popular Expeditions',
    subheading: 'View our active treks directly managed by local registered agencies.',
    ctaLabel: 'Explore Full Catalog',
  },
  portals: {
    visible: true,
    heading: 'Find Your Trek Portal Ecosystem',
    subheading: 'Our application features separate sandboxes representing key roles in the adventure marketplace. Try out each layout.',
    items: [
      { key: 'hiker', title: 'Hiker Mobile App', badge: 'Sandbox Enabled', desc: 'Explore mountain expeditions, toggle wishlist items, customize add-ons, book with secure PayU checkout, and manage live ticket bookings.', cta: 'Launch Hiker App', features: ['AI Trek Matching', '3-Step Fast Checkout', 'Direct Guide Chat', 'Notifications Bell'] },
      { key: 'organizer', title: 'Organizer Portal', badge: 'Agency Access', desc: 'Designed for local trekking agencies. Publish multi-day itineraries, manage seat inventory, upload dynamic photo galleries, and coordinate with hikers.', cta: 'Launch Organizer Portal', features: ['Dynamic Hike Form Builder', 'Booking Roster Trackers', 'Simulated Hiker Reply Chat', 'Verification Wizard'] },
    ],
  },
  testimonials: {
    visible: true,
    heading: 'Loved by Outdoor Trekkers',
    subheading: 'Here is what genuine outdoor lovers have to say about booking high-altitude passes and coordinates.',
    items: [
      { name: 'Chirag Jeevanani', role: 'Intermediate Trekker', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', comment: 'The AI recommendation matched me perfectly with the Western Ghats Monsoon Trail. Using the 3-step checkout was incredibly seamless, and the ticket QR code was instantly generated!', rating: 5, trek: 'Western Ghats Monsoon Trail' },
      { name: 'Priya Patel', role: 'Advanced Mountaineer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', comment: 'Conquering the Himalayan Ridge Pass at 4,200m was a dream. The Sherpa guides verified through Find Your Trek provided top-notch geodesic domes and safety monitoring. Absolute five-star experience.', rating: 5, trek: 'Himalayan Ridge Pass Trek' },
      { name: 'Aarav Sharma', role: 'Weekend Explorer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', comment: 'I loved the Jaisalmer Desert Camp. Being able to chat directly with Desert Nomad Adventures beforehand to verify standard gear rentals was very reassuring. No hassle whatsoever.', rating: 4, trek: 'Stargazing Desert Camp & Trek' },
    ],
  },
  faq: {
    visible: true,
    heading: 'Frequently Asked Questions',
    subheading: 'Have questions? We have compiled standard logistical queries for your review.',
    items: [
      { q: 'What makes Find Your Trek different from other booking systems?', a: 'Find Your Trek is built with a dual ecosystem: Hiker App and Organizer Portal. Hikers get direct access to local agencies without middlemen, while agencies get rich tools to manage day-by-day itineraries, add-ons, and safety lists.' },
      { q: 'Is the payment gateway secure?', a: 'Yes! Online payments are processed by PayU, an RBI-authorised payment gateway. Card, UPI and netbanking details are entered on the secure PayU checkout and never touch our servers.' },
      { q: 'How does the AI Recommendation Engine work?', a: 'By auditing your user profile (Experience: Beginner/Intermediate/Advanced and Fitness Level: Low/Moderate/High), Find Your Trek automatically matches you with hikes that align with your safety limits.' },
    ],
  },
  footer: {
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Expeditions', href: '#expeditions' },
      { label: 'Portals', href: '#gateways' },
      { label: 'Reviews', href: '#testimonials' },
    ],
    copyright: '© 2026 Find Your Trek. Built with React 19, Tailwind v4 & Motion v12.',
    subtext: 'All coordinates, safety logs, and agencies are simulated for demo compliance.',
  },
};

// Shallow-per-section merge of a (possibly partial) API payload over the
// defaults, so the page always has every section/field even if the backend
// omits one. Arrays are taken as-is from the source when present.
export function mergeLandingContent(partial) {
  if (!partial || typeof partial !== 'object') return DEFAULT_LANDING_CONTENT;
  const out = {};
  for (const section of Object.keys(DEFAULT_LANDING_CONTENT)) {
    out[section] = { ...DEFAULT_LANDING_CONTENT[section], ...(partial[section] || {}) };
  }
  if (Array.isArray(out.portals?.items)) {
    out.portals.items = out.portals.items.filter((p) => p.key !== 'admin');
  }
  return out;
}

// ─── Offline-first localStorage cache ───────────────────────────────────────
// Same-origin localStorage is shared across the /app and /admin SPAs, so an
// admin edit is visible to the public page in the same browser even when the
// backend is unreachable. The API (when up) stays the source of truth and
// refreshes this cache. Mirrors the loyalty-config caching pattern.

export const LANDING_CONTENT_KEY = 'trekigo_landing_content';

export function loadLandingContentLocal() {
  try {
    const raw = localStorage.getItem(LANDING_CONTENT_KEY);
    return mergeLandingContent(raw ? JSON.parse(raw) : null);
  } catch {
    return mergeLandingContent(null);
  }
}

export function saveLandingContentLocal(content) {
  try {
    localStorage.setItem(LANDING_CONTENT_KEY, JSON.stringify(content));
  } catch {
    /* ignore storage failures (private mode, quota, etc.) */
  }
}
