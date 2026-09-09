/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
