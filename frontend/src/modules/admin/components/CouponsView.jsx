import React, { useEffect, useState } from 'react';
import {
  TicketPercent, Plus, Search, Pencil, Trash2, Pause, Play, X, Percent, IndianRupee, Sparkles
} from 'lucide-react';
import couponsApi from '../../../lib/couponsApi';
import ConfirmDialog from '../../../components/ConfirmDialog';

const emptyForm = () => ({
  code: '',
  type: 'percentage',
  value: '',
  maxDiscount: '',
  minBookingAmount: '',
  expiresAt: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })(),
});

export default function CouponsView({ darkMode }) {
  const [coupons, setCoupons] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingCoupon, setEditingCoupon] = useState(null); // null = closed, {} = new, {...} = edit
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const refresh = () => couponsApi.list().then(setCoupons).catch(() => setCoupons([]));
  useEffect(() => { refresh(); }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setEditingCoupon({});
  };

  const openEdit = (coupon) => {
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value ?? ''),
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : '',
      minBookingAmount: coupon.minBookingAmount ? String(coupon.minBookingAmount) : '',
      expiresAt: coupon.expiresAt || '',
    });
    setFormError('');
    setEditingCoupon(coupon);
  };

  const closeModal = () => setEditingCoupon(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);

    if (!code) return setFormError('Enter a coupon code.');
    if (!value || value <= 0) return setFormError('Enter a discount value greater than 0.');
    if (form.type === 'percentage' && value > 100) return setFormError('Percentage discount cannot exceed 100%.');
    if (!form.expiresAt) return setFormError('Set an expiry date.');

    const isNew = !editingCoupon.id;
    const duplicate = coupons.some(c => c.code === code && (isNew || c.id !== editingCoupon.id));
    if (duplicate) return setFormError('A coupon with this code already exists.');

    const fields = {
      code,
      type: form.type,
      value,
      maxDiscount: form.type === 'percentage' && form.maxDiscount ? Number(form.maxDiscount) : null,
      minBookingAmount: form.minBookingAmount ? Number(form.minBookingAmount) : 0,
      expiresAt: form.expiresAt,
    };

    try {
      if (isNew) {
        await couponsApi.create(fields);
      } else {
        await couponsApi.update(editingCoupon.id, fields);
      }
      await refresh();
      closeModal();
    } catch (err) {
      setFormError(err?.message || 'Could not save coupon.');
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      await couponsApi.toggle(coupon.id);
      await refresh();
    } catch (err) {
      alert(err?.message || 'Could not change coupon status.');
    }
  };

  const handleConfirmDelete = async () => {
    await couponsApi.remove(deleteTarget.id);
    await refresh();
    setDeleteTarget(null);
  };

  const filteredCoupons = coupons.filter(c => {
    const matchSearch = c.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Total Coupons', value: coupons.length, color: 'text-slate-500' },
    { label: 'Active', value: coupons.filter(c => c.status === 'Active').length, color: 'text-emerald-500' },
    { label: 'Inactive', value: coupons.filter(c => c.status === 'Inactive').length, color: 'text-amber-500' },
    { label: 'Expired', value: coupons.filter(c => c.status === 'Expired').length, color: 'text-rose-500' },
  ];

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode
      ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20'
      : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;
  const labelCls = 'text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2';
  const inputCls = `w-full px-4 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
    darkMode
      ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#F27D26]/60'
      : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#F27D26]/60'
  }`;

  const formatDiscount = (c) => {
    if (c.type === 'flat') return `₹${c.value} off`;
    return c.maxDiscount ? `${c.value}% off (up to ₹${c.maxDiscount})` : `${c.value}% off`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <TicketPercent className="text-[#F27D26]" size={22} /> Coupons & Discounts
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">
            Create flat or percentage discount codes, set an expiry, and pause/resume them anytime.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F27D26] hover:bg-[#d96d1a] text-white shadow-lg shadow-orange-500/15 active:scale-95 transition-all"
        >
          <Plus size={14} />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className={`text-xl font-black font-display ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className={`${cardCls} py-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by coupon code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-xs font-semibold transition-all ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-[#F27D26]/60'
                : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#F27D26]/60'
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Coupons table */}
      <div className={`${cardCls} overflow-hidden p-0 border border-slate-100 dark:border-slate-800`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <th className="py-3.5 px-6">Code</th>
                <th className="py-3.5 px-6">Discount</th>
                <th className="py-3.5 px-6">Min. Booking</th>
                <th className="py-3.5 px-6">Expiry</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Redemptions</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-semibold ${darkMode ? 'divide-slate-850' : 'divide-slate-100'}`}>
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No coupons matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
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
                      {c.minBookingAmount ? `₹${c.minBookingAmount}+` : '—'}
                    </td>
                    <td className="py-4 px-6 text-slate-400">
                      {c.expiresAt || 'Never'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                        c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' :
                        c.status === 'Expired' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400">{c.usedCount || 0}</td>
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

      {/* Create / Edit modal */}
      {editingCoupon && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#F27D26]" />
              <span>{editingCoupon.id ? 'Edit Coupon' : 'Create Coupon'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-2.5 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-500">
                  {formError}
                </div>
              )}

              <div>
                <label className={labelCls}>Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. SUMMER25"
                  value={form.code}
                  onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className={`${inputCls} font-mono tracking-wider`}
                />
              </div>

              <div>
                <label className={labelCls}>Discount Type</label>
                <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 gap-1">
                  {[
                    { id: 'percentage', label: 'Percentage %' },
                    { id: 'flat', label: 'Flat ₹' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: opt.id }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        form.type === opt.id
                          ? 'bg-[#F27D26] text-white'
                          : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{form.type === 'flat' ? 'Amount (₹)' : 'Percentage (%)'}</label>
                  <input
                    type="number"
                    min="0"
                    max={form.type === 'percentage' ? 100 : undefined}
                    placeholder={form.type === 'flat' ? 'e.g. 50' : 'e.g. 20'}
                    value={form.value}
                    onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                {form.type === 'percentage' && (
                  <div>
                    <label className={labelCls}>Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="No cap"
                      value={form.maxDiscount}
                      onChange={(e) => setForm(f => ({ ...f, maxDiscount: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Min. Booking Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="No minimum"
                    value={form.minBookingAmount}
                    onChange={(e) => setForm(f => ({ ...f, minBookingAmount: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

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
