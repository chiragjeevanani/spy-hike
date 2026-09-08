import React, { useEffect, useState } from 'react';
import { Crown, Check, X, Mail, Calendar, MessageSquare, AlertCircle, Save } from 'lucide-react';
import promotionsApi from '../../../lib/promotionsApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PromotedBadge from '../../../components/PromotedBadge';
import { useToast } from '../../../components/ToastProvider';
import { AdminSkeletonCard } from './AdminSkeleton';

// Today (and today + N days) as yyyy-mm-dd, for the date-range inputs' defaults.
const isoDate = (d) => d.toISOString().split('T')[0];
const todayStr = () => isoDate(new Date());
const plusDays = (n) => isoDate(new Date(Date.now() + n * 86400000));

export default function PromotionRequestsView({ darkMode }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('Pending');
  const [approveTarget, setApproveTarget] = useState(null); // request being approved
  const [approveDates, setApproveDates] = useState({ startDate: '', endDate: '' });
  const [rejectTarget, setRejectTarget] = useState(null); // request being rejected
  const [rejectNote, setRejectNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const refresh = () => {
    setLoading(true);
    return promotionsApi.listAll()
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const pendingList = requests.filter((r) => r.status === 'Pending');
  const allList = requests;

  const openApprove = (request) => {
    setApproveTarget(request);
    setApproveDates({ startDate: todayStr(), endDate: plusDays(request.requestedDays || 30) });
    setActionError('');
  };

  const handleApprove = async () => {
    setActionError('');
    setSaving(true);
    try {
      await promotionsApi.review(approveTarget.id, { action: 'approve', ...approveDates });
      await refresh();
      setApproveTarget(null);
      toast.success(`${approveTarget.organizerName || 'Organizer'} is now promoted!`);
    } catch (err) {
      setActionError(err?.message || 'Could not approve this request.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setActionError('');
    try {
      await promotionsApi.review(rejectTarget.id, { action: 'reject', reviewNote: rejectNote });
      await refresh();
      setRejectTarget(null);
      setRejectNote('');
      toast.success('Promotion request rejected.');
    } catch (err) {
      setActionError(err?.message || 'Could not reject this request.');
    }
  };

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;
  const inputCls = `w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-amber-400/60' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-amber-400/60'
  }`;
  const labelCls = 'text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5';

  const statusBadge = (status) => (
    <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${
      status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600'
        : status === 'Rejected' ? 'bg-rose-500/10 text-rose-500'
        : 'bg-amber-500/10 text-amber-500'
    }`}>
      {status}
    </span>
  );

  const list = activeSubTab === 'Pending' ? pendingList : allList;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

      <div>
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Crown className="text-amber-500" size={22} /> Promotion Requests
        </h1>
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">
          Organizers asking to be boosted to the top of their trek's listings. Approve with a date range to promote them, or reject with a note.
        </p>
      </div>

      {/* Tab Segment Toggles */}
      <div className="flex gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveSubTab('Pending')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ${
            activeSubTab === 'Pending' ? 'text-[#F27D26]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>Pending ({pendingList.length})</span>
          {activeSubTab === 'Pending' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F27D26]" />}
        </button>
        <button
          onClick={() => setActiveSubTab('All')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all relative ml-6 ${
            activeSubTab === 'All' ? 'text-[#F27D26]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>All Requests ({allList.length})</span>
          {activeSubTab === 'All' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F27D26]" />}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminSkeletonCard darkMode={darkMode} />
          <AdminSkeletonCard darkMode={darkMode} />
        </div>
      ) : list.length === 0 ? (
        <div className={`${cardCls} text-center py-12 text-slate-400`}>
          {activeSubTab === 'Pending' ? 'No pending promotion requests.' : 'No promotion requests yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {list.map((r) => (
            <div key={r.id} id={`promo-request-${r.id}`} className={`${cardCls} space-y-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide leading-tight">{r.organizerName || 'Organizer'}</h3>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                    <Mail size={11} /> {r.organizerEmail}
                  </span>
                </div>
                {statusBadge(r.status)}
              </div>

              {r.message && (
                <p className="text-xs leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg text-slate-500 dark:text-slate-400 flex gap-2">
                  <MessageSquare size={13} className="text-amber-500 shrink-0 mt-0.5" /> {r.message}
                </p>
              )}

              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><Calendar size={11} /> Requested {r.requestedDays || 30} days</span>
              </div>

              {r.status === 'Approved' && r.promotedUntil && (
                <div className="flex items-center gap-2">
                  <PromotedBadge size="md" />
                  <span className="text-[10px] text-slate-400 font-semibold">until {new Date(r.promotedUntil).toLocaleDateString()}</span>
                </div>
              )}
              {r.status === 'Rejected' && r.reviewNote && (
                <p className="text-[10px] font-semibold text-rose-500">Reason: {r.reviewNote}</p>
              )}

              {r.status === 'Pending' && (
                <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => { setRejectTarget(r); setActionError(''); }}
                    className="flex items-center justify-center p-2 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    title="Reject Request"
                  >
                    <X size={15} />
                  </button>
                  <button
                    id={`promo-open-approve-${r.id}`}
                    onClick={() => openApprove(r)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <Crown size={14} />
                    <span>Approve & Promote</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve modal — pick the date range this organizer stays promoted for */}
      {approveTarget && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl relative animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button onClick={() => setApproveTarget(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={18} />
            </button>
            <h3 className="text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Crown size={14} className="text-amber-500" /> Promote {approveTarget.organizerName}
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mb-5">
              Their trips will be highlighted and shown first wherever organizers compete for the same trek.
            </p>

            {actionError && (
              <div className="flex gap-2 items-center p-2.5 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-500 mb-4">
                <AlertCircle size={13} className="shrink-0" /> {actionError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className={labelCls}>Promoted From</label>
                <input
                  type="date"
                  className={inputCls}
                  value={approveDates.startDate}
                  onChange={(e) => setApproveDates((d) => ({ ...d, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Promoted Until</label>
                <input
                  type="date"
                  className={inputCls}
                  min={approveDates.startDate}
                  value={approveDates.endDate}
                  onChange={(e) => setApproveDates((d) => ({ ...d, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setApproveTarget(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                  darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                id="promo-confirm-approve"
                onClick={handleApprove}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-60"
              >
                <Save size={13} /> {saving ? 'Promoting...' : 'Confirm & Promote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirm */}
      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject Promotion Request?"
        message={
          <div className="space-y-2">
            <p>{`${rejectTarget?.organizerName || 'This organizer'}'s promotion request will be rejected.`}</p>
            <input
              type="text"
              placeholder="Reason (optional, shown to the organizer)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            />
            {actionError && <div className="text-rose-500 text-xs font-bold">{actionError}</div>}
          </div>
        }
        confirmLabel="Reject"
        tone="danger"
        onConfirm={handleReject}
        onCancel={() => { setRejectTarget(null); setActionError(''); setRejectNote(''); }}
        darkMode={darkMode}
      />

    </div>
  );
}
