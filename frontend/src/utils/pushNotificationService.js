/**
 * Unified Push Notification Service for Hikers & Organizers
 * Manages in-app toasts and system/browser web push notifications for major events.
 */

export function requestPushPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    return Notification.requestPermission().catch(() => 'default');
  }
  return Promise.resolve(window.Notification ? Notification.permission : 'unsupported');
}

export function sendPushAlert({ title, body, icon = '/favicon.ico', toastType = 'info', onClickUrl = null, toast = null }) {
  // 1. In-App Toast
  if (toast) {
    if (toastType === 'success') {
      toast.success(`${title}: ${body}`);
    } else if (toastType === 'warning' || toastType === 'error') {
      toast.error(`${title}: ${body}`);
    } else {
      toast.info(`${title}: ${body}`);
    }
  }

  // 2. System / Web Browser Push Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge: icon,
        vibrate: [200, 100, 200],
        renotify: true,
        tag: title,
      });

      if (onClickUrl) {
        notif.onclick = () => {
          window.focus();
          window.location.href = onClickUrl;
        };
      }
    } catch (e) {
      console.warn('Browser Notification launch error:', e);
    }
  }
}

// ─── Hiker Specific Major Event Alerts ───
export const HikerAlerts = {
  bookingConfirmed: (booking, toast) => sendPushAlert({
    title: '⛰️ Trek Booking Confirmed!',
    body: `Your slot for ${booking.tripName || booking.name || 'the trek'} is active for ${booking.selectedDate || 'upcoming date'}. ID: ${booking.bookingId || booking.id}`,
    toastType: 'success',
    toast,
  }),

  statusUpdated: (bookingName, newStatus, toast) => sendPushAlert({
    title: '📋 Booking Status Update',
    body: `Your booking for ${bookingName || 'the trek'} is now ${newStatus}.`,
    toastType: newStatus === 'Cancelled' ? 'warning' : 'info',
    toast,
  }),

  newMessage: (senderName, text, toast) => sendPushAlert({
    title: `💬 Message from ${senderName || 'Organizer'}`,
    body: text || 'Sent a message regarding your trek.',
    toastType: 'info',
    toast,
  }),

  tripNotice: (title, text, toast) => sendPushAlert({
    title: `📢 ${title || 'Trip Notice'}`,
    body: text || 'You have a new update regarding your upcoming trek.',
    toastType: 'info',
    toast,
  }),
};

// ─── Organizer Specific Major Event Alerts ───
export const OrganizerAlerts = {
  newBooking: (booking, toast) => sendPushAlert({
    title: '🎉 New Booking Received!',
    body: `${booking.userName || 'A hiker'} booked ${booking.trekName || booking.tripName || 'your trip'} (${booking.travelersCount || 1} traveler${(booking.travelersCount || 1) === 1 ? '' : 's'}).`,
    toastType: 'success',
    toast,
  }),

  bookingCancelled: (booking, toast) => sendPushAlert({
    title: '⚠️ Booking Cancelled',
    body: `${booking.userName || 'A hiker'} cancelled their booking for ${booking.trekName || booking.tripName || 'your trip'}.`,
    toastType: 'warning',
    toast,
  }),

  newMessage: (senderName, text, toast) => sendPushAlert({
    title: `💬 New Message from ${senderName || 'Traveller'}`,
    body: text || 'Sent a message.',
    toastType: 'info',
    toast,
  }),

  profileApproved: (toast) => sendPushAlert({
    title: '🛡️ Partner Profile Approved!',
    body: 'Your organizer account has been verified by admin! You can now publish treks and take bookings.',
    toastType: 'success',
    toast,
  }),

  payoutUpdated: (amount, status, toast) => sendPushAlert({
    title: '💰 Payout Status Updated',
    body: `Your payout request of ₹${amount} is now ${status}.`,
    toastType: 'success',
    toast,
  }),
};
