import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Download, MessageSquare, Star, Receipt, ShieldAlert,
  Phone, Mail, Globe, User, ExternalLink, X
} from 'lucide-react';
import TravelTicket from './TravelTicket';
import { downloadTicketPDF } from '../utils/ticketPdf';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/ToastProvider';

export default function BookingDetailsView({
  booking,
  onBack,
  onModifyBookingStatus,
  onContactOrganizer,
  onViewOrganizerProfile,
  onDownloadInvoice,
  onRateHike,
  darkMode
}) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const toast = useToast();

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

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden font-sans relative ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-900'
    }`}>
      
      {/* 1. Header Sticky Nav Bar */}
      <div className={`p-4 border-b flex items-center gap-3 shrink-0 ${
        darkMode ? 'bg-zinc-950 border-white/5' : 'bg-white border-zinc-200/60'
      }`}>
        <button
          onClick={onBack}
          className={`w-9 h-9 rounded-full flex items-center justify-center border transition active:scale-90 cursor-pointer ${
            darkMode ? 'bg-zinc-900 border-white/10 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200'
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

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5 pb-28">
        
        {/* Cover visual row */}
        <div className="rounded-2xl overflow-hidden h-40 relative bg-zinc-900 shrink-0">
          <img src={booking.tripImage} alt={booking.tripName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 inset-x-4 flex justify-between items-end">
            <div>
              <span className={`text-[10px] font-sans font-black tracking-wider px-2.5 py-0.5 rounded-full ${
                booking.status === 'Upcoming'
                  ? 'bg-emerald-600 text-white'
                  : booking.status === 'Completed'
                  ? 'bg-zinc-605 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {booking.status.toUpperCase()}
              </span>
              <h3 className="text-base font-display font-black text-white mt-1 leading-tight">{booking.tripName}</h3>
            </div>
          </div>
        </div>

        {/* Boarding-pass style trek ticket */}
        <TravelTicket
          booking={booking}
          darkMode={darkMode}
          onDownload={() => downloadTicketPDF(booking)}
        />

        {/* Settled Cost Receipt Sheet */}
        <div className={`p-4 rounded-2xl border space-y-3.5 ${
          darkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-200/60 shadow-xs'
        }`}>
          <h4 className="text-xs font-display font-bold uppercase tracking-wider opacity-85 flex items-center gap-1">
            <Receipt size={14} className="text-emerald-400" /> Settled Bill Summary
          </h4>
          
          <div className="space-y-2 text-xs pt-1">
            <div className="flex justify-between">
              <span className="opacity-60">Base Booking Fee</span>
              <span className="font-sans">₹{booking.finalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Permit Royalties & Tax</span>
              <span className="text-emerald-500 font-mono">Included</span>
            </div>
            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 my-2 pt-2 flex justify-between font-black text-sm">
              <span>Total Value Cleared</span>
              <span className={`font-sans ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>₹{booking.finalAmount}</span>
            </div>
          </div>
        </div>

        {/* Organizing Agency & Support Info */}
        <div className={`p-4 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-zinc-900/40 border-white/5 shadow-lg shadow-forest-900/5' : 'bg-white border-zinc-200/60 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-display font-bold uppercase tracking-wider opacity-85 flex items-center gap-1.5">
              <User size={14} className="text-forest-400" /> Organizing Agency
            </h4>
            <button
              type="button"
              onClick={() => onViewOrganizerProfile(booking.organizerName)}
              className="text-[10px] font-black uppercase tracking-wider text-forest-500 hover:underline cursor-pointer flex items-center gap-0.5 bg-transparent border-0 outline-hidden"
            >
              View Profile <ExternalLink size={10} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black text-white ${
              darkMode ? 'bg-forest-950/40 border border-forest-500/25 text-forest-400' : 'bg-forest-50 border border-forest-500/20 text-forest-600'
            }`}>
              {booking.organizerName ? booking.organizerName.substring(0, 2).toUpperCase() : 'TG'}
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold leading-tight truncate">{booking.organizerName}</h5>
              <p className="text-[10px] text-emerald-500 flex items-center gap-0.5 mt-0.5 font-bold">
                ★ Verified Partner
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-dashed border-zinc-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-forest-400 shrink-0" />
              <div className="text-[11px]">
                <span className="opacity-50 block text-[8px] uppercase tracking-wider">Phone</span>
                <span className="font-bold font-sans">{booking.organizerPhone || '+91 98765 43210'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-forest-400 shrink-0" />
              <div className="text-[11px]">
                <span className="opacity-50 block text-[8px] uppercase tracking-wider">Email</span>
                <span className="font-bold truncate max-w-[150px] block">
                  {booking.organizerEmail || `support@${booking.organizerName.toLowerCase().replace(/\s+/g, '')}.com`}
                </span>
              </div>
            </div>
          </div>
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

      {/* 3. Sticky Action Buttons Row Footer */}
      <div className={`absolute bottom-0 inset-x-0 p-3 border-t flex gap-2 z-10 backdrop-blur-md ${
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

        {booking.status === 'Completed' && (
          <button
            onClick={() => setShowReviewModal(true)}
            className="flex-1 py-2 bg-spy-orange hover:bg-spy-orange-hover text-white rounded-full text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all duration-200"
          >
            Rate Hike <Star size={10} className="fill-white" />
          </button>
        )}

        {booking.status === 'Upcoming' && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex-1 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 text-[9px] uppercase font-black tracking-wider cursor-pointer active:scale-95 transition-all text-center"
          >
            Cancel Slot
          </button>
        )}
      </div>

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
