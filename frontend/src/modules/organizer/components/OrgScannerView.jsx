import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  X,
  ScanBarcode,
  CheckCircle2,
  XCircle,
  User,
  MapPin,
  Calendar,
  Users,
  CreditCard,
  Phone,
  Mail,
  Ticket,
  AlertTriangle,
  Hash,
  RefreshCw,
  Clock,
  ShieldAlert,
} from "lucide-react";
import bookingsApi from "../../../lib/bookingsApi";

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Upcoming: {
      cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400",
    },
    Ongoing: {
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      dot: "bg-emerald-400",
    },
    Completed: {
      cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      dot: "bg-blue-400",
    },
    Missed: {
      cls: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      dot: "bg-rose-400",
    },
    Cancelled: {
      cls: "bg-red-500/15 text-red-400 border-red-500/30",
      dot: "bg-red-400",
    },
  };
  const s = map[status] || map["Upcoming"];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ─── Booking Result Card ───────────────────────────────────────────────────────
function BookingCard({ booking, darkMode, alreadyCheckedIn }) {
  const rows = [
    {
      icon: User,
      label: "Hiker",
      value: booking.userName || booking.travelers?.[0]?.name || "—",
    },
    { icon: Mail, label: "Email", value: booking.userEmail || "—" },
    {
      icon: Phone,
      label: "Mobile",
      value:
        booking.userMobile || booking.travelers?.[0]?.emergencyContact || "—",
    },
    {
      icon: MapPin,
      label: "Location",
      value: booking.tripLocation || booking.tripCity || "—",
    },
    {
      icon: Calendar,
      label: "Departure",
      value: booking.selectedDate || booking.departureDate || "—",
    },
    {
      icon: Users,
      label: "Hikers",
      value: `${booking.travelersCount || booking.hikersCount || 1} Pax`,
    },
    {
      icon: CreditCard,
      label: "Fare",
      value: `₹${(booking.finalAmount || 0).toLocaleString("en-IN")}`,
    },
    {
      icon: Hash,
      label: "Booking ID",
      value: booking.bookingId || booking.id || "—",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 200 }}
      className={`w-full rounded-3xl overflow-hidden border transition-colors ${
        darkMode
          ? "bg-zinc-900/90 border-zinc-800 text-white shadow-xl"
          : "bg-white border-zinc-200/90 text-zinc-900 shadow-md"
      }`}>
      {/* Card header */}
      <div
        className={`px-5 pt-4 sm:pt-5 pb-3.5 border-b ${
          darkMode
            ? "bg-zinc-800/60 border-white/5"
            : "bg-gradient-to-br from-orange-50/80 to-amber-50/50 border-zinc-100"
        }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p
              className={`text-[9px] font-mono font-bold tracking-widest uppercase mb-1 ${darkMode ? "text-zinc-500" : "text-zinc-400"}`}>
              Trek Boarding Pass · Verified ✓
            </p>
            <h2
              className={`text-base font-display font-black leading-tight line-clamp-2 ${darkMode ? "text-white" : "text-zinc-900"}`}>
              {booking.tripName || "Trek"}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={booking.status || "Upcoming"} />
              <span
                className={`text-[10px] font-mono ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                {booking.bookingId || booking.id}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-xl shrink-0 bg-emerald-500/15">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Check-in status banner */}
      <div className="px-5 pt-3.5">
        <div
          className={`flex items-center gap-2.5 p-3 rounded-2xl border ${
            alreadyCheckedIn
              ? darkMode
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-amber-50 border-amber-200 text-amber-700"
              : darkMode
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}>
          {alreadyCheckedIn ? (
            <Clock size={15} className="shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold">
              {alreadyCheckedIn ? "Already checked in" : "Checked in ✓"}
            </p>
            {booking.checkedInAt && (
              <p className="text-[10px] opacity-80">
                {new Date(booking.checkedInAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="px-5 py-3.5 space-y-2.5">
        {rows.map(({ icon: Icon, label, value }) =>
          value && value !== "—" ? (
            <div key={label} className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${darkMode ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"}`}>
                <Icon size={12} />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-medium ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                  {label}
                </span>
                <span
                  className={`text-[11px] font-semibold text-right truncate max-w-[65%] ${darkMode ? "text-white" : "text-zinc-800"}`}>
                  {value}
                </span>
              </div>
            </div>
          ) : null,
        )}
      </div>

      {/* Travelers */}
      {booking.travelers?.length > 0 && (
        <div
          className={`mx-5 mb-3.5 p-3 rounded-2xl border ${darkMode ? "bg-zinc-800/50 border-white/5" : "bg-zinc-50/80 border-zinc-200/70"}`}>
          <p
            className={`text-[9px] font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
            Registered Hikers ({booking.travelers.length})
          </p>
          {booking.travelers.map((t, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-1 border-b last:border-0 ${darkMode ? "border-zinc-800/50" : "border-zinc-200/60"}`}>
              <span
                className={`text-xs font-semibold ${darkMode ? "text-white" : "text-zinc-800"}`}>
                {t.name}
              </span>
              <span
                className={`text-[11px] ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                Age {t.age} · {t.gender}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Organizer strip */}
      {booking.organizerName && (
        <div className="mx-5 mb-4 flex items-center gap-2 p-2.5 rounded-xl bg-spy-orange/10 border border-spy-orange/20">
          <Ticket size={13} className="text-spy-orange shrink-0" />
          <p className="text-xs font-semibold text-spy-orange">
            {booking.organizerName}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Scanner Component ────────────────────────────────────────────────────
export default function OrgScannerView({
  organizer,
  trips = [],
  onBack,
  darkMode,
}) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [phase, setPhase] = useState("scanning"); // scanning | found | error | camError
  const [booking, setBooking] = useState(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [camErr, setCamErr] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [checking, setChecking] = useState(false);

  const scanSessionRef = useRef(0);

  const stopScanner = useCallback(() => {
    scanSessionRef.current += 1;
    try {
      readerRef.current?.reset();
    } catch {}
  }, []);

  // Validates whether a booking belongs to the current logged-in organizer
  const isMyBooking = useCallback(
    (b) => {
      if (!b) return false;
      const orgEmail = (organizer?.email || "").toLowerCase().trim();
      const orgAgency = (organizer?.agencyName || organizer?.name || "")
        .toLowerCase()
        .trim();
      const bOrgEmail = (b.organizerEmail || "").toLowerCase().trim();
      const bOrgName = (b.organizerName || "").toLowerCase().trim();

      if (orgEmail && bOrgEmail && orgEmail === bOrgEmail) return true;
      if (orgAgency && bOrgName && orgAgency === bOrgName) return true;

      // Check if tripId matches any trip belonging to this organizer
      const bTripId = String(b.tripId || b.trip?._id || b.trip?.id || "");
      if (
        bTripId &&
        Array.isArray(trips) &&
        trips.some((t) => String(t._id || t.id) === bTripId)
      ) {
        return true;
      }
      return false;
    },
    [organizer, trips],
  );

  // Scanning a ticket checks the booking in through the API. The server is the
  // source of truth: it verifies the ticket belongs to this organizer's trip,
  // rejects foreign and cancelled tickets, and is idempotent (a second scan just reports
  // alreadyCheckedIn). Used by both the camera and the manual-entry fallback.
  const handleCheckIn = useCallback(
    async (rawCode) => {
      const code = (rawCode || "").trim().toUpperCase();
      if (!code) return;
      stopScanner();
      setChecking(true);
      setErrMsg("");
      try {
        const result = await bookingsApi.checkin(code);
        setBooking(result.booking);
        setAlreadyCheckedIn(!!result.alreadyCheckedIn);
        setPhase("found");
      } catch (err) {
        // If server returned 403 Forbidden (e.g. ticket belongs to another organization),
        // DO NOT search local storage to override the server's security rejection!
        const status = err?.status || err?.response?.status;
        const isForbidden =
          status === 403 ||
          /another organization|belongs to another/i.test(err?.message || "");

        if (isForbidden) {
          setErrMsg(
            err?.message ||
              "This ticket belongs to another organization. You can only scan and verify tickets for your own treks.",
          );
          setPhase("error");
          setChecking(false);
          return;
        }

        // Offline fallback check against local bookings array (strictly restricted to this organizer's tickets)
        try {
          const storedBookingsRaw =
            localStorage.getItem("trekigo_bookings") ||
            localStorage.getItem("trekigo_org_bookings");
          if (storedBookingsRaw) {
            const allStored = JSON.parse(storedBookingsRaw);
            const matched = allStored.find(
              (b) =>
                (b.bookingId && b.bookingId.toUpperCase() === code) ||
                (b.id && b.id.toUpperCase() === code),
            );
            if (matched) {
              if (!isMyBooking(matched)) {
                const otherOrg =
                  matched.organizerName || "another organization";
                setErrMsg(
                  `This ticket belongs to another organization (${otherOrg}). You can only scan and verify tickets for your own treks.`,
                );
                setPhase("error");
                setChecking(false);
                return;
              }
              setBooking(matched);
              setAlreadyCheckedIn(
                matched.status === "Completed" || !!matched.checkedInAt,
              );
              setPhase("found");
              setChecking(false);
              return;
            }
          }
        } catch (fallbackErr) {
          console.error("Fallback lookup failed:", fallbackErr);
        }
        setErrMsg(err?.message || `Could not check in ticket: ${code}`);
        setPhase("error");
      } finally {
        setChecking(false);
      }
    },
    [stopScanner, isMyBooking],
  );

  const startScanner = useCallback(() => {
    const sessionId = ++scanSessionRef.current;
    setPhase("scanning");
    setBooking(null);
    setAlreadyCheckedIn(false);
    setErrMsg("");
    setCamErr("");

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        if (scanSessionRef.current !== sessionId) return;
        const device =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ||
          devices[0];

        return reader.decodeFromVideoDevice(
          device?.deviceId || undefined,
          videoRef.current,
          (res) => {
            if (scanSessionRef.current !== sessionId) return;
            if (!res) return;
            handleCheckIn(res.getText());
          },
        );
      })
      .catch((e) => {
        if (scanSessionRef.current !== sessionId) return;
        setCamErr(
          e.message || "Camera access denied. Please allow camera permissions.",
        );
        setPhase("camError");
      });
  }, [stopScanner, handleCheckIn]);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []); // eslint-disable-line

  return (
    <div
      className={`w-full max-h-[85vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border ${
        darkMode
          ? "bg-zinc-950 border-white/10 text-white"
          : "bg-[#FAF8F2] border-zinc-200/90 text-zinc-900"
      }`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-5 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0 border-b ${
          darkMode
            ? "bg-zinc-900/80 border-white/5"
            : "bg-white/80 backdrop-blur-md border-zinc-200/80 shadow-xs"
        }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-spy-orange/15">
            <ScanBarcode size={18} className="text-spy-orange" />
          </div>
          <div>
            <h1 className="text-base font-display font-black tracking-tight">
              Hiker Ticket Scanner
            </h1>
            <p
              className={`text-[10px] ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
              Scan QR barcode or enter booking reference
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            stopScanner();
            onBack();
          }}
          className={`p-2 rounded-xl transition-colors active:scale-95 cursor-pointer ${
            darkMode
              ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
          }`}>
          <X size={18} />
        </button>
      </div>

      {/* Camera viewfinder — collapses smoothly when ticket is verified to prioritize the boarding pass */}
      <div
        className={`relative mx-5 sm:mx-6 my-3 rounded-2xl overflow-hidden bg-black shrink-0 transition-all duration-300 flex items-center justify-center border border-white/10 ${
          phase === "found" ? "h-24 sm:h-28" : "aspect-[4/3] max-h-60"
        }`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Dim overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Corner brackets */}
        {phase === "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-24">
              <div className="absolute top-0 left-0  w-5 h-5 border-t-[2.5px] border-l-[2.5px] border-spy-orange" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-[2.5px] border-r-[2.5px] border-spy-orange" />
              <div className="absolute bottom-0 left-0  w-5 h-5 border-b-[2.5px] border-l-[2.5px] border-spy-orange" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-[2.5px] border-r-[2.5px] border-spy-orange" />
              <motion.div
                className="absolute left-1 right-1 h-[2px] bg-spy-orange shadow-[0_0_8px_rgba(242,125,38,0.9)]"
                animate={{ top: ["8%", "88%", "8%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
        )}

        {/* Found flash */}
        {phase === "found" && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2
              size={40}
              className="text-emerald-400 drop-shadow-lg"
            />
          </div>
        )}

        {/* Status pill */}
        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-sm px-3 py-1.5 rounded-full">
            {phase === "scanning" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-spy-orange animate-pulse" />
                <span className="text-[10px] font-mono text-white/80">
                  Scanning…
                </span>
              </>
            )}
            {phase === "found" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-mono text-emerald-300">
                  Ticket verified!
                </span>
              </>
            )}
            {(phase === "error" || phase === "camError") && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] font-mono text-red-300">
                  Scan failed
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Manual entry fallback — only while scanning/error */}
      {(phase === "scanning" || phase === "camError") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCheckIn(manualCode);
          }}
          className="mx-5 sm:mx-6 mb-3 flex gap-2.5 shrink-0">
          <input
            id="scanner-manual-code"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter booking ID (e.g. TG-9921-U)"
            className={`flex-1 px-4 py-3 rounded-2xl text-xs font-mono uppercase tracking-wider outline-none border transition ${
              darkMode
                ? "bg-zinc-900 border-zinc-800 text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-500 focus:border-spy-orange/60"
                : "bg-white border-zinc-200 text-zinc-900 placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400 focus:border-spy-orange/60 shadow-xs"
            }`}
          />
          <button
            id="scanner-manual-checkin"
            type="submit"
            disabled={checking || !manualCode.trim()}
            className="px-5 rounded-2xl text-xs font-bold bg-spy-orange hover:bg-[#d96d1a] text-white disabled:opacity-50 transition active:scale-95 cursor-pointer shadow-md shadow-spy-orange/20">
            {checking ? "Checking…" : "Check In"}
          </button>
        </form>
      )}

      {/* Camera error banner */}
      {phase === "camError" && (
        <div className="mx-5 mb-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start shrink-0">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">Camera Error</p>
            <p className="text-xs text-zinc-400 mt-0.5">{camErr}</p>
          </div>
        </div>
      )}

      {/* Scrollable result area */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0 space-y-3">
        <AnimatePresence mode="wait">
          {/* Idle hint */}
          {phase === "scanning" && (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-center text-xs pt-2 ${darkMode ? "text-zinc-500" : "text-zinc-400"}`}>
              Align the barcode inside the brackets above
            </motion.p>
          )}

          {/* Error / Unauthorized */}
          {phase === "error" && (
            <motion.div
              key="err"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-3xl p-6 border text-center ${
                /another organization|unauthorized/i.test(errMsg)
                  ? darkMode
                    ? "bg-amber-950/25 border-amber-500/40 text-white"
                    : "bg-amber-50/90 border-amber-200 text-zinc-900 shadow-sm"
                  : darkMode
                    ? "bg-zinc-800/60 border-zinc-700 text-white"
                    : "bg-white border-zinc-200/80 text-zinc-900 shadow-sm"
              }`}>
              {/another organization|unauthorized/i.test(errMsg) ? (
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
                  <ShieldAlert size={32} className="text-amber-500" />
                </div>
              ) : (
                <XCircle size={36} className="text-red-400 mx-auto mb-3" />
              )}
              <h3 className="font-display font-black text-base">
                {/another organization|unauthorized/i.test(errMsg)
                  ? "Unauthorized Ticket"
                  : "Booking Not Found"}
              </h3>
              <p
                className={`text-xs mt-2 max-w-sm mx-auto leading-relaxed ${
                  /another organization|unauthorized/i.test(errMsg)
                    ? darkMode
                      ? "text-amber-200/80"
                      : "text-amber-900"
                    : darkMode
                      ? "text-zinc-400"
                      : "text-zinc-500"
                }`}>
                {errMsg}
              </p>
              <button
                onClick={startScanner}
                className="mt-4 inline-flex items-center gap-2 bg-spy-orange hover:bg-[#d96d1a] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-spy-orange/20 transition active:scale-95 cursor-pointer">
                <RefreshCw size={13} /> Scan Another Ticket
              </button>
            </motion.div>
          )}

          {/* Found */}
          {phase === "found" && booking && (
            <motion.div
              key="found"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 pb-2">
              <BookingCard
                booking={booking}
                darkMode={darkMode}
                alreadyCheckedIn={alreadyCheckedIn}
              />
            </motion.div>
          )}

          {/* Camera error retry */}
          {phase === "camError" && (
            <motion.div
              key="camRetry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}>
              <button
                onClick={startScanner}
                className="w-full flex items-center justify-center gap-2 bg-spy-orange hover:bg-[#d96d1a] text-white text-sm font-bold py-3 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer">
                <RefreshCw size={16} /> Retry Camera
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Action for scanning next ticket */}
      {phase === "found" && (
        <div
          className={`shrink-0 p-4 border-t ${
            darkMode
              ? "bg-zinc-900/90 border-white/5"
              : "bg-white/90 backdrop-blur-md border-zinc-200/80"
          }`}>
          <button
            type="button"
            onClick={startScanner}
            className="w-full flex items-center justify-center gap-2 bg-spy-orange hover:bg-[#d96d1a] text-white text-sm font-bold py-3.5 rounded-2xl shadow-lg shadow-spy-orange/20 transition active:scale-95 cursor-pointer">
            <ScanBarcode size={16} /> Scan Another Ticket
          </button>
        </div>
      )}
    </div>
  );
}
