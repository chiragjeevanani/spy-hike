import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useTransform,
  animate,
} from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Users,
  FileText,
  Ticket,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Percent,
  ShieldCheck,
  Download,
  Info,
  Landmark,
  X,
  ChevronRight,
  ChevronLeft,
  Gift,
  Bus,
  RotateCw,
  Home,
  Star,
  MapPin,
  Clock,
  UserCheck,
  Trash2,
} from "lucide-react";
import {
  getAvailableCustomerVoucher,
  markCustomerVoucherUsed,
  loadLoyaltyConfig,
} from "../../../utils/loyalty";
import couponsApi, { computeDiscount } from "../../../lib/couponsApi";
import tripsApi from "../../../lib/tripsApi";
import bookingsApi from "../../../lib/bookingsApi";
import { redirectToPayU } from "../../../lib/payu";
import {
  sanitizePhoneInput,
  isValidPhone,
  PHONE_MAX_DIGITS,
  PHONE_RULE_MESSAGE,
} from "../../../utils/phone";
import { useToast } from "../../../components/ToastProvider";
import TravelTicket from "./TravelTicket";
import { downloadTicketPDF } from "../utils/ticketPdf";
import {
  loadSavedHikers,
  mergeNewHikers,
  removeSavedHiker,
  loadUserState,
  loadBookings,
} from "../utils/storage";

// Confetti Popper Animation component for successful coupon redeem
const ConfettiPopper = () => {
  const particles = Array.from({ length: 45 }).map((_, i) => {
    const angle = (Math.random() * 360 * Math.PI) / 180;
    const velocity = 60 + Math.random() * 160;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity - 80;
    const colors = [
      "#f97316",
      "#10b981",
      "#3b82f6",
      "#eab308",
      "#ec4899",
      "#a855f7",
      "#6366f1",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return {
      id: i,
      tx,
      ty,
      color: randomColor,
      size: 6 + Math.random() * 8,
      delay: Math.random() * 0.05,
      isCircle: Math.random() > 0.5,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
      {particles.map((p) => (
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
            position: "absolute",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? "50%" : "0%",
          }}
        />
      ))}
    </div>
  );
};

// Thermal receipt paper stays warm-white with dark ink in both themes — a real
// printout doesn't invert, and the light paper against the dark app chrome is
// what sells the "physical receipt" read.
const PAPER = "#fbfaf7";
const INK = "#27272a";

// Zigzag polygon for a torn-off paper edge, drawn as an SVG under the receipt.
const tearPolygon = (w = 300, h = 9, teeth = 26) => {
  const step = w / teeth;
  const pts = ["0,0", `${w},0`];
  for (let i = teeth; i >= 0; i -= 1) {
    pts.push(`${(i * step).toFixed(1)},${i % 2 === 0 ? h : h * 0.25}`);
  }
  return pts.join(" ");
};

// Deterministic bar widths so the same booking always prints the same barcode.
const barcodeBars = (seed) => {
  const src = seed || "FINDYOURTREK";
  return Array.from({ length: 46 }, (_, i) => {
    const code = src.charCodeAt(i % src.length) || 42;
    return ((code * (i + 3)) % 4) + 1;
  });
};

const ReceiptLine = ({ label, value, strong = false }) => (
  <div className="flex justify-between items-baseline gap-2 text-[8.5px] leading-[1.5]">
    <span className="opacity-55 tracking-wider shrink-0">{label}</span>
    <span
      className={`text-right truncate ${strong ? "font-black" : "font-semibold"}`}>
      {value}
    </span>
  </div>
);

const Perforation = () => (
  <div
    className="my-1.5 border-t border-dashed"
    style={{ borderColor: "rgba(39,39,42,0.28)" }}
  />
);

/**
 * Coerces phone input to exactly the 10 digits the API accepts (/^\d{10}$/).
 *
 * Digits only, capped at 10. A pasted number carrying an Indian country code
 * or a trunk prefix is unwrapped first — blindly truncating "+919876543210"
 * to its first ten characters would silently store "9198765432", a different
 * number that still looks valid.
 */

// Printer chassis with the feed slot. `tone` colours the status lamp so the
// same unit reads as working (success) or faulted (failure).
const PrinterChassis = ({ tone = "ok", busy, reduceMotion }) => {
  const lamp = tone === "ok" ? "bg-emerald-400" : "bg-rose-500";
  const label = tone === "ok" ? "RDY" : "ERR";
  return (
    <div className="rounded-t-2xl px-3.5 pt-3 pb-2 border border-b-0 border-zinc-950 shadow-xl bg-gradient-to-b from-zinc-700 to-zinc-900">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono text-[7px] tracking-[0.2em] text-zinc-400">
          FIND YOUR TREK · THERMAL POS
        </span>
        <div className="flex items-center gap-1">
          <motion.span
            className={`w-1.5 h-1.5 rounded-full ${lamp}`}
            animate={
              reduceMotion || !busy ? { opacity: 1 } : { opacity: [1, 0.25, 1] }
            }
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="font-mono text-[7px] text-zinc-500">{label}</span>
        </div>
      </div>
      {/* Feed slot. The inner shadow reads as depth the paper emerges from. */}
      <div className="h-[7px] rounded-full bg-black border border-black shadow-[inset_0_2px_3px_rgba(0,0,0,0.95)]" />
    </div>
  );
};

/**
 * Paper emerging from the printer slot.
 *
 * The first version animated the wrapper's `height` from 0 to auto, which
 * forces a layout pass on every frame and stutters on a phone. This drives a
 * single motion value instead and derives two GPU-composited properties from
 * it — `clip-path` for the reveal and `translateY` for the feed travel — so
 * nothing reflows while it runs. Reserving the final height up front also
 * removes the layout shift that used to shunt the buttons down the page.
 *
 * `keyframes`/`times` let the caller shape the feed: a steady pull for a
 * successful print, or one that hitches partway when the transaction fails.
 */
const PaperFeed = ({
  children,
  duration = 2,
  delay = 0.3,
  keyframes = [0, 1],
  times,
  reduceMotion,
  onDone,
}) => {
  const progress = useMotionValue(reduceMotion ? 1 : 0);
  // Reveal top-down: inset() clips from the bottom, so 100% -> 0% uncovers.
  const clipPath = useTransform(
    progress,
    (p) => `inset(0 0 ${(1 - p) * 100}% 0)`,
  );
  // The sheet lags slightly behind its own reveal, which reads as the rollers
  // pulling it rather than the image simply appearing.
  const y = useTransform(progress, (p) => (1 - p) * -14);
  // The slot casts its shadow onto the sheet just below it — a fixed position,
  // not one that chases the leading edge. It fades in as soon as paper starts
  // to show. Opacity only, so nothing here triggers layout either.
  const shadowOpacity = useTransform(progress, (p) => Math.min(p * 6, 1));

  useEffect(() => {
    if (reduceMotion) {
      progress.set(1);
      onDone?.();
      return undefined;
    }
    const controls = animate(progress, keyframes, {
      duration,
      delay,
      times,
      ease: "linear",
      onComplete: () => onDone?.(),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <motion.div
        style={{ clipPath, willChange: "clip-path" }}
        className="relative">
        <motion.div style={{ y, willChange: "transform" }}>
          {children}
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        style={{ opacity: shadowOpacity, willChange: "opacity" }}
        className="pointer-events-none absolute inset-x-0 top-0 h-5 z-10 bg-gradient-to-b from-black/40 to-transparent"
      />
    </div>
  );
};

// Success confirmation — a POS printer feeding a receipt out of its slot.
const ReceiptPrintout = ({
  booking,
  items,
  subtotal,
  discount,
  loyaltyDiscount,
  pickupLabel,
}) => {
  const reduceMotion = useReducedMotion();
  const feed = reduceMotion ? 0 : 2.1;
  const start = reduceMotion ? 0 : 0.32;
  const [printing, setPrinting] = useState(!reduceMotion);

  const bars = useMemo(
    () => barcodeBars(booking.bookingId),
    [booking.bookingId],
  );
  const printedAt = useMemo(
    () =>
      new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  return (
    <div className="flex flex-col items-center pt-1">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-1.5 mb-3">
        <ShieldCheck size={13} className="text-emerald-500" />
        <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-emerald-500">
          {booking.payment?.method === "arrival"
            ? "Booking Confirmed · Pay on Arrival"
            : "Payment Authorised"}
        </span>
      </motion.div>

      {/* Printer chassis + feed slot */}
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-[300px] max-w-full relative z-20">
        <PrinterChassis tone="ok" busy={printing} reduceMotion={reduceMotion} />
      </motion.div>

      {/* Paper feeding out */}
      <div
        className="w-[276px] max-w-full relative z-10"
        style={{ filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.30))" }}>
        <PaperFeed
          duration={feed}
          delay={start}
          reduceMotion={reduceMotion}
          onDone={() => setPrinting(false)}>
          <div>
            <div
              className="px-4 pt-4 pb-3 font-mono"
              style={{ backgroundColor: PAPER, color: INK }}>
              <div className="text-center">
                <div className="text-[13px] font-black tracking-[0.28em]">
                  FIND YOUR TREK
                </div>
                <div className="text-[7px] tracking-[0.22em] opacity-60 mt-1">
                  ADVENTURE BOOKING RECEIPT
                </div>
              </div>

              <Perforation />
              <ReceiptLine label="RECEIPT" value={booking.bookingId} strong />
              <ReceiptLine label="PRINTED" value={printedAt} />

              <Perforation />
              <div className="text-[9px] font-black leading-snug mb-1">
                {booking.tripName}
              </div>
              <ReceiptLine label="DEPARTS" value={booking.selectedDate} />
              <ReceiptLine label="HIKERS" value={booking.travelersCount} />
              <ReceiptLine
                label="LEAD"
                value={booking.travelers?.[0]?.name || "—"}
              />
              {pickupLabel && (
                <ReceiptLine label="PICKUP" value={`Ex-${pickupLabel}`} />
              )}

              <Perforation />
              {items.map((item) => (
                <ReceiptLine
                  key={item.id}
                  label={`${item.count} × ${item.label}`}
                  value={`₹${item.subtotal}`}
                />
              ))}

              <Perforation />
              <ReceiptLine label="SUBTOTAL" value={`₹${subtotal}`} />
              {discount > 0 && (
                <ReceiptLine label="COUPON" value={`-₹${discount}`} />
              )}
              {loyaltyDiscount > 0 && (
                <ReceiptLine label="REWARD" value={`-₹${loyaltyDiscount}`} />
              )}

              <div
                className="flex justify-between items-baseline mt-2 pt-2 border-t-2 border-dashed"
                style={{ borderColor: "rgba(39,39,42,0.4)" }}>
                <span className="text-[10px] font-black tracking-[0.15em]">
                  {booking.payment?.method === "arrival"
                    ? "DUE ON ARRIVAL"
                    : "TOTAL"}
                </span>
                <span className="text-[16px] font-black leading-none">
                  ₹{booking.finalAmount}
                </span>
              </div>

              {booking.payment?.method === "arrival" ? (
                <>
                  <div
                    className="mt-2.5 text-center text-[7.5px] font-black tracking-[0.15em] py-1.5 border border-dashed"
                    style={{ borderColor: "rgba(39,39,42,0.35)" }}>
                    ** PAY ON ARRIVAL AT BASE CAMP **
                  </div>
                  <div className="mt-2 text-center text-[7px] leading-relaxed tracking-[0.08em] opacity-70">
                    NO PAYMENT TAKEN NOW. PAY THE AMOUNT ABOVE TO YOUR ORGANIZER
                    AT BASE CAMP ON THE DAY OF DEPARTURE. SHOW THIS RECEIPT OR
                    YOUR TICKET AT CHECK-IN.
                  </div>
                </>
              ) : (
                <div
                  className="mt-2.5 text-center text-[7.5px] font-black tracking-[0.15em] py-1.5 border border-dashed"
                  style={{ borderColor: "rgba(39,39,42,0.35)" }}>
                  ** ONLINE PAYMENT SETTLED VIA PAYU **
                </div>
              )}

              <div className="flex items-end justify-center gap-[1.5px] h-9 mt-3.5">
                {bars.map((w, i) => (
                  <span
                    key={i}
                    className="h-full"
                    style={{ width: w, backgroundColor: INK }}
                  />
                ))}
              </div>
              <div className="text-center text-[7.5px] tracking-[0.3em] mt-1.5 opacity-70">
                {booking.bookingId}
              </div>

              <div className="text-center text-[7px] tracking-[0.18em] opacity-50 mt-2.5">
                THANK YOU · THE TRAIL AWAITS
              </div>
            </div>

            <svg
              viewBox="0 0 300 9"
              preserveAspectRatio="none"
              className="block w-full h-[9px]">
              <polygon points={tearPolygon()} fill={PAPER} />
            </svg>
          </div>
        </PaperFeed>
      </div>
    </div>
  );
};

// Failure state — the same printer, printing a decline slip. It feeds steadily,
// hitches partway as the transaction is refused, finishes short, and takes a
// DECLINED stamp. Sharing the success screen's mechanism means the outcome is
// carried by what gets printed rather than by an unrelated animation.
const PaymentFailedScreen = ({
  message,
  onTryAgain,
  onGoHome,
  darkMode,
  retrying = false,
  footnote = "Nothing was charged and your seats are not reserved yet.",
}) => {
  const reduceMotion = useReducedMotion();
  const feed = reduceMotion ? 0 : 1.5;
  const start = reduceMotion ? 0 : 0.3;
  const [printing, setPrinting] = useState(!reduceMotion);
  // The stamp lands once the paper has stopped moving.
  const stampDelay = reduceMotion ? 0 : start + feed + 0.12;

  return (
    <div className="py-2 flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-1.5 mb-3">
        <X size={13} className="text-rose-500" />
        <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-rose-500">
          Payment Declined
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-[300px] max-w-full relative z-20">
        <PrinterChassis
          tone="err"
          busy={printing}
          reduceMotion={reduceMotion}
        />
      </motion.div>

      <div className="relative w-[276px] max-w-full">
        <div style={{ filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.30))" }}>
          <PaperFeed
            duration={feed}
            delay={start}
            // Steady pull, a stall at ~60% as the gateway refuses, then a
            // short final push — the paper "jams" rather than running clean.
            keyframes={[0, 0.55, 0.58, 1]}
            times={[0, 0.45, 0.72, 1]}
            reduceMotion={reduceMotion}
            onDone={() => setPrinting(false)}>
            <div
              className="px-4 pt-4 pb-3 font-mono"
              style={{ backgroundColor: PAPER, color: INK }}>
              <div className="text-center">
                <div className="text-[11px] font-black tracking-[0.24em]">
                  FIND YOUR TREK
                </div>
                <div className="text-[7px] tracking-[0.2em] opacity-60 mt-1">
                  TRANSACTION RECORD
                </div>
              </div>

              <Perforation />
              {/* Printed content trails off — the slip never completed. */}
              <div className="space-y-[4px] py-0.5">
                {[94, 72, 86].map((w, i) => (
                  <div
                    key={i}
                    className="h-[3px] rounded-sm"
                    style={{
                      width: `${w}%`,
                      backgroundColor: "rgba(39,39,42,0.2)",
                    }}
                  />
                ))}
              </div>
              <Perforation />

              <div className="text-center text-[8px] font-black tracking-[0.14em] text-rose-600 py-1">
                ** TRANSACTION NOT COMPLETED **
              </div>
              <div className="flex justify-between text-[7.5px] opacity-60 pt-0.5">
                <span className="tracking-wider">STATUS</span>
                <span className="font-black text-rose-600">DECLINED</span>
              </div>

              {/* Cut short — no barcode, no total, no thank-you line. */}
              <div className="h-3" />
            </div>

            <svg
              viewBox="0 0 300 9"
              preserveAspectRatio="none"
              className="block w-full h-[9px]">
              <polygon points={tearPolygon()} fill={PAPER} />
            </svg>
          </PaperFeed>
        </div>

        {/* DECLINED stamp slamming onto the finished slip */}
        <motion.div
          initial={{ scale: 2.7, opacity: 0, rotate: -34 }}
          animate={{ scale: 1, opacity: 1, rotate: -13 }}
          transition={{
            delay: stampDelay,
            type: "spring",
            stiffness: 300,
            damping: 13,
          }}
          className="absolute left-1/2 bottom-8 -translate-x-1/2 z-20">
          <span
            className="block px-3 py-1 rounded-[3px] border-[3px] border-rose-600 text-rose-600 font-display font-black text-[15px] tracking-[0.2em]"
            style={{ opacity: 0.92 }}>
            DECLINED
          </span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: stampDelay + 0.25, duration: 0.3 }}
        className="w-full flex flex-col items-center pt-5">
        <h2 className="text-lg font-display font-black tracking-tight">
          Payment Failed
        </h2>
        <p className="text-xs text-zinc-500 max-w-[262px] mt-1.5 leading-relaxed">
          {message}
        </p>

        {/* Try Again returns to the checkout rather than firing the payment
            straight off the failure screen — the traveller gets to review the
            date, travellers and coupon before paying again. */}
        <div className="w-full max-w-xs space-y-2.5 mt-6">
          <button
            type="button"
            id="btn-payment-retry"
            onClick={onTryAgain}
            disabled={retrying}
            className={`w-full py-4 rounded-2xl font-display font-black text-xs uppercase tracking-wider border flex items-center justify-center gap-2 transition-all duration-300 active:scale-98 cursor-pointer ${
              darkMode
                ? "bg-rose-950/40 border-rose-500/50 text-rose-300 hover:bg-rose-950/70 hover:border-rose-400 shadow-lg shadow-rose-950/20"
                : "bg-rose-600 border-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-950/10"
            }`}>
            <RotateCw size={14} className={retrying ? "animate-spin" : ""} />
            {retrying ? "Opening PayU…" : "Try Again"}
          </button>

          <button
            type="button"
            id="btn-payment-go-home"
            onClick={onGoHome}
            className={`w-full py-3.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 cursor-pointer ${
              darkMode
                ? "bg-zinc-900/30 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50"
            }`}>
            <Home size={13} />
            Go to Home
          </button>
        </div>

        <p className="text-[10px] text-zinc-500 mt-4 max-w-[250px] leading-relaxed">
          {footnote}
        </p>
      </motion.div>
    </div>
  );
};

export default function BookingFlow({
  trip,
  currentUser,
  existingBookings,
  onCancel,
  onConfirmBooking,
  // Leaves the booking flow for the home tab. Distinct from onCancel, which
  // steps back to the trip the traveller came from.
  onGoHome,
  darkMode,
}) {
  const toast = useToast();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const resolvedUser = currentUser || loadUserState();
  const resolvedBookings = existingBookings || loadBookings();
  const [savedHikers, setSavedHikers] = useState(() =>
    loadSavedHikers(resolvedUser?.email, resolvedBookings, resolvedUser),
  );
  const [activeHikerDropdownIdx, setActiveHikerDropdownIdx] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveHikerDropdownIdx(null);
      }
    };
    if (activeHikerDropdownIdx !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [activeHikerDropdownIdx]);

  const handleSelectSavedHiker = (travelerIdx, savedHiker) => {
    const updated = [...travelersList];
    updated[travelerIdx] = {
      name: savedHiker.name,
      age: savedHiker.age ? String(savedHiker.age) : "",
      gender: savedHiker.gender || "Male",
      emergencyContact: savedHiker.emergencyContact || "",
    };
    setTravelersList(updated);
    setTravelerErrors((prev) => {
      const next = { ...prev };
      delete next[travelerIdx];
      return next;
    });
    setActiveHikerDropdownIdx(null);
    toast.success(`Autofilled ${savedHiker.name}'s details`);
  };

  const handleRemoveSavedHiker = (e, hikerName) => {
    e.stopPropagation();
    const email = resolvedUser?.email;
    const remaining = removeSavedHiker(email, hikerName);
    setSavedHikers(remaining);
    toast.info(`Removed ${hikerName} from saved hikers`);
  };

  // Single pickup boarding point this organizer supports. Legacy trips saved
  // before this existed (or with the older multi-location format) fall back
  // to the first pickup option or the trip's flat price.
  const pickup =
    trip.pickup ||
    (trip.pickupOptions?.[0]
      ? {
          location: trip.pickupOptions[0].location,
          price: trip.pickupOptions[0].price,
        }
      : null);
  // unitPrice is always the base trek price — pickup is a separate add-on
  const unitPrice = trip.price;

  // Batch pricing tiers configured by the organizer (Solo/Couple/Group/etc.),
  // each already a per-person rate. Falls back to a single implicit tier at
  // the flat per-person price above, for trips saved before tiered pricing
  // existed.
  const pricingTiers =
    trip.pricingTiers && trip.pricingTiers.length > 0
      ? trip.pricingTiers
      : [{ id: "standard", label: "Per Traveler", price: unitPrice }];

  // Pickup/transport is a flat per-person add-on layered on top of the
  // tiered trek price — only applied when real tiered pricing exists, so
  // the legacy fallback tier above (already the flat price) isn't double-counted.
  const pickupAddOn =
    trip.pricingTiers?.length > 0 && pickup ? pickup.price : 0;

  // How many people one "unit" of a tier represents, and the minimum group
  // size implied by the organizer's label — "Couple" books in pairs,
  // "Group of 4+" requires at least 4 travelers together.
  const getTierMeta = (tier) => {
    const lbl = tier.label.toLowerCase();
    if (lbl.includes("couple")) return { step: 2, min: 2 };
    const match = lbl.match(/(\d+)/);
    if (lbl.includes("group") && match)
      return { step: 1, min: parseInt(match[1], 10) };
    return { step: 1, min: 1 };
  };

  const [step, setStep] = useState(1);

  // Per-tier selected counts (people), keyed by tier id — lets a traveler
  // mix traveler types in one booking, e.g. 1 Couple + 2 Solo.
  const [tierCounts, setTierCounts] = useState(() => {
    const defaultTier =
      pricingTiers.find((t) => t.label.toLowerCase().includes("solo")) ||
      pricingTiers[0];
    return defaultTier
      ? { [defaultTier.id]: getTierMeta(defaultTier).min }
      : {};
  });

  // State variables for Wizard
  const [selectedDate, setSelectedDate] = useState(() => {
    const upcoming = trip.departureDates?.find((d) => d >= todayStr);
    return upcoming || trip.departureDates?.[0] || "";
  });
  const [travelersList, setTravelersList] = useState(() => {
    const lead = savedHikers[0] || {};
    const leadName = lead.name || resolvedUser?.name || "";
    return [
      {
        name: leadName,
        age: lead.age || resolvedUser?.age || 24,
        gender: lead.gender || resolvedUser?.gender || "Male",
        emergencyContact:
          lead.emergencyContact || resolvedUser?.mobile || "9876543210",
      },
    ];
  });
  const [travelerErrors, setTravelerErrors] = useState({}); // { [idx]: { [field]: message } }
  const travelerCardRefs = useRef({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(""); // applied code (display)
  const [appliedCouponData, setAppliedCouponData] = useState(null); // coupon object for client-side recompute
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [quickCoupons, setQuickCoupons] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Loyalty reward — an earned free-booking voucher, if any, can be applied
  // in place of payment at checkout. Capped by the admin's configured max
  // discount amount — the server re-derives and enforces this cap
  // independently, this is just the checkout preview.
  const [availableVoucher] = useState(() => getAvailableCustomerVoucher());
  const [useLoyaltyReward, setUseLoyaltyReward] = useState(false);
  const loyaltyMaxDiscount = loadLoyaltyConfig().customer.maxDiscountAmount;

  // Payment Options — the server decides whether checkout runs through PayU
  // ('online') or stays Pay on Arrival; until it answers, assume arrival.
  const [paymentMode, setPaymentMode] = useState("arrival");
  const isOnlinePayment = paymentMode === "online";
  const paymentGateway = isOnlinePayment
    ? "PayU secure checkout"
    : "Pay on Arrival";
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // An online booking created on the server but not yet paid — holding seats.
  // Lets "Try Again" open a fresh PayU transaction for it instead of booking
  // (and reserving seats) all over again.
  const [pendingBookingId, setPendingBookingId] = useState(null);
  const [retryingPayment, setRetryingPayment] = useState(false);
  // Set while confirming a payment after PayU redirects back into the app.
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  // PayU hasn't reported a final result yet (e.g. a UPI approval in flight).
  const [paymentStillPending, setPaymentStillPending] = useState(false);
  // The wizard's local selections don't survive the round trip to PayU, so the
  // receipt is drawn from the server's booking instead when this is set.
  const [restoredFromGateway, setRestoredFromGateway] = useState(false);
  const [paymentFinished, setPaymentFinished] = useState(false);
  const [bookingError, setBookingError] = useState("");
  // Takes over the step-3 checkout with the declined-receipt screen so the
  // failure (and the retry) is impossible to miss.
  const [paymentFailed, setPaymentFailed] = useState(false);

  // Constructed ticket fields once succeeded
  const [createdBooking, setCreatedBooking] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);

  // Departure batch dates this organizer has actually scheduled.
  //
  // This used to fall back to five hard-coded 2026 dates when a trip had none,
  // which made a trek with no batches look bookable and let the customer buy a
  // seat on a departure that does not exist. No dates now means no booking.
  const availableDates = trip.departureDates?.length ? trip.departureDates : [];

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
        departures.forEach((d) => {
          map[d.date] = d.availableSeats;
        });
        setSeatsByDate(map);
        setDeparturesLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setDeparturesLoaded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  // Seats remaining on a given date (null when unknown → don't gate on seats).
  const seatsForDate = (dateStr) =>
    dateStr in seatsByDate ? seatsByDate[dateStr] : null;
  const isSoldOut = (dateStr) => {
    const s = seatsForDate(dateStr);
    return s !== null && s <= 0;
  };
  const selectedSeatsLeft = selectedDate ? seatsForDate(selectedDate) : null;
  // The capacity the traveler-count steppers cap against: the selected
  // departure's live seats when known, else the trip-level number.
  const effectiveSeats =
    selectedSeatsLeft !== null ? selectedSeatsLeft : trip.availableSeats;

  // The only dates a customer may actually book: scheduled, still in the
  // future, and with seats left. Everything downstream gates on this — the
  // calendar, the default selection, and whether step 1 can be completed.
  const isBookableDate = (dateStr) =>
    !!dateStr &&
    availableDates.includes(dateStr) &&
    dateStr >= todayStr &&
    !isSoldOut(dateStr);
  const bookableDates = availableDates.filter(isBookableDate);
  // Wait for live seat data before declaring a trek unbookable, so a slow
  // request doesn't briefly accuse an organizer of having no departures.
  const hasNoDepartures =
    availableDates.length === 0 ||
    (departuresLoaded && bookableDates.length === 0);

  // Calendar states — open on the first upcoming departure's month, never on a
  // past month whose cells are all greyed out.
  const initialCalendarDate =
    selectedDate || availableDates.find((dt) => dt >= todayStr) || todayStr;
  const [calYear, setCalYear] = useState(() =>
    parseInt(initialCalendarDate.split("-")[0], 10),
  );
  const [calMonth, setCalMonth] = useState(
    () => parseInt(initialCalendarDate.split("-")[1], 10) - 1,
  );

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDayIndex = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(calMonth + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const dateStr = `${calYear}-${monthStr}-${dayStr}`;
      cells.push({ day, dateStr });
    }
    return cells;
  }, [calYear, calMonth, daysInMonth, firstDayIndex]);

  // Per-tier breakdown: how many people are booked at each tier's rate, and
  // the totals derived from it (mixing tiers is allowed, e.g. 1 Couple + 2 Solo).
  const tierBreakdown = pricingTiers.map((tier) => {
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
    const tier = pricingTiers.find((t) => t.id === tierId);
    const meta = getTierMeta(tier);
    setTierCounts((prev) => {
      const cur = prev[tierId] || 0;
      const next = cur === 0 ? meta.min : cur + meta.step;
      const others = travelersCount - cur;
      if (others + next > effectiveSeats) return prev;
      return { ...prev, [tierId]: next };
    });
  };

  const decrementTier = (tierId) => {
    const tier = pricingTiers.find((t) => t.id === tierId);
    const meta = getTierMeta(tier);
    setTierCounts((prev) => {
      const cur = prev[tierId] || 0;
      if (cur <= 0) return prev;
      const next = cur - meta.step;
      return { ...prev, [tierId]: next < meta.min ? 0 : next };
    });
  };

  // Clear the traveler selection whenever it no longer fits the chosen
  // departure — either it sold out, or the customer set a count against the
  // trip-level capacity and then picked a batch with fewer seats than that.
  // Resetting to 0 blocks Continue and makes them re-pick within the real cap.
  useEffect(() => {
    if (!departuresLoaded || travelersCount === 0) return;
    if (travelersCount > effectiveSeats) {
      setTierCounts({});
      toast.error(
        effectiveSeats <= 0
          ? "That departure is sold out — pick another date."
          : `Only ${effectiveSeats} seat${effectiveSeats === 1 ? "" : "s"} left on that date. Choose your travelers again.`,
      );
    }
  }, [departuresLoaded, effectiveSeats]);

  // Sync travelers count with list array size. Additional travelers start
  // blank (not a plausible-looking fake name/phone) — these go straight into
  // "emergency permits and environmental safety registers" for a real trek,
  // so a default that merely *looks* filled in is actively dangerous.
  useEffect(() => {
    if (travelersList.length < travelersCount) {
      const diff = travelersCount - travelersList.length;
      const additional = Array(diff)
        .fill(null)
        .map(() => ({
          name: "",
          age: "",
          gender: "Male",
          emergencyContact: "",
        }));
      setTravelersList([...travelersList, ...additional]);
    } else if (travelersList.length > travelersCount) {
      setTravelersList(travelersList.slice(0, travelersCount));
    }
  }, [travelersCount]);

  // Never pick a departure on the customer's behalf — choosing one is the
  // whole point of step 1, and a pre-filled date is a date nobody consciously
  // agreed to. This only ever *clears* a selection that has stopped being
  // valid (its batch sold out, or the date passed while the tab sat open).
  useEffect(() => {
    if (selectedDate && !isBookableDate(selectedDate)) setSelectedDate("");
  }, [departuresLoaded, availableDates.length, selectedDate]);

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
    setTravelerErrors((prev) => {
      if (!prev[idx]?.[field]) return prev;
      return { ...prev, [idx]: { ...prev[idx], [field]: "" } };
    });
  };

  // This info goes straight into "emergency permits and environmental safety
  // registers" for a real trek — required, not just for form completeness.
  // Returns the first invalid { idx, field, message }, or null if all clear.
  const validateTravelers = () => {
    for (let idx = 0; idx < travelersList.length; idx++) {
      const t = travelersList[idx];
      const label = `Traveler #${idx + 1}`;
      if (!t.name?.trim())
        return {
          idx,
          field: "name",
          message: `${label}: full name is required.`,
        };
      const age = Number(t.age);
      if (!t.age || Number.isNaN(age) || age < 12 || age > 90) {
        return {
          idx,
          field: "age",
          message: `${label}: age must be between 12 and 90.`,
        };
      }
      if (!t.gender)
        return {
          idx,
          field: "gender",
          message: `${label}: gender is required.`,
        };
      if (!isValidPhone(t.emergencyContact)) {
        return {
          idx,
          field: "emergencyContact",
          message: `${label}: ${PHONE_RULE_MESSAGE}`,
        };
      }
    }
    return null;
  };

  // Step 1 is mandatory: a real, in-future departure with enough seats must be
  // chosen before anything else. Enforced here as well as on the button, so
  // it holds however the step is advanced.
  const canProceedFromStep1 =
    isBookableDate(selectedDate) &&
    travelersCount > 0 &&
    travelersCount <= effectiveSeats;

  const handleContinue = () => {
    if (step === 1) {
      if (hasNoDepartures) {
        toast.error("This organizer has no upcoming departures for this trek.");
        return;
      }
      if (!isBookableDate(selectedDate)) {
        toast.error("Choose a departure date to continue.");
        return;
      }
      if (travelersCount < 1) {
        toast.error("Add at least one traveler to continue.");
        return;
      }
      if (travelersCount > effectiveSeats) {
        toast.error(
          `Only ${effectiveSeats} seat${effectiveSeats === 1 ? "" : "s"} left on this departure.`,
        );
        return;
      }
    }
    if (step === 2) {
      const error = validateTravelers();
      if (error) {
        setTravelerErrors({ [error.idx]: { [error.field]: error.message } });
        toast.error(error.message);
        const card = travelerCardRefs.current[error.idx];
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        card
          ?.querySelector(`[name="${error.field}"]`)
          ?.focus?.({ preventScroll: true });
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  // Up to 3 currently-active coupons (platform-wide + this trip's organizer
  // coupons), offered as quick-apply chips.
  useEffect(() => {
    let cancelled = false;
    couponsApi
      .listActive(trip.id)
      .then((list) => {
        if (!cancelled) setQuickCoupons(list.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const handleValidateCoupon = async (e) => {
    e.preventDefault();
    setCouponError("");
    setCouponSuccess("");

    try {
      const result = await couponsApi.validate(
        couponCode,
        baseCostTotal,
        trip.id,
      );
      if (result.ok) {
        // Store the coupon object so the discount recomputes client-side as the
        // booking amount changes (server stays the authority at booking time).
        setAppliedCoupon(result.coupon.code);
        setAppliedCouponData(result.coupon);
        setCouponSuccess(result.message);
        setShowConfetti(true);
      } else {
        setAppliedCoupon("");
        setAppliedCouponData(null);
        setCouponError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      setAppliedCoupon("");
      setAppliedCouponData(null);
      const message = err?.message || "Could not validate coupon.";
      setCouponError(message);
      toast.error(message);
    }
  };

  // Discount recomputed from the applied coupon against the live base cost
  // (re-checks the min-booking gate too, via computeDiscount).
  const appliedDiscountValue = appliedCouponData
    ? computeDiscount(appliedCouponData, baseCostTotal)
    : 0;
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

  useEffect(() => {
    let cancelled = false;
    bookingsApi
      .getPaymentConfig()
      .then((cfg) => {
        if (!cancelled && cfg?.mode) setPaymentMode(cfg.mode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Coming back from PayU: the backend has recorded whatever PayU posted and
  // redirected here with ?booking=…&payment=return. Poll the server (which also
  // asks PayU directly) until the booking settles one way or the other.
  const pollTimerRef = useRef(null);
  const checkPaymentResult = async (bookingId, attempt = 0) => {
    const MAX_ATTEMPTS = 20; // ~50s
    try {
      const { payment, bookingStatus } =
        await bookingsApi.getPaymentStatus(bookingId);

      if (payment.status === "paid" || payment.status === "not_required") {
        const booking = await bookingsApi.getMine(bookingId);
        setCreatedBooking(booking);
        setRestoredFromGateway(true);
        setPendingBookingId(null);
        setPaymentFailed(false);
        setPaymentStillPending(false);
        setVerifyingPayment(false);
        setPaymentFinished(true);
        setStep(4);
        return;
      }

      if (payment.status !== "pending" || bookingStatus === "Cancelled") {
        // The seat hold ran out (or the booking was cancelled) — nothing left
        // to pay for; the customer has to book again.
        setPendingBookingId(null);
        setBookingError(
          payment.failureReason ||
            "This booking is no longer awaiting payment. Please book again.",
        );
        setPaymentFailed(true);
        setPaymentStillPending(false);
        setVerifyingPayment(false);
        return;
      }

      if (payment.failedAt) {
        setPendingBookingId(bookingId);
        setBookingError(
          payment.failureReason || "Your payment was not completed.",
        );
        setPaymentFailed(true);
        setPaymentStillPending(false);
        setVerifyingPayment(false);
        return;
      }

      if (attempt + 1 >= MAX_ATTEMPTS) {
        setPendingBookingId(bookingId);
        setPaymentStillPending(true);
        setVerifyingPayment(false);
        return;
      }
    } catch (err) {
      if (attempt + 1 >= MAX_ATTEMPTS) {
        setPendingBookingId(bookingId);
        setPaymentStillPending(true);
        setVerifyingPayment(false);
        return;
      }
    }
    pollTimerRef.current = setTimeout(
      () => checkPaymentResult(bookingId, attempt + 1),
      2500,
    );
  };

  useEffect(() => {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return undefined;
    }
    const returnedBookingId = params.get("booking");
    if (params.get("payment") !== "return" || !returnedBookingId)
      return undefined;

    // Drop the query so a reload or back gesture doesn't re-run this.
    try {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname,
      );
    } catch {
      /* ignore */
    }

    setStep(3);
    setVerifyingPayment(true);
    setPendingBookingId(returnedBookingId);
    checkPaymentResult(returnedBookingId);
    return () => clearTimeout(pollTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pressing Back on PayU's page can restore this page from the back/forward
  // cache exactly as it was left — mid-redirect, with the Pay button disabled.
  // Put the checkout back in a usable state; the pending booking is still
  // there, so Pay offers a fresh PayU attempt for it.
  useEffect(() => {
    const onPageShow = (e) => {
      if (!e.persisted) return;
      setIsProcessingPayment(false);
      setRetryingPayment(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const startGatewayRedirect = (payment) => {
    // Leaves the app; PayU brings the customer back via the backend.
    redirectToPayU(payment.checkout);
  };

  const handleProcessPayment = async () => {
    // Already holding an unpaid online booking for this checkout (the customer
    // came back from PayU without paying) — pay for that one rather than
    // reserving a second set of seats.
    if (pendingBookingId && isOnlinePayment) {
      setIsProcessingPayment(true);
      try {
        const payment = await bookingsApi.retryPayment(pendingBookingId);
        startGatewayRedirect(payment);
        return;
      } catch {
        // No longer payable (expired or cancelled) — fall through and book afresh.
        setPendingBookingId(null);
      }
    }
    setIsProcessingPayment(true);

    try {
      // The server computes all pricing/commission authoritatively, reserves
      // the departure seats, and owns the bookingId — we send only the
      // selection and render what comes back. In online mode the booking comes
      // back pending, with the signed PayU form to redirect to.
      const { booking, payment } = await bookingsApi.checkout({
        tripId: trip.id,
        selectedDate,
        selections: tierBreakdown
          .filter((t) => t.count > 0)
          .map((t) => ({ id: t.id, label: t.label, count: t.count })),
        travelers: travelersList,
        couponCode: appliedCoupon || undefined,
        useLoyaltyReward,
      });

      // Persist newly entered / confirmed hikers for future auto-fill
      const validTravelers = travelersList.filter((t) => t.name?.trim());
      if (validTravelers.length > 0) {
        try {
          const nextSaved = mergeNewHikers(resolvedUser?.email, validTravelers);
          setSavedHikers(nextSaved);
        } catch (e) {
          console.error("[booking] failed to save hikers:", e);
        }
      }

      // Consume the client-side loyalty voucher (Phase 7 moves this server-side).
      if (useLoyaltyReward && availableVoucher) {
        markCustomerVoucherUsed(availableVoucher.id, booking.bookingId);
      }

      if (payment?.required) {
        setPendingBookingId(booking.bookingId);
        startGatewayRedirect(payment);
        return; // stay in the processing state while the browser navigates away
      }

      setPaymentFinished(true);
      setCreatedBooking(booking);
      setBookingError("");
      setPaymentFailed(false);
      setIsProcessingPayment(false);
      setStep(4); // Success is now Step 4
    } catch (err) {
      // The declined screen carries the message itself — a toast on top of a
      // full-screen takeover is just noise.
      setBookingError(
        err?.message ||
          "We could not confirm your reservation. Please try again.",
      );
      setPaymentFailed(true);
      setIsProcessingPayment(false);
    }
  };

  // Dismisses the declined screen and puts the traveller back on the checkout,
  // where they can review everything and press Pay again. After a PayU round
  // trip the wizard's selections are gone, so that means starting over.
  const handleReturnToCheckout = () => {
    setPaymentFailed(false);
    setPaymentStillPending(false);
    setBookingError("");
    if (restoredFromGateway || verifyingPayment) setStep(1);
  };

  // Try Again after a failed online payment: the booking still holds its seats,
  // so open a fresh PayU transaction for it rather than booking again.
  const handleRetryPayment = async () => {
    if (!pendingBookingId) return handleReturnToCheckout();
    setRetryingPayment(true);
    try {
      const payment = await bookingsApi.retryPayment(pendingBookingId);
      startGatewayRedirect(payment);
    } catch (err) {
      setRetryingPayment(false);
      setPendingBookingId(null);
      setBookingError(
        err?.message ||
          "This booking can no longer be paid for. Please book again.",
      );
      toast.error(err?.message || "Could not restart the payment.");
      setPaymentFailed(false);
      setPaymentStillPending(false);
      setStep(1);
    }
  };

  // Leaving a failed online checkout: release the held seats, coupon and
  // reward straight away instead of waiting for the hold to expire.
  const handleAbandonPayment = () => {
    if (pendingBookingId) bookingsApi.cancel(pendingBookingId).catch(() => {});
    setPendingBookingId(null);
    onGoHome?.();
  };

  // Renders the boarding pass off-screen and saves it locally as a PDF. It
  // rasterises the ticket, so it can take a moment — the button reports that
  // rather than appearing to do nothing.
  const handleSaveTicketPdf = async () => {
    if (!createdBooking || savingPdf) return;
    setSavingPdf(true);
    try {
      await downloadTicketPDF(createdBooking);
      toast.success("Ticket saved to your device.");
      setShowTicketModal(false);
    } catch (err) {
      toast.error(
        err?.message || "Could not generate the PDF. Please try again.",
      );
    } finally {
      setSavingPdf(false);
    }
  };

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    try {
      const d = new Date(selectedDate + "T00:00:00");
      return isNaN(d.getTime())
        ? selectedDate
        : d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const handleFinishAndReturn = () => {
    if (createdBooking) {
      onConfirmBooking(createdBooking);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col overflow-y-auto no-scrollbar font-sans relative ${
        darkMode ? "bg-zinc-950 text-white" : "bg-gray-50 text-zinc-900"
      }`}>
      {/* Confetti Popper layer */}
      {showConfetti && <ConfettiPopper />}

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col flex-1">
        {/* Dynamic wizard indicators header */}
        {step < 4 && (
          <div className="shrink-0 pb-4 mb-4 border-b border-zinc-800/10 dark:border-zinc-850">
            <div className="flex items-center justify-between">
              <button
                onClick={onCancel}
                className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back</span>
              </button>

              {/* Desktop Step Pills */}
              <div className="hidden sm:flex items-center gap-2">
                {[
                  { s: 1, label: "Expedition Details" },
                  { s: 2, label: "Traveler Coordinates" },
                  { s: 3, label: "Settlement & Payment" },
                ].map((it, idx) => (
                  <React.Fragment key={it.s}>
                    {idx > 0 && (
                      <div
                        className={`w-6 h-0.5 ${step >= it.s ? "bg-forest-500" : darkMode ? "bg-zinc-800" : "bg-zinc-300"}`}
                      />
                    )}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                        step === it.s
                          ? darkMode
                            ? "bg-forest-500/20 text-forest-400 border border-forest-500/40"
                            : "bg-forest-50 text-forest-700 border border-forest-200"
                          : step > it.s
                            ? "text-forest-500 opacity-90"
                            : darkMode
                              ? "text-zinc-500"
                              : "text-zinc-400"
                      }`}>
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                          step >= it.s
                            ? "bg-forest-500 text-white"
                            : darkMode
                              ? "bg-zinc-800 text-zinc-400"
                              : "bg-zinc-200 text-zinc-600"
                        }`}>
                        {step > it.s ? "✓" : it.s}
                      </span>
                      <span>{it.label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Mobile simplified indicator */}
              <div className="sm:hidden text-center">
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono block">
                  BOOKING ENGINE
                </span>
                <h3 className="text-xs font-display font-black text-forest-650 dark:text-forest-400">
                  Step {step} of 3
                </h3>
              </div>

              <div className="w-8 sm:w-16" />
            </div>

            {/* Progress visual horizontal track bar */}
            <div
              className={`w-full h-1 rounded-full mt-3 overflow-hidden select-none ${darkMode ? "bg-zinc-800" : "bg-zinc-200"}`}>
              <div
                className="h-full bg-forest-500 transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {step < 4 ? (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start flex-1 mt-2">
            {/* Main Forms Column */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-6">
              {/* Forms switcher viewport */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={paymentFailed ? "declined" : step}
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                  {/* Step 1: Select Date & Travelers Count */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-forest-500" size={18} />
                        <h2 className="text-base font-display font-black">
                          Expedition Details
                        </h2>
                      </div>

                      {/* No batches scheduled, or every one has passed or sold out. Say so
                plainly instead of showing a calendar where nothing is clickable. */}
                      {hasNoDepartures && (
                        <div
                          className={`p-4 rounded-2xl border text-center ${
                            darkMode
                              ? "bg-amber-950/20 border-amber-500/25"
                              : "bg-amber-50 border-amber-300/60"
                          }`}>
                          <Info
                            size={18}
                            className="mx-auto mb-2 text-amber-500"
                          />
                          <h3 className="text-xs font-display font-black mb-1">
                            No departures available
                          </h3>
                          <p
                            className={`text-[11px] leading-relaxed ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                            {availableDates.length === 0
                              ? "This organizer hasn’t scheduled any batches for this trek yet."
                              : "Every batch for this trek has either departed or sold out."}{" "}
                            Check another organizer, or come back once new dates
                            are posted.
                          </p>
                          <button
                            type="button"
                            id="btn-no-departures-back"
                            onClick={onCancel}
                            className={`mt-3.5 w-full py-2.5 rounded-xl text-[11px] font-bold border transition active:scale-95 cursor-pointer ${
                              darkMode
                                ? "bg-zinc-900/40 border-white/10 text-zinc-300 hover:bg-zinc-800/60"
                                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                            }`}>
                            Browse other organizers
                          </button>
                        </div>
                      )}

                      {/* 1. Date selection calendar */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-2">
                          Select Departure Date (Available Calendar Slots)
                        </label>

                        <div
                          className={`p-4 rounded-2xl border ${
                            darkMode
                              ? "bg-zinc-900/30 border-white/5"
                              : "bg-white border-zinc-200"
                          }`}>
                          {/* Header */}
                          <div className="flex items-center justify-between mb-4">
                            <button
                              type="button"
                              onClick={prevMonth}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center border active:scale-95 transition cursor-pointer ${
                                darkMode
                                  ? "bg-zinc-950/60 border-white/5 hover:bg-zinc-900 text-zinc-300"
                                  : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700"
                              }`}>
                              <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-black font-display tracking-tight text-center flex-1">
                              {monthNames[calMonth]} {calYear}
                            </span>
                            <button
                              type="button"
                              onClick={nextMonth}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center border active:scale-95 transition cursor-pointer ${
                                darkMode
                                  ? "bg-zinc-950/60 border-white/5 hover:bg-zinc-900 text-zinc-300"
                                  : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700"
                              }`}>
                              <ChevronRight size={16} />
                            </button>
                          </div>

                          {/* Weekdays */}
                          <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {dayNames.map((day) => (
                              <span
                                key={day}
                                className="text-[9px] font-bold uppercase opacity-40">
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

                              const isAvailable = availableDates.includes(
                                cell.dateStr,
                              );
                              const isPast = cell.dateStr < todayStr;
                              const soldOut =
                                isAvailable && isSoldOut(cell.dateStr);
                              const isSelectable =
                                isAvailable && !isPast && !soldOut;
                              const isSelected = selectedDate === cell.dateStr;

                              return (
                                <button
                                  key={cell.dateStr}
                                  type="button"
                                  disabled={!isSelectable}
                                  title={soldOut ? "Sold out" : undefined}
                                  onClick={() => setSelectedDate(cell.dateStr)}
                                  className={`relative h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                                    isSelectable
                                      ? isSelected
                                        ? darkMode
                                          ? "bg-forest-500 text-white font-black shadow-md border border-forest-400 cursor-pointer"
                                          : "bg-forest-600 text-white font-black shadow-md cursor-pointer"
                                        : darkMode
                                          ? "bg-forest-950/30 border border-forest-500/30 text-forest-400 hover:bg-forest-900/50 hover:border-forest-500/60 font-bold cursor-pointer"
                                          : "bg-forest-50 border border-forest-500/20 text-forest-700 hover:bg-forest-100/70 hover:border-forest-500/50 font-bold cursor-pointer"
                                      : soldOut
                                        ? darkMode
                                          ? "text-zinc-600 line-through opacity-45 cursor-not-allowed"
                                          : "text-zinc-400 line-through opacity-60 cursor-not-allowed"
                                        : darkMode
                                          ? "text-zinc-650 opacity-20 cursor-not-allowed"
                                          : "text-zinc-300 opacity-40 cursor-not-allowed"
                                  }`}>
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
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    selectedSeatsLeft <= 3
                                      ? "bg-rose-500/10 text-rose-500"
                                      : "bg-forest-500/10 text-forest-600 dark:text-forest-400"
                                  }`}>
                                  {selectedSeatsLeft} seat
                                  {selectedSeatsLeft === 1 ? "" : "s"} left
                                </span>
                              )}
                            </span>
                            <span className="font-bold text-forest-600 dark:text-forest-400">
                              {new Date(
                                selectedDate + "T00:00:00",
                              ).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}

                        {/* Nothing is selected by default, so say what to do — otherwise
                  the disabled Continue button has no visible explanation. */}
                        {!selectedDate && !hasNoDepartures && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium px-1 text-amber-600 dark:text-amber-400">
                            <Info size={12} className="shrink-0" />
                            Pick a highlighted departure date to continue.
                          </div>
                        )}
                      </div>

                      {/* 1b. Pickup location — fixed, single boarding point set by the organizer */}
                      {pickup && (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-2">
                            Pickup Location
                          </label>
                          <div
                            className={`p-2.5 rounded-xl flex items-center justify-between border ${
                              darkMode
                                ? "bg-zinc-900/30 border-white/5 text-zinc-300"
                                : "bg-white border-zinc-200 text-zinc-700"
                            }`}>
                            <div className="flex items-center gap-2.5">
                              <Bus size={14} className="text-forest-500" />
                              <span className="text-[11px] font-bold font-sans">
                                Ex-{pickup.location}
                              </span>
                            </div>
                            <span className="text-xs font-black font-sans text-forest-600 dark:text-forest-400">
                              ₹{pickup.price}/person
                            </span>
                          </div>
                          {pickupAddOn > 0 && (
                            <p className="text-[9px] text-zinc-500 mt-1.5 pl-1">
                              Added on top of each traveler's batch price below.
                            </p>
                          )}
                        </div>
                      )}

                      {/* 2. Traveler type & count — mix Solo/Couple/Group (or whatever
                tiers the organizer configured), each priced independently */}
                      <div
                        className={`p-3 rounded-xl border space-y-3 ${darkMode ? "bg-zinc-900/30 border-white/5" : "bg-white border-zinc-200"}`}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold flex items-center gap-1.5">
                            <Users size={14} className="text-forest-500" />{" "}
                            Traveler Type & Count
                          </h3>
                          <span className="text-[9px] text-zinc-500">
                            Seats Left: {effectiveSeats}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {tierBreakdown.map((tier) => {
                            const meta = getTierMeta(tier);
                            const nextIfIncremented =
                              tier.count === 0
                                ? meta.min
                                : tier.count + meta.step;
                            const wouldExceedCapacity =
                              travelersCount - tier.count + nextIfIncremented >
                              effectiveSeats;
                            return (
                              <div
                                key={tier.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                  darkMode
                                    ? "bg-zinc-950/40 border-white/5"
                                    : "bg-zinc-50 border-zinc-100"
                                }`}>
                                <div className="min-w-0">
                                  <span className="text-[11px] font-bold block truncate">
                                    {tier.label}
                                  </span>
                                  <span className="text-[9px] text-zinc-500">
                                    ₹{tier.perPersonPrice}/person
                                    {meta.step === 2
                                      ? " · booked in pairs"
                                      : meta.min > 1
                                        ? ` · min ${meta.min} travelers`
                                        : ""}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={tier.count === 0}
                                    onClick={() => decrementTier(tier.id)}
                                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold transition ${
                                      tier.count === 0
                                        ? "border-zinc-800 text-zinc-400 cursor-not-allowed"
                                        : "border-forest-500 text-forest-500 hover:bg-forest-500/10 cursor-pointer"
                                    }`}>
                                    -
                                  </button>

                                  <span className="text-sm font-black font-mono w-5 text-center">
                                    {tier.count}
                                  </span>

                                  <button
                                    type="button"
                                    disabled={wouldExceedCapacity}
                                    onClick={() => incrementTier(tier.id)}
                                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold transition ${
                                      wouldExceedCapacity
                                        ? "border-zinc-800 text-zinc-400 cursor-not-allowed"
                                        : "border-forest-500 text-forest-500 hover:bg-forest-500/10 cursor-pointer"
                                    }`}>
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {travelersCount === 0 && (
                          <p className="text-[10px] text-rose-500 font-semibold">
                            Select at least one traveler type to continue.
                          </p>
                        )}

                        <div className="pt-2.5 border-t border-zinc-800/10 dark:border-zinc-800/40 flex justify-between items-center text-[10px]">
                          <span className="opacity-60">
                            {travelersCount} traveler
                            {travelersCount === 1 ? "" : "s"} selected
                          </span>
                          <span className="font-extrabold text-forest-600 dark:text-forest-400">
                            Estimated Cost: ₹{baseCostTotal}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl flex gap-2 ${darkMode ? "bg-zinc-900/10" : "bg-white shadow-xs"}`}>
                        <Info
                          size={14}
                          className="text-spy-orange shrink-0 mt-0.5"
                        />
                        <p className="text-[9.5px] leading-relaxed text-zinc-400">
                          Weather conditions are monitored by organizers. Dates
                          can be rescheduled at zero fee in case of warning
                          alerts.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Add Traveler Details */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="text-forest-500" size={18} />
                        <h2 className="text-base font-display font-black">
                          Traveler Coordinates
                        </h2>
                      </div>
                      <p className="text-xs text-zinc-500 pb-1">
                        Details needed for emergency permits and environmental
                        safety registers:
                      </p>

                      <div className="space-y-4">
                        {travelersList.map((tr, idx) => {
                          const err = travelerErrors[idx] || {};
                          const fieldCls = (field) =>
                            `w-full text-xs px-3 py-2.5 rounded-xl border outline-hidden focus:border-forest-500 ${
                              err[field]
                                ? "border-red-500 focus:border-red-500"
                                : darkMode
                                  ? "bg-zinc-950 border-zinc-800 text-white"
                                  : "bg-gray-100 border-gray-200"
                            } ${err[field] && darkMode ? "bg-zinc-950" : ""}`;
                          return (
                            <div
                              key={idx}
                              ref={(el) => (travelerCardRefs.current[idx] = el)}
                              className={`p-4 rounded-2xl space-y-3 relative ${
                                darkMode
                                  ? "bg-zinc-900/60 border border-white/5"
                                  : "bg-white border border-gray-150 shadow-xs"
                              }`}>
                              <span className="absolute -top-2.5 left-4 bg-forest-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                                TRAVELER #{idx + 1}
                                {travelerTierLabels[idx]
                                  ? ` · ${travelerTierLabels[idx]}`
                                  : ""}
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* Name field with Saved Hikers Auto-Fill */}
                                <div className="space-y-1 sm:col-span-2 relative">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                      Full Name *
                                    </label>
                                    {savedHikers.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveHikerDropdownIdx(
                                            activeHikerDropdownIdx === idx
                                              ? null
                                              : idx,
                                          )
                                        }
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest-500 hover:text-forest-400 transition-colors">
                                        <UserCheck size={11} />
                                        Saved Hikers ({savedHikers.length})
                                      </button>
                                    )}
                                  </div>

                                  <input
                                    type="text"
                                    name="name"
                                    required
                                    autoComplete="off"
                                    placeholder="e.g. Aman Verma"
                                    value={tr.name}
                                    onFocus={() => {
                                      if (savedHikers.length > 0) {
                                        setActiveHikerDropdownIdx(idx);
                                      }
                                    }}
                                    onChange={(e) => {
                                      handleTravelerFieldChange(
                                        idx,
                                        "name",
                                        e.target.value,
                                      );
                                      if (
                                        savedHikers.length > 0 &&
                                        activeHikerDropdownIdx !== idx
                                      ) {
                                        setActiveHikerDropdownIdx(idx);
                                      }
                                    }}
                                    className={fieldCls("name")}
                                  />

                                  {/* Quick fill chips */}
                                  {savedHikers.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                      <span
                                        className={`text-[9px] font-medium ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                                        Quick fill:
                                      </span>
                                      {savedHikers
                                        .slice(0, 3)
                                        .map((sh, sIdx) => (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onClick={() =>
                                              handleSelectSavedHiker(idx, sh)
                                            }
                                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-all inline-flex items-center gap-1 ${
                                              darkMode
                                                ? "bg-zinc-800 text-zinc-200 hover:bg-forest-900/60 hover:text-forest-300 border border-white/10"
                                                : "bg-gray-100 text-gray-700 hover:bg-forest-50 hover:text-forest-700 border border-gray-200"
                                            }`}>
                                            <span className="text-forest-500 font-bold">
                                              +
                                            </span>
                                            {sh.name}
                                          </button>
                                        ))}
                                    </div>
                                  )}

                                  {/* Saved Hikers Suggestions Dropdown Popover */}
                                  {activeHikerDropdownIdx === idx &&
                                    savedHikers.length > 0 && (
                                      <div
                                        ref={dropdownRef}
                                        className={`absolute left-0 right-0 top-[calc(100%-8px)] mt-2 z-40 rounded-xl shadow-2xl border overflow-hidden max-h-56 overflow-y-auto ${
                                          darkMode
                                            ? "bg-zinc-900 border-zinc-700 divide-zinc-800"
                                            : "bg-white border-gray-200 divide-gray-100"
                                        }`}>
                                        <div
                                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-b ${
                                            darkMode
                                              ? "bg-zinc-950/80 text-zinc-400 border-zinc-800"
                                              : "bg-gray-50 text-gray-500 border-gray-150"
                                          }`}>
                                          <span className="inline-flex items-center gap-1">
                                            <UserCheck
                                              size={11}
                                              className="text-forest-500"
                                            />
                                            Click to Autofill All Details
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setActiveHikerDropdownIdx(null)
                                            }
                                            className={`${darkMode ? "text-zinc-400 hover:text-zinc-200" : "text-gray-400 hover:text-gray-600"}`}>
                                            <X size={12} />
                                          </button>
                                        </div>

                                        {(() => {
                                          const query = (tr.name || "")
                                            .trim()
                                            .toLowerCase();
                                          const matches = query
                                            ? savedHikers.filter(
                                                (sh) =>
                                                  sh.name
                                                    .toLowerCase()
                                                    .includes(query) ||
                                                  (sh.emergencyContact &&
                                                    sh.emergencyContact.includes(
                                                      query,
                                                    )),
                                              )
                                            : savedHikers;

                                          if (matches.length === 0) {
                                            return (
                                              <div
                                                className={`p-3 text-center text-xs ${darkMode ? "text-zinc-400" : "text-gray-500"}`}>
                                                No saved hiker matches "
                                                {tr.name}". Fill out the fields
                                                to save this hiker for next
                                                time.
                                              </div>
                                            );
                                          }

                                          return matches.map((sh, shIdx) => (
                                            <div
                                              key={shIdx}
                                              onClick={() =>
                                                handleSelectSavedHiker(idx, sh)
                                              }
                                              className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors border-b last:border-b-0 ${
                                                darkMode
                                                  ? "hover:bg-forest-950/40 border-zinc-800/60"
                                                  : "hover:bg-forest-50/70 border-gray-100"
                                              }`}>
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                  className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                                                    darkMode
                                                      ? "bg-forest-900/60 text-forest-300"
                                                      : "bg-forest-600/20 text-forest-600"
                                                  }`}>
                                                  {sh.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                  <p
                                                    className={`text-xs font-bold truncate ${
                                                      darkMode
                                                        ? "text-white"
                                                        : "text-gray-900"
                                                    }`}>
                                                    {sh.name}
                                                  </p>
                                                  <p
                                                    className={`text-[10px] flex items-center gap-1.5 flex-wrap ${
                                                      darkMode
                                                        ? "text-zinc-400"
                                                        : "text-gray-500"
                                                    }`}>
                                                    {sh.age && (
                                                      <span>{sh.age} yrs</span>
                                                    )}
                                                    {sh.age && sh.gender && (
                                                      <span>•</span>
                                                    )}
                                                    {sh.gender && (
                                                      <span>{sh.gender}</span>
                                                    )}
                                                    {sh.emergencyContact && (
                                                      <>
                                                        <span>•</span>
                                                        <span>
                                                          📞{" "}
                                                          {sh.emergencyContact}
                                                        </span>
                                                      </>
                                                    )}
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                <span
                                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                    darkMode
                                                      ? "text-forest-400 bg-forest-950/70 border-forest-500/30"
                                                      : "text-forest-600 bg-forest-50 border-forest-500/20"
                                                  }`}>
                                                  Autofill
                                                </span>
                                                <button
                                                  type="button"
                                                  title="Remove from saved"
                                                  onClick={(e) =>
                                                    handleRemoveSavedHiker(
                                                      e,
                                                      sh.name,
                                                    )
                                                  }
                                                  className={`p-1 rounded-md transition-colors ${
                                                    darkMode
                                                      ? "text-zinc-400 hover:text-red-400 hover:bg-red-950/40"
                                                      : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                  }`}>
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    )}

                                  {err.name && (
                                    <p className="text-[10px] font-semibold text-red-500">
                                      {err.name}
                                    </p>
                                  )}
                                </div>

                                {/* Age */}
                                <div className="space-y-1 min-w-0">
                                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                    Age *
                                  </label>
                                  <input
                                    type="number"
                                    name="age"
                                    min={12}
                                    max={90}
                                    placeholder="24"
                                    value={tr.age}
                                    onChange={(e) =>
                                      handleTravelerFieldChange(
                                        idx,
                                        "age",
                                        e.target.value,
                                      )
                                    }
                                    className={fieldCls("age")}
                                  />
                                  {err.age && (
                                    <p className="text-[10px] font-semibold text-red-500">
                                      {err.age}
                                    </p>
                                  )}
                                </div>

                                {/* Gender */}
                                <div className="space-y-1 min-w-0">
                                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                    Gender *
                                  </label>
                                  <select
                                    name="gender"
                                    value={tr.gender}
                                    onChange={(e) =>
                                      handleTravelerFieldChange(
                                        idx,
                                        "gender",
                                        e.target.value,
                                      )
                                    }
                                    className={fieldCls("gender")}>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                  </select>
                                  {err.gender && (
                                    <p className="text-[10px] font-semibold text-red-500">
                                      {err.gender}
                                    </p>
                                  )}
                                </div>

                                {/* Emergency Contact */}
                                <div className="space-y-1 sm:col-span-2">
                                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                    Emergency Phone *
                                  </label>
                                  <input
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel-national"
                                    name="emergencyContact"
                                    placeholder="e.g. 9876543210 or +14155552671"
                                    maxLength={PHONE_MAX_DIGITS + 1}
                                    value={tr.emergencyContact}
                                    onChange={(e) =>
                                      handleTravelerFieldChange(
                                        idx,
                                        "emergencyContact",
                                        sanitizePhoneInput(e.target.value),
                                      )
                                    }
                                    className={fieldCls("emergencyContact")}
                                  />
                                  {err.emergencyContact && (
                                    <p className="text-[10px] font-semibold text-red-500">
                                      {err.emergencyContact}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Payment declined — takes over the checkout until retried */}
                  {step === 3 && paymentFailed && (
                    <PaymentFailedScreen
                      message={bookingError}
                      onTryAgain={
                        pendingBookingId
                          ? handleRetryPayment
                          : handleReturnToCheckout
                      }
                      onGoHome={
                        pendingBookingId ? handleAbandonPayment : onGoHome
                      }
                      retrying={retryingPayment}
                      footnote={
                        pendingBookingId
                          ? "Your seats are held for a few more minutes. If any amount was debited, it will be refunded automatically by your bank."
                          : undefined
                      }
                      darkMode={darkMode}
                    />
                  )}

                  {/* Back from PayU — confirming the result, or PayU hasn't settled it yet */}
                  {step === 3 &&
                    !paymentFailed &&
                    (verifyingPayment || paymentStillPending) && (
                      <div
                        className="py-10 flex flex-col items-center text-center space-y-4"
                        id="payment-verification-panel">
                        {verifyingPayment ? (
                          <>
                            <div className="w-10 h-10 rounded-full border-[3px] border-spy-orange border-t-transparent animate-spin" />
                            <h2 className="text-base font-display font-black">
                              Confirming your payment…
                            </h2>
                            <p className="text-xs text-zinc-500 max-w-[280px] leading-relaxed">
                              Checking the result with PayU. Please don't close
                              this page.
                            </p>
                          </>
                        ) : (
                          <>
                            <Clock size={34} className="text-spy-orange" />
                            <h2 className="text-base font-display font-black">
                              Payment is still processing
                            </h2>
                            <p className="text-xs text-zinc-500 max-w-[290px] leading-relaxed">
                              PayU hasn't confirmed this payment yet. If money
                              was debited, your booking will be confirmed
                              automatically and appear in My Bookings shortly.
                            </p>
                            <div className="w-full max-w-xs space-y-2.5 pt-2">
                              <button
                                type="button"
                                id="btn-payment-check-again"
                                onClick={() => {
                                  setPaymentStillPending(false);
                                  setVerifyingPayment(true);
                                  checkPaymentResult(pendingBookingId);
                                }}
                                className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider border border-spy-orange bg-spy-orange text-white flex items-center justify-center gap-2 cursor-pointer">
                                <RotateCw size={13} /> Check Again
                              </button>
                              <button
                                type="button"
                                onClick={onGoHome}
                                className={`w-full py-3.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer ${
                                  darkMode
                                    ? "bg-zinc-900/30 border-white/5 text-zinc-400"
                                    : "bg-white border-zinc-200 text-zinc-650"
                                }`}>
                                <Home size={13} /> Go to Home
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                  {/* Step 3: Checkout & Payment with Coupon */}
                  {step === 3 &&
                    !paymentFailed &&
                    !verifyingPayment &&
                    !paymentStillPending && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="text-forest-500" size={18} />
                          <h2 className="text-base font-display font-black">
                            Checkout & Settlement
                          </h2>
                        </div>

                        {/* Loyalty reward — an earned free-booking voucher, if any */}
                        {availableVoucher && (
                          <div
                            className={`p-3.5 rounded-2xl border-2 border-dashed ${
                              useLoyaltyReward
                                ? "border-emerald-500 bg-emerald-500/10"
                                : darkMode
                                  ? "border-emerald-500/30 bg-emerald-500/5"
                                  : "border-emerald-400/50 bg-emerald-50/60"
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
                                  You've earned a reward through Find Your Trek
                                  Loyalty Rewards — up to ₹
                                  {effectiveLoyaltyDiscount} off this booking
                                  {baseCostTotal > loyaltyMaxDiscount
                                    ? ", with the remainder payable."
                                    : ", making it free."}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              id="btn-toggle-loyalty-reward"
                              onClick={() =>
                                setUseLoyaltyReward((prev) => !prev)
                              }
                              className={`w-full mt-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                useLoyaltyReward
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : darkMode
                                    ? "bg-zinc-900 border border-emerald-500/30 text-emerald-400 hover:bg-zinc-850"
                                    : "bg-white border border-emerald-400/60 text-emerald-600 hover:bg-emerald-50"
                              }`}>
                              {useLoyaltyReward
                                ? `✓ ₹${loyaltyDiscountValue} Reward Applied — Tap to Remove`
                                : `Apply Reward (up to ₹${effectiveLoyaltyDiscount} off)`}
                            </button>
                          </div>
                        )}

                        {/* Promo coupon inline input — hidden while a free reward is applied */}
                        {!useLoyaltyReward && (
                          <div
                            className={`p-3 rounded-2xl border ${
                              darkMode
                                ? "bg-zinc-900/40 border-white/5"
                                : "bg-white border-zinc-200/60 shadow-xs"
                            } space-y-2`}>
                            <span className="text-[9px] uppercase font-bold tracking-wider opacity-65 flex items-center gap-1">
                              <Ticket size={11} className="text-forest-505" />{" "}
                              Redeem Promo Coupon
                            </span>
                            <form
                              onSubmit={handleValidateCoupon}
                              className="flex gap-2">
                              <input
                                type="text"
                                placeholder="CODE (e.g. FYT20)"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                className={`flex-1 text-xs px-3 py-2.5 border rounded-xl outline-hidden focus:border-forest-500 uppercase tracking-widest ${
                                  darkMode
                                    ? "bg-zinc-950 border-zinc-800 text-white"
                                    : "bg-gray-50 border-gray-200 text-zinc-850"
                                }`}
                              />
                              <button
                                type="submit"
                                id="btn-apply-coupon"
                                className="bg-forest-600 hover:bg-forest-700 text-white text-xs font-bold px-3.5 rounded-xl cursor-pointer transition active:scale-95">
                                Apply
                              </button>
                            </form>

                            {couponError && (
                              <span className="text-[10px] font-bold text-rose-500 block pl-1">
                                {couponError}
                              </span>
                            )}
                            {couponSuccess && (
                              <span className="text-[10px] font-bold text-emerald-400 block pl-1 flex items-center gap-1">
                                <Sparkles
                                  size={10}
                                  className="animate-spin text-spy-orange"
                                />{" "}
                                {couponSuccess}
                              </span>
                            )}

                            {!appliedCoupon && quickCoupons.length > 0 && (
                              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                                {quickCoupons.map((cp) => (
                                  <button
                                    key={cp.id}
                                    type="button"
                                    onClick={() => {
                                      setCouponCode(cp.code);
                                    }}
                                    className={`text-[8.5px] font-bold px-2 py-1 rounded-md border border-dashed transition ${
                                      darkMode
                                        ? "border-zinc-700 text-zinc-400 bg-zinc-950/45 hover:bg-zinc-900"
                                        : "border-gray-300 text-zinc-650 bg-gray-50 hover:bg-gray-100"
                                    }`}>
                                    Use {cp.code}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Real Checkout Detail card */}
                        <div
                          className={`p-4 rounded-2xl space-y-3 border ${
                            darkMode
                              ? "bg-zinc-900 border-white/5"
                              : "bg-white border-zinc-200/60 shadow-xs"
                          }`}>
                          <div className="space-y-1.5">
                            {tierBreakdown
                              .filter((t) => t.count > 0)
                              .map((t) => (
                                <div
                                  key={t.id}
                                  className="flex justify-between text-xs">
                                  <span className="opacity-70">
                                    {t.label} × {t.count}
                                  </span>
                                  <span className="font-sans font-bold text-zinc-700 dark:text-zinc-300">
                                    ₹{t.subtotal}
                                  </span>
                                </div>
                              ))}
                          </div>

                          {appliedCoupon && !useLoyaltyReward && (
                            <div className="flex justify-between text-xs text-rose-500 font-bold">
                              <span>Coupon Discount ({appliedCoupon})</span>
                              <span className="font-sans">
                                -₹{appliedDiscountValue}
                              </span>
                            </div>
                          )}

                          {useLoyaltyReward && (
                            <div className="flex justify-between text-xs text-emerald-500 font-bold">
                              <span className="flex items-center gap-1">
                                <Gift size={11} /> Loyalty Reward (up to ₹
                                {effectiveLoyaltyDiscount})
                              </span>
                              <span className="font-sans">
                                -₹{loyaltyDiscountValue}
                              </span>
                            </div>
                          )}

                          {/* Tax is included in trip price — no separate tax line shown */}

                          <hr className="my-1 border-dashed border-zinc-200 dark:border-zinc-800" />

                          <div className="flex justify-between text-sm font-bold pt-1">
                            <span className="text-forest-600 dark:text-forest-400">
                              {isOnlinePayment
                                ? "Total Payable"
                                : "Payable on Arrival"}
                            </span>
                            <span
                              className={`font-sans font-black text-base ${darkMode ? "text-emerald-450" : "text-emerald-700"}`}>
                              ₹{finalPayAmount}
                            </span>
                          </div>
                        </div>

                        {/* Secure payment partner logo info */}
                        <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] opacity-75 font-semibold text-zinc-500">
                          <ShieldCheck
                            size={12}
                            className="text-forest-600 dark:text-forest-400"
                          />
                          <span>
                            {isOnlinePayment
                              ? "Secured by PayU • UPI, Cards, Netbanking & Wallets"
                              : "Pay on Arrival at Base Camp • Instantly Credited to Organizer Wallet"}
                          </span>
                        </div>

                        {isProcessingPayment && (
                          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/35 flex items-center justify-center gap-3">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-spy-orange border-t-transparent animate-spin" />
                            <span className="text-xs font-semibold text-spy-orange">
                              {isOnlinePayment && finalPayAmount > 0
                                ? "Redirecting to PayU secure checkout..."
                                : `Confirming reservation with ${paymentGateway}...`}
                            </span>
                          </div>
                        )}

                        {bookingError && (
                          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs font-semibold text-rose-500 text-center">
                            {bookingError}
                          </div>
                        )}
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
                      onClick={() => setStep((prev) => prev - 1)}
                      className={`w-24 py-3.5 text-xs font-bold rounded-2xl border text-center transition-all duration-300 active:scale-95 cursor-pointer ${
                        darkMode
                          ? "bg-zinc-900/30 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                          : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 hover:border-zinc-300"
                      }`}>
                      Back
                    </button>
                  )}

                  <button
                    type="button"
                    id={`btn-booking-step-${step}-continue`}
                    disabled={step === 1 && !canProceedFromStep1}
                    onClick={handleContinue}
                    className={`flex-1 py-3.5 rounded-2xl font-display font-black text-xs uppercase tracking-wider border backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-1.5 ${
                      step === 1 && !canProceedFromStep1
                        ? "opacity-40 cursor-not-allowed border-zinc-700 text-zinc-500"
                        : darkMode
                          ? "bg-zinc-900/45 border-forest-300/35 text-forest-300 hover:bg-zinc-900/70 hover:border-forest-300/70 shadow-lg shadow-forest-900/10 cursor-pointer"
                          : "bg-white/60 border-forest-500/30 text-forest-700 hover:bg-white/90 hover:border-forest-500/60 shadow-md shadow-forest-950/5 cursor-pointer"
                    }`}>
                    Continue
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {step === 3 &&
                !paymentFailed &&
                !verifyingPayment &&
                !paymentStillPending && (
                  <div className="pt-6 border-t border-zinc-800/10 dark:border-zinc-850 flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className={`w-24 py-4 text-xs font-bold rounded-2xl border text-center transition-all duration-300 active:scale-95 cursor-pointer ${
                        darkMode
                          ? "bg-zinc-900/30 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                          : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50"
                      }`}>
                      Back
                    </button>
                    <button
                      type="button"
                      id="btn-pay-and-confirm"
                      disabled={isProcessingPayment}
                      onClick={handleProcessPayment}
                      className={`flex-1 py-4 rounded-2xl font-display font-black text-xs uppercase tracking-wider border backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${
                        isProcessingPayment
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      } ${
                        useLoyaltyReward
                          ? darkMode
                            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60 hover:border-emerald-400 shadow-lg shadow-emerald-900/10"
                            : "bg-emerald-50/60 border-emerald-500/30 text-emerald-700 hover:bg-emerald-100/90 hover:border-emerald-500 shadow-md shadow-emerald-950/5"
                          : darkMode
                            ? "bg-spy-orange/20 border-spy-orange/50 text-spy-orange hover:bg-spy-orange/30 shadow-lg cursor-pointer"
                            : "bg-spy-orange border-spy-orange text-white hover:bg-orange-600 shadow-md cursor-pointer"
                      }`}>
                      {finalPayAmount === 0 ? (
                        <>
                          Confirm Free Booking <Gift size={14} />
                        </>
                      ) : (
                        <>
                          Pay ₹{finalPayAmount} <ShieldCheck size={14} />
                        </>
                      )}
                    </button>
                  </div>
                )}
            </div>

            {/* Sticky Expedition Summary Card on Desktop */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-6">
              <div
                className={`rounded-2xl border p-5 space-y-4 shadow-sm ${
                  darkMode
                    ? "bg-zinc-900/70 border-white/10 text-white"
                    : "bg-white border-zinc-200 text-zinc-900"
                }`}>
                {/* Trip thumbnail and title */}
                <div className="flex gap-3 items-center">
                  <img
                    src={
                      trip.coverImage ||
                      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={trip.name}
                    className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest-500/15 text-forest-400 mb-1">
                      {trip.difficulty || "Moderate"} · {trip.duration || 3}D/
                      {trip.nights || 2}N
                    </span>
                    <h3 className="text-sm font-display font-black leading-tight truncate">
                      {trip.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="text-spy-orange shrink-0" />
                      {trip.location || "Himalayas"}, {trip.state || "India"}
                    </p>
                  </div>
                </div>

                {/* Organizer mini row */}
                {trip.organizer && (
                  <div
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs ${
                      darkMode
                        ? "bg-zinc-950/60 border border-white/5"
                        : "bg-gray-50 border border-gray-150"
                    }`}>
                    <img
                      src={
                        trip.organizer.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(trip.organizer.name || "Organizer")}&background=02542D&color=fff&bold=true`
                      }
                      alt={trip.organizer.name}
                      className="w-8 h-8 rounded-full object-cover border border-forest-500/40 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold truncate">
                        {trip.organizer.name}
                        {trip.organizer.verified && (
                          <ShieldCheck
                            size={11}
                            className="text-emerald-400 fill-emerald-400/20 shrink-0"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-amber-500">
                        <Star size={10} className="fill-amber-400 shrink-0" />
                        <span>{trip.organizer.rating || 4.8}</span>
                        <span className="opacity-50 text-zinc-400">
                          ({trip.reviewsCount || 42} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <hr
                  className={`border-dashed ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}
                />

                {/* Selected details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] opacity-60 flex items-center gap-1.5">
                      <Calendar size={12} className="text-forest-400" />{" "}
                      Departure Date
                    </span>
                    <span className="font-semibold text-[11px]">
                      {formattedSelectedDate || (
                        <span className="text-amber-500 italic font-normal">
                          Select date
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] opacity-60 flex items-center gap-1.5">
                      <Bus size={12} className="text-forest-400" /> Pickup
                      Location
                    </span>
                    <span className="font-semibold text-[11px]">
                      Ex-{pickup?.location || "Base Camp"}{" "}
                      {pickup?.price ? `(+₹${pickup.price}/p)` : ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] opacity-60 flex items-center gap-1.5">
                      <Users size={12} className="text-forest-400" /> Travelers
                    </span>
                    <span className="font-semibold text-[11px]">
                      {travelersCount} Person{travelersCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <hr
                  className={`border-dashed ${darkMode ? "border-zinc-800" : "border-zinc-200"}`}
                />

                {/* Price summary breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between opacity-75 text-[11px]">
                    <span>Expedition Base ({travelersCount}x)</span>
                    <span>₹{baseCostTotal}</span>
                  </div>
                  {appliedDiscountValue > 0 && !useLoyaltyReward && (
                    <div className="flex justify-between text-rose-500 text-[11px] font-bold">
                      <span>Coupon Discount</span>
                      <span>-₹{appliedDiscountValue}</span>
                    </div>
                  )}
                  {useLoyaltyReward && loyaltyDiscountValue > 0 && (
                    <div className="flex justify-between text-emerald-500 text-[11px] font-bold">
                      <span>Loyalty Reward</span>
                      <span>-₹{loyaltyDiscountValue}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1.5 text-sm">
                    <span className="text-forest-600 dark:text-forest-400">
                      {isOnlinePayment ? "Total Payable" : "Payable on Arrival"}
                    </span>
                    <span
                      className={`font-black ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                      ₹{finalPayAmount}
                    </span>
                  </div>
                </div>

                {/* Trust & Guarantee badges */}
                <div
                  className={`p-3 rounded-xl space-y-2 text-[10px] leading-tight ${
                    darkMode
                      ? "bg-zinc-950/50 border border-white/5 text-zinc-400"
                      : "bg-gray-50 border border-zinc-150 text-zinc-500"
                  }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      size={13}
                      className="text-forest-500 shrink-0"
                    />
                    <span>Weather rescheduling at zero penalty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-forest-500 shrink-0" />
                    <span>Instant digital permit & boarding pass</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto w-full py-4 flex flex-col flex-1">
            {createdBooking && (
              <div className="py-2">
                <ReceiptPrintout
                  booking={createdBooking}
                  items={
                    restoredFromGateway
                      ? (createdBooking.travelerBreakdown || [])
                          .filter((t) => t.count > 0)
                          .map((t, i) => ({ ...t, id: t.id || `tier-${i}` }))
                      : tierBreakdown.filter((t) => t.count > 0)
                  }
                  subtotal={
                    restoredFromGateway
                      ? (createdBooking.baseCost ?? createdBooking.finalAmount)
                      : baseCostTotal
                  }
                  discount={
                    restoredFromGateway
                      ? createdBooking.couponDiscount || 0
                      : appliedDiscountValue
                  }
                  loyaltyDiscount={
                    restoredFromGateway
                      ? createdBooking.loyaltyDiscountAmount || 0
                      : loyaltyDiscountValue
                  }
                  pickupLabel={pickup?.location}
                />

                {/* Actions land once the paper has finished feeding */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.55, duration: 0.35 }}
                  className="flex justify-center pt-7">
                  <button
                    id="btn-download-ticket"
                    onClick={() => setShowTicketModal(true)}
                    className={`px-5 py-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-zinc-350 hover:bg-zinc-850"
                        : "bg-white border-gray-255 text-zinc-700"
                    }`}>
                    <Download size={14} /> Download Ticket
                  </button>
                </motion.div>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.7, duration: 0.35 }}
              className="pt-6 border-t border-zinc-800/10 dark:border-zinc-850 shrink-0">
              <button
                type="button"
                id="btn-booking-done-finish"
                onClick={handleFinishAndReturn}
                className={`w-full py-4 rounded-2xl font-display font-black text-xs uppercase tracking-wider border backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${
                  darkMode
                    ? "bg-zinc-900/45 border-forest-300/35 text-forest-300 hover:bg-zinc-900/70 hover:border-forest-300/70 shadow-lg shadow-forest-900/10"
                    : "bg-white/60 border-forest-500/30 text-forest-700 hover:bg-white/90 hover:border-forest-500/60 shadow-md shadow-forest-950/5"
                }`}>
                Access Bookings Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* ======================= */}
      {/* Dynamic Popups/Modals  */}
      {/* ======================= */}
      {/* Ticket preview — the same boarding pass the Bookings tab shows, so
          what you see here is what the PDF contains. */}
      {showTicketModal && createdBooking && (
        <div className="fixed inset-0 bg-black/80 z-55 flex items-center justify-center p-5 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-3xl relative w-full max-w-sm my-auto ${
              darkMode ? "bg-zinc-900" : "bg-white shadow-xl"
            }`}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="min-w-0">
                <h4 className="text-sm font-display font-black flex items-center gap-1.5 text-forest-600 dark:text-forest-400">
                  <CheckCircle2 size={15} className="shrink-0" /> Your Trek
                  Ticket
                </h4>
                <span className="text-[9px] opacity-45 font-mono tracking-wider">
                  PERMIT {createdBooking.bookingId}
                </span>
              </div>
              <button
                onClick={() => setShowTicketModal(false)}
                aria-label="Close ticket"
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="px-5">
              <TravelTicket
                booking={createdBooking}
                darkMode={darkMode}
                notchClass={darkMode ? "bg-zinc-900" : "bg-white"}
              />
            </div>

            <p className="text-[9px] leading-relaxed opacity-55 px-5 pt-3 text-center">
              Present this pass at the base camp gate. Seat and permit details
              are verified from the QR code.
            </p>

            <div className="p-5 pt-3">
              <button
                id="btn-save-ticket-pdf"
                onClick={handleSaveTicketPdf}
                disabled={savingPdf}
                className={`w-full py-3.5 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition active:scale-98 ${
                  savingPdf
                    ? "bg-forest-700/60 cursor-not-allowed"
                    : "bg-forest-600 hover:bg-forest-700 cursor-pointer"
                }`}>
                <Download
                  size={14}
                  className={savingPdf ? "animate-pulse" : ""}
                />
                {savingPdf ? "Preparing PDF…" : "Save as PDF File"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
