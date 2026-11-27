/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// iOS (standalone PWA) keyboard handling for an app shell whose html/body
// never scroll (see index.css) and whose screens are #root or `fixed inset-0`
// overlays with their own internal scroller.
//
// With the keyboard already open, moving to another field makes iOS run a
// blur-then-focus, and on the way it leaves the window at a NEGATIVE scroll
// offset one keyboard high — the whole app drops by that much, leaving a
// blank band above it, and it doesn't recover (scrollTo(0, 0) doesn't undo
// it). Measured on-device: window.scrollY -396 with a 396px keyboard. Three
// parts deal with it:
//
//  1. Hand focus over directly on a tap from one field to another. The native
//     tap is cancelled and the new field focused programmatically, so iOS
//     never runs the sequence that displaces the window. This alone fixed it.
//  2. Safety net for focus changes that bypass the tap (the keyboard's ▲/▼
//     arrows, code calling focus()): if the window still ends up displaced,
//     #root is moved back up by exactly that much until iOS returns to 0.
//  3. Reveal the focused field inside its own scroll container, since the
//     hand-off focuses with preventScroll.

const TEXT_INPUT_TYPES = new Set([
  'text', 'search', 'email', 'tel', 'url', 'password', 'number',
]);

// Types that support setSelectionRange (email/number throw on it).
const CARET_TYPES = new Set(['text', 'search', 'tel', 'url', 'password']);

const TAP_SLOP_PX = 10;
const REVEAL_MARGIN_PX = 24;

// The user agent can't be trusted here: an installed iOS web app was seen
// reporting an Android UA (so a UA-only check silently disabled all of this).
// `-webkit-touch-callout` is supported by iOS WebKit only — not macOS Safari,
// not Android — so it identifies iOS regardless of the UA.
const isIOS = () => {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (typeof CSS !== 'undefined' && CSS.supports?.('-webkit-touch-callout', 'none')) return true;
  const touch = navigator.maxTouchPoints > 1;
  return touch && (/Macintosh/.test(ua) || typeof navigator.standalone === 'boolean');
};

// A field that brings up the software keyboard and can be focused.
const isKeyboardField = (el) => {
  if (!el || el.disabled || el.readOnly) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT') return TEXT_INPUT_TYPES.has((el.getAttribute('type') || 'text').toLowerCase());
  return false;
};

const findScroller = (el) => {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
};

// Keep the field inside the part of the screen the keyboard isn't covering,
// scrolling its container rather than the window so the layout never shifts.
const reveal = (el) => {
  if (!el || !el.isConnected || document.activeElement !== el) return;
  const vv = window.visualViewport;
  const top = vv ? vv.offsetTop : 0;
  const bottom = top + (vv ? vv.height : window.innerHeight);
  const rect = el.getBoundingClientRect();
  const scroller = findScroller(el);
  if (!scroller) return;
  const sRect = scroller.getBoundingClientRect();
  const visTop = Math.max(top, sRect.top) + REVEAL_MARGIN_PX;
  const visBottom = Math.min(bottom, sRect.bottom) - REVEAL_MARGIN_PX;
  if (rect.bottom > visBottom) {
    scroller.scrollTop += rect.bottom - visBottom;
  } else if (rect.top < visTop) {
    scroller.scrollTop -= visTop - rect.top;
  }
};

export function installIOSInputFocusFix() {
  if (typeof window === 'undefined' || !isIOS()) return;

  const root = document.getElementById('root');

  // ── 2. Undo a displaced window ───────────────────────────────────────────
  // Try the reset once; if the window is still at a negative offset, move
  // #root back up by exactly that much (the visible area then shows the app
  // where it was), and drop the shift as soon as iOS returns to 0. The
  // per-frame watch runs only while a field is focused or a shift is active.
  let shift = 0;
  const applyShift = (px) => {
    if (px === shift || !root) return;
    shift = px;
    root.style.transform = px ? `translateY(${px}px)` : '';
  };

  let watchFrame = 0;
  const watch = () => {
    watchFrame = 0;
    let y = window.scrollY;
    if (y < 0 && !shift) {
      window.scrollTo(0, 0);
      y = window.scrollY;
    }
    applyShift(y < 0 ? Math.round(y) : 0);
    if (shift || isKeyboardField(document.activeElement)) watchFrame = requestAnimationFrame(watch);
  };
  const startWatch = () => {
    if (!watchFrame) watchFrame = requestAnimationFrame(watch);
  };

  window.addEventListener('scroll', () => {
    if (shift || isKeyboardField(document.activeElement)) startWatch();
  }, { passive: true });

  // ── 3. Reveal the field in its own scroller ──────────────────────────────
  let revealTimer = 0;
  document.addEventListener('focusin', (e) => {
    if (!isKeyboardField(e.target)) return;
    startWatch();
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => requestAnimationFrame(() => reveal(e.target)), 60);
    // The keyboard animates in over ~250-300ms; re-check once it has landed.
    setTimeout(() => reveal(e.target), 350);
  }, true);

  // ── 1. Direct focus hand-off between fields on tap ───────────────────────
  let startX = 0;
  let startY = 0;
  let moved = false;

  document.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      moved = e.touches.length > 1;
    },
    { passive: true, capture: true },
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (Math.abs(t.clientX - startX) > TAP_SLOP_PX || Math.abs(t.clientY - startY) > TAP_SLOP_PX) moved = true;
    },
    { passive: true, capture: true },
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (moved) return; // a scroll, not a tap
      const current = document.activeElement;
      const target = e.target;
      // Only a hand-off between two keyboard fields needs help; the first
      // focus, re-tapping the same field (caret placement) and every other
      // control keep their native behavior.
      if (!isKeyboardField(current) || !isKeyboardField(target) || target === current) return;

      // Cancels the native blur/focus/click sequence behind the jump.
      e.preventDefault();
      target.focus({ preventScroll: true });

      const type = (target.getAttribute('type') || 'text').toLowerCase();
      if (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && CARET_TYPES.has(type))) {
        try {
          const end = target.value.length;
          target.setSelectionRange(end, end);
        } catch {
          // some input types don't expose a selection
        }
      }

      // The native click was cancelled with the tap; replay it for any
      // onClick handler that relies on it.
      target.click();
    },
    { passive: false, capture: true },
  );
}
