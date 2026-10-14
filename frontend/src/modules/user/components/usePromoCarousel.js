import { useCallback, useEffect, useRef, useState } from 'react';

// Native scrolling keeps every neighbouring image mounted and flush with the
// next one, including while a finger is between slides. End copies allow looping.
export default function usePromoCarousel(count) {
  const ref = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const settleTimer = useRef(null);
  const dragging = useRef(null);
  const suppressClick = useRef(false);
  const loop = count > 1;

  const goTo = useCallback((index) => {
    const el = ref.current;
    if (!el || !count) return;
    const slot = loop ? Math.max(0, Math.min(count + 1, index + 1)) : 0;
    el.scrollTo({ left: slot * el.clientWidth, behavior: 'smooth' });
  }, [count, loop]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => {
      el.scrollLeft = (loop ? 1 : 0) * el.clientWidth;
      setActiveIndex(0);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(settleTimer.current);
    };
  }, [count, loop]);

  useEffect(() => {
    if (paused || !loop) return undefined;
    const timer = setTimeout(() => goTo(activeIndex + 1), 5000);
    return () => clearTimeout(timer);
  }, [activeIndex, paused, loop, goTo]);

  const onScroll = () => {
    const el = ref.current;
    if (!el?.clientWidth) return;
    const slot = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(loop ? (slot - 1 + count) % count : 0);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (dragging.current || !loop) return;
      const position = el.scrollLeft / el.clientWidth;
      // Only reset once the scroll has reached the identical end copy.
      if (Math.abs(position) < 0.01) el.scrollLeft = count * el.clientWidth;
      else if (Math.abs(position - count - 1) < 0.01) el.scrollLeft = el.clientWidth;
    }, 160);
  };

  return {
    ref, activeIndex, goTo,
    handlers: {
      onScroll,
      onTouchStart: () => setPaused(true),
      onTouchEnd: () => setPaused(false),
      onTouchCancel: () => setPaused(false),
      onPointerDown: (event) => {
        setPaused(true);
        suppressClick.current = false;
        if (event.pointerType !== 'mouse' || event.button !== 0 || !loop) return;
        dragging.current = { x: event.clientX, left: ref.current.scrollLeft };
      },
      onPointerMove: (event) => {
        const start = dragging.current;
        if (!start) return;
        if (Math.abs(event.clientX - start.x) > 5) {
          suppressClick.current = true;
          ref.current.setPointerCapture(event.pointerId);
          ref.current.style.scrollSnapType = 'none';
          ref.current.scrollLeft = start.left + start.x - event.clientX;
        }
      },
      onPointerUp: (event) => {
        const start = dragging.current;
        dragging.current = null;
        setPaused(false);
        if (!start) return;
        ref.current.style.scrollSnapType = '';
        const delta = start.x - event.clientX;
        const startSlot = Math.round(start.left / ref.current.clientWidth);
        const targetSlot = startSlot + (Math.abs(delta) > 40 ? Math.sign(delta) : 0);
        goTo(targetSlot - 1);
      },
      onPointerCancel: (event) => {
        dragging.current = null;
        // Native touch scrolling cancels pointer events before the finger lifts.
        if (event.pointerType !== 'touch') setPaused(false);
        if (ref.current) ref.current.style.scrollSnapType = '';
      },
      onClickCapture: (event) => {
        if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); }
      },
      onDragStart: (event) => event.preventDefault(),
    },
  };
}
