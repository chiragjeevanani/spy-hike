/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// On-device diagnostics for the iOS keyboard / field-switch jump.
// Off by default. Toggle it (remembered on this device, reloads the page) by
// tapping the top-left corner of the screen 5 times within 3 seconds — the
// installed PWA has no address bar — or with ?kbdebug=1 / ?kbdebug=0 in a
// browser. Shows the live viewport and
// scroll metrics plus a log of the events around each field switch, so a
// single screenshot tells which of window / visual viewport / inner scroller
// actually moved.

const KEY = 'fyt_kbdebug';
const MAX_LINES = 14;

const isEnabled = () => {
  try {
    const flag = new URLSearchParams(window.location.search).get('kbdebug');
    if (flag === '1') localStorage.setItem(KEY, '1');
    if (flag === '0') localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

const describe = (el) => {
  if (!el || el === document.body) return 'body';
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const type = el.getAttribute?.('type') ? `[${el.getAttribute('type')}]` : '';
  const ph = el.getAttribute?.('placeholder') ? `"${el.getAttribute('placeholder').slice(0, 10)}"` : '';
  return `${tag}${id}${type}${ph}`;
};

const findScroller = (el) => {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
};

// 5 taps in the top-left 60×60px corner within 3s toggles the HUD.
const installToggleGesture = () => {
  let taps = [];
  document.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!t || t.clientX > 60 || t.clientY > 60) { taps = []; return; }
    const now = Date.now();
    taps = taps.filter((ts) => now - ts < 3000);
    taps.push(now);
    if (taps.length < 5) return;
    taps = [];
    try {
      if (localStorage.getItem(KEY) === '1') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, '1');
    } catch { return; }
    window.location.reload();
  }, { passive: true, capture: true });
};

export function installKeyboardDebug() {
  if (typeof window === 'undefined') return;
  installToggleGesture();
  if (!isEnabled()) return;

  const hud = document.createElement('div');
  hud.style.cssText = [
    'position:fixed', 'left:4px', 'right:4px', 'top:env(safe-area-inset-top,0px)', 'z-index:2147483647',
    'pointer-events:none', 'font:10px/1.25 ui-monospace,Menlo,monospace', 'color:#0f0',
    'background:rgba(0,0,0,.82)', 'padding:4px 6px', 'border-radius:6px', 'white-space:pre',
    'overflow:hidden',
  ].join(';');
  document.body.appendChild(hud);

  const lines = [];
  const t0 = performance.now();
  let lastScroller = null;

  const metrics = () => {
    const vv = window.visualViewport;
    const active = document.activeElement;
    const sc = findScroller(active) || lastScroller;
    if (sc) lastScroller = sc;
    return {
      win: Math.round(window.scrollY),
      vvTop: vv ? Math.round(vv.offsetTop) : '-',
      vvH: vv ? Math.round(vv.height) : '-',
      inner: window.innerHeight,
      html: document.documentElement.clientHeight,
      sc: sc ? Math.round(sc.scrollTop) : '-',
      kb: document.documentElement.classList.contains('kb-open') ? 'Y' : 'n',
      active: describe(active),
    };
  };

  const render = () => {
    const m = metrics();
    hud.textContent =
      `win:${m.win} vvTop:${m.vvTop} vvH:${m.vvH} inner:${m.inner} html:${m.html}\n` +
      `scroller:${m.sc} kb-open:${m.kb} active:${m.active}\n` +
      '────────────────────────────────\n' +
      lines.join('\n');
  };

  const log = (label) => {
    const m = metrics();
    const t = ((performance.now() - t0) / 1000).toFixed(2);
    lines.push(`${t} ${label.padEnd(9)} w${m.win} vt${m.vvTop} vh${m.vvH} s${m.sc} ${m.kb}`);
    while (lines.length > MAX_LINES) lines.shift();
    render();
  };

  // Scroll/resize fire every frame during an animation; log a change, not
  // every frame.
  let last = '';
  const logIfChanged = (label) => {
    const m = metrics();
    const sig = `${m.win}|${m.vvTop}|${m.vvH}|${m.sc}|${m.kb}`;
    if (sig === last) return;
    last = sig;
    log(label);
  };

  document.addEventListener('touchend', (e) => log(`tap ${describe(e.target).slice(0, 6)}`), true);
  document.addEventListener('focusin', (e) => log(`in ${describe(e.target).slice(0, 7)}`), true);
  document.addEventListener('focusout', () => log('out'), true);
  window.addEventListener('scroll', () => logIfChanged('winScrl'), { passive: true });
  document.addEventListener('scroll', (e) => {
    if (e.target !== document) logIfChanged('scScrl');
  }, { passive: true, capture: true });
  window.visualViewport?.addEventListener('resize', () => logIfChanged('vvResz'));
  window.visualViewport?.addEventListener('scroll', () => logIfChanged('vvScrl'));

  render();
}
