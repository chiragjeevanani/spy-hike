import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Compass, ChevronDown, FileText, ShieldCheck, HandHeart, Globe, Mail, Instagram, Twitter } from 'lucide-react';
import AppLogo from '../../../components/AppLogo';

const LEGAL_SECTIONS = [
  {
    icon: FileText,
    title: 'Terms of Service',
    body: 'By listing treks on Find Your Trek, organizers agree to maintain accurate trip information, honor published pricing and cancellation policies, and hold valid guiding/operating licenses for every region they operate in.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy Policy',
    body: 'Traveller contact details shared for an upcoming booking may only be used to coordinate that trek. Find Your Trek encrypts all verification documents and never shares them with third parties without consent.',
  },
  {
    icon: HandHeart,
    title: 'Partner Agreement',
    body: 'Find Your Trek charges a platform commission per completed booking (visible on every payout breakdown) in exchange for traveller discovery, secure payments, and dispute resolution support.',
  },
];

export default function OrgAboutView({ onBack, darkMode }) {
  const [openSection, setOpenSection] = useState(null);
  const cardCls = darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm';

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>

      <div className={`px-5 py-4 shrink-0 flex items-center gap-3 border-b ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
        <button id="btn-back-about" onClick={onBack} className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition ${darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}>
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-display font-black tracking-tight">About</h2>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 pb-10">

        {/* Brand block */}
        <div className="flex flex-col items-center text-center pt-4 pb-2">
          <AppLogo size={56} className="text-spy-orange" />
          <h1 className="text-2xl font-display font-black tracking-tight mt-4">Find Your Trek</h1>
          <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Organizer Partner Panel</p>
          <span className={`text-[10px] font-mono mt-2 px-2.5 py-1 rounded-full ${darkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>
            v2.4.0
          </span>
        </div>

        {/* Description */}
        <div className={`p-4 rounded-2xl ${cardCls}`}>
          <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Find Your Trek connects certified trek operators with adventure travellers across India's Himalayan and Western Ghats trails.
            The Organizer Panel is your control center for listing treks, managing bookings, tracking payouts, and growing your outdoor business —
            built to be as reliable as the mountains you guide people through.
          </p>
        </div>

        {/* Legal / policy sections */}
        <div className="space-y-2">
          <span className={`text-xs font-bold uppercase tracking-widest pl-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Legal</span>
          <div className={`rounded-2xl overflow-hidden ${cardCls}`}>
            {LEGAL_SECTIONS.map((section, i) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className={i < LEGAL_SECTIONS.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(openSection === i ? null : i)}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={15} className="text-spy-orange shrink-0" />
                      <span className="text-sm font-semibold">{section.title}</span>
                    </span>
                    <ChevronDown size={15} className={`shrink-0 transition-transform ${openSection === i ? 'rotate-180' : ''} ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  </button>
                  <AnimatePresence>
                    {openSection === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className={`px-4 pb-3.5 pl-11 text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{section.body}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connect */}
        <div className="space-y-2">
          <span className={`text-xs font-bold uppercase tracking-widest pl-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Connect With Us</span>
          <div className="grid grid-cols-3 gap-2.5">
            <a href="https://findyourtrek.com" className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition active:scale-95 ${cardCls}`}>
              <Globe size={17} className="text-spy-orange" />
              <span className="text-[10px] font-semibold">Website</span>
            </a>
            <a href="mailto:partners@findyourtrek.com" className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition active:scale-95 ${cardCls}`}>
              <Mail size={17} className="text-spy-orange" />
              <span className="text-[10px] font-semibold">Email</span>
            </a>
            <a href="https://instagram.com" className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition active:scale-95 ${cardCls}`}>
              <Instagram size={17} className="text-spy-orange" />
              <span className="text-[10px] font-semibold">Instagram</span>
            </a>
          </div>
        </div>

        <p className={`text-center text-[11px] pt-3 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Made with ❤️ for mountain explorers everywhere.<br />© 2026 Find Your Trek. All rights reserved.
        </p>
      </div>
    </div>
  );
}
