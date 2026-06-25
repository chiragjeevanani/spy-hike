import React, { useState } from 'react';
import { Settings, Shield, RotateCcw, Save, User, Eye, EyeOff } from 'lucide-react';
import { resetDemoData } from '../utils/storage';

export default function SettingsView({ admin, darkMode, onToggleDarkMode }) {
  const [profile, setProfile] = useState({
    name: admin.name,
    email: admin.email,
    avatar: admin.avatar,
  });
  
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [maintMode, setMaintMode] = useState(false);
  const [alertDuration, setAlertDuration] = useState('24h');
  const [commissionRate, setCommissionRate] = useState(() => {
    const stored = localStorage.getItem('spyhike_commission_rate');
    return stored !== null ? Number(stored) : 10;
  });

  const handleCommissionChange = (value) => {
    const rate = Math.max(0, Math.min(100, Number(value) || 0));
    setCommissionRate(rate);
    localStorage.setItem('spyhike_commission_rate', rate.toString());
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    alert('Admin profile settings updated successfully! (Simulated)');
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      alert('Error: Passwords do not match!');
      return;
    }
    alert('Security key updated successfully! (Simulated)');
    setPasswords({ current: '', newPass: '', confirm: '' });
  };

  const handleResetDatabase = () => {
    if (!window.confirm('WARNING: Reset all administrator flags, organizer verification stages, and notification broadcasts? Local storage keys will return to default demo seeds.')) {
      return;
    }
    resetDemoData();
    localStorage.removeItem('spyhike_commission_rate');
    alert('Database successfully restored to initial demo seeds! Please refresh to sync visual components.');
    window.location.reload();
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

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className={labelCls}>Your Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                className={inputCls}
              />
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

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className={labelCls}>Current Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter current password"
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={passwords.newPass}
                  onChange={(e) => setPasswords(prev => ({ ...prev, newPass: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                  className={inputCls}
                />
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
                onClick={() => setMaintMode(!maintMode)}
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
            <RotateCcw size={14} className="text-rose-500 animate-spin" />
            <span>Reset Database</span>
          </h3>

          <div className="space-y-4 text-xs leading-relaxed">
            <p className="text-slate-400 font-semibold">
              Delete all changes and restore original demo data. This resets all organizer approvals, active filters, and announcements.
            </p>

            <button
              onClick={handleResetDatabase}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/10 active:scale-95 transition-all"
            >
              <RotateCcw size={14} />
              <span>Reset to Demo Data</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
