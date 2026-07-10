import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Organizer from '../models/Organizer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { makeBookingId } from '../utils/slug.js';
import { computeBookingPricing } from '../services/pricingService.js';
import { reserveSeats, releaseSeats } from '../services/inventoryService.js';
import { markCouponUsed } from '../services/couponService.js';
import {
  getAvailableVoucher, markVoucherUsed, syncCustomerVouchers, syncOrganizerVouchers,
} from '../services/loyaltyService.js';
import { paymentProvider } from '../integrations/payments.js';

const todayStr = () => new Date().toISOString().split('T')[0];

// Match a booking by either its human bookingId ("TG-…") or its ObjectId.
const idMatch = (id) => {
  const or = [{ bookingId: id }];
  if (mongoose.isValidObjectId(id)) or.push({ _id: id });
  return { $or: or };
};

async function nextBookingId() {
  for (let i = 0; i < 6; i++) {
    const id = makeBookingId();
    if (!(await Booking.exists({ bookingId: id }))) return id;
  }
  throw ApiError.conflict('Could not allocate a booking id, please retry');
}

// POST /bookings — customer checkout. Computes pricing authoritatively,
// reserves the departure seats atomically, runs the (stubbed) payment, and
// persists the booking with the money snapshot. Seats are released if any
// later step fails (compensation — the single-node test DB has no multi-doc
// transactions, and the guarded $inc already prevents oversell).
export const createBooking = asyncHandler(async (req, res) => {
  const { tripId, selectedDate, travelers = [], couponCode, useLoyaltyReward } = req.body;
  const selections = req.body.selections || req.body.travelerBreakdown || [];

  const trip = await Trip.findById(tripId);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.status !== 'Published') throw ApiError.badRequest('This trip is not open for booking');
  if (!selectedDate || !trip.departureDates.includes(selectedDate)) {
    throw ApiError.badRequest('Select a valid departure date');
  }

  // A loyalty free-booking must be backed by a real, available voucher —
  // the server (not the client) decides whether the reward applies.
  let loyaltyVoucher = null;
  if (useLoyaltyReward) {
    loyaltyVoucher = await getAvailableVoucher('customer', req.user.email);
    if (!loyaltyVoucher) throw ApiError.badRequest('No loyalty reward available on your account');
  }

  const pricing = await computeBookingPricing(trip, {
    selections, couponCode, useLoyaltyReward: !!loyaltyVoucher,
  });

  // Atomically reserve seats on the chosen departure.
  const departure = await reserveSeats(trip._id, selectedDate, pricing.travelersCount);
  if (!departure) {
    throw ApiError.conflict('Not enough seats left on this departure date');
  }

  try {
    const user = await User.findById(req.user.sub);

    // Stubbed payment (create order + verify).
    const order = await paymentProvider.createOrder({ amount: pricing.finalAmount, receipt: tripId });
    const payment = await paymentProvider.verifyPayment({ orderId: order.id });
    if (!payment.verified) throw ApiError.badRequest('Payment could not be verified');

    const booking = await Booking.create({
      bookingId: await nextBookingId(),
      tripId: trip._id,
      tripName: trip.name,
      tripImage: trip.coverImage,
      tripLocation: trip.location,
      organizerEmail: trip.organizerEmail,
      organizerName: trip.organizer?.name,
      userEmail: user?.email || req.user.email,
      userName: user?.name || 'Traveller',
      bookingDate: todayStr(),
      selectedDate,
      travelers,
      paymentRef: payment.paymentRef,
      status: 'Upcoming',
      ...pricing,
    });

    // Record coupon redemption + bump the organizer's lifetime booking count
    // (backs loyalty progress). Both are best-effort side effects.
    if (pricing.couponUsed) await markCouponUsed(pricing.couponUsed);
    if (trip.organizerEmail) {
      await Organizer.updateOne({ email: trip.organizerEmail }, { $inc: { totalBookings: 1 } });
    }

    // Consume the redeemed loyalty voucher, then mint any newly-earned
    // milestone vouchers for both the customer and the organizer.
    if (loyaltyVoucher) await markVoucherUsed(loyaltyVoucher, booking.bookingId);
    await syncCustomerVouchers(booking.userEmail);
    if (trip.organizerEmail) await syncOrganizerVouchers(trip.organizerEmail);

    res.status(201).json({ booking: booking.toPublicJSON() });
  } catch (err) {
    // Compensate: hand the seats back so a failed booking doesn't leak them.
    await releaseSeats(trip._id, selectedDate, pricing.travelersCount);
    throw err;
  }
});

// GET /bookings — the signed-in customer's own bookings.
export const listMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ userEmail: req.user.email }).sort({ createdAt: -1 });
  res.json({ bookings: bookings.map((b) => b.toPublicJSON()) });
});

// GET /bookings/:id — one of the customer's bookings (by bookingId or _id).
export const getMyBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ userEmail: req.user.email, ...idMatch(req.params.id) });
  if (!booking) throw ApiError.notFound('Booking not found');
  res.json({ booking: booking.toPublicJSON() });
});

// GET /organizer/bookings — bookings for the approved organizer's trips.
export const listOrganizerBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ organizerEmail: req.organizer.email }).sort({ createdAt: -1 });
  res.json({ bookings: bookings.map((b) => b.toPublicJSON()) });
});

// POST /organizer/bookings/:bookingId/checkin — scan-to-check-in at the
// trailhead. Idempotent-safe: an already-checked-in ticket returns 200 with
// alreadyCheckedIn:true (and the original time) rather than erroring, so a
// double-scan is harmless. Only the trip's own organizer can check a ticket
// in, and a cancelled booking can't be boarded.
export const checkinBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ bookingId: req.params.bookingId });
  if (!booking) throw ApiError.notFound('No booking found for this ticket');
  if (booking.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('This ticket belongs to another organizer');
  }
  if (booking.status === 'Cancelled') {
    throw ApiError.badRequest('This booking was cancelled and cannot be checked in');
  }

  if (booking.checkedInAt) {
    return res.json({ booking: booking.toPublicJSON(), alreadyCheckedIn: true });
  }

  booking.checkedInAt = new Date().toISOString();
  booking.checkedInBy = req.organizer.email;
  await booking.save();
  res.json({ booking: booking.toPublicJSON(), alreadyCheckedIn: false });
});

// POST /organizer/bookings/:bookingId/redeem-reward — applies an available
// zero-commission voucher to one of the organizer's bookings, zeroing its
// commission so the organizer keeps 100% of that payout.
export const redeemOrganizerReward = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ bookingId: req.params.bookingId });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('This booking belongs to another organizer');
  }
  if (booking.organizerRewardApplied) {
    throw ApiError.badRequest('A reward has already been applied to this booking');
  }

  const voucher = await getAvailableVoucher('organizer', req.organizer.email);
  if (!voucher) throw ApiError.badRequest('No zero-commission reward available');

  booking.commissionAmount = 0;
  booking.organizerPayout = booking.finalAmount;
  booking.organizerRewardApplied = true;
  await booking.save();
  await markVoucherUsed(voucher, booking.bookingId);

  res.json({ booking: booking.toPublicJSON() });
});

// GET /admin/bookings — all bookings.
export const listAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 });
  res.json({ bookings: bookings.map((b) => b.toPublicJSON()) });
});

// PATCH /admin/bookings/:id/status — admin updates a booking's status.
export const adminSetBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Upcoming', 'Completed', 'Cancelled'].includes(status)) {
    throw ApiError.badRequest('status must be Upcoming, Completed or Cancelled');
  }
  const booking = await Booking.findOneAndUpdate(idMatch(req.params.id), { status }, { new: true });
  if (!booking) throw ApiError.notFound('Booking not found');
  res.json({ booking: booking.toPublicJSON() });
});
