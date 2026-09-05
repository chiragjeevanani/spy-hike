import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, attachFollow } from 'motion/react';
import {
  Download, MessageSquare, Star, ArrowLeft, Send, Sparkles, CalendarDays, Receipt, X, MapPin, ShieldCheck
} from 'lucide-react';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';
import { getComputedBookingStatus, getStatusBadgeStyle } from '../../../utils/bookingStatus';

export default function BookingsView({
  bookings,
  trips,
  onSelectTrip,
  chats,
  onSaveChats,
  onSendChatMessage,
  onModifyBookingStatus,
  onAddReview,
  onSelectBooking,
  initialChatTripId,
  onChatOpened,
  darkMode
}) {
  const [activeTab, setActiveTab] = useState('Upcoming');

  // Modals / Overlays triggers
  const [activeChatSession, setActiveChatSession] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  
  const [showInvoiceBooking, setShowInvoiceBooking] = useState(null);
  
  // Review form states
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const toast = useToast();
  const reviewCommentRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (activeChatSession) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatSession?.messages]);

  const filteredBookings = bookings.filter(b => {
    const computed = getComputedBookingStatus(b);
    if (activeTab === 'Upcoming') {
      return computed === 'Upcoming' || computed === 'Reschedule Requested';
    }
    if (activeTab === 'Completed') {
      return computed === 'Completed' || computed === 'Missed';
    }
    if (activeTab === 'Cancelled') {
      return computed === 'Cancelled';
    }
    return true;
  });

  // Trigger simulated chat drawer
  const handleContactOrganizer = (booking) => {
    // Find or create chat session
    const existing = chats.find(c => c.tripId === booking.tripId);
    if (existing) {
      setActiveChatSession(existing);
    } else {
      const newSession = {
        tripId: booking.tripId,
        organizerName: booking.organizerName,
        organizerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        messages: [
          { id: 'm-start', sender: 'organizer', text: `Hi Chirag! Thanks for reaching out about ${booking.tripName}. How can I assist you today?`, timestamp: new Date().toISOString() }
        ]
      };
      onSaveChats([...chats, newSession]);
      setActiveChatSession(newSession);
    }
  };

  // Opens the drawer for a trip when arriving here from elsewhere (e.g. the
  // "Message" button on BookingDetailsView, via App.jsx's pendingChatTripId).
  useEffect(() => {
    if (!initialChatTripId) return;
    const targetBooking = bookings.find(b => b.tripId === initialChatTripId);
    if (targetBooking) handleContactOrganizer(targetBooking);
    onChatOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatTripId]);

  const handleSendChatMessage = () => {
    if (!chatInputText.trim() || !activeChatSession) return;

    const text = chatInputText.trim();
    const tripId = activeChatSession.tripId;
    const userMsg = {
      id: 'm-u-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    // Optimistically show the sent message right away.
    const updatedSession = {
      ...activeChatSession,
      messages: [...activeChatSession.messages, userMsg]
    };
    onSaveChats(chats.map(c => (c.tripId === tripId ? updatedSession : c)));
    setActiveChatSession(updatedSession);
    setChatInputText('');

    // Real (token) session: deliver to the organizer via the API and swap in the
    // authoritative thread. The App-level handler updates the chats list; here we
    // just reflect the server thread in the open drawer.
    const result = onSendChatMessage?.(tripId, text);
    if (result && typeof result.then === 'function') {
      result.then((serverChat) => {
        if (serverChat) {
          setActiveChatSession(serverChat);
        } else {
          simulateOrganizerReply(tripId, updatedSession);
        }
      });
      return;
    }

    // Offline/seeded fallback: simulate an organizer reply locally.
    simulateOrganizerReply(tripId, updatedSession);
  };

  // Local-only stand-in used when there's no live backend session.
  const simulateOrganizerReply = (tripId, baseSession) => {
    setTimeout(() => {
      const respAnswers = [
        "That sounds perfect! Our team will log this adjustment.",
        "Your dynamic request coordinates are forwarded to lead Sherpas.",
        "We are clear to go. Please don't forget waterproof gear!",
        "Understood. We'll update the group details in the morning."
      ];
      const botMsg = {
        id: 'm-b-' + Date.now(),
        sender: 'organizer',
        text: respAnswers[Math.floor(Math.random() * respAnswers.length)],
        timestamp: new Date().toISOString()
      };
      const finalSession = { ...baseSession, messages: [...baseSession.messages, botMsg] };
      onSaveChats(chats.map(c => (c.tripId === tripId ? finalSession : c)));
      setActiveChatSession(finalSession);
    }, 1200);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewBooking) return;
    if (!reviewComment.trim()) {
      setReviewError('Please write a comment about your experience.');
      toast.error('Please write a comment about your experience.');
      reviewCommentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      reviewCommentRef.current?.focus();
      return;
    }
    setReviewError('');

    onAddReview(reviewBooking.tripId, reviewRating, reviewComment.trim(), reviewBooking.bookingId);
    toast.success('Thank you! Your verified hiking rating has been registered successfully.');
    setReviewBooking(null);
    setReviewComment('');
    setReviewRating(5);
  };

  const statusPill = (status) =>
    status === 'Upcoming'
      ? (darkMode ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
      : status === 'Completed'
      ? (darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600')
      : (darkMode ? 'bg-rose-950/40 text-rose-400' : 'bg-rose-100 text-rose-700');

  return (
    <div className={`flex-1 font-sans w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-16 ${
      darkMode ? 'bg-transparent text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>

      {/* Header */}
      <div className="pt-6">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Bookings</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Your treks, past and upcoming</p>

        {/* Segmented tabs */}
        <div className={`flex rounded-full p-1 mt-5 relative max-w-md ${darkMode ? 'bg-elegant-card' : 'bg-gray-100'}`}>
          {['Upcoming', 'Completed', 'Cancelled'].map(tab => (
            <button
              key={tab}
              id={`bookings-tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold transition cursor-pointer relative"
            >
              <span className={`relative z-20 transition-colors ${activeTab === tab ? 'text-white' : (darkMode ? 'text-zinc-400' : 'text-zinc-500')}`}>
                {tab}
              </span>
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabCapsule"
                  className="absolute inset-0 bg-forest-600 rounded-full shadow-sm"
                  style={{ zIndex: 10 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="mt-8">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20">
            <CalendarDays size={44} className={`mx-auto ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
            <h3 className="font-serif text-2xl font-semibold mt-4">Nothing here yet</h3>
            <p className={`text-sm mt-2 max-w-xs mx-auto leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              No {activeTab.toLowerCase()} treks. Head to Explore to find your next adventure.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.map((b, idx) => (
            <motion.div
              key={b.id}
              id={`booking-card-${b.bookingId.toLowerCase()}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.25), duration: 0.25 }}
              whileHover={{ y: -3 }}
              onClick={() => onSelectBooking(b)}
              className={`rounded-3xl overflow-hidden p-3.5 sm:p-4.5 flex gap-3.5 sm:gap-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}
            >
              <div className="w-22 h-22 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-2xl overflow-hidden shrink-0 relative">
                <img src={b.tripImage} alt={b.tripName} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono opacity-50 uppercase tracking-wider block">#{b.bookingId.slice(-8).toUpperCase()}</span>
                      <h3 className="font-serif text-sm sm:text-base lg:text-lg font-semibold leading-snug break-words line-clamp-2 pr-1 mt-0.5">{b.tripName}</h3>
                    </div>
                    {(() => {
                      const comp = getComputedBookingStatus(b);
                      const badge = getStatusBadgeStyle(comp);
                      return (
                        <span className={`text-[9px] sm:text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full shrink-0 border whitespace-nowrap self-start ${badge.cls}`}>
                          {badge.label.toUpperCase()}
                        </span>
                      );
                    })()}
                  </div>
                  <p className={`text-xs truncate mt-1 flex items-center gap-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <MapPin size={12} className="text-spy-orange shrink-0" />
                    {b.tripLocation}
                  </p>
                </div>

                <div className={`flex items-center justify-between mt-3 pt-2.5 border-t gap-2 flex-wrap sm:flex-nowrap ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
                  <span className={`text-xs font-medium flex items-center gap-1 whitespace-nowrap ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <CalendarDays size={13} className="text-forest-500 shrink-0" />
                    {b.selectedDate}
                  </span>
                  <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                    <button
                      type="button"
                      id={`btn-message-organizer-${b.bookingId.toLowerCase()}`}
                      onClick={(e) => { e.stopPropagation(); handleContactOrganizer(b); }}
                      title="Message organizer"
                      className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition ${
                        darkMode ? 'bg-white/5 text-forest-400 hover:bg-white/10' : 'bg-forest-50 text-forest-600 hover:bg-forest-100'
                      }`}
                    >
                      <MessageSquare size={14} />
                    </button>
                    <span className={`font-serif text-base sm:text-lg font-bold whitespace-nowrap ${darkMode ? 'text-elegant-text' : 'text-zinc-900'}`}>₹{b.finalAmount}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          </div>
        )}
      </div>

      {/* ============================================== */}
      {/* 3. SIMULATED ORGANIZER LIVE CHAT DRAWER / DESKTOP PANEL */}
      {/* ============================================== */}
      <AnimatePresence>
        {activeChatSession && (() => {
          const matchedBooking = bookings.find(b => b.tripId === activeChatSession.tripId);
          const tripName = activeChatSession.tripName || matchedBooking?.tripName;
          const departureDate = matchedBooking?.selectedDate;
          const avatarUrl = activeChatSession.organizerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

          const quickReplies = [
            "What essentials should I pack for this trek?",
            "What is the exact base camp meeting time?",
            "Could you share the weather forecast?",
            "Are meals provided along the trail?"
          ];

          return (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-55 flex justify-end items-stretch md:p-4 lg:p-6 transition-all"
              onClick={() => setActiveChatSession(null)}
            >
              <motion.div
                initial={{ x: '100%', opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full sm:w-[440px] md:w-[480px] lg:w-[500px] h-full md:h-[calc(100vh-3rem)] md:my-auto md:rounded-3xl flex flex-col justify-between shadow-2xl relative border overflow-hidden ${
                  darkMode ? 'bg-zinc-950 text-zinc-100 border-white/10' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl'
                }`}
              >
                {/* Header chat and controls */}
                <div className={`p-4 sm:px-5 border-b flex flex-col gap-2 shrink-0 ${
                  darkMode ? 'bg-zinc-900/60 border-white/10' : 'bg-gray-50/80 border-zinc-200/80'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={avatarUrl}
                          alt={activeChatSession.organizerName}
                          className="w-10 h-10 rounded-full object-cover border border-forest-500/40"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold font-display truncate">
                            {activeChatSession.organizerName}
                          </h4>
                          <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                        </div>
                        <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <Sparkles size={9} /> Online Guide Counselor · Ready to help
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveChatSession(null)}
                      title="Close Chat"
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                        darkMode ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-350' : 'bg-gray-200/70 hover:bg-gray-300 text-zinc-600'
                      }`}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Trip Reference context pill */}
                  {tripName && (
                    <div className={`px-2.5 py-1 rounded-xl text-[10px] font-medium flex items-center justify-between border ${
                      darkMode ? 'bg-zinc-950/70 border-white/5 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600 shadow-2xs'
                    }`}>
                      <span className="truncate flex items-center gap-1">
                        <MapPin size={10} className="text-spy-orange shrink-0" />
                        <span className="font-bold text-forest-600 dark:text-forest-400">{tripName}</span>
                      </span>
                      {departureDate && (
                        <span className="text-[9px] opacity-70 font-mono shrink-0 ml-2">
                          Departure: {departureDate}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Chats stream list */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-3.5">
                  <div className="flex justify-center">
                    <span className={`text-[9px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                      darkMode ? 'bg-zinc-900 border-white/5 text-zinc-500' : 'bg-gray-100 border-zinc-200 text-zinc-400'
                    }`}>
                      Official Trek Chat Channel
                    </span>
                  </div>

                  {activeChatSession.messages.map((m) => {
                    const isUser = m.sender === 'user';
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0 mt-0.5"
                          />
                        )}
                        <div className={`p-3.5 max-w-[82%] rounded-2xl text-xs leading-relaxed relative shadow-xs ${
                          isUser
                            ? 'bg-forest-600 text-white rounded-tr-xs'
                            : darkMode
                            ? 'bg-zinc-900 border border-white/10 text-zinc-200 rounded-tl-xs'
                            : 'bg-gray-100 border border-gray-200/80 text-zinc-800 rounded-tl-xs'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <span className={`text-[8px] font-mono self-end block mt-1.5 text-right ${
                            isUser ? 'text-white/70' : 'opacity-40'
                          }`}>
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick suggestions pills */}
                {activeChatSession.messages.length <= 4 && (
                  <div className="px-4 pb-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-50 block mb-1.5">
                      Suggested questions
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {quickReplies.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setChatInputText(q);
                          }}
                          className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border whitespace-nowrap transition cursor-pointer active:scale-95 ${
                            darkMode
                              ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-850 hover:border-forest-500/50'
                              : 'bg-gray-50 border-gray-200 text-zinc-700 hover:bg-gray-100 hover:border-forest-500/50'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inputs bar footer */}
                <div className={`p-3.5 sm:p-4 border-t shrink-0 ${
                  darkMode ? 'bg-zinc-900/40 border-white/10' : 'bg-gray-50/80 border-zinc-200/80'
                }`}>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={chatInputText}
                      onChange={e => setChatInputText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSendChatMessage(); }}
                      className={`flex-1 text-xs px-4 py-3 border rounded-xl outline-hidden focus:border-forest-500 transition ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500' : 'bg-white border-gray-250 text-zinc-800 placeholder-zinc-400'
                      }`}
                    />
                    <button
                      type="button"
                      id="btn-send-chat-submit"
                      disabled={!chatInputText.trim()}
                      onClick={handleSendChatMessage}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-90 shrink-0 ${
                        chatInputText.trim()
                          ? 'bg-forest-600 hover:bg-forest-700 text-white cursor-pointer shadow-md'
                          : 'bg-zinc-800/40 text-zinc-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-1.5 px-1 text-[9px] opacity-40">
                    <span>Replies within ~5 mins</span>
                    <span className="hidden sm:inline font-mono">Press Enter ↵ to send</span>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ============================================== */}
      {/* 4. VERIFIED RATING / LEAVE REVIEW PANEL FOR TRIP */}
      {/* ============================================== */}
      <AnimatePresence>
        {reviewBooking && (
          <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-6">
            <motion.form
              onSubmit={handleSubmitReview}
              noValidate
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`p-6 rounded-3xl max-w-sm w-full border relative ${
                darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'
              }`}
            >
              <h4 className="text-sm font-display font-black flex items-center gap-1.5 text-orange-500">
                <Star className="fill-orange-500 text-orange-500" size={16} /> Rate Verified Crossing
              </h4>
              <span className="text-[10px] opacity-50 block mt-1 pb-4 border-b border-dashed border-zinc-800">
                {reviewBooking.tripName}
              </span>

              {/* Dynamic Star toggles */}
              <div className="flex gap-2 justify-center py-5">
                {[1, 2, 3, 4, 5].map((starNum) => (
                  <button
                    type="button"
                    key={starNum}
                    onClick={() => setReviewRating(starNum)}
                    className="transition transform active:scale-95 duration-200 cursor-pointer"
                  >
                    <Star
                      size={26}
                      className={starNum <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-605'}
                    />
                  </button>
                ))}
              </div>

              {/* Comment string text box */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider block">Write Your Experience *</label>
                <textarea
                  ref={reviewCommentRef}
                  rows={3}
                  placeholder="Write comment regarding safety, local food or path guidelines..."
                  value={reviewComment}
                  onChange={e => { setReviewComment(e.target.value); setReviewError(''); }}
                  className={`w-full text-xs p-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                    darkMode ? 'bg-zinc-950 border-zinc-855 text-white' : 'bg-gray-100 border-gray-255 text-zinc-900'
                  } ${reviewError ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {reviewError && <p className="text-[11px] font-semibold text-red-500">{reviewError}</p>}
              </div>

              <div className="flex gap-2 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 rounded-lg hover:underline cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  id="btn-review-submit"
                  className="bg-forest-600 hover:bg-forest-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer shadow-sm active:scale-95"
                >
                  Submit Review
                </button>
              </div>

              <button 
                type="button"
                onClick={() => setReviewBooking(null)}
                className="absolute top-3 right-3 text-zinc-500 cursor-pointer"
              >
                <X size={15} />
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================== */}
      {/* 5. INVOICE RECEIPT MODAL DRAWER SHEET */}
      {/* ===================================== */}
      <AnimatePresence>
        {showInvoiceBooking && (
          <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`p-4 rounded-3xl max-w-sm w-full border text-left relative ${
                darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'
              }`}
            >
              <h4 className="text-sm font-bold font-display flex items-center gap-1.5 text-forest-600 dark:text-forest-400 border-b border-dashed border-zinc-800/15 pb-2">
                <Receipt size={16} /> Invoice Ledger Sheet
              </h4>

              <div className="my-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-60">Booking ID:</span>
                  <span className="font-mono font-bold">{showInvoiceBooking.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Reserved slot date:</span>
                  <span className="font-semibold">{showInvoiceBooking.selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Travelers Roster Count:</span>
                  <span className="font-semibold">{showInvoiceBooking.travelersCount} Hiker</span>
                </div>

                <hr className="my-1 border-dashed border-zinc-800" />

                <div className={`flex justify-between font-bold pt-1 text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  <span>Final amount settled:</span>
                  <span className="font-sans">₹{showInvoiceBooking.finalAmount}</span>
                </div>
              </div>

              <button
                onClick={() => { toast.success('Invoice saved successfully to directory.'); setShowInvoiceBooking(null); }}
                className="w-full py-3 bg-forest-600 text-white text-xs font-bold rounded-xl hover:bg-forest-700 cursor-pointer active:scale-95"
              >
                Save Receipt Invoice PDF
              </button>

              <button 
                onClick={() => setShowInvoiceBooking(null)}
                className="absolute top-3 right-3 text-zinc-500 cursor-pointer"
              >
                <X size={15} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
