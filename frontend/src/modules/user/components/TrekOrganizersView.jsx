/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  ShieldCheck,
  Users,
  Clock,
  Milestone,
  Heart,
  Sparkles,
  X,
  Check,
  Bus,
  ChevronLeft,
  ChevronRight,
  Mountain,
} from "lucide-react";
import {
  durationRange,
  distanceRange,
  nightsRange,
} from "../../../utils/rangeFormat";
import { isPromotedNow } from "../../../utils/promotion";
import PromotedBadge, {
  PROMOTED_RING_CLASS,
} from "../../../components/PromotedBadge";

// Boarding cities this organizer picks travellers up from, each with its own
// per-person price where the organizer has set one; older records without
// per-location pricing fall back to a plain location list (no price shown).
const getPickupPoints = (offer) => {
  const pickup = offer.pickup || offer.pickupOptions?.[0];
  if (pickup) {
    return [{ location: pickup.location, price: pickup.price }];
  }
  const points = offer.pickupPoints?.length
    ? offer.pickupPoints
    : [offer.city || offer.location?.split(",")[0]].filter(Boolean);
  return points.map((location) => ({ location, price: null }));
};

export default function TrekOrganizersView({
  trekName,
  trek = null,
  offers,
  onBack,
  onSelectOrganizerOffer,
  wishlist,
  onToggleWishlist,
  darkMode,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortOption, setSortOption] = useState("PriceLowToHigh");
  const [selectedFilterDate, setSelectedFilterDate] = useState("");

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Get all unique departure dates offered by the different organizers for this trek
  const allDepartureDates = useMemo(() => {
    const dates = new Set();
    offers.forEach((o) => {
      if (o.departureDates) {
        o.departureDates.forEach((d) => {
          if (d >= todayStr) {
            dates.add(d);
          }
        });
      }
    });
    return Array.from(dates).sort();
  }, [offers, todayStr]);

  // Calendar month/year navigation state
  const [calYear, setCalYear] = useState(() => {
    const firstDate = allDepartureDates[0] || todayStr;
    return parseInt(firstDate.split("-")[0]);
  });
  const [calMonth, setCalMonth] = useState(() => {
    const firstDate = allDepartureDates[0] || todayStr;
    return parseInt(firstDate.split("-")[1]) - 1;
  });

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

  const representative = useMemo(
    () => [...offers].sort((a, b) => b.rating - a.rating)[0],
    [offers],
  );

  const filteredOffers = useMemo(() => {
    let result = [...offers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => o.organizer.name.toLowerCase().includes(q));
    }

    if (verifiedOnly) {
      result = result.filter((o) => o.organizer.verified);
    }

    if (selectedFilterDate) {
      result = result.filter(
        (o) =>
          o.departureDates && o.departureDates.includes(selectedFilterDate),
      );
    }

    if (sortOption === "PriceLowToHigh") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === "PriceHighToLow") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === "HighestRated") {
      result.sort((a, b) => b.organizer.rating - a.organizer.rating);
    } else if (sortOption === "Popular") {
      result.sort((a, b) => b.reviewsCount - a.reviewsCount);
    }

    // Currently-promoted organizers always lead, regardless of the chosen
    // sort — a stable sort (Array#sort in every modern engine) keeps the
    // ordering just established within each tier.
    result.sort(
      (a, b) =>
        Number(isPromotedNow(b.organizer?.promotedUntil)) -
        Number(isPromotedNow(a.organizer?.promotedUntil)),
    );
    // Currently-promoted organizers always lead, sorted by their admin-defined promotionPriority.
    // Stable sort preserves whatever order they otherwise arrived in within each tier.
    result.sort((a, b) => {
      const aPromoted = isPromotedNow(a.organizer?.promotedUntil);
      const bPromoted = isPromotedNow(b.organizer?.promotedUntil);
      if (aPromoted !== bPromoted) {
        return Number(bPromoted) - Number(aPromoted);
      }
      if (aPromoted && bPromoted) {
        const aPri =
          a.organizer?.promotionPriority > 0
            ? a.organizer.promotionPriority
            : 999999;
        const bPri =
          b.organizer?.promotionPriority > 0
            ? b.organizer.promotionPriority
            : 999999;
        if (aPri !== bPri) return aPri - bPri;
      }
      return 0;
    });

    return result;
  }, [offers, searchQuery, verifiedOnly, selectedFilterDate, sortOption]);

  const resetFilters = () => {
    setSearchQuery("");
    setVerifiedOnly(false);
    setSortOption("PriceLowToHigh");
    setSelectedFilterDate("");
    const firstDate = allDepartureDates[0] || todayStr;
    setCalYear(parseInt(firstDate.split("-")[0]));
    setCalMonth(parseInt(firstDate.split("-")[1]) - 1);
  };

  const activeFiltersCount =
    (verifiedOnly ? 1 : 0) +
    (sortOption !== "PriceLowToHigh" ? 1 : 0) +
    (selectedFilterDate ? 1 : 0);

  // No organizer has posted a batch for this trek yet (e.g. a "Coming soon"
  // catalog trek) — `representative` below would be undefined, so render the
  // trek itself instead: the same cover, stats and description a live trek
  // gets, plus where it currently sits on the way to opening for bookings.
  if (offers.length === 0) {
    const cover = trek?.coverImage;
    const place =
      [trek?.city, trek?.state].filter(Boolean).join(", ") || trek?.location;
    const stats = [
      trek?.difficulty && {
        icon: Sparkles,
        label: "Grade",
        value: trek.difficulty,
      },
      durationRange(trek) && {
        icon: Clock,
        label: "Duration",
        value: `${durationRange(trek)} Days`,
      },
      distanceRange(trek) && {
        icon: Milestone,
        label: "Distance",
        value: `${distanceRange(trek)} km`,
      },
      trek?.elevationMeters
        ? {
            icon: Mountain,
            label: "Altitude",
            value: `${trek.elevationMeters} m`,
          }
        : null,
    ].filter(Boolean);

    // Where this trek is on the way to being bookable. Only the middle step is
    // live — the catalog listing is already done, bookings are not.
    const pipeline = [
      {
        title: "Added to the catalog",
        body: "Route, stats and itinerary are verified and published.",
        done: true,
      },
      {
        title: "Organizers preparing batches",
        body: "Verified organizers are building departures and pricing.",
        active: true,
      },
      {
        title: "Bookings open",
        body: "You'll be able to compare organizers and book right here.",
        done: false,
      },
    ];

    return (
      // h-full overflow-hidden (matching TrekDetailsView.jsx) is what lets
      // the flex-1 overflow-y-auto div below actually become a bounded,
      // scrollable region — without it, this div's min-height stays 'auto'
      // per the flexbox spec, so it just grows taller than the fixed parent
      // overlay's viewport-sized box and gets silently clipped by THAT
      // overlay's own overflow-hidden instead of scrolling.
      <div
        className={`relative flex flex-col h-full overflow-hidden font-sans ${
          darkMode ? "bg-zinc-950 text-white" : "bg-gray-55 text-zinc-900"
        }`}>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
            {/* Hero — the trek's own cover, rounded panoramic card on desktop */}
            <div className="relative h-64 sm:h-80 md:h-96 shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl border border-white/10">
              {cover ? (
                <img
                  src={cover}
                  alt={trekName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-forest-700 via-forest-600 to-emerald-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />

              {/* Pinned back button inside hero */}
              <button
                id="btn-back-to-trek-source"
                onClick={onBack}
                className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/15 flex items-center justify-center hover:bg-black/70 active:scale-90 shadow-md transition cursor-pointer">
                <ArrowLeft size={18} />
              </button>

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-1.5 bg-spy-orange text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-white"
                    animate={{ opacity: [1, 0.25, 1] }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  Opening soon
                </motion.span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white leading-tight mt-2.5">
                  {trekName}
                </h1>
                {place && (
                  <p className="text-xs sm:text-sm text-white/80 flex items-center gap-1.5 mt-1.5">
                    <MapPin size={14} className="text-spy-orange" /> {place}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop 2-column layout: Left = Stats & Description, Right = What happens next & Action */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
              <div className="md:col-span-7 space-y-6">
                {/* Real stats */}
                {stats.length > 0 && (
                  <div
                    className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border shadow-xs ${
                      darkMode
                        ? "bg-zinc-900/70 border-white/5"
                        : "bg-white border-zinc-200/70"
                    }`}>
                    {stats.map(({ icon: Icon, label, value }) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            darkMode
                              ? "bg-forest-500/15 text-forest-300"
                              : "bg-forest-50 text-forest-600"
                          }`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-[9px] font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                            {label}
                          </p>
                          <p className="text-xs sm:text-sm font-semibold truncate">
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {trek?.description && (
                  <div
                    className={`p-5 rounded-2xl border shadow-xs ${
                      darkMode
                        ? "bg-zinc-900/50 border-white/5"
                        : "bg-white border-zinc-200/70"
                    }`}>
                    <h2 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2 font-mono">
                      About This Trek
                    </h2>
                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${darkMode ? "text-zinc-300" : "text-zinc-600"}`}>
                      {trek.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="md:col-span-5 space-y-5">
                {/* Progress toward bookings */}
                <div
                  className={`p-5 rounded-2xl border shadow-xs ${
                    darkMode
                      ? "bg-zinc-900/50 border-white/5"
                      : "bg-white border-zinc-200/70"
                  }`}>
                  <h3 className="text-sm font-serif font-bold mb-4">
                    What happens next
                  </h3>
                  <div className="relative">
                    <div
                      className={`absolute left-[11px] top-2 bottom-2 w-px ${darkMode ? "bg-white/10" : "bg-zinc-200"}`}
                    />
                    {pipeline.map((step, i) => (
                      <motion.div
                        key={step.title}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 * i, duration: 0.25 }}
                        className="relative flex gap-3 pb-4 last:pb-0">
                        <div className="relative z-10 shrink-0">
                          {step.done ? (
                            <div className="w-6 h-6 rounded-full bg-forest-500 text-white flex items-center justify-center">
                              <Check size={13} strokeWidth={3} />
                            </div>
                          ) : step.active ? (
                            <div className="w-6 h-6 rounded-full bg-spy-orange text-white flex items-center justify-center relative">
                              <motion.span
                                className="absolute inset-0 rounded-full bg-spy-orange"
                                animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                                transition={{
                                  duration: 1.8,
                                  repeat: Infinity,
                                  ease: "easeOut",
                                }}
                              />
                              <Sparkles size={12} className="relative" />
                            </div>
                          ) : (
                            <div
                              className={`w-6 h-6 rounded-full border-2 ${darkMode ? "border-white/15 bg-zinc-950" : "border-zinc-200 bg-gray-55"}`}
                            />
                          )}
                        </div>
                        <div
                          className={`min-w-0 ${step.done || step.active ? "" : "opacity-55"}`}>
                          <p className="text-xs font-semibold leading-tight">
                            {step.title}
                          </p>
                          <p
                            className={`text-[11px] leading-relaxed mt-0.5 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                            {step.body}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onBack}
                  className="w-full py-3.5 px-4 rounded-2xl bg-forest-600 hover:bg-forest-700 text-white text-sm font-semibold active:scale-[0.98] transition shadow-md flex items-center justify-center gap-2 cursor-pointer">
                  <span>Browse treks you can book now</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden font-sans ${
        darkMode ? "bg-zinc-950 text-white" : "bg-gray-55 text-zinc-900"
      }`}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {/* 1. Hero banner using the top-rated organizer's cover image */}
          <div className="relative h-56 sm:h-72 md:h-80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-white/10 shrink-0 mb-6 bg-zinc-950">
            <img
              src={representative.coverImage}
              alt={trekName}
              className="absolute inset-0 w-full h-full object-cover brightness-[0.55]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/35 to-black/20" />

            {/* Back button */}
            <div className="absolute top-4 left-4 z-30">
              <button
                id="btn-back-to-trek-source"
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/15 flex items-center justify-center hover:bg-black/70 active:scale-90 shadow-md transition cursor-pointer">
                <ArrowLeft size={18} />
              </button>
            </div>

            <div className="absolute bottom-5 sm:bottom-6 left-5 sm:left-7 right-5 sm:right-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="min-w-0">
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-widest block mb-1 ${
                    darkMode ? "text-elegant-orange" : "text-forest-200"
                  }`}>
                  {offers.length} Organizer{offers.length > 1 ? "s" : ""}{" "}
                  Offering This Trek
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-white leading-tight truncate">
                  {trekName}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-200/90 flex items-center gap-1.5 mt-1.5">
                  <MapPin size={13} className="text-spy-orange shrink-0" />
                  {representative.location}, {representative.state}
                </p>
              </div>

              {/* Shared trek stats */}
              <div
                className={`shrink-0 flex items-center gap-3 p-2.5 px-4 rounded-2xl backdrop-blur-md border ${
                  darkMode
                    ? "bg-zinc-900/80 border-white/10 text-white"
                    : "bg-white/90 border-white/20 text-zinc-900"
                }`}>
                {[
                  { label: "Difficulty", value: representative.difficulty },
                  {
                    label: "Duration",
                    value: `${durationRange(representative)}D`,
                  },
                  {
                    label: "Distance",
                    value: `${distanceRange(representative)}km`,
                  },
                ].map((st, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center px-1">
                    <span className="text-xs sm:text-sm font-black font-display">
                      {st.value}
                    </span>
                    <span className="text-[8.5px] opacity-60 uppercase font-semibold mt-0.5">
                      {st.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Search + filter row */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="organizer-search-input"
                  placeholder="Search organizers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-xs pl-9 pr-8 py-3 rounded-xl outline-hidden border ${
                    darkMode
                      ? "bg-zinc-900 border-white/5 text-white"
                      : "bg-white border-gray-200 text-zinc-800"
                  }`}
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  size={14}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                id="btn-toggle-organizer-filters"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3.5 rounded-xl border flex items-center justify-center relative active:scale-95 cursor-pointer ${
                  showFilters || activeFiltersCount > 0
                    ? "bg-forest-600 border-forest-500 text-white"
                    : darkMode
                      ? "bg-zinc-900 border-white/5 text-zinc-300"
                      : "bg-white border-gray-200 text-zinc-700"
                }`}>
                <SlidersHorizontal size={16} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-spy-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white dark:border-zinc-950">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className={`rounded-2xl overflow-hidden ${darkMode ? "bg-zinc-900" : "bg-white shadow-xs"}`}>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-display font-extrabold flex items-center gap-1">
                        <Sparkles size={13} className="text-spy-orange" />{" "}
                        Refine Organizers
                      </span>
                      <button
                        onClick={resetFilters}
                        className="text-[10px] font-bold text-rose-500 hover:underline">
                        Reset
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                        Sort By
                      </label>
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className={`w-full text-[11px] px-2.5 py-2 rounded-lg outline-hidden border ${
                          darkMode
                            ? "bg-zinc-950 border-zinc-850 text-zinc-300"
                            : "bg-gray-150 border-gray-250 text-zinc-800"
                        }`}>
                        <option value="PriceLowToHigh">
                          Price: Low to High
                        </option>
                        <option value="PriceHighToLow">
                          Price: High to Low
                        </option>
                        <option value="HighestRated">Highest Rated</option>
                        <option value="Popular">Most Reviewed</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                          Departure Date (Organizer Batches Only)
                        </label>
                        {selectedFilterDate && (
                          <button
                            type="button"
                            onClick={() => setSelectedFilterDate("")}
                            className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer">
                            Clear Date
                          </button>
                        )}
                      </div>

                      <div
                        className={`p-4 rounded-2xl border ${
                          darkMode
                            ? "bg-zinc-950/60 border-zinc-850"
                            : "bg-gray-100/50 border-zinc-200"
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

                            const isAvailable = allDepartureDates.includes(
                              cell.dateStr,
                            );
                            const isPast = cell.dateStr < todayStr;
                            const isSelectable = isAvailable && !isPast;
                            const isSelected =
                              selectedFilterDate === cell.dateStr;

                            return (
                              <button
                                key={cell.dateStr}
                                type="button"
                                disabled={!isSelectable}
                                onClick={() =>
                                  setSelectedFilterDate(cell.dateStr)
                                }
                                className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                                  isSelectable
                                    ? isSelected
                                      ? darkMode
                                        ? "bg-forest-500 text-white font-black shadow-md border border-forest-400 cursor-pointer"
                                        : "bg-forest-600 text-white font-black shadow-md cursor-pointer"
                                      : darkMode
                                        ? "bg-forest-950/30 border border-forest-500/30 text-forest-400 hover:bg-forest-900/50 hover:border-forest-500/60 font-bold cursor-pointer"
                                        : "bg-forest-50 border border-forest-500/20 text-forest-700 hover:bg-forest-100/70 hover:border-forest-500/50 font-bold cursor-pointer"
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
                    </div>

                    <button
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                        verifiedOnly
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                          : darkMode
                            ? "border-white/10 text-zinc-400"
                            : "border-zinc-200 text-zinc-500"
                      }`}>
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck size={14} /> Verified Organizers Only
                      </span>
                      {verifiedOnly && <Check size={14} />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results metadata */}
            <div className="flex justify-between items-center text-[10px] opacity-60">
              <span>
                SHOWING {filteredOffers.length} OF {offers.length} ORGANIZERS
              </span>
              {activeFiltersCount > 0 && (
                <span className="text-spy-orange font-semibold">
                  FILTERS APPLIED
                </span>
              )}
            </div>

            {/* 4. Organizer offer cards */}
            {filteredOffers.length === 0 ? (
              <div className="text-center py-14">
                <span className="text-4xl block">🔍</span>
                <h3 className="text-sm font-display font-black mt-3">
                  No Organizers Matched
                </h3>
                <p
                  className={`text-xs mt-1 px-6 leading-relaxed ${darkMode ? "text-zinc-500" : "text-zinc-400"}`}>
                  Try clearing your search or filters to see all organizers
                  offering this trek.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-3 bg-forest-600 hover:bg-forest-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOffers.map((offer, idx) => {
                  const isSaved = wishlist.includes(offer.id);
                  const isPromoted = isPromotedNow(
                    offer.organizer?.promotedUntil,
                  );
                  const pObj =
                    offer.pickup ||
                    offer.pickupOptions?.[0] ||
                    (offer.pickupPoints?.length
                      ? { location: offer.pickupPoints[0], price: null }
                      : null);
                  const pickupLoc =
                    pObj?.location ||
                    offer.city ||
                    (offer.location
                      ? offer.location.split(",")[0]
                      : "Base Camp");
                  const pickupPrice =
                    pObj?.price != null ? `₹${pObj.price}` : null;
                  const startLabel =
                    offer.startPoint?.label || offer.location || "";
                  return (
                    <motion.div
                      key={offer.id}
                      id={`organizer-offer-card-${offer.id}`}
                      onClick={() => onSelectOrganizerOffer(offer)}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: Math.min(idx * 0.05, 0.25),
                        duration: 0.2,
                      }}
                      whileHover={{ y: -2, scale: 1.005 }}
                      className={`p-3 rounded-2xl cursor-pointer active:scale-[0.99] transition relative ${
                        isPromoted ? PROMOTED_RING_CLASS : ""
                      } ${
                        darkMode
                          ? "bg-zinc-900 hover:bg-zinc-900/80"
                          : "bg-white shadow-xs hover:shadow-sm"
                      }`}>
                      {isPromoted && (
                        <PromotedBadge className="absolute -top-2 left-3 z-10" />
                      )}
                      <button
                        id={`btn-toggle-wishlist-offer-${offer.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWishlist(offer.id);
                        }}
                        className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center border active:scale-90 transition ${
                          isSaved
                            ? "bg-rose-500 border-rose-500 text-white"
                            : darkMode
                              ? "bg-zinc-950/60 border-white/10 text-zinc-400"
                              : "bg-gray-55 border-gray-200 text-zinc-400"
                        }`}>
                        <Heart size={12} fill={isSaved ? "white" : "none"} />
                      </button>

                      <div className="flex items-center gap-3 pr-9">
                        <img
                          src={offer.organizer.avatar}
                          alt={offer.organizer.name}
                          className="w-12 h-12 rounded-full object-cover border border-forest-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold font-display flex items-center gap-1 truncate">
                            {offer.organizer.name}
                            {offer.organizer.verified && (
                              <ShieldCheck
                                size={12}
                                className="text-emerald-400 fill-emerald-400/25 shrink-0"
                              />
                            )}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                            <span className="flex items-center gap-0.5 font-bold text-amber-500">
                              <Star size={10} className="fill-amber-400" />{" "}
                              {offer.organizer.rating}
                            </span>
                            <span className="opacity-50">
                              ({offer.reviewsCount} reviews)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-3 mt-2.5 pt-2.5 border-t text-[9px] ${darkMode ? "border-white/5 text-zinc-400" : "border-zinc-100 text-zinc-500"}`}>
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} className="text-forest-400" />{" "}
                          {durationRange(offer)}D / {nightsRange(offer)}N
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Milestone size={10} className="text-forest-400" />{" "}
                          {distanceRange(offer)} Km
                        </span>
                        <span className="flex items-center gap-0.5 ml-auto font-medium">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${offer.availableSeats <= 5 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`}
                          />
                          {offer.availableSeats} seats left
                        </span>
                      </div>

                      {/* Boarding/pickup point and starting trailhead details */}
                      <div className="flex items-center flex-wrap gap-2 mt-2.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] uppercase font-bold tracking-wider opacity-45 flex items-center gap-0.5">
                            <Bus size={10} className="text-forest-400" /> Pickup
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              darkMode
                                ? "bg-forest-500/15 text-forest-400"
                                : "bg-forest-500/10 text-forest-600"
                            }`}>
                            Ex-{pickupLoc}
                            {pickupPrice ? ` · ${pickupPrice}` : ""}
                          </span>
                        </div>

                        {startLabel && (
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] uppercase font-bold tracking-wider opacity-45 flex items-center gap-0.5">
                              <MapPin size={10} className="text-forest-400" />{" "}
                              Start
                            </span>
                            <span
                              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full truncate ${
                                darkMode
                                  ? "bg-zinc-800 text-zinc-300"
                                  : "bg-zinc-100/80 text-zinc-650"
                              }`}
                              style={{ maxWidth: "140px" }}
                              title={startLabel}>
                              {startLabel}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Batch pricing tier chips (falls back to a single rate for
                        legacy trip records saved before batch pricing existed) */}
                      <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar">
                        {(offer.pricingTiers && offer.pricingTiers.length > 0
                          ? offer.pricingTiers
                          : [
                              {
                                id: "base",
                                label: "Per Person",
                                price: offer.price,
                              },
                            ]
                        ).map((tier) => (
                          <span
                            key={tier.id}
                            className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap border ${
                              darkMode
                                ? "bg-zinc-950/60 border-white/10 text-zinc-300"
                                : "bg-zinc-50 border-zinc-150 text-zinc-600"
                            }`}>
                            {tier.label.replace(" (per person)", "")}: ₹
                            {tier.price}
                          </span>
                        ))}
                      </div>

                      <div
                        className={`flex items-center justify-between mt-2.5 pt-2.5 border-t ${darkMode ? "border-white/5" : "border-zinc-100"}`}>
                        <div className="flex flex-col">
                          <span className="text-[8px] uppercase tracking-wider opacity-55 font-bold">
                            STARTING FROM
                          </span>
                          <span
                            className={`text-sm font-black font-sans ${darkMode ? "text-forest-400" : "text-forest-650"}`}>
                            ₹{offer.price}
                          </span>
                        </div>
                        <button
                          className={`text-[9px] uppercase font-black px-3.5 py-1.5 rounded-lg flex items-center gap-0.5 cursor-pointer active:scale-95 transition ${
                            darkMode
                              ? "bg-elegant-green text-white hover:bg-forest-600"
                              : "bg-forest-600 hover:bg-forest-700 text-white"
                          }`}>
                          View Details <Sparkles size={10} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
