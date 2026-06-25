import { HIKING_TRIPS } from '../data/trips';

const USER_STORAGE_KEY = 'spyhike_user';
const WISHLIST_STORAGE_KEY = 'spyhike_wishlist';
const BOOKINGS_STORAGE_KEY = 'spyhike_bookings';
const NOTIFICATIONS_STORAGE_KEY = 'spyhike_notifications';
const CHAT_STORAGE_KEY = 'spyhike_chats';
const TRIPS_STORAGE_KEY = 'spyhike_trips';
const DARK_MODE_KEY = 'spyhike_darkmode';

const DEFAULT_USER = {
  isAuthenticated: false, // Start as unauthenticated!
  isOnboarded: false, // Start with onboarding on first visit!
  name: 'Chirag Jeevanani',
  email: 'chiragjeevanani333@gmail.com',
  mobile: '+91 98765 43210',
  age: 24,
  gender: 'Male',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  hikingExperience: 'Intermediate',
  fitnessLevel: 'High',
  emergencyContact: 'Asha Jeevanani (+91 98765 43219)',
  rememberMe: true,
};

const STARTER_BOOKINGS = [
  {
    id: 'b-starter-1',
    tripId: 'western-ghats-monsoon-trail',
    tripName: 'Western Ghats Monsoon Trail',
    tripImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80',
    tripLocation: 'Lonavala, Maharashtra',
    bookingDate: '2026-06-05',
    selectedDate: '2026-06-10',
    travelersCount: 2,
    travelers: [
      { name: 'Chirag Jeevanani', age: 24, gender: 'Male', emergencyContact: '+91 98765 43219' },
      { name: 'Aman Verma', age: 23, gender: 'Male', emergencyContact: '+91 99999 88888' }
    ],
    couponUsed: 'GHATS15',
    couponDiscount: 26.7,
    taxAmount: 13.35,
    finalAmount: 164.65,
    status: 'Completed',
    bookingId: 'SH-4890-C',
    organizerName: 'Sahyadri Rangers'
  },
  {
    id: 'b-starter-2',
    tripId: 'stargazing-desert-camp',
    tripName: 'Stargazing Desert Camp & Trek',
    tripImage: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80',
    tripLocation: 'Thar Desert, Jaisalmer',
    bookingDate: '2026-05-01',
    selectedDate: '2026-05-12',
    travelersCount: 1,
    travelers: [
      { name: 'Chirag Jeevanani', age: 24, gender: 'Male', emergencyContact: '+91 98765 43219' }
    ],
    couponUsed: '',
    couponDiscount: 0,
    taxAmount: 11.6,
    finalAmount: 140.6,
    status: 'Cancelled',
    bookingId: 'SH-3928-X',
    organizerName: 'Desert Nomad Adventures'
  },
  {
    id: 'b-starter-3',
    tripId: 'himalayan-ridge-pass-trek',
    tripName: 'Himalayan Ridge Pass Trek',
    tripImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    tripLocation: 'Kasol, Parvati Valley',
    bookingDate: '2026-06-18',
    selectedDate: '2026-07-20',
    travelersCount: 1,
    travelers: [
      { name: 'Chirag Jeevanani', age: 24, gender: 'Male', emergencyContact: '+91 98765 43219' }
    ],
    couponUsed: 'SPYHIKE20',
    couponDiscount: 69.8,
    taxAmount: 25.13,
    finalAmount: 304.33,
    status: 'Upcoming',
    bookingId: 'SH-9921-U',
    organizerName: 'Himalayan Sherpa Guides'
  }
];

const STARTER_NOTIFICATIONS = [
  {
    id: 'n-1',
    title: '🎉 Booking Confirmed',
    content: 'Your upcoming trek to Himalayan Ridge Pass is successfully booked! Departure: July 20, 2026.',
    timestamp: '2026-06-18T14:30:00Z',
    type: 'Booking',
    read: false
  },
  {
    id: 'n-2',
    title: '💳 Payment Completed',
    content: 'Payment of ₹304.33 for Himalayan Ridge Pass Trek was processed successfully via Stripe.',
    timestamp: '2026-06-18T14:28:00Z',
    type: 'Payment',
    read: false
  },
  {
    id: 'n-3',
    title: '💬 Message from Sahyadri Rangers',
    content: '"Hi Chirag! Just a reminder to pack sturdy waterproof hiking shoes for the Monsoon Trail. See you soon!"',
    timestamp: '2026-06-08T09:00:00Z',
    type: 'Organizer',
    read: true
  },
  {
    id: 'n-4',
    title: '⛰️ Monsoon Specials Are Active',
    content: 'Get flat 20% off on all Himalayan summer crossings with code SPYHIKE20.',
    timestamp: '2026-06-01T10:00:00Z',
    type: 'Promo',
    read: true
  }
];

const STARTER_CHATS = [
  {
    tripId: 'himalayan-ridge-pass-trek',
    organizerName: 'Himalayan Sherpa Guides',
    organizerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    messages: [
      { id: 'm-1', sender: 'organizer', text: 'Namaste Chirag! Thank you for booking the Himalayan Ridge Pass. Are you ready for the climb?', timestamp: '2026-06-18T15:00:00Z' },
      { id: 'm-2', sender: 'user', text: 'Namaste! Yes, super excited. I am currently jogging 5km daily. Is that sufficient fitness preparations?', timestamp: '2026-06-18T15:05:00Z' },
      { id: 'm-3', sender: 'organizer', text: 'That is wonderful! Yes, keep up the cardiovascular endurance work. Also, please carry high-quality thermal innerwear as night temperatures hit -5 celsius.', timestamp: '2026-06-18T15:10:00Z' }
    ]
  },
  {
    tripId: 'western-ghats-monsoon-trail',
    organizerName: 'Sahyadri Rangers',
    organizerAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
    messages: [
      { id: 'm4', sender: 'organizer', text: 'Hello hiker! Hope you enjoyed the Western Ghats waterfalls and the hot Rajmachi lunch.', timestamp: '2026-06-11T12:00:00Z' },
      { id: 'm5', sender: 'user', text: 'It was incredible! Thanks for organizing. The local fish thali was amazing.', timestamp: '2026-06-11T12:15:00Z' },
      { id: 'm6', sender: 'organizer', text: 'Glad you loved it! Please leave us a review in the bookings section.', timestamp: '2026-06-11T12:20:00Z' }
    ]
  }
];

export const loadUserState = () => {
  try {
    const val = localStorage.getItem(USER_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_USER;
};

export const saveUserState = (state) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state));
};

export const loadWishlist = () => {
  try {
    const val = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  // Default wishlist seed
  return ['valley-of-flowers-trek', 'coorg-coffee-estate-walk'];
};

export const saveWishlist = (val) => {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(val));
};

export const loadBookings = () => {
  try {
    const val = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return STARTER_BOOKINGS;
};

export const saveBookings = (val) => {
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(val));
};

export const loadNotifications = () => {
  try {
    const val = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return STARTER_NOTIFICATIONS;
};

export const saveNotifications = (val) => {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(val));
};

export const loadChats = () => {
  try {
    const val = localStorage.getItem(CHAT_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return STARTER_CHATS;
};

export const saveChats = (val) => {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(val));
};

export const loadTrips = () => {
  try {
    const val = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return HIKING_TRIPS;
};

export const saveTrips = (val) => {
  localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(val));
};

export const loadDarkMode = () => {
  try {
    const val = localStorage.getItem(DARK_MODE_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(e);
  }
  return true; // Deep premium look as default, togglable!
};

export const saveDarkMode = (val) => {
  localStorage.setItem(DARK_MODE_KEY, JSON.stringify(val));
};
