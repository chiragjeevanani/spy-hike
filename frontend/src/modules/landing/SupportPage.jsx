import React, { useEffect, useState } from 'react';
import { Mail, Phone, Clock, MessageCircle, LogIn } from 'lucide-react';
import PublicPageLayout from './PublicPageLayout';
import contentApi from '../../lib/contentApi';
import { DEFAULT_SITE_CONTENT } from '../../utils/siteContent';

// Public, unauthenticated Support page — reachable at /support with no login
// required. Shows contact details + FAQs (admin-editable via Admin → Legal &
// Support). Ticket filing needs an account, so it stays inside the app at
// /app/profile/support — this page links there for signed-in visitors.
export default function SupportPage({ darkMode }) {
  const [content, setContent] = useState(DEFAULT_SITE_CONTENT.support);

  useEffect(() => {
    let cancelled = false;
    contentApi.getContent().then((c) => { if (!cancelled && c?.support) setContent(c.support); });
    return () => { cancelled = true; };
  }, []);

  const cardCls = `p-5 rounded-2xl border ${darkMode ? 'bg-elegant-card border-white/10' : 'bg-white border-zinc-100 shadow-sm'}`;

  return (
    <PublicPageLayout darkMode={darkMode} title={content.heading} subtitle={content.intro}>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {content.email && (
          <a href={`mailto:${content.email}`} className={`${cardCls} flex items-center gap-3 hover:border-forest-500/50 transition`}>
            <div className="w-10 h-10 rounded-full bg-forest-500/10 text-forest-600 dark:text-forest-400 flex items-center justify-center shrink-0"><Mail size={17} /></div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Email</span>
              <span className="text-sm font-semibold truncate block">{content.email}</span>
            </div>
          </a>
        )}
        {content.phone && (
          <a href={`tel:${content.phone}`} className={`${cardCls} flex items-center gap-3 hover:border-forest-500/50 transition`}>
            <div className="w-10 h-10 rounded-full bg-forest-500/10 text-forest-600 dark:text-forest-400 flex items-center justify-center shrink-0"><Phone size={17} /></div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Phone</span>
              <span className="text-sm font-semibold truncate block">{content.phone}</span>
            </div>
          </a>
        )}
        {content.whatsapp && (
          <a href={`https://wa.me/${content.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={`${cardCls} flex items-center gap-3 hover:border-forest-500/50 transition`}>
            <div className="w-10 h-10 rounded-full bg-forest-500/10 text-forest-600 dark:text-forest-400 flex items-center justify-center shrink-0"><MessageCircle size={17} /></div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">WhatsApp</span>
              <span className="text-sm font-semibold truncate block">{content.whatsapp}</span>
            </div>
          </a>
        )}
        {content.hours && (
          <div className={`${cardCls} flex items-center gap-3`}>
            <div className="w-10 h-10 rounded-full bg-forest-500/10 text-forest-600 dark:text-forest-400 flex items-center justify-center shrink-0"><Clock size={17} /></div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Hours</span>
              <span className="text-sm font-semibold truncate block">{content.hours}</span>
            </div>
          </div>
        )}
      </div>

      <a
        href="/app/profile/support"
        className="flex items-center justify-center gap-2 w-full sm:w-auto sm:inline-flex px-6 py-3.5 mb-12 rounded-full bg-forest-600 hover:bg-forest-700 text-white text-sm font-bold uppercase tracking-wide transition"
      >
        <LogIn size={15} /> Log in to raise a support ticket
      </a>

      {content.faqs?.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg mb-4">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {content.faqs.map((f, i) => (
              <div key={i}>
                <p className="text-sm font-bold mb-1">{f.q}</p>
                <p className={`text-sm leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PublicPageLayout>
  );
}
