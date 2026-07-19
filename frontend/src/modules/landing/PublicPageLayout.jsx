import React from 'react';
import { ArrowLeft } from 'lucide-react';
import AppLogo from '../../components/AppLogo';

// Shared chrome for standalone public pages (Privacy Policy, Support) that
// live outside /app — reachable and fully readable with zero login, unlike
// everything else in the traveller app. Visually mirrors LandingView's
// header/footer without pulling in its animated nav (single anchor page, no
// section links to underline).
export default function PublicPageLayout({ darkMode, title, subtitle, children }) {
  return (
    <div className={`min-h-screen w-full font-sans transition-colors duration-300 ${
      darkMode ? 'bg-elegant-bg text-elegant-text' : 'bg-[#FAF8F2] text-zinc-800'
    }`}>
      <header className={`sticky top-0 w-full z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        darkMode ? 'bg-elegant-bg/75 border-elegant-border/80' : 'bg-[#F6F1E5]/75 border-zinc-200/50'
      }`}>
        <div className="max-w-3xl mx-auto px-5 sm:px-6 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 cursor-pointer group">
            <AppLogo size={30} className="text-forest-600 dark:text-elegant-green" />
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-forest-700 via-forest-500 to-spy-orange dark:from-white dark:to-elegant-text bg-clip-text text-transparent">
              Find Your Trek
            </span>
          </a>
          <a
            href="/"
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full border transition ${
              darkMode ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'border-zinc-200 text-zinc-600 hover:bg-white'
            }`}
          >
            <ArrowLeft size={14} /> Back to Home
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-14">
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight mb-2">{title}</h1>
        {subtitle && <p className={`text-sm mb-10 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{subtitle}</p>}
        {!subtitle && <div className="mb-10" />}
        {children}
      </main>

      <footer className={`w-full border-t py-10 transition-colors duration-300 ${
        darkMode ? 'border-elegant-border bg-elegant-bg' : 'border-zinc-200 bg-[#F6F1E5]'
      }`}>
        <div className="max-w-3xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] text-zinc-400">© 2026 Find Your Trek. All rights reserved.</span>
          <div className="flex gap-6 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            <a href="/privacy-policy" className="hover:text-spy-orange">Privacy Policy</a>
            <a href="/support" className="hover:text-spy-orange">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
