import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Shield, Landmark, Flame, Compass, Bell, Globe, KeyRound, HelpCircle,
  ChevronRight, ArrowLeft, Heart, Star, MessageSquare, AlertCircle, Info, ShieldAlert, Send, Sparkles, X, Check, Award, Sun, Moon,
  Building2, CreditCard, Upload, Gift, FileText, Phone, Mail, UserX, Clock, RefreshCw
} from 'lucide-react';
import ThemeToggle from '../../../components/ThemeToggle';
import ConfirmDialog from '../../../components/ConfirmDialog';
import TravelTicket from './TravelTicket';
import SwitchTransition from './SwitchTransition';
import { downloadTicketPDF } from '../utils/ticketPdf';
import { loadLoyaltyConfig, getCustomerProgress } from '../../../utils/loyalty';
import authApi from '../../../lib/authApi';
import { getToken } from '../../../lib/apiClient';
import contentApi from '../../../lib/contentApi';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';
import { formatGovtIdInput, getGovtIdMeta } from '../../../utils/govtIdHelper';

// Mirrors Auth.jsx — the organizer panel runs as an independent mini-SPA with
// its own session storage, so switching modules means seeding that store and
// doing a hard navigation to /organizer.
const ORG_USER_STORAGE_KEY = 'trekigo_org_user';
const ORGANIZER_TRANSITION_MS = 3000; // lets the climb→camp flip play before handing off

// Same strength rule Auth.jsx and the backend enforce — at least 8
// characters with a letter and a number.
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_HELP = 'Password must be at least 8 characters, with at least one letter and one number.';

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

const parseEmergencyContact = (str) => {
  if (!str) return { name: '', phone: '' };
  
  const parenMatch = str.match(/(.*?)\((.*?)\)\s*$/);
  if (parenMatch) {
    return {
      name: parenMatch[1].trim().replace(/[-:\s]+$/, ''),
      phone: parenMatch[2].trim()
    };
  }

  const dividerMatch = str.match(/(.*?)[-:]\s*([+0-9\s]+)$/);
  if (dividerMatch) {
    return {
      name: dividerMatch[1].trim(),
      phone: dividerMatch[2].trim()
    };
  }

  const firstDigitIndex = str.search(/\d/);
  if (firstDigitIndex > 0) {
    return {
      name: str.substring(0, firstDigitIndex).trim().replace(/[-:\s]+$/, ''),
      phone: str.substring(firstDigitIndex).trim()
    };
  }

  if (firstDigitIndex === 0) {
    return { name: '', phone: str };
  }

  return { name: str, phone: '' };
};

const formatEmergencyContact = (name, phone) => {
  if (!name.trim()) return phone.trim();
  if (!phone.trim()) return name.trim();
  return `${name.trim()} (${phone.trim()})`;
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

export default function ProfileView({
  user,
  onUpdateUser,
  onLogout,
  darkMode,
  onToggleDarkMode,
  userReviews,
  onTriggerOnboarding,
  bookings = [],
  onFullscreenChange,
  onOpenLoyalty,
  // Deep-linking: each menu item is a real URL under /app/profile/* (see
  // modules/user/App.jsx). `initialSub` seeds the view from the URL (and
  // updates it on browser back/forward); `goSub` below both updates local
  // state immediately and reports the change back up so the URL follows.
  initialSub = 'MAIN',
  onNavigateProfile,
  // Privacy Policy is a standalone public page (no login required, real
  // shareable URL) rather than an in-app sub-screen — this hands off to it.
  onOpenPrivacyPolicy
}) {
  const [currentSub, setCurrentSub] = useState(initialSub || 'MAIN');
  // Keeps currentSub in sync when the URL changes from outside this
  // component (browser back/forward, or a direct link landing on a sub-page).
  useEffect(() => {
    setCurrentSub(initialSub || 'MAIN');
  }, [initialSub]);
  const goSub = (sub) => {
    setCurrentSub(sub);
    onNavigateProfile?.(sub);
  };
  const [orgSwitching, setOrgSwitching] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Privacy Policy / Support page copy + support contact details — fully
  // admin-editable via the CMS (see lib/contentApi.js). Fetched once; falls
  // back to sane defaults if the backend is unreachable.
  const [siteContent, setSiteContent] = useState(null);
  useEffect(() => {
    let cancelled = false;
    contentApi.getContent().then((c) => { if (!cancelled) setSiteContent(c); });
    return () => { cancelled = true; };
  }, []);

  // The partner application takes over the whole screen — ask the shell to
  // hide the bottom nav while it's open (restored on back/unmount).
  useEffect(() => {
    if (onFullscreenChange) onFullscreenChange(currentSub === 'BECOME_ORGANIZER' || orgSwitching);
    return () => { if (onFullscreenChange) onFullscreenChange(false); };
  }, [currentSub, orgSwitching, onFullscreenChange]);

  useEffect(() => {
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
    setProfileMobile(user.mobile || '');
    const parsed = parseEmergencyContact(user.emergencyContact || '');
    setProfileEmergencyName(parsed.name);
    setProfileEmergencyPhone(parsed.phone);
    setHikeExperience(user.hikingExperience || '');
    setFitLevel(user.fitnessLevel || '');
    setNotifyState({
      bookings: user.notificationBookings ?? true,
      updates: user.notificationUpdates ?? true,
      promo: user.notificationPromo ?? false
    });
  }, [user]);

  const loyaltyConfig = loadLoyaltyConfig();
  const loyaltyProgress = getCustomerProgress(bookings, loyaltyConfig);

  // Input bindings state
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileMobile, setProfileMobile] = useState(user.mobile);
  
  const initialEmergency = parseEmergencyContact(user.emergencyContact || '');
  const [profileEmergencyName, setProfileEmergencyName] = useState(initialEmergency.name);
  const [profileEmergencyPhone, setProfileEmergencyPhone] = useState(initialEmergency.phone);

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const toast = useToast();
  const profileNameRef = useRef(null);
  const profileEmailRef = useRef(null);
  const profileMobileRef = useRef(null);
  const profileEmergencyNameRef = useRef(null);
  const profileEmergencyPhoneRef = useRef(null);
  const profileFieldRefs = {
    name: profileNameRef, email: profileEmailRef, mobile: profileMobileRef,
    emergencyName: profileEmergencyNameRef, emergencyPhone: profileEmergencyPhoneRef,
  };

  // Experience and Fitness
  const [hikeExperience, setHikeExperience] = useState(user.hikingExperience);
  const [fitLevel, setFitLevel] = useState(user.fitnessLevel);

  // Settings

  const [passwordState, setPasswordState] = useState({ current: '', next: '', confirm: '' });
  const [notifyState, setNotifyState] = useState({
    bookings: user.notificationBookings ?? true,
    updates: user.notificationUpdates ?? true,
    promo: user.notificationPromo ?? false
  });
  const [privacyState, setPrivacyState] = useState({ shareStats: true, cloudBackup: true });

  // Support
  const [ticketCategory, setTicketCategory] = useState('Booking Issue');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketsList, setTicketsList] = useState([
    { id: 'TKT-998', title: 'Payment processed twice fail query', category: 'Payment Issue', status: 'Resolved', timestamp: '2026-06-12' }
  ]);

  // Become an Organizer flow
  const [orgForm, setOrgForm] = useState({
    agencyName: '', agencyWebsite: '', socialMediaLink: '', yearsExperience: '', bio: '',
    govtIdType: 'Aadhaar', govtIdNumber: '', documentName: ''
  });
  const [orgFormError, setOrgFormError] = useState('');
  const [orgFieldErrors, setOrgFieldErrors] = useState({});
  const orgAgencyNameRef = useRef(null);
  const orgSocialMediaLinkRef = useRef(null);
  const orgGovtIdNumberRef = useRef(null);
  const orgFieldRefs = { agencyName: orgAgencyNameRef, socialMediaLink: orgSocialMediaLinkRef, govtIdNumber: orgGovtIdNumberRef };

  // Whether this traveller already has an organizer profile (approved OR
  // pending), read from the local session. The customer session snapshot is
  // written at login and never learns that an application was filed later, so
  // this is only the offline / first-paint answer — `orgStatus` below re-checks
  // it against the server.
  const locallyKnownOrganizer = !!user?.isOrganizer || (() => {
    try {
      const raw = localStorage.getItem(ORG_USER_STORAGE_KEY);
      if (!raw) return false;
      const org = JSON.parse(raw);
      // Must at least be onboarded — covers both approved and pending-approval states
      return !!(org?.isOnboarded && (org?.email === user?.email || org?.isAuthenticated));
    } catch { return false; }
  })();

  // Server-verified organizer application status. `null` means "not checked
  // yet"; the application form must not be offered until this resolves, or a
  // customer who already applied (deep-linking straight to
  // /app/profile/become-organizer, or landing there on a restored route) gets
  // a blank form and files a duplicate application.
  const [orgStatus, setOrgStatus] = useState(null);
  const [orgStatusChecking, setOrgStatusChecking] = useState(false);

  const refreshOrgStatus = useCallback(async () => {
    // No JWT to present: an authed call would 401, and apiClient treats that as
    // an expired session and signs the user out. Trust the local session
    // instead — a probe isn't worth ending someone's session over.
    if (!getToken()) {
      const local = { isOrganizer: locallyKnownOrganizer, isApproved: false, organizer: null, offline: true };
      setOrgStatus((prev) => prev ?? local);
      return local;
    }
    setOrgStatusChecking(true);
    try {
      // Read-only probe: deliberately does not adopt the organizer-scoped
      // token the endpoint mints — the traveller session stays a traveller
      // session until the user actually switches modules.
      const res = await authApi.getOrganizerApplicationStatus();
      const next = {
        isOrganizer: !!res?.isOrganizer,
        isApproved: !!res?.isApproved,
        organizer: res?.organizer || null,
        offline: false,
      };
      setOrgStatus(next);
      return next;
    } catch {
      // Offline / transient failure: fall back to whatever the local session
      // knows rather than blocking the flow outright.
      const next = { isOrganizer: locallyKnownOrganizer, isApproved: false, organizer: null, offline: true };
      setOrgStatus((prev) => prev ?? next);
      return next;
    } finally {
      setOrgStatusChecking(false);
    }
  }, [locallyKnownOrganizer]);

  // Check on mount and whenever the application screen is opened (including
  // via a direct URL, which bypasses the "Become an Organizer" button).
  useEffect(() => {
    if (!user?.isAuthenticated) return;
    if (currentSub === 'MAIN' || currentSub === 'BECOME_ORGANIZER') refreshOrgStatus();
  }, [currentSub, user?.isAuthenticated, refreshOrgStatus]);

  const hasApplied = orgStatus ? orgStatus.isOrganizer : locallyKnownOrganizer;
  const isApprovedOrganizer = !!orgStatus?.isOrganizer && !!orgStatus.isApproved;
  const isPendingOrganizer = hasApplied && !isApprovedOrganizer;
  // Until the first check resolves, the form is withheld rather than shown.
  const orgStatusResolved = orgStatus !== null;

  // While an applicant sits on the review screen, watch for the admin's
  // decision and hand off to the organizer module the moment it lands, so
  // approval never needs a manual refresh to take effect.
  useEffect(() => {
    if (currentSub !== 'BECOME_ORGANIZER' || !isPendingOrganizer) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      const next = await refreshOrgStatus();
      if (cancelled || !next?.isOrganizer || !next.isApproved) return;
      toast.success('🎉 Your organizer application has been approved!');
      handleBecomeOrganizer();
    };

    const timer = setInterval(tick, 8000);
    const onWake = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onWake);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [currentSub, isPendingOrganizer, refreshOrgStatus]);

  // "Check status" on the review screen — an explicit re-check for applicants
  // who don't want to wait out the poll.
  const handleCheckOrgApplication = async () => {
    const next = await refreshOrgStatus();
    if (!next) return;
    if (next.offline) {
      toast.error('Could not reach the server. Check your connection and try again.');
      return;
    }
    if (!next.isOrganizer) {
      toast.info('No organizer application found for this account.');
      return;
    }
    if (next.isApproved) {
      toast.success('🎉 Your application has been approved! Taking you to your organizer panel.');
      handleBecomeOrganizer();
    } else {
      toast.info('Still under review. We will notify you the moment an admin approves it.');
    }
  };

  // Support Chat
  const [supportChats, setSupportChats] = useState([
    { sender: 'bot', text: 'Hello Chirag! Welcome to Find Your Trek Helpdesk. How can we optimize your trekking experience today?', time: '11:10 AM' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    setOtpError('');

    const emailChanged = profileEmail.toLowerCase() !== user.email.toLowerCase();
    const mobileChanged = profileMobile !== user.mobile;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^\d{10}$/;
    const sosNumbersOnly = profileEmergencyPhone.replace(/\D/g, '');

    const errors = {};
    if (!profileName.trim()) errors.name = 'Full name is required.';
    if (!emailRegex.test(profileEmail)) errors.email = 'Please enter a valid email address.';
    if (!mobileRegex.test(profileMobile)) errors.mobile = 'Mobile number must be a valid 10-digit number.';
    if (!profileEmergencyName.trim()) errors.emergencyName = 'Emergency contact name is required.';
    if (sosNumbersOnly.length < 10) errors.emergencyPhone = 'Emergency contact phone number must be at least 10 digits.';

    if (Object.keys(errors).length > 0) {
      const order = ['name', 'email', 'mobile', 'emergencyName', 'emergencyPhone'];
      setProfileFieldErrors(errors);
      toast.error(errors[order.find(f => errors[f])]);
      scrollToFirstError(profileFieldRefs, errors, order);
      return;
    }
    setProfileFieldErrors({});

    const emergencyContactCombined = formatEmergencyContact(profileEmergencyName, profileEmergencyPhone);

    if (!emailChanged && !mobileChanged) {
      setOtpLoading(true);
      try {
        const updatedUser = await authApi.updateProfileVerify({
          name: profileName.trim(),
          emergencyContact: emergencyContactCombined
        });
        onUpdateUser(updatedUser);
        toast.success('Personal information updated successfully!');
        goSub('MAIN');
      } catch (err) {
        toast.error(err?.message || 'Failed to update profile.');
      } finally {
        setOtpLoading(false);
      }
      return;
    }

    setOtpLoading(true);
    try {
      if (emailChanged) {
        await authApi.requestEmailOtp(profileEmail.toLowerCase());
      }
      if (mobileChanged) {
        await authApi.requestOtp(profileMobile);
      }
      setShowOtpModal(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to initiate OTP verification.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndSave = async () => {
    setOtpError('');
    const emailChanged = profileEmail.toLowerCase() !== user.email.toLowerCase();
    const mobileChanged = profileMobile !== user.mobile;

    if (emailChanged && !emailOtp.trim()) {
      setOtpError('Please enter email OTP');
      toast.error('Please enter the email OTP.');
      return;
    }
    if (mobileChanged && !mobileOtp.trim()) {
      setOtpError('Please enter mobile OTP');
      toast.error('Please enter the mobile OTP.');
      return;
    }

    const emergencyContactCombined = formatEmergencyContact(profileEmergencyName, profileEmergencyPhone);
    setOtpLoading(true);
    try {
      const payload = {
        name: profileName.trim(),
        emergencyContact: emergencyContactCombined
      };

      if (emailChanged) {
        payload.email = profileEmail.toLowerCase();
        payload.emailOtp = emailOtp.trim();
      }
      if (mobileChanged) {
        payload.mobile = profileMobile;
        payload.mobileOtp = mobileOtp.trim();
      }

      const updatedUser = await authApi.updateProfileVerify(payload);
      onUpdateUser(updatedUser);
      toast.success('Personal details verified and updated successfully!');
      setShowOtpModal(false);
      setEmailOtp('');
      setMobileOtp('');
      goSub('MAIN');
    } catch (err) {
      const message = err?.message || 'Verification failed. Try again.';
      setOtpError(message);
      toast.error(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCancelEditPersonal = () => {
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
    setProfileMobile(user.mobile || '');
    const parsed = parseEmergencyContact(user.emergencyContact || '');
    setProfileEmergencyName(parsed.name);
    setProfileEmergencyPhone(parsed.phone);
    setEmailOtp('');
    setMobileOtp('');
    setOtpError('');
    setShowOtpModal(false);
    goSub('MAIN');
  };

  const handleUpdatePassword = async () => {
    const { current, next, confirm } = passwordState;

    if (!current || !next || !confirm) {
      toast.error('Please fill in all password fields.');
      return;
    }

    if (next !== confirm) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    if (!PASSWORD_REGEX.test(next)) {
      toast.error(PASSWORD_HELP);
      return;
    }

    try {
      await authApi.changePassword(current, next);
      toast.success('Password updated successfully!');
      setPasswordState({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err?.message || 'Failed to update password.');
    }
  };

  // Self-service deactivation — the account can no longer log in until an
  // admin reactivates it (see authApi.deactivateAccount / backend
  // authController.deactivateAccount). Logs the current session out right
  // away since the account is no longer usable.
  const handleDeactivateAccount = async () => {
    setDeactivating(true);
    try {
      await authApi.deactivateAccount();
      setShowDeactivateConfirm(false);
      toast.success('Your account has been deactivated.');
      onLogout();
    } catch (err) {
      toast.error(err?.message || 'Failed to deactivate account.');
    } finally {
      setDeactivating(false);
    }
  };

  const handleSaveStatsInfo = (e) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      hikingExperience: hikeExperience,
      fitnessLevel: fitLevel
    });
    toast.success('Adventure statistics updated! AI recommend algorithms adjusted.');
    goSub('MAIN');
  };

  const handleRaiseTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketTitle.trim()) {
      toast.error('Enter a subject for your inquiry before submitting.');
      return;
    }

    const newTicket = {
      id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
      title: ticketTitle.trim(),
      category: ticketCategory,
      status: 'Open',
      timestamp: new Date().toISOString().split('T')[0]
    };

    setTicketsList([newTicket, ...ticketsList]);
    setTicketTitle('');
    setTicketMessage('');
    toast.success('Inquiry report logged. Support agents will audit details on-screen within 24 hours.');
  };

  const handleSendSupportMsg = () => {
    if (!chatInput.trim()) return;
    const userMsg = { sender: 'user', text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const stepOneChats = [...supportChats, userMsg];
    setSupportChats(stepOneChats);
    setChatInput('');

    setTimeout(() => {
      const answersList = [
        "Your voucher token is active. Please restart the interface and re-add travelers.",
        "We have adjusted your environmental permit code details safely.",
        "Yes, our high altitude camps are pre-supplied with standard sub-zero warmth rations.",
        "I have alerted Sahyadri organizer leads regarding your transit update."
      ];
      const botMsg = { sender: 'bot', text: answersList[Math.floor(Math.random() * answersList.length)], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setSupportChats([...stepOneChats, botMsg]);
    }, 1000);
  };

  // Same handoff Auth.jsx performs for vetted organizers: seed the organizer
  // module's own session storage, then hard-navigate to /organizer.
  const redirectToOrganizerPanel = () => {
    let existingOrg = {};
    try {
      const val = localStorage.getItem(ORG_USER_STORAGE_KEY);
      if (val) existingOrg = JSON.parse(val);
    } catch (e) {}

    const orgUser = {
      agencyName: user.name,
      agencyWebsite: '',
      govtIdType: 'Aadhaar',
      govtIdNumber: '',
      yearsExperience: 1,
      bio: 'Verified Find Your Trek organizer.',
      verificationDocumentUrl: '',
      rating: 4.8,
      totalTrips: 0,
      totalBookings: 0,
      coreCapabilities: ['Certified Trek Leader'],
      ...existingOrg,
      isAuthenticated: true,
      isOnboarded: true,
      // Never fabricate approval: this is the offline fallback, and an
      // applicant still awaiting review must land on the pending screen rather
      // than a dashboard they aren't cleared for. The organizer module
      // re-verifies against the server as soon as it can reach it.
      isApproved: existingOrg?.isApproved ?? isApprovedOrganizer,
      isPendingApproval: existingOrg?.isPendingApproval ?? !isApprovedOrganizer,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      avatar: user.avatar,
      rememberMe: true,
    };
    try { localStorage.setItem(ORG_USER_STORAGE_KEY, JSON.stringify(orgUser)); } catch (e) {}
    window.location.href = '/organizer';
  };

  // Plays the climb→camp flip, then hands off to the organizer module —
  // whether that account is vetted or still awaiting review (the module's own
  // pending screen watches for approval). Accounts that have never applied get
  // the partner application form instead.
  const handleBecomeOrganizer = () => {
    setOrgSwitching(true);

    authApi.getLinkedOrganizerStatus()
      .then(async (statusRes) => {
        setOrgStatus({
          isOrganizer: !!statusRes.isOrganizer,
          isApproved: !!statusRes.isApproved,
          organizer: statusRes.organizer || null,
          offline: false,
        });
        if (statusRes.isOrganizer) {
          const orgUser = {
            ...statusRes.organizer,
            isAuthenticated: true,
            isOnboarded: true,
            rememberMe: true,
            isApproved: statusRes.isApproved,
            isPendingApproval: statusRes.isPendingApproval,
          };
          try {
            localStorage.setItem(ORG_USER_STORAGE_KEY, JSON.stringify(orgUser));
            localStorage.setItem('trekigo_active_role', 'organizer');
          } catch (e) {}
          setTimeout(() => {
            window.location.href = '/organizer';
          }, 1400);
        } else {
          setOrgSwitching(false);
          goSub('BECOME_ORGANIZER');
        }
      })
      .catch(() => {
        // Status unreachable. If anything local says this account already has
        // an organizer profile, hand off to the organizer module (which
        // re-verifies); otherwise open the application screen — which withholds
        // the form until it can confirm no application exists.
        if (hasApplied) {
          setTimeout(() => {
            redirectToOrganizerPanel();
          }, 1400);
        } else {
          setOrgSwitching(false);
          goSub('BECOME_ORGANIZER');
        }
      });
  };

  const handleSubmitOrgApplication = (e) => {
    e.preventDefault();
    // Belt-and-braces: the form isn't rendered once an application exists, but
    // a stale mount (or a resolved-late status check) must never file a second
    // one. The backend treats a repeat apply as idempotent; this keeps the UI
    // honest about it.
    if (hasApplied) {
      toast.info('Your organizer application has already been submitted.');
      refreshOrgStatus();
      return;
    }
    const errors = {};
    if (!orgForm.agencyName.trim()) errors.agencyName = 'Agency / company name is required.';
    if (orgForm.socialMediaLink.trim() && !isValidUrl(orgForm.socialMediaLink.trim())) {
      errors.socialMediaLink = 'Please enter a valid social media URL (e.g. https://instagram.com/youragency).';
    }
    if (orgForm.agencyWebsite.trim() && !isValidUrl(orgForm.agencyWebsite.trim())) {
      errors.agencyWebsite = 'Please enter a valid website URL (e.g. https://yourwebsite.com).';
    }
    const idError = validateGovtId(orgForm.govtIdType, orgForm.govtIdNumber);
    if (idError) errors.govtIdNumber = idError;

    if (Object.keys(errors).length > 0) {
      const order = ['agencyName', 'socialMediaLink', 'agencyWebsite', 'govtIdNumber'];
      const message = errors[order.find(f => errors[f])];
      setOrgFieldErrors(errors);
      setOrgFormError(message);
      toast.error(message);
      scrollToFirstError(orgFieldRefs, errors, order);
      return;
    }
    setOrgFieldErrors({});
    setOrgFormError('');

    setOrgSwitching(true);

    let cleanSocial = orgForm.socialMediaLink.trim();
    if (cleanSocial && !/^https?:\/\//i.test(cleanSocial)) cleanSocial = `https://${cleanSocial}`;
    let cleanWebsite = orgForm.agencyWebsite.trim();
    if (cleanWebsite && !/^https?:\/\//i.test(cleanWebsite)) cleanWebsite = `https://${cleanWebsite}`;

    authApi.applyAsOrganizer({
      agencyName: orgForm.agencyName.trim(),
      agencyWebsite: cleanWebsite,
      socialMediaLink: cleanSocial,
      govtIdType: orgForm.govtIdType,
      govtIdNumber: orgForm.govtIdNumber.trim(),
      yearsExperience: parseInt(orgForm.yearsExperience) || 1,
      bio: orgForm.bio.trim(),
    })
    .then((createdOrg) => {
      const orgUser = {
        ...createdOrg,
        isAuthenticated: true,
        isOnboarded: true,
        rememberMe: true
      };
      try { localStorage.setItem(ORG_USER_STORAGE_KEY, JSON.stringify(orgUser)); } catch (e) {}
      // Record the application on both the live status and the persisted
      // traveller session, so coming back to Profile (this run or a later app
      // launch) shows the review screen instead of an empty form again.
      setOrgStatus({
        isOrganizer: true,
        isApproved: !!createdOrg?.isApproved,
        organizer: createdOrg,
        offline: false,
      });
      onUpdateUser({ ...user, isOrganizer: true });
      setTimeout(() => { window.location.href = '/organizer'; }, ORGANIZER_TRANSITION_MS);
    })
    .catch((err) => {
      setOrgSwitching(false);
      const message = err?.message || 'Failed to submit application. Please try again.';
      setOrgFormError(message);
      toast.error(message);
    });
  };

  // Shared sub-page styling — keeps every profile sub-screen on the same
  // design language as the main profile / home redesign.
  const subHeaderCls = `flex items-center gap-3 pb-3.5 border-b shrink-0 ${darkMode ? 'border-white/10' : 'border-zinc-200'}`;
  const subBackBtnCls = `w-10 h-10 rounded-full border flex items-center justify-center active:scale-90 transition cursor-pointer shrink-0 shadow-sm ${
    darkMode ? 'bg-elegant-card border-white/5 text-zinc-300' : 'bg-white border-gray-200 text-zinc-700'
  }`;
  const subTitleCls = 'font-serif text-xl font-semibold leading-tight';
  const subLabelCls = 'text-xs font-bold uppercase tracking-wider opacity-60 block';
  const subInputCls = `w-full text-sm px-4 py-3.5 border rounded-xl outline-hidden transition focus:border-forest-500 ${
    darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/30' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
  }`;
  const subPrimaryBtnCls = 'w-full py-4 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-2xl text-sm uppercase tracking-wide active:scale-[0.99] transition cursor-pointer';
  const subCardCls = darkMode ? 'bg-elegant-card' : 'bg-white shadow-sm';
  const subErrCls = (field) => (profileFieldErrors[field] ? 'border-red-500 focus:border-red-500' : '');
  const clearProfileError = (field) => setProfileFieldErrors(er => ({ ...er, [field]: '' }));
  const orgInputCls = (field, padCls = 'px-3.5') => `w-full text-sm ${padCls} py-3 border rounded-xl outline-hidden focus:border-forest-500 ${
    orgFieldErrors[field] ? 'border-red-500 focus:border-red-500' : darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/30' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
  }`;
  const clearOrgError = (field) => setOrgFieldErrors(er => ({ ...er, [field]: '' }));

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans ${
      darkMode ? 'bg-elegant-app text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>

      {/* Module-switch flip overlay (reused from the Auth role switch) */}
      {orgSwitching && <SwitchTransition darkMode={darkMode} label="Switching to Organizer Panel" showScene />}
      
      {/* Dynamic Screen View State switcher rendering */}
      <AnimatePresence mode="wait">
        {currentSub === 'MAIN' && (
          <motion.div
            key="MAIN"
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex-1 overflow-y-auto no-scrollbar pb-8"
          >
          
          {/* Quick profile header decoration */}
          <div className="px-5 pt-8 pb-2 text-center flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-forest-500 shadow-lg relative select-none">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>

            <div>
              <h1 className="font-serif text-2xl font-semibold leading-tight flex items-center justify-center gap-1.5">
                {user.name} <Award size={16} className="text-spy-orange fill-spy-orange/10" />
              </h1>
              <p className={`text-sm mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{user.email}</p>
              <span className="text-xs tracking-wider font-bold text-forest-600 dark:text-forest-400 uppercase mt-2 bg-forest-500/10 px-3 py-1.5 rounded-full inline-block">
                ⭐ {user.hikingExperience} Outdoorsman
              </span>
            </div>
          </div>

          {/* Quick profile stats */}
          <div className="px-5 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${
                darkMode ? 'bg-elegant-card' : 'bg-white'
              }`}>
                <span className="text-xs uppercase font-bold opacity-50 tracking-wider mb-1.5">Booked</span>
                <span className="font-serif text-xl font-semibold text-forest-600 dark:text-forest-400">
                  {bookings.length} {bookings.length === 1 ? 'Hike' : 'Hikes'}
                </span>
              </div>
              <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${
                darkMode ? 'bg-elegant-card' : 'bg-white'
              }`}>
                <span className="text-xs uppercase font-bold opacity-50 tracking-wider mb-1.5">Distance</span>
                <span className="font-serif text-xl font-semibold text-spy-orange">
                  {bookings.length * 16} Km
                </span>
              </div>
            </div>
          </div>

          {/* Loyalty Rewards highlight card */}
          {loyaltyConfig.customer.enabled && (
            <div className="px-5 pt-4">
              <button
                id="btn-open-loyalty-rewards"
                onClick={onOpenLoyalty}
                className={`w-full p-4 rounded-2xl text-left flex items-center gap-3.5 transition active:scale-[0.99] ${
                  darkMode ? 'bg-gradient-to-br from-forest-900 to-elegant-card' : 'bg-gradient-to-br from-forest-50 to-white shadow-sm'
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  darkMode ? 'bg-forest-500/20 text-forest-400' : 'bg-forest-500/15 text-forest-600'
                }`}>
                  <Gift size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold block">Loyalty Rewards</span>
                  <span className={`text-xs block mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {loyaltyProgress.remaining > 0
                      ? `${loyaltyProgress.remaining} more traveler${loyaltyProgress.remaining !== 1 ? 's' : ''} to a free booking`
                      : 'Free booking unlocked — tap to view!'}
                  </span>
                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-2">
                    <div className="h-full bg-forest-500 rounded-full transition-all duration-700" style={{ width: `${loyaltyProgress.percent}%` }} />
                  </div>
                </div>
                <ChevronRight size={17} className="opacity-40 shrink-0" />
              </button>
            </div>
          )}

          {/* Configuration Sections Menu list */}
          <div className="px-5 pt-5 space-y-6">

            {/* Group A: Personal stats */}
            <div className="space-y-2.5">
              <span className="text-[13px] uppercase font-bold tracking-widest opacity-50 pl-1 block">Account & Bio</span>

              <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}>
                
                <button
                  onClick={() => goSub('EDIT_PERSONAL')}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <User size={19} className="text-forest-500" /> Personal Details
                  </span>
                  <ChevronRight size={17} className="opacity-40" />
                </button>

                <button
                  onClick={() => goSub('EDIT_STATS')}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Flame size={19} className="text-spy-orange" /> Athletics & Experience
                  </span>
                  <ChevronRight size={17} className="opacity-40" />
                </button>

                <button
                  onClick={() => goSub('MY_REVIEWS')}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <MessageSquare size={19} className="text-forest-500" /> Verified Reviews ({userReviews.length})
                  </span>
                  <ChevronRight size={17} className="opacity-40" />
                </button>

                <button
                  id="btn-become-organizer"
                  onClick={handleBecomeOrganizer}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Building2 size={19} className="text-spy-orange" />
                    {/* An application that's been filed but not yet cleared says
                        so here — "Become an Organizer" invited applicants who
                        had already applied to fill the form a second time. */}
                    {!hasApplied
                      ? 'Become an Organizer'
                      : orgStatusResolved && isPendingOrganizer
                        ? 'Organizer Application'
                        : 'Switch to Organizer'}
                  </span>
                  <span className="flex items-center gap-2">
                    {orgStatusResolved && isPendingOrganizer && (
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        darkMode ? 'bg-spy-orange/15 text-amber-300' : 'bg-amber-100 text-amber-700'
                      }`}>
                        Under Review
                      </span>
                    )}
                    <ChevronRight size={17} className="opacity-40" />
                  </span>
                </button>
              </div>
            </div>

            {/* Group B: App preferences */}
            <div className="space-y-2.5">
              <span className="text-[13px] uppercase font-bold tracking-widest opacity-50 pl-1 block">Help Center & Prefs</span>

              <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}>



                <button
                  onClick={() => goSub('SETTINGS')}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Shield size={19} className="text-forest-500" /> Preferences & Settings
                  </span>
                  <ChevronRight size={17} className="opacity-40" />
                </button>

                <button
                  onClick={() => goSub('SUPPORT')}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle size={19} className="text-forest-500" /> Support Desk & Tickets
                  </span>
                  <ChevronRight size={17} className="opacity-40" />
                </button>

                <button
                  onClick={() => onOpenPrivacyPolicy?.()}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <FileText size={19} className="text-forest-500" /> Privacy Policy
                  </span>
                  <ChevronRight size={17} className="opacity-40" />
                </button>
              </div>
            </div>

            {/* Group C: Next Departure or Explore Treks */}
            {(() => {
              const upcomingBooking = bookings.find(b => b.status === 'Upcoming');
              if (upcomingBooking) {
                return (
                  <div className="space-y-2.5">
                    <span className="text-[13px] uppercase font-bold tracking-widest opacity-50 pl-1 block">Next Departure Ticket</span>
                    <TravelTicket
                      booking={upcomingBooking}
                      darkMode={darkMode}
                      notchClass={darkMode ? 'bg-elegant-app' : 'bg-[#FAF8F2]'}
                      onDownload={() => downloadTicketPDF(upcomingBooking)}
                    />
                  </div>
                );
              } else {
                return (
                  <div className="space-y-2.5">
                    <span className="text-[13px] uppercase font-bold tracking-widest opacity-50 pl-1 block">Ready For Next Hike?</span>
                    <div className={`rounded-xl p-4 border relative overflow-hidden flex flex-col justify-between ${
                      darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-zinc-100 shadow-sm'
                    }`}>
                      {/* Premium visual gradients */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-spy-orange/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="relative z-10">
                        <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                          <Compass size={19} className="text-spy-orange" /> Find Your Next Summit
                        </h4>
                        <p className="text-sm opacity-75 mt-1.5 leading-relaxed">
                          Explore premium certified trails, real-time weather alerts, and coordinate with expert organizers.
                        </p>
                      </div>

                      <div className="mt-3.5 flex justify-end">
                        <button
                          onClick={() => {
                            window.history.pushState({ path: '/app/explore' }, '', '/app/explore');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="px-4 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-full text-xs font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                        >
                          Explore Trips <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            })()}

            {/* Logout actions */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full mt-3 py-4 rounded-2xl text-center font-bold bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 transition text-sm uppercase tracking-wide shadow-xs cursor-pointer"
            >
              Log Out Session
            </button>
          </div>
          </motion.div>
        )}

        {/* SUB 1: EDIT PERSONAL DETAILS */}
        {currentSub === 'EDIT_PERSONAL' && (
          <motion.form
            key="EDIT_PERSONAL"
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            onSubmit={handleSavePersonalInfo}
            noValidate
            className="flex-1 flex flex-col justify-between px-5 pt-4 pb-6"
          >
          <div className="space-y-5">
            <div className={subHeaderCls}>
              <button type="button" onClick={handleCancelEditPersonal} className={subBackBtnCls}>
                <ArrowLeft size={17} />
              </button>
              <h3 className={subTitleCls}>Personal Info</h3>
            </div>

            {/* Name input */}
            <div className="space-y-1.5">
              <label className={subLabelCls}>Full Name</label>
              <input
                ref={profileNameRef}
                type="text"
                required
                value={profileName}
                onChange={e => { setProfileName(e.target.value); clearProfileError('name'); }}
                className={`${subInputCls} ${subErrCls('name')}`}
              />
              {profileFieldErrors.name && <p className="text-[11px] font-semibold text-red-500">{profileFieldErrors.name}</p>}
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <label className={subLabelCls}>Email Address</label>
              <input
                ref={profileEmailRef}
                type="email"
                required
                value={profileEmail}
                onChange={e => { setProfileEmail(e.target.value); clearProfileError('email'); }}
                className={`${subInputCls} ${subErrCls('email')}`}
              />
              {profileFieldErrors.email && <p className="text-[11px] font-semibold text-red-500">{profileFieldErrors.email}</p>}
            </div>

            {/* Phone input */}
            <div className="space-y-1.5">
              <label className={subLabelCls}>Mobile Number</label>
              <input
                ref={profileMobileRef}
                type="tel"
                maxLength={10}
                required
                value={profileMobile}
                onChange={e => { setProfileMobile(e.target.value.replace(/\D/g, '')); clearProfileError('mobile'); }}
                className={`${subInputCls} ${subErrCls('mobile')}`}
              />
              {profileFieldErrors.mobile && <p className="text-[11px] font-semibold text-red-500">{profileFieldErrors.mobile}</p>}
            </div>

            {/* Emergency Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <label className={subLabelCls}>Emergency Contact Name</label>
                <input
                  ref={profileEmergencyNameRef}
                  type="text"
                  required
                  placeholder="e.g. Asha Jeevanani"
                  value={profileEmergencyName}
                  onChange={e => { setProfileEmergencyName(e.target.value); clearProfileError('emergencyName'); }}
                  className={`${subInputCls} ${subErrCls('emergencyName')}`}
                />
                {profileFieldErrors.emergencyName && <p className="text-[11px] font-semibold text-red-500">{profileFieldErrors.emergencyName}</p>}
              </div>
              <div className="space-y-1.5 min-w-0">
                <label className={subLabelCls}>Emergency Contact Phone</label>
                <input
                  ref={profileEmergencyPhoneRef}
                  type="text"
                  required
                  placeholder="e.g. +91 98765 43219"
                  value={profileEmergencyPhone}
                  onChange={e => { setProfileEmergencyPhone(e.target.value); clearProfileError('emergencyPhone'); }}
                  className={`${subInputCls} ${subErrCls('emergencyPhone')}`}
                />
                {profileFieldErrors.emergencyPhone && <p className="text-[11px] font-semibold text-red-500">{profileFieldErrors.emergencyPhone}</p>}
              </div>
            </div>
          </div>

          <button type="submit" className={subPrimaryBtnCls}>
            Save Account Details
          </button>
          </motion.form>
        )}

        {/* SUB: ORGANIZER APPLICATION — status gate. The form below is only
            reachable by accounts with no application on file; anyone who has
            already applied lands on the review screen instead, no matter how
            they got here (menu tap, deep link, or a restored route). */}
        {currentSub === 'BECOME_ORGANIZER' && !orgStatusResolved && (
          <motion.div
            key="ORG_STATUS_LOADING"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 px-6 ${
              darkMode ? 'bg-elegant-app' : 'bg-[#FAF8F2]'
            }`}
          >
            <RefreshCw size={22} className="text-spy-orange animate-spin" />
            <p className="text-sm font-semibold opacity-60">Checking your application status…</p>
          </motion.div>
        )}

        {currentSub === 'BECOME_ORGANIZER' && orgStatusResolved && hasApplied && (
          <motion.div
            key="ORG_APPLICATION_STATUS"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute inset-0 z-50 flex flex-col overflow-y-auto no-scrollbar pt-[calc(1.25rem+env(safe-area-inset-top,20px))] pb-10 px-4 sm:px-6 ${
              darkMode ? 'bg-elegant-app' : 'bg-[#FAF8F2]'
            }`}
          >
            <div className="space-y-4 flex-1 max-w-lg w-full mx-auto">
              <div className={subHeaderCls}>
                <button type="button" onClick={() => goSub('MAIN')} className={subBackBtnCls}>
                  <ArrowLeft size={17} />
                </button>
                <h3 className={`${subTitleCls} flex items-center gap-2 text-base sm:text-lg`}>
                  <Building2 size={19} className="text-spy-orange" /> Organizer Application
                </h3>
              </div>

              {/* Status hero */}
              <div className={`rounded-2xl px-5 py-7 text-center ${subCardCls}`}>
                {isApprovedOrganizer ? (
                  <div className="w-16 h-16 rounded-full bg-forest-500/10 border-2 border-forest-500 flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-forest-600 dark:text-forest-400" />
                  </div>
                ) : (
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 rounded-full border-4 border-spy-orange/25 border-t-spy-orange flex items-center justify-center mx-auto mb-4"
                  >
                    <Clock size={26} className="text-spy-orange" />
                  </motion.div>
                )}
                <h4 className="font-serif text-xl font-semibold leading-tight">
                  {isApprovedOrganizer ? "You're a verified organizer" : 'Your details are under review'}
                </h4>
                <p className={`text-sm mt-2 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {isApprovedOrganizer
                    ? 'Your application has been approved. Head over to your organizer panel to start publishing treks.'
                    : `Thanks, ${user.name} — your application has already been submitted. Our admin team reviews documents within 24–48 hours, and you'll be notified the moment it's approved.`}
                </p>
              </div>

              {/* What was submitted */}
              <div className={`rounded-2xl p-4 space-y-3 ${subCardCls}`}>
                <span className={subLabelCls}>Submitted details</span>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="opacity-60">Agency</span>
                  <span className="font-semibold truncate">{orgStatus?.organizer?.agencyName || orgForm.agencyName || user.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="opacity-60">Applicant</span>
                  <span className="font-semibold truncate">{user.email}</span>
                </div>
                {orgStatus?.organizer?.govtIdType && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="opacity-60">ID on file</span>
                    <span className="font-semibold truncate">{orgStatus.organizer.govtIdType}</span>
                  </div>
                )}
              </div>

              {/* Verification progress */}
              {!isApprovedOrganizer && (
                <div className={`rounded-2xl p-4 ${subCardCls}`}>
                  <span className={`${subLabelCls} mb-3`}>Verification progress</span>
                  {[
                    { label: 'Application submitted', done: true },
                    { label: 'Documents under review', current: true },
                    { label: 'Approved — organizer panel unlocked', done: false },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex gap-3 items-start relative">
                      {i < arr.length - 1 && (
                        <div className={`absolute left-[13px] top-7 w-0.5 h-7 ${step.done ? 'bg-spy-orange' : darkMode ? 'bg-white/10' : 'bg-zinc-200'}`} />
                      )}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                        step.done
                          ? 'border-spy-orange bg-spy-orange'
                          : step.current
                            ? 'border-spy-orange bg-spy-orange/10 animate-pulse'
                            : darkMode ? 'border-white/10' : 'border-zinc-200'
                      }`}>
                        {step.done
                          ? <Check size={14} className="text-white" />
                          : step.current
                            ? <Clock size={13} className="text-spy-orange" />
                            : <div className="w-2 h-2 rounded-full bg-zinc-400/40" />}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-semibold ${step.done || step.current ? '' : 'opacity-45'}`}>{step.label}</p>
                        {step.current && <p className="text-xs text-spy-orange mt-0.5 font-medium">In progress · 24–48 hrs</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {orgStatus?.offline && (
                <div className={`p-3.5 rounded-xl text-xs leading-relaxed flex gap-2 items-start ${
                  darkMode ? 'bg-spy-orange/10 border border-spy-orange/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'
                }`}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>We couldn't reach the server, so this status may be out of date. Tap "Check Status" once you're back online.</span>
                </div>
              )}

              {isApprovedOrganizer ? (
                <button type="button" onClick={handleBecomeOrganizer} className={subPrimaryBtnCls}>
                  Go to Organizer Panel
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCheckOrgApplication}
                    disabled={orgStatusChecking}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold border transition active:scale-[0.99] cursor-pointer disabled:opacity-60 ${
                      darkMode ? 'border-white/10 text-white/70 hover:border-spy-orange/40 hover:text-spy-orange' : 'border-zinc-200 text-zinc-600 hover:border-spy-orange hover:text-spy-orange'
                    }`}
                  >
                    <RefreshCw size={16} className={orgStatusChecking ? 'animate-spin' : ''} />
                    {orgStatusChecking ? 'Checking…' : 'Check Status'}
                  </button>
                  <p className={`text-center text-[11px] ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    This screen updates on its own — you'll be taken to your organizer home as soon as an admin approves you.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Partner application form — only for accounts with no application on
            file (mirrors the OrgAuth signup fields) */}
        {currentSub === 'BECOME_ORGANIZER' && orgStatusResolved && !hasApplied && (
          <motion.form
            key="BECOME_ORGANIZER"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleSubmitOrgApplication}
            noValidate
            // Full-screen overlay (covers the bottom nav) — applying to become
            // a partner is a focused flow, not a tab-level screen.
            className={`absolute inset-0 z-50 flex flex-col overflow-y-auto no-scrollbar pt-[calc(1.25rem+env(safe-area-inset-top,20px))] pb-10 px-4 sm:px-6 ${
              darkMode ? 'bg-elegant-app' : 'bg-[#FAF8F2]'
            }`}
          >
          <div className="space-y-4 flex-1 max-w-lg w-full mx-auto">
            <div className={subHeaderCls}>
              <button type="button" onClick={() => { setOrgFormError(''); goSub('MAIN'); }} className={subBackBtnCls}>
                <ArrowLeft size={17} />
              </button>
              <h3 className={`${subTitleCls} flex items-center gap-2 text-base sm:text-lg`}>
                <Building2 size={19} className="text-spy-orange" /> Become an Organizer
              </h3>
            </div>

            {/* Applicant identity comes from the signed-in account */}
            <div className={`p-3.5 rounded-xl flex items-center gap-3 ${darkMode ? 'bg-zinc-900/60' : 'bg-white shadow-xs'}`}>
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-forest-500" />
              <div className="min-w-0">
                <span className="text-sm font-bold block truncate">{user.name}</span>
                <span className="text-xs opacity-60 block truncate">{user.email} · {user.mobile}</span>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl text-xs leading-relaxed flex gap-2 items-start ${
              darkMode ? 'bg-spy-orange/10 border border-spy-orange/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>Your application and documents will be reviewed by our admin team within 24–48 hours. You'll be notified on approval.</span>
            </div>

            {/* Agency details */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider opacity-65">Agency / Company Name *</label>
              <input
                ref={orgAgencyNameRef}
                type="text"
                placeholder="e.g. Himalayan Guides Ltd"
                value={orgForm.agencyName}
                onChange={e => { setOrgForm({ ...orgForm, agencyName: e.target.value }); setOrgFormError(''); clearOrgError('agencyName'); }}
                className={orgInputCls('agencyName')}
              />
              {orgFieldErrors.agencyName && <p className="text-[11px] font-semibold text-red-500">{orgFieldErrors.agencyName}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider opacity-65">Website (Optional)</label>
                <input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={orgForm.agencyWebsite}
                  onChange={e => setOrgForm({ ...orgForm, agencyWebsite: e.target.value })}
                  className={`w-full text-sm px-3.5 py-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                    darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/30' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider opacity-65">Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g. 5"
                  value={orgForm.yearsExperience}
                  onChange={e => setOrgForm({ ...orgForm, yearsExperience: e.target.value })}
                  className={`w-full text-sm px-3.5 py-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                    darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/30' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider opacity-65">Social Media Link (e.g. Instagram) (Optional)</label>
              <input
                ref={orgSocialMediaLinkRef}
                type="url"
                placeholder="https://instagram.com/youragency"
                value={orgForm.socialMediaLink}
                onChange={e => { setOrgForm({ ...orgForm, socialMediaLink: e.target.value }); setOrgFormError(''); clearOrgError('socialMediaLink'); }}
                className={orgInputCls('socialMediaLink')}
              />
              {orgFieldErrors.socialMediaLink && <p className="text-[11px] font-semibold text-red-500">{orgFieldErrors.socialMediaLink}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider opacity-65">About Your Agency</label>
              <textarea
                rows={3}
                placeholder="Brief description of your services..."
                value={orgForm.bio}
                onChange={e => setOrgForm({ ...orgForm, bio: e.target.value })}
                className={`w-full text-sm px-3.5 py-3 border rounded-xl outline-hidden resize-none focus:border-forest-500 ${
                  darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/30' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>

            {/* Verification */}
            {(() => {
              const orgIdMeta = getGovtIdMeta(orgForm.govtIdType);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-65">Government ID Type</label>
                    <select
                      value={orgForm.govtIdType}
                      onChange={e => {
                        const newType = e.target.value;
                        setOrgForm({
                          ...orgForm,
                          govtIdType: newType,
                          govtIdNumber: formatGovtIdInput(newType, orgForm.govtIdNumber),
                        });
                        setOrgFormError('');
                        clearOrgError('govtIdNumber');
                      }}
                      className={`w-full text-sm px-3.5 py-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                        darkMode ? 'bg-elegant-card border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                      }`}
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="GST">GST Certificate</option>
                      <option value="Passport">Passport</option>
                      <option value="TIN">Travel India License (TIN)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-65">ID Number *</label>
                    <div className="relative">
                      <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        ref={orgGovtIdNumberRef}
                        type="text"
                        inputMode={orgIdMeta.inputMode}
                        maxLength={orgIdMeta.maxLength}
                        placeholder={orgIdMeta.placeholder}
                        value={orgForm.govtIdNumber}
                        onChange={e => {
                          const formatted = formatGovtIdInput(orgForm.govtIdType, e.target.value);
                          setOrgForm({ ...orgForm, govtIdNumber: formatted });
                          setOrgFormError('');
                          clearOrgError('govtIdNumber');
                        }}
                        className={orgInputCls('govtIdNumber', 'pl-10 pr-3.5')}
                      />
                    </div>
                    {orgFieldErrors.govtIdNumber && <p className="text-[11px] font-semibold text-red-500">{orgFieldErrors.govtIdNumber}</p>}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider opacity-65">Verification Document</label>
              <label className={`w-full px-3.5 py-3 border border-dashed rounded-xl flex items-center gap-2.5 cursor-pointer text-sm ${
                darkMode ? 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-spy-orange/50' : 'bg-white border-gray-300 text-zinc-500 hover:border-spy-orange/60'
              }`}>
                <Upload size={16} className="text-spy-orange shrink-0" />
                <span className="truncate">{orgForm.documentName || 'Upload ID / License (PDF or image)'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => setOrgForm({ ...orgForm, documentName: e.target.files?.[0]?.name || '' })}
                />
              </label>
            </div>

            {orgFormError && (
              <div className={`flex gap-2 items-center p-3 rounded-xl text-xs font-semibold ${
                darkMode ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-600'
              }`}>
                <AlertCircle size={14} className="shrink-0" /> {orgFormError}
              </div>
            )}

            <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              By applying, you agree to Find Your Trek's Partner Terms of Service. All ID information is encrypted and secure.
            </p>

            <button
              type="submit"
              className="w-full mt-4 py-4 bg-spy-orange hover:bg-spy-orange-hover text-white font-bold rounded-2xl text-sm uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.99] transition cursor-pointer shadow-lg shadow-spy-orange/20"
            >
              Submit Application <ChevronRight size={16} />
            </button>
          </div>
          </motion.form>
        )}

        {/* SUB 2: EDIT ATHLETICS & STATS */}
        {currentSub === 'EDIT_STATS' && (
          <motion.form
            key="EDIT_STATS"
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            onSubmit={handleSaveStatsInfo}
            className="flex-1 flex flex-col justify-between px-5 pt-4 pb-6"
          >
          <div className="space-y-5">
            <div className={subHeaderCls}>
              <button type="button" onClick={() => goSub('MAIN')} className={subBackBtnCls}>
                <ArrowLeft size={17} />
              </button>
              <h3 className={subTitleCls}>Athletics & Experience</h3>
            </div>

            <p className={`text-sm leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              These details construct the background parameters in our smart AI-Recommendation matrix systems:
            </p>

            {/* Hiking Experience toggles */}
            <div className="space-y-2">
              <label className={subLabelCls}>Outdoors Hiking Experience</label>
              <div className="grid grid-cols-3 gap-2">
                {['Beginner', 'Intermediate', 'Advanced'].map(lev => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setHikeExperience(lev)}
                    className={`py-3.5 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                      hikeExperience === lev
                        ? 'border-forest-500 bg-forest-500/10 text-forest-600 dark:text-forest-400'
                        : (darkMode ? 'border-white/10 bg-elegant-card text-zinc-400 hover:text-zinc-200' : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-700 shadow-sm')
                    }`}
                  >
                    {lev}
                  </button>
                ))}
              </div>
            </div>

            {/* Fitness Level toggles */}
            <div className="space-y-2">
              <label className={subLabelCls}>Current Cardio Fitness Level</label>
              <div className="grid grid-cols-3 gap-2">
                {['Low', 'Moderate', 'High'].map(fit => (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => setFitLevel(fit)}
                    className={`py-3.5 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                      fitLevel === fit
                        ? 'border-forest-500 bg-forest-500/10 text-forest-600 dark:text-forest-400'
                        : (darkMode ? 'border-white/10 bg-elegant-card text-zinc-400 hover:text-zinc-200' : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-700 shadow-sm')
                    }`}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className={subPrimaryBtnCls}>
            Update Physical Stats
          </button>
          </motion.form>
        )}

        {/* SUB 3: MY REVIEWS SUMMARY LIST */}
        {currentSub === 'MY_REVIEWS' && (
          <motion.div
            key="MY_REVIEWS"
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex-1 flex flex-col px-5 pt-4 overflow-hidden"
          >
          <div className={subHeaderCls}>
            <button type="button" onClick={() => goSub('MAIN')} className={subBackBtnCls}>
              <ArrowLeft size={17} />
            </button>
            <h3 className={subTitleCls}>My Verified Comments</h3>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-5 space-y-4">
            {userReviews.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl block">✍️</span>
                <p className={`text-sm mt-4 leading-relaxed px-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  You haven't filed trek reviews yet. Completed trips can be rated directly in My Bookings tabs.
                </p>
              </div>
            ) : (
              userReviews.map((rev, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl space-y-2 ${subCardCls}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold">{rev.tripName}</h4>
                      <span className="text-[10px] opacity-45 font-mono block mt-0.5">Validated on {rev.date}</span>
                    </div>

                    <div className="flex gap-0.5 shrink-0 text-amber-400">
                      {[...Array(rev.rating)].map((_, st) => <Star key={st} size={12} className="fill-amber-400" />)}
                    </div>
                  </div>

                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    "{rev.comment}"
                  </p>
                </div>
              ))
            )}
          </div>
          </motion.div>
        )}

        {/* SUB 4: PREFERENCES & APP SETTINGS */}
        {currentSub === 'SETTINGS' && (
          <motion.div
            key="SETTINGS"
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex-1 flex flex-col px-5 pt-4 overflow-y-auto no-scrollbar pb-8 space-y-5"
          >
          <div className={subHeaderCls}>
            <button type="button" onClick={() => goSub('MAIN')} className={subBackBtnCls}>
              <ArrowLeft size={17} />
            </button>
            <h3 className={subTitleCls}>Preferences & Settings</h3>
          </div>

          {/* Setting 1: Theme toggle */}
          <div className={`p-4 rounded-2xl flex items-center justify-between ${subCardCls}`}>
            <div>
              <h4 className="text-[15px] font-semibold">App Night Mode</h4>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Toggles premium twilight visuals</p>
            </div>

            <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} size="sm" />
          </div>



          {/* Setting 3: Notification Preference */}
          <div className={`p-4 rounded-2xl space-y-3.5 ${subCardCls}`}>
            <h4 className="text-[15px] font-semibold">Push Notifications Preferences</h4>

            <div className="space-y-3">
              {[
                { key: 'bookings', label: 'Booking Confirmation Notifications' },
                { key: 'updates', label: 'Weather & Trail Safety Updates' },
                { key: 'promo', label: 'Promotion Offer Bulletins' }
              ].map(pref => (
                <label key={pref.key} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyState[pref.key]}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setNotifyState(prev => ({ ...prev, [pref.key]: val }));
                      try {
                        const payload = {};
                        if (pref.key === 'bookings') payload.notificationBookings = val;
                        if (pref.key === 'updates') payload.notificationUpdates = val;
                        if (pref.key === 'promo') payload.notificationPromo = val;
                        const updated = await authApi.updateProfile(payload);
                        onUpdateUser(updated);
                      } catch (err) {
                        toast.error(err?.message || 'Failed to update preferences');
                      }
                    }}
                    className="w-4 h-4 rounded accent-forest-600"
                  />
                  {pref.label}
                </label>
              ))}
            </div>
          </div>

          {/* Setting 4: Change Password */}
          <div className={`p-4 rounded-2xl space-y-3 ${subCardCls}`}>
            <h4 className="text-[15px] font-semibold">Safely Change Password</h4>

            <input
              type="password"
              placeholder="Current password"
              value={passwordState.current}
              onChange={e => setPasswordState({ ...passwordState, current: e.target.value })}
              className={subInputCls}
            />
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={passwordState.next}
              onChange={e => setPasswordState({ ...passwordState, next: e.target.value })}
              className={subInputCls}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={passwordState.confirm}
              onChange={e => setPasswordState({ ...passwordState, confirm: e.target.value })}
              className={subInputCls}
            />

            <button
              onClick={handleUpdatePassword}
              className="w-full py-3.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-sm font-bold uppercase tracking-wide transition cursor-pointer active:scale-[0.99]"
            >
              Update Password
            </button>
          </div>

          {/* Setting 5: Danger Zone — self-service deactivation */}
          <div className={`p-4 rounded-2xl space-y-3 border ${
            darkMode ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-100'
          }`}>
            <h4 className="text-[15px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <UserX size={16} /> Delete My Account
            </h4>
            <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Deactivating your account signs you out immediately and blocks future logins. Your data is kept safe — only an admin can reactivate your account.
            </p>
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold uppercase tracking-wide transition cursor-pointer active:scale-[0.99]"
            >
              Delete / Deactivate Account
            </button>
          </div>
          </motion.div>
        )}

        {/* SUB 5: SUPPORT TICKETS & ISSUES */}
        {currentSub === 'SUPPORT' && (
          <motion.div
            key="SUPPORT"
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex-1 flex flex-col px-5 pt-4 overflow-hidden"
          >
          <div className={subHeaderCls}>
            <button type="button" onClick={() => goSub('MAIN')} className={subBackBtnCls}>
              <ArrowLeft size={17} />
            </button>
            <h3 className={subTitleCls}>Support Tickets Center</h3>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-5 space-y-6">
            {/* Contact Support — email/phone/hours are admin-editable via the CMS */}
            {siteContent?.support && (
              <div className={`p-4 rounded-2xl space-y-2.5 ${subCardCls}`}>
                <h4 className="text-[15px] font-semibold flex items-center gap-1.5">
                  <HelpCircle size={16} className="text-forest-500" /> {siteContent.support.heading || 'Contact Support'}
                </h4>
                {siteContent.support.intro && (
                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {siteContent.support.intro}
                  </p>
                )}
                <div className="space-y-1.5 pt-1">
                  {siteContent.support.email && (
                    <a href={`mailto:${siteContent.support.email}`} className="flex items-center gap-2.5 text-xs font-semibold text-forest-600 dark:text-forest-400">
                      <Mail size={14} /> {siteContent.support.email}
                    </a>
                  )}
                  {siteContent.support.phone && (
                    <a href={`tel:${siteContent.support.phone}`} className="flex items-center gap-2.5 text-xs font-semibold text-forest-600 dark:text-forest-400">
                      <Phone size={14} /> {siteContent.support.phone}
                    </a>
                  )}
                  {siteContent.support.hours && (
                    <div className={`flex items-center gap-2.5 text-xs font-semibold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <Clock size={14} /> {siteContent.support.hours}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Create new ticket card form */}
            <form onSubmit={handleRaiseTicketSubmit} noValidate className={`p-4 rounded-2xl space-y-4 shrink-0 ${subCardCls}`}>
              <h4 className="text-[15px] font-semibold text-forest-600 dark:text-forest-400 flex items-center gap-1.5">
                <AlertCircle size={16} /> Raise Ticket / Report Issue
              </h4>

              <div className="space-y-1.5">
                <label className={subLabelCls}>Category</label>
                <select
                  value={ticketCategory}
                  onChange={e => setTicketCategory(e.target.value)}
                  className={`w-full text-sm px-3.5 py-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                    darkMode ? 'bg-elegant-app border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                  }`}
                >
                  <option value="Booking Issue">Booking Coordinator Error</option>
                  <option value="Payment Issue">Payment Portal Settlement</option>
                  <option value="Environmental Permit">Wildlife Park Permit</option>
                  <option value="Report Trail Issue">Safety/Trail Hazard Report</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={subLabelCls}>Ticket Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coupon FYT20 dynamic logic error"
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  className={subInputCls}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-spy-orange hover:bg-spy-orange-hover text-white text-sm font-bold rounded-xl uppercase tracking-wide transition cursor-pointer active:scale-[0.99]"
              >
                File Support Ticket
              </button>
            </form>

            {/* List existing tickets filed */}
            <div className="space-y-2.5">
              <span className="text-[13px] uppercase font-bold tracking-widest opacity-50 block pl-1">Recent Ticket Enquiries</span>

              {ticketsList.map(t => (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl flex items-center justify-between ${subCardCls}`}
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="text-sm font-bold truncate">{t.title}</h5>
                    <div className="flex gap-2 text-[11px] opacity-55 mt-1">
                      <span>Cat: {t.category}</span>
                      <span>•</span>
                      <span>Filed: {t.timestamp}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0 ${
                    t.status === 'Open'
                      ? 'bg-amber-500/15 text-amber-500'
                      : 'bg-emerald-500/15 text-emerald-500'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Support descriptive collapsible FAQs — admin-editable via the CMS */}
            <div className={`space-y-3 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
              <span className="text-[13px] uppercase font-bold tracking-widest opacity-50 block pl-1">Support Desk FAQs</span>
              <div className={`text-sm space-y-1.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {(siteContent?.support?.faqs || []).map((f, i) => (
                  <React.Fragment key={i}>
                    <p className={`font-bold ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Q: {f.q}</p>
                    <p className="leading-relaxed pb-2">A: {f.a}</p>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          </motion.div>
        )}

        {/* SUB 6: LIVE INTERACTIVE SUPPORT CHAT */}
        {currentSub === 'LIVE_CHAT_SUPPORT' && (
          <motion.div
            key="LIVE_CHAT_SUPPORT"
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex-1 flex flex-col px-5 pt-4 pb-4 overflow-hidden justify-between"
          >

          <div className={`flex items-center justify-between ${subHeaderCls}`}>
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={() => goSub('MAIN')} className={subBackBtnCls}>
                <ArrowLeft size={17} />
              </button>
              <div className="min-w-0">
                <h4 className={subTitleCls}>Helpdesk Live Bot</h4>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">Interactive Agent Online</p>
              </div>
            </div>

            <button
              onClick={() => goSub('MAIN')}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition cursor-pointer ${
                darkMode ? 'bg-white/5 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages list stream scroll */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-1 space-y-3">
            {supportChats.map((m, i) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={i}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`px-4 py-3 max-w-[82%] text-sm leading-relaxed rounded-2xl ${
                    isUser
                      ? 'bg-forest-600 text-white rounded-tr-md shadow-sm'
                      : (darkMode ? 'bg-elegant-card text-zinc-300 rounded-tl-md' : 'bg-white text-zinc-700 rounded-tl-md shadow-sm')
                  }`}>
                    <p>{m.text}</p>
                    <span className="text-[9px] opacity-45 font-mono block text-right mt-1.5">
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lower field inputs */}
          <div className={`pt-3 border-t flex gap-2 ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
            <input
              type="text"
              placeholder="Specify query regarding reservations..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendSupportMsg(); }}
              className={`flex-1 text-sm px-4 py-3.5 border rounded-full outline-hidden transition focus:border-forest-500 ${
                darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/30' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
              }`}
            />
            <button
              onClick={handleSendSupportMsg}
              className="w-12 h-12 shrink-0 bg-forest-600 hover:bg-forest-700 text-white rounded-full flex items-center justify-center active:scale-90 transition cursor-pointer shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTP verification Modal */}
      {showOtpModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-5 z-[100] animate-fade-in">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 ${
            darkMode ? 'bg-zinc-900 border border-zinc-800 text-white' : 'bg-white text-zinc-800'
          }`}>
            <div className="text-center space-y-1.5">
              <h4 className="font-display font-black text-base tracking-tight text-forest-600 dark:text-forest-400">
                Verify Identity Change
              </h4>
              <p className="text-[10px] opacity-75">
                We've sent a 6-digit verification code to confirm the changes.
              </p>
            </div>

            {otpError && (
              <div className="text-center text-[10px] font-bold text-rose-500 py-1 bg-rose-500/10 rounded-lg">
                {otpError}
              </div>
            )}

            <div className="space-y-3">
              {profileEmail.toLowerCase() !== user.email.toLowerCase() && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                    Email Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter email OTP"
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value)}
                    className={`w-full text-xs px-3 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                      darkMode ? 'bg-zinc-950 border-zinc-850 text-white' : 'bg-gray-50 border-zinc-200'
                    }`}
                  />
                </div>
              )}

              {profileMobile !== user.mobile && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                    Mobile Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter mobile OTP"
                    value={mobileOtp}
                    onChange={e => setMobileOtp(e.target.value)}
                    className={`w-full text-xs px-3 py-2 rounded-xl outline-hidden focus:border-forest-500 border ${
                      darkMode ? 'bg-zinc-950 border-zinc-850 text-white' : 'bg-gray-50 border-zinc-200'
                    }`}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancelEditPersonal}
                className={`flex-1 py-3 text-xs font-bold rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 border ${
                  darkMode ? 'border-zinc-800 text-zinc-400' : 'border-gray-200 text-zinc-650'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyAndSave}
                disabled={otpLoading}
                className="flex-1 py-3 text-xs font-bold bg-forest-600 hover:bg-forest-700 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {otpLoading ? 'Verifying…' : 'Verify & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log Out?"
        message="Are you sure you want to log out of your Find Your Trek account?"
        confirmLabel="Log Out"
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
        darkMode={darkMode}
      />

      <ConfirmDialog
        open={showDeactivateConfirm}
        title="Deactivate Your Account?"
        message={`You'll be signed out immediately and won't be able to log back in until an admin reactivates your account. For help, contact support at ${siteContent?.support?.email || 'support@findyourtrek.com'} or ${siteContent?.support?.phone || '+91 99999 88888'}.`}
        confirmLabel={deactivating ? 'Deactivating…' : 'Yes, Deactivate'}
        tone="danger"
        onConfirm={handleDeactivateAccount}
        onCancel={() => setShowDeactivateConfirm(false)}
        darkMode={darkMode}
      />

    </div>
  );
}
