import React, { useRef, useState, useEffect } from 'react';
import {
  Gift, Award, Users, Building2, Image as ImageIcon, Upload, Trash2, Save,
  Sparkles, Ticket, CheckCircle2, Clock
} from 'lucide-react';
import {
  loadLoyaltyConfig, saveLoyaltyConfigApi, hydrateLoyaltyConfig,
  loadCustomerVouchers, loadOrganizerVouchers,
} from '../../../utils/loyalty';
import { useToast } from '../../../components/ToastProvider';

// Reads a dropped/selected image file into a base64 data URI — this demo has
// no upload server, so the banner image lives directly in the saved config.
const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function LoyaltyProgramView({ darkMode }) {
  const [config, setConfig] = useState(loadLoyaltyConfig);
  const [savedFlash, setSavedFlash] = useState(false);
  const customerFileRef = useRef(null);
  const organizerFileRef = useRef(null);
  // Tracks whether the admin has started editing — so the async config
  // hydration below never clobbers an in-progress edit if it resolves late.
  const editedRef = useRef(false);
  const toast = useToast();

  // Pull the server's authoritative config into the cache + local state.
  useEffect(() => {
    hydrateLoyaltyConfig().then((cfg) => { if (cfg && !editedRef.current) setConfig(loadLoyaltyConfig()); });
  }, []);

  const customerVouchers = loadCustomerVouchers();
  const organizerVouchers = loadOrganizerVouchers();

  const updateSide = (side, patch) => {
    editedRef.current = true;
    setConfig(prev => ({ ...prev, [side]: { ...prev[side], ...patch } }));
  };
  const updateBanner = (side, patch) => {
    editedRef.current = true;
    setConfig(prev => ({ ...prev, [side]: { ...prev[side], banner: { ...prev[side].banner, ...patch } } }));
  };

  const handleImageUpload = async (side, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    updateBanner(side, { image: dataUrl });
  };

  const handleSave = async () => {
    // Defensive clamp in case a numeric field is mid-edit (cleared to '')
    // when Save is clicked without tabbing away first.
    const cleaned = {
      customer: {
        ...config.customer,
        thresholdPersons: Math.max(1, Number(config.customer.thresholdPersons) || 0),
        maxDiscountAmount: Math.max(0, Number(config.customer.maxDiscountAmount) || 0),
      },
      organizer: {
        ...config.organizer,
        thresholdBookings: Math.max(1, Number(config.organizer.thresholdBookings) || 0),
      },
    };
    setConfig(prev => ({ ...prev, customer: { ...prev.customer, ...cleaned.customer }, organizer: { ...prev.organizer, ...cleaned.organizer } }));
    try {
      await saveLoyaltyConfigApi({ customer: cleaned.customer, organizer: cleaned.organizer });
      setConfig(loadLoyaltyConfig());
      setSavedFlash(true);
      toast.success('Loyalty settings saved!');
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (err) {
      toast.error(err?.message || 'Could not save loyalty settings.');
    }
  };

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

  const Toggle = ({ on, onClick }) => (
    <button
      onClick={onClick}
      className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${on ? 'bg-[#F27D26]' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  const BannerUploader = ({ side, fileRef, accent }) => {
    const banner = config[side].banner;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-400">
            <ImageIcon size={13} /> Reward Banner
          </h4>
          <Toggle on={banner.enabled} onClick={() => updateBanner(side, { enabled: !banner.enabled })} />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageUpload(side, e.target.files?.[0])}
        />

        {/* Live banner preview — matches the in-app card composition */}
        <div className="relative h-32 rounded-2xl overflow-hidden shadow-inner">
          {banner.image ? (
            <img src={banner.image} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${accent}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3.5 flex flex-col justify-end">
            <span className="text-white font-display font-black text-sm leading-tight">{banner.title || 'Banner title'}</span>
            <span className="text-white/80 text-[10px] mt-0.5">{banner.subtitle || 'Banner subtitle'}</span>
          </div>
          {!banner.enabled && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-black/40 px-2.5 py-1 rounded-full">Hidden in app</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition ${
              darkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <Upload size={12} /> {banner.image ? 'Replace Image' : 'Upload Image'}
          </button>
          {banner.image && (
            <button
              onClick={() => updateBanner(side, { image: '' })}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-500/10 transition"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        <div>
          <label className={labelCls}>Banner Title</label>
          <input
            type="text"
            value={banner.title}
            onChange={(e) => updateBanner(side, { title: e.target.value })}
            className={inputCls}
            placeholder="e.g. Trek 30, Get 1 Free!"
          />
        </div>
        <div>
          <label className={labelCls}>Banner Subtitle</label>
          <input
            type="text"
            value={banner.subtitle}
            onChange={(e) => updateBanner(side, { subtitle: e.target.value })}
            className={inputCls}
            placeholder="Short supporting line"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Gift className="text-[#F27D26]" size={22} /> Loyalty Program
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-semibold">
            Configure the free-booking rewards travellers and organizers unlock, and the banners that promote them.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="bg-[#F27D26] hover:bg-[#d96d1a] text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-orange-500/15 active:scale-95 transition-all text-xs"
        >
          <Save size={14} />
          <span>{savedFlash ? 'Saved!' : 'Save Loyalty Settings'}</span>
        </button>
      </div>

      {/* Quick voucher insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Customer Vouchers Issued', value: customerVouchers.length, icon: Ticket, color: 'text-blue-500' },
          { label: 'Customer Vouchers Available', value: customerVouchers.filter(v => v.status === 'available').length, icon: Sparkles, color: 'text-emerald-500' },
          { label: 'Organizer Vouchers Issued', value: organizerVouchers.length, icon: Ticket, color: 'text-indigo-500' },
          { label: 'Organizer Vouchers Available', value: organizerVouchers.filter(v => v.status === 'available').length, icon: Sparkles, color: 'text-emerald-500' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#152243] border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <Icon size={15} className={`${stat.color} mb-2`} />
              <div className="text-xl font-black font-display text-slate-800 dark:text-white">{stat.value}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 leading-tight">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Customer rewards card */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-blue-500" />
              <span>Customer Rewards</span>
            </h3>
            <Toggle on={config.customer.enabled} onClick={() => updateSide('customer', { enabled: !config.customer.enabled })} />
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Reward Threshold</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={config.customer.thresholdPersons}
                  onChange={(e) => updateSide('customer', { thresholdPersons: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  onBlur={(e) => updateSide('customer', { thresholdPersons: Math.max(1, Number(e.target.value) || 0) })}
                  className={`${inputCls} !w-24 text-center shrink-0`}
                />
                <span className="text-xs font-semibold text-slate-400">travelers</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Booked cumulatively — any treks, any batch.</p>
            </div>

            <div>
              <label className={labelCls}>Max Discount Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 shrink-0">₹</span>
                <input
                  type="number"
                  min="0"
                  value={config.customer.maxDiscountAmount}
                  onChange={(e) => updateSide('customer', { maxDiscountAmount: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  onBlur={(e) => updateSide('customer', { maxDiscountAmount: Math.max(0, Number(e.target.value) || 0) })}
                  className={`${inputCls} !w-28 shrink-0`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Caps the reward — bookings above this pay the difference.</p>
            </div>

            <div>
              <label className={labelCls}>Reward Title</label>
              <input
                type="text"
                value={config.customer.rewardTitle}
                onChange={(e) => updateSide('customer', { rewardTitle: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Reward Description</label>
              <textarea
                rows={3}
                value={config.customer.rewardDescription}
                onChange={(e) => updateSide('customer', { rewardDescription: e.target.value })}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className={`pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <BannerUploader side="customer" fileRef={customerFileRef} accent="from-forest-700 to-forest-950" />
            </div>

            <div className={`p-3 rounded-xl text-[11px] leading-relaxed font-semibold ${darkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              Preview copy shown in-app: <span className="text-slate-300 dark:text-slate-300 font-bold">"Book {config.customer.thresholdPersons} travelers, get up to ₹{config.customer.maxDiscountAmount} off your next booking!"</span>
            </div>
          </div>
        </div>

        {/* Organizer rewards card */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-indigo-500" />
              <span>Organizer Rewards</span>
            </h3>
            <Toggle on={config.organizer.enabled} onClick={() => updateSide('organizer', { enabled: !config.organizer.enabled })} />
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Reward Threshold</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={config.organizer.thresholdBookings}
                  onChange={(e) => updateSide('organizer', { thresholdBookings: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  onBlur={(e) => updateSide('organizer', { thresholdBookings: Math.max(1, Number(e.target.value) || 0) })}
                  className={`${inputCls} !w-24 text-center shrink-0`}
                />
                <span className="text-xs font-semibold text-slate-400">bookings</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Received via the app.</p>
            </div>

            <div>
              <label className={labelCls}>Reward Title</label>
              <input
                type="text"
                value={config.organizer.rewardTitle}
                onChange={(e) => updateSide('organizer', { rewardTitle: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Reward Description</label>
              <textarea
                rows={3}
                value={config.organizer.rewardDescription}
                onChange={(e) => updateSide('organizer', { rewardDescription: e.target.value })}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className={`pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <BannerUploader side="organizer" fileRef={organizerFileRef} accent="from-indigo-700 to-slate-950" />
            </div>

            <div className={`p-3 rounded-xl text-[11px] leading-relaxed font-semibold ${darkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              Preview copy shown in-app: <span className="text-slate-300 dark:text-slate-300 font-bold">"Reach {config.organizer.thresholdBookings} bookings, earn 1 zero-commission booking!"</span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer note */}
      <div className={`p-4 rounded-2xl text-xs leading-relaxed font-semibold flex gap-2.5 ${darkMode ? 'bg-slate-900/40 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
        <Clock size={15} className="text-[#F27D26] shrink-0 mt-0.5" />
        <span>
          Turning a side off hides its banner and pauses new milestone tracking — vouchers already earned remain valid and redeemable.
          Changes apply the next time a customer or organizer opens their app.
        </span>
      </div>
    </div>
  );
}
