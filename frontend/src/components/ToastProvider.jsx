import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Toast from './Toast';

// App-wide toast surface: mounted once in main.jsx above whichever module
// (admin/organizer/user) is active, so any form anywhere can call
// useToast().error(...)/success(...)/info(...) without prop-drilling or
// re-implementing its own error banner.
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type, duration = 4000) => {
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, message, type, duration }]);
    return id;
  }, []);

  const toast = React.useMemo(() => ({
    error: (message, duration) => show(message, 'error', duration),
    success: (message, duration) => show(message, 'success', duration),
    info: (message, duration) => show(message, 'info', duration),
  }), [show]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-3 inset-x-0 z-[999] flex flex-col items-center gap-2 px-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="w-full max-w-sm pointer-events-auto">
            <Toast message={t.message} type={t.type} duration={t.duration} onClose={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Falls back to a no-op-safe console warning if ever used outside the
// provider, rather than crashing the whole app over a missing toast.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    console.warn('useToast() called outside <ToastProvider> — toast will no-op.');
    return { error: () => {}, success: () => {}, info: () => {} };
  }
  return ctx;
}

export default ToastProvider;
