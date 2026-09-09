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

  const cardCls = `rounded-2xl border ${darkMode ? 'bg-zinc-900/80 border-white/10 shadow-xs' : 'bg-white/90 border-zinc-200/80 shadow-xs'}`;
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
    <div className={`h-full flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3.5">
            <button
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
                <h1 className="text-lg sm:text-2xl font-display font-black tracking-tight">Discounts & Promo Coupons</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-spy-orange/15 text-spy-orange border border-spy-orange/20 shrink-0 whitespace-nowrap">
                  Marketing Studio
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Create promo codes to boost bookings and offer seasonal discounts on your expeditions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-spy-orange hover:bg-[#d96d1a] text-white active:scale-95 transition shadow-lg shadow-spy-orange/20 cursor-pointer"
          >
            <Plus size={15} /> Create Promo Coupon
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${cardCls} p-4 sm:p-5 flex items-center justify-between`}>
              <div>
                <div className={`text-2xl font-display font-black ${stat.color}`}>{stat.value}</div>
                <div className={`text-xs font-bold uppercase tracking-wider mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {stat.label}
                </div>
              </div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-zinc-500/10 ${stat.color}`}>
                <TicketPercent size={18} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters Toolbar */}
        <div className={`p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 ${cardCls}`}>
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search coupon code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-10 py-2.5 text-xs sm:text-sm`}
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {['All', 'Active', 'Inactive', 'Expired'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-spy-orange text-white shadow-sm shadow-spy-orange/30'
                    : darkMode
                      ? 'bg-zinc-950 text-zinc-400 border border-white/10 hover:bg-zinc-800'
                      : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Coupons Responsive Grid */}
        {filteredCoupons.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl ${cardCls}`}>
            <TicketPercent size={40} className="mx-auto mb-3 text-spy-orange/60" />
            <p className="text-base font-bold mb-1">No coupons found</p>
            <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Create a custom voucher code to start driving bookings for your treks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCoupons.map((c) => (
              <div
                key={c.id}
                className={`rounded-3xl p-5 space-y-4 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-lg ${cardCls}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black tracking-wider text-spy-orange text-base px-3 py-1 rounded-xl bg-spy-orange/10 border border-spy-orange/20">
                        {c.code}
                      </span>
                    </div>

                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase shrink-0 ${
                      c.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                      c.status === 'Expired' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-xl font-display font-black tracking-tight">
                      {formatDiscount(c)}
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Applies to: <strong className={darkMode ? 'text-zinc-200' : 'text-zinc-700'}>{c.appliesTo === 'selected' ? `${c.tripIds.length} select treks` : 'All My Treks'}</strong>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>
                      Expiry: {c.expiresAt || 'Ongoing'}
                    </span>
                    <span className="font-bold text-spy-orange font-mono">
                      {c.usedCount || 0}{c.maxRedemptions ? ` / ${c.maxRedemptions} used` : ' redeemed'}
                    </span>
                  </div>

                  {c.maxRedemptions && (
                    <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-spy-orange rounded-full"
                        style={{ width: `${Math.min(100, ((c.usedCount || 0) / Number(c.maxRedemptions)) * 100)}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition active:scale-95 cursor-pointer ${
                        darkMode ? 'border-white/10 hover:bg-white/5 text-zinc-200' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <Pencil size={13} /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(c)}
                      disabled={c.status === 'Expired'}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition active:scale-95 cursor-pointer ${
                        c.status === 'Expired'
                          ? 'border-zinc-200 dark:border-white/5 text-zinc-400 cursor-not-allowed'
                          : c.status === 'Active'
                          ? 'border-amber-500/20 hover:bg-amber-500/10 text-amber-500'
                          : 'border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-500'
                      }`}
                    >
                      {c.status === 'Active' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(c)}
                      className="p-2.5 rounded-xl text-xs font-bold border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
            darkMode ? 'bg-zinc-900 border-white/10 text-white' : 'bg-[#FAF8F2] border-zinc-200 text-zinc-900'
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
