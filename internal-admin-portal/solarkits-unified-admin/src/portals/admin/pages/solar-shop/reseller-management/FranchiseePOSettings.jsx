import { useState, useEffect, useCallback, useMemo } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiSettings,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiLoader,
  FiCheck,
  FiX,
  FiFileText,
  FiPackage,
  FiBox,
  FiSearch,
  FiCalendar,
  FiFilter,
  FiArrowLeft,
  FiMapPin,
  FiMap,
  FiGlobe,
  FiCheckCircle,
  FiAlertTriangle,
  FiChevronRight,
  FiSliders,
  FiClock,
  FiLock,
  FiGrid,
  FiList,
  FiDollarSign,
} from "react-icons/fi";
import { useDispatch } from "react-redux";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";
import Button from "@/components/Button";
import Dropdown from "@/components/Dropdown";

const API_BASE = import.meta.env.VITE_API_URL;
const apiFetch = (method, ep, data, params = {}) =>
  axios({
    method,
    url: `${API_BASE}/franchisee/po-settings${ep}`,
    headers: authHeaderObj(),
    data,
    params: {
      req_for: method === "get" ? "view" : method === "post" ? "add" : method === "put" ? "edit" : "delete",
      unique_id: "FPO_SETTINGS",
      ...params,
    },
  });

const EMPTY_FORM = {
  po_enabled: true,
  min_po_quantity: "1",
  max_po_quantity: "",
  po_validity_days: "30",
  max_line_items: "50",
  allow_mixed_project_types: true,
  token_booking_enabled: true,
  token_type: "FIXED_AMOUNT",
  token_value: "50000",
  po_lock_days: "30",
  allowed_industry_type_ids: [],
  allowed_category_ids: [],
  allowed_subcategory_ids: [],
  allowed_project_type_ids: [],
  allowed_combo_kit_ids: [],
  effective_from: new Date().toISOString().slice(0, 10),
  effective_until: "",
};

function TerritoryLevelBadge({ level }) {
  const norm = (level || "district").toLowerCase();
  if (norm === "state") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <FiMap size={11} /> State Level
      </span>
    );
  }
  if (norm === "country" || norm === "national") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <FiGlobe size={11} /> Country Level
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
      <FiMapPin size={11} /> District Level
    </span>
  );
}

export default function FranchiseePOSettings() {
  const dispatch = useDispatch();

  // Core State
  const [settings, setSettings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
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
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // View Modes (1. Card View, 2. Table View)
  const [planOverviewViewMode, setPlanOverviewViewMode] = useState("card"); // Level 1 View: "card" | "table"
  const [planPoViewMode, setPlanPoViewMode] = useState("card"); // Level 2 View: "card" | "table"

  // Level 1: Plan Cards Filter & Search
  const [searchPlan, setSearchPlan] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("all");

  // Level 2: Selected Plan PO Settings Grid Filters
  const [searchSetting, setSearchSetting] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");

  // Modal: Cascading Filters for Product Selection
  const [modalFilters, setModalFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });
  const [kitSearchQuery, setKitSearchQuery] = useState("");

  // ── Fetch All Data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes, cRes] = await Promise.all([
        apiFetch("get", "/list"),
        axios.get(`${API_BASE}/resellers/plans/list`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "RSL_PLAN" },
        }),
        axios.get(`${API_BASE}/resellers/plans/config-options`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "RSL_PLAN" },
        }),
      ]);
      setSettings(sRes.data.data || []);
      setPlans(pRes.data.data || []);
      if (cRes.data?.status === "success" && cRes.data?.data) {
        setConfigOptions(cRes.data.data);
      }
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load PO settings." }));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Keep selectedPlan updated with fresh data if plans reload
  useEffect(() => {
    if (selectedPlan && plans.length > 0) {
      const targetId = String(selectedPlan.id || selectedPlan._id);
      const updated = plans.find((p) => String(p.id || p._id) === targetId);
      if (updated && (updated.name !== selectedPlan.name || updated.is_active !== selectedPlan.is_active)) {
        setSelectedPlan(updated);
      }
    }
  }, [plans, selectedPlan]);

  // ── Plan to PO Settings Mapping & Stats ─────────────────────────────────────
  const planSettingsMap = useMemo(() => {
    const map = {};
    plans.forEach((p) => {
      const pId = String(p.id || p._id);
      map[pId] = settings.filter((s) => {
        const sPlanId = String(s.plan_id?._id || s.plan_id?.id || s.plan_id);
        return sPlanId === pId;
      });
    });
    return map;
  }, [plans, settings]);

  // Settings for currently selected plan
  const activePlanSettings = useMemo(() => {
    if (!selectedPlan) return [];
    const pId = String(selectedPlan.id || selectedPlan._id);
    return planSettingsMap[pId] || [];
  }, [selectedPlan, planSettingsMap]);

  // ── Configured Kit IDs Map for this Plan (Conflict Prevention) ───────────────
  // Maps kit_id -> existing setting info so duplicate PO settings per product are prevented
  const configuredKitMap = useMemo(() => {
    if (!selectedPlan) return {};
    const map = {};
    activePlanSettings.forEach((s) => {
      const settingId = String(s._id || s.id);
      // When editing an existing setting, do NOT lock its own currently assigned kits
      if (editingId && settingId === String(editingId)) {
        return;
      }
      (s.allowed_combo_kit_ids || []).forEach((k) => {
        const kId = String(k?._id || k?.id || k);
        if (kId) {
          map[kId] = {
            settingId,
            minQty: s.min_po_quantity,
            maxQty: s.max_po_quantity,
            validity: s.po_validity_days,
          };
        }
      });
    });
    return map;
  }, [selectedPlan, activePlanSettings, editingId]);

  // Filtered settings for Grid/Table View in Level 2
  const filteredActivePlanSettings = useMemo(() => {
    return activePlanSettings.filter((s) => {
      // Status filter
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;

      // Industry filter
      if (industryFilter !== "all") {
        const indIds = (s.allowed_industry_type_ids || []).map((ind) =>
          String(ind?._id || ind?.id || ind)
        );
        if (indIds.length > 0 && !indIds.includes(industryFilter)) {
          return false;
        }
      }

      // Search Query
      if (searchSetting.trim()) {
        const q = searchSetting.toLowerCase();
        const kitNames = (s.allowed_combo_kit_ids || [])
          .map((k) => (k?.name || k?.kit_code || "").toLowerCase())
          .join(" ");
        const indNames = (s.allowed_industry_type_ids || [])
          .map((i) => (i?.name || "").toLowerCase())
          .join(" ");
        const catNames = (s.allowed_category_ids || [])
          .map((c) => (c?.name || "").toLowerCase())
          .join(" ");

        const match =
          kitNames.includes(q) ||
          indNames.includes(q) ||
          catNames.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [activePlanSettings, statusFilter, industryFilter, searchSetting]);

  // Filtered Plans for Level 1 Cards/Table View
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      // Territory filter
      if (territoryFilter !== "all") {
        if ((p.territory_level || "").toLowerCase() !== territoryFilter.toLowerCase()) {
          return false;
        }
      }
      // Search
      if (searchPlan.trim()) {
        const q = searchPlan.toLowerCase();
        const name = (p.name || "").toLowerCase();
        const slug = (p.slug || "").toLowerCase();
        const territory = (p.territory_level || "").toLowerCase();
        if (!name.includes(q) && !slug.includes(q) && !territory.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [plans, territoryFilter, searchPlan]);

  // ── Cascading Filter Options for Modal ──────────────────────────────────────
  const modalIndustryOptions = useMemo(() => {
    const list = (configOptions.industry_types || []).map((ind) => ({
      value: String(ind.id || ind._id),
      text: ind.name,
    }));
    return [{ value: "all", text: "All Industry Types" }, ...list];
  }, [configOptions.industry_types]);

  const modalCategoryOptions = useMemo(() => {
    let cats = configOptions.categories || [];
    if (modalFilters.industryType && modalFilters.industryType !== "all") {
      cats = cats.filter((c) => String(c.industry_type_id) === String(modalFilters.industryType));
    }
    const list = cats.map((c) => ({
      value: String(c.id || c._id),
      text: c.name,
    }));
    return [{ value: "all", text: "All Categories" }, ...list];
  }, [configOptions.categories, modalFilters.industryType]);

  const modalSubCategoryOptions = useMemo(() => {
    let subs = configOptions.subcategories || [];
    if (modalFilters.category && modalFilters.category !== "all") {
      subs = subs.filter((s) => String(s.category_id) === String(modalFilters.category));
    } else if (modalFilters.industryType && modalFilters.industryType !== "all") {
      const validCatIds = new Set(
        (configOptions.categories || [])
          .filter((c) => String(c.industry_type_id) === String(modalFilters.industryType))
          .map((c) => String(c.id || c._id))
      );
      subs = subs.filter((s) => validCatIds.has(String(s.category_id)));
    }
    const list = subs.map((s) => ({
      value: String(s.id || s._id),
      text: s.name,
    }));
    return [{ value: "all", text: "All Sub-Categories" }, ...list];
  }, [configOptions.subcategories, configOptions.categories, modalFilters.category, modalFilters.industryType]);

  const modalSystemTypeOptions = useMemo(() => {
    let types = configOptions.system_types || [];
    if (modalFilters.subCategory && modalFilters.subCategory !== "all") {
      types = types.filter((t) => String(t.subcategory_id) === String(modalFilters.subCategory));
    }
    const list = types.map((t) => ({
      value: String(t.id || t._id),
      text: t.name,
    }));
    return [{ value: "all", text: "All System Types" }, ...list];
  }, [configOptions.system_types, modalFilters.subCategory]);

  const modalProjectRangeOptions = useMemo(() => {
    let ranges = configOptions.project_ranges || [];
    if (modalFilters.systemType && modalFilters.systemType !== "all") {
      ranges = ranges.filter((r) => String(r.subcategory_type_id) === String(modalFilters.systemType));
    }
    const list = ranges.map((r) => ({
      value: String(r.id || r._id),
      text: r.label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`,
    }));
    return [{ value: "all", text: "All Project Ranges" }, ...list];
  }, [configOptions.project_ranges, modalFilters.systemType]);

  const isModalFilterActive =
    modalFilters.industryType !== "all" ||
    modalFilters.category !== "all" ||
    modalFilters.subCategory !== "all" ||
    modalFilters.systemType !== "all" ||
    modalFilters.projectRange !== "all";

  // Combo kits filtered by cascading dropdowns & search
  const modalFilteredComboKits = useMemo(() => {
    const allKits = configOptions.combo_kits || [];
    return allKits.filter((kit) => {
      const kitCatId = kit.category_id?._id || kit.category_id || kit.solar_kit_id?.category_id?._id || kit.solar_kit_id?.category_id;
      const kitSubcatId = kit.subcategory_id?._id || kit.subcategory_id || kit.solar_kit_id?.subcategory_id?._id || kit.solar_kit_id?.subcategory_id;
      const kitTypeId = kit.project_type_id?._id || kit.project_type_id || kit.type_id?._id || kit.type_id || kit.system_type_id?._id || kit.system_type_id || kit.solar_kit_id?.type_id?._id || kit.solar_kit_id?.type_id;
      const kitRangeId = kit.project_range_id?._id || kit.project_range_id;
      const kitIndId = kit.industry_type_id?._id || kit.industry_type_id || kit.solar_kit_id?.industry_type_id?._id || kit.solar_kit_id?.industry_type_id;

      if (modalFilters.industryType !== "all" && kitIndId && String(kitIndId) !== String(modalFilters.industryType)) {
        return false;
      }
      if (modalFilters.category !== "all" && kitCatId && String(kitCatId) !== String(modalFilters.category)) {
        return false;
      }
      if (modalFilters.subCategory !== "all" && kitSubcatId && String(kitSubcatId) !== String(modalFilters.subCategory)) {
        return false;
      }
      if (modalFilters.systemType !== "all" && kitTypeId && String(kitTypeId) !== String(modalFilters.systemType)) {
        return false;
      }
      if (modalFilters.projectRange !== "all" && kitRangeId && String(kitRangeId) !== String(modalFilters.projectRange)) {
        return false;
      }
      if (kitSearchQuery.trim()) {
        const q = kitSearchQuery.toLowerCase();
        const match =
          (kit.name || "").toLowerCase().includes(q) ||
          (kit.kit_code || "").toLowerCase().includes(q) ||
          String(kit.capacity_kw || "").includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [configOptions.combo_kits, modalFilters, kitSearchQuery]);

  // Unconfigured (Available) Combo Kits only
  const availableFilteredComboKits = useMemo(() => {
    return modalFilteredComboKits.filter((k) => {
      const kId = String(k.id || k._id);
      return !configuredKitMap[kId] || form.allowed_combo_kit_ids.includes(kId);
    });
  }, [modalFilteredComboKits, configuredKitMap, form.allowed_combo_kit_ids]);

  const alreadyConfiguredCount = useMemo(() => {
    return modalFilteredComboKits.filter((k) => {
      const kId = String(k.id || k._id);
      return Boolean(configuredKitMap[kId]) && !form.allowed_combo_kit_ids.includes(kId);
    }).length;
  }, [modalFilteredComboKits, configuredKitMap, form.allowed_combo_kit_ids]);

  const clearModalFilters = () => {
    setModalFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
    setKitSearchQuery("");
  };

  const toggleComboKit = (kitId) => {
    // If kit is already configured in another PO setting for this plan, block toggle
    if (configuredKitMap[kitId] && !form.allowed_combo_kit_ids.includes(kitId)) {
      dispatch(
        setAlert({
          type: "warning",
          message: "This product is already configured in another PO setting for this plan.",
        })
      );
      return;
    }

    setForm((prev) => {
      const exists = prev.allowed_combo_kit_ids.includes(kitId);
      return {
        ...prev,
        allowed_combo_kit_ids: exists
          ? prev.allowed_combo_kit_ids.filter((id) => id !== kitId)
          : [...prev.allowed_combo_kit_ids, kitId],
      };
    });
  };

  const toggleAllComboKits = () => {
    // Only target available unconfigured kits
    const targetIds = availableFilteredComboKits.map((k) => String(k.id || k._id));
    const allTargetSelected = targetIds.length > 0 && targetIds.every((id) => form.allowed_combo_kit_ids.includes(id));

    setForm((prev) => {
      if (allTargetSelected) {
        return {
          ...prev,
          allowed_combo_kit_ids: prev.allowed_combo_kit_ids.filter((id) => !targetIds.includes(id)),
        };
      } else {
        return {
          ...prev,
          allowed_combo_kit_ids: Array.from(new Set([...prev.allowed_combo_kit_ids, ...targetIds])),
        };
      }
    });
  };

  // ── Open Add / Edit Modal ───────────────────────────────────────────────────
  const openAdd = () => {
    if (!selectedPlan) return;
    setForm({
      ...EMPTY_FORM,
      effective_from: new Date().toISOString().slice(0, 10),
    });
    setEditingId(null);
    clearModalFilters();
    setShowModal(true);
  };

  const openEdit = (s) => {
    const projIds = (s.allowed_project_type_ids || []).map((pt) => pt?._id || pt?.id || String(pt));
    const kitIds = (s.allowed_combo_kit_ids || []).map((ck) => ck?._id || ck?.id || String(ck));
    const indIds = (s.allowed_industry_type_ids || []).map((ind) => ind?._id || ind?.id || String(ind));
    const catIds = (s.allowed_category_ids || []).map((cat) => cat?._id || cat?.id || String(cat));
    const subCatIds = (s.allowed_subcategory_ids || []).map((sub) => sub?._id || sub?.id || String(sub));

    setForm({
      po_enabled: Boolean(s.po_enabled),
      min_po_quantity: s.min_po_quantity ?? "1",
      max_po_quantity: s.max_po_quantity ?? "",
      po_validity_days: s.po_validity_days ?? "30",
      max_line_items: s.max_line_items ?? "50",
      allow_mixed_project_types: s.allow_mixed_project_types !== false,
      token_booking_enabled: s.token_booking_enabled !== false,
      token_type: s.token_type || "FIXED_AMOUNT",
      token_value: s.token_value != null ? String(s.token_value) : "50000",
      po_lock_days: s.po_lock_days != null ? String(s.po_lock_days) : String(s.po_validity_days || "30"),
      allowed_industry_type_ids: indIds,
      allowed_category_ids: catIds,
      allowed_subcategory_ids: subCatIds,
      allowed_project_type_ids: projIds,
      allowed_combo_kit_ids: kitIds,
      effective_from: s.effective_from?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      effective_until: s.effective_until?.slice(0, 10) || "",
    });
    setEditingId(s._id || s.id);
    clearModalFilters();
    setShowModal(true);
  };

  // ── Save Handler ────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSaving(true);
    try {
      const planId = selectedPlan.id || selectedPlan._id;

      // Extract industry types and categories from active filter or selected kits if needed
      let indIds = form.allowed_industry_type_ids;
      let catIds = form.allowed_category_ids;
      let subCatIds = form.allowed_subcategory_ids;

      if (modalFilters.industryType !== "all" && !indIds.includes(modalFilters.industryType)) {
        indIds = Array.from(new Set([...indIds, modalFilters.industryType]));
      }
      if (modalFilters.category !== "all" && !catIds.includes(modalFilters.category)) {
        catIds = Array.from(new Set([...catIds, modalFilters.category]));
      }
      if (modalFilters.subCategory !== "all" && !subCatIds.includes(modalFilters.subCategory)) {
        subCatIds = Array.from(new Set([...subCatIds, modalFilters.subCategory]));
      }

      const payload = {
        plan_id: planId,
        po_enabled: Boolean(form.po_enabled),
        min_po_quantity: Number(form.min_po_quantity),
        max_po_quantity: form.max_po_quantity ? Number(form.max_po_quantity) : null,
        po_validity_days: Number(form.po_validity_days),
        max_line_items: Number(form.max_line_items || 50),
        allow_mixed_project_types: Boolean(form.allow_mixed_project_types),
        token_booking_enabled: Boolean(form.token_booking_enabled),
        token_type: form.token_type || "FIXED_AMOUNT",
        token_value: Number(form.token_value) || 0,
        po_lock_days: Number(form.po_lock_days || form.po_validity_days || 30),
        requires_approval: true,
        payment_terms: "FULL_ADVANCE",
        contributes_to_monthly_target: true,
        allowed_industry_type_ids: indIds,
        allowed_category_ids: catIds,
        allowed_subcategory_ids: subCatIds,
        allowed_project_type_ids: form.allowed_project_type_ids,
        allowed_combo_kit_ids: form.allowed_combo_kit_ids,
        effective_from: form.effective_from,
        effective_until: form.effective_until || null,
      };

      if (editingId) {
        await apiFetch("put", "/update", { id: editingId, ...payload });
        dispatch(setAlert({ type: "success", message: "PO settings updated successfully." }));
      } else {
        await apiFetch("post", "/add", payload);
        dispatch(setAlert({ type: "success", message: "PO settings created successfully." }));
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save PO settings.",
        })
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Status ───────────────────────────────────────────────────────────
  const handleToggle = async (s) => {
    try {
      await apiFetch("put", "/toggle-status", { id: s._id || s.id, is_active: !s.is_active });
      dispatch(
        setAlert({
          type: "success",
          message: `PO setting ${!s.is_active ? "activated" : "deactivated"} successfully.`,
        })
      );
      fetchAll();
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to toggle status." }));
    }
  };

  // ── Delete Handler ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this PO setting?")) return;
    try {
      await apiFetch("delete", "/delete", { id });
      dispatch(setAlert({ type: "success", message: "PO setting deleted successfully." }));
      fetchAll();
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to delete PO setting." }));
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ══════════════════════════════════════════════════════════════════════════
          LEVEL 1: ALL FRANCHISE PLANS OVERVIEW (CARDS / TABLE VIEW)
          ══════════════════════════════════════════════════════════════════════════ */}
      {!selectedPlan ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FiSettings size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    Franchisee PO Order Settings
                  </h1>
                  <p className="text-text-muted text-sm mt-0.5">
                    Select a franchise plan to manage its purchase order rules, product authorizations, and quantity limits.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface border border-border p-4 rounded-2xl shadow-xs">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider block">
                Total Franchise Plans
              </span>
              <div className="text-2xl font-extrabold text-text-primary mt-1">
                {plans.length}
              </div>
            </div>
            <div className="bg-surface border border-border p-4 rounded-2xl shadow-xs">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider block">
                Configured PO Plans
              </span>
              <div className="text-2xl font-extrabold text-primary mt-1">
                {plans.filter((p) => (planSettingsMap[String(p.id || p._id)] || []).length > 0).length}
              </div>
            </div>
            <div className="bg-surface border border-border p-4 rounded-2xl shadow-xs">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider block">
                Total PO Rules
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {settings.length}
              </div>
            </div>
            <div className="bg-surface border border-border p-4 rounded-2xl shadow-xs">
              <span className="text-text-muted text-xs font-bold uppercase tracking-wider block">
                Available Combo Kits
              </span>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {configOptions.combo_kits?.length || 0}
              </div>
            </div>
          </div>

          {/* Filter and Search Bar for Level 1 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
              <input
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search franchise plan by name or territory..."
                value={searchPlan}
                onChange={(e) => setSearchPlan(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Territory Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { value: "all", label: "All Territories" },
                  { value: "district", label: "District" },
                  { value: "state", label: "State" },
                  { value: "country", label: "Country" },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTerritoryFilter(t.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      territoryFilter === t.value
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface-hover/80 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* View Switcher: Card View vs Table View */}
              <div className="flex items-center bg-bg p-1 rounded-xl border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setPlanOverviewViewMode("card")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    planOverviewViewMode === "card"
                      ? "bg-surface text-primary shadow-xs border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Card View"
                >
                  <FiGrid size={14} />
                  <span>Card View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanOverviewViewMode("table")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    planOverviewViewMode === "table"
                      ? "bg-surface text-primary shadow-xs border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Table View"
                >
                  <FiList size={14} />
                  <span>Table View</span>
                </button>
              </div>
            </div>
          </div>

          {/* Franchise Plans Presentation (Card View / Table View) */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <FiLoader className="animate-spin text-primary" size={36} />
              <p className="text-text-muted text-sm font-medium">Loading franchise plans & PO rules...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-16 bg-surface/50 rounded-2xl border border-dashed border-border p-8">
              <FiPackage className="mx-auto text-text-muted mb-3" size={32} />
              <h3 className="text-base font-bold text-text-primary">No Franchise Plans Found</h3>
              <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
                No plans matched your filter criteria. Try resetting the search or territory filter.
              </p>
            </div>
          ) : planOverviewViewMode === "table" ? (
            /* 1. LEVEL 1 TABLE VIEW */
            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover/70 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Franchise Plan Name</th>
                      <th className="px-4 py-3.5">Territory Level</th>
                      <th className="px-4 py-3.5">Plan Fee</th>
                      <th className="px-4 py-3.5">Validity</th>
                      <th className="px-4 py-3.5">PO Settings Configured</th>
                      <th className="px-4 py-3.5 text-center">PO Ordering</th>
                      <th className="px-4 py-3.5 text-center">Plan Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPlans.map((plan) => {
                      const planId = String(plan.id || plan._id);
                      const planSettings = planSettingsMap[planId] || [];
                      const poCount = planSettings.length;
                      const activeCount = planSettings.filter((s) => s.is_active).length;
                      const poEnabled = planSettings.some((s) => s.po_enabled && s.is_active);

                      return (
                        <tr
                          key={planId}
                          onClick={() => setSelectedPlan(plan)}
                          className="hover:bg-surface-hover/40 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                              <FiBox className="text-primary" /> {plan.name}
                            </div>
                            {plan.slug && (
                              <span className="text-[11px] text-text-muted font-mono">#{plan.slug}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <TerritoryLevelBadge level={plan.territory_level} />
                          </td>
                          <td className="px-4 py-3.5 font-bold text-text-primary whitespace-nowrap">
                            {plan.one_time_fee
                              ? `₹${Number(plan.one_time_fee).toLocaleString("en-IN")}`
                              : "Free"}
                          </td>
                          <td className="px-4 py-3.5 text-text-secondary capitalize whitespace-nowrap">
                            {plan.validity_value
                              ? `${plan.validity_value} ${plan.validity_unit || "Months"}`
                              : "Lifetime"}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {poCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <FiCheckCircle size={12} /> {poCount} Setting{poCount > 1 ? "s" : ""} ({activeCount} Active)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <FiAlertTriangle size={12} /> Not Configured
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                poEnabled
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-surface-hover text-text-muted"
                              }`}
                            >
                              {poEnabled ? <FiCheck size={11} /> : <FiX size={11} />}
                              {poEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                plan.is_active !== false
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-surface-hover text-text-muted"
                              }`}
                            >
                              {plan.is_active !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlan(plan);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover transition-all cursor-pointer shadow-xs"
                            >
                              <FiSettings size={13} />
                              <span>Manage PO Settings</span>
                              <FiChevronRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 2. LEVEL 1 CARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredPlans.map((plan) => {
                const planId = String(plan.id || plan._id);
                const planSettings = planSettingsMap[planId] || [];
                const poCount = planSettings.length;
                const activeCount = planSettings.filter((s) => s.is_active).length;
                const poEnabled = planSettings.some((s) => s.po_enabled && s.is_active);

                return (
                  <motion.div
                    key={planId}
                    whileHover={{ y: -3, transition: { duration: 0.15 } }}
                    onClick={() => setSelectedPlan(plan)}
                    className="group relative bg-surface rounded-2xl border-2 border-border hover:border-primary/50 shadow-xs hover:shadow-lg transition-all p-5 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <TerritoryLevelBadge level={plan.territory_level} />
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            plan.is_active !== false
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-surface-hover text-text-muted"
                          }`}
                        >
                          {plan.is_active !== false ? "Active Plan" : "Inactive"}
                        </span>
                      </div>

                      {/* Plan Name & Territory */}
                      <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>{plan.name}</span>
                        <FiChevronRight
                          size={18}
                          className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all"
                        />
                      </h3>
                      {plan.slug && (
                        <p className="text-xs text-text-muted font-mono mt-0.5">#{plan.slug}</p>
                      )}

                      {/* PO Settings Counter Badge */}
                      <div className="mt-4 mb-4">
                        {poCount > 0 ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                            <FiCheckCircle size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              {poCount} PO Setting{poCount > 1 ? "s" : ""} Configured ({activeCount} Active)
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                            <FiAlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>No PO Settings Configured</span>
                          </div>
                        )}
                      </div>

                      {/* Plan Commercial Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-3 border-t border-b border-border bg-bg/50 rounded-xl p-3 mb-4">
                        <div>
                          <span className="text-text-muted text-[10px] uppercase font-bold block">
                            One-Time Fee
                          </span>
                          <span className="font-bold text-text-primary text-sm mt-0.5 block">
                            {plan.one_time_fee
                              ? `₹${Number(plan.one_time_fee).toLocaleString("en-IN")}`
                              : "Free"}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted text-[10px] uppercase font-bold block">
                            Plan Validity
                          </span>
                          <span className="font-bold text-text-primary text-sm mt-0.5 block capitalize">
                            {plan.validity_value
                              ? `${plan.validity_value} ${plan.validity_unit || "Months"}`
                              : "Lifetime"}
                          </span>
                        </div>
                      </div>

                      {/* Summary of PO Configuration under this plan */}
                      {poCount > 0 && (
                        <div className="space-y-1.5 text-xs text-text-secondary mb-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted flex items-center gap-1">
                              <FiClock size={11} /> PO Ordering Status:
                            </span>
                            <span className={`font-bold ${poEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-text-muted"}`}>
                              {poEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted flex items-center gap-1">
                              <FiBox size={11} /> Configured Kit Scope:
                            </span>
                            <span className="font-semibold text-text-primary">
                              {planSettings.reduce(
                                (acc, curr) => acc + (curr.allowed_combo_kit_ids?.length || 0),
                                0
                              )}{" "}
                              Kits Mapped
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-surface-hover group-hover:bg-primary group-hover:text-white text-text-primary border border-border group-hover:border-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FiSettings size={14} />
                        <span>Manage Plan PO Settings</span>
                        <FiChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════════
           LEVEL 2: SELECTED PLAN'S PO SETTINGS MANAGEMENT (CARD / TABLE VIEW)
           ══════════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Top Breadcrumb Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface border border-border transition-all cursor-pointer"
            >
              <FiArrowLeft size={16} />
              <span>Back to All Franchise Plans</span>
            </button>

            <span className="text-xs text-text-muted hidden sm:inline-block">
              Franchise Management &gt; PO Order Settings &gt;{" "}
              <strong className="text-text-primary">{selectedPlan.name}</strong>
            </span>
          </div>

          {/* Active Plan Context Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-surface border-2 border-primary/30 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <TerritoryLevelBadge level={selectedPlan.territory_level} />
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    Active Plan View
                  </span>
                  {selectedPlan.is_active !== false && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
                  <FiBox className="text-primary" /> {selectedPlan.name}
                </h1>
                <p className="text-text-muted text-xs sm:text-sm max-w-2xl">
                  Configure product-level PO quantity thresholds, validity windows, and eligible combo kits for franchisees on this plan.
                </p>
              </div>

              {/* Action Button inside Plan */}
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  id="add-plan-po-setting-btn"
                  onClick={openAdd}
                  leftIcon={<FiPlus size={16} />}
                  variant="primary"
                  className="shadow-md"
                >
                  Add PO Setting for this Plan
                </Button>
              </div>
            </div>

            {/* Quick Stats for this Plan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border/80">
              <div className="bg-bg/60 p-3 rounded-xl border border-border">
                <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">
                  Configured PO Rules
                </span>
                <p className="text-lg font-bold text-text-primary mt-0.5">
                  {activePlanSettings.length} Settings
                </p>
              </div>
              <div className="bg-bg/60 p-3 rounded-xl border border-border">
                <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">
                  Active PO Rules
                </span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {activePlanSettings.filter((s) => s.is_active).length} Active
                </p>
              </div>
              <div className="bg-bg/60 p-3 rounded-xl border border-border">
                <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">
                  Plan Fee
                </span>
                <p className="text-lg font-bold text-text-primary mt-0.5">
                  {selectedPlan.one_time_fee
                    ? `₹${Number(selectedPlan.one_time_fee).toLocaleString("en-IN")}`
                    : "Free"}
                </p>
              </div>
              <div className="bg-bg/60 p-3 rounded-xl border border-border">
                <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">
                  Plan Validity
                </span>
                <p className="text-lg font-bold text-text-primary mt-0.5 capitalize">
                  {selectedPlan.validity_value
                    ? `${selectedPlan.validity_value} ${selectedPlan.validity_unit || "Months"}`
                    : "Lifetime"}
                </p>
              </div>
            </div>
          </div>

          {/* Search, Filters and View Type Bar for Level 2 */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border">
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
              <input
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search by product, kit or industry..."
                value={searchSetting}
                onChange={(e) => setSearchSetting(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Industry Filter Dropdown */}
              <select
                className="px-3 py-2 rounded-xl border border-border bg-bg text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
              >
                <option value="all">All Industry Types</option>
                {(configOptions.industry_types || []).map((ind) => (
                  <option key={ind.id || ind._id} value={ind.id || ind._id}>
                    {ind.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="px-3 py-2 rounded-xl border border-border bg-bg text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              {/* View Switcher: Card View vs Table View */}
              <div className="flex items-center bg-bg p-1 rounded-xl border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setPlanPoViewMode("card")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    planPoViewMode === "card"
                      ? "bg-surface text-primary shadow-xs border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Card View"
                >
                  <FiGrid size={14} />
                  <span>Card View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanPoViewMode("table")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    planPoViewMode === "table"
                      ? "bg-surface text-primary shadow-xs border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  title="Table View"
                >
                  <FiList size={14} />
                  <span>Table View</span>
                </button>
              </div>
            </div>
          </div>

          {/* PO Settings Presentation (Card View / Table View) */}
          {filteredActivePlanSettings.length === 0 ? (
            <div className="text-center py-16 bg-surface/50 rounded-2xl border border-dashed border-border p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                <FiFileText size={28} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                No PO Settings Configured for {selectedPlan.name}
              </h3>
              <p className="text-text-muted text-xs mt-1 max-w-md mx-auto">
                {activePlanSettings.length === 0
                  ? "Define PO limits and allowed combo kits for this plan by clicking the button below."
                  : "No settings match your current search/filter."}
              </p>
              {activePlanSettings.length === 0 && (
                <Button onClick={openAdd} leftIcon={<FiPlus />} variant="primary" className="mt-4">
                  Configure First PO Setting
                </Button>
              )}
            </div>
          ) : planPoViewMode === "table" ? (
            /* 1. LEVEL 2 TABLE VIEW */
            <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover/70 border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Target Scope & Products</th>
                      <th className="px-4 py-3.5">PO Ordering</th>
                      <th className="px-4 py-3.5 text-center">Min PO Qty</th>
                      <th className="px-4 py-3.5 text-center">Max PO Qty</th>
                      <th className="px-4 py-3.5 text-center">PO Expiry</th>
                      <th className="px-4 py-3.5 text-center">Max Line Items</th>
                      <th className="px-4 py-3.5">Validity Range</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredActivePlanSettings.map((s, idx) => {
                      const settingId = s._id || s.id || idx;
                      const kits = s.allowed_combo_kit_ids || [];
                      const industries = s.allowed_industry_type_ids || [];
                      const categories = s.allowed_category_ids || [];

                      return (
                        <tr
                          key={settingId}
                          className="hover:bg-surface-hover/40 transition-colors"
                        >
                          {/* Target Scope & Products */}
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {industries.length > 0 ? (
                                  industries.map((ind) => (
                                    <span
                                      key={ind._id || ind.id || ind}
                                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                                    >
                                      🏢 {ind.name || "Industry"}
                                    </span>
                                  ))
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-hover text-text-muted border border-border">
                                    All Industries
                                  </span>
                                )}

                                {categories.length > 0 &&
                                  categories.map((cat) => (
                                    <span
                                      key={cat._id || cat.id || cat}
                                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-hover text-text-secondary border border-border"
                                    >
                                      {cat.name || "Category"}
                                    </span>
                                  ))}
                              </div>

                              <div className="text-[11px] text-text-primary font-medium">
                                {kits.length === 0 ? (
                                  <span className="text-text-muted italic">All Plan Kits in Scope</span>
                                ) : (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-bold text-primary">{kits.length} Kits Mapped:</span>
                                    <span
                                      className="text-text-secondary truncate max-w-[220px]"
                                      title={kits.map((k) => k.name || k.kit_code).join(", ")}
                                    >
                                      {kits.map((k) => k.name || k.kit_code).join(", ")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* PO Enabled Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                s.po_enabled
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {s.po_enabled ? <FiCheck size={11} /> : <FiX size={11} />}
                              {s.po_enabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>

                          {/* Min PO Qty */}
                          <td className="px-4 py-3.5 text-center font-bold text-text-primary whitespace-nowrap">
                            {s.min_po_quantity || 1} kits
                          </td>

                          {/* Max PO Qty */}
                          <td className="px-4 py-3.5 text-center font-bold text-text-primary whitespace-nowrap">
                            {s.max_po_quantity ? (
                              `${s.max_po_quantity} kits`
                            ) : (
                              <span className="text-text-muted font-normal">Unlimited</span>
                            )}
                          </td>

                          {/* PO Expiry Window */}
                          <td className="px-4 py-3.5 text-center font-bold text-primary whitespace-nowrap">
                            {s.po_validity_days != null ? `${s.po_validity_days} Days` : "30 Days"}
                          </td>

                          {/* Max Line Items */}
                          <td className="px-4 py-3.5 text-center font-bold text-text-primary whitespace-nowrap">
                            {s.max_line_items || 50} Items
                          </td>

                          {/* Validity Range */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-text-secondary text-[11px]">
                            <div className="font-semibold text-text-primary">
                              {s.effective_from
                                ? new Date(s.effective_from).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {s.effective_until
                                ? `to ${new Date(s.effective_until).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}`
                                : "Open-ended"}
                            </div>
                          </td>

                          {/* Rule Status */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.is_active
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-surface-hover text-text-muted"
                              }`}
                            >
                              {s.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(s)}
                                title="Edit this PO Setting"
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                              >
                                <FiEdit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggle(s)}
                                title={s.is_active ? "Deactivate" : "Activate"}
                                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                              >
                                {s.is_active ? (
                                  <FiToggleRight size={22} className="text-emerald-600" />
                                ) : (
                                  <FiToggleLeft size={22} className="text-text-muted" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(s._id || s.id)}
                                title="Delete"
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors cursor-pointer"
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 2. LEVEL 2 CARD VIEW (GRID) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredActivePlanSettings.map((s, idx) => {
                const settingId = s._id || s.id || idx;
                const kits = s.allowed_combo_kit_ids || [];
                const industries = s.allowed_industry_type_ids || [];
                const categories = s.allowed_category_ids || [];

                return (
                  <motion.div
                    key={settingId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border-2 p-5 space-y-4 transition-all flex flex-col justify-between ${
                      s.is_active
                        ? "border-primary/25 bg-surface shadow-xs hover:shadow-md"
                        : "border-border bg-surface-hover/40 opacity-75"
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Row: Scope & Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                s.po_enabled
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {s.po_enabled ? <FiCheck size={11} /> : <FiX size={11} />}
                              {s.po_enabled ? "PO Enabled" : "PO Disabled"}
                            </span>

                            {industries.length > 0 ? (
                              industries.map((ind) => (
                                <span
                                  key={ind._id || ind.id || ind}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                                >
                                  🏢 {ind.name || "Industry"}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-hover text-text-muted border border-border">
                                All Industry Types
                              </span>
                            )}

                            {categories.length > 0 && categories.map((cat) => (
                              <span
                                key={cat._id || cat.id || cat}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-surface-hover text-text-secondary border border-border"
                              >
                                {cat.name || "Category"}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Card Action Icons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            title="Edit this PO Setting"
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggle(s)}
                            title={s.is_active ? "Deactivate" : "Activate"}
                            className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                          >
                            {s.is_active ? (
                              <FiToggleRight size={22} className="text-emerald-600" />
                            ) : (
                              <FiToggleLeft size={22} className="text-text-muted" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s._id || s.id)}
                            title="Delete"
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors cursor-pointer"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Target Products / Kits Covered */}
                      <div className="p-3 bg-bg rounded-xl border border-border/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                            <FiBox size={12} className="text-primary" /> Target Combo Kits / Products
                          </span>
                          <span className="font-bold text-primary text-[11px]">
                            {kits.length === 0 ? "All Plan Kits" : `${kits.length} Kits Selected`}
                          </span>
                        </div>

                        {kits.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                            {kits.map((k) => (
                              <span
                                key={k._id || k.id || k}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface border border-border text-text-primary truncate max-w-[200px]"
                                title={k.name || k.kit_code}
                              >
                                {k.name || k.kit_code || "Combo Kit"}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-text-secondary font-medium">
                            Applies to all combo kits & products authorized under this plan.
                          </p>
                        )}
                      </div>

                      {/* Key Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                        <div className="p-2.5 bg-surface-hover/50 rounded-xl border border-border/60">
                          <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">
                            Min PO Qty
                          </p>
                          <p className="font-bold text-text-primary text-sm mt-0.5">
                            {s.min_po_quantity || 1} kits
                          </p>
                        </div>
                        <div className="p-2.5 bg-surface-hover/50 rounded-xl border border-border/60">
                          <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">
                            Max PO Qty
                          </p>
                          <p className="font-bold text-text-primary text-sm mt-0.5">
                            {s.max_po_quantity ? `${s.max_po_quantity} kits` : "Unlimited"}
                          </p>
                        </div>
                        <div className="p-2.5 bg-surface-hover/50 rounded-xl border border-border/60">
                          <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">
                            PO Expiry Window
                          </p>
                          <p className="font-bold text-primary text-sm mt-0.5">
                            {s.po_validity_days != null ? s.po_validity_days : 30} Days
                          </p>
                        </div>
                        <div className="p-2.5 bg-surface-hover/50 rounded-xl border border-border/60">
                          <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">
                            Max Line Items
                          </p>
                          <p className="font-bold text-text-primary text-sm mt-0.5">
                            {s.max_line_items || 50} Items
                          </p>
                        </div>
                      </div>

                      {/* Token Amount Booking Summary Strip */}
                      <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <FiDollarSign size={13} className="text-emerald-600" />
                          Token Booking:
                        </span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-xs">
                          {s.token_booking_enabled !== false
                            ? s.token_type === "PERCENTAGE"
                              ? `${s.token_value || 10}% of PO Value`
                              : `₹${Number(s.token_value || 50000).toLocaleString("en-IN")} Flat`
                            : "Disabled (100% Advance)"}
                        </span>
                      </div>
                    </div>

                    {/* Active Date Range */}
                    <div className="text-[11px] text-text-secondary border-t border-border pt-3 flex items-center justify-between">
                      <span className="text-text-muted font-medium flex items-center gap-1">
                        <FiCalendar size={12} /> Validity:
                      </span>
                      <span className="font-semibold text-text-primary">
                        {s.effective_from
                          ? new Date(s.effective_from).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                        {s.effective_until
                          ? ` → ${new Date(s.effective_until).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}`
                          : " → Open-ended"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT PO SETTING FOR SELECTED PLAN
          ══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && selectedPlan && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl border border-border overflow-hidden flex flex-col max-h-[92vh]"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-border bg-surface shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                      <FiFileText className="text-primary" />
                      {editingId ? "Edit PO Setting" : "Add PO Setting"}
                    </h2>
                    <TerritoryLevelBadge level={selectedPlan.territory_level} />
                  </div>
                  <p className="text-xs text-text-muted">
                    Configuring purchase order limits and products for{" "}
                    <strong className="text-text-primary">{selectedPlan.name}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* 1. Locked Plan Info Banner */}
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FiBox size={16} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                        Target Franchisee Plan (Locked)
                      </span>
                      <span className="font-bold text-text-primary text-sm">
                        {selectedPlan.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-text-muted italic">
                    Plan is automatically locked to active selection
                  </span>
                </div>

                {/* 2. Enable PO Ordering Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-hover/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <FiFileText size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-text-primary text-sm block">
                        Enable PO Ordering for this Rule
                      </span>
                      <p className="text-xs text-text-muted">
                        Allow franchisees on this plan to place purchase orders for the configured products
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, po_enabled: !form.po_enabled })}
                    className="focus:outline-none cursor-pointer transition-transform active:scale-95"
                  >
                    {form.po_enabled ? (
                      <FiToggleRight size={32} className="text-emerald-600" />
                    ) : (
                      <FiToggleLeft size={32} className="text-text-muted" />
                    )}
                  </button>
                </div>

                {/* 3. Product & Industry Cascading Filters */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="p-4 bg-surface-hover/40 rounded-2xl border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiFilter className="text-primary" size={15} />
                        <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                          Filter Products by Industry / Category
                        </h4>
                        {isModalFilterActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                            Filtered ({modalFilteredComboKits.length} matching kits)
                          </span>
                        )}
                      </div>
                      {isModalFilterActive && (
                        <button
                          type="button"
                          onClick={clearModalFilters}
                          className="text-xs text-primary font-bold hover:underline cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>

                    {/* 5 Cascading Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      <Dropdown
                        label="Industry Type"
                        options={modalIndustryOptions}
                        value={modalFilters.industryType}
                        onChange={(val) =>
                          setModalFilters((prev) => ({
                            ...prev,
                            industryType: val,
                            category: "all",
                            subCategory: "all",
                            systemType: "all",
                            projectRange: "all",
                          }))
                        }
                        className="w-full"
                      />
                      <Dropdown
                        label="Category"
                        options={modalCategoryOptions}
                        value={modalFilters.category}
                        disabled={modalFilters.industryType === "all" && modalCategoryOptions.length <= 1}
                        onChange={(val) =>
                          setModalFilters((prev) => ({
                            ...prev,
                            category: val,
                            subCategory: "all",
                            systemType: "all",
                            projectRange: "all",
                          }))
                        }
                        className="w-full"
                      />
                      <Dropdown
                        label="Sub Category"
                        options={modalSubCategoryOptions}
                        value={modalFilters.subCategory}
                        disabled={modalFilters.category === "all"}
                        onChange={(val) =>
                          setModalFilters((prev) => ({
                            ...prev,
                            subCategory: val,
                            systemType: "all",
                            projectRange: "all",
                          }))
                        }
                        className="w-full"
                      />
                      <Dropdown
                        label="System Type"
                        options={modalSystemTypeOptions}
                        value={modalFilters.systemType}
                        disabled={modalFilters.subCategory === "all"}
                        onChange={(val) =>
                          setModalFilters((prev) => ({
                            ...prev,
                            systemType: val,
                            projectRange: "all",
                          }))
                        }
                        className="w-full"
                      />
                      <Dropdown
                        label="Project Range"
                        options={modalProjectRangeOptions}
                        value={modalFilters.projectRange}
                        disabled={modalFilters.systemType === "all"}
                        onChange={(val) =>
                          setModalFilters((prev) => ({
                            ...prev,
                            projectRange: val,
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Combo Kits Selection Grid */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <FiBox size={14} /> Select Target Combo Kits / Products
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {form.allowed_combo_kit_ids.length === 0
                            ? "All Available in Scope"
                            : `${form.allowed_combo_kit_ids.length} Selected`}
                        </span>
                        {alreadyConfiguredCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {alreadyConfiguredCount} already configured in this plan
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Search input inside kits */}
                        <div className="relative">
                          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={12} />
                          <input
                            type="text"
                            placeholder="Filter kits..."
                            value={kitSearchQuery}
                            onChange={(e) => setKitSearchQuery(e.target.value)}
                            className="pl-7 pr-3 py-1 rounded-lg border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44"
                          />
                        </div>

                        {availableFilteredComboKits.length > 0 && (
                          <button
                            type="button"
                            onClick={toggleAllComboKits}
                            className="text-[11px] text-primary font-bold hover:underline cursor-pointer whitespace-nowrap"
                          >
                            {availableFilteredComboKits.every((k) =>
                              form.allowed_combo_kit_ids.includes(String(k.id || k._id))
                            )
                              ? "Deselect All Available"
                              : "Select All Available"}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-text-muted">
                      Select specific combo kits for this PO rule. Products already configured in other PO settings for this plan are locked to prevent duplicate conflict:
                    </p>

                    {modalFilteredComboKits.length === 0 ? (
                      <div className="py-6 text-center text-xs text-text-muted bg-surface-hover/30 rounded-xl border border-dashed border-border p-4">
                        <p className="font-medium">
                          {configOptions.combo_kits?.length === 0
                            ? "No combo kits found in the system."
                            : "No combo kits match the selected filters."}
                        </p>
                        {(isModalFilterActive || kitSearchQuery) && (
                          <button
                            type="button"
                            onClick={clearModalFilters}
                            className="mt-2 text-primary font-bold hover:underline cursor-pointer text-xs"
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    ) : availableFilteredComboKits.length === 0 && modalFilteredComboKits.length > 0 ? (
                      <div className="py-6 text-center text-xs bg-amber-500/5 rounded-xl border border-amber-500/20 p-4 space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                          <FiLock size={15} /> All matching products are already configured in this plan!
                        </div>
                        <p className="text-text-muted text-[11px] max-w-md mx-auto">
                          Every product in this category already has an active PO setting under {selectedPlan.name}. To modify its settings, edit the existing setting from the grid view.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                        {modalFilteredComboKits.map((kit) => {
                          const kitId = String(kit.id || kit._id);
                          const isAlreadyConfigured = Boolean(configuredKitMap[kitId]) && !form.allowed_combo_kit_ids.includes(kitId);
                          const isSelected = form.allowed_combo_kit_ids.includes(kitId);

                          return (
                            <button
                              key={kitId}
                              type="button"
                              disabled={isAlreadyConfigured}
                              onClick={() => toggleComboKit(kitId)}
                              className={`p-2.5 rounded-xl text-left border text-xs transition-all flex items-center justify-between gap-2 ${
                                isAlreadyConfigured
                                  ? "bg-surface-hover/50 border-border/50 opacity-60 cursor-not-allowed text-text-muted"
                                  : isSelected
                                  ? "bg-sky-50 dark:bg-sky-950/40 border-primary text-primary ring-1 ring-primary/40 cursor-pointer"
                                  : "bg-surface border-border text-text-secondary hover:border-primary/40 hover:bg-surface-hover cursor-pointer"
                              }`}
                            >
                              <div className="truncate flex-1">
                                <div className="font-bold truncate flex items-center gap-1">
                                  <span>{kit.name || kit.kit_code}</span>
                                  {isAlreadyConfigured && (
                                    <span title="Already configured in another PO setting for this plan">
                                      <FiLock size={11} className="text-amber-500 shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5 truncate">
                                  <span>{kit.capacity_kw ? `${kit.capacity_kw} kW` : "Standard"}</span>
                                  {kit.category_name && <span>• {kit.category_name}</span>}
                                  {isAlreadyConfigured && (
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold">• Configured</span>
                                  )}
                                </div>
                              </div>
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                  isAlreadyConfigured
                                    ? "bg-surface-hover border-border text-text-muted"
                                    : isSelected
                                    ? "bg-primary text-white border-primary"
                                    : "border-border bg-bg"
                                }`}
                              >
                                {isSelected ? (
                                  <FiCheck size={11} />
                                ) : isAlreadyConfigured ? (
                                  <FiLock size={9} />
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. PO Order Quantity Limits & Expiry */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                    <FiSliders size={14} className="text-primary" /> PO Quantity Limits & Validity
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1.5 block">
                        Min PO Quantity *
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                        value={form.min_po_quantity}
                        onChange={(e) => setForm({ ...form, min_po_quantity: e.target.value })}
                        placeholder="e.g. 1"
                      />
                      <p className="text-[11px] text-text-muted mt-1">Minimum kits required in one PO</p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1.5 block">
                        Max PO Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                        value={form.max_po_quantity}
                        onChange={(e) => setForm({ ...form, max_po_quantity: e.target.value })}
                        placeholder="Empty = Unlimited"
                      />
                      <p className="text-[11px] text-text-muted mt-1">Leave empty for unlimited</p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1.5 block">
                        PO Expiry Window (Days) *
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="365"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                        value={form.po_validity_days}
                        onChange={(e) => setForm({ ...form, po_validity_days: e.target.value })}
                        placeholder="e.g. 30"
                      />
                      <p className="text-[11px] text-text-muted mt-1">Validity before PO expires</p>
                    </div>
                  </div>
                </div>

                {/* 4.5 PO Token Amount & Price Lock Setting */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <FiDollarSign size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                          PO Token Amount Booking Setting
                        </h4>
                        <p className="text-[11px] text-text-muted">
                          Decide how token amount is charged when franchise books a PO order
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer bg-surface border border-border px-3 py-1.5 rounded-xl hover:bg-surface-hover">
                      <input
                        type="checkbox"
                        checked={form.token_booking_enabled}
                        onChange={(e) => setForm({ ...form, token_booking_enabled: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-border cursor-pointer"
                      />
                      <span className="text-xs font-bold text-text-secondary">
                        {form.token_booking_enabled ? "Token Booking Active" : "Disabled (Full Payment Required)"}
                      </span>
                    </label>
                  </div>

                  {form.token_booking_enabled && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2 block">
                          Token Decision Mode (Fixed vs Percentage) *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, token_type: "FIXED_AMOUNT" })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                              form.token_type === "FIXED_AMOUNT"
                                ? "bg-white dark:bg-slate-800 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30"
                                : "bg-surface/50 border-border opacity-70 hover:opacity-100"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              form.token_type === "FIXED_AMOUNT" ? "border-emerald-600 bg-emerald-600" : "border-border"
                            }`}>
                              {form.token_type === "FIXED_AMOUNT" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-text-primary">Fixed Amount (₹)</div>
                              <div className="text-[10px] text-text-muted">Flat booking amount per PO</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setForm({ ...form, token_type: "PERCENTAGE" })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                              form.token_type === "PERCENTAGE"
                                ? "bg-white dark:bg-slate-800 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30"
                                : "bg-surface/50 border-border opacity-70 hover:opacity-100"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              form.token_type === "PERCENTAGE" ? "border-emerald-600 bg-emerald-600" : "border-border"
                            }`}>
                              {form.token_type === "PERCENTAGE" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-text-primary">Percentage (%)</div>
                              <div className="text-[10px] text-text-muted">% of total PO order value</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1.5 block">
                            {form.token_type === "FIXED_AMOUNT" ? "Fixed Token Amount (₹) *" : "Token Percentage (%) *"}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">
                              {form.token_type === "FIXED_AMOUNT" ? "₹" : "%"}
                            </span>
                            <input
                              required
                              type="number"
                              min="1"
                              className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-bold"
                              value={form.token_value}
                              onChange={(e) => setForm({ ...form, token_value: e.target.value })}
                              placeholder={form.token_type === "FIXED_AMOUNT" ? "50000" : "10"}
                            />
                          </div>
                          <p className="text-[10px] text-text-muted mt-1">
                            {form.token_type === "FIXED_AMOUNT"
                              ? "Franchise will pay this flat amount to book and lock their PO"
                              : "Franchise pays this percentage of order value as token"}
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1.5 block">
                            PO Price & Quota Lock Period (Days) *
                          </label>
                          <input
                            required
                            type="number"
                            min="1"
                            max="365"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-bold"
                            value={form.po_lock_days}
                            onChange={(e) => {
                              setForm({ ...form, po_lock_days: e.target.value, po_validity_days: e.target.value });
                            }}
                            placeholder="30"
                          />
                          <p className="text-[10px] text-text-muted mt-1">
                            Duration for which the kits & prices remain locked (e.g. 30 days / 1 month)
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 p-3 rounded-xl flex items-start gap-2 border border-emerald-500/20">
                        <FiCheckCircle size={15} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <strong>Token Amount Auto-Adjustment Rule:</strong>
                          <p className="mt-0.5">
                            Franchise pays this token amount to book the PO. As loose quantity orders are placed, kits are deducted from the PO quota. The token amount is held and <strong>automatically adjusted on the franchise&apos;s final loose delivery order</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Rule Effective Date Range */}
                <div className="rounded-xl border border-border bg-surface-hover/40 p-4 space-y-2.5">
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                    <FiCalendar size={13} className="text-primary" /> Rule Effective Date Range
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted mb-1 block">
                        Effective From *
                      </label>
                      <input
                        required
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                        value={form.effective_from}
                        onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-text-muted mb-1 block">
                        Effective Until (Optional)
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                        value={form.effective_until}
                        onChange={(e) => setForm({ ...form, effective_until: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted">
                    Specify the validity dates for this purchase order rule.
                  </p>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border shrink-0">
                  <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving || (form.allowed_combo_kit_ids.length === 0 && availableFilteredComboKits.length === 0 && modalFilteredComboKits.length > 0)}
                    leftIcon={saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                  >
                    {saving ? "Saving…" : editingId ? "Update Setting" : "Save Setting"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
