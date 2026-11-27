import { useEffect, useState } from 'react';

export const OTP_RESEND_SECONDS = 45;

// Keep deadlines per destination so navigating back or changing a number does
// not restart the wait. Use wall time so background tabs do not stretch it.
const deadlines = new Map();
export default function useOtpCooldown(destination) {
  const [, refresh] = useState(0);
  const remaining = () => Math.max(0, Math.ceil(((deadlines.get(destination) || 0) - Date.now()) / 1000));
  const seconds = remaining();
  useEffect(() => {
    if (!seconds) return;
    const interval = setInterval(() => refresh(value => value + 1), 250);
    return () => clearInterval(interval);
  }, [destination, seconds]);
  const start = () => {
    deadlines.set(destination, Date.now() + OTP_RESEND_SECONDS * 1000);
    refresh(value => value + 1);
  };
  return { seconds, start, canSend: () => remaining() === 0 };
}
