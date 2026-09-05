/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared onboarding CMS content: defaults + deep-merge + offline-first
// localStorage cache. Imported by both client apps (Hiker, Organizer) and the
// Admin CMS editor so default slides and fallbacks never drift.

export const DEFAULT_ONBOARDING_CONTENT = {
  customer: {
    visible: true,
    skipLabel: 'Skip Onboarding',
    slides: [
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
  organizer: {
    visible: true,
    badgeText: 'Organizer Portal',
    skipLabel: 'Skip',
    slides: [
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
};

export const AVAILABLE_ICONS = [
  'Compass',
  'Mountain',
  'Users',
  'Shield',
  'TrendingUp',
  'Sparkles',
  'MapPin',
  'ClipboardList',
  'Flame',
  'Award',
];

export const ACCENT_PRESETS = [
  { label: 'Spy Orange', accent: 'text-spy-orange', bgAccent: 'bg-spy-orange/15 border-spy-orange/30', color: '#F27D26' },
  { label: 'Emerald Green', accent: 'text-emerald-500', bgAccent: 'bg-emerald-500/15 border-emerald-500/30', color: '#10B981' },
  { label: 'Amber Gold', accent: 'text-amber-500', bgAccent: 'bg-amber-500/15 border-amber-500/30', color: '#F59E0B' },
  { label: 'Sapphire Blue', accent: 'text-blue-500', bgAccent: 'bg-blue-500/15 border-blue-500/30', color: '#3B82F6' },
  { label: 'Purple Violet', accent: 'text-purple-500', bgAccent: 'bg-purple-500/15 border-purple-500/30', color: '#A855F7' },
  { label: 'Rose Red', accent: 'text-rose-500', bgAccent: 'bg-rose-500/15 border-rose-500/30', color: '#F43F5E' },
];

export function mergeOnboardingContent(partial) {
  if (!partial || typeof partial !== 'object') return DEFAULT_ONBOARDING_CONTENT;
  const out = {};
  for (const section of Object.keys(DEFAULT_ONBOARDING_CONTENT)) {
    if (!partial[section]) {
      out[section] = DEFAULT_ONBOARDING_CONTENT[section];
    } else {
      out[section] = {
        ...DEFAULT_ONBOARDING_CONTENT[section],
        ...partial[section],
        slides: Array.isArray(partial[section].slides)
          ? partial[section].slides
          : DEFAULT_ONBOARDING_CONTENT[section].slides,
      };
    }
  }
  return out;
}

// ─── Offline-first localStorage cache ───────────────────────────────────────
export const ONBOARDING_CONTENT_KEY = 'trekigo_onboarding_content';

export function loadOnboardingContentLocal() {
  try {
    if (typeof localStorage === 'undefined') return mergeOnboardingContent(null);
    const raw = localStorage.getItem(ONBOARDING_CONTENT_KEY);
    return mergeOnboardingContent(raw ? JSON.parse(raw) : null);
  } catch {
    return mergeOnboardingContent(null);
  }
}

export function saveOnboardingContentLocal(content) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ONBOARDING_CONTENT_KEY, JSON.stringify(content));
  } catch {
    /* ignore storage failures (private mode, quota, etc.) */
  }
}
