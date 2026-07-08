import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Mail, Phone, MessageCircle, ChevronDown, AlertCircle, LifeBuoy, Send, CheckCircle2, Clock
} from 'lucide-react';

const TICKETS_KEY = 'spyhike_org_support_tickets';

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
    a: 'Commission is a flat percentage (set by Spy Hike, visible on every booking\'s payout breakdown) deducted from the gross booking amount. Zero-commission loyalty rewards can offset this on individual bookings.',
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
  const [category, setCategory] = useState('Payouts & Commission');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState(loadTickets);
  const [openFaq, setOpenFaq] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newTicket = {
      id: `OTKT-${Math.floor(100 + Math.random() * 900)}`,
      title: title.trim(),
      category,
      status: 'Open',
      timestamp: new Date().toISOString().split('T')[0],
    };
    const updated = [newTicket, ...tickets];
    setTickets(updated);
    localStorage.setItem(TICKETS_KEY, JSON.stringify(updated));
    setTitle('');
    setMessage('');
  };

  const cardCls = darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm';
  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-zinc-50 border-zinc-200 text-zinc-800 focus:border-spy-orange/50'
  }`;
  const labelCls = `text-xs font-semibold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`;

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>

      <div className={`px-5 py-4 shrink-0 flex items-center gap-3 border-b ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
        <button id="btn-back-help-support" onClick={onBack} className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition ${darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-sm font-display font-black tracking-tight">Help & Support</h2>
          <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">PARTNER SUPPORT DESK</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 pb-10">

        {/* Quick contact */}
        <div className="grid grid-cols-3 gap-2.5">
          <a href="mailto:partners@spyhike.com" className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition active:scale-95 ${cardCls}`}>
            <Mail size={18} className="text-spy-orange" />
            <span className="text-[10px] font-semibold">Email</span>
          </a>
          <a href="tel:+911800123456" className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition active:scale-95 ${cardCls}`}>
            <Phone size={18} className="text-spy-orange" />
            <span className="text-[10px] font-semibold">Call</span>
          </a>
          <button
            type="button"
            onClick={() => alert('Connecting you to WhatsApp Partner Support...')}
            className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition active:scale-95 ${cardCls}`}
          >
            <MessageCircle size={18} className="text-spy-orange" />
            <span className="text-[10px] font-semibold">WhatsApp</span>
          </button>
        </div>

        {/* Raise a ticket */}
        <form onSubmit={handleSubmit} className={`p-4 rounded-2xl space-y-3.5 ${cardCls}`}>
          <h4 className="text-sm font-bold flex items-center gap-1.5">
            <LifeBuoy size={15} className="text-spy-orange" /> Raise a Support Ticket
          </h4>

          <div>
            <label className={labelCls}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              <option>Payouts & Commission</option>
              <option>Trip Listing Issue</option>
              <option>Booking / Cancellation</option>
              <option>Account / Verification</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Subject</label>
            <input
              type="text"
              required
              placeholder="e.g. Payout missing for SH-8821-K"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Details (optional)</label>
            <textarea
              rows={3}
              placeholder="Add any extra context that helps us resolve this faster..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-spy-orange hover:bg-[#d96d1a] text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Send size={14} /> Submit Ticket
          </button>
        </form>

        {/* Ticket history */}
        {tickets.length > 0 && (
          <div className="space-y-2">
            <span className={`text-xs font-bold uppercase tracking-widest pl-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Recent Tickets</span>
            <div className={`rounded-2xl overflow-hidden ${cardCls}`}>
              {tickets.map((t, i, arr) => (
                <div key={t.id} className={`px-4 py-3 flex items-center justify-between gap-2 ${i < arr.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.title}</p>
                    <p className={`text-[10px] mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{t.category} · {t.timestamp}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                    t.status === 'Open' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                  }`}>
                    {t.status === 'Open' ? <Clock size={9} /> : <CheckCircle2 size={9} />} {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        <div className="space-y-2">
          <span className={`text-xs font-bold uppercase tracking-widest pl-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Frequently Asked Questions</span>
          <div className={`rounded-2xl overflow-hidden ${cardCls}`}>
            {FAQS.map((item, i) => (
              <div key={item.q} className={i < FAQS.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-2 text-left"
                >
                  <span className="text-sm font-semibold">{item.q}</span>
                  <ChevronDown size={15} className={`shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''} ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
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
                      <p className={`px-4 pb-3.5 text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-3.5 rounded-xl flex gap-2.5 text-[11px] leading-relaxed ${darkMode ? 'bg-zinc-900/60 text-zinc-500' : 'bg-white text-zinc-400 shadow-xs'}`}>
          <AlertCircle size={14} className="text-spy-orange shrink-0 mt-0.5" />
          <span>Our partner support team typically responds within 24 hours. For urgent trek-day emergencies, use the Call option above.</span>
        </div>
      </div>
    </div>
  );
}
