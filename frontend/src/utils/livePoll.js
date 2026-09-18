/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

// Request options for a live poll.
//
// apiClient caches GET responses for 60s, which is right for catalog data but
// wrong for anything being polled: a 5-second poll for new bookings was being
// answered from that cache, so a booking made by a customer could take up to a
// minute to appear — and a poll that only ever hit the cache looked like "the
// organizer app never updates until you restart it".
export const LIVE = { cache: false };

/**
 * Runs `handler` on an interval for as long as the screen is actually being
 * looked at, and again the moment the app comes back to the foreground.
 *
 * Mobile browsers and webviews suspend timers for a backgrounded page, so an
 * interval alone doesn't survive the app being switched away from and back —
 * which is the case where fresh data matters most. Listening for the wake
 * events covers that, and skipping runs while hidden stops a background tab
 * polling the API for nothing.
 *
 * @param {() => (void|Promise<void>)} handler  the poll body (should handle its own errors)
 * @param {{intervalMs?: number, enabled?: boolean}} [options]
 */
export function useLivePoll(handler, { intervalMs = 5000, enabled = true } = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let inFlight = false;

    // Guarded against overlap: a slow round trip must not stack up behind the
    // interval (or behind a wake event firing alongside it).
    const run = async () => {
      if (cancelled || inFlight) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await handlerRef.current?.();
      } catch {
        /* the handler owns its errors; a poll must never throw into React */
      } finally {
        inFlight = false;
      }
    };

    run();
    const timer = setInterval(run, intervalMs);

    // visibilitychange covers tab switches and an app resumed from the
    // background; focus covers a re-focused desktop window; pageshow covers a
    // page restored from the back/forward cache, where no other event fires.
    const onWake = () => { if (document.visibilityState !== 'hidden') run(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
    };
  }, [enabled, intervalMs]);
}

export default useLivePoll;
