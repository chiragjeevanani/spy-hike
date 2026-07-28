import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Calendar, Users, FileText, Ticket, CreditCard, CheckCircle2,
  Sparkles, Percent, ShieldCheck, Download, Share2, Info, Landmark, X, ChevronRight, ChevronLeft, Gift, Bus
} from 'lucide-react';
import { getAvailableCustomerVoucher, markCustomerVoucherUsed, loadLoyaltyConfig } from '../../../utils/loyalty';
import couponsApi, { computeDiscount } from '../../../lib/couponsApi';
import tripsApi from '../../../lib/tripsApi';
import bookingsApi from '../../../lib/bookingsApi';
import { useToast } from '../../../components/ToastProvider';

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
  const toast = useToast();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Single pickup boarding point this organizer supports. Legacy trips saved
  // before this existed (or with the older multi-location format) fall back
  // to the first pickup option or the trip's flat price.
  const pickup = trip.pickup || (trip.pickupOptions?.[0]
    ? { location: trip.pickupOptions[0].location, price: trip.pickupOptions[0].price }
    : null);
  // unitPrice is always the base trek price — pickup is a separate add-on
  const unitPrice = trip.price;

  // Batch pricing tiers configured by the organizer (Solo/Couple/Group/etc.),
  // each already a per-person rate. Falls back to a single implicit tier at
  // the flat per-person price above, for trips saved before tiered pricing
  // existed.
  const pricingTiers = (trip.pricingTiers && trip.pricingTiers.length > 0)
    ? trip.pricingTiers
    : [{ id: 'standard', label: 'Per Traveler', price: unitPrice }];

  // Pickup/transport is a flat per-person add-on layered on top of the
  // tiered trek price — only applied when real tiered pricing exists, so
  // the legacy fallback tier above (already the flat price) isn't double-counted.
  const pickupAddOn = (trip.pricingTiers?.length > 0 && pickup) ? pickup.price : 0;

  // How many people one "unit" of a tier represents, and the minimum group
  // size implied by the organizer's label — "Couple" books in pairs,
  // "Group of 4+" requires at least 4 travelers together.
  const getTierMeta = (tier) => {
    const lbl = tier.label.toLowerCase();
    if (lbl.includes('couple')) return { step: 2, min: 2 };
    const match = lbl.match(/(\d+)/);
    if (lbl.includes('group') && match) return { step: 1, min: parseInt(match[1], 10) };
    return { step: 1, min: 1 };
  };

  const [step, setStep] = useState(1);

  // Per-tier selected counts (people), keyed by tier id — lets a traveler
  // mix traveler types in one booking, e.g. 1 Couple + 2 Solo.
  const [tierCounts, setTierCounts] = useState(() => {
    const defaultTier = pricingTiers.find(t => t.label.toLowerCase().includes('solo')) || pricingTiers[0];
    return defaultTier ? { [defaultTier.id]: getTierMeta(defaultTier).min } : {};
  });

  // State variables for Wizard
  const [selectedDate, setSelectedDate] = useState('');
  const [travelersList, setTravelersList] = useState([
    { name: '', age: '', gender: 'Male', emergencyContact: '' }
  ]);
  const [travelerErrors, setTravelerErrors] = useState({}); // { [idx]: { [field]: message } }
  const travelerCardRefs = useRef({});
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');       // applied code (display)
  const [appliedCouponData, setAppliedCouponData] = useState(null); // coupon object for client-side recompute
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [quickCoupons, setQuickCoupons] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Loyalty reward — an earned free-booking voucher, if any, can be applied
  // in place of payment at checkout. Capped by the admin's configured max
  // discount amount — the server re-derives and enforces this cap
  // independently, this is just the checkout preview.
  const [availableVoucher] = useState(() => getAvailableCustomerVoucher());
  const [useLoyaltyReward, setUseLoyaltyReward] = useState(false);
  const loyaltyMaxDiscount = loadLoyaltyConfig().customer.maxDiscountAmount;
  
  // Payment Options
  const [paymentGateway, setPaymentGateway] = useState('Pay on Arrival');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentFinished, setPaymentFinished] = useState(false);
  const [bookingError, setBookingError] = useState('');
  
  // Constructed ticket fields once succeeded
  const [createdBooking, setCreatedBooking] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Departure batch dates for this specific trip (falls back to simulated
  // dates for records saved before per-trip departures existed)
  const availableDates = trip.departureDates?.length
    ? trip.departureDates
    : ['2026-07-10', '2026-07-20', '2026-08-05', '2026-08-20', '2026-09-02'];

  // Live per-date seat availability from the API (Phase 3). Map of
  // "YYYY-MM-DD" → availableSeats. Empty until the fetch resolves; while empty
  // the calendar falls back to date-only availability (no seat gating), so an
  // offline/legacy trip still books.
  const [seatsByDate, setSeatsByDate] = useState({});
  const [departuresLoaded, setDeparturesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!trip.id) return;
    tripsApi
      .getTripDepartures(trip.id)
      .then((departures) => {
        if (cancelled) return;
        const map = {};
        departures.forEach((d) => { map[d.date] = d.availableSeats; });
        setSeatsByDate(map);
        setDeparturesLoaded(true);
      })
      .catch(() => { if (!cancelled) setDeparturesLoaded(false); });
    return () => { cancelled = true; };
  }, [trip.id]);

  // Seats remaining on a given date (null when unknown → don't gate on seats).
  const seatsForDate = (dateStr) => (dateStr in seatsByDate ? seatsByDate[dateStr] : null);
  const isSoldOut = (dateStr) => {
    const s = seatsForDate(dateStr);
    return s !== null && s <= 0;
  };
  const selectedSeatsLeft = selectedDate ? seatsForDate(selectedDate) : null;
  // The capacity the traveler-count steppers cap against: the selected
  // departure's live seats when known, else the trip-level number.
  const effectiveSeats = selectedSeatsLeft !== null ? selectedSeatsLeft : trip.availableSeats;



  // Calendar states
  const [calYear, setCalYear] = useState(() => {
    const initialDateStr = selectedDate || availableDates.find(dt => dt >= todayStr) || availableDates[0];
    return initialDateStr ? parseInt(initialDateStr.split('-')[0]) : new Date().getFullYear();
  });
  
  const [calMonth, setCalMonth] = useState(() => {
    const initialDateStr = selectedDate || availableDates.find(dt => dt >= todayStr) || availableDates[0];
    return initialDateStr ? parseInt(initialDateStr.split('-')[1]) - 1 : new Date().getMonth();
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDayIndex = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(calMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${calYear}-${monthStr}-${dayStr}`;
      cells.push({ day, dateStr });
    }
    return cells;
  }, [calYear, calMonth, daysInMonth, firstDayIndex]);

  // Per-tier breakdown: how many people are booked at each tier's rate, and
  // the totals derived from it (mixing tiers is allowed, e.g. 1 Couple + 2 Solo).
  const tierBreakdown = pricingTiers.map(tier => {
    const count = tierCounts[tier.id] || 0;
    // perPersonPrice is the trek price only — pickup transport is a separate
    // flat add-on shown as its own line item, not baked into tier pricing.
    const perPersonPrice = tier.price;
    return { ...tier, count, perPersonPrice, subtotal: count * perPersonPrice };
  });
  const travelersCount = tierBreakdown.reduce((sum, t) => sum + t.count, 0);
  const baseCostTotal = tierBreakdown.reduce((sum, t) => sum + t.subtotal, 0);
  // Flat per-index list of tier labels, used to tag each traveler detail
  // form in Step 2 with the type it was booked under.
  const travelerTierLabels = tierBreakdown.reduce((acc, t) => {
    for (let i = 0; i < t.count; i++) acc.push(t.label);
    return acc;
  }, []);

  const incrementTier = (tierId) => {
    const tier = pricingTiers.find(t => t.id === tierId);
    const meta = getTierMeta(tier);
    setTierCounts(prev => {
      const cur = prev[tierId] || 0;
      const next = cur === 0 ? meta.min : cur + meta.step;
      const others = travelersCount - cur;
      if (others + next > effectiveSeats) return prev;
      return { ...prev, [tierId]: next };
    });
  };

  const decrementTier = (tierId) => {
    const tier = pricingTiers.find(t => t.id === tierId);
    const meta = getTierMeta(tier);
    setTierCounts(prev => {
      const cur = prev[tierId] || 0;
      if (cur <= 0) return prev;
      const next = cur - meta.step;
      return { ...prev, [tierId]: next < meta.min ? 0 : next };
    });
  };

  // If the selected departure is sold out, clear the traveler selection so the
  // count reads 0 and Continue is blocked — you can't book a full batch.
  useEffect(() => {
    if (departuresLoaded && effectiveSeats <= 0 && travelersCount > 0) {
      setTierCounts({});
    }
  }, [departuresLoaded, effectiveSeats]);

  // Sync travelers count with list array size. Additional travelers start
  // blank (not a plausible-looking fake name/phone) — these go straight into
  // "emergency permits and environmental safety registers" for a real trek,
  // so a default that merely *looks* filled in is actively dangerous.
  useEffect(() => {
    if (travelersList.length < travelersCount) {
      const diff = travelersCount - travelersList.length;
      const additional = Array(diff).fill(null).map(() => ({
        name: '', age: '', gender: 'Male', emergencyContact: '',
      }));
      setTravelersList([...travelersList, ...additional]);
    } else if (travelersList.length > travelersCount) {
      setTravelersList(travelersList.slice(0, travelersCount));
    }
  }, [travelersCount]);

  // Set default initial date: the first upcoming date that still has seats
  // (re-runs once live availability loads, so we never default to a sold-out
  // batch). Falls back to the first upcoming/any date when seat data is absent.
  useEffect(() => {
    const upcoming = availableDates.filter(dt => dt >= todayStr);
    const bookable = upcoming.find(dt => !isSoldOut(dt)) || availableDates.find(dt => !isSoldOut(dt));
    const fallback = upcoming[0] || availableDates[0];
    const target = bookable || fallback;
    if (!selectedDate || isSoldOut(selectedDate)) {
      if (target) setSelectedDate(target);
    }
  }, [departuresLoaded]);

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
    setTravelerErrors(prev => {
      if (!prev[idx]?.[field]) return prev;
      return { ...prev, [idx]: { ...prev[idx], [field]: '' } };
    });
  };

  // This info goes straight into "emergency permits and environmental safety
  // registers" for a real trek — required, not just for form completeness.
  // Returns the first invalid { idx, field, message }, or null if all clear.
  const validateTravelers = () => {
    for (let idx = 0; idx < travelersList.length; idx++) {
      const t = travelersList[idx];
      const label = `Traveler #${idx + 1}`;
      if (!t.name?.trim()) return { idx, field: 'name', message: `${label}: full name is required.` };
      const age = Number(t.age);
      if (!t.age || Number.isNaN(age) || age < 12 || age > 90) {
        return { idx, field: 'age', message: `${label}: age must be between 12 and 90.` };
      }
      if (!t.gender) return { idx, field: 'gender', message: `${label}: gender is required.` };
      const digits = String(t.emergencyContact || '').replace(/\D/g, '');
      if (!/^\d{10}$/.test(digits)) {
        return { idx, field: 'emergencyContact', message: `${label}: a valid 10-digit emergency contact number is required.` };
      }
    }
    return null;
  };

  const handleContinue = () => {
    if (step === 2) {
      const error = validateTravelers();
      if (error) {
        setTravelerErrors({ [error.idx]: { [error.field]: error.message } });
        toast.error(error.message);
        const card = travelerCardRefs.current[error.idx];
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card?.querySelector(`[name="${error.field}"]`)?.focus?.({ preventScroll: true });
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  // Up to 3 currently-active coupons (platform-wide + this trip's organizer
  // coupons), offered as quick-apply chips.
  useEffect(() => {
    let cancelled = false;
    couponsApi.listActive(trip.id)
      .then(list => { if (!cancelled) setQuickCoupons(list.slice(0, 3)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trip.id]);

  const handleValidateCoupon = async (e) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');

    try {
      const result = await couponsApi.validate(couponCode, baseCostTotal, trip.id);
      if (result.ok) {
        // Store the coupon object so the discount recomputes client-side as the
        // booking amount changes (server stays the authority at booking time).
        setAppliedCoupon(result.coupon.code);
        setAppliedCouponData(result.coupon);
        setCouponSuccess(result.message);
        setShowConfetti(true);
      } else {
        setAppliedCoupon('');
        setAppliedCouponData(null);
        setCouponError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      setAppliedCoupon('');
      setAppliedCouponData(null);
      const message = err?.message || 'Could not validate coupon.';
      setCouponError(message);
      toast.error(message);
    }
  };

  // Discount recomputed from the applied coupon against the live base cost
  // (re-checks the min-booking gate too, via computeDiscount).
  const appliedDiscountValue = appliedCouponData ? computeDiscount(appliedCouponData, baseCostTotal) : 0;
  // No additional tax — the trip price already includes taxes & permits.
  const taxAmountValue = 0;
  // The reward comps up to loyaltyMaxDiscount, not the whole booking — a trip
  // priced above the cap still owes the remainder. When the trip itself costs
  // less than the cap, the trip's price is the real ceiling (can't discount
  // more than 100% of the booking) — this is what copy should advertise, not
  // the admin's flat cap, so a ₹3000 trip against a ₹5000 cap says "up to
  // ₹3000 off", not a misleading "up to ₹5000 off".
  const effectiveLoyaltyDiscount = Math.min(loyaltyMaxDiscount, baseCostTotal);
  const loyaltyDiscountValue = useLoyaltyReward ? effectiveLoyaltyDiscount : 0;
  const finalPayAmount = useLoyaltyReward
    ? Math.round((baseCostTotal - loyaltyDiscountValue) * 100) / 100
    : Math.round((baseCostTotal - appliedDiscountValue) * 100) / 100;

  const handleProcessPayment = async () => {
    setIsProcessingPayment(true);
    setBookingError('');

    try {
      // The server computes all pricing/commission authoritatively, reserves
      // the departure seats, runs the (stubbed) payment, and owns the
      // bookingId — we send only the selection and render what comes back.
      const booking = await bookingsApi.create({
        tripId: trip.id,
        selectedDate,
        selections: tierBreakdown
          .filter(t => t.count > 0)
          .map(t => ({ id: t.id, label: t.label, count: t.count })),
        travelers: travelersList,
        couponCode: appliedCoupon || undefined,
        useLoyaltyReward,
      });

      // Consume the client-side loyalty voucher (Phase 7 moves this server-side).
      if (useLoyaltyReward && availableVoucher) {
        markCustomerVoucherUsed(availableVoucher.id, booking.bookingId);
      }

      setPaymentFinished(true);
      setCreatedBooking(booking);
      setStep(4); // Success is now Step 4
    } catch (err) {
      const message = err?.message || 'Payment failed. Please try again.';
      setBookingError(message);
      toast.error(message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleFinishAndReturn = () => {
    if (createdBooking) {
      onConfirmBooking(createdBooking);
    }
  };

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto no-scrollbar font-sans px-6 py-4 relative ${
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
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
        
        {/* Step 1: Select Date & Travelers Count */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-forest-500" size={18} />
              <h2 className="text-base font-display font-black">Expedition Details</h2>
            </div>
            
            {/* 1. Date selection calendar */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-2">Select Departure Date (Available Calendar Slots)</label>
              
              <div className={`p-4 rounded-2xl border ${
                darkMode ? 'bg-zinc-900/30 border-white/5' : 'bg-white border-zinc-200'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border active:scale-95 transition cursor-pointer ${
                      darkMode ? 'bg-zinc-950/60 border-white/5 hover:bg-zinc-900 text-zinc-300' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-black font-display tracking-tight text-center flex-1">
                    {monthNames[calMonth]} {calYear}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border active:scale-95 transition cursor-pointer ${
                      darkMode ? 'bg-zinc-950/60 border-white/5 hover:bg-zinc-900 text-zinc-300' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {dayNames.map(day => (
                    <span key={day} className="text-[9px] font-bold uppercase opacity-40">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {calendarCells.map((cell, idx) => {
                    if (cell.day === null) {
                      return <div key={`empty-${idx}`} />;
                    }

                    const isAvailable = availableDates.includes(cell.dateStr);
                    const isPast = cell.dateStr < todayStr;
                    const soldOut = isAvailable && isSoldOut(cell.dateStr);
                    const isSelectable = isAvailable && !isPast && !soldOut;
                    const isSelected = selectedDate === cell.dateStr;

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        disabled={!isSelectable}
                        title={soldOut ? 'Sold out' : undefined}
                        onClick={() => setSelectedDate(cell.dateStr)}
                        className={`relative h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                          isSelectable
                            ? isSelected
                              ? darkMode
                                ? 'bg-forest-500 text-white font-black shadow-md border border-forest-400 cursor-pointer'
                                : 'bg-forest-600 text-white font-black shadow-md cursor-pointer'
                              : darkMode
                              ? 'bg-forest-950/30 border border-forest-500/30 text-forest-400 hover:bg-forest-900/50 hover:border-forest-500/60 font-bold cursor-pointer'
                              : 'bg-forest-50 border border-forest-500/20 text-forest-700 hover:bg-forest-100/70 hover:border-forest-500/50 font-bold cursor-pointer'
                            : soldOut
                            ? (darkMode
                              ? 'text-zinc-600 line-through opacity-45 cursor-not-allowed'
                              : 'text-zinc-400 line-through opacity-60 cursor-not-allowed')
                            : darkMode
                            ? 'text-zinc-650 opacity-20 cursor-not-allowed'
                            : 'text-zinc-300 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Selected date preview */}
              {selectedDate && (
                <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium opacity-80 px-1">
                  <span className="flex items-center gap-1.5">
                    Selected Date:
                    {selectedSeatsLeft !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        selectedSeatsLeft <= 3
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-forest-500/10 text-forest-600 dark:text-forest-400'
                      }`}>
                        {selectedSeatsLeft} seat{selectedSeatsLeft === 1 ? '' : 's'} left
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-forest-600 dark:text-forest-400">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* 1b. Pickup location — fixed, single boarding point set by the organizer */}
            {pickup && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-2">Pickup Location</label>
                <div className={`p-2.5 rounded-xl flex items-center justify-between border ${
                  darkMode ? 'bg-zinc-900/30 border-white/5 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Bus size={14} className="text-forest-500" />
                    <span className="text-[11px] font-bold font-sans">Ex-{pickup.location}</span>
                  </div>
                  <span className="text-xs font-black font-sans text-forest-600 dark:text-forest-400">₹{pickup.price}/person</span>
                </div>
                {pickupAddOn > 0 && (
                  <p className="text-[9px] text-zinc-500 mt-1.5 pl-1">Added on top of each traveler's batch price below.</p>
                )}
              </div>
            )}

            {/* 2. Traveler type & count — mix Solo/Couple/Group (or whatever
                tiers the organizer configured), each priced independently */}
            <div className={`p-3 rounded-xl border space-y-3 ${darkMode ? 'bg-zinc-900/30 border-white/5' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <Users size={14} className="text-forest-500" /> Traveler Type & Count
                </h3>
                <span className="text-[9px] text-zinc-500">Seats Left: {effectiveSeats}</span>
              </div>

              <div className="space-y-2.5">
                {tierBreakdown.map(tier => {
                  const meta = getTierMeta(tier);
                  const nextIfIncremented = tier.count === 0 ? meta.min : tier.count + meta.step;
                  const wouldExceedCapacity = (travelersCount - tier.count + nextIfIncremented) > effectiveSeats;
                  return (
                    <div
                      key={tier.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        darkMode ? 'bg-zinc-950/40 border-white/5' : 'bg-zinc-50 border-zinc-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold block truncate">{tier.label}</span>
                        <span className="text-[9px] text-zinc-500">
                          ₹{tier.perPersonPrice}/person{meta.step === 2 ? ' · booked in pairs' : meta.min > 1 ? ` · min ${meta.min} travelers` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          disabled={tier.count === 0}
                          onClick={() => decrementTier(tier.id)}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold transition ${
                            tier.count === 0
                              ? 'border-zinc-800 text-zinc-400 cursor-not-allowed'
                              : 'border-forest-500 text-forest-500 hover:bg-forest-500/10 cursor-pointer'
                          }`}
                        >
                          -
                        </button>

                        <span className="text-sm font-black font-mono w-5 text-center">{tier.count}</span>

                        <button
                          type="button"
                          disabled={wouldExceedCapacity}
                          onClick={() => incrementTier(tier.id)}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold transition ${
                            wouldExceedCapacity
                              ? 'border-zinc-800 text-zinc-400 cursor-not-allowed'
                              : 'border-forest-500 text-forest-500 hover:bg-forest-500/10 cursor-pointer'
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {travelersCount === 0 && (
                <p className="text-[10px] text-rose-500 font-semibold">Select at least one traveler type to continue.</p>
              )}

              <div className="pt-2.5 border-t border-zinc-800/10 dark:border-zinc-800/40 flex justify-between items-center text-[10px]">
                <span className="opacity-60">{travelersCount} traveler{travelersCount === 1 ? '' : 's'} selected</span>
                <span className="font-extrabold text-forest-600 dark:text-forest-400">Estimated Cost: ₹{baseCostTotal}</span>
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
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="text-forest-500" size={18} />
              <h2 className="text-base font-display font-black">Traveler Coordinates</h2>
            </div>
            <p className="text-xs text-zinc-500 pb-1">
              Details needed for emergency permits and environmental safety registers:
            </p>

            <div className="space-y-4">
              {travelersList.map((tr, idx) => {
                const err = travelerErrors[idx] || {};
                const fieldCls = (field) => `w-full text-xs px-3 py-2.5 rounded-xl border outline-hidden focus:border-forest-500 ${
                  err[field] ? 'border-red-500 focus:border-red-500' : darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-gray-100 border-gray-200'
                } ${err[field] && darkMode ? 'bg-zinc-950' : ''}`;
                return (
                <div
                  key={idx}
                  ref={el => (travelerCardRefs.current[idx] = el)}
                  className={`p-4 rounded-2xl space-y-3 relative ${
                    darkMode ? 'bg-zinc-900/60 border border-white/5' : 'bg-white border border-gray-150 shadow-xs'
                  }`}
                >
                  <span className="absolute -top-2.5 left-4 bg-forest-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                    TRAVELER #{idx + 1}{travelerTierLabels[idx] ? ` · ${travelerTierLabels[idx]}` : ''}
                  </span>

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Aman Verma"
                      value={tr.name}
                      onChange={e => handleTravelerFieldChange(idx, 'name', e.target.value)}
                      className={fieldCls('name')}
                    />
                    {err.name && <p className="text-[10px] font-semibold text-red-500">{err.name}</p>}
                  </div>

                  {/* Age & Gender Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Age *</label>
                      <input
                        type="number"
                        name="age"
                        min={12}
                        max={90}
                        placeholder="24"
                        value={tr.age}
                        onChange={e => handleTravelerFieldChange(idx, 'age', e.target.value)}
                        className={fieldCls('age')}
                      />
                      {err.age && <p className="text-[10px] font-semibold text-red-500">{err.age}</p>}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Gender *</label>
                      <select
                        name="gender"
                        value={tr.gender}
                        onChange={e => handleTravelerFieldChange(idx, 'gender', e.target.value)}
                        className={fieldCls('gender')}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {err.gender && <p className="text-[10px] font-semibold text-red-500">{err.gender}</p>}
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Emergency Phone *</label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      placeholder="e.g. 9876543210"
                      value={tr.emergencyContact}
                      onChange={e => handleTravelerFieldChange(idx, 'emergencyContact', e.target.value)}
                      className={fieldCls('emergencyContact')}
                    />
                    {err.emergencyContact && <p className="text-[10px] font-semibold text-red-500">{err.emergencyContact}</p>}
                  </div>
                </div>
                );
              })}
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
            
            {/* Loyalty reward — an earned free-booking voucher, if any */}
            {availableVoucher && (
              <div className={`p-3.5 rounded-2xl border-2 border-dashed ${
                useLoyaltyReward
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : (darkMode ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-400/50 bg-emerald-50/60')
              }`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                    <Gift size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block text-emerald-600 dark:text-emerald-400">
                      Loyalty Reward Available!
                    </span>
                    <p className="text-[10px] opacity-70 mt-0.5 leading-relaxed">
                      You've earned a reward through Find Your Trek Loyalty Rewards — up to ₹{effectiveLoyaltyDiscount} off this booking
                      {baseCostTotal > loyaltyMaxDiscount ? ', with the remainder payable.' : ', making it free.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-toggle-loyalty-reward"
                  onClick={() => setUseLoyaltyReward(prev => !prev)}
                  className={`w-full mt-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    useLoyaltyReward
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : (darkMode ? 'bg-zinc-900 border border-emerald-500/30 text-emerald-400 hover:bg-zinc-850' : 'bg-white border border-emerald-400/60 text-emerald-600 hover:bg-emerald-50')
                  }`}
                >
                  {useLoyaltyReward ? `✓ ₹${loyaltyDiscountValue} Reward Applied — Tap to Remove` : `Apply Reward (up to ₹${effectiveLoyaltyDiscount} off)`}
                </button>
              </div>
            )}

            {/* Promo coupon inline input — hidden while a free reward is applied */}
            {!useLoyaltyReward && (
            <div className={`p-3 rounded-2xl border ${
              darkMode ? 'bg-zinc-900/40 border-white/5' : 'bg-white border-zinc-200/60 shadow-xs'
            } space-y-2`}>
              <span className="text-[9px] uppercase font-bold tracking-wider opacity-65 flex items-center gap-1">
                <Ticket size={11} className="text-forest-505" /> Redeem Promo Coupon
              </span>
              <form onSubmit={handleValidateCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="CODE (e.g. FYT20)"
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
              
              {!appliedCoupon && quickCoupons.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  {quickCoupons.map(cp => (
                    <button
                      key={cp.id}
                      type="button"
                      onClick={() => { setCouponCode(cp.code); }}
                      className={`text-[8.5px] font-bold px-2 py-1 rounded-md border border-dashed transition ${
                        darkMode ? 'border-zinc-700 text-zinc-400 bg-zinc-950/45 hover:bg-zinc-900' : 'border-gray-300 text-zinc-650 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      Use {cp.code}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Real Checkout Detail card */}
            <div className={`p-4 rounded-2xl space-y-3 border ${
              darkMode 
                ? 'bg-zinc-900 border-white/5' 
                : 'bg-white border-zinc-200/60 shadow-xs'
            }`}>
              <div className="space-y-1.5">
                {tierBreakdown.filter(t => t.count > 0).map(t => (
                  <div key={t.id} className="flex justify-between text-xs">
                    <span className="opacity-70">{t.label} × {t.count}</span>
                    <span className="font-sans font-bold text-zinc-700 dark:text-zinc-300">₹{t.subtotal}</span>
                  </div>
                ))}
              </div>

              {appliedCoupon && !useLoyaltyReward && (
                <div className="flex justify-between text-xs text-rose-500 font-bold">
                  <span>Coupon Discount ({appliedCoupon})</span>
                  <span className="font-sans">-₹{appliedDiscountValue}</span>
                </div>
              )}

              {useLoyaltyReward && (
                <div className="flex justify-between text-xs text-emerald-500 font-bold">
                  <span className="flex items-center gap-1"><Gift size={11} /> Loyalty Reward (up to ₹{effectiveLoyaltyDiscount})</span>
                  <span className="font-sans">-₹{loyaltyDiscountValue}</span>
                </div>
              )}

              {/* Tax is included in trip price — no separate tax line shown */}

              <hr className="my-1 border-dashed border-zinc-200 dark:border-zinc-800" />

              <div className="flex justify-between text-sm font-bold pt-1">
                <span className="text-forest-600 dark:text-forest-400">Final Settlement Amount</span>
                <span className={`font-sans font-black text-base ${darkMode ? 'text-emerald-450' : 'text-emerald-700'}`}>₹{finalPayAmount}</span>
              </div>
            </div>

            {/* Secure payment partner logo info */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] opacity-75 font-semibold text-zinc-500">
              <ShieldCheck size={12} className="text-forest-600 dark:text-forest-400" />
              <span>Pay on Arrival at Base Camp • Instantly Credited to Organizer Wallet</span>
            </div>

            {isProcessingPayment && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/35 flex items-center justify-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-spy-orange border-t-transparent animate-spin" />
                <span className="text-xs font-semibold text-spy-orange">Confirming reservation with {paymentGateway}...</span>
              </div>
            )}

            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs font-semibold text-rose-500 text-center">
                {bookingError}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Booking Success Screen */}
        {step === 4 && createdBooking && (
          <div className="space-y-4 text-center py-6">
            <div className="flex justify-center mb-2">
              <div className="relative">
                {/* Outer pulse ring */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                {/* Icon fills entire circle cleanly */}
                <CheckCircle2 size={72} className="relative text-emerald-500 drop-shadow-lg" strokeWidth={1.5} />
              </div>
            </div>

            <span className="bg-emerald-500 text-white font-mono text-[8px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
              CONFIRMED EXPEDITION PASS
            </span>

            <h2 className="text-xl font-display font-black tracking-tight leading-tight">
              Booking Reserved!
            </h2>
            
            <p className="text-xs text-zinc-500 max-w-xs mx-auto -mt-1 pb-4 leading-relaxed">
              Your permit slot is confirmed. Pay on arrival at base camp. Receipt ID: <span className="font-mono text-spy-orange font-bold">{createdBooking.bookingId}</span>
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
                  <span className="text-[8px] opacity-50 block font-mono">PAYMENT MODE</span>
                  <span className="text-[10px] font-extrabold text-emerald-500 block">Pay on Arrival</span>
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
              className={`w-24 py-3.5 text-xs font-bold rounded-2xl border text-center transition-all duration-300 active:scale-95 cursor-pointer ${
                darkMode 
                  ? 'bg-zinc-900/30 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/50' 
                  : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 hover:border-zinc-300'
              }`}
            >
              Back
            </button>
          )}
          
          <button
            type="button"
            id={`btn-booking-step-${step}-continue`}
            disabled={step === 1 && travelersCount === 0}
            onClick={handleContinue}
            className={`flex-1 py-3.5 rounded-2xl font-display font-black text-xs uppercase tracking-wider border backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-1.5 ${
              step === 1 && travelersCount === 0
                ? 'opacity-40 cursor-not-allowed border-zinc-700 text-zinc-500'
                : darkMode
                ? 'bg-zinc-900/45 border-forest-300/35 text-forest-300 hover:bg-zinc-900/70 hover:border-forest-300/70 shadow-lg shadow-forest-900/10 cursor-pointer'
                : 'bg-white/60 border-forest-500/30 text-forest-700 hover:bg-white/90 hover:border-forest-500/60 shadow-md shadow-forest-950/5 cursor-pointer'
            }`}
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
            className={`w-24 py-4 text-xs font-bold rounded-2xl border text-center transition-all duration-300 active:scale-95 cursor-pointer ${
              darkMode 
                ? 'bg-zinc-900/30 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/50' 
                : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50'
            }`}
          >
            Back
          </button>
          <button
            type="button"
            id="btn-pay-and-confirm"
            disabled={isProcessingPayment}
            onClick={handleProcessPayment}
            className={`flex-1 py-4 rounded-2xl font-display font-black text-xs uppercase tracking-wider border backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${
              isProcessingPayment 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            } ${
              useLoyaltyReward
                ? darkMode
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60 hover:border-emerald-400 shadow-lg shadow-emerald-900/10'
                  : 'bg-emerald-50/60 border-emerald-500/30 text-emerald-700 hover:bg-emerald-100/90 hover:border-emerald-500 shadow-md shadow-emerald-950/5'
                : darkMode
                ? 'bg-spy-orange/20 border-spy-orange/50 text-spy-orange hover:bg-spy-orange/30 shadow-lg cursor-pointer'
                : 'bg-spy-orange border-spy-orange text-white hover:bg-orange-600 shadow-md cursor-pointer'
            }`}
          >
            {finalPayAmount === 0
              ? <>Confirm Free Booking <Gift size={14} /></>
              : <>Pay on Arrival (₹{finalPayAmount}) <ShieldCheck size={14} /></>}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="pt-6 border-t border-zinc-800/10 dark:border-zinc-850 shrink-0">
          <button
            type="button"
            id="btn-booking-done-finish"
            onClick={handleFinishAndReturn}
            className={`w-full py-4 rounded-2xl font-display font-black text-xs uppercase tracking-wider border backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${
              darkMode
                ? 'bg-zinc-900/45 border-forest-300/35 text-forest-300 hover:bg-zinc-900/70 hover:border-forest-300/70 shadow-lg shadow-forest-900/10'
                : 'bg-white/60 border-forest-500/30 text-forest-700 hover:bg-white/90 hover:border-forest-500/60 shadow-md shadow-forest-950/5'
            }`}
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
                onClick={() => { toast.success('Shared to WhatsApp successfully!'); setShowShareModal(false); }}
                className="py-2.5 rounded-lg bg-green-650 hover:bg-green-755 text-white"
              >
                WhatsApp Invite
              </button>
              <button
                onClick={() => { toast.success('Booking Link copied to Clipboard!'); setShowShareModal(false); }}
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
              onClick={() => { toast.success('Invoice file generated & saved to your device.'); setShowTicketModal(false); }}
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
