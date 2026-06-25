// Monthly Revenue Trend (in Thousands ₹)
export const REVENUE_TREND_DATA = [
  { month: 'Jan', revenue: 120, bookings: 14, users: 15 },
  { month: 'Feb', revenue: 150, bookings: 18, users: 22 },
  { month: 'Mar', revenue: 210, bookings: 25, users: 30 },
  { month: 'Apr', revenue: 380, bookings: 42, users: 55 },
  { month: 'May', revenue: 450, bookings: 50, users: 78 },
  { month: 'Jun', revenue: 320, bookings: 38, users: 95 },
  { month: 'Jul', revenue: 280, bookings: 32, users: 110 },
  { month: 'Aug', revenue: 310, bookings: 35, users: 125 },
  { month: 'Sep', revenue: 410, bookings: 48, users: 148 },
  { month: 'Oct', revenue: 580, bookings: 65, users: 180 },
  { month: 'Nov', revenue: 640, bookings: 72, users: 215 },
  { month: 'Dec', revenue: 790, bookings: 88, users: 260 },
];

// Trip Category breakdown for Pie Chart
export const TRIP_CATEGORY_DATA = [
  { name: 'Trekking', value: 45, color: '#F27D26' },
  { name: 'Camping', value: 25, color: '#3B82F6' },
  { name: 'Snow Summit', value: 15, color: '#06B6D4' },
  { name: 'Desert Safari', value: 10, color: '#EAB308' },
  { name: 'Forest Trail', value: 5, color: '#10B981' },
];

// Difficulty Distribution
export const DIFFICULTY_DIST_DATA = [
  { level: 'Easy', count: 12, color: '#10B981' },
  { level: 'Moderate', count: 24, color: '#F97316' },
  { level: 'Difficult', count: 8, color: '#EF4444' },
];

// Geographic Popularity (States)
export const STATE_POPULARITY_DATA = [
  { state: 'Uttarakhand', value: 40 },
  { state: 'Himachal', value: 30 },
  { state: 'Maharashtra', value: 18 },
  { state: 'Rajasthan', value: 8 },
  { state: 'J&K', value: 12 },
  { state: 'Karnataka', value: 6 },
];

// Top Organizers by Revenue (in Thousands ₹)
export const TOP_ORGANIZERS_DATA = [
  { name: 'Himalayan Guides Ltd', revenue: 280, trips: 15 },
  { name: 'Sahyadri Rangers', revenue: 145, trips: 12 },
  { name: 'Desert Nomads', revenue: 95, trips: 6 },
  { name: 'Himalayan Sherpa', revenue: 220, trips: 10 },
  { name: 'Coorg Outdoors', revenue: 50, trips: 4 },
];

// Booking Statuses Pie Chart
export const BOOKING_STATUS_DATA = [
  { name: 'Completed', value: 65, color: '#10B981' },
  { name: 'Upcoming', value: 25, color: '#3B82F6' },
  { name: 'Cancelled', value: 10, color: '#EF4444' },
];

// Activity Feed Mock
export const RECENT_LOGS = [
  { id: 'l-1', type: 'Booking', text: 'Chirag booked Himalayan Ridge Pass', time: '10 minutes ago' },
  { id: 'l-2', type: 'Organizer', text: 'New partner "Western Alps Agency" registered', time: '1 hour ago' },
  { id: 'l-3', type: 'Trip', text: 'Kedarkantha Winter Summit was modified', time: '2 hours ago' },
  { id: 'l-4', type: 'Payment', text: 'Payout of ₹45,000 sent to Sahyadri Rangers', time: '5 hours ago' },
  { id: 'l-5', type: 'User', text: 'User "Sneha Patel" was suspended by Admin', time: '1 day ago' },
];
