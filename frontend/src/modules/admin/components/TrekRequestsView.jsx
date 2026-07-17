import React, { useEffect, useState, useRef } from 'react';
import {
  ClipboardList, Check, X, Pencil, MapPin, Clock, Route, User, Mail, AlertCircle, Save
} from 'lucide-react';
import trekRequestsApi from '../../../lib/trekRequestsApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const DIFFICULTY_OPTIONS = ['Easy', 'Moderate', 'Difficult'];

export default function TrekRequestsView({ darkMode }) {
  const [requests, setRequests] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('Pending'); // 'Pending' or 'All'
  const [editingRequest, setEditingRequest] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageTab, setImageTab] = useState('url');
  const [imageError, setImageError] = useState(false);
  const [actionTarget, setActionTarget] = useState(null); // { request, action: 'approve' | 'reject' }
  const [actionError, setActionError] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const toast = useToast();
  const fieldRefs = useRef({});
  const FIELD_ORDER = ['title', 'location', 'durationDays', 'distanceKm', 'coverImage'];

  const refresh = () => trekRequestsApi.listAll().then(setRequests).catch(() => setRequests([]));
  useEffect(() => { refresh(); }, []);

  const pendingList = requests.filter(r => r.status === 'Pending');
  const allList = requests;

  const openEdit = (request) => {
    setForm({
      title: request.title, location: request.location, state: request.state || '', city: request.city || '',
      difficulty: request.difficulty, durationDays: String(request.durationDays), distanceKm: String(request.distanceKm),
      elevationMeters: request.elevationMeters ? String(request.elevationMeters) : '',
      coverImage: request.coverImage, category: request.category || '', description: request.description || '',
    });
    setImageTab(request.coverImage && request.coverImage.startsWith('data:') ? 'upload' : 'url');
    setImageError(false);
    setFormError('');
    setFieldErrors({});
    setEditingRequest(request);
  };

  const closeEdit = () => { setEditingRequest(null); setForm(null); };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setForm(f => ({ ...f, coverImage: reader.result })); setImageError(false); setFieldErrors(er => ({ ...er, coverImage: '' })); };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required.';
    if (!form.location.trim()) errors.location = 'Location is required.';
    if (!form.durationDays || Number(form.durationDays) <= 0) errors.durationDays = 'Duration (days) must be greater than 0.';
    if (!form.distanceKm || Number(form.distanceKm) < 0) errors.distanceKm = 'Distance (km) is required.';
    if (!form.coverImage) errors.coverImage = 'A cover image is required.';

    if (Object.keys(errors).length > 0) {
      const message = errors[FIELD_ORDER.find((f) => errors[f])];
      setFieldErrors(errors);
      setFormError(message);
      toast.error(message);
      scrollToFirstError(fieldRefs.current, errors, FIELD_ORDER);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const updated = await trekRequestsApi.update(editingRequest.id, {
        title: form.title.trim(), location: form.location.trim(), state: form.state.trim(), city: form.city.trim(),
        difficulty: form.difficulty, durationDays: Number(form.durationDays), distanceKm: Number(form.distanceKm),
        elevationMeters: form.elevationMeters ? Number(form.elevationMeters) : 0,
        coverImage: form.coverImage, category: form.category.trim(), description: form.description.trim(),
      });
      setRequests(rs => rs.map(r => (r.id === updated.id ? updated : r)));
      closeEdit();
      toast.success('Request updated successfully!');
    } catch (err) {
      const message = err?.message || 'Could not save changes.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    setActionError('');
    try {
      const { request, action } = actionTarget;
      await trekRequestsApi.setStatus(request.id, action, action === 'reject' ? rejectNote : undefined);
      await refresh();
      setActionTarget(null);
      setRejectNote('');
      toast.success(action === 'approve' ? 'Request approved and added to the catalog!' : 'Request rejected.');
    } catch (err) {
      setActionError(err?.message || 'Could not update this request.');
    }
  };

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;
  const labelCls = 'text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2';
  const inputCls = `w-full px-4 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#F27D26]/60' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#F27D26]/60'
  }`;

  const statusBadge = (status) => (
    <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${
      status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600'
        : status === 'Rejected' ? 'bg-rose-500/10 text-rose-500'
        : 'bg-amber-500/10 text-amber-500'
    }`}>
      {status}
    </span>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

      <div>
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <ClipboardList className="text-[#F27D26]" size={22} /> Category Requests
        </h1>
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">
          Treks organizers proposed because their trek wasn't in the catalog. Edit the details (e.g. the image) then approve to add it to Trek Categories, or reject.
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

      {(activeSubTab === 'Pending' ? pendingList : allList).length === 0 ? (
        <div className={`${cardCls} text-center py-12 text-slate-400`}>
          {activeSubTab === 'Pending' ? 'No pending category requests.' : 'No requests yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(activeSubTab === 'Pending' ? pendingList : allList).map((r) => (
            <div key={r.id} className={`${cardCls} p-0 overflow-hidden flex flex-col`}>
              <div className="relative h-36 shrink-0">
                <img src={r.coverImage} alt={r.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3">{statusBadge(r.status)}</div>
                <span className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow ${
                  r.difficulty === 'Difficult' ? 'bg-rose-500' : r.difficulty === 'Moderate' ? 'bg-orange-500' : 'bg-emerald-500'
                }`}>
                  {r.difficulty}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide line-clamp-1">{r.title}</h3>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                    <MapPin size={11} /> {r.location}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><Clock size={11} /> {r.durationDays}D</span>
                    <span className="flex items-center gap-1"><Route size={11} /> {r.distanceKm}km</span>
                  </div>
                  <div className={`mt-3 pt-3 border-t text-[10px] font-semibold space-y-1 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <span className="flex items-center gap-1.5 text-slate-500"><User size={11} /> {r.requestedByName || 'Organizer'}</span>
                    <span className="flex items-center gap-1.5 text-slate-400"><Mail size={11} /> {r.requestedByEmail}</span>
                  </div>
                  {r.status === 'Rejected' && r.reviewNote && (
                    <p className="mt-2 text-[10px] font-semibold text-rose-500">Reason: {r.reviewNote}</p>
                  )}
                </div>

                {r.status === 'Pending' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEdit(r)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setActionTarget({ request: r, action: 'reject' })}
                      className="flex items-center justify-center p-2 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                      title="Reject"
                    >
                      <X size={15} />
                    </button>
                    <button
                      onClick={() => setActionTarget({ request: r, action: 'approve' })}
                      className="flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all active:scale-95"
                    >
                      <Check size={14} className="mr-1" /> Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingRequest && form && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button onClick={closeEdit} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10">
              <X size={18} />
            </button>
            <h3 className="text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-1.5 shrink-0">
              <Pencil size={14} className="text-[#F27D26]" /> Edit Request Before Approving
            </h3>

            <div className="space-y-4 overflow-y-auto no-scrollbar pr-1">
              {formError && (
                <div className="flex gap-2 items-center p-2.5 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-500">
                  <AlertCircle size={13} className="shrink-0" /> {formError}
                </div>
              )}

              <div>
                <label className={labelCls}>Title *</label>
                <input
                  ref={el => { fieldRefs.current.title = { current: el }; }}
                  type="text" value={form.title}
                  onChange={(e) => { setForm(f => ({ ...f, title: e.target.value })); setFieldErrors(er => ({ ...er, title: '' })); }}
                  className={`${inputCls} ${fieldErrors.title ? 'border-rose-500 focus:border-rose-500' : ''}`}
                />
                {fieldErrors.title && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.title}</p>}
              </div>
              <div>
                <label className={labelCls}>Location *</label>
                <input
                  ref={el => { fieldRefs.current.location = { current: el }; }}
                  type="text" value={form.location}
                  onChange={(e) => { setForm(f => ({ ...f, location: e.target.value })); setFieldErrors(er => ({ ...er, location: '' })); }}
                  className={`${inputCls} ${fieldErrors.location ? 'border-rose-500 focus:border-rose-500' : ''}`}
                />
                {fieldErrors.location && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.location}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>State</label>
                  <input type="text" value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Difficulty *</label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        form.difficulty === d
                          ? d === 'Easy' ? 'bg-emerald-500 border-emerald-500 text-white'
                            : d === 'Moderate' ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-red-500 border-red-500 text-white'
                          : darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <label className={labelCls}>Duration (days) *</label>
                  <input
                    ref={el => { fieldRefs.current.durationDays = { current: el }; }}
                    type="number" min="1" value={form.durationDays}
                    onChange={(e) => { setForm(f => ({ ...f, durationDays: e.target.value })); setFieldErrors(er => ({ ...er, durationDays: '' })); }}
                    className={`${inputCls} ${fieldErrors.durationDays ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                  {fieldErrors.durationDays && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.durationDays}</p>}
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Distance (km) *</label>
                  <input
                    ref={el => { fieldRefs.current.distanceKm = { current: el }; }}
                    type="number" min="0" value={form.distanceKm}
                    onChange={(e) => { setForm(f => ({ ...f, distanceKm: e.target.value })); setFieldErrors(er => ({ ...er, distanceKm: '' })); }}
                    className={`${inputCls} ${fieldErrors.distanceKm ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                  {fieldErrors.distanceKm && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.distanceKm}</p>}
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Elevation (m)</label>
                  <input type="number" min="0" value={form.elevationMeters} onChange={(e) => setForm(f => ({ ...f, elevationMeters: e.target.value }))} className={inputCls} />
                </div>
              </div>

              <div ref={el => { fieldRefs.current.coverImage = { current: el }; }}>
                <label className={labelCls}>Cover Image *</label>
                <div className={`flex rounded-xl p-1 border mb-3 justify-around relative overflow-hidden ${
                  darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100/80 border-slate-200/60'
                }`}>
                  <button type="button" onClick={() => setImageTab('upload')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${imageTab === 'upload' ? 'bg-[#F27D26] text-white' : 'text-slate-400'}`}>
                    Upload Image
                  </button>
                  <button type="button" onClick={() => setImageTab('url')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${imageTab === 'url' ? 'bg-[#F27D26] text-white' : 'text-slate-400'}`}>
                    Image URL
                  </button>
                </div>
                {imageTab === 'upload' ? (
                  <div className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer relative transition ${
                    darkMode ? 'border-slate-800 hover:border-[#F27D26]/40 bg-slate-950/40' : 'border-slate-200 hover:border-[#F27D26]/40 bg-slate-50/50'
                  }`}>
                    <input type="file" accept="image/*" onChange={handleEditFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <p className="text-xs font-bold">Click or drag image to upload</p>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={form.coverImage && form.coverImage.startsWith('data:') ? '' : form.coverImage}
                    onChange={(e) => { setForm(f => ({ ...f, coverImage: e.target.value })); setImageError(false); setFieldErrors(er => ({ ...er, coverImage: '' })); }}
                    className={inputCls}
                  />
                )}
                {fieldErrors.coverImage && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.coverImage}</p>}
                {form.coverImage && imageError && (
                  <div className={`flex gap-2 items-center mt-3 p-2.5 rounded-xl text-[11px] font-bold ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-rose-50 border border-rose-200 text-rose-600'}`}>
                    <AlertCircle size={13} className="shrink-0" /> Couldn't load this image — check that the URL is complete and points directly to an image.
                  </div>
                )}
                {form.coverImage && (
                  <div className={`relative mt-3 rounded-xl overflow-hidden shadow-md border border-slate-200/60 dark:border-slate-800 ${imageError ? 'hidden' : ''}`}>
                    <img
                      src={form.coverImage}
                      alt="preview"
                      className="h-28 w-full object-cover"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputCls} resize-none`} />
              </div>

              <div className="flex gap-2.5 pt-2 shrink-0">
                <button
                  onClick={closeEdit}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
                    darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#F27D26] hover:bg-[#d96d1a] shadow-lg shadow-orange-500/15 active:scale-95 transition-all disabled:opacity-60"
                >
                  <Save size={13} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve / Reject confirm */}
      <ConfirmDialog
        open={!!actionTarget}
        title={actionTarget?.action === 'approve' ? 'Approve Category Request?' : 'Reject Category Request?'}
        message={
          actionTarget?.action === 'approve' ? (
            <>
              {`"${actionTarget?.request.title}" will be added to Trek Categories and become selectable by every organizer.`}
              {actionError && <div className="mt-2 text-rose-500 text-xs font-bold">{actionError}</div>}
            </>
          ) : (
            <div className="space-y-2">
              <p>{`"${actionTarget?.request.title}" will be rejected.`}</p>
              <input
                type="text"
                placeholder="Reason (optional, shown to the organizer)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-xs ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              />
              {actionError && <div className="text-rose-500 text-xs font-bold">{actionError}</div>}
            </div>
          )
        }
        confirmLabel={actionTarget?.action === 'approve' ? 'Approve' : 'Reject'}
        tone={actionTarget?.action === 'approve' ? 'default' : 'danger'}
        onConfirm={handleConfirmAction}
        onCancel={() => { setActionTarget(null); setActionError(''); setRejectNote(''); }}
        darkMode={darkMode}
      />

    </div>
  );
}
