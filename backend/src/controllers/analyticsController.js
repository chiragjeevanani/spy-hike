import User from '../models/User.js';
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
    User.find({ isOrganizer: true }).select('name organizer.isApproved organizer.isPendingApproval createdAt'),
    Trip.find().select('category state createdAt name'),
    Booking.find().select('finalAmount commissionAmount status userName tripName organizerName bookingDate createdAt'),
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

  // Compile real recent logs activity feed
  const rawLogs = [];
  bookings.slice(-5).forEach((b) => {
    rawLogs.push({
      id: `b-${b._id}`,
      type: 'Booking',
      text: `${b.userName || 'Someone'} booked ${b.tripName || 'a trip'}`,
      createdAt: b.createdAt || new Date()
    });
  });

  organizers.slice(-5).forEach((o) => {
    rawLogs.push({
      id: `o-${o._id}`,
      type: 'Organizer',
      text: `New partner "${o.name}" registered`,
      createdAt: o.createdAt || new Date()
    });
  });

  trips.slice(-5).forEach((t) => {
    rawLogs.push({
      id: `t-${t._id}`,
      type: 'Trip',
      text: `Trek "${t.name}" was listed`,
      createdAt: t.createdAt || new Date()
    });
  });

  rawLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentLogs = rawLogs.slice(0, 5).map((log) => {
    const diffMs = new Date() - new Date(log.createdAt);
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    let timeText = 'Just now';
    if (diffDays > 0) {
      timeText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      timeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      timeText = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }

    return {
      id: log.id,
      type: log.type,
      text: log.text,
      time: timeText
    };
  });

  res.json({
    overview: {
      gmv,
      commission,
      users: users.length,
      activeUsers: users.filter((u) => u.status === 'Active').length,
      organizers: organizers.length,
      pendingOrgs: organizers.filter((o) => o.organizer?.isPendingApproval && !o.organizer?.isApproved).length,
      trips: trips.length,
      bookings: bookings.length,
    },
    revenueTrend,
    categoryDist,
    stateDist,
    topOrganizers,
    bookingStatus,
    recentLogs,
  });
});
