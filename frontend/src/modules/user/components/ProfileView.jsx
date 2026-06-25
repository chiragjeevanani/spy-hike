import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Shield, Landmark, Flame, Compass, Bell, Globe, KeyRound, HelpCircle, 
  ChevronRight, ArrowLeft, Heart, Star, MessageSquare, AlertCircle, Info, ShieldAlert, Send, Sparkles, X, Check, Award
} from 'lucide-react';

export default function ProfileView({
  user,
  onUpdateUser,
  onLogout,
  darkMode,
  onToggleDarkMode,
  userReviews,
  onTriggerOnboarding,
  bookings = []
}) {
  const [currentSub, setCurrentSub] = useState('MAIN');

  // Input bindings state
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileMobile, setProfileMobile] = useState(user.mobile);
  const [profileEmergency, setProfileEmergency] = useState(user.emergencyContact);

  // Experience and Fitness
  const [hikeExperience, setHikeExperience] = useState(user.hikingExperience);
  const [fitLevel, setFitLevel] = useState(user.fitnessLevel);

  // Settings
  const [appLanguage, setAppLanguage] = useState('English');
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

  // Support Chat
  const [supportChats, setSupportChats] = useState([
    { sender: 'bot', text: 'Hello Chirag! Welcome to Spy Hike Helpdesk. How can we optimize your trekking experience today?', time: '11:10 AM' }
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

  return (
    <div className={`flex-1 flex flex-col overflow-hidden font-sans ${
      darkMode ? 'bg-elegant-app text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>
      
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
          <div className={`p-4 text-center border-b flex flex-col items-center gap-1.5 ${
            darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-gray-100'
          }`}>
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-forest-500 shadow-lg relative select-none">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>

            <div>
              <h3 className="text-sm font-display font-black leading-tight flex items-center justify-center gap-1">
                {user.name} <Award size={13} className="text-spy-orange fill-spy-orange/10" />
              </h3>
              <p className="text-[10px] opacity-65">{user.email}</p>
              <span className="text-[9px] font-mono tracking-wider font-bold text-forest-505 dark:text-forest-400 uppercase mt-1.5 bg-forest-950/20 px-2 py-0.5 rounded-full inline-block border border-forest-800/10 dark:border-forest-800/40">
                ⭐ {user.hikingExperience} Outdoorsman
              </span>
            </div>
          </div>
          
          {/* Quick profile stats */}
          <div className="px-3 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-xs border ${
                darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-zinc-105'
              }`}>
                <span className="text-[9px] uppercase font-bold opacity-50 tracking-wider mb-1">Booked</span>
                <span className="text-xs font-extrabold font-display text-forest-500">
                  {bookings.length} {bookings.length === 1 ? 'Hike' : 'Hikes'}
                </span>
              </div>
              <div className={`p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-xs border ${
                darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-zinc-105'
              }`}>
                <span className="text-[9px] uppercase font-bold opacity-50 tracking-wider mb-1">Distance</span>
                <span className="text-xs font-extrabold font-display text-spy-orange">
                  {bookings.length * 16} Km
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Sections Menu list */}
          <div className="p-3 space-y-3">
            
            {/* Group A: Personal stats */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest opacity-45 pl-1 block">Account & Bio</span>
              
              <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}>
                
                <button
                  onClick={() => setCurrentSub('EDIT_PERSONAL')}
                  className={`w-full p-3 flex justify-between items-center text-xs font-bold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <User size={14} className="text-forest-500" /> Personal Details
                  </span>
                  <ChevronRight size={13} className="opacity-40" />
                </button>

                <button
                  onClick={() => setCurrentSub('EDIT_STATS')}
                  className={`w-full p-3 flex justify-between items-center text-xs font-bold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Flame size={14} className="text-spy-orange" /> Athletics & Experience
                  </span>
                  <ChevronRight size={13} className="opacity-40" />
                </button>

                <button
                  onClick={() => setCurrentSub('MY_REVIEWS')}
                  className={`w-full p-3 flex justify-between items-center text-xs font-bold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-forest-500" /> Verified Reviews ({userReviews.length})
                  </span>
                  <ChevronRight size={13} className="opacity-40" />
                </button>
              </div>
            </div>

            {/* Group B: App preferences */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest opacity-45 pl-1 block">Help Center & Prefs</span>
              
              <div className={`rounded-xl overflow-hidden ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}>
                
                <button
                  onClick={() => setCurrentSub('SETTINGS')}
                  className={`w-full p-3 flex justify-between items-center text-xs font-bold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Shield size={14} className="text-forest-500" /> Preferences & Settings
                  </span>
                  <ChevronRight size={13} className="opacity-40" />
                </button>

                <button
                  onClick={() => setCurrentSub('SUPPORT')}
                  className={`w-full p-3 flex justify-between items-center text-xs font-bold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-forest-500" /> Support Desk & Tickets
                  </span>
                  <ChevronRight size={13} className="opacity-40" />
                </button>

                <button
                  onClick={() => setCurrentSub('LIVE_CHAT_SUPPORT')}
                  className={`w-full p-3 flex justify-between items-center text-xs font-bold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-spy-orange" /> Helpdesk Live Chat
                  </span>
                  <ChevronRight size={13} className="opacity-40" />
                </button>

                {/* Restart onboarding tutorial */}
                <button
                  onClick={onTriggerOnboarding}
                  className={`w-full p-3 flex justify-between items-center text-xs font-bold text-left border-b last:border-b-0 ${
                    darkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-55'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Compass size={14} className="text-forest-500" /> Start Onboarding Guide
                  </span>
                  <Sparkles size={12} className="text-spy-orange animate-pulse" />
                </button>
              </div>
            </div>

            {/* Group C: Next Departure or Explore Treks */}
            {(() => {
              const upcomingBooking = bookings.find(b => b.status === 'Upcoming');
              if (upcomingBooking) {
                return (
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold tracking-widest opacity-45 pl-1 block">Next Departure Ticket</span>
                    <div className={`rounded-xl p-3.5 border relative overflow-hidden flex flex-col justify-between min-h-[110px] ${
                      darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-zinc-100 shadow-sm'
                    }`}>
                      {/* Accent color elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-forest-500/5 rounded-full blur-xl pointer-events-none" />
                      
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-mono tracking-widest text-forest-600 dark:text-forest-400 font-bold uppercase">CONFIRMED TICKET</span>
                            <h4 className="text-xs font-black mt-0.5 line-clamp-1">{upcomingBooking.tripName}</h4>
                          </div>
                          <span className="text-[8px] font-mono bg-forest-500/10 text-forest-600 dark:text-forest-400 px-2 py-0.5 rounded-full font-bold uppercase">
                            {upcomingBooking.bookingId || upcomingBooking.id}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2.5">
                          <div>
                            <span className="text-[7px] uppercase font-bold opacity-45 block">Date</span>
                            <span className="text-[10px] font-bold">{upcomingBooking.selectedDate}</span>
                          </div>
                          <div>
                            <span className="text-[7px] uppercase font-bold opacity-45 block">Location</span>
                            <span className="text-[10px] font-bold line-clamp-1">{upcomingBooking.tripLocation}</span>
                          </div>
                          <div>
                            <span className="text-[7px] uppercase font-bold opacity-45 block">Travelers</span>
                            <span className="text-[10px] font-bold">{upcomingBooking.travelersCount} Pax</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                        <span className="text-[8px] opacity-55">Show ticket QR at gate control</span>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-forest-600 dark:text-forest-400">
                          Active Adventure <Sparkles size={10} className="text-spy-orange animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold tracking-widest opacity-45 pl-1 block">Ready For Next Hike?</span>
                    <div className={`rounded-xl p-4 border relative overflow-hidden flex flex-col justify-between ${
                      darkMode ? 'bg-elegant-card border-white/5' : 'bg-white border-zinc-100 shadow-sm'
                    }`}>
                      {/* Premium visual gradients */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-spy-orange/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="relative z-10">
                        <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 font-display">
                          <Compass size={14} className="text-spy-orange" /> Find Your Next Summit
                        </h4>
                        <p className="text-[10px] opacity-75 mt-1 leading-normal">
                          Explore premium certified trails, real-time weather alerts, and coordinate with expert organizers.
                        </p>
                      </div>

                      <div className="mt-3.5 flex justify-end">
                        <button
                          onClick={() => {
                            window.history.pushState({ path: '/explore' }, '', '/explore');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="px-3.5 py-1.5 bg-forest-600 hover:bg-forest-700 text-white rounded-lg text-[9px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                        >
                          Explore Trips <ChevronRight size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            })()}

            {/* Logout actions */}
            <button
              onClick={onLogout}
              className="w-full mt-3 py-3 rounded-xl text-center font-black bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 transition text-xs uppercase shadow-xs cursor-pointer"
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
            className="flex-1 flex flex-col justify-between p-4"
          >
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
              <button type="button" onClick={() => setCurrentSub('MAIN')} className="text-zinc-500 hover:text-zinc-300">
                <ArrowLeft size={18} />
              </button>
              <h3 className="text-sm font-display font-black">Personal Info</h3>
            </div>

            {/* Name input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-65">Full Name</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className={`w-full text-xs px-3 py-2.5 border rounded-xl outline-hidden focus:border-forest-500 ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-250 text-zinc-900'
                }`}
              />
            </div>

            {/* Email input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-65">Email Address</label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={e => setProfileEmail(e.target.value)}
                className={`w-full text-xs px-3 py-2.5 border rounded-xl outline-hidden focus:border-forest-500 ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-250 text-zinc-900'
                }`}
              />
            </div>

            {/* Phone input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-65">Mobile Number</label>
              <input
                type="tel"
                required
                value={profileMobile}
                onChange={e => setProfileMobile(e.target.value)}
                className={`w-full text-xs px-3 py-2.5 border rounded-xl outline-hidden focus:border-forest-505 ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-250 text-zinc-900'
                }`}
              />
            </div>

            {/* Emergency Info */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-65">Emergency Coordinates (Name + Phone)</label>
              <input
                type="text"
                required
                value={profileEmergency}
                onChange={e => setProfileEmergency(e.target.value)}
                className={`w-full text-xs px-3 py-2.5 border rounded-xl outline-hidden focus:border-forest-505 ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-250'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs uppercase"
          >
            Save Account Details
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
            className="flex-1 flex flex-col justify-between p-4"
          >
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
              <button type="button" onClick={() => setCurrentSub('MAIN')} className="text-zinc-500 hover:text-zinc-300">
                <ArrowLeft size={18} />
              </button>
              <h3 className="text-sm font-display font-black">Athletics, Experience & Level</h3>
            </div>
            
            <p className="text-xs text-zinc-400">
              These details construct the background parameters in our smart AI-Recommendation matrix systems:
            </p>

            {/* Hiking Experience toggles */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-65">Outdoors Hiking Experience</label>
              <div className="grid grid-cols-3 gap-2">
                {['Beginner', 'Intermediate', 'Advanced'].map(lev => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setHikeExperience(lev)}
                    className={`py-3 rounded-xl text-xs font-bold border transition ${
                      hikeExperience === lev
                        ? 'border-forest-500 bg-forest-950/20 text-white'
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {lev}
                  </button>
                ))}
              </div>
            </div>

            {/* Fitness Level toggles */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-65">Current Cardio Fitness Level</label>
              <div className="grid grid-cols-3 gap-2">
                {['Low', 'Moderate', 'High'].map(fit => (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => setFitLevel(fit)}
                    className={`py-3 rounded-xl text-xs font-bold border transition ${
                      fitLevel === fit
                        ? 'border-forest-505 bg-forest-950/20 text-white'
                        : 'border-zinc-850 bg-zinc-900/40 text-zinc-450 hover:bg-zinc-900'
                    }`}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-forest-600 hover:bg-forest-700 text-white font-bold rounded-xl text-xs uppercase"
          >
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
            className="flex-1 flex flex-col p-4 overflow-hidden"
          >
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-805 shrink-0">
            <button type="button" onClick={() => setCurrentSub('MAIN')} className="text-zinc-500 hover:text-zinc-300">
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-sm font-display font-black">My Verified Comments</h3>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
            {userReviews.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-5xl block">✍️</span>
                <p className="text-xs text-zinc-500 mt-4 leading-normal px-6">
                  You haven't filed trek reviews yet. Completed trips can be rated directly in My Bookings tabs.
                </p>
              </div>
            ) : (
              userReviews.map((rev, i) => (
                <div 
                  key={i}
                  className={`p-3 rounded-2xl space-y-2 ${
                    darkMode ? 'bg-zinc-900/45' : 'bg-white shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-xs font-bold">{rev.tripName}</h4>
                      <span className="text-[8px] opacity-40 font-mono block">Validated on {rev.date}</span>
                    </div>

                    <div className="flex gap-0.5 shrink-0 text-amber-400">
                      {[...Array(rev.rating)].map((_, st) => <Star key={st} size={9} className="fill-amber-400" />)}
                    </div>
                  </div>

                  <p className={`text-[11px] leading-relaxed opacity-95 ${darkMode ? 'text-zinc-300' : 'text-zinc-650'}`}>
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
            className="flex-1 flex flex-col p-4 overflow-y-auto no-scrollbar pb-8 space-y-5"
          >
          <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-850 shrink-0">
            <button type="button" onClick={() => setCurrentSub('MAIN')} className="text-zinc-500 hover:text-zinc-300">
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-sm font-display font-black">Preferences & Configurations</h3>
          </div>

          {/* Setting 1: Theme toggle */}
          <div className={`p-4 rounded-xl flex items-center justify-between ${
            darkMode ? 'bg-zinc-900/30' : 'bg-white shadow-xs'
          }`}>
            <div>
              <h4 className="text-xs font-bold">App Night Mode</h4>
              <p className="text-[10px] text-zinc-550">Toggles premium twilight visuals</p>
            </div>
            
            <button
              id="settings-tog-dark-mode"
              onClick={onToggleDarkMode}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors ${darkMode ? 'bg-forest-600' : 'bg-gray-300'}`}
            >
              <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-[22px]' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Setting 2: Language Selection */}
          <div className={`p-4 rounded-xl space-y-2.5 ${
            darkMode ? 'bg-zinc-900/30' : 'bg-white shadow-xs'
          }`}>
            <div>
              <h4 className="text-xs font-bold">Select Language</h4>
              <p className="text-[10px] text-zinc-500">Local guides coordination translation default</p>
            </div>
            <select
              value={appLanguage}
              onChange={e => { setAppLanguage(e.target.value); alert(`Language settings applied: ${e.target.value}`); }}
              className={`w-full text-xs px-2 py-2 border rounded-lg focus:border-forest-500 outline-hidden ${
                darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'
              }`}
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी (Hindi)</option>
              <option value="Marathi">मराठी (Marathi)</option>
              <option value="French">Français</option>
            </select>
          </div>

          {/* Setting 3: Notification Preference */}
          <div className={`p-4 rounded-xl space-y-3 ${
            darkMode ? 'bg-zinc-900/30' : 'bg-white shadow-xs'
          }`}>
            <h4 className="text-xs font-bold">Push Notifications Preferences</h4>
            
            <div className="space-y-2">
              {[
                { key: 'bookings', label: 'Booking Confirmation Notifications' },
                { key: 'updates', label: 'Weather & Trail Safety Updates' },
                { key: 'promo', label: 'Promotion Offer Bulletins' }
              ].map(pref => (
                <label key={pref.key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyState[pref.key]}
                    onChange={e => setNotifyState({ ...notifyState, [pref.key]: e.target.checked })}
                    className="rounded accent-forest-650"
                  />
                  {pref.label}
                </label>
              ))}
            </div>
          </div>

          {/* Setting 4: Change Password simulation */}
          <div className={`p-4 rounded-xl space-y-3 ${
            darkMode ? 'bg-zinc-900/30' : 'bg-white shadow-xs'
          }`}>
            <h4 className="text-xs font-bold">Safely Change Password</h4>
            
            <input
              type="password"
              placeholder="Current credentials"
              value={passwordState.current}
              onChange={e => setPasswordState({ ...passwordState, current: e.target.value })}
              className={`w-full text-[11px] p-2 py-2.5 border rounded-lg focus:border-forest-500 outline-hidden ${
                darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white'
              }`}
            />
            <input
              type="password"
              placeholder="New password (min 6 symbols)"
              value={passwordState.next}
              onChange={e => setPasswordState({ ...passwordState, next: e.target.value })}
              className={`w-full text-[11px] p-2 py-2.5 border rounded-lg focus:border-forest-500 outline-hidden ${
                darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white'
              }`}
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
              className="w-full py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-lg text-xs font-bold uppercase transition"
            >
              Update symbols
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
            className="flex-1 flex flex-col p-4 overflow-hidden"
          >
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-800 shrink-0">
            <button type="button" onClick={() => setCurrentSub('MAIN')} className="text-zinc-500 hover:text-zinc-300">
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-sm font-display font-black">Support Tickets Center</h3>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-5">
            {/* Create new ticket card form */}
            <form onSubmit={handleRaiseTicketSubmit} className={`p-4 rounded-xl space-y-3 shrink-0 ${
              darkMode ? 'bg-zinc-900/40' : 'bg-white shadow-xs'
            }`}>
              <h4 className="text-xs font-bold text-forest-650 dark:text-forest-400 flex items-center gap-1">
                <AlertCircle size={14} /> Raise Ticket / Report Issue
              </h4>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider opacity-60">Category</label>
                <select
                  value={ticketCategory}
                  onChange={e => setTicketCategory(e.target.value)}
                  className={`w-full text-xs px-2 py-2 border rounded-lg outline-hidden ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-100 border-gray-200'
                  }`}
                >
                  <option value="Booking Issue">Booking Coordinator Error</option>
                  <option value="Payment Issue">Payment Portal Settlement</option>
                  <option value="Environmental Permit">Wildlife Park Permit</option>
                  <option value="Report Trail Issue">Safety/Trail Hazard Report</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider opacity-60">Ticket Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coupon SPYHIKE20 dynamic logic error"
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  className={`w-full text-[11px] p-2.5 border rounded-lg outline-hidden focus:border-forest-500 ${
                    darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-gray-200 text-zinc-900'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-spy-orange hover:bg-spy-orange-hover text-white text-xs font-bold rounded-lg uppercase transition cursor-pointer"
              >
                File Support Ticket
              </button>
            </form>

            {/* List existing tickets filed */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-50 block">RECENT TICKET ENQUIRIES</span>
              
              {ticketsList.map(t => (
                <div 
                  key={t.id}
                  className={`p-3 rounded-xl flex items-center justify-between ${
                    darkMode ? 'bg-zinc-900/20' : 'bg-white shadow-xs'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="text-[11px] font-bold truncate">{t.title}</h5>
                    <div className="flex gap-2 text-[8px] opacity-50 mt-1">
                      <span>Cat: {t.category}</span>
                      <span>•</span>
                      <span>Filed: {t.timestamp}</span>
                    </div>
                  </div>

                  <span className={`text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shrink-0 ${
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
            <div className="space-y-2 pt-2 border-t border-zinc-805">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-50 block">Support Desk FAQs</span>
              <div className="text-[11px] space-y-1 text-zinc-400">
                <p className="font-bold text-zinc-300">Q: How soon can I cancel my trek departure?</p>
                <p className="leading-normal pb-2">A: Full booking refund settlements are executed up to 15 days before the departure slot.</p>
                <p className="font-bold text-zinc-300">Q: Are park mountain permits physical documents?</p>
                <p className="leading-normal">A: No, Spy Hike coordinates verified digital QR pass entries directly with forest control gates.</p>
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
            className="flex-1 flex flex-col p-4 overflow-hidden justify-between"
          >
          
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => setCurrentSub('MAIN')} className="text-zinc-500 hover:text-zinc-300">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h4 className="text-xs font-black font-display text-forest-650 dark:text-forest-400">Helpdesk Live Bot</h4>
                <p className="text-[8px] text-emerald-400 block font-bold uppercase tracking-wider">Interactive Agent Online</p>
              </div>
            </div>

            <button 
              onClick={() => setCurrentSub('MAIN')}
              className="w-7 h-7 rounded-full bg-zinc-800/10 dark:bg-zinc-850 flex items-center justify-center text-zinc-400"
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages list stream scroll */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3px px-1 space-y-3">
            {supportChats.map((m, i) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={i}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-2.5 max-w-[80%] text-[11px] leading-relaxed rounded-2xl ${
                    isUser
                      ? 'bg-forest-600 text-white rounded-tr-none shadow-sm'
                      : (darkMode ? 'bg-zinc-900 border border-zinc-850 text-zinc-350 rounded-tl-none' : 'bg-gray-150 text-zinc-800 rounded-tl-none')
                  }`}>
                    <p>{m.text}</p>
                    <span className="text-[7.5px] opacity-40 font-mono block text-right mt-1">
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lower field inputs */}
          <div className="pt-3 border-t border-zinc-800/10 dark:border-zinc-850 flex gap-2">
            <input
              type="text"
              placeholder="Specify query regarding reservations slots..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendSupportMsg(); }}
              className={`flex-1 text-xs px-3.5 py-3 border rounded-xl outline-hidden focus:border-forest-505 ${
                darkMode ? 'bg-zinc-900 border-zinc-850 text-white' : 'bg-white border-gray-250'
              }`}
            />
            <button
              onClick={handleSendSupportMsg}
              className="w-11 bg-forest-600 hover:bg-forest-700 text-white rounded-xl flex items-center justify-center active:scale-90 cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
