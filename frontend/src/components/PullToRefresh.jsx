/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { setPullGestureHandler } from '../utils/preventOverscrollBounce';

// How far the indicator has to travel before releasing actually refreshes.
// Damped (below), that works out at roughly 100px of finger travel — short
// enough to be easy one-handed, long enough that a sloppy scroll-up at the
// top of the page doesn't trip it.
const THRESHOLD = 64;
// The indicator never travels further than this, however hard you pull.
const MAX_TRAVEL = 180;
// A refresh that resolves instantly still shows the spinner this long —
// a 40ms flash reads as a glitch rather than as "it reloaded".
const MIN_SPIN_MS = 500;

// Rubber-band damping: 1:1 at the start, asymptotic to MAX_TRAVEL, so the
// pull feels like it's stretching against something instead of stopping dead.
const damp = (distance) => (distance <= 0 ? 0 : (distance * MAX_TRAVEL) / (distance + MAX_TRAVEL));

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Pull down at the top of the page to refresh.
 *
 * The gesture itself comes from the overscroll guard rather than from
 * listeners of our own — at the top of #root the native rubber-band pull and
 * this are the same finger movement, and only one of them can own it. See
 * utils/preventOverscrollBounce.js.
 *
 * Note the page content deliberately doesn't slide down with the pull: #root
 * has `position: fixed` descendants (every route overlay, the bottom nav) and
 * a transform on an ancestor would re-anchor all of them to it.
 *
 * @param onRefresh async; the spinner stays until it settles
 * @param enabled   false while a screen is showing that shouldn't refresh
 */
export default function PullToRefresh({ onRefresh, enabled = true, darkMode = false }) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // The gesture handler is registered once, so it reads live values through
  // refs rather than closing over a render's worth of state.
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPullDistance = useCallback((next) => {
    distanceRef.current = next;
    setDistance(next);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPullGestureHandler(null);
      return undefined;
    }

    setPullGestureHandler({
      onPull: (raw) => {
        if (refreshingRef.current) return;
        setPullDistance(damp(raw));
      },
      onRelease: async () => {
        if (refreshingRef.current) return;
        if (distanceRef.current < THRESHOLD) {
          setPullDistance(0);
          return;
        }

        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(THRESHOLD); // park it where the spinner sits
        try {
          await Promise.all([onRefreshRef.current?.(), wait(MIN_SPIN_MS)]);
        } catch (e) {
          // A failed refresh still has to hand the gesture back — the screen
          // keeps whatever it already had.
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullDistance(0);
        }
      },
    });

    return () => setPullGestureHandler(null);
  }, [enabled, setPullDistance]);

  // Leaving a refreshable screen mid-pull shouldn't strand the indicator.
  useEffect(() => {
    if (!enabled && !refreshingRef.current) setPullDistance(0);
  }, [enabled, setPullDistance]);

  const active = distance > 0 || refreshing;
  if (!active) return null;

  const progress = Math.min(1, distance / THRESHOLD);
  const armed = progress >= 1;

  return (
    <div
      aria-hidden={!refreshing}
      role={refreshing ? 'status' : undefined}
      data-testid="pull-to-refresh"
      data-state={refreshing ? 'refreshing' : armed ? 'armed' : 'pulling'}
      className="fixed inset-x-0 top-0 z-[60] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${distance}px)`,
        // Snapping back after a release should ease; following the finger
        // must not, or the indicator lags behind it.
        transition: refreshing || distance === 0 ? 'transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div
        className={`mt-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg ${
          darkMode ? 'bg-zinc-800 text-forest-400' : 'bg-white text-forest-600'
        }`}
        style={{ opacity: Math.max(0.35, progress), transform: `scale(${0.7 + progress * 0.3})` }}
      >
        <RefreshCw
          size={17}
          className={refreshing ? 'animate-spin' : undefined}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  );
}
