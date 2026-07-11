import React, { useEffect, useState } from 'react';
import {
  Banknote, Search, CheckCircle2, XCircle, Clock, Download, FileSpreadsheet,
  IndianRupee, Landmark, Smartphone, X, AlertTriangle, Hash, ArrowDownLeft,
} from 'lucide-react';
import bookingsApi from '../../../lib/bookingsApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { downloadPayoutReceiptPDF } from '../utils/payoutReceiptPdf';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const STATUS_META = {
  Processing: { cls: 'bg-amber-500/10 text-amber-600', icon: Clock, label: 'Processing' },
  Paid: { cls: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2, label: 'Paid' },
  Rejected: { cls: 'bg-rose-500/10 text-rose-600', icon: XCircle, label: 'Rejected' },
};

export default function PayoutsView({ darkMode }) {
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState({ pendingAmount: 0, paidAmount: 0, rejectedAmount: 0, pendingCount: 0, paidCount: 0, rejectedCount: 0, totalCount: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    const params = {};
    if (statusFilter !== 'All') params.status = statusFilter;
    if (search.trim()) params.search = search.trim();
    return bookingsApi.adminListPayouts(params)
      .then((r) => { setPayouts(r.payouts || []); if (r.summary) setSummary(r.summary); })
      .catch(() => setPayouts([]));
  };

  useEffect(() => { refresh(); }, [statusFilter]);
  // Debounce search.
  useEffect(() => { const t = setTimeout(refresh, 300); return () => clearTimeout(t); }, [search]);

  const handleApprove = async () => {
    setBusy(true);
    try {
      await bookingsApi.adminSettlePayout(approveTarget.id, 'approve');
      setApproveTarget(null);
      await refresh();
    } catch (err) { alert(err?.message || 'Could not approve payout.'); }
    finally { setBusy(false); }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await bookingsApi.adminSettlePayout(rejectTarget.id, 'reject', rejectReason.trim() || 'Rejected by admin');
      setRejectTarget(null);
      setRejectReason('');
      await refresh();
    } catch (err) { alert(err?.message || 'Could not reject payout.'); }
    finally { setBusy(false); }
  };

  // CSV report of the currently-filtered payouts.
  const exportCSV = () => {
    const headers = ['Reference', 'Organizer', 'Agency', 'Email', 'Amount', 'Method', 'Status', 'Requested', 'Settled', 'UTR', 'Reason'];
    const rows = payouts.map((p) => [
      p.reference || p.id, p.organizerName || '', p.agencyName || '', p.organizerEmail || '',
      p.amount, p.method, p.status, fmtDate(p.requestedAt), fmtDate(p.completedAt), p.utr || '', p.rejectionReason || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trekigo-Payouts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;

  const stats = [
    { label: 'Pending Settlement', value: inr(summary.pendingAmount), sub: `${summary.pendingCount} request${summary.pendingCount === 1 ? '' : 's'}`, icon: Clock, color: 'text-amber-500' },
    { label: 'Total Paid Out', value: inr(summary.paidAmount), sub: `${summary.paidCount} settled`, icon: ArrowDownLeft, color: 'text-emerald-500' },
    { label: 'Rejected', value: inr(summary.rejectedAmount), sub: `${summary.rejectedCount} rejected`, icon: XCircle, color: 'text-rose-500' },
    { label: 'Total Requests', value: summary.totalCount, sub: 'all time', icon: Banknote, color: 'text-blue-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Banknote className="text-[#F27D26]" size={22} /> Organizer Payouts
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">Review, settle, and report on organizer payout requests.</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
        >
          <FileSpreadsheet size={14} /> Export Report (CSV)
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <Icon size={15} className={`${s.color} mb-2`} />
              <div className="text-xl font-black font-display text-slate-800 dark:text-white">{s.value}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{s.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className={`${cardCls} py-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search organizer, agency, reference, UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-xs font-semibold transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-[#F27D26]/60' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#F27D26]/60'
            }`}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
          >
            <option value="All">All</option>
            <option value="Processing">Processing</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`${cardCls} overflow-hidden p-0 border border-slate-100 dark:border-slate-800`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                <th className="py-3.5 px-6">Reference</th>
                <th className="py-3.5 px-6">Organizer</th>
                <th className="py-3.5 px-6">Destination</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Requested</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {payouts.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400">No payout requests found.</td></tr>
              ) : payouts.map((p) => {
                const meta = STATUS_META[p.status] || STATUS_META.Processing;
                const StatusIcon = meta.icon;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="py-4 px-6"><span className="font-mono font-bold text-[#F27D26]">{p.reference || p.id.slice(-8)}</span></td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold">{p.organizerName || '—'}</span>
                        <span className="text-[10px] text-slate-400">{p.agencyName || p.organizerEmail}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        {p.method === 'UPI' ? <Smartphone size={12} /> : <Landmark size={12} />}
                        <span>{p.method === 'UPI' ? (p.bank?.upiId || 'UPI') : (p.bank?.accountNumberMasked || 'Bank')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-black text-slate-800 dark:text-white">{inr(p.amount)}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${meta.cls}`}>
                        <StatusIcon size={11} /> {meta.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">{fmtDate(p.requestedAt)}</td>
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      {p.status === 'Processing' ? (
                        <>
                          <button onClick={() => setApproveTarget(p)} title="Approve & settle"
                            className="p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all">
                            <CheckCircle2 size={14} />
                          </button>
                          <button onClick={() => { setRejectTarget(p); setRejectReason(''); }} title="Reject"
                            className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all">
                            <XCircle size={14} />
                          </button>
                        </>
                      ) : null}
                      <button onClick={() => setDetail(p)} title="View details"
                        className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all">
                        <Hash size={14} />
                      </button>
                      {p.status !== 'Processing' && (
                        <button onClick={() => downloadPayoutReceiptPDF(p)} title="Download receipt"
                          className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all">
                          <Download size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve confirm */}
      <ConfirmDialog
        open={!!approveTarget}
        title="Approve Payout?"
        message={approveTarget ? `Settle ${inr(approveTarget.amount)} to ${approveTarget.organizerName || approveTarget.organizerEmail}? A UTR will be generated and the organizer notified.` : ''}
        confirmLabel={busy ? 'Approving…' : 'Approve & Pay'}
        tone="default"
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
        darkMode={darkMode}
      />

      {/* Reject modal (with reason) */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative animate-scaleIn ${darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
            <button onClick={() => setRejectTarget(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            <h3 className="text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 text-rose-500"><AlertTriangle size={15} /> Reject Payout</h3>
            <p className="text-xs text-slate-400 mb-4">Rejecting {inr(rejectTarget.amount)} to {rejectTarget.organizerName}. The amount returns to their available balance and they're notified.</p>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Reason</label>
            <textarea
              rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. KYC / bank details mismatch"
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs font-semibold resize-none ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
            />
            <div className="flex gap-2.5 mt-4">
              <button onClick={() => setRejectTarget(null)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
              <button onClick={handleReject} disabled={busy} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 active:scale-95 transition-all">
                {busy ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative animate-scaleIn ${darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            <span className="text-[10px] font-mono text-[#F27D26] font-bold">{detail.reference}</span>
            <div className="text-3xl font-black font-display mt-1">{inr(detail.amount)}</div>
            <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase mt-2 ${(STATUS_META[detail.status] || STATUS_META.Processing).cls}`}>{detail.status}</span>
            <div className="mt-5 space-y-2.5 text-xs">
              {[
                ['Organizer', detail.organizerName],
                ['Agency', detail.agencyName],
                ['Email', detail.organizerEmail],
                ['Method', detail.method],
                [detail.method === 'UPI' ? 'UPI ID' : 'Account', detail.method === 'UPI' ? detail.bank?.upiId : detail.bank?.accountNumberMasked],
                ['IFSC', detail.bank?.ifsc],
                ['Requested', fmtDate(detail.requestedAt)],
                ['Settled', fmtDate(detail.completedAt)],
                ['UTR', detail.utr],
                ['Settled By', detail.settledBy],
                ['Reason', detail.rejectionReason],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-bold text-right">{v}</span>
                </div>
              ))}
            </div>
            {detail.status !== 'Processing' && (
              <button onClick={() => downloadPayoutReceiptPDF(detail)} className="w-full mt-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#F27D26] hover:bg-[#d96d1a] flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                <Download size={14} /> Download Receipt (PDF)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
