import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Building2, Mail, Phone, Globe, Star, Award, TrendingUp, LogOut, Moon, Sun, Edit3, ChevronRight, Save, X, Plus, Minus, Gift, LifeBuoy, Info, Instagram, AlertCircle, Wallet } from 'lucide-react';
import ThemeToggle from '../../../components/ThemeToggle';
import ConfirmDialog from '../../../components/ConfirmDialog';
import OrgHelpSupportView from './OrgHelpSupportView';
import OrgAboutView from './OrgAboutView';
import { saveOrgUser } from '../utils/storage';
import { loadLoyaltyConfig, getOrganizerProgress } from '../../../utils/loyalty';

export default function OrgProfileView({ organizer, onLogout, onOpenLoyalty, onOpenFinancials, darkMode, onToggleDarkMode }) {
  const loyaltyConfig = loadLoyaltyConfig();
  const loyaltyProgress = getOrganizerProgress(organizer?.totalBookings || 0, loyaltyConfig);
  const [editing, setEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [form, setForm] = useState({
    name: organizer?.name || '',
    agencyName: organizer?.agencyName || '',
    mobile: organizer?.mobile || '',
    agencyWebsite: organizer?.agencyWebsite || '',
    socialMediaLink: organizer?.socialMediaLink || '',
    bio: organizer?.bio || '',
    yearsExperience: organizer?.yearsExperience || 1,
    coreCapabilities: organizer?.coreCapabilities || ['Snow Expedition Specialists', 'Eco-Friendly Leave-No-Trace', 'Emergency Medical Rescue', 'Naturalist Guided Hiking'],
  });
  const [formError, setFormError] = useState('');

  const handleSave = () => {
    if (!form.socialMediaLink.trim()) {
      setFormError('A social media link (e.g. Instagram) is required.');
      return;
    }
    const updated = { ...organizer, ...form };
    saveOrgUser(updated);
    setEditing(false);
    // Force re-render via reload-like pattern (parent should handle)
    window.location.reload();
  };

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-white border-zinc-200 text-zinc-800 focus:border-spy-orange/50'
  }`;
  const labelCls = `text-xs font-semibold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`;

  const statItems = [
    { label: 'Trips Posted', value: organizer?.totalTrips || 0, icon: TrendingUp, color: 'text-spy-orange' },
    { label: 'Total Bookings', value: organizer?.totalBookings || 0, icon: Award, color: 'text-emerald-400' },
    { label: 'Avg Rating', value: organizer?.rating ? organizer.rating.toFixed(1) : '—', icon: Star, color: 'text-yellow-400' },
    { label: 'Yrs Experience', value: organizer?.yearsExperience || '—', icon: User, color: 'text-blue-400' },
  ];

  return (
    <div className={`h-full flex flex-col overflow-y-auto font-sans ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
      
      {/* Profile header */}
      <div className={`relative px-5 pt-5 pb-6 ${darkMode ? 'bg-gradient-to-b from-zinc-900 to-transparent' : 'bg-gradient-to-b from-orange-50 to-transparent'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={organizer?.avatar}
                alt={organizer?.name}
                className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(organizer?.name || 'O')}&background=F27D26&color=fff&size=150`; }}
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-display font-black tracking-tight leading-tight">{organizer?.agencyName || organizer?.name}</h1>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{organizer?.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Award size={11} className="text-spy-orange" />
                <span className="text-[10px] font-bold text-spy-orange">Verified Partner</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            id="btn-edit-org-profile"
            onClick={() => { setFormError(''); setEditing(true); }}
            className={`p-2.5 rounded-xl transition ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-white shadow-sm hover:shadow'}`}
          >
            <Edit3 size={16} className={darkMode ? 'text-zinc-400' : 'text-zinc-500'} />
          </button>
        </div>

        {organizer?.bio && (
          <p className={`mt-4 text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{organizer.bio}</p>
        )}
      </div>

      <div className="px-5 space-y-5 pb-8">
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`rounded-2xl p-3.5 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}
              >
                <Icon size={16} className={`${s.color} mb-2`} />
                <div className="text-lg font-display font-black">{s.value}</div>
                <div className={`text-[10px] font-medium mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Info card */}
        <div className={`rounded-2xl ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
          {[
            { icon: Building2, label: 'Agency', value: organizer?.agencyName },
            { icon: Phone, label: 'Mobile', value: organizer?.mobile },
            { icon: Mail, label: 'Email', value: organizer?.email },
            { icon: Globe, label: 'Website', value: organizer?.agencyWebsite || '—' },
            { icon: Instagram, label: 'Social Media', value: organizer?.socialMediaLink || '—' },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? `border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}` : ''}`}>
                <Icon size={15} className="text-spy-orange shrink-0" />
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.label}</p>
                  <p className="text-sm font-semibold">{item.value || '—'}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loyalty rewards highlight card */}
        {loyaltyConfig.organizer.enabled && (
          <button
            type="button"
            id="btn-open-loyalty-profile"
            onClick={onOpenLoyalty}
            className={`w-full p-4 rounded-2xl text-left flex items-center gap-3.5 transition active:scale-[0.99] ${
              darkMode ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5' : 'bg-gradient-to-br from-orange-50 to-white shadow-sm'
            }`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
              darkMode ? 'bg-spy-orange/15 text-spy-orange' : 'bg-spy-orange/15 text-spy-orange'
            }`}>
              <Gift size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold block">Loyalty Rewards</span>
              <span className={`text-xs block mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {loyaltyProgress.remaining > 0
                  ? `${loyaltyProgress.remaining} more bookings to a zero-commission credit`
                  : 'Zero-commission credit unlocked — tap to view!'}
              </span>
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-2">
                <div className="h-full bg-spy-orange rounded-full transition-all duration-700" style={{ width: `${loyaltyProgress.percent}%` }} />
              </div>
            </div>
            <ChevronRight size={17} className="opacity-40 shrink-0" />
          </button>
        )}

        {/* Settings section */}
        <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
          {/* Appearance / theme */}
          <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${darkMode ? 'border-white/5' : 'border-zinc-100'}`}>
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={16} /> : <Sun size={16} />}
              <span className="text-sm font-semibold">Appearance</span>
            </div>
            <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} size="sm" />
          </div>

          {/* Financials */}
          <button
            type="button"
            id="btn-open-financials-profile"
            onClick={onOpenFinancials}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 border-b transition ${
              darkMode ? 'border-white/5 hover:bg-white/5' : 'border-zinc-100 hover:bg-zinc-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <Wallet size={16} className="text-spy-orange" />
              <span className="text-sm font-semibold">Financials & Payouts</span>
            </span>
            <ChevronRight size={16} className="opacity-40" />
          </button>

          {/* Help & Support */}
          <button
            type="button"
            onClick={() => setShowHelpSupport(true)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 border-b transition ${
              darkMode ? 'border-white/5 hover:bg-white/5' : 'border-zinc-100 hover:bg-zinc-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <LifeBuoy size={16} className="text-spy-orange" />
              <span className="text-sm font-semibold">Help & Support</span>
            </span>
            <ChevronRight size={16} className="opacity-40" />
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => setShowAbout(true)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 border-b transition ${
              darkMode ? 'border-white/5 hover:bg-white/5' : 'border-zinc-100 hover:bg-zinc-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <Info size={16} className="text-spy-orange" />
              <span className="text-sm font-semibold">About</span>
            </span>
            <ChevronRight size={16} className="opacity-40" />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-red-400 ${darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'} transition`}
          >
            <LogOut size={16} />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>

      {/* Edit modal overlay */}
      {editing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-50 flex flex-col"
        >
          <div className={`flex-1 flex flex-col overflow-y-auto ${darkMode ? 'bg-zinc-950' : 'bg-gray-50'}`}>
            <div className={`px-5 pt-5 pb-4 shrink-0 flex items-center gap-3 ${darkMode ? 'bg-zinc-900/80 border-b border-white/5' : 'bg-white border-b border-zinc-100 shadow-sm'}`}>
              <button type="button" onClick={() => setEditing(false)} className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}><X size={17} /></button>
              <h2 className="text-lg font-display font-black">Edit Profile</h2>
            </div>
            <div className="flex-1 px-5 py-5 space-y-4">
              <div className={`rounded-2xl p-4 space-y-4 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`}>
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
                  { label: 'Agency Name', key: 'agencyName', type: 'text', placeholder: 'Agency name' },
                  { label: 'Mobile', key: 'mobile', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
                  { label: 'Website', key: 'agencyWebsite', type: 'url', placeholder: 'https://...' },
                  { label: 'Social Media Link (e.g. Instagram) *', key: 'socialMediaLink', type: 'url', placeholder: 'https://instagram.com/youragency', required: true },
                  { label: 'Years Experience', key: 'yearsExperience', type: 'number', placeholder: '5' },
                ].map(field => (
                  <div key={field.key}>
                    <label className={labelCls}>{field.label}</label>
                    <input
                      type={field.type}
                      required={field.required}
                      className={inputCls}
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={e => { setForm(p => ({ ...p, [field.key]: e.target.value })); setFormError(''); }}
                    />
                  </div>
                ))}
                {formError && (
                  <div className={`flex gap-2 items-center p-3 rounded-xl text-xs font-semibold ${
                    darkMode ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-600'
                  }`}>
                    <AlertCircle size={14} className="shrink-0" /> {formError}
                  </div>
                )}
                <div>
                  <label className={labelCls}>About Agency</label>
                  <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Describe your agency..." value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls}>Core Capabilities</label>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, coreCapabilities: [...p.coreCapabilities, ''] }))}
                      className="text-spy-orange text-xs font-bold flex items-center gap-0.5"
                    >
                      <Plus size={13} /> Add capability
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.coreCapabilities.map((cap, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          className={`${inputCls} flex-1`}
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
                            className="text-red-400 px-2"
                          >
                            <Minus size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3.5 rounded-2xl bg-spy-orange text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-spy-orange/20 active:scale-95 transition-all"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Help & Support overlay */}
      {showHelpSupport && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="absolute inset-0 z-50 flex flex-col"
        >
          <OrgHelpSupportView organizer={organizer} onBack={() => setShowHelpSupport(false)} darkMode={darkMode} />
        </motion.div>
      )}

      {/* About overlay */}
      {showAbout && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="absolute inset-0 z-50 flex flex-col"
        >
          <OrgAboutView onBack={() => setShowAbout(false)} darkMode={darkMode} />
        </motion.div>
      )}

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
