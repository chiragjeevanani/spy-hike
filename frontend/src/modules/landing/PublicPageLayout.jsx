import React from 'react';
import { ArrowLeft } from 'lucide-react';
import AppLogo from '../../components/AppLogo';

// Goes to wherever the visitor actually came from (in-app or an external
// referrer) instead of hard-coding a destination. Falls back to Home only
// when there's genuinely nothing to go back to (e.g. this tab's very first
// page load — a direct link or typed URL with no history).
const goBack = () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = '/';
  }
};

// Shared chrome for standalone public pages (Privacy Policy, Support) that
// live outside /app — reachable and fully readable with zero login, unlike
// everything else in the traveller app. Visually mirrors LandingView's
// header/footer without pulling in its animated nav (single anchor page, no
// section links to underline).
//
// `html, body, #root` are globally `overflow: hidden` (index.css) so the
// phone-frame app can manage its own internal scroll — these standalone
// pages aren't phone-framed, so (like LandingView) they need their own
// `h-screen overflow-y-auto` scroll container, not `min-h-screen`.
export default function PublicPageLayout({ darkMode, title, subtitle, children }) {
  return (
    <div className={`h-screen w-full overflow-y-auto overflow-x-hidden font-sans transition-colors duration-300 ${
      darkMode ? 'bg-elegant-bg text-elegant-text' : 'bg-[#FAF8F2] text-zinc-800'
    }`}>
      <header className={`sticky top-0 w-full z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        darkMode ? 'bg-elegant-bg/75 border-elegant-border/80' : 'bg-[#F6F1E5]/75 border-zinc-200/50'
      }`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0 shrink">
            <AppLogo size={28} className="text-forest-600 dark:text-elegant-green shrink-0" />
            <span className="font-display font-bold text-base sm:text-xl tracking-tight bg-gradient-to-r from-forest-700 via-forest-500 to-spy-orange dark:from-white dark:to-elegant-text bg-clip-text text-transparent truncate">
              Find Your Trek
            </span>
          </a>
          <button
            type="button"
            onClick={goBack}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-3 sm:px-4 py-2 rounded-full border transition shrink-0 cursor-pointer active:scale-95 ${
              darkMode ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'border-zinc-200 text-zinc-600 hover:bg-white'
            }`}
          >
            <ArrowLeft size={14} className="shrink-0" /> <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <h1 className="font-display font-black text-2xl sm:text-4xl tracking-tight mb-2 break-words">{title}</h1>
        {subtitle && <p className={`text-sm mb-8 sm:mb-10 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{subtitle}</p>}
        {!subtitle && <div className="mb-8 sm:mb-10" />}
        {children}
      </main>

      <footer className={`w-full border-t py-8 sm:py-10 transition-colors duration-300 ${
        darkMode ? 'border-elegant-border bg-elegant-bg' : 'border-zinc-200 bg-[#F6F1E5]'
      }`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] text-zinc-400 text-center">© 2026 Find Your Trek. All rights reserved.</span>
          <div className="flex gap-6 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            <a href="/privacy-policy" className="hover:text-spy-orange">Privacy Policy</a>
            <a href="/support" className="hover:text-spy-orange">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
