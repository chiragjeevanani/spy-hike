import React from 'react';

export default function PhoneFrame({ children, darkMode, onToggleDarkMode }) {
  return (
    <div
      id="findyourtrek-app-root"
      className={`min-h-screen w-full flex flex-col transition-colors duration-300 relative overflow-x-hidden ${
        darkMode ? 'bg-elegant-bg text-elegant-text' : 'bg-[#FAF8F2] text-zinc-900'
      }`}
    >
      {/* Ambient background glows for rich aesthetic */}
      {darkMode && (
        <>
          <div className="fixed top-[-150px] right-[-100px] w-[600px] h-[600px] bg-[#163321] rounded-full blur-[160px] opacity-35 pointer-events-none z-0"></div>
          <div className="fixed bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#F27D26] rounded-full blur-[180px] opacity-15 pointer-events-none z-0"></div>
        </>
      )}

      {/* Main Responsive App Viewport Container */}
      <div
        id="findyourtrek-app-viewport"
        className={`relative w-full flex-1 flex flex-col transition-all duration-300 z-10 ${
          darkMode ? 'bg-elegant-app text-white' : 'bg-transparent text-zinc-900'
        }`}
      >
        <div className="flex-1 flex flex-col relative w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
