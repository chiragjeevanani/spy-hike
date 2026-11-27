import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { durationRange, distanceRange, nightsRange } from "../../../utils/rangeFormat";
import tripsApi from "../../../lib/tripsApi";

export const organizerIdentity = (offer) =>
  (offer.organizerEmail || offer.organizer?.id || offer.organizer?.name || "").trim().toLowerCase();

const missing = "Not provided";
const money = (value) => value != null && Number.isFinite(Number(value))
  ? `₹${Number(value).toLocaleString("en-IN")}` : missing;
const list = (items) => items?.length ? (
  <ul className="space-y-2 list-disc pl-4">
    {items.map((item, index) => <li key={index}>{item}</li>)}
  </ul>
) : missing;
const dateLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Native modal dialog provides keyboard focus containment, Escape dismissal,
// and focus restoration to the comparison button when closed.
export default function OrganizerComparison({ offers, trekName, darkMode, onClose, onSelect }) {
  const dialogRef = useRef(null);
  const [fullOffers, setFullOffers] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dismiss = (event) => {
    event?.preventDefault();
    dialogRef.current.close();
    onClose();
  };
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  // Catalog responses intentionally omit long-form details. Read each full
  // listing before comparing so absent catalog fields aren't shown as missing.
  useEffect(() => {
    let cancelled = false;
    setFullOffers(null);
    setError(false);
    Promise.all(offers.map((offer) => tripsApi.getTrip(offer.id)))
      .then((details) => { if (!cancelled) setFullOffers(details); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [offers, attempt]);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const rows = [
    ["Verified organizer", (o) => o.organizer.verified ? "Verified" : "Not verified"],
    ["Organizer rating", (o) => o.organizer.rating != null ? `${o.organizer.rating} / 5` : missing],
    ["Trip rating & reviews", (o) => `${o.rating ?? 0} / 5 · ${o.reviewsCount ?? 0} reviews`],
    ["Starting price", (o) => money(o.price)],
    ["Pricing tiers (per person)", (o) => list(o.pricingTiers?.length ? o.pricingTiers.map((tier) => `${tier.label}: ${money(tier.price)}`) : [`Per person: ${money(o.price)}`])],
    ["Pickup / boarding", (o) => {
      const points = o.pickup ? [o.pickup] : o.pickupOptions;
      return points?.length ? list(points.map((p) => `${p.location || missing}${p.price != null ? ` · ${money(p.price)}` : ""}`)) : list(o.pickupPoints);
    }],
    ["Starting point", (o) => o.startPoint?.label || o.location || missing],
    ["Upcoming departures", (o) => {
      const dates = [...new Set(o.departureDates || [])].filter((d) => d >= todayStr).sort();
      return dates.length ? list(dates.map(dateLabel)) : "No upcoming dates listed";
    }],
    ["Duration", (o) => o.durationDays != null ? `${durationRange(o)} days / ${nightsRange(o)} nights` : missing],
    ["Difficulty", (o) => o.difficulty || missing],
    ["Distance", (o) => o.distanceKm != null ? `${distanceRange(o)} km` : missing],
    ["Altitude", (o) => o.elevationMeters != null ? `${o.elevationMeters.toLocaleString("en-IN")} m` : missing],
    ["Maximum group size", (o) => o.maxGroupSize ?? missing],
    ["Available seats", (o) => o.availableSeats ?? missing],
    ["About the trip", (o) => o.description || missing],
    ["Highlights", (o) => list(o.highlights)],
    ["Included", (o) => list(o.included)],
    ["Not included", (o) => list(o.notIncluded)],
    ["Itinerary", (o) => list(o.itinerary?.map((day) => <React.Fragment key={day.day}><strong>Day {day.day}: {day.title}</strong>{day.description && <p className="mt-1 font-normal">{day.description}</p>}</React.Fragment>))],
    ["Safety guidelines", (o) => list(o.safetyGuidelines)],
    ["Cancellation policy", (o) => list(o.cancellationPolicy)],
    ["FAQs", (o) => list(o.faqs?.map((faq, index) => <React.Fragment key={index}><strong>{faq.question}</strong><p className="mt-1 font-normal">{faq.answer}</p></React.Fragment>))],
  ];

  return createPortal(
    <dialog ref={dialogRef} aria-labelledby="organizer-comparison-title" onCancel={dismiss}
      className={`m-auto w-[calc(100%-1rem)] max-w-4xl max-h-[92dvh] rounded-2xl p-0 shadow-2xl backdrop:bg-black/60 ${darkMode ? "bg-zinc-900 text-zinc-100" : "bg-white text-zinc-900"}`}>
      <div className="p-4 sm:p-6 border-b border-zinc-400/20 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 id="organizer-comparison-title" className="text-lg font-bold">Compare organizers</h2>
          <p className="text-xs opacity-70 mt-1">{trekName}</p>
          <p className="text-xs opacity-70 mt-2">Prices are per person. Check the listed tiers and pickup details; your final price is confirmed at booking.</p>
        </div>
        <button type="button" aria-label="Close comparison" onClick={dismiss} className="p-2 rounded-full border border-zinc-400/30"><X size={18} /></button>
      </div>
      {error ? <div role="alert" className="p-6 text-sm">
        <p>Could not load the trip details. Please try again.</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 bg-forest-600 text-white rounded-lg px-4 py-2">Retry comparison</button>
      </div> : !fullOffers ? <p role="status" className="p-6 text-sm">Loading trip details…</p> : <table className="w-full table-fixed text-xs sm:text-sm">
        <caption className="sr-only">Trip details from two different organizers for {trekName}</caption>
        <thead className={`sticky top-0 z-10 ${darkMode ? "bg-zinc-900" : "bg-white"}`}>
          <tr>
            <th scope="col" className="w-[26%] p-2 sm:p-4 text-left">Details</th>
            {fullOffers.map((o) => <th key={o.id} scope="col" className="p-2 sm:p-4 text-left align-top break-words border-l border-zinc-400/20">
              <span className="block mb-3">{o.organizer.name}</span>
              <button type="button" onClick={() => onSelect(o)} className="bg-forest-600 text-white rounded-lg p-2 text-xs font-bold">View trip details<span className="sr-only"> for {o.organizer.name}</span></button>
            </th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => <tr key={label} className="border-t border-zinc-400/20">
            <th scope="row" className="p-2 sm:p-4 text-left align-top font-semibold break-words">{label}</th>
            {fullOffers.map((o) => <td key={o.id} className="p-2 sm:p-4 align-top break-words border-l border-zinc-400/20 leading-relaxed">{value(o)}</td>)}
          </tr>)}
        </tbody>
      </table>}
    </dialog>, document.body,
  );
}
