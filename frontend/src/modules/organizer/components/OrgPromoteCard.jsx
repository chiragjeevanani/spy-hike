import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, Clock, CheckCircle2, XCircle } from 'lucide-react';
import promotionsApi from '../../../lib/promotionsApi';
import { useToast } from '../../../components/ToastProvider';

// "Promote Yourself" — an organizer's self-serve pitch to the admin: get
// boosted to the top of every trek's organizer list, with a highlighted gold
// card, for a while. Mirrors the gold treatment PromotedBadge/the trip cards
// use elsewhere, so this card doubles as a preview of what promotion looks
// like.
export default function OrgPromoteCard({ organizer, darkMode }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const refresh = () => {
    setLoading(true);
    return promotionsApi.listMine()
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const isPromoted = !!organizer?.isPromoted;
  const latest = requests[0] || null; // newest first, from the API
  const isPending = !isPromoted && latest?.status === 'Pending';

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await promotionsApi.create({ message: message.trim() });
      setMessage('');
      toast.success('Promotion request sent to the admin!');
      await refresh();
    } catch (err) {
      const msg = err?.message || 'Could not send your request.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const cardCls = `w-full p-5 sm:p-6 rounded-3xl border relative overflow-hidden ${
    darkMode
      ? 'bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950 border-amber-500/25'
      : 'bg-gradient-to-br from-amber-50 via-white to-amber-50/50 border-amber-300/60 shadow-xs'
  }`;
  const iconWrapCls = 'w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shrink-0 shadow-md shadow-amber-500/20';

  if (loading) {
    return (
      <div className={`${cardCls} h-40 animate-pulse`} />
    );
  }

  return (
    <div className={cardCls} id="org-promote-yourself">
      <div className="flex items-start gap-4">
        <div className={iconWrapCls}>
          <Crown size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm sm:text-base font-bold block">Promote Yourself</span>
          <span className={`text-xs block mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {isPromoted
              ? "You're boosted — your trips lead every trek's organizer list right now."
              : "Ask the admin to boost your trips to the top of every trek's organizer list for a while."}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {isPromoted ? (
          <div className={`flex items-center gap-2.5 p-3.5 rounded-2xl border ${
            darkMode ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-100/60 border-amber-300/60'
          }`}>
            <CheckCircle2 size={16} className="text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Promoted{organizer?.promotedUntil ? ` until ${new Date(organizer.promotedUntil).toLocaleDateString()}` : ''}
            </span>
          </div>
        ) : isPending ? (
          <div className={`flex items-center gap-2.5 p-3.5 rounded-2xl border ${
            darkMode ? 'bg-zinc-800/60 border-white/10' : 'bg-zinc-100/70 border-zinc-200'
          }`}>
            <Clock size={16} className="text-amber-500 shrink-0 animate-pulse" />
            <span className={`text-xs font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Request sent — waiting on admin review.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {latest?.status === 'Rejected' && (
              <div className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs font-semibold ${
                darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}>
                <XCircle size={15} className="shrink-0 mt-0.5" />
                <span>Your last request was declined{latest.reviewNote ? `: ${latest.reviewNote}` : '.'} You can ask again below.</span>
              </div>
            )}
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the admin why you'd make a great promoted partner (optional)..."
              className={`w-full px-4 py-3 rounded-2xl text-xs border outline-none transition resize-none ${
                darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30 focus:border-amber-400/50' : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-amber-400/50'
              }`}
            />
            {error && <p className="text-[11px] font-semibold text-rose-500">{error}</p>}
            <button
              type="button"
              id="btn-request-promotion"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <Sparkles size={16} /> {submitting ? 'Sending...' : 'Request Promotion'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
