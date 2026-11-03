import React, { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiShoppingCart,
  FiPlus,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiLoader,
  FiSearch,
  FiFileText,
  FiLayers,
  FiUsers,
  FiBox,
  FiDollarSign,
  FiX,
  FiCheck,
  FiChevronRight,
  FiChevronDown,
  FiShield,
  FiArrowRight,
  FiInfo,
  FiCalendar,
  FiGrid,
  FiList,
  FiEye,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiLock,
  FiUnlock,
  FiTruck,
  FiPercent,
  FiCopy,
  FiExternalLink,
  FiAlertTriangle,
  FiCornerDownRight,
  FiCheckSquare,
  FiArchive,
  FiZap,
  FiUserCheck,
  FiPackage,
} from "react-icons/fi";
import api from "../services/api";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", icon: FiFileText },
  PENDING_ALLOCATION: { label: "Pending Allocation", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", icon: FiBox },
  AWAITING_TOKEN_PAYMENT: { label: "Awaiting Token Payment", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", icon: FiDollarSign },
  PO_STARTED: { label: "PO Started", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", icon: FiZap },
  VALIDATING: { label: "Validating...", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-600 dark:text-cyan-400", icon: FiRefreshCw },
  VALIDATED: { label: "Validated ✓", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  SUBMITTED: { label: "Submitted", bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: FiClock },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", icon: FiClock },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", icon: FiAlertCircle },
  APPROVED: { label: "Approved", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  REJECTED: { label: "Rejected", bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", icon: FiX },
  AWAITING_PAYMENT: { label: "Awaiting Payment", bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", icon: FiDollarSign },
  PARTIALLY_PAID: { label: "Partially Paid", bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400", icon: FiDollarSign },
  PAID: { label: "Paid", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  CONFIRMED: { label: "Confirmed", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  PROCESSING: { label: "Processing", bg: "bg-cyan-50 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", icon: FiRefreshCw },
  DISPATCHED: { label: "Dispatched", bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", icon: FiBox },
  DELIVERED: { label: "Delivered", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  COMPLETED: { label: "Completed", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  EXPIRED: { label: "Expired", bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-600 dark:text-rose-400", icon: FiClock },
  REFUND_REQUESTED: { label: "Refund Requested", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", icon: FiClock },
  REFUND_APPROVED: { label: "Refund Approved", bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", icon: FiCheckCircle },
  REFUND_SETTLED: { label: "Refund Settled", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiDollarSign },
  REFUND_REJECTED: { label: "Refund Rejected", bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-600 dark:text-rose-400", icon: FiX },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400", icon: FiX },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
  const Icon = cfg.icon || FiInfo;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-current/20 shadow-2xs whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <Icon size={12} className="shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}

function PoStageStepper({ stepNumber }) {
  const steps = [
    { num: 1, label: "Allocation" },
    { num: 2, label: "Token" },
    { num: 3, label: "Under Review" },
    { num: 4, label: "Active" },
  ];

  return (
    <div className="flex items-center gap-1 mt-1.5">
      {steps.map((s, idx) => {
        const isDone = stepNumber > s.num;
        const isCurrent = stepNumber === s.num;
        return (
          <React.Fragment key={s.num}>
            <div
              className={`flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black transition-all ${isDone
                ? "bg-emerald-500 text-white shadow-2xs"
                : isCurrent
                  ? "bg-primary text-white ring-2 ring-primary/25 scale-105"
                  : "bg-surface-hover text-text-muted border border-border"
                }`}
              title={`Stage ${s.num}: ${s.label}`}
            >
              {isDone ? <FiCheck size={9} /> : s.num}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-2.5 rounded-full transition-all ${stepNumber > s.num ? "bg-emerald-500" : "bg-border"
                  }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// SessionStorage Caching Helpers
const CACHE_KEYS = {
  ORDERS: "solarkits_fpo_orders_v2",
  PLAN: "solarkits_fpo_plan_v2",
  GOAL: "solarkits_fpo_goal_v2",
  BUYERS: "solarkits_fpo_buyers_v2",
};

const getCached = (key, fallback = null) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < 5 * 60 * 1000) return data;
    return fallback;
  } catch {
    return fallback;
  }
};

const setCached = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { }
};

export default function PoOrder() {
  const navigate = useNavigate();

  // Cache Hydration
  const cachedOrders = getCached(CACHE_KEYS.ORDERS, null);
  const cachedPlan = getCached(CACHE_KEYS.PLAN, null);
  const cachedGoal = getCached(CACHE_KEYS.GOAL, null);

  const outletContext = useOutletContext?.() || {};
  const [ordersLoading, setOrdersLoading] = useState(cachedOrders === null);
  const [planLoading, setPlanLoading] = useState(cachedPlan === null);
  const [goalLoading, setGoalLoading] = useState(cachedGoal === null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [planData, setPlanData] = useState(cachedPlan);
  const [epcBuyers, setEpcBuyers] = useState(() => getCached(CACHE_KEYS.BUYERS, []));
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [orders, setOrders] = useState(cachedOrders || []);
  const [goalData, setGoalData] = useState(cachedGoal);
  const [viewMode, setViewMode] = useState("table"); // Default to 'table' view
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const rawAllowed = outletContext?.allowedOrderTypes || outletContext?.allowedOrderType || planData?.plan?.order_type_allowed || outletContext?.reseller?.order_type_allowed || "po_order";
  const allowedOrderTypes = Array.isArray(rawAllowed)
    ? rawAllowed
    : typeof rawAllowed === "string"
      ? (rawAllowed === "both" ? ["po_order", "loose_order"] : rawAllowed.split(",").map((s) => s.trim()))
      : ["po_order"];

  const allowsLoose = allowedOrderTypes.includes("loose_order");
  const allowsCombinePo = allowedOrderTypes.includes("combine_po_order");
  const allowsPo = allowedOrderTypes.includes("po_order");
  const allowsAnyPo = allowsPo || allowsCombinePo;

  const [categoryTab, setCategoryTab] = useState(() => (allowsCombinePo && !allowsPo ? "COMBINE_PO" : "ALL"));
  const [expandedRowId, setExpandedRowId] = useState(null);

  useEffect(() => {
    if (allowsCombinePo && !allowsPo) {
      setCategoryTab((prev) => (prev === "SINGLE_PO" ? "COMBINE_PO" : prev));
      setPoCategory("COMBINE_PO");
    } else if (allowsPo && !allowsCombinePo) {
      setCategoryTab((prev) => (prev === "COMBINE_PO" ? "SINGLE_PO" : prev));
      setPoCategory("SINGLE_PO");
    }
  }, [allowsCombinePo, allowsPo]);

  // ── Quick Filters State & Shop Hierarchy (Matches Screenshot 1) ──
  const [shopHierarchy, setShopHierarchy] = useState([]);
  const [quickFilters, setQuickFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  // ── Create Order Modal State (Stage 1 with ComboKit & Configured PO Qty) ──
  const [createModal, setCreateModal] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState("");
  const [selectedPoQty, setSelectedPoQty] = useState(200);
  const [poCategory, setPoCategory] = useState("SINGLE_PO"); // "SINGLE_PO" | "COMBINE_PO"
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Stage 2: Product & EPC Loose Allocation Modal State (Under Created PO Card) ──
  const [allocateModal, setAllocateModal] = useState(false);
  const [allocatingOrder, setAllocatingOrder] = useState(null);
  const [allocateSingleTarget, setAllocateSingleTarget] = useState("single_epc"); // "single_epc" | "warehouse"
  const [allocateSingleEpcId, setAllocateSingleEpcId] = useState("");
  const [allocateAllocations, setAllocateAllocations] = useState({}); // { [epcBuyerId]: quantity }
  const [allocateSubmitting, setAllocateSubmitting] = useState(false);
  const [allocateError, setAllocateError] = useState("");

  // ── Stage 3: Token Payment Details State ──
  const [tokenModal, setTokenModal] = useState(false);
  const [tokenOrder, setTokenOrder] = useState(null);
  const [tokenPayingEpcId, setTokenPayingEpcId] = useState("");
  const [tokenPayAmount, setTokenPayAmount] = useState(0);
  const [tokenUtr, setTokenUtr] = useState("");
  const [tokenBank, setTokenBank] = useState("");
  const [tokenDate, setTokenDate] = useState(new Date().toISOString().slice(0, 10));
  const [tokenSubmitting, setTokenSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [tokenSuccess, setTokenSuccess] = useState(null);

  // ── Stage 4: Validation State ──
  const [validatingOrderId, setValidatingOrderId] = useState(null);

  // ── Detail Modal State ──
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ── Reorder / Drawdown Modal State (Configured Loose Quantities) ──
  const [reorderModal, setReorderModal] = useState(false);
  const [reorderOrder, setReorderOrder] = useState(null);
  const [reorderQty, setReorderQty] = useState(5);
  const [reorderUtr, setReorderUtr] = useState("");
  const [reorderBank, setReorderBank] = useState("");
  const [reorderDate, setReorderDate] = useState(new Date().toISOString().slice(0, 10));
  const [reorderSubmitting, setReorderSubmitting] = useState(false);
  const [reorderError, setReorderError] = useState("");
  const [reorderSuccess, setReorderSuccess] = useState(null);

  // ── Refund Modal State ──
  const [refundModal, setRefundModal] = useState(false);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundPreview, setRefundPreview] = useState(null);
  const [refundForm, setRefundForm] = useState({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    notes: ""
  });
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundSuccess, setRefundSuccess] = useState(null);

  const [copiedField, setCopiedField] = useState("");

  // Escrow Bank Details for Token Booking
  const escrowBank = {
    account_name: "SolarKits Technologies Pvt Ltd (Escrow Account)",
    bank_name: "ICICI Bank Corporate Banking",
    account_number: "000205018899",
    ifsc_code: "ICIC0000002",
    branch: "Bandra Kurla Complex, Mumbai",
    upi_id: "solarkits.token@icici",
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  // Available ComboKits Catalog with PO Quantities and Loose Quantities & Taxonomy
  const availableKits = useMemo(() => {
    if (Array.isArray(planData?.combo_kits) && planData.combo_kits.length > 0) {
      return planData.combo_kits.map((k) => {
        const poPricing = Array.isArray(k.po_order_pricing)
          ? k.po_order_pricing
          : (Array.isArray(k.poOrderPricing) ? k.poOrderPricing : []);
        const loosePricing = Array.isArray(k.loose_order_pricing)
          ? k.loose_order_pricing
          : (Array.isArray(k.looseOrderPricing) ? k.looseOrderPricing : []);

        const pricingPoQtys = poPricing.map((p) => Number(p.quantity)).filter((n) => !isNaN(n) && n > 0);
        const pricingLooseQtys = loosePricing.map((p) => Number(p.quantity)).filter((n) => !isNaN(n) && n > 0);

        const rawOrderQtys = Array.isArray(k.order_quantities) && k.order_quantities.length > 0
          ? k.order_quantities.map(Number).filter((n) => !isNaN(n) && n > 0)
          : [];
        const orderQtys = Array.from(new Set([...rawOrderQtys, ...pricingPoQtys])).sort((a, b) => a - b);
        const finalOrderQtys = orderQtys.length > 0 ? orderQtys : [200, 500];

        const rawLooseQtys = Array.isArray(k.loose_order_quantities) && k.loose_order_quantities.length > 0
          ? k.loose_order_quantities.map(Number).filter((n) => !isNaN(n) && n > 0)
          : [];
        const looseQtys = Array.from(new Set([...rawLooseQtys, ...pricingLooseQtys])).sort((a, b) => a - b);
        const finalLooseQtys = looseQtys.length > 0 ? looseQtys : [5, 10, 15, 20, 25, 30];

        const price = k.dealer_price || k.selling_price_cached || k.unit_price || k.price || 0;
        const gstRate = k.gst_rate != null && !isNaN(Number(k.gst_rate))
          ? Number(k.gst_rate)
          : (k.tax_pct != null && !isNaN(Number(k.tax_pct))
            ? Number(k.tax_pct)
            : (k.gst_pct != null && !isNaN(Number(k.gst_pct))
              ? Number(k.gst_pct)
              : (k.common_gst_rate != null && !isNaN(Number(k.common_gst_rate)) ? Number(k.common_gst_rate) : 0)));

        return {
          _id: (k._id || k.id)?.toString(),
          id: (k._id || k.id)?.toString(),
          name: k.name || k.kit_name || "Solar ComboKit",
          kit_name: k.name || k.kit_name || "Solar ComboKit",
          capacity_kw: k.capacity_kw || k.capacity || 5,
          system_type: k.system_type || (k.inverter_mode === "hybrid" ? "Hybrid" : (k.inverter_mode === "offgrid" ? "Off-Grid" : "On-Grid")),
          industry_type_name: k.industry_type_name || "Solar PV",
          industry_type_id: k.industry_type_id,
          category_name: k.category_name || "Residential Solar",
          category_id: k.category_id,
          subcategory_name: k.subcategory_name || "Individual Home",
          subcategory_id: k.subcategory_id,
          project_type_name: k.project_type_name || "Rooftop Solar",
          project_type_id: k.project_type_id,
          project_range_label: k.project_range_label || (k.capacity_kw ? `${k.capacity_kw} kW System` : "Standard Range"),
          project_range_id: k.project_range_id,
          min_kw: k.min_kw ?? (k.capacity_kw || 0),
          max_kw: k.max_kw ?? (k.capacity_kw || 0),
          dealer_price: price,
          unit_price: price,
          price: price,
          base_price_paise: Math.round(price * 100),
          token_rate_per_kit_paise: k.token_rate_per_kit_paise || 0,
          trial_kit_quantity: k.trial_kit_quantity || 10,
          is_trial_allowed: k.is_trial_allowed !== false,
          order_quantities: finalOrderQtys,
          loose_order_quantities: finalLooseQtys,
          min_po_quantity: finalOrderQtys[0] || 200,
          specifications: k.description || k.specifications || "High performance solar kit featuring top-tier string inverter and heavy-duty GI mounting structure.",
          po_order_pricing: poPricing,
          poOrderPricing: poPricing,
          loose_order_pricing: loosePricing,
          looseOrderPricing: loosePricing,
          gst_rate: gstRate,
          tax_pct: gstRate,
          gst_pct: gstRate,
          common_gst_rate: gstRate,
        };
      });
    }
    return [];
  }, [planData]);

  // Fetch Shop Hierarchy for Quick Filters
  const fetchHierarchy = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/shop/hierarchy");
      if (res.data?.success || res.data?.status === "success") {
        setShopHierarchy(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load shop hierarchy:", err);
    }
  }, []);

  // ── Cascading Quick Filter Options derived from shopHierarchy & availableKits ──
  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        const name = ind.name;
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ value: name, label: name, id: ind.id || ind._id });
        }
      });
    }

    availableKits.forEach((kit) => {
      const name = kit.industry_type_name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ value: name, label: name, id: kit.industry_type_id });
      }
    });

    return [{ value: "all", label: "All Industry Types" }, ...list];
  }, [shopHierarchy, availableKits]);

  const categoryOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (cat.name && !seen.has(cat.name.toLowerCase())) {
            seen.add(cat.name.toLowerCase());
            list.push({ value: cat.name, label: cat.name, id: cat.id || cat._id });
          }
        });
      });
    }

    availableKits.forEach((kit) => {
      const indOk =
        quickFilters.industryType === "all" ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase();
      if (indOk && kit.category_name && !seen.has(kit.category_name.toLowerCase())) {
        seen.add(kit.category_name.toLowerCase());
        list.push({ value: kit.category_name, label: kit.category_name, id: kit.category_id });
      }
    });

    return [{ value: "all", label: "All Categories" }, ...list];
  }, [shopHierarchy, availableKits, quickFilters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id || cat._id) === String(quickFilters.category);
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              if (sub.name && !seen.has(sub.name.toLowerCase())) {
                seen.add(sub.name.toLowerCase());
                list.push({ value: sub.name, label: sub.name, id: sub.id || sub._id });
              }
            });
          }
        });
      });
    }

    availableKits.forEach((kit) => {
      const indOk =
        quickFilters.industryType === "all" ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase();
      const catOk =
        quickFilters.category === "all" ||
        kit.category_name?.toLowerCase() === quickFilters.category.toLowerCase();
      if (indOk && catOk && kit.subcategory_name && !seen.has(kit.subcategory_name.toLowerCase())) {
        seen.add(kit.subcategory_name.toLowerCase());
        list.push({ value: kit.subcategory_name, label: kit.subcategory_name, id: kit.subcategory_id });
      }
    });

    return [{ value: "all", label: "All Sub-Categories" }, ...list];
  }, [shopHierarchy, availableKits, quickFilters.industryType, quickFilters.category]);

  const systemTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase();
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              const subOk =
                quickFilters.subCategory === "all" ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
              if (subOk) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (mt.name && !seen.has(mt.name.toLowerCase())) {
                    seen.add(mt.name.toLowerCase());
                    list.push({ value: mt.name, label: mt.name, id: mt.id || mt.type_id });
                  }
                });
              }
            });
          }
        });
      });
    }

    availableKits.forEach((kit) => {
      const indOk =
        quickFilters.industryType === "all" ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase();
      const catOk =
        quickFilters.category === "all" ||
        kit.category_name?.toLowerCase() === quickFilters.category.toLowerCase();
      const subOk =
        quickFilters.subCategory === "all" ||
        kit.subcategory_name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
      if (indOk && catOk && subOk) {
        const sys = kit.system_type || "On-Grid";
        if (sys && !seen.has(sys.toLowerCase())) {
          seen.add(sys.toLowerCase());
          list.push({ value: sys, label: sys, id: sys });
        }
      }
    });

    return [{ value: "all", label: "All System Types" }, ...list];
  }, [shopHierarchy, availableKits, quickFilters.industryType, quickFilters.category, quickFilters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase();
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              const subOk =
                quickFilters.subCategory === "all" ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
              if (subOk) {
                (sub.mappedTypes || []).forEach((mt) => {
                  const typeOk =
                    quickFilters.systemType === "all" ||
                    mt.name?.toLowerCase() === quickFilters.systemType.toLowerCase() ||
                    quickFilters.systemType.toLowerCase().includes(mt.name?.toLowerCase());
                  if (typeOk) {
                    (mt.ranges || []).forEach((r) => {
                      const label = r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || 'kW'}`;
                      if (label && !seen.has(label.toLowerCase())) {
                        seen.add(label.toLowerCase());
                        list.push({ value: label, label: label, id: r.id || r._id, min: r.min_value, max: r.max_value });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      });
    }

    availableKits.forEach((kit) => {
      const label = kit.project_range_label || (kit.capacity_kw ? `${kit.capacity_kw} kW System` : null);
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        list.push({ value: label, label: label, id: kit.project_range_id, min: kit.min_kw, max: kit.max_kw });
      }
    });

    return [{ value: "all", label: "All Project Ranges" }, ...list];
  }, [shopHierarchy, availableKits, quickFilters.industryType, quickFilters.category, quickFilters.subCategory, quickFilters.systemType]);

  const handleClearMainFilters = () => {
    setQuickFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
  };

  // Filter availableKits by quickFilters (Matching Criteria)
  const filteredComboKits = useMemo(() => {
    return availableKits.filter((k) => {
      if (!k) return false;

      // 1. Industry filter
      if (quickFilters.industryType !== "all") {
        const indVal = quickFilters.industryType.toLowerCase();
        const kInd = (k.industry_type_name || "").toLowerCase();
        const kIndId = String(k.industry_type_id || "");
        if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) {
          return false;
        }
      }

      // 2. Category filter
      if (quickFilters.category !== "all") {
        const catVal = quickFilters.category.toLowerCase();
        const kCat = (k.category_name || "").toLowerCase();
        const kCatId = String(k.category_id || "");
        if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) {
          return false;
        }
      }

      // 3. Sub Category filter
      if (quickFilters.subCategory !== "all") {
        const subVal = quickFilters.subCategory.toLowerCase();
        const kSub = (k.subcategory_name || "").toLowerCase();
        const kSubId = String(k.subcategory_id || "");
        if (kSub !== subVal && kSubId !== subVal && !kSub.includes(subVal)) {
          return false;
        }
      }

      // 4. System Type filter
      if (quickFilters.systemType !== "all") {
        const sysVal = quickFilters.systemType.toLowerCase();
        const kSys = (k.system_type || "").toLowerCase();
        const kProjType = (k.project_type_name || "").toLowerCase();
        if (kSys !== sysVal && !kSys.includes(sysVal) && !kProjType.includes(sysVal)) {
          return false;
        }
      }

      // 5. Project Range filter
      if (quickFilters.projectRange !== "all") {
        const rangeVal = quickFilters.projectRange.toLowerCase();
        const kRange = (k.project_range_label || "").toLowerCase();
        if (kRange !== rangeVal && !kRange.includes(rangeVal)) {
          const matchedOpt = projectRangeOptions.find((o) => o.value === quickFilters.projectRange);
          if (matchedOpt && matchedOpt.min != null && matchedOpt.max != null) {
            const cap = Number(k.capacity_kw || 0);
            if (cap < matchedOpt.min || cap > matchedOpt.max) return false;
          } else {
            return false;
          }
        }
      }

      return true;
    });
  }, [availableKits, quickFilters, projectRangeOptions]);

  // Selected Kit in Create Modal (prioritizes filtered list)
  const selectedKit = useMemo(() => {
    return (
      filteredComboKits.find((k) => String(k._id) === String(selectedKitId)) ||
      filteredComboKits[0] ||
      availableKits.find((k) => String(k._id) === String(selectedKitId)) ||
      availableKits[0]
    );
  }, [filteredComboKits, availableKits, selectedKitId]);

  // Auto-sync selectedKitId if current selection is excluded by filter
  useEffect(() => {
    if (filteredComboKits.length > 0) {
      const match = filteredComboKits.find((k) => String(k._id) === String(selectedKitId));
      if (!match) {
        setSelectedKitId(filteredComboKits[0]._id);
      }
    }
  }, [filteredComboKits, selectedKitId]);

  // Sync selectedKit and selectedPoQty on kit switch
  useEffect(() => {
    if (selectedKit) {
      const defaultQty = selectedKit.order_quantities?.[0] || selectedKit.min_po_quantity || 200;
      setSelectedPoQty((prev) => (selectedKit.order_quantities?.includes(prev) ? prev : defaultQty));
    }
  }, [selectedKit?._id]);

  // ── 1. Orders Fetch ──
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setOrdersLoading(true);
    try {
      const res = await api.get("/india/v1/reseller/po/my-orders");
      if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
        setCached(CACHE_KEYS.ORDERS, res.data.data);
      }
    } catch (err) {
      console.error("Failed to load PO orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // ── 2. Plan Settings Fetch ──
  const fetchPlanSettings = useCallback(async (isSilent = false) => {
    if (!isSilent) setPlanLoading(true);
    try {
      const res = await api.get("/india/v1/reseller/po/plan-settings");
      if (res.data?.status === "success" && res.data.data) {
        setPlanData(res.data.data);
        setCached(CACHE_KEYS.PLAN, res.data.data);
      }
    } catch (err) {
      console.error("Failed to load plan settings:", err);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  // ── 3. Goal Progress Fetch ──
  const fetchGoal = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/reseller/goals/my-goal");
      if (res.data?.status === "success" && res.data.data) {
        setGoalData(res.data.data);
        setCached(CACHE_KEYS.GOAL, res.data.data);
      }
    } catch (err) {
      console.error("Failed to load goal:", err);
    } finally {
      setGoalLoading(false);
    }
  }, []);

  // ── 4. EPC Buyers Fetch ──
  const fetchBuyers = useCallback(async () => {
    setLoadingBuyers(true);
    try {
      const res = await api.get("/india/v1/reseller/epc-buyers/list");
      if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        setEpcBuyers(res.data.data);
        setCached(CACHE_KEYS.BUYERS, res.data.data);
      }
    } catch (err) {
      console.error("Failed to load EPC buyers:", err);
    } finally {
      setLoadingBuyers(false);
    }
  }, []);

  // Unified Refresh
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchOrders(isSilent),
        fetchPlanSettings(isSilent),
        fetchGoal(),
        fetchHierarchy(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchOrders, fetchPlanSettings, fetchGoal, fetchHierarchy]);

  useEffect(() => {
    fetchData(Boolean(cachedOrders && cachedPlan));
    const timer = setTimeout(() => {
      fetchBuyers();
    }, 1500);

    return () => clearTimeout(timer);
  }, []); // Run ONLY once on mount

  // Calculation for Create Modal
  const targetQuantity = Math.max(1, parseInt(selectedPoQty, 10) || selectedKit?.min_po_quantity || 200);

  // Dynamic GST Rate for Selected Kit (from Admin Company Margin or Kit)
  const kitGstRate = useMemo(() => {
    if (!selectedKit) return 0;
    const rawRate = selectedKit.gst_rate ?? selectedKit.tax_pct ?? selectedKit.gst_pct ?? selectedKit.common_gst_rate;
    if (rawRate !== undefined && rawRate !== null && !isNaN(Number(rawRate))) {
      return Number(rawRate);
    }
    return 0;
  }, [selectedKit]);

  // Find Matched PO Tier for selected targetQuantity from Admin configured po_order_pricing
  const matchedPoTier = useMemo(() => {
    if (!selectedKit) return null;
    const poPricing = selectedKit.po_order_pricing || selectedKit.poOrderPricing;
    if (Array.isArray(poPricing) && poPricing.length > 0) {
      const exactMatch = poPricing.find(
        (t) => Number(t.quantity) === Number(targetQuantity)
      );
      if (exactMatch && Number(exactMatch.price_per_kit) > 0) {
        return exactMatch;
      }
      const lowerTiers = poPricing
        .filter((t) => Number(t.quantity) <= Number(targetQuantity) && Number(t.price_per_kit) > 0)
        .sort((a, b) => Number(b.quantity) - Number(a.quantity));
      if (lowerTiers.length > 0) {
        return lowerTiers[0];
      }
    }
    return null;
  }, [selectedKit, targetQuantity]);

  // Unit Price without GST (Base cost + company margin)
  const tierPriceExclGst = useMemo(() => {
    if (matchedPoTier) {
      if (
        matchedPoTier.base_price !== undefined &&
        matchedPoTier.margin_amount !== undefined &&
        matchedPoTier.margin_amount !== "" &&
        !isNaN(Number(matchedPoTier.margin_amount))
      ) {
        return Number(matchedPoTier.base_price) + Number(matchedPoTier.margin_amount);
      }
      if (Number(matchedPoTier.price_per_kit) > 0) {
        return kitGstRate > 0
          ? Math.round(Number(matchedPoTier.price_per_kit) / (1 + kitGstRate / 100))
          : Number(matchedPoTier.price_per_kit);
      }
    }
    return Number(selectedKit?.dealer_price || selectedKit?.unit_price || selectedKit?.selling_price_cached || 0);
  }, [matchedPoTier, selectedKit, kitGstRate]);

  // Final Per-Kit Price (inclusive of GST)
  const tierPriceWithGst = useMemo(() => {
    if (matchedPoTier && Number(matchedPoTier.price_per_kit) > 0) {
      return Number(matchedPoTier.price_per_kit);
    }
    return Math.round(tierPriceExclGst * (1 + kitGstRate / 100));
  }, [matchedPoTier, tierPriceExclGst, kitGstRate]);

  // kitUnitPrice is the active per-kit price for the selected quota
  const kitUnitPrice = tierPriceWithGst;

  // Flat Token Amount for entire PO Order (Standard ₹35,000 flat, not per kit)
  const poFixedTokenAmount = Number(selectedKit?.token_value || planData?.po_settings?.token_value || 35000);
  const estimatedGrandTotal = targetQuantity * tierPriceWithGst;
  const estimatedSubtotal = targetQuantity * tierPriceExclGst;
  const estimatedGst = Math.max(0, estimatedGrandTotal - estimatedSubtotal);
  const estimatedTokenDeposit = poFixedTokenAmount;

  // ── Open Create PO Modal ──
  const handleOpenCreateModal = () => {
    if (!allowsAnyPo) {
      return;
    }
    setFormError("");
    fetchPlanSettings(true); // Always fetch fresh tier pricing & plan settings
    fetchBuyers();
    fetchHierarchy();
    if (allowsCombinePo && !allowsPo) {
      setPoCategory("COMBINE_PO");
    } else if (allowsPo && !allowsCombinePo) {
      setPoCategory("SINGLE_PO");
    }
    setCreateModal(true);
  };

  // ── Step 1: Submit PO Order Creation (Generates PO Card with selected Product & PO Qty) ──
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormError("");

    if (targetQuantity <= 0) {
      setFormError("Please select a valid PO Quota quantity.");
      return;
    }

    setSubmitting(true);
    try {
      const unitPricePaise = Math.round(tierPriceExclGst * 100);

      const itemPayload = {
        combo_kit_id: selectedKit._id || selectedKit.id,
        kit_id: selectedKit._id || selectedKit.id,
        item_name: selectedKit.name || selectedKit.kit_name,
        quantity: targetQuantity,
        unit_price_paise: unitPricePaise,
        token_rate_paise: 0,
        total_price_paise: Math.round(estimatedGrandTotal * 100),
        subtotal_paise: Math.round(estimatedSubtotal * 100),
        gst_rate: kitGstRate,
        epc_allocations: [],
      };

      const payload = {
        order_type: "po_order",
        po_category: poCategory,
        target_committed_quantity: targetQuantity,
        is_token_booking: true,
        token_amount_paise: poFixedTokenAmount * 100,
        items: [itemPayload],
      };

      const res = await api.post("/india/v1/reseller/po/create", payload);

      if (res.data?.status === "success") {
        setCreateModal(false);
        try {
          sessionStorage.removeItem(CACHE_KEYS.ORDERS);
          sessionStorage.removeItem(CACHE_KEYS.GOAL);
        } catch { }
        await fetchData(true);

        const createdOrder = res.data.data;
        if (createdOrder) {
          // Automatically open Stage 2: EPC & Loose Order Allocation under the newly created card!
          handleOpenAllocateModal(createdOrder);
        }
      } else {
        setFormError(res.data?.message || "Failed to create Purchase Order.");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create Purchase Order.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2: Open Allocate Modal (Under that Created PO Card: Allocate EPC & Loose Orders) ──
  const handleOpenAllocateModal = (order) => {
    setAllocatingOrder(order);
    const existingAllocs = {};
    const firstAlloc = order.items?.[0]?.epc_allocations?.[0];
    if (order.items?.[0]?.epc_allocations?.length > 0) {
      order.items[0].epc_allocations.forEach((a) => {
        const bId = a.epc_buyer_id || a.buyer_id;
        if (bId) existingAllocs[bId] = a.allocated_quantity;
      });
    }
    setAllocateAllocations(existingAllocs);

    if (firstAlloc?.epc_buyer_id) {
      setAllocateSingleTarget("single_epc");
      setAllocateSingleEpcId(firstAlloc.epc_buyer_id);
    } else if (order.epc_id) {
      const epcIdStr = (order.epc_id?._id || order.epc_id)?.toString();
      setAllocateSingleTarget("single_epc");
      setAllocateSingleEpcId(epcIdStr);
    } else {
      setAllocateSingleTarget(epcBuyers.length > 0 ? "single_epc" : "warehouse");
      setAllocateSingleEpcId(epcBuyers[0]?._id || "");
    }

    setAllocateError("");
    fetchBuyers();
    setAllocateModal(true);
  };

  const handleAllocateLooseChange = (buyerId, val) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setAllocateAllocations((prev) => {
      const next = { ...prev };
      if (qty === 0) delete next[buyerId];
      else next[buyerId] = qty;
      return next;
    });
    setAllocateError("");
  };

  const handleSubmitAllocate = async (e) => {
    e.preventDefault();
    setAllocateError("");
    if (!allocatingOrder) return;

    const totalCommitted = allocatingOrder.target_committed_quantity || allocatingOrder.total_booked_quantity || 200;
    const allocItem = allocatingOrder.items?.[0];
    const kitObj = availableKits.find((k) => String(k._id) === String(allocItem?.kit_id || allocItem?.product_id)) || availableKits[0] || {};
    const isCombine = allocatingOrder.po_category === "COMBINE_PO";
    let epcList = [];

    const poTotalTokenPaise = Number(
      allocatingOrder.token_amount_paise ||
      allocItem?.token_rate_paise ||
      (kitObj.token_value ? kitObj.token_value * 100 : (kitObj.token_rate_per_kit_paise || 0))
    );

    if (isCombine) {
      const sum = Object.values(allocateAllocations).reduce((acc, q) => acc + (parseInt(q, 10) || 0), 0);
      if (sum !== totalCommitted) {
        setAllocateError(`Allocations sum (${sum} kits) must equal committed PO quota (${totalCommitted} kits).`);
        return;
      }
      epcList = Object.entries(allocateAllocations)
        .filter(([, q]) => parseInt(q, 10) > 0)
        .map(([buyerId, qty]) => {
          const buyer = epcBuyers.find((b) => (b._id || b.id)?.toString() === buyerId?.toString());
          const allocQ = parseInt(qty, 10);
          const allocTokenPaise = totalCommitted > 0 ? Math.round(poTotalTokenPaise * (allocQ / totalCommitted)) : 0;
          return {
            epc_buyer_id: buyerId,
            buyer_id: buyerId,
            company_name: buyer?.company_name || buyer?.name || "EPC Buyer",
            buyer_name: buyer?.name || buyer?.company_name || "EPC Buyer",
            gstin: buyer?.gstin || null,
            allocated_quantity: allocQ,
            token_amount_paise: allocTokenPaise,
            payment_status: (allocatingOrder.token_paid_paise >= allocTokenPaise && allocTokenPaise > 0) ? "PAID" : "PENDING",
          };
        });
    } else {
      if (allocateSingleTarget === "single_epc") {
        if (!allocateSingleEpcId) {
          setAllocateError("Please select an onboarded EPC Partner, or switch to Warehouse Stock.");
          return;
        }
        const buyer = epcBuyers.find((b) => (b._id || b.id)?.toString() === allocateSingleEpcId?.toString());
        epcList = [
          {
            epc_buyer_id: allocateSingleEpcId,
            company_name: buyer?.company_name || buyer?.name || "EPC Partner",
            buyer_name: buyer?.name || buyer?.company_name || "EPC Partner",
            gstin: buyer?.gstin || null,
            allocated_quantity: totalCommitted,
            token_amount_paise: poTotalTokenPaise,
            payment_status: (allocatingOrder.token_paid_paise >= poTotalTokenPaise && poTotalTokenPaise > 0) ? "PAID" : "PENDING",
          },
        ];
      } else {
        epcList = [
          {
            epc_buyer_id: null,
            company_name: "Franchise Warehouse Stock",
            buyer_name: "Warehouse Stock",
            gstin: null,
            allocated_quantity: totalCommitted,
            token_amount_paise: poTotalTokenPaise,
            payment_status: (allocatingOrder.token_paid_paise >= poTotalTokenPaise && poTotalTokenPaise > 0) ? "PAID" : "PENDING",
          },
        ];
      }
    }

    const allocUnitPricePaise = allocItem?.unit_price_paise != null && Number(allocItem.unit_price_paise) > 0
      ? Number(allocItem.unit_price_paise)
      : (kitObj.base_price_paise || 0);

    const allocGstRate = allocItem?.gst_rate != null
      ? Number(allocItem.gst_rate)
      : (kitObj.gst_rate != null ? Number(kitObj.gst_rate) : 12);

    const allocKitId = allocItem?.kit_id || allocItem?.product_id || kitObj._id;
    const allocItemName = allocItem?.item_name || kitObj.name || "Solar Kit";

    const itemPayload = {
      kit_id: allocKitId,
      product_id: allocKitId,
      item_name: allocItemName,
      quantity: totalCommitted,
      unit_price_paise: allocUnitPricePaise,
      gst_rate: allocGstRate,
      token_rate_paise: poTotalTokenPaise,
      epc_allocations: epcList,
    };

    setAllocateSubmitting(true);
    try {
      const res = await api.put(`/india/v1/reseller/po/${allocatingOrder._id}/allocate`, {
        items: [itemPayload],
      });
      if (res.data?.status === "success") {
        setAllocateModal(false);
        try {
          sessionStorage.removeItem(CACHE_KEYS.ORDERS);
        } catch { }
        await fetchData(true);
      } else {
        setAllocateError(res.data?.message || "Failed to allocate products to PO.");
      }
    } catch (err) {
      setAllocateError(err.response?.data?.message || "Failed to allocate products to PO.");
    } finally {
      setAllocateSubmitting(false);
    }
  };

  // ── Step 3: Open Token Modal & Submit Token Payment ──
  const handleOpenTokenModal = (order, epcBuyerId = null) => {
    setTokenOrder(order);
    const totalTokenReq = Math.round((order.token_amount_paise || 0) / 100);
    const tokenPaidSoFar = Math.round((order.token_paid_paise || 0) / 100);
    const remainingToken = Math.max(0, totalTokenReq - tokenPaidSoFar);

    const defaultEpcId = epcBuyerId || (order.po_category === "SINGLE_PO" && order.items?.[0]?.epc_allocations?.[0]?.epc_buyer_id) || "";
    setTokenPayingEpcId(defaultEpcId);
    setTokenPayAmount(remainingToken > 0 ? remainingToken : totalTokenReq > 0 ? totalTokenReq : 50000);
    setTokenUtr(`ICICI-UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setTokenBank("ICICI Bank Corporate");
    setTokenDate(new Date().toISOString().slice(0, 10));
    setTokenError("");
    setTokenSuccess(null);
    setTokenModal(true);
  };

  const handleSubmitTokenPayment = async (e) => {
    e.preventDefault();
    setTokenError("");
    if (!tokenUtr.trim()) {
      setTokenError("Please enter the UTR / Payment Transaction reference number.");
      return;
    }
    if (!tokenPayAmount || tokenPayAmount <= 0) {
      setTokenError("Please enter a valid token deposit amount.");
      return;
    }

    setTokenSubmitting(true);
    try {
      const payload = {
        epc_buyer_id: tokenPayingEpcId || null,
        utr_number: tokenUtr.trim().toUpperCase(),
        amount_paid: Number(tokenPayAmount),
        sender_bank_name: tokenBank.trim() || "Bank Transfer",
        payment_date: tokenDate,
      };
      const res = await api.post(`/india/v1/reseller/po/${tokenOrder._id}/pay-token`, payload);
      if (res.data?.status === "success") {
        setTokenSuccess(res.data.data);
        try {
          sessionStorage.removeItem(CACHE_KEYS.ORDERS);
        } catch { }
        fetchData(true);
      } else {
        setTokenError(res.data?.message || "Failed to record token payment.");
      }
    } catch (err) {
      setTokenError(err.response?.data?.message || "Failed to record token payment.");
    } finally {
      setTokenSubmitting(false);
    }
  };

  // ── Step 4: Validate PO Order ──
  const handleValidateOrder = async (order) => {
    if (!window.confirm(`Validate PO ${order.po_number}? This will officially lock in prices and enable kit reorders and loose drawdowns.`)) {
      return;
    }
    setValidatingOrderId(order._id);
    try {
      const res = await api.post(`/india/v1/reseller/po/${order._id}/validate`);
      if (res.data?.status === "success") {
        try {
          sessionStorage.removeItem(CACHE_KEYS.ORDERS);
        } catch { }
        await fetchData(true);
      } else {
        alert(res.data?.message || "Failed to validate Purchase Order.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to validate Purchase Order.");
    } finally {
      setValidatingOrderId(null);
    }
  };

  // ── Reorder Handlers (Using Configured Loose Quantities for that ComboKit) ──
  const handleOpenReorderModal = (order) => {
    setReorderOrder(order);
    const kitObj = availableKits.find((k) => String(k._id) === String(order.items?.[0]?.kit_id)) || availableKits[0];
    const booked = order.total_booked_quantity || order.total_quantity || order.items?.[0]?.quantity || 1;
    const fulfilled = order.fulfilled_quantity || 0;
    const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(1, booked - fulfilled);

    // Default to the first loose quantity configured for this kit (e.g. 5 kits or 10 kits)
    const defaultLoose = kitObj.loose_order_quantities?.[0] || 5;
    setReorderQty(Math.min(defaultLoose, remaining));
    setReorderUtr(`REORDER-UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setReorderBank("ICICI Bank");
    setReorderDate(new Date().toISOString().slice(0, 10));
    setReorderError("");
    setReorderSuccess(null);
    setReorderModal(true);
  };

  const handleSubmitReorder = async (e) => {
    e.preventDefault();
    setReorderError("");
    if (!reorderUtr.trim()) {
      setReorderError("Please enter the UTR / Payment Transaction reference number.");
      return;
    }

    const item = reorderOrder?.items?.[0] || {};
    const unitPriceINR = (item.unit_price_paise || 0) / 100;
    const gstRate = item.gst_rate || 12;
    const subtotal = reorderQty * unitPriceINR;
    const grossTotal = Math.round(subtotal + subtotal * (gstRate / 100));

    const totalCommitted = Number(reorderOrder?.total_booked_quantity || item.quantity || 100);
    const totalToken = Math.round((reorderOrder?.token_amount_paise || reorderOrder?.token_paid_paise || 0) / 100);
    const adjustedSoFar = Math.round((reorderOrder?.token_adjusted_total_paise || 0) / 100);
    const availableToken = Math.max(0, totalToken - adjustedSoFar);
    const settlementMode = reorderOrder?.token_settlement_mode || "PRO_RATA";
    const currentRemaining = reorderOrder?.remaining_quantity != null ? reorderOrder.remaining_quantity : totalCommitted;

    let tokenAdjusted = 0;
    if (reorderQty === currentRemaining) {
      tokenAdjusted = Math.min(availableToken, grossTotal);
    } else if (settlementMode === "PRO_RATA") {
      const perKit = totalCommitted > 0 ? Math.floor(totalToken / totalCommitted) : 0;
      tokenAdjusted = Math.min(availableToken, reorderQty * perKit, grossTotal);
    } else {
      tokenAdjusted = Math.min(availableToken, grossTotal);
    }

    const netPayable = Math.max(0, grossTotal - tokenAdjusted);

    setReorderSubmitting(true);
    try {
      const payload = {
        quantity: reorderQty,
        kit_id: item.kit_id || item.product_id,
        offline_payment: {
          payment_method: "offline_bank_transfer",
          utr_number: reorderUtr.trim().toUpperCase(),
          amount_paid: netPayable,
          payment_date: reorderDate,
          sender_bank_name: reorderBank || "Bank Transfer",
        },
      };

      const res = await api.post(`/india/v1/reseller/po/${reorderOrder._id}/reorder`, payload);
      if (res.data?.status === "success") {
        setReorderSuccess({
          orderNumber: res.data.data?.order?.po_number,
          adjusted: res.data.data?.token_adjustment?.token_adjusted_inr,
          payable: res.data.data?.token_adjustment?.net_payable_inr,
        });
        try {
          sessionStorage.removeItem(CACHE_KEYS.ORDERS);
        } catch { }
        fetchOrders(true);
      } else {
        setReorderError(res.data?.message || "Failed to create repeat order.");
      }
    } catch (err) {
      setReorderError(err.response?.data?.message || "Failed to create repeat order.");
    } finally {
      setReorderSubmitting(false);
    }
  };

  // ── Refund Request Handlers ──
  const handleOpenRefundModal = async (order) => {
    setRefundOrder(order);
    setRefundError("");
    setRefundSuccess(null);
    setRefundForm({
      account_holder_name: order.customer_details?.name || order.customer_details?.company_name || "",
      bank_name: "",
      account_number: "",
      confirm_account_number: "",
      ifsc_code: "",
      notes: "PO quota completion / validity settlement",
    });
    setRefundModal(true);
    setRefundLoading(true);

    try {
      const res = await api.get(`/india/v1/reseller/po/${order._id}/penalty-preview`);
      if (res.data?.status === "success") {
        setRefundPreview(res.data.data);
      } else {
        setRefundError(res.data?.message || "Unable to load penalty preview.");
      }
    } catch (err) {
      setRefundError(err.response?.data?.message || "Unable to load penalty preview.");
    } finally {
      setRefundLoading(false);
    }
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    setRefundError("");

    if (!refundForm.account_number.trim()) {
      setRefundError("Please enter your bank account number.");
      return;
    }
    if (refundForm.account_number.trim() !== refundForm.confirm_account_number.trim()) {
      setRefundError("Account number and confirmation do not match.");
      return;
    }
    if (!refundForm.ifsc_code.trim()) {
      setRefundError("Please enter your bank IFSC code.");
      return;
    }

    setRefundSubmitting(true);
    try {
      const payload = {
        bank_details: {
          account_holder_name: refundForm.account_holder_name.trim(),
          bank_name: refundForm.bank_name.trim(),
          account_number: refundForm.account_number.trim(),
          ifsc_code: refundForm.ifsc_code.trim().toUpperCase(),
        },
        reason: refundForm.notes.trim(),
      };

      const res = await api.post(`/india/v1/reseller/po/${refundOrder._id}/request-refund`, payload);
      if (res.data?.status === "success") {
        setRefundSuccess("Refund request submitted successfully! Accounts team will review and process payout.");
        try {
          sessionStorage.removeItem(CACHE_KEYS.ORDERS);
        } catch { }
        fetchOrders(true);
      } else {
        setRefundError(res.data?.message || "Failed to submit refund request.");
      }
    } catch (err) {
      setRefundError(err.response?.data?.message || "Failed to submit refund request.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  // ── Filtered Orders (Top-Level Purchase Orders Only) ──
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Child reorders are nested inside their respective parent PO cards
      if (o.parent_po_id) return false;

      if (categoryTab !== "ALL") {
        if (categoryTab === "SINGLE_PO" && o.po_category === "COMBINE_PO") return false;
        if (categoryTab === "COMBINE_PO" && o.po_category !== "COMBINE_PO") return false;
      }
      if (statusFilter && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const poNum = (o.po_number || "").toLowerCase();
        const kitName = (o.items?.[0]?.item_name || "").toLowerCase();
        const epcName = (o.items?.[0]?.epc_allocations?.[0]?.company_name || "").toLowerCase();
        if (!poNum.includes(q) && !kitName.includes(q) && !epcName.includes(q)) return false;
      }
      return true;
    });
  }, [orders, categoryTab, statusFilter, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 transition-colors">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
              Franchise Quota Hub
            </span>
            <span className="text-xs text-blue-200 font-semibold">
              Plan: {planData?.plan?.name || "Active Franchise"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <FiShoppingCart className="text-amber-400 shrink-0" />
            <span>Purchase Orders & Quota Lock</span>
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
            Choose configured ComboKit blueprints, lock bulk quotas, and allocate loose orders to your onboarded EPC network.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchData(false)}
            disabled={isRefreshing}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer border border-white/10"
            title="Refresh Orders"
          >
            <FiRefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>

          {!allowsAnyPo ? (
            <Link
              to="/loose-order"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black shadow-lg transition-all"
            >
              <FiTruck size={16} />
              <span>Go to Loose Orders</span>
            </Link>
          ) : (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black shadow-lg hover:shadow-xl transition-all cursor-pointer transform active:scale-95"
            >
              <FiPlus size={16} />
              <span>Create {allowsCombinePo && !allowsPo ? "Combine PO" : "Purchase Order"}</span>
            </button>
          )}
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 -top-10 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Advisory Banner for Loose Order Store Types */}
      {!allowsAnyPo && allowsLoose && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>Your store is configured for <strong>Loose Orders only</strong>. Direct Purchase Order creation is disabled for this Store Type.</span>
          </div>
          <Link to="/loose-order" className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 transition-colors shrink-0">
            Open Loose Orders
          </Link>
        </div>
      )}


      {/* ── Control Bar: Tabs, Search, Filter & View Toggle ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-hover rounded-2xl w-fit border border-border">
          <button
            onClick={() => setCategoryTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${categoryTab === "ALL"
              ? "bg-surface text-primary shadow-xs"
              : "text-text-muted hover:text-text-primary"
              }`}
          >
            All Orders ({orders.length})
          </button>
          {allowsPo && (
            <button
              onClick={() => setCategoryTab("SINGLE_PO")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${categoryTab === "SINGLE_PO"
                ? "bg-surface text-primary shadow-xs"
                : "text-text-muted hover:text-text-primary"
                }`}
            >
              Single PO ({orders.filter((o) => o.po_category !== "COMBINE_PO").length})
            </button>
          )}
          {allowsCombinePo && (
            <button
              onClick={() => setCategoryTab("COMBINE_PO")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${categoryTab === "COMBINE_PO"
                ? "bg-surface text-purple-600 shadow-xs"
                : "text-text-muted hover:text-text-primary"
                }`}
            >
              Combine PO ({orders.filter((o) => o.po_category === "COMBINE_PO").length})
            </button>
          )}
        </div>

        {/* Search, Status Filter & View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO#, EPC, Kit..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border text-xs font-bold text-text-primary focus:outline-none focus:border-primary cursor-pointer"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING_ALLOCATION">1. Pending Allocation</option>
            <option value="AWAITING_TOKEN_PAYMENT">2. Awaiting Token</option>
            <option value="PO_STARTED">3. PO Started</option>
            <option value="VALIDATED">4. Validated ✓</option>
            <option value="COMPLETED">Completed</option>
            <option value="REFUND_REQUESTED">Refund Requested</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-hover rounded-xl border border-border">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-surface text-primary shadow-2xs font-bold" : "text-text-muted hover:text-text-primary"
                }`}
              title="Table View (Dense & Fast)"
            >
              <FiList size={15} />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "card" ? "bg-surface text-primary shadow-2xs font-bold" : "text-text-muted hover:text-text-primary"
                }`}
              title="Card View"
            >
              <FiGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Orders Content: High-Density Table View ── */}
      {ordersLoading && orders.length === 0 ? (
        <div
          className="rounded-3xl border shadow-xs overflow-hidden p-8 text-center space-y-3"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <FiLoader size={28} className="animate-spin text-primary mx-auto" />
          <p className="text-xs text-text-muted font-bold">Loading Purchase Orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          className="p-12 text-center rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <FiShoppingCart size={24} />
          </div>
          <h3 className="text-base font-bold text-text-primary">No Purchase Orders Found</h3>
          <p className="text-xs text-text-muted max-w-sm">
            No PO orders match your current filter. Create a new purchase order and select an authorized ComboKit blueprint.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black hover:opacity-90 transition-all cursor-pointer shadow-md"
          >
            + Create New Purchase Order
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div
          className="rounded-2xl border shadow-xs bg-surface transition-all overflow-hidden w-full"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="w-full overflow-hidden">
            <table className="w-full text-left text-xs border-collapse table-auto">
              <thead>
                <tr
                  className="border-b text-[10px] font-bold uppercase tracking-wider text-text-muted select-none"
                  style={{ background: "var(--color-surface-hover, #f8fafc)", borderColor: "var(--color-border)" }}
                >
                  <th className="py-3 px-2.5 font-bold">PO# & Creator</th>
                  <th className="py-3 px-2.5 font-bold">Beneficiary / EPC</th>
                  <th className="py-3 px-2.5 font-bold">Configured ComboKit</th>
                  <th className="py-3 px-2.5 font-bold">Stage & Status</th>
                  <th className="py-3 px-2.5 font-bold">Quota & Progress</th>
                  <th className="py-3 px-2.5 font-bold">Token & Escrow</th>
                  <th className="py-3 px-2.5 font-bold">Rate Lock</th>
                  <th className="py-3 px-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOrders.map((order) => {
                  const item = order.items?.[0] || {};
                  const isCombine = order.po_category === "COMBINE_PO";
                  const singleEpcAlloc = (!isCombine && item.epc_allocations?.length === 1) ? item.epc_allocations[0] : null;
                  const booked = order.total_booked_quantity || order.total_quantity || item.quantity || 0;
                  const fulfilled = order.fulfilled_quantity || 0;
                  const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(0, booked - fulfilled);
                  const progressPct = booked > 0 ? Math.min(100, Math.round((fulfilled / booked) * 100)) : 0;

                  const tokenPaidINR = Math.round((order.token_amount_paise || order.token_paid_paise || 0) / 100);
                  const tokenAdjustedINR = Math.round((order.token_adjusted_total_paise || 0) / 100);
                  const tokenBalanceINR = order.token_balance_paise != null
                    ? Math.round(order.token_balance_paise / 100)
                    : Math.max(0, tokenPaidINR - tokenAdjustedINR);

                  const expiryDate = order.lock_expires_at || order.expires_at;
                  const daysLeft = expiryDate
                    ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : 30;
                  const isExpired = order.status === "EXPIRED" || (expiryDate && new Date(expiryDate).getTime() < Date.now());

                  const isBdeCreated = order.created_by_role === "BDE";
                  const isExpanded = expandedRowId === order._id;

                  // Stage calculations
                  const isValidated = order.status === "VALIDATED" || ["APPROVED", "CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(order.status);
                  const isPoStarted = order.status === "PO_STARTED";
                  const isAwaitingToken = order.status === "AWAITING_TOKEN_PAYMENT";
                  const isPendingAlloc = order.status === "PENDING_ALLOCATION" || (item.epc_allocations || []).length === 0;

                  let stepNumber = 1;
                  if (isValidated) stepNumber = 4;
                  else if (isPoStarted) stepNumber = 3;
                  else if (isAwaitingToken) stepNumber = 2;

                  return (
                    <Fragment key={order._id}>
                      <tr className={`transition-colors duration-150 ${isExpanded ? "bg-surface-hover/80" : "hover:bg-surface-hover/50"}`}>
                        {/* 1. PO Number & Creator */}
                        <td className="py-3 px-2.5 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-text-primary text-[11px] tracking-tight bg-surface-hover px-1.5 py-0.5 rounded border border-border select-all whitespace-nowrap">
                                {order.po_number}
                              </span>
                              <button
                                onClick={() => handleCopy(order.po_number, `po-${order._id}`)}
                                className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-surface-hover transition-colors cursor-pointer"
                                title="Copy PO Number"
                              >
                                {copiedField === `po-${order._id}` ? (
                                  <FiCheck size={11} className="text-emerald-500" />
                                ) : (
                                  <FiCopy size={11} />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-text-muted">
                              <span>
                                {new Date(order.created_at || order.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${isBdeCreated
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                  }`}
                              >
                                {isBdeCreated ? `BDE: ${order.creator_name || "Officer"}` : "Direct"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Beneficiary / Destination */}
                        <td className="py-3 px-2.5 align-middle">
                          {isCombine ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 w-fit whitespace-nowrap">
                                <FiUsers size={10} className="text-purple-600 dark:text-purple-400 shrink-0" />
                                <span>Combine ({(item.epc_allocations || []).length})</span>
                              </span>
                              <div className="text-[10px] text-text-muted truncate max-w-[130px]" title={(item.epc_allocations || []).map((a) => a.company_name || a.buyer_name).join(", ")}>
                                {(item.epc_allocations || []).map((a) => a.company_name || a.buyer_name).slice(0, 2).join(", ")}
                              </div>
                            </div>
                          ) : singleEpcAlloc ? (
                            <div className="flex flex-col">
                              <div className="font-bold text-text-primary text-[11px] truncate max-w-[130px]" title={singleEpcAlloc.company_name || singleEpcAlloc.buyer_name}>
                                {singleEpcAlloc.company_name || singleEpcAlloc.buyer_name || "Single EPC"}
                              </div>
                              <div className="text-[10px] text-text-muted truncate max-w-[130px]">
                                {singleEpcAlloc.gstin ? singleEpcAlloc.gstin : "Registered EPC"}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-text-secondary border border-border whitespace-nowrap">
                              <FiBox size={10} className="text-text-muted" />
                              <span>Warehouse</span>
                            </span>
                          )}
                        </td>

                        {/* 3. Configured ComboKit */}
                        <td className="py-3 px-2.5 align-middle">
                          <div className="flex flex-col gap-0.5 max-w-[140px]">
                            <div className="font-bold text-text-primary text-[11px] truncate leading-tight" title={item.item_name || "Solar ComboKit"}>
                              {item.item_name || "Solar ComboKit"}
                            </div>
                            <div className="flex items-center gap-1">
                              {item.unit_price_paise && (
                                <span className="font-mono font-bold text-[10px] text-text-secondary">
                                  ₹{Math.round((item.unit_price_paise || 0) / 100).toLocaleString("en-IN")}
                                  <span className="text-[9px] text-text-muted font-sans ml-0.5">/kit</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 4. Stage & Status */}
                        <td className="py-3 px-2.5 align-middle">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={order.status} />
                            <PoStageStepper stepNumber={stepNumber} />
                          </div>
                        </td>

                        {/* 5. Quota & Progress */}
                        <td className="py-3 px-2.5 align-middle">
                          <div className="flex flex-col gap-1 min-w-[100px] max-w-[130px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-text-primary">{booked} Kits</span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                {remaining} Left
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden border border-border/80">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-text-muted flex items-center justify-between">
                              <span>{fulfilled} Fulfilled</span>
                              <span className="font-bold text-text-secondary">{progressPct}%</span>
                            </div>
                          </div>
                        </td>

                        {/* 6. Token & Escrow */}
                        <td className="py-3 px-2.5 align-middle">
                          <div className="flex flex-col gap-0.5 min-w-[90px]">
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-text-primary text-[11px]">
                                ₹{tokenPaidINR.toLocaleString("en-IN")}
                              </span>
                              {tokenPaidINR > 0 && (
                                <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded border border-emerald-200/60">
                                  Paid
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              Bal: <span className="font-mono font-medium text-text-secondary">₹{tokenBalanceINR.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </td>

                        {/* 7. Rate Lock Validity */}
                        <td className="py-3 px-2.5 align-middle">
                          <div className="flex flex-col min-w-[65px]">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
                                Expired
                              </span>
                            ) : (
                              <>
                                <div className="flex items-center gap-1">
                                  <FiLock size={10} className={daysLeft <= 15 ? "text-amber-500" : "text-text-muted"} />
                                  <span className={`text-[11px] font-bold ${daysLeft <= 15 ? "text-amber-600 dark:text-amber-400" : "text-text-primary"}`}>
                                    {daysLeft}d
                                  </span>
                                </div>
                                <div className="text-[9px] text-text-muted">Price Lock</div>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 8. Action Controls */}
                        <td className="py-3 px-2.5 align-middle text-right">
                          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                            {isPendingAlloc && (
                              <button
                                onClick={() => handleOpenAllocateModal(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all cursor-pointer"
                              >
                                <FiBox size={11} />
                                <span>Allocate</span>
                              </button>
                            )}

                            {isPoStarted && (
                              <button
                                onClick={() => handleValidateOrder(order)}
                                disabled={validatingOrderId === order._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                {validatingOrderId === order._id ? (
                                  <FiLoader size={11} className="animate-spin" />
                                ) : (
                                  <FiCheckCircle size={11} />
                                )}
                                <span>Validate</span>
                              </button>
                            )}

                            {isValidated && (
                              remaining > 0 ? (
                                <button
                                  onClick={() => handleOpenReorderModal(order)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary hover:opacity-90 text-white shadow-2xs transition-all cursor-pointer"
                                >
                                  <FiPlus size={11} />
                                  <span>Reorder</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                  <FiCheck size={10} /> Fulfilled
                                </span>
                              )
                            )}

                            {/* Secondary Action: View Details */}
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1 rounded-lg text-text-secondary hover:text-text-primary bg-surface-hover hover:bg-border/60 border border-border transition-all cursor-pointer"
                              title="Full PO Breakdown & Logs"
                            >
                              <FiEye size={12} />
                            </button>

                            {/* Expand/Collapse Toggle */}
                            <button
                              onClick={() => setExpandedRowId(isExpanded ? null : order._id)}
                              className={`p-1 rounded-lg transition-all cursor-pointer border ${isExpanded
                                ? "bg-surface-hover text-text-primary border-border"
                                : "text-text-muted hover:text-text-primary bg-surface-hover/60 hover:bg-surface-hover border-border/80"
                                }`}
                              title="Toggle Details"
                            >
                              <FiChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Inline Details Row */}
                      {isExpanded && (
                        <tr className="bg-surface-hover/40 border-b border-border">
                          <td colSpan={8} className="p-4 sm:p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* EPC Allocation Split */}
                              <div className="p-3.5 rounded-2xl bg-surface border border-border shadow-2xs space-y-2.5">
                                <div className="font-bold text-text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                  <FiUsers size={13} className="text-primary" /> EPC Allocations Breakdown
                                </div>
                                {(item.epc_allocations || []).length === 0 ? (
                                  <div className="space-y-2.5 pt-1">
                                    <p className="text-[11px] text-text-muted">No EPC split registered (Franchise Stock or Pending).</p>
                                    <button
                                      onClick={() => handleOpenAllocateModal(order)}
                                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                                    >
                                      + Allocate EPCs & Loose Quantities
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {item.epc_allocations.map((alloc, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-[11px] p-2.5 rounded-xl bg-surface-hover border border-border/60">
                                        <div className="truncate max-w-[160px]">
                                          <div className="font-bold text-text-primary truncate">{alloc.company_name || alloc.buyer_name}</div>
                                          <div className="text-[9px] text-text-muted">{alloc.gstin || "Direct Partner"}</div>
                                        </div>
                                        <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                          {alloc.allocated_quantity} Kits
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Escrow Bank & UTR Info */}
                              <div className="p-3.5 rounded-2xl bg-surface border border-border shadow-2xs space-y-2">
                                <div className="font-bold text-text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                  <FiShield size={13} className="text-emerald-500" /> Escrow Deposit Info
                                </div>
                                <div className="space-y-1 text-[11px]">
                                  <div className="text-text-muted flex justify-between">
                                    <span>Account:</span>
                                    <strong className="text-text-primary font-mono select-all">{escrowBank.account_number}</strong>
                                  </div>
                                  <div className="text-text-muted flex justify-between">
                                    <span>IFSC:</span>
                                    <strong className="text-text-primary font-mono select-all">{escrowBank.ifsc_code}</strong>
                                  </div>
                                  <div className="text-text-muted flex justify-between">
                                    <span>Bank:</span>
                                    <strong className="text-text-primary truncate max-w-[150px]">{escrowBank.bank_name}</strong>
                                  </div>
                                  <div className="text-text-muted flex justify-between pt-1 border-t border-border/50">
                                    <span>UTR Ref:</span>
                                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono select-all">{order.payment_utr || order.utr_number || "Pending Deposit"}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Timeline & Reorder Count */}
                              <div className="p-3.5 rounded-2xl bg-surface border border-border shadow-2xs space-y-2.5">
                                <div className="font-bold text-text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                  <FiLayers size={13} className="text-blue-500" /> Repeat Orders (Drawdowns)
                                </div>
                                <div className="space-y-1 text-[11px] text-text-muted">
                                  <div className="flex justify-between">
                                    <span>Drawdowns Placed:</span>
                                    <strong className="text-text-primary font-bold">{(order.linked_repeat_orders || []).length} Orders</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Rate Validity:</span>
                                    <strong className="text-text-primary font-bold">{order.po_settings_snapshot?.po_validity_days || 30} Days Guaranteed</strong>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="w-full py-2 rounded-xl bg-surface-hover hover:bg-border text-text-primary text-[11px] font-bold border border-border transition-colors cursor-pointer text-center"
                                >
                                  View Full Breakdown & Logs →
                                </button>
                              </div>
                            </div>

                            {/* ── Dedicated Nested Reorders Table Under PO Card ── */}
                            <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                    <FiLayers size={14} />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                                      Drawdowns & Reorders Under PO: <span className="font-mono text-primary">{order.po_number}</span>
                                    </h4>
                                    <p className="text-[10px] text-text-muted">
                                      All loose kit deliveries drawn from this locked quota with pro-rata one-time token deduction.
                                    </p>
                                  </div>
                                </div>
                                {isValidated && remaining > 0 && (
                                  <button
                                    onClick={() => handleOpenReorderModal(order)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary hover:opacity-90 text-white shadow-xs transition-all cursor-pointer"
                                  >
                                    <FiPlus size={12} />
                                    <span> Place Reorder</span>
                                  </button>
                                )}
                              </div>

                              {(order.linked_repeat_orders || []).length === 0 ? (
                                <div className="p-4 rounded-xl bg-surface-hover/60 border border-dashed border-border text-center">
                                  <p className="text-[11px] text-text-muted font-medium">
                                    No drawdowns placed against this PO yet. Click "+ Place Reorder" to draw kits from the {remaining} remaining quota.
                                  </p>
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-border/80 bg-surface">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface-hover/80">
                                        <th className="py-2.5 px-3">Reorder Ref #</th>
                                        <th className="py-2.5 px-3">Order Date</th>
                                        <th className="py-2.5 px-3">Beneficiary / Buyer</th>
                                        <th className="py-2.5 px-3">Kits Drawn</th>
                                        <th className="py-2.5 px-3">Token Escrow Adjusted</th>
                                        <th className="py-2.5 px-3">Net Paid</th>
                                        <th className="py-2.5 px-3">Payment UTR</th>
                                        <th className="py-2.5 px-3 text-right">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60 text-[11px]">
                                      {order.linked_repeat_orders.map((child, cIdx) => {
                                        const childQty = child.items?.[0]?.quantity || child.total_quantity || 1;
                                        const childTokenAdj = Math.round((child.token_adjusted_paise || 0) / 100);
                                        const childNetPaid = Math.round((child.net_payable_paise || child.grand_total_paise || 0) / 100);
                                        const childBuyer = child.epc_id?.name || child.epc_id?.company_name || child.customer_details?.company_name || child.customer_details?.name || "Direct Reseller";
                                        return (
                                          <tr key={child._id || cIdx} className="hover:bg-surface-hover/40 transition-colors">
                                            <td className="py-2 px-3 font-mono font-bold text-text-primary">
                                              {child.po_number || `ORD-R${cIdx + 1}`}
                                            </td>
                                            <td className="py-2 px-3 text-text-muted">
                                              {new Date(child.created_at || child.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                              })}
                                            </td>
                                            <td className="py-2 px-3 text-text-secondary truncate max-w-[140px]">
                                              {childBuyer}
                                            </td>
                                            <td className="py-2 px-3 font-bold text-text-primary">
                                              <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                {childQty} Kits
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                              {childTokenAdj > 0 ? `-₹${childTokenAdj.toLocaleString("en-IN")}` : "₹0"}
                                            </td>
                                            <td className="py-2 px-3 font-mono font-bold text-text-primary">
                                              ₹{childNetPaid.toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-2 px-3 font-mono text-text-muted text-[10px] select-all">
                                              {child.payment_utr || child.offline_payment?.utr_number || "—"}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                              <StatusBadge status={child.status} />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Alternative Compact Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="p-5 rounded-3xl border shadow-xs flex flex-col justify-between gap-4"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-text-primary px-2 py-0.5 rounded-lg bg-surface-hover border border-border">
                    {order.po_number}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-sm line-clamp-1">
                    {order.items?.[0]?.item_name || "Solar ComboKit"}
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {order.po_category === "COMBINE_PO" ? `Combine PO (${order.items?.[0]?.epc_allocations?.length || 0} EPCs)` : "Single PO Allocation"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-surface-hover text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Quota:</span>
                    <span className="font-bold text-text-primary">{order.total_booked_quantity || 0} Kits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Remaining:</span>
                    <span className="font-bold text-emerald-600">{order.remaining_quantity || 0} Kits</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold text-text-secondary hover:bg-surface-hover"
                >
                  View Details
                </button>
                {order.status === "VALIDATED" && (order.remaining_quantity || 0) > 0 && (
                  <button
                    onClick={() => handleOpenReorderModal(order)}
                    className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold"
                  >
                    ⚡ Reorder
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          STEP 1: CREATE PURCHASE ORDER MODAL
          (Choose ComboKit -> Choose Configured PO Qty -> Generate PO Card)
      ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {createModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => !submitting && setCreateModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                      Step 1 of 2: Create PO Card
                    </span>
                    <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                      <FiShoppingCart className="text-primary" /> Create Purchase Order
                    </h2>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Filter and choose an authorized Solar ComboKit blueprint, then select your configured PO Quota to generate your PO card.
                  </p>
                </div>
                <button
                  onClick={() => setCreateModal(false)}
                  disabled={submitting}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
                    <FiAlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* ── QUICK FILTERS COMPONENT (Matching Screenshot 1) ── */}
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <FiPackage className="text-primary" size={18} />
                      <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                        Quick Filters
                        <span className="text-[11px] font-semibold text-text-muted px-2 py-0.5 rounded-full bg-surface border border-border">
                          {filteredComboKits.length} of {availableKits.length} Kits
                        </span>
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearMainFilters}
                      className="text-xs font-semibold text-primary hover:underline transition cursor-pointer"
                    >
                      Clear Main
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* 1. Industry Type */}
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        1. Industry Type
                      </label>
                      <div className="relative">
                        <select
                          value={quickFilters.industryType}
                          onChange={(e) =>
                            setQuickFilters((prev) => ({
                              ...prev,
                              industryType: e.target.value,
                              category: "all",
                              subCategory: "all",
                              systemType: "all",
                              projectRange: "all",
                            }))
                          }
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8 cursor-pointer"
                        >
                          {industryTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                      </div>
                    </div>

                    {/* 2. Category */}
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        2. Category
                      </label>
                      <div className="relative">
                        <select
                          value={quickFilters.category}
                          onChange={(e) =>
                            setQuickFilters((prev) => ({
                              ...prev,
                              category: e.target.value,
                              subCategory: "all",
                              systemType: "all",
                              projectRange: "all",
                            }))
                          }
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8 cursor-pointer"
                        >
                          {categoryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                      </div>
                    </div>

                    {/* 3. Sub Category */}
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        3. Sub Category
                      </label>
                      <div className="relative">
                        <select
                          value={quickFilters.subCategory}
                          onChange={(e) =>
                            setQuickFilters((prev) => ({
                              ...prev,
                              subCategory: e.target.value,
                            }))
                          }
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8 cursor-pointer"
                        >
                          {subCategoryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                      </div>
                    </div>

                    {/* 4. System Type */}
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        4. System Type
                      </label>
                      <div className="relative">
                        <select
                          value={quickFilters.systemType}
                          onChange={(e) =>
                            setQuickFilters((prev) => ({
                              ...prev,
                              systemType: e.target.value,
                            }))
                          }
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8 cursor-pointer"
                        >
                          {systemTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                      </div>
                    </div>

                    {/* 5. Project Range */}
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">
                        5. Project Range
                      </label>
                      <div className="relative">
                        <select
                          value={quickFilters.projectRange}
                          onChange={(e) =>
                            setQuickFilters((prev) => ({
                              ...prev,
                              projectRange: e.target.value,
                            }))
                          }
                          className="w-full appearance-none px-3 py-2 text-xs font-medium bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8 cursor-pointer"
                        >
                          {projectRangeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 1. CHOOSE AUTHORIZED SOLAR COMBOKIT (Dropdown & Overview Card) ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                      1. Choose Authorized Solar ComboKit <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-text-muted">
                      {filteredComboKits.length} kits match filter
                    </span>
                  </div>

                  {filteredComboKits.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 bg-surface">
                      <FiAlertCircle size={24} className="text-amber-500" />
                      <p className="text-xs font-bold text-text-primary">No ComboKits found matching the selected Quick Filters</p>
                      <p className="text-[11px] text-text-muted">Try resetting or selecting different Industry, Category, or System Type filters.</p>
                      <button
                        type="button"
                        onClick={handleClearMainFilters}
                        className="mt-2 px-4 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Clear Quick Filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* ComboKit Dropdown Selection */}
                      <div className="relative">
                        <select
                          value={selectedKitId || ""}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setSelectedKitId(newId);
                            const kit = availableKits.find((k) => String(k._id) === String(newId));
                            if (kit) {
                              const firstQty = kit.order_quantities?.[0] || kit.min_po_quantity || 200;
                              setSelectedPoQty(firstQty);
                            }
                          }}
                          className="w-full appearance-none px-4 py-3 text-xs font-bold bg-surface border-2 border-border hover:border-primary/50 focus:border-primary rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10 cursor-pointer shadow-xs transition"
                        >
                          {filteredComboKits.map((kit) => {
                            const priceINR = kit.dealer_price || kit.unit_price || kit.selling_price_cached || 0;
                            return (
                              <option key={kit._id} value={kit._id}>
                                {kit.name} — {kit.capacity_kw} kW • {kit.system_type}{kit.category_name ? ` • ${kit.category_name}` : ""}{priceINR > 0 ? ` (₹${priceINR.toLocaleString("en-IN")}/kit)` : ""}
                              </option>
                            );
                          })}
                        </select>
                        <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={16} />
                      </div>

                      {/* Selected Kit Detailed Overview Card */}
                      {selectedKit && (
                        <div className="p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 bg-primary text-white">
                                <FiCheck size={12} />
                              </div>
                              <span className="font-black text-xs text-text-primary">{selectedKit.name}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-500/10 text-blue-600 shrink-0">
                                {selectedKit.capacity_kw} kW • {selectedKit.system_type}
                              </span>
                              {selectedKit.category_name && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface text-text-muted border border-border/80 shrink-0">
                                  {selectedKit.category_name}
                                </span>
                              )}
                            </div>
                            {selectedKit.specifications && (
                              <p className="text-[11px] text-text-muted leading-tight pl-7">
                                {selectedKit.specifications}
                              </p>
                            )}
                          </div>

                          <div className="sm:text-right pl-7 sm:pl-0 shrink-0">
                            <div className="text-sm font-black text-text-primary">
                              {kitUnitPrice > 0 ? (
                                <>₹{kitUnitPrice.toLocaleString("en-IN")}<span className="text-[10px] font-normal text-text-muted">/kit</span></>
                              ) : (
                                <span className="text-xs text-amber-600 font-semibold">Price Pending</span>
                              )}
                            </div>
                            <div className="text-[10px] font-semibold text-text-muted mt-0.5">
                              {matchedPoTier ? `Tier Price (${targetQuantity} Kits)` : "Dealer Unit Price"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── 2-COLUMN LOWER SECTION (PO Quota, Category & Summary) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                  {/* Left Column: PO Quota & Type (7 cols) */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* ── 2. CHOOSE CONFIGURED PO QUANTITY FOR SELECTED KIT ── */}
                    <div
                      className="p-4 sm:p-5 rounded-2xl border space-y-3"
                      style={{ background: "var(--color-surface-hover, #f8fafc)", borderColor: "var(--color-border)" }}
                    >
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                          2. Choose PO Order Quota for {selectedKit?.name} <span className="text-rose-500">*</span>
                        </label>
                      </div>

                      {/* Configured PO Qty Options */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                          Configured PO Qty Options:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(selectedKit?.order_quantities && selectedKit.order_quantities.length > 0
                            ? selectedKit.order_quantities
                            : [selectedKit?.min_po_quantity || 200]
                          ).map((qty) => {
                            const tierMatch = (selectedKit?.po_order_pricing || []).find((t) => Number(t.quantity) === Number(qty));
                            const tierPrice = tierMatch?.price_per_kit > 0 ? tierMatch.price_per_kit : null;
                            return (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => setSelectedPoQty(qty)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border flex flex-col items-center justify-center ${selectedPoQty === qty
                                  ? "bg-amber-500 text-white border-amber-500 shadow-xs scale-105"
                                  : "bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border-amber-500/20"
                                  }`}
                              >
                                <span>{qty} KITS</span>
                                {tierPrice && (
                                  <span className={`text-[9px] font-bold ${selectedPoQty === qty ? "text-amber-100" : "text-amber-700"}`}>
                                    ₹{tierPrice.toLocaleString("en-IN")}/kit
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* ── 3. SELECT PO CATEGORY ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                          3. Purchase Order Type <span className="text-rose-500">*</span>
                        </label>
                        {allowsCombinePo && !allowsPo && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200">
                            Locked to Combine PO by Store Type
                          </span>
                        )}
                        {allowsPo && !allowsCombinePo && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            Locked to Single PO by Store Type
                          </span>
                        )}
                        {allowsPo && allowsCombinePo && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                            All PO Types Permitted
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Single PO Card */}
                        <div
                          onClick={() => {
                            if (allowsPo) {
                              setPoCategory("SINGLE_PO");
                            }
                          }}
                          className={`p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${!allowsPo
                            ? "opacity-40 cursor-not-allowed border-border bg-surface-hover"
                            : "cursor-pointer " + (poCategory === "SINGLE_PO"
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-border hover:border-primary/40 bg-surface")
                            }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${poCategory === "SINGLE_PO" && allowsPo ? "bg-primary text-white" : "bg-primary/10 text-primary"
                            }`}>
                            <FiUserCheck size={16} />
                          </div>
                          <div>
                            <div className="font-black text-xs text-text-primary flex items-center gap-1">
                              Single PO
                              {poCategory === "SINGLE_PO" && allowsPo && <FiCheck className="text-primary" size={13} />}
                            </div>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                              Dedicated to 1 EPC Partner or Franchise Warehouse stock.
                            </p>
                            {!allowsPo && (
                              <span className="text-[10px] text-rose-500 font-bold block mt-1">Not permitted for this store plan</span>
                            )}
                          </div>
                        </div>

                        {/* Combine PO Card */}
                        <div
                          onClick={() => {
                            if (allowsCombinePo) {
                              setPoCategory("COMBINE_PO");
                            }
                          }}
                          className={`p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${!allowsCombinePo
                            ? "opacity-40 cursor-not-allowed border-border bg-surface-hover"
                            : "cursor-pointer " + (poCategory === "COMBINE_PO"
                              ? "border-purple-600 bg-purple-500/5 shadow-xs"
                              : "border-border hover:border-purple-400 bg-surface")
                            }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${poCategory === "COMBINE_PO" && allowsCombinePo ? "bg-purple-600 text-white" : "bg-purple-500/10 text-purple-600"
                            }`}>
                            <FiUsers size={16} />
                          </div>
                          <div>
                            <div className="font-black text-xs text-text-primary flex items-center gap-1">
                              Combine PO (Multi-EPC)
                              {poCategory === "COMBINE_PO" && allowsCombinePo && <FiCheck className="text-purple-600" size={13} />}
                            </div>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                              Pool demand across multiple onboarded EPC contractors.
                            </p>
                            {!allowsCombinePo && (
                              <span className="text-[10px] text-rose-500 font-bold block mt-1">Not permitted for this store plan</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Order Summary & Guidance (5 cols) */}
                  <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                    {/* ── 4. LIVE ORDER & TOKEN SUMMARY ── */}
                    <div
                      className="p-5 rounded-2xl border space-y-3"
                      style={{ background: "var(--color-surface-hover, #f8fafc)", borderColor: "var(--color-border)" }}
                    >
                      <div className="font-bold text-xs uppercase tracking-wider text-text-muted pb-1 border-b border-border/50">
                        Order Value Breakdown
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted uppercase tracking-wider text-[10px] font-bold">Selected ComboKit:</span>
                        <span className="font-bold text-text-primary text-right max-w-[200px] truncate" title={selectedKit?.name}>
                          {selectedKit?.name}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted uppercase tracking-wider text-[10px] font-bold">Capacity & Type:</span>
                        <span className="font-bold text-text-primary">{selectedKit?.capacity_kw} kW • {selectedKit?.system_type}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted uppercase tracking-wider text-[10px] font-bold">Committed Quota:</span>
                        <span className="font-black text-sm text-primary">
                          {targetQuantity} Kits Total
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted uppercase tracking-wider text-[10px] font-bold">Kit Unit Price:</span>
                        <div className="text-right">
                          <span className="font-bold text-text-primary">
                            ₹{kitUnitPrice.toLocaleString("en-IN")}/kit
                          </span>
                          {matchedPoTier && (
                            <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Tier Price ({targetQuantity} Kits)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2">
                        <span className="text-text-muted">Total Value (incl. {kitGstRate}% GST):</span>
                        <span className="font-black text-base text-text-primary">₹{estimatedGrandTotal.toLocaleString("en-IN")}</span>
                      </div>

                      {/* Highlighted PO Token Booking Deposit Card */}
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5 mt-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <FiDollarSign className="text-emerald-600 dark:text-emerald-400" size={14} />
                            PO Token Booking Deposit:
                          </span>
                          <span className="font-black text-sm text-emerald-700 dark:text-emerald-200">
                            ₹{poFixedTokenAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-700/90 dark:text-emerald-400/90 flex flex-col gap-0.5 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                          <div className="flex justify-between items-center font-medium">
                            <span>Flat Deposit for entire {targetQuantity} Kits PO</span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">Not per kit</span>
                          </div>
                          <div className="text-[9px] text-text-muted">
                            Adjustable against loose orders at ₹{targetQuantity > 0 ? Math.round(poFixedTokenAmount / targetQuantity).toLocaleString("en-IN") : 0}/kit upon dispatch.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Workflow Guidance Banner */}
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                      <FiInfo size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        Once created, the <strong>PO Card</strong> will appear on your dashboard with this configured product and quota. You can then allocate loose orders to EPC partners and record the flat ₹{poFixedTokenAmount.toLocaleString("en-IN")} token payment.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateModal(false)}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl border text-xs font-bold text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || targetQuantity <= 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-lg hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <FiLoader size={14} className="animate-spin" />
                        <span>Generating PO Card...</span>
                      </>
                    ) : (
                      <>
                        <FiPlus size={14} />
                        <span>Create PO Order (Generate Card) →</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────────────────
          STAGE 2: ALLOCATE EPC & LOOSE ORDERS (Under Created PO Card)
      ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {allocateModal && allocatingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => !allocateSubmitting && setAllocateModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              {(() => {
                const currentKit = availableKits.find((k) => String(k._id) === String(allocatingOrder.items?.[0]?.kit_id)) || availableKits[0];
                const totalQuota = allocatingOrder.target_committed_quantity || allocatingOrder.total_booked_quantity || 200;
                const allocatedSum = allocatingOrder.po_category === "COMBINE_PO"
                  ? Object.values(allocateAllocations).reduce((sum, q) => sum + (parseInt(q, 10) || 0), 0)
                  : totalQuota;
                const remainingToAssign = totalQuota - allocatedSum;

                return (
                  <>
                    <div className="p-6 border-b border-border flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            Stage 2: EPC & Loose Order Allocation
                          </span>
                          <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                            <FiBox className="text-blue-600" /> Allocate to EPC Contractors
                          </h2>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          PO: <strong className="text-text-primary font-mono">{allocatingOrder.po_number}</strong> • Kit: <strong className="text-primary">{currentKit.name}</strong> • Quota: <strong className="text-primary">{totalQuota} Kits</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllocateModal(false)}
                        disabled={allocateSubmitting}
                        className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <FiX size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitAllocate} className="flex-1 overflow-y-auto p-6 space-y-5">
                      {allocateError && (
                        <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
                          <FiAlertCircle size={16} className="shrink-0" />
                          <span>{allocateError}</span>
                        </div>
                      )}

                      {/* Rate Lock Guaranteed Notice */}
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-bold">
                          <FiLock className="text-emerald-600 shrink-0" size={16} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>Locked Combokit Rate:</span>
                              <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-200">
                                ₹{Math.round(((allocatingOrder.items?.[0]?.unit_price_paise || currentKit.base_price_paise || 0) / 100)).toLocaleString("en-IN")}/kit
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-normal mt-0.5">
                              Guaranteed price lock will remain fixed for the allocated EPC partner until PO completion or expiry.
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] uppercase font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0">
                          Price Locked
                        </span>
                      </div>

                      {/* Configured Loose Order Quantities Strip for this Kit */}
                      <div
                        className="p-3.5 rounded-2xl border space-y-2"
                        style={{ background: "var(--color-surface-hover, #f8fafc)", borderColor: "var(--color-border)" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                            Configured Loose Qty Bundles for {currentKit.name}:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {currentKit.loose_order_quantities?.map((lq) => (
                            <span
                              key={lq}
                              className="bg-sky-500/10 text-sky-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-sky-500/20"
                            >
                              {lq} KITS
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Allocation Strategy */}
                      {allocatingOrder.po_category === "SINGLE_PO" ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                              Assign 100% of PO Quota ({totalQuota} Kits) To <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div
                                onClick={() => setAllocateSingleTarget("single_epc")}
                                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${allocateSingleTarget === "single_epc" ? "border-primary bg-primary/5 shadow-xs" : "border-border hover:border-primary/40 bg-surface"
                                  }`}
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${allocateSingleTarget === "single_epc" ? "bg-primary text-white" : "bg-primary/10 text-primary"
                                  }`}>
                                  <FiUserCheck size={16} />
                                </div>
                                <div>
                                  <div className="font-black text-xs text-text-primary flex items-center gap-1.5">
                                    Single EPC Partner
                                    {allocateSingleTarget === "single_epc" && <FiCheck className="text-primary" size={13} />}
                                  </div>
                                  <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                                    Assign {totalQuota} kits to 1 dedicated EPC contractor.
                                  </p>
                                </div>
                              </div>

                              <div
                                onClick={() => setAllocateSingleTarget("warehouse")}
                                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${allocateSingleTarget === "warehouse" ? "border-blue-600 bg-blue-500/5 shadow-xs" : "border-border hover:border-blue-400 bg-surface"
                                  }`}
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${allocateSingleTarget === "warehouse" ? "bg-blue-600 text-white" : "bg-blue-500/10 text-blue-600"
                                  }`}>
                                  <FiBox size={16} />
                                </div>
                                <div>
                                  <div className="font-black text-xs text-text-primary flex items-center gap-1.5">
                                    Warehouse Self-Stock
                                    {allocateSingleTarget === "warehouse" && <FiCheck className="text-blue-600" size={13} />}
                                  </div>
                                  <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                                    Keep inventory in Franchise Store warehouse.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {allocateSingleTarget === "single_epc" && (
                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                                Select Onboarded EPC Partner <span className="text-rose-500">*</span>
                              </label>
                              <select
                                value={allocateSingleEpcId}
                                onChange={(e) => setAllocateSingleEpcId(e.target.value)}
                                className="w-full px-3.5 py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer"
                                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                              >
                                <option value="">-- Choose Onboarded EPC Partner --</option>
                                {epcBuyers.map((b) => (
                                  <option key={b._id || b.id} value={b._id || b.id}>
                                    {b.company_name || b.name} {b.gstin ? `(GSTIN: ${b.gstin})` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Combine PO Multi-EPC Loose Allocation */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                                Allocate Loose Quantities across EPCs <span className="text-rose-500">*</span>
                              </label>
                              <p className="text-[11px] text-text-muted">
                                Sum of all allocations must equal committed quota: <strong className="text-primary">{totalQuota} kits</strong>.
                              </p>
                            </div>
                            <div className={`text-xs font-black px-2.5 py-1 rounded-lg ${remainingToAssign === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                              {remainingToAssign === 0 ? "✓ 100% Allocated" : `${remainingToAssign} Kits Remaining`}
                            </div>
                          </div>

                          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {epcBuyers.map((buyer) => {
                              const bId = (buyer._id || buyer.id)?.toString();
                              const currentVal = allocateAllocations[bId] || "";

                              return (
                                <div
                                  key={bId}
                                  className="p-3.5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                >
                                  <div className="truncate flex-1">
                                    <div className="font-bold text-text-primary truncate">{buyer.company_name || buyer.name}</div>
                                    <div className="text-[10px] text-text-muted">{buyer.gstin ? `GSTIN: ${buyer.gstin}` : "Direct Partner"}</div>
                                  </div>

                                  <div className="flex items-center flex-wrap gap-2 shrink-0">
                                    {/* Configured Loose Quantity Chips */}
                                    <div className="flex flex-wrap gap-1">
                                      {currentKit.loose_order_quantities?.map((lq) => (
                                        <button
                                          key={lq}
                                          type="button"
                                          onClick={() => handleAllocateLooseChange(bId, lq)}
                                          className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${Number(currentVal) === lq
                                            ? "bg-primary text-white border-primary shadow-2xs"
                                            : "bg-surface-hover text-text-secondary border-border hover:border-primary/40"
                                            }`}
                                        >
                                          {lq} K
                                        </button>
                                      ))}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        value={currentVal}
                                        onChange={(e) => handleAllocateLooseChange(bId, e.target.value)}
                                        placeholder="0"
                                        className="w-16 px-2.5 py-1 rounded-lg text-xs font-black text-center border text-text-primary focus:border-primary outline-none"
                                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                                      />
                                      <span className="text-[10px] font-bold text-text-muted">Kits</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setAllocateModal(false)}
                          disabled={allocateSubmitting}
                          className="px-5 py-2.5 rounded-xl border text-xs font-bold text-text-secondary hover:bg-surface-hover cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={allocateSubmitting}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black shadow-lg hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {allocateSubmitting ? (
                            <>
                              <FiLoader size={14} className="animate-spin" />
                              <span>Saving Allocations...</span>
                            </>
                          ) : (
                            <>
                              <FiBox size={14} />
                              <span>Save Allocations & Proceed to Token Payment →</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────────────────
          STEP 3: TOKEN PAYMENT MODAL (Escrow Record)
      ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {tokenModal && tokenOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => !tokenSubmitting && setTokenModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Stage 3: Token Payment
                    </span>
                    <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                      <FiDollarSign className="text-emerald-600" /> Pay EPC Token Deposit
                    </h2>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    PO Reference: <strong className="font-mono text-text-primary">{tokenOrder.po_number}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTokenModal(false)}
                  disabled={tokenSubmitting}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {tokenSuccess ? (
                <div className="p-8 space-y-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md">
                    <FiCheckCircle size={32} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-text-primary">
                      Token Payment Successfully Recorded!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                      PO is now Officially STARTED (Stage 3 Complete ✓)
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTokenModal(false);
                        setTokenSuccess(null);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
                    >
                      Close & Return to PO List
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTokenModal(false);
                        setTokenSuccess(null);
                        handleValidateOrder(tokenOrder);
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-lg hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      <FiCheckCircle size={15} />
                      <span>✓ Validate PO Now (Stage 4)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitTokenPayment} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {tokenError && (
                    <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
                      <FiAlertCircle size={16} className="shrink-0" />
                      <span>{tokenError}</span>
                    </div>
                  )}

                  {/* Escrow Bank Card */}
                  <div className="p-4 rounded-2xl bg-surface-hover/80 border border-border text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase tracking-wider text-[10px] text-text-muted flex items-center gap-1">
                        <FiShield size={12} className="text-emerald-500" /> Official Escrow Account
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">Verified ICICI Corporate</span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Account Name:</span>
                        <span className="font-bold text-text-primary">{escrowBank.account_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Account No:</span>
                        <div className="flex items-center gap-1 font-mono font-black text-primary">
                          <span>{escrowBank.account_number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(escrowBank.account_number, "escrow_acc")}
                            className="text-text-muted hover:text-text-primary cursor-pointer"
                          >
                            <FiCopy size={11} />
                          </button>
                          {copiedField === "escrow_acc" && <span className="text-[9px] text-emerald-600">Copied!</span>}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">IFSC Code:</span>
                        <span className="font-mono font-bold text-text-primary">{escrowBank.ifsc_code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Token Amount Paid (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={tokenPayAmount || ""}
                        onChange={(e) => setTokenPayAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold font-mono border text-text-primary outline-none focus:border-primary"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        UTR / Transaction No. <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={tokenUtr}
                        onChange={(e) => setTokenUtr(e.target.value)}
                        placeholder="e.g. ICICR24098123456"
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-text-primary outline-none focus:border-primary"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Sender Bank Name
                      </label>
                      <input
                        type="text"
                        value={tokenBank}
                        onChange={(e) => setTokenBank(e.target.value)}
                        placeholder="e.g. HDFC / ICICI"
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold border text-text-primary outline-none focus:border-primary"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={tokenDate}
                        onChange={(e) => setTokenDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold border text-text-primary outline-none focus:border-primary"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setTokenModal(false)}
                      disabled={tokenSubmitting}
                      className="px-5 py-2.5 rounded-xl border text-xs font-bold text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={tokenSubmitting || !tokenUtr.trim() || !tokenPayAmount}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-lg hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {tokenSubmitting ? (
                        <>
                          <FiLoader size={14} className="animate-spin" />
                          <span>Verifying Payment...</span>
                        </>
                      ) : (
                        <>
                          <FiDollarSign size={14} />
                          <span>Pay Token & Start PO (₹{Number(tokenPayAmount || 0).toLocaleString("en-IN")})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────────────────
          STAGE 4: REORDER / DRAWDOWN MODAL
          (Using Configured Loose Quantities for that ComboKit)
      ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {reorderModal && reorderOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => !reorderSubmitting && setReorderModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <FiRefreshCw size={15} />
                    </span>
                    <h2 className="text-base font-black text-text-primary">
                      Reorder Loose Kits against PO: {reorderOrder.po_number}
                    </h2>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Draw repeat loose kit orders against locked price & settle token deposit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !reorderSubmitting && setReorderModal(false)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {reorderSuccess ? (
                <div className="p-6 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <FiCheckCircle size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-text-primary">
                      Repeat Order Successfully Placed!
                    </h3>
                    <p className="text-xs text-text-muted">
                      Order Generated: <span className="font-mono font-bold text-primary">{reorderSuccess.orderNumber}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReorderModal(false);
                      setReorderSuccess(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-md hover:opacity-90 transition-all cursor-pointer"
                  >
                    Done & Return to PO List
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitReorder} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                  {reorderError && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 text-xs flex items-center gap-2">
                      <FiAlertCircle size={15} className="shrink-0" />
                      <span>{reorderError}</span>
                    </div>
                  )}

                  {(() => {
                    const it = reorderOrder.items?.[0] || {};
                    const kitObj = availableKits.find((k) => String(k._id) === String(it.kit_id)) || availableKits[0];
                    const unitPrice = (it.unit_price_paise || 0) / 100;
                    const committed = Number(reorderOrder.total_booked_quantity || it.quantity || 100);
                    const fulfilled = Number(reorderOrder.fulfilled_quantity || 0);
                    const remaining = reorderOrder.remaining_quantity != null ? reorderOrder.remaining_quantity : Math.max(1, committed - fulfilled);
                    const subtotal = reorderQty * unitPrice;
                    const tax = Math.round(subtotal * 0.12);
                    const grossTotal = subtotal + tax;
                    const tokenPaid = Math.round((reorderOrder.token_amount_paise || reorderOrder.token_paid_paise || 0) / 100);
                    const tokenPerKit = committed > 0 ? Math.floor(tokenPaid / committed) : 0;
                    const tokenToDeduct = Math.min(reorderQty * tokenPerKit, grossTotal);
                    const netPayable = Math.max(0, grossTotal - tokenToDeduct);

                    return (
                      <>
                        <div className="p-3.5 rounded-2xl bg-surface-hover border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-primary text-xs line-clamp-1">
                              {it.item_name || "Solar ComboKit"}
                            </span>
                            <span className="text-xs font-black text-primary">
                              ₹{unitPrice.toLocaleString("en-IN")}/kit + GST
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60 text-center">
                            <div>
                              <div className="text-[10px] text-text-muted">Remaining Quota</div>
                              <div className="font-black text-emerald-600">{remaining} Kits</div>
                            </div>
                            <div className="border-l border-border/60">
                              <div className="text-[10px] text-text-muted">Token Deduct Rate</div>
                              <div className="font-black text-emerald-600">₹{tokenPerKit.toLocaleString("en-IN")}/kit</div>
                            </div>
                          </div>
                        </div>

                        {/* Configured Loose Quantities Selector */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-text-primary block">
                            Select Configured Loose Quantity:
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {kitObj.loose_order_quantities?.filter((lq) => lq <= remaining).map((lq) => (
                              <button
                                key={lq}
                                type="button"
                                onClick={() => setReorderQty(lq)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${reorderQty === lq
                                  ? "bg-sky-600 text-white border-sky-600 shadow-xs scale-105"
                                  : "bg-sky-500/10 text-sky-800 hover:bg-sky-500/20 border-sky-500/20"
                                  }`}
                              >
                                {lq} KITS
                              </button>
                            ))}
                            {remaining > 0 && (
                              <button
                                type="button"
                                onClick={() => setReorderQty(remaining)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${reorderQty === remaining
                                  ? "bg-primary text-white border-primary shadow-xs scale-105"
                                  : "bg-surface-hover text-text-secondary border-border"
                                  }`}
                              >
                                All Remaining ({remaining})
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Direct Numeric Input */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-text-primary block">
                            Or enter exact loose quantity (Max: {remaining} kits):
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={remaining}
                            value={reorderQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 1;
                              setReorderQty(Math.min(remaining, Math.max(1, val)));
                            }}
                            className="w-full px-4 py-2 rounded-xl border text-center font-black text-sm border-border bg-surface text-text-primary outline-none focus:border-primary"
                            required
                          />
                        </div>

                        {/* Breakdown Box */}
                        <div className="p-3.5 rounded-2xl bg-surface-hover/80 border border-border space-y-1.5">
                          <div className="flex justify-between text-text-muted">
                            <span>Subtotal ({reorderQty} kits × ₹{unitPrice.toLocaleString("en-IN")}):</span>
                            <span className="font-bold text-text-primary">₹{subtotal.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-text-muted">
                            <span>GST (12%):</span>
                            <span>₹{tax.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600 font-bold border-t border-border pt-1">
                            <span>Token Escrow Adjusted:</span>
                            <span>-₹{tokenToDeduct.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-sm font-black text-text-primary border-t border-border pt-1">
                            <span>Net Amount to Pay:</span>
                            <span>₹{netPayable.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        {/* Payment Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-text-muted mb-1">
                              Payment UTR / Ref <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={reorderUtr}
                              onChange={(e) => setReorderUtr(e.target.value)}
                              placeholder="e.g. UTR12345678"
                              className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-text-primary outline-none focus:border-primary"
                              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-muted mb-1">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              value={reorderBank}
                              onChange={(e) => setReorderBank(e.target.value)}
                              placeholder="ICICI / HDFC"
                              className="w-full px-3 py-2 rounded-xl text-xs font-bold border text-text-primary outline-none focus:border-primary"
                              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setReorderModal(false)}
                            disabled={reorderSubmitting}
                            className="px-5 py-2.5 rounded-xl border text-xs font-bold text-text-secondary hover:bg-surface-hover cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={reorderSubmitting || !reorderUtr.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-lg hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {reorderSubmitting ? (
                              <>
                                <FiLoader size={14} className="animate-spin" />
                                <span>Placing Reorder...</span>
                              </>
                            ) : (
                              <>
                                <FiPlus size={14} />
                                <span>Place Reorder (₹{netPayable.toLocaleString("en-IN")})</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────────────────
          ORDER DETAIL MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setSelectedOrder(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-text-primary">
                      PO Breakdown: {selectedOrder.po_number}
                    </h2>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Placed on {new Date(selectedOrder.created_at || selectedOrder.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {/* Quota Progress */}
                <div
                  className="p-4 rounded-2xl border space-y-3"
                  style={{ background: "var(--color-surface-hover, #f8fafc)", borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                      Quota Lock & Fulfillment
                    </span>
                    <span className="text-[11px] font-black text-emerald-600">
                      {selectedOrder.remaining_quantity != null ? selectedOrder.remaining_quantity : (selectedOrder.total_booked_quantity || 0)} Kits Remaining
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2.5 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-text-muted">Booked Quota</div>
                      <div className="text-sm font-black text-text-primary">
                        {selectedOrder.total_booked_quantity || selectedOrder.total_quantity || 0} Kits
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-text-muted">Fulfilled</div>
                      <div className="text-sm font-black text-blue-600">
                        {selectedOrder.fulfilled_quantity || 0} Kits
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-text-muted">Token Paid</div>
                      <div className="text-sm font-black text-emerald-600">
                        ₹{Math.round((selectedOrder.token_amount_paise || selectedOrder.token_paid_paise || 0) / 100).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                    Itemized Product
                  </h4>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                        <tr>
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-3 text-center">Quantity</th>
                          <th className="py-2.5 px-3">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedOrder.items?.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-3 px-3">
                              <div className="font-bold text-text-primary">{it.item_name}</div>
                              <div className="text-[10px] text-text-muted">GST @ {it.gst_rate || 12}%</div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold">{it.quantity} Kits</td>
                            <td className="py-3 px-3 font-mono">
                              ₹{((it.unit_price_paise || 0) / 100).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-3 text-right font-bold font-mono">
                              ₹{((it.total_price_paise || 0) / 100).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* EPC Allocations Table */}
                {(selectedOrder.items?.[0]?.epc_allocations || []).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                      EPC Buyer Allocations
                    </h4>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                          <tr>
                            <th className="py-2.5 px-3">EPC Buyer</th>
                            <th className="py-2.5 px-3">GSTIN</th>
                            <th className="py-2.5 px-3 text-center">Allocated Kits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {selectedOrder.items[0].epc_allocations.map((alloc, aIdx) => (
                            <tr key={aIdx} className="hover:bg-surface-hover/40 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-text-primary text-xs">
                                {alloc.company_name || alloc.buyer_name}
                              </td>
                              <td className="py-2.5 px-3 text-text-muted text-[11px]">
                                {alloc.gstin || "N/A"}
                              </td>
                              <td className="py-2.5 px-3 text-center font-black text-primary text-xs">
                                {alloc.allocated_quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Linked Repeat Orders & Drawdowns Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FiLayers size={13} className="text-primary" /> Drawdowns Placed Under This PO ({(selectedOrder.linked_repeat_orders || []).length})
                    </h4>
                  </div>
                  {(selectedOrder.linked_repeat_orders || []).length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-dashed border-border text-center text-text-muted text-[11px]">
                      No repeat drawdowns placed against this PO yet.
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                          <tr>
                            <th className="py-2 px-3">Order #</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3 text-center">Kits</th>
                            <th className="py-2 px-3">Token Adj</th>
                            <th className="py-2 px-3">Net Paid</th>
                            <th className="py-2 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-[11px]">
                          {selectedOrder.linked_repeat_orders.map((child, cIdx) => {
                            const childQty = child.items?.[0]?.quantity || child.total_quantity || 1;
                            const childTokenAdj = Math.round((child.token_adjusted_paise || 0) / 100);
                            const childNetPaid = Math.round((child.net_payable_paise || child.grand_total_paise || 0) / 100);
                            return (
                              <tr key={child._id || cIdx} className="hover:bg-surface-hover/40 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-text-primary">
                                  {child.po_number || `ORD-R${cIdx + 1}`}
                                </td>
                                <td className="py-2 px-3 text-text-muted">
                                  {new Date(child.created_at || child.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </td>
                                <td className="py-2 px-3 text-center font-bold font-mono text-primary">
                                  {childQty}
                                </td>
                                <td className="py-2 px-3 font-mono text-emerald-600 font-bold">
                                  {childTokenAdj > 0 ? `-₹${childTokenAdj.toLocaleString("en-IN")}` : "₹0"}
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-text-primary">
                                  ₹{childNetPaid.toLocaleString("en-IN")}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <StatusBadge status={child.status} />
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────────────────────
          REFUND MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {refundModal && refundOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => !refundSubmitting && setRefundModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-black text-text-primary flex items-center gap-2">
                  <FiDollarSign className="text-amber-500" /> Request Token Escrow Refund
                </h2>
                <button
                  type="button"
                  onClick={() => setRefundModal(false)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {refundSuccess ? (
                <div className="p-6 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <FiCheckCircle size={32} />
                  </div>
                  <h3 className="text-lg font-black text-text-primary">
                    Refund Request Submitted!
                  </h3>
                  <p className="text-xs text-text-muted">
                    Our accounts team will review and process your payout to your bank account.
                  </p>
                  <button
                    onClick={() => {
                      setRefundModal(false);
                      setRefundSuccess(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-md hover:opacity-90 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitRefund} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                  {refundError && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                      <FiAlertCircle size={15} className="shrink-0" />
                      <span>{refundError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Account Holder Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={refundForm.account_holder_name}
                        onChange={(e) => setRefundForm({ ...refundForm, account_holder_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold border text-text-primary outline-none focus:border-primary"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Bank Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={refundForm.bank_name}
                        onChange={(e) => setRefundForm({ ...refundForm, bank_name: e.target.value })}
                        placeholder="e.g. HDFC Bank"
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold border text-text-primary outline-none focus:border-primary"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Account Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={refundForm.account_number}
                        onChange={(e) => setRefundForm({ ...refundForm, account_number: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-text-primary outline-none focus:border-primary"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Confirm Account Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={refundForm.confirm_account_number}
                        onChange={(e) => setRefundForm({ ...refundForm, confirm_account_number: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-text-primary outline-none focus:border-primary"
                        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">
                      Bank IFSC Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={refundForm.ifsc_code}
                      onChange={(e) => setRefundForm({ ...refundForm, ifsc_code: e.target.value })}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border text-text-primary outline-none focus:border-primary uppercase"
                      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                    />
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setRefundModal(false)}
                      disabled={refundSubmitting}
                      className="px-5 py-2.5 rounded-xl border text-xs font-bold text-text-secondary hover:bg-surface-hover cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={refundSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-black shadow-lg hover:bg-amber-600 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {refundSubmitting ? "Submitting..." : "Submit Refund Request"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}