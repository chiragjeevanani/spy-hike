import React, { useState, useEffect } from 'react';
import { Mail, Lock, Phone, User, Compass, Eye, EyeOff, KeyRound, Globe, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import authApi from '../../../lib/authApi';
import usePhoneVerification from '../../../lib/usePhoneVerification';
import SwitchTransition from './SwitchTransition';
import TrekigoLogo from '../../../components/TrekigoLogo';

// Turns an ApiClientError (or any error) into a user-facing message.
const errText = (err, fallback) => err?.message || fallback;

const ORG_USER_STORAGE_KEY = 'trekigo_org_user';
const ORGANIZER_TRANSITION_MS = 3000; // lets the climb→camp flip play, then holds briefly before redirecting
const ROLE_TOGGLE_TRANSITION_MS = 3000; // lets the scene flip play before the login form switches role

export default function Auth({ onSuccess, darkMode, initialMode = 'LOGIN_EMAIL', onSwitchToRegister, onSwitchToLogin }) {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Which portal the person is signing in to: 'TRAVELLER' or 'ORGANIZER'.
  // Both share the same account/credentials — the Organizer tab just gates on isOrganizer.
  const [role, setRole] = useState('TRAVELLER');

  // Fields for forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
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
    }, ROLE_TOGGLE_TRANSITION_MS);
  };

  const handleLoginEmail = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please specify both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      if (role === 'ORGANIZER') {
        // Organizer login hits the organizer endpoint directly — it fails if
        // this account isn't registered as an organizer.
        const organizer = await authApi.loginOrganizer(email, password);
        setSuccessMsg('Organizer access verified! Redirecting to your dashboard...');
        setShowOrgTransition(true);
        setTimeout(() => redirectToOrganizerPanel(organizer), ORGANIZER_TRANSITION_MS);
      } else {
        const user = await authApi.loginCustomer(email, password);
        setSuccessMsg('Logged in successfully!');
        onSuccess({ ...user, rememberMe });
      }
    } catch (err) {
      setErrorMsg(
        role === 'ORGANIZER' && err?.status === 401
          ? "Invalid organizer credentials. If you're a new agency, apply from the Organizer Panel."
          : errText(err, 'Sign in failed. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone || phone.length < 9) {
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.requestOtp(phone);
      setOtpTimer(30);
      setMode('OTP_CONFIRM');
      setSuccessMsg('OTP sent to your device! (demo code: 123456)');
    } catch (err) {
      setErrorMsg(errText(err, 'Could not send OTP. Please try again.'));
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
      setErrorMsg(errText(err, 'Incorrect OTP. Use 123456.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regName || !regEmail || !regPassword || !regPhone) {
      setErrorMsg('Please specify all required fields.');
      return;
    }
    if (!regPhoneVerify.verified) {
      setErrorMsg('Please verify your mobile number with the OTP before signing up.');
      return;
    }

    setSubmitting(true);
    try {
      const newUser = await authApi.registerCustomer({
        name: regName,
        email: regEmail,
        password: regPassword,
        mobile: regPhone,
        phoneToken: regPhoneVerify.token,
        age: regAge,
      });
      setSuccessMsg('Registration Success! Opening onboarding guide...');
      // New accounts start un-onboarded → onSuccess routes into the guide.
      onSuccess({ ...newUser, rememberMe });
    } catch (err) {
      setErrorMsg(errText(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPass = (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Enter your email to send recovery guidelines.');
      return;
    }
    setSuccessMsg('Simulated recovery instructions sent to ' + email);
    setTimeout(() => setMode('LOGIN_EMAIL'), 2500);
  };

  const isRegister = mode === 'REGISTER';

  return (
    <div className={`relative h-full flex flex-col overflow-y-auto font-sans px-5 ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'
    }`}>
      {showOrgTransition && <SwitchTransition darkMode={darkMode} label="Switching to Organizer Panel" showScene />}
      {roleSwitchLabel && <SwitchTransition darkMode={darkMode} label={roleSwitchLabel} showScene />}

      {/* Brand logo — compact when in REGISTER mode */}
      <div className={`flex flex-col items-center shrink-0 ${isRegister ? 'pt-4 pb-3' : 'pt-8 pb-6'}`}>
        <TrekigoLogo size={isRegister ? 40 : 56} className="text-forest-600 dark:text-forest-400" />
        <h1 className={`font-display font-black tracking-tight text-forest-600 dark:text-forest-400 ${isRegister ? 'text-2xl mt-1' : 'text-3xl mt-2'}`}>
          Trekigo
        </h1>
        {!isRegister && (
          <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            PREMIUM OUTDOORS & ALPINE EXPLORATIONS
          </p>
        )}
      </div>

      {/* Main Container body */}
      <div className={`w-full rounded-3xl shadow-xl mx-0 ${
        darkMode ? 'bg-zinc-900' : 'bg-white'
      } ${isRegister ? 'p-5' : 'p-6'}`}>

        {/* Errors & Confirms */}
        {errorMsg && (
          <div className="mb-4 text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/35 p-3 rounded-xl">
            {errorMsg}
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
              <label className="text-[11px] font-semibold tracking-wider uppercase opacity-80">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="email"
                  placeholder="name@example.com"
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
                  onClick={() => setMode('FORGOT_PASSWORD')}
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

            {/* Demo credentials hint */}
            <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
              darkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-gray-50 border-gray-200 text-zinc-500'
            }`}>
              <span className={`font-semibold block mb-1 ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {role === 'ORGANIZER' ? 'Quick Demo Access (Verified Organizer):' : 'Quick Demo Access:'}
              </span>
              <div className="flex justify-between font-mono text-[10px]">
                <div>Email: <span className="text-spy-orange font-semibold">chiragjeevanani333@gmail.com</span></div>
                <div>Pass: <span className="text-spy-orange font-semibold">trekigo123</span></div>
              </div>
              {role === 'ORGANIZER' && (
                <p className="mt-1.5 opacity-80">This account is pre-approved as an organizer — any other email won't pass the Organizer gate.</p>
              )}
            </div>
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
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
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
                  placeholder="Enter 1234 or leave blank"
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
          <form onSubmit={handleForgotPass} className="space-y-4">
            <h2 className="text-xl font-display font-extrabold tracking-tight">Reset Password</h2>
            <p className={`text-xs -mt-1 pb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Regain routing capabilities on standard servers
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase opacity-80">Your Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
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
                Back to Sign In
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 cursor-pointer"
            >
              Send Recovery Guidelines
            </button>
          </form>
        )}

        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-2 pointer-events-auto">
            <h2 className="text-lg font-display font-extrabold tracking-tight text-forest-600 dark:text-forest-400">Register Account</h2>
            <p className={`text-[11px] -mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Unlock onboarding maps and custom guide profiles
            </p>

            {/* Name */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                <input
                  type="text"
                  required
                  placeholder="Chirag Jeevanani"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className={`w-full text-xs pl-8 pr-4 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
              </div>
            </div>

            {/* Mobile + OTP verification */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider flex items-center gap-1">
                Mobile Number
                {regPhoneVerify.verified && (
                  <span className="text-emerald-500 flex items-center gap-0.5 font-bold normal-case tracking-normal">
                    <CheckCircle2 size={11} /> Verified
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={regPhone}
                    disabled={regPhoneVerify.verified}
                    onChange={e => setRegPhone(e.target.value)}
                    className={`w-full text-xs pl-8 pr-4 py-2 rounded-xl outline-hidden focus:border-forest-500 border disabled:opacity-70 ${
                      darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                    }`}
                  />
                </div>
                {!regPhoneVerify.sent && !regPhoneVerify.verified && (
                  <button
                    type="button"
                    id="btn-reg-send-otp"
                    onClick={() => regPhoneVerify.send()}
                    disabled={regPhoneVerify.busy}
                    className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-bold border border-forest-500/40 text-forest-600 dark:text-forest-400 hover:bg-forest-500/10 disabled:opacity-60 transition-all"
                  >
                    {regPhoneVerify.busy ? '…' : 'Send OTP'}
                  </button>
                )}
              </div>

              {/* OTP code entry appears after the code is sent */}
              {regPhoneVerify.sent && !regPhoneVerify.verified && (
                <div className="flex gap-2 pt-1.5">
                  <div className="relative flex-1">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter OTP (123456)"
                      value={regPhoneVerify.code}
                      onChange={e => regPhoneVerify.setCode(e.target.value)}
                      className={`w-full text-xs pl-8 pr-4 py-2 rounded-xl outline-hidden focus:border-forest-500 border tracking-[0.3em] ${
                        darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    id="btn-reg-verify-otp"
                    onClick={() => regPhoneVerify.verify()}
                    disabled={regPhoneVerify.busy}
                    className="shrink-0 px-4 py-2 rounded-xl text-[11px] font-bold bg-forest-600 hover:bg-forest-700 text-white disabled:opacity-60 transition-all"
                  >
                    {regPhoneVerify.busy ? '…' : 'Verify'}
                  </button>
                </div>
              )}
              {(regPhoneVerify.error || regPhoneVerify.info) && (
                <p className={`text-[10px] font-semibold pt-1 ${regPhoneVerify.error ? 'text-red-500' : 'text-emerald-500'}`}>
                  {regPhoneVerify.error || regPhoneVerify.info}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase opacity-70 tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                <input
                  type="email"
                  required
                  placeholder="chiragjeevanani333@gmail.com"
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
                  required
                  placeholder="Minimum 6 characters"
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
                min={12}
                max={99}
                required
                value={regAge}
                onChange={e => setRegAge(Number(e.target.value))}
                className={`w-full text-xs px-3 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                  darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                }`}
              />
            </div>

            <button
              type="submit"
              id="btn-register-submit"
              disabled={submitting || !regPhoneVerify.verified}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 rounded-xl shadow-lg mt-1 cursor-pointer active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Account…' : regPhoneVerify.verified ? 'Complete Safe SignUp' : 'Verify Mobile to Continue'}
            </button>
          </form>
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
                  onClick={() => { setRole('TRAVELLER'); onSwitchToRegister ? onSwitchToRegister() : setMode('REGISTER'); }}
                  className="text-spy-orange font-bold hover:underline"
                >
                  Sign Up Now
                </button>
              </p>
            )
          ) : (
            <p>
              Already verified on Trekigo?{' '}
              <button
                type="button"
                onClick={() => onSwitchToLogin ? onSwitchToLogin() : setMode('LOGIN_EMAIL')}
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

    </div>
  );
}
