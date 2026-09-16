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
// A pull-down at the very top of #root is two things at once: the native
// gesture this guard exists to block, and the gesture pull-to-refresh is made
// of. Running a second set of touch listeners alongside this one would mean
// two handlers fighting over the same touch, so the guard hands that single
// case to whoever registers here instead — and still blocks the native bounce
// either way, registered or not. See components/PullToRefresh.jsx.
let pullConsumer = null;

/**
 * @param consumer `{ onPull(distancePx), onRelease() }`, or null to detach.
 *   Distance is raw finger travel from where the pull began; resistance and
 *   thresholds are the consumer's business, not the guard's.
 */
export const setPullGestureHandler = (consumer) => {
  pullConsumer = consumer;
};

export function installOverscrollGuard() {
  const root = document.getElementById('root');
  if (!root) return;

  let startY = 0;
  let scroller = root;
  // Where the current pull-at-the-top began, or null when one isn't running.
  // Re-baselined rather than measured from touchstart, so a flick that
  // scrolls up INTO the top boundary doesn't arrive already "pulled".
  let pullOriginY = null;

  const endPull = () => {
    if (pullOriginY === null) return;
    pullOriginY = null;
    pullConsumer?.onRelease();
  };

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
      pullOriginY = null;
    },
    { passive: true },
  );

  root.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) return; // pinch-zoom etc. — leave alone
      const y = e.touches[0].clientY;
      const deltaY = y - startY;
      if (deltaY === 0) return;

      const atTop = scroller.scrollTop <= 0;
      const atBottom = Math.ceil(scroller.scrollTop + scroller.clientHeight) >= scroller.scrollHeight;
      // deltaY > 0 = finger moving down the screen = pulling the top of the
      // content into view (this is the pull-to-refresh gesture); deltaY < 0
      // = pushing the bottom past its end.
      if (deltaY > 0 && atTop) {
        e.preventDefault();
        // Only the page itself pulls to refresh. A nested scroller sitting at
        // its own top (a trek detail body, a drawer's list) still just gets
        // the bounce blocked, as before.
        if (pullConsumer && scroller === root) {
          if (pullOriginY === null) pullOriginY = y;
          pullConsumer.onPull(Math.max(0, y - pullOriginY));
        }
        return;
      }
      if (deltaY < 0 && atBottom) {
        e.preventDefault();
        return;
      }
      // Moved back out of the top boundary mid-gesture: the pull is over even
      // though the finger is still down.
      endPull();
    },
    { passive: false },
  );

  root.addEventListener('touchend', endPull, { passive: true });
  root.addEventListener('touchcancel', endPull, { passive: true });
}
