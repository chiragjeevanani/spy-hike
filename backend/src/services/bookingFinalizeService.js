import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Voucher from '../models/Voucher.js';
import { syncCustomerVouchers, syncOrganizerVouchers } from './loyaltyService.js';
import { notifyCustomer, notifyOrganizer } from './notificationService.js';
import { findOrCreateChat } from '../controllers/chatController.js';

// Everything that happens once a booking is genuinely paid for — the organizer's
// counters, the loyalty vouchers it earns, the notifications on both sides, and
// the seeded organizer chat (context.md §7).
//
// This used to live inline in createBooking, which was correct while every
// booking was Pay on Arrival and therefore confirmed the instant it was created.
// With an online flow a booking is created *before* the money arrives, so these
// effects have to be reachable from two places — the browser handshake and the
// PayU webhook — and must run exactly once no matter which gets there
// first. The once-only guarantee is not here: callers earn it by winning the
// atomic pending → paid transition in paymentService.confirmBookingPayment().
export async function finalizeConfirmedBooking(booking, { trip: knownTrip } = {}) {
  const trip = knownTrip || (await Trip.findById(booking.tripId));

  // Bump the organizer's lifetime booking count (backs loyalty progress).
  if (booking.organizerEmail) {
    await User.updateOne(
      { email: booking.organizerEmail, isOrganizer: true },
      { $inc: { 'organizer.totalBookings': 1 } },
    );
  }

  // Mint any newly-earned milestone vouchers for both sides. The voucher this
  // booking *spent* was already consumed when the booking was created, so that
  // a pending online payment can't have its reward claimed twice.
  await syncCustomerVouchers(booking.userEmail);
  if (booking.organizerEmail) await syncOrganizerVouchers(booking.organizerEmail);

  await notifyCustomer(booking.userEmail, {
    title: '⛰️ Permit Slot Secured!',
    content: `Your pass to ${booking.tripName} is active for ${booking.selectedDate}. Booking ID: ${booking.bookingId}`,
    type: 'Booking',
  });

  if (booking.organizerEmail) {
    await notifyOrganizer(booking.organizerEmail, {
      title: '🎒 New Booking Received',
      content: `${booking.userName} booked ${booking.tripName} (${booking.travelersCount} traveler${booking.travelersCount === 1 ? '' : 's'}) for ${booking.selectedDate}.`,
      type: 'Booking',
    });

    // A deleted trip shouldn't cost the customer their booking, so the chat
    // seed is best-effort rather than a hard dependency.
    if (trip) {
      const chat = await findOrCreateChat({
        trip,
        userEmail: booking.userEmail,
        userName: booking.userName,
      });
      if (chat.messages.length === 0) {
        chat.messages.push({
          sender: 'organizer',
          text: `Hi ${booking.userName?.split(' ')[0] || 'there'}! Thanks for booking ${booking.tripName}. We'll share prep details soon — reach out any time.`,
          timestamp: new Date(),
        });
        await chat.save();
      }
    }
  }

  return booking;
}

// Undoes the loyalty voucher a booking reserved at creation time. Used when an
// online payment is abandoned: the customer keeps the free booking they earned
// rather than losing it to a checkout they never completed.
//
// Matched on `usedRef` so it can only ever return the voucher this exact
// booking took, and guarded on status so replaying it is harmless.
export async function releaseBookingVoucher(booking) {
  if (!booking?.loyaltyRewardApplied) return null;
  return Voucher.findOneAndUpdate(
    { ownerType: 'customer', ownerKey: booking.userEmail, usedRef: booking.bookingId, status: 'used' },
    { $set: { status: 'available', usedRef: null, usedAt: null } },
    { new: true },
  );
}
