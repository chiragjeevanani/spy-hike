import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestoredToast, setShowRestoredToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredToast(true);
      const timer = setTimeout(() => {
        setShowRestoredToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Offline Alert Bar. */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 to-red-600 text-white px-4 py-2.5 text-sm font-medium shadow-xl flex items-center justify-between transition-all duration-300">
          <div className="flex items-center space-x-2 mx-auto sm:mx-0">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>You are currently offline. Redirecting to Campfire View...</span>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href="/offline.html"
              className="bg-black/30 hover:bg-black/40 text-white px-3 py-1 rounded text-xs transition-colors underline"
            >
              Campfire Screen 🌲
            </a>
          </div>
        </div>
      )}

      {/* Online Restored Toast */}
      {isOnline && showRestoredToast && (
        <div className="fixed top-4 right-4 z-[9999] bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center space-x-2 transition-all duration-300 animate-bounce">
          <Wifi className="w-5 h-5 text-emerald-200" />
          <span>Back online! Reconnected to the internet.</span>
        </div>
      )}
    </>
  );
}
