import React, { useState, useEffect, useRef } from 'react';
import { Settings, Shield, RotateCcw, Save, User, Eye, EyeOff } from 'lucide-react';
import { resetDemoData } from '../utils/storage';
import bookingsApi from '../../../lib/bookingsApi';
import adminApi from '../../../lib/adminApi';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_HELP = 'Password must be at least 8 characters and include a letter and a number.';

export default function SettingsView({ admin, darkMode, onToggleDarkMode }) {
  const [showConfirmStep1, setShowConfirmStep1] = useState(false);
  const [showConfirmStep2, setShowConfirmStep2] = useState(false);

  const [profile, setProfile] = useState({
    name: admin.name,
    email: admin.email,
    avatar: admin.avatar,
  });
  const [profileErrors, setProfileErrors] = useState({});

  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  const toast = useToast();
  const profileFieldRefs = useRef({});
  const passwordFieldRefs = useRef({});

  const [showPassword, setShowPassword] = useState(false);
  const [maintMode, setMaintMode] = useState(false);
  const [alertDuration, setAlertDuration] = useState('24h');
  // Commission rate is the platform's authoritative money-split setting,
  // stored server-side (AdminConfig) and snapshotted onto each booking.
  const [commissionRate, setCommissionRate] = useState(10);

  useEffect(() => {
    bookingsApi.getConfig()
      .then((cfg) => {
        setCommissionRate(cfg.commissionRate);
        setMaintMode(!!cfg.maintenanceMode);
      })
      .catch(() => {});
  }, []);

  const handleCommissionChange = (value) => {
    const rate = Math.max(0, Math.min(100, Number(value) || 0));
    setCommissionRate(rate);
    bookingsApi.updateConfig({ commissionRate: rate }).catch(() => {});
  };

  const handleToggleMaintMode = () => {
    const nextVal = !maintMode;
    setMaintMode(nextVal);
    bookingsApi.updateConfig({ maintenanceMode: nextVal }).catch(() => {});
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    const errors = {};
    if (!profile.name.trim()) errors.name = 'Name is required.';
    if (!profile.email.trim()) errors.email = 'Email is required.';
    if (Object.keys(errors).length > 0) {
      const order = ['name', 'email'];
      const message = errors[order.find((f) => errors[f])];
      setProfileErrors(errors);
      toast.error(message);
      scrollToFirstError(profileFieldRefs.current, errors, order);
      return;
    }
    setProfileErrors({});
    adminApi.updateProfile({
      name: profile.name.trim(),
      email: profile.email.trim(),
      avatar: profile.avatar.trim()
    })
      .then(() => {
        toast.success('Admin profile settings updated successfully!');
        setTimeout(() => window.location.reload(), 1000);
      })
      .catch((err) => {
        toast.error(err?.message || 'Could not update admin profile.');
      });
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    const errors = {};
    if (!passwords.current) errors.current = 'Current password is required.';
    if (!PASSWORD_REGEX.test(passwords.newPass)) errors.newPass = PASSWORD_HELP;
    if (passwords.newPass !== passwords.confirm) errors.confirm = 'Passwords do not match.';
    if (Object.keys(errors).length > 0) {
      const order = ['current', 'newPass', 'confirm'];
      const message = errors[order.find((f) => errors[f])];
      setPasswordErrors(errors);
      toast.error(message);
      scrollToFirstError(passwordFieldRefs.current, errors, order);
      return;
    }
    setPasswordErrors({});
    adminApi.changePassword(passwords.current, passwords.newPass)
      .then(() => {
        toast.success('Admin password updated successfully!');
        setPasswords({ current: '', newPass: '', confirm: '' });
      })
      .catch((err) => {
        toast.error(err?.message || 'Could not update password.');
      });
  };

  const handleResetDatabase = () => {
    adminApi.resetDatabase()
      .then(() => {
        resetDemoData();
        localStorage.removeItem('trekigo_commission_rate');
        toast.success('Database successfully restored to initial demo seeds!');
        setTimeout(() => window.location.reload(), 1000);
      })
      .catch((err) => {
        toast.error(err?.message || 'Could not reset database.');
      });
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">Admin Settings</h1>
        <p className="text-slate-400 text-xs mt-1.5 font-semibold">Change your password, update profile details, or reset demo data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className={cardCls}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <User size={14} className="text-[#F27D26]" />
            <span>Admin Profile Details</span>
          </h3>

          <form onSubmit={handleProfileSave} noValidate className="space-y-4">
            <div>
              <label className={labelCls}>Your Name *</label>
              <input
                ref={el => { profileFieldRefs.current.name = { current: el }; }}
                type="text"
                value={profile.name}
                onChange={(e) => { setProfile(prev => ({ ...prev, name: e.target.value })); setProfileErrors(er => ({ ...er, name: '' })); }}
                className={`${inputCls} ${profileErrors.name ? 'border-rose-500 focus:border-rose-500' : ''}`}
              />
              {profileErrors.name && <p className="text-[10px] font-bold text-rose-500 mt-1">{profileErrors.name}</p>}
            </div>

            <div>
              <label className={labelCls}>Email Address *</label>
              <input
                ref={el => { profileFieldRefs.current.email = { current: el }; }}
                type="email"
                value={profile.email}
                onChange={(e) => { setProfile(prev => ({ ...prev, email: e.target.value })); setProfileErrors(er => ({ ...er, email: '' })); }}
                className={`${inputCls} ${profileErrors.email ? 'border-rose-500 focus:border-rose-500' : ''}`}
              />
              {profileErrors.email && <p className="text-[10px] font-bold text-rose-500 mt-1">{profileErrors.email}</p>}
            </div>

            <div>
              <label className={labelCls}>Avatar Image URL</label>
              <input
                type="url"
                value={profile.avatar}
                onChange={(e) => setProfile(prev => ({ ...prev, avatar: e.target.value }))}
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#F27D26] hover:bg-[#d96d1a] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/15 active:scale-95 transition-all text-xs"
            >
              <Save size={13} />
              <span>Update Profile</span>
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className={cardCls}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Shield size={14} className="text-blue-500" />
            <span>Change Password</span>
          </h3>

          <form onSubmit={handlePasswordSave} noValidate className="space-y-4">
            <div>
              <label className={labelCls}>Current Password *</label>
              <input
                ref={el => { passwordFieldRefs.current.current = { current: el }; }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter current password"
                value={passwords.current}
                onChange={(e) => { setPasswords(prev => ({ ...prev, current: e.target.value })); setPasswordErrors(er => ({ ...er, current: '' })); }}
                className={`${inputCls} ${passwordErrors.current ? 'border-rose-500 focus:border-rose-500' : ''}`}
              />
              {passwordErrors.current && <p className="text-[10px] font-bold text-rose-500 mt-1">{passwordErrors.current}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className={labelCls}>New Password *</label>
                <input
                  ref={el => { passwordFieldRefs.current.newPass = { current: el }; }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={passwords.newPass}
                  onChange={(e) => { setPasswords(prev => ({ ...prev, newPass: e.target.value })); setPasswordErrors(er => ({ ...er, newPass: '' })); }}
                  className={`${inputCls} ${passwordErrors.newPass ? 'border-rose-500 focus:border-rose-500' : ''}`}
                />
                {passwordErrors.newPass && <p className="text-[10px] font-bold text-rose-500 mt-1">{passwordErrors.newPass}</p>}
              </div>
              <div className="min-w-0">
                <label className={labelCls}>Confirm Password *</label>
                <input
                  ref={el => { passwordFieldRefs.current.confirm = { current: el }; }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm"
                  value={passwords.confirm}
                  onChange={(e) => { setPasswords(prev => ({ ...prev, confirm: e.target.value })); setPasswordErrors(er => ({ ...er, confirm: '' })); }}
                  className={`${inputCls} ${passwordErrors.confirm ? 'border-rose-500 focus:border-rose-500' : ''}`}
                />
                {passwordErrors.confirm && <p className="text-[10px] font-bold text-rose-500 mt-1">{passwordErrors.confirm}</p>}
              </div>

            </div>

            <div className="flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 font-semibold"
              >
                {showPassword ? 'Hide passwords' : 'Show passwords'}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all text-xs"
            >
              <Save size={13} />
              <span>Update Password</span>
            </button>
          </form>
        </div>

        {/* Console Config */}
        <div className={cardCls}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Settings size={14} className="text-indigo-500" />
            <span>System Settings</span>
          </h3>

          <div className="space-y-4 text-xs font-semibold">
            {/* Dark mode */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-bold block">Dark Mode</span>
                <span className="text-[10px] text-slate-400 font-semibold">Switch dashboard layout to dark theme</span>
              </div>
              <button
                onClick={onToggleDarkMode}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${
                  darkMode ? 'bg-[#F27D26]' : 'bg-slate-200'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Maint mode */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-bold block">Maintenance Mode</span>
                <span className="text-[10px] text-slate-400 font-semibold">Block user logins and show a maintenance page</span>
              </div>
              <button
                onClick={handleToggleMaintMode}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${
                  maintMode ? 'bg-[#F27D26]' : 'bg-slate-200'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  maintMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Commission Rate */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-bold block">Booking Commission (%)</span>
                <span className="text-[10px] text-slate-400 font-semibold">Set platform charge percentage on bookings</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => handleCommissionChange(e.target.value)}
                  className={`w-16 px-2.5 py-1.5 rounded-lg border text-center font-bold text-xs outline-none ${
                    darkMode 
                      ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-[#F27D26]/60' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-[#F27D26]/60'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Database purge */}
        <div className={cardCls}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <RotateCcw size={14} className="text-red-600 animate-spin" />
            <span className="text-red-600">Reset Database</span>
          </h3>

          <div className="space-y-4 text-xs leading-relaxed">
            <p className="text-slate-400 font-semibold">
              Delete all changes and restore original demo data. This resets all organizer approvals, active filters, and announcements.
            </p>

            <button
              onClick={() => setShowConfirmStep1(true)}
              className="w-full bg-red-600 hover:bg-red-750 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            >
              <RotateCcw size={14} />
              <span>Reset to Demo Data</span>
            </button>
          </div>
        </div>

      </div>

      <ConfirmDialog
        open={showConfirmStep1}
        title="Reset Database to Seed Demo?"
        message="WARNING: This will permanently delete all dynamic data (bookings, payouts, custom trips, users, and announcements) and restore the system back to the initial demo seeds."
        confirmLabel="Continue Reset"
        cancelLabel="Abort"
        tone="danger"
        onConfirm={() => {
          setShowConfirmStep1(false);
          setShowConfirmStep2(true);
        }}
        onCancel={() => setShowConfirmStep1(false)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        open={showConfirmStep2}
        title="ARE YOU ABSOLUTELY SURE?"
        message="FINAL CONFIRMATION: This action is irreversible. All current sessions will log out, all live registrations and custom settings will be deleted. Do you want to proceed?"
        confirmLabel="Yes, Reset Database"
        cancelLabel="Abort"
        tone="danger"
        onConfirm={() => {
          setShowConfirmStep2(false);
          handleResetDatabase();
        }}
        onCancel={() => setShowConfirmStep2(false)}
        darkMode={darkMode}
      />

    </div>
  );
}
