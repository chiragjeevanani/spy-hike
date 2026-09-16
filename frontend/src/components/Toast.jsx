import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'error', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    error: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50',
    success: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
    info: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
    warning: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
  };

  const icons = {
    error: <AlertCircle size={15} className="shrink-0" />,
    success: <CheckCircle2 size={15} className="shrink-0" />,
    info: <Info size={15} className="shrink-0" />,
    warning: <AlertTriangle size={15} className="shrink-0" />,
  };

  // Positioning/stacking is the container's job (ToastProvider) — this is
  // just the pill itself, so multiple can stack without fighting over `fixed`.
  return (
    <div className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md transition-all duration-300 ${colors[type] || colors.error}`}>
      {icons[type] || icons.error}
      <span className="flex-1 text-left">{message}</span>
      <button 
        type="button" 
        onClick={onClose} 
        className="p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
      >
        <X size={14} />
      </button>
    </div>
  );
}
