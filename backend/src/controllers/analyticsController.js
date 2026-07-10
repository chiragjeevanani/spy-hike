import User from '../models/User.js';
import Organizer from '../models/Organizer.js';
import Trip from '../models/Trip.js';
import Booking from '../models/Booking.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const round = (n) => Math.round(n || 0);
const monthKey = (dt) => {
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// GET /admin/analytics — real platform KPIs + chart series, replacing the
// admin dashboard's localStorage-derived stats and static mock charts
// (context.md §9). Computed in JS over the collections (fine at this scale).
export const getAnalytics = asyncHandler(async (req, res) => {
  const [users, organizers, trips, bookings] = await Promise.all([
    User.find().select('status createdAt'),
    Organizer.find().select('isApproved isPendingApproval'),
    Trip.find().select('category state'),
    Booking.find().select('finalAmount commissionAmount status organizerName bookingDate createdAt'),
  ]);

  const active = bookings.filter((b) => b.status !== 'Cancelled');
  const gmv = round(active.reduce((s, b) => s + (b.finalAmount || 0), 0));
  const commission = round(active.reduce((s, b) => s + (b.commissionAmount || 0), 0));

  // Bookings by status.
  const statusCounts = { Upcoming: 0, Completed: 0, Cancelled: 0 };
  bookings.forEach((b) => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });
  const bookingStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Trips by category / state.
  const tally = (arr, key) => {
    const m = {};
    arr.forEach((t) => { const k = t[key]; if (k) m[k] = (m[k] || 0) + 1; });
    return m;
  };
  const categoryDist = Object.entries(tally(trips, 'category'))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const stateDist = Object.entries(tally(trips, 'state'))
    .map(([state, value]) => ({ state, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Top organizers by GMV.
  const orgRev = {};
  active.forEach((b) => { const n = b.organizerName || 'Unknown'; orgRev[n] = (orgRev[n] || 0) + (b.finalAmount || 0); });
  const topOrganizers = Object.entries(orgRev)
    .map(([name, revenue]) => ({ name, revenue: round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Last-6-months revenue / bookings / signups trend.
  const now = new Date();
  const series = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    series.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, month: d.toLocaleString('en-US', { month: 'short' }), revenue: 0, bookings: 0, users: 0 });
  }
  const byKey = new Map(series.map((s) => [s.key, s]));
  active.forEach((b) => { const s = byKey.get(monthKey(b.bookingDate || b.createdAt)); if (s) { s.revenue += b.finalAmount || 0; s.bookings += 1; } });
  users.forEach((u) => { const s = byKey.get(monthKey(u.createdAt)); if (s) s.users += 1; });
  const revenueTrend = series.map(({ key, ...rest }) => ({ ...rest, revenue: round(rest.revenue) }));

  res.json({
    overview: {
      gmv,
      commission,
      users: users.length,
      activeUsers: users.filter((u) => u.status === 'Active').length,
      organizers: organizers.length,
      pendingOrgs: organizers.filter((o) => o.isPendingApproval && !o.isApproved).length,
      trips: trips.length,
      bookings: bookings.length,
    },
    revenueTrend,
    categoryDist,
    stateDist,
    topOrganizers,
    bookingStatus,
  });
});
