import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiPackage,
  FiDollarSign,
  FiSearch,
  FiSave,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiSliders,
  FiTag,
  FiAlertCircle,
  FiLayers,
} from "react-icons/fi";

const rawApiUrl = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api").replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");

export default function KitMarginManager() {
  const [loadingKits, setLoadingKits] = useState(false);
  const [savingMargins, setSavingMargins] = useState(false);
  const [notification, setNotification] = useState({ text: "", type: "" });

  // ── Quick Filters State (matching Screenshot 2) ───────────────────────────
  const [quickFilters, setQuickFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [hierarchy, setHierarchy] = useState({ shopHierarchy: [], industries: [], categories: [], subcategories: [], types: [], ranges: [] });
  const [kits, setKits] = useState([]);
  const [marginValues, setMarginValues] = useState({}); // { [kitId]: number }
  const [bulkMarginInput, setBulkMarginInput] = useState("");

  const notify = (text, type = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification({ text: "", type: "" }), 4000);
  };

  // ── Fetch Hierarchy for Cascading Dropdowns ───────────────────────────────
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

  useEffect(() => {
    fetchHierarchy();
  }, []);

  // ── Cascading Quick Filter Options ────────────────────────────────────────
  const shopHierarchy = useMemo(() => hierarchy.shopHierarchy || [], [hierarchy.shopHierarchy]);

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

  // ── Fetch Matching ComboKits ──────────────────────────────────────────────
  const fetchKits = useCallback(async () => {
    setLoadingKits(true);
    try {
      const params = {};
      if (quickFilters.industryType !== "all") params.industry_type_name = quickFilters.industryType;
      if (quickFilters.category !== "all") params.category = quickFilters.category;
      if (quickFilters.subCategory !== "all") params.sub_category = quickFilters.subCategory;
      if (quickFilters.systemType !== "all") params.system_type = quickFilters.systemType;
      if (quickFilters.projectRange !== "all") params.project_range = quickFilters.projectRange;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await axios.get(`${API_BASE}/admin-api/estimator/project-boms/available-kits`, {
        headers: authHeaderObj(),
        params,
      });

      if (res.data?.status === "success") {
        const loadedKits = res.data.data || [];
        setKits(loadedKits);

        // Pre-fill margin values map
        setMarginValues((prev) => {
          const next = { ...prev };
          loadedKits.forEach((k) => {
            if (next[k._id] === undefined) {
              next[k._id] = k.max_margin || 0;
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to fetch available combo kits:", err);
      notify("Failed to fetch kits for quick filters", "error");
    } finally {
      setLoadingKits(false);
    }
  }, [quickFilters, searchTerm]);

  useEffect(() => {
    fetchKits();
  }, [fetchKits]);

  // ── Clear Quick Filters ───────────────────────────────────────────────────
  const clearFilters = () => {
    setQuickFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
    setSearchTerm("");
  };

  const hasActiveFilters =
    quickFilters.industryType !== "all" ||
    quickFilters.category !== "all" ||
    quickFilters.subCategory !== "all" ||
    quickFilters.systemType !== "all" ||
    quickFilters.projectRange !== "all" ||
    searchTerm.trim() !== "";

  // ── Handle Single Margin Change ───────────────────────────────────────────
  const handleSingleMarginChange = (kitId, val) => {
    const num = Math.max(0, Number(val) || 0);
    setMarginValues((prev) => ({
      ...prev,
      [kitId]: num,
    }));
  };

  // ── Bulk Apply to All Filtered Kits ───────────────────────────────────────
  const handleApplyBulkMargin = () => {
    const num = Math.max(0, Number(bulkMarginInput) || 0);
    if (!num && num !== 0) return;

    setMarginValues((prev) => {
      const next = { ...prev };
      kits.forEach((k) => {
        next[k._id] = num;
      });
      return next;
    });

    notify(`Applied ₹${num.toLocaleString("en-IN")} max margin to ${kits.length} filtered kits. Click 'Save Kit Margins' to commit.`);
  };

  // ── Save Kit Maximum Margins to Backend ───────────────────────────────────
  const handleSaveMargins = async () => {
    if (kits.length === 0) {
      notify("No kits available to save", "error");
      return;
    }

    setSavingMargins(true);
    try {
      const updates = kits.map((k) => ({
        kit_id: k._id,
        max_margin: marginValues[k._id] !== undefined ? Number(marginValues[k._id]) : Number(k.max_margin || 0),
      }));

      const res = await axios.put(
        `${API_BASE}/admin-api/estimator/kits/max-margins`,
        { updates },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        notify(res.data.message || `Maximum margins saved for ${updates.length} kits!`);
        // Refresh kits to reflect updated DB state
        fetchKits();
      } else {
        notify(res.data?.message || "Failed to save kit margins", "error");
      }
    } catch (err) {
      console.error("Save kit margins error:", err);
      notify("Server error while saving kit margins", "error");
    } finally {
      setSavingMargins(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
            notification.type === "error"
              ? "bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {notification.type === "error" ? <FiXCircle className="w-5 h-5 shrink-0" /> : <FiCheckCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ── Quick Filters Bar (Matching Screenshot 2) ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FiPackage size={18} />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Quick Filters
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filter target ComboKits by classification to configure individual Maximum Margin limits
              </p>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              type="button"
              className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold cursor-pointer hover:underline"
            >
              Clear Main
            </button>
          )}
        </div>

        {/* Cascading Quick Filter Dropdowns */}
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
            >
              {projectRangeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Bulk Apply Action Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search kit name, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Bulk Apply Input */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Bulk Set Max Margin (₹):
            </span>
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="500"
                placeholder="e.g. 50000"
                value={bulkMarginInput}
                onChange={(e) => setBulkMarginInput(e.target.value)}
                className="w-full pl-6 pr-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyBulkMargin}
              disabled={!bulkMarginInput}
              className="px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Apply to All Filtered
            </button>
            <button
              type="button"
              onClick={handleSaveMargins}
              disabled={savingMargins || kits.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <FiSave className="w-3.5 h-3.5" />
              <span>{savingMargins ? "Saving..." : "Save Kit Margins"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Filtered Kits List Table / Cards ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiDollarSign className="text-amber-500" size={18} />
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Filtered Kits & Allowed Maximum Margin ({kits.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            * Admin decides the maximum ceiling for EPC margin per kit. Minimum limit is removed.
          </span>
        </div>

        {loadingKits ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <FiRefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading kits matching Quick Filters...</span>
          </div>
        ) : kits.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FiAlertCircle className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">No ComboKits found for the selected Quick Filters</p>
            <p className="text-xs text-slate-400">Try changing the Industry Type, Category, or System Type options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">ComboKit Details</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3">Capacity</th>
                  <th className="py-3 px-3">Selling Price (₹)</th>
                  <th className="py-3 px-4 text-right">Max Allowed Margin (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {kits.map((kit) => {
                  const currentVal = marginValues[kit._id] !== undefined ? marginValues[kit._id] : (kit.max_margin || 0);
                  const kitPrice = Number(kit.selling_price || 0);
                  const marginPct = kitPrice > 0 ? Math.round((currentVal / kitPrice) * 1000) / 10 : 0;

                  return (
                    <tr key={kit._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      {/* Kit Image & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {kit.image ? (
                            <img
                              src={kit.image}
                              alt={kit.name}
                              className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {kit.capacity_kw || "?"}k
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs">
                              {kit.name}
                            </p>
                            <p className="font-mono text-[10px] text-slate-400">
                              {kit.sku || kit.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {kit.industryType && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
                              {kit.industryType}
                            </span>
                          )}
                          {kit.category && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium">
                              {kit.category}
                            </span>
                          )}
                          {kit.projectType && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                              {kit.projectType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Capacity */}
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {kit.capacity_kw} kW
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-3 font-bold font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        ₹{kitPrice.toLocaleString("en-IN")}
                      </td>

                      {/* Max Allowed Margin Input */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <div className="relative w-36">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={currentVal}
                              onChange={(e) => handleSingleMarginChange(kit._id, e.target.value)}
                              className="w-full pl-6 pr-2.5 py-1.5 text-xs font-bold text-right rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {currentVal > 0 ? `Max ~${marginPct}% of price` : "No limit / 0"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer save bar */}
        {kits.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Configuring {kits.length} ComboKits under active Quick Filter
            </span>
            <button
              type="button"
              onClick={handleSaveMargins}
              disabled={savingMargins}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <FiSave className="w-4 h-4" />
              <span>{savingMargins ? "Saving Changes..." : "Save Kit Margins"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
