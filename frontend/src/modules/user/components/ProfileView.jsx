import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Shield, Landmark, Flame, Compass, Bell, Globe, KeyRound, HelpCircle,
  ChevronRight, ArrowLeft, Heart, Star, MessageSquare, AlertCircle, Info, ShieldAlert, Send, Sparkles, X, Check, Award, Sun, Moon,
  Building2, CreditCard, Upload, Gift
} from 'lucide-react';
import ThemeToggle from '../../../components/ThemeToggle';
import ConfirmDialog from '../../../components/ConfirmDialog';
import TravelTicket from './TravelTicket';
import SwitchTransition from './SwitchTransition';
import { downloadTicketPDF } from '../utils/ticketPdf';
import { loadLoyaltyConfig, getCustomerProgress } from '../../../utils/loyalty';

// Mirrors Auth.jsx — the organizer panel runs as an independent mini-SPA with
// its own session storage, so switching modules means seeding that store and
// doing a hard navigation to /organizer.
const ORG_USER_STORAGE_KEY = 'trekigo_org_user';
const ORGANIZER_TRANSITION_MS = 3000; // lets the climb→camp flip play before handing off

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
  onOpenLoyalty
}) {
  const [currentSub, setCurrentSub] = useState('MAIN');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // The partner application takes over the whole screen — ask the shell to
  // hide the bottom nav while it's open (restored on back/unmount).
  useEffect(() => {
    if (onFullscreenChange) onFullscreenChange(currentSub === 'BECOME_ORGANIZER');
    return () => { if (onFullscreenChange) onFullscreenChange(false); };
  }, [currentSub, onFullscreenChange]);

  const loyaltyConfig = loadLoyaltyConfig();
  const loyaltyProgress = getCustomerProgress(bookings, loyaltyConfig);

  // Input bindings state
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileMobile, setProfileMobile] = useState(user.mobile);
  const [profileEmergency, setProfileEmergency] = useState(user.emergencyContact);

  // Experience and Fitness
  const [hikeExperience, setHikeExperience] = useState(user.hikingExperience);
  const [fitLevel, setFitLevel] = useState(user.fitnessLevel);

  // Settings

  const [passwordState, setPasswordState] = useState({ current: '', next: '', confirm: '' });
  const [notifyState, setNotifyState] = useState({ bookings: true, updates: true, promo: false });
  const [privacyState, setPrivacyState] = useState({ shareStats: true, cloudBackup: true });

  // Support
  const [ticketCategory, setTicketCategory] = useState('Booking Issue');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketsList, setTicketsList] = useState([
    { id: 'TKT-998', title: 'Payment processed twice fail query', category: 'Payment Issue', status: 'Resolved', timestamp: '2026-06-12' }
  ]);

  // Become an Organizer flow
  const [orgSwitching, setOrgSwitching] = useState(false);
  const [orgForm, setOrgForm] = useState({
    agencyName: '', agencyWebsite: '', socialMediaLink: '', yearsExperience: '', bio: '',
    govtIdType: 'Aadhaar', govtIdNumber: '', documentName: ''
  });
  const [orgFormError, setOrgFormError] = useState('');

  // Check if this traveller already has an organizer account (approved OR pending).
  // Reading localStorage here is cheaper than adding a prop and stays in sync
  // even if the user registered as an organizer in a previous session.
  const isExistingOrganizer = (() => {
    try {
      const raw = localStorage.getItem(ORG_USER_STORAGE_KEY);
      if (!raw) return false;
      const org = JSON.parse(raw);
      // Must at least be onboarded — covers both approved and pending-approval states
      return !!(org?.isOnboarded && (org?.email === user?.email || org?.isAuthenticated));
    } catch { return false; }
  })();

  // Support Chat
  const [supportChats, setSupportChats] = useState([
    { sender: 'bot', text: 'Hello Chirag! Welcome to Trekigo Helpdesk. How can we optimize your trekking experience today?', time: '11:10 AM' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSavePersonalInfo = (e) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name: profileName,
      email: profileEmail,
      mobile: profileMobile,
      emergencyContact: profileEmergency
    });
    alert('Personal information coordinates updated successfully!');
    setCurrentSub('MAIN');
  };

  const handleSaveStatsInfo = (e) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      hikingExperience: hikeExperience,
      fitnessLevel: fitLevel
    });
    alert('Adventure statistics updated! AI recommend algorithms adjusted.');
    setCurrentSub('MAIN');
  };

  const handleRaiseTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketTitle.trim()) return;

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
    alert('Inquiry report logged. Support agents will audit details on-screen within 24 hours.');
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
      bio: 'Verified Trekigo organizer.',
      verificationDocumentUrl: '',
      rating: 4.8,
      totalTrips: 0,
      totalBookings: 0,
      coreCapabilities: ['Certified Trek Leader'],
      ...existingOrg,
      isAuthenticated: true,
      isOnboarded: true,
      isApproved: true,
      isPendingApproval: false,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      avatar: user.avatar,
      rememberMe: true,
    };
    try { localStorage.setItem(ORG_USER_STORAGE_KEY, JSON.stringify(orgUser)); } catch (e) {}
    window.location.href = '/organizer';
  };

  // Plays the climb→camp flip, then either enters the organizer module
  // (already-vetted accounts) or opens the partner application form.
  const handleBecomeOrganizer = () => {
    setOrgSwitching(true);
    setTimeout(() => {
      if (user.isOrganizer) {
        redirectToOrganizerPanel();
      } else {
        setOrgSwitching(false);
        setCurrentSub('BECOME_ORGANIZER');
      }
    }, ORGANIZER_TRANSITION_MS);
  };

  const handleSubmitOrgApplication = (e) => {
    e.preventDefault();
    if (!orgForm.agencyName.trim()) { setOrgFormError('Agency / company name is required.'); return; }
    if (!orgForm.socialMediaLink.trim()) { setOrgFormError('A social media link (e.g. Instagram) is required.'); return; }
    if (!orgForm.govtIdNumber.trim()) { setOrgFormError('Government ID number is required for verification.'); return; }
    setOrgFormError('');

    // Same pending-approval application shape OrgAuth registration produces —
    // the organizer panel will greet them with the "under review" screen.
    const application = {
      isAuthenticated: true,
      isOnboarded: true,
      isApproved: false,
      isPendingApproval: true,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      avatar: user.avatar,
      agencyName: orgForm.agencyName.trim(),
      agencyWebsite: orgForm.agencyWebsite.trim(),
      socialMediaLink: orgForm.socialMediaLink.trim(),
      govtIdType: orgForm.govtIdType,
      govtIdNumber: orgForm.govtIdNumber.trim(),
      yearsExperience: parseInt(orgForm.yearsExperience) || 1,
      bio: orgForm.bio.trim(),
      verificationDocumentUrl: orgForm.documentName,
      rating: 0,
      totalTrips: 0,
      totalBookings: 0,
      rememberMe: true,
    };
    try { localStorage.setItem(ORG_USER_STORAGE_KEY, JSON.stringify(application)); } catch (e) {}

    setOrgSwitching(true);
    setTimeout(() => { window.location.href = '/organizer'; }, ORGANIZER_TRANSITION_MS);
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
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
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
                  onClick={() => setCurrentSub('EDIT_PERSONAL')}
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
                  onClick={() => setCurrentSub('EDIT_STATS')}
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
                  onClick={() => setCurrentSub('MY_REVIEWS')}
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
                    {isExistingOrganizer ? 'Switch to Organizer' : 'Become an Organizer'}
                  </span>
                  <ChevronRight size={17} className="opacity-40" />
                </button>
              </div>
            </div>

            {/* Group B: App preferences */}
            <div className="space-y-2.5">
              <span className="text-[13px] uppercase font-bold tracking-widest opacity-50 pl-1 block">Help Center & Prefs</span>

              <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}>



                <button
                  onClick={() => setCurrentSub('SETTINGS')}
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
                  onClick={() => setCurrentSub('SUPPORT')}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle size={19} className="text-forest-500" /> Support Desk & Tickets
                  </span>
                  <ChevronRight size={17} className="opacity-40" />
                </button>



                {/* Restart onboarding tutorial */}
                <button
                  onClick={onTriggerOnboarding}
                  className={`w-full px-4 py-4 flex justify-between items-center text-base font-semibold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Compass size={19} className="text-forest-500" /> Start Onboarding Guide
                  </span>
                  <Sparkles size={16} className="text-spy-orange animate-pulse" />
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
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSavePersonalInfo}
            className="flex-1 flex flex-col justify-between px-5 pt-4 pb-6"
          >
          <div className="space-y-5">
            <div className={subHeaderCls}>
              <button type="button" onClick={() => setCurrentSub('MAIN')} className={subBackBtnCls}>
                <ArrowLeft size={17} />
              </button>
              <h3 className={subTitleCls}>Personal Info</h3>
            </div>

            {/* Name input */}
            <div className="space-y-1.5">
              <label className={subLabelCls}>Full Name</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className={subInputCls}
              />
            </div>

            {/* Email input */}
            <div className="space-y-1.5">
              <label className={subLabelCls}>Email Address</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
                className={subInputCls}
              />
            </div>

            {/* Phone input */}
            <div className="space-y-1.5">
              <label className={subLabelCls}>Mobile Number</label>
              <input
                type="tel"
                required
                value={profileMobile}
                onChange={e => setProfileMobile(e.target.value)}
                className={subInputCls}
              />
            </div>

            {/* Emergency Info */}
            <div className="space-y-1.5">
              <label className={subLabelCls}>Emergency Coordinates (Name + Phone)</label>
              <input
                type="text"
                required
                value={profileEmergency}
                onChange={e => setProfileEmergency(e.target.value)}
                className={subInputCls}
              />
            </div>
          </div>

          <button type="submit" className={subPrimaryBtnCls}>
            Save Account Details
          </button>
          </motion.form>
        )}

        {/* SUB: BECOME AN ORGANIZER — partner application for accounts that
            aren't vetted organizers yet (mirrors the OrgAuth signup fields) */}
        {currentSub === 'BECOME_ORGANIZER' && (
          <motion.form
            key="BECOME_ORGANIZER"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmitOrgApplication}
            // Full-screen overlay (covers the bottom nav) — applying to become
            // a partner is a focused flow, not a tab-level screen.
            className={`absolute inset-0 z-50 flex flex-col overflow-y-auto no-scrollbar p-4 ${
              darkMode ? 'bg-elegant-app' : 'bg-[#FAF8F2]'
            }`}
          >
          <div className="space-y-4 flex-1">
            <div className={subHeaderCls}>
              <button type="button" onClick={() => { setOrgFormError(''); setCurrentSub('MAIN'); }} className={subBackBtnCls}>
                <ArrowLeft size={17} />
              </button>
              <h3 className={`${subTitleCls} flex items-center gap-2`}>
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
                type="text"
                placeholder="e.g. Himalayan Guides Ltd"
                value={orgForm.agencyName}
                onChange={e => { setOrgForm({ ...orgForm, agencyName: e.target.value }); setOrgFormError(''); }}
                className={`w-full text-sm px-3.5 py-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                  darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/30' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>

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
              <label className="text-xs font-bold uppercase tracking-wider opacity-65">Social Media Link (e.g. Instagram) *</label>
              <input
                type="url"
                required
                placeholder="https://instagram.com/youragency"
                value={orgForm.socialMediaLink}
                onChange={e => { setOrgForm({ ...orgForm, socialMediaLink: e.target.value }); setOrgFormError(''); }}
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
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider opacity-65">Government ID Type</label>
              <select
                value={orgForm.govtIdType}
                onChange={e => setOrgForm({ ...orgForm, govtIdType: e.target.value })}
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
                  type="text"
                  placeholder="Enter your ID number"
                  value={orgForm.govtIdNumber}
                  onChange={e => { setOrgForm({ ...orgForm, govtIdNumber: e.target.value }); setOrgFormError(''); }}
                  className={`w-full text-sm pl-10 pr-3.5 py-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                    darkMode ? 'bg-elegant-card border-white/10 text-white placeholder-white/30' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>
            </div>

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
              By applying, you agree to Trekigo's Partner Terms of Service. All ID information is encrypted and secure.
            </p>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-4 bg-spy-orange hover:bg-spy-orange-hover text-white font-bold rounded-2xl text-sm uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            Submit Application <ChevronRight size={16} />
          </button>
          </motion.form>
        )}

        {/* SUB 2: EDIT ATHLETICS & STATS */}
        {currentSub === 'EDIT_STATS' && (
          <motion.form
            key="EDIT_STATS"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSaveStatsInfo}
            className="flex-1 flex flex-col justify-between px-5 pt-4 pb-6"
          >
          <div className="space-y-5">
            <div className={subHeaderCls}>
              <button type="button" onClick={() => setCurrentSub('MAIN')} className={subBackBtnCls}>
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
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col px-5 pt-4 overflow-hidden"
          >
          <div className={subHeaderCls}>
            <button type="button" onClick={() => setCurrentSub('MAIN')} className={subBackBtnCls}>
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
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col px-5 pt-4 overflow-y-auto no-scrollbar pb-8 space-y-5"
          >
          <div className={subHeaderCls}>
            <button type="button" onClick={() => setCurrentSub('MAIN')} className={subBackBtnCls}>
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
                    onChange={e => setNotifyState({ ...notifyState, [pref.key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-forest-600"
                  />
                  {pref.label}
                </label>
              ))}
            </div>
          </div>

          {/* Setting 4: Change Password simulation */}
          <div className={`p-4 rounded-2xl space-y-3 ${subCardCls}`}>
            <h4 className="text-[15px] font-semibold">Safely Change Password</h4>

            <input
              type="password"
              placeholder="Current credentials"
              value={passwordState.current}
              onChange={e => setPasswordState({ ...passwordState, current: e.target.value })}
              className={subInputCls}
            />
            <input
              type="password"
              placeholder="New password (min 6 symbols)"
              value={passwordState.next}
              onChange={e => setPasswordState({ ...passwordState, next: e.target.value })}
              className={subInputCls}
            />

            <button
              onClick={() => {
                if (!passwordState.current || !passwordState.next) {
                  alert('Enter both current and next secret symbols.');
                  return;
                }
                alert('Secret symbols updated successfully!');
                setPasswordState({ current: '', next: '', confirm: '' });
              }}
              className="w-full py-3.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-sm font-bold uppercase tracking-wide transition cursor-pointer active:scale-[0.99]"
            >
              Update Password
            </button>
          </div>
          </motion.div>
        )}

        {/* SUB 5: SUPPORT TICKETS & ISSUES */}
        {currentSub === 'SUPPORT' && (
          <motion.div
            key="SUPPORT"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col px-5 pt-4 overflow-hidden"
          >
          <div className={subHeaderCls}>
            <button type="button" onClick={() => setCurrentSub('MAIN')} className={subBackBtnCls}>
              <ArrowLeft size={17} />
            </button>
            <h3 className={subTitleCls}>Support Tickets Center</h3>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-5 space-y-6">
            {/* Create new ticket card form */}
            <form onSubmit={handleRaiseTicketSubmit} className={`p-4 rounded-2xl space-y-4 shrink-0 ${subCardCls}`}>
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
                  placeholder="e.g. Coupon TREKIGO20 dynamic logic error"
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

            {/* Support descriptive collapsible FAQs */}
            <div className={`space-y-3 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
              <span className="text-[13px] uppercase font-bold tracking-widest opacity-50 block pl-1">Support Desk FAQs</span>
              <div className={`text-sm space-y-1.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <p className={`font-bold ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Q: How soon can I cancel my trek departure?</p>
                <p className="leading-relaxed pb-2">A: Full booking refund settlements are executed up to 15 days before the departure slot.</p>
                <p className={`font-bold ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Q: Are park mountain permits physical documents?</p>
                <p className="leading-relaxed">A: No, Trekigo coordinates verified digital QR pass entries directly with forest control gates.</p>
              </div>
            </div>
          </div>
          </motion.div>
        )}

        {/* SUB 6: LIVE INTERACTIVE SUPPORT CHAT */}
        {currentSub === 'LIVE_CHAT_SUPPORT' && (
          <motion.div
            key="LIVE_CHAT_SUPPORT"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col px-5 pt-4 pb-4 overflow-hidden justify-between"
          >

          <div className={`flex items-center justify-between ${subHeaderCls}`}>
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={() => setCurrentSub('MAIN')} className={subBackBtnCls}>
                <ArrowLeft size={17} />
              </button>
              <div className="min-w-0">
                <h4 className={subTitleCls}>Helpdesk Live Bot</h4>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">Interactive Agent Online</p>
              </div>
            </div>

            <button
              onClick={() => setCurrentSub('MAIN')}
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

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log Out?"
        message="Are you sure you want to log out of your Trekigo account?"
        confirmLabel="Log Out"
        onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
        darkMode={darkMode}
      />

    </div>
  );
}
