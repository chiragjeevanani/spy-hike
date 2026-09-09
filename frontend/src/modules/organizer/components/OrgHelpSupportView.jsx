import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Mail, Phone, MessageCircle, ChevronDown, AlertCircle, LifeBuoy, Send, CheckCircle2, Clock
} from 'lucide-react';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';
import { useScrollToTopOnMount } from '../../../utils/scroll';

const TICKETS_KEY = 'trekigo_org_support_tickets';

const loadTickets = () => {
  try {
    const val = localStorage.getItem(TICKETS_KEY);
    if (val) return JSON.parse(val);
  } catch (e) {}
  return [
    { id: 'OTKT-501', title: 'Payout delayed for December batch', category: 'Payouts & Commission', status: 'Resolved', timestamp: '2026-06-18' },
  ];
};

const FAQS = [
  {
    q: 'When do I receive my payout for a completed trek?',
    a: 'Payouts settle automatically 3-5 business days after a trek\'s departure date, once the booking is marked Completed, straight to your registered bank account.',
  },
  {
    q: 'How is the platform commission calculated?',
    a: 'Commission is a flat percentage (set by Find Your Trek, visible on every booking\'s payout breakdown) deducted from the gross booking amount. Zero-commission loyalty rewards can offset this on individual bookings.',
  },
  {
    q: 'Can I edit a trip after it has active bookings?',
    a: 'Yes — itinerary, inclusions, and safety details can be edited anytime. Price and seat-count changes only apply to new bookings; existing hikers keep their original terms.',
  },
  {
    q: 'How do I pause or unpublish a listed trek?',
    a: 'Open the trek from My Trips and toggle its status to Paused. Paused treks stay in your dashboard but disappear from traveller search until republished.',
  },
  {
    q: 'What documents are needed for verification?',
    a: 'A government ID (Aadhaar, PAN, GST, or Passport) plus a clear photo/scan uploaded during registration. Re-verification is only needed if your ID type changes.',
  },
];

export default function OrgHelpSupportView({ organizer, onBack, darkMode }) {
  // This view is swapped in via the profile page's own local state, not the
  // router — see utils/scroll.js for why that needs its own reset.
  useScrollToTopOnMount();
  const [category, setCategory] = useState('Payouts & Commission');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState(loadTickets);
  const [openFaq, setOpenFaq] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const toast = useToast();
  const fieldRefs = useRef({});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      const errors = { title: 'Subject is required.' };
      setFieldErrors(errors);
      toast.error(errors.title);
      scrollToFirstError(fieldRefs.current, errors, ['title']);
      return;
    }
    setFieldErrors({});

    const newTicket = {
      id: `OTKT-${Math.floor(100 + Math.random() * 900)}`,
      title: title.trim(),
      category,
      status: 'Open',
      timestamp: new Date().toISOString().split('T')[0],
      message: message.trim(),
    };

    const next = [newTicket, ...tickets];
    setTickets(next);
    try {
      localStorage.setItem(TICKETS_KEY, JSON.stringify(next));
    } catch (err) {}

    setTitle('');
    setMessage('');
    toast.success('Support ticket submitted! Ticket ID: ' + newTicket.id);
  };

  const cardCls = darkMode ? 'bg-zinc-900/80 border border-white/10 shadow-xs' : 'bg-white border border-zinc-200/80 shadow-xs';
  const inputCls = `w-full px-4 py-3 rounded-2xl text-xs sm:text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-zinc-50 border-zinc-200 text-zinc-800 focus:border-spy-orange/50'
  }`;
  const labelCls = `text-xs font-bold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`;

  return (
    <div className={`h-full flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">

        {/* Back Navigation Bar */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-white/5">
          <button
            id="btn-back-help-support"
            onClick={onBack}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition cursor-pointer border ${
              darkMode ? 'bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs'
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            {/* flex-wrap + shrink-0/whitespace-nowrap on the badge: on a
                narrow phone the title alone wraps to 2 lines, and without
                these the badge used to get squeezed for space alongside it
                and wrap its own text into a broken 2-line pill. Now it just
                drops to its own line under the title instead. */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1.5">
              <h1 className="text-lg sm:text-2xl font-display font-black tracking-tight">Help & Partner Support</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-spy-orange/15 text-spy-orange border border-spy-orange/20 shrink-0 whitespace-nowrap">
                Support Desk
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Assistance for operator payouts, trip listings, hiker verification, and disputes.
            </p>
          </div>
        </div>

        {/* Quick Contact Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <a
            href="mailto:partners@findyourtrek.com"
            className={`flex flex-col items-center justify-center text-center p-5 rounded-3xl transition hover:shadow-md active:scale-95 cursor-pointer group ${cardCls}`}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-spy-orange/15 text-spy-orange mb-2.5 group-hover:scale-110 transition-transform">
              <Mail size={22} />
            </div>
            <span className="text-sm font-bold block">Email Partner Desk</span>
            <span className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>partners@findyourtrek.com</span>
          </a>

          <a
            href="tel:+911800123456"
            className={`flex flex-col items-center justify-center text-center p-5 rounded-3xl transition hover:shadow-md active:scale-95 cursor-pointer group ${cardCls}`}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/15 text-emerald-400 mb-2.5 group-hover:scale-110 transition-transform">
              <Phone size={22} />
            </div>
            <span className="text-sm font-bold block">Call Expeditions Line</span>
            <span className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>+91 1800 123 456 (24/7)</span>
          </a>

          <button
            type="button"
            onClick={() => toast.success('Connecting you to WhatsApp Partner Support...')}
            className={`flex flex-col items-center justify-center text-center p-5 rounded-3xl transition hover:shadow-md active:scale-95 cursor-pointer group ${cardCls}`}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-green-500/15 text-green-400 mb-2.5 group-hover:scale-110 transition-transform">
              <MessageCircle size={22} />
            </div>
            <span className="text-sm font-bold block">WhatsApp Support</span>
            <span className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Instant operator messaging</span>
          </button>
        </div>

        {/* Raise a Support Ticket Card */}
        <form onSubmit={handleSubmit} noValidate className={`p-6 sm:p-7 rounded-3xl space-y-4 ${cardCls}`}>
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <LifeBuoy size={18} className="text-spy-orange" />
            <h3 className="font-display font-black text-base tracking-tight">Raise a Support Ticket</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Inquiry Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                <option>Payouts & Commission</option>
                <option>Trip Listing Issue</option>
                <option>Booking / Cancellation</option>
                <option>Account / Verification</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Subject *</label>
              <input
                ref={el => { fieldRefs.current.title = { current: el }; }}
                type="text"
                placeholder="e.g. Payout missing for batch TG-8821-K"
                value={title}
                onChange={e => { setTitle(e.target.value); setFieldErrors(er => ({ ...er, title: '' })); }}
                className={`${inputCls} ${fieldErrors.title ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {fieldErrors.title && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.title}</p>}
            </div>
          </div>

          <div>
            <label className={labelCls}>Details & Additional Context (optional)</label>
            <textarea
              rows={4}
              placeholder="Add any booking IDs, date stamps, or information that will help our partner desk resolve this promptly..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-spy-orange hover:bg-[#d96d1a] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-spy-orange/20 transition cursor-pointer"
            >
              <Send size={15} /> Submit Partner Ticket
            </button>
          </div>
        </form>

        {/* Ticket History */}
        {tickets.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display font-black text-sm uppercase tracking-wider opacity-70">
              Recent Partner Tickets ({tickets.length})
            </h3>
            <div className={`rounded-3xl overflow-hidden ${cardCls}`}>
              {tickets.map((t, i, arr) => (
                <div key={t.id} className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${i < arr.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold opacity-60">{t.id}</span>
                      <p className="text-sm font-bold truncate">{t.title}</p>
                    </div>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{t.category} · Submitted {t.timestamp}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 flex items-center gap-1.5 ${
                    t.status === 'Open' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/25' : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
                  }`}>
                    {t.status === 'Open' ? <Clock size={11} /> : <CheckCircle2 size={11} />} {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Frequently Asked Questions */}
        <div className="space-y-3">
          <h3 className="font-display font-black text-sm uppercase tracking-wider opacity-70">
            Frequently Asked Questions
          </h3>
          <div className={`rounded-3xl overflow-hidden ${cardCls}`}>
            {FAQS.map((item, i) => (
              <div key={item.q} className={i < FAQS.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <span className="text-sm font-bold">{item.q}</span>
                  <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180 text-spy-orange' : 'opacity-40'}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className={`px-5 pb-5 text-xs sm:text-sm leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Support SLA notice */}
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs leading-relaxed border ${
          darkMode ? 'bg-zinc-900/60 border-white/5 text-zinc-400' : 'bg-white border-zinc-200/80 text-zinc-600 shadow-xs'
        }`}>
          <AlertCircle size={16} className="text-spy-orange shrink-0" />
          <span>Our partner support team typically responds within 24 hours. For critical same-day trek departures or emergencies, please use the direct telephone hotline above.</span>
        </div>

      </div>
    </div>
  );
}
