import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

let openOverlays = 0;
let previousOverflow;
let previousInert;

// Fixed overlays must live outside animated/scrolling app containers.
// Reference counting keeps the background locked when overlays are nested.
export default function OverlayPortal({ children }) {
  const layerRef = useRef(null);
  useLayoutEffect(() => {
    const root = document.getElementById('root');
    const previousFocus = document.activeElement;
    if (openOverlays++ === 0) {
      previousOverflow = root?.style.overflowY;
      previousInert = root?.inert;
      if (root) {
        root.style.overflowY = 'hidden';
        root.inert = true;
      }
      document.body.dataset.overlayOpen = 'true';
    }
    const firstControl = layerRef.current?.querySelector('button, input, select, textarea, [tabindex="0"]');
    firstControl?.focus({ preventScroll: true });
    return () => {
      if (--openOverlays === 0) {
        if (root) {
          root.style.overflowY = previousOverflow || '';
          root.inert = previousInert || false;
        }
        delete document.body.dataset.overlayOpen;
      }
      if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return createPortal(
    <div ref={layerRef} data-app-overlay className="relative z-[10000]" onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const controls = [...layerRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
        .filter(element => element.getClientRects().length && !element.closest('[inert]'));
      if (!controls.length) return;
      event.stopPropagation();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }}>
      {children}
    </div>,
    document.body,
  );
}
