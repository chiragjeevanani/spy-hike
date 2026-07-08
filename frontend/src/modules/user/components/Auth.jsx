import React, { useState, useEffect } from 'react';
import { Mail, Lock, Phone, User, Compass, Eye, EyeOff, KeyRound, Globe, Building2 } from 'lucide-react';
import { saveUserState } from '../utils/storage';
import SwitchTransition from './SwitchTransition';

const ORG_USER_STORAGE_KEY = 'spyhike_org_user';
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
  const [regGender, setRegGender] = useState('Male');

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(30);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showOrgTransition, setShowOrgTransition] = useState(false);
  const [roleSwitchLabel, setRoleSwitchLabel] = useState(null);

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

  // Mirrors this account into the organizer panel's own session storage and
  // hands off to /organizer — the two modules run as independent mini-SPAs
  // (see main.jsx path-prefix routing) with no shared auth context.
  const redirectToOrganizerPanel = (loggedInUser) => {
    let existingOrg = {};
    try {
      const val = localStorage.getItem(ORG_USER_STORAGE_KEY);
      if (val) existingOrg = JSON.parse(val);
    } catch (e) {}

    const orgUser = {
      agencyName: loggedInUser.name,
      agencyWebsite: '',
      socialMediaLink: 'https://instagram.com/spyhikeorganizer',
      govtIdType: 'Aadhaar',
      govtIdNumber: '',
      yearsExperience: 1,
      bio: 'Verified Spy Hike organizer.',
      verificationDocumentUrl: '',
      rating: 4.8,
      totalTrips: 0,
      totalBookings: 0,
      coreCapabilities: ['Certified Trek Leader'],
      ...existingOrg,
      // Being flagged isOrganizer means this account is already a vetted
      // organizer, so it skips the fresh-signup onboarding/approval gates.
      isAuthenticated: true,
      isOnboarded: true,
      isApproved: true,
      isPendingApproval: false,
      name: loggedInUser.name,
      email: loggedInUser.email,
      mobile: loggedInUser.mobile,
      avatar: loggedInUser.avatar,
      rememberMe,
    };
    localStorage.setItem(ORG_USER_STORAGE_KEY, JSON.stringify(orgUser));
    window.location.href = '/organizer';
  };

  // Routes a successfully-authenticated account to the right portal based on
  // the selected role tab, gating Organizer access on the isOrganizer flag.
  const completeLogin = (loggedInUser) => {
    if (role === 'ORGANIZER') {
      if (!loggedInUser.isOrganizer) {
        setErrorMsg("This account isn't registered as an organizer yet. Switch to Traveller sign-in, or apply from the Organizer Panel.");
        return;
      }
      setSuccessMsg('Organizer access verified! Redirecting to your dashboard...');
      saveUserState(loggedInUser);
      setShowOrgTransition(true);
      setTimeout(() => redirectToOrganizerPanel(loggedInUser), ORGANIZER_TRANSITION_MS);
      return;
    }
    onSuccess(loggedInUser);
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

  const handleLoginEmail = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Please specify both email and password.');
      return;
    }

    // Check if user exists in our local simulated accounts
    if (email.toLowerCase() === 'chiragjeevanani333@gmail.com' && password === 'spyhike123') {
      const user = {
        isAuthenticated: true,
        isOnboarded: true,
        isOrganizer: true,
        name: 'Chirag Jeevanani',
        email: email,
        mobile: '+91 98765 43210',
        age: 24,
        gender: 'Male',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        hikingExperience: 'Intermediate',
        fitnessLevel: 'High',
        emergencyContact: 'Asha Jeevanani (+91 98765 43219)',
        rememberMe,
      };
      completeLogin(user);
    } else {
      // Create user on the fly or log in as standard adventurer
      const standardUser = {
        isAuthenticated: true,
        isOnboarded: true,
        isOrganizer: false,
        name: email.split('@')[0].toUpperCase(),
        email: email,
        mobile: '+1 (555) 019-2834',
        age: 28,
        gender: 'Male',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
        hikingExperience: 'Beginner',
        fitnessLevel: 'Moderate',
        emergencyContact: 'Emergency Contact (+1 555-010-0000)',
        rememberMe,
      };
      if (role === 'ORGANIZER') {
        completeLogin(standardUser);
      } else {
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => completeLogin(standardUser), 600);
      }
    }
  };

  const handleSendOTP = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone || phone.length < 9) {
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }
    setOtpTimer(30);
    setMode('OTP_CONFIRM');
    setSuccessMsg('Simulated OTP sent to your device!');
  };

  const handleOTPVerify = (e) => {
    e.preventDefault();
    if (otpCode !== '123456' && otpCode.length > 0 && otpCode !== '1234') {
      setErrorMsg('Incorrect OTP. Use 1234 or leave empty.');
      return;
    }
    setSuccessMsg('Mobile OTP Verified!');

    // Auto logged in user
    const user = {
      isAuthenticated: true,
      isOnboarded: true,
      isOrganizer: false,
      name: 'Chirag - Mobile User',
      email: 'chirag.mobile@spyhike.com',
      mobile: phone,
      age: 25,
      gender: 'Male',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
      hikingExperience: 'Intermediate',
      fitnessLevel: 'Moderate',
      emergencyContact: 'Family Member (+91 90000 11111)',
      rememberMe,
    };
    setTimeout(() => completeLogin(user), 800);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regName || !regEmail || !regPassword || !regPhone) {
      setErrorMsg('Please specify all required fields.');
      return;
    }

    const newUser = {
      isAuthenticated: true,
      isOnboarded: false, // Redirect to Onboarding Flow!
      isOrganizer: false,
      name: regName,
      email: regEmail,
      mobile: regPhone,
      age: regAge,
      gender: regGender,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      hikingExperience: 'Beginner', // Default
      fitnessLevel: 'Moderate', // Default
      emergencyContact: 'Unassigned Emergency Contact',
      rememberMe,
    };
    
    setSuccessMsg('Registration Success! Opening onboarding guide...');
    setTimeout(() => onSuccess(newUser), 1000);
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

  return (
    <div className={`relative h-full flex flex-col justify-between overflow-y-auto font-sans px-6 py-8 ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'
    }`}>
      {showOrgTransition && <SwitchTransition darkMode={darkMode} label="Switching to Organizer Panel" showScene />}
      {roleSwitchLabel && <SwitchTransition darkMode={darkMode} label={roleSwitchLabel} showScene />}

      {/* Brand logo top spacing */}
      <div className="flex flex-col items-center mt-6 mb-6">
        <div className="w-14 h-14 bg-forest-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-6 border border-forest-400">
          <Compass className="w-8 h-8 text-white -rotate-6" />
        </div>
        <h1 className="text-3xl font-display font-black mt-4 tracking-tight text-forest-600 dark:text-forest-400">
          Spy Hike
        </h1>
        <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          PREMIUM OUTDOORS & ALPINE EXPLORATIONS
        </p>
      </div>

      {/* Main Container body */}
      <div className={`w-full rounded-3xl p-6 shadow-xl ${
        darkMode ? 'bg-zinc-900' : 'bg-white'
      }`}>

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
              className={`w-full text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 cursor-pointer active:scale-98 ${
                role === 'ORGANIZER' ? 'bg-spy-orange hover:bg-[#d96d1a]' : 'bg-forest-600 hover:bg-forest-700'
              }`}
            >
              {role === 'ORGANIZER' ? 'Sign In to Organizer Panel' : 'Sign In'}
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
                <div>Pass: <span className="text-spy-orange font-semibold">spyhike123</span></div>
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
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 cursor-pointer"
            >
              Send OTP Code
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
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 cursor-pointer active:scale-98"
            >
              Verify OTP & Sign In
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
          <form onSubmit={handleRegister} className="space-y-3.5 max-h-[460px] overflow-y-auto no-scrollbar pointer-events-auto">
            <h2 className="text-xl font-display font-extrabold tracking-tight text-forest-600 dark:text-forest-400">Register Account</h2>
            <p className={`text-xs -mt-1 pb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Unlock onboarding maps and custom guide profiles
            </p>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-80">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="text"
                  required
                  placeholder="Chirag Jeevanani"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl outline-hidden focus:border-forest-500 border ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-80">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl outline-hidden focus:border-forest-500 border ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-80">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="email"
                  required
                  placeholder="chiragjeevanani333@gmail.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl outline-hidden focus:border-forest-500 border ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase opacity-80">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  className={`w-full text-xs pl-9 pr-10 py-2.5 rounded-xl outline-hidden focus:border-forest-500 border ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Two Column details Age & Gender */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase opacity-80">Age</label>
                <input
                  type="number"
                  min={12}
                  max={99}
                  required
                  value={regAge}
                  onChange={e => setRegAge(Number(e.target.value))}
                  className={`w-full text-xs px-3 py-2.5 rounded-xl outline-hidden focus:border-forest-500 border ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase opacity-80">Gender</label>
                <select
                  value={regGender}
                  onChange={e => setRegGender(e.target.value)}
                  className={`w-full text-xs px-2 py-2.5 rounded-xl outline-hidden focus:border-forest-500 border ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
                  }`}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              id="btn-register-submit"
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4 cursor-pointer"
            >
              Complete Safe SignUp
            </button>
          </form>
        )}

        {/* Alternate login / Register switch bottom */}
        <div className={`mt-6 pt-5 border-t text-center text-xs ${
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
              Already verified on Spy Hike?{' '}
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
      <div className={`mt-auto pt-6 text-center text-[10px] opacity-75 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <p className="flex items-center justify-center gap-1">
          <Globe size={11} /> Secured server tunnel connections active
        </p>
      </div>

    </div>
  );
}
