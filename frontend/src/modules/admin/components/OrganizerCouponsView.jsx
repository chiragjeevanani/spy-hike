import React, { useEffect, useRef, useState } from 'react';
import {
  Search, Pencil, Trash2, Pause, Play, X, Percent, IndianRupee, Sparkles,
} from 'lucide-react';
import adminOrganizerCouponsApi from '../../../lib/adminOrganizerCouponsApi';
import tripsApi from '../../../lib/tripsApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const FIELD_ORDER = ['code', 'value', 'tripIds'];

// Admin moderation of organizer-authored coupons: edit/pause/delete only.
// Organizers remain the sole authors — there is deliberately no "Create"
// button here (see backend/src/controllers/adminOrganizerCouponController.js).
export default function OrganizerCouponsView({ darkMode }) {
  const [coupons, setCoupons] = useState([]);
  const [allTrips, setAllTrips] = useState([]);
  const [search, setSearch] = useState('');
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();

  const codeRef = useRef(null);
  const valueRef = useRef(null);
  const tripsRef = useRef(null);
  const fieldRefs = { code: codeRef, value: valueRef, tripIds: tripsRef };

  const refresh = () => adminOrganizerCouponsApi.list({ search }).then(setCoupons).catch(() => setCoupons([]));
  useEffect(() => { refresh(); }, [search]);
  useEffect(() => { tripsApi.listAllTrips().then(setAllTrips).catch(() => setAllTrips([])); }, []);

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

  const closeModal = () => { setEditingCoupon(null); setForm(null); };

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

    const errors = {};
    if (!code) errors.code = 'Enter a coupon code.';
    if (!form.value || !value || value <= 0) errors.value = 'Enter a discount value greater than 0.';
    else if (form.type === 'percentage' && value > 100) errors.value = 'Percentage discount cannot exceed 100%.';
    if (form.startsAt && form.expiresAt && form.startsAt > form.expiresAt) {
      errors.expiresAt = 'Start date must be before the expiry date.';
    }
    if (form.appliesTo === 'selected' && form.tripIds.length === 0) {
      errors.tripIds = 'Select at least one trip, or switch to "All Trips".';
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
      await adminOrganizerCouponsApi.update(editingCoupon.id, fields);
      await refresh();
      toast.success('Coupon updated.');
      closeModal();
    } catch (err) {
      toast.error(err?.message || 'Could not save coupon.');
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const updated = await adminOrganizerCouponsApi.toggle(coupon.id);
      await refresh();
      toast.success(updated.status === 'Active' ? 'Coupon activated.' : 'Coupon paused.');
    } catch (err) {
      toast.error(err?.message || 'Could not change coupon status.');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await adminOrganizerCouponsApi.remove(deleteTarget.id);
      await refresh();
      toast.success('Coupon deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete coupon.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const organizerTrips = editingCoupon ? allTrips.filter((t) => t.organizerEmail === editingCoupon.organizerEmail) : [];

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;
  const labelCls = 'text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2';
  const inputCls = `w-full min-w-0 px-4 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#F27D26]/60' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#F27D26]/60'
  }`;
  const errCls = (hasError) => (hasError ? 'border-rose-500 focus:border-rose-500' : '');

  const formatDiscount = (c) => {
    if (c.type === 'flat') return `₹${c.value} off`;
    return c.maxDiscount ? `${c.value}% off (up to ₹${c.maxDiscount})` : `${c.value}% off`;
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className={`${cardCls} py-4`}>
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code or organizer email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-xs font-semibold transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-[#F27D26]/60' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#F27D26]/60'
            }`}
          />
        </div>
      </div>

      {/* Table */}
      <div className={`${cardCls} overflow-hidden p-0 border border-slate-100 dark:border-slate-800`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <th className="py-3.5 px-6">Organizer</th>
                <th className="py-3.5 px-6">Code</th>
                <th className="py-3.5 px-6">Discount</th>
                <th className="py-3.5 px-6">Applies To</th>
                <th className="py-3.5 px-6">Expiry</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Redeemed</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${darkMode ? 'divide-slate-850' : 'divide-slate-100'}`}>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">
                    No organizer coupons found.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="py-4 px-6 text-slate-500">{c.organizerEmail}</td>
                    <td className="py-4 px-6">
                      <span className="font-mono font-black tracking-wider text-[#F27D26]">{c.code}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        {c.type === 'flat' ? <IndianRupee size={12} className="text-slate-400" /> : <Percent size={12} className="text-slate-400" />}
                        <span>{formatDiscount(c)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {c.appliesTo === 'selected' ? `${c.tripIds.length} trip${c.tripIds.length === 1 ? '' : 's'}` : 'All Trips'}
                    </td>
                    <td className="py-4 px-6 text-slate-400">{c.expiresAt || 'Never'}</td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                        c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' :
                        c.status === 'Expired' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {c.usedCount || 0}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all"
                        title="Edit Coupon"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        disabled={c.status === 'Expired'}
                        className={`p-1.5 rounded-lg border transition-all ${
                          c.status === 'Expired'
                            ? 'border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : c.status === 'Active'
                            ? 'border-amber-100 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                            : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                        title={c.status === 'Expired' ? 'Renew expiry to reactivate' : c.status === 'Active' ? 'Mark Inactive' : 'Mark Active'}
                      >
                        {c.status === 'Active' ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                        title="Delete Coupon"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editingCoupon && form && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative animate-scaleIn max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#F27D26]" />
              <span>Edit Organizer Coupon</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-5">{editingCoupon.organizerEmail}</p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className={labelCls}>Coupon Code *</label>
                <input
                  ref={codeRef}
                  type="text"
                  value={form.code}
                  onChange={(e) => { setForm((f) => ({ ...f, code: e.target.value.toUpperCase() })); setFieldErrors((er) => ({ ...er, code: '' })); }}
                  aria-invalid={!!fieldErrors.code}
                  className={`${inputCls} font-mono tracking-wider ${errCls(fieldErrors.code)}`}
                />
                {fieldErrors.code && <p className="text-[11px] font-semibold text-rose-500 mt-1">{fieldErrors.code}</p>}
              </div>

              <div>
                <label className={labelCls}>Discount Type</label>
                <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 gap-1">
                  {[
                    { id: 'percentage', label: 'Percentage %' },
                    { id: 'flat', label: 'Flat ₹' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: opt.id }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        form.type === opt.id ? 'bg-[#F27D26] text-white' : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'
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
                  <label className={labelCls}>Starts On</label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Expiry Date</label>
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
                <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 gap-1">
                  {[
                    { id: 'all', label: 'All Trips' },
                    { id: 'selected', label: 'Selected Trips' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, appliesTo: opt.id }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        form.appliesTo === opt.id ? 'bg-[#F27D26] text-white' : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'
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
                    className={`rounded-xl border max-h-40 overflow-y-auto ${errCls(fieldErrors.tripIds) || 'border-slate-200 dark:border-slate-800'}`}
                  >
                    {organizerTrips.length === 0 ? (
                      <div className="p-3 text-[11px] font-semibold text-slate-400">This organizer has no trips listed.</div>
                    ) : (
                      organizerTrips.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={form.tripIds.includes(t.id)}
                            onChange={() => { toggleTripId(t.id); setFieldErrors((er) => ({ ...er, tripIds: '' })); }}
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
                    darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#F27D26] hover:bg-[#d96d1a] shadow-lg shadow-orange-500/15 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Coupon?"
        message={`This permanently removes "${deleteTarget?.code}" from ${deleteTarget?.organizerEmail}. Travellers will no longer be able to redeem it.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
