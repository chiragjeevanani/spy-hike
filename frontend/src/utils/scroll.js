/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

// #root — not window/document — is the app's actual scroll surface (see
// index.css for why: html/body are locked so the native rubber-band bounce
// and pull-to-refresh gesture, which only ever apply to the real document
// scroller, have nothing to trigger on). Call this on every navigation so a
// new page opens at the top instead of wherever the previous one was
// scrolled to.
export const resetPageScroll = () => {
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
