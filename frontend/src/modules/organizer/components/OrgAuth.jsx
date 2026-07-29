import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, Phone, User, Building2, CreditCard, ArrowRight, AlertCircle, ChevronRight, ChevronLeft, ArrowLeft, Globe, Instagram, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { saveOrgUser } from '../utils/storage';
import authApi from '../../../lib/authApi';
import usePhoneVerification from '../../../lib/usePhoneVerification';
import AppLogo from '../../../components/AppLogo';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';
import { formatGovtIdInput, getGovtIdMeta } from '../../../utils/govtIdHelper';

const isValidUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return false;
  let formatted = urlStr.trim();
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = 'https://' + formatted;
  }
  try {
    const parsed = new URL(formatted);
    return parsed.hostname.includes('.') && parsed.hostname.length >= 3;
  } catch {
    return false;
  }
};

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
    if (field === 'govtIdNumber') {
      val = formatGovtIdInput(formData.govtIdType, val);
    }
    if (field === 'govtIdType') {
      setFormData(prev => ({
        ...prev,
        govtIdType: val,
        govtIdNumber: formatGovtIdInput(val, prev.govtIdNumber),
      }));
      setError('');
      setFieldErrors(prev => ({ ...prev, govtIdType: '', govtIdNumber: '' }));
      return;
    }
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

  const validateStep1 = () => {
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

    return { isValid: Object.keys(errors).length === 0, errors, order: ['name', 'email', 'mobile', 'password'] };
  };

  const validateStep2 = () => {
    const errors = {};
    if (!formData.agencyName.trim()) {
      errors.agencyName = 'Agency name is required.';
    }
    if (!formData.socialMediaLink.trim()) {
      errors.socialMediaLink = 'A social media link (e.g. Instagram) is required.';
    } else if (!isValidUrl(formData.socialMediaLink)) {
      errors.socialMediaLink = 'Please enter a valid social media URL (e.g. https://instagram.com/youragency).';
    }
    if (formData.agencyWebsite.trim() && !isValidUrl(formData.agencyWebsite)) {
      errors.agencyWebsite = 'Please enter a valid website URL (e.g. https://yourwebsite.com).';
    }
    return { isValid: Object.keys(errors).length === 0, errors, order: ['agencyName', 'socialMediaLink', 'agencyWebsite'] };
  };

  const validateStep3 = () => {
    const idError = validateGovtId(formData.govtIdType, formData.govtIdNumber);
    if (idError) {
      return { isValid: false, errors: { govtIdNumber: idError }, order: ['govtIdNumber'] };
    }
    return { isValid: true, errors: {}, order: ['govtIdNumber'] };
  };

  const jumpToStep = (targetStep) => {
    if (targetStep === step) return;
    if (targetStep < step) {
      setError('');
      setFieldErrors({});
      setStep(targetStep);
      return;
    }
    // Advancing forward: Validate all previous steps strictly
    if (targetStep >= 2) {
      const res1 = validateStep1();
      if (!res1.isValid) {
        setStep(1);
        return fail(res1.errors, res1.order);
      }
    }
    if (targetStep >= 3) {
      const res2 = validateStep2();
      if (!res2.isValid) {
        setStep(2);
        return fail(res2.errors, res2.order);
      }
    }
    setError('');
    setFieldErrors({});
    setStep(targetStep);
  };

  const handleRegisterStep = async () => {
    if (step === 1) {
      const res1 = validateStep1();
      if (!res1.isValid) {
        setStep(1);
        return fail(res1.errors, res1.order);
      }
      setError('');
      setFieldErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const res1 = validateStep1();
      if (!res1.isValid) {
        setStep(1);
        return fail(res1.errors, res1.order);
      }
      const res2 = validateStep2();
      if (!res2.isValid) {
        setStep(2);
        return fail(res2.errors, res2.order);
      }
      setError('');
      setFieldErrors({});
      setStep(3);
      return;
    }

    // Step 3 submission: Validate ALL steps sequentially before invoking API
    const res1 = validateStep1();
    if (!res1.isValid) {
      setStep(1);
      return fail(res1.errors, res1.order);
    }
    const res2 = validateStep2();
    if (!res2.isValid) {
      setStep(2);
      return fail(res2.errors, res2.order);
    }
    const res3 = validateStep3();
    if (!res3.isValid) {
      setStep(3);
      return fail(res3.errors, res3.order);
    }

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
      const lowerMsg = message.toLowerCase();
      
      // If error belongs to step 2 fields, auto-switch to step 2 & highlight field
      if (lowerMsg.includes('social') || lowerMsg.includes('agency') || lowerMsg.includes('website')) {
        setStep(2);
        fail({ socialMediaLink: message, agencyName: message }, ['socialMediaLink', 'agencyName']);
      }
      // If error belongs to step 1 fields, auto-switch to step 1 & highlight field
      else if (lowerMsg.includes('email') || lowerMsg.includes('mobile') || lowerMsg.includes('phone') || lowerMsg.includes('name') || lowerMsg.includes('password')) {
        setStep(1);
        fail({ email: message, mobile: message }, ['email', 'mobile']);
      }
      else {
        setStep(3);
        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-3.5 py-3 rounded-xl text-sm font-medium border outline-none transition-all duration-200 ${
    darkMode
      ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/60 focus:ring-2 focus:ring-spy-orange/20'
      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/60 focus:ring-2 focus:ring-spy-orange/20'
  }`;

  const labelCls = `text-[11px] sm:text-xs font-bold tracking-wider uppercase mb-1 block ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`;
  const errCls = (field) => (fieldErrors[field] ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '');
  const FieldError = ({ field }) => (fieldErrors[field] ? <p className="text-[11px] font-semibold mt-1 text-red-500">{fieldErrors[field]}</p> : null);

  const renderRegisterStep = () => {
    if (step === 1) return (
      <div className="space-y-3.5">
        <div>
          <label className={labelCls}>Full Name *</label>
          <div className="relative">
            <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={nameRef} type="text" className={`${inputCls} pl-10 ${errCls('name')}`} placeholder="Your full name" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
          </div>
          <FieldError field="name" />
        </div>
        <div>
          <label className={labelCls}>Email Address *</label>
          <div className="relative">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={emailRef} type="email" className={`${inputCls} pl-10 ${errCls('email')}`} placeholder="your@email.com" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
          </div>
          <FieldError field="email" />
        </div>
        <div>
          <label className={`${labelCls} flex items-center justify-between`}>
            <span>Mobile Number *</span>
            {phoneVerify.verified && (
              <span className="text-emerald-500 flex items-center gap-1 font-bold normal-case tracking-normal text-xs"><CheckCircle2 size={13} /> Verified</span>
            )}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input ref={mobileRef} type="tel" maxLength={10} className={`${inputCls} pl-10 disabled:opacity-70 ${errCls('mobile')}`} placeholder="10-digit number" value={formData.mobile} disabled={phoneVerify.verified} onChange={e => handleChange('mobile', e.target.value.replace(/\D/g, ''))} />
            </div>
            {!phoneVerify.sent && !phoneVerify.verified && (
              <button
                type="button"
                onClick={() => phoneVerify.send()}
                disabled={phoneVerify.busy}
                className="shrink-0 px-3.5 rounded-xl text-xs font-bold border border-spy-orange/40 text-spy-orange hover:bg-spy-orange/10 disabled:opacity-60 transition-all flex items-center justify-center cursor-pointer"
              >
                {phoneVerify.busy ? 'Sending…' : 'Send OTP'}
              </button>
            )}
          </div>
          {phoneVerify.sent && !phoneVerify.verified && (
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <ShieldCheck size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" inputMode="numeric" maxLength={6} className={`${inputCls} pl-10 tracking-[0.25em] text-center font-bold`} placeholder="6-digit OTP" value={phoneVerify.code} onChange={e => phoneVerify.setCode(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={() => phoneVerify.verify()}
                disabled={phoneVerify.busy}
                className="shrink-0 px-4 rounded-xl text-xs font-bold bg-spy-orange hover:bg-[#d96d1a] text-white disabled:opacity-60 transition-all flex items-center justify-center cursor-pointer"
              >
                {phoneVerify.busy ? '…' : 'Verify'}
              </button>
            </div>
          )}
          {(phoneVerify.error || phoneVerify.info) && (
            <p className={`text-[11px] font-semibold mt-1.5 ${phoneVerify.error ? 'text-red-500' : 'text-emerald-500'}`}>
              {phoneVerify.error || phoneVerify.info}
            </p>
          )}
          <FieldError field="mobile" />
        </div>
        <div>
          <label className={labelCls}>Password *</label>
          <div className="relative">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={passwordRef} type={showPassword ? 'text' : 'password'} className={`${inputCls} pl-10 pr-10 ${errCls('password')}`} placeholder="Min 8 characters" value={formData.password} onChange={e => handleChange('password', e.target.value)} />
            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <FieldError field="password" />
        </div>
      </div>
    );

    if (step === 2) return (
      <div className="space-y-3.5">
        <div>
          <label className={labelCls}>Agency / Company Name *</label>
          <div className="relative">
            <Building2 size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input ref={agencyNameRef} type="text" className={`${inputCls} pl-10 ${errCls('agencyName')}`} placeholder="e.g. Himalayan Guides Ltd" value={formData.agencyName} onChange={e => handleChange('agencyName', e.target.value)} />
          </div>
          <FieldError field="agencyName" />
        </div>
        <div>
          <label className={labelCls}>Website (optional)</label>
          <div className="relative">
            <Globe size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="url" className={`${inputCls} pl-10`} placeholder="https://yourwebsite.com" value={formData.agencyWebsite} onChange={e => handleChange('agencyWebsite', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Social Media Link (e.g. Instagram) *</label>
          <div className="relative">
            <Instagram size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
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
          <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Brief description of your services..." value={formData.bio} onChange={e => handleChange('bio', e.target.value)} />
        </div>
      </div>
    );

    if (step === 3) {
      const idMeta = getGovtIdMeta(formData.govtIdType);
      return (
        <div className="space-y-3.5">
          <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${darkMode ? 'bg-spy-orange/10 border border-spy-orange/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
            <div className="flex gap-2.5 items-start">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-spy-orange" />
              <span>Your documents will be reviewed by our admin team within 24-48 hours. You'll receive an email on approval.</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <CreditCard size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  ref={govtIdNumberRef}
                  type="text"
                  inputMode={idMeta.inputMode}
                  maxLength={idMeta.maxLength}
                  className={`${inputCls} pl-10 ${errCls('govtIdNumber')}`}
                  placeholder={idMeta.placeholder}
                  value={formData.govtIdNumber}
                  onChange={e => handleChange('govtIdNumber', e.target.value)}
                />
              </div>
              <FieldError field="govtIdNumber" />
            </div>
          </div>
          <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            By registering, you agree to Find Your Trek's Partner Terms of Service. All ID information is encrypted and secure.
          </p>
        </div>
      );
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-0 sm:p-4 font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>
      <div className={`w-full max-w-md flex flex-col min-h-screen sm:min-h-0 sm:rounded-3xl sm:shadow-xl sm:border overflow-hidden ${
        darkMode ? 'bg-zinc-900 sm:border-white/10' : 'bg-white sm:border-zinc-200'
      }`}>
        
        {/* Header branding banner */}
        <div className="relative overflow-hidden shrink-0">
          <div className={`px-5 sm:px-6 pt-[calc(1.5rem+env(safe-area-inset-top,20px))] sm:pt-6 pb-5 ${
            darkMode ? 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-[#0d1a0f]' : 'bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <AppLogo size={38} />
              <span className="bg-spy-orange text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase shadow-xs">PARTNER REGISTRATION</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight">
              Become a Partner
            </h1>
            <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Join our verified organizer network & host expeditions
            </p>
          </div>
        </div>

        {/* Form body */}
        <div className="flex-1 px-5 sm:px-6 py-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Step indicator for registration */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-spy-orange">Step {step} of {totalSteps}</span>
                <span className={darkMode ? 'text-zinc-400' : 'text-zinc-500'}>
                  {step === 1 ? 'Personal Info' : step === 2 ? 'Agency Details' : 'Verification'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalSteps }, (_, i) => {
                  const stepNum = i + 1;
                  const isActive = stepNum === step;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => jumpToStep(stepNum)}
                      title={`Step ${stepNum}: ${stepNum === 1 ? 'Personal Info' : stepNum === 2 ? 'Agency Details' : 'Verification'}`}
                      className={`h-2 flex-1 rounded-full transition-all duration-300 cursor-pointer ${
                        stepNum <= step ? 'bg-spy-orange hover:opacity-90' : darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-200 hover:bg-zinc-300'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`flex gap-2.5 items-center p-3.5 rounded-xl text-xs font-semibold ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}
                >
                  <AlertCircle size={15} className="shrink-0 text-red-500" />
                  <span className="flex-1">{error}</span>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setFieldErrors({});
                        setStep(prev => prev - 1);
                      }}
                      className="underline font-bold hover:opacity-80 shrink-0 text-xs cursor-pointer ml-1"
                    >
                      Go to Step {step - 1}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dynamic form content */}
            {renderRegisterStep()}
          </div>

          {/* Bottom actions */}
          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-white/5 mt-4">
            <div className="flex items-center gap-2.5">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setFieldErrors({});
                    setStep(prev => prev - 1);
                  }}
                  className={`px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold border transition flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                    darkMode
                      ? 'bg-zinc-800 border-white/10 text-white hover:bg-zinc-700'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}

              <button
                type="button"
                onClick={handleRegisterStep}
                disabled={loading}
                className="flex-1 bg-spy-orange hover:bg-[#d96d1a] disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-spy-orange/25 cursor-pointer"
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
            </div>

            {/* Switch mode link */}
            <p className={`text-center text-xs pb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Already a partner?{' '}
              <button
                type="button"
                onClick={onSwitchMode}
                className="text-spy-orange font-semibold hover:underline ml-1 cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
