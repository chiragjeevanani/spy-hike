/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Minus, ChevronDown, ChevronUp, ImagePlus, Check, Info, MapPin, DollarSign, Users, Calendar, Mountain, AlignLeft, List, AlertCircle, Trash2 } from 'lucide-react';

const DIFFICULTY_OPTIONS = ['Easy', 'Moderate', 'Difficult'];
const CATEGORY_OPTIONS = ['Trekking', 'Summit', 'Desert', 'Camping', 'Wildlife', 'Cultural'];
const INCLUDED_DEFAULTS = ['Tents', 'Meals (Veg)', 'Certified Guide', 'Permits', 'First Aid Kit'];
const ADDON_DEFAULTS = ['Porter Service', 'Photography Service', 'Gear Rental Kit', 'High-Altitude Health Pack'];

export default function TripFormView({ trip = null, organizerEmail, onSave, onBack, darkMode }) {
  const isEdit = !!trip;

  const [form, setForm] = useState({
    name: trip?.name || '',
    location: trip?.location || '',
    state: trip?.state || '',
    city: trip?.city || '',
    price: trip?.price || '',
    difficulty: trip?.difficulty || 'Moderate',
    durationDays: trip?.durationDays || 3,
    maxGroupSize: trip?.maxGroupSize || 15,
    availableSeats: trip?.availableSeats || 15,
    distanceKm: trip?.distanceKm || '',
    elevationMeters: trip?.elevationMeters || '',
    category: trip?.category || 'Trekking',
    coverImage: trip?.coverImage || '',
    description: trip?.description || '',
    highlights: trip?.highlights || [''],
    included: trip?.included || [...INCLUDED_DEFAULTS],
    notIncluded: trip?.notIncluded || ['Personal equipment', 'Travel to base camp'],
    addOns: trip?.addOns || [...ADDON_DEFAULTS],
    safetyGuidelines: trip?.safetyGuidelines || [''],
    cancellationPolicy: trip?.cancellationPolicy || ['Full refund 7 days prior', '50% refund 3 days prior', 'No refund within 3 days'],
    itinerary: trip?.itinerary || [{ day: 1, title: '', description: '' }],
    faqs: trip?.faqs || [{ question: '', answer: '' }],
    status: trip?.status || 'Draft',
    galleryImages: trip?.galleryImages || [],
  });

  const [section, setSection] = useState('basic');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageTab, setImageTab] = useState(trip?.coverImage && !trip.coverImage.startsWith('data:') ? 'url' : 'upload');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        set('coverImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'details', label: 'Trip Details' },
    { id: 'inclusions', label: 'Inclusions' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'faqs', label: 'FAQs' },
  ];

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const setListItem = (key, idx, val) => {
    const arr = [...form[key]];
    arr[idx] = val;
    set(key, arr);
  };

  const setItineraryItem = (idx, field, val) => {
    const arr = [...form.itinerary];
    arr[idx] = { ...arr[idx], [field]: val };
    set('itinerary', arr);
  };

  const setFaqItem = (idx, field, val) => {
    const arr = [...form.faqs];
    arr[idx] = { ...arr[idx], [field]: val };
    set('faqs', arr);
  };

  const handleSave = async (status = form.status) => {
    if (!form.name || !form.location || !form.price) {
      setErrors({ basic: 'Trip name, location, and price are required.' });
      setSection('basic');
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));

    const savedTrip = {
      ...form,
      id: trip?.id || `org-trip-${Date.now()}`,
      organizerEmail,
      price: parseFloat(form.price) || 0,
      durationDays: parseInt(form.durationDays) || 1,
      maxGroupSize: parseInt(form.maxGroupSize) || 10,
      availableSeats: parseInt(form.availableSeats) || 10,
      distanceKm: parseFloat(form.distanceKm) || 0,
      elevationMeters: parseFloat(form.elevationMeters) || 0,
      highlights: form.highlights.filter(h => h.trim()),
      safetyGuidelines: form.safetyGuidelines.filter(g => g.trim()),
      coverImage: form.coverImage || `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80`,
      galleryImages: form.galleryImages.length > 0 ? form.galleryImages : [form.coverImage || `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80`],
      status,
      rating: trip?.rating || 0,
      reviewsCount: trip?.reviewsCount || 0,
      reviews: trip?.reviews || [],
      createdAt: trip?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(false);
    onSave(savedTrip);
  };

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/50'
  }`;
  const labelCls = `text-xs font-semibold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`;
  const cardCls = `rounded-2xl p-4 space-y-4 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`;

  const renderBasic = () => (
    <div className="space-y-4">
      {errors.basic && (
        <div className={`flex gap-2 items-center p-3 rounded-xl text-xs ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          <AlertCircle size={14} /> {errors.basic}
        </div>
      )}
      <div className={cardCls}>
        <div>
          <label className={labelCls}>Trip Name *</label>
          <input type="text" className={inputCls} placeholder="e.g. Kedarkantha Winter Summit" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Full Location *</label>
          <input type="text" className={inputCls} placeholder="e.g. Sankri, Uttarkashi, Uttarakhand" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>State</label>
            <input type="text" className={inputCls} placeholder="Uttarakhand" value={form.state} onChange={e => set('state', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input type="text" className={inputCls} placeholder="Sankri" value={form.city} onChange={e => set('city', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Cover Image</label>
          <div className={`flex rounded-xl p-1 border mb-3 justify-around relative overflow-hidden ${
            darkMode ? 'bg-zinc-950/40 border-white/5' : 'bg-zinc-100/80 border-zinc-200/60'
          }`}>
            <button
              type="button"
              onClick={() => setImageTab('upload')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative z-10 ${
                imageTab === 'upload' ? 'bg-spy-orange text-white' : 'text-zinc-400 hover:text-zinc-500'
              }`}
            >
              Upload Image
            </button>
            <button
              type="button"
              onClick={() => setImageTab('url')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative z-10 ${
                imageTab === 'url' ? 'bg-spy-orange text-white' : 'text-zinc-400 hover:text-zinc-500'
              }`}
            >
              Image URL
            </button>
          </div>

          {imageTab === 'upload' ? (
            <div className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer relative transition ${
              darkMode ? 'border-white/10 hover:border-spy-orange/40 bg-zinc-950/40' : 'border-zinc-200 hover:border-spy-orange/40 bg-zinc-50/50'
            }`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <ImagePlus size={24} className="mx-auto mb-2 text-spy-orange/80" />
              <p className="text-xs font-bold mb-1">Click or drag image to upload</p>
              <p className={`text-[10px] ${darkMode ? 'text-zinc-550' : 'text-zinc-400'}`}>Supports PNG, JPG, WEBP (Max 5MB)</p>
            </div>
          ) : (
            <input type="url" className={inputCls} placeholder="https://..." value={form.coverImage && form.coverImage.startsWith('data:') ? '' : form.coverImage} onChange={e => set('coverImage', e.target.value)} />
          )}

          {form.coverImage && (
            <div className="relative mt-3 rounded-xl overflow-hidden shadow-md group border border-zinc-200/60 dark:border-white/5">
              <img src={form.coverImage} alt="preview" className="h-28 w-full object-cover" onError={e => e.target.style.display='none'} />
              <button
                type="button"
                onClick={() => set('coverImage', '')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Gallery Images Manager */}
        <div>
          <label className={labelCls}>Gallery Images (Trip Details Slider)</label>
          
          <div className="grid grid-cols-4 gap-2 mb-3">
            {form.galleryImages.map((img, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-zinc-250/60 dark:border-white/5">
                <img src={img} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    const updated = form.galleryImages.filter((_, i) => i !== idx);
                    set('galleryImages', updated);
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            {/* Add new photo square button */}
            <label className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
              darkMode ? 'border-white/10 hover:border-spy-orange/40 bg-zinc-950/40' : 'border-zinc-200 hover:border-spy-orange/40 bg-zinc-55 hover:bg-zinc-100'
            }`}>
              <Plus size={16} className="text-spy-orange" />
              <span className="text-[8px] font-bold mt-0.5 text-zinc-400">Add Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      set('galleryImages', [...form.galleryImages, reader.result]);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
          
          {/* Paste URL inline helper */}
          <div className="flex gap-2">
            <input
              type="url"
              id="gallery-url-input"
              placeholder="Or paste gallery image URL here..."
              className={`${inputCls} text-xs py-2`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.target.value.trim()) {
                    set('galleryImages', [...form.galleryImages, e.target.value.trim()]);
                    e.target.value = '';
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('gallery-url-input');
                if (input && input.value.trim()) {
                  set('galleryImages', [...form.galleryImages, input.value.trim()]);
                  input.value = '';
                }
              }}
              className={`px-4 rounded-xl text-xs font-bold transition ${
                darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
              }`}
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Describe the trek experience..." value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-4">
      <div className={cardCls}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Price per person (₹) *</label>
            <input type="number" className={inputCls} placeholder="8500" value={form.price} onChange={e => set('price', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Duration (days)</label>
            <input type="number" min="1" max="30" className={inputCls} value={form.durationDays} onChange={e => set('durationDays', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Max Group Size</label>
            <input type="number" min="1" max="100" className={inputCls} value={form.maxGroupSize} onChange={e => set('maxGroupSize', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Available Seats</label>
            <input type="number" min="0" className={inputCls} value={form.availableSeats} onChange={e => set('availableSeats', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Distance (km)</label>
            <input type="number" className={inputCls} placeholder="20" value={form.distanceKm} onChange={e => set('distanceKm', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Max Elevation (m)</label>
            <input type="number" className={inputCls} placeholder="3800" value={form.elevationMeters} onChange={e => set('elevationMeters', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Difficulty Level</label>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => set('difficulty', d)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  form.difficulty === d
                    ? d === 'Easy' ? 'bg-emerald-500 border-emerald-500 text-white'
                      : d === 'Moderate' ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-red-500 border-red-500 text-white'
                    : darkMode ? 'border-white/10 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('category', c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  form.category === c ? 'bg-spy-orange border-spy-orange text-white' : darkMode ? 'border-white/10 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <label className={labelCls}>Trip Highlights</label>
          <button type="button" onClick={() => set('highlights', [...form.highlights, ''])} className="text-spy-orange">
            <Plus size={16} />
          </button>
        </div>
        {form.highlights.map((h, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" className={`${inputCls} flex-1`} placeholder={`Highlight ${i + 1}`} value={h} onChange={e => setListItem('highlights', i, e.target.value)} />
            {form.highlights.length > 1 && (
              <button type="button" onClick={() => set('highlights', form.highlights.filter((_, ii) => ii !== i))} className="text-red-400 px-2">
                <Minus size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderInclusions = () => (
    <div className="space-y-4">
      {/* Included */}
      <div className={cardCls}>
        <label className={`${labelCls} text-emerald-400`}>Included in Price</label>
        {form.included.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Check size={13} className="text-emerald-400 shrink-0" />
            <input type="text" className={`${inputCls} flex-1`} value={item} onChange={e => setListItem('included', i, e.target.value)} />
            <button type="button" onClick={() => set('included', form.included.filter((_, ii) => ii !== i))} className="text-red-400"><Minus size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => set('included', [...form.included, ''])} className="text-xs text-spy-orange font-semibold flex items-center gap-1">
          <Plus size={13} /> Add item
        </button>
      </div>

      {/* Not included */}
      <div className={cardCls}>
        <label className={`${labelCls} text-red-400`}>Not Included</label>
        {form.notIncluded.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Minus size={13} className="text-red-400 shrink-0" />
            <input type="text" className={`${inputCls} flex-1`} value={item} onChange={e => setListItem('notIncluded', i, e.target.value)} />
            <button type="button" onClick={() => set('notIncluded', form.notIncluded.filter((_, ii) => ii !== i))} className="text-red-400"><Minus size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => set('notIncluded', [...form.notIncluded, ''])} className="text-xs text-spy-orange font-semibold flex items-center gap-1">
          <Plus size={13} /> Add item
        </button>
      </div>

      {/* Cancellation policy */}
      <div className={cardCls}>
        <label className={labelCls}>Cancellation Policy</label>
        {form.cancellationPolicy.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" className={`${inputCls} flex-1`} value={item} onChange={e => setListItem('cancellationPolicy', i, e.target.value)} />
            <button type="button" onClick={() => set('cancellationPolicy', form.cancellationPolicy.filter((_, ii) => ii !== i))} className="text-red-400"><Minus size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => set('cancellationPolicy', [...form.cancellationPolicy, ''])} className="text-xs text-spy-orange font-semibold flex items-center gap-1">
          <Plus size={13} /> Add policy rule
        </button>
      </div>
    </div>
  );

  const renderItinerary = () => (
    <div className="space-y-3">
      {form.itinerary.map((day, i) => (
        <div key={i} className={cardCls}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-spy-orange">Day {day.day}</span>
            {form.itinerary.length > 1 && (
              <button type="button" onClick={() => set('itinerary', form.itinerary.filter((_, ii) => ii !== i))} className="text-red-400 text-xs">Remove</button>
            )}
          </div>
          <input type="text" className={inputCls} placeholder="Day title (e.g. Drive to Base)" value={day.title} onChange={e => setItineraryItem(i, 'title', e.target.value)} />
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Day description..." value={day.description} onChange={e => setItineraryItem(i, 'description', e.target.value)} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => set('itinerary', [...form.itinerary, { day: form.itinerary.length + 1, title: '', description: '' }])}
        className={`w-full py-3 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2 transition ${
          darkMode ? 'border-white/10 text-zinc-500 hover:border-spy-orange/40 hover:text-spy-orange' : 'border-zinc-200 text-zinc-400 hover:border-spy-orange hover:text-spy-orange'
        }`}
      >
        <Plus size={14} /> Add Day
      </button>
    </div>
  );

  const renderFaqs = () => (
    <div className="space-y-3">
      {form.faqs.map((faq, i) => (
        <div key={i} className={cardCls}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-spy-orange">FAQ {i + 1}</span>
            {form.faqs.length > 1 && (
              <button type="button" onClick={() => set('faqs', form.faqs.filter((_, ii) => ii !== i))} className="text-red-400 text-xs">Remove</button>
            )}
          </div>
          <input type="text" className={inputCls} placeholder="Question" value={faq.question} onChange={e => setFaqItem(i, 'question', e.target.value)} />
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Answer" value={faq.answer} onChange={e => setFaqItem(i, 'answer', e.target.value)} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => set('faqs', [...form.faqs, { question: '', answer: '' }])}
        className={`w-full py-3 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2 transition ${
          darkMode ? 'border-white/10 text-zinc-500 hover:border-spy-orange/40 hover:text-spy-orange' : 'border-zinc-200 text-zinc-400 hover:border-spy-orange hover:text-spy-orange'
        }`}
      >
        <Plus size={14} /> Add FAQ
      </button>
    </div>
  );

  const sectionContent = { basic: renderBasic, details: renderDetails, inclusions: renderInclusions, itinerary: renderItinerary, faqs: renderFaqs };

  return (
    <div className={`h-full flex flex-col font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>
      
      {/* Header */}
      <div className={`shrink-0 px-5 pt-5 pb-4 ${darkMode ? 'bg-zinc-900/80 border-b border-white/5' : 'bg-white border-b border-zinc-100 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={onBack} className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'} transition`}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight">{isEdit ? 'Edit Trip' : 'Post New Trip'}</h1>
            <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{isEdit ? `Editing: ${trip.name}` : 'Fill in trip details below'}</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {sections.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                section === s.id ? 'bg-spy-orange text-white' : darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {(sectionContent[section] || (() => null))()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className={`shrink-0 px-5 py-4 flex gap-3 ${darkMode ? 'bg-zinc-900/80 border-t border-white/5' : 'bg-white border-t border-zinc-100 shadow-sm'}`}>
        <button
          type="button"
          onClick={() => handleSave('Draft')}
          disabled={saving}
          className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
            darkMode ? 'border-white/10 text-zinc-300 hover:border-white/20' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
          }`}
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={() => handleSave('Published')}
          disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-bold bg-spy-orange hover:bg-[#d96d1a] text-white shadow-lg shadow-spy-orange/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (isEdit ? 'Update & Publish' : 'Publish Trip')}
        </button>
      </div>
    </div>
  );
}
