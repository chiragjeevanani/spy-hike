import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  X, ScanBarcode, CheckCircle2, XCircle, User, MapPin,
  Calendar, Users, CreditCard, Phone, Mail,
  Ticket, AlertTriangle, Hash, RefreshCw, Clock
} from 'lucide-react';
import bookingsApi from '../../../lib/bookingsApi';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Upcoming:  { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
    Completed: { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',         dot: 'bg-blue-400' },
    Cancelled: { cls: 'bg-red-500/15 text-red-400 border-red-500/30',            dot: 'bg-red-400' },
  };
  const s = map[status] || map['Upcoming'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ─── Booking Result Card ───────────────────────────────────────────────────────
function BookingCard({ booking, darkMode, alreadyCheckedIn }) {
  const rows = [
    { icon: User,       label: 'Hiker',      value: booking.userName || booking.travelers?.[0]?.name || '—' },
    { icon: Mail,       label: 'Email',      value: booking.userEmail || '—' },
    { icon: Phone,      label: 'Mobile',     value: booking.userMobile || booking.travelers?.[0]?.emergencyContact || '—' },
    { icon: MapPin,     label: 'Location',   value: booking.tripLocation || booking.tripCity || '—' },
    { icon: Calendar,   label: 'Departure',  value: booking.selectedDate || booking.departureDate || '—' },
    { icon: Users,      label: 'Hikers',     value: `${booking.travelersCount || booking.hikersCount || 1} Pax` },
    { icon: CreditCard, label: 'Fare',       value: `₹${(booking.finalAmount || 0).toLocaleString('en-IN')}` },
    { icon: Hash,       label: 'Booking ID', value: booking.bookingId || booking.id || '—' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 200 }}
      className={`w-full rounded-3xl overflow-hidden shadow-2xl ${
        darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-100'
      }`}
    >
      {/* Card header */}
      <div className={`px-5 pt-5 pb-4 ${darkMode ? 'bg-zinc-800/60' : 'bg-gradient-to-br from-orange-50 to-amber-50'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={`text-[9px] font-mono font-bold tracking-widest uppercase mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Trek Boarding Pass · Verified ✓
            </p>
            <h2 className="text-base font-display font-black leading-tight line-clamp-2 text-white">
              {booking.tripName || 'Trek'}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={booking.status || 'Upcoming'} />
              <span className="text-[10px] font-mono text-zinc-500">{booking.bookingId || booking.id}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl shrink-0 bg-emerald-500/10">
            <CheckCircle2 size={22} className="text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Check-in status banner */}
      <div className="px-5 pt-4">
        <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${
          alreadyCheckedIn
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {alreadyCheckedIn ? <Clock size={15} className="shrink-0" /> : <CheckCircle2 size={15} className="shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs font-bold">
              {alreadyCheckedIn ? 'Already checked in' : 'Checked in ✓'}
            </p>
            {booking.checkedInAt && (
              <p className="text-[10px] opacity-80">
                {new Date(booking.checkedInAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="px-5 py-4 space-y-2.5">
        {rows.map(({ icon: Icon, label, value }) =>
          value && value !== '—' ? (
            <div key={label} className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg shrink-0 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <Icon size={12} className={darkMode ? 'text-zinc-400' : 'text-zinc-500'} />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <span className={`text-[10px] font-medium ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</span>
                <span className="text-[11px] font-semibold text-right truncate max-w-[60%] text-white">{value}</span>
              </div>
            </div>
          ) : null
        )}
      </div>

      {/* Travelers */}
      {booking.travelers?.length > 0 && (
        <div className={`mx-5 mb-4 p-3 rounded-xl ${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
          <p className={`text-[9px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Registered Hikers ({booking.travelers.length})
          </p>
          {booking.travelers.map((t, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-zinc-800/50 last:border-0">
              <span className="text-[11px] font-semibold text-white">{t.name}</span>
              <span className="text-[10px] text-zinc-500">Age {t.age} · {t.gender}</span>
            </div>
          ))}
        </div>
      )}

      {/* Organizer strip */}
      {booking.organizerName && (
        <div className="mx-5 mb-5 flex items-center gap-2 p-3 rounded-xl bg-spy-orange/10 border border-spy-orange/20">
          <Ticket size={13} className="text-spy-orange shrink-0" />
          <p className="text-[11px] font-semibold text-spy-orange">{booking.organizerName}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Scanner Component ────────────────────────────────────────────────────
export default function OrgScannerView({ onBack, darkMode }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [phase, setPhase]       = useState('scanning'); // scanning | found | error | camError
  const [booking, setBooking]   = useState(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [errMsg, setErrMsg]     = useState('');
  const [camErr, setCamErr]     = useState('');
  const [manualCode, setManualCode] = useState('');
  const [checking, setChecking] = useState(false);

  const stopScanner = useCallback(() => {
    try { readerRef.current?.reset(); } catch {}
  }, []);

  // Scanning a ticket checks the booking in through the API. The server is the
  // source of truth: it verifies the ticket belongs to this organizer's trip,
  // rejects cancelled tickets, and is idempotent (a second scan just reports
  // alreadyCheckedIn). Used by both the camera and the manual-entry fallback.
  const handleCheckIn = useCallback(async (rawCode) => {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) return;
    stopScanner();
    setChecking(true);
    setErrMsg('');
    try {
      const result = await bookingsApi.checkin(code);
      setBooking(result.booking);
      setAlreadyCheckedIn(!!result.alreadyCheckedIn);
      setPhase('found');
    } catch (err) {
      // Fallback check against local bookings array (for offline/seeded mode)
      try {
        const storedBookingsRaw = localStorage.getItem('trekigo_bookings') || localStorage.getItem('trekigo_org_bookings');
        if (storedBookingsRaw) {
          const allStored = JSON.parse(storedBookingsRaw);
          const matched = allStored.find(b => (b.bookingId && b.bookingId.toUpperCase() === code) || (b.id && b.id.toUpperCase() === code));
          if (matched) {
            setBooking(matched);
            setAlreadyCheckedIn(matched.status === 'Completed');
            setPhase('found');
            setChecking(false);
            return;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback lookup failed:', fallbackErr);
      }
      setErrMsg(err?.message || `Could not check in ticket: ${code}`);
      setPhase('error');
    } finally {
      setChecking(false);
    }
  }, [stopScanner]);

  const startScanner = useCallback(() => {
    setPhase('scanning');
    setBooking(null);
    setAlreadyCheckedIn(false);
    setErrMsg('');
    setCamErr('');

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        const device =
          devices.find(d => /back|rear|environment/i.test(d.label)) || devices[0];

        return reader.decodeFromVideoDevice(
          device?.deviceId || undefined,
          videoRef.current,
          (res) => {
            if (!res) return;
            handleCheckIn(res.getText());
          }
        );
      })
      .catch(e => {
        setCamErr(e.message || 'Camera access denied. Please allow camera permissions.');
        setPhase('camError');
      });
  }, [stopScanner, handleCheckIn]);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []); // eslint-disable-line

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-zinc-950 text-white">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-spy-orange/15">
            <ScanBarcode size={18} className="text-spy-orange" />
          </div>
          <div>
            <h1 className="text-base font-display font-black tracking-tight">Ticket Scanner</h1>
            <p className="text-[10px] text-zinc-400">Point at the barcode on the hiker's ticket</p>
          </div>
        </div>
        <button
          onClick={() => { stopScanner(); onBack(); }}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors active:scale-95"
        >
          <X size={18} className="text-zinc-300" />
        </button>
      </div>

      {/* Camera viewfinder */}
      <div
        className="relative mx-5 mb-4 rounded-3xl overflow-hidden bg-black shrink-0"
        style={{ height: '52vw', maxHeight: 240 }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay muted playsInline
        />

        {/* Dim overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Corner brackets */}
        {phase === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-24">
              <div className="absolute top-0 left-0  w-5 h-5 border-t-[2.5px] border-l-[2.5px] border-spy-orange" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-[2.5px] border-r-[2.5px] border-spy-orange" />
              <div className="absolute bottom-0 left-0  w-5 h-5 border-b-[2.5px] border-l-[2.5px] border-spy-orange" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-[2.5px] border-r-[2.5px] border-spy-orange" />
              <motion.div
                className="absolute left-1 right-1 h-[2px] bg-spy-orange shadow-[0_0_8px_rgba(242,125,38,0.9)]"
                animate={{ top: ['8%', '88%', '8%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        )}

        {/* Found flash */}
        {phase === 'found' && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 size={48} className="text-emerald-400 drop-shadow-lg" />
          </div>
        )}

        {/* Status pill */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            {phase === 'scanning' && (
              <><span className="w-1.5 h-1.5 rounded-full bg-spy-orange animate-pulse" /><span className="text-[10px] font-mono text-white/80">Scanning…</span></>
            )}
            {phase === 'found' && (
              <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[10px] font-mono text-emerald-300">Ticket verified!</span></>
            )}
            {(phase === 'error' || phase === 'camError') && (
              <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-[10px] font-mono text-red-300">Scan failed</span></>
            )}
          </div>
        </div>
      </div>

      {/* Manual entry fallback — always available (cameras fail, and it's the
          quickest path on desktop). Enter the booking id from the ticket. */}
      {(phase === 'scanning' || phase === 'camError') && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleCheckIn(manualCode); }}
          className="mx-5 mb-3 flex gap-2"
        >
          <input
            id="scanner-manual-code"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter booking ID (e.g. TG-9921-U)"
            className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-500 outline-none focus:border-spy-orange/60"
          />
          <button
            id="scanner-manual-checkin"
            type="submit"
            disabled={checking || !manualCode.trim()}
            className="px-4 rounded-xl text-xs font-bold bg-spy-orange hover:bg-[#d96d1a] text-white disabled:opacity-50 transition active:scale-95"
          >
            {checking ? '…' : 'Check In'}
          </button>
        </form>
      )}

      {/* Camera error banner */}
      {phase === 'camError' && (
        <div className="mx-5 mb-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">Camera Error</p>
            <p className="text-xs text-zinc-400 mt-0.5">{camErr}</p>
          </div>
        </div>
      )}

      {/* Scrollable result area */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <AnimatePresence mode="wait">

          {/* Idle hint */}
          {phase === 'scanning' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center text-xs text-zinc-500 pt-2">
              Align the barcode inside the brackets above
            </motion.p>
          )}

          {/* Not found */}
          {phase === 'error' && (
            <motion.div key="err" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="rounded-3xl p-6 bg-zinc-800/60 border border-zinc-700 text-center">
              <XCircle size={36} className="text-red-400 mx-auto mb-3" />
              <h3 className="font-display font-black text-base">Booking Not Found</h3>
              <p className="text-xs text-zinc-400 mt-1">{errMsg}</p>
              <button onClick={startScanner}
                className="mt-4 inline-flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition active:scale-95">
                <RefreshCw size={13} /> Scan Again
              </button>
            </motion.div>
          )}

          {/* Found */}
          {phase === 'found' && booking && (
            <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <BookingCard booking={booking} darkMode={darkMode} alreadyCheckedIn={alreadyCheckedIn} />
              <button onClick={startScanner}
                className="w-full flex items-center justify-center gap-2 bg-spy-orange hover:bg-[#d96d1a] text-white text-sm font-bold py-3 rounded-2xl shadow-lg shadow-spy-orange/20 transition active:scale-95">
                <ScanBarcode size={16} /> Scan Another Ticket
              </button>
            </motion.div>
          )}

          {/* Camera error retry */}
          {phase === 'camError' && (
            <motion.div key="camRetry" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button onClick={startScanner}
                className="w-full flex items-center justify-center gap-2 bg-spy-orange hover:bg-[#d96d1a] text-white text-sm font-bold py-3 rounded-2xl shadow-lg transition active:scale-95">
                <RefreshCw size={16} /> Retry Camera
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
