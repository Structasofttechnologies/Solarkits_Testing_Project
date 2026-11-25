import { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiSettings,
  FiSave,
  FiRefreshCw,
  FiTruck,
  FiFileText,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiDollarSign,
  FiClock,
  FiInfo,
  FiSliders,
  FiEye,
  FiDroplet,
  FiType,
  FiCheck,
} from "react-icons/fi";

const rawApiUrl = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api").replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");

const THEME_PRESETS = [
  {
    name: "Solar Orange (Default)",
    primary_color: "#ea580c",
    secondary_color: "#0f172a",
    accent_color: "#0284c7",
    light_bg_color: "#f8fafc",
    border_color: "#e2e8f0",
  },
  {
    name: "Royal Navy & Indigo",
    primary_color: "#4f46e5",
    secondary_color: "#0f172a",
    accent_color: "#2563eb",
    light_bg_color: "#f8fafc",
    border_color: "#e2e8f0",
  },
  {
    name: "Emerald Eco Green",
    primary_color: "#059669",
    secondary_color: "#064e3b",
    accent_color: "#0d9488",
    light_bg_color: "#f0fdf4",
    border_color: "#bbf7d0",
  },
  {
    name: "Corporate Steel Blue",
    primary_color: "#1e40af",
    secondary_color: "#0f172a",
    accent_color: "#0284c7",
    light_bg_color: "#f8fafc",
    border_color: "#cbd5e1",
  },
  {
    name: "Modern Charcoal",
    primary_color: "#334155",
    secondary_color: "#090d16",
    accent_color: "#475569",
    light_bg_color: "#f8fafc",
    border_color: "#e2e8f0",
  },
];

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${value ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
        }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"
          }`}
      />
    </button>
  );
}

export default function QuoteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [form, setForm] = useState({
    quote_validity_days: 15,
    quote_number_prefix: "SK-QT",
    gst_rate: 5,
    delivery_modes: [
      { mode: "epc_location", is_enabled: true, label: "EPC Registered Address" },
      { mode: "district", is_enabled: true, label: "District Transport Hub" },
      { mode: "pincode", is_enabled: true, label: "Project Site (Pincode)" },
      { mode: "franchisee_warehouse", is_enabled: true, label: "Franchisee Store / Warehouse" },
    ],
    payment_terms_options: [
      "100% advance against Proforma Invoice",
      "50% advance, 50% against dispatch inspection",
      "20% advance booking, balance against BL/dispatch",
    ],
    delivery_terms_text: "Ex-warehouse dispatch within 7-10 working days upon 100% payment receipt.",
    warranty_terms_text: "25-year performance warranty on solar PV modules. 5-year replacement warranty on solar grid-tied inverters.",
    default_terms_and_conditions: "All disputes subject to company registered jurisdiction. Prices inclusive of GST as applicable. Freight charged on actuals or per pincode rate card.",
    allow_duplicate_conversion: false,
    allow_revised_quote_conversion: true,
    pdf_theme: {
      primary_color: "#ea580c",
      secondary_color: "#0f172a",
      accent_color: "#0284c7",
      light_bg_color: "#f8fafc",
      border_color: "#e2e8f0",
      company_name: "SolarKits India",
      company_tagline: "India's Premier Solar ComboKit Distribution Platform",
      commercial_notes_title: "COMMERCIAL & STATUTORY NOTES",
      commercial_notes: [
        "Prices quoted are in Indian Rupees (INR) and valid up to the expiration date.",
        "Dispatched directly through authorized distribution hubs with transit insurance.",
        "Refer to Page 2 for Detailed Technical Bill of Materials (BOM) & Equipment Specifications.",
        "Standard statutory warranty coverage applies as detailed in technical specifications.",
      ],
      bom_page_title: "TECHNICAL SPECIFICATIONS & BILL OF MATERIALS (BOM)",
      footer_text: "SolarKits India • Confidential Commercial Proposal • All Rights Reserved",
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin-api/quote-settings`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success" && res.data.data) {
        setForm((prev) => ({
          ...prev,
          ...res.data.data,
          pdf_theme: {
            ...prev.pdf_theme,
            ...(res.data.data.pdf_theme || {}),
          },
        }));
      }
    } catch (err) {
      console.error("Failed to load quote settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: "", type: "" });
    try {
      const res = await axios.put(`${API_BASE}/admin-api/quote-settings`, form, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        setMsg({ text: "Quotation platform settings saved successfully!", type: "success" });
        setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      }
    } catch (err) {
      setMsg({ text: err.response?.data?.message || "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const updateDeliveryMode = (index, val) => {
    const updated = [...form.delivery_modes];
    updated[index].is_enabled = val;
    setForm({ ...form, delivery_modes: updated });
  };

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      pdf_theme: {
        ...prev.pdf_theme,
        primary_color: preset.primary_color,
        secondary_color: preset.secondary_color,
        accent_color: preset.accent_color,
        light_bg_color: preset.light_bg_color,
        border_color: preset.border_color,
      },
    }));
  };

  const updateThemeField = (field, val) => {
    setForm((prev) => ({
      ...prev,
      pdf_theme: {
        ...prev.pdf_theme,
        [field]: val,
      },
    }));
  };

  const handleNotesChange = (text) => {
    const lines = text.split("\n");
    updateThemeField("commercial_notes", lines);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-xs text-slate-400">Loading quotation configuration...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <FiSettings size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              EPC Quotation Management Settings
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Global administration rules for quote validity, dispatch options, terms, and conversion policy
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 transition"
          title="Refresh"
        >
          <FiRefreshCw size={15} />
        </button>
      </div>

      {msg.text && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${msg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
            }`}
        >
          {msg.type === "success" ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Policy Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FiClock className="text-amber-500" />
            <span>Validity & Identification Defaults</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Quote Validity (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={form.quote_validity_days}
                onChange={(e) => setForm({ ...form, quote_validity_days: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Days until quote auto-expires</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Quote Number Prefix
              </label>
              <input
                type="text"
                value={form.quote_number_prefix}
                onChange={(e) => setForm({ ...form, quote_number_prefix: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">e.g. SK-QT-2026-000001</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <FiInfo className="text-amber-500 shrink-0" size={14} />
            <span>GST rates are applied per ComboKit directly from the kit configuration and warehouse margin rules.</span>
          </div>
        </div>

        {/* Allowed Delivery Modes Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FiTruck className="text-blue-500" />
            <span>Permitted Delivery / Fulfillment Modes</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.delivery_modes.map((dm, idx) => (
              <div
                key={dm.mode}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{dm.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono capitalize">mode: {dm.mode}</div>
                </div>
                <Toggle
                  value={dm.is_enabled}
                  onChange={(val) => updateDeliveryMode(idx, val)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Policy Rules */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FiCheckCircle className="text-emerald-500" />
            <span>Order Conversion Policy</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Allow Duplicate Conversion</div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Allow an already converted quote to be converted into multiple orders
                </p>
              </div>
              <Toggle
                value={form.allow_duplicate_conversion}
                onChange={(val) => setForm({ ...form, allow_duplicate_conversion: val })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">Allow Revised Quote Conversion</div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Allow converted quotes to have subsequent revisions converted
                </p>
              </div>
              <Toggle
                value={form.allow_revised_quote_conversion}
                onChange={(val) => setForm({ ...form, allow_revised_quote_conversion: val })}
              />
            </div>
          </div>
        </div>

        {/* PDF Quotation Theme & Template Customization Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FiDroplet className="text-amber-500" />
                <span>PDF Quotation Theme & Brand Customization</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Customize quotation PDF color schemes, company branding, and commercial technical notes
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
              <FiEye size={12} />
              <span>Live Theme Config</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
              One-Click Color Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {THEME_PRESETS.map((p) => {
                const isActive =
                  form.pdf_theme?.primary_color?.toLowerCase() === p.primary_color.toLowerCase() &&
                  form.pdf_theme?.secondary_color?.toLowerCase() === p.secondary_color.toLowerCase();
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`flex flex-col items-center p-3 rounded-xl border text-left transition relative cursor-pointer ${isActive
                        ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900/40"
                      }`}
                  >
                    <div className="flex items-center gap-1 mb-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-sm inline-block"
                        style={{ backgroundColor: p.primary_color }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-sm inline-block"
                        style={{ backgroundColor: p.secondary_color }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white shadow-sm inline-block"
                        style={{ backgroundColor: p.accent_color }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 text-center">
                      {p.name}
                    </span>
                    {isActive && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Primary Brand / Header Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.pdf_theme?.primary_color || "#ea580c"}
                  onChange={(e) => updateThemeField("primary_color", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={form.pdf_theme?.primary_color || "#ea580c"}
                  onChange={(e) => updateThemeField("primary_color", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono uppercase font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Titles, section accents, and card headers</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Secondary / Dark Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.pdf_theme?.secondary_color || "#0f172a"}
                  onChange={(e) => updateThemeField("secondary_color", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={form.pdf_theme?.secondary_color || "#0f172a"}
                  onChange={(e) => updateThemeField("secondary_color", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono uppercase font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Table banners and total row backgrounds</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Accent / Badge Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.pdf_theme?.accent_color || "#0284c7"}
                  onChange={(e) => updateThemeField("accent_color", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={form.pdf_theme?.accent_color || "#0284c7"}
                  onChange={(e) => updateThemeField("accent_color", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono uppercase font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Badge indicators, highlights, and meta tags</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Light Tint Background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.pdf_theme?.light_bg_color || "#f8fafc"}
                  onChange={(e) => updateThemeField("light_bg_color", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={form.pdf_theme?.light_bg_color || "#f8fafc"}
                  onChange={(e) => updateThemeField("light_bg_color", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono uppercase font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Table alternations & card background</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Border & Line Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.pdf_theme?.border_color || "#e2e8f0"}
                  onChange={(e) => updateThemeField("border_color", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={form.pdf_theme?.border_color || "#e2e8f0"}
                  onChange={(e) => updateThemeField("border_color", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono uppercase font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Table dividers and bounding card borders</span>
            </div>
          </div>

          {/* Typography & Content Customization */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FiType className="text-amber-500" />
              <span>Header Branding & Document Text</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Company Header Name
                </label>
                <input
                  type="text"
                  value={form.pdf_theme?.company_name || ""}
                  onChange={(e) => updateThemeField("company_name", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  placeholder="e.g. SolarKits India"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Company Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={form.pdf_theme?.company_tagline || ""}
                  onChange={(e) => updateThemeField("company_tagline", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  placeholder="e.g. India's Premier Solar ComboKit Distribution Platform"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  BOM Page Title (Page 2)
                </label>
                <input
                  type="text"
                  value={form.pdf_theme?.bom_page_title || ""}
                  onChange={(e) => updateThemeField("bom_page_title", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  placeholder="e.g. TECHNICAL SPECIFICATIONS & BILL OF MATERIALS (BOM)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Commercial Notes Section Title
                </label>
                <input
                  type="text"
                  value={form.pdf_theme?.commercial_notes_title || ""}
                  onChange={(e) => updateThemeField("commercial_notes_title", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
                  placeholder="e.g. COMMERCIAL & STATUTORY NOTES"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Commercial Notes Points (Page 1)
              </label>
              <textarea
                rows={3}
                value={Array.isArray(form.pdf_theme?.commercial_notes) ? form.pdf_theme.commercial_notes.join("\n") : ""}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                placeholder="Enter each note bullet on a separate line"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Each line represents a bullet point in the notes box</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Quotation Document Footer Text
              </label>
              <input
                type="text"
                value={form.pdf_theme?.footer_text || ""}
                onChange={(e) => updateThemeField("footer_text", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                placeholder="e.g. SolarKits India • Confidential Commercial Proposal • All Rights Reserved"
              />
            </div>
          </div>

          {/* Live Mini Preview Box */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FiEye className="text-amber-500" />
              <span>Live PDF Document Preview</span>
            </h4>

            <div
              className="p-4 rounded-2xl border shadow-inner max-w-xl mx-auto space-y-3 text-xs"
              style={{
                backgroundColor: form.pdf_theme?.light_bg_color || "#f8fafc",
                borderColor: form.pdf_theme?.border_color || "#e2e8f0",
              }}
            >
              {/* Header preview */}
              <div
                className="p-3 rounded-xl flex items-center justify-between text-white shadow-sm"
                style={{ backgroundColor: form.pdf_theme?.secondary_color || "#0f172a" }}
              >
                <div>
                  <div className="font-extrabold text-sm tracking-wide">
                    {form.pdf_theme?.company_name || "SolarKits India"}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {form.pdf_theme?.company_tagline || "India's Premier Solar ComboKit Distribution Platform"}
                  </div>
                </div>
                <div
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white uppercase"
                  style={{ backgroundColor: form.pdf_theme?.primary_color || "#ea580c" }}
                >
                  Commercial Quote
                </div>
              </div>

              {/* Sample Table Preview */}
              <div
                className="rounded-xl overflow-hidden border bg-white dark:bg-slate-900 shadow-sm"
                style={{ borderColor: form.pdf_theme?.border_color || "#e2e8f0" }}
              >
                <div
                  className="px-3 py-2 text-white font-bold text-[11px] flex justify-between"
                  style={{ backgroundColor: form.pdf_theme?.secondary_color || "#0f172a" }}
                >
                  <span>Item Description</span>
                  <span>Total Amount</span>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    <span>Solar DCR Residential Kit (Selected Loose Qty)</span>
                    <span className="font-bold">₹24,11,688</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>GST (5% Kit Rule Applied)</span>
                    <span>₹1,20,584</span>
                  </div>
                </div>
                <div
                  className="px-3 py-2 text-white font-bold text-xs flex justify-between"
                  style={{ backgroundColor: form.pdf_theme?.primary_color || "#ea580c" }}
                >
                  <span>Total Payable:</span>
                  <span>₹25,32,272</span>
                </div>
              </div>

              {/* Sample Technical BOM Spec Header */}
              <div
                className="p-2.5 rounded-xl border bg-white dark:bg-slate-900 shadow-sm"
                style={{ borderColor: form.pdf_theme?.border_color || "#e2e8f0" }}
              >
                <div
                  className="font-bold text-[11px] uppercase tracking-wide mb-1"
                  style={{ color: form.pdf_theme?.primary_color || "#ea580c" }}
                >
                  {form.pdf_theme?.bom_page_title || "TECHNICAL SPECIFICATIONS & BILL OF MATERIALS (BOM)"}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ backgroundColor: form.pdf_theme?.accent_color || "#0284c7" }}
                  />
                  <span>1. Solar Photovoltaic Modules • 2. Solar Inverter • 3. Full BOS Switchgear • 4. MMS Structure</span>
                </div>
              </div>

              {/* Footer preview */}
              <div className="text-center text-[10px] text-slate-400 pt-1">
                {form.pdf_theme?.footer_text || "SolarKits India • Confidential Commercial Proposal • All Rights Reserved"}
              </div>
            </div>
          </div>
        </div>

        {/* Configurable Terms Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FiFileText className="text-indigo-500" />
            <span>Standard Commercial Terms & Conditions</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Standard Delivery Terms
              </label>
              <textarea
                rows={2}
                value={form.delivery_terms_text}
                onChange={(e) => setForm({ ...form, delivery_terms_text: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Standard Warranty Terms
              </label>
              <textarea
                rows={2}
                value={form.warranty_terms_text}
                onChange={(e) => setForm({ ...form, warranty_terms_text: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                General Quotation Terms & Conditions
              </label>
              <textarea
                rows={3}
                value={form.default_terms_and_conditions}
                onChange={(e) => setForm({ ...form, default_terms_and_conditions: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FiSave size={16} />
            )}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
