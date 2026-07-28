import React, { useEffect, useState, useRef } from 'react';
import {
  Mountain, Plus, Search, Pencil, Trash2, Pause, Play, X, MapPin, Clock, Route, ImagePlus, AlertCircle, Flame
} from 'lucide-react';
import treksApi from '../../../lib/treksApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

import { compressImage } from '../../../utils/imageCompressor';

const DIFFICULTY_OPTIONS = ['Easy', 'Moderate', 'Difficult'];

const emptyForm = () => ({
  title: '', location: '', startingPoint: '', state: '', city: '',
  difficulty: 'Moderate', durationDays: '', distanceKm: '', elevationMeters: '',
  coverImage: '', category: '', description: '',
  itinerary: [{ day: 1, title: 'Arrival & Base Camp Assembly', description: 'Reach base camp, meet trek guides, and prepare gear.' }],
  thingsToCarry: [
    'Personal medication (if any)',
    'Strong backpack (Preferably water proof)',
    'Fresh pair of clothes',
    'Toiletries',
    'Water bottles (at least 2 liters)',
    'Torch with new batteries',
    'Rain Coat (Highly Suggested)',
    'Shoes with good grip'
  ],
  included: [
    'Forest permission & entry permits',
    'Transport from base city to trek start point',
    'Accommodation in Geodesic Tents / Homestays',
    'Veg Meals during trek',
    'Certified Sherpa Guides & Safety Equipment'
  ],
  notIncluded: [
    'GST 5%',
    'Personal luggage offloading charges',
    'Medical emergency evacuation costs'
  ],
});

export default function TreksView({ darkMode }) {
  const [treks, setTreks] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [trendingFilter, setTrendingFilter] = useState('All');
  const [editingTrek, setEditingTrek] = useState(null); // null = closed, {} = new, {...} = edit
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [imageTab, setImageTab] = useState('upload');
  const [imageError, setImageError] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const fieldRefs = useRef({});
  const FIELD_ORDER = ['title', 'location', 'durationDays', 'distanceKm', 'coverImage'];

  const refresh = () => treksApi.listAllTreks().then(setTreks).catch(() => setTreks([]));
  useEffect(() => { refresh(); }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError('');
    setFieldErrors({});
    setImageTab('upload');
    setImageError(false);
    setEditingTrek({});
  };

  const openEdit = (trek) => {
    setForm({
      title: trek.title || '',
      location: trek.location || '',
      startingPoint: trek.startingPoint || '',
      state: trek.state || '',
      city: trek.city || '',
      difficulty: trek.difficulty || 'Moderate',
      durationDays: String(trek.durationDays ?? ''),
      distanceKm: String(trek.distanceKm ?? ''),
      elevationMeters: trek.elevationMeters ? String(trek.elevationMeters) : '',
      coverImage: trek.coverImage || '',
      category: trek.category || '',
      description: trek.description || '',
      itinerary: trek.itinerary && trek.itinerary.length ? trek.itinerary : [{ day: 1, title: 'Day 1 Assembly', description: 'Reach base location.' }],
      thingsToCarry: trek.thingsToCarry && trek.thingsToCarry.length ? trek.thingsToCarry : ['Strong backpack', 'Shoes with good grip', 'Water bottles'],
      included: trek.included && trek.included.length ? trek.included : ['Forest permits', 'Certified Guide'],
      notIncluded: trek.notIncluded && trek.notIncluded.length ? trek.notIncluded : ['Personal expenses', 'GST'],
    });
    setFormError('');
    setFieldErrors({});
    setImageTab(trek.coverImage && trek.coverImage.startsWith('data:') ? 'upload' : 'url');
    setImageError(false);
    setEditingTrek(trek);
  };

  const closeModal = () => setEditingTrek(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      compressImage(file)
        .then((compressedUrl) => {
          setForm((f) => ({ ...f, coverImage: compressedUrl }));
          setImageError(false);
          setFieldErrors((er) => ({ ...er, coverImage: '' }));
        })
        .catch(() => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setForm((f) => ({ ...f, coverImage: reader.result }));
            setImageError(false);
            setFieldErrors((er) => ({ ...er, coverImage: '' }));
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    const fields = {
      title: form.title.trim(),
      location: form.location.trim(),
      startingPoint: form.startingPoint.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      difficulty: form.difficulty,
      durationDays: Number(form.durationDays),
      distanceKm: Number(form.distanceKm),
      elevationMeters: form.elevationMeters ? Number(form.elevationMeters) : 0,
      coverImage: form.coverImage,
      category: form.category.trim(),
      description: form.description.trim(),
      itinerary: form.itinerary.filter(i => i.title.trim()),
      thingsToCarry: form.thingsToCarry.filter(t => t.trim()),
      included: form.included.filter(i => i.trim()),
      notIncluded: form.notIncluded.filter(i => i.trim()),
    };

    setSaving(true);
    try {
      if (editingTrek.id) {
        await treksApi.updateTrek(editingTrek.id, fields);
      } else {
        await treksApi.createTrek(fields);
      }
      await refresh();
      closeModal();
      toast.success(editingTrek.id ? 'Trek updated successfully!' : 'Trek added to catalog!');
    } catch (err) {
      const message = err?.message || 'Could not save trek.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (trek) => {
    try {
      await treksApi.updateTrek(trek.id, { status: trek.status === 'Active' ? 'Inactive' : 'Active' });
      await refresh();
      toast.success(trek.status === 'Active' ? 'Trek hidden from organizer picker.' : 'Trek made available to organizers.');
    } catch (err) {
      toast.error(err?.message || 'Could not change trek status.');
    }
  };

  const handleToggleTrending = async (trek) => {
    try {
      await treksApi.updateTrek(trek.id, { trending: !trek.trending });
      await refresh();
      toast.success(trek.trending ? 'Removed from trending destinations.' : 'Added to trending destinations!');
    } catch (err) {
      toast.error(err?.message || 'Could not update trending status.');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await treksApi.deleteTrek(deleteTarget.id);
      await refresh();
      toast.success('Trek deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete trek.');
    }
    setDeleteTarget(null);
  };

  const filteredTreks = treks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchTrending = trendingFilter === 'All' || (trendingFilter === 'Trending' ? t.trending : !t.trending);
    return matchSearch && matchStatus && matchTrending;
  });

  const cardCls = `p-6 rounded-2xl border transition-all duration-300 shadow-sm ${
    darkMode ? 'bg-[#152243] border-slate-800 text-white shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-800 shadow-slate-100/50'
  }`;
  const labelCls = 'text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2';
  const inputCls = `w-full px-4 py-2.5 rounded-xl border outline-none text-xs font-semibold transition-all ${
    darkMode ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#F27D26]/60' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#F27D26]/60'
  }`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

      {/* Title */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Mountain className="text-[#F27D26]" size={22} /> Trek Categories
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">
            The curated trek category catalog organizers choose from when posting a trip — title, location, difficulty, duration, distance and image are set here. Mark a category Trending to headline it on the customer app's home page.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F27D26] hover:bg-[#d96d1a] text-white shadow-lg shadow-orange-500/15 active:scale-95 transition-all"
        >
          <Plus size={14} />
          <span>Add Trek Category</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className={`${cardCls} py-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or location..."
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
            className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Trending</span>
          <select
            value={trendingFilter}
            onChange={(e) => setTrendingFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border outline-none text-xs font-semibold ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="All">All Categories</option>
            <option value="Trending">Trending Only</option>
            <option value="Not Trending">Not Trending</option>
          </select>
        </div>
      </div>

      {/* Treks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTreks.length === 0 ? (
          <div className={`${cardCls} col-span-3 text-center py-12 text-slate-400`}>
            No treks matching criteria found.
          </div>
        ) : (
          filteredTreks.map((trek) => (
            <div key={trek.id} className={`${cardCls} p-0 overflow-hidden flex flex-col`}>
              <div className="relative h-36 shrink-0">
                <img src={trek.coverImage} alt={trek.title} className="w-full h-full object-cover" />
                <span className={`absolute top-3 left-3 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow ${
                  trek.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'
                }`}>
                  {trek.status}
                </span>
                <span className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow ${
                  trek.difficulty === 'Difficult' ? 'bg-rose-500' : trek.difficulty === 'Moderate' ? 'bg-orange-500' : 'bg-emerald-500'
                }`}>
                  {trek.difficulty}
                </span>
                {trek.trending && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full text-white shadow bg-pink-500" title="Trending destination">
                      <Flame size={11} className="fill-white" />
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide line-clamp-1">{trek.title}</h3>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                    <MapPin size={11} /> {trek.location}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><Clock size={11} /> {trek.durationDays}D</span>
                    <span className="flex items-center gap-1"><Route size={11} /> {trek.distanceKm}km</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => openEdit(trek)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleTrending(trek)}
                    className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1 transition-all ${
                      trek.trending
                        ? 'border-pink-500 bg-pink-500 text-white'
                        : 'border-pink-100 dark:border-pink-500/20 text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10'
                    }`}
                    title={trek.trending ? 'Remove from trending destinations' : 'Add to trending destinations'}
                  >
                    <Flame size={12} className={trek.trending ? 'fill-white' : ''} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(trek)}
                    className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1 transition-all ${
                      trek.status === 'Active'
                        ? 'border-amber-100 dark:border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                        : 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    }`}
                    title={trek.status === 'Active' ? 'Hide from organizer picker' : 'Make available to organizers'}
                  >
                    {trek.status === 'Active' ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(trek)}
                    className="p-2 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit modal */}
      {editingTrek && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-scaleIn ${
            darkMode ? 'bg-[#152243] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-1.5 shrink-0">
              <Mountain size={14} className="text-[#F27D26]" />
              <span>{editingTrek.id ? 'Edit Trek' : 'Add Trek'}</span>
            </h3>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 overflow-y-auto no-scrollbar pr-1">
              {formError && (
                <div className="flex gap-2 items-center p-2.5 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-500">
                  <AlertCircle size={13} className="shrink-0" /> {formError}
                </div>
              )}

              <div>
                <label className={labelCls}>Title *</label>
                <input
                  ref={el => { fieldRefs.current.title = { current: el }; }}
                  type="text"
                  placeholder="e.g. KedarKantha"
                  value={form.title}
                  onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFieldErrors(er => ({ ...er, title: '' })); }}
                  className={`${inputCls} ${fieldErrors.title ? 'border-rose-500 focus:border-rose-500' : ''}`}
                />
                {fieldErrors.title && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.title}</p>}
              </div>

              <div>
                <label className={labelCls}>Location *</label>
                <input
                  ref={el => { fieldRefs.current.location = { current: el }; }}
                  type="text"
                  placeholder="e.g. Sankri, Uttarakhand"
                  value={form.location}
                  onChange={(e) => { setForm((f) => ({ ...f, location: e.target.value })); setFieldErrors(er => ({ ...er, location: '' })); }}
                  className={`${inputCls} ${fieldErrors.location ? 'border-rose-500 focus:border-rose-500' : ''}`}
                />
                {fieldErrors.location && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.location}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>State</label>
                  <input type="text" placeholder="Uttarakhand" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" placeholder="Sankri" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Difficulty *</label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
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
                    type="number" min="1" placeholder="5" value={form.durationDays}
                    onChange={(e) => { setForm((f) => ({ ...f, durationDays: e.target.value })); setFieldErrors(er => ({ ...er, durationDays: '' })); }}
                    className={`${inputCls} ${fieldErrors.durationDays ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                  {fieldErrors.durationDays && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.durationDays}</p>}
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Distance (km) *</label>
                  <input
                    ref={el => { fieldRefs.current.distanceKm = { current: el }; }}
                    type="number" min="0" placeholder="20" value={form.distanceKm}
                    onChange={(e) => { setForm((f) => ({ ...f, distanceKm: e.target.value })); setFieldErrors(er => ({ ...er, distanceKm: '' })); }}
                    className={`${inputCls} ${fieldErrors.distanceKm ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                  {fieldErrors.distanceKm && <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.distanceKm}</p>}
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Elevation (m)</label>
                  <input type="number" min="0" placeholder="3800" value={form.elevationMeters} onChange={(e) => setForm((f) => ({ ...f, elevationMeters: e.target.value }))} className={inputCls} />
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
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <ImagePlus size={22} className="mx-auto mb-2 text-[#F27D26]/80" />
                    <p className="text-xs font-bold">Click or drag image to upload</p>
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.coverImage && form.coverImage.startsWith('data:') ? '' : form.coverImage}
                    onChange={(e) => { setForm((f) => ({ ...f, coverImage: e.target.value })); setImageError(false); setFieldErrors(er => ({ ...er, coverImage: '' })); }}
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
                    <button
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, coverImage: '' })); setImageError(false); }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={3} placeholder="Optional trek overview shown on its public page..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${inputCls} resize-none`} />
              </div>

              <div className="flex gap-2.5 pt-2 shrink-0">
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
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#F27D26] hover:bg-[#d96d1a] shadow-lg shadow-orange-500/15 active:scale-95 transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingTrek.id ? 'Save Changes' : 'Add Trek'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Trek?"
        message={`This permanently removes "${deleteTarget?.title}" from the catalog. Blocked if any trips are still posted under it.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        darkMode={darkMode}
      />

    </div>
  );
}
