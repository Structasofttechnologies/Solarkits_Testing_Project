import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiSettings,
  FiSliders,
  FiLayers,
  FiPercent,
  FiPackage,
  FiBox,
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiLoader,
  FiArrowLeft,
  FiMapPin,
  FiMap,
  FiGlobe,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiGrid,
  FiList,
  FiFilter,
  FiZap,
  FiDollarSign,
  FiFileText,
  FiTruck,
  FiHome,
  FiShield,
  FiChevronRight,
  FiInfo,
  FiTarget,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "FPO_SETTINGS";

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

  const CONFIG = {
    loose_order: { label: "Loose Order", icon: FiTruck, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    combine_po_order: { label: "Combine PO", icon: FiUsers, color: "bg-purple-50 text-purple-700 border-purple-200" },
    po_order: { label: "PO Order", icon: FiFileText, color: "bg-amber-50 text-amber-700 border-amber-200" },
  };

  const matched = types.map((t) => CONFIG[t]).filter(Boolean);
  if (matched.length === 0) matched.push(CONFIG.po_order);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {matched.map((cfg, i) => {
        const Icon = cfg.icon;
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${cfg.color}`}
          >
            <Icon size={10} /> {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

export default function FranchiseeSettings() {
  const dispatch = useDispatch();

  // Core Data
  const [plans, setPlans] = useState([]);
  const [moqRules, setMoqRules] = useState([]);
  const [poSettings, setPoSettings] = useState([]);
  const [kitTargets, setKitTargets] = useState([]);
  const [configOptions, setConfigOptions] = useState({ combo_kits: [], categories: [] });
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("moq"); // 'moq' | 'po' | 'target' | 'contract'

  // ── PO Order Contract State ──
  const [contractData, setContractData] = useState({
    is_contract_required: true,
    contract_title: "SolarKits EPC Purchase Order & Supply Commitment Agreement",
    contract_version: "1.0",
    validity_days: 30,
    require_mobile_otp: true,
    terms_introduction: "This Purchase Order Contract is entered into between the Authorized SolarKits Franchise Partner and the Assigned Solar EPC Contractor for supply commitment and token deposit under the terms set forth below.",
    clauses: [
      {
        title: "1. Scope of Supply & Quantity Commitment",
        body: "The Solar EPC Contractor agrees to procure, lift, and take delivery of the committed quantity of {{quantity}} SolarKits combo kit(s) under Purchase Order {{po_number}}. The Franchise Partner agrees to supply and allocate the agreed specifications strictly in accordance with SolarKits standards.",
        is_mandatory: true
      },
      {
        title: "2. Token Commitment Deposit",
        body: "The EPC Contractor agrees to pay a mandatory token commitment deposit of ₹{{token_amount}} to secure and lock the inventory. This deposit shall be verified and credited against final purchase invoices or pro-rata dispatches as per plan policy.",
        is_mandatory: true
      },
      {
        title: "3. Order Lock-in & Validity Period",
        body: "This Purchase Order commitment and inventory reservation shall remain firm and valid for a period of {{validity_days}} calendar days from the date of contract execution. Committed kit prices are protected during this validity window.",
        is_mandatory: true
      },
      {
        title: "4. Penalty for Unpurchased Kits & Forfeiture",
        body: "In the event that the EPC Contractor fails to lift the committed kits within {{validity_days}} days, the Franchise Partner and SolarKits reserve the right to apply unpurchased kit penalties or adjust the token deposit as per plan rules.",
        is_mandatory: true
      },
      {
        title: "5. Dispatch, Logistics & Material Handling",
        body: "Upon payment clearance of the balance amount, materials will be dispatched to the designated delivery destination. Transit insurance and dispatch handover will follow SolarKits operational standard operating procedures.",
        is_mandatory: true
      },
      {
        title: "6. Electronic Signature & Mobile OTP Verification",
        body: "This Contract is executed digitally. Mobile OTP verification to the EPC's registered mobile number constitutes an authenticated, legally binding digital signature under the Information Technology Act.",
        is_mandatory: true
      }
    ],
    penalty_clauses_summary: "Penalty for unpurchased kits applies after validity window expiry as per plan policy.",
    cancellation_terms: "Order cancellation before payment is permitted without penalty. Cancellation after token deposit requires admin review.",
  });
  const [loadingContract, setLoadingContract] = useState(false);
  const [savingContract, setSavingContract] = useState(false);
  const [contractCopiedToken, setContractCopiedToken] = useState(null);

  // View & Filters (Level 1: Plans View)
  const [searchPlan, setSearchPlan] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("all");

  // View & Filters (Level 2: Plan Products View)
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [searchProduct, setSearchProduct] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'configured' | 'pending'
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Edit / Add Modal States
  const [modalType, setModalType] = useState(null); // 'moq' | 'po' | 'target'
  const [modalTargetProduct, setModalTargetProduct] = useState(null); // null means all products for this plan, or specific product
  const [modalInitialData, setModalInitialData] = useState(null);
  const [savingModal, setSavingModal] = useState(false);

  // Fetch All Master Data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE}/resellers/plans/list?req_for=view&unique_id=RSL_PLAN`, { headers: authHeaderObj() }),
        axios.get(`${API_BASE}/franchisee/moq-rules/list?req_for=view&unique_id=FPO_MOQ`, { headers: authHeaderObj() }),
        axios.get(`${API_BASE}/franchisee/po-settings/list?req_for=view&unique_id=FPO_SETTINGS`, { headers: authHeaderObj() }),
        axios.get(`${API_BASE}/resellers/plans/config-options?req_for=view&unique_id=RSL_PLAN`, { headers: authHeaderObj() }),
        axios.get(`${API_BASE}/franchisee/kit-targets/list?req_for=view&unique_id=FPO_TARGET`, { headers: authHeaderObj() }),
      ]);

      const [plansRes, moqRes, poRes, cfgRes, targetsRes] = results;

      if (plansRes.status === "fulfilled" && plansRes.value.data?.status === "success") {
        setPlans(plansRes.value.data.data || []);
      }
      if (moqRes.status === "fulfilled" && moqRes.value.data?.status === "success") {
        setMoqRules(moqRes.value.data.data || []);
      }
      if (poRes.status === "fulfilled" && poRes.value.data?.status === "success") {
        setPoSettings(poRes.value.data.data || []);
      }
      if (cfgRes.status === "fulfilled" && cfgRes.value.data?.status === "success") {
        setConfigOptions(cfgRes.value.data.data || { combo_kits: [], categories: [] });
      }
      if (targetsRes.status === "fulfilled" && targetsRes.value.data?.status === "success") {
        setKitTargets(targetsRes.value.data.data || []);
      }

      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        console.warn(`[FranchiseeSettings] ${failedCount} data endpoint(s) failed to load.`);
      }
    } catch (err) {
      console.error("[FranchiseeSettings] fetchAllData critical error:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load Franchisee Settings data" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Keep selectedPlan updated when plans array refreshes
  useEffect(() => {
    if (selectedPlan) {
      const updated = plans.find((p) => String(p.id) === String(selectedPlan.id));
      if (updated) setSelectedPlan(updated);
    }
  }, [plans]);

  // Map of all products in system by ID
  const allProductsMap = useMemo(() => {
    const map = new Map();
    (configOptions.combo_kits || []).forEach((k) => map.set(String(k.id || k._id), k));
    return map;
  }, [configOptions.combo_kits]);

  // Helper to compute stats for a specific plan
  const getPlanStats = useCallback((plan) => {
    if (!plan) return { totalProducts: 0, assignedKitIds: [], moqConfiguredCount: 0, moqPendingCount: 0, poConfiguredCount: 0, poPendingCount: 0, readinessPct: 0, planMoqRules: [], planPoSettings: [] };

    const planIdStr = String(plan.id || plan._id);
    const rawIds = (plan.allowed_combo_kit_ids || plan.allowed_combo_kits || [])
      .map((k) => (k && k._id ? String(k._id) : (k && k.id ? String(k.id) : String(k))))
      .filter((id) => id && id !== "null" && id !== "undefined");
    const uniqueRawIds = Array.from(new Set(rawIds));

    // Filter to only actual, existing combo kits (remove orphan/deleted references)
    const assignedKitIds = uniqueRawIds.filter((idStr) => {
      const meta = allProductsMap.get(idStr) || (plan.allowed_combo_kits || []).find((k) => String(k._id || k.id) === idStr);
      return Boolean(meta && meta.name && meta.name !== "Assigned Combo Kit");
    });
    const totalProducts = assignedKitIds.length;

    // Filter rules belonging to this plan
    const planMoqRules = moqRules.filter((r) => r.plan_id && String(r.plan_id._id || r.plan_id) === planIdStr);
    const planPoSettings = poSettings.filter((s) => s.plan_id && String(s.plan_id._id || s.plan_id) === planIdStr);

    // Check configured products
    const moqConfiguredKits = new Set();
    planMoqRules.forEach((r) => {
      if (r.combo_kit_id) moqConfiguredKits.add(String(r.combo_kit_id._id || r.combo_kit_id));
      else if (!r.combo_kit_id && assignedKitIds.length > 0) assignedKitIds.forEach((id) => moqConfiguredKits.add(id));
    });

    const poConfiguredKits = new Set();
    planPoSettings.forEach((s) => {
      (s.allowed_combo_kit_ids || []).forEach((k) => poConfiguredKits.add(String(k._id || k.id || k)));
      if ((!s.allowed_combo_kit_ids || s.allowed_combo_kit_ids.length === 0) && assignedKitIds.length > 0) {
        assignedKitIds.forEach((id) => poConfiguredKits.add(id));
      }
    });

    // Counts against assigned products
    const moqConfiguredCount = assignedKitIds.filter((id) => moqConfiguredKits.has(id)).length;
    const moqPendingCount = Math.max(0, totalProducts - moqConfiguredCount);

    const poConfiguredCount = assignedKitIds.filter((id) => poConfiguredKits.has(id)).length;
    const poPendingCount = Math.max(0, totalProducts - poConfiguredCount);

    const totalPossibleConfigs = totalProducts * 2;
    const totalConfigured = moqConfiguredCount + poConfiguredCount;
    const readinessPct = totalPossibleConfigs > 0 ? Math.round((totalConfigured / totalPossibleConfigs) * 100) : (totalProducts === 0 ? 0 : 100);

    return {
      totalProducts,
      assignedKitIds,
      moqConfiguredCount,
      moqPendingCount,
      poConfiguredCount,
      poPendingCount,
      readinessPct,
      planMoqRules,
      planPoSettings,
    };
  }, [moqRules, poSettings, allProductsMap]);

  // Overall Global Counts
  const globalSummary = useMemo(() => {
    let totalAssignedProducts = 0;
    let totalMoqConfigured = 0;
    let totalPoConfigured = 0;

    plans.forEach((p) => {
      const stats = getPlanStats(p);
      totalAssignedProducts += stats.totalProducts;
      totalMoqConfigured += stats.moqConfiguredCount;
      totalPoConfigured += stats.poConfiguredCount;
    });

    return {
      totalPlans: plans.length,
      totalAssignedProducts,
      totalMoqConfigured,
      totalPoConfigured,
    };
  }, [plans, getPlanStats]);

  // Filtered Plans List (Level 1)
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (territoryFilter !== "all" && p.territory_level !== territoryFilter) return false;
      if (searchPlan.trim()) {
        const q = searchPlan.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.slug || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [plans, territoryFilter, searchPlan]);

  // Active Plan Products List with Specific Settings (Level 2)
  const selectedPlanProducts = useMemo(() => {
    if (!selectedPlan) return [];
    const stats = getPlanStats(selectedPlan);
    const rawIds = (selectedPlan.allowed_combo_kit_ids || selectedPlan.allowed_combo_kits || [])
      .map((k) => (k && k._id ? String(k._id) : (k && k.id ? String(k.id) : String(k))))
      .filter((id) => id && id !== "null" && id !== "undefined");
    const assignedKitIds = Array.from(new Set(rawIds));

    const validProducts = [];
    assignedKitIds.forEach((kitId) => {
      const idStr = String(kitId);
      const kitMeta = allProductsMap.get(idStr) || (selectedPlan.allowed_combo_kits || []).find((k) => String(k._id || k.id) === idStr);

      // Only display actual combo kits. Do not render dummy, deleted, or orphan cards!
      if (!kitMeta || !kitMeta.name || kitMeta.name === "Assigned Combo Kit") {
        return;
      }

      // Find specific MOQ rule for this product, or plan-level fallback
      const specificMoq = stats.planMoqRules.find((r) => r.combo_kit_id && String(r.combo_kit_id._id || r.combo_kit_id) === idStr);
      const fallbackMoq = stats.planMoqRules.find((r) => !r.combo_kit_id);
      const activeMoq = specificMoq || fallbackMoq || null;

      // Find specific PO setting covering this product, or plan-level fallback
      const specificPo = stats.planPoSettings.find((s) => (s.allowed_combo_kit_ids || []).some((k) => String(k._id || k.id || k) === idStr));
      const fallbackPo = stats.planPoSettings.find((s) => !s.allowed_combo_kit_ids || s.allowed_combo_kit_ids.length === 0);
      const activePo = specificPo || fallbackPo || null;

      validProducts.push({
        id: idStr,
        name: kitMeta.name,
        kit_code: kitMeta.kit_code || (idStr ? `CK-${idStr.slice(-6).toUpperCase()}` : "KIT"),
        capacity_kw: kitMeta.capacity_kw || kitMeta.capacity || 0,
        category_name: kitMeta.category_name || "",
        subcategory_name: kitMeta.subcategory_name || "",
        system_type_name: kitMeta.system_type_name || "",
        project_range_label: kitMeta.project_range_label || "",
        selling_price_cached: kitMeta.selling_price_cached || 0,

        // Settings per tab
        moq: activeMoq,
        isMoqConfigured: Boolean(activeMoq),

        po: activePo,
        isPoConfigured: Boolean(specificPo),
      });
    });

    return validProducts;
  }, [selectedPlan, allProductsMap, getPlanStats]);

  // Filtered Products for Active Tab
  const filteredProductsForTab = useMemo(() => {
    return selectedPlanProducts.filter((item) => {
      // Status Filter
      if (statusFilter === "configured") {
        if (activeTab === "moq" && !item.isMoqConfigured) return false;
        if (activeTab === "po" && !item.isPoConfigured) return false;
      } else if (statusFilter === "pending") {
        if (activeTab === "moq" && item.isMoqConfigured) return false;
        if (activeTab === "po" && item.isPoConfigured) return false;
      }

      // Category Filter
      if (categoryFilter !== "all" && item.category_name !== categoryFilter) {
        return false;
      }

      // Search Query
      if (searchProduct.trim()) {
        const q = searchProduct.toLowerCase();
        const matchesName = (item.name || "").toLowerCase().includes(q);
        const matchesCode = (item.kit_code || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [selectedPlanProducts, activeTab, statusFilter, categoryFilter, searchProduct]);

  // Unique Categories in Selected Plan
  const planCategories = useMemo(() => {
    const set = new Set();
    selectedPlanProducts.forEach((p) => {
      if (p.category_name) set.add(p.category_name);
    });
    return Array.from(set);
  }, [selectedPlanProducts]);

  // Handlers to Open Modals
  const handleOpenMoqModal = (product = null, existingRule = null) => {
    setModalType("moq");
    setModalTargetProduct(product);
    setModalInitialData(existingRule || {
      moq: 1,
      increment_quantity: 1,
      max_quantity: "",
      po_quantity_limit: "",
      priority: 10,
      valid_from: new Date().toISOString().slice(0, 10),
      valid_until: "",
    });
  };

  const handleOpenPoModal = (product = null, existingSetting = null) => {
    setModalType("po");
    setModalTargetProduct(product);
    // If opening for a specific product, only treat as an existing setting if that setting specifically has this product in allowed_combo_kit_ids
    const isSpecific = existingSetting && product && (existingSetting.allowed_combo_kit_ids || []).some(
      (k) => String(k._id || k.id || k) === String(product.id || product._id)
    );
    const settingToUse = product ? (isSpecific ? existingSetting : null) : existingSetting;

    setModalInitialData(settingToUse || {
      po_enabled: true,
      min_po_quantity: 1,
      max_po_quantity: "",
      po_validity_days: 30,
      max_line_items: 50,
      token_booking_enabled: true,
      token_type: "FIXED_AMOUNT",
      token_value: 50000,
      min_token_amount: 10000,
      po_lock_days: 30,
      token_settlement_rule: "PRO_RATA",
      default_penalty_type: "FLAT_PER_UNPURCHASED_KIT",
      default_penalty_rate: 500,
      payment_terms: "FULL_ADVANCE",
      requires_approval: true,
      contributes_to_monthly_target: true,
      effective_from: new Date().toISOString().slice(0, 10),
      effective_until: "",
    });
  };

  // Submit MOQ Rule
  const handleSaveMoq = async (formData) => {
    setSavingModal(true);
    try {
      const isEdit = Boolean(formData.id || modalInitialData?._id);
      const ruleId = formData.id || modalInitialData?._id;
      const endpoint = isEdit ? "/update" : "/add";

      const payload = {
        ...(isEdit && { id: ruleId }),
        plan_id: selectedPlan.id,
        combo_kit_id: modalTargetProduct ? modalTargetProduct.id : null,
        moq: Number(formData.moq || 1),
        increment_quantity: Number(formData.increment_quantity || 1),
        max_quantity: formData.max_quantity ? Number(formData.max_quantity) : null,
        po_quantity_limit: formData.po_quantity_limit ? Number(formData.po_quantity_limit) : null,
        priority: Number(formData.priority || 10),
        valid_from: formData.valid_from || new Date().toISOString().slice(0, 10),
        valid_until: formData.valid_until || null,
      };

      const res = await axios({
        method: isEdit ? "put" : "post",
        url: `${API_BASE}/franchisee/moq-rules${endpoint}`,
        headers: authHeaderObj(),
        params: { req_for: isEdit ? "edit" : "add", unique_id: "FPO_MOQ" },
        data: payload,
      });

      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `MOQ rule saved successfully for ${modalTargetProduct ? modalTargetProduct.name : selectedPlan.name}` }));
        setModalType(null);
        fetchAllData();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to save MOQ rule" }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Operation failed" }));
    } finally {
      setSavingModal(false);
    }
  };



  // Submit PO Settings
  const handleSavePo = async (formData) => {
    setSavingModal(true);
    try {
      const isEdit = Boolean(formData.id || modalInitialData?._id);
      const ruleId = formData.id || modalInitialData?._id;
      const endpoint = isEdit ? "/update" : "/add";

      const tokenVal = formData.token_value !== undefined && formData.token_value !== "" && !isNaN(Number(formData.token_value))
        ? Number(formData.token_value)
        : (formData.token_type === "PERCENTAGE" ? 10 : 50000);

      const payload = {
        ...(isEdit && { id: ruleId }),
        plan_id: selectedPlan?.id || selectedPlan?._id,
        allowed_combo_kit_ids: modalTargetProduct ? [modalTargetProduct.id || modalTargetProduct._id] : (selectedPlan?.allowed_combo_kit_ids || []),
        po_enabled: Boolean(formData.po_enabled),
        min_po_quantity: Number(formData.min_po_quantity || 1),
        max_po_quantity: formData.max_po_quantity ? Number(formData.max_po_quantity) : null,
        po_validity_days: Number(formData.po_validity_days || 30),
        max_line_items: Number(formData.max_line_items || 50),
        token_booking_enabled: Boolean(formData.token_booking_enabled),
        token_type: formData.token_type || "FIXED_AMOUNT",
        token_value: tokenVal,
        min_token_amount: Number(formData.min_token_amount || 10000),
        po_lock_days: Number(formData.po_lock_days || formData.po_validity_days || 30),
        token_settlement_rule: formData.token_settlement_rule || "PRO_RATA",
        default_penalty_type: formData.default_penalty_type || "FLAT_PER_UNPURCHASED_KIT",
        default_penalty_rate: Number(formData.default_penalty_rate || 500),
        payment_terms: formData.payment_terms || "FULL_ADVANCE",
        requires_approval: Boolean(formData.requires_approval),
        contributes_to_monthly_target: Boolean(formData.contributes_to_monthly_target),
        effective_from: formData.effective_from || new Date().toISOString().slice(0, 10),
        effective_until: formData.effective_until || null,
      };

      const res = await axios({
        method: isEdit ? "put" : "post",
        url: `${API_BASE}/franchisee/po-settings${endpoint}`,
        headers: authHeaderObj(),
        params: { req_for: isEdit ? "edit" : "add", unique_id: "FPO_SETTINGS" },
        data: payload,
      });

      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `PO settings saved for ${modalTargetProduct ? modalTargetProduct.name : selectedPlan.name}` }));
        setModalType(null);
        fetchAllData();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to save PO settings" }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Operation failed" }));
    } finally {
      setSavingModal(false);
    }
  };

  // Open & Save Kit Target Modal
    // ── PO Order Contract Handlers ──
  const fetchPlanContract = useCallback(async (planId) => {
    if (!planId) return;
    setLoadingContract(true);
    try {
      const res = await axios.get(
        `${API_BASE}/franchisee/po-settings/contract?plan_id=${planId}&req_for=view&unique_id=FPO_SETTINGS`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success" && res.data.data) {
        setContractData((prev) => ({
          ...prev,
          ...res.data.data,
          clauses: Array.isArray(res.data.data.clauses) && res.data.data.clauses.length > 0 ? res.data.data.clauses : prev.clauses,
        }));
      }
    } catch (err) {
      console.warn("[FranchiseeSettings] fetchPlanContract error:", err);
    } finally {
      setLoadingContract(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      fetchPlanContract(selectedPlan.id || selectedPlan._id);
    }
  }, [selectedPlan, fetchPlanContract]);

  const handleSaveContract = async () => {
    if (!selectedPlan) return;
    setSavingContract(true);
    try {
      const payload = {
        plan_id: selectedPlan.id || selectedPlan._id,
        ...contractData,
      };
      const res = await axios.post(
        `${API_BASE}/franchisee/po-settings/contract/save?req_for=edit&unique_id=FPO_SETTINGS`,
        payload,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `PO Order Contract settings saved for ${selectedPlan.name}!` }));
        fetchPlanContract(selectedPlan.id || selectedPlan._id);
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to save contract settings" }));
      }
    } catch (err) {
      console.error("[FranchiseeSettings] handleSaveContract error:", err);
      dispatch(setAlert({ type: "error", message: "Error saving contract settings" }));
    } finally {
      setSavingContract(false);
    }
  };

  const handleAddContractClause = () => {
    setContractData((prev) => ({
      ...prev,
      clauses: [
        ...prev.clauses,
        {
          title: `${prev.clauses.length + 1}. Special Contract Term`,
          body: "Enter term details. Placeholders like {{po_number}}, {{quantity}}, {{token_amount}} are supported.",
          is_mandatory: true,
        }
      ]
    }));
  };

  const handleUpdateContractClause = (index, field, value) => {
    setContractData((prev) => {
      const updated = [...prev.clauses];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, clauses: updated };
    });
  };

  const handleDeleteContractClause = (index) => {
    setContractData((prev) => ({
      ...prev,
      clauses: prev.clauses.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────────────────
          LEVEL 1: ALL PLANS OVERVIEW & STATUS CARDS
          ─────────────────────────────────────────────────────────────────────── */}
      {!selectedPlan ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <FiSliders className="text-primary" size={24} />
                Franchisee Settings
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Configure dedicated product-wise MOQ rules and PO ordering parameters for each Franchisee Plan
              </p>
            </div>

            {/* Quick Refresh */}
            <Button
              onClick={fetchAllData}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <FiClock size={14} /> Refresh Status
            </Button>
          </div>

          {/* Top Global Summary Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <FiFileText size={18} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-muted">Total Plans</div>
                <div className="text-xl font-bold text-text-primary">{globalSummary.totalPlans}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <FiBox size={18} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-muted">Assigned Products</div>
                <div className="text-xl font-bold text-text-primary">{globalSummary.totalAssignedProducts}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-bold">
                <FiZap size={18} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-muted">MOQ Rules Ready</div>
                <div className="text-xl font-bold text-text-primary">
                  {globalSummary.totalMoqConfigured} / {globalSummary.totalAssignedProducts}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <FiPackage size={18} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-muted">PO Ordering Ready</div>
                <div className="text-xl font-bold text-text-primary">
                  {globalSummary.totalPoConfigured} / {globalSummary.totalAssignedProducts}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Territory Scope Tabs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="text"
                placeholder="Search plan name or slug..."
                value={searchPlan}
                onChange={(e) => setSearchPlan(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
              {["all", "district", "state", "country"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setTerritoryFilter(lvl)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${territoryFilter === lvl
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Cards Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-muted gap-3">
              <FiLoader className="animate-spin" size={20} />
              <span className="text-sm font-medium">Loading Franchisee Plans and Settings...</span>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-surface rounded-2xl border border-border">
              <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center text-text-muted">
                <FiSliders size={24} />
              </div>
              <p className="text-sm text-text-muted">
                {searchPlan || territoryFilter !== "all"
                  ? "No plans match your filter"
                  : "No franchisee plans created yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlans.map((plan) => {
                const stats = getPlanStats(plan);

                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="bg-surface rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group border-t-4 border-t-primary"
                  >
                    {/* Card Header */}
                    <div className="p-5 border-b border-border bg-bg/40">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                            {plan.name}
                          </h3>
                          <div className="text-xs text-text-muted font-mono mt-0.5">#{plan.slug}</div>
                        </div>
                        <TerritoryLevelBadge level={plan.territory_level} />
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <OrderTypeBadge orderType={plan.order_type_allowed} />
                        <span className="text-xs font-bold text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                          {stats.totalProducts} Products Configured
                        </span>
                      </div>
                    </div>

                    {/* Card Body: Meaningful Status Counters (Replacing Screenshot 3) */}
                    <div className="p-5 space-y-3.5 flex-1">
                      <div className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center justify-between">
                        <span>Configuration Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stats.readinessPct === 100
                            ? "bg-success-soft text-success border border-success/20"
                            : stats.readinessPct > 0
                              ? "bg-warning-soft text-warning border border-warning/20"
                              : "bg-surface-hover text-text-muted border border-border"
                          }`}>
                          {stats.readinessPct}% Configured
                        </span>
                      </div>

                      {/* 1. MOQ Status */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg/80 border border-border text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-warning/10 text-warning flex items-center justify-center font-bold shrink-0">
                            <FiZap size={13} />
                          </div>
                          <span className="font-semibold text-text-primary">MOQ Settings</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-success">{stats.moqConfiguredCount} Set</span>
                          <span className="text-text-muted">•</span>
                          <span className="font-bold text-amber-600">{stats.moqPendingCount} Pending</span>
                        </div>
                      </div>

                      {/* 2. PO Ordering Status */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg/80 border border-border text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold shrink-0">
                            <FiPackage size={13} />
                          </div>
                          <span className="font-semibold text-text-primary">PO Ordering Rules</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-success">{stats.poConfiguredCount} Set</span>
                          <span className="text-text-muted">•</span>
                          <span className="font-bold text-amber-600">{stats.poPendingCount} Pending</span>
                        </div>
                      </div>

                      {/* 3. Cluster Territory Goals Info */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg/80 border border-border text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            <FiTarget size={13} />
                          </div>
                          <span className="font-semibold text-text-primary">Territory Goals</span>
                        </div>
                        <span className="font-bold text-primary text-[11px]">Cluster Hub</span>
                      </div>
                    </div>

                    {/* Card Action Button */}
                    <div className="p-4 border-t border-border bg-bg/40">
                      <button
                        onClick={() => setSelectedPlan(plan)}
                        className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20 hover:shadow"
                      >
                        <FiSliders size={14} />
                        Manage Plan Settings <FiChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────────────────
            LEVEL 2: PLAN DETAILED SETTINGS (4 HORIZONTAL TABS)
            ─────────────────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Back button & Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <FiArrowLeft size={16} /> Back to Plans
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">{selectedPlan.name}</h2>
                  <TerritoryLevelBadge level={selectedPlan.territory_level} />
                  <OrderTypeBadge orderType={selectedPlan.order_type_allowed} />
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Configure product-level parameters, PO rules, and monthly kit goals for this plan
                </p>
              </div>
            </div>

            {/* Quick Plan Stats Chips */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <FiBox size={14} /> {selectedPlanProducts.length} Assigned Products
              </span>
            </div>
          </div>

          {/* 5 Summary Stat Cards at Level 2 */}
          {(() => {
            const stats = getPlanStats(selectedPlan);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-surface border border-border">
                  <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Assigned Products</div>
                  <div className="text-xl font-bold text-text-primary mt-1">{stats.totalProducts}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Configured in Plan</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface border border-border">
                  <div className="text-[11px] font-bold text-warning uppercase tracking-wider flex items-center gap-1">
                    <FiZap size={12} /> MOQ Status
                  </div>
                  <div className="text-xl font-bold text-text-primary mt-1">
                    {stats.moqConfiguredCount} <span className="text-xs font-normal text-text-muted">/ {stats.totalProducts}</span>
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">{stats.moqPendingCount} Pending Setup</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface border border-border">
                  <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                    <FiPackage size={12} /> PO Ordering
                  </div>
                  <div className="text-xl font-bold text-text-primary mt-1">
                    {stats.poConfiguredCount} <span className="text-xs font-normal text-text-muted">/ {stats.totalProducts}</span>
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">{stats.poPendingCount} Pending Setup</div>
                </div>
              </div>
            );
          })()}

          {/* 3 HORIZONTAL TABS */}
          <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
            {[
              { id: "moq", label: "MOQ Settings", icon: FiZap, color: "text-warning" },
              { id: "po", label: "PO Settings", icon: FiPackage, color: "text-purple-600" },
              { id: "contract", label: "PO Order Contract", icon: FiFileText, color: "text-emerald-600" },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all border-b-2 -mb-1 whitespace-nowrap ${active
                      ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
                      : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    }`}
                >
                  <Icon size={16} className={active ? "text-white" : tab.color} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* CLUSTER GOAL NOTIFICATION BANNER (IF TARGET TAB ACCESSED) */}
          {activeTab === "target" ? (
            <div className="p-8 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                <FiTarget size={28} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-text-primary">
                  Franchise Goal Settings have Moved to Cluster Management
                </h3>
                <p className="text-xs text-text-muted">
                  Monthly kit quotas, revenue targets, annual EPC onboarding, and live EPC goals are now configured per cluster territory in Franchise Cluster Hub.
                </p>
              </div>
              <Link
                to="/admin-panel/solar-shop/franchise-clusters?tab=goals"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-all"
              >
                <FiTarget size={14} />
                Open Franchisee Cluster Goal Settings
              </Link>
            </div>
          ) : activeTab === "contract" ? (
            /* ───────────────────────────────────────────────────────────────────
            TAB 4: PO ORDER CONTRACT CONFIGURATION & LIVE PREVIEW
            ─────────────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <FiFileText size={26} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                      PO Order Contract & Mobile OTP Terms
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        contractData.is_contract_required
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-warning-soft text-warning border border-warning/20"
                      }`}>
                        {contractData.is_contract_required ? "Contract & OTP Mandated" : "Optional / Disabled"}
                      </span>
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Define the terms and clauses that assigned EPC contractors must review and electronically sign via registered Mobile OTP before PO starts and token is paid.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveContract}
                    disabled={savingContract}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm transition-all"
                  >
                    {savingContract ? <FiLoader className="animate-spin" size={14} /> : <FiCheck size={14} />}
                    <span>{savingContract ? "Saving..." : "Save Contract Settings"}</span>
                  </Button>
                </div>
              </div>

              {/* Grid: 2 Columns - Left: Settings & Clauses Editor, Right: Live Contract Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Form & Clause Editor */}
                <div className="lg:col-span-7 space-y-6">
                  {/* General Settings Card */}
                  <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <FiSettings size={13} className="text-primary" /> General Contract Parameters
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Contract Required Toggle */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg/50 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-text-primary">Mandatory Contract</div>
                          <div className="text-[10px] text-text-muted">Must sign prior to token deposit</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={contractData.is_contract_required}
                          onChange={(e) => setContractData((prev) => ({ ...prev, is_contract_required: e.target.checked }))}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                      </label>

                      {/* Mobile OTP Verification Toggle */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg/50 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-text-primary">Mobile OTP Verification</div>
                          <div className="text-[10px] text-text-muted">6-digit OTP to registered mobile</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={contractData.require_mobile_otp}
                          onChange={(e) => setContractData((prev) => ({ ...prev, require_mobile_otp: e.target.checked }))}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-text-secondary mb-1">Contract Title</label>
                        <input
                          type="text"
                          value={contractData.contract_title}
                          onChange={(e) => setContractData((prev) => ({ ...prev, contract_title: e.target.value }))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-text-secondary mb-1">Version / Tag</label>
                        <input
                          type="text"
                          value={contractData.contract_version}
                          onChange={(e) => setContractData((prev) => ({ ...prev, contract_version: e.target.value }))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary mb-1">Preamble / Introduction</label>
                      <textarea
                        rows={2}
                        value={contractData.terms_introduction}
                        onChange={(e) => setContractData((prev) => ({ ...prev, terms_introduction: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>
                  </div>

                  {/* Dynamic Placeholder Helpers */}
                  <div className="p-4 rounded-2xl bg-surface border border-border">
                    <div className="text-[11px] font-bold text-text-secondary mb-1.5 flex items-center justify-between">
                      <span>Click to Copy Dynamic Placeholders:</span>
                      {contractCopiedToken && <span className="text-[10px] text-emerald-600 font-bold">Copied {contractCopiedToken}!</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "{{po_number}}",
                        "{{quantity}}",
                        "{{token_amount}}",
                        "{{validity_days}}",
                        "{{epc_company_name}}",
                        "{{epc_buyer_name}}",
                        "{{franchisee_name}}",
                        "{{franchisee_mobile}}",
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                            setContractCopiedToken(tag);
                            setTimeout(() => setContractCopiedToken(null), 1800);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-bg hover:bg-primary/10 hover:text-primary text-[10px] font-mono text-text-muted border border-border transition-all cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contract Clauses List Editor */}
                  <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                        <FiSliders size={13} className="text-emerald-600" /> Contract Clauses & Conditions ({contractData.clauses.length})
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddContractClause}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer"
                      >
                        <FiPlus size={13} /> Add Clause
                      </button>
                    </div>

                    <div className="space-y-3">
                      {contractData.clauses.map((clause, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-border bg-bg/40 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={clause.title}
                              onChange={(e) => handleUpdateContractClause(idx, "title", e.target.value)}
                              className="font-bold text-xs text-text-primary bg-transparent border-b border-border/80 focus:border-primary focus:outline-none flex-1 py-0.5"
                              placeholder="Clause Title (e.g. 1. Delivery Terms)"
                            />
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 text-[10px] text-text-muted cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={clause.is_mandatory}
                                  onChange={(e) => handleUpdateContractClause(idx, "is_mandatory", e.target.checked)}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded"
                                />
                                <span>Mandatory</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleDeleteContractClause(idx)}
                                className="p-1 text-text-muted hover:text-rose-600 transition-colors cursor-pointer"
                                title="Remove Clause"
                              >
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <textarea
                            rows={3}
                            value={clause.body}
                            onChange={(e) => handleUpdateContractClause(idx, "body", e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            placeholder="Clause body terms. Use placeholders where dynamic values are required."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Preview */}
                <div className="lg:col-span-5">
                  <div className="sticky top-6 p-6 rounded-2xl bg-surface border-2 border-emerald-500/30 shadow-lg space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Live EPC Contract Preview</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        {contractData.contract_version}
                      </span>
                    </div>

                    {/* Formal Document Render Container */}
                    <div className="p-5 rounded-xl bg-white text-slate-800 shadow-inner border border-slate-200 text-xs space-y-3.5 max-h-[620px] overflow-y-auto font-serif leading-relaxed">
                      {/* Document Header with SolarKits Branding */}
                      <div className="text-center pb-3 border-b border-slate-300">
                        <div className="text-[11px] font-sans font-black tracking-widest text-emerald-700 uppercase">SOLARKITS INDIA CONTRACT</div>
                        <div className="text-sm font-sans font-bold text-slate-900 mt-0.5">{contractData.contract_title}</div>
                        <div className="text-[10px] font-sans text-slate-500 mt-0.5">PO Ref: PO-DEMO2026 • Valid for {contractData.validity_days} Days</div>
                      </div>

                      {/* Parties Block */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-sans grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">1. Franchise Partner:</span>
                          <span className="font-bold text-slate-900">{selectedPlan.name} Partner</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">2. Solar EPC Contractor:</span>
                          <span className="font-bold text-slate-900">Assigned Solar EPC Partner</span>
                        </div>
                      </div>

                      {/* Introduction */}
                      <p className="text-[11px] text-slate-700 italic">
                        {contractData.terms_introduction}
                      </p>

                      {/* Mock Order Table */}
                      <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-[11px] font-sans space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Committed Quantity:</span>
                          <span className="text-emerald-700">25 Combo Kits</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Token Deposit Requirement:</span>
                          <span className="text-emerald-700">₹50,000</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[10px]">
                          <span>Mobile OTP Signature:</span>
                          <span className="text-emerald-700 font-bold">Mandatory before Token</span>
                        </div>
                      </div>

                      {/* Clauses */}
                      <div className="space-y-2.5 pt-1">
                        {contractData.clauses.map((c, i) => (
                          <div key={i} className="space-y-0.5">
                            <div className="font-sans font-bold text-slate-900 text-[11px] flex items-center justify-between">
                              <span>{c.title}</span>
                              {c.is_mandatory && <span className="text-[9px] text-emerald-700 uppercase tracking-wider font-semibold">Mandatory</span>}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal pl-2 border-l-2 border-slate-200">
                              {c.body
                                .replace(/\{\{po_number\}\}/g, "PO-2026DEMO")
                                .replace(/\{\{quantity\}\}/g, "25")
                                .replace(/\{\{token_amount\}\}/g, "50,000")
                                .replace(/\{\{validity_days\}\}/g, String(contractData.validity_days))
                                .replace(/\{\{epc_company_name\}\}/g, "Solar EPC Contractor")
                                .replace(/\{\{epc_buyer_name\}\}/g, "Authorized Signatory")
                                .replace(/\{\{franchisee_name\}\}/g, selectedPlan.name)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Signatory Stamp Placeholder */}
                      <div className="mt-4 pt-3 border-t border-slate-300 font-sans grid grid-cols-2 gap-3 text-[10px]">
                        <div className="p-2.5 rounded-lg border border-dashed border-slate-300 text-center">
                          <div className="font-bold text-slate-700">Franchise Partner</div>
                          <div className="text-[9px] text-emerald-600 font-bold mt-1">ISSUED & ALLOCATED</div>
                        </div>
                        <div className="p-2.5 rounded-lg border border-emerald-400 bg-emerald-50/30 text-center">
                          <div className="font-bold text-slate-700">EPC Digital Signature</div>
                          <div className="text-[9px] text-emerald-700 font-bold mt-1">VERIFIED VIA MOBILE OTP</div>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSaveContract}
                      disabled={savingContract}
                      className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      {savingContract ? <FiLoader className="animate-spin" size={15} /> : <FiCheckCircle size={15} />}
                      <span>{savingContract ? "Saving..." : "Save PO Order Contract Settings"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Filter, Search & View Controls Bar */}
              <div className="p-4 bg-surface rounded-2xl border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  {/* Search */}
                  <div className="relative min-w-[220px] flex-1 max-w-xs">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input
                      type="text"
                      placeholder="Search product name or code..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex gap-1 bg-bg border border-border rounded-xl p-1">
                    {[
                      { value: "all", label: "All Products" },
                      { value: "configured", label: "Configured" },
                      { value: "pending", label: "Pending" },
                    ].map((st) => (
                      <button
                        key={st.value}
                        onClick={() => setStatusFilter(st.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${statusFilter === st.value
                            ? "bg-surface shadow-sm text-primary font-bold"
                            : "text-text-muted hover:text-text-primary"
                          }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Category Filter */}
                  {planCategories.length > 1 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="all">All Categories</option>
                      {planCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Right: View Switcher & Bulk Button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-bg border border-border rounded-xl p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === "grid" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                        }`}
                      title="Grid View"
                    >
                      <FiGrid size={15} />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 rounded-lg text-xs transition-all ${viewMode === "table" ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                        }`}
                      title="Table View"
                    >
                      <FiList size={15} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (activeTab === "moq") handleOpenMoqModal(null, getPlanStats(selectedPlan).planMoqRules.find((r) => !r.combo_kit_id));
                      else handleOpenPoModal(null, getPlanStats(selectedPlan).planPoSettings.find((s) => !s.allowed_combo_kit_ids || s.allowed_combo_kit_ids.length === 0));
                    }}
                    className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <FiSliders size={13} />
                    Set Global Plan Rule
                  </button>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────────────
              TAB CONTENT (PRODUCTS LIST / GRID WITH DEDICATED SETTINGS)
              ─────────────────────────────────────────────────────────────────── */}
              {filteredProductsForTab.length === 0 ? (
                <div className="py-16 text-center text-xs text-text-muted bg-surface rounded-2xl border border-dashed border-border p-6">
                  <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-2 text-text-muted">
                    <FiBox size={22} />
                  </div>
                  <p className="font-semibold text-text-primary">
                    {selectedPlanProducts.length === 0
                      ? "No products assigned to this plan yet. Please assign products in Franchisee Plans > Settings first."
                      : "No products match the selected filters."}
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                /* ────────────────────────────────── GRID VIEW ────────────────────────────────── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProductsForTab.map((prod) => {
                    const isConfigured =
                      activeTab === "moq"
                        ? prod.isMoqConfigured
                        : prod.isPoConfigured;

                    return (
                      <motion.div
                        key={prod.id}
                        whileHover={{ y: -2 }}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${isConfigured
                            ? "bg-surface border-border hover:border-primary/40 shadow-sm"
                            : "bg-surface/60 border-dashed border-amber-300 dark:border-amber-800"
                          }`}
                      >
                        {/* Top: Product Name, Code, Badges */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 truncate">
                              <div className="font-bold text-xs text-text-primary truncate" title={prod.name}>
                                {prod.name}
                              </div>
                              <div className="text-[10px] text-text-muted font-mono mt-0.5">{prod.kit_code || "SKU-AUTO"}</div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${isConfigured
                                ? "bg-success-soft text-success border border-success/20"
                                : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                              }`}>
                              {isConfigured ? "✓ Configured" : "⏳ Pending"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 my-2">
                            {prod.capacity_kw > 0 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-warning-soft text-warning border border-warning/20">
                                ⚡ {prod.capacity_kw} kW
                              </span>
                            )}
                            {prod.category_name && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-bg text-text-muted border border-border truncate max-w-[130px]" title={prod.category_name}>
                                {prod.category_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Tab Specific Values */}
                        <div className="my-3 p-3 rounded-xl bg-bg/80 border border-border text-xs space-y-1.5">
                          {activeTab === "moq" && (
                            prod.moq ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">MOQ:</span>
                                  <strong className="text-text-primary">{prod.moq.moq} Kit(s)</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Increment:</span>
                                  <strong className="text-text-primary">+{prod.moq.increment_quantity || 1}</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Max Limit:</span>
                                  <strong className="text-text-primary">{prod.moq.max_quantity ? `${prod.moq.max_quantity} Kits` : "Unlimited"}</strong>
                                </div>
                              </>
                            ) : (
                              <div className="text-center text-text-muted py-2">
                                <FiAlertTriangle className="inline mr-1 text-amber-500" /> Default MOQ Rule applies
                              </div>
                            )
                          )}

                          {activeTab === "po" && (
                            prod.po ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">PO Ordering:</span>
                                  <strong className={prod.po.po_enabled ? "text-success" : "text-danger"}>
                                    {prod.po.po_enabled ? "Enabled" : "Disabled"}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Min / Max PO:</span>
                                  <strong className="text-text-primary">
                                    {prod.po.min_po_quantity} - {prod.po.max_po_quantity || "∞"} Kits
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Validity:</span>
                                  <strong className="text-text-primary">{prod.po.po_validity_days || 30} Days</strong>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-muted">Token Booking:</span>
                                  <strong className={prod.po.token_booking_enabled ? "text-emerald-600 dark:text-emerald-400" : "text-text-muted"}>
                                    {prod.po.token_booking_enabled
                                      ? (prod.po.token_type === "PERCENTAGE" ? `${prod.po.token_value || 0}%` : `₹${Number(prod.po.token_value || 0).toLocaleString("en-IN")}`)
                                      : "Disabled"}
                                  </strong>
                                </div>
                              </>
                            ) : (
                              <div className="text-center text-text-muted py-2">
                                <FiAlertTriangle className="inline mr-1 text-amber-500" /> Default PO Setting applies
                              </div>
                            )
                          )}
                        </div>

                        {/* Bottom Action */}
                        <button
                          onClick={() => {
                            if (activeTab === "moq") handleOpenMoqModal(prod, prod.moq);
                            else handleOpenPoModal(prod, prod.po);
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isConfigured
                              ? "bg-bg hover:bg-primary hover:text-white border border-border text-text-primary"
                              : "bg-primary text-white hover:bg-primary-hover shadow-sm"
                            }`}
                        >
                          {isConfigured ? <FiEdit2 size={13} /> : <FiPlus size={13} />}
                          {isConfigured
                            ? activeTab === "moq" ? "Edit MOQ" : "Edit PO Rules"
                            : activeTab === "moq" ? "Set MOQ Rule" : "Set PO Rules"}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* ────────────────────────────────── TABLE VIEW ────────────────────────────────── */
                <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-bg border-b border-border text-text-muted font-bold">
                        <tr>
                          <th className="text-left px-4 py-3.5">Product Name</th>
                          <th className="text-left px-3 py-3.5">Capacity</th>
                          <th className="text-left px-3 py-3.5">Category</th>
                          <th className="text-left px-4 py-3.5">
                            {activeTab === "moq" ? "MOQ & Increments" : "PO Specifications"}
                          </th>
                          <th className="text-center px-3 py-3.5">Status</th>
                          <th className="text-right px-4 py-3.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredProductsForTab.map((prod) => {
                          const isConfigured =
                            activeTab === "moq"
                              ? prod.isMoqConfigured
                              : prod.isPoConfigured;

                          return (
                            <tr key={prod.id} className="hover:bg-surface-hover/60 transition-colors">
                              <td className="px-4 py-3 font-bold text-text-primary">
                                <div>{prod.name}</div>
                                <div className="text-[10px] text-text-muted font-mono">{prod.kit_code || "SKU-AUTO"}</div>
                              </td>
                              <td className="px-3 py-3 font-semibold text-warning">
                                {prod.capacity_kw ? `${prod.capacity_kw} kW` : "-"}
                              </td>
                              <td className="px-3 py-3 text-text-muted">{prod.category_name || "-"}</td>

                              {/* Tab details */}
                              <td className="px-4 py-3">
                                {activeTab === "moq" && (
                                  prod.moq ? (
                                    <span className="font-bold text-text-primary">
                                      MOQ: {prod.moq.moq} (Inc: +{prod.moq.increment_quantity || 1})
                                    </span>
                                  ) : (
                                    <span className="text-text-muted">Default Plan MOQ</span>
                                  )
                                )}

                                {activeTab === "po" && (
                                  prod.po ? (
                                    <div className="space-y-0.5">
                                      <span className="font-bold text-purple-600 block">
                                        {prod.po.po_enabled ? `Min: ${prod.po.min_po_quantity} • ${prod.po.po_validity_days || 30}d` : "Disabled"}
                                      </span>
                                      {prod.po.token_booking_enabled && (
                                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                                          Token: {prod.po.token_type === "PERCENTAGE" ? `${prod.po.token_value || 0}%` : `₹${Number(prod.po.token_value || 0).toLocaleString("en-IN")}`}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-text-muted">Default Plan PO Settings</span>
                                  )
                                )}
                              </td>

                              <td className="px-3 py-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isConfigured
                                    ? "bg-success-soft text-success border border-success/20"
                                    : "bg-amber-100 text-amber-700 border border-amber-300"
                                  }`}>
                                  {isConfigured ? "Configured" : "Pending"}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => {
                                    if (activeTab === "moq") handleOpenMoqModal(prod, prod.moq);
                                    else handleOpenPoModal(prod, prod.po);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-bold transition-all"
                                >
                                  {isConfigured ? "Edit" : "Configure"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODALS FOR CONFIGURING MOQ, COMMISSION, AND PO RULES
          ─────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalType === "moq" && (
          <MoqRuleModal
            targetProduct={modalTargetProduct}
            plan={selectedPlan}
            initialData={modalInitialData}
            saving={savingModal}
            onClose={() => setModalType(null)}
            onSave={handleSaveMoq}
          />
        )}
        {modalType === "po" && (
          <PoSettingsModal
            targetProduct={modalTargetProduct}
            plan={selectedPlan}
            initialData={modalInitialData}
            saving={savingModal}
            onClose={() => setModalType(null)}
            onSave={handleSavePo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MOQ RULE MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function MoqRuleModal({ targetProduct, plan, initialData, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    id: initialData?._id || initialData?.id || null,
    moq: initialData?.moq ?? 1,
    increment_quantity: initialData?.increment_quantity ?? 1,
    max_quantity: initialData?.max_quantity ?? "",
    po_quantity_limit: initialData?.po_quantity_limit ?? "",
    priority: initialData?.priority ?? 10,
    valid_from: initialData?.valid_from ? new Date(initialData.valid_from).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    valid_until: initialData?.valid_until ? new Date(initialData.valid_until).toISOString().slice(0, 10) : "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg/50">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <FiZap className="text-warning" size={18} />
              Configure MOQ Rule
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {targetProduct ? `Product: ${targetProduct.name}` : `Plan: ${plan.name} (Global Plan Rule)`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"><FiX size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Minimum Order Quantity (MOQ) <span className="text-danger">*</span></label>
              <input type="number" min={1} required className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Increment Step Qty <span className="text-danger">*</span></label>
              <input type="number" min={1} required className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary" value={form.increment_quantity} onChange={(e) => setForm({ ...form, increment_quantity: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Max Order Quantity Limit</label>
              <input type="number" min={1} placeholder="Leave blank = unlimited" className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">PO Batch Limit</label>
              <input type="number" min={1} placeholder="Leave blank = no limit" className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.po_quantity_limit} onChange={(e) => setForm({ ...form, po_quantity_limit: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Effective From <span className="text-danger">*</span></label>
              <input type="date" required className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Effective Until</label>
              <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-xs font-semibold hover:bg-surface-hover">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover flex items-center justify-center gap-2">
              {saving ? <FiLoader className="animate-spin" size={15} /> : <FiCheck size={15} />}
              {saving ? "Saving..." : "Save MOQ Rule"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PO SETTINGS MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function PoSettingsModal({ targetProduct, plan, initialData, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    id: initialData?._id || initialData?.id || null,
    po_enabled: initialData?.po_enabled ?? true,
    min_po_quantity: initialData?.min_po_quantity ?? 1,
    max_po_quantity: initialData?.max_po_quantity ?? "",
    po_validity_days: initialData?.po_validity_days ?? 30,
    max_line_items: initialData?.max_line_items ?? 50,
    token_booking_enabled: initialData?.token_booking_enabled !== undefined ? Boolean(initialData.token_booking_enabled) : true,
    token_type: initialData?.token_type || "FIXED_AMOUNT",
    token_value: initialData?.token_value != null ? String(initialData.token_value) : "50000",
    min_token_amount: initialData?.min_token_amount != null ? String(initialData.min_token_amount) : "10000",
    po_lock_days: initialData?.po_lock_days != null ? String(initialData.po_lock_days) : String(initialData?.po_validity_days || 30),
    token_settlement_rule: initialData?.token_settlement_rule || "PRO_RATA",
    default_penalty_type: initialData?.default_penalty_type || "FLAT_PER_UNPURCHASED_KIT",
    default_penalty_rate: initialData?.default_penalty_rate != null ? Number(initialData.default_penalty_rate) : 500,
    payment_terms: initialData?.payment_terms || "FULL_ADVANCE",
    requires_approval: initialData?.requires_approval ?? true,
    contributes_to_monthly_target: initialData?.contributes_to_monthly_target ?? true,
    effective_from: initialData?.effective_from ? new Date(initialData.effective_from).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    effective_until: initialData?.effective_until ? new Date(initialData.effective_until).toISOString().slice(0, 10) : "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData?._id || initialData?.id || null,
        po_enabled: initialData?.po_enabled ?? true,
        min_po_quantity: initialData?.min_po_quantity ?? 1,
        max_po_quantity: initialData?.max_po_quantity ?? "",
        po_validity_days: initialData?.po_validity_days ?? 30,
        max_line_items: initialData?.max_line_items ?? 50,
        token_booking_enabled: initialData?.token_booking_enabled !== undefined ? Boolean(initialData.token_booking_enabled) : true,
        token_type: initialData?.token_type || "FIXED_AMOUNT",
        token_value: initialData?.token_value != null ? String(initialData.token_value) : "50000",
        min_token_amount: initialData?.min_token_amount != null ? String(initialData.min_token_amount) : "10000",
        po_lock_days: initialData?.po_lock_days != null ? String(initialData.po_lock_days) : String(initialData?.po_validity_days || 30),
        token_settlement_rule: initialData?.token_settlement_rule || "PRO_RATA",
        default_penalty_type: initialData?.default_penalty_type || "FLAT_PER_UNPURCHASED_KIT",
        default_penalty_rate: initialData?.default_penalty_rate != null ? Number(initialData.default_penalty_rate) : 500,
        payment_terms: initialData?.payment_terms || "FULL_ADVANCE",
        requires_approval: initialData?.requires_approval ?? true,
        contributes_to_monthly_target: initialData?.contributes_to_monthly_target ?? true,
        effective_from: initialData?.effective_from ? new Date(initialData.effective_from).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        effective_until: initialData?.effective_until ? new Date(initialData.effective_until).toISOString().slice(0, 10) : "",
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg/50">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <FiPackage className="text-purple-600" size={18} />
              Configure PO Settings
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {targetProduct ? `Product: ${targetProduct.name}` : `Plan: ${plan.name} (Global Plan Rule)`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"><FiX size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border">
            <span className="text-xs font-bold text-text-primary">PO Ordering Enabled</span>
            <input type="checkbox" checked={form.po_enabled} onChange={(e) => setForm({ ...form, po_enabled: e.target.checked })} className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Min PO Quantity (Kits) <span className="text-danger">*</span></label>
              <input type="number" min={1} required className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary" value={form.min_po_quantity} onChange={(e) => setForm({ ...form, min_po_quantity: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Max PO Quantity Limit</label>
              <input type="number" min={1} placeholder="Leave empty = unlimited" className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.max_po_quantity} onChange={(e) => setForm({ ...form, max_po_quantity: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">PO Validity (Days) <span className="text-danger">*</span></label>
              <input type="number" min={1} required className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.po_validity_days} onChange={(e) => setForm({ ...form, po_validity_days: e.target.value, po_lock_days: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Payment Terms</label>
              <select className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}>
                <option value="FULL_ADVANCE">100% Full Advance</option>
                <option value="PARTIAL_ADVANCE">Partial Advance</option>
                <option value="PAY_BEFORE_DISPATCH">Pay Before Dispatch</option>
                <option value="CREDIT_PERIOD">Credit Terms</option>
              </select>
            </div>
          </div>

          {/* Token Amount Booking Setting */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <FiDollarSign size={14} className="text-emerald-600" />
                Token Amount Booking
              </span>
              <input
                type="checkbox"
                checked={form.token_booking_enabled}
                onChange={(e) => setForm({ ...form, token_booking_enabled: e.target.checked })}
                className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {form.token_booking_enabled && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      token_type: "FIXED_AMOUNT",
                      token_value: prev.token_type === "PERCENTAGE" && Number(prev.token_value) <= 100 ? "50000" : (prev.token_value || "50000")
                    }))}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${form.token_type === "FIXED_AMOUNT"
                        ? "bg-white dark:bg-slate-800 border-emerald-500 text-emerald-700 shadow-xs ring-1 ring-emerald-500/20"
                        : "bg-surface/50 border-border text-text-muted"
                      }`}
                  >
                    Fixed Amount (₹)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      token_type: "PERCENTAGE",
                      token_value: prev.token_type === "FIXED_AMOUNT" && Number(prev.token_value) > 100 ? "10" : (prev.token_value || "10")
                    }))}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${form.token_type === "PERCENTAGE"
                        ? "bg-white dark:bg-slate-800 border-emerald-500 text-emerald-700 shadow-xs ring-1 ring-emerald-500/20"
                        : "bg-surface/50 border-border text-text-muted"
                      }`}
                  >
                    Percentage (%)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      {form.token_type === "FIXED_AMOUNT" ? "Fixed Token (₹) *" : "Token Percentage (%) *"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-bg text-text-primary text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      value={form.token_value ?? ""}
                      onChange={(e) => setForm({ ...form, token_value: e.target.value })}
                      placeholder={form.token_type === "FIXED_AMOUNT" ? "50000" : "10"}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">Lock Duration (Days) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-bg text-text-primary text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      value={form.po_lock_days ?? ""}
                      onChange={(e) => setForm({ ...form, po_lock_days: e.target.value, po_validity_days: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  Token amount auto-adjusts with the franchise&apos;s final loose delivery order.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Effective From <span className="text-danger">*</span></label>
              <input type="date" required className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Effective Until</label>
              <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary" value={form.effective_until} onChange={(e) => setForm({ ...form, effective_until: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-xs font-semibold hover:bg-surface-hover">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover flex items-center justify-center gap-2">
              {saving ? <FiLoader className="animate-spin" size={15} /> : <FiCheck size={15} />}
              {saving ? "Saving..." : "Save PO Settings"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}



