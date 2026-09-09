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
  const scannedBookings = activeBookings.filter(b => !!b.checkedInAt || b.isCheckedIn);
  const unscannedBookings = activeBookings.filter(b => !b.checkedInAt && !b.isCheckedIn);

  const totalGross = activeBookings.reduce((s, b) => s + (b.finalAmount || 0), 0);
  const totalCommission = activeBookings.reduce((s, b) => s + commissionOf(b), 0);
  const totalNet = totalGross - totalCommission;

  const settledNet = scannedBookings.reduce((s, b) => s + netOf(b), 0);
  const pendingNet = unscannedBookings.reduce((s, b) => s + netOf(b), 0);

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
    <div className={`h-full flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3.5">
            <button
              id="btn-back-org-financials"
              onClick={onBack}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition active:scale-90 cursor-pointer border ${
                darkMode ? 'bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-xs'
              }`}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              {/* flex-wrap + shrink-0/whitespace-nowrap on the badge: without
                  these, once the title wraps to 2 lines on a narrow phone the
                  badge got squeezed for space and wrapped its own text into a
                  broken 2-line pill. Now it drops to its own line instead. */}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1.5">
                <h1 className="text-lg sm:text-2xl font-display font-black tracking-tight">Financials & Settlements</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                  Live Bank Feed
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Track booking revenues, platform commission deductions, and request direct bank disbursements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-download-financial-report"
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-spy-orange hover:bg-[#d96d1a] text-white active:scale-95 transition shadow-lg shadow-spy-orange/20 cursor-pointer"
            >
              <Download size={14} /> Download Statement (PDF)
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2">
          {SECTIONS.map(s => (
            <button
              key={s}
              id={`btn-financials-tab-${s.toLowerCase()}`}
              type="button"
              onClick={() => setSection(s)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                section === s
                  ? 'bg-spy-orange text-white shadow-md shadow-spy-orange/20'
                  : darkMode
                    ? 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 border border-white/10'
                    : 'bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 shadow-xs'
              }`}
            >
              {s === 'Payouts' ? 'Payout History' : s}
            </button>
          ))}
        </div>

        {/* ─── Overview Section ─── */}
        {section === 'Overview' && (
          <div className="space-y-6">
            {/* Top Row: Balance Hero + Payout Method */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Available Balance Card */}
              <div className="lg:col-span-7 relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-600 via-spy-orange to-amber-600 text-white p-6 sm:p-7 shadow-xl shadow-orange-950/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center flex-wrap justify-between gap-x-3 gap-y-1.5">
                    <div className="flex items-center gap-2 text-white/90 min-w-0">
                      <Wallet size={16} className="shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-widest">Available for Withdrawal</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs shrink-0 whitespace-nowrap">
                      Instant Payout
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-display font-black tracking-tight mt-3">
                    {inr(availableBalance)}
                  </div>

                  <p className="text-xs text-white/85 mt-2 leading-relaxed max-w-lg">
                    {pendingNet > 0
                      ? `${inr(pendingNet)} pending settlement from upcoming & ongoing expeditions.`
                      : 'All completed bookings have been cleared for withdrawal.'}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-white/15">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                      type="button"
                      id="btn-request-payout"
                      onClick={handleRequestPayout}
                      disabled={!canRequestPayout}
                      className={`flex-1 py-3.5 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                        canRequestPayout
                          ? 'bg-white text-orange-800 hover:bg-orange-50 shadow-md shadow-black/10'
                          : 'bg-white/20 text-white/60 cursor-not-allowed'
                      }`}
                    >
                      {requesting ? <RefreshCw size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                      {requesting ? 'Processing Payout Request…' : 'Request Bank Payout'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSection('Statement')}
                      className="py-3.5 px-5 rounded-2xl text-xs font-bold bg-black/20 hover:bg-black/30 text-white transition active:scale-95 cursor-pointer text-center"
                    >
                      View Breakdown
                    </button>
                  </div>

                  {!hasPayoutMethod && (
                    <p className="text-[11px] text-white/90 mt-2.5 flex items-center gap-1.5">
                      <AlertCircle size={13} /> Add a bank account or UPI ID to enable payout requests.
                    </p>
                  )}
                </div>
              </div>

              {/* Payout Method Card */}
              <div className={`lg:col-span-5 rounded-3xl p-6 flex flex-col justify-between ${cardCls}`}>
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Landmark size={17} className="text-spy-orange" />
                      <span className="text-sm font-bold">Registered Payout Method</span>
                    </div>
                    <button
                      type="button"
                      id="btn-edit-bank-details"
                      onClick={() => { setBankFormError(''); setEditingBank(true); }}
                      className="text-spy-orange hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={13} /> {hasPayoutMethod ? 'Edit Details' : 'Add Method'}
                    </button>
                  </div>

                  {hasPayoutMethod ? (
                    <div className="pt-4 space-y-3.5">
                      {bank.upiId?.trim() && (
                        <div className={`p-3.5 rounded-2xl flex items-center gap-3.5 ${darkMode ? 'bg-zinc-950/60 border border-white/5' : 'bg-zinc-50 border border-zinc-200/60'}`}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/15 text-indigo-400 shrink-0">
                            <Smartphone size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>UPI Virtual Address</p>
                            <p className="text-sm font-bold truncate">{bank.upiId}</p>
                          </div>
                        </div>
                      )}

                      {bank.accountNumber?.trim() && bank.ifsc?.trim() && (
                        <div className={`p-3.5 rounded-2xl flex items-center gap-3.5 ${darkMode ? 'bg-zinc-950/60 border border-white/5' : 'bg-zinc-50 border border-zinc-200/60'}`}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-400 shrink-0">
                            <Landmark size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {bank.bankName || 'Direct Bank Transfer'}
                            </p>
                            <p className="text-sm font-bold">{maskAccount(bank.accountNumber)}</p>
                            <p className={`text-[11px] font-mono ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>IFSC: {bank.ifsc}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 pt-1">
                        <ShieldCheck size={14} className="shrink-0" />
                        <span className="truncate">Verified recipient: {bank.accountHolderName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CreditCard size={28} className="mx-auto mb-2 text-spy-orange/60" />
                      <p className="text-sm font-bold">No bank account linked</p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        Link your company or individual bank account to receive automatic settlements.
                      </p>
                    </div>
                  )}
                </div>

                {/* Commission Notice */}
                <div className={`mt-4 p-3.5 rounded-2xl flex gap-2.5 text-xs leading-relaxed ${
                  darkMode ? 'bg-zinc-950/60 text-zinc-400 border border-white/5' : 'bg-zinc-50 text-zinc-600 border border-zinc-200/60'
                }`}>
                  <FileText size={15} className="text-spy-orange shrink-0 mt-0.5" />
                  <span>
                    Platform commission is {(COMMISSION_RATE * 100).toFixed(0)}%. Funds unlock for withdrawal 3 business days following trek completion.
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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
                    transition={{ delay: i * 0.05 }}
                    className={`${cardCls} p-5`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${s.bg}`}>
                      <Icon size={18} className={s.color} />
                    </div>
                    <div className="text-xl sm:text-2xl font-display font-black tracking-tight">{s.value}</div>
                    <div className={`text-xs font-semibold mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.label}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Recent Settlements Preview */}
            <div className={`rounded-3xl p-6 ${cardCls}`}>
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-base font-display font-black tracking-tight">Recent Settlement Activity</h3>
                  <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Latest bookings processed and credited</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSection('Statement')}
                  className="text-xs font-bold text-spy-orange hover:underline cursor-pointer"
                >
                  View Full Statement →
                </button>
              </div>

              {activeBookings.length === 0 ? (
                <div className="text-center py-10">
                  <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>No settlement transactions yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 pt-2">
                  {activeBookings.slice(-4).reverse().map((b) => (
                    <div key={b.id || b.bookingId} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{b.tripName}</p>
                        <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {b.bookingId} · {b.selectedDate || 'Upcoming'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-emerald-400">+{inr(netOf(b))}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {b.status === 'Completed' ? 'Settled' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Statement Section ─── */}
        {section === 'Statement' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Itemized Settlement Statement ({activeBookings.length} bookings)
              </span>
            </div>

            {activeBookings.length === 0 ? (
              <div className="text-center py-16">
                <FileText size={36} className="mx-auto mb-3 text-zinc-300" />
                <p className="font-bold text-sm mb-1">No transactions yet</p>
                <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Booking earnings will show up here.</p>
              </div>
            ) : (
              <div className={`rounded-3xl overflow-hidden ${cardCls}`}>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`border-b text-xs font-bold uppercase tracking-wider ${
                        darkMode ? 'border-white/10 text-zinc-400 bg-zinc-950/40' : 'border-zinc-200 text-zinc-500 bg-zinc-50'
                      }`}>
                        <th className="py-3.5 px-5">Booking ID</th>
                        <th className="py-3.5 px-5">Expedition</th>
                        <th className="py-3.5 px-5">Departure</th>
                        <th className="py-3.5 px-5 text-right">Gross Fare</th>
                        <th className="py-3.5 px-5 text-right">Fee</th>
                        <th className="py-3.5 px-5 text-right">Net Payout</th>
                        <th className="py-3.5 px-5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeBookings.slice().reverse().map((b) => (
                        <tr key={b.id || b.bookingId} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                          <td className="py-3.5 px-5 font-mono text-xs font-bold">{b.bookingId || b.id}</td>
                          <td className="py-3.5 px-5 font-bold truncate max-w-[200px]">{b.tripName}</td>
                          <td className={`py-3.5 px-5 text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{b.selectedDate || '—'}</td>
                          <td className="py-3.5 px-5 text-right font-semibold">{inr(b.finalAmount)}</td>
                          <td className="py-3.5 px-5 text-right text-rose-400 font-semibold">
                            {b.loyaltyRewardApplied ? '₹0 (0% Promo)' : `-${inr(commissionOf(b))}`}
                          </td>
                          <td className="py-3.5 px-5 text-right font-black text-emerald-400">{inr(netOf(b))}</td>
                          <td className="py-3.5 px-5 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              b.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                            }`}>
                              {b.status === 'Completed' ? 'Settled' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-white/5 p-3">
                  {activeBookings.slice().reverse().map((b) => (
                    <div key={b.id || b.bookingId} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{b.tripName}</p>
                          <p className={`text-[10px] font-mono ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {b.bookingId} · {b.selectedDate}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {b.status === 'Completed' ? 'Settled' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>Gross: {inr(b.finalAmount)}</span>
                        <span className="text-rose-400">Fee: -{inr(commissionOf(b))}</span>
                        <span className="font-bold text-emerald-400">Net: {inr(netOf(b))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Payout History Section ─── */}
        {section === 'Payouts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Disbursement History ({payouts.length} transfers)
              </span>
            </div>

            {payouts.length === 0 ? (
              <div className="text-center py-16">
                <Banknote size={36} className="mx-auto mb-3 text-zinc-300" />
                <p className="font-bold text-sm mb-1">No bank transfers yet</p>
                <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Processed payouts will be logged here.</p>
              </div>
            ) : (
              <div className={`rounded-3xl overflow-hidden divide-y divide-white/5 ${cardCls}`}>
                {payouts.map((p) => {
                  const meta = payoutStatusMeta(p.status);
                  const StatusIcon = meta.icon;
                  return (
                    <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${meta.cls}`}>
                          <StatusIcon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold font-mono">{inr(p.amount)}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>
                              {p.status}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {p.method} · {p.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className={darkMode ? 'text-zinc-500' : 'text-zinc-400'}>Ref: {p.referenceId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(p.referenceId, p.id)}
                          className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-white/10' : 'hover:bg-zinc-100'}`}
                        >
                          {copiedId === p.id ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Edit bank details modal */}
      <AnimatePresence>
        {editingBank && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setEditingBank(false)}
          >
            <div
              className={`w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border ${
                darkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-[#FAF8F2] border-zinc-200/80 text-zinc-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`px-5 pt-5 pb-4 shrink-0 flex items-center justify-between border-b ${
                darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white/80 backdrop-blur-md border-zinc-200/70'
              }`}>
                <h2 className="text-lg font-display font-black">Payout Details</h2>
                <button
                  type="button"
                  onClick={() => setEditingBank(false)}
                  className={`p-2 rounded-xl cursor-pointer transition ${darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                  <X size={17} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                <div className={`rounded-2xl p-4 space-y-4 ${darkMode ? 'bg-zinc-900/80 border border-white/10 shadow-xs' : 'bg-white/90 border border-zinc-200/80 shadow-xs'}`}>
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
              <div className="px-5 py-4 shrink-0 border-t border-zinc-200/60 dark:border-white/5">
                <button
                  type="button"
                  id="btn-save-bank-details"
                  onClick={handleBankSave}
                  className="w-full py-3.5 rounded-2xl bg-spy-orange text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-spy-orange/20 active:scale-95 transition-all cursor-pointer hover:bg-[#d96d1a]"
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
