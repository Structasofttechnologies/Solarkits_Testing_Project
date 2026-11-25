import { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import KitMarginManager from "./KitMarginManager";
import {
  FiSettings,
  FiSave,
  FiRefreshCw,
  FiDollarSign,
  FiPercent,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiLayers,
  FiSliders,
  FiCheck,
} from "react-icons/fi";

const rawApiUrl = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api").replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
        value ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function EstimatorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ text: "", type: "" });

  const [form, setForm] = useState({
    is_enabled: true,
    enabled_for_epc: true,
    enabled_for_franchisee: true,

    allowed_margin_types: "both", // 'both' | 'amount' | 'percentage'
    min_margin: 0,
    max_margin: 10000000,
    min_margin_percentage: 0,
    max_margin_percentage: 100,

    show_bom_rates_to_epc: true,
    allow_optional_bom_selection: true,

    allow_comparison: true,
    max_comparison_count: 3,

    allow_save_estimates: true,
    allow_generate_quotes: true,

    gst_calculation_method: "on_cost_plus_margin", // 'on_cost' | 'on_cost_plus_margin'
    default_gst_rate: 18,
    allowed_gst_options: [0, 5, 12, 13.8, 18],

    estimate_number_prefix: "SK-EST",
    estimate_validity_days: 30,
  });

  const notify = (text, type = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification({ text: "", type: "" }), 4000);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin-api/estimator/settings`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success" && res.data.data) {
        setForm((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      console.error("Failed to load estimator settings:", err);
      notify("Failed to load estimator settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleToggleGstOption = (rate) => {
    setForm((prev) => {
      const exists = prev.allowed_gst_options.includes(rate);
      const updated = exists
        ? prev.allowed_gst_options.filter((r) => r !== rate)
        : [...prev.allowed_gst_options, rate].sort((a, b) => a - b);
      return { ...prev, allowed_gst_options: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE}/admin-api/estimator/settings`, form, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        notify("Estimator settings saved successfully!");
      } else {
        notify(res.data?.message || "Failed to save settings", "error");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      notify("Server error while saving settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Know My Margin settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <FiSettings className="w-5 h-5" />
            </span>
            Estimator Global Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure platform policies, margin limits, GST rules, and numbering sequences for Know My Margin
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 rounded-xl shadow-lg shadow-amber-500/25 transition disabled:opacity-50 cursor-pointer"
        >
          <FiSave className="w-4 h-4" />
          <span>{saving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
            notification.type === "error"
              ? "bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {notification.type === "error" ? <FiXCircle className="w-5 h-5" /> : <FiCheckCircle className="w-5 h-5" />}
          <span>{notification.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Module Access Toggles */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <FiShield className="w-4 h-4" /> Access & Permission Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Master Switch</p>
                <p className="text-xs text-slate-500">Enable KMM across platform</p>
              </div>
              <Toggle value={form.is_enabled} onChange={(val) => setForm((f) => ({ ...f, is_enabled: val }))} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Enable for EPCs</p>
                <p className="text-xs text-slate-500">Direct EPC Store access</p>
              </div>
              <Toggle value={form.enabled_for_epc} onChange={(val) => setForm((f) => ({ ...f, enabled_for_epc: val }))} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Enable for Franchisees</p>
                <p className="text-xs text-slate-500">Franchisee Store access</p>
              </div>
              <Toggle
                value={form.enabled_for_franchisee}
                onChange={(val) => setForm((f) => ({ ...f, enabled_for_franchisee: val }))}
              />
            </div>
          </div>
        </div>

        {/* GST Calculation Method */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <FiPercent className="w-4 h-4" /> GST Calculation Methodology
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div
              onClick={() => setForm((f) => ({ ...f, gst_calculation_method: "on_cost_plus_margin" }))}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition relative ${
                form.gst_calculation_method === "on_cost_plus_margin"
                  ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {form.gst_calculation_method === "on_cost_plus_margin" && (
                <div className="absolute top-4 right-4 text-amber-500">
                  <FiCheck className="w-5 h-5 stroke-[3]" />
                </div>
              )}
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
                GST on (Project Cost + Margin)
              </h3>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                Standard EPC Invoicing Rule
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                GST is charged on the complete taxable invoice value:
                <br />
                <code className="inline-block mt-2 font-mono text-[11px] bg-slate-200/80 dark:bg-slate-900 px-2 py-1 rounded">
                  Customer Price = (Kit + BOM + Margin) x (1 + GST Rate)
                </code>
              </p>
            </div>

            <div
              onClick={() => setForm((f) => ({ ...f, gst_calculation_method: "on_cost" }))}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition relative ${
                form.gst_calculation_method === "on_cost"
                  ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {form.gst_calculation_method === "on_cost" && (
                <div className="absolute top-4 right-4 text-amber-500">
                  <FiCheck className="w-5 h-5 stroke-[3]" />
                </div>
              )}
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
                GST on Cost Only
              </h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Separate Service Margin Rule
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                GST is applied to product and BOM cost only, then EPC margin is added post-tax:
                <br />
                <code className="inline-block mt-2 font-mono text-[11px] bg-slate-200/80 dark:bg-slate-900 px-2 py-1 rounded">
                  Customer Price = (Kit + BOM) x (1 + GST Rate) + Margin
                </code>
              </p>
            </div>
          </div>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Default GST Rate (%)
              </label>
              <input
                type="number"
                name="default_gst_rate"
                value={form.default_gst_rate}
                onChange={handleChange}
                step="0.1"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Allowed GST Options for EPC Selection
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[0, 5, 12, 13.8, 18, 28].map((rate) => {
                  const active = form.allowed_gst_options.includes(rate);
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleToggleGstOption(rate)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                        active
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {rate}%
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Kit Maximum Margin Constraints via Quick Filters */}
        <KitMarginManager />

        {/* BOM Visibility & Solution Comparison */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <FiLayers className="w-4 h-4" /> BOM Visibility & Comparison Rules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Show BOM Rates to EPC</p>
                <p className="text-xs text-slate-500">Display itemized rates in breakdown table</p>
              </div>
              <Toggle
                value={form.show_bom_rates_to_epc}
                onChange={(val) => setForm((f) => ({ ...f, show_bom_rates_to_epc: val }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Allow Optional Selection</p>
                <p className="text-xs text-slate-500">Allow EPCs to check/uncheck optional items</p>
              </div>
              <Toggle
                value={form.allow_optional_bom_selection}
                onChange={(val) => setForm((f) => ({ ...f, allow_optional_bom_selection: val }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Solution Comparison</p>
                <p className="text-xs text-slate-500">Allow multi-solution side-by-side comparison</p>
              </div>
              <Toggle
                value={form.allow_comparison}
                onChange={(val) => setForm((f) => ({ ...f, allow_comparison: val }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Max Comparison Count</p>
                <p className="text-xs text-slate-500">Maximum solutions in one compare view</p>
              </div>
              <select
                name="max_comparison_count"
                value={form.max_comparison_count}
                onChange={handleChange}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value={2}>2 Solutions</option>
                <option value={3}>3 Solutions</option>
                <option value={4}>4 Solutions</option>
                <option value={5}>5 Solutions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Numbering & Estimates */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <FiSliders className="w-4 h-4" /> Estimation & Quote Conversion
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Estimate Number Prefix
              </label>
              <input
                type="text"
                name="estimate_number_prefix"
                value={form.estimate_number_prefix}
                onChange={handleChange}
                placeholder="SK-EST"
                className="w-full px-3.5 py-2 text-sm uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Estimate Validity (Days)
              </label>
              <input
                type="number"
                name="estimate_validity_days"
                value={form.estimate_validity_days}
                onChange={handleChange}
                min="1"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
