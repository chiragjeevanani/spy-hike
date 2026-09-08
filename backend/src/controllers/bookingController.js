import mongoose from 'mongoose';
import Booking, { SETTLED_BOOKING_FILTER } from '../models/Booking.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { makeBookingId } from '../utils/slug.js';
import { computeBookingPricing } from '../services/pricingService.js';
import { reserveSeats, releaseSeats } from '../services/inventoryService.js';
import { computeRefund } from '../services/refundService.js';
import { redeemCoupon, releaseCouponRedemption } from '../services/couponService.js';
import { validateTravelers } from '../utils/travelerValidation.js';
import { getAvailableVoucher, markVoucherUsed } from '../services/loyaltyService.js';
import { notifyCustomer, notifyOrganizer } from '../services/notificationService.js';
import { finalizeConfirmedBooking } from '../services/bookingFinalizeService.js';
import {
  resolvePaymentMode, publicPaymentConfig, markPayOnArrival, startBookingPayment,
  refundBookingPayment, releasePendingBooking, expireStalePayments,
} from '../services/paymentService.js';
import { autoResolveBookingStatuses } from '../utils/bookingStatusHelper.js';

const todayStr = () => new Date().toISOString().split('T')[0];

// Resolves the organizing agency shown on a customer's ticket.
//
// A booking stores only `organizerEmail` (the FK) plus a name snapshot, which
// left the ticket rendering a blank agency, the account's login email as the
// support address, and a hardcoded placeholder phone number. Contact details
// are also exactly the thing that must be CURRENT when a traveller needs to
// reach their organizer mid-trip, so they're read live from the account rather
// than frozen onto the booking at checkout.
//
// Batched: a bookings list spans several organizers, and this must not become
// one query per row.
async function withOrganizers(bookings) {
  const list = Array.isArray(bookings) ? bookings : [bookings];
  const emails = [...new Set(list.map((b) => b.organizerEmail).filter(Boolean))];

  const users = emails.length
    ? await User.find({ email: { $in: emails }, isOrganizer: true })
      .select('name email mobile avatar organizer')
      .lean()
    : [];
  const byEmail = new Map(users.map((u) => [u.email, u]));

  const shaped = list.map((b) => {
    const json = b.toPublicJSON();
    const user = byEmail.get(b.organizerEmail);
    const org = user?.organizer || {};
    // No account behind the email (deleted, or a legacy booking) — fall back to
    // the snapshot on the booking rather than inventing contact details.
    json.organizer = {
      name: org.agencyName || user?.name || json.organizerName || '',
      email: org.supportEmail || user?.email || json.organizerEmail || '',
      phone: org.supportPhone || user?.mobile || '',
      avatar: user?.avatar || '',
      verified: !!org.isApproved,
    };
    return json;
  });

  return Array.isArray(bookings) ? shaped : shaped[0];
}

// Match a booking by either its human bookingId ("TG-…") or its ObjectId.
// Exported so the payment routes address bookings the same way the ticket
// screen does, rather than growing a second, subtly different matcher.
export const idMatch = (id) => {
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
// reserves the departure seats atomically, and persists the booking with the
// money snapshot. Seats are released if any later step fails (compensation —
// the single-node test DB has no multi-doc transactions, and the guarded $inc
// already prevents oversell).
//
// Two endings, decided by resolvePaymentMode():
//   'arrival' — the booking is confirmed here and now, exactly as before.
//   'online'  — a Razorpay order is opened and the booking is returned in a
//               pending state holding its seats. It only becomes real when the
//               money lands, via the webhook or the browser handshake; if it
//               never does, expireStalePayments() gives everything back.
export const createBooking = asyncHandler(async (req, res) => {
  const { tripId, selectedDate, travelers = [], couponCode, useLoyaltyReward } = req.body;
  const selections = req.body.selections || req.body.travelerBreakdown || [];

  // Reclaim seats still held by abandoned checkouts before deciding this
  // booking can't have any — otherwise a busy departure stays "full" for the
  // length of the hold. Same lazy-sweep pattern as autoResolveBookingStatuses.
  await expireStalePayments();

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

  let voucherReserved = false;
  let couponRedeemed = false;

  try {
    // Traveler details feed a real trek's emergency permits and safety
    // register — validate them for real (not just trust whatever the client
    // sent) now that seats are reserved; the catch below releases them if
    // this fails.
    validateTravelers(travelers, pricing.travelersCount);

    // Atomically claim a coupon redemption slot before doing anything else —
    // mirrors reserveSeats above: two concurrent bookings can't both squeeze
    // through a coupon's last remaining redemption. The catch below releases
    // the seats reserved above if this (or anything after it) fails.
    if (pricing.couponId) {
      const redeemed = await redeemCoupon(pricing.couponId);
      if (!redeemed) throw ApiError.conflict('This coupon just reached its redemption limit — please remove it and try again.');
      couponRedeemed = true;
    }

    const { couponId, ...pricingFields } = pricing;
    // Built but not yet saved: in the online flow the Razorpay order has to be
    // created first, so that a gateway failure leaves no orphan booking behind.
    const booking = new Booking({
      bookingId: await nextBookingId(),
      tripId: trip._id,
      tripName: trip.name,
      tripImage: trip.coverImage,
      tripLocation: trip.location,
      organizerEmail: trip.organizerEmail,
      // Durable snapshot: the display name still resolves live from the
      // account, but this survives that account being removed.
      organizerName: trip.organizer?.name || '',
      userEmail: req.user.email,
      userName: req.user.name || 'Traveller',
      bookingDate: todayStr(),
      selectedDate,
      travelers,
      status: 'Upcoming',
      ...pricingFields,
    });

    // Spends the loyalty voucher, in both modes. It is a claim on a scarce
    // reward exactly like the coupon slot above: leaving it available while an
    // online payment is pending would let the same free booking be redeemed
    // twice in two open checkout tabs. The catch below, and the expiry sweep,
    // both hand it back if the booking never completes.
    //
    // Called only once the booking is persisted, never before: a reward cycle
    // starts at the moment its voucher was used, so a voucher stamped ahead of
    // its own booking would let that booking count toward the next reward too.
    const spendVoucher = async () => {
      if (!loyaltyVoucher) return;
      await markVoucherUsed(loyaltyVoucher, booking.bookingId);
      voucherReserved = true;
    };

    if (resolvePaymentMode() === 'online') {
      // Creates the order, stamps the pending payment onto the booking, and
      // saves it. Nothing is persisted if Razorpay rejects the order.
      const order = await startBookingPayment(booking);
      await spendVoucher();
      return res.status(201).json({
        booking: await withOrganizers(booking),
        // Everything the browser needs to open Checkout against this booking.
        payment: {
          required: true,
          provider: 'razorpay',
          keyId: publicPaymentConfig().keyId,
          orderId: order.id,
          amount: order.amount, // paise, as Checkout expects
          currency: order.currency,
          expiresAt: booking.payment.expiresAt,
        },
      });
    }

    // Pay on Arrival: nothing to collect, so the booking is confirmed inline.
    markPayOnArrival(booking);
    await booking.save();
    await spendVoucher();
    await finalizeConfirmedBooking(booking, { trip });

    // Same shape the ticket screen reads back from GET /bookings/:id.
    res.status(201).json({
      booking: await withOrganizers(booking),
      payment: { required: false, provider: 'arrival' },
    });
  } catch (err) {
    // Compensate: hand back everything this booking claimed, so a failure
    // leaks neither seats, nor a coupon redemption, nor the customer's
    // hard-earned free booking.
    await releaseSeats(trip._id, selectedDate, pricing.travelersCount);
    if (couponRedeemed) {
      await releaseCouponRedemption({ code: pricing.couponUsed, organizerEmail: trip.organizerEmail })
        .catch(() => {});
    }
    if (voucherReserved) {
      loyaltyVoucher.status = 'available';
      loyaltyVoucher.usedRef = null;
      loyaltyVoucher.usedAt = null;
      await loyaltyVoucher.save().catch(() => {});
    }
    throw err;
  }
});

// GET /bookings — the signed-in customer's own bookings.
//
// A booking whose online payment is still pending (or was abandoned) is left
// out: it isn't a trip the customer has, and showing it as "Upcoming" next to
// paid bookings would be a lie. The one place it IS returned is the checkout
// response and the payment-status endpoint, which is where it's needed.
export const listMyBookings = asyncHandler(async (req, res) => {
  await autoResolveBookingStatuses();
  const bookings = await Booking.find({ userEmail: req.user.email, ...SETTLED_BOOKING_FILTER })
    .sort({ createdAt: -1 });
  res.json({ bookings: await withOrganizers(bookings) });
});

// GET /bookings/:id — one of the customer's bookings (by bookingId or _id).
// Unlike the list, this serves a pending booking too, so the checkout screen
// can keep showing the one it is in the middle of paying for.
export const getMyBooking = asyncHandler(async (req, res) => {
  await autoResolveBookingStatuses();
  const booking = await Booking.findOne({ userEmail: req.user.email, ...idMatch(req.params.id) });
  if (!booking) throw ApiError.notFound('Booking not found');
  res.json({ booking: await withOrganizers(booking) });
});

// POST /bookings/:id/cancel — the customer cancels an upcoming booking. Applies
// the policy-driven refund, frees the reserved seats, and notifies both sides.
// Cancelling drops the booking's payout from the organizer's balance (the
// financials derive from non-cancelled bookings).
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ userEmail: req.user.email, ...idMatch(req.params.id) });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status !== 'Upcoming') {
    throw ApiError.badRequest(`A ${booking.status.toLowerCase()} booking cannot be cancelled`);
  }

  // Backing out of a checkout that was never paid for isn't a cancellation
  // under the refund policy — there's no money to return. Release the hold and
  // give the coupon and loyalty voucher straight back instead.
  if (booking.payment?.status === 'pending') {
    const released = await releasePendingBooking(booking, {
      reason: 'Cancelled by the customer before payment',
      notify: false,
    });
    return res.json({ booking: await withOrganizers(released || booking) });
  }

  const { refundAmount, refundPercent } = await computeRefund(booking.finalAmount, booking.selectedDate);
  booking.status = 'Cancelled';
  booking.refundAmount = refundAmount;
  booking.refundPercent = refundPercent;
  booking.cancelledAt = new Date().toISOString();
  await booking.save();

  // Return the seats to the departure inventory.
  await releaseSeats(booking.tripId, booking.selectedDate, booking.travelersCount);

  // Push the policy refund back through Razorpay for an online booking. A
  // gateway failure must not cost the customer their cancellation, so it is
  // recorded and left for an admin to retry rather than thrown: the booking is
  // already cancelled and the seats are already back in inventory.
  if (refundAmount > 0 && booking.payment?.method === 'razorpay') {
    try {
      const result = await refundBookingPayment(booking, { amount: refundAmount, reason: 'Customer cancellation' });
      if (!result.refunded) console.warn(`[payments] refund skipped for ${booking.bookingId}: ${result.reason}`);
    } catch (err) {
      console.error(`[payments] refund failed for ${booking.bookingId}:`, err);
    }
  }

  await notifyCustomer(booking.userEmail, {
    title: '⚠️ Booking Cancelled',
    content: refundAmount > 0
      ? `${booking.tripName} (${booking.bookingId}) was cancelled. A refund of ₹${refundAmount} (${refundPercent}%) is being processed.`
      : `${booking.tripName} (${booking.bookingId}) was cancelled. Per the cancellation policy, no refund applies.`,
    type: 'Booking',
  });
  if (booking.organizerEmail) {
    await notifyOrganizer(booking.organizerEmail, {
      title: '❌ Booking Cancelled',
      content: `${booking.userName} cancelled ${booking.tripName} for ${booking.selectedDate}. Seats have been released.`,
      type: 'Booking',
    });
  }

  res.json({ booking: await withOrganizers(booking) });
});

// GET /organizer/bookings — bookings for the approved organizer's trips.
export const listOrganizerBookings = asyncHandler(async (req, res) => {
  await autoResolveBookingStatuses();
  // Unpaid checkouts aren't sales — an organizer should never see (or plan
  // for, or be paid on) a seat someone abandoned at the payment screen.
  const bookings = await Booking.find({ organizerEmail: req.organizer.email, ...SETTLED_BOOKING_FILTER })
    .sort({ createdAt: -1 });
  res.json({ bookings: bookings.map((b) => b.toPublicJSON()) });
});

// POST /organizer/bookings/:bookingId/checkin — scan-to-check-in at the
// trailhead. Idempotent-safe: an already-checked-in ticket returns 200 with
// alreadyCheckedIn:true (and the original time) rather than erroring, so a
// double-scan is harmless. Only the trip's own organizer can check a ticket
// in, and a cancelled booking can't be boarded.
export const checkinBooking = asyncHandler(async (req, res) => {
  const rawId = (req.params.bookingId || '').trim();
  const booking = await Booking.findOne({
    $or: [
      { bookingId: rawId },
      { bookingId: rawId.toUpperCase() },
      ...(mongoose.isValidObjectId(rawId) ? [{ _id: rawId }] : []),
    ],
  });
  if (!booking) throw ApiError.notFound('No booking found for this ticket');

  const trip = await Trip.findById(booking.tripId);
  const bookingOrgEmail = (booking.organizerEmail || trip?.organizerEmail || '').toLowerCase().trim();
  const currentOrgEmail = (req.organizer?.email || '').toLowerCase().trim();

  if (!currentOrgEmail || bookingOrgEmail !== currentOrgEmail) {
    const otherOrg = booking.organizerName || trip?.organizer?.name || 'another organization';
    throw ApiError.forbidden(`This ticket belongs to another organization (${otherOrg}). You can only scan and verify tickets for your own treks.`);
  }

  if (booking.status === 'Cancelled') {
    throw ApiError.badRequest('This booking was cancelled and cannot be checked in');
  }

  if (booking.checkedInAt) {
    return res.json({ booking: booking.toPublicJSON(), alreadyCheckedIn: true });
  }

  booking.checkedInAt = new Date().toISOString();
  booking.checkedInBy = req.organizer.email;
  booking.status = 'Ongoing';
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

// GET /admin/bookings?includeUnpaid=true — all bookings. Unpaid checkouts are
// excluded by default so the admin list matches what everyone else sees, but
// admins can ask for them: an abandoned or half-settled payment is exactly the
// thing support needs to look at.
export const listAllBookings = asyncHandler(async (req, res) => {
  await autoResolveBookingStatuses();
  const includeUnpaid = String(req.query.includeUnpaid) === 'true';
  const filter = includeUnpaid ? {} : { ...SETTLED_BOOKING_FILTER };
  const bookings = await Booking.find(filter).sort({ createdAt: -1 });
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
