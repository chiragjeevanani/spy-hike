/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export default function PhoneFrame({ children, darkMode, onToggleDarkMode }) {
  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center transition-colors duration-300 p-0 relative overflow-hidden ${darkMode ? 'bg-elegant-bg text-elegant-text' : 'bg-gray-100/60 text-zinc-800'}`}>
      
      {/* Elegant Dark Background Ambient Blurs */}
      {darkMode && (
         <>
          <div className="absolute top-[-100px] right-[-100px] w-[450px] h-[450px] bg-[#163321] rounded-full blur-[130px] opacity-40 pointer-events-none"></div>
          <div className="absolute bottom-[-50px] left-[-50px] w-[350px] h-[350px] bg-[#F27D26] rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        </>
      )}

      <div 
        id="spyhike-app-viewport"
        className={`relative w-full h-screen md:max-w-[400px] md:shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          darkMode 
            ? 'bg-elegant-app text-white shadow-[#050807]/90' 
            : 'bg-[#FAF8F2] text-zinc-800 shadow-zinc-200/40'
        }`}
      >
        {/* App Content viewport */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
          {children}
        </div>
      </div>
    </div>
  );
}
