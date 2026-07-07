import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, MessageSquare, Star, ArrowLeft, Send, Sparkles, CalendarDays, Receipt, X
} from 'lucide-react';

export default function BookingsView({
  bookings,
  trips,
  onSelectTrip,
  chats,
  onSaveChats,
  onModifyBookingStatus,
  onAddReview,
  onSelectBooking,
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

  const filteredBookings = bookings.filter(b => b.status === activeTab);

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

  const handleSendChatMessage = () => {
    if (!chatInputText.trim() || !activeChatSession) return;

    const userMsg = {
      id: 'm-u-' + Date.now(),
      sender: 'user',
      text: chatInputText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedSession = {
      ...activeChatSession,
      messages: [...activeChatSession.messages, userMsg]
    };

    const updatedChatsList = chats.map(c => 
      c.tripId === activeChatSession.tripId ? updatedSession : c
    );

    onSaveChats(updatedChatsList);
    setActiveChatSession(updatedSession);
    setChatInputText('');

    // Trigger simulated companion counselor bot response after 1s
    setTimeout(() => {
      const respAnswers = [
        "That sounds perfect! Our team will log this adjustment.",
        "Your dynamic request coordinates are forwarded to lead Sherpas.",
        "We are clear to go. Please don't forget waterproof gear!",
        "Understood. We'll update the group details in the morning."
      ];
      const randomAnswer = respAnswers[Math.floor(Math.random() * respAnswers.length)];

      const botMsg = {
        id: 'm-b-' + Date.now(),
        sender: 'organizer',
        text: randomAnswer,
        timestamp: new Date().toISOString()
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, botMsg]
      };

      onSaveChats(chats.map(c => c.tripId === activeChatSession.tripId ? finalSession : c));
      setActiveChatSession(finalSession);
    }, 1200);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewBooking) return;

    onAddReview(reviewBooking.tripId, reviewRating, reviewComment.trim());
    alert('Thank you! Your verified hiking rating has been registered successfully.');
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
    <div className={`flex-1 overflow-y-auto no-scrollbar font-sans px-5 pb-8 ${
      darkMode ? 'bg-elegant-app text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>

      {/* Header */}
      <div className="pt-6">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Bookings</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Your treks, past and upcoming</p>

        {/* Segmented tabs */}
        <div className={`flex rounded-full p-1 mt-5 relative ${darkMode ? 'bg-elegant-card' : 'bg-gray-100'}`}>
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
      <div className="mt-6 space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20">
            <CalendarDays size={44} className={`mx-auto ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
            <h3 className="font-serif text-2xl font-semibold mt-4">Nothing here yet</h3>
            <p className={`text-sm mt-2 max-w-xs mx-auto leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              No {activeTab.toLowerCase()} treks. Head to Explore to find your next adventure.
            </p>
          </div>
        ) : (
          filteredBookings.map((b, idx) => (
            <motion.div
              key={b.id}
              id={`booking-card-${b.bookingId.toLowerCase()}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.25), duration: 0.25 }}
              whileHover={{ y: -3 }}
              onClick={() => onSelectBooking(b)}
              className={`rounded-3xl overflow-hidden p-3 flex gap-3.5 shadow-md cursor-pointer ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                <img src={b.tripImage} alt={b.tripName} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-serif text-lg font-semibold leading-tight truncate">{b.tripName}</h3>
                    <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full shrink-0 ${statusPill(b.status)}`}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{b.tripLocation}</p>
                </div>

                <div className={`flex justify-between items-center mt-2 pt-2 border-t ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
                  <span className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{b.selectedDate}</span>
                  <span className={`font-serif text-lg font-semibold ${darkMode ? 'text-elegant-text' : 'text-zinc-900'}`}>₹{b.finalAmount}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ============================================== */}
      {/* 3. SIMULATED ORGANIZER LIVE CHAT DRAWER */}
      {/* ============================================== */}
      <AnimatePresence>
        {activeChatSession && (
          <div className="fixed inset-0 bg-black/70 z-55 flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`w-[85%] max-w-sm h-full flex flex-col justify-between p-4 shadow-2xl relative ${
                darkMode ? 'bg-elegant-app text-elegant-text border-l border-white/5' : 'bg-white text-zinc-800'
              }`}
            >
              {/* Header chat and back controls */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/10 dark:border-zinc-850">
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => setActiveChatSession(null)}
                    className="text-zinc-500 cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h4 className="text-xs font-black font-display">{activeChatSession.organizerName}</h4>
                    <p className="text-[8px] text-emerald-400 font-bold block flex items-center gap-0.5">
                      <Sparkles size={8} /> ONLINE GUIDE COUNSELOR
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveChatSession(null)}
                  className="w-7 h-7 rounded-full bg-zinc-800/10 dark:bg-zinc-855 flex items-center justify-center text-zinc-400 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Chats stream lists */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3 px-1">
                {activeChatSession.messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`p-3 max-w-[80%] rounded-2xl text-[11px] leading-relaxed relative ${
                        isUser
                          ? 'bg-forest-600 text-white rounded-tr-none'
                          : (darkMode ? 'bg-zinc-900 border border-zinc-850 text-zinc-350 rounded-tl-none' : 'bg-gray-150 text-zinc-800 rounded-tl-none')
                      }`}>
                        <p>{m.text}</p>
                        <span className="text-[7.5px] opacity-40 font-mono self-end block mt-1">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inputs bar footer */}
              <div className="pt-3 border-t border-zinc-800/10 dark:border-zinc-850 flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={chatInputText}
                  onChange={e => setChatInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendChatMessage(); }}
                  className={`flex-1 text-xs px-3.5 py-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                    darkMode ? 'bg-zinc-900 border-zinc-850 text-white' : 'bg-white border-gray-255 text-zinc-800'
                  }`}
                />
                <button
                  type="button"
                  id="btn-send-chat-submit"
                  onClick={handleSendChatMessage}
                  className="bg-forest-600 hover:bg-forest-700 text-white w-11 rounded-xl flex items-center justify-center cursor-pointer active:scale-90"
                >
                  <Send size={14} className="rotate-0 text-white" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* 4. VERIFIED RATING / LEAVE REVIEW PANEL FOR TRIP */}
      {/* ============================================== */}
      <AnimatePresence>
        {reviewBooking && (
          <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-6">
            <motion.form 
              onSubmit={handleSubmitReview}
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
                <label className="text-[10px] font-bold uppercase tracking-wider block">Write Your Experience</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Write comment regarding safety, local food or path guidelines..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className={`w-full text-xs p-3 border rounded-xl outline-hidden focus:border-forest-500 ${
                    darkMode ? 'bg-zinc-950 border-zinc-855 text-white' : 'bg-gray-100 border-gray-255 text-zinc-900'
                  }`}
                />
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
                onClick={() => { alert('Invoice saved successfully to directory.'); setShowInvoiceBooking(null); }}
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
