/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

// "Everything on screen should re-read itself now."
//
// A pull-to-refresh can't be handled by App alone: App owns the trips,
// bookings and notifications, but each screen also fetches things only it
// knows about (Home's banners, Explore's browse feed, ...). Rather than
// thread a refresh counter through every view's props, the gesture raises
// one event and each screen subscribes to whatever it owns — the same
// pattern the banner CMS already uses to push edits into a live Home.
export const REFRESH_EVENT = 'fyt-refresh';

export const requestAppRefresh = () => {
  window.dispatchEvent(new Event(REFRESH_EVENT));
};

/**
 * Re-runs `handler` whenever a refresh is requested. The handler is read
 * through a ref, so a screen can close over current state without
 * re-subscribing on every render.
 */
export const useAppRefresh = (handler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onRefresh = () => handlerRef.current?.();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, []);
};
