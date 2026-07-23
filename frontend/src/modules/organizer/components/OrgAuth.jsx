import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, Phone, User, Building2, CreditCard, ArrowRight, AlertCircle, ChevronRight, Globe, Instagram, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { saveOrgUser } from '../utils/storage';
import authApi from '../../../lib/authApi';
import usePhoneVerification from '../../../lib/usePhoneVerification';
import AppLogo from '../../../components/AppLogo';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const validateGovtId = (type, number) => {
  if (!number) return 'Government ID number is required.';
  const clean = number.replace(/[\s-]/g, '').toUpperCase();
  switch (type) {
    case 'Aadhaar':
      if (!/^\d{12}$/.test(clean)) {
        return 'Aadhaar Card must be exactly 12 digits (e.g. 1234 5678 9012).';
      }
      break;
    case 'PAN':
      if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(clean)) {
        return 'PAN Card must be in the format ABCDE1234F (5 letters, 4 digits, 1 letter).';
      }
      break;
    case 'GST':
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(clean)) {
        return 'GST Certificate must be a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5).';
      }
      break;
    case 'Passport':
      if (!/^[A-PR-WY-Z]{1}\d{7}$/.test(clean)) {
        return 'Passport must start with one letter (excluding Q, X, Z) followed by 7 digits.';
      }
      break;
    case 'TIN':
      if (!/^\d{11}$/.test(clean)) {
        return 'TIN (Travel India License) must be exactly 11 digits.';
      }
      break;
    default:
      if (clean.length < 5) {
        return 'Please enter a valid government ID number.';
      }
  }
  return null;
};

export default function OrgAuth({ onSuccess, onSwitchMode, darkMode }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    agencyName: '',
    agencyWebsite: '',
    socialMediaLink: '',
    govtIdType: 'Aadhaar',
    govtIdNumber: '',
    yearsExperience: '',
    bio: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // registration multi-step: 1=personal, 2=agency, 3=verification
  // Phone OTP verification — required in step 1 before advancing.
  const phoneVerify = usePhoneVerification(formData.mobile);
  const toast = useToast();

  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const mobileRef = useRef(null);
  const passwordRef = useRef(null);
  const agencyNameRef = useRef(null);
  const socialMediaLinkRef = useRef(null);
  const govtIdNumberRef = useRef(null);
  const fieldRefs = { name: nameRef, email: emailRef, mobile: mobileRef, password: passwordRef, agencyName: agencyNameRef, socialMediaLink: socialMediaLinkRef, govtIdNumber: govtIdNumberRef };

  const totalSteps = 3;

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setError('');
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const fail = (errors, order) => {
    setFieldErrors(errors);
    const message = errors[order.find(f => errors[f])];
    setError(message);
    toast.error(message);
    scrollToFirstError(fieldRefs, errors, order);
  };

  const handleRegisterStep = async () => {
    if (step < totalSteps) {
      if (step === 1) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const mobileRegex = /^\d{10}$/;
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Full name is required.';
        if (!formData.email.trim()) errors.email = 'Email address is required.';
        else if (!emailRegex.test(formData.email.trim())) errors.email = 'Please enter a valid email address.';
        if (!formData.mobile) errors.mobile = 'Mobile number is required.';
        else if (!mobileRegex.test(formData.mobile)) errors.mobile = 'Mobile number must be a valid 10-digit number.';
        else if (!phoneVerify.verified) errors.mobile = 'Please verify your mobile number with the OTP before continuing.';
        if (!formData.password) errors.password = 'Password is required.';
        else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters.';

        if (Object.keys(errors).length > 0) return fail(errors, ['name', 'email', 'mobile', 'password']);
      }
      if (step === 2) {
        const errors = {};
        if (!formData.agencyName.trim()) errors.agencyName = 'Agency name is required.';
        if (!formData.socialMediaLink.trim()) errors.socialMediaLink = 'A social media link (e.g. Instagram) is required.';
        if (Object.keys(errors).length > 0) return fail(errors, ['agencyName', 'socialMediaLink']);
      }
      setError('');
      setFieldErrors({});
      setStep(prev => prev + 1);
    } else {
      // Final step - register via the API. The backend always creates the
      // organizer as pending (isApproved:false) — approval is admin-only.
      const idError = validateGovtId(formData.govtIdType, formData.govtIdNumber);
      if (idError) return fail({ govtIdNumber: idError }, ['govtIdNumber']);
      setError('');
      setFieldErrors({});
      setLoading(true);
      try {
        const organizer = await authApi.registerOrganizer({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          mobile: formData.mobile,
          phoneToken: phoneVerify.token,
          agencyName: formData.agencyName,
          agencyWebsite: formData.agencyWebsite,
          socialMediaLink: formData.socialMediaLink,
          govtIdType: formData.govtIdType,
          govtIdNumber: formData.govtIdNumber,
          yearsExperience: parseInt(formData.yearsExperience) || 1,
          bio: formData.bio,
        });
        saveOrgUser({ ...organizer, rememberMe: false });
        onSuccess(organizer);
      } catch (err) {
        const message = err?.message || 'Registration failed. Please try again.';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
  };

  const inputCls = `w-full px-3.5 py-2.2 rounded-xl text-xs font-medium border outline-none transition-all duration-200 ${
    darkMode
      ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/60 focus:ring-1 focus:ring-spy-orange/20'
      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/60 focus:ring-1 focus:ring-spy-orange/20'
  }`;

  const labelCls = `text-[10px] font-bold tracking-wide uppercase mb-0.5 block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`;
  const errCls = (field) => (fieldErrors[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '');
  const FieldError = ({ field }) => (fieldErrors[field] ? <p className="text-[10px] font-semibold mt-1 text-red-500">{fieldErrors[field]}</p> : null);

  const renderRegisterStep = () => {
    if (step === 1) return (
      <div className="space-y-2.5">
        <div>
          <label className={labelCls}>Full Name *</label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={nameRef} type="text" className={`${inputCls} pl-10 ${errCls('name')}`} placeholder="Your full name" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <FieldError field="name" />
        </div>
        <div>
          <label className={labelCls}>Email Address *</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={emailRef} type="email" className={`${inputCls} pl-10 ${errCls('email')}`} placeholder="your@email.com" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <FieldError field="email" />
        </div>
        <div>
          <label className={`${labelCls} flex items-center gap-1`}>
            Mobile Number *
            {phoneVerify.verified && (
              <span className="text-emerald-500 flex items-center gap-0.5 font-bold normal-case tracking-normal"><CheckCircle2 size={11} /> Verified</span>
            )}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input ref={mobileRef} type="tel" maxLength={10} className={`${inputCls} pl-10 disabled:opacity-70 ${errCls('mobile')}`} placeholder="10-digit number" value={formData.mobile} disabled={phoneVerify.verified} onChange={e => handleChange('mobile', e.target.value.replace(/\D/g, ''))} />
            </div>
            {!phoneVerify.sent && !phoneVerify.verified && (
              <button
                type="button"
                onClick={() => phoneVerify.send()}
                disabled={phoneVerify.busy}
                className="shrink-0 px-3 rounded-xl text-[11px] font-bold border border-spy-orange/40 text-spy-orange hover:bg-spy-orange/10 disabled:opacity-60 transition-all"
              >
                {phoneVerify.busy ? '…' : 'Send OTP'}
              </button>
            )}
          </div>
          {phoneVerify.sent && !phoneVerify.verified && (
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <ShieldCheck size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" inputMode="numeric" maxLength={6} className={`${inputCls} pl-10 tracking-[0.3em]`} placeholder="Enter 6-digit OTP" value={phoneVerify.code} onChange={e => phoneVerify.setCode(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={() => phoneVerify.verify()}
                disabled={phoneVerify.busy}
                className="shrink-0 px-4 rounded-xl text-[11px] font-bold bg-spy-orange hover:bg-[#d96d1a] text-white disabled:opacity-60 transition-all"
              >
                {phoneVerify.busy ? '…' : 'Verify'}
              </button>
            </div>
          )}
          {(phoneVerify.error || phoneVerify.info) && (
            <p className={`text-[10px] font-semibold mt-1 ${phoneVerify.error ? 'text-red-500' : 'text-emerald-500'}`}>
              {phoneVerify.error || phoneVerify.info}
            </p>
          )}
          <FieldError field="mobile" />
        </div>
        <div>
          <label className={labelCls}>Password *</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={passwordRef} type={showPassword ? 'text' : 'password'} className={`${inputCls} pl-10 pr-10 ${errCls('password')}`} placeholder="Min 8 characters" value={formData.password} onChange={e => handleChange('password', e.target.value)} />
            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <FieldError field="password" />
        </div>
      </div>
    );

    if (step === 2) return (
      <div className="space-y-2.5">
        <div>
          <label className={labelCls}>Agency / Company Name *</label>
          <div className="relative">
            <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={agencyNameRef} type="text" className={`${inputCls} pl-10 ${errCls('agencyName')}`} placeholder="e.g. Himalayan Guides Ltd" value={formData.agencyName} onChange={e => handleChange('agencyName', e.target.value)} />
          </div>
          <FieldError field="agencyName" />
        </div>
        <div>
          <label className={labelCls}>Website (optional)</label>
          <div className="relative">
            <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="url" className={`${inputCls} pl-10`} placeholder="https://yourwebsite.com" value={formData.agencyWebsite} onChange={e => handleChange('agencyWebsite', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Social Media Link (e.g. Instagram) *</label>
          <div className="relative">
            <Instagram size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={socialMediaLinkRef} type="url" required className={`${inputCls} pl-10 ${errCls('socialMediaLink')}`} placeholder="https://instagram.com/youragency" value={formData.socialMediaLink} onChange={e => handleChange('socialMediaLink', e.target.value)} />
          </div>
          <FieldError field="socialMediaLink" />
        </div>
        <div>
          <label className={labelCls}>Years of Experience</label>
          <input type="number" min="0" max="50" className={inputCls} placeholder="e.g. 5" value={formData.yearsExperience} onChange={e => handleChange('yearsExperience', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>About Your Agency</label>
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Brief description of your services..." value={formData.bio} onChange={e => handleChange('bio', e.target.value)} />
        </div>
      </div>
    );

    if (step === 3) return (
      <div className="space-y-2.5">
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
            <input ref={govtIdNumberRef} type="text" className={`${inputCls} pl-10 ${errCls('govtIdNumber')}`} placeholder="Enter your ID number" value={formData.govtIdNumber} onChange={e => handleChange('govtIdNumber', e.target.value)} />
          </div>
          <FieldError field="govtIdNumber" />
        </div>
        <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          By registering, you agree to Find Your Trek's Partner Terms of Service. All ID information is encrypted and secure.
        </p>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col overflow-y-auto font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>
      
      {/* Header branding banner */}
      <div className="relative overflow-hidden shrink-0">
        <div className={`px-6 pt-5 pb-5 ${darkMode ? 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-[#0d1a0f]' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
          <div className="absolute top-4 right-4">
            <span className="bg-spy-orange text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full">ORGANIZER</span>
          </div>
          
          <AppLogo size={40} className="mb-2" />
          <h1 className="text-xl font-display font-black tracking-tight">
            Become a Partner
          </h1>
          <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Join our verified organizer network
          </p>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 px-5 py-3 space-y-3">
        
        {/* Step indicator for registration */}
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <React.Fragment key={i}>
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < step ? 'bg-spy-orange' : darkMode ? 'bg-zinc-800' : 'bg-zinc-200'
              }`} />
            </React.Fragment>
          ))}
        </div>

        <p className={`text-[11px] font-semibold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Step {step} of {totalSteps} — {step === 1 ? 'Personal Info' : step === 2 ? 'Agency Details' : 'Verification'}
        </p>

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
        {renderRegisterStep()}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleRegisterStep}
          disabled={loading}
          className="w-full bg-spy-orange hover:bg-[#d96d1a] disabled:opacity-50 text-white font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-lg shadow-spy-orange/20"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {step < totalSteps ? 'Continue' : 'Submit Application'}
              {step < totalSteps ? <ChevronRight size={18} /> : <ArrowRight size={18} />}
            </>
          )}
        </button>

        {/* Switch mode link */}
        <p className={`text-center text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Already a partner?{' '}
          <button
            type="button"
            onClick={onSwitchMode}
            className="text-spy-orange font-semibold hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
