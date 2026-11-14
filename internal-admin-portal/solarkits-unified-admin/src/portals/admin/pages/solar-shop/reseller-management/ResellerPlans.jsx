import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiFileText,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiSearch,
  FiAlertCircle,
  FiLoader,
  FiCheck,
  FiX,
  FiGlobe,
  FiMap,
  FiMapPin,
  FiHome,
  FiZap,
  FiPackage,
  FiTruck,
  FiLayers,
  FiBox,
  FiDollarSign,
  FiSettings,
  FiGrid,
  FiList,
  FiFilter,
  FiCheckSquare,
  FiSquare,
  FiSun,
  FiCpu,
  FiActivity,
  FiInfo,
  FiUsers,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_PLAN";

const apiFetch = (method, endpoint, data) =>
  axios({ method, url: `${API_BASE}/resellers/plans${endpoint}`, headers: authHeaderObj(), data });

const TERRITORY_LEVELS = [
  { value: "district", label: "District Level", icon: FiMapPin, color: "text-primary", bg: "bg-info-soft" },
  { value: "state", label: "State Level", icon: FiMap, color: "text-success", bg: "bg-success-soft" },
  { value: "country", label: "Country Level", icon: FiGlobe, color: "text-warning", bg: "bg-warning-soft" },
];

const ORDER_TYPES = [
  {
    value: "loose_order",
    label: "Loose Order",
    description: "Direct individual kit / loose components on-demand dispatch",
    icon: FiTruck,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  {
    value: "combine_po_order",
    label: "Combine PO Order",
    description: "Pool demand across multiple EPC contractors into a combined PO",
    icon: FiUsers,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
  },
  {
    value: "po_order",
    label: "PO Order",
    description: "Strict Purchase Order fulfillment for single EPC or Franchise inventory",
    icon: FiFileText,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  },
];

// Helper icons mapping for industry types
const INDUSTRY_ICONS = {
  RESI: FiHome,
  CI: FiBox,
  AGRI: FiSun,
  UTIL: FiZap,
  DEFAULT: FiLayers,
};

function getIndustryIcon(code) {
  if (!code) return INDUSTRY_ICONS.DEFAULT;
  const upper = String(code).toUpperCase();
  if (upper.includes("RESI")) return INDUSTRY_ICONS.RESI;
  if (upper.includes("CI") || upper.includes("COMM") || upper.includes("IND")) return INDUSTRY_ICONS.CI;
  if (upper.includes("AGRI") || upper.includes("PUMP")) return INDUSTRY_ICONS.AGRI;
  if (upper.includes("UTIL") || upper.includes("PARK") || upper.includes("GROUND")) return INDUSTRY_ICONS.UTIL;
  return INDUSTRY_ICONS.DEFAULT;
}

function TerritoryLevelBadge({ level }) {
  const cfg = TERRITORY_LEVELS.find((t) => t.value === level) || TERRITORY_LEVELS[0];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border border-current/20`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function WarehouseBadge({ required, count, sqft }) {
  if (!required) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-hover text-text-muted border border-border">
        <FiHome size={10} /> No WH Req.
      </span>
    );
  }
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-info-soft text-primary border border-primary/20">
        <FiHome size={11} /> {count || 1} Warehouse{count > 1 ? "s" : ""}
      </span>
      {sqft > 0 && (
        <span className="text-[10px] text-text-muted font-medium pl-1">
          {Number(sqft).toLocaleString("en-IN")} sq. ft.
        </span>
      )}
    </div>
  );
}

function OrderTypeBadge({ orderType }) {
  let types = [];
  if (Array.isArray(orderType)) {
    types = orderType;
  } else if (typeof orderType === "string") {
    if (orderType === "both") types = ["po_order", "loose_order"];
    else types = orderType.split(",").map((s) => s.trim());
  } else {
    types = ["po_order"];
  }

  const matched = types
    .map((t) => ORDER_TYPES.find((ot) => ot.value === t))
    .filter(Boolean);

  if (matched.length === 0) {
    const fallback = ORDER_TYPES[2];
    const Icon = fallback.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${fallback.badgeColor}`}>
        <Icon size={11} /> {fallback.label}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {matched.map((cfg) => {
        const Icon = cfg.icon;
        return (
          <span
            key={cfg.value}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${cfg.badgeColor}`}
          >
            <Icon size={11} /> {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

function AssignedScopeBadge({ industryCount, productCount, onClick }) {
  return (
    <div
      onClick={onClick}
      className="inline-flex flex-col items-start gap-1 p-1.5 rounded-xl bg-bg border border-border hover:border-primary/50 cursor-pointer transition-all group"
      title="Click to manage assigned industries & products"
    >
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
          industryCount > 0 ? "bg-info-soft text-primary border border-primary/20" : "bg-surface text-text-muted border border-border"
        }`}>
          <FiLayers size={11} /> {industryCount || 0} Industr{industryCount === 1 ? "y" : "ies"}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
          productCount > 0 ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-surface text-text-muted border border-border"
        }`}>
          <FiBox size={11} /> {productCount || 0} Product{productCount === 1 ? "" : "s"}
        </span>
      </div>
      <span className="text-[10px] text-text-muted font-medium group-hover:text-primary transition-colors flex items-center gap-1 pl-0.5">
        <FiSettings size={9} /> Configure scope
      </span>
    </div>
  );
}

function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success border border-success/20">
      <FiCheck size={10} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-soft text-danger border border-danger/20">
      <FiX size={10} /> Inactive
    </span>
  );
}

function StoreCategoryBadge({ category, subtype }) {
  if (category === "company_store") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
        <FiBox size={10} /> Company Store
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <FiHome size={10} /> Franchisee Store
      </span>
      {subtype?.name && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-surface text-text-muted border border-border">
          {subtype.name}
        </span>
      )}
    </div>
  );
}

function CommercialsBadge({ commissionEnabled, storeCategory }) {
  const isCompany = storeCategory === "company_store";
  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex items-center gap-1">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          commissionEnabled !== false ? "bg-success-soft text-success border-success/20" : "bg-surface-hover text-text-muted border-border"
        }`}>
          {commissionEnabled !== false ? "Comm. ON" : "Comm. OFF"}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
          isCompany
            ? "bg-slate-100 text-slate-600 border-slate-200"
            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
        }`}>
          {isCompany ? "Fee: Waived" : "Fee: Cluster-Based"}
        </span>
      </div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. FORM MODAL (Plan Creation & Basic Edit)
 * Strictly contains only the 5 required fields:
 * 1. Plan Name
 * 2. Scope Level (District / State / Country)
 * 3. Fee & Validity
 * 4. Warehouse Requirement
 * 5. Allowed Order Fulfillment Type
 * (Optional description & sort order)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function FormModal({ mode, initial, onClose, onSaved }) {
  const dispatch = useDispatch();

  const [subtypes, setSubtypes] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/store-management/subtypes/list?active_only=true`, { headers: authHeaderObj() })
      .then((res) => {
        if (res.data?.status === "success") {
          setSubtypes(res.data.data || []);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch subtypes for plan form:", err.message);
      });
  }, []);

  const [form, setForm] = useState({
    name: initial?.name || "",
    store_category: initial?.store_category || "franchisee_store",
    franchisee_subtype_id: initial?.franchisee_subtype_id?._id || initial?.franchisee_subtype_id || "",
    territory_level: initial?.territory_level || "district",
    one_time_fee: initial?.one_time_fee ?? 0,
    validity_value: initial?.validity_value ?? 1,
    validity_unit: initial?.validity_unit || "years",
    allowed_territories_count: initial?.allowed_territories_count ?? 1,

    // Store Management Commercial Controls
    commission_enabled: initial?.commission_enabled ?? (initial?.store_category === "company_store" ? false : true),
    setup_cost_enabled: initial?.setup_cost_enabled ?? (initial?.store_category === "company_store" ? false : true),
    setup_cost_amount: initial?.setup_cost_amount ?? (initial?.one_time_fee ?? 0),
    epc_onboarding_scope: initial?.epc_onboarding_scope || initial?.territory_level || "district",
    bde_assignment_mandatory: initial?.bde_assignment_mandatory ?? (initial?.store_category === "company_store" ? true : false),

    // Warehouse Requirements
    warehouse_required: initial?.warehouse_required ?? false,
    warehouse_count: initial?.warehouse_count ?? 0,
    warehouse_space_sqft: initial?.warehouse_space_sqft ?? 0,

    // Order Fulfillment Type (Array for multi-selection)
    order_type_allowed: (() => {
      const raw = initial?.order_type_allowed;
      if (Array.isArray(raw)) return raw.length > 0 ? raw : ["po_order"];
      if (typeof raw === "string") {
        if (raw === "both") return ["po_order", "loose_order"];
        return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : ["po_order"];
      }
      return ["po_order"];
    })(),

    description: initial?.description || "",
    sort_order: initial?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleCategoryChange = (category) => {
    setForm((prev) => ({
      ...prev,
      store_category: category,
      commission_enabled: category === "company_store" ? false : true,
      setup_cost_enabled: category === "company_store" ? false : true,
      bde_assignment_mandatory: category === "company_store" ? true : false,
      franchisee_subtype_id: category === "company_store" ? "" : prev.franchisee_subtype_id,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const isEdit = mode === "edit";
      const endpoint = isEdit
        ? `/update?req_for=edit&unique_id=${MODULE_UID}`
        : `/add?req_for=add&unique_id=${MODULE_UID}`;

      const payload = {
        ...(isEdit && { id: initial.id || initial._id }),
        name: form.name.trim(),
        store_category: form.store_category,
        franchisee_subtype_id: form.store_category === "franchisee_store" && form.franchisee_subtype_id ? form.franchisee_subtype_id : null,
        territory_level: form.territory_level,
        one_time_fee: Number(form.one_time_fee || 0),
        validity_value: Number(form.validity_value || 1),
        validity_unit: form.validity_unit,
        allowed_territories_count: Number(form.allowed_territories_count || 1),

        // Commercial Controls
        commission_enabled: Boolean(form.commission_enabled),
        setup_cost_enabled: Boolean(form.setup_cost_enabled),
        setup_cost_amount: Number(form.setup_cost_amount || 0),
        epc_onboarding_scope: form.epc_onboarding_scope,
        bde_assignment_mandatory: Boolean(form.bde_assignment_mandatory),

        // Warehouse Specs
        warehouse_required: Boolean(form.warehouse_required),
        warehouse_count: form.warehouse_required ? Math.max(1, Number(form.warehouse_count || 1)) : 0,
        warehouse_space_sqft: form.warehouse_required ? Math.max(0, Number(form.warehouse_space_sqft || 0)) : 0,

        // Order Type
        order_type_allowed: form.order_type_allowed,

        description: form.description.trim() || null,
        sort_order: Number(form.sort_order || 0),
      };

      const res = await apiFetch(isEdit ? "put" : "post", endpoint, payload);
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `Store Type ${isEdit ? "updated" : "created"} successfully` }));
        onSaved(res.data.data);
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Operation failed" }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Save failed" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg/50">
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              {mode === "edit" ? "Edit Store Type" : "Create Store Type"}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Configure store category, commercial permissions, warehouse rules, and order fulfillment
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh] scrollbar-hover">
          {/* 1. Store Category & Subtype */}
          <div className="p-4 bg-bg/60 rounded-2xl border border-border space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <FiLayers size={14} /> 1. Store Type Classification <span className="text-danger">*</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCategoryChange("franchisee_store")}
                className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                  form.store_category === "franchisee_store"
                    ? "border-primary bg-info-soft text-primary shadow-sm"
                    : "border-border bg-surface text-text-secondary hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                  <FiHome size={15} /> Franchisee Store
                </div>
                <p className="text-[10px] text-text-muted">Independently operated partner store with setup & commission rules</p>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange("company_store")}
                className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                  form.store_category === "company_store"
                    ? "border-purple-600 bg-purple-50/60 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300 shadow-sm"
                    : "border-border bg-surface text-text-secondary hover:border-purple-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                  <FiBox size={15} /> Company Store
                </div>
                <p className="text-[10px] text-text-muted">SolarKits-managed branch with dedicated BDE attribution</p>
              </button>
            </div>

            {form.store_category === "franchisee_store" && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Franchisee Subtype / Category
                </label>
                <select
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  value={form.franchisee_subtype_id}
                  onChange={(e) => setForm({ ...form, franchisee_subtype_id: e.target.value })}
                >
                  <option value="">-- None / Standard Franchisee --</option>
                  {subtypes.map((st) => (
                    <option key={st.id || st._id} value={st.id || st._id}>
                      {st.name} ({st.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Store Type Name */}
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">
              2. Store Type Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="e.g. Gold District Franchisee Partner or Company Flagship Store"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* 3. Scope Level & EPC Onboarding Scope */}
          <div className="p-4 bg-bg/60 rounded-2xl border border-border space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <FiMapPin size={14} /> 3. Geographic Scope & EPC Rights
            </h4>

            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Territory Scope Level <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {TERRITORY_LEVELS.map((t) => {
                  const Icon = t.icon;
                  const sel = form.territory_level === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, territory_level: t.value })}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        sel ? "border-primary bg-info-soft text-primary shadow-sm" : "border-border bg-surface text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      <Icon size={16} className={sel ? "text-primary" : "text-text-muted"} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                EPC Onboarding Geographic Scope
              </label>
              <select
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                value={form.epc_onboarding_scope}
                onChange={(e) => setForm({ ...form, epc_onboarding_scope: e.target.value })}
              >
                <option value="district">District Level (EPCs in same district only)</option>
                <option value="state">State Level (EPCs across the entire state)</option>
                <option value="country">Country Level (EPCs nationwide)</option>
              </select>
            </div>
          </div>

          {/* 4. Commercial Controls & Cluster-Wise Fees */}
          <div className="p-4 bg-bg/60 rounded-2xl border border-border space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
              <FiDollarSign size={14} /> 4. Commercial Rules & Territory Scope
            </h4>

            {/* Information Banner: Cluster-Wise Fees */}
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
              <FiInfo className="text-blue-600 mt-0.5 shrink-0" size={16} />
              <div>
                <span className="font-bold">Franchisee Setup Fees are Configured Cluster-Wise:</span>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                  In accordance with the new franchise business model, franchisee store setup fees, renewal charges, security deposits, and payment tracking are managed dynamically per territory under <strong>Franchisee Cluster Management</strong>.
                </p>
              </div>
            </div>

            {/* Commission & Operational Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-border/60">
              {/* Commission Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                <div>
                  <div className="text-xs font-bold text-text-primary">Commission Eligibility</div>
                  <div className="text-[10px] text-text-muted">
                    {form.commission_enabled ? "Commission payouts enabled" : "Commission disabled"}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.commission_enabled}
                    onChange={(e) => setForm({ ...form, commission_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success relative"></div>
                </label>
              </div>

              {/* Allowed Territories Count */}
              <div className="p-3 rounded-xl bg-surface border border-border">
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Allowed Territories Count
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-bg text-text-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  value={form.allowed_territories_count}
                  onChange={(e) => setForm({ ...form, allowed_territories_count: e.target.value })}
                  min={1}
                />
              </div>
            </div>

            {/* Company Store BDE Policy */}
            {form.store_category === "company_store" && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <div>
                  <div className="text-xs font-bold text-purple-900 dark:text-purple-300">Mandatory BDE Assignment</div>
                  <div className="text-[10px] text-text-muted">Require a dedicated BDE to be assigned before store activation</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.bde_assignment_mandatory}
                    onChange={(e) => setForm({ ...form, bde_assignment_mandatory: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 relative"></div>
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Validity Duration
                </label>
                <input
                  type="number"
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  value={form.validity_value}
                  onChange={(e) => setForm({ ...form, validity_value: e.target.value })}
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Validity Unit
                </label>
                <select
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  value={form.validity_unit}
                  onChange={(e) => setForm({ ...form, validity_unit: e.target.value })}
                >
                  <option value="months">Month(s)</option>
                  <option value="years">Year(s)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Warehouse Infrastructure Requirements */}
          <div className="p-4 bg-bg/60 rounded-2xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <FiHome size={14} className="text-primary" /> 4. Warehouse Infrastructure Requirements
              </h4>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.warehouse_required}
                  onChange={(e) => setForm({
                    ...form,
                    warehouse_required: e.target.checked,
                    warehouse_count: e.target.checked ? (form.warehouse_count || 1) : 0,
                    warehouse_space_sqft: e.target.checked ? (form.warehouse_space_sqft || 1000) : 0,
                  })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
                <span className="text-xs font-bold text-text-primary">
                  {form.warehouse_required ? "Warehouse Required" : "No Warehouse Needed"}
                </span>
              </label>
            </div>

            {form.warehouse_required && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Number of Warehouses
                  </label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="e.g. 1"
                    value={form.warehouse_count}
                    onChange={(e) => setForm({ ...form, warehouse_count: e.target.value })}
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Minimum Space (Sq. Ft.)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="e.g. 2000"
                    value={form.warehouse_space_sqft}
                    onChange={(e) => setForm({ ...form, warehouse_space_sqft: e.target.value })}
                    min={0}
                    step={100}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Allowed Order Fulfillment Type */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <FiPackage size={14} /> 5. Allowed Order Fulfillment Type <span className="text-danger">*</span>
              </h4>
              <span className="text-[10px] text-text-muted">Multi-selection enabled</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {ORDER_TYPES.map((ot) => {
                const Icon = ot.icon;
                const currentList = Array.isArray(form.order_type_allowed)
                  ? form.order_type_allowed
                  : [form.order_type_allowed].filter(Boolean);
                const sel = currentList.includes(ot.value);

                const handleToggle = () => {
                  let updated;
                  if (sel) {
                    if (currentList.length <= 1) {
                      dispatch(setAlert({ type: "warning", message: "At least one order fulfillment type must be selected" }));
                      return;
                    }
                    updated = currentList.filter((v) => v !== ot.value);
                  } else {
                    updated = [...currentList, ot.value];
                  }
                  setForm({ ...form, order_type_allowed: updated });
                };

                return (
                  <button
                    key={ot.value}
                    type="button"
                    onClick={handleToggle}
                    className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      sel
                        ? "border-purple-600 bg-purple-50/60 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300 shadow-sm ring-1 ring-purple-500/20"
                        : "border-border bg-bg text-text-secondary hover:border-purple-300 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={sel ? "text-purple-600" : "text-text-muted"} />
                        <span className="text-xs font-bold text-text-primary">{ot.label}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          sel ? "bg-purple-600 border-purple-600 text-white" : "border-border bg-surface"
                        }`}
                      >
                        {sel && <FiCheck size={11} strokeWidth={3} />}
                      </div>
                    </div>
                    <p className="text-[10px] text-text-muted leading-tight">{ot.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description & Sort Order */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Plan Description (Optional)
              </label>
              <textarea
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                placeholder="Territory rights, privileges, or guidelines..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="w-44">
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Sort Order Priority
              </label>
              <input
                type="number"
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                min={0}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
              {saving ? <FiLoader className="animate-spin" size={16} /> : null}
              {saving ? "Saving..." : mode === "edit" ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. PLAN SETTINGS MODAL
 * Advanced Card-Wise Industry Type Selection, Cascading Filters,
 * and Multi-Product Assignment
 * ─────────────────────────────────────────────────────────────────────────────
 */
function PlanSettingsModal({ plan, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [configOptions, setConfigOptions] = useState({
    industry_types: [],
    project_types: [],
    categories: [],
    subcategories: [],
    system_types: [],
    project_ranges: [],
    combo_kits: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selected Scope States
  const initialIndustryIds = (plan?.allowed_industry_type_ids || plan?.allowed_industry_types || [])
    .map((i) => (i?._id ? String(i._id) : String(i)))
    .filter((id) => id && id !== "null" && id !== "undefined");

  const initialComboKitIds = (plan?.allowed_combo_kit_ids || plan?.allowed_combo_kits || [])
    .map((k) => (k?._id ? String(k._id) : String(k)))
    .filter((id) => id && id !== "null" && id !== "undefined");

  const [selectedIndustryIds, setSelectedIndustryIds] = useState(initialIndustryIds);
  const [selectedComboKitIds, setSelectedComboKitIds] = useState(initialComboKitIds);

  // Filter & View States
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/resellers/plans/config-options?unique_id=${MODULE_UID}&req_for=view`, { headers: authHeaderObj() })
      .then((res) => {
        if (res.data?.status === "success") {
          const cfgData = res.data.data;
          setConfigOptions(cfgData);
          const validAvailableIds = new Set((cfgData?.combo_kits || []).map((k) => String(k.id || k._id)));
          setSelectedComboKitIds((prev) => prev.filter((id) => validAvailableIds.has(String(id))));
        }
      })
      .catch((err) => {
        console.error("Could not fetch plan config options:", err);
        dispatch(setAlert({ type: "error", message: "Failed to load industry types and catalog" }));
      })
      .finally(() => setLoading(false));
  }, [dispatch]);

  // Industry Type Toggle
  const toggleIndustryType = (industryId) => {
    setSelectedIndustryIds((prev) => {
      const exists = prev.includes(industryId);
      if (exists) {
        return prev.filter((id) => id !== industryId);
      } else {
        return [...prev, industryId];
      }
    });
  };

  const selectAllIndustries = () => {
    const allIds = (configOptions.industry_types || []).map((i) => String(i.id));
    if (selectedIndustryIds.length === allIds.length) {
      setSelectedIndustryIds([]);
    } else {
      setSelectedIndustryIds(allIds);
    }
  };

  // Cascading Filter Dropdown Options based on Selected Industry Cards
  const categoryFilterOptions = useMemo(() => {
    let cats = configOptions.categories || [];
    if (selectedIndustryIds.length > 0) {
      const allowedSet = new Set(selectedIndustryIds);
      cats = cats.filter((c) => c.industry_type_id && allowedSet.has(String(c.industry_type_id)));
    }
    const list = cats.map((c) => ({
      value: String(c.id),
      text: c.name,
    }));
    return [{ value: "all", text: "All Categories" }, ...list];
  }, [configOptions.categories, selectedIndustryIds]);

  const subCategoryFilterOptions = useMemo(() => {
    let subs = configOptions.subcategories || [];
    if (filters.category && filters.category !== "all") {
      subs = subs.filter((s) => String(s.category_id) === String(filters.category));
    } else if (selectedIndustryIds.length > 0) {
      const allowedSet = new Set(selectedIndustryIds);
      const validCatIds = new Set(
        (configOptions.categories || [])
          .filter((c) => c.industry_type_id && allowedSet.has(String(c.industry_type_id)))
          .map((c) => String(c.id))
      );
      subs = subs.filter((s) => validCatIds.has(String(s.category_id)));
    }
    const list = subs.map((s) => ({
      value: String(s.id),
      text: s.name,
    }));
    return [{ value: "all", text: "All Sub-Categories" }, ...list];
  }, [configOptions.subcategories, configOptions.categories, filters.category, selectedIndustryIds]);

  const systemTypeFilterOptions = useMemo(() => {
    let types = configOptions.system_types || [];
    if (filters.subCategory && filters.subCategory !== "all") {
      types = types.filter((t) => String(t.subcategory_id) === String(filters.subCategory));
    }
    const list = types.map((t) => ({
      value: String(t.id),
      text: t.name,
    }));
    return [{ value: "all", text: "All System Types" }, ...list];
  }, [configOptions.system_types, filters.subCategory]);

  const projectRangeFilterOptions = useMemo(() => {
    let ranges = configOptions.project_ranges || [];
    if (filters.systemType && filters.systemType !== "all") {
      ranges = ranges.filter((r) => String(r.subcategory_type_id) === String(filters.systemType));
    }
    const list = ranges.map((r) => ({
      value: String(r.id),
      text: r.label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`,
    }));
    return [{ value: "all", text: "All Project Ranges" }, ...list];
  }, [configOptions.project_ranges, filters.systemType]);

  const isFilterActive =
    filters.category !== "all" ||
    filters.subCategory !== "all" ||
    filters.systemType !== "all" ||
    filters.projectRange !== "all" ||
    search.trim() !== "";

  const clearFilters = () => {
    setFilters({
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
    setSearch("");
  };

  // Filtered Products / Combo Kits (automatically scoped to allowed industry cards)
  const filteredProducts = useMemo(() => {
    const allKits = configOptions.combo_kits || [];
    const allowedIndSet = selectedIndustryIds.length > 0 ? new Set(selectedIndustryIds) : null;

    return allKits.filter((kit) => {
      const kitIndId = kit.industry_type_id;
      const kitCatId = kit.category_id;
      const kitSubcatId = kit.subcategory_id;
      const kitTypeId = kit.system_type_id;
      const kitRangeId = kit.project_range_id;

      if (allowedIndSet && kitIndId && !allowedIndSet.has(String(kitIndId))) {
        return false;
      }
      if (filters.category !== "all" && kitCatId && String(kitCatId) !== String(filters.category)) {
        return false;
      }
      if (filters.subCategory !== "all" && kitSubcatId && String(kitSubcatId) !== String(filters.subCategory)) {
        return false;
      }
      if (filters.systemType !== "all" && kitTypeId && String(kitTypeId) !== String(filters.systemType)) {
        return false;
      }
      if (filters.projectRange !== "all" && kitRangeId && String(kitRangeId) !== String(filters.projectRange)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (kit.name || "").toLowerCase().includes(q);
        const matchesCode = (kit.kit_code || "").toLowerCase().includes(q);
        const matchesCat = (kit.category_name || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCat) return false;
      }
      return true;
    });
  }, [configOptions.combo_kits, selectedIndustryIds, filters, search]);

  // Product Selection Handlers
  const toggleProduct = (productId) => {
    const idStr = String(productId);
    setSelectedComboKitIds((prev) => {
      if (prev.includes(idStr)) {
        return prev.filter((id) => id !== idStr);
      } else {
        return [...prev, idStr];
      }
    });
  };

  const toggleFilteredProducts = () => {
    const targetIds = filteredProducts.map((p) => String(p.id));
    const allSelected = targetIds.length > 0 && targetIds.every((id) => selectedComboKitIds.includes(id));

    if (allSelected) {
      setSelectedComboKitIds((prev) => prev.filter((id) => !targetIds.includes(id)));
    } else {
      setSelectedComboKitIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      const payload = {
        id: plan.id,
        allowed_industry_type_ids: selectedIndustryIds,
        allowed_combo_kit_ids: selectedComboKitIds,
      };

      const res = await apiFetch("put", `/update?req_for=edit&unique_id=${MODULE_UID}`, payload);
      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: `Plan "${plan.name}" configured with ${selectedIndustryIds.length} industries and ${selectedComboKitIds.length} products`,
        }));
        onSaved();
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to save configuration" }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Save failed" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border bg-bg/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <FiSettings size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">{plan.name}</h3>
                <TerritoryLevelBadge level={plan.territory_level} />
                <OrderTypeBadge orderType={plan.order_type_allowed} />
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Assign allowed Industry Types and choose specific Products / Combo Kits covered under this plan
              </p>
            </div>
          </div>

          {/* Quick Counter Summary */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                <FiLayers size={13} /> {selectedIndustryIds.length} Industries
              </span>
              <span className="text-border">•</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600">
                <FiBox size={13} /> {selectedComboKitIds.length} Products
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hover">
          {/* ───────────────────────────────────────────────────────────────────
              SECTION 1: INDUSTRY TYPE CARDS (Multi-Select & Assign)
              ─────────────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <FiLayers size={15} /> 1. Allowed Industry Types
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Click on industry cards to allow or disallow business domains for this franchise tier
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {selectedIndustryIds.length} of {configOptions.industry_types?.length || 0} Assigned
                </span>
                {configOptions.industry_types?.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAllIndustries}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    {selectedIndustryIds.length === configOptions.industry_types.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-xs text-text-muted gap-2">
                <FiLoader className="animate-spin" size={16} /> Loading industry sectors...
              </div>
            ) : configOptions.industry_types?.length === 0 ? (
              <div className="p-4 bg-bg rounded-xl border border-dashed border-border text-center text-xs text-text-muted">
                No industry types found in system master.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {configOptions.industry_types.map((ind) => {
                  const isAssigned = selectedIndustryIds.includes(String(ind.id));
                  const Icon = getIndustryIcon(ind.code);

                  return (
                    <motion.div
                      key={ind.id}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => toggleIndustryType(String(ind.id))}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
                        isAssigned
                          ? "bg-sky-50/70 dark:bg-sky-950/20 border-primary shadow-sm ring-1 ring-primary/30"
                          : "bg-bg border-border text-text-secondary hover:border-primary/40 hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${
                          isAssigned
                            ? "bg-primary text-white shadow-md shadow-primary/30"
                            : "bg-surface border border-border text-text-muted"
                        }`}>
                          <Icon size={18} />
                        </div>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          isAssigned
                            ? "bg-primary border-primary text-white"
                            : "bg-surface border-border text-transparent"
                        }`}>
                          <FiCheck size={14} strokeWidth={3} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-xs text-text-primary leading-snug line-clamp-1">{ind.name}</span>
                          {ind.code && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-surface-hover text-text-muted border border-border shrink-0">
                              {ind.code}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-muted flex items-center gap-2">
                          <span>{ind.category_count || 0} Categories</span>
                          <span>•</span>
                          <span>{ind.kit_count || 0} Products</span>
                        </div>
                      </div>

                      {isAssigned && (
                        <div className="mt-2.5 pt-2 border-t border-primary/20 flex items-center justify-between text-[10px] font-bold text-primary">
                          <span>Assigned to Plan</span>
                          <FiCheck size={12} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────────────────
              SECTION 2: CASCADING HIERARCHY FILTERS & SEARCH
              ─────────────────────────────────────────────────────────────────── */}
          <div className="p-4 bg-bg/70 rounded-2xl border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <FiFilter size={15} className="text-primary" />
                <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                  Filter & Drill Down Products
                </h4>
                {isFilterActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    Filtered ({filteredProducts.length} results)
                  </span>
                )}
              </div>

              {isFilterActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-primary hover:underline self-start sm:self-auto"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
              <input
                type="text"
                placeholder="Search product name, kit code, or kW capacity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Cascading Dropdowns: Category -> Sub-Category -> System Type -> Project Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              <Dropdown
                label="Category"
                options={categoryFilterOptions}
                value={filters.category}
                disabled={categoryFilterOptions.length <= 1}
                onChange={(val) => setFilters((prev) => ({
                  ...prev,
                  category: val,
                  subCategory: "all",
                  systemType: "all",
                  projectRange: "all",
                }))}
                className="w-full"
              />
              <Dropdown
                label="Sub-Category"
                options={subCategoryFilterOptions}
                value={filters.subCategory}
                disabled={filters.category === "all" && subCategoryFilterOptions.length <= 1}
                onChange={(val) => setFilters((prev) => ({
                  ...prev,
                  subCategory: val,
                  systemType: "all",
                  projectRange: "all",
                }))}
                className="w-full"
              />
              <Dropdown
                label="System Type"
                options={systemTypeFilterOptions}
                value={filters.systemType}
                disabled={filters.subCategory === "all"}
                onChange={(val) => setFilters((prev) => ({
                  ...prev,
                  systemType: val,
                  projectRange: "all",
                }))}
                className="w-full"
              />
              <Dropdown
                label="Project Range"
                options={projectRangeFilterOptions}
                value={filters.projectRange}
                disabled={filters.systemType === "all"}
                onChange={(val) => setFilters((prev) => ({
                  ...prev,
                  projectRange: val,
                }))}
                className="w-full"
              />
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────────
              SECTION 3: PRODUCT ASSIGNMENT (CARD GRID & LIST VIEW)
              ─────────────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                  <FiBox size={15} /> 2. Assign Products / Combo Kits
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {selectedComboKitIds.length} Assigned to Plan
                </span>
                <span className="text-xs text-text-muted">
                  (Showing {filteredProducts.length} products)
                </span>
              </div>

              <div className="flex items-center gap-3">
                {filteredProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleFilteredProducts}
                    className="text-xs font-bold text-purple-600 hover:underline"
                  >
                    {filteredProducts.every((p) => selectedComboKitIds.includes(String(p.id)))
                      ? isFilterActive ? "Deselect Filtered" : "Deselect All"
                      : isFilterActive ? "Select Filtered" : "Select All Available"}
                  </button>
                )}

                {/* View Switcher */}
                <div className="flex items-center bg-bg rounded-lg border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "grid" ? "bg-surface shadow-sm text-primary" : "text-text-muted hover:text-text-primary"
                    }`}
                    title="Card Grid View"
                  >
                    <FiGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "list" ? "bg-surface shadow-sm text-primary" : "text-text-muted hover:text-text-primary"
                    }`}
                    title="Compact List View"
                  >
                    <FiList size={14} />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-xs text-text-muted gap-2">
                <FiLoader className="animate-spin" size={16} /> Loading products catalog...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted bg-surface rounded-2xl border border-dashed border-border p-6">
                <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-2 text-text-muted">
                  <FiBox size={22} />
                </div>
                <p className="font-semibold text-text-primary">
                  {configOptions.combo_kits?.length === 0
                    ? "No products/combo kits created yet in the system."
                    : "No products match the selected filters or search."}
                </p>
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 text-primary font-bold hover:underline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* CARD GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const isSelected = selectedComboKitIds.includes(String(p.id));

                  return (
                    <motion.div
                      key={p.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => toggleProduct(p.id)}
                      className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-600 shadow-sm ring-1 ring-purple-600/30"
                          : "bg-bg border-border text-text-secondary hover:border-purple-300 hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 truncate">
                          <div className="font-bold text-xs text-text-primary truncate" title={p.name}>
                            {p.name}
                          </div>
                          <div className="text-[10px] text-text-muted font-mono mt-0.5">
                            {p.kit_code || "SKU-AUTO"}
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                          isSelected
                            ? "bg-purple-600 border-purple-600 text-white"
                            : "bg-surface border-border text-transparent"
                        }`}>
                          <FiCheck size={12} strokeWidth={3} />
                        </div>
                      </div>

                      {/* Badges / Specs */}
                      <div className="space-y-1.5 my-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.capacity_kw > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-warning-soft text-warning border border-warning/20">
                              ⚡ {p.capacity_kw} kW
                            </span>
                          )}
                          {p.category_name && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface text-text-muted border border-border truncate max-w-[140px]" title={p.category_name}>
                              {p.category_name}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1 text-[10px] text-text-muted">
                          {p.system_type_name && <span>{p.system_type_name}</span>}
                          {p.system_type_name && p.project_range_label && <span>•</span>}
                          {p.project_range_label && <span>{p.project_range_label}</span>}
                        </div>
                      </div>

                      {/* Footer: Price & Selection Status */}
                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                        <div className="font-bold text-text-primary">
                          {p.selling_price_cached > 0
                            ? `₹${Number(p.selling_price_cached).toLocaleString("en-IN")}`
                            : "Price on Request"}
                        </div>
                        <span className={`text-[10px] font-bold ${isSelected ? "text-purple-600" : "text-text-muted"}`}>
                          {isSelected ? "Assigned" : "Click to assign"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT LIST VIEW */
              <div className="border border-border rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-bg border-b border-border sticky top-0 z-10">
                    <tr className="text-text-muted font-semibold">
                      <th className="w-10 px-3 py-2.5 text-center"></th>
                      <th className="text-left px-3 py-2.5">Product Name</th>
                      <th className="text-left px-3 py-2.5">Capacity</th>
                      <th className="text-left px-3 py-2.5">Category & System</th>
                      <th className="text-right px-3 py-2.5">Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((p) => {
                      const isSelected = selectedComboKitIds.includes(String(p.id));

                      return (
                        <tr
                          key={p.id}
                          onClick={() => toggleProduct(p.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-purple-50/50 dark:bg-purple-950/20 text-text-primary"
                              : "hover:bg-surface-hover text-text-secondary"
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row click
                              className="rounded border-border text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-bold text-text-primary">
                            <div>{p.name}</div>
                            <div className="text-[10px] font-mono text-text-muted">{p.kit_code || "SKU-AUTO"}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            {p.capacity_kw > 0 ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-warning-soft text-warning border border-warning/20">
                                {p.capacity_kw} kW
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-text-muted">
                            <div>{p.category_name || "-"}</div>
                            <div className="text-[10px] text-text-muted">
                              {p.system_type_name ? `${p.system_type_name} • ` : ""}
                              {p.project_range_label || ""}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-text-primary">
                            {p.selling_price_cached > 0
                              ? `₹${Number(p.selling_price_cached).toLocaleString("en-IN")}`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-bg/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-text-muted">
            <strong className="text-text-primary">{selectedIndustryIds.length}</strong> Industry Types &{" "}
            <strong className="text-text-primary">{selectedComboKitIds.length}</strong> Products assigned
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-text-secondary text-xs font-semibold hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveConfiguration}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-primary/20"
            >
              {saving ? <FiLoader className="animate-spin" size={15} /> : <FiCheck size={15} />}
              {saving ? "Saving Configuration..." : "Save Plan Configuration"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. DELETE CONFIRMATION MODAL
 * ─────────────────────────────────────────────────────────────────────────────
 */
function DeleteConfirmModal({ plan, onClose, onConfirmed }) {
  const [deleting, setDeleting] = useState(false);
  const dispatch = useDispatch();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch("delete", `/delete?req_for=delete&unique_id=${MODULE_UID}`, { id: plan.id });
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `Plan "${plan.name}" deleted successfully` }));
        onConfirmed(plan.id);
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Delete failed" }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Delete failed" }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center">
            <FiAlertCircle size={28} className="text-danger" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">Delete Franchisee Plan?</h3>
            <p className="text-sm text-text-secondary">
              Permanently deleting <strong className="text-text-primary">"{plan.name}"</strong>. Active subscriptions must be reassigned first.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-danger-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? <FiLoader className="animate-spin" size={16} /> : null}
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. MAIN RESELLER PLANS PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function ResellerPlans({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [modal, setModal] = useState(null); // { mode: 'add' | 'edit' | 'settings' | 'delete', data?: plan }

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLevel !== "all") params.append("territory_level", filterLevel);
      if (filterCategory !== "all") params.append("store_category", filterCategory);
      const res = await axios.get(
        `${API_BASE}/resellers/plans/list?req_for=view&unique_id=${MODULE_UID}&${params.toString()}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setPlans(res.data.data);
      }
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load store types" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, filterLevel, filterCategory]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleToggle = async (plan) => {
    try {
      const res = await apiFetch("put", `/toggle-status?req_for=edit&unique_id=${MODULE_UID}`, {
        id: plan.id,
        is_active: !plan.is_active,
      });
      if (res.data?.status === "success") {
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, is_active: !p.is_active } : p))
        );
        dispatch(setAlert({
          type: "success",
          message: `"${plan.name}" ${!plan.is_active ? "activated" : "deactivated"}`,
        }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Toggle failed" }));
    }
  };

  const filtered = plans.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.slug || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiFileText className="text-primary" size={24} />
            Store Type Settings
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Configure store types (Company / Franchisee Store), commercial rules, setup fees, commission, and order allocations
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
        >
          <FiPlus size={16} />
          Create Store Type
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search store types by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Store Category Filter */}
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {[
              { val: "all", label: "All Types" },
              { val: "franchisee_store", label: "Franchisee Stores" },
              { val: "company_store", label: "Company Stores" },
            ].map((cat) => (
              <button
                key={cat.val}
                onClick={() => setFilterCategory(cat.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterCategory === cat.val
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Territory Scope Filter */}
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {["all", "district", "state", "country"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  filterLevel === lvl
                    ? "bg-surface-hover text-primary font-bold shadow-sm border border-primary/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted gap-3">
            <FiLoader className="animate-spin" size={20} />
            <span className="text-sm">Loading store types...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center">
              <FiFileText size={24} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">
              {search || filterLevel !== "all" || filterCategory !== "all"
                ? "No store types match your filters"
                : "No store types created yet. Click 'Create Store Type' to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-text-muted font-semibold text-xs">
                  <th className="text-left px-5 py-3.5">Store Type & Category</th>
                  <th className="text-left px-4 py-3.5">Scope & EPC Rights</th>
                  <th className="text-right px-4 py-3.5">Commercial Rules & Fee</th>
                  <th className="text-left px-4 py-3.5">Warehouse Req.</th>
                  <th className="text-left px-4 py-3.5">Order Type</th>
                  <th className="text-left px-4 py-3.5">Assigned Scope & Products</th>
                  <th className="text-center px-3 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {filtered.map((plan) => (
                    <motion.tr
                      key={plan.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-surface-hover/60 transition-colors"
                    >
                      {/* Store Type Name & Category */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-text-primary">{plan.name}</div>
                        <div className="text-xs text-text-muted mt-0.5 font-mono">{plan.slug}</div>
                        <div className="mt-1">
                          <StoreCategoryBadge
                            category={plan.store_category}
                            subtype={plan.franchisee_subtype_id}
                          />
                        </div>
                      </td>

                      {/* Scope Level & EPC Scope */}
                      <td className="px-4 py-3.5">
                        <TerritoryLevelBadge level={plan.territory_level} />
                        <div className="text-[10px] text-text-muted font-medium mt-1">
                          EPC Scope: <strong className="text-text-primary capitalize">{plan.epc_onboarding_scope || plan.territory_level}</strong>
                        </div>
                      </td>

                      {/* Commercial Rules & Fee */}
                      <td className="px-4 py-3.5 text-right font-semibold text-text-primary">
                        <CommercialsBadge
                          commissionEnabled={plan.commission_enabled}
                          storeCategory={plan.store_category}
                        />
                        <div className="text-[11px] text-text-muted font-normal mt-1">
                          Validity: {plan.validity_value} {plan.validity_unit}
                        </div>
                      </td>

                      {/* Warehouse Req. */}
                      <td className="px-4 py-3.5">
                        <WarehouseBadge
                          required={plan.warehouse_required}
                          count={plan.warehouse_count}
                          sqft={plan.warehouse_space_sqft}
                        />
                      </td>

                      {/* Order Type */}
                      <td className="px-4 py-3.5">
                        <OrderTypeBadge orderType={plan.order_type_allowed} />
                      </td>

                      {/* Assigned Scope & Products */}
                      <td className="px-4 py-3.5">
                        <AssignedScopeBadge
                          industryCount={plan.industry_types_count || plan.allowed_industry_types?.length || 0}
                          productCount={plan.combo_kits_count || plan.allowed_combo_kits?.length || 0}
                          onClick={() => setModal({ mode: "settings", data: plan })}
                        />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center">
                        <StatusBadge isActive={plan.is_active} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Configure Scope & Products Button */}
                          <button
                            onClick={() => setModal({ mode: "settings", data: plan })}
                            title="Configure Industries & Products"
                            className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
                          >
                            <FiSettings size={15} />
                            <span className="hidden xl:inline">Settings</span>
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            onClick={() => handleToggle(plan)}
                            title={plan.is_active ? "Deactivate Plan" : "Activate Plan"}
                            className={`p-2 rounded-xl transition-colors ${
                              plan.is_active
                                ? "text-success hover:bg-success-soft"
                                : "text-text-muted hover:bg-surface-hover"
                            }`}
                          >
                            {plan.is_active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                          </button>

                          {/* Edit Plan */}
                          <button
                            onClick={() => setModal({ mode: "edit", data: plan })}
                            title="Edit Plan Details"
                            className="p-2 rounded-xl text-text-muted hover:text-primary hover:bg-info-soft transition-colors"
                          >
                            <FiEdit2 size={15} />
                          </button>

                          {/* Delete Plan */}
                          <button
                            onClick={() => setModal({ mode: "delete", data: plan })}
                            title="Delete Plan"
                            className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.mode === "add" && (
          <FormModal
            key="add"
            mode="add"
            initial={null}
            onClose={() => setModal(null)}
            onSaved={fetchPlans}
          />
        )}
        {modal?.mode === "edit" && (
          <FormModal
            key="edit"
            mode="edit"
            initial={modal.data}
            onClose={() => setModal(null)}
            onSaved={fetchPlans}
          />
        )}
        {modal?.mode === "settings" && (
          <PlanSettingsModal
            key="settings"
            plan={modal.data}
            onClose={() => setModal(null)}
            onSaved={fetchPlans}
          />
        )}
        {modal?.mode === "delete" && (
          <DeleteConfirmModal
            key="del"
            plan={modal.data}
            onClose={() => setModal(null)}
            onConfirmed={(id) => setPlans((p) => p.filter((x) => x.id !== id))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
