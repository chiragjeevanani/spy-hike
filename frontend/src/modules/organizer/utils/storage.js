/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ORG_USER_KEY = 'spyhike_org_user';
const ORG_TRIPS_KEY = 'spyhike_org_trips';
const ORG_BOOKINGS_KEY = 'spyhike_org_bookings';
const ORG_NOTIFICATIONS_KEY = 'spyhike_org_notifications';
const ORG_CHATS_KEY = 'spyhike_org_chats';
const ORG_DARK_MODE_KEY = 'spyhike_org_darkmode';

export const DEFAULT_ORG_USER = {
  isAuthenticated: false,
  isOnboarded: false,
  isApproved: false,       // Must be approved by admin
  isPendingApproval: false, // Set to true after registration, waiting for admin
  name: '',
  email: '',
  mobile: '',
  agencyName: '',
  agencyWebsite: '',
  govtIdType: 'Aadhaar', // 'Aadhaar', 'PAN', 'GST', 'Passport'
  govtIdNumber: '',
  yearsExperience: 1,
  bio: '',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  verificationDocumentUrl: '',
  rating: 0,
  totalTrips: 0,
  totalBookings: 0,
  rememberMe: false,
  coreCapabilities: ['Snow Expedition Specialists', 'Eco-Friendly Leave-No-Trace', 'Emergency Medical Rescue', 'Naturalist Guided Hiking'],
};

const DEMO_ORG_TRIPS = [
  {
    id: 'org-trip-demo-1',
    organizerEmail: 'demo@himalayan.com',
    name: 'Kedarkantha Winter Summit',
    location: 'Sankri, Uttarkashi',
    state: 'Uttarakhand',
    city: 'Sankri',
    price: 8500,
    difficulty: 'Moderate',
    durationDays: 6,
    maxGroupSize: 15,
    availableSeats: 10,
    distanceKm: 20,
    elevationMeters: 3800,
    category: 'Trekking',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    ],
    status: 'Published', // 'Draft', 'Published', 'Paused'
    description: 'A classic winter trek through dense oak and rhododendron forests leading to the iconic Kedarkantha summit.',
    highlights: ['360-degree Himalayan views from summit', 'Camping in snow', 'Dense pine forest trails'],
    included: ['Tents', 'Meals', 'Guide', 'Permits'],
    notIncluded: ['Personal equipment', 'Travel to Sankri'],
    safetyGuidelines: ['Carry warm gear', 'Acclimatize before summit day'],
    cancellationPolicy: ['Full refund 10 days prior', '50% refund 5 days prior'],
    itinerary: [
      { day: 1, title: 'Drive to Sankri', description: 'Pickup from Dehradun and scenic drive to base.' },
      { day: 2, title: 'Sankri to Juda Ka Talab', description: 'Trek through dense oak forest.' },
      { day: 3, title: 'Juda Ka Talab to Kedarkantha Base', description: 'Trek through snow-covered meadows.' },
      { day: 4, title: 'Summit & Descent', description: 'Pre-dawn summit push, 360° views, descent to base.' },
      { day: 5, title: 'Descent to Sankri', description: 'Trek back through forests.' },
      { day: 6, title: 'Return to Dehradun', description: 'Drive back to Dehradun.' }
    ],
    faqs: [
      { question: 'Is this suitable for first-time trekkers?', answer: 'Yes, with moderate fitness this trek is beginner-friendly.' }
    ],
    reviews: [],
    rating: 4.8,
    reviewsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const DEMO_ORG_BOOKINGS = [
  {
    id: 'ob-demo-1',
    tripId: 'org-trip-demo-1',
    tripName: 'Kedarkantha Winter Summit',
    bookingId: 'SH-8821-K',
    userName: 'Aarav Sharma',
    userEmail: 'aarav@example.com',
    userMobile: '+91 98765 43210',
    hikersCount: 2,
    selectedDate: '2026-12-20',
    finalAmount: 17000,
    status: 'Upcoming',
    bookingDate: new Date().toISOString(),
    addOns: ['Porter Service'],
  }
];

export const loadOrgUser = () => {
  try {
    const val = localStorage.getItem(ORG_USER_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return DEFAULT_ORG_USER;
};

export const saveOrgUser = (state) => {
  localStorage.setItem(ORG_USER_KEY, JSON.stringify(state));
};

export const loadOrgTrips = (orgEmail) => {
  try {
    const val = localStorage.getItem(ORG_TRIPS_KEY);
    if (val) {
      const all = JSON.parse(val);
      return orgEmail ? all.filter(t => t.organizerEmail === orgEmail) : all;
    }
  } catch (e) { console.error(e); }
  return [];
};

export const saveOrgTrips = (trips) => {
  localStorage.setItem(ORG_TRIPS_KEY, JSON.stringify(trips));
};

export const loadOrgBookings = (orgEmail) => {
  try {
    const val = localStorage.getItem(ORG_BOOKINGS_KEY);
    if (val) {
      const all = JSON.parse(val);
      return orgEmail ? all.filter(b => b.organizerEmail === orgEmail) : all;
    }
  } catch (e) { console.error(e); }
  return DEMO_ORG_BOOKINGS;
};

export const saveOrgBookings = (bookings) => {
  localStorage.setItem(ORG_BOOKINGS_KEY, JSON.stringify(bookings));
};

export const loadOrgNotifications = () => {
  try {
    const val = localStorage.getItem(ORG_NOTIFICATIONS_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [
    {
      id: 'on-1',
      title: '🎉 Welcome to Spy Hike Partner Network!',
      content: 'Your account is under review. Admin will approve within 24-48 hours.',
      timestamp: new Date().toISOString(),
      type: 'System',
      read: false,
    }
  ];
};

export const saveOrgNotifications = (val) => {
  localStorage.setItem(ORG_NOTIFICATIONS_KEY, JSON.stringify(val));
};

export const loadOrgChats = () => {
  try {
    const val = localStorage.getItem(ORG_CHATS_KEY);
    if (val) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return [
    {
      tripId: 'org-trip-demo-1',
      tripName: 'Kedarkantha Winter Summit',
      userName: 'Aarav Sharma',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      messages: [
        { id: 'oc-m1', sender: 'user', text: 'Hello! I booked the Kedarkantha trek. What should I carry?', timestamp: new Date().toISOString() },
      ]
    }
  ];
};

export const saveOrgChats = (val) => {
  localStorage.setItem(ORG_CHATS_KEY, JSON.stringify(val));
};

export const loadOrgDarkMode = () => {
  try {
    const val = localStorage.getItem(ORG_DARK_MODE_KEY);
    if (val !== null) return JSON.parse(val);
  } catch (e) { console.error(e); }
  return true;
};

export const saveOrgDarkMode = (val) => {
  localStorage.setItem(ORG_DARK_MODE_KEY, JSON.stringify(val));
};
