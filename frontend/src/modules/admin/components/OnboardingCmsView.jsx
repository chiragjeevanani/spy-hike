import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles, Save, Check, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown,
  Compass, Mountain, Users, Shield, TrendingUp, MapPin, ClipboardList,
  Flame, Award, Eye, EyeOff, Building2, UserCheck, Upload, Link2,
  Image as ImageIcon, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import onboardingApi from '../../../lib/onboardingApi';
import {
  DEFAULT_ONBOARDING_CONTENT, mergeOnboardingContent,
  AVAILABLE_ICONS, ACCENT_PRESETS
} from '../../../utils/onboardingContent';
import { compressImage } from '../../../utils/imageCompressor';

// Helper to render icon by name
export function renderIconByName(name, className = 'w-5 h-5') {
  switch (name) {
    case 'Mountain': return <Mountain className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Shield': return <Shield className={className} />;
    case 'TrendingUp': return <TrendingUp className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'MapPin': return <MapPin className={className} />;
    case 'ClipboardList': return <ClipboardList className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'Award': return <Award className={className} />;
    case 'Compass':
    default:
      return <Compass className={className} />;
  }
}

// Curated high-res mountain presets for 1-click selection
const PRESET_IMAGES = [
  { name: 'Himalayan Ridge', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Mountain Guides', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Summit Camp', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Alpine Lake', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Trail Leader', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Monsoon Valley', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80' },
];

/**
 * SlideImagePicker Component
 * Allows uploading images from device storage (auto-compressed base64) OR entering a URL,
 * plus 1-click curated adventure presets.
 */
function SlideImagePicker({ value, onChange, darkMode }) {
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' | 'url' | 'presets'
  const [compressing, setCompressing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setUploadError('');
    setCompressing(true);
    try {
      // Compress image to ~1200px max dimension and quality 0.8 to keep payload compact
      const compressedDataUrl = await compressImage(file, 1200, 0.8);
      onChange(compressedDataUrl);
    } catch (err) {
      setUploadError(err.message || 'Failed to compress image file.');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isDataUrl = typeof value === 'string' && value.startsWith('data:image/');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Background Photography & Media
        </label>
        
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              activeMode === 'upload'
                ? 'bg-white dark:bg-slate-900 text-[#F27D26] shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload size={11} /> Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              activeMode === 'url'
                ? 'bg-white dark:bg-slate-900 text-[#F27D26] shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Link2 size={11} /> Enter URL
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('presets')}
            className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              activeMode === 'presets'
                ? 'bg-white dark:bg-slate-900 text-[#F27D26] shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles size={11} /> Presets
          </button>
        </div>
      </div>

      {/* Mode 1: Upload from Storage / Device */}
      {activeMode === 'upload' && (
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3 ${
              darkMode
                ? 'border-slate-800 hover:border-[#F27D26] bg-slate-900/40 hover:bg-slate-900/80'
                : 'border-slate-200 hover:border-[#F27D26] bg-slate-50/70 hover:bg-orange-50/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-[#F27D26] flex items-center justify-center shrink-0">
                {compressing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {compressing ? 'Optimizing image…' : 'Choose an image from your device'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isDataUrl ? '✓ Custom uploaded file active' : 'Supports PNG, JPG, WebP (auto-optimized for fast loading)'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs text-slate-700 dark:text-slate-200 hover:border-[#F27D26] shrink-0 pointer-events-none"
            >
              Browse Storage
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Enter Direct Web URL */}
      {activeMode === 'url' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Link2 size={13} />
            </span>
            <input
              type="url"
              value={isDataUrl ? '' : (value || '')}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#F27D26] outline-none"
              placeholder={isDataUrl ? 'Currently using uploaded storage file' : 'https://images.unsplash.com/...'}
            />
          </div>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 cursor-pointer"
              title="Clear image"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Mode 3: Curated Adventure Presets */}
      {activeMode === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESET_IMAGES.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange(preset.url)}
              className={`p-1.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                value === preset.url
                  ? 'border-[#F27D26] ring-1 ring-[#F27D26] bg-orange-500/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
              }`}
            >
              <img
                src={preset.url}
                alt={preset.name}
                className="w-8 h-8 rounded-lg object-cover shrink-0"
              />
              <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Error display if upload fails */}
      {uploadError && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-500 font-semibold">
          <AlertCircle size={13} /> {uploadError}
        </div>
      )}

      {/* Current Active Preview Strip */}
      {value && (
        <div className="flex items-center justify-between p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={value}
              alt="Slide Preview"
              className="w-12 h-9 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 dark:text-white flex items-center gap-1 truncate">
                <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                {isDataUrl ? 'Uploaded from device storage' : 'Active image URL'}
              </p>
              <p className="text-[9px] text-slate-400 truncate max-w-[280px]">
                {isDataUrl ? 'Embedded base64 data' : value}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#F27D26] cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
              title="Remove image"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingCmsView({ darkMode }) {
  const [activeSubTab, setActiveSubTab] = useState('customer'); // 'customer' | 'organizer'
  const [draft, setDraft] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedMode, setSavedMode] = useState('synced'); // 'synced' | 'local'
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  useEffect(() => {
    onboardingApi.adminGetContent()
      .then((c) => {
        const merged = mergeOnboardingContent(c);
        setDraft(merged);
        setSavedSnapshot(JSON.stringify(merged));
      })
      .catch(() => {
        const merged = mergeOnboardingContent(null);
        setDraft(merged);
        setSavedSnapshot(JSON.stringify(merged));
      });
  }, []);

  const isDirty = useMemo(() => {
    if (!draft || !savedSnapshot) return false;
    return JSON.stringify(draft) !== savedSnapshot;
  }, [draft, savedSnapshot]);

  if (!draft) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        <Loader2 size={20} className="animate-spin mr-2 text-[#F27D26]" />
        Loading onboarding CMS configuration…
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { content, synced } = await onboardingApi.saveContent(draft);
      const merged = mergeOnboardingContent(content);
      setDraft(merged);
      setSavedSnapshot(JSON.stringify(merged));
      setSavedMode(synced ? 'synced' : 'local');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSection = (section) => {
    if (!window.confirm(`Reset ${section} onboarding slides and settings to default?`)) return;
    setDraft((d) => ({
      ...d,
      [section]: JSON.parse(JSON.stringify(DEFAULT_ONBOARDING_CONTENT[section])),
    }));
    setPreviewSlideIdx(0);
  };

  // Helper updates for customer
  const updateCustomerField = (patch) => {
    setDraft((d) => ({ ...d, customer: { ...d.customer, ...patch } }));
  };

  const updateCustomerSlide = (index, patch) => {
    setDraft((d) => ({
      ...d,
      customer: {
        ...d.customer,
        slides: d.customer.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      },
    }));
  };

  const addCustomerSlide = () => {
    const newSlide = {
      title: 'New Mountain Trail Experience',
      description: 'Describe the unique adventure experience awaiting hikers on the platform.',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      icon: 'Compass',
      badge: 'Featured',
    };
    setDraft((d) => ({
      ...d,
      customer: { ...d.customer, slides: [...d.customer.slides, newSlide] },
    }));
    setPreviewSlideIdx(draft.customer.slides.length);
  };

  const removeCustomerSlide = (index) => {
    if (draft.customer.slides.length <= 1) {
      alert('You must have at least one onboarding slide.');
      return;
    }
    setDraft((d) => ({
      ...d,
      customer: { ...d.customer, slides: d.customer.slides.filter((_, i) => i !== index) },
    }));
    setPreviewSlideIdx(0);
  };

  const moveCustomerSlide = (index, dir) => {
    const arr = [...draft.customer.slides];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setDraft((d) => ({ ...d, customer: { ...d.customer, slides: arr } }));
    setPreviewSlideIdx(target);
  };

  // Helper updates for organizer
  const updateOrganizerField = (patch) => {
    setDraft((d) => ({ ...d, organizer: { ...d.organizer, ...patch } }));
  };

  const updateOrganizerSlide = (index, patch) => {
    setDraft((d) => ({
      ...d,
      organizer: {
        ...d.organizer,
        slides: d.organizer.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      },
    }));
  };

  const addOrganizerSlide = () => {
    const newSlide = {
      title: 'Expand Your Guiding Business',
      description: 'Connect with verified hikers looking for certified mountain leaders and seamless booking management.',
      image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      icon: 'Mountain',
      accent: 'text-spy-orange',
      bgAccent: 'bg-spy-orange/15 border-spy-orange/30',
      quote: 'Growing expeditions together with verified safety standards.',
      perks: ['Direct booking manager', 'Instant payments & settlements', '24/7 organizer concierge'],
    };
    setDraft((d) => ({
      ...d,
      organizer: { ...d.organizer, slides: [...d.organizer.slides, newSlide] },
    }));
    setPreviewSlideIdx(draft.organizer.slides.length);
  };

  const removeOrganizerSlide = (index) => {
    if (draft.organizer.slides.length <= 1) {
      alert('You must have at least one onboarding slide.');
      return;
    }
    setDraft((d) => ({
      ...d,
      organizer: { ...d.organizer, slides: d.organizer.slides.filter((_, i) => i !== index) },
    }));
    setPreviewSlideIdx(0);
  };

  const moveOrganizerSlide = (index, dir) => {
    const arr = [...draft.organizer.slides];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setDraft((d) => ({ ...d, organizer: { ...d.organizer, slides: arr } }));
    setPreviewSlideIdx(target);
  };

  // Organizer perks array helpers
  const addPerk = (slideIdx) => {
    const currentSlide = draft.organizer.slides[slideIdx];
    const updatedPerks = [...(currentSlide.perks || []), 'New feature perk item'];
    updateOrganizerSlide(slideIdx, { perks: updatedPerks });
  };

  const updatePerk = (slideIdx, perkIdx, val) => {
    const currentSlide = draft.organizer.slides[slideIdx];
    const updatedPerks = (currentSlide.perks || []).map((p, i) => (i === perkIdx ? val : p));
    updateOrganizerSlide(slideIdx, { perks: updatedPerks });
  };

  const removePerk = (slideIdx, perkIdx) => {
    const currentSlide = draft.organizer.slides[slideIdx];
    const updatedPerks = (currentSlide.perks || []).filter((_, i) => i !== perkIdx);
    updateOrganizerSlide(slideIdx, { perks: updatedPerks });
  };

  // Current active slides for preview
  const currentSectionSlides = activeSubTab === 'customer' ? draft.customer.slides : draft.organizer.slides;
  const safePreviewIdx = Math.min(previewSlideIdx, Math.max(0, currentSectionSlides.length - 1));
  const activeSlidePreview = currentSectionSlides[safePreviewIdx] || currentSectionSlides[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
      
      {/* Top Header & Sticky Control Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0E162F]/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Title & Status */}
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
              <Sparkles size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black font-display tracking-tight text-slate-800 dark:text-white">
                  Onboarding Screens CMS
                </h1>
                {isDirty && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Unsaved changes
                  </span>
                )}
                {justSaved && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Check size={11} /> {savedMode === 'synced' ? 'Saved & Synced' : 'Saved Locally'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure carousels, device uploads, copy, badges, and perks for Hiker & Organizer portals
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleResetSection(activeSubTab)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                darkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Reset current tab to factory defaults"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                isDirty
                  ? 'bg-[#F27D26] hover:bg-[#d96d1a] text-white shadow-[#F27D26]/25 cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save size={14} />
              <span>{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
          </div>

        </div>

        {/* Sub-Navigation Tabs (Inside sticky header so it's always accessible) */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => { setActiveSubTab('customer'); setPreviewSlideIdx(0); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'customer'
                ? 'bg-[#F27D26] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck size={14} /> Customer Onboarding ({draft.customer.slides.length} slides)
          </button>

          <button
            type="button"
            onClick={() => { setActiveSubTab('organizer'); setPreviewSlideIdx(0); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'organizer'
                ? 'bg-[#F27D26] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 size={14} /> Organizer Onboarding ({draft.organizer.slides.length} slides)
          </button>
        </div>

      </div>

      {/* Main 2-Column Grid: Left is Editor Form, Right is Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* Left Column (7 cols): Slide Cards & Settings */}
        <div className="xl:col-span-7 space-y-5">

          {/* Section Level Settings Card */}
          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">General Settings</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Visibility Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Enable Walkthrough</p>
                  <p className="text-[10px] text-slate-500">Display to users on first launch</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSubTab === 'customer') updateCustomerField({ visible: !draft.customer.visible });
                    else updateOrganizerField({ visible: !draft.organizer.visible });
                  }}
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    (activeSubTab === 'customer' ? draft.customer.visible : draft.organizer.visible)
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                  title="Toggle visibility"
                >
                  {(activeSubTab === 'customer' ? draft.customer.visible : draft.organizer.visible) ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {/* Skip Button Label */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Skip Button Label</label>
                <input
                  type="text"
                  value={activeSubTab === 'customer' ? draft.customer.skipLabel : draft.organizer.skipLabel}
                  onChange={(e) => {
                    if (activeSubTab === 'customer') updateCustomerField({ skipLabel: e.target.value });
                    else updateOrganizerField({ skipLabel: e.target.value });
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#F27D26] outline-none"
                  placeholder="e.g. Skip"
                />
              </div>

              {/* Organizer Portal Badge Text */}
              {activeSubTab === 'organizer' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Portal Hero Badge</label>
                  <input
                    type="text"
                    value={draft.organizer.badgeText || ''}
                    onChange={(e) => updateOrganizerField({ badgeText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#F27D26] outline-none"
                    placeholder="e.g. Organizer Portal"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Slides List Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black font-display text-slate-800 dark:text-white flex items-center gap-1.5">
              <span>Walkthrough Slides</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {currentSectionSlides.length}
              </span>
            </h3>

            <button
              type="button"
              onClick={activeSubTab === 'customer' ? addCustomerSlide : addOrganizerSlide}
              className="flex items-center gap-1 text-xs font-bold text-[#F27D26] hover:underline cursor-pointer"
            >
              <Plus size={14} /> Add New Slide
            </button>
          </div>

          {/* Slide Cards */}
          <div className="space-y-4">
            {currentSectionSlides.map((slide, sIdx) => (
              <div
                key={`slide-${sIdx}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  previewSlideIdx === sIdx
                    ? 'border-[#F27D26] ring-1 ring-[#F27D26]/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-800'
                } ${darkMode ? 'bg-slate-900/60' : 'bg-white'}`}
              >
                {/* Slide Card Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-orange-500/15 text-orange-500 text-xs font-mono font-bold flex items-center justify-center">
                      {sIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewSlideIdx(sIdx)}
                      className="text-xs font-bold text-slate-800 dark:text-white hover:text-[#F27D26] text-left truncate max-w-[220px] sm:max-w-sm cursor-pointer"
                    >
                      {slide.title || `Slide ${sIdx + 1}`}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => (activeSubTab === 'customer' ? moveCustomerSlide(sIdx, -1) : moveOrganizerSlide(sIdx, -1))}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                      title="Move slide up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === currentSectionSlides.length - 1}
                      onClick={() => (activeSubTab === 'customer' ? moveCustomerSlide(sIdx, 1) : moveOrganizerSlide(sIdx, 1))}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                      title="Move slide down"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => (activeSubTab === 'customer' ? removeCustomerSlide(sIdx) : removeOrganizerSlide(sIdx))}
                      className="p-1 rounded-md text-rose-400 hover:text-rose-600 cursor-pointer ml-1"
                      title="Delete slide"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Slide Fields */}
                <div className="space-y-4 text-xs">
                  {/* Heading & Badge */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Slide Heading</label>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => (activeSubTab === 'customer'
                          ? updateCustomerSlide(sIdx, { title: e.target.value })
                          : updateOrganizerSlide(sIdx, { title: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#F27D26] outline-none"
                        placeholder="Slide Heading..."
                      />
                    </div>

                    {activeSubTab === 'customer' && (
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Badge Tag</label>
                        <input
                          type="text"
                          value={slide.badge || ''}
                          onChange={(e) => updateCustomerSlide(sIdx, { badge: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#F27D26] outline-none"
                          placeholder="e.g. Explore"
                        />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description Paragraph</label>
                    <textarea
                      rows={2}
                      value={slide.description}
                      onChange={(e) => (activeSubTab === 'customer'
                        ? updateCustomerSlide(sIdx, { description: e.target.value })
                        : updateOrganizerSlide(sIdx, { description: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#F27D26] outline-none"
                      placeholder="Enter description..."
                    />
                  </div>

                  {/* Enhanced Image & Storage Media Picker */}
                  <SlideImagePicker
                    value={slide.image}
                    onChange={(newVal) => (activeSubTab === 'customer'
                      ? updateCustomerSlide(sIdx, { image: newVal })
                      : updateOrganizerSlide(sIdx, { image: newVal }))
                    }
                    darkMode={darkMode}
                  />

                  {/* Icon & Color Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Slide Icon</label>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_ICONS.map((iconName) => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => (activeSubTab === 'customer'
                              ? updateCustomerSlide(sIdx, { icon: iconName })
                              : updateOrganizerSlide(sIdx, { icon: iconName }))
                            }
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              slide.icon === iconName
                                ? 'border-[#F27D26] bg-[#F27D26]/15 text-[#F27D26]'
                                : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
                            }`}
                            title={iconName}
                          >
                            {renderIconByName(iconName, 'w-4 h-4')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {activeSubTab === 'organizer' && (
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Accent Color</label>
                        <div className="flex flex-wrap gap-1.5">
                          {ACCENT_PRESETS.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => updateOrganizerSlide(sIdx, {
                                accent: preset.accent,
                                bgAccent: preset.bgAccent,
                              })}
                              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 cursor-pointer ${
                                slide.accent === preset.accent
                                  ? 'border-slate-800 dark:border-white shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.color }} />
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Organizer Specific: Partner Quote & Perks */}
                  {activeSubTab === 'organizer' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Partner Spotlight Quote
                        </label>
                        <input
                          type="text"
                          value={slide.quote || ''}
                          onChange={(e) => updateOrganizerSlide(sIdx, { quote: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white focus:border-[#F27D26] outline-none"
                          placeholder="e.g. Trusted by 250+ certified mountain guides..."
                        />
                      </div>

                      {/* Perks checklist */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block font-bold text-slate-700 dark:text-slate-300">
                            Key Perks Checklist ({(slide.perks || []).length})
                          </label>
                          <button
                            type="button"
                            onClick={() => addPerk(sIdx)}
                            className="text-[11px] font-bold text-[#F27D26] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={12} /> Add Perk
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(slide.perks || []).map((perk, pIdx) => (
                            <div key={`perk-${pIdx}`} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={perk}
                                onChange={(e) => updatePerk(sIdx, pIdx, e.target.value)}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs focus:border-[#F27D26] outline-none"
                                placeholder="Perk item..."
                              />
                              <button
                                type="button"
                                onClick={() => removePerk(sIdx, pIdx)}
                                className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                title="Remove perk"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={activeSubTab === 'customer' ? addCustomerSlide : addOrganizerSlide}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#F27D26] hover:text-[#F27D26] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={16} /> Add Another Onboarding Slide
            </button>
          </div>

        </div>

        {/* Right Column (5 cols): Clean, Sticky Live Simulator Preview */}
        <div className="xl:col-span-5 sticky top-24 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#F27D26]" /> Live Simulator Preview
            </span>
            <div className="flex items-center gap-1">
              {currentSectionSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPreviewSlideIdx(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    safePreviewIdx === i ? 'w-5 bg-[#F27D26]' : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                  title={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Preview Frame */}
          <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-zinc-950 text-white min-h-[480px] flex flex-col justify-between relative select-none">
            
            {/* Photo Area */}
            <div className="relative h-56 overflow-hidden bg-zinc-900">
              {activeSlidePreview?.image ? (
                <img
                  src={activeSlidePreview.image}
                  alt={activeSlidePreview?.title}
                  className="w-full h-full object-cover brightness-[0.7]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <ImageIcon size={32} />
                  <span className="text-xs font-semibold">No image selected</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/60" />
              
              {/* Header in Preview */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
                <span className="bg-[#F27D26] text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <Mountain size={10} />
                  {activeSubTab === 'organizer' ? (draft.organizer.badgeText || 'Organizer Portal') : (activeSlidePreview?.badge || 'Find Your Trek')}
                </span>
                <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-white/10">
                  {safePreviewIdx + 1} / {currentSectionSlides.length}
                </span>
              </div>

              {/* Organizer Quote if active */}
              {activeSubTab === 'organizer' && activeSlidePreview?.quote && (
                <div className="absolute bottom-3 inset-x-4 p-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[11px] text-white/90">
                  <span className="text-[9px] text-[#F27D26] font-bold uppercase tracking-wider block">Partner Spotlight</span>
                  "{activeSlidePreview.quote}"
                </div>
              )}
            </div>

            {/* Body Content in Preview */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-3 bg-gradient-to-b from-zinc-950 to-zinc-900">
              <div className="space-y-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-md ${
                  activeSubTab === 'organizer'
                    ? (activeSlidePreview?.bgAccent || 'bg-orange-500/15 border-orange-500/30')
                    : 'bg-white/10 border-white/20'
                }`}>
                  {renderIconByName(activeSlidePreview?.icon, 'w-5 h-5 text-orange-500')}
                </div>

                <h4 className="text-lg font-display font-black leading-snug tracking-tight">
                  {activeSlidePreview?.title || 'Slide Title'}
                </h4>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {activeSlidePreview?.description || 'Slide description placeholder'}
                </p>

                {/* Organizer Perks in Preview */}
                {activeSubTab === 'organizer' && (activeSlidePreview?.perks || []).length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    {activeSlidePreview.perks.map((perk, pi) => (
                      <div key={pi} className="flex items-center gap-2 text-[11px] text-zinc-300">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">✓</span>
                        {perk}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Navigation in Preview */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-semibold">
                  {activeSubTab === 'customer' ? draft.customer.skipLabel : draft.organizer.skipLabel}
                </span>

                <button
                  type="button"
                  onClick={() => setPreviewSlideIdx((safePreviewIdx + 1) % currentSectionSlides.length)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F27D26] text-white shadow-md cursor-pointer active:scale-95"
                >
                  {safePreviewIdx === currentSectionSlides.length - 1 ? 'Get Started' : 'Next →'}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
