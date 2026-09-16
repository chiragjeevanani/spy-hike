import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Image as ImageIcon,
  Save,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Link2,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Tag,
  Compass,
  TicketPercent,
  ExternalLink,
} from "lucide-react";
import bannersApi from "../../../lib/bannersApi";
import treksApi from "../../../lib/treksApi";
import authApi from "../../../lib/authApi";
import { PROMOTIONAL_BANNERS } from "../../user/data/trips";
import { compressImage } from "../../../utils/imageCompressor";
import { useToast } from "../../../components/ToastProvider";

const PRESET_IMAGES = [
  {
    name: "Valley of Flowers",
    url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Himalayan Ridge",
    url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Western Ghats",
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Snow Summit",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Lush Pine Forest",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
  },
];

export default function BannersCmsView({ darkMode }) {
  const { showToast } = useToast();
  const [banners, setBanners] = useState([]);
  const [originalBanners, setOriginalBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [availableTreks, setAvailableTreks] = useState([]);
  const [imgInputModes, setImgInputModes] = useState({}); // bannerId -> 'upload' | 'url' | 'presets'
  const fileInputRefs = useRef({});

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      bannersApi.adminGetBanners(),
      treksApi.listAllTreks().catch(() => []),
    ])
      .then(([bList, treks]) => {
        if (!isMounted) return;
        const initial =
          Array.isArray(bList) && bList.length > 0
            ? bList
            : PROMOTIONAL_BANNERS;
        setBanners(initial);
        setOriginalBanners(JSON.stringify(initial));
        if (Array.isArray(treks)) setAvailableTreks(treks);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify(banners) !== originalBanners;
  }, [banners, originalBanners]);

  const handleUpdateField = (index, field, value) => {
    setPreviewIdx(index);
    setBanners((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleMove = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    setBanners((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
    setPreviewIdx(target);
  };

  const handleRemove = (index) => {
    if (banners.length <= 1) {
      showToast(
        "You must keep at least one promotional banner slide.",
        "error",
      );
      return;
    }
    setBanners((prev) => prev.filter((_, i) => i !== index));
    if (previewIdx >= banners.length - 1) {
      setPreviewIdx(Math.max(0, banners.length - 2));
    }
  };

  const handleAdd = () => {
    const newBanner = {
      id: `promo-${Date.now()}`,
      title: "New Mountain Expedition",
      subtitle: "Special Seasonal Discount",
      tag: "Special Offer",
      discount: "Flat 10% Off",
      code: "HIKE10",
      img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
      tripId:
        availableTreks[0]?._id ||
        availableTreks[0]?.id ||
        "himalayan-ridge-pass-trek",
      active: true,
    };
    setBanners((prev) => [...prev, newBanner]);
    setPreviewIdx(banners.length);
  };

  const handleFileUpload = async (index, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (JPEG, PNG, WebP).", "error");
      return;
    }
    setPreviewIdx(index);
    try {
      showToast("Compressing image...", "info");
      const compressedDataUrl = await compressImage(file, 900, 0.75);
      showToast("Uploading image to cloud...", "info");
      const res = await authApi.uploadImage(compressedDataUrl);
      const imageUrl = res?.url || compressedDataUrl;
      handleUpdateField(index, "img", imageUrl);
      showToast(
        "Image uploaded! Click 'Save Changes' to publish to Customer App.",
        "success",
      );
    } catch (err) {
      showToast("Failed to upload image: " + err.message, "error");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await bannersApi.adminUpdateBanners(banners);
      if (res && res.banners) {
        setBanners(res.banners);
        setOriginalBanners(JSON.stringify(res.banners));
        if (res.synced) {
          showToast(
            "Promotional banners saved and live in Customer App!",
            "success",
          );
        } else {
          showToast(
            res.error
              ? `Banners saved locally (${res.error}).`
              : "Banners saved locally.",
            "warning",
          );
        }
      } else {
        showToast("Banners saved.", "success");
        setOriginalBanners(JSON.stringify(banners));
      }
    } catch (err) {
      showToast("Error saving banners: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all promotional banners to platform defaults?"))
      return;
    setSaving(true);
    try {
      const res = await bannersApi.adminResetBanners();
      const updated = res.banners || PROMOTIONAL_BANNERS;
      setBanners(updated);
      setOriginalBanners(JSON.stringify(updated));
      setPreviewIdx(0);
      showToast("Restored default promotional banners.", "success");
    } catch (err) {
      showToast("Failed to reset: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const currentPreviewBanner = banners[previewIdx] || banners[0] || {};

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top action header */}
      <div
        className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 ${
          darkMode
            ? "bg-[#0E162F] border-slate-800"
            : "bg-white border-slate-200"
        }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#F27D26] flex items-center justify-center font-bold">
            <ImageIcon size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black font-display text-slate-800 dark:text-white flex items-center gap-2">
              Customer App Home Banners
              {isDirty && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                  Unsaved Changes
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              Customize the promotional carousel slides shown at the top of the
              Customer App home screen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              darkMode
                ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}>
            <RotateCcw size={14} /> Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              isDirty
                ? "bg-[#F27D26] hover:bg-[#d96c1c] text-white"
                : darkMode
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}>
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main split work area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List of Banner Editors (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Banner Slides ({banners.length})
              </span>
              <button
                type="button"
                onClick={handleAdd}
                className="text-xs font-bold text-[#F27D26] hover:text-[#d96c1c] flex items-center gap-1 cursor-pointer">
                <Plus size={14} /> Add Slide
              </button>
            </div>

            {banners.map((banner, index) => {
              const mode = imgInputModes[banner.id] || "upload";
              const setMode = (m) =>
                setImgInputModes((prev) => ({ ...prev, [banner.id]: m }));

              return (
                <div
                  key={banner.id || index}
                  className={`rounded-2xl border transition-all ${
                    index === previewIdx
                      ? "border-[#F27D26]/60 shadow-md ring-1 ring-[#F27D26]/30"
                      : darkMode
                        ? "border-slate-800 bg-[#152243]"
                        : "border-slate-200 bg-white"
                  } ${darkMode ? "bg-[#152243]" : "bg-white"} p-5`}
                  onClick={() => setPreviewIdx(index)}>
                  {/* Card Header & Controls */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-[280px]">
                        {banner.title || "Untitled Banner"}
                      </span>
                      {banner.active === false && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Active toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateField(
                            index,
                            "active",
                            banner.active === false,
                          );
                        }}
                        title={
                          banner.active === false
                            ? "Enable banner"
                            : "Disable banner"
                        }
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          banner.active !== false
                            ? "text-emerald-500 hover:bg-emerald-500/10"
                            : "text-slate-400 hover:bg-slate-500/10"
                        }`}>
                        {banner.active !== false ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(index, -1);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer">
                        <ChevronUp size={14} />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={index === banners.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(index, 1);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer">
                        <ChevronDown size={14} />
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(index);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    {/* Tag / Badge */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Orange Badge Tag
                      </label>
                      <div className="relative">
                        <Tag
                          size={13}
                          className="absolute left-3 top-3 text-slate-400"
                        />
                        <input
                          type="text"
                          value={banner.tag || ""}
                          onChange={(e) =>
                            handleUpdateField(index, "tag", e.target.value)
                          }
                          placeholder="e.g. Monsoon Trail"
                          className={`w-full pl-8 pr-3 py-2 rounded-xl border outline-none font-semibold transition-all focus:border-[#F27D26] ${
                            darkMode
                              ? "bg-slate-900 border-slate-800 text-slate-200"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Banner Title */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Banner Title
                      </label>
                      <input
                        type="text"
                        value={banner.title || ""}
                        onChange={(e) =>
                          handleUpdateField(index, "title", e.target.value)
                        }
                        placeholder="e.g. Valley of Flowers"
                        className={`w-full px-3 py-2 rounded-xl border outline-none font-semibold transition-all focus:border-[#F27D26] ${
                          darkMode
                            ? "bg-slate-900 border-slate-800 text-slate-200"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Subtitle (Optional)
                      </label>
                      <input
                        type="text"
                        value={banner.subtitle || ""}
                        onChange={(e) =>
                          handleUpdateField(index, "subtitle", e.target.value)
                        }
                        placeholder="e.g. Uttarakhand Monsoon Special"
                        className={`w-full px-3 py-2 rounded-xl border outline-none font-semibold transition-all focus:border-[#F27D26] ${
                          darkMode
                            ? "bg-slate-900 border-slate-800 text-slate-200"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      />
                    </div>

                    {/* Promo Code */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Promo Code
                      </label>
                      <div className="relative">
                        <TicketPercent
                          size={13}
                          className="absolute left-3 top-3 text-slate-400"
                        />
                        <input
                          type="text"
                          value={banner.code || ""}
                          onChange={(e) =>
                            handleUpdateField(
                              index,
                              "code",
                              e.target.value.toUpperCase(),
                            )
                          }
                          placeholder="e.g. VALLEY50"
                          className={`w-full pl-8 pr-3 py-2 rounded-xl border outline-none font-mono font-bold tracking-wider uppercase transition-all focus:border-[#F27D26] ${
                            darkMode
                              ? "bg-slate-900 border-slate-800 text-emerald-400"
                              : "bg-slate-50 border-slate-200 text-emerald-600"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Discount Label */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Discount Text
                      </label>
                      <input
                        type="text"
                        value={banner.discount || ""}
                        onChange={(e) =>
                          handleUpdateField(index, "discount", e.target.value)
                        }
                        placeholder="e.g. Save ₹50 or Flat 20% Off"
                        className={`w-full px-3 py-2 rounded-xl border outline-none font-semibold transition-all focus:border-[#F27D26] ${
                          darkMode
                            ? "bg-slate-900 border-slate-800 text-slate-200"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      />
                    </div>

                    {/* Linked Trek (When Claim button is clicked) */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Linked Trek (Claim Button Target)
                      </label>
                      <div className="relative">
                        <Compass
                          size={13}
                          className="absolute left-3 top-3 text-slate-400"
                        />
                        <select
                          value={banner.tripId || ""}
                          onChange={(e) =>
                            handleUpdateField(index, "tripId", e.target.value)
                          }
                          className={`w-full pl-8 pr-3 py-2 rounded-xl border outline-none font-semibold transition-all focus:border-[#F27D26] ${
                            darkMode
                              ? "bg-slate-900 border-slate-800 text-slate-200"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}>
                          <option value="">
                            -- Custom ID or Select Trek --
                          </option>
                          <option value="valley-of-flowers-trek">
                            Valley of Flowers Trek
                          </option>
                          <option value="himalayan-ridge-pass-trek">
                            Himalayan Ridge Pass Trek
                          </option>
                          <option value="western-ghats-monsoon-trail">
                            Western Ghats Monsoon Trail
                          </option>
                          {availableTreks.map((t) => (
                            <option key={t._id || t.id} value={t._id || t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Image Picker */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Banner Background Image
                      </label>
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setMode("upload")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            mode === "upload"
                              ? "bg-white dark:bg-slate-900 text-[#F27D26] shadow-xs"
                              : "text-slate-400 hover:text-slate-600"
                          }`}>
                          Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode("url")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            mode === "url"
                              ? "bg-white dark:bg-slate-900 text-[#F27D26] shadow-xs"
                              : "text-slate-400 hover:text-slate-600"
                          }`}>
                          URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode("presets")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            mode === "presets"
                              ? "bg-white dark:bg-slate-900 text-[#F27D26] shadow-xs"
                              : "text-slate-400 hover:text-slate-600"
                          }`}>
                          Presets
                        </button>
                      </div>
                    </div>

                    {mode === "upload" && (
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          ref={(el) =>
                            (fileInputRefs.current[banner.id || index] = el)
                          }
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            handleFileUpload(index, file);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewIdx(index);
                            fileInputRefs.current[banner.id || index]?.click();
                          }}
                          className={`flex-1 py-2.5 px-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                            darkMode
                              ? "border-slate-700 hover:bg-slate-800/60 text-slate-300"
                              : "border-slate-300 hover:bg-slate-50 text-slate-600"
                          }`}>
                          <Upload size={14} className="text-[#F27D26]" /> Select
                          Image from Device
                        </button>
                        {banner.img && (
                          <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                            <img
                              src={banner.img}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {mode === "url" && (
                      <div className="relative">
                        <Link2
                          size={13}
                          className="absolute left-3 top-3 text-slate-400"
                        />
                        <input
                          type="text"
                          value={banner.img || ""}
                          onChange={(e) =>
                            handleUpdateField(index, "img", e.target.value)
                          }
                          placeholder="Paste image URL (https://...)"
                          className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border outline-none font-semibold transition-all focus:border-[#F27D26] ${
                            darkMode
                              ? "bg-slate-900 border-slate-800 text-slate-200"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        />
                      </div>
                    )}

                    {mode === "presets" && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {PRESET_IMAGES.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() =>
                              handleUpdateField(index, "img", preset.url)
                            }
                            className={`group relative rounded-lg overflow-hidden border transition-all h-14 cursor-pointer ${
                              banner.img === preset.url
                                ? "border-[#F27D26] ring-2 ring-[#F27D26]/40"
                                : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                            }`}>
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-end p-1">
                              <span className="text-[8px] font-bold text-white truncate w-full">
                                {preset.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAdd}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#F27D26]/40 hover:border-[#F27D26] text-[#F27D26] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#F27D26]/5 transition-all cursor-pointer">
              <Plus size={16} /> Add Another Promotional Banner
            </button>
          </div>

          {/* Right Column: Sticky Live Mobile Card Preview (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <div
              className={`rounded-3xl border p-5 ${
                darkMode
                  ? "bg-[#152243] border-slate-800"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#F27D26]" /> Live Mobile
                  View
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  Slide {previewIdx + 1} of {banners.length}
                </span>
              </div>

              {/* Exact replication of the customer app banner card */}
              <div className="relative w-full aspect-[2.3/1] rounded-2xl overflow-hidden shadow-lg bg-zinc-900 select-none">
                {currentPreviewBanner.img ? (
                  <img
                    key={`${previewIdx}-${currentPreviewBanner.img?.slice(0, 40) || ""}`}
                    src={currentPreviewBanner.img}
                    alt={currentPreviewBanner.title}
                    className="w-full h-full object-cover brightness-[0.7]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                    No image configured
                  </div>
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 sm:p-5 flex flex-col justify-between">
                  {/* Top Badge */}
                  <div>
                    <span className="bg-[#F27D26] text-white text-[9px] font-bold tracking-widest px-2.5 py-1 rounded-full uppercase shadow-xs">
                      {currentPreviewBanner.tag || "PROMOTIONAL"}
                    </span>
                  </div>

                  {/* Bottom Text & Button */}
                  <div>
                    <h3 className="text-base sm:text-lg font-serif font-semibold text-white leading-tight line-clamp-1">
                      {currentPreviewBanner.title || "Banner Title"}
                    </h3>
                    {currentPreviewBanner.subtitle && (
                      <p className="text-[10px] text-white/70 line-clamp-1 mt-0.5">
                        {currentPreviewBanner.subtitle}
                      </p>
                    )}
                    <div className="flex justify-between items-center gap-2 mt-2">
                      <span className="text-[11px] font-bold text-emerald-300 font-mono truncate">
                        {currentPreviewBanner.code || "CODE"} ·{" "}
                        {currentPreviewBanner.discount || "Special Offer"}
                      </span>
                      <button
                        type="button"
                        className="bg-white text-emerald-950 text-[10px] font-bold py-1 px-3 rounded-full shadow-sm shrink-0 cursor-default">
                        Claim
                      </button>
                    </div>
                  </div>
                </div>

                {currentPreviewBanner.active === false && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="text-xs font-bold bg-rose-500 text-white px-3 py-1 rounded-full shadow">
                      Inactive (Hidden from Customers)
                    </span>
                  </div>
                )}
              </div>

              {/* Indicator dots */}
              <div className="flex justify-center gap-1.5 mt-3">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewIdx(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === previewIdx
                        ? "w-5 bg-[#2D5A27]"
                        : `w-1.5 ${darkMode ? "bg-white/20" : "bg-zinc-300"}`
                    }`}
                  />
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p>
                  • Clicking a slide's Claim button opens its linked trek detail
                  view.
                </p>
                <p>
                  • Customers can swipe left/right between slides on their
                  phone.
                </p>
                <p>
                  • Remember to create the corresponding promo code in the
                  Coupons tab if not already active.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
