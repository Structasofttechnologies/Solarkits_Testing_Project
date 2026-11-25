import React, { useState, useMemo } from "react";
import {
  FiSearch,
  FiPackage,
  FiSun,
  FiCheck,
  FiSliders,
  FiArrowRight,
  FiZap,
  FiTag,
  FiRefreshCw,
} from "react-icons/fi";
import Dropdown from "@/Components/Dropdown";
import Button from "@/Components/Button";

const SYSTEM_CAPACITIES = [
  { id: "all", label: "All Capacities" },
  { id: "small", label: "≤ 5 kW", min: 0, max: 5 },
  { id: "medium", label: "5 - 15 kW", min: 5.01, max: 15 },
  { id: "large", label: "> 15 kW", min: 15.01, max: 999 },
];

export default function Step4Solutions({
  solutions = [],
  shopHierarchy = [],
  selectedSolution,
  onSelect,
  onAddToCompare,
  compareList = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [selectedTierMap, setSelectedTierMap] = useState({});

  const [filters, setFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  // ── Quick Filter Dropdown Options (derived dynamically from hierarchy & kits) ───

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
    }
    solutions.forEach((kit) => {
      const name = kit.industryType || kit.industry_type_name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ value: name, text: name });
      }
    });

    return [{ value: "all", text: "All Industry Types" }, ...list];
  }, [shopHierarchy, solutions]);

  const categoryOptions = useMemo(() => {
    if (!filters.industryType || filters.industryType === "all") {
      return [{ value: "all", text: "Select Industry Type First" }];
    }
    const catMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType) ||
          ind.slug?.toLowerCase() === filters.industryType.toLowerCase()
      );
      if (selectedInd && selectedInd.categories) {
        selectedInd.categories.forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), {
              value: cat.name,
              text: cat.name,
              id: cat.id,
            });
          }
        });
      }
    }

    return [{ value: "all", text: "All Categories" }, ...Array.from(catMap.values())];
  }, [shopHierarchy, filters.industryType]);

  const subCategoryOptions = useMemo(() => {
    if (
      !filters.industryType ||
      filters.industryType === "all" ||
      !filters.category ||
      filters.category === "all"
    ) {
      return [{ value: "all", text: "Select Category First" }];
    }
    const subsMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType) ||
          ind.slug?.toLowerCase() === filters.industryType.toLowerCase()
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
              subsMap.set(sub.name.toLowerCase(), {
                value: sub.name,
                text: sub.name,
                id: sub.id,
              });
            }
          });
        }
      }
    }

    return [{ value: "all", text: "All Sub-Categories" }, ...Array.from(subsMap.values())];
  }, [shopHierarchy, filters.industryType, filters.category]);

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
    }

    return [{ value: "all", text: "All System Types" }, ...Array.from(typesMap.values())];
  }, [shopHierarchy, filters.industryType, filters.category, filters.subCategory]);

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
                    min: r.min_value || 0,
                  });
                }
              });
            }
          }
        }
      }
    }

    const uniqueRanges = Array.from(rangesMap.values()).sort(
      (a, b) => (a.min || 0) - (b.min || 0)
    );

    return [
      { value: "all", text: "All Project Ranges" },
      ...uniqueRanges.map((r) => ({ value: r.value, text: r.text })),
    ];
  }, [
    shopHierarchy,
    filters.industryType,
    filters.category,
    filters.subCategory,
    filters.systemType,
  ]);

  const clearMainFilters = () => {
    setFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
    setSearchTerm("");
    setSelectedCapacity("all");
  };

  // ── Real-time Kit Filtering ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...solutions];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((sol) => {
        const matchName = (sol.name || sol.kitName || "")?.toLowerCase().includes(q);
        const matchBrand = (sol.brand_name || sol.brand || "")?.toLowerCase().includes(q);
        const matchSku = (sol.sku || "")?.toLowerCase().includes(q);
        const matchDesc = (sol.description || "")?.toLowerCase().includes(q);
        const cap = sol.capacity_kw || sol.capacityKW || 0;
        const matchCap = cap > 0 && `${cap}kw`.includes(q.replace(/\s+/g, ""));
        return matchName || matchBrand || matchSku || matchDesc || matchCap;
      });
    }

    // Capacity quick filter
    if (selectedCapacity !== "all") {
      const capRule = SYSTEM_CAPACITIES.find((c) => c.id === selectedCapacity);
      if (capRule) {
        result = result.filter((sol) => {
          const cap = Number(sol.capacity_kw || sol.capacityKW || 0);
          return cap >= capRule.min && cap <= capRule.max;
        });
      }
    }

    // Quick Filters
    if (filters.industryType && filters.industryType !== "all") {
      const selInd = filters.industryType.toLowerCase();
      result = result.filter((sol) => {
        const ind = (sol.industryType || sol.industry_type_name || "").toLowerCase();
        if (ind === selInd) return true;
        if (sol.industry_type_id && String(sol.industry_type_id) === String(filters.industryType))
          return true;
        return ind.includes(selInd) || selInd.includes(ind);
      });
    }

    if (filters.category && filters.category !== "all") {
      const selCat = filters.category.toLowerCase();
      result = result.filter((sol) => {
        const cat = (sol.category || "").toLowerCase();
        if (cat === selCat) return true;
        if (sol.category_id && String(sol.category_id) === String(filters.category)) return true;
        return cat.includes(selCat) || selCat.includes(cat);
      });
    }

    if (filters.subCategory && filters.subCategory !== "all") {
      const selSub = filters.subCategory.toLowerCase();
      result = result.filter((sol) => {
        const sub = (sol.subCategory || sol.usageType || "").toLowerCase();
        if (sub === selSub) return true;
        if (sol.subcategory_id && String(sol.subcategory_id) === String(filters.subCategory))
          return true;
        return sub.includes(selSub) || selSub.includes(sub);
      });
    }

    if (filters.systemType && filters.systemType !== "all") {
      const selType = filters.systemType.toLowerCase();
      result = result.filter((sol) => {
        const type = (
          sol.projectType ||
          sol.inverter?.type ||
          sol.systemType ||
          ""
        ).toLowerCase();
        if (type === selType) return true;
        return type.includes(selType) || selType.includes(type);
      });
    }

    if (filters.projectRange && filters.projectRange !== "all") {
      result = result.filter((sol) => {
        if (sol.projectRange) {
          const rId = String(sol.projectRange.id || sol.projectRange.text);
          return rId === String(filters.projectRange);
        }
        return false;
      });
    }

    return result;
  }, [solutions, searchTerm, selectedCapacity, filters]);

  const isInCompare = (sol) => {
    const id = String(sol._id || sol.id);
    return compareList.some((c) => String(c.kit?._id || c.kit?.id || c._id || c.id) === id);
  };

  const handleSelectKitWithTier = (sol) => {
    const kitId = String(sol._id || sol.id);
    const chosenTier = selectedTierMap[kitId];

    let finalPrice = Number(sol.selling_price || sol.base_price || 0);
    let finalTierName = null;

    if (Array.isArray(sol.variants) && sol.variants.length > 0) {
      let matchedVariant = sol.variants.find((v) => v.productTier === chosenTier);
      if (!matchedVariant) matchedVariant = sol.variants[0];
      if (matchedVariant) {
        finalPrice = Number(matchedVariant.ourPrice || matchedVariant.price || finalPrice);
        finalTierName = matchedVariant.productTier;
      }
    }

    const resolvedKit = {
      ...sol,
      _id: sol._id || sol.id,
      id: sol.id || sol._id,
      selling_price: finalPrice,
      base_price: finalPrice,
      selected_tier: finalTierName,
      max_margin: Number(sol.max_margin || 0),
    };

    onSelect(resolvedKit);
  };

  const hasActiveFilters =
    filters.industryType !== "all" ||
    filters.category !== "all" ||
    filters.subCategory !== "all" ||
    filters.systemType !== "all" ||
    filters.projectRange !== "all" ||
    searchTerm.trim() !== "" ||
    selectedCapacity !== "all";

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-bold shadow-md shadow-primary/25">
              1
            </span>
            Select Solar Kit / Solution
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose any engineered ComboKit to calculate your custom EPC margins, BOM additions, and customer selling price.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {filtered.length} of {solutions.length} kits available
          </span>
        </div>
      </div>

      {/* ── Quick Filters Bar (Desktop & Mobile) ─────────────────────────────── */}
      <div className="bg-surface-hover rounded-xl p-4 border border-border bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiPackage className="text-primary dark:text-blue-400" size={18} />
            <h3 className="font-semibold text-text-primary dark:text-info text-slate-800 dark:text-slate-200">
              Quick Filters
            </h3>
          </div>
          {hasActiveFilters && (
            <Button onClick={clearMainFilters} variant="link" size="sm" className="text-primary hover:text-primary-hover dark:text-blue-400 font-semibold">
              Clear Main
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Dropdown
            label="Industry Type"
            options={industryTypeOptions}
            value={filters.industryType}
            onChange={(val) =>
              setFilters((prev) => ({
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
            disabled={filters.industryType === "all"}
            options={categoryOptions}
            value={filters.category}
            onChange={(val) =>
              setFilters((prev) => ({
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
            disabled={filters.category === "all"}
            options={subCategoryOptions}
            value={filters.subCategory}
            onChange={(val) =>
              setFilters((prev) => ({
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
            disabled={filters.subCategory === "all"}
            options={systemTypeOptions}
            value={filters.systemType}
            onChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                systemType: val,
                projectRange: "all",
              }))
            }
            className="w-full"
          />
          <Dropdown
            label="Project Range"
            disabled={filters.systemType === "all"}
            options={projectRangeOptions}
            value={filters.projectRange}
            onChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                projectRange: val,
              }))
            }
            className="w-full"
          />
        </div>
      </div>

      {/* ── Search and Capacity Pills ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by kit name, brand, capacity or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] uppercase font-black text-slate-400 shrink-0">Capacity:</span>
          <div className="flex items-center gap-1.5">
            {SYSTEM_CAPACITIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCapacity(c.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer ${selectedCapacity === c.id
                  ? "bg-primary text-white shadow-sm shadow-primary/25"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Solutions Kit Grid ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <FiSun className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No solar kits found matching your filters
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Try adjusting your search query, capacity range, or Quick Filters to display available kits.
          </p>
          <button
            type="button"
            onClick={clearMainFilters}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white transition shadow-sm cursor-pointer"
          >
            <FiRefreshCw className="w-3.5 h-3.5" /> Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sol) => {
            const solId = String(sol._id || sol.id);
            const isSelected =
              selectedSolution && String(selectedSolution._id || selectedSolution.id) === solId;
            const inCompare = isInCompare(sol);
            const capKw = Number(sol.capacity_kw || sol.capacityKW || 0);

            // Variants handling
            const variants = Array.isArray(sol.variants) ? sol.variants : [];
            const activeTier = selectedTierMap[solId] || (variants[0]?.productTier || null);
            const currentVariant = variants.find((v) => v.productTier === activeTier) || variants[0];
            const currentPrice = currentVariant
              ? Number(currentVariant.ourPrice || currentVariant.price || sol.selling_price || 0)
              : Number(sol.selling_price || sol.base_price || 0);

            return (
              <div
                key={solId}
                className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between relative bg-white dark:bg-slate-900 ${isSelected
                  ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10 ring-2 ring-primary/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 shadow-xs"
                  }`}
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-primary to-primary-end text-white shadow-xs">
                      {capKw} kW System
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wide">
                      {sol.sku || `SK-${solId.slice(-6).toUpperCase()}`}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100 leading-snug line-clamp-1" title={sol.name || sol.kitName}>
                      {sol.name || sol.kitName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-primary dark:text-blue-400">
                        {sol.brand_name || sol.brand || "Solarkits Certified"}
                      </span>
                      {(sol.industryType || sol.category) && (
                        <span className="text-[11px] text-slate-400">
                          • {sol.category || sol.industryType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Variant Tier Selector (if multiple tiers exist) */}
                  {variants.length > 1 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] uppercase font-black text-slate-400 mb-1.5">
                        Select Tier:
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {variants.map((v) => {
                          const isTierActive = activeTier === v.productTier;
                          return (
                            <button
                              key={v.id || v.productTier}
                              type="button"
                              onClick={() =>
                                setSelectedTierMap((prev) => ({
                                  ...prev,
                                  [solId]: v.productTier,
                                }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${isTierActive
                                ? "bg-primary text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                }`}
                            >
                              {v.productTier}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Components snippet */}
                  {Array.isArray(sol.base_components) && sol.base_components.length > 0 ? (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="text-[10px] uppercase font-black text-slate-400">
                        Hardware Breakdown:
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {sol.base_components
                          .map((c, i) => c.product_name || c.name || `Item ${i + 1}`)
                          .join(" • ")}
                      </div>
                    </div>
                  ) : sol.description ? (
                    <p className="text-xs text-slate-500 line-clamp-2 pt-1">
                      {sol.description}
                    </p>
                  ) : null}
                </div>

                {/* Bottom Pricing & Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Kit Base Cost</div>
                      <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                        ₹{currentPrice.toLocaleString("en-IN")}
                      </div>
                    </div>

                    {Number(sol.max_margin || 0) > 0 && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                          Max Margin Cap
                        </div>
                        <div className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">
                          ₹{Number(sol.max_margin).toLocaleString("en-IN")}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onAddToCompare && onAddToCompare(sol)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1 ${inCompare
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary"
                        }`}
                    >
                      {inCompare ? "In Compare ✓" : "+ Compare"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectKitWithTier(sol)}
                      className={`px-3 py-2 text-xs font-black rounded-xl transition cursor-pointer active:scale-95 flex items-center justify-center gap-1 shadow-md ${isSelected
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        : "bg-primary hover:bg-primary-hover text-white shadow-primary/25"
                        }`}
                    >
                      {isSelected ? "Selected ✓" : "Select Kit →"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
