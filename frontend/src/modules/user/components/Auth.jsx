import React, { useState, useEffect } from 'react';
import { Mail, Lock, Phone, User, Compass, Eye, EyeOff, KeyRound, Globe, Building2, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import authApi from '../../../lib/authApi';
import contentApi from '../../../lib/contentApi';
import usePhoneVerification from '../../../lib/usePhoneVerification';
import SwitchTransition from './SwitchTransition';
import AppLogo from '../../../components/AppLogo';
import { useToast } from '../../../components/ToastProvider';

// Turns an ApiClientError (or any error) into a user-facing message.
const errText = (err, fallback) => err?.message || fallback;

// Same strength rule everywhere a password is set (signup and reset) — at
// least 8 characters with a letter and a number.
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_HELP = 'Password must be at least 8 characters, with at least one letter and one number.';

const ORG_USER_STORAGE_KEY = 'trekigo_org_user';
const ORGANIZER_TRANSITION_MS = 3000; // lets the climb→camp flip play, then holds briefly before redirecting
const ROLE_TOGGLE_TRANSITION_MS = 3000; // lets the scene flip play before the login form switches role

export default function Auth({ onSuccess, darkMode, initialMode = 'LOGIN_EMAIL', onSwitchToRegister, onSwitchToLogin }) {
  const [mode, setMode] = useState(initialMode);
  const [registerStep, setRegisterStep] = useState(1); // 1 = Basic, 2 = Phone, 3 = OTP
  const toast = useToast();
  const [showBannedModal, setShowBannedModal] = useState(false);
  // 'banned' | 'deactivated' — picks the popup copy; support contact details
  // are admin-editable via the CMS (see lib/contentApi.js).
  const [blockedReason, setBlockedReason] = useState('banned');
  const [supportContact, setSupportContact] = useState({ email: 'support@findyourtrek.com', phone: '+91 99999 88888' });

  useEffect(() => {
    contentApi.getContent().then((c) => {
      if (c?.support) setSupportContact({ email: c.support.email, phone: c.support.phone });
    });
  }, []);

  // Fields for forms
  // Which portal the person is signing in to: 'TRAVELLER' or 'ORGANIZER'.
  // Both share the same account/credentials — the Organizer tab just gates on isOrganizer.
  const [role, setRole] = useState('TRAVELLER');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');

  const resetForgotState = () => {
    setForgotPhone('');
    setForgotStep(1);
    setForgotOtp('');
    setForgotNewPass('');
    setForgotConfirmPass('');
  };

  useEffect(() => {
    setMode(initialMode);
    setRegisterStep(1);
    resetForgotState();
  }, [initialMode]);
  
  // Fields for Register
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAge, setRegAge] = useState(24);
  // Phone OTP verification for the signup flow — the number must be confirmed
  // before an account can be created.
  const regPhoneVerify = usePhoneVerification(regPhone);

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(30);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showOrgTransition, setShowOrgTransition] = useState(false);
  const [roleSwitchLabel, setRoleSwitchLabel] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Start OTP timer if confirm screen
  useEffect(() => {
    let interval;
    if (mode === 'OTP_CONFIRM' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, otpTimer]);

  // Persists the real organizer account (returned by the API) into the
  // organizer panel's own session storage and hands off to /organizer — the
  // two modules run as independent mini-SPAs (see main.jsx path-prefix
  // routing) with no shared auth context. The org account already carries
  // isApproved/isPendingApproval, so OrgApp routes to dashboard vs. pending.
  const redirectToOrganizerPanel = (organizerAccount) => {
    localStorage.setItem(
      ORG_USER_STORAGE_KEY,
      JSON.stringify({ ...organizerAccount, rememberMe }),
    );
    localStorage.setItem('trekigo_active_role', 'organizer');
    window.location.href = '/organizer';
  };

  // Plays the same blur+pill transition briefly when toggling between the
  // Traveller and Organizer login forms, before the form itself flips over.
  const handleToggleRole = () => {
    const nextRole = role === 'ORGANIZER' ? 'TRAVELLER' : 'ORGANIZER';
    setErrorMsg('');
    setSuccessMsg('');
    setRoleSwitchLabel(nextRole === 'ORGANIZER' ? 'Switching to Organizer' : 'Switching to Traveller');
    setTimeout(() => {
      setRole(nextRole);
      setRoleSwitchLabel(null);
    }, 1400);
  };

  const handleLoginEmail = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const inputVal = email.trim();
    if (!inputVal || !password) {
      setErrorMsg('Please specify both email/phone number and password.');
      toast.error('Please specify both email/phone number and password.');
      return;
    }

    const isPhone = /^\d+$/.test(inputVal);
    if (isPhone && !/^\d{10}$/.test(inputVal)) {
      setErrorMsg('Please enter a valid 10-digit phone number or email address.');
      toast.error('Please enter a valid 10-digit phone number or email address.');
      return;
    }
    if (!isPhone && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputVal)) {
      setErrorMsg('Please enter a valid email address or 10-digit phone number.');
      toast.error('Please enter a valid email address or 10-digit phone number.');
      return;
    }

    setSubmitting(true);
    try {
      if (role === 'ORGANIZER') {
        const organizer = await authApi.loginOrganizer(inputVal, password);
        setSuccessMsg('Organizer access verified! Redirecting to your dashboard...');
        setShowOrgTransition(true);
        setTimeout(() => redirectToOrganizerPanel(organizer), 1400);
      } else {
        const user = await authApi.loginCustomer(inputVal, password);
        setSuccessMsg('Logged in successfully!');
        onSuccess({ ...user, rememberMe });
      }
    } catch (err) {
      const lowerMsg = err.message?.toLowerCase() || '';
      if (err.status === 403 && lowerMsg.includes('deactivated')) {
        setBlockedReason('deactivated');
        setShowBannedModal(true);
      } else if (err.status === 403 && lowerMsg.includes('banned')) {
        setBlockedReason('banned');
        setShowBannedModal(true);
      } else {
        const message = role === 'ORGANIZER' && err?.status === 401
          ? "Invalid organizer credentials. If you're a new agency, apply from the Organizer Panel."
          : errText(err, 'Sign in failed. Please try again.');
        setErrorMsg(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.requestOtp(phone);
      setOtpTimer(30);
      setMode('OTP_CONFIRM');
      setSuccessMsg('OTP sent to your device!');
      toast.success('OTP sent to your device!');
    } catch (err) {
      const message = errText(err, 'Could not send OTP. Please try again.');
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOTPVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const user = await authApi.verifyOtp(phone, otpCode || '123456');
      setSuccessMsg('Mobile OTP Verified!');
      onSuccess({ ...user, rememberMe });
    } catch (err) {
      const lowerMsg = err.message?.toLowerCase() || '';
      if (err.status === 403 && lowerMsg.includes('deactivated')) {
        setBlockedReason('deactivated');
        setShowBannedModal(true);
      } else if (err.status === 403 && lowerMsg.includes('banned')) {
        setBlockedReason('banned');
        setShowBannedModal(true);
      } else {
        const message = errText(err, 'Incorrect OTP. Please try again.');
        setErrorMsg(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBasicNext = async (e) => {
    e.preventDefault();

    if (!regName.trim()) {
      toast.error('Full Name is required.');
      document.getElementById('reg-name')?.focus();
      document.getElementById('reg-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (regName.trim().length < 2) {
      toast.error('Name must be at least 2 characters.');
      document.getElementById('reg-name')?.focus();
      document.getElementById('reg-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.trim()) {
      toast.error('Email Address is required.');
      document.getElementById('reg-email')?.focus();
      document.getElementById('reg-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!emailRegex.test(regEmail.trim())) {
      toast.error('Please enter a valid email address.');
      document.getElementById('reg-email')?.focus();
      document.getElementById('reg-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!regPassword) {
      toast.error('Password is required.');
      document.getElementById('reg-password')?.focus();
      document.getElementById('reg-password')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!PASSWORD_REGEX.test(regPassword)) {
      toast.error(PASSWORD_HELP);
      document.getElementById('reg-password')?.focus();
      document.getElementById('reg-password')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!regAge || regAge < 12 || regAge > 99) {
      toast.error('Age must be between 12 and 99 years.');
      document.getElementById('reg-age')?.focus();
      document.getElementById('reg-age')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.checkAvailability({ email: regEmail.trim() });
      if (!res.available) {
        toast.error(res.message);
        document.getElementById('reg-email')?.focus();
        document.getElementById('reg-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      setRegisterStep(2);
    } catch (err) {
      toast.error(err?.message || 'Could not verify email. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhoneSendOTP = async (e) => {
    e.preventDefault();

    const cleanPhone = regPhone.replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit mobile number.');
      document.getElementById('reg-phone')?.focus();
      document.getElementById('reg-phone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.checkAvailability({ mobile: regPhone });
      if (!res.available) {
        toast.error(res.message);
        document.getElementById('reg-phone')?.focus();
        document.getElementById('reg-phone')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const sentOk = await regPhoneVerify.send();
      if (sentOk) {
        setRegisterStep(3);
        toast.success('OTP code sent to your mobile.');
      } else {
        toast.error(regPhoneVerify.error || 'Failed to send OTP.');
      }
    } catch (err) {
      toast.error(err?.message || 'Could not send OTP. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOTPVerifyAndRegister = async (e) => {
    e.preventDefault();

    const otpVal = regPhoneVerify.code;
    if (!otpVal || otpVal.length < 6) {
      toast.error('Please enter the 6-digit OTP code.');
      document.getElementById('reg-otp')?.focus();
      document.getElementById('reg-otp')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const verifyOk = await regPhoneVerify.verify();
      if (!verifyOk) {
        toast.error(regPhoneVerify.error || 'Incorrect OTP code.');
        setSubmitting(false);
        return;
      }

      const newUser = await authApi.registerCustomer({
        name: regName,
        email: regEmail,
        password: regPassword,
        mobile: regPhone,
        phoneToken: regPhoneVerify.token || 'demo-token',
        age: regAge,
      });

      toast.success('Registration successful!');
      onSuccess({ ...newUser, rememberMe });
    } catch (err) {
      toast.error(err?.message || 'Registration failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassSendOtp = async (e) => {
    e.preventDefault();
    const cleanPhone = forgotPhone.replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.requestOtp(cleanPhone);
      setForgotStep(2);
      toast.success('OTP sent to your mobile');
    } catch (err) {
      toast.error(err?.message || 'Could not send OTP. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassReset = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      toast.error('Please enter the verification code.');
      return;
    }
    if (!forgotNewPass) {
      toast.error('Please enter a new password.');
      return;
    }
    if (!PASSWORD_REGEX.test(forgotNewPass)) {
      toast.error(PASSWORD_HELP);
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const cleanPhone = forgotPhone.replace(/\D/g, '');
      await authApi.resetPasswordOtp({
        mobile: cleanPhone,
        otpCode: forgotOtp.trim(),
        newPassword: forgotNewPass
      });
      toast.success('Password reset successfully! Please sign in.');
      resetForgotState();
      setMode('LOGIN_EMAIL');
    } catch (err) {
      toast.error(err?.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const isRegister = mode === 'REGISTER';

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center overflow-y-auto font-sans px-4 py-8 w-full ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'
    }`}>
      {showOrgTransition && <SwitchTransition darkMode={darkMode} label="Switching to Organizer Panel" showScene />}
      {roleSwitchLabel && <SwitchTransition darkMode={darkMode} label={roleSwitchLabel} showScene />}

      {/* Brand logo — compact when in REGISTER mode */}
      <div className={`flex flex-col items-center shrink-0 w-full max-w-md ${isRegister ? 'pt-2 pb-3' : 'pt-2 pb-6'}`}>
        <AppLogo size={isRegister ? 40 : 56} className="text-forest-600 dark:text-forest-400" />
        <h1 className={`font-display font-black tracking-tight text-forest-600 dark:text-forest-400 ${isRegister ? 'text-2xl mt-1' : 'text-3xl mt-2'}`}>
          Find Your Trek
        </h1>
        {!isRegister && (
          <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            PREMIUM OUTDOORS & ALPINE EXPLORATIONS
          </p>
        )}
      </div>

      {/* Main Container body */}
      <div className={`w-full max-w-md rounded-3xl shadow-2xl border ${
        darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200/80'
      } ${isRegister ? 'p-5 sm:p-6' : 'p-6 sm:p-8'}`}>

        {/* Errors & Confirms */}
        {errorMsg && (
          <div className="mb-4 text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/35 p-3 rounded-xl space-y-2">
            <div>{errorMsg}</div>
            {errorMsg.toLowerCase().includes('organizer profile') && (
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleToggleRole}
                  className="px-2.5 py-1 text-[11px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                >
                  Switch to Traveller Sign-In →
                </button>
              </div>
            )}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/35 p-3 rounded-xl">
            {successMsg}
          </div>
        )}

        {/* Transition modes block */}
        {mode === 'LOGIN_EMAIL' && (
          <form onSubmit={handleLoginEmail} className="space-y-4">
            <h2 className="text-xl font-display font-extrabold tracking-tight">
              {role === 'ORGANIZER' ? 'Welcome Back, Partner' : 'Welcome Adventurer'}
            </h2>
            <p className={`text-xs -mt-1 pb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {role === 'ORGANIZER' ? 'Sign in to manage your listed trips' : 'Sign in to explore custom high-risk trails'}
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-wider uppercase opacity-80">Email Address or Phone Number</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Email address or 10-digit phone number"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-hidden focus:border-forest-500 border transition-all ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold tracking-wider uppercase opacity-80">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    resetForgotState();
                    setMode('FORGOT_PASSWORD');
                  }}
                  className="text-[11px] text-spy-orange hover:underline font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full text-sm pl-10 pr-10 py-3 rounded-xl outline-hidden focus:border-forest-500 border transition-all ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded accent-forest-600 border-gray-300 pointer-events-auto"
                />
                Remember Me
              </label>
              {role === 'TRAVELLER' && (
                <button
                  type="button"
                  onClick={() => setMode('LOGIN_OTP')}
                  className="text-xs text-forest-500 dark:text-forest-400 font-semibold hover:underline"
                >
                  Use Mobile OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              id="btn-login-email-submit"
              disabled={submitting}
              className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed ${
                role === 'ORGANIZER' ? 'bg-spy-orange hover:bg-[#d96d1a]' : 'bg-forest-600 hover:bg-forest-700'
              }`}
            >
              {submitting ? 'Signing In…' : role === 'ORGANIZER' ? 'Sign In to Organizer Panel' : 'Sign In'}
            </button>

            <button
              type="button"
              id="btn-switch-role"
              onClick={handleToggleRole}
              className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-3 rounded-xl border cursor-pointer transition-all ${
                darkMode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-850' : 'border-gray-200 text-zinc-600 hover:bg-gray-50'
              }`}
            >
              {role === 'ORGANIZER' ? (
                <><User size={14} /> Switch to Traveller</>
              ) : (
                <><Building2 size={14} /> Switch to Organizer</>
              )}
            </button>

          </form>
        )}

        {mode === 'LOGIN_OTP' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <h2 className="text-xl font-display font-extrabold tracking-tight">Mobile Sign-In</h2>
            <p className={`text-xs -mt-1 pb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Access safe routing via direct phone OTP verification
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase opacity-80">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className={`w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-hidden focus:border-forest-500 border transition-all ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setMode('LOGIN_EMAIL')}
                className="text-forest-500 dark:text-forest-400 font-semibold hover:underline"
              >
                Back to Password
              </button>
            </div>

            <button
              type="submit"
              id="btn-send-otp-submit"
              disabled={submitting}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending…' : 'Send OTP Code'}
            </button>
          </form>
        )}

        {mode === 'OTP_CONFIRM' && (
          <form onSubmit={handleOTPVerify} className="space-y-4">
            <h2 className="text-xl font-display font-extrabold tracking-tight">Enter Verification Code</h2>
            <p className={`text-xs -mt-1 pb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              One-time code sent to <span className="font-semibold text-spy-orange">{phone}</span>
            </p>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold uppercase opacity-80">6-Digit OTP</label>
                <span className="text-xs text-zinc-400 font-mono">
                  {otpTimer > 0 ? `00:${otpTimer.toString().padStart(2, '0')}` : 'Expired'}
                </span>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  className="w-full text-sm font-semibold tracking-widest text-center pl-10 pr-4 py-3 rounded-xl outline-hidden border border-forest-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setMode('LOGIN_OTP')}
                className="text-zinc-400 hover:underline"
              >
                Change Number
              </button>
              <button
                type="button"
                disabled={otpTimer > 0}
                onClick={() => { setOtpTimer(30); setSuccessMsg('OTP Code Resent!'); }}
                className={`font-semibold ${otpTimer > 0 ? 'text-zinc-600 cursor-not-allowed' : 'text-spy-orange active:scale-95'}`}
              >
                Resend OTP
              </button>
            </div>

            <button
              type="submit"
              id="btn-verify-otp-submit"
              disabled={submitting}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 cursor-pointer active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Verifying…' : 'Verify OTP & Sign In'}
            </button>
          </form>
        )}

        {mode === 'FORGOT_PASSWORD' && (
          <div>
            {forgotStep === 1 ? (
              <form onSubmit={handleForgotPassSendOtp} className="space-y-4">
                <h2 className="text-xl font-display font-extrabold tracking-tight">Reset Password</h2>
                <p className={`text-xs -mt-1 pb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Enter your registered mobile number to receive a verification code.
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase opacity-80">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={forgotPhone}
                      onChange={e => setForgotPhone(e.target.value.replace(/\D/g, ''))}
                      className={`w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-hidden focus:border-forest-500 border transition-all ${
                        darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      resetForgotState();
                      setMode('LOGIN_EMAIL');
                    }}
                    className="text-forest-500 dark:text-forest-400 font-semibold hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassReset} className="space-y-4">
                <h2 className="text-xl font-display font-extrabold tracking-tight">Reset Password</h2>
                <p className={`text-xs -mt-1 pb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Code sent to <span className="font-semibold text-spy-orange">{forgotPhone}</span>
                </p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase opacity-85">6-Digit OTP</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={forgotOtp}
                        onChange={e => setForgotOtp(e.target.value)}
                        className={`w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-hidden focus:border-forest-500 border ${
                          darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase opacity-85">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input
                        type="password"
                        placeholder="New Password (min 6 characters)"
                        value={forgotNewPass}
                        onChange={e => setForgotNewPass(e.target.value)}
                        className={`w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-hidden focus:border-forest-500 border ${
                          darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase opacity-85">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={forgotConfirmPass}
                        onChange={e => setForgotConfirmPass(e.target.value)}
                        className={`w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-hidden focus:border-forest-500 border ${
                          darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotOtp('');
                      setForgotNewPass('');
                      setForgotConfirmPass('');
                    }}
                    className="text-forest-500 dark:text-forest-400 font-semibold hover:underline"
                  >
                    Back to Mobile Input
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        )}

        {mode === 'REGISTER' && (
          <div className="pointer-events-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-lg font-display font-extrabold tracking-tight text-forest-600 dark:text-forest-400">Register Account</h2>
              <span className="text-[10px] bg-forest-100 dark:bg-forest-950/40 text-forest-600 dark:text-forest-400 px-2 py-0.5 rounded-full font-bold">
                Step {registerStep} of 3
              </span>
            </div>

            {registerStep === 1 && (
              <form onSubmit={handleBasicNext} className="space-y-3">
                <p className={`text-[11px] -mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Step 1: Enter your basic profile details below.
                </p>

                {/* Name */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                    <input
                      type="text"
                      id="reg-name"
                      placeholder="Chirag Jeevanani"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className={`w-full text-xs pl-8 pr-4 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                        darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                    <input
                      type="email"
                      id="reg-email"
                      placeholder="name@example.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className={`w-full text-xs pl-8 pr-4 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                        darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="reg-password"
                      placeholder="At least 8 chars, 1 letter & 1 number"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className={`w-full text-xs pl-8 pr-10 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                        darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {/* Age field */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider">Age</label>
                  <input
                    type="number"
                    id="reg-age"
                    min={12}
                    max={99}
                    value={regAge}
                    onChange={e => setRegAge(Number(e.target.value))}
                    className={`w-full text-xs px-3 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                      darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 rounded-xl shadow-lg mt-3 cursor-pointer active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-xs"
                >
                  {submitting ? 'Checking Availability…' : 'Continue to Mobile Setup'}
                </button>
              </form>
            )}

            {registerStep === 2 && (
              <form onSubmit={handlePhoneSendOTP} className="space-y-3">
                <p className={`text-[11px] -mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Step 2: Enter your mobile number to receive verification code.
                </p>

                {/* Mobile number input */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                    <input
                      type="tel"
                      id="reg-phone"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value.replace(/\D/g, ''))}
                      className={`w-full text-xs pl-8 pr-4 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                        darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegisterStep(1)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-98 ${
                      darkMode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-850' : 'border-gray-200 text-zinc-600 hover:bg-gray-50'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 rounded-xl shadow-lg cursor-pointer active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-xs"
                  >
                    {submitting ? 'Checking number…' : 'Send OTP'}
                  </button>
                </div>
              </form>
            )}

            {registerStep === 3 && (
              <form onSubmit={handleOTPVerifyAndRegister} className="space-y-3">
                <p className={`text-[11px] -mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Step 3: Enter the verification code sent to <span className="font-semibold text-spy-orange">{regPhone}</span>.
                </p>

                {/* OTP code input */}
                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider">6-Digit OTP</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                    <input
                      type="text"
                      id="reg-otp"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={regPhoneVerify.code}
                      onChange={e => regPhoneVerify.setCode(e.target.value)}
                      className={`w-full text-xs pl-8 pr-4 py-2 rounded-xl outline-hidden focus:border-forest-500 border tracking-[0.3em] ${
                        darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                      }`}
                    />
                  </div>
                </div>

                {regPhoneVerify.error && (
                  <p className="text-[10px] font-semibold text-red-500">{regPhoneVerify.error}</p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegisterStep(2)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-98 ${
                      darkMode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-850' : 'border-gray-200 text-zinc-650'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 rounded-xl shadow-lg cursor-pointer active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-xs"
                  >
                    {submitting ? 'Verifying…' : 'Verify & Sign Up'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Alternate login / Register switch bottom */}
        <div className={`mt-3 pt-3 border-t text-center text-xs ${
          darkMode ? 'border-zinc-800 text-zinc-400' : 'border-gray-200 text-zinc-650'
        }`}>
          {mode !== 'REGISTER' ? (
            role === 'ORGANIZER' ? (
              <p>
                New agency wanting to list trips?{' '}
                <button
                  type="button"
                  onClick={() => { window.location.href = '/organizer/register'; }}
                  className="text-spy-orange font-bold hover:underline"
                >
                  Apply as Organizer
                </button>
              </p>
            ) : (
              <p>
                Don't have an adventure account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetForgotState();
                    setRole('TRAVELLER');
                    onSwitchToRegister ? onSwitchToRegister() : setMode('REGISTER');
                  }}
                  className="text-spy-orange font-bold hover:underline"
                >
                  Sign Up Now
                </button>
              </p>
            )
          ) : (
            <p>
              Already verified on Find Your Trek?{' '}
              <button
                type="button"
                onClick={() => {
                  resetForgotState();
                  onSwitchToLogin ? onSwitchToLogin() : setMode('LOGIN_EMAIL');
                }}
                className="text-spy-orange font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Footer support coordinates */}
      {!isRegister && (
        <div className={`py-4 text-center text-[10px] opacity-75 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <p className="flex items-center justify-center gap-1">
            <Globe size={11} /> Secured server tunnel connections active
          </p>
        </div>
      )}

      {/* User Banned Popup Dialog with Customer Support Details */}
      <AnimatePresence>
        {showBannedModal && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#1C120C] border border-red-500/30 rounded-3xl p-6 w-full text-center space-y-4 shadow-xl text-zinc-800 dark:text-zinc-200 z-[1001]"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-serif text-base font-bold text-red-600 dark:text-red-500">
                  {blockedReason === 'deactivated' ? 'Account Deactivated' : 'Access Denied'}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-450 font-bold leading-relaxed">
                  {blockedReason === 'deactivated'
                    ? 'Your account is deactivated. Kindly contact customer support for more details.'
                    : 'User is banned, kindly contact the customer support for more info.'}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#2A1E17] border border-slate-100 dark:border-white/5 rounded-2xl p-4 text-left space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400">Customer Support Contacts</div>
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <Phone size={13} className="text-[#F27D26]" />
                  <span>{supportContact.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <Mail size={13} className="text-[#F27D26]" />
                  <span>{supportContact.email}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBannedModal(false)}
                className="w-full bg-[#F27D26] hover:bg-[#d96d1a] text-white text-xs font-bold py-3 rounded-full cursor-pointer active:scale-95 transition-all"
              >
                Okay
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
