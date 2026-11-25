import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiLayers,
  FiMapPin,
  FiSliders,
  FiPackage,
  FiTag,
  FiZap,
} from "react-icons/fi";
import BomItemForm from "./BomItemForm";
import BomRateHistory from "./BomRateHistory";

const rawApiUrl = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api").replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");

export default function ProjectBomSettings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rateTypeFilter, setRateTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Quick Filters State ───────────────────────────────────────────────────────
  const [quickFilters, setQuickFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  // ── Hierarchy Data ───────────────────────────────────────────────────────────
  const [hierarchy, setHierarchy] = useState({
    industries: [],
    categories: [],
    subcategories: [],
    types: [],
    ranges: [],
    shopHierarchy: [],
  });

  // ── Modals State ─────────────────────────────────────────────────────────────
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notification, setNotification] = useState({ text: "", type: "" });

  const notify = (text, type = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification({ text: "", type: "" }), 4000);
  };

  const fetchHierarchy = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin-api/estimator/project-boms/hierarchy-options`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        setHierarchy(res.data.data || {});
      }
    } catch (err) {
      console.error("Failed to load hierarchy options:", err);
    }
  };

  const fetchBomItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (rateTypeFilter !== "all") params.rate_type = rateTypeFilter;
      if (statusFilter !== "all") params.is_active = statusFilter === "active";
      if (search.trim()) params.search = search.trim();

      // Quick filter parameters
      if (quickFilters.industryType !== "all") params.industry_type_name = quickFilters.industryType;
      if (quickFilters.category !== "all") params.category_name = quickFilters.category;
      if (quickFilters.subCategory !== "all") params.subcategory_name = quickFilters.subCategory;
      if (quickFilters.systemType !== "all") params.system_type_name = quickFilters.systemType;
      if (quickFilters.projectRange !== "all") params.project_range_name = quickFilters.projectRange;

      const res = await axios.get(`${API_BASE}/admin-api/estimator/project-boms`, {
        headers: authHeaderObj(),
        params,
      });

      if (res.data?.status === "success") {
        setItems(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load BOM items:", err);
      notify("Failed to load BOM items", "error");
    } finally {
      setLoading(false);
    }
  }, [rateTypeFilter, statusFilter, search, quickFilters]);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  useEffect(() => {
    fetchBomItems();
  }, [fetchBomItems]);

  // ── Cascading Quick Filters Options ──────────────────────────────────────────
  const shopHierarchy = hierarchy.shopHierarchy || [];

  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (shopHierarchy && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name });
        }
      });
    } else if (hierarchy?.industries && hierarchy.industries.length > 0) {
      hierarchy.industries.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name });
        }
      });
    }
    return [{ value: "all", text: "All Industry Types" }, ...list];
  }, [shopHierarchy, hierarchy]);

  const categoryOptions = useMemo(() => {
    if (!quickFilters.industryType || quickFilters.industryType === "all") {
      return [{ value: "all", text: "Select Industry Type First" }];
    }
    const catMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
          String(ind.id) === String(quickFilters.industryType)
      );
      if (selectedInd && selectedInd.categories) {
        selectedInd.categories.forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name, id: cat.id });
          }
        });
      }
    } else if (hierarchy?.categories && hierarchy.categories.length > 0) {
      const matchedInd = (hierarchy?.industries || []).find(
        (i) =>
          i.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
          String(i._id) === String(quickFilters.industryType)
      );
      if (matchedInd) {
        hierarchy.categories.forEach((cat) => {
          if (
            String(cat.industry_type_id) === String(matchedInd._id) &&
            cat.name &&
            !catMap.has(cat.name.toLowerCase())
          ) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name, id: cat._id });
          }
        });
      }
    }
    return [{ value: "all", text: "All Categories" }, ...Array.from(catMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType]);

  const subCategoryOptions = useMemo(() => {
    if (
      !quickFilters.industryType ||
      quickFilters.industryType === "all" ||
      !quickFilters.category ||
      quickFilters.category === "all"
    ) {
      return [{ value: "all", text: "Select Category First" }];
    }
    const subsMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
          String(ind.id) === String(quickFilters.industryType)
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
        );
        if (selectedCat && selectedCat.subcategories) {
          selectedCat.subcategories.forEach((sub) => {
            if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
              subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name, id: sub.id });
            }
          });
        }
      }
    } else if (hierarchy?.subcategories && hierarchy.subcategories.length > 0) {
      const matchedCat = (hierarchy?.categories || []).find(
        (c) =>
          c.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
          String(c._id) === String(quickFilters.category)
      );
      if (matchedCat) {
        hierarchy.subcategories.forEach((sub) => {
          if (
            String(sub.category) === String(matchedCat._id) &&
            sub.name &&
            !subsMap.has(sub.name.toLowerCase())
          ) {
            subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name, id: sub._id });
          }
        });
      }
    }
    return [{ value: "all", text: "All Sub-Categories" }, ...Array.from(subsMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category]);

  const systemTypeOptions = useMemo(() => {
    if (
      !quickFilters.category ||
      quickFilters.category === "all" ||
      !quickFilters.subCategory ||
      quickFilters.subCategory === "all"
    ) {
      return [{ value: "all", text: "Select Sub-Category First" }];
    }
    const typesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
          String(ind.id) === String(quickFilters.industryType)
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
        );
        if (selectedCat && selectedCat.subcategories) {
          const selectedSub = selectedCat.subcategories.find(
            (sub) =>
              sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
              String(sub.id) === String(quickFilters.subCategory)
          );
          if (selectedSub && selectedSub.mappedTypes) {
            selectedSub.mappedTypes.forEach((mt) => {
              if (mt.name && !typesMap.has(mt.name.toLowerCase())) {
                typesMap.set(mt.name.toLowerCase(), {
                  value: mt.name,
                  text: mt.name,
                  id: mt.id || mt.type_id,
                });
              }
            });
          }
        }
      }
    } else if (hierarchy?.subcategories && hierarchy.subcategories.length > 0) {
      const matchedSub = (hierarchy?.subcategories || []).find(
        (s) =>
          s.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
          String(s._id) === String(quickFilters.subCategory)
      );
      if (matchedSub && hierarchy.types) {
        hierarchy.types.forEach((t) => {
          if (t.name && !typesMap.has(t.name.toLowerCase())) {
            typesMap.set(t.name.toLowerCase(), { value: t.name, text: t.name, id: t._id });
          }
        });
      }
    }
    return [{ value: "all", text: "All System Types" }, ...Array.from(typesMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category, quickFilters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    if (
      !quickFilters.subCategory ||
      quickFilters.subCategory === "all" ||
      !quickFilters.systemType ||
      quickFilters.systemType === "all"
    ) {
      return [{ value: "all", text: "Select System Type First" }];
    }
    const rangesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
          String(ind.id) === String(quickFilters.industryType)
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id) === String(quickFilters.category)
        );
        if (selectedCat && selectedCat.subcategories) {
          const selectedSub = selectedCat.subcategories.find(
            (sub) =>
              sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
              String(sub.id) === String(quickFilters.subCategory)
          );
          if (selectedSub && selectedSub.mappedTypes) {
            const selectedMt = selectedSub.mappedTypes.find(
              (mt) =>
                mt.name?.toLowerCase() === quickFilters.systemType.toLowerCase() ||
                String(mt.id || mt.type_id) === String(quickFilters.systemType)
            );
            if (selectedMt && selectedMt.ranges) {
              selectedMt.ranges.forEach((r) => {
                const idVal = String(r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`);
                if (idVal && !rangesMap.has(idVal.toLowerCase())) {
                  rangesMap.set(idVal.toLowerCase(), {
                    value: r.range_label || idVal,
                    text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`,
                  });
                }
              });
            }
          }
        }
      }
    }
    return [{ value: "all", text: "All Project Ranges" }, ...Array.from(rangesMap.values())];
  }, [
    shopHierarchy,
    quickFilters.industryType,
    quickFilters.category,
    quickFilters.subCategory,
    quickFilters.systemType,
  ]);

  const hasActiveQuickFilters =
    quickFilters.industryType !== "all" ||
    quickFilters.category !== "all" ||
    quickFilters.subCategory !== "all" ||
    quickFilters.systemType !== "all" ||
    quickFilters.projectRange !== "all";

  const clearQuickFilters = () => {
    setQuickFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await axios.patch(
        `${API_BASE}/admin-api/estimator/project-boms/${item._id}/status`,
        {},
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        notify(`Item ${item.code} status updated`);
        fetchBomItems();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      notify("Failed to update status", "error");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete BOM item "${item.name}" (${item.code})?`)) {
      return;
    }

    try {
      const res = await axios.delete(`${API_BASE}/admin-api/estimator/project-boms/${item._id}`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        notify(`BOM item ${item.code} deleted`);
        fetchBomItems();
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
      notify("Failed to delete item", "error");
    }
  };

  const formatRateBadge = (type, rate, unit) => {
    switch (type) {
      case "fixed":
        return `₹${rate.toLocaleString("en-IN")} flat`;
      case "per_kw":
        return `₹${rate.toLocaleString("en-IN")} / kW`;
      case "per_kit":
        return `₹${rate.toLocaleString("en-IN")} / kit`;
      case "quantity_based":
        return `₹${rate.toLocaleString("en-IN")} / ${unit || "Nos"}`;
      case "location_based":
        return `Location Based`;
      default:
        return `₹${rate.toLocaleString("en-IN")}`;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* ── Header Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <FiSliders className="w-5 h-5" />
            </span>
            Project BOM Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Admin-defined Bill of Materials rates, Quick Filter kit mappings, and cost structures for Know My Margin estimation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBomItems}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition shadow-sm"
            title="Refresh list"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
          <button
            onClick={() => {
              setSelectedItem(null);
              setFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 rounded-xl shadow-lg shadow-amber-500/25 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add BOM Item</span>
          </button>
        </div>
      </div>

      {/* ── Notification Toast ──────────────────────────────────────────────── */}
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

      {/* ── Quick Filters Bar (Desktop & Mobile) ─────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiPackage className="text-amber-500" size={18} />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Quick Filters
            </h3>
            {hasActiveQuickFilters && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Filtered
              </span>
            )}
          </div>
          {hasActiveQuickFilters && (
            <button
              onClick={clearQuickFilters}
              className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Industry Type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Industry Type
            </label>
            <select
              value={quickFilters.industryType}
              onChange={(e) =>
                setQuickFilters({
                  industryType: e.target.value,
                  category: "all",
                  subCategory: "all",
                  systemType: "all",
                  projectRange: "all",
                })
              }
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {industryTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Category
            </label>
            <select
              value={quickFilters.category}
              disabled={quickFilters.industryType === "all"}
              onChange={(e) =>
                setQuickFilters((prev) => ({
                  ...prev,
                  category: e.target.value,
                  subCategory: "all",
                  systemType: "all",
                  projectRange: "all",
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Category */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Sub Category
            </label>
            <select
              value={quickFilters.subCategory}
              disabled={quickFilters.category === "all"}
              onChange={(e) =>
                setQuickFilters((prev) => ({
                  ...prev,
                  subCategory: e.target.value,
                  systemType: "all",
                  projectRange: "all",
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
            >
              {subCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {/* System Type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              System Type
            </label>
            <select
              value={quickFilters.systemType}
              disabled={quickFilters.subCategory === "all"}
              onChange={(e) =>
                setQuickFilters((prev) => ({
                  ...prev,
                  systemType: e.target.value,
                  projectRange: "all",
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
            >
              {systemTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {/* Project Range */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Project Range
            </label>
            <select
              value={quickFilters.projectRange}
              disabled={quickFilters.systemType === "all"}
              onChange={(e) =>
                setQuickFilters((prev) => ({
                  ...prev,
                  projectRange: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
            >
              {projectRangeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Search & Secondary Filters ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search BOM name, code or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-slate-400">Rate Basis:</span>
            <select
              value={rateTypeFilter}
              onChange={(e) => setRateTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Rate Types</option>
              <option value="fixed">Fixed Rate</option>
              <option value="per_kw">Per kW</option>
              <option value="per_kit">Per Kit</option>
              <option value="quantity_based">Quantity Based</option>
              <option value="location_based">Location Based</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── BOM Items Table ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading project BOM items...</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
            <FiLayers className="w-10 h-10 opacity-30 text-amber-500" />
            <p className="text-base font-medium">No BOM items found.</p>
            <button
              onClick={() => {
                setSelectedItem(null);
                setFormModalOpen(true);
              }}
              className="mt-2 text-sm text-amber-500 hover:text-amber-600 font-semibold cursor-pointer"
            >
              Click here to create a BOM item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700/80">
                <tr>
                  <th className="px-6 py-4">Item Code & Name</th>
                  <th className="px-6 py-4">Rate Basis</th>
                  <th className="px-6 py-4">Admin Rate</th>
                  <th className="px-6 py-4">Applicable Kits</th>
                  <th className="px-6 py-4">Mandatory</th>
                  <th className="px-6 py-4">EPC Visible</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                {items.map((item) => {
                  const hasExplicitKits = Array.isArray(item.eligible_kit_ids) && item.eligible_kit_ids.length > 0;
                  const hasHierarchy = Boolean(
                    item.industry_type_name ||
                    item.category_name ||
                    item.subcategory_name ||
                    item.system_type_name ||
                    item.project_range_name
                  );

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                        <div className="text-xs font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 rounded">{item.code}</span>
                          {item.is_included_in_kit && (
                            <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded text-[10px]">
                              Bundled in Kit
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                          {item.rate_type === "fixed" && "Fixed Project Rate"}
                          {item.rate_type === "per_kw" && "Per kW Capacity"}
                          {item.rate_type === "per_kit" && "Per Kit Multiplier"}
                          {item.rate_type === "quantity_based" && "Quantity Based"}
                          {item.rate_type === "location_based" && "Location Rules"}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {formatRateBadge(item.rate_type, item.admin_rate, item.unit)}
                      </td>

                      {/* Applicable Kits Column */}
                      <td className="px-6 py-4">
                        {hasExplicitKits ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <FiPackage className="w-3.5 h-3.5" />
                              {item.eligible_kit_ids.length} Specific Kit{item.eligible_kit_ids.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : hasHierarchy ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <FiSliders className="w-3 h-3" />
                              Matching Kits
                            </span>
                            <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {[
                                item.industry_type_name,
                                item.category_name,
                                item.subcategory_name,
                                item.system_type_name,
                                item.project_range_name,
                              ]
                                .filter(Boolean)
                                .join(" › ")}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <FiCheckCircle className="w-3.5 h-3.5" />
                            Universal (All Kits)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {item.is_mandatory ? (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Yes</span>
                        ) : (
                          <span className="text-xs text-slate-400">Optional</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {item.visible_to_epc !== false ? (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Visible</span>
                        ) : (
                          <span className="text-xs text-slate-400">Hidden</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                            item.is_active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {item.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setHistoryModalItem(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            title="View Rate History"
                          >
                            <FiClock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setFormModalOpen(true);
                            }}
                            className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition"
                            title="Edit BOM item & kit mapping"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
                            title="Delete item"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Form Modal ──────────────────────────────────────────────────────── */}
      {formModalOpen && (
        <BomItemForm
          item={selectedItem}
          hierarchy={hierarchy}
          onClose={() => setFormModalOpen(false)}
          onSaved={() => {
            setFormModalOpen(false);
            notify(selectedItem ? "BOM item updated successfully" : "BOM item created successfully");
            fetchBomItems();
          }}
        />
      )}

      {/* ── Rate History Modal ──────────────────────────────────────────────── */}
      {historyModalItem && (
        <BomRateHistory
          bomItem={historyModalItem}
          onClose={() => setHistoryModalItem(null)}
        />
      )}
    </div>
  );
}
