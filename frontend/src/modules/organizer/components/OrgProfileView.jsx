import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Building2, Mail, Phone, Globe, Star, Award, TrendingUp, LogOut,
  Moon, Sun, Edit3, ChevronRight, Save, X, Plus, Minus, Gift, LifeBuoy,
  Info, Instagram, AlertCircle, Wallet, TicketPercent, ShieldCheck, Compass
} from 'lucide-react';
import ThemeToggle from '../../../components/ThemeToggle';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PromotedBadge, { PROMOTED_RING_CLASS } from '../../../components/PromotedBadge';
import OrgHelpSupportView from './OrgHelpSupportView';
import OrgAboutView from './OrgAboutView';
import OrgPromoteCard from './OrgPromoteCard';
import { saveOrgUser } from '../utils/storage';
import { loadLoyaltyConfig, getOrganizerProgress } from '../../../utils/loyalty';
import SwitchTransition from '../../user/components/SwitchTransition';
import authApi from '../../../lib/authApi';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const TRAVELLER_TRANSITION_MS = 3000;

export default function OrgProfileView({
  organizer,
  onLogout,
  onOpenLoyalty,
  onOpenFinancials,
  onOpenCoupons,
  darkMode,
  onToggleDarkMode,
  onFullscreenChange,
  autoEditProfile,
  onClearAutoEdit
}) {
  const loyaltyConfig = loadLoyaltyConfig();
  const loyaltyProgress = getOrganizerProgress(organizer?.totalBookings || 0, loyaltyConfig);
  const [editing, setEditing] = useState(Boolean(autoEditProfile));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [travSwitching, setTravSwitching] = useState(false);

  useEffect(() => {
    if (autoEditProfile) {
      setEditing(true);
    }
  }, [autoEditProfile]);

  const closeEditModal = () => {
    setEditing(false);
    if (onClearAutoEdit) onClearAutoEdit();
  };

  useEffect(() => {
    if (onFullscreenChange) onFullscreenChange(travSwitching);
    return () => { if (onFullscreenChange) onFullscreenChange(false); };
  }, [travSwitching, onFullscreenChange]);

  const handleSwitchToTraveller = () => {
    setTravSwitching(true);
    localStorage.setItem('trekigo_active_role', 'hiker');
    authApi.getCustomerToken()
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          window.location.href = '/app';
        }, 1400);
      });
  };

  const [form, setForm] = useState({
    name: organizer?.name || '',
    agencyName: organizer?.agencyName || '',
    mobile: organizer?.mobile || '',
    agencyWebsite: organizer?.agencyWebsite || '',
    socialMediaLink: organizer?.socialMediaLink || '',
    bio: organizer?.bio || '',
    yearsExperience: organizer?.yearsExperience || 1,
    coreCapabilities: organizer?.coreCapabilities || ['Snow Expedition Specialists', 'Eco-Friendly Leave-No-Trace', 'Emergency Medical Rescue', 'Naturalist Guided Hiking'],
    supportEmail: organizer?.supportEmail || '',
    supportPhone: organizer?.supportPhone || '',
    headline: organizer?.headline || '',
  });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const toast = useToast();
  const fieldRefs = useRef({});

  const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]*$/;
  const PHONE_REGEX = /^\d{10}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const URL_REGEX = /^https?:\/\/[^\s]+\.[^\s]+$/;

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required.';
    else if (!NAME_REGEX.test(form.name.trim())) errors.name = 'Full name can only contain letters, spaces, apostrophes and hyphens.';
    if (!form.agencyName.trim()) errors.agencyName = 'Agency name is required.';
    if (form.supportPhone.trim() && !PHONE_REGEX.test(form.supportPhone.trim())) {
      errors.supportPhone = 'Mobile / support phone must be a valid 10-digit number.';
    }
    if (form.supportEmail.trim() && !EMAIL_REGEX.test(form.supportEmail.trim())) {
      errors.supportEmail = 'Enter a valid support email address.';
    }
    if (form.agencyWebsite.trim() && !URL_REGEX.test(form.agencyWebsite.trim())) {
      errors.agencyWebsite = 'Enter a valid website URL (starting with http:// or https://).';
    }
    if (form.socialMediaLink.trim() && !URL_REGEX.test(form.socialMediaLink.trim())) {
      errors.socialMediaLink = 'Enter a valid social media URL (starting with http:// or https://).';
    }
    return errors;
  };

  const handleSave = () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      const order = ['name', 'agencyName', 'headline', 'supportPhone', 'supportEmail', 'agencyWebsite', 'socialMediaLink', 'yearsExperience'];
      const message = errors[order.find(f => errors[f])];
      setFieldErrors(errors);
      setFormError(message);
      toast.error(message);
      scrollToFirstError(fieldRefs.current, errors, order);
      return;
    }
    setFieldErrors({});
    setFormError('');
    authApi.updateOrganizerProfile(form)
      .then((res) => {
        const updated = { ...organizer, ...res.organizer };
        saveOrgUser(updated);
        setEditing(false);
        toast.success('Profile updated successfully!');
        window.location.reload();
      })
      .catch((err) => {
        const message = err?.message || 'Failed to save profile details.';
        setFormError(message);
        toast.error(message);
      });
  };

  const inputCls = `w-full px-4 py-3 rounded-2xl text-xs sm:text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/50'
  }`;
  const labelCls = `text-xs font-bold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`;

  const statItems = [
    { label: 'Trips Published', value: organizer?.totalTrips || 0, icon: TrendingUp, color: 'text-spy-orange', bg: 'bg-spy-orange/10' },
    { label: 'Total Reservations', value: organizer?.totalBookings || 0, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Hiker Rating', value: organizer?.rating ? organizer.rating.toFixed(1) : '5.0', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Years Experience', value: organizer?.yearsExperience ? `${organizer.yearsExperience} Yrs` : '1+ Yrs', icon: User, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ];

  if (showHelpSupport) {
    return (
      <OrgHelpSupportView
        organizer={organizer}
        onBack={() => setShowHelpSupport(false)}
        darkMode={darkMode}
      />
    );
  }

  if (showAbout) {
    return (
      <OrgAboutView
        onBack={() => setShowAbout(false)}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className={`h-full flex-1 overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      {travSwitching && <SwitchTransition darkMode={darkMode} label="Switching to Traveller" showScene />}

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">

        {/* Agency Hero Header Card */}
        <div className={`rounded-3xl p-6 sm:p-8 border relative overflow-hidden transition-colors ${
          darkMode
            ? 'bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-900/90 border-white/10'
            : 'bg-gradient-to-r from-orange-50/70 via-white to-orange-50/40 border-orange-200/70 shadow-xs'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <img
                  src={organizer?.avatar}
                  alt={organizer?.name}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover shadow-lg border-2 ${
                    organizer?.isPromoted ? PROMOTED_RING_CLASS : 'border-spy-orange/40'
                  }`}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(organizer?.name || 'O')}&background=F27D26&color=fff&size=150`; }}
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-2 border-zinc-950 flex items-center justify-center shadow-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-3xl font-display font-black tracking-tight leading-tight">
                    {organizer?.agencyName || organizer?.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-spy-orange bg-spy-orange/15 border border-spy-orange/25 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck size={13} /> Verified Partner
                  </span>
                  {organizer?.isPromoted && <PromotedBadge size="md" />}
                </div>
                <p className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {organizer?.headline || organizer?.email}
                </p>
                {organizer?.bio && (
                  <p className={`mt-2 text-xs sm:text-sm leading-relaxed max-w-2xl line-clamp-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {organizer.bio}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              id="btn-edit-org-profile"
              onClick={() => { setFormError(''); setEditing(true); }}
              className="self-start sm:self-center flex items-center gap-2 px-5 py-3 rounded-2xl bg-spy-orange hover:bg-[#d96d1a] text-white font-bold text-xs sm:text-sm shadow-md shadow-spy-orange/20 transition cursor-pointer active:scale-95 shrink-0"
            >
              <Edit3 size={16} /> Edit Profile
            </button>
          </div>
        </div>

        {/* 4-Column Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-5">
          {statItems.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-3xl p-4 sm:p-5 border transition-all ${
                  darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80 shadow-xs'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.bg} mb-3`}>
                  <Icon size={18} className={s.color} />
                </div>
                <div className="text-xl sm:text-2xl font-display font-black tracking-tight">{s.value}</div>
                <div className={`text-xs font-bold mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* 2-Column Responsive Content on Desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start space-y-6 lg:space-y-0">

          {/* Left Column: Agency Info & Verification */}
          <div className="lg:col-span-6 space-y-6">

            {/* Coordinates Card */}
            <div className={`rounded-3xl border overflow-hidden shadow-xs ${
              darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80'
            }`}>
              <div className={`p-4 sm:p-5 border-b font-display font-black text-sm uppercase tracking-wide opacity-80 ${
                darkMode ? 'border-white/5 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50/50'
              }`}>
                Agency Coordinates & Contact
              </div>

              {[
                { icon: Building2, label: 'Agency Name', value: organizer?.agencyName },
                { icon: Phone, label: 'Support Mobile Phone', value: organizer?.supportPhone || organizer?.mobile },
                { icon: Mail, label: 'Official Support Email', value: organizer?.supportEmail || organizer?.email },
                { icon: Globe, label: 'Official Website', value: organizer?.agencyWebsite || 'Not provided' },
                { icon: Instagram, label: 'Social Profile', value: organizer?.socialMediaLink || 'Not linked' },
              ].map((item, i, arr) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`flex items-center gap-3.5 px-5 py-4 ${i < arr.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-spy-orange/10 text-spy-orange shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.label}</p>
                      <p className="text-xs sm:text-sm font-semibold truncate mt-0.5">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Core Capabilities */}
            {form.coreCapabilities?.length > 0 && (
              <div className={`rounded-3xl p-5 sm:p-6 border shadow-xs space-y-3 ${
                darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80'
              }`}>
                <h3 className="font-display font-black text-sm uppercase tracking-wide opacity-80">
                  Certified Core Capabilities
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.coreCapabilities.filter(Boolean).map((cap, i) => (
                    <span
                      key={i}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    >
                      ✓ {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Settings, Loyalty & Partner Actions */}
          <div className="lg:col-span-6 space-y-6">

            {/* Loyalty rewards highlight */}
            {loyaltyConfig.organizer.enabled && (
              <button
                type="button"
                id="btn-open-loyalty-profile"
                onClick={onOpenLoyalty}
                className={`w-full p-5 sm:p-6 rounded-3xl text-left flex items-center gap-4 transition active:scale-[0.99] border cursor-pointer hover:shadow-md ${
                  darkMode ? 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-white/10' : 'bg-gradient-to-br from-orange-50 via-white to-orange-50/50 border-orange-200/70 shadow-xs'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-spy-orange/15 text-spy-orange shrink-0">
                  <Gift size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm sm:text-base font-bold block">Summit Partner Loyalty Program</span>
                  <span className={`text-xs block mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {loyaltyProgress.remaining > 0
                      ? `${loyaltyProgress.remaining} more bookings to unlock a 0% platform commission credit`
                      : 'Zero-commission voucher ready to apply!'}
                  </span>
                  <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-2.5">
                    <div className="h-full bg-spy-orange rounded-full transition-all duration-700" style={{ width: `${loyaltyProgress.percent}%` }} />
                  </div>
                </div>
                <ChevronRight size={18} className="opacity-40 shrink-0" />
              </button>
            )}

            {/* Promote Yourself */}
            <OrgPromoteCard organizer={organizer} darkMode={darkMode} />

            {/* Settings & Tools List */}
            <div className={`rounded-3xl border overflow-hidden shadow-xs ${
              darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200/80'
            }`}>
              {/* Appearance / theme */}
              <div className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon size={18} className="text-yellow-400" /> : <Sun size={18} className="text-zinc-600" />}
                  <div>
                    <span className="text-sm font-bold block">Appearance Theme</span>
                    <span className="text-[11px] opacity-60">Toggle light or dark interface</span>
                  </div>
                </div>
                <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} size="sm" />
              </div>

              {/* Financials */}
              <button
                type="button"
                id="btn-open-financials-profile"
                onClick={onOpenFinancials}
                className={`w-full flex items-center justify-between gap-3 px-5 py-4 border-b transition cursor-pointer ${
                  darkMode ? 'border-white/5 hover:bg-white/5 text-zinc-200' : 'border-zinc-100 hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Wallet size={18} className="text-emerald-400" />
                  <span className="text-sm font-bold">Financials & Bank Settlements</span>
                </span>
                <ChevronRight size={16} className="opacity-40" />
              </button>

              {/* Coupons */}
              <button
                type="button"
                id="btn-open-coupons-profile"
                onClick={onOpenCoupons}
                className={`w-full flex items-center justify-between gap-3 px-5 py-4 border-b transition cursor-pointer ${
                  darkMode ? 'border-white/5 hover:bg-white/5 text-zinc-200' : 'border-zinc-100 hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <span className="flex items-center gap-3">
                  <TicketPercent size={18} className="text-spy-orange" />
                  <span className="text-sm font-bold">Discounts & Promo Coupons</span>
                </span>
                <ChevronRight size={16} className="opacity-40" />
              </button>

              {/* Help & Support */}
              <button
                type="button"
                id="btn-open-help-profile"
                onClick={() => setShowHelpSupport(true)}
                className={`w-full flex items-center justify-between gap-3 px-5 py-4 border-b transition cursor-pointer ${
                  darkMode ? 'border-white/5 hover:bg-white/5 text-zinc-200' : 'border-zinc-100 hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <span className="flex items-center gap-3">
                  <LifeBuoy size={18} className="text-blue-400" />
                  <span className="text-sm font-bold">Help & Partner Support</span>
                </span>
                <ChevronRight size={16} className="opacity-40" />
              </button>

              {/* About */}
              <button
                type="button"
                onClick={() => setShowAbout(true)}
                className={`w-full flex items-center justify-between gap-3 px-5 py-4 border-b transition cursor-pointer ${
                  darkMode ? 'border-white/5 hover:bg-white/5 text-zinc-200' : 'border-zinc-100 hover:bg-zinc-50 text-zinc-800'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Info size={18} className="text-zinc-400" />
                  <span className="text-sm font-bold">About Find Your Trek</span>
                </span>
                <ChevronRight size={16} className="opacity-40" />
              </button>

              {/* Switch to Traveller Portal */}
              <button
                type="button"
                onClick={handleSwitchToTraveller}
                className={`w-full flex items-center justify-between gap-3 px-5 py-4 border-b transition cursor-pointer ${
                  darkMode ? 'border-white/5 hover:bg-white/5 text-emerald-400' : 'border-zinc-100 hover:bg-zinc-50 text-emerald-600'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Compass size={18} />
                  <span className="text-sm font-bold">Switch to Traveller Experience</span>
                </span>
                <ChevronRight size={16} className="opacity-40" />
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-rose-500 font-bold transition cursor-pointer ${
                  darkMode ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'
                }`}
              >
                <LogOut size={18} />
                <span className="text-sm">Sign Out Session</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Edit Profile Modal Dialog */}
      <AnimatePresence>
        {editing && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-3xl overflow-hidden max-h-[90vh] flex flex-col border shadow-2xl ${
                darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'
              }`}
            >
              <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
                darkMode ? 'border-white/10' : 'border-zinc-200'
              }`}>
                <h2 className="text-lg font-display font-black">Edit Agency Profile</h2>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className={`p-2 rounded-xl cursor-pointer ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}
                >
                  <X size={17} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Your name' },
                    { label: 'Agency Name *', key: 'agencyName', type: 'text', placeholder: 'Agency name' },
                    { label: 'Agency Headline', key: 'headline', type: 'text', placeholder: 'e.g. High-safety alpine expeditions' },
                    { label: 'Support Phone (10 digits)', key: 'supportPhone', type: 'tel', placeholder: '9876543210', inputMode: 'numeric', maxLength: 10 },
                    { label: 'Support Email', key: 'supportEmail', type: 'email', placeholder: 'support@agency.com' },
                    { label: 'Official Website', key: 'agencyWebsite', type: 'url', placeholder: 'https://...' },
                    { label: 'Social Media Link (Optional)', key: 'socialMediaLink', type: 'url', placeholder: 'https://instagram.com/agency', required: false },
                    { label: 'Years Experience', key: 'yearsExperience', type: 'number', placeholder: '5' },
                  ].map(field => (
                    <div key={field.key} className={field.key === 'headline' || field.key === 'socialMediaLink' ? 'sm:col-span-2' : ''}>
                      <label className={labelCls}>{field.label}</label>
                      <input
                        ref={el => { fieldRefs.current[field.key] = { current: el }; }}
                        type={field.type}
                        required={field.required}
                        inputMode={field.inputMode}
                        maxLength={field.maxLength}
                        className={`${inputCls} ${fieldErrors[field.key] ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder={field.placeholder}
                        value={form[field.key]}
                        onChange={e => {
                          const raw = e.target.value;
                          const val = field.key === 'supportPhone' ? raw.replace(/\D/g, '').slice(0, 10) : raw;
                          setForm(p => ({ ...p, [field.key]: val }));
                          setFormError('');
                          setFieldErrors(er => ({ ...er, [field.key]: '' }));
                        }}
                      />
                      {fieldErrors[field.key] && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors[field.key]}</p>}
                    </div>
                  ))}
                </div>

                {formError && (
                  <div className={`flex gap-2 items-center p-3 rounded-2xl text-xs font-semibold ${
                    darkMode ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-600'
                  }`}>
                    <AlertCircle size={14} className="shrink-0" /> {formError}
                  </div>
                )}

                <div>
                  <label className={labelCls}>Agency Overview / Bio</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    placeholder="Briefly describe your agency's mountain legacy and safety standards..."
                    value={form.bio}
                    onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls}>Core Capabilities</label>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, coreCapabilities: [...p.coreCapabilities, ''] }))}
                      className="text-spy-orange text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} /> Add capability
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.coreCapabilities.map((cap, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          className={`${inputCls} flex-1 min-w-0`}
                          placeholder={`Capability ${idx + 1}`}
                          value={cap}
                          onChange={e => {
                            const arr = [...form.coreCapabilities];
                            arr[idx] = e.target.value;
                            setForm(p => ({ ...p, coreCapabilities: arr }));
                          }}
                        />
                        {form.coreCapabilities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const arr = form.coreCapabilities.filter((_, i) => i !== idx);
                              setForm(p => ({ ...p, coreCapabilities: arr }));
                            }}
                            className="text-rose-500 px-2 cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`p-6 border-t shrink-0 ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-3.5 rounded-2xl bg-spy-orange hover:bg-[#d96d1a] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-spy-orange/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Save size={16} /> Save Profile Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log Out?"
        message="Are you sure you want to log out of your organizer account?"
        confirmLabel="Log Out"
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
        darkMode={darkMode}
      />
    </div>
  );
}
