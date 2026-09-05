import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ChevronDown, FileText, ShieldCheck, HandHeart, Globe, Mail, Instagram,
  Compass, Award, Sparkles, CheckCircle2
} from 'lucide-react';
import AppLogo from '../../../components/AppLogo';

const LEGAL_SECTIONS = [
  {
    icon: FileText,
    title: 'Terms of Service & Operator Guidelines',
    body: 'By listing treks on Find Your Trek, organizers agree to maintain accurate trip itineraries, honor published pricing and cancellation policies, and hold valid guiding/operating licenses for every region they operate in. All listed departures must adhere to state mountaineering and eco-tourism regulations.',
  },
  {
    icon: ShieldCheck,
    title: 'Data Privacy & Hiker Protection',
    body: 'Traveller contact details and emergency contact records shared for an upcoming booking may strictly be used to coordinate that specific trek. Find Your Trek encrypts all verification documents and ID scans end-to-end and never shares them with third parties without express operator consent.',
  },
  {
    icon: HandHeart,
    title: 'Partner Commercial Agreement',
    body: 'Find Your Trek charges a transparent platform fee per completed booking (itemized clearly on every payout invoice) in exchange for traveller acquisition, instant payment processing, automated waiver collection, and dedicated round-the-clock dispute resolution assistance.',
  },
  {
    icon: Award,
    title: 'Safety, Leave-No-Trace & Eco Standards',
    body: 'All expedition leaders affiliated with Find Your Trek must enforce Leave No Trace (LNT) principles, maintain calibrated high-altitude first aid kits, carry satellite/radio communications where cellular signal is unavailable, and provide certified guides trained in wilderness first aid.',
  },
];

export default function OrgAboutView({ onBack, darkMode }) {
  const [openSection, setOpenSection] = useState(null);
  const cardCls = darkMode ? 'bg-zinc-900/80 border border-white/10 shadow-xs' : 'bg-white border border-zinc-200/80 shadow-xs';

  return (
    <div className={`h-full flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">

        {/* Back Navigation Bar */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-white/5">
          <button
            id="btn-back-about"
            onClick={onBack}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition cursor-pointer border ${
              darkMode ? 'bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs'
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight">About Find Your Trek</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-spy-orange/15 text-spy-orange border border-spy-orange/20">
                Partner Portal
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Platform overview, legal policies, safety commitments, and operator guidelines.
            </p>
          </div>
        </div>

        {/* Hero Brand Card */}
        <div className={`p-6 sm:p-8 rounded-3xl ${cardCls} relative overflow-hidden`}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-spy-orange/10 border border-spy-orange/20 flex items-center justify-center shrink-0 shadow-lg shadow-spy-orange/10">
              <AppLogo size={56} className="text-spy-orange" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight">Find Your Trek</h2>
                <span className={`text-[11px] font-mono px-3 py-1 rounded-full font-bold ${
                  darkMode ? 'bg-zinc-800 text-zinc-300 border border-white/10' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}>
                  v2.4.0 (Partner Edition)
                </span>
              </div>

              <p className={`text-sm leading-relaxed max-w-2xl ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Find Your Trek connects certified trek operators with adventure travellers across India's Himalayan, Sahyadri, and Western Ghats trails.
                The Organizer Partner Portal is your mission control for publishing expeditions, managing climber rosters, tracking payouts, and scaling your mountain guiding enterprise.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { title: 'Verified Operators', desc: '100% licensed mountain guides' },
                  { title: 'Transparent Payouts', desc: 'Automated direct-to-bank settlements' },
                  { title: 'Expedition Safety', desc: 'Real-time SOS & hiker rosters' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl flex items-center gap-2.5 ${
                      darkMode ? 'bg-zinc-950/60 border border-white/5' : 'bg-zinc-50 border border-zinc-200/60'
                    }`}
                  >
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold">{item.title}</p>
                      <p className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legal / Policy Sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Legal & Operating Standards
            </span>
            <span className={`text-[11px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Click to view terms
            </span>
          </div>

          <div className={`rounded-3xl overflow-hidden divide-y ${
            darkMode ? 'divide-white/10 ' + cardCls : 'divide-zinc-100 ' + cardCls
          }`}>
            {LEGAL_SECTIONS.map((section, i) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setOpenSection(openSection === i ? null : i)}
                    className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <span className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-spy-orange/15 text-spy-orange shrink-0">
                        <Icon size={18} />
                      </div>
                      <span className="text-sm font-bold truncate">{section.title}</span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 transition-transform duration-200 ${openSection === i ? 'rotate-180 text-spy-orange' : darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}
                    />
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
                        <div className={`px-5 sm:px-6 pb-5 pt-1 pl-16 text-xs sm:text-sm leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {section.body}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connect With Us */}
        <div className="space-y-3">
          <span className={`text-xs font-bold uppercase tracking-widest pl-1 block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Connect With Find Your Trek
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <a
              href="https://findyourtrek.com"
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl transition hover:shadow-md active:scale-95 cursor-pointer group ${cardCls}`}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-spy-orange/15 text-spy-orange group-hover:scale-110 transition-transform shrink-0">
                <Globe size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold block truncate">Official Website</span>
                <span className={`text-xs block truncate ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>findyourtrek.com</span>
              </div>
            </a>

            <a
              href="mailto:partners@findyourtrek.com"
              className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl transition hover:shadow-md active:scale-95 cursor-pointer group ${cardCls}`}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-blue-500/15 text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                <Mail size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold block truncate">Partner Relations</span>
                <span className={`text-xs block truncate ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>partners@findyourtrek.com</span>
              </div>
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl transition hover:shadow-md active:scale-95 cursor-pointer group ${cardCls}`}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-rose-500/15 text-rose-400 group-hover:scale-110 transition-transform shrink-0">
                <Instagram size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold block truncate">Instagram Community</span>
                <span className={`text-xs block truncate ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>@findyourtrek</span>
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className={`text-center text-xs py-6 border-t ${darkMode ? 'border-white/5 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}>
          <p className="font-medium">Made with ❤️ for mountain explorers & expedition leaders everywhere.</p>
          <p className="mt-1">© 2026 Find Your Trek Technologies Pvt. Ltd. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}
