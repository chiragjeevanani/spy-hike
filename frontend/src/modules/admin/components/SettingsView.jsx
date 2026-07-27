import React, { useState, useEffect, useRef } from 'react';
import { Settings, Shield, Save, User, Eye, EyeOff } from 'lucide-react';
import bookingsApi from '../../../lib/bookingsApi';
import adminApi from '../../../lib/adminApi';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_HELP = 'Password must be at least 8 characters and include a letter and a number.';

export default function SettingsView({ admin, darkMode, onToggleDarkMode }) {
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
  // Commission rate is the platform's authoritative money-split setting,
  // stored server-side (AdminConfig) and snapshotted onto each booking.
  const [commissionRate, setCommissionRate] = useState(10);

  useEffect(() => {
    bookingsApi.getConfig()
      .then((cfg) => {
        setCommissionRate(cfg.commissionRate);
      })
      .catch(() => {});
  }, []);

  const handleCommissionChange = (value) => {
    const rate = Math.max(0, Math.min(100, Number(value) || 0));
    setCommissionRate(rate);
    bookingsApi.updateConfig({ commissionRate: rate }).catch(() => {});
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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 no-scrollbar">
      
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-800 dark:text-white">Admin Settings</h1>
        <p className="text-slate-400 text-xs mt-1 font-semibold">Manage admin profile, password security, platform commission rate, and theme settings.</p>
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
              <label className={labelCls}>Name</label>
              <input
                ref={(el) => (profileFieldRefs.current.name = el)}
                type="text"
                value={profile.name}
                onChange={(e) => {
                  setProfile({ ...profile, name: e.target.value });
                  setProfileErrors((er) => ({ ...er, name: '' }));
                }}
                className={`${inputCls} ${profileErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Admin Name"
              />
              {profileErrors.name && (
                <span className="text-[10px] font-bold text-red-500 mt-1 block">{profileErrors.name}</span>
              )}
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input
                ref={(el) => (profileFieldRefs.current.email = el)}
                type="email"
                value={profile.email}
                onChange={(e) => {
                  setProfile({ ...profile, email: e.target.value });
                  setProfileErrors((er) => ({ ...er, email: '' }));
                }}
                className={`${inputCls} ${profileErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="admin@example.com"
              />
              {profileErrors.email && (
                <span className="text-[10px] font-bold text-red-500 mt-1 block">{profileErrors.email}</span>
              )}
            </div>

            <div>
              <label className={labelCls}>Avatar Image URL</label>
              <input
                type="text"
                value={profile.avatar}
                onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                className={inputCls}
                placeholder="https://..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#F27D26] hover:bg-[#d96d1a] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/15 active:scale-95 transition-all text-xs"
            >
              <Save size={13} />
              <span>Save Profile Details</span>
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className={cardCls}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Shield size={14} className="text-[#F27D26]" />
            <span>Change Password</span>
          </h3>

          <form onSubmit={handlePasswordSave} noValidate className="space-y-4">
            <div>
              <label className={labelCls}>Current Password</label>
              <input
                ref={(el) => (passwordFieldRefs.current.current = el)}
                type={showPassword ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => {
                  setPasswords({ ...passwords, current: e.target.value });
                  setPasswordErrors((er) => ({ ...er, current: '' }));
                }}
                className={`${inputCls} ${passwordErrors.current ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Enter current password"
              />
              {passwordErrors.current && (
                <span className="text-[10px] font-bold text-red-500 mt-1 block">{passwordErrors.current}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>New Password</label>
                <input
                  ref={(el) => (passwordFieldRefs.current.newPass = el)}
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.newPass}
                  onChange={(e) => {
                    setPasswords({ ...passwords, newPass: e.target.value });
                    setPasswordErrors((er) => ({ ...er, newPass: '' }));
                  }}
                  className={`${inputCls} ${passwordErrors.newPass ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Min 8 chars, 1 letter, 1 number"
                />
                {passwordErrors.newPass && (
                  <span className="text-[10px] font-bold text-red-500 mt-1 block">{passwordErrors.newPass}</span>
                )}
              </div>

              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input
                  ref={(el) => (passwordFieldRefs.current.confirm = el)}
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.confirm}
                  onChange={(e) => {
                    setPasswords({ ...passwords, confirm: e.target.value });
                    setPasswordErrors((er) => ({ ...er, confirm: '' }));
                  }}
                  className={`${inputCls} ${passwordErrors.confirm ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Re-enter new password"
                />
                {passwordErrors.confirm && (
                  <span className="text-[10px] font-bold text-red-500 mt-1 block">{passwordErrors.confirm}</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
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
                className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  darkMode ? 'bg-[#F27D26]' : 'bg-slate-200'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
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

      </div>

    </div>
  );
}
