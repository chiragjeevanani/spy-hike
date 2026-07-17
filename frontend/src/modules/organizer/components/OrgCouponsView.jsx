import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, TicketPercent, Plus, Search, Pencil, Trash2, Pause, Play, X, Percent, IndianRupee, Sparkles,
} from 'lucide-react';
import orgCouponsApi from '../../../lib/orgCouponsApi';
import tripsApi from '../../../lib/tripsApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const FIELD_ORDER = ['code', 'value', 'tripIds'];

const emptyForm = () => ({
  code: '',
  type: 'percentage',
  value: '',
  maxDiscount: '',
  minBookingAmount: '',
  startsAt: '',
  expiresAt: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })(),
  maxRedemptions: '',
  appliesTo: 'all',
  tripIds: [],
});

export default function OrgCouponsView({ onBack, darkMode }) {
  const [coupons, setCoupons] = useState([]);
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingCoupon, setEditingCoupon] = useState(null); // null = closed, {} = new, {...} = edit
  const [form, setForm] = useState(emptyForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();

  const codeRef = useRef(null);
  const valueRef = useRef(null);
  const tripsRef = useRef(null);
  const fieldRefs = { code: codeRef, value: valueRef, tripIds: tripsRef };

  const refresh = () => orgCouponsApi.list().then(setCoupons).catch(() => setCoupons([]));
  useEffect(() => {
    refresh();
    tripsApi.listOrganizerTrips().then(setTrips).catch(() => setTrips([]));
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setFieldErrors({});
    setEditingCoupon({});
  };

  const openEdit = (coupon) => {
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value ?? ''),
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : '',
      minBookingAmount: coupon.minBookingAmount ? String(coupon.minBookingAmount) : '',
      startsAt: coupon.startsAt || '',
      expiresAt: coupon.expiresAt || '',
      maxRedemptions: coupon.maxRedemptions != null ? String(coupon.maxRedemptions) : '',
      appliesTo: coupon.appliesTo || 'all',
      tripIds: coupon.tripIds || [],
    });
    setFieldErrors({});
    setEditingCoupon(coupon);
  };

  const closeModal = () => setEditingCoupon(null);

  const toggleTripId = (id) => {
    setForm((f) => ({
      ...f,
      tripIds: f.tripIds.includes(id) ? f.tripIds.filter((t) => t !== id) : [...f.tripIds, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const isNew = !editingCoupon.id;

    const errors = {};
    if (!code) errors.code = 'Enter a coupon code.';
    else if (coupons.some((c) => c.code === code && (isNew || c.id !== editingCoupon.id))) {
      errors.code = 'You already have a coupon with this code.';
    }
    if (!form.value || !value || value <= 0) errors.value = 'Enter a discount value greater than 0.';
    else if (form.type === 'percentage' && value > 100) errors.value = 'Percentage discount cannot exceed 100%.';
    if (form.startsAt && form.expiresAt && form.startsAt > form.expiresAt) {
      errors.expiresAt = 'Start date must be before the expiry date.';
    }
    if (form.appliesTo === 'selected' && form.tripIds.length === 0) {
      errors.tripIds = 'Select at least one trip, or switch to "All My Trips".';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      scrollToFirstError(fieldRefs, errors, FIELD_ORDER);
      return;
    }
    setFieldErrors({});

    const fields = {
      code,
      type: form.type,
      value,
      maxDiscount: form.type === 'percentage' && form.maxDiscount ? Number(form.maxDiscount) : null,
      minBookingAmount: form.minBookingAmount ? Number(form.minBookingAmount) : 0,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      appliesTo: form.appliesTo,
      tripIds: form.appliesTo === 'selected' ? form.tripIds : [],
    };

    try {
      if (isNew) {
        await orgCouponsApi.create(fields);
        toast.success('Coupon created.');
      } else {
        await orgCouponsApi.update(editingCoupon.id, fields);
        toast.success('Coupon updated.');
      }
      await refresh();
      closeModal();
    } catch (err) {
      toast.error(err?.message || 'Could not save coupon.');
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const updated = await orgCouponsApi.toggle(coupon.id);
      await refresh();
      toast.success(updated.status === 'Active' ? 'Coupon activated.' : 'Coupon paused.');
    } catch (err) {
      toast.error(err?.message || 'Could not change coupon status.');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await orgCouponsApi.remove(deleteTarget.id);
      await refresh();
      toast.success('Coupon deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete coupon.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const tripName = (id) => trips.find((t) => t.id === id)?.name || id;

  const filteredCoupons = coupons.filter((c) => {
    const matchSearch = c.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Total Coupons', value: coupons.length, color: 'text-zinc-400' },
    { label: 'Active', value: coupons.filter((c) => c.status === 'Active').length, color: 'text-emerald-500' },
    { label: 'Inactive', value: coupons.filter((c) => c.status === 'Inactive').length, color: 'text-amber-500' },
    { label: 'Expired', value: coupons.filter((c) => c.status === 'Expired').length, color: 'text-rose-500' },
  ];

  const cardCls = `rounded-2xl border ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`;
  const labelCls = `text-xs font-semibold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`;
  const inputCls = `w-full min-w-0 px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-white border-zinc-200 text-zinc-800 focus:border-spy-orange/50'
  }`;
  const errCls = (hasError) => (hasError ? 'border-rose-500 focus:border-rose-500' : '');

  const formatDiscount = (c) => {
    if (c.type === 'flat') return `₹${c.value} off`;
    return c.maxDiscount ? `${c.value}% off (up to ₹${c.maxDiscount})` : `${c.value}% off`;
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>

      {/* Header */}
      <div className={`px-5 py-4 shrink-0 flex items-center gap-3 border-b ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100 shadow-sm'}`}>
        <button
          onClick={onBack}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 ${darkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'}`}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-display font-black tracking-tight flex items-center gap-1.5">
            <TicketPercent size={15} className="text-spy-orange" /> My Coupons
          </h2>
          <p className="text-[10px] opacity-50 uppercase tracking-widest font-mono">MARKET YOUR OWN TRIPS</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-spy-orange text-white active:scale-95 transition shadow-sm shadow-spy-orange/20"
        >
          <Plus size={13} /> Create
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 pb-10">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className={`${cardCls} p-3`}>
              <div className={`text-lg font-black font-display ${stat.color}`}>{stat.value}</div>
              <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={`${cardCls} p-3 flex flex-col gap-2.5`}>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by coupon code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-8 py-2 text-xs`}
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {['All', 'Active', 'Inactive', 'Expired'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  statusFilter === s ? 'bg-spy-orange text-white shadow-sm shadow-spy-orange/30' : darkMode ? 'bg-zinc-950 text-zinc-400 border border-white/10' : 'bg-white text-zinc-500 border border-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Coupons list */}
        {filteredCoupons.length === 0 ? (
          <div className={`${cardCls} p-8 text-center text-xs font-semibold text-zinc-400`}>
            No coupons yet — create one to start marketing your trips.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredCoupons.map((c) => (
              <div key={c.id} className={`${cardCls} p-4 space-y-2.5`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-black tracking-wider text-spy-orange text-sm">{c.code}</span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold mt-1 text-zinc-500">
                      {c.type === 'flat' ? <IndianRupee size={11} /> : <Percent size={11} />}
                      <span>{formatDiscount(c)}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ${
                    c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' :
                    c.status === 'Expired' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-zinc-400">
                  <span>Applies to: {c.appliesTo === 'selected' ? `${c.tripIds.length} trip${c.tripIds.length === 1 ? '' : 's'}` : 'All My Trips'}</span>
                  <span>Expiry: {c.expiresAt || 'Never'}</span>
                  <span>Redeemed: {c.usedCount || 0}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition ${
                      darkMode ? 'border-white/10 text-zinc-300' : 'border-zinc-200 text-zinc-600'
                    }`}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(c)}
                    disabled={c.status === 'Expired'}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition ${
                      c.status === 'Expired'
                        ? 'border-zinc-100 dark:border-white/5 text-zinc-300 dark:text-zinc-700'
                        : c.status === 'Active'
                        ? 'border-amber-200 dark:border-amber-500/20 text-amber-500'
                        : 'border-emerald-200 dark:border-emerald-500/20 text-emerald-600'
                    }`}
                  >
                    {c.status === 'Active' ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Activate</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(c)}
                    className="py-2 px-3 rounded-xl text-[11px] font-bold border border-rose-200 dark:border-rose-500/20 text-rose-500 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {editingCoupon && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className={`w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar ${
            darkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-zinc-100 text-zinc-800'
          }`}>
            <button
              onClick={closeModal}
              className={`absolute top-4 right-4 p-1 rounded-lg transition ${darkMode ? 'text-zinc-400' : 'text-zinc-400'}`}
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-spy-orange" />
              <span>{editingCoupon.id ? 'Edit Coupon' : 'Create Coupon'}</span>
            </h3>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className={labelCls}>Coupon Code *</label>
                <input
                  ref={codeRef}
                  type="text"
                  placeholder="e.g. MYTREK25"
                  value={form.code}
                  onChange={(e) => { setForm((f) => ({ ...f, code: e.target.value.toUpperCase() })); setFieldErrors((er) => ({ ...er, code: '' })); }}
                  aria-invalid={!!fieldErrors.code}
                  className={`${inputCls} font-mono tracking-wider ${errCls(fieldErrors.code)}`}
                />
                {fieldErrors.code && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fieldErrors.code}</p>}
              </div>

              <div>
                <label className={labelCls}>Discount Type</label>
                <div className={`flex rounded-xl border p-1 gap-1 ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                  {[
                    { id: 'percentage', label: 'Percentage %' },
                    { id: 'flat', label: 'Flat ₹' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: opt.id }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        form.type === opt.id ? 'bg-spy-orange text-white' : darkMode ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className={labelCls}>{form.type === 'flat' ? 'Amount (₹) *' : 'Percentage (%) *'}</label>
                  <input
                    ref={valueRef}
                    type="number"
                    min="0"
                    max={form.type === 'percentage' ? 100 : undefined}
                    placeholder={form.type === 'flat' ? 'e.g. 50' : 'e.g. 20'}
                    value={form.value}
                    onChange={(e) => { setForm((f) => ({ ...f, value: e.target.value })); setFieldErrors((er) => ({ ...er, value: '' })); }}
                    aria-invalid={!!fieldErrors.value}
                    className={`${inputCls} ${errCls(fieldErrors.value)}`}
                  />
                  {fieldErrors.value && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fieldErrors.value}</p>}
                </div>
                {form.type === 'percentage' && (
                  <div className="min-w-0">
                    <label className={labelCls}>Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="No cap"
                      value={form.maxDiscount}
                      onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className={labelCls}>Min. Booking Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="No minimum"
                    value={form.minBookingAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minBookingAmount: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.maxRedemptions}
                    onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className={labelCls}>Starts On (optional)</label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => { setForm((f) => ({ ...f, expiresAt: e.target.value })); setFieldErrors((er) => ({ ...er, expiresAt: '' })); }}
                    aria-invalid={!!fieldErrors.expiresAt}
                    className={`${inputCls} ${errCls(fieldErrors.expiresAt)}`}
                  />
                  {fieldErrors.expiresAt && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fieldErrors.expiresAt}</p>}
                </div>
              </div>

              <div>
                <label className={labelCls}>Applies To</label>
                <div className={`flex rounded-xl border p-1 gap-1 ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                  {[
                    { id: 'all', label: 'All My Trips' },
                    { id: 'selected', label: 'Selected Trips' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, appliesTo: opt.id }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        form.appliesTo === opt.id ? 'bg-spy-orange text-white' : darkMode ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.appliesTo === 'selected' && (
                <div>
                  <div
                    ref={tripsRef}
                    tabIndex={-1}
                    className={`rounded-xl border max-h-40 overflow-y-auto no-scrollbar ${errCls(fieldErrors.tripIds) || (darkMode ? 'border-white/10' : 'border-zinc-200')}`}
                  >
                    {trips.length === 0 ? (
                      <div className="p-3 text-[11px] font-semibold text-zinc-400">No trips listed yet.</div>
                    ) : (
                      trips.map((t) => (
                        <label
                          key={t.id}
                          className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold cursor-pointer border-b last:border-b-0 ${
                            darkMode ? 'border-white/5' : 'border-zinc-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={form.tripIds.includes(t.id)}
                            onChange={() => { toggleTripId(t.id); setFieldErrors((er) => ({ ...er, tripIds: '' })); }}
                            className="accent-orange-500"
                          />
                          <span className="truncate">{t.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {fieldErrors.tripIds && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fieldErrors.tripIds}</p>}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                    darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-spy-orange active:scale-95 transition shadow-sm shadow-spy-orange/20"
                >
                  {editingCoupon.id ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Coupon?"
        message={`This permanently removes the coupon "${deleteTarget?.code}". Travellers will no longer be able to redeem it.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
