import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getIndustryTypes,
  getIndustryTheme,
  upsertIndustryTheme,
  deleteIndustryTheme,
} from "../../../api/industryContentApi";
import {
  FiDroplet,
  FiSave,
  FiRefreshCw,
  FiCheck,
  FiTrash2,
  FiAlertCircle,
  FiArrowRight,
  FiEye,
} from "react-icons/fi";
import { MdOutlineColorLens } from "react-icons/md";

export default function IndustryThemeConfig() {
  const [searchParams] = useSearchParams();
  const initialIndustryId = searchParams.get("industry_id") || "";

  const [industries, setIndustries] = useState([]);
  const [selectedIndustryId, setSelectedIndustryId] = useState(initialIndustryId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Theme Form Tokens
  const [primaryColor, setPrimaryColor] = useState("#1a3b8b");
  const [secondaryColor, setSecondaryColor] = useState("#f8c21a");
  const [accentColor, setAccentColor] = useState("#38bdf8");
  const [bgColor, setBgColor] = useState("#f8fafc");
  const [textColor, setTextColor] = useState("#0f172a");
  const [sectionBg, setSectionBg] = useState("#ffffff");
  const [buttonStyle, setButtonStyle] = useState("SOLID");
  const [defaultBannerUrl, setDefaultBannerUrl] = useState("");
  const [defaultVideoThumbnailUrl, setDefaultVideoThumbnailUrl] = useState("");

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // 1. Fetch industry types
  useEffect(() => {
    getIndustryTypes()
      .then((res) => {
        if (res.status === "success") {
          const list = res.data || [];
          setIndustries(list);
          if (!selectedIndustryId && list.length > 0) {
            setSelectedIndustryId(list[0].id || list[0]._id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // 2. Fetch theme whenever selected industry changes
  useEffect(() => {
    if (!selectedIndustryId) return;
    setLoading(true);
    getIndustryTheme(selectedIndustryId)
      .then((res) => {
        if (res.status === "success" && res.data) {
          const t = res.data;
          setPrimaryColor(t.primary_color || "#1a3b8b");
          setSecondaryColor(t.secondary_color || "#f8c21a");
          setAccentColor(t.accent_color || "#38bdf8");
          setBgColor(t.bg_color || "#f8fafc");
          setTextColor(t.text_color || "#0f172a");
          setSectionBg(t.section_bg || "#ffffff");
          setButtonStyle(t.button_style || "SOLID");
          setDefaultBannerUrl(t.default_banner_url || "");
          setDefaultVideoThumbnailUrl(t.default_video_thumbnail_url || "");
        } else {
          // Reset to defaults
          setPrimaryColor("#1a3b8b");
          setSecondaryColor("#f8c21a");
          setAccentColor("#38bdf8");
          setBgColor("#f8fafc");
          setTextColor("#0f172a");
          setSectionBg("#ffffff");
          setButtonStyle("SOLID");
          setDefaultBannerUrl("");
          setDefaultVideoThumbnailUrl("");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedIndustryId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedIndustryId) return;

    setSaving(true);
    try {
      await upsertIndustryTheme({
        industry_type_id: selectedIndustryId,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        bg_color: bgColor,
        text_color: textColor,
        section_bg: sectionBg,
        button_style: buttonStyle,
        default_banner_url: defaultBannerUrl.trim() || null,
        default_video_thumbnail_url: defaultVideoThumbnailUrl.trim() || null,
      });
      showAlert("success", "Design tokens and theme saved successfully!");
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const selectedIndustry = industries.find((i) => (i.id || i._id) === selectedIndustryId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <MdOutlineColorLens size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Industry Theme Configuration</h1>
            <p className="text-xs font-medium text-slate-500">
              Customize scoped brand palettes, buttons, and tokens for each industry segment
            </p>
          </div>
        </div>

        {/* Industry Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedIndustryId}
            onChange={(e) => setSelectedIndustryId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {industries.map((ind) => (
              <option key={ind.id || ind._id} value={ind.id || ind._id}>
                {ind.icon || "🏭"} {ind.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <FiAlertCircle size={16} />
          <span>{alert.message}</span>
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Token Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="font-black text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Design Tokens: {selectedIndustry?.name || "Selected Industry"}
          </h3>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* Colors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Primary Color */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border-0 p-1 cursor-pointer bg-slate-100 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 font-mono text-xs font-semibold uppercase"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Secondary Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border-0 p-1 cursor-pointer bg-slate-100 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 font-mono text-xs font-semibold uppercase"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Highlight Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border-0 p-1 cursor-pointer bg-slate-100 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 font-mono text-xs font-semibold uppercase"
                  />
                </div>
              </div>

              {/* Section Background */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Container Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sectionBg}
                    onChange={(e) => setSectionBg(e.target.value)}
                    className="w-10 h-10 rounded-xl border-0 p-1 cursor-pointer bg-slate-100 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={sectionBg}
                    onChange={(e) => setSectionBg(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 font-mono text-xs font-semibold uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Button Style */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Call to Action Button Style</label>
              <div className="grid grid-cols-3 gap-2">
                {["SOLID", "OUTLINE", "GHOST"].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setButtonStyle(style)}
                    className={`py-2 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                      buttonStyle === style
                        ? "bg-primary text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Fallback URLs */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Fallback Banner URL
                </label>
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/.../default-banner.jpg"
                  value={defaultBannerUrl}
                  onChange={(e) => setDefaultBannerUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Fallback Video Thumbnail
                </label>
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/.../default-video-thumb.jpg"
                  value={defaultVideoThumbnailUrl}
                  onChange={(e) => setDefaultVideoThumbnailUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-black rounded-2xl text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                <FiSave size={16} />
                {saving ? "Saving..." : "Save Theme Tokens"}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <FiEye className="text-primary" size={18} />
              <h3 className="font-black text-sm text-slate-900 dark:text-white">Live Simulated Card</h3>
            </div>

            {/* Simulated Hero Card with Scoped Variables */}
            <div
              className="p-6 rounded-3xl shadow-lg space-y-4 text-white relative overflow-hidden transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
            >
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black tracking-wider uppercase inline-block">
                {selectedIndustry?.name || "Industry Segment"}
              </span>

              <h4 className="text-2xl font-black leading-tight drop-shadow-md">
                Industry-Tailored Solar Kits
              </h4>

              <p className="text-xs text-white/90 leading-relaxed font-medium">
                High-efficiency monocrystalline solar kits engineered specifically for {selectedIndustry?.name || "commercial"} applications.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                    buttonStyle === "SOLID"
                      ? "bg-white text-slate-900 hover:bg-white/90"
                      : buttonStyle === "OUTLINE"
                      ? "border-2 border-white text-white bg-transparent hover:bg-white/10"
                      : "text-white bg-white/20 backdrop-blur-md hover:bg-white/30"
                  }`}
                >
                  Explore Kits <FiArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Swatches Overview */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Active Palette Values
              </span>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="w-3 h-3 rounded-full" style={{ background: primaryColor }} />
                  <span className="font-mono text-[10px] font-bold">{primaryColor}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="w-3 h-3 rounded-full" style={{ background: secondaryColor }} />
                  <span className="font-mono text-[10px] font-bold">{secondaryColor}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="w-3 h-3 rounded-full" style={{ background: accentColor }} />
                  <span className="font-mono text-[10px] font-bold">{accentColor}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
