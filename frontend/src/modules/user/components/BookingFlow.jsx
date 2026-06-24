/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, Calendar, Users, FileText, Ticket, CreditCard, CheckCircle2, 
  Sparkles, Percent, ShieldCheck, Download, Share2, Info, Landmark, X, ChevronRight
} from 'lucide-react';

// Confetti Popper Animation component for successful coupon redeem
const ConfettiPopper = () => {
  const particles = Array.from({ length: 45 }).map((_, i) => {
    const angle = (Math.random() * 360 * Math.PI) / 180;
    const velocity = 60 + Math.random() * 160;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity - 80;
    const colors = ['#f97316', '#10b981', '#3b82f6', '#eab308', '#ec4899', '#a855f7', '#6366f1'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return {
      id: i,
      tx,
      ty,
      color: randomColor,
      size: 6 + Math.random() * 8,
      delay: Math.random() * 0.05,
      isCircle: Math.random() > 0.5
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            scale: [0, 1.4, 0.6],
            x: p.tx,
            y: p.ty,
            rotate: [0, 270, 540],
          }}
          transition={{
            duration: 1.4,
            ease: "easeOut",
            delay: p.delay,
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '0%',
          }}
        />
      ))}
    </div>
  );
};

export default function BookingFlow({
  trip,
  onCancel,
  onConfirmBooking,
  darkMode
}) {
  const [step, setStep] = useState(1);
  
  // State variables for Wizard
  const [selectedDate, setSelectedDate] = useState('');
  const [travelersCount, setTravelersCount] = useState(1);
  const [travelersList, setTravelersList] = useState([
    { name: 'Chirag Jeevanani', age: 24, gender: 'Male', emergencyContact: '+91 98765 43219' }
  ]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Payment Options
  const [paymentGateway, setPaymentGateway] = useState('Razorpay');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentFinished, setPaymentFinished] = useState(false);
  
  // Constructed ticket fields once succeeded
  const [createdBooking, setCreatedBooking] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Available dates (simulated near future dates)
  const availableDates = [
    '2026-07-10', '2026-07-20', '2026-08-05', '2026-08-20', '2026-09-02'
  ];

  // Sync travelers count with list array size
  useEffect(() => {
    if (travelersList.length < travelersCount) {
      const diff = travelersCount - travelersList.length;
      const additional = Array(diff).fill(null).map((_, i) => ({
        name: `Traveler ${travelersList.length + i + 1}`,
        age: 25,
        gender: 'Male',
        emergencyContact: '+91 98765 43219'
      }));
      setTravelersList([...travelersList, ...additional]);
    } else if (travelersList.length > travelersCount) {
      setTravelersList(travelersList.slice(0, travelersCount));
    }
  }, [travelersCount]);

  // Set default initial date
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, []);

  // Confetti timeout auto-reset
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 1600);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const handleTravelerFieldChange = (idx, field, val) => {
    const updated = [...travelersList];
    updated[idx] = { ...updated[idx], [field]: val };
    setTravelersList(updated);
  };

  const handleValidateCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    
    const formatted = couponCode.toUpperCase().trim();
    if (formatted === 'SPYHIKE20') {
      setDiscountPercent(20);
      setAppliedCoupon('SPYHIKE20');
      setCouponSuccess('Success! Coupon applied: 20% Discount.');
      setShowConfetti(true);
    } else if (formatted === 'VALLEY50') {
      setDiscountPercent(15);
      setAppliedCoupon('VALLEY50');
      setCouponSuccess('Success! Coupon applied: ₹50 equivalent discounted.');
      setShowConfetti(true);
    } else if (formatted === 'GHATS15') {
      setDiscountPercent(15);
      setAppliedCoupon('GHATS15');
      setCouponSuccess('Success! Coupon applied: 15% off.');
      setShowConfetti(true);
    } else {
      setCouponError('Invalid coupon code. Try SPYHIKE20.');
    }
  };

  // Math totals calculation
  const baseCostTotal = trip.price * travelersCount;
  const appliedDiscountValue = Math.round((baseCostTotal * discountPercent / 100) * 100) / 100;
  const taxAmountValue = Math.round(((baseCostTotal - appliedDiscountValue) * 0.05) * 100) / 100; // 5% flat local tax
  const finalPayAmount = Math.round((baseCostTotal - appliedDiscountValue + taxAmountValue) * 100) / 100;

  const handleProcessPayment = () => {
    setIsProcessingPayment(true);
    setCouponError('');

    // Simulate 2s loader representing bank gateway routing
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentFinished(true);
      
      const storedRate = localStorage.getItem('spyhike_commission_rate');
      const commissionRate = storedRate !== null ? Number(storedRate) : 10;
      const commissionAmount = Math.round((finalPayAmount * commissionRate / 100) * 100) / 100;

      const newBookingId = `SH-${Math.floor(1000 + Math.random() * 9000)}-U`;
      const finalBookingObject = {
        id: 'b-' + Date.now(),
        tripId: trip.id,
        tripName: trip.name,
        tripImage: trip.coverImage,
        tripLocation: trip.location,
        bookingDate: new Date().toISOString().split('T')[0],
        selectedDate: selectedDate,
        travelersCount: travelersCount,
        travelers: travelersList,
        couponUsed: appliedCoupon,
        couponDiscount: appliedDiscountValue,
        taxAmount: taxAmountValue,
        finalAmount: finalPayAmount,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        status: 'Upcoming',
        bookingId: newBookingId,
        organizerName: trip.organizer.name
      };

      setCreatedBooking(finalBookingObject);
      setStep(4); // Success is now Step 4
    }, 2000);
  };

  const handleFinishAndReturn = () => {
    if (createdBooking) {
      onConfirmBooking(createdBooking);
    }
  };

  return (
    <div className={`flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar font-sans px-6 py-4 relative ${
      darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-900'
    }`}>
      
      {/* Confetti Popper layer */}
      {showConfetti && <ConfettiPopper />}

      {/* Dynamic wizard indicators header */}
      {step < 4 && (
        <div className="shrink-0 flex items-center justify-between pb-4 border-b border-zinc-800/10 dark:border-zinc-850">
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300">
            <ArrowLeft size={18} />
          </button>
          
          <div className="text-center">
            <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono block">BOOKING ENGINE</span>
            <h3 className="text-sm font-display font-black text-forest-650 dark:text-forest-400">Step {step} of 3</h3>
          </div>

          <div className="w-5" /> {/* Empty aligner */}
        </div>
      )}

      {/* Progress visual horizontal track bar */}
      {step < 4 && (
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden select-none mb-6">
          <div 
            className="h-full bg-forest-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      )}

      {/* Forms switcher viewport */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col justify-start"
        >
        
        {/* Step 1: Select Date & Travelers Count */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-forest-500" size={18} />
              <h2 className="text-base font-display font-black">Expedition Details</h2>
            </div>
            
            {/* 1. Date selection list */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-2">Select Roster Departure Date</label>
              <div className="space-y-2 max-h-[190px] overflow-y-auto no-scrollbar pr-0.5">
                {availableDates.map(dt => {
                  const isSelected = selectedDate === dt;
                  const dateObj = new Date(dt);
                  const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
                  const dayNum = dateObj.toLocaleDateString('en-IN', { day: 'numeric' });
                  const monthName = dateObj.toLocaleDateString('en-IN', { month: 'short' });
                  const yearNum = dateObj.toLocaleDateString('en-IN', { year: 'numeric' });

                  return (
                    <label
                      key={dt}
                      onClick={() => setSelectedDate(dt)}
                      className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${
                        isSelected
                          ? darkMode
                            ? 'bg-forest-950/30 border-forest-500 shadow-md text-white'
                            : 'bg-forest-50/70 border-forest-500 shadow-xs text-forest-900 font-bold'
                          : darkMode
                          ? 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/60 hover:border-white/10 text-zinc-300'
                          : 'bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center text-center shrink-0 ${
                          isSelected
                            ? darkMode ? 'bg-forest-600/30 text-forest-400 border border-forest-500/20' : 'bg-forest-600 text-white'
                            : darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-zinc-500 border border-zinc-200'
                        }`}>
                          <span className="text-[7px] uppercase font-black tracking-wider leading-none">{monthName}</span>
                          <span className="text-[12px] font-black leading-none mt-0.5">{dayNum}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold font-sans">
                            {dayName}, {dayNum} {monthName} {yearNum}
                          </span>
                        </div>
                      </div>

                      <input
                        type="radio"
                        name="expedition-dates"
                        checked={isSelected}
                        onChange={() => setSelectedDate(dt)}
                        className="accent-forest-500 pointer-events-auto w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Travelers count counters */}
            <div className={`p-3 rounded-xl border ${darkMode ? 'bg-zinc-900/30 border-white/5' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <Users size={14} className="text-forest-500" /> Travelers Count
                  </h3>
                  <p className="text-[9px] text-zinc-500 mt-0.5">
                    Max: {trip.maxGroupSize} • Seats Left: {trip.availableSeats}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={travelersCount <= 1}
                    onClick={() => setTravelersCount(prev => prev - 1)}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-base font-bold cursor-pointer transition ${
                      travelersCount <= 1 
                        ? 'border-zinc-800 text-zinc-400 cursor-not-allowed' 
                        : 'border-forest-500 text-forest-500 hover:bg-forest-500/10'
                    }`}
                  >
                    -
                  </button>

                  <span className="text-base font-black font-mono w-4 text-center">{travelersCount}</span>

                  <button
                    type="button"
                    disabled={travelersCount >= trip.availableSeats}
                    onClick={() => setTravelersCount(prev => prev + 1)}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-base font-bold cursor-pointer transition ${
                      travelersCount >= trip.availableSeats 
                        ? 'border-zinc-805 text-zinc-400 cursor-not-allowed' 
                        : 'border-forest-500 text-forest-500 hover:bg-forest-500/10'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-zinc-800/10 dark:border-zinc-800/40 flex justify-between items-center text-[10px]">
                <span className="opacity-60">Estimated Cost:</span>
                <span className="font-extrabold text-forest-600 dark:text-forest-400">₹{baseCostTotal}</span>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl flex gap-2 ${darkMode ? 'bg-zinc-900/10' : 'bg-white shadow-xs'}`}>
              <Info size={14} className="text-spy-orange shrink-0 mt-0.5" />
              <p className="text-[9.5px] leading-relaxed text-zinc-400">
                Weather conditions are monitored by organizers. Dates can be rescheduled at zero fee in case of warning alerts.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Add Traveler Details */}
        {step === 2 && (
          <div className="space-y-4 max-h-[460px] overflow-y-auto no-scrollbar pointer-events-auto pr-1">
            <div className="flex items-center gap-2">
              <FileText className="text-forest-500" size={18} />
              <h2 className="text-base font-display font-black">Traveler Coordinates</h2>
            </div>
            <p className="text-xs text-zinc-500 pb-1">
              Details needed for emergency permits and environmental safety registers:
            </p>

            <div className="space-y-4">
              {travelersList.map((tr, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl space-y-3 relative ${
                    darkMode ? 'bg-zinc-900/60 border border-white/5' : 'bg-white border border-gray-150 shadow-xs'
                  }`}
                >
                  <span className="absolute -top-2.5 left-4 bg-forest-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                    TRAVELER #{idx + 1}
                  </span>

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aman Verma"
                      value={tr.name}
                      onChange={e => handleTravelerFieldChange(idx, 'name', e.target.value)}
                      className={`w-full text-xs px-3 py-2.5 rounded-xl border focus:border-forest-500 outline-hidden ${
                        darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-gray-100 border-gray-200'
                      }`}
                    />
                  </div>

                  {/* Age & Gender Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Age</label>
                      <input
                        type="number"
                        min={12}
                        max={90}
                        placeholder="24"
                        value={tr.age}
                        onChange={e => handleTravelerFieldChange(idx, 'age', Number(e.target.value))}
                        className={`w-full text-xs px-3 py-2.5 border rounded-xl outline-hidden focus:border-forest-500 ${
                          darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-gray-100 border-gray-200'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Gender</label>
                      <select
                        value={tr.gender}
                        onChange={e => handleTravelerFieldChange(idx, 'gender', e.target.value)}
                        className={`w-full text-xs px-2 py-2.5 border rounded-xl outline-hidden focus:border-forest-500 ${
                          darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-gray-100 border-gray-200'
                        }`}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Emergency Phone</label>
                    <input
                      type="tel"
                      placeholder="Emergency contact name / tel"
                      value={tr.emergencyContact}
                      onChange={e => handleTravelerFieldChange(idx, 'emergencyContact', e.target.value)}
                      className={`w-full text-xs px-3 py-2.5 border rounded-xl outline-hidden focus:border-forest-500 ${
                        darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-gray-100 border-gray-200'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Checkout & Payment with Coupon */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="text-forest-500" size={18} />
              <h2 className="text-base font-display font-black">Checkout & Settlement</h2>
            </div>
            
            {/* Promo coupon inline input */}
            <div className={`p-3 rounded-2xl border ${
              darkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-200/60 shadow-xs'
            } space-y-2`}>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-65 flex items-center gap-1">
                <Ticket size={11} className="text-forest-505" /> Redeem Promo Coupon
              </span>
              <form onSubmit={handleValidateCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="CODE (e.g. SPYHIKE20)"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className={`flex-1 text-xs px-3 py-2.5 border rounded-xl outline-hidden focus:border-forest-500 uppercase tracking-widest ${
                    darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-gray-50 border-gray-200 text-zinc-850'
                  }`}
                />
                <button
                  type="submit"
                  id="btn-apply-coupon"
                  className="bg-forest-600 hover:bg-forest-700 text-white text-xs font-bold px-3.5 rounded-xl cursor-pointer transition active:scale-95"
                >
                  Apply
                </button>
              </form>

              {couponError && (
                <span className="text-[10px] font-bold text-rose-500 block pl-1">{couponError}</span>
              )}
              {couponSuccess && (
                <span className="text-[10px] font-bold text-emerald-400 block pl-1 flex items-center gap-1">
                  <Sparkles size={10} className="animate-spin text-spy-orange" /> {couponSuccess}
                </span>
              )}
              
              {!appliedCoupon && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  {['SPYHIKE20', 'GHATS15'].map(cp => (
                    <button
                      key={cp}
                      type="button"
                      onClick={() => { setCouponCode(cp); }}
                      className={`text-[8.5px] font-bold px-2 py-1 rounded-md border border-dashed transition ${
                        darkMode ? 'border-zinc-700 text-zinc-400 bg-zinc-950/45 hover:bg-zinc-900' : 'border-gray-300 text-zinc-650 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      Use {cp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Real Checkout Detail card */}
            <div className={`p-4 rounded-2xl space-y-3 border ${
              darkMode 
                ? 'bg-zinc-900 border-white/5' 
                : 'bg-white border-zinc-200/60 shadow-xs'
            }`}>
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Basics ({travelersCount} travelers)</span>
                <span className="font-sans font-bold text-zinc-700 dark:text-zinc-300">₹{baseCostTotal}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-xs text-rose-500 font-bold">
                  <span>Coupon Discount ({appliedCoupon})</span>
                  <span className="font-sans">-₹{appliedDiscountValue}</span>
                </div>
              )}

              <div className="flex justify-between text-xs">
                <span className="opacity-70">Taxes & Environmental Insurance (5% GST)</span>
                <span className="font-sans font-bold text-zinc-700 dark:text-zinc-300">₹{taxAmountValue}</span>
              </div>

              <hr className="my-1 border-dashed border-zinc-200 dark:border-zinc-800" />

              <div className="flex justify-between text-sm font-bold pt-1">
                <span className="text-forest-600 dark:text-forest-400">Final Settlement Amount</span>
                <span className={`font-sans font-black text-base ${darkMode ? 'text-emerald-450' : 'text-emerald-700'}`}>₹{finalPayAmount}</span>
              </div>
            </div>

            {/* Secure payment partner logo info */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] opacity-75 font-semibold text-zinc-500">
              <ShieldCheck size={12} className="text-forest-660 dark:text-forest-400" />
              <span>Payments secured and processed via Razorpay Express</span>
            </div>

            {isProcessingPayment && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/35 flex items-center justify-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-spy-orange border-t-transparent animate-spin" />
                <span className="text-xs font-semibold text-spy-orange">Routing secure tokens via {paymentGateway}...</span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Booking Success Screen */}
        {step === 4 && createdBooking && (
          <div className="space-y-4 text-center py-6">
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
            </div>

            <span className="bg-emerald-500 text-white font-mono text-[8px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
              CONFIRMED EXPEDITION PASS
            </span>

            <h2 className="text-xl font-display font-black tracking-tight leading-tight">
              Booking Succeeded!
            </h2>
            
            <p className="text-xs text-zinc-500 max-w-xs mx-auto -mt-1 pb-4 leading-relaxed">
              Your permit reservation code is validated. Receipt ID: <span className="font-mono text-spy-orange font-bold">{createdBooking.bookingId}</span>
            </p>

            {/* Custom vector ticket coupon cards */}
            <div className={`p-4 rounded-3xl border border-dashed relative overflow-hidden text-left mx-auto max-w-sm ${
              darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-300'
            }`}>
              {/* Semi circles vectors in card edges representing tickets */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-950/90 rounded-full border border-zinc-800" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-950/90 rounded-full border border-zinc-800" />

              <div className="space-y-2">
                <span className="text-[8px] opacity-50 block font-mono">ADVENTURE PROPERTY</span>
                <h4 className="text-xs font-black line-clamp-1">{createdBooking.tripName}</h4>
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                  <span>📅 slot: {createdBooking.selectedDate}</span>
                  <span>•</span>
                  <span>👨 {createdBooking.travelersCount} {createdBooking.travelersCount === 1 ? 'Hiker' : 'Hikers'}</span>
                </div>
              </div>

              <hr className="my-3 border-dashed border-zinc-805" />

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[8px] opacity-50 block font-mono">HIKER PRINCIPAL</span>
                  <span className="text-[11px] font-bold">{createdBooking.travelers[0]?.name}</span>
                </div>

                <div className="text-right">
                  <span className="text-[8px] opacity-50 block font-mono">TOTAL PAID</span>
                  <span className={`text-xs font-extrabold font-sans ${darkMode ? 'text-emerald-450' : 'text-emerald-700'}`}>₹{createdBooking.finalAmount}</span>
                </div>
              </div>
            </div>

            {/* Interactive actions */}
            <div className="flex justify-center gap-3 pt-6 cursor-pointer pointer-events-auto">
              <button
                id="btn-download-ticket"
                onClick={() => setShowTicketModal(true)}
                className={`px-4 py-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-350 hover:bg-zinc-850' : 'bg-white border-gray-255 text-zinc-700'
                }`}
              >
                <Download size={14} /> Download Ticket
              </button>

              <button
                id="btn-share-booking"
                onClick={() => setShowShareModal(true)}
                className={`px-4 py-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-350 hover:bg-zinc-850' : 'bg-white border-gray-255 text-zinc-700'
                }`}
              >
                <Share2 size={13} /> Share Booking
              </button>
            </div>
          </div>
        )}

        </motion.div>
      </AnimatePresence>

      {/* Primary Action step flow controls */}
      {step < 3 && (
        <div className="pt-6 border-t border-zinc-800/10 dark:border-zinc-850 flex justify-end shrink-0 gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              className={`flex-1 py-3 text-xs font-bold rounded-xl border text-center transition ${
                darkMode ? 'bg-zinc-905 border-zinc-800 text-zinc-400' : 'bg-white border-gray-200'
              }`}
            >
              Back
            </button>
          )}
          
          <button
            type="button"
            id={`btn-booking-step-${step}-continue`}
            onClick={() => setStep(prev => prev + 1)}
            className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs"
          >
            Continue
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="pt-6 border-t border-zinc-800/10 dark:border-zinc-850 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`w-24 py-4 text-xs font-bold rounded-xl border text-center transition ${
              darkMode ? 'bg-zinc-905 border-zinc-800 text-zinc-400' : 'bg-white border-gray-200'
            }`}
          >
            Back
          </button>
          <button
            type="button"
            id="btn-pay-and-confirm"
            disabled={isProcessingPayment}
            onClick={handleProcessPayment}
            className={`flex-1 bg-forest-600 hover:bg-forest-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md ${
              isProcessingPayment ? 'opacity-50 cursor-not-allowed' : 'active:scale-98 cursor-pointer'
            }`}
          >
            Pay ₹{finalPayAmount} <ShieldCheck size={14} />
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="pt-6 border-t border-zinc-800/10 dark:border-zinc-850 shrink-0">
          <button
            type="button"
            id="btn-booking-done-finish"
            onClick={handleFinishAndReturn}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-4 rounded-xl text-center text-xs"
          >
            Access Bookings Dashboard
          </button>
        </div>
      )}

      {/* ======================= */}
      {/* Dynamic Popups/Modals  */}
      {/* ======================= */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-6">
          <div className={`p-6 rounded-3xl max-w-xs text-center relative ${
            darkMode ? 'bg-zinc-900' : 'bg-white shadow-md'
          }`}>
            <span className="text-3xl block mb-2">📢</span>
            <h4 className="text-sm font-bold font-display">Share Adventure</h4>
            <p className="text-[11px] text-zinc-500 mt-1 pb-4 leading-normal">
              Direct social API simulator. Invite other adventurers to join the trail:
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
              <button 
                onClick={() => { alert('Shared to WhatsApp successfully!'); setShowShareModal(false); }}
                className="py-2.5 rounded-lg bg-green-650 hover:bg-green-755 text-white"
              >
                WhatsApp Invite
              </button>
              <button 
                onClick={() => { alert('Booking Link copied to Clipboard!'); setShowShareModal(false); }}
                className="py-2.5 rounded-lg bg-forest-600 hover:bg-forest-700 text-white"
              >
                Copy Link
              </button>
            </div>

            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-400"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {showTicketModal && (
        <div className="fixed inset-0 bg-black/80 z-55 flex items-center justify-center p-6">
          <div className={`p-6 rounded-3xl max-w-sm text-center relative w-full ${
            darkMode ? 'bg-zinc-900' : 'bg-white shadow-md'
          }`}>
            <h4 className="text-sm font-bold font-display flex items-center gap-1 text-forest-600 dark:text-forest-400 text-center justify-center mb-1">
              <CheckCircle2 size={15} /> Official Mountain Pass
            </h4>
            <span className="text-[9px] opacity-40 font-mono">GOVERNMENT REGISTERED</span>
            
            <div className="space-y-4 text-left my-4 p-4 rounded-xl bg-zinc-950 shadow-inner font-mono border border-zinc-850">
              <div className="flex justify-between text-[10px] pb-2 border-b border-zinc-850">
                <span className="opacity-50">PERMIT NO</span>
                <span className="text-orange-400 font-bold text-xs">{createdBooking?.bookingId}</span>
              </div>
              <div className="flex justify-between text-[10px] pb-2 border-b border-zinc-850">
                <span className="opacity-50">TREK TITLE</span>
                <span className="text-zinc-100 max-w-[120px] text-right truncate">{createdBooking?.tripName}</span>
              </div>
              <div className="flex justify-between text-[10px] pb-2 border-b border-zinc-850">
                <span className="opacity-50">LEAD NOMID</span>
                <span className="text-zinc-100">{createdBooking?.travelers[0]?.name}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="opacity-50">FEE SETTLEMENT</span>
                <span className="text-emerald-400 font-bold">₹{createdBooking?.finalAmount}</span>
              </div>
            </div>

            <p className="text-[9px] leading-relaxed opacity-60 pb-4">
              Please present this invoice voucher bar to forest gate rangers to verify inner line transit tags.
            </p>

            <button
              onClick={() => { alert('Invoice file generated & saved to your device.'); setShowTicketModal(false); }}
              className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white text-xs font-bold rounded-xl"
            >
              Save as PDF File
            </button>

            <button 
              onClick={() => setShowTicketModal(false)}
              className="absolute top-2 right-2 text-zinc-400"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
