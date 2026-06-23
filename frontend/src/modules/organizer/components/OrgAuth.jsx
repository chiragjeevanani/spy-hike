/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, Phone, User, Building2, CreditCard, ArrowRight, AlertCircle, ChevronRight, Globe } from 'lucide-react';
import { saveOrgUser, loadOrgUser } from '../utils/storage';

const DEMO_CREDENTIALS = {
  email: 'demo@himalayan.com',
  password: 'organizer123',
  isApproved: true,
};

export default function OrgAuth({ mode = 'login', onSuccess, onSwitchMode, darkMode }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    agencyName: '',
    agencyWebsite: '',
    govtIdType: 'Aadhaar',
    govtIdNumber: '',
    yearsExperience: '',
    bio: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // registration multi-step: 1=personal, 2=agency, 3=verification

  const isLogin = mode === 'login';
  const totalSteps = 3;

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setError('');
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    
    // Check demo credentials
    if (formData.email === DEMO_CREDENTIALS.email && formData.password === DEMO_CREDENTIALS.password) {
      const user = {
        ...loadOrgUser(),
        isAuthenticated: true,
        isOnboarded: true,
        isApproved: true,
        isPendingApproval: false,
        email: formData.email,
        name: 'Himalayan Guides Ltd',
        agencyName: 'Himalayan Guides Ltd',
        avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=150&q=80',
        bio: 'Premium Himalayan expedition organizers with 8+ years experience.',
        yearsExperience: 8,
        rating: 4.9,
        totalTrips: 42,
        totalBookings: 380,
      };
      saveOrgUser(user);
      setLoading(false);
      onSuccess(user);
      return;
    }

    // Check stored accounts
    try {
      const stored = localStorage.getItem('spyhike_org_accounts');
      if (stored) {
        const accounts = JSON.parse(stored);
        const account = accounts.find(a => a.email === formData.email && a.password === formData.password);
        if (account) {
          const user = { ...account };
          saveOrgUser(user);
          setLoading(false);
          onSuccess(user);
          return;
        }
      }
    } catch (e) {}

    setError('Invalid credentials. Try demo@himalayan.com / organizer123');
    setLoading(false);
  };

  const handleRegisterStep = async () => {
    if (step < totalSteps) {
      if (step === 1 && (!formData.name || !formData.email || !formData.mobile || !formData.password)) {
        setError('Please fill in all required fields.');
        return;
      }
      if (step === 2 && !formData.agencyName) {
        setError('Agency name is required.');
        return;
      }
      setError('');
      setStep(prev => prev + 1);
    } else {
      // Final step - register
      if (!formData.govtIdNumber) {
        setError('Government ID is required for verification.');
        return;
      }
      setLoading(true);
      await new Promise(r => setTimeout(r, 1200));

      const newUser = {
        isAuthenticated: true,
        isOnboarded: true,
        isApproved: false,
        isPendingApproval: true,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        agencyName: formData.agencyName,
        agencyWebsite: formData.agencyWebsite,
        govtIdType: formData.govtIdType,
        govtIdNumber: formData.govtIdNumber,
        yearsExperience: parseInt(formData.yearsExperience) || 1,
        bio: formData.bio,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=F27D26&color=fff`,
        rating: 0,
        totalTrips: 0,
        totalBookings: 0,
        rememberMe: false,
      };

      saveOrgUser(newUser);

      // Store account for future logins
      try {
        const stored = localStorage.getItem('spyhike_org_accounts');
        const accounts = stored ? JSON.parse(stored) : [];
        accounts.push({ ...newUser, password: formData.password });
        localStorage.setItem('spyhike_org_accounts', JSON.stringify(accounts));
      } catch (e) {}

      setLoading(false);
      onSuccess(newUser);
    }
  };

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm font-medium border outline-none transition-all duration-200 ${
    darkMode
      ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/60 focus:ring-1 focus:ring-spy-orange/20'
      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/60 focus:ring-1 focus:ring-spy-orange/20'
  }`;

  const labelCls = `text-xs font-semibold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`;

  const renderLoginForm = () => (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Email Address</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="email"
            className={`${inputCls} pl-10`}
            placeholder="demo@himalayan.com"
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Password</label>
        <div className="relative">
          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            className={`${inputCls} pl-10 pr-10`}
            placeholder="Enter your password"
            value={formData.password}
            onChange={e => handleChange('password', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
    </div>
  );

  const renderRegisterStep = () => {
    if (step === 1) return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Full Name *</label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" className={`${inputCls} pl-10`} placeholder="Your full name" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Email Address *</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="email" className={`${inputCls} pl-10`} placeholder="your@email.com" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Mobile Number *</label>
          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="tel" className={`${inputCls} pl-10`} placeholder="+91 XXXXX XXXXX" value={formData.mobile} onChange={e => handleChange('mobile', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Password *</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type={showPassword ? 'text' : 'password'} className={`${inputCls} pl-10 pr-10`} placeholder="Min 8 characters" value={formData.password} onChange={e => handleChange('password', e.target.value)} />
            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
      </div>
    );

    if (step === 2) return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Agency / Company Name *</label>
          <div className="relative">
            <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" className={`${inputCls} pl-10`} placeholder="e.g. Himalayan Guides Ltd" value={formData.agencyName} onChange={e => handleChange('agencyName', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Website (optional)</label>
          <div className="relative">
            <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="url" className={`${inputCls} pl-10`} placeholder="https://yourwebsite.com" value={formData.agencyWebsite} onChange={e => handleChange('agencyWebsite', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Years of Experience</label>
          <input type="number" min="0" max="50" className={inputCls} placeholder="e.g. 5" value={formData.yearsExperience} onChange={e => handleChange('yearsExperience', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>About Your Agency</label>
          <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Brief description of your services..." value={formData.bio} onChange={e => handleChange('bio', e.target.value)} />
        </div>
      </div>
    );

    if (step === 3) return (
      <div className="space-y-4">
        <div className={`p-3 rounded-xl text-xs leading-relaxed ${darkMode ? 'bg-spy-orange/10 border border-spy-orange/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
          <div className="flex gap-2 items-start">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>Your documents will be reviewed by our admin team within 24-48 hours. You'll receive an email on approval.</span>
          </div>
        </div>
        <div>
          <label className={labelCls}>Government ID Type</label>
          <select
            className={inputCls}
            value={formData.govtIdType}
            onChange={e => handleChange('govtIdType', e.target.value)}
          >
            <option value="Aadhaar">Aadhaar Card</option>
            <option value="PAN">PAN Card</option>
            <option value="GST">GST Certificate</option>
            <option value="Passport">Passport</option>
            <option value="TIN">Travel India License (TIN)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>ID Number *</label>
          <div className="relative">
            <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" className={`${inputCls} pl-10`} placeholder="Enter your ID number" value={formData.govtIdNumber} onChange={e => handleChange('govtIdNumber', e.target.value)} />
          </div>
        </div>
        <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          By registering, you agree to Spy Hike's Partner Terms of Service. All ID information is encrypted and secure.
        </p>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col overflow-y-auto font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>
      
      {/* Header branding banner */}
      <div className="relative overflow-hidden">
        <div className={`px-6 pt-6 pb-8 ${darkMode ? 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-[#0d1a0f]' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
          <div className="absolute top-4 right-4">
            <span className="bg-spy-orange text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full">ORGANIZER</span>
          </div>
          
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${darkMode ? 'bg-spy-orange/20 border border-spy-orange/30' : 'bg-white shadow-orange-100'}`}>
            <Building2 size={26} className="text-spy-orange" />
          </div>
          <h1 className="text-2xl font-display font-black tracking-tight">
            {isLogin ? 'Partner Login' : 'Become a Partner'}
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {isLogin ? 'Access your organizer dashboard' : 'Join our verified organizer network'}
          </p>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 px-6 py-6 space-y-5">
        
        {/* Step indicator for registration */}
        {!isLogin && (
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <React.Fragment key={i}>
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < step ? 'bg-spy-orange' : darkMode ? 'bg-zinc-800' : 'bg-zinc-200'
                }`} />
              </React.Fragment>
            ))}
          </div>
        )}

        {!isLogin && (
          <p className={`text-xs font-semibold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Step {step} of {totalSteps} — {step === 1 ? 'Personal Info' : step === 2 ? 'Agency Details' : 'Verification'}
          </p>
        )}

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`flex gap-2 items-center p-3 rounded-xl text-xs ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}
            >
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic form content */}
        {isLogin ? renderLoginForm() : renderRegisterStep()}

        {/* Submit button */}
        <button
          type="button"
          onClick={isLogin ? handleLogin : handleRegisterStep}
          disabled={loading}
          className="w-full bg-spy-orange hover:bg-[#d96d1a] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-lg shadow-spy-orange/20"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {isLogin ? 'Sign In' : (step < totalSteps ? 'Continue' : 'Submit Application')}
              {!loading && (step < totalSteps && !isLogin ? <ChevronRight size={18} /> : <ArrowRight size={18} />)}
            </>
          )}
        </button>

        {/* Switch mode link */}
        <p className={`text-center text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {isLogin ? "Don't have an account?" : 'Already a partner?'}{' '}
          <button
            type="button"
            onClick={onSwitchMode}
            className="text-spy-orange font-semibold hover:underline"
          >
            {isLogin ? 'Register here' : 'Sign in'}
          </button>
        </p>

        {isLogin && (
          <div className={`mt-2 p-3 rounded-xl text-xs text-center ${darkMode ? 'bg-zinc-900 border border-white/5 text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}>
            Demo: <span className="font-mono text-spy-orange">demo@himalayan.com</span> / <span className="font-mono text-spy-orange">organizer123</span>
          </div>
        )}
      </div>
    </div>
  );
}
