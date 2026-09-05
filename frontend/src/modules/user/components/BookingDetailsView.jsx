import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Download, MessageSquare, Star, Receipt, ShieldAlert,
  Phone, Mail, Globe, User, ExternalLink, X, Calendar, Clock, CheckCircle2, AlertCircle, RefreshCw, MapPin
} from 'lucide-react';
import TravelTicket from './TravelTicket';
import { downloadTicketPDF } from '../utils/ticketPdf';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';
import { getComputedBookingStatus, getStatusBadgeStyle } from '../../../utils/bookingStatus';

// Reschedule request feature inside BookingDetailsView
export function RescheduleModal({ booking, availableDates = [], onClose, onSubmit, darkMode }) {
  const [selectedNewDate, setSelectedNewDate] = useState(availableDates[0] || '');
  const [reason, setReason] = useState('');
  // Server-resolved name, falling back to the booking's own snapshot.
  const organizerName = booking.organizer?.name || booking.organizerName || 'the organizer';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-55 flex items-center justify-center p-4">
      <div className={`p-6 rounded-3xl max-w-sm w-full border relative ${
        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
      }`}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-800/50">
          <X size={16} />
        </button>

        <div className="flex items-center space-x-2 text-amber-500 mb-2">
          <Calendar size={18} />
          <h4 className="text-sm font-display font-black">Request Trip Reschedule</h4>
        </div>
        <p className="text-[11px] opacity-70 mb-4">
          Select an available batch for <span className="font-bold">{booking.tripName}</span> offered by {organizerName}.
        </p>

        {availableDates.length === 0 ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 text-center mb-4">
            No alternate upcoming batches available for this trek at the moment. Contact organizer directly via Message.
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-80">
                Select Available Batch Date *
              </label>
              <select
                value={selectedNewDate}
                onChange={(e) => setSelectedNewDate(e.target.value)}
                className={`w-full text-xs p-2.5 rounded-xl border outline-none ${
                  darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
              >
                {availableDates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-80">
                Reason for Rescheduling (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Flight delayed, health issue..."
                rows={2}
                className={`w-full text-xs p-2.5 rounded-xl border outline-none resize-none ${
                  darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
          {availableDates.length > 0 && (
            <button
              onClick={() => onSubmit(selectedNewDate, reason)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md"
            >
              Submit Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailsView({
  booking,
  onBack,
  onModifyBookingStatus,
  onContactOrganizer,
  onViewOrganizerProfile,
  onDownloadInvoice,
  onRateHike,
  onRequestReschedule,
  availableRescheduleDates = [],
  darkMode
}) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const toast = useToast();

  // The organizing agency shown on the ticket. The server resolves this live
  // from the organizer's account (see withOrganizers in bookingController) —
  // the flat `organizer*` fields are the older, partly-unpopulated shape kept
  // as a fallback for bookings cached from before that, and for offline reads.
  const organizer = booking.organizer || {};
  const organizerName = organizer.name || booking.organizerName || '';
  const organizerPhone = organizer.phone || booking.organizerPhone || '';
  const organizerEmail = organizer.email || booking.organizerEmail || '';

  const computedStatus = getComputedBookingStatus(booking);
  const statusBadge = getStatusBadgeStyle(computedStatus);

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      setReviewError('Please write a comment about your experience.');
      return;
    }
    setReviewError('');
    onRateHike(booking, reviewRating, reviewComment.trim());
    toast.success('Review logged and average rating updated successfully!');
    setShowReviewModal(false);
    setReviewComment('');
    setReviewRating(5);
  };

  const handleRescheduleSubmit = (newDate, reason) => {
    if (onRequestReschedule) {
      onRequestReschedule(booking.id || booking.bookingId, newDate, reason);
      toast.success(`Reschedule request for ${newDate} sent to organizer!`);
    }
    setShowRescheduleModal(false);
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden font-sans relative ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-900'
    }`}>
      
      {/* 1. Header Nav Bar */}
      <div className={`p-4 border-b shrink-0 ${
        darkMode ? 'bg-zinc-950 border-white/5' : 'bg-white border-zinc-200/60'
      }`}>
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition active:scale-90 cursor-pointer ${
                darkMode ? 'bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
              }`}
              title="Go Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-xs uppercase font-mono font-black tracking-widest text-[#F27D26]">
                Booking Details
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono">
                Permit ID: {booking.bookingId}
              </p>
            </div>
          </div>

          {/* Quick desktop status badge + download button */}
          <div className="hidden sm:flex items-center gap-2.5">
            <span className={`text-[10px] font-sans font-black tracking-wider px-3 py-1 rounded-full border ${statusBadge.cls}`}>
              {statusBadge.label.toUpperCase()}
            </span>
            <button
              onClick={() => downloadTicketPDF(booking)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                darkMode ? 'bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700'
              }`}
            >
              <Download size={13} /> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto w-full pb-20 lg:pb-8">
          
          {/* 2-Column Split on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Cover visual row - panoramic card */}
              <div className="rounded-2xl sm:rounded-3xl overflow-hidden h-52 sm:h-64 relative bg-zinc-900 shrink-0 shadow-lg border border-white/10">
                <img src={booking.tripImage} alt={booking.tripName} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                <div className="absolute bottom-5 inset-x-5 flex justify-between items-end">
                  <div>
                    <span className={`text-[10px] font-sans font-black tracking-wider px-2.5 py-0.5 rounded-full border ${statusBadge.cls}`}>
                      {statusBadge.label.toUpperCase()}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-display font-black text-white mt-1.5 leading-tight">{booking.tripName}</h3>
                    {booking.tripLocation && (
                      <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                        <MapPin size={12} className="text-spy-orange" /> {booking.tripLocation}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Rescheduling Banner Status */}
              {booking.rescheduleStatus === 'Pending' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start gap-3">
                  <Clock size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Reschedule Request Pending</span>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Requested new date: <span className="font-bold">{booking.requestedDate}</span>. Waiting for {organizerName || 'the organizer'} to review.
                    </p>
                  </div>
                </div>
              )}

              {booking.rescheduleStatus === 'Rejected' && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Reschedule Request Declined</span>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Reason: "{booking.rejectionReason || 'No availability on requested batch'}"
                    </p>
                  </div>
                </div>
              )}

              {/* Boarding-pass style trek ticket */}
              <div className="max-w-xl mx-auto lg:max-w-none w-full">
                <TravelTicket
                  booking={{ ...booking, status: computedStatus }}
                  darkMode={darkMode}
                  onDownload={() => downloadTicketPDF(booking)}
                />
              </div>

              {/* Travelers Roster Card if travelers exist */}
              {booking.travelers && booking.travelers.length > 0 && (
                <div className={`p-5 rounded-2xl border space-y-3 ${
                  darkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-200/60 shadow-xs'
                }`}>
                  <h4 className="text-xs font-display font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                    <User size={14} className="text-forest-400" /> Travelers on this Booking ({booking.travelers.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {booking.travelers.map((tr, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        darkMode ? 'bg-zinc-950/60 border-white/5' : 'bg-gray-50 border-gray-150'
                      }`}>
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{tr.name || `Traveler #${idx + 1}`}</span>
                          <span className="text-[10px] opacity-60">
                            {tr.age ? `${tr.age} yrs` : ''} {tr.gender ? `· ${tr.gender}` : ''}
                          </span>
                        </div>
                        {tr.emergencyContact && (
                          <span className="text-[10px] font-mono opacity-50">{tr.emergencyContact}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (lg:col-span-5 space-y-6) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Desktop Action Center Card */}
              <div className={`hidden lg:flex flex-col p-5 rounded-2xl border space-y-3 shadow-sm ${
                darkMode ? 'bg-zinc-900/70 border-white/10' : 'bg-white border-zinc-200'
              }`}>
                <h4 className="text-xs font-display font-bold uppercase tracking-wider opacity-85">
                  Booking Actions
                </h4>
                <button
                  onClick={() => downloadTicketPDF(booking)}
                  className="w-full py-3 rounded-xl bg-forest-600 hover:bg-forest-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 transition"
                >
                  <Download size={14} /> Download Ticket PDF
                </button>

                <button
                  onClick={() => onContactOrganizer(booking)}
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition ${
                    darkMode ? 'bg-zinc-800/80 border-white/10 hover:bg-zinc-800 text-white' : 'bg-gray-100 border-zinc-200 hover:bg-gray-200 text-zinc-800'
                  }`}
                >
                  <MessageSquare size={14} className="text-forest-500" /> Message Organizer
                </button>

                {(computedStatus === 'Upcoming' || computedStatus === 'Missed') && (
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition"
                  >
                    <RefreshCw size={14} /> Reschedule Departure
                  </button>
                )}

                {computedStatus === 'Completed' && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full py-2.5 rounded-xl bg-spy-orange hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition"
                  >
                    <Star size={14} className="fill-white" /> Rate Expedition
                  </button>
                )}

                {computedStatus === 'Upcoming' && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-2 text-[11px] text-rose-500 hover:text-rose-400 font-semibold cursor-pointer hover:underline text-center pt-1"
                  >
                    Cancel Booking Reservation
                  </button>
                )}
              </div>

              {/* Settled Cost Receipt Sheet */}
              <div className={`p-5 rounded-2xl border space-y-3.5 ${
                darkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-200/60 shadow-xs'
              }`}>
                <h4 className="text-xs font-display font-bold uppercase tracking-wider opacity-85 flex items-center gap-1">
                  <Receipt size={14} className="text-emerald-400" /> Settled Bill Summary
                </h4>
                
                <div className="space-y-2 text-xs pt-1">
                  <div className="flex justify-between">
                    <span className="opacity-60">Base Booking Fee</span>
                    <span className="font-sans font-semibold">₹{booking.finalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Permit Royalties & Tax</span>
                    <span className="text-emerald-500 font-mono font-bold">Included</span>
                  </div>
                  <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2 pt-2 flex justify-between font-black text-sm">
                    <span>Total Value Cleared</span>
                    <span className={`font-sans text-base ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>₹{booking.finalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Organizing Agency & Support Info */}
              <div className={`p-5 rounded-2xl border space-y-4 ${
                darkMode ? 'bg-zinc-900/40 border-white/5 shadow-lg shadow-forest-900/5' : 'bg-white border-zinc-200/60 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-display font-bold uppercase tracking-wider opacity-85 flex items-center gap-1.5">
                    <User size={14} className="text-forest-400" /> Organizing Agency
                  </h4>
                  <button
                    type="button"
                    onClick={() => onViewOrganizerProfile(organizerName)}
                    className="text-[10px] font-black uppercase tracking-wider text-forest-500 hover:underline cursor-pointer flex items-center gap-0.5 bg-transparent border-0 outline-hidden"
                  >
                    View Profile <ExternalLink size={10} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-sm font-black ${
                    darkMode ? 'bg-forest-950/40 border border-forest-500/25 text-forest-400' : 'bg-forest-50 border border-forest-500/20 text-forest-600'
                  }`}>
                    {organizer.avatar
                      ? <img src={organizer.avatar} alt={organizerName} className="w-full h-full object-cover" />
                      : (organizerName ? organizerName.substring(0, 2).toUpperCase() : 'FT')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold leading-tight truncate">{organizerName || 'Organizer'}</h5>
                    {organizer.verified && (
                      <p className="text-[10px] text-emerald-500 flex items-center gap-0.5 mt-0.5 font-bold">
                        ★ Verified Partner
                      </p>
                    )}
                  </div>
                </div>

                {(organizerPhone || organizerEmail) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-dashed border-zinc-200 dark:border-white/10">
                    {organizerPhone && (
                      <a href={`tel:${organizerPhone.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:opacity-80 transition">
                        <Phone size={13} className="text-forest-400 shrink-0" />
                        <div className="text-[11px] min-w-0">
                          <span className="opacity-50 block text-[8px] uppercase tracking-wider font-bold">Phone</span>
                          <span className="font-bold font-sans truncate block">{organizerPhone}</span>
                        </div>
                      </a>
                    )}
                    {organizerEmail && (
                      <a href={`mailto:${organizerEmail}`} className="flex items-center gap-2 hover:opacity-80 transition">
                        <Mail size={13} className="text-forest-400 shrink-0" />
                        <div className="text-[11px] min-w-0">
                          <span className="opacity-50 block text-[8px] uppercase tracking-wider font-bold">Email</span>
                          <span className="font-bold truncate max-w-[160px] block">{organizerEmail}</span>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Cancellation warning clause */}
              {booking.status === 'Upcoming' && (
                <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                  darkMode ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50/50 border-rose-100'
                }`}>
                  <ShieldAlert size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    <span className="font-bold text-rose-500 block mb-0.5">Flexible Cancellation Policy</span>
                    Hassle-free 100% refund is available up to 48 hours prior to Departure Date. Refunds will route back to your banking ledger instantly.
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* 3. Sticky Action Buttons Row Footer (Mobile Only) */}
      <div className={`lg:hidden absolute bottom-0 inset-x-0 p-3 border-t flex gap-2 z-10 backdrop-blur-md ${
        darkMode ? 'bg-zinc-950/95 border-white/5' : 'bg-white/95 border-zinc-200/60'
      }`}>
        <button
          onClick={() => onContactOrganizer(booking)}
          className="flex-1 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-full text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all duration-200"
        >
          Message <MessageSquare size={10} />
        </button>

        <button
          onClick={() => onDownloadInvoice(booking)}
          className={`flex-1 py-2 border rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all duration-200 ${
            darkMode
              ? 'border-white/10 hover:bg-white/5 text-zinc-350'
              : 'border-zinc-200 hover:bg-zinc-50 text-zinc-650'
          }`}
        >
          Ticket PDF <Download size={10} />
        </button>

        {(computedStatus === 'Upcoming' || computedStatus === 'Missed') && (
          <button
            onClick={() => setShowRescheduleModal(true)}
            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-full text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all duration-200"
          >
            Reschedule <RefreshCw size={10} />
          </button>
        )}

        {computedStatus === 'Completed' && (
          <button
            onClick={() => setShowReviewModal(true)}
            className="flex-1 py-2 bg-spy-orange hover:bg-spy-orange-hover text-white rounded-full text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all duration-200"
          >
            Rate Hike <Star size={10} className="fill-white" />
          </button>
        )}

        {computedStatus === 'Upcoming' && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex-1 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 text-[9px] uppercase font-black tracking-wider cursor-pointer active:scale-95 transition-all text-center"
          >
            Cancel Slot
          </button>
        )}
      </div>

      {showRescheduleModal && (
        <RescheduleModal
          booking={booking}
          availableDates={availableRescheduleDates}
          onClose={() => setShowRescheduleModal(false)}
          onSubmit={handleRescheduleSubmit}
          darkMode={darkMode}
        />
      )}

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-6">
          <form
            onSubmit={handleSubmitReview}
            noValidate
            className={`p-6 rounded-3xl max-w-sm w-full border relative ${
              darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'
            }`}
          >
            <h4 className="text-sm font-display font-black flex items-center gap-1.5 text-orange-500">
              <Star className="fill-orange-500 text-orange-500" size={16} /> Rate Verified Crossing
            </h4>
            <span className="text-[10px] opacity-50 block mt-1 pb-4 border-b border-dashed border-zinc-800">
              {booking.tripName}
            </span>

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

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider block">Write Your Experience *</label>
              <textarea
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
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 rounded-lg hover:underline cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                className="bg-forest-600 hover:bg-forest-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer shadow-sm active:scale-95"
              >
                Submit Review
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className="absolute top-3 right-3 text-zinc-500 cursor-pointer"
            >
              <X size={15} />
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel Booking?"
        message={`Are you sure you want to cancel the registration for ${booking.tripName}? 100% refund is credited back to your original source.`}
        confirmLabel="Cancel Registration"
        tone="danger"
        onConfirm={() => {
          setShowCancelConfirm(false);
          onModifyBookingStatus(booking.id, 'Cancelled');
          onBack();
        }}
        onCancel={() => setShowCancelConfirm(false)}
        darkMode={darkMode}
      />

    </div>
  );
}
