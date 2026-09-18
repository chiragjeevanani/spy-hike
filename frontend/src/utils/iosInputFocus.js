/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// iOS (especially the standalone PWA) keyboard handling for an app shell
// whose html/body never scroll (see index.css) and whose screens are either
// #root or `fixed inset-0` overlays with their own internal scroller.
//
// When the keyboard opens iOS does NOT shrink the layout: it scrolls the
// whole window/layout viewport to push the focused field above the keyboard.
// That window scroll is exactly what the app is built never to have — fixed
// overlays slide off-screen, a blank band shows, and every field switch
// (tap or the keyboard's ▲/▼ arrows) re-runs it, so the page visibly drops
// and jumps back. Three parts stop it:
//
//  1. Fit the app to the visible area: while the keyboard is up, #root and
//     every full-screen overlay are sized to the visual viewport (the part
//     above the keyboard) via `html.kb-open` + `--kb-vvh` (index.css), so a
//     field is never "under" the keyboard and there is nothing for iOS to
//     reveal by scrolling the window.
//  2. Pin the window: any window scroll iOS still does is undone at once, and
//     the focused field is revealed inside its OWN scroll container instead.
//  3. Hand focus over directly on a tap from one field to another, so the
//     keyboard never starts to close between them (blur-then-focus).

const TEXT_INPUT_TYPES = new Set([
  'text', 'search', 'email', 'tel', 'url', 'password', 'number',
]);

// Types that support setSelectionRange (email/number throw on it).
const CARET_TYPES = new Set(['text', 'search', 'tel', 'url', 'password']);

const TAP_SLOP_PX = 10;
const REVEAL_MARGIN_PX = 24;
// Smallest viewport shrink treated as "the keyboard is open" (the QuickType
// bar alone is ~45px; a real keyboard is 250px+).
const KEYBOARD_MIN_PX = 120;

// TEMP (diagnosis): which strategy runs, cycled on-device from the debug HUD
// (utils/kbDebug.js). A = hand-off + shift correction (default), B = shift
// correction only, C = hand-off only, D = off (native iOS behavior).
export const KB_MODE_KEY = 'fyt_kbmode';
export const KB_MODES = ['A', 'B', 'C', 'D'];
export const getKeyboardFixMode = () => {
  try {
    const m = localStorage.getItem(KB_MODE_KEY);
    return KB_MODES.includes(m) ? m : 'A';
  } catch {
    return 'A';
  }
};
const debugLog = (msg) => window.dispatchEvent(new CustomEvent('kbdebug', { detail: msg }));

const isIOS = () => {
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports itself as Mac; distinguish it by touch support.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
  if (typeof window === 'undefined') return;
  // TEMP (diagnosis): lets the debug HUD show whether this actually runs.
  const mode = getKeyboardFixMode();
  window.__kbFix = { ios: isIOS(), mode, running: false };
  if (!isIOS()) return;

  // TEMP (diagnosis): strategy switchable on-device from the debug HUD.
  if (mode === 'D') return;
  const useShift = mode === 'A' || mode === 'B';
  const useHandoff = mode === 'A' || mode === 'C';
  window.__kbFix.running = true;

  const html = document.documentElement;
  const vv = window.visualViewport;
  const root = document.getElementById('root');

  // ── 1 + 2. Undo iOS's window displacement ────────────────────────────────
  // With the keyboard already open, focusing another field makes iOS (26,
  // standalone) leave the window at a NEGATIVE offset one keyboard high —
  // the whole app drops by that much, and scrollTo(0, 0) doesn't bring it
  // back. So: try the reset once; if the window is still displaced, move
  // #root back up by exactly the displacement (the visible area then shows
  // the app where it was), and drop that as soon as iOS returns to 0. A
  // per-frame watch runs only while a field is focused or a shift is active.
  let shift = 0;
  const applyShift = (px) => {
    if (px === shift || !root) return;
    shift = px;
    root.style.transform = px ? `translateY(${px}px)` : '';
    debugLog(px ? `shift ${px}` : 'unshift');
  };

  let watchFrame = 0;
  const watch = () => {
    watchFrame = 0;
    let y = window.scrollY;
    if (y < 0 && !shift) {
      window.scrollTo(0, 0);
      debugLog(`reset ${Math.round(y)}>${Math.round(window.scrollY)}`);
      y = window.scrollY;
    }
    applyShift(y < 0 ? Math.round(y) : 0);
    if (shift || isKeyboardField(document.activeElement)) watchFrame = requestAnimationFrame(watch);
  };
  const pinWindow = () => {
    if (useShift && !watchFrame) watchFrame = requestAnimationFrame(watch);
  };

  let revealTimer = 0;
  const scheduleReveal = (el, delay = 0) => {
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => requestAnimationFrame(() => reveal(el)), delay);
  };

  const syncViewport = () => {
    if (!vv) return;
    // html is locked to the layout viewport, which iOS never shrinks for the
    // keyboard — so the gap between the two is the keyboard's height.
    const layoutHeight = html.clientHeight;
    const keyboardOpen = isKeyboardField(document.activeElement)
      && layoutHeight - vv.height > KEYBOARD_MIN_PX;

    if (keyboardOpen) {
      html.style.setProperty('--kb-vvh', `${Math.round(vv.height)}px`);
      if (!html.classList.contains('kb-open')) html.classList.add('kb-open');
      pinWindow();
      scheduleReveal(document.activeElement);
    } else if (html.classList.contains('kb-open')) {
      html.classList.remove('kb-open');
      html.style.removeProperty('--kb-vvh');
      pinWindow();
    }
  };

  if (vv) {
    vv.addEventListener('resize', syncViewport);
    vv.addEventListener('scroll', () => {
      if (isKeyboardField(document.activeElement) || html.classList.contains('kb-open')) pinWindow();
    });
  }
  window.addEventListener('scroll', () => {
    if (isKeyboardField(document.activeElement) || html.classList.contains('kb-open')) pinWindow();
  }, { passive: true });

  // Any focus change — a tap, the keyboard's ▲/▼ arrows, or code calling
  // focus() — re-fits the app and reveals the field in its own scroller once
  // the keyboard has settled.
  document.addEventListener('focusin', (e) => {
    if (!isKeyboardField(e.target)) return;
    syncViewport();
    pinWindow();
    scheduleReveal(e.target, 60);
    // The keyboard animates in over ~250-300ms; re-check once it has landed.
    setTimeout(() => { syncViewport(); pinWindow(); reveal(e.target); }, 350);
  }, true);

  // Once the keyboard closes, restore full height and undo any leftover
  // window scroll — but only when no other field took focus (a field switch
  // must never collapse and re-open the layout).
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (isKeyboardField(document.activeElement)) return;
      syncViewport();
      pinWindow();
    }, 100);
  }, true);

  // ── 3. Direct focus hand-off between fields on tap ───────────────────────
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
      if (moved || !useHandoff) return; // a scroll, not a tap
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
