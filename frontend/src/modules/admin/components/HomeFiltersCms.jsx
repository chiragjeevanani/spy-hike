import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, SlidersHorizontal } from 'lucide-react';
import treksApi from '../../../lib/treksApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';

const ICONS = ['Mountain', 'Trees', 'Leaf', 'Flame', 'Compass', 'Tent', 'Sun', 'Map', 'Snowflake'];
const blank = (order = 1) => ({ label: '', icon: 'Mountain', order, active: true });

export default function HomeFiltersCms({ filters, onChange, darkMode }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openCreate = () => {
    setForm(blank(filters.length + 1));
    setEditing({});
  };

  const openEdit = (filter) => {
    setForm({ label: filter.label, icon: filter.icon, order: filter.order, active: filter.active });
    setEditing(filter);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.label.trim()) return toast.error('Filter name is required.');
    setSaving(true);
    try {
      if (editing?.id) await treksApi.updateHomeFilter(editing.id, form);
      else await treksApi.createHomeFilter(form);
      await onChange();
      setEditing(null);
      toast.success(editing?.id ? 'Homepage filter updated.' : 'Homepage filter created.');
    } catch (error) {
      toast.error(error?.message || 'Could not save homepage filter.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (filter) => {
    try {
      await treksApi.updateHomeFilter(filter.id, { active: !filter.active });
      await onChange();
      toast.success(filter.active ? 'Filter hidden from customers.' : 'Filter published.');
    } catch (error) {
      toast.error(error?.message || 'Could not update filter.');
    }
  };

  const remove = async () => {
    try {
      await treksApi.deleteHomeFilter(deleteTarget.id);
      await onChange();
      toast.success('Filter deleted and removed from assigned treks.');
    } catch (error) {
      toast.error(error?.message || 'Could not delete filter.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <section className={`rounded-2xl border p-5 ${darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[#F27D26]" /> Trek Categories & Filters
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">Create, order, publish, edit, or delete categories and filters used by organizers and hikers across Explore and Trek selection.</p>
        </div>
        <button type="button" onClick={openCreate} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#F27D26] text-white">
          <Plus size={13} /> New filter
        </button>
      </div>

      {filters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-7 text-center text-xs text-slate-400">No filters yet. “All” and “More” remain automatic.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {filters.map((filter) => (
            <div key={filter.id} className={`rounded-xl border p-3 ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-slate-50/70'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black truncate text-slate-700 dark:text-slate-200">{filter.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{filter.icon} · position {filter.order}</p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${filter.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>{filter.active ? 'Live' : 'Hidden'}</span>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button type="button" onClick={() => openEdit(filter)} className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center justify-center gap-1"><Pencil size={11} /> Edit</button>
                <button type="button" onClick={() => toggle(filter)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500" title={filter.active ? 'Hide' : 'Publish'}>{filter.active ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                <button type="button" onClick={() => setDeleteTarget(filter)} className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-500"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={save} className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black">{editing.id ? 'Edit homepage filter' : 'Create homepage filter'}</h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-400"><X size={17} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">Name</label>
                <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} maxLength={40} placeholder="e.g. Monsoon Treks" className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">Icon</label>
                  <select value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>{ICONS.map((icon) => <option key={icon}>{icon}</option>)}</select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">Display order</label>
                  <input type="number" min="0" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))} className={`w-full px-3 py-2.5 rounded-xl border text-xs outline-none ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="accent-[#F27D26]" /> Visible to customers</label>
              <button disabled={saving} className="w-full py-2.5 rounded-xl bg-[#F27D26] text-white text-xs font-bold disabled:opacity-60">{saving ? 'Saving…' : 'Save filter'}</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete homepage filter?" message={`“${deleteTarget?.label || ''}” will also be removed from every assigned trek.`} confirmLabel="Delete" tone="danger" onConfirm={remove} onCancel={() => setDeleteTarget(null)} darkMode={darkMode} />
    </section>
  );
}
