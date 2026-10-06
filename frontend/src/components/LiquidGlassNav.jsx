import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';

// Inset of the lens inside each tab slot, in px.
const LENS_INSET = 4;
// How far (px) a finger must move before a press becomes a lens drag.
const DRAG_THRESHOLD = 6;

// SVG refraction (backdrop-filter: url(#…)) only renders in Chromium — on
// WebKit it blanks the backdrop — so Android/Chrome get real light bending and
// everything else falls back to the plain frosted blur.
const supportsRefraction = (() => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Chrome|Chromium|Android/.test(ua) && !/iPhone|iPad|iPod|Firefox/.test(ua);
})();

function MagnifiedIcon({ index, lensCenter, slotWidth, isActive, darkMode, Icon, badge }) {
  // Icons swell as the lens passes over them, like looking through a loupe.
  const scale = useTransform(lensCenter, (c) => {
    if (!slotWidth) return 1;
    const dist = Math.abs(c - (index + 0.5) * slotWidth) / slotWidth;
    return 1 + 0.22 * Math.max(0, 1 - dist);
  });

  return (
    <motion.div style={{ scale }} className="relative flex items-center justify-center">
      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
      {badge > 0 && (
        <span
          className={`absolute -top-1 -right-1.5 min-w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border scale-90 ${
            darkMode ? 'border-elegant-card' : 'border-white'
          }`}
        >
          {badge}
        </span>
      )}
    </motion.div>
  );
}

/**
 * Floating "liquid glass" tab bar shared by the hiker and organizer apps.
 *
 * tabs:        [{ id, label, icon, badge? }]
 * idPrefix:    button ids become `${idPrefix}${id.toLowerCase()}` (e2e hooks)
 * activeClass: { light, dark } text-colour classes for the active tab
 */
export default function LiquidGlassNav({ tabs: TABS, activeTab, onChangeTab, darkMode, idPrefix, activeClass }) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const placedRef = useRef(0);
  const [slotWidth, setSlotWidth] = useState(0);
  const [pressed, setPressed] = useState(false);

  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));

  // Lens position (left edge of its slot) — springy so it overshoots a touch.
  const lensX = useMotionValue(0);
  const smoothX = useSpring(lensX, reduceMotion
    ? { stiffness: 1000, damping: 100 }
    : { stiffness: 420, damping: 30, mass: 0.8 });

  // Liquid squish: the lens stretches along its travel and thins vertically.
  const velocity = useVelocity(smoothX);
  const scaleX = useTransform(velocity, [-2500, 0, 2500], [1.28, 1, 1.28]);
  const scaleY = useTransform(velocity, [-2500, 0, 2500], [0.86, 1, 0.86]);
  // The specular highlight slides against the direction of travel.
  const sheenX = useTransform(velocity, [-2500, 0, 2500], ['70%', '30%', '-10%']);
  const sheen = useTransform(
    sheenX,
    (x) => `radial-gradient(120% 90% at ${x} 0%, rgba(255,255,255,${darkMode ? 0.28 : 0.75}) 0%, rgba(255,255,255,0) 60%)`
  );
  const lensCenter = useTransform(smoothX, (x) => x + slotWidth / 2);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const measure = () => setSlotWidth(el.clientWidth / TABS.length);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [TABS.length]);

  // Snap to the active tab whenever it (or the layout) changes.
  useEffect(() => {
    if (!slotWidth || dragRef.current?.dragging) return;
    lensX.set(activeIndex * slotWidth);
    // First placement (and resizes) shouldn't slide in from the left edge.
    if (!placedRef.current || placedRef.current !== slotWidth) {
      smoothX.jump(activeIndex * slotWidth);
      placedRef.current = slotWidth;
    }
  }, [activeIndex, slotWidth, lensX, smoothX]);

  const indexFromClientX = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const i = Math.floor((clientX - rect.left) / slotWidth);
    return Math.min(TABS.length - 1, Math.max(0, i));
  };

  const handlePointerDown = (e) => {
    if (!slotWidth) return;
    dragRef.current = { startX: e.clientX, dragging: false, id: e.pointerId };
    setPressed(true);
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.dragging && Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD) return;
    if (!drag.dragging) {
      drag.dragging = true;
      trackRef.current.setPointerCapture?.(e.pointerId);
    }
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - slotWidth / 2;
    lensX.set(Math.min(rect.width - slotWidth, Math.max(0, x)));
  };

  const endPress = (e) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setPressed(false);
    if (!drag?.dragging) return; // plain taps are handled by the button's onClick
    const i = indexFromClientX(e.clientX);
    lensX.set(i * slotWidth);
    if (TABS[i].id !== activeTab) onChangeTab(TABS[i].id);
  };

  const cancelPress = () => {
    dragRef.current = null;
    setPressed(false);
    if (slotWidth) lensX.set(activeIndex * slotWidth);
  };

  // In dark mode the glass is smoked: it dims whatever bright content scrolls
  // underneath so the light icons/labels keep their contrast.
  const glassBlur = darkMode
    ? 'blur(18px) saturate(160%) brightness(0.55)'
    : 'blur(18px) saturate(190%)';
  const lensTone = darkMode ? 'brightness(0.8)' : 'brightness(1.08)';
  const lensFallback = `blur(6px) saturate(210%) ${lensTone}`;
  const lensFilter = supportsRefraction
    ? `url(#liquid-glass-refract) blur(2px) saturate(210%) ${lensTone}`
    : lensFallback;
  const labelShadow = darkMode ? '0 1px 2px rgba(0,0,0,0.55)' : 'none';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 max-w-xl mx-auto w-full px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 z-40 shrink-0 pointer-events-none">
      {/* Displacement map that warps whatever is behind the lens — the "light bending". */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="liquid-glass-refract" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="28" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <nav
        aria-label="Primary"
        className={`pointer-events-auto relative rounded-[2rem] p-1.5 border select-none ${
          darkMode
            ? 'bg-[#07150f]/55 border-white/[0.12] shadow-[0_18px_45px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.35)]'
            : 'bg-white/[0.42] border-white/70 shadow-[0_18px_45px_rgba(38,48,35,0.18),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.04)]'
        }`}
        style={{ backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur }}
      >
        {/* Soft top-down glare across the whole bar. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            background: darkMode
              ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 55%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)',
          }}
        />

        <div
          ref={trackRef}
          className="relative flex items-stretch touch-pan-y"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPress}
          onPointerCancel={cancelPress}
        >
          {/* The liquid-glass lens sitting over the active tab. */}
          {slotWidth > 0 && (
            <motion.div
              aria-hidden="true"
              className="absolute top-0 bottom-0 left-0 pointer-events-none"
              style={{ x: smoothX, width: slotWidth, padding: `0 ${LENS_INSET / 2}px` }}
            >
              <motion.div
                className={`relative h-full w-full rounded-[1.6rem] overflow-hidden border ${
                  darkMode ? 'border-white/20' : 'border-white/90'
                }`}
                style={{
                  scaleX,
                  scaleY,
                  backdropFilter: lensFilter,
                  WebkitBackdropFilter: lensFallback,
                  background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)',
                  boxShadow: darkMode
                    ? 'inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -6px 12px rgba(0,0,0,0.25), 0 6px 18px rgba(0,0,0,0.35)'
                    : 'inset 0 1px 1px rgba(255,255,255,1), inset 0 -6px 12px rgba(11,93,59,0.08), 0 6px 18px rgba(38,48,35,0.14)',
                }}
                animate={{ scale: pressed && !reduceMotion ? 1.12 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              >
                {/* Moving specular highlight. */}
                <motion.div className="absolute inset-0" style={{ background: sheen }} />
                {/* Faint chromatic rim, like light splitting at the glass edge. */}
                <div
                  className="absolute inset-0 rounded-[inherit]"
                  style={{
                    boxShadow: 'inset 1.5px 0 2px rgba(120,190,255,0.25), inset -1.5px 0 2px rgba(255,170,120,0.25)',
                  }}
                />
              </motion.div>
            </motion.div>
          )}

          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`${idPrefix}${tab.id.toLowerCase()}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (slotWidth) lensX.set(index * slotWidth);
                  onChangeTab(tab.id);
                }}
                className="relative z-10 flex-1 flex flex-col items-center justify-center py-2.5 cursor-pointer outline-none"
              >
                <div
                  style={{ filter: darkMode ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' : undefined }}
                  className={`transition-colors duration-300 ${
                    isActive
                      ? (darkMode ? activeClass.dark : activeClass.light)
                      : (darkMode ? 'text-white/80' : 'text-zinc-500')
                  }`}
                >
                  <MagnifiedIcon
                    index={index}
                    lensCenter={lensCenter}
                    slotWidth={slotWidth}
                    isActive={isActive}
                    darkMode={darkMode}
                    Icon={tab.icon}
                    badge={tab.badge || 0}
                  />
                </div>
                <span
                  style={{ textShadow: labelShadow }}
                  className={`text-[9px] tracking-wider uppercase mt-1 transition-colors duration-300 ${
                    isActive
                      ? `${darkMode ? activeClass.dark : activeClass.light} font-bold`
                      : (darkMode ? 'text-white/80 font-semibold' : 'text-zinc-500 font-semibold')
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
