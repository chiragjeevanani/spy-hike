import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Wallet, Landmark, Smartphone, ShieldCheck, RefreshCw, Copy, CheckCircle2,
  XCircle, Clock, ArrowUpRight, ArrowDownLeft, FileText, AlertCircle, Save, X, Edit3,
  IndianRupee, TrendingUp, Banknote, CreditCard, Download,
} from 'lucide-react';
import { downloadFinancialReportPDF } from '../utils/financePdf';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const SECTIONS = ['Overview', 'Statement', 'Payouts'];
const COMMISSION_RATE = 0.1;
// Same format rules the backend enforces — this data drives where real money
// gets sent, so it's validated for real rather than trusted as-is.
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
const UPI_REGEX = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]{1}$/;

const commissionOf = (b) => b.commissionAmount !== undefined ? b.commissionAmount : (b.finalAmount || 0) * COMMISSION_RATE;
const netOf = (b) => (b.finalAmount || 0) - commissionOf(b);
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const maskAccount = (num) => num && num.length > 4 ? `•••• •••• ${num.slice(-4)}` : (num || '—');

export default function OrgFinancialsView({ organizer, bookings, payouts, onSaveBankDetails, onRequestPayout, onBack, darkMode }) {
  const [section, setSection] = useState('Overview');
  const [editingBank, setEditingBank] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [bankForm, setBankForm] = useState({
    accountHolderName: organizer?.bankDetails?.accountHolderName || '',
    bankName: organizer?.bankDetails?.bankName || '',
    accountNumber: organizer?.bankDetails?.accountNumber || '',
    ifsc: organizer?.bankDetails?.ifsc || '',
    upiId: organizer?.bankDetails?.upiId || '',
    panNumber: organizer?.bankDetails?.panNumber || '',
  });
  const [bankFormError, setBankFormError] = useState('');
  const [bankFieldErrors, setBankFieldErrors] = useState({});
  const toast = useToast();
  const bankFieldRefs = useRef({});

  const activeBookings = bookings.filter(b => b.status !== 'Cancelled');
  const completedBookings = bookings.filter(b => b.status === 'Completed');
  const upcomingBookings = bookings.filter(b => b.status === 'Upcoming');

  const totalGross = activeBookings.reduce((s, b) => s + (b.finalAmount || 0), 0);
  const totalCommission = activeBookings.reduce((s, b) => s + commissionOf(b), 0);
  const totalNet = totalGross - totalCommission;

  const settledNet = completedBookings.reduce((s, b) => s + netOf(b), 0);
  const pendingNet = upcomingBookings.reduce((s, b) => s + netOf(b), 0);

  const paidOut = payouts.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const processingAmount = payouts.filter(p => p.status === 'Processing').reduce((s, p) => s + p.amount, 0);
  const availableBalance = Math.max(0, settledNet - paidOut - processingAmount);

  const bank = organizer?.bankDetails || {};
  const hasPayoutMethod = !!(bank.upiId?.trim()) || !!(bank.accountNumber?.trim() && bank.ifsc?.trim());
  const canRequestPayout = hasPayoutMethod && availableBalance > 0 && !requesting;

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-white border-zinc-200 text-zinc-800 focus:border-spy-orange/50'
  }`;
  const labelCls = `text-xs font-semibold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`;
  const cardCls = `rounded-2xl ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`;

  const handleBankSave = () => {
    const errors = {};
    if (!bankForm.accountHolderName.trim()) errors.accountHolderName = 'Account holder name is required.';

    const upiFilled = !!bankForm.upiId.trim();
    const validUpi = upiFilled && UPI_REGEX.test(bankForm.upiId.trim());
    if (upiFilled && !validUpi) errors.upiId = 'Enter a valid UPI ID (e.g. name@bank).';

    const bankFilled = bankForm.bankName.trim() || bankForm.accountNumber.trim() || bankForm.ifsc.trim();
    let validBank = false;
    if (bankFilled) {
      if (!bankForm.bankName.trim()) errors.bankName = 'Bank name is required.';
      if (!ACCOUNT_NUMBER_REGEX.test(bankForm.accountNumber.trim())) errors.accountNumber = 'Enter a valid bank account number (9-18 digits).';
      if (!IFSC_REGEX.test(bankForm.ifsc.trim().toUpperCase())) errors.ifsc = 'Enter a valid IFSC code (e.g. HDFC0001234).';
      validBank = !errors.bankName && !errors.accountNumber && !errors.ifsc;
    }

    if (bankForm.panNumber.trim() && !PAN_REGEX.test(bankForm.panNumber.trim().toUpperCase())) {
      errors.panNumber = 'Enter a valid PAN number (e.g. ABCDE1234F).';
    }

    if (!errors.accountHolderName && !validUpi && !validBank) {
      errors.method = 'Add either a UPI ID or full bank account details (Bank Name, Account Number, IFSC).';
    }

    if (Object.keys(errors).length > 0) {
      const order = ['accountHolderName', 'upiId', 'bankName', 'accountNumber', 'ifsc', 'panNumber', 'method'];
      const message = errors[order.find(f => errors[f])];
      setBankFieldErrors(errors);
      setBankFormError(message);
      toast.error(message);
      scrollToFirstError(bankFieldRefs.current, errors, order);
      return;
    }
    setBankFieldErrors({});
    setBankFormError('');
    onSaveBankDetails(bankForm);
    setEditingBank(false);
    toast.success('Payout details saved.');
  };

  const handleRequestPayout = () => {
    if (!canRequestPayout) return;
    setRequesting(true);
    onRequestPayout(availableBalance);
    setTimeout(() => setRequesting(false), 600);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 1500);
  };

  const handleDownloadReport = () => {
    downloadFinancialReportPDF({ organizer, bookings, payouts });
  };

  const payoutStatusMeta = (status) => {
    if (status === 'Paid') return { icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-400' };
    if (status === 'Processing') return { icon: Clock, cls: 'bg-amber-500/15 text-amber-400' };
    return { icon: XCircle, cls: 'bg-red-500/15 text-red-400' };
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>

      {/* Header */}
      <div className={`px-5 py-4 shrink-0 flex items-center gap-3 border-b ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
        <button
          id="btn-back-org-financials"
          onClick={onBack}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 ${darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-display font-black tracking-tight">Financials</h2>
          <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">Payouts & Bank Info</p>
        </div>
        <button
          type="button"
          id="btn-download-financial-report"
          onClick={handleDownloadReport}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-spy-orange text-white active:scale-95 transition shadow-sm shadow-spy-orange/20"
        >
          <Download size={13} /> Report
        </button>
      </div>

      {/* Section tabs */}
      <div className={`px-5 pt-3 pb-2 shrink-0 flex gap-2 border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
        {SECTIONS.map(s => (
          <button
            key={s}
            id={`btn-financials-tab-${s.toLowerCase()}`}
            type="button"
            onClick={() => setSection(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              section === s ? 'bg-spy-orange text-white shadow-sm shadow-spy-orange/30' : darkMode ? 'bg-zinc-900 text-zinc-400 border border-white/10' : 'bg-white text-zinc-500 border border-zinc-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 pb-10">

        {/* ─── Overview ─── */}
        {section === 'Overview' && (
          <>
            {/* Balance hero */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-spy-orange to-orange-700 text-white p-5 shadow-lg shadow-orange-900/20">
              <div className="flex items-center gap-2 text-white/80">
                <Wallet size={15} />
                <span className="text-[11px] font-bold uppercase tracking-widest">Available Balance</span>
              </div>
              <div className="text-3xl font-display font-black tracking-tight mt-2">{inr(availableBalance)}</div>
              <p className="text-[11px] text-white/75 mt-1.5 leading-relaxed">
                {pendingNet > 0 ? `${inr(pendingNet)} pending settlement from upcoming trips.` : 'No pending settlements right now.'}
              </p>
              <button
                type="button"
                id="btn-request-payout"
                onClick={handleRequestPayout}
                disabled={!canRequestPayout}
                className={`mt-4 w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  canRequestPayout ? 'bg-white text-orange-700 shadow-sm' : 'bg-white/20 text-white/60 cursor-not-allowed'
                }`}
              >
                {requesting ? <RefreshCw size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
                {requesting ? 'Requesting…' : 'Request Payout'}
              </button>
              {!hasPayoutMethod && (
                <p className="text-[10px] text-white/80 mt-2 flex items-center gap-1">
                  <AlertCircle size={11} /> Add a payout method below to withdraw.
                </p>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Net Earnings', value: inr(totalNet), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                { label: 'Pending Settlement', value: inr(pendingNet), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                { label: 'Total Paid Out', value: inr(paidOut), icon: ArrowDownLeft, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { label: 'Platform Commission', value: inr(totalCommission), icon: IndianRupee, color: 'text-rose-400', bg: 'bg-rose-400/10' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`${cardCls} p-4`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                      <Icon size={16} className={s.color} />
                    </div>
                    <div className="text-lg font-display font-black tracking-tight">{s.value}</div>
                    <div className={`text-[10px] font-medium mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.label}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Payout method card */}
            <div className={cardCls}>
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-xs font-black uppercase tracking-wider opacity-60">Payout Method</span>
                <button
                  type="button"
                  id="btn-edit-bank-details"
                  onClick={() => { setBankFormError(''); setEditingBank(true); }}
                  className="text-spy-orange text-xs font-bold flex items-center gap-1"
                >
                  <Edit3 size={12} /> {hasPayoutMethod ? 'Edit' : 'Add'}
                </button>
              </div>
              {hasPayoutMethod ? (
                <div className={`px-4 py-3.5 border-t space-y-3 ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                  {bank.upiId?.trim() && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-400 shrink-0">
                        <Smartphone size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>UPI ID</p>
                        <p className="text-sm font-semibold truncate">{bank.upiId}</p>
                      </div>
                    </div>
                  )}
                  {bank.accountNumber?.trim() && bank.ifsc?.trim() && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400 shrink-0">
                        <Landmark size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{bank.bankName || 'Bank Account'}</p>
                        <p className="text-sm font-semibold">{maskAccount(bank.accountNumber)} · {bank.ifsc}</p>
                      </div>
                    </div>
                  )}
                  <p className={`text-[10px] flex items-center gap-1 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    <ShieldCheck size={11} /> {bank.accountHolderName}{bank.panNumber ? ` · PAN ${bank.panNumber}` : ''}
                  </p>
                </div>
              ) : (
                <div className={`px-4 py-4 border-t text-center ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                  <CreditCard size={22} className="mx-auto mb-2 text-spy-orange/60" />
                  <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>No payout method on file yet.</p>
                </div>
              )}
            </div>

            {/* Commission info */}
            <div className={`p-4 rounded-2xl flex gap-2.5 text-xs leading-relaxed ${darkMode ? 'bg-zinc-900/60 text-zinc-400' : 'bg-white text-zinc-500 shadow-sm'}`}>
              <FileText size={14} className="text-spy-orange shrink-0 mt-0.5" />
              <span>
                Find Your Trek charges a {(COMMISSION_RATE * 100).toFixed(0)}% platform commission per booking. Funds move from
                "Pending Settlement" to your "Available Balance" once a trip is marked Completed. Zero-commission
                loyalty credits skip this deduction entirely.
              </span>
            </div>
          </>
        )}

        {/* ─── Statement ─── */}
        {section === 'Statement' && (
          activeBookings.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={36} className="mx-auto mb-3 text-zinc-300" />
              <p className="font-bold text-sm mb-1">No transactions yet</p>
              <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Booking earnings will show up here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeBookings.slice().reverse().map((b, i) => (
                <motion.div
                  key={b.id || b.bookingId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`${cardCls} p-3.5`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{b.tripName}</p>
                      <p className={`text-[10px] font-mono mt-0.5 ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{b.bookingId} · {b.selectedDate}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      b.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {b.status === 'Completed' ? 'Settled' : 'Pending'}
                    </span>
                  </div>
                  <div className={`grid grid-cols-3 gap-2 pt-2.5 border-t text-center ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                    <div>
                      <p className={`text-[9px] uppercase font-semibold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Gross</p>
                      <p className="text-xs font-bold mt-0.5">{inr(b.finalAmount)}</p>
                    </div>
                    <div>
                      <p className={`text-[9px] uppercase font-semibold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Commission</p>
                      <p className="text-xs font-bold mt-0.5 text-rose-400">
                        {b.loyaltyRewardApplied ? '₹0' : `-${inr(commissionOf(b))}`}
                      </p>
                    </div>
                    <div>
                      <p className={`text-[9px] uppercase font-semibold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Net</p>
                      <p className="text-xs font-black mt-0.5 text-emerald-400">{inr(netOf(b))}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* ─── Payouts ─── */}
        {section === 'Payouts' && (
          payouts.length === 0 ? (
            <div className="text-center py-16">
              <Banknote size={36} className="mx-auto mb-3 text-zinc-300" />
              <p className="font-bold text-sm mb-1">No payouts yet</p>
              <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Request a payout from the Overview tab once you have an available balance.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payouts.slice().reverse().map((p, i) => {
                const meta = payoutStatusMeta(p.status);
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`${cardCls} p-4`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.cls}`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{inr(p.amount)}</p>
                          <p className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{p.method}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.cls}`}>{p.status}</span>
                    </div>
                    <div className={`mt-3 pt-2.5 border-t flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                      <span className={`text-[10px] font-mono ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {p.status === 'Paid' ? `UTR ${p.utr}` : `Requested ${new Date(p.requestedAt).toLocaleDateString()}`}
                      </span>
                      {p.status === 'Paid' && p.utr && (
                        <button
                          type="button"
                          onClick={() => handleCopy(p.utr, p.id)}
                          className="text-spy-orange text-[10px] font-bold flex items-center gap-1"
                        >
                          <Copy size={10} /> {copiedId === p.id ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Edit bank details overlay */}
      <AnimatePresence>
        {editingBank && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col"
          >
            <div className={`flex-1 flex flex-col overflow-y-auto ${darkMode ? 'bg-zinc-950' : 'bg-gray-50'}`}>
              <div className={`px-5 pt-5 pb-4 shrink-0 flex items-center gap-3 ${darkMode ? 'bg-zinc-900/80 border-b border-white/5' : 'bg-white border-b border-zinc-100 shadow-sm'}`}>
                <button type="button" onClick={() => setEditingBank(false)} className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}><X size={17} /></button>
                <h2 className="text-lg font-display font-black">Payout Details</h2>
              </div>
              <div className="flex-1 px-5 py-5 space-y-4">
                <div className={`rounded-2xl p-4 space-y-4 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
                  <div>
                    <label className={labelCls}>Account Holder Name *</label>
                    <input
                      ref={el => { bankFieldRefs.current.accountHolderName = { current: el }; }}
                      type="text"
                      className={`${inputCls} ${bankFieldErrors.accountHolderName ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="As per bank records"
                      value={bankForm.accountHolderName}
                      onChange={e => { setBankForm(p => ({ ...p, accountHolderName: e.target.value })); setBankFormError(''); setBankFieldErrors(er => ({ ...er, accountHolderName: '' })); }}
                    />
                    {bankFieldErrors.accountHolderName && <p className="text-[11px] font-semibold text-red-500 mt-1">{bankFieldErrors.accountHolderName}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>UPI ID</label>
                    <input
                      ref={el => { bankFieldRefs.current.upiId = { current: el }; }}
                      type="text"
                      className={`${inputCls} ${bankFieldErrors.upiId ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="yourname@upi"
                      value={bankForm.upiId}
                      onChange={e => { setBankForm(p => ({ ...p, upiId: e.target.value })); setBankFormError(''); setBankFieldErrors(er => ({ ...er, upiId: '', method: '' })); }}
                    />
                    {bankFieldErrors.upiId && <p className="text-[11px] font-semibold text-red-500 mt-1">{bankFieldErrors.upiId}</p>}
                  </div>
                  <div className={`text-center text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>— or bank account —</div>
                  {bankFieldErrors.method && <p className="text-[11px] font-semibold text-red-500 text-center">{bankFieldErrors.method}</p>}
                  <div>
                    <label className={labelCls}>Bank Name</label>
                    <input
                      ref={el => { bankFieldRefs.current.bankName = { current: el }; }}
                      type="text"
                      className={`${inputCls} ${bankFieldErrors.bankName ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="e.g. HDFC Bank"
                      value={bankForm.bankName}
                      onChange={e => { setBankForm(p => ({ ...p, bankName: e.target.value })); setBankFormError(''); setBankFieldErrors(er => ({ ...er, bankName: '', method: '' })); }}
                    />
                    {bankFieldErrors.bankName && <p className="text-[11px] font-semibold text-red-500 mt-1">{bankFieldErrors.bankName}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input
                      ref={el => { bankFieldRefs.current.accountNumber = { current: el }; }}
                      type="text"
                      inputMode="numeric"
                      className={`${inputCls} ${bankFieldErrors.accountNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="XXXXXXXXXXXX"
                      value={bankForm.accountNumber}
                      onChange={e => { setBankForm(p => ({ ...p, accountNumber: e.target.value.replace(/\D/g, '') })); setBankFormError(''); setBankFieldErrors(er => ({ ...er, accountNumber: '', method: '' })); }}
                    />
                    {bankFieldErrors.accountNumber && <p className="text-[11px] font-semibold text-red-500 mt-1">{bankFieldErrors.accountNumber}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>IFSC Code</label>
                    <input
                      ref={el => { bankFieldRefs.current.ifsc = { current: el }; }}
                      type="text"
                      className={`${inputCls} ${bankFieldErrors.ifsc ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="e.g. HDFC0001234"
                      value={bankForm.ifsc}
                      onChange={e => { setBankForm(p => ({ ...p, ifsc: e.target.value.toUpperCase() })); setBankFormError(''); setBankFieldErrors(er => ({ ...er, ifsc: '', method: '' })); }}
                    />
                    {bankFieldErrors.ifsc && <p className="text-[11px] font-semibold text-red-500 mt-1">{bankFieldErrors.ifsc}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>PAN Number (for tax records)</label>
                    <input
                      ref={el => { bankFieldRefs.current.panNumber = { current: el }; }}
                      type="text"
                      className={`${inputCls} ${bankFieldErrors.panNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="ABCDE1234F"
                      value={bankForm.panNumber}
                      onChange={e => { setBankForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() })); setBankFieldErrors(er => ({ ...er, panNumber: '' })); }}
                    />
                    {bankFieldErrors.panNumber && <p className="text-[11px] font-semibold text-red-500 mt-1">{bankFieldErrors.panNumber}</p>}
                  </div>
                  {bankFormError && (
                    <div className={`flex gap-2 items-center p-3 rounded-xl text-xs font-semibold ${
                      darkMode ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-600'
                    }`}>
                      <AlertCircle size={14} className="shrink-0" /> {bankFormError}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 shrink-0">
                <button
                  type="button"
                  id="btn-save-bank-details"
                  onClick={handleBankSave}
                  className="w-full py-3.5 rounded-2xl bg-spy-orange text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-spy-orange/20 active:scale-95 transition-all"
                >
                  <Save size={16} /> Save Payout Details
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
