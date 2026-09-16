/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';

/* ── Was this screen change a back/forward, or a tap? ──────────────────────
   It matters because of what iOS does during its edge-swipe back gesture:
   WebKit animates a SNAPSHOT of the destination page for the length of the
   swipe and only swaps the live DOM in once the gesture commits. Anything
   the app animates at that moment therefore plays AFTER the snapshot lifts —
   the screen the visitor just swiped away from fades out on top of the one
   they swiped to, which reads as the page flashing or reloading. A back
   button inside the app has no snapshot to race, so the very same animation
   looks fine there. That asymmetry is the whole bug.

   So: a real back/forward swaps instantly, a tap keeps its transition. The
   flag lives in a module rather than a context because the components that
   need it are scattered (App's route overlays, a page's own sub-views, and
   whatever gets added next) — this way reading it is one hook call with
   nothing to wire up through the tree. */

let instant = false;
const listeners = new Set();

const subscribe = (onChange) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};
const getSnapshot = () => instant;

// The router calls this on every navigation: true for a real popstate (the
// iOS edge-swipe, Android's back button, the browser's own back/forward),
// false for navigation the app initiated itself.
export const setNavInstant = (next) => {
  if (next === instant) return;
  instant = next;
  listeners.forEach((onChange) => onChange());
};

// Read it from any component that swaps views when the URL changes.
export const useInstantNav = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

// Where each animatable property rests once a view has finished entering.
const RESTING = { opacity: 1, x: 0, y: 0, scale: 1 };
const restingFor = (shape) => Object.fromEntries(
  Object.keys(shape).map((key) => [key, RESTING[key] ?? 0]),
);

const NO_TRANSITION = { duration: 0 };

/**
 * Builds enter/exit variants for a view that swaps when the URL changes.
 *
 * `instant` arrives through framer-motion's `custom` channel, which is the
 * only way to reach an element that is ALREADY being removed — its ordinary
 * props are frozen at the last render in which it existed. Pass the same
 * value to both the AnimatePresence and the motion element:
 *
 *   const instant = useInstantNav();
 *   <AnimatePresence mode="wait" custom={instant}>
 *     <motion.div custom={instant} variants={V} initial="initial" animate="animate" exit="exit" />
 *
 * @param from  where the view enters from (e.g. { opacity: 0, y: 16 })
 * @param exit  where it leaves to
 */
export const routeSwapVariants = ({ from, exit, duration = 0.2, ease }) => {
  const to = { ...restingFor(from), ...restingFor(exit) };
  const transition = ease ? { duration, ease } : { duration };

  return {
    initial: (isInstant) => (isInstant ? to : from),
    animate: (isInstant) => ({ ...to, transition: isInstant ? NO_TRANSITION : transition }),
    // An instant exit still has to END at opacity 0: AnimatePresence waits
    // for the exit animation before unmounting, and a zero-duration one
    // resolves on the very next frame. Leaving the offsets at rest keeps it
    // from shifting on its way out.
    exit: (isInstant) => (isInstant
      ? { ...to, opacity: 0, transition: NO_TRANSITION }
      : { ...exit, transition }),
  };
};
