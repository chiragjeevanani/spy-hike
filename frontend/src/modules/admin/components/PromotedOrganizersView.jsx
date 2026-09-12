import React, { useEffect, useState } from "react";
import {
  Flame,
  Crown,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Save,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Star,
  Compass,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import promotionsApi from "../../../lib/promotionsApi";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { useToast } from "../../../components/ToastProvider";
import { AdminSkeletonCard } from "./AdminSkeleton";

export default function PromotedOrganizersView({ onOpenOrganizer, darkMode }) {
  const [organizers, setOrganizers] = useState([]);
  const [initialIds, setInitialIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [unpromoteTarget, setUnpromoteTarget] = useState(null);
  const [unpromoting, setUnpromoting] = useState(false);
  const toast = useToast();

  const loadPromoted = async () => {
    setLoading(true);
    try {
      const list = await promotionsApi.listPromotedOrganizers();
      const orgs = Array.isArray(list) ? list : [];
      setOrganizers(orgs);
      setInitialIds(orgs.map((o) => o.id));
    } catch (err) {
      toast.error(
        "Failed to load promoted organizers: " +
          (err?.message || "Unknown error"),
      );
      setOrganizers([]);
      setInitialIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromoted();
  }, []);

  const currentIds = organizers.map((o) => o.id);
  const isDirty =
    currentIds.length > 0 &&
    (currentIds.length !== initialIds.length ||
      currentIds.some((id, idx) => id !== initialIds[idx]));

  // ── Drag & Drop Handlers ───────────────────────────────────────────────────

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Transparent or styled ghost image if needed
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {
      // ignore
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...organizers];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setOrganizers(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ── Button Reordering Handlers ─────────────────────────────────────────────

  const moveItem = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= organizers.length) return;
    const updated = [...organizers];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setOrganizers(updated);
  };

  const moveToTop = (index) => moveItem(index, 0);
  const moveToBottom = (index) => moveItem(index, organizers.length - 1);
  const moveUp = (index) => moveItem(index, index - 1);
  const moveDown = (index) => moveItem(index, index + 1);

  // ── Save Reordered Priority ────────────────────────────────────────────────

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const ids = organizers.map((o) => o.id);
      const updated = await promotionsApi.updatePromotedOrder(ids);
      setOrganizers(Array.isArray(updated) ? updated : organizers);
      setInitialIds(ids);
      toast.success("Promoted organizers display priority saved successfully!");
    } catch (err) {
      toast.error(
        "Failed to save priority order: " + (err?.message || "Unknown error"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetOrder = () => {
    loadPromoted();
  };

  // ── Unpromote Organizer ────────────────────────────────────────────────────

  const handleConfirmUnpromote = async () => {
    if (!unpromoteTarget) return;
    setUnpromoting(true);
    try {
      await promotionsApi.unpromoteOrganizer(unpromoteTarget.id);
      toast.success(
        `${unpromoteTarget.agencyName || unpromoteTarget.name} has been unpromoted.`,
      );
      setUnpromoteTarget(null);
      await loadPromoted();
    } catch (err) {
      toast.error(
        "Failed to unpromote organizer: " + (err?.message || "Unknown error"),
      );
    } finally {
      setUnpromoting(false);
    }
  };

  // ── Expiry Helper ──────────────────────────────────────────────────────────

  const formatDaysRemaining = (until) => {
    if (!until) return null;
    const diffMs = new Date(until).getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Expires today";
    if (days === 1) return "1 day remaining";
    return `${days} days remaining`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          darkMode
            ? "bg-[#131F42] border-slate-800 text-white"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <Flame size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Promoted Organizers
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                  <Sparkles size={12} />
                  {organizers.length} Active
                </span>
              </div>
              <p
                className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Set the exact display sequence for promoted organizers on the
                customer app. Organizers at the top appear first in trek offers
                and listings.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {isDirty && (
              <button
                type="button"
                onClick={handleResetOrder}
                disabled={saving}
                className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-all flex items-center gap-1.5 ${
                  darkMode
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}>
                <RotateCcw size={15} />
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={saving || !isDirty || organizers.length === 0}
              className={`px-5 py-2 text-sm font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all ${
                isDirty
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:opacity-95 shadow-orange-500/25 cursor-pointer ring-2 ring-orange-500/30 ring-offset-1"
                  : darkMode
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }`}>
              <Save size={16} />
              {saving
                ? "Saving Order..."
                : isDirty
                  ? "Save Priority Order *"
                  : "Order Saved"}
            </button>
          </div>
        </div>

        {/* Live Reorder Status Alert */}
        {isDirty && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>
                You have unsaved priority changes. Click{" "}
                <strong>"Save Priority Order"</strong> to apply the new sequence
                to the customer app.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions / Drag Guide */}
      {organizers.length > 1 && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            darkMode
              ? "bg-[#152042]/70 border-slate-800 text-slate-400"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}>
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-slate-400" />
            <span>
              <strong>Tip:</strong> Drag and drop any card using the grab
              handle, or click the <strong>▲ Up</strong> /{" "}
              <strong>▼ Down</strong> buttons to rearrange ranks.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-orange-500 font-semibold">
            Rank #1 leads customer views
          </span>
        </div>
      )}

      {/* Organizer List / Empty State */}
      {loading ? (
        <div className="space-y-4">
          <AdminSkeletonCard darkMode={darkMode} />
          <AdminSkeletonCard darkMode={darkMode} />
          <AdminSkeletonCard darkMode={darkMode} />
        </div>
      ) : organizers.length === 0 ? (
        <div
          className={`p-12 rounded-2xl border text-center ${
            darkMode
              ? "bg-[#131F42] border-slate-800 text-slate-300"
              : "bg-white border-slate-200 text-slate-700"
          }`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <Crown size={32} />
          </div>
          <h3 className="text-lg font-bold mb-1">
            No Active Promoted Organizers
          </h3>
          <p
            className={`text-sm max-w-md mx-auto mb-6 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            There are currently no organizers with an active promotion window.
            When organizers are approved from the{" "}
            <strong>Promotion Requests</strong> queue or directly promoted, they
            will show up here to adjust their display priority.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {organizers.map((org, index) => {
            const isFirst = index === 0;
            const isLast = index === organizers.length - 1;
            const isDragged = draggedIndex === index;
            const isOver = dragOverIndex === index;
            const daysLeft = formatDaysRemaining(org.promotedUntil);

            // Rank badge styling
            let rankBadgeClass = darkMode
              ? "bg-slate-800 text-slate-300 border-slate-700"
              : "bg-slate-100 text-slate-700 border-slate-200";
            let rankText = `#${index + 1}`;

            if (index === 0) {
              rankBadgeClass =
                "bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30 border-amber-400";
            } else if (index === 1) {
              rankBadgeClass = darkMode
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
            } else if (index === 2) {
              rankBadgeClass = darkMode
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-blue-100 text-blue-800 border-blue-300 font-bold";
            }

            return (
              <div
                key={org.id || org.email}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                  isDragged
                    ? "opacity-40 scale-[0.99] border-dashed border-orange-500"
                    : isOver
                      ? "border-orange-500 shadow-md bg-orange-500/5"
                      : darkMode
                        ? "bg-[#131F42] border-slate-800 hover:border-slate-700"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                }`}>
                {/* Left Section: Drag Handle, Rank Badge, Organizer Info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Grip Handle */}
                  <div
                    title="Drag to reorder"
                    className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors">
                    <GripVertical size={20} />
                  </div>

                  {/* Priority Rank Badge */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold border shrink-0 ${rankBadgeClass}`}>
                    {isFirst ? <Crown size={18} /> : rankText}
                  </div>

                  {/* Organizer Avatar */}
                  <img
                    src={
                      org.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        org.agencyName || org.name,
                      )}&background=F27D26&color=fff`
                    }
                    alt={org.agencyName || org.name}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm truncate max-w-[220px] sm:max-w-[320px]">
                        {org.agencyName || org.name}
                      </h4>
                      {isFirst && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          TOP PRIORITY (#1)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs mt-1 flex-wrap text-slate-500 dark:text-slate-400">
                      <span>{org.email}</span>
                      <span className="inline-flex items-center gap-1 font-medium text-amber-500">
                        <Star
                          size={12}
                          className="fill-amber-400 text-amber-400"
                        />
                        {Number(org.rating || 0).toFixed(1)}
                      </span>
                      {Number(org.totalTrips || 0) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Compass size={12} />
                          {org.totalTrips} trips
                        </span>
                      )}
                      {org.promotedUntil && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Calendar size={12} />
                          Until{" "}
                          {new Date(org.promotedUntil).toLocaleDateString()}
                          {daysLeft && (
                            <span className="text-[11px] font-semibold text-orange-500">
                              ({daysLeft})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Ordering Controls & Quick Actions */}
                <div className="flex items-center gap-2 mt-3 sm:mt-0 self-end sm:self-auto shrink-0">
                  {/* Up / Down Navigation Controls */}
                  <div
                    className={`flex items-center rounded-lg border p-0.5 ${
                      darkMode
                        ? "bg-slate-800/80 border-slate-700"
                        : "bg-slate-100 border-slate-200"
                    }`}>
                    <button
                      type="button"
                      onClick={() => moveToTop(index)}
                      disabled={isFirst}
                      title="Move to top (#1)"
                      className="p-1.5 rounded text-slate-400 hover:text-orange-500 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors">
                      <ArrowUpToLine size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={isFirst}
                      title="Move up"
                      className="p-1.5 rounded text-slate-400 hover:text-orange-500 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors">
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={isLast}
                      title="Move down"
                      className="p-1.5 rounded text-slate-400 hover:text-orange-500 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors">
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveToBottom(index)}
                      disabled={isLast}
                      title="Move to bottom"
                      className="p-1.5 rounded text-slate-400 hover:text-orange-500 disabled:opacity-20 disabled:hover:text-slate-400 transition-colors">
                      <ArrowDownToLine size={15} />
                    </button>
                  </div>

                  {/* Profile Link */}
                  {onOpenOrganizer && (
                    <button
                      type="button"
                      onClick={() => onOpenOrganizer(org.email)}
                      title="View organizer details"
                      className={`p-2 rounded-lg border transition-colors ${
                        darkMode
                          ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                          : "border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}>
                      <ExternalLink size={15} />
                    </button>
                  )}

                  {/* Unpromote Action */}
                  <button
                    type="button"
                    onClick={() => setUnpromoteTarget(org)}
                    title="Remove promotion"
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors">
                    Unpromote
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unpromote Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(unpromoteTarget)}
        title="Remove Promotion?"
        message={
          unpromoteTarget
            ? `Are you sure you want to cancel the promotion for "${
                unpromoteTarget.agencyName || unpromoteTarget.name
              }"? They will immediately lose their promoted highlight and top display status in customer trek views.`
            : ""
        }
        confirmText="Yes, Unpromote"
        confirmVariant="danger"
        isLoading={unpromoting}
        onConfirm={handleConfirmUnpromote}
        onClose={() => setUnpromoteTarget(null)}
      />
    </div>
  );
}
