import React, { useState, useRef } from 'react';
import { Compass, Award, HeartPulse, User, Sparkles, Upload, Image, Check, Loader2 } from 'lucide-react';
import authApi from '../../../lib/authApi';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';
import { sanitizePhoneInput, isValidPhone, PHONE_MAX_DIGITS, PHONE_RULE_MESSAGE } from '../../../utils/phone';

const PRESET_AVATARS = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%232e7d32"/><path d="M20 80 L50 25 L80 80 Z" fill="%23fff" opacity="0.3"/><path d="M35 80 L55 40 L75 80 Z" fill="%23fff" opacity="0.6"/><path d="M50 25 L57 37 L50 42 L43 37 Z" fill="%23e8f5e9"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23d84315"/><circle cx="50" cy="50" r="30" fill="none" stroke="%23fff" stroke-width="4"/><path d="M50 20 L58 45 L50 50 L42 45 Z" fill="%23ff8a65"/><path d="M50 80 L58 55 L50 50 L42 55 Z" fill="%23fff"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23c62828"/><path d="M15 75 L50 25 L85 75 Z" fill="%23ff8a80"/><path d="M50 25 L50 75 L85 75 Z" fill="%23e53935"/><path d="M35 75 L50 50 L65 75 Z" fill="%233e2723"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2300695c"/><circle cx="35" cy="55" r="20" fill="%234db6ac"/><circle cx="65" cy="55" r="20" fill="%2380cbc4"/><circle cx="50" cy="40" r="22" fill="%23b2dfdb"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2337474f"/><path d="M30 75 L70 65 M35 65 L65 75" stroke="%238d6e63" stroke-width="8" stroke-linecap="round"/><path d="M50 25 C50 25 35 48 35 62 C35 70 42 75 50 75 C58 75 65 70 65 62 C65 48 50 25 50 25 Z" fill="%23ff8f00"/><path d="M50 40 C50 40 40 55 40 65 C40 70 44 73 50 73 C56 73 60 70 60 65 C60 55 50 40 50 40 Z" fill="%23ffeb3b"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%238e24aa"/><path d="M50 15 L53 38 L75 41 L53 44 L50 67 L47 44 L25 41 L47 38 Z M75 60 L76 70 L85 71 L76 72 L75 82 L74 72 L65 71 L74 70 Z" fill="%23ffd54f"/></svg>'
];

// Segmented choice buttons (experience / fitness / gender). Sized for a 44px
// touch target on the smallest phones, and allowed to breathe on bigger
// screens rather than growing to fill them.
const OPTION_BUTTON = 'min-h-11 px-1 py-2.5 sm:py-3 rounded-xl border font-semibold '
  + 'text-[11px] sm:text-xs transition-all cursor-pointer';

// Text inputs.
const INPUT_BASE = 'w-full min-h-11 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl '
  + 'outline-hidden focus:border-forest-500 border transition-all';

const FIELD_LABEL = 'text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-85';

const formatEmergencyContact = (name, phone) => {
  if (!name.trim()) return phone.trim();
  if (!phone.trim()) return name.trim();
  return `${name.trim()} (${phone.trim()})`;
};

export default function ProfileSetup({ user, onComplete, darkMode }) {
  const [hikingExperience, setHikingExperience] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState(user.age || 24);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const toast = useToast();
  const fieldRefs = useRef({});

  const FIELD_ORDER = ['experience', 'fitness', 'gender', 'age', 'emergencyName', 'emergencyPhone'];

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!hikingExperience) errors.experience = 'Please select your hiking experience level.';
    if (!fitnessLevel) errors.fitness = 'Please select your fitness level.';
    if (!gender) errors.gender = 'Please select your gender.';
    if (!age || age < 12 || age > 99) errors.age = 'Please enter a valid age between 12 and 99.';
    const nameTrimmed = emergencyContactName.trim();
    if (!nameTrimmed) {
      errors.emergencyName = 'Emergency contact name is required.';
    } else if (!/^[A-Za-z\s.'-]+$/.test(nameTrimmed)) {
      errors.emergencyName = 'Emergency contact name must contain only letters.';
    }

    const phoneTrimmed = emergencyContactPhone.trim();
    if (!phoneTrimmed) {
      errors.emergencyPhone = 'Emergency contact phone number is required.';
    } else if (!isValidPhone(phoneTrimmed)) {
      errors.emergencyPhone = PHONE_RULE_MESSAGE;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const message = errors[FIELD_ORDER.find((f) => errors[f])];
      toast.error(message);
      scrollToFirstError(fieldRefs.current, errors, FIELD_ORDER);
      return;
    }

    setFieldErrors({});
    const emergencyContactCombined = formatEmergencyContact(emergencyContactName, emergencyContactPhone);

    setSubmitting(true);
    try {
      const payload = {
        hikingExperience,
        fitnessLevel,
        gender,
        age,
        emergencyContact: emergencyContactCombined,
        avatar: avatar,
      };

      const updatedUser = await authApi.updateProfile(payload);
      toast.success('Hiker profile configured successfully!');

      setTimeout(() => {
        onComplete(updatedUser);
      }, 1200);
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Maximum file size is 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setUploading(true);
    reader.onerror = () => {
      setUploading(false);
      toast.error('Error reading file.');
    };
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const res = await authApi.uploadImage(base64Data);
        if (res?.url) {
          setAvatar(res.url);
          toast.success('Hiker photo uploaded successfully!');
        } else {
          throw new Error('No URL returned from upload');
        }
      } catch (err) {
        console.error(err);
        toast.error(err?.message || 'Failed to upload photo to server.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`h-full flex flex-col overflow-y-auto font-sans px-4 sm:px-6 py-6 sm:py-8 ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'
    } no-scrollbar`}>

      {/* One centred column at every width: the form is a single task, so it
          reads as a card on a desktop monitor rather than stretching across it. */}
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-2xl mx-auto">

        {/* Upper header segment */}
        <div className="flex flex-col items-center shrink-0 pt-1 pb-5 sm:pb-6">
          <div className="p-3 sm:p-3.5 rounded-2xl flex justify-center items-center shadow-lg bg-forest-600/10 text-forest-600 dark:text-forest-400">
            <Compass className="w-7 h-7 sm:w-8 sm:h-8 animate-spin-slow" />
          </div>
          <h1 className="font-display font-black tracking-tight text-lg sm:text-xl lg:text-2xl mt-3 text-forest-600 dark:text-forest-400 text-center">
            Set Up Your Hiker Profile
          </h1>
          <p className={`text-xs sm:text-sm mt-1.5 text-center max-w-sm sm:max-w-md leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Provide experience & safety details to enable alpine route approvals.
          </p>
        </div>

        <div className={`w-full rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 ${
          darkMode ? 'bg-zinc-900' : 'bg-white'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">

            {/* 1. Experience Level */}
            <div id="setup-experience" ref={el => { fieldRefs.current.experience = { current: el }; }} className="space-y-2">
              <label className={`${FIELD_LABEL} flex items-center gap-1.5`}>
                <Award size={13} className="text-forest-500 shrink-0" /> Hiking Experience Level *
              </label>
              <div className={`grid grid-cols-3 gap-2 sm:gap-3 rounded-xl ${fieldErrors.experience ? 'ring-2 ring-red-500' : ''}`}>
                {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => { setHikingExperience(lvl); setFieldErrors(er => ({ ...er, experience: '' })); }}
                    className={`${OPTION_BUTTON} ${
                      hikingExperience === lvl
                        ? 'border-forest-500 bg-forest-500/10 text-forest-600 dark:text-forest-400 font-bold'
                        : darkMode ? 'border-zinc-800 hover:bg-zinc-850 text-zinc-400' : 'border-gray-200 hover:bg-gray-50 text-zinc-650'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              {fieldErrors.experience && <p className="text-[11px] font-semibold text-red-500">{fieldErrors.experience}</p>}
            </div>

            {/* 2. Fitness Level */}
            <div id="setup-fitness" ref={el => { fieldRefs.current.fitness = { current: el }; }} className="space-y-2">
              <label className={`${FIELD_LABEL} flex items-center gap-1.5`}>
                <HeartPulse size={13} className="text-spy-orange shrink-0" /> Fitness Conditioning *
              </label>
              <div className={`grid grid-cols-3 gap-2 sm:gap-3 rounded-xl ${fieldErrors.fitness ? 'ring-2 ring-red-500' : ''}`}>
                {['Low', 'Moderate', 'High'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => { setFitnessLevel(lvl); setFieldErrors(er => ({ ...er, fitness: '' })); }}
                    className={`${OPTION_BUTTON} ${
                      fitnessLevel === lvl
                        ? 'border-spy-orange bg-spy-orange/10 text-spy-orange font-bold'
                        : darkMode ? 'border-zinc-800 hover:bg-zinc-850 text-zinc-400' : 'border-gray-200 hover:bg-gray-50 text-zinc-650'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              {fieldErrors.fitness && <p className="text-[11px] font-semibold text-red-500">{fieldErrors.fitness}</p>}
            </div>

            {/* 3. Gender */}
            <div id="setup-gender" ref={el => { fieldRefs.current.gender = { current: el }; }} className="space-y-2">
              <label className={`${FIELD_LABEL} flex items-center gap-1.5`}>
                <User size={13} className="text-blue-500 shrink-0" /> Gender *
              </label>
              <div className={`grid grid-cols-3 gap-2 sm:gap-3 rounded-xl ${fieldErrors.gender ? 'ring-2 ring-red-500' : ''}`}>
                {['Male', 'Female', 'Other'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => { setGender(lvl); setFieldErrors(er => ({ ...er, gender: '' })); }}
                    className={`${OPTION_BUTTON} ${
                      gender === lvl
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                        : darkMode ? 'border-zinc-800 hover:bg-zinc-850 text-zinc-400' : 'border-gray-200 hover:bg-gray-50 text-zinc-650'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              {fieldErrors.gender && <p className="text-[11px] font-semibold text-red-500">{fieldErrors.gender}</p>}
            </div>

            {/* 4. Age Input */}
            <div id="setup-age" className="space-y-1.5">
              <label htmlFor="reg-age-input" className={`${FIELD_LABEL} block`}>Age *</label>
              <input
                ref={el => { fieldRefs.current.age = { current: el }; }}
                type="number"
                id="reg-age-input"
                min={12}
                max={99}
                value={age}
                onChange={e => { setAge(Number(e.target.value)); setFieldErrors(er => ({ ...er, age: '' })); }}
                className={`${INPUT_BASE} sm:max-w-[10rem] ${
                  darkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-gray-200 text-zinc-800'
                } ${fieldErrors.age ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {fieldErrors.age && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.age}</p>}
            </div>

            {/* 5. Emergency Contact */}
            <div id="setup-emergency" className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
              <div className="space-y-1.5 min-w-0">
                <label htmlFor="reg-emergency-name-input" className={`${FIELD_LABEL} block`}>
                  Emergency Contact Name *
                </label>
                <input
                  ref={el => { fieldRefs.current.emergencyName = { current: el }; }}
                  type="text"
                  id="reg-emergency-name-input"
                  placeholder="e.g. Priya Sharma"
                  value={emergencyContactName}
                  onChange={e => { 
                    const cleaned = e.target.value.replace(/[^A-Za-z\s.'-]/g, '');
                    setEmergencyContactName(cleaned); 
                    setFieldErrors(er => ({ ...er, emergencyName: '' })); 
                  }}
                  className={`${INPUT_BASE} ${
                    darkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-gray-200 text-zinc-800'
                  } ${fieldErrors.emergencyName ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {fieldErrors.emergencyName && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.emergencyName}</p>}
              </div>
              <div className="space-y-1.5 min-w-0">
                <label htmlFor="reg-emergency-phone-input" className={`${FIELD_LABEL} block`}>
                  Emergency Contact Phone *
                </label>
                <input
                  ref={el => { fieldRefs.current.emergencyPhone = { current: el }; }}
                  type="tel"
                  inputMode="tel"
                  id="reg-emergency-phone-input"
                  placeholder="e.g. 9876543210 or +14155552671"
                  maxLength={PHONE_MAX_DIGITS + 1}
                  value={emergencyContactPhone}
                  onChange={e => {
                    setEmergencyContactPhone(sanitizePhoneInput(e.target.value));
                    setFieldErrors(er => ({ ...er, emergencyPhone: '' }));
                  }}
                  className={`${INPUT_BASE} ${
                    darkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-gray-200 text-zinc-800'
                  } ${fieldErrors.emergencyPhone ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {fieldErrors.emergencyPhone && <p className="text-[11px] font-semibold text-red-500 mt-1">{fieldErrors.emergencyPhone}</p>}
              </div>
            </div>

            {/* 6. Profile Avatar choice */}
            <div className="space-y-3">
              <label className={`${FIELD_LABEL} flex items-center gap-1.5`}>
                <Sparkles size={13} className="text-amber-500 shrink-0" /> Choose Hiker Avatar (Optional)
              </label>
            
              {/* Presets Grid — never so wide that an avatar becomes a poster */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 sm:gap-3">
                {PRESET_AVATARS.map((url, idx) => {
                  const isSelected = avatar === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`relative aspect-square w-full rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'border-forest-500 scale-105 shadow-md shadow-forest-500/20 bg-forest-500/5'
                          : darkMode ? 'border-zinc-800 hover:scale-102 opacity-75 hover:opacity-100 bg-zinc-950' : 'border-zinc-200 hover:scale-102 opacity-75 hover:opacity-100 bg-white'
                      }`}
                    >
                      <img src={url} alt={`avatar-${idx}`} className="w-full h-full object-cover p-1.5" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-forest-600 flex items-center justify-center text-white">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Custom Image Upload Selector */}
                <div className="relative aspect-square w-full">
                  <input
                    type="file"
                    id="hiker-avatar-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />
                
                  {/* Custom upload card button */}
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => document.getElementById('hiker-avatar-upload')?.click()}
                    className={`w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                      avatar && !PRESET_AVATARS.includes(avatar)
                        ? 'border-forest-500 bg-forest-500/5'
                        : darkMode ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-400' : 'border-gray-200 hover:bg-gray-50 text-zinc-550'
                    }`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <Loader2 className="w-5 h-5 text-forest-600 animate-spin" />
                        <span className="text-[9px] font-bold text-forest-600">Uploading…</span>
                      </div>
                    ) : avatar && !PRESET_AVATARS.includes(avatar) ? (
                      <>
                        <img src={avatar} alt="Custom upload" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-1 text-white">
                          <Upload size={14} />
                          <span className="text-[8px] font-bold">Replace</span>
                        </div>
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-forest-600 flex items-center justify-center text-white">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={15} className={darkMode ? 'text-zinc-500' : 'text-zinc-400'} />
                        <span className="text-[9px] font-bold leading-tight text-center">Custom<br/>Photo</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto sm:min-w-[16rem] sm:mx-auto sm:block bg-forest-600 hover:bg-forest-700 text-white font-bold min-h-12 py-3.5 px-8 rounded-xl shadow-lg mt-3 cursor-pointer active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm uppercase tracking-wider"
            >
              {submitting ? 'Configuring Safe Account…' : 'Complete Profile Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
