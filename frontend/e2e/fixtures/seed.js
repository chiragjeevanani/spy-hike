// Shared localStorage seeders for the loyalty e2e specs. All three apps
// (/app, /organizer, /admin) are same-origin mini-SPAs that read/write plain
// localStorage — no backend to fixture against, so tests seed state directly
// the same way a real session would accumulate it.

export const CUSTOMER_USER = {
  isAuthenticated: true,
  isOnboarded: true,
  isOrganizer: true,
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

export const ORG_USER = {
  isAuthenticated: true,
  isOnboarded: true,
  isApproved: true,
  isPendingApproval: false,
  name: 'Chirag Jeevanani',
  email: 'chiragjeevanani333@gmail.com',
  mobile: '+91 98765 43210',
  agencyName: 'Himalayan Sherpa Guides',
  agencyWebsite: '',
  govtIdType: 'Aadhaar',
  govtIdNumber: '',
  yearsExperience: 5,
  bio: 'Verified Trekigo organizer.',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  rating: 4.9,
  totalTrips: 3,
  totalBookings: 0,
  rememberMe: true,
  coreCapabilities: ['Certified Trek Leader'],
};

// Builds a loyalty config override — mirrors DEFAULT_LOYALTY_CONFIG's shape
// in src/utils/loyalty.js. Tests pass small thresholds so a couple of seeded
// bookings can realistically cross a milestone.
export function makeLoyaltyConfig({ customerThreshold = 30, organizerThreshold = 1000 } = {}) {
  return {
    customer: {
      enabled: true,
      thresholdPersons: customerThreshold,
      rewardTitle: 'Free Trek Booking',
      rewardDescription: 'Book enough travelers cumulatively and your next booking is free.',
      banner: { enabled: true, image: '', title: 'Trek Reward Banner', subtitle: 'Test subtitle' },
    },
    organizer: {
      enabled: true,
      thresholdBookings: organizerThreshold,
      rewardTitle: 'Zero-Commission Booking',
      rewardDescription: 'Cross enough bookings and earn a zero-commission credit.',
      banner: { enabled: true, image: '', title: 'Partner Reward Banner', subtitle: 'Test subtitle' },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function makeCustomerBooking({ id = 'b-e2e-1', bookingId = 'TG-E2E-1', travelersCount = 2, tripId = 'himalayan-ridge-pass-trek', tripName = 'Himalayan Ridge Pass Trek', status = 'Upcoming' } = {}) {
  return {
    id, tripId, tripName,
    tripImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    tripLocation: 'Kasol, Parvati Valley',
    bookingDate: '2026-07-01',
    selectedDate: '2026-07-20',
    travelersCount,
    travelers: Array.from({ length: travelersCount }, (_, i) => ({
      name: i === 0 ? 'Chirag Jeevanani' : `Traveler ${i + 1}`,
      age: 24, gender: 'Male', emergencyContact: '+91 98765 43219',
    })),
    couponUsed: '', couponDiscount: 0, taxAmount: 10, finalAmount: 200 * travelersCount,
    status, bookingId, organizerName: 'Himalayan Sherpa Guides',
  };
}

export function makeOrgBooking({ id = 'ob-e2e-1', bookingId = 'TG-ORGE2E-1', hikersCount = 2, status = 'Upcoming' } = {}) {
  return {
    id, tripId: 'org-trip-demo-1', tripName: 'Kedarkantha Winter Summit', bookingId,
    organizerEmail: ORG_USER.email,
    userName: 'Aarav Sharma', userEmail: 'aarav@example.com', userMobile: '+91 98765 43210',
    hikersCount, selectedDate: '2026-12-20', finalAmount: 17000, status,
    bookingDate: new Date().toISOString(), commissionAmount: 1700, commissionRate: 10,
  };
}

// Seeds localStorage before the app's first script runs, so React mounts
// straight into the desired state (no login-form/onboarding flow needed).
export async function seedLocalStorage(page, entries) {
  await page.addInitScript((data) => {
    for (const [key, value] of Object.entries(data)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, entries);
}
