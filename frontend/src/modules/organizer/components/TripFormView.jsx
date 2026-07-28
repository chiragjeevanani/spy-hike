import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Minus, ChevronDown, ChevronUp, ImagePlus, Check, Info, MapPin, DollarSign, Users, Calendar, Mountain, AlignLeft, List, AlertCircle, Trash2, Bus, CalendarDays, X, Edit3, Navigation, Search, Clock, Route } from 'lucide-react';
import OrgBatchDatePicker from './OrgBatchDatePicker';
import OrgStartPointPicker from './OrgStartPointPicker';
import treksApi from '../../../lib/treksApi';
import trekRequestsApi from '../../../lib/trekRequestsApi';
import { useToast } from '../../../components/ToastProvider';
import { scrollToFirstError } from '../../../utils/formValidation';

const DIFFICULTY_OPTIONS = ['Easy', 'Moderate', 'Difficult'];

const CATEGORY_OPTIONS = ['Trekking', 'Summit', 'Desert', 'Camping', 'Wildlife', 'Cultural'];
const INCLUDED_DEFAULTS = ['Tents', 'Meals (Veg)', 'Certified Guide', 'Permits', 'First Aid Kit'];
const ADDON_DEFAULTS = ['Porter Service', 'Photography Service', 'Gear Rental Kit', 'High-Altitude Health Pack'];

// Subsequence fuzzy match: every character of the query must appear in the
// target, in order, but not necessarily contiguous (so "kdknth" matches
// "KedarKantha", "hmpta" matches "Hampta Pass") — the same technique used by
// VS Code's command palette. Lower score = tighter/better match; null = no
// match at all.
function fuzzyScore(query, target) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastMatch = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (lastMatch !== -1) score += ti - lastMatch - 1;
      lastMatch = ti;
      qi++;
    }
  }
  return qi === q.length ? score : null;
}

export default function TripFormView({ trip = null, organizer = null, organizerEmail, onSave, onBack, darkMode }) {
  const isEdit = !!trip;

  const [form, setForm] = useState({
    trekId: trip?.trekId || null,
    pricingTiers: (trip?.pricingTiers && trip.pricingTiers.length > 0)
      ? trip.pricingTiers.map(t => ({ label: t.label, price: String(t.price) }))
      : [{ label: 'Solo', price: '' }],
    pickup: trip?.pickup
      ? { location: trip.pickup.location, price: String(trip.pickup.price) }
      : (trip?.pickupOptions?.[0]
        ? { location: trip.pickupOptions[0].location, price: String(trip.pickupOptions[0].price) }
        : { location: '', price: '' }),
    startPoint: trip?.startPoint || null,
    departureDates: trip?.departureDates || [],
    maxGroupSize: trip?.maxGroupSize || 15,
    availableSeats: trip?.availableSeats || 15,
    category: trip?.category || 'Trekking',
    description: trip?.description || '',
    highlights: trip?.highlights || [''],
    included: trip?.included || [...INCLUDED_DEFAULTS],
    notIncluded: trip?.notIncluded || ['Personal equipment', 'Travel to base camp'],
    addOns: trip?.addOns || [...ADDON_DEFAULTS],
    safetyGuidelines: trip?.safetyGuidelines || [''],
    cancellationPolicy: trip?.cancellationPolicy || ['Full refund 7 days prior', '50% refund 3 days prior', 'No refund within 3 days'],
    itinerary: trip?.itinerary || [{ day: 1, title: '', description: '' }],
    faqs: trip?.faqs || [{ question: '', answer: '' }],
    status: trip?.status || 'Draft',
    galleryImages: trip?.galleryImages || [],
  });

  const [section, setSection] = useState('basic');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showBatchDatePicker, setShowBatchDatePicker] = useState(false);
  const [showStartPointPicker, setShowStartPointPicker] = useState(false);
  const toast = useToast();
  const scrollContainerRef = useRef(null);
  const reqTitleRef = useRef(null);
  const reqLocationRef = useRef(null);
  const reqDurationRef = useRef(null);
  const reqDistanceRef = useRef(null);
  const reqCoverImageRef = useRef(null);
  const reqFieldRefs = { title: reqTitleRef, location: reqLocationRef, durationDays: reqDurationRef, distanceKm: reqDistanceRef, coverImage: reqCoverImageRef };

  // Scrolls the (shared, cross-section) scrollable body back to the top so a
  // validation error banner rendered at the top of a section is never left
  // off-screen above the user's current scroll position.
  const scrollFormToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  // The admin-curated trek catalog to pick from — no more free-typed trek
  // identity (name/location/difficulty/duration/distance/image); the
  // organizer selects one and the backend inherits/locks those fields.
  const [treks, setTreks] = useState([]);
  const [treksLoading, setTreksLoading] = useState(true);
  const [trekSearch, setTrekSearch] = useState('');
  const [pickingTrek, setPickingTrek] = useState(!trip?.trekId);

  useEffect(() => {
    treksApi.listTreks()
      .then(setTreks)
      .catch(() => setTreks([]))
      .finally(() => setTreksLoading(false));
  }, []);

  // If the trip's trek is no longer Active (admin disabled it), it won't be
  // in the fetched list — fall back to the trip's own snapshotted fields so
  // an existing listing still shows something sensible.
  const selectedTrek = treks.find(t => t.id === form.trekId) || (trip && trip.trekId === form.trekId ? {
    id: trip.trekId, title: trip.name, location: trip.location, state: trip.state, city: trip.city,
    difficulty: trip.difficulty, durationDays: trip.durationDays, distanceKm: trip.distanceKm,
    elevationMeters: trip.elevationMeters, coverImage: trip.coverImage,
  } : null);

  // "My trek isn't in the catalog" flow — an organizer can propose a new
  // trek instead of being forced to misfile under whatever's closest.
  const [myRequests, setMyRequests] = useState([]);
  const [requestingTrek, setRequestingTrek] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: '', location: '', state: '', city: '',
    difficulty: 'Moderate', durationDays: '', distanceKm: '', elevationMeters: '',
    coverImage: '', category: '', description: '',
  });
  const [requestImageTab, setRequestImageTab] = useState('upload');
  const [requestImageError, setRequestImageError] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestFieldErrors, setRequestFieldErrors] = useState({});
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  useEffect(() => {
    trekRequestsApi.listMine().then(setMyRequests).catch(() => setMyRequests([]));
  }, []);

  const pendingRequests = myRequests.filter(r => r.status === 'Pending');

  const handleRequestFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setRequestForm(f => ({ ...f, coverImage: reader.result })); setRequestImageError(false); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitTrekRequest = async () => {
    const errs = {};
    if (!requestForm.title.trim()) errs.title = 'Title is required.';
    if (!requestForm.location.trim()) errs.location = 'Location is required.';
    if (!requestForm.durationDays || Number(requestForm.durationDays) <= 0) errs.durationDays = 'Duration (days) must be greater than 0.';
    if (!requestForm.distanceKm || Number(requestForm.distanceKm) < 0) errs.distanceKm = 'Distance (km) is required.';
    if (!requestForm.coverImage) errs.coverImage = 'A cover image is required.';

    if (Object.keys(errs).length > 0) {
      const order = ['title', 'location', 'durationDays', 'distanceKm', 'coverImage'];
      const message = errs[order.find(f => errs[f])];
      setRequestFieldErrors(errs);
      setRequestError(message);
      toast.error(message);
      scrollToFirstError(reqFieldRefs, errs, order);
      return;
    }

    setRequestFieldErrors({});
    setRequestError('');
    setRequestSubmitting(true);
    try {
      const created = await trekRequestsApi.create({
        title: requestForm.title.trim(),
        location: requestForm.location.trim(),
        state: requestForm.state.trim(),
        city: requestForm.city.trim(),
        difficulty: requestForm.difficulty,
        durationDays: Number(requestForm.durationDays),
        distanceKm: Number(requestForm.distanceKm),
        elevationMeters: requestForm.elevationMeters ? Number(requestForm.elevationMeters) : 0,
        coverImage: requestForm.coverImage,
        category: requestForm.category.trim(),
        description: requestForm.description.trim(),
      });
      setMyRequests(r => [created, ...r]);
      setRequestSubmitted(true);
      setRequestForm({
        title: '', location: '', state: '', city: '',
        difficulty: 'Moderate', durationDays: '', distanceKm: '', elevationMeters: '',
        coverImage: '', category: '', description: '',
      });
    } catch (err) {
      setRequestError(err?.message || 'Could not submit request.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Fuzzy-matches against title and location, keeping whichever field
  // matches best, then ranks results so the tightest matches sort first.
  const filteredTreks = treks
    .map(t => {
      const titleScore = fuzzyScore(trekSearch, t.title);
      const locationScore = fuzzyScore(trekSearch, t.location);
      const scores = [titleScore, locationScore].filter(s => s !== null);
      return { trek: t, score: scores.length ? Math.min(...scores) : null };
    })
    .filter(r => r.score !== null)
    .sort((a, b) => a.score - b.score)
    .map(r => r.trek);

  const handleSelectTrek = (trek) => {
    set('trekId', trek.id);
    setPickingTrek(false);
    setErrors({});
  };

  const sections = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'details', label: 'Trip Details' },
    { id: 'pickup', label: 'Pickup & Dates' },
    { id: 'inclusions', label: 'Inclusions' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'faqs', label: 'FAQs' },
  ];

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const setListItem = (key, idx, val) => {
    const arr = [...form[key]];
    arr[idx] = val;
    set(key, arr);
  };

  const setItineraryItem = (idx, field, val) => {
    const arr = [...form.itinerary];
    arr[idx] = { ...arr[idx], [field]: val };
    set('itinerary', arr);
  };

  const setFaqItem = (idx, field, val) => {
    const arr = [...form.faqs];
    arr[idx] = { ...arr[idx], [field]: val };
    set('faqs', arr);
  };

  const setPricingTierItem = (idx, field, val) => {
    const arr = [...form.pricingTiers];
    arr[idx] = { ...arr[idx], [field]: val };
    set('pricingTiers', arr);
  };

  const setPickupField = (field, val) => {
    set('pickup', { ...form.pickup, [field]: val });
  };

  const toggleBatchDate = (dateStr) => {
    const exists = form.departureDates.includes(dateStr);
    set('departureDates', exists
      ? form.departureDates.filter(d => d !== dateStr)
      : [...form.departureDates, dateStr].sort()
    );
  };

  // Sets the error banner, jumps to the section it belongs to, toasts it,
  // and scrolls the (shared, cross-section) form body back to top so the
  // banner — rendered under the `basic` key at the top of Basic/Details/
  // Pickup, whichever is active — is never left off-screen above wherever
  // the user had scrolled to.
  const failSave = (targetSection, message) => {
    setErrors({ basic: message });
    setSection(targetSection);
    toast.error(message);
    requestAnimationFrame(scrollFormToTop);
  };

  const handleSave = async (status = form.status) => {
    if (!form.trekId) {
      return failSave('basic', 'Select a trek before continuing.');
    }

    const validTiers = form.pricingTiers
      .map(t => ({ label: t.label.trim(), price: parseFloat(t.price) }))
      .filter(t => t.label && !isNaN(t.price));

    if (validTiers.length === 0) {
      return failSave('details', 'Add at least one batch pricing tier with a label and price.');
    }

    const pickupLocation = form.pickup.location.trim();
    const pickupPrice = parseFloat(form.pickup.price);
    if (!pickupLocation || isNaN(pickupPrice)) {
      return failSave('pickup', 'Add a pickup location with a valid per-person price.');
    }

    if (!form.startPoint) {
      return failSave('pickup', 'Set the trek/travel start point on the map.');
    }

    if (form.departureDates.length === 0) {
      return failSave('pickup', 'Select at least one future batch departure date.');
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 800));

    const pricingTiers = validTiers.map((t, i) => ({
      id: t.label.toLowerCase().replace(/\s+/g, '-') || `tier-${i}`,
      label: t.label,
      price: t.price
    }));

    const pickup = { location: pickupLocation, price: pickupPrice };

    const savedTrip = {
      ...form,
      id: trip?.id || `org-trip-${Date.now()}`,
      organizerEmail,
      // The traveller-facing apps (trip cards, details, booking) all read
      // trip.organizer.{name,avatar,rating,verified} directly — build it
      // from the live organizer profile so a newly published trip renders
      // correctly the moment a traveller opens it.
      organizer: trip?.organizer || {
        name: organizer?.agencyName || organizer?.name || 'Verified Organizer',
        avatar: organizer?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(organizer?.agencyName || organizer?.name || 'Organizer')}&background=F27D26&color=fff`,
        rating: organizer?.rating || 0,
        verified: !!organizer?.isApproved,
      },
      pricingTiers,
      pickup,
      startPoint: form.startPoint,
      departureDates: form.departureDates,
      price: pricingTiers[0]?.price ?? pickup.price,
      trekId: form.trekId,
      maxGroupSize: parseInt(form.availableSeats) || 15,
      availableSeats: parseInt(form.availableSeats) || 15,
      highlights: form.highlights.filter(h => h.trim()),
      safetyGuidelines: form.safetyGuidelines.filter(g => g.trim()),
      // The backend inherits name/location/difficulty/duration/distance/
      // elevation/coverImage from the selected trek and ignores whatever's
      // sent here — galleryImages stays organizer-owned, defaulting to the
      // trek's photo when the organizer hasn't added their own yet.
      galleryImages: form.galleryImages.length > 0 ? form.galleryImages : (selectedTrek?.coverImage ? [selectedTrek.coverImage] : []),
      status,
      rating: trip?.rating || 0,
      reviewsCount: trip?.reviewsCount || 0,
      reviews: trip?.reviews || [],
      createdAt: trip?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaving(false);
    onSave(savedTrip);
  };

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition ${
    darkMode ? 'bg-zinc-900 border-white/10 text-white placeholder-white/30 focus:border-spy-orange/50' : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-spy-orange/50'
  }`;
  // Same field styling minus `w-full` — for fixed-width inputs (e.g. a price
  // box beside a flex-growing label field). Concatenating `w-28` onto
  // `inputCls` directly would leave two conflicting width utilities on one
  // element, and whichever Tailwind happens to generate last wins.
  const inputClsFixedWidth = inputCls.replace('w-full ', '');
  const labelCls = `text-xs font-semibold tracking-wide uppercase mb-1.5 block ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`;
  const cardCls = `rounded-2xl p-4 space-y-4 ${darkMode ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-100 shadow-sm'}`;
  const reqErrCls = (field) => (requestFieldErrors[field] ? 'border-red-500 focus:border-red-500' : '');
  const clearReqError = (field) => setRequestFieldErrors(er => ({ ...er, [field]: '' }));

  const renderBasic = () => (
    <div className="space-y-4">
      {errors.basic && (
        <div className={`flex gap-2 items-center p-3 rounded-xl text-xs ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          <AlertCircle size={14} /> {errors.basic}
        </div>
      )}
      <div className={cardCls}>
        <div>
          <label className={labelCls}>Trek *</label>
          <p className={`text-[10px] -mt-1 mb-2 ${darkMode ? 'text-zinc-550' : 'text-zinc-400'}`}>
            Pick from the treks the admin has published. Its location, difficulty, duration, distance and cover image are locked to the trek — your batch pricing, dates and photos are your own.
          </p>

          {selectedTrek && !pickingTrek ? (
            <div className={`rounded-2xl overflow-hidden border ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
              <div className="relative h-28">
                <img src={selectedTrek.coverImage} alt={selectedTrek.title} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPickingTrek(true)}
                  className="absolute top-2 right-2 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-black/60 hover:bg-black/80 text-white transition-colors flex items-center gap-1"
                >
                  <Edit3 size={11} /> Change
                </button>
              </div>
              <div className={`p-3.5 ${darkMode ? 'bg-zinc-900' : 'bg-white'}`}>
                <h4 className="text-sm font-black">{selectedTrek.title}</h4>
                <p className={`text-xs flex items-center gap-1 mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <MapPin size={11} className="text-spy-orange shrink-0" /> {selectedTrek.location}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                  <span className={`px-2 py-1 rounded-lg ${
                    selectedTrek.difficulty === 'Difficult' ? 'bg-red-500/10 text-red-500' : selectedTrek.difficulty === 'Moderate' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>{selectedTrek.difficulty}</span>
                  <span className={`flex items-center gap-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><Clock size={11} /> {selectedTrek.durationDays}D</span>
                  <span className={`flex items-center gap-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}><Route size={11} /> {selectedTrek.distanceKm}km</span>
                </div>
              </div>
            </div>
          ) : requestingTrek ? (
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
              <div className={`flex items-center justify-between p-3 border-b ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                <span className="text-xs font-black">Request a New Trek</span>
                <button
                  type="button"
                  onClick={() => { setRequestingTrek(false); setRequestSubmitted(false); setRequestError(''); }}
                  className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-white/10' : 'hover:bg-zinc-100'}`}
                >
                  <X size={14} />
                </button>
              </div>

              {requestSubmitted ? (
                <div className="p-6 text-center space-y-2">
                  <Check size={28} className="mx-auto text-emerald-500" />
                  <p className="text-sm font-bold">Request sent for admin review</p>
                  <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>You'll be able to pick it here once it's approved.</p>
                  <button
                    type="button"
                    onClick={() => { setRequestingTrek(false); setRequestSubmitted(false); }}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-spy-orange text-white"
                  >
                    Back to Trek List
                  </button>
                </div>
              ) : (
                <div className="p-3.5 space-y-3">
                  <p className={`text-[10px] -mt-1 ${darkMode ? 'text-zinc-550' : 'text-zinc-400'}`}>
                    Not in the catalog? Propose it here — an admin reviews and, once approved, it becomes selectable for everyone.
                  </p>
                  {requestError && (
                    <div className={`flex gap-2 items-center p-2.5 rounded-xl text-xs ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                      <AlertCircle size={13} className="shrink-0" /> {requestError}
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Title *</label>
                    <input ref={reqTitleRef} type="text" className={`${inputCls} ${reqErrCls('title')}`} placeholder="e.g. Roopkund Trek" value={requestForm.title} onChange={e => { setRequestForm(f => ({ ...f, title: e.target.value })); clearReqError('title'); }} />
                    {requestFieldErrors.title && <p className="text-[10px] font-semibold mt-1 text-red-500">{requestFieldErrors.title}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Location *</label>
                    <input ref={reqLocationRef} type="text" className={`${inputCls} ${reqErrCls('location')}`} placeholder="e.g. Chamoli, Uttarakhand" value={requestForm.location} onChange={e => { setRequestForm(f => ({ ...f, location: e.target.value })); clearReqError('location'); }} />
                    {requestFieldErrors.location && <p className="text-[10px] font-semibold mt-1 text-red-500">{requestFieldErrors.location}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className={labelCls}>State</label>
                      <input type="text" className={inputCls} value={requestForm.state} onChange={e => setRequestForm(f => ({ ...f, state: e.target.value }))} />
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>City</label>
                      <input type="text" className={inputCls} value={requestForm.city} onChange={e => setRequestForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Difficulty</label>
                    <div className="flex gap-2">
                      {DIFFICULTY_OPTIONS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRequestForm(f => ({ ...f, difficulty: d }))}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            requestForm.difficulty === d
                              ? d === 'Easy' ? 'bg-emerald-500 border-emerald-500 text-white'
                                : d === 'Moderate' ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-red-500 border-red-500 text-white'
                              : darkMode ? 'border-white/10 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="min-w-0">
                      <label className={labelCls}>Duration (days) *</label>
                      <input ref={reqDurationRef} type="number" min="1" className={`${inputCls} ${reqErrCls('durationDays')}`} placeholder="5" value={requestForm.durationDays} onChange={e => { setRequestForm(f => ({ ...f, durationDays: e.target.value })); clearReqError('durationDays'); }} />
                      {requestFieldErrors.durationDays && <p className="text-[10px] font-semibold mt-1 text-red-500">{requestFieldErrors.durationDays}</p>}
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>Distance (km) *</label>
                      <input ref={reqDistanceRef} type="number" min="0" className={`${inputCls} ${reqErrCls('distanceKm')}`} placeholder="20" value={requestForm.distanceKm} onChange={e => { setRequestForm(f => ({ ...f, distanceKm: e.target.value })); clearReqError('distanceKm'); }} />
                      {requestFieldErrors.distanceKm && <p className="text-[10px] font-semibold mt-1 text-red-500">{requestFieldErrors.distanceKm}</p>}
                    </div>
                    <div className="min-w-0">
                      <label className={labelCls}>Elevation (m)</label>
                      <input type="number" min="0" className={inputCls} placeholder="3800" value={requestForm.elevationMeters} onChange={e => setRequestForm(f => ({ ...f, elevationMeters: e.target.value }))} />
                    </div>
                  </div>
                  <div ref={reqCoverImageRef}>
                    <label className={labelCls}>Cover Image *</label>
                    <div className={`flex rounded-xl p-1 border mb-3 justify-around relative overflow-hidden ${
                      darkMode ? 'bg-zinc-950/40 border-white/5' : 'bg-zinc-100/80 border-zinc-200/60'
                    }`}>
                      <button type="button" onClick={() => setRequestImageTab('upload')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${requestImageTab === 'upload' ? 'bg-spy-orange text-white' : 'text-zinc-400'}`}>
                        Upload Image
                      </button>
                      <button type="button" onClick={() => setRequestImageTab('url')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${requestImageTab === 'url' ? 'bg-spy-orange text-white' : 'text-zinc-400'}`}>
                        Image URL
                      </button>
                    </div>
                    {requestImageTab === 'upload' ? (
                      <div className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer relative transition ${
                        darkMode ? 'border-white/10 hover:border-spy-orange/40 bg-zinc-950/40' : 'border-zinc-200 hover:border-spy-orange/40 bg-zinc-50/50'
                      }`}>
                        <input type="file" accept="image/*" onChange={handleRequestFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <ImagePlus size={22} className="mx-auto mb-2 text-spy-orange/80" />
                        <p className="text-xs font-bold">Click or drag image to upload</p>
                      </div>
                    ) : (
                      <input
                        type="url"
                        className={inputCls}
                        placeholder="https://..."
                        value={requestForm.coverImage && requestForm.coverImage.startsWith('data:') ? '' : requestForm.coverImage}
                        onChange={e => { setRequestForm(f => ({ ...f, coverImage: e.target.value })); setRequestImageError(false); }}
                      />
                    )}
                    {requestForm.coverImage && requestImageError && (
                      <div className={`flex gap-2 items-center mt-3 p-2.5 rounded-xl text-[11px] font-bold ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                        <AlertCircle size={13} className="shrink-0" /> Couldn't load this image — check that the URL is complete and points directly to an image.
                      </div>
                    )}
                    {requestForm.coverImage && (
                      <div className={`relative mt-3 rounded-xl overflow-hidden shadow-md border border-zinc-200/60 dark:border-white/5 ${requestImageError ? 'hidden' : ''}`}>
                        <img
                          src={requestForm.coverImage}
                          alt="preview"
                          className="h-24 w-full object-cover"
                          onError={() => setRequestImageError(true)}
                          onLoad={() => setRequestImageError(false)}
                        />
                        <button
                          type="button"
                          onClick={() => { setRequestForm(f => ({ ...f, coverImage: '' })); setRequestImageError(false); }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/85 text-white transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Optional notes for the admin..." value={requestForm.description} onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitTrekRequest}
                    disabled={requestSubmitting}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-spy-orange hover:bg-[#d96d1a] text-white transition-all disabled:opacity-60"
                  >
                    {requestSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
              {pendingRequests.length > 0 && (
                <div className={`p-2.5 border-b text-[11px] font-semibold ${darkMode ? 'border-white/10 bg-amber-500/10 text-amber-400' : 'border-zinc-200 bg-amber-50 text-amber-700'}`}>
                  {pendingRequests.length} request{pendingRequests.length > 1 ? 's' : ''} awaiting admin review: {pendingRequests.map(r => r.title).join(', ')}
                </div>
              )}
              <div className={`relative p-2.5 border-b ${darkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search treks..."
                  value={trekSearch}
                  onChange={e => setTrekSearch(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm border outline-none transition ${
                    darkMode ? 'bg-zinc-950 border-white/10 text-white placeholder-white/30' : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400'
                  }`}
                />
              </div>
              <div className={`max-h-72 overflow-y-auto no-scrollbar divide-y ${darkMode ? 'divide-white/10' : 'divide-zinc-100'}`}>
                {treksLoading ? (
                  <p className="text-center text-xs font-bold py-6 text-zinc-400">Loading treks...</p>
                ) : filteredTreks.length === 0 ? (
                  <p className="text-center text-xs font-bold py-6 text-zinc-400">No treks found.</p>
                ) : (
                  filteredTreks.map(trek => (
                    <button
                      key={trek.id}
                      type="button"
                      onClick={() => handleSelectTrek(trek)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition ${darkMode ? 'hover:bg-white/5' : 'hover:bg-zinc-50'}`}
                    >
                      <img src={trek.coverImage} alt={trek.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{trek.title}</p>
                        <p className={`text-xs truncate ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{trek.location}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-zinc-400">
                          <span>{trek.difficulty}</span>
                          <span>{trek.durationDays}D</span>
                          <span>{trek.distanceKm}km</span>
                        </div>
                      </div>
                      {form.trekId === trek.id && <Check size={16} className="text-spy-orange shrink-0" />}
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => setRequestingTrek(true)}
                className={`w-full p-3 text-xs font-bold text-center transition ${darkMode ? 'text-spy-orange hover:bg-white/5' : 'text-spy-orange hover:bg-zinc-50'}`}
              >
                Can't find your trek? Request a new one →
              </button>
            </div>
          )}
        </div>

        {/* Gallery Images Manager */}
        <div>
          <label className={labelCls}>Gallery Images (Trip Details Slider)</label>
          
          <div className="grid grid-cols-4 gap-2 mb-3">
            {form.galleryImages.map((img, idx) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-zinc-250/60 dark:border-white/5">
                <img src={img} alt={`gallery-${idx}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    const updated = form.galleryImages.filter((_, i) => i !== idx);
                    set('galleryImages', updated);
                  }}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            {/* Add new photo square button */}
            <label className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
              darkMode ? 'border-white/10 hover:border-spy-orange/40 bg-zinc-950/40' : 'border-zinc-200 hover:border-spy-orange/40 bg-zinc-55 hover:bg-zinc-100'
            }`}>
              <Plus size={16} className="text-spy-orange" />
              <span className="text-[8px] font-bold mt-0.5 text-zinc-400">Add Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      set('galleryImages', [...form.galleryImages, reader.result]);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
          
          {/* Paste URL inline helper */}
          <div className="flex gap-2">
            <input
              type="url"
              id="gallery-url-input"
              placeholder="Or paste gallery image URL here..."
              className={`${inputCls} text-xs py-2`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.target.value.trim()) {
                    set('galleryImages', [...form.galleryImages, e.target.value.trim()]);
                    e.target.value = '';
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('gallery-url-input');
                if (input && input.value.trim()) {
                  set('galleryImages', [...form.galleryImages, input.value.trim()]);
                  input.value = '';
                }
              }}
              className={`px-4 rounded-xl text-xs font-bold transition ${
                darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
              }`}
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Describe the trek experience..." value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-4">
      {errors.basic && (
        <div className={`flex gap-2 items-center p-3 rounded-xl text-xs ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          <AlertCircle size={14} /> {errors.basic}
        </div>
      )}

      {/* Batch Pricing */}
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <label className={labelCls}>Batch Pricing *</label>
          <button type="button" onClick={() => set('pricingTiers', [...form.pricingTiers, { label: '', price: '' }])} className="text-spy-orange">
            <Plus size={16} />
          </button>
        </div>
        <p className={`text-[10px] -mt-2 ${darkMode ? 'text-zinc-550' : 'text-zinc-400'}`}>
          Add a rate per traveler type, e.g. Solo, Couple (per person), Group of 4+ (per person).
        </p>
        {form.pricingTiers.map((tier, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" className={`${inputCls} flex-1 min-w-0`} placeholder="e.g. Solo" value={tier.label} onChange={e => setPricingTierItem(i, 'label', e.target.value)} />
            <input type="number" className={`${inputClsFixedWidth} w-28`} placeholder="₹ Price" value={tier.price} onChange={e => setPricingTierItem(i, 'price', e.target.value)} />
            {form.pricingTiers.length > 1 && (
              <button type="button" onClick={() => set('pricingTiers', form.pricingTiers.filter((_, ii) => ii !== i))} className="text-red-400 px-1">
                <Minus size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={cardCls}>
        <div>
          <label className={labelCls}>Available Seats</label>
          <input type="number" min="0" className={inputCls} value={form.availableSeats} onChange={e => set('availableSeats', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('category', c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  form.category === c ? 'bg-spy-orange border-spy-orange text-white' : darkMode ? 'border-white/10 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <label className={labelCls}>Trip Highlights</label>
          <button type="button" onClick={() => set('highlights', [...form.highlights, ''])} className="text-spy-orange">
            <Plus size={16} />
          </button>
        </div>
        {form.highlights.map((h, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" className={`${inputCls} flex-1`} placeholder={`Highlight ${i + 1}`} value={h} onChange={e => setListItem('highlights', i, e.target.value)} />
            {form.highlights.length > 1 && (
              <button type="button" onClick={() => set('highlights', form.highlights.filter((_, ii) => ii !== i))} className="text-red-400 px-2">
                <Minus size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPickup = () => (
    <div className="space-y-4">
      {errors.basic && (
        <div className={`flex gap-2 items-center p-3 rounded-xl text-xs ${darkMode ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          <AlertCircle size={14} /> {errors.basic}
        </div>
      )}

      {/* Single pickup location + per-person price */}
      <div className={cardCls}>
        <label className={labelCls}>Pickup Location & Pricing *</label>
        <p className={`text-[10px] -mt-2 ${darkMode ? 'text-zinc-550' : 'text-zinc-400'}`}>
          The one city you pick travellers up from, with the per-person price from there — e.g. Manali ₹6000.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Bus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" className={`${inputCls} pl-9`} placeholder="e.g. Manali" value={form.pickup.location} onChange={e => setPickupField('location', e.target.value)} />
          </div>
          <input type="number" min="0" className={`${inputClsFixedWidth} w-28`} placeholder="₹ Price" value={form.pickup.price} onChange={e => setPickupField('price', e.target.value)} />
        </div>
      </div>

      {/* Trek/travel start point — exact map location the organizer picks */}
      <div className={cardCls}>
        <label className={labelCls}>Start Point *</label>
        <p className={`text-[10px] -mt-2 ${darkMode ? 'text-zinc-550' : 'text-zinc-400'}`}>
          Drop a pin at the exact spot the trek/travel begins. Travellers get a one-tap Google Maps link to reach it.
        </p>

        {form.startPoint ? (
          <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-zinc-950/60 border border-white/5' : 'bg-zinc-50 border border-zinc-100'}`}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-spy-orange/15 text-spy-orange">
              <Navigation size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{form.startPoint.label}</p>
              <p className={`text-[10px] font-mono ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {form.startPoint.lat.toFixed(5)}, {form.startPoint.lng.toFixed(5)}
              </p>
            </div>
            <button
              type="button"
              id="btn-edit-start-point"
              onClick={() => setShowStartPointPicker(true)}
              className={`p-2 rounded-lg shrink-0 ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-zinc-500 shadow-sm'}`}
            >
              <Edit3 size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            id="btn-set-start-point"
            onClick={() => setShowStartPointPicker(true)}
            className={`w-full py-3 rounded-xl text-sm font-bold border-2 border-dashed flex items-center justify-center gap-2 transition ${
              darkMode ? 'border-white/10 text-zinc-400 hover:border-spy-orange/40 hover:text-spy-orange' : 'border-zinc-200 text-zinc-500 hover:border-spy-orange hover:text-spy-orange'
            }`}
          >
            <MapPin size={16} /> Set Start Point on Map
          </button>
        )}
      </div>

      {/* Batch departure dates */}
      <div className={cardCls}>
        <label className={labelCls}>Batch Departure Dates *</label>
        <p className={`text-[10px] -mt-2 ${darkMode ? 'text-zinc-550' : 'text-zinc-400'}`}>
          Pick every future date this trek departs. Travellers filter and book against these exact dates.
        </p>

        <button
          type="button"
          onClick={() => setShowBatchDatePicker(true)}
          className={`w-full py-3 rounded-xl text-sm font-bold border-2 border-dashed flex items-center justify-center gap-2 transition ${
            darkMode ? 'border-white/10 text-zinc-400 hover:border-spy-orange/40 hover:text-spy-orange' : 'border-zinc-200 text-zinc-500 hover:border-spy-orange hover:text-spy-orange'
          }`}
        >
          <CalendarDays size={16} /> Select Batch Dates
        </button>

        {form.departureDates.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {form.departureDates.map(dt => {
              const dateObj = new Date(`${dt}T00:00:00`);
              const label = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <span
                  key={dt}
                  className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold ${
                    darkMode ? 'bg-spy-orange/15 text-spy-orange' : 'bg-spy-orange/10 text-spy-orange'
                  }`}
                >
                  {label}
                  <button type="button" onClick={() => toggleBatchDate(dt)} className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <OrgBatchDatePicker
        open={showBatchDatePicker}
        selectedDates={form.departureDates}
        onToggleDate={toggleBatchDate}
        onClose={() => setShowBatchDatePicker(false)}
        darkMode={darkMode}
      />

      <OrgStartPointPicker
        open={showStartPointPicker}
        initialPoint={form.startPoint}
        onConfirm={(pt) => { set('startPoint', pt); setShowStartPointPicker(false); }}
        onClose={() => setShowStartPointPicker(false)}
        darkMode={darkMode}
      />
    </div>
  );

  const renderInclusions = () => (
    <div className="space-y-4">
      {/* Included */}
      <div className={cardCls}>
        <label className={`${labelCls} text-emerald-400`}>Included in Price</label>
        {form.included.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Check size={13} className="text-emerald-400 shrink-0" />
            <input type="text" className={`${inputCls} flex-1`} value={item} onChange={e => setListItem('included', i, e.target.value)} />
            <button type="button" onClick={() => set('included', form.included.filter((_, ii) => ii !== i))} className="text-red-400"><Minus size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => set('included', [...form.included, ''])} className="text-xs text-spy-orange font-semibold flex items-center gap-1">
          <Plus size={13} /> Add item
        </button>
      </div>

      {/* Not included */}
      <div className={cardCls}>
        <label className={`${labelCls} text-red-400`}>Not Included</label>
        {form.notIncluded.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Minus size={13} className="text-red-400 shrink-0" />
            <input type="text" className={`${inputCls} flex-1`} value={item} onChange={e => setListItem('notIncluded', i, e.target.value)} />
            <button type="button" onClick={() => set('notIncluded', form.notIncluded.filter((_, ii) => ii !== i))} className="text-red-400"><Minus size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => set('notIncluded', [...form.notIncluded, ''])} className="text-xs text-spy-orange font-semibold flex items-center gap-1">
          <Plus size={13} /> Add item
        </button>
      </div>

      {/* Cancellation policy */}
      <div className={cardCls}>
        <label className={labelCls}>Cancellation Policy</label>
        {form.cancellationPolicy.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" className={`${inputCls} flex-1`} value={item} onChange={e => setListItem('cancellationPolicy', i, e.target.value)} />
            <button type="button" onClick={() => set('cancellationPolicy', form.cancellationPolicy.filter((_, ii) => ii !== i))} className="text-red-400"><Minus size={13} /></button>
          </div>
        ))}
        <button type="button" onClick={() => set('cancellationPolicy', [...form.cancellationPolicy, ''])} className="text-xs text-spy-orange font-semibold flex items-center gap-1">
          <Plus size={13} /> Add policy rule
        </button>
      </div>
    </div>
  );

  const renderItinerary = () => (
    <div className="space-y-3">
      {form.itinerary.map((day, i) => (
        <div key={i} className={cardCls}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-spy-orange">Day {day.day}</span>
            {form.itinerary.length > 1 && (
              <button type="button" onClick={() => set('itinerary', form.itinerary.filter((_, ii) => ii !== i))} className="text-red-400 text-xs">Remove</button>
            )}
          </div>
          <input type="text" className={inputCls} placeholder="Day title (e.g. Drive to Base)" value={day.title} onChange={e => setItineraryItem(i, 'title', e.target.value)} />
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Day description..." value={day.description} onChange={e => setItineraryItem(i, 'description', e.target.value)} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => set('itinerary', [...form.itinerary, { day: form.itinerary.length + 1, title: '', description: '' }])}
        className={`w-full py-3 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2 transition ${
          darkMode ? 'border-white/10 text-zinc-500 hover:border-spy-orange/40 hover:text-spy-orange' : 'border-zinc-200 text-zinc-400 hover:border-spy-orange hover:text-spy-orange'
        }`}
      >
        <Plus size={14} /> Add Day
      </button>
    </div>
  );

  const renderFaqs = () => (
    <div className="space-y-3">
      {form.faqs.map((faq, i) => (
        <div key={i} className={cardCls}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-spy-orange">FAQ {i + 1}</span>
            {form.faqs.length > 1 && (
              <button type="button" onClick={() => set('faqs', form.faqs.filter((_, ii) => ii !== i))} className="text-red-400 text-xs">Remove</button>
            )}
          </div>
          <input type="text" className={inputCls} placeholder="Question" value={faq.question} onChange={e => setFaqItem(i, 'question', e.target.value)} />
          <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Answer" value={faq.answer} onChange={e => setFaqItem(i, 'answer', e.target.value)} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => set('faqs', [...form.faqs, { question: '', answer: '' }])}
        className={`w-full py-3 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2 transition ${
          darkMode ? 'border-white/10 text-zinc-500 hover:border-spy-orange/40 hover:text-spy-orange' : 'border-zinc-200 text-zinc-400 hover:border-spy-orange hover:text-spy-orange'
        }`}
      >
        <Plus size={14} /> Add FAQ
      </button>
    </div>
  );

  const sectionContent = { basic: renderBasic, details: renderDetails, pickup: renderPickup, inclusions: renderInclusions, itinerary: renderItinerary, faqs: renderFaqs };

  const currentIdx = sections.findIndex(s => s.id === section);
  const isLastStep = currentIdx === sections.length - 1;

  const handleNextStep = () => {
    if (!isLastStep) {
      setSection(sections[currentIdx + 1].id);
    }
  };

  return (
    <div className={`h-full flex flex-col font-sans ${darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-zinc-800'}`}>
      
      {/* Header */}
      <div className={`shrink-0 px-5 pt-5 pb-4 ${darkMode ? 'bg-zinc-900/80 border-b border-white/5' : 'bg-white border-b border-zinc-100 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={onBack} className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'} transition`}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-display font-black tracking-tight">{isEdit ? 'Edit Trip' : 'Post New Trip'}</h1>
            <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{isEdit ? `Editing: ${trip.name}` : 'Fill in trip details below'}</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {sections.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                section === s.id ? 'bg-spy-orange text-white' : darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable form body */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {(sectionContent[section] || (() => null))()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className={`shrink-0 px-5 py-4 flex gap-3 ${darkMode ? 'bg-zinc-900/80 border-t border-white/5' : 'bg-white border-t border-zinc-100 shadow-sm'}`}>
        <button
          type="button"
          onClick={() => handleSave('Draft')}
          disabled={saving}
          className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
            darkMode ? 'border-white/10 text-zinc-300 hover:border-white/20' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
          }`}
        >
          Save Draft
        </button>
        {isLastStep ? (
          <button
            type="button"
            onClick={() => handleSave('Published')}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-spy-orange hover:bg-[#d96d1a] text-white shadow-lg shadow-spy-orange/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (isEdit ? 'Update & Publish' : 'Publish Trip')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNextStep}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-spy-orange hover:bg-[#d96d1a] text-white shadow-lg shadow-spy-orange/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
