/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// iOS (especially the standalone PWA) handles "tap field B while field A is
// focused" as blur-then-focus: the blur starts dismissing the keyboard, the
// visual viewport springs back and the page visibly drops, then the focus on
// B brings the keyboard back and scrolls up again. With html/body locked and
// #root as the only scroller (see index.css) that round-trip is very visible.
//
// This hands focus over directly instead: when a keyboard field is already
// focused and the user taps another one, the native tap is cancelled and the
// new field is focused programmatically inside the same user gesture, so the
// keyboard never closes and nothing jumps. The field is then revealed inside
// its own scroll container (not the window) if the keyboard covers it.

const TEXT_INPUT_TYPES = new Set([
  'text', 'search', 'email', 'tel', 'url', 'password', 'number',
]);

// Types that support setSelectionRange (email/number throw on it).
const CARET_TYPES = new Set(['text', 'search', 'tel', 'url', 'password']);

const TAP_SLOP_PX = 10;
const REVEAL_MARGIN_PX = 24;

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
  return document.getElementById('root');
};

// Keep the field inside the part of the screen the keyboard isn't covering,
// scrolling its container rather than the window so the layout never shifts.
const reveal = (el) => {
  const vv = window.visualViewport;
  const top = vv ? vv.offsetTop : 0;
  const bottom = top + (vv ? vv.height : window.innerHeight);
  const rect = el.getBoundingClientRect();
  const scroller = findScroller(el);
  if (!scroller) return;
  if (rect.bottom > bottom - REVEAL_MARGIN_PX) {
    scroller.scrollTop += rect.bottom - (bottom - REVEAL_MARGIN_PX);
  } else if (rect.top < top + REVEAL_MARGIN_PX) {
    scroller.scrollTop -= top + REVEAL_MARGIN_PX - rect.top;
  }
};

export function installIOSInputFocusFix() {
  if (typeof window === 'undefined' || !isIOS()) return;

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

      requestAnimationFrame(() => reveal(target));
    },
    { passive: false, capture: true },
  );

  // Once the keyboard fully closes, iOS can leave the window scrolled
  // (html/body never scroll by design), leaving a gap at the bottom. Snap it
  // back only when no keyboard field took focus, so switching fields never
  // triggers it.
  document.addEventListener(
    'focusout',
    () => {
      setTimeout(() => {
        if (isKeyboardField(document.activeElement)) return;
        if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
      }, 100);
    },
    true,
  );
}
