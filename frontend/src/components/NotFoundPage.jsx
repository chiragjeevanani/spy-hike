import React from 'react';
import { Home, Compass, Trees, Footprints, AlertTriangle } from 'lucide-react';

export default function NotFoundPage({ onGoHome, homePath, homeLabel = 'Return to Base Camp (Home)', darkMode }) {
  const handleHomeClick = () => {
    if (onGoHome) {
      onGoHome();
    } else if (homePath) {
      window.location.href = homePath;
    } else {
      window.location.href = '/app';
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans ${
      darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-900 text-slate-100'
    }`}>
      
      {/* Background Animated Night Forest Sky */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Moon */}
        <div className="absolute top-12 right-12 w-24 h-24 rounded-full bg-amber-100/20 blur-md animate-pulse-subtle"></div>
        <div className="absolute top-14 right-14 w-20 h-20 rounded-full bg-amber-50/90 shadow-[0_0_40px_rgba(251,191,36,0.5)]"></div>

        {/* Twinkling stars */}
        <div className="absolute top-1/6 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-75"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-amber-200 rounded-full animate-pulse"></div>
        <div className="absolute top-12 left-1/2 w-2 h-2 bg-emerald-200 rounded-full animate-ping"></div>

        {/* Fog / Mist Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-emerald-950/40 via-zinc-900/60 to-transparent blur-xl"></div>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 max-w-md w-full text-center flex flex-col items-center">
        
        {/* Animated Lost Hiker & Dark Forest Graphic */}
        <div className="relative w-full h-52 mb-6 flex items-center justify-center">
          
          {/* Forest Pines silhouettes */}
          <div className="absolute bottom-2 inset-x-0 flex justify-between items-end opacity-40 px-4 text-emerald-900 dark:text-emerald-950">
            <Trees size={64} />
            <Trees size={88} className="-mx-4 z-0" />
            <Trees size={72} />
            <Trees size={96} className="-mx-4" />
            <Trees size={60} />
          </div>

          {/* Flashlight Beam from lost hiker */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 h-36 bg-gradient-to-t from-amber-300/25 via-amber-200/10 to-transparent clip-triangle blur-sm transform -rotate-12 animate-pulse-subtle"></div>

          {/* Lost Hiker Silhouette */}
          <div className="relative z-10 flex flex-col items-center animate-bounce duration-1000">
            <div className="w-8 h-8 rounded-full bg-amber-400/90 shadow-[0_0_15px_rgba(251,191,36,0.8)] flex items-center justify-center">
              <Compass className="w-5 h-5 text-zinc-950 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div className="w-10 h-14 bg-zinc-800 rounded-t-xl mt-1 relative flex justify-center">
              <div className="w-12 h-6 bg-emerald-700/80 rounded-lg absolute -top-1 -left-1 shadow-md"></div>
              <Footprints className="w-5 h-5 text-amber-400 absolute bottom-1 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center space-x-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>404 — Off The Marked Trail</span>
        </div>

        {/* Heading & Nature Quote */}
        <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white mb-3">
          Looks Like You're Lost in the Dark Forest! 🌲
        </h1>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 mb-6 shadow-xl backdrop-blur-md">
          <p className="text-sm italic text-zinc-300 leading-relaxed font-serif">
            "The trail you are looking for does not exist in these woods. Step back before night falls complete—return to base camp."
          </p>
          <span className="block text-right text-xs font-semibold text-emerald-400 mt-2">
            — FYT Mountain Guide
          </span>
        </div>

        {/* Home Button */}
        <button
          onClick={handleHomeClick}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-2.5 transform active:scale-95 transition-all cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>{homeLabel}</span>
        </button>

      </div>
    </div>
  );
}
