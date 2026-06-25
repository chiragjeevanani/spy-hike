import React, { useState, useEffect } from 'react';
import { Mail, Lock, Phone, User, Compass, Eye, EyeOff, KeyRound, Globe } from 'lucide-react';

export default function Auth({ onSuccess, darkMode, initialMode = 'LOGIN_EMAIL', onSwitchToRegister, onSwitchToLogin }) {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  
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
      onSuccess(user);
    } else {
      // Create user on the fly or log in as standard adventurer
      const standardUser = {
        isAuthenticated: true,
        isOnboarded: true,
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
      setSuccessMsg('Logged in successfully!');
      setTimeout(() => onSuccess(standardUser), 600);
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
    setTimeout(() => onSuccess(user), 800);
  };

  const handleGoogleSignIn = () => {
    setErrorMsg('');
    setSuccessMsg('Google Authenticated Successfully!');
    const user = {
      isAuthenticated: true,
      isOnboarded: true,
      name: 'Chirag Jeevanani (Google)',
      email: 'chiragjeevanani333@gmail.com',
      mobile: '+91 98765 00000',
      age: 24,
      gender: 'Male',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      hikingExperience: 'Advanced',
      fitnessLevel: 'High',
      emergencyContact: 'Asha Jeevanani (+91 98765 43219)',
      rememberMe,
    };
    setTimeout(() => onSuccess(user), 800);
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
    <div className={`h-full flex flex-col justify-between overflow-y-auto font-sans px-6 py-8 ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'
    }`}>
      
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
            <h2 className="text-xl font-display font-extrabold tracking-tight">Welcome Adventurer</h2>
            <p className={`text-xs -mt-1 pb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Sign in to explore custom high-risk trails
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
              <button
                type="button"
                onClick={() => setMode('LOGIN_OTP')}
                className="text-xs text-forest-500 dark:text-forest-400 font-semibold hover:underline"
              >
                Use Mobile OTP
              </button>
            </div>

            <button
              type="submit"
              id="btn-login-email-submit"
              className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 cursor-pointer active:scale-98"
            >
              Sign In
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
            <p>
              Don't have an adventure account?{' '}
              <button
                type="button"
                onClick={() => onSwitchToRegister ? onSwitchToRegister() : setMode('REGISTER')}
                className="text-spy-orange font-bold hover:underline"
              >
                Sign Up Now
              </button>
            </p>
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

      {/* Social login option */}
      {mode !== 'REGISTER' && mode !== 'OTP_CONFIRM' && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`h-px flex-1 ${darkMode ? 'bg-zinc-850' : 'bg-gray-200'}`}></span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">OR CONTINUE WITH</span>
            <span className={`h-px flex-1 ${darkMode ? 'bg-zinc-850' : 'bg-gray-200'}`}></span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-xs font-bold border cursor-pointer active:scale-98 transition ${
              darkMode 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-850' 
                : 'bg-white border-gray-200 text-zinc-700 hover:bg-gray-50'
            }`}
          >
            {/* Visual simulation of Google color icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            Google Sign In
          </button>
        </div>
      )}

      {/* Footer support coordinates */}
      <div className={`mt-auto pt-6 text-center text-[10px] opacity-75 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <p className="flex items-center justify-center gap-1">
          <Globe size={11} /> Secured server tunnel connections active
        </p>
      </div>

    </div>
  );
}
