import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Landmark, LoaderCircle, LogOut, Save, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';
import { normalizePayoutDetails, validatePayoutDetails } from '../utils/payoutDetails';

const FIELD_ORDER = ['accountHolderName', 'upiId', 'bankName', 'accountNumber', 'ifsc', 'panNumber', 'method'];

export default function OrgPayoutSetupView({ organizer, onSave, onLogout, darkMode }) {
  const [form, setForm] = useState(() => normalizePayoutDetails(organizer?.bankDetails));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const refs = useRef({});
  const toast = useToast();

  const inputCls = `w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition ${
    darkMode
      ? 'bg-zinc-950 border-white/10 text-white placeholder-white/25 focus:border-spy-orange/60'
      : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-spy-orange/60'
  }`;
  const labelCls = `mb-1.5 block text-xs font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`;

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitError('');
    setErrors((current) => ({ ...current, [field]: '', method: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = validatePayoutDetails(form);
    if (!result.valid) {
      setErrors(result.errors);
      const message = result.errors[FIELD_ORDER.find((field) => result.errors[field])];
      setSubmitError(message);
      toast.error(message);
      scrollToFirstError(refs.current, result.errors, FIELD_ORDER);
      return;
    }

    setSaving(true);
    setSubmitError('');
    try {
      await onSave(result.value);
      toast.success('Payout details saved. Your organizer dashboard is ready.');
    } catch (error) {
      const message = error?.message || 'Could not save payout details. Please try again.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-full overflow-y-auto px-4 py-6 sm:py-10 ${darkMode ? 'bg-zinc-950 text-white' : 'bg-[#FAF8F2] text-zinc-900'}`}>
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-500">Application approved</p>
              <p className={`mt-0.5 text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{organizer?.agencyName || organizer?.name}</p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${darkMode ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'}`}>
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <div className={`overflow-hidden rounded-3xl border shadow-xl ${darkMode ? 'border-white/10 bg-zinc-900 shadow-black/25' : 'border-zinc-200/80 bg-white shadow-zinc-200/60'}`}>
          <div className="bg-gradient-to-br from-orange-600 via-spy-orange to-amber-500 px-5 py-6 text-white sm:px-8">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Landmark size={22} /></div>
            <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Add payout details to continue</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">Before using your organizer dashboard, add the account where your booking earnings should be paid.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 sm:px-8 sm:py-7">
            <div className={`flex gap-3 rounded-2xl p-3.5 text-xs leading-relaxed ${darkMode ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-800'}`}>
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              <span>Your payout information is required once after approval and can be updated later from Financials.</span>
            </div>

            <div>
              <label className={labelCls}>Account holder name *</label>
              <input ref={(el) => { refs.current.accountHolderName = { current: el }; }} value={form.accountHolderName} onChange={(e) => setField('accountHolderName', e.target.value)} className={`${inputCls} ${errors.accountHolderName ? 'border-red-500' : ''}`} placeholder="As per bank records" />
              {errors.accountHolderName && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.accountHolderName}</p>}
            </div>

            <div>
              <label className={labelCls}>UPI ID</label>
              <input ref={(el) => { refs.current.upiId = { current: el }; }} value={form.upiId} onChange={(e) => setField('upiId', e.target.value)} className={`${inputCls} ${errors.upiId ? 'border-red-500' : ''}`} placeholder="yourname@upi" />
              {errors.upiId && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.upiId}</p>}
            </div>

            <div className="flex items-center gap-3">
              <div className={`h-px flex-1 ${darkMode ? 'bg-white/10' : 'bg-zinc-200'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>or add a bank account</span>
              <div className={`h-px flex-1 ${darkMode ? 'bg-white/10' : 'bg-zinc-200'}`} />
            </div>

            {errors.method && <p className="text-center text-[11px] font-semibold text-red-500">{errors.method}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Bank name</label>
                <input ref={(el) => { refs.current.bankName = { current: el }; }} value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} className={`${inputCls} ${errors.bankName ? 'border-red-500' : ''}`} placeholder="e.g. HDFC Bank" />
                {errors.bankName && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.bankName}</p>}
              </div>
              <div>
                <label className={labelCls}>IFSC code</label>
                <input ref={(el) => { refs.current.ifsc = { current: el }; }} value={form.ifsc} onChange={(e) => setField('ifsc', e.target.value.toUpperCase())} className={`${inputCls} ${errors.ifsc ? 'border-red-500' : ''}`} placeholder="e.g. HDFC0001234" />
                {errors.ifsc && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.ifsc}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Account number</label>
              <input ref={(el) => { refs.current.accountNumber = { current: el }; }} inputMode="numeric" value={form.accountNumber} onChange={(e) => setField('accountNumber', e.target.value.replace(/\D/g, ''))} className={`${inputCls} ${errors.accountNumber ? 'border-red-500' : ''}`} placeholder="XXXXXXXXXXXX" />
              {errors.accountNumber && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.accountNumber}</p>}
            </div>

            <div>
              <label className={labelCls}>PAN number <span className="font-normal opacity-60">(optional)</span></label>
              <input ref={(el) => { refs.current.panNumber = { current: el }; }} maxLength={10} value={form.panNumber} onChange={(e) => setField('panNumber', e.target.value.toUpperCase())} className={`${inputCls} ${errors.panNumber ? 'border-red-500' : ''}`} placeholder="ABCDE1234F" />
              {errors.panNumber && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors.panNumber}</p>}
            </div>

            {submitError && <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}><AlertCircle size={15} className="shrink-0" /> {submitError}</div>}

            <button id="btn-complete-payout-setup" type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-spy-orange px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-spy-orange/20 transition hover:bg-[#d96d1a] disabled:cursor-wait disabled:opacity-70">
              {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}
              {saving ? 'Saving payout details…' : 'Save & continue to dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
