import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiX,
  FiSave,
  FiPlus,
  FiTrash2,
  FiInfo,
  FiLayers,
  FiDollarSign,
  FiMapPin,
  FiCheckCircle,
  FiPackage,
  FiFilter,
  FiCheck,
  FiCheckSquare,
  FiSquare,
  FiSearch,
  FiZap,
  FiSliders,
} from "react-icons/fi";

const rawApiUrl = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api").replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");

export default function BomItemForm({ item, onClose, onSaved, hierarchy }) {
  const isEdit = Boolean(item?._id);

  // ── Quick Filters State ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  // ── ComboKit Matching State ──────────────────────────────────────────────────
  const [availableKits, setAvailableKits] = useState([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [applyToAllMatching, setApplyToAllMatching] = useState(true);
  const [selectedKitIds, setSelectedKitIds] = useState([]);
  const [kitSearchQuery, setKitSearchQuery] = useState("");

  // ── Main Form State ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    rate_type: "fixed",
    admin_rate: 0,
    unit: "Nos",
    default_quantity: 1,
    is_mandatory: true,
    is_included_in_kit: false,
    gst_applicable: true,
    gst_rate: 18,
    visible_to_epc: true,
    location_rates: [],
    display_order: 0,
    is_active: true,
    rate_change_reason: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Initial Populate on Edit ─────────────────────────────────────────────────
  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || "",
        code: item.code || "",
        description: item.description || "",
        rate_type: item.rate_type || "fixed",
        admin_rate: item.admin_rate || 0,
        unit: item.unit || "Nos",
        default_quantity: item.default_quantity || 1,
        is_mandatory: item.is_mandatory !== false,
        is_included_in_kit: Boolean(item.is_included_in_kit),
        gst_applicable: item.gst_applicable !== false,
        gst_rate: item.gst_rate !== undefined ? item.gst_rate : 18,
        visible_to_epc: item.visible_to_epc !== false,
        location_rates: Array.isArray(item.location_rates) ? item.location_rates : [],
        display_order: item.display_order || 0,
        is_active: item.is_active !== false,
        rate_change_reason: "",
      });

      setFilters({
        industryType: item.industry_type_name || "all",
        category: item.category_name || "all",
        subCategory: item.subcategory_name || "all",
        systemType: item.system_type_name || "all",
        projectRange: item.project_range_name || "all",
      });

      setApplyToAllMatching(item.apply_to_all_matching !== false);
      setSelectedKitIds((item.eligible_kit_ids || []).map(String));
    }
  }, [item]);

  // ── Cascading Quick Filter Options ───────────────────────────────────────────
  const shopHierarchy = hierarchy?.shopHierarchy || [];

  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (shopHierarchy && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name, id: ind.id });
        }
      });
    } else if (hierarchy?.industries && hierarchy.industries.length > 0) {
      hierarchy.industries.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name, id: ind._id });
        }
      });
    }
    return [{ value: "all", text: "All Industry Types" }, ...list];
  }, [shopHierarchy, hierarchy]);

  const categoryOptions = useMemo(() => {
    if (!filters.industryType || filters.industryType === "all") {
      return [{ value: "all", text: "Select Industry Type First" }];
    }
    const catMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
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
          i.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(i._id) === String(filters.industryType)
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
  }, [shopHierarchy, hierarchy, filters.industryType]);

  const subCategoryOptions = useMemo(() => {
    if (!filters.industryType || filters.industryType === "all" || !filters.category || filters.category === "all") {
      return [{ value: "all", text: "Select Category First" }];
    }
    const subsMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            cat.name?.toLowerCase() === filters.category.toLowerCase() ||
            String(cat.id) === String(filters.category)
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
          c.name?.toLowerCase() === filters.category.toLowerCase() ||
          String(c._id) === String(filters.category)
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
  }, [shopHierarchy, hierarchy, filters.industryType, filters.category]);

  const systemTypeOptions = useMemo(() => {
    if (
      !filters.category ||
      filters.category === "all" ||
      !filters.subCategory ||
      filters.subCategory === "all"
    ) {
      return [{ value: "all", text: "Select Sub-Category First" }];
    }
    const typesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            cat.name?.toLowerCase() === filters.category.toLowerCase() ||
            String(cat.id) === String(filters.category)
        );
        if (selectedCat && selectedCat.subcategories) {
          const selectedSub = selectedCat.subcategories.find(
            (sub) =>
              sub.name?.toLowerCase() === filters.subCategory.toLowerCase() ||
              String(sub.id) === String(filters.subCategory)
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
          s.name?.toLowerCase() === filters.subCategory.toLowerCase() ||
          String(s._id) === String(filters.subCategory)
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
  }, [shopHierarchy, hierarchy, filters.industryType, filters.category, filters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    if (
      !filters.subCategory ||
      filters.subCategory === "all" ||
      !filters.systemType ||
      filters.systemType === "all"
    ) {
      return [{ value: "all", text: "Select System Type First" }];
    }
    const rangesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            cat.name?.toLowerCase() === filters.category.toLowerCase() ||
            String(cat.id) === String(filters.category)
        );
        if (selectedCat && selectedCat.subcategories) {
          const selectedSub = selectedCat.subcategories.find(
            (sub) =>
              sub.name?.toLowerCase() === filters.subCategory.toLowerCase() ||
              String(sub.id) === String(filters.subCategory)
          );
          if (selectedSub && selectedSub.mappedTypes) {
            const selectedMt = selectedSub.mappedTypes.find(
              (mt) =>
                mt.name?.toLowerCase() === filters.systemType.toLowerCase() ||
                String(mt.id || mt.type_id) === String(filters.systemType)
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
    filters.industryType,
    filters.category,
    filters.subCategory,
    filters.systemType,
  ]);

  // ── Fetch Matching ComboKits from Backend ────────────────────────────────────
  const fetchMatchingKits = useCallback(async () => {
    setLoadingKits(true);
    try {
      const params = {};
      if (filters.industryType !== "all") params.industry_type_name = filters.industryType;
      if (filters.category !== "all") params.category = filters.category;
      if (filters.subCategory !== "all") params.sub_category = filters.subCategory;
      if (filters.systemType !== "all") params.system_type = filters.systemType;
      if (filters.projectRange !== "all") params.project_range = filters.projectRange;

      const res = await axios.get(`${API_BASE}/admin-api/estimator/project-boms/available-kits`, {
        headers: authHeaderObj(),
        params,
      });

      if (res.data?.status === "success") {
        setAvailableKits(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch available kits:", err);
    } finally {
      setLoadingKits(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMatchingKits();
  }, [fetchMatchingKits]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleToggleKitSelection = (kitId) => {
    const sId = String(kitId);
    setSelectedKitIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  const handleSelectAllKits = () => {
    const allIds = displayedKits.map((k) => String(k._id || k.id));
    const merged = Array.from(new Set([...selectedKitIds, ...allIds]));
    setSelectedKitIds(merged);
  };

  const handleDeselectAllKits = () => {
    const displayedIds = new Set(displayedKits.map((k) => String(k._id || k.id)));
    setSelectedKitIds((prev) => prev.filter((id) => !displayedIds.has(id)));
  };

  const handleAddLocationRate = () => {
    setForm((prev) => ({
      ...prev,
      location_rates: [
        ...prev.location_rates,
        { state_name: "", district_name: "", pincode: "", rate: 0 },
      ],
    }));
  };

  const handleUpdateLocationRate = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.location_rates];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, location_rates: updated };
    });
  };

  const handleRemoveLocationRate = (index) => {
    setForm((prev) => ({
      ...prev,
      location_rates: prev.location_rates.filter((_, i) => i !== index),
    }));
  };

  const displayedKits = useMemo(() => {
    if (!kitSearchQuery.trim()) return availableKits;
    const q = kitSearchQuery.toLowerCase();
    return availableKits.filter((k) => {
      return (
        k.name?.toLowerCase().includes(q) ||
        k.sku?.toLowerCase().includes(q) ||
        `${k.capacity_kw}kw`.includes(q.replace(/\s+/g, ""))
      );
    });
  }, [availableKits, kitSearchQuery]);

  // ── Form Submission ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and Code are required.");
      return;
    }

    if (!applyToAllMatching && selectedKitIds.length === 0) {
      setError("Please select at least one ComboKit or enable 'Apply to All Matching ComboKits'.");
      return;
    }

    setSaving(true);
    try {
      // Find hierarchy IDs if matched
      const matchedInd = (hierarchy?.industries || []).find(
        (i) => i.name === filters.industryType || String(i._id) === String(filters.industryType)
      );
      const matchedCat = (hierarchy?.categories || []).find(
        (c) => c.name === filters.category || String(c._id) === String(filters.category)
      );
      const matchedSub = (hierarchy?.subcategories || []).find(
        (s) => s.name === filters.subCategory || String(s._id) === String(filters.subCategory)
      );

      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        admin_rate: Number(form.admin_rate || 0),
        default_quantity: Number(form.default_quantity || 1),
        gst_rate: Number(form.gst_rate || 18),
        display_order: Number(form.display_order || 0),

        // Quick Filters metadata
        industry_type_name: filters.industryType !== "all" ? filters.industryType : null,
        category_name: filters.category !== "all" ? filters.category : null,
        subcategory_name: filters.subCategory !== "all" ? filters.subCategory : null,
        system_type_name: filters.systemType !== "all" ? filters.systemType : null,
        project_range_name: filters.projectRange !== "all" ? filters.projectRange : null,

        // Hierarchy ObjectIds if matched
        industry_type_id: matchedInd ? matchedInd._id : null,
        project_category_id: matchedCat ? matchedCat._id : null,
        project_subcategory_id: matchedSub ? matchedSub._id : null,

        // Kit mapping
        apply_to_all_matching: applyToAllMatching,
        eligible_kit_ids: applyToAllMatching ? [] : selectedKitIds,

        location_rates: form.location_rates.map((lr) => ({
          ...lr,
          rate: Number(lr.rate || 0),
        })),
      };

      let res;
      if (isEdit) {
        res = await axios.put(`${API_BASE}/admin-api/estimator/project-boms/${item._id}`, payload, {
          headers: authHeaderObj(),
        });
      } else {
        res = await axios.post(`${API_BASE}/admin-api/estimator/project-boms`, payload, {
          headers: authHeaderObj(),
        });
      }

      if (res.data?.status === "success") {
        onSaved();
      } else {
        setError(res.data?.message || "Failed to save BOM item");
      }
    } catch (err) {
      console.error("Save BOM item error:", err);
      setError(err.response?.data?.message || "Server error while saving BOM item");
    } finally {
      setSaving(false);
    }
  };

  const isUniversal =
    filters.industryType === "all" &&
    filters.category === "all" &&
    filters.subCategory === "all" &&
    filters.systemType === "all" &&
    filters.projectRange === "all" &&
    applyToAllMatching;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <FiLayers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                {isEdit ? "Edit Project BOM Item & Kit Mapping" : "Create New Project BOM Item"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure Quick Filters, matching ComboKits, and rate calculation for Know My Margin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <FiInfo className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── SECTION 1: Quick Filters (Matching Criteria) ─────────────────── */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiPackage className="text-amber-500" size={18} />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Quick Filters (Target Kit Classification)
                </h4>
              </div>
              {isUniversal ? (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Universal: Applies to All Kits
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      industryType: "all",
                      category: "all",
                      subCategory: "all",
                      systemType: "all",
                      projectRange: "all",
                    })
                  }
                  className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold"
                >
                  Reset to All
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by Industry, Category, Sub Category, System Type, and Project Range. Matching ComboKits will be fetched automatically.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Industry Type */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Industry Type
                </label>
                <select
                  value={filters.industryType}
                  onChange={(e) =>
                    setFilters({
                      industryType: e.target.value,
                      category: "all",
                      subCategory: "all",
                      systemType: "all",
                      projectRange: "all",
                    })
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                  value={filters.category}
                  disabled={filters.industryType === "all"}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: e.target.value,
                      subCategory: "all",
                      systemType: "all",
                      projectRange: "all",
                    }))
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
                  value={filters.subCategory}
                  disabled={filters.category === "all"}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      subCategory: e.target.value,
                      systemType: "all",
                      projectRange: "all",
                    }))
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
                  value={filters.systemType}
                  disabled={filters.subCategory === "all"}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      systemType: e.target.value,
                      projectRange: "all",
                    }))
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
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
                  value={filters.projectRange}
                  disabled={filters.systemType === "all"}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      projectRange: e.target.value,
                    }))
                  }
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
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

          {/* ── SECTION 2: ComboKit Assignment & Selection ───────────────────── */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <FiZap /> Applicable ComboKits ({availableKits.length} matching)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose whether this BOM item applies to all matching kits or specific kits only
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 cursor-pointer shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={applyToAllMatching}
                    onChange={(e) => setApplyToAllMatching(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                  />
                  <span>Apply to All Matching Kits</span>
                </label>
              </div>
            </div>

            {/* Always Display Kits Section */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
              {applyToAllMatching ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <FiCheck className="shrink-0 text-emerald-600 dark:text-emerald-400" size={16} />
                  <span>
                    All <strong>{availableKits.length}</strong> matching ComboKit{availableKits.length !== 1 ? "s" : ""} below will be automatically assigned to this BOM item. Uncheck "Apply to All Matching Kits" above if you wish to handpick specific kits.
                  </span>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1 max-w-sm">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search kits by name, capacity, SKU..."
                    value={kitSearchQuery}
                    onChange={(e) => setKitSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {!applyToAllMatching && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllKits}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
                    >
                      Select All ({displayedKits.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllKits}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                    >
                      Deselect All
                    </button>
                    <span className="text-xs font-bold px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                      {selectedKitIds.length} Selected
                    </span>
                  </div>
                )}
              </div>

              {loadingKits ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading matching kits...</div>
              ) : displayedKits.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No ComboKits match the selected filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {displayedKits.map((kit) => {
                    const isSelected = selectedKitIds.includes(String(kit._id || kit.id));
                    return (
                      <div
                        key={kit._id || kit.id}
                        onClick={() => {
                          if (!applyToAllMatching) {
                            handleToggleKitSelection(kit._id || kit.id);
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition flex items-center gap-3 ${
                          applyToAllMatching
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 cursor-default"
                            : isSelected
                            ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 shadow-sm cursor-pointer"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 cursor-pointer"
                        }`}
                      >
                        <div className="shrink-0">
                          {applyToAllMatching ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
                              Auto
                            </span>
                          ) : isSelected ? (
                            <FiCheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <FiSquare className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          {kit.image ? (
                            <img src={kit.image} alt={kit.name} className="w-full h-full object-cover" />
                          ) : (
                            <FiPackage className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {kit.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono">{kit.sku}</span>
                            {kit.capacity_kw > 0 && (
                              <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-amber-600 dark:text-amber-400">
                                {kit.capacity_kw} kW
                              </span>
                            )}
                            {kit.projectType && (
                              <span className="truncate">{kit.projectType}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 3: Item Basic Details ────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Aluminum Mounting Structure"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Item Code (Unique) *
              </label>
              <input
                type="text"
                name="code"
                required
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. BOM_MNT_STR_01"
                className="w-full px-3.5 py-2 text-sm uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                value={form.description}
                onChange={handleChange}
                placeholder="Details of what this BOM item covers (civil, foundations, clamps, net metering, etc.)"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* ── SECTION 4: Pricing & Rate Basis ──────────────────────────────── */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <FiDollarSign /> Rate Configuration
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Rate Type
                </label>
                <select
                  name="rate_type"
                  value={form.rate_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="fixed">Fixed Rate (Flat Project Cost)</option>
                  <option value="per_kw">Per kW Rate (Multiplied by total kW)</option>
                  <option value="per_kit">Per Kit Rate (Multiplied by kit count)</option>
                  <option value="quantity_based">Quantity Based (Multiplier)</option>
                  <option value="location_based">Location Based (State/District Rules)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Default Admin Rate (₹)
                </label>
                <input
                  type="number"
                  name="admin_rate"
                  min="0"
                  step="0.01"
                  value={form.admin_rate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Unit Label
                </label>
                <input
                  type="text"
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  placeholder="e.g. Nos, kW, Lot, Mtr"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Location Rate Builder if Location-Based */}
            {form.rate_type === "location_based" && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FiMapPin className="text-amber-500" /> Regional Rate Overrides
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLocationRate}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                  >
                    <FiPlus /> Add Location Rule
                  </button>
                </div>

                {form.location_rates.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No location overrides specified yet. Default admin rate will apply.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.location_rates.map((lr, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="State (e.g. Maharashtra)"
                          value={lr.state_name || ""}
                          onChange={(e) => handleUpdateLocationRate(idx, "state_name", e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          placeholder="District (e.g. Pune)"
                          value={lr.district_name || ""}
                          onChange={(e) => handleUpdateLocationRate(idx, "district_name", e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          placeholder="Pincode (Optional)"
                          value={lr.pincode || ""}
                          onChange={(e) => handleUpdateLocationRate(idx, "pincode", e.target.value)}
                          className="w-28 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="number"
                          placeholder="Rate (₹)"
                          value={lr.rate}
                          onChange={(e) => handleUpdateLocationRate(idx, "rate", e.target.value)}
                          className="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLocationRate(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 5: Rules & Toggles ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <input
                type="checkbox"
                name="is_mandatory"
                checked={form.is_mandatory}
                onChange={handleChange}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Mandatory Item</p>
                <p className="text-xs text-slate-500">Cannot be deselected by EPC in calculator</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <input
                type="checkbox"
                name="is_included_in_kit"
                checked={form.is_included_in_kit}
                onChange={handleChange}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Included in Kit Price</p>
                <p className="text-xs text-slate-500">Cost already bundled; adds ₹0 to extra BOM</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <input
                type="checkbox"
                name="visible_to_epc"
                checked={form.visible_to_epc}
                onChange={handleChange}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Visible to EPC</p>
                <p className="text-xs text-slate-500">Show item row to EPC in estimation panel</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Active Status</p>
                <p className="text-xs text-slate-500">Enable this BOM item across platform</p>
              </div>
            </label>
          </div>

          {/* Audit Reason if Edit */}
          {isEdit && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Reason for Change (Audit Log)
              </label>
              <input
                type="text"
                name="rate_change_reason"
                value={form.rate_change_reason}
                onChange={handleChange}
                placeholder="e.g. Vendor price revision Q3 2026"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isUniversal ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                ● Universal BOM item across all ComboKits
              </span>
            ) : applyToAllMatching ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                ● Dynamic coverage for all kits matching Quick Filters ({availableKits.length} kits)
              </span>
            ) : (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                ● Assigned to {selectedKitIds.length} specific ComboKit{selectedKitIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 active:scale-95 rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              <span>{saving ? "Saving..." : isEdit ? "Save Changes" : "Create BOM Item"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
