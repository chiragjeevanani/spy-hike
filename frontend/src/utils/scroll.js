/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

// #root — not window/document — is the app's actual scroll surface (see
// index.css for why: html/body are locked so the native rubber-band bounce
// and pull-to-refresh gesture, which only ever apply to the real document
// scroller, have nothing to trigger on). Call this when a navigation
// actually swaps the page living inside #root, so it opens at the top
// instead of wherever the previous one was scrolled to.
export const resetPageScroll = () => {
  restoreGeneration += 1; // supersede any restore still retrying (see below)
  const root = document.getElementById('root');
  if (root) root.scrollTop = 0;
};

// For "sub-views" that swap in via a parent's own local state (e.g. a
// profile page's `showHelpSupport`/`showAbout` toggle) rather than through
// the router — App.jsx's navigateTo() never runs for those, so its scroll
// reset never fires either, and the page opens wherever #root was already
// scrolled to. Drop this in any such component; it resets on mount, which
// fires exactly when the sub-view actually becomes visible regardless of
// what triggered it.
export const useScrollToTopOnMount = () => {
  useEffect(() => {
    resetPageScroll();
  }, []);
};

/* ── Per-history-entry scroll memory ───────────────────────────────────────
   Going back has to land on the page EXACTLY as it was left, and on iOS
   that's not a nicety — it's correctness. WebKit's interactive swipe-back
   animates a snapshot it took of the previous page, then swaps the live DOM
   in underneath at the end of the gesture. Any difference between the two —
   most easily a different scroll offset — is painted as a jump the instant
   the snapshot lifts, which is what "the page flickers when I swipe back"
   actually is. (An in-app back button has no snapshot to disagree with, so
   the same mismatch is invisible there — hence the "only the gesture does
   it" asymmetry.)

   The browser's own scroll restoration can't help: it restores the document
   scroller, and html/body never scroll here. So we bank #root's offset
   against the history entry being left and put it back when that entry is
   restored. Keys live in history.state, so they survive the entry itself
   rather than a fragile index. */

const scrollMemory = new Map();
let activeKey = null;
let keySeq = 0;
let restoreGeneration = 0;
// A session's worth of history entries, bounded — Map keeps insertion order,
// so the oldest entry is the first one out.
const MEMORY_LIMIT = 50;

// Mints a key for the entry about to be pushed and makes it the active one.
// Callers embed the return value in the state object they push.
export const nextHistoryKey = () => {
  activeKey = `h${Date.now().toString(36)}-${(keySeq += 1).toString(36)}`;
  return activeKey;
};

// Adopts the history entry currently on screen — used after a popstate (and
// once on mount), where the entry already exists. Entries this app pushed
// carry a key; anything else (the entry the document loaded on, a raw
// pushState elsewhere in the tree) gets one stamped in lazily, merged into
// whatever state was already there so the `history.state?.path` test the
// in-app back buttons use keeps telling "an entry we pushed" apart from
// "the entry we were loaded on".
export const enterHistoryEntry = () => {
  const state = window.history.state;
  let key = state?.key;
  if (!key) {
    key = nextHistoryKey();
    try {
      window.history.replaceState({ ...(state || {}), key }, '');
    } catch (e) {
      // Some embedded/private-mode WebViews throw here; the memory just
      // falls back to "open at the top", never to a broken navigation.
    }
  }
  activeKey = key;
  return key;
};

// Banks where #root is scrolled to right now against the entry on screen.
// Call it immediately BEFORE leaving that entry (pushing a new one, or
// popping away from it).
export const rememberPageScroll = () => {
  const root = document.getElementById('root');
  if (!root || !activeKey) return;
  scrollMemory.set(activeKey, root.scrollTop);
  if (scrollMemory.size > MEMORY_LIMIT) {
    scrollMemory.delete(scrollMemory.keys().next().value);
  }
};

// The offset banked for the entry currently on screen (0 = top, which is
// also the right answer for an entry we've never seen before).
export const recallPageScroll = () => (activeKey && scrollMemory.get(activeKey)) || 0;

// Putting the offset back is a race: the restored page may not have
// re-rendered yet, so #root's scrollHeight can still be too short and the
// assignment silently clamps. Re-apply across a few frames until it sticks,
// and bail the moment the visitor touches the screen so this can never
// fight a real scroll.
export const restorePageScroll = (y) => {
  const generation = (restoreGeneration += 1);
  const root = document.getElementById('root');
  if (!root) return;
  if (y <= 0) {
    root.scrollTop = 0;
    return;
  }

  let cancelled = false;
  const stop = () => { cancelled = true; };
  const cleanup = () => {
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('wheel', stop);
  };
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('wheel', stop, { passive: true });

  const deadline = Date.now() + 400;
  const apply = () => {
    // Superseded — a redirect landed us somewhere else, or a newer restore
    // took over. Never yank the page back to a scroll offset that belongs
    // to a screen the visitor is no longer on.
    if (cancelled || generation !== restoreGeneration) { cleanup(); return; }
    root.scrollTop = y;
    if (Math.abs(root.scrollTop - y) > 1 && Date.now() < deadline) {
      requestAnimationFrame(apply);
    } else {
      cleanup();
    }
  };
  apply();
};
