/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// iOS Safari's elastic "rubber-band" bounce — the thing behind both the
// white-flash-on-scroll and the pull-to-refresh gesture — is a native
// WebKit behavior applied to ANY touch-scrolled element, not just the
// document. `overscroll-behavior` (set on #root in index.css) covers
// Android/desktop Chrome reliably, but iOS Safari's support for it on a
// plain scrollable div (as opposed to the document itself) has long been
// inconsistent across versions, which is why locking html/body alone
// wasn't enough on iPhone. This is the belt-and-suspenders fix: block the
// touch gesture itself, but only in the exact direction/position where it
// would overscroll — every touch that isn't at a scroll boundary keeps
// working through the browser's normal (smooth, native-momentum) scrolling
// untouched.
export function installOverscrollGuard() {
  const root = document.getElementById('root');
  if (!root) return;

  let startY = 0;
  let scroller = root;

  const isScrollable = (el) => {
    const style = getComputedStyle(el);
    return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
  };

  // Walks up from the actual touch target to #root, so a nested scroller
  // (a trek detail page's own body, a modal's scrollable content, ...) is
  // guarded at ITS OWN boundary rather than #root's — letting it scroll
  // normally right up until it, specifically, has nowhere further to go.
  const findScroller = (target) => {
    let el = target;
    while (el && el !== root.parentElement) {
      if (isScrollable(el)) return el;
      el = el.parentElement;
    }
    return root;
  };

  root.addEventListener(
    'touchstart',
    (e) => {
      startY = e.touches[0].clientY;
      scroller = findScroller(e.target);
    },
    { passive: true },
  );

  root.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) return; // pinch-zoom etc. — leave alone
      const deltaY = e.touches[0].clientY - startY;
      if (deltaY === 0) return;

      const atTop = scroller.scrollTop <= 0;
      const atBottom = Math.ceil(scroller.scrollTop + scroller.clientHeight) >= scroller.scrollHeight;
      // deltaY > 0 = finger moving down the screen = pulling the top of the
      // content into view (this is the pull-to-refresh gesture); deltaY < 0
      // = pushing the bottom past its end.
      if ((deltaY > 0 && atTop) || (deltaY < 0 && atBottom)) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
}
