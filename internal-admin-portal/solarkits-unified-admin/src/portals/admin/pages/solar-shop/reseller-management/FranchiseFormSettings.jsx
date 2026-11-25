import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiSliders,
  FiCheck,
  FiX,
  FiSave,
  FiRotateCcw,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiShield,
  FiPhone,
  FiMail,
  FiMapPin,
  FiLayers,
  FiFileText,
  FiMessageSquare,
  FiInfo,
  FiArrowUp,
  FiArrowDown,
  FiArrowLeft,
  FiSmartphone,
  FiMonitor,
  FiCheckCircle,
  FiSearch,
  FiFilter,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;

const DEFAULT_FIELDS = [
  { field_key: "fullName", label: "Full Name", placeholder: "e.g. Ramesh Chandra", help_text: "", field_type: "text", is_required: true, is_active: true, sort_order: 1 },
  { field_key: "businessName", label: "Business / Company Name", placeholder: "e.g. Chandra Solar & Electricals", help_text: "", field_type: "text", is_required: true, is_active: true, sort_order: 2 },
  { field_key: "mobileNumber", label: "Mobile Number (Calling)", placeholder: "7777939842", help_text: "", field_type: "tel", is_required: true, is_active: true, sort_order: 3 },
  { field_key: "whatsappNumber", label: "WhatsApp Number", placeholder: "7777939842 (For quick quotation)", help_text: "", field_type: "tel", is_required: false, is_active: true, sort_order: 4 },
  { field_key: "email", label: "Email Address", placeholder: "ramesh@chandrasolar.com", help_text: "", field_type: "email", is_required: true, is_active: true, sort_order: 5 },
  { field_key: "gstin", label: "GSTIN / Tax ID", placeholder: "27AAAAA0000A1Z5 (Recommended for B2B Verification)", help_text: "Recommended", field_type: "text", is_required: false, is_active: true, sort_order: 6 },
  { field_key: "state", label: "State", placeholder: "Select State", help_text: "", field_type: "select", is_required: true, is_active: true, sort_order: 7 },
  { field_key: "cluster", label: "Franchise Cluster", placeholder: "Select Franchise Cluster", help_text: "", field_type: "select", is_required: true, is_active: true, sort_order: 8 },
  { field_key: "pincode", label: "Pincode", placeholder: "e.g. 411001", help_text: "", field_type: "text", is_required: false, is_active: true, sort_order: 9 },
  { field_key: "businessProfile", label: "Business Profile", placeholder: "Select Business Profile", help_text: "", field_type: "select", is_required: false, is_active: true, sort_order: 10 },
  { field_key: "notes", label: "Requirement / Notes", placeholder: "Any specific kits or project notes...", help_text: "", field_type: "textarea", is_required: false, is_active: false, sort_order: 11 },
  { field_key: "consent", label: "Terms & Callback Consent", help_text: "I agree to receive official B2B quotation, technical datasheets, and callback from SolarKits authorized partner team.", field_type: "checkbox", is_required: true, is_active: true, sort_order: 12 },
];

export default function FranchiseFormSettings() {
  const dispatch = useDispatch();
  const [fields, setFields] = useState([]);
  const [initialFields, setInitialFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "active" | "inactive" | "compulsory" | "optional"

  // Fetch Form Fields from backend
  const fetchFields = async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await axios.get(`${API_BASE}/reseller-mgmt/franchise-form-fields?req_for=view&unique_id=FPO_SETTINGS`, {
          headers: authHeaderObj(),
        });
      } catch (err1) {
        res = await axios.get(`${API_BASE}/franchise-form-fields?req_for=view&unique_id=FPO_SETTINGS`, {
          headers: authHeaderObj(),
        });
      }

      if (res.data?.status === "success" && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        const sorted = [...res.data.data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setFields(sorted);
        setInitialFields(JSON.parse(JSON.stringify(sorted)));
      } else {
        setFields(DEFAULT_FIELDS);
        setInitialFields(JSON.parse(JSON.stringify(DEFAULT_FIELDS)));
      }
    } catch (err) {
      console.warn("[FranchiseFormSettings] Fallback to default fields:", err.message);
      setFields(DEFAULT_FIELDS);
      setInitialFields(JSON.parse(JSON.stringify(DEFAULT_FIELDS)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  // Check if dirty / modified
  const hasChanges = useMemo(() => {
    return JSON.stringify(fields) !== JSON.stringify(initialFields);
  }, [fields, initialFields]);

  // Handle active status toggle
  const handleToggleActive = (index) => {
    setFields((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const nextActive = !target.is_active;
      target.is_active = nextActive;
      // If deactivating, it can no longer be compulsory
      if (!nextActive) {
        target.is_required = false;
      }
      updated[index] = target;
      return updated;
    });
  };

  // Handle compulsory (required) toggle
  const handleToggleRequired = (index) => {
    setFields((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      // Cannot be compulsory if inactive
      if (!target.is_active) {
        return prev;
      }
      target.is_required = !target.is_required;
      updated[index] = target;
      return updated;
    });
  };

  // Handle field property edit (label, placeholder, help_text)
  const handleFieldChange = (index, property, value) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [property]: value };
      return updated;
    });
  };

  // Reorder fields
  const handleMove = (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    setFields((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((f, i) => ({ ...f, sort_order: i + 1 }));
    });
  };

  // Save changes to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      let res;
      try {
        res = await axios.put(
          `${API_BASE}/reseller-mgmt/franchise-form-fields?req_for=edit&unique_id=FPO_SETTINGS`,
          { fields },
          { headers: authHeaderObj() }
        );
      } catch (err1) {
        res = await axios.put(
          `${API_BASE}/franchise-form-fields?req_for=edit&unique_id=FPO_SETTINGS`,
          { fields },
          { headers: authHeaderObj() }
        );
      }

      if (res.data?.status === "success") {
        const sorted = (res.data.data || fields).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setFields(sorted);
        setInitialFields(JSON.parse(JSON.stringify(sorted)));
        dispatch(
          setAlert({
            show: true,
            type: "success",
            message: "Franchise Application Form configuration updated successfully!",
          })
        );
      } else {
        dispatch(
          setAlert({
            show: true,
            type: "danger",
            message: res.data?.message || "Failed to update form configuration.",
          })
        );
      }
    } catch (err) {
      console.error("[FranchiseFormSettings] Save error:", err);
      dispatch(
        setAlert({
          show: true,
          type: "danger",
          message: err.response?.data?.message || "Error saving form configuration to backend.",
        })
      );
    } finally {
      setSaving(false);
    }
  };

  // Reset to default configuration
  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset all form fields to standard platform defaults?")) {
      return;
    }
    setSaving(true);
    try {
      let res;
      try {
        res = await axios.post(
          `${API_BASE}/reseller-mgmt/franchise-form-fields/reset?req_for=edit&unique_id=FPO_SETTINGS`,
          {},
          { headers: authHeaderObj() }
        );
      } catch (err1) {
        res = await axios.post(
          `${API_BASE}/franchise-form-fields/reset?req_for=edit&unique_id=FPO_SETTINGS`,
          {},
          { headers: authHeaderObj() }
        );
      }

      const defaultData = res.data?.data || DEFAULT_FIELDS;
      setFields(defaultData);
      setInitialFields(JSON.parse(JSON.stringify(defaultData)));
      dispatch(
        setAlert({
          show: true,
          type: "success",
          message: "Form fields successfully restored to default settings.",
        })
      );
    } catch (err) {
      setFields(DEFAULT_FIELDS);
      setInitialFields(JSON.parse(JSON.stringify(DEFAULT_FIELDS)));
      dispatch(
        setAlert({
          show: true,
          type: "success",
          message: "Loaded standard platform default fields locally.",
        })
      );
    } finally {
      setSaving(false);
    }
  };

  // Metrics summary
  const stats = useMemo(() => {
    const total = fields.length;
    const active = fields.filter((f) => f.is_active !== false).length;
    const compulsory = fields.filter((f) => f.is_active !== false && f.is_required === true).length;
    const optional = fields.filter((f) => f.is_active !== false && !f.is_required).length;
    const inactive = fields.filter((f) => f.is_active === false).length;
    return { total, active, compulsory, optional, inactive };
  }, [fields]);

  // Filtered fields list for admin view
  const filteredFields = useMemo(() => {
    return fields.filter((field) => {
      const matchSearch =
        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.field_key.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === "active") return field.is_active !== false;
      if (filterType === "inactive") return field.is_active === false;
      if (filterType === "compulsory") return field.is_active !== false && field.is_required;
      if (filterType === "optional") return field.is_active !== false && !field.is_required;
      return true;
    });
  }, [fields, searchTerm, filterType]);

  // Active fields for the live preview modal
  const activePreviewFields = useMemo(() => {
    return fields.filter((f) => f.is_active !== false);
  }, [fields]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Link
          to="/admin-panel/solar-shop/reseller-management"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-primary transition-colors"
        >
          <FiArrowLeft size={14} />
          <span>Back to Franchisee Management</span>
        </Link>
        <div className="text-[11px] text-text-muted font-medium">
          <span>Solar Shop</span> &rsaquo; <span>Franchisee Management</span> &rsaquo; <span className="font-bold text-text-primary">Franchise Form Settings</span>
        </div>
      </div>

      {/* ── Top Header Banner & Stats ────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border border-blue-500/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <FiSliders size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">
                Apply Franchise Form Configuration
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Live Storefront Sync
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Control which fields appear on the prospective franchisee application form and set which fields are mandatory (compulsory) vs optional.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end">
          <button
            onClick={handleReset}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-all"
            title="Reset to factory recommended defaults"
          >
            <FiRotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
              hasChanges
                ? "bg-primary hover:bg-primary-hover shadow-primary/20 cursor-pointer"
                : "bg-primary/50 cursor-not-allowed opacity-60"
            }`}
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FiSave size={13} />
                <span>Save Configuration {hasChanges && "•"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── KPI Counter Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-surface">
          <div className="text-[11px] font-bold text-text-muted uppercase">Total Fields</div>
          <div className="text-xl font-bold text-text-primary mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-text-secondary mt-0.5">Catalog Master Fields</div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
            <FiEye size={12} /> Active Visible
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{stats.active}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Rendered on storefront</div>
        </div>

        <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5">
          <div className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase flex items-center gap-1">
            <span className="text-red-500 font-black">*</span> Compulsory
          </div>
          <div className="text-xl font-bold text-red-700 dark:text-red-300 mt-0.5">{stats.compulsory}</div>
          <div className="text-[10px] text-red-600/80 mt-0.5">Mandatory to submit</div>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
            <FiInfo size={12} /> Optional
          </div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">{stats.optional}</div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">Applicant can skip</div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
            <FiEyeOff size={12} /> Inactive Hidden
          </div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{stats.inactive}</div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">Hidden completely</div>
        </div>
      </div>

      {/* ── Main Two-Column Layout: Field Manager (Left) + Live Form Preview (Right) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Field Controls & Table (7 cols on XL) */}
        <div className="xl:col-span-7 space-y-4">
          {/* Controls / Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-surface border border-border rounded-xl">
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
              <input
                type="text"
                placeholder="Search fields by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-secondary border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "compulsory", label: "Compulsory" },
                { id: "optional", label: "Optional" },
                { id: "inactive", label: "Inactive" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    filterType === tab.id
                      ? "bg-primary text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields List */}
          <div className="space-y-3">
            {filteredFields.map((field) => {
              // Get actual index in main fields array
              const originalIndex = fields.findIndex((f) => f.field_key === field.field_key);
              const isInactive = field.is_active === false;

              return (
                <div
                  key={field.field_key}
                  className={`p-4 rounded-2xl border transition-all ${
                    isInactive
                      ? "bg-slate-500/5 border-border/70 opacity-75"
                      : "bg-surface border-border hover:border-primary/40 shadow-xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Field Identifier & Status Badge */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-surface-secondary text-text-secondary border border-border">
                          {field.field_key}
                        </span>

                        {isInactive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <FiEyeOff size={10} /> Inactive / Hidden
                          </span>
                        ) : field.is_required ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200">
                            <span className="text-red-600 font-black">*</span> Compulsory
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200">
                            Optional
                          </span>
                        )}

                        <span className="text-[10px] text-text-muted capitalize">
                          Type: {field.field_type || "text"}
                        </span>
                      </div>

                      {/* Editable Label */}
                      <div className="pt-1 flex items-center gap-2">
                        <label className="text-[11px] font-bold text-text-secondary shrink-0">Label:</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(originalIndex, "label", e.target.value)}
                          className="w-full px-2.5 py-1 bg-surface-secondary border border-border rounded-lg text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Action Switches */}
                    <div className="flex items-center gap-4 shrink-0 sm:self-center border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                      {/* Active Toggle Switch */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase">Form Status</span>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(originalIndex)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            field.is_active !== false ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                          aria-label={`Toggle active for ${field.label}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              field.is_active !== false ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-[9px] font-bold text-text-secondary">
                          {field.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Compulsory Toggle Switch */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase">Mandatory</span>
                        <button
                          type="button"
                          onClick={() => handleToggleRequired(originalIndex)}
                          disabled={isInactive}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isInactive
                              ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed opacity-50"
                              : field.is_required
                              ? "bg-red-500 cursor-pointer"
                              : "bg-slate-300 dark:bg-slate-700 cursor-pointer"
                          }`}
                          aria-label={`Toggle compulsory for ${field.label}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              field.is_required ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-[9px] font-bold text-text-secondary">
                          {isInactive ? "Disabled" : field.is_required ? "Required" : "Optional"}
                        </span>
                      </div>

                      {/* Reorder Up/Down */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase">Order</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMove(originalIndex, "up")}
                            disabled={originalIndex === 0}
                            className="p-1 rounded-md border border-border bg-surface hover:bg-surface-secondary text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            <FiArrowUp size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(originalIndex, "down")}
                            disabled={originalIndex === fields.length - 1}
                            className="p-1 rounded-md border border-border bg-surface hover:bg-surface-secondary text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            <FiArrowDown size={11} />
                          </button>
                        </div>
                        <span className="text-[9px] font-mono text-text-muted">#{originalIndex + 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Details: Placeholder & Help Text */}
                  <div className="mt-2.5 pt-2.5 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted block mb-0.5">Placeholder Text:</span>
                      <input
                        type="text"
                        value={field.placeholder || ""}
                        onChange={(e) => handleFieldChange(originalIndex, "placeholder", e.target.value)}
                        placeholder="Input placeholder..."
                        className="w-full px-2 py-1 bg-surface-secondary/70 border border-border rounded text-[11px] text-text-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-muted block mb-0.5">Help / Badge Note:</span>
                      <input
                        type="text"
                        value={field.help_text || ""}
                        onChange={(e) => handleFieldChange(originalIndex, "help_text", e.target.value)}
                        placeholder="e.g. Recommended, Optional..."
                        className="w-full px-2 py-1 bg-surface-secondary/70 border border-border rounded text-[11px] text-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Storefront Form Mock Preview (5 cols on XL) */}
        <div className="xl:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-text-primary">Live Storefront Form Preview</span>
            </div>
            <div className="flex items-center gap-1 bg-surface-secondary p-0.5 rounded-lg border border-border">
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  previewDevice === "desktop" ? "bg-white shadow-xs text-primary font-bold" : "text-text-muted"
                }`}
                title="Desktop View"
              >
                <FiMonitor size={13} />
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  previewDevice === "mobile" ? "bg-white shadow-xs text-primary font-bold" : "text-text-muted"
                }`}
                title="Mobile View"
              >
                <FiSmartphone size={13} />
              </button>
            </div>
          </div>

          {/* Form Preview Container */}
          <div
            className={`mx-auto bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-6 transition-all ${
              previewDevice === "mobile" ? "max-w-xs" : "w-full"
            }`}
          >
            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-3 mb-4 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#D97E15] text-[9px] font-black uppercase tracking-wider">
                <FiShield size={10} />
                <span>Franchise Partner Program</span>
              </div>
              <h4 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                Apply for Authorized Solarkits Franchise
              </h4>
              <p className="text-[10px] text-slate-500">
                Live rendering based on active field switches on the left.
              </p>
            </div>

            {/* Dynamic Form Preview Fields */}
            <div className="space-y-3 text-xs">
              {activePreviewFields.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FiAlertCircle className="mx-auto mb-1 text-slate-300" size={20} />
                  <span>All form fields are currently inactive!</span>
                </div>
              ) : (
                activePreviewFields.map((field) => {
                  if (field.field_key === "consent") {
                    return (
                      <div key={field.field_key} className="flex items-start gap-2 pt-1">
                        <input type="checkbox" defaultChecked className="mt-0.5 accent-[#253880] rounded" readOnly />
                        <label className="text-[10px] text-slate-600 leading-tight">
                          {field.help_text || field.label}
                          {field.is_required && <span className="text-red-500 font-bold ml-1">*</span>}
                        </label>
                      </div>
                    );
                  }

                  if (field.field_key === "notes") {
                    return (
                      <div key={field.field_key}>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          {field.label} {field.is_required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          placeholder={field.placeholder || "Enter notes..."}
                          rows={2}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400"
                          readOnly
                        />
                      </div>
                    );
                  }

                  if (["state", "cluster", "businessProfile"].includes(field.field_key)) {
                    return (
                      <div key={field.field_key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            {field.label} {field.is_required && <span className="text-red-500">*</span>}
                          </label>
                          {field.field_key === "cluster" && (
                            <span className="text-[9px] text-blue-600 font-bold font-mono">6 Available</span>
                          )}
                        </div>
                        <select
                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                          readOnly
                        >
                          <option>{field.placeholder || `Select ${field.label}`}</option>
                        </select>

                        {field.field_key === "cluster" && (
                          <div className="mt-2 p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1.5 text-[10px]">
                            <div className="flex items-center justify-between text-blue-900 font-bold">
                              <span className="flex items-center gap-1">
                                <FiMapPin size={11} className="text-blue-600" /> Interactive Territory Map
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black">
                                Cluster Rights
                              </span>
                            </div>
                            <div className="h-16 bg-slate-900 text-slate-300 rounded-lg flex items-center justify-center font-medium gap-1.5 text-[10px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>🗺️ State & Cluster Vector Territory Map Active</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={field.field_key}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          {field.label} {field.is_required && <span className="text-red-500">*</span>}
                        </label>
                        {field.help_text && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                            {field.help_text}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        {field.field_type === "tel" && (
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                            +91
                          </span>
                        )}
                        <input
                          type={field.field_type || "text"}
                          placeholder={field.placeholder || `Enter ${field.label}`}
                          className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 ${
                            field.field_type === "tel" ? "pl-9 pr-2.5" : "px-2.5"
                          }`}
                          readOnly
                        />
                      </div>
                    </div>
                  );
                })
              )}

              {/* Action Buttons in Mock Preview */}
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5"
                >
                  <FiMessageSquare className="text-emerald-600" size={12} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-[#253880] text-white text-[11px] font-bold flex items-center gap-1.5"
                >
                  <span>Submit Request →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
