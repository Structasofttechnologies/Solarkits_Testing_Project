import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getTrialKitStock,
  inwardTrialKitStock,
  adjustTrialKitStock,
  getTrialKitStockHistory,
  getHierarchyOptions,
  getTrialKitProcurementBadgeCounts
} from "../../api/trialKitsApi";
import {
  FaBoxes,
  FaHistory,
  FaWarehouse,
  FaTruckLoading,
  FaCheckCircle,
  FaTag,
  FaCreditCard
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheck, FiCheckCircle, FiAlertCircle, FiSliders } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const clean = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${clean}`;
};

export default function TrialKitInventoryPage() {
  const navigate = useNavigate();
  const [comboKits, setComboKits] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Active item for adjustment
  const [selectedAdjustmentTarget, setSelectedAdjustmentTarget] = useState(null);

  const [inwardForm, setInwardForm] = useState({
    combo_kit_id: "",
    kit_type: "",
    warehouse_id: "",
    quantity_received: 10,
    vendor_name: "",
    remarks: ""
  });

  const [adjustForm, setAdjustForm] = useState({
    adjustment_type: "increase_adjustment",
    quantity_change: 1,
    remarks: ""
  });

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Quick Filters State (Matching Screenshot 1) ───────────────────────────
  const [quickFilters, setQuickFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

  const [hierarchy, setHierarchy] = useState({
    shopHierarchy: [],
    industries: [],
    categories: [],
    subcategories: [],
    types: [],
    ranges: [],
  });

  const fetchHierarchy = async () => {
    try {
      const res = await getHierarchyOptions();
      if (res?.status === "success" && res.data) {
        setHierarchy(res.data);
      }
    } catch (err) {
      console.error("Failed to load hierarchy options:", err);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

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
    // Fallback: extract from loaded comboKits
    if (list.length === 0 && comboKits.length > 0) {
      comboKits.forEach((kit) => {
        if (kit.industryType && !seen.has(kit.industryType.toLowerCase())) {
          seen.add(kit.industryType.toLowerCase());
          list.push({ value: kit.industryType, text: kit.industryType });
        }
      });
    }
    return [{ value: "all", text: "All Industry Types" }, ...list];
  }, [shopHierarchy, hierarchy, comboKits]);

  const categoryOptions = useMemo(() => {
    const catMap = new Map();
    if (!quickFilters.industryType || quickFilters.industryType === "all") {
      if (shopHierarchy && shopHierarchy.length > 0) {
        shopHierarchy.forEach((ind) => {
          ind.categories?.forEach((cat) => {
            if (cat.name && !catMap.has(cat.name.toLowerCase())) {
              catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
            }
          });
        });
      } else if (hierarchy?.categories) {
        hierarchy.categories.forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
          }
        });
      }
      if (catMap.size === 0 && comboKits.length > 0) {
        comboKits.forEach((kit) => {
          if (kit.category && !catMap.has(kit.category.toLowerCase())) {
            catMap.set(kit.category.toLowerCase(), { value: kit.category, text: kit.category });
          }
        });
      }
      return [{ value: "all", text: "All Categories" }, ...Array.from(catMap.values())];
    }

    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
          String(ind.id) === String(quickFilters.industryType)
      );
      if (selectedInd && selectedInd.categories) {
        selectedInd.categories.forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
          }
        });
      }
    } else if (hierarchy?.categories) {
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
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name });
          }
        });
      }
    }
    if (catMap.size === 0 && comboKits.length > 0) {
      comboKits.forEach((kit) => {
        if (
          kit.category &&
          (!kit.industryType || kit.industryType.toLowerCase() === quickFilters.industryType.toLowerCase()) &&
          !catMap.has(kit.category.toLowerCase())
        ) {
          catMap.set(kit.category.toLowerCase(), { value: kit.category, text: kit.category });
        }
      });
    }
    return [{ value: "all", text: "All Categories" }, ...Array.from(catMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, comboKits]);

  const subCategoryOptions = useMemo(() => {
    const subsMap = new Map();
    if (
      !quickFilters.industryType ||
      quickFilters.industryType === "all" ||
      !quickFilters.category ||
      quickFilters.category === "all"
    ) {
      if (shopHierarchy && shopHierarchy.length > 0) {
        shopHierarchy.forEach((ind) => {
          ind.categories?.forEach((cat) => {
            cat.subcategories?.forEach((sub) => {
              if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
                subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
              }
            });
          });
        });
      } else if (hierarchy?.subcategories) {
        hierarchy.subcategories.forEach((sub) => {
          if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
            subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
          }
        });
      }
      if (subsMap.size === 0 && comboKits.length > 0) {
        comboKits.forEach((kit) => {
          if (kit.subCategory && !subsMap.has(kit.subCategory.toLowerCase())) {
            subsMap.set(kit.subCategory.toLowerCase(), { value: kit.subCategory, text: kit.subCategory });
          }
        });
      }
      return [{ value: "all", text: "All Sub-Categories" }, ...Array.from(subsMap.values())];
    }

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
              subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
            }
          });
        }
      }
    } else if (hierarchy?.subcategories) {
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
            subsMap.set(sub.name.toLowerCase(), { value: sub.name, text: sub.name });
          }
        });
      }
    }
    if (subsMap.size === 0 && comboKits.length > 0) {
      comboKits.forEach((kit) => {
        if (
          kit.subCategory &&
          (!kit.category || kit.category.toLowerCase() === quickFilters.category.toLowerCase()) &&
          !subsMap.has(kit.subCategory.toLowerCase())
        ) {
          subsMap.set(kit.subCategory.toLowerCase(), { value: kit.subCategory, text: kit.subCategory });
        }
      });
    }
    return [{ value: "all", text: "All Sub-Categories" }, ...Array.from(subsMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category, comboKits]);

  const systemTypeOptions = useMemo(() => {
    const typesMap = new Map();
    if (
      !quickFilters.category ||
      quickFilters.category === "all" ||
      !quickFilters.subCategory ||
      quickFilters.subCategory === "all"
    ) {
      if (hierarchy?.types) {
        hierarchy.types.forEach((t) => {
          if (t.name && !typesMap.has(t.name.toLowerCase())) {
            typesMap.set(t.name.toLowerCase(), { value: t.name, text: t.name });
          }
        });
      }
      if (typesMap.size === 0 && comboKits.length > 0) {
        comboKits.forEach((kit) => {
          if (kit.systemType && !typesMap.has(kit.systemType.toLowerCase())) {
            typesMap.set(kit.systemType.toLowerCase(), { value: kit.systemType, text: kit.systemType });
          }
        });
      }
      return [{ value: "all", text: "All System Types" }, ...Array.from(typesMap.values())];
    }

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
                typesMap.set(mt.name.toLowerCase(), { value: mt.name, text: mt.name });
              }
            });
          }
        }
      }
    } else if (hierarchy?.subcategories) {
      const matchedSub = (hierarchy?.subcategories || []).find(
        (s) =>
          s.name?.toLowerCase() === quickFilters.subCategory.toLowerCase() ||
          String(s._id) === String(quickFilters.subCategory)
      );
      if (matchedSub && hierarchy.types) {
        hierarchy.types.forEach((t) => {
          if (t.name && !typesMap.has(t.name.toLowerCase())) {
            typesMap.set(t.name.toLowerCase(), { value: t.name, text: t.name });
          }
        });
      }
    }
    if (typesMap.size === 0 && comboKits.length > 0) {
      comboKits.forEach((kit) => {
        if (
          kit.systemType &&
          (!kit.subCategory || kit.subCategory.toLowerCase() === quickFilters.subCategory.toLowerCase()) &&
          !typesMap.has(kit.systemType.toLowerCase())
        ) {
          typesMap.set(kit.systemType.toLowerCase(), { value: kit.systemType, text: kit.systemType });
        }
      });
    }
    return [{ value: "all", text: "All System Types" }, ...Array.from(typesMap.values())];
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category, quickFilters.subCategory, comboKits]);

  const projectRangeOptions = useMemo(() => {
    const rangesMap = new Map();
    if (
      !quickFilters.subCategory ||
      quickFilters.subCategory === "all" ||
      !quickFilters.systemType ||
      quickFilters.systemType === "all"
    ) {
      if (hierarchy?.ranges) {
        hierarchy.ranges.forEach((r) => {
          const idVal = String(r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || "kW"}`);
          if (idVal && !rangesMap.has(idVal.toLowerCase())) {
            rangesMap.set(idVal.toLowerCase(), { value: r.range_label || idVal, text: r.range_label || idVal });
          }
        });
      }
      if (rangesMap.size === 0 && comboKits.length > 0) {
        comboKits.forEach((kit) => {
          if (kit.projectRange && !rangesMap.has(kit.projectRange.toLowerCase())) {
            rangesMap.set(kit.projectRange.toLowerCase(), { value: kit.projectRange, text: kit.projectRange });
          }
        });
      }
      return [{ value: "all", text: "All Project Ranges" }, ...Array.from(rangesMap.values())];
    }

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
    if (rangesMap.size === 0 && comboKits.length > 0) {
      comboKits.forEach((kit) => {
        if (
          kit.projectRange &&
          (!kit.systemType || kit.systemType.toLowerCase() === quickFilters.systemType.toLowerCase()) &&
          !rangesMap.has(kit.projectRange.toLowerCase())
        ) {
          rangesMap.set(kit.projectRange.toLowerCase(), { value: kit.projectRange, text: kit.projectRange });
        }
      });
    }
    return [{ value: "all", text: "All Project Ranges" }, ...Array.from(rangesMap.values())];
  }, [
    shopHierarchy,
    hierarchy,
    quickFilters.industryType,
    quickFilters.category,
    quickFilters.subCategory,
    quickFilters.systemType,
    comboKits
  ]);

  const hasActiveFilters =
    quickFilters.industryType !== "all" ||
    quickFilters.category !== "all" ||
    quickFilters.subCategory !== "all" ||
    quickFilters.systemType !== "all" ||
    quickFilters.projectRange !== "all";

  const clearFilters = () => {
    setQuickFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
  };

  const filteredComboKits = useMemo(() => {
    return comboKits.filter((kit) => {
      if (quickFilters.industryType !== "all") {
        const ind = (kit.industryType || "").toLowerCase();
        const sel = quickFilters.industryType.toLowerCase();
        if (ind !== sel && !ind.includes(sel) && !sel.includes(ind)) return false;
      }
      if (quickFilters.category !== "all") {
        const cat = (kit.category || "").toLowerCase();
        const sel = quickFilters.category.toLowerCase();
        if (cat !== sel && !cat.includes(sel) && !sel.includes(cat)) return false;
      }
      if (quickFilters.subCategory !== "all") {
        const sub = (kit.subCategory || "").toLowerCase();
        const sel = quickFilters.subCategory.toLowerCase();
        if (sub !== sel && !sub.includes(sel) && !sel.includes(sub)) return false;
      }
      if (quickFilters.systemType !== "all") {
        const sys = (kit.systemType || "").toLowerCase();
        const sel = quickFilters.systemType.toLowerCase();
        if (sys !== sel && !sys.includes(sel) && !sel.includes(sys)) return false;
      }
      if (quickFilters.projectRange !== "all") {
        const rng = (kit.projectRange || "").toLowerCase();
        const sel = quickFilters.projectRange.toLowerCase();
        if (rng !== sel && !rng.includes(sel) && !sel.includes(rng)) return false;
      }
      return true;
    });
  }, [comboKits, quickFilters]);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getTrialKitStock();
      if (res?.success) {
        setComboKits(res.data || []);
        if (res.warehouses && res.warehouses.length > 0) {
          setWarehouses(res.warehouses);
        } else if (res.data?.[0]?.warehouse_allocations) {
          setWarehouses(res.data[0].warehouse_allocations.map(w => ({
            _id: w.warehouse_id,
            warehouse_name: w.warehouse_name,
            warehouse_code: w.warehouse_code
          })));
        }
      }
      try {
        const badgeRes = await getTrialKitProcurementBadgeCounts();
        if (badgeRes?.data?.pending_admin !== undefined) {
          setPendingApprovalCount(badgeRes.data.pending_admin);
        }
      } catch (bErr) {
        // non-blocking
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load trial kit stock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Open History
  const handleOpenHistory = async (inventoryId = null) => {
    try {
      setShowHistoryModal(true);
      setHistoryLoading(true);
      const params = inventoryId ? { inventory_id: inventoryId } : {};
      const res = await getTrialKitStockHistory(params);
      if (res?.success) {
        setHistoryList(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open Quick Inward for a specific kit & warehouse
  const handleOpenInward = (kit, allocation = null) => {
    setError("");
    setInwardForm({
      combo_kit_id: kit.combo_kit_id || kit._id,
      kit_type: kit.name,
      warehouse_id: allocation?.warehouse_id || warehouses[0]?._id || "",
      quantity_received: 10,
      vendor_name: "",
      remarks: ""
    });
    setShowInwardModal(true);
  };

  // Open Adjust for a specific kit & warehouse
  const handleOpenAdjust = (kit, allocation) => {
    setError("");
    setSelectedAdjustmentTarget({
      inventory_id: allocation.inventory_id,
      combo_kit_id: kit.combo_kit_id || kit._id,
      kit_name: kit.name,
      warehouse_id: allocation.warehouse_id,
      warehouse_name: allocation.warehouse_name,
      available_stock: allocation.available_stock
    });
    setAdjustForm({
      adjustment_type: "increase_adjustment",
      quantity_change: 1,
      remarks: ""
    });
    setShowAdjustModal(true);
  };

  // Submit Inward
  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await inwardTrialKitStock(inwardForm);
      if (res?.success) {
        setSuccess(res.message || "Inward recorded successfully.");
        setShowInwardModal(false);
        fetchStock();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record inward.");
    }
  };

  // Submit Adjust
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const qty = parseInt(adjustForm.quantity_change, 10);
      const finalChange = adjustForm.adjustment_type === "decrease_adjustment" ? -Math.abs(qty) : Math.abs(qty);

      const res = await adjustTrialKitStock({
        inventory_id: selectedAdjustmentTarget?.inventory_id,
        combo_kit_id: selectedAdjustmentTarget?.combo_kit_id,
        warehouse_id: selectedAdjustmentTarget?.warehouse_id,
        adjustment_type: adjustForm.adjustment_type,
        quantity_change: finalChange,
        remarks: adjustForm.remarks
      });

      if (res?.success) {
        setSuccess(res.message || "Stock adjusted successfully.");
        setShowAdjustModal(false);
        fetchStock();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to adjust stock.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaBoxes className="text-blue-600" />
            Trial Kit Inventory Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Section 2: Dedicated Trial Kit Inventory for Admin-configured Combo Kits. Track warehouse allocations and record vendor inwards.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/admin-panel/solar-shop/trial-kits/procurement")}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FaCreditCard />
            Procurement Approvals
            {pendingApprovalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 font-extrabold text-[10px]">
                {pendingApprovalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleOpenHistory()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FaHistory className="text-gray-500" />
            Allocation History
          </button>
          <button
            onClick={() => {
              if (comboKits.length > 0) {
                handleOpenInward(comboKits[0]);
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FaTruckLoading className="text-emerald-600" />
            Vendor Stock Inward
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center justify-between">
          <span className="flex items-center gap-2"><FiAlertCircle /> {error}</span>
          <button onClick={() => setError("")}><FiX /></button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center justify-between">
          <span className="flex items-center gap-2"><FiCheckCircle /> {success}</span>
          <button onClick={() => setSuccess("")}><FiX /></button>
        </div>
      )}

      {/* ── Quick Filters Bar (Matching Screenshot 1 & 2) ─────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-800"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <h3 className="font-bold text-sm text-slate-800">
              Quick Filters
            </h3>
          </div>

          <button
            onClick={clearFilters}
            type="button"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer hover:underline disabled:opacity-40 disabled:cursor-default disabled:no-underline"
            disabled={!hasActiveFilters}
          >
            Clear Main
          </button>
        </div>

        {/* 5 Cascading Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Industry Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
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
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
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

      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span>
            Configured Combo Kits ({hasActiveFilters ? `${filteredComboKits.length} of ${comboKits.length}` : comboKits.length})
          </span>
          <span className="text-xs font-normal text-gray-500">
            • Sourced dynamically from Combo Kit Configurations
          </span>
        </div>
        <button
          onClick={fetchStock}
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-20 text-center text-sm text-gray-500">
          <FiRefreshCw className="animate-spin inline-block mr-2" />
          Loading Configured Combo Kits & Warehouse Allocations...
        </div>
      )}

      {/* No Kits Empty State */}
      {!loading && comboKits.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <FaBoxes className="mx-auto text-4xl text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Configured Combo Kits Found</h3>
          <p className="text-xs text-gray-500 mt-1">
            Combo kits configured by Admin in Solar Kit Configurations will appear here automatically.
          </p>
        </div>
      )}

      {/* No Filtered Results Empty State */}
      {!loading && comboKits.length > 0 && filteredComboKits.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <FaBoxes className="mx-auto text-4xl text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Combo Kits Match the Selected Filters</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Try adjusting your Quick Filters or click below to reset.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* CARD FORMAT: Configured Combo Kits Grid */}
      <div className="space-y-6">
        {filteredComboKits.map((kit) => {
          const coverUrl = resolveImageUrl(kit.kit_image);
          const totalAvailable = kit.total_available_stock || 0;

          return (
            <div
              key={kit._id || kit.combo_kit_id}
              className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition-all hover:shadow-md"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/70 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Cover Image */}
                  <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={kit.name}
                        className="w-full h-full object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <FaBoxes className="text-2xl text-blue-500 opacity-60" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900 tracking-tight">
                        {kit.name}
                      </h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {kit.capacity} kW System
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      Blueprint: {kit.blueprint_name}
                    </p>

                    {/* Tags / Configured Brands / Trial MOQ */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Trial MOQ Tag (Exact match to Image 2) */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FaCheckCircle className="text-[10px]" />
                        TRIAL: {kit.trial_kit_quantity || 1} KITS
                        <span className="text-[10px] font-normal text-emerald-600">
                          (LIMIT: {kit.trial_kit_max_orders_per_buyer || 1}X/BUYER)
                        </span>
                      </span>

                      {/* Configured Brands */}
                      {kit.configured_brands?.map((brand) => (
                        <span
                          key={brand}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          <FaTag className="text-[9px] text-gray-400" />
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Overall Kit Stock Summary Badge */}
                <div className="flex items-center gap-3 self-start md:self-center">
                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 font-semibold block">Total Available</span>
                    <span className={`text-lg font-black ${totalAvailable > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {totalAvailable} Kits
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenInward(kit)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FaTruckLoading /> Inward Stock
                  </button>
                </div>
              </div>

              {/* Warehouse Stock Allocation Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">Warehouse</th>
                      <th className="py-2.5 px-4 text-center">Available Stock</th>
                      <th className="py-2.5 px-4 text-center">Reserved</th>
                      <th className="py-2.5 px-4 text-center">Ordered</th>
                      <th className="py-2.5 px-4 text-center">Dispatched</th>
                      <th className="py-2.5 px-4 text-center">Delivered</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kit.warehouse_allocations?.map((alloc) => {
                      const isStockAvail = (alloc.available_stock || 0) > 0;

                      return (
                        <tr key={alloc.warehouse_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-800 flex items-center gap-2">
                            <FaWarehouse className="text-gray-400 shrink-0" />
                            <span>{alloc.warehouse_name || alloc.warehouse_code}</span>
                            {alloc.warehouse_code && (
                              <span className="text-[10px] text-gray-400 font-mono">({alloc.warehouse_code})</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${isStockAvail
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-700"
                                }`}
                            >
                              {alloc.available_stock || 0}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center text-gray-600 font-semibold">
                            {alloc.reserved_stock || 0}
                          </td>

                          <td className="py-3 px-4 text-center text-gray-600 font-semibold">
                            {alloc.ordered_quantity || 0}
                          </td>

                          <td className="py-3 px-4 text-center text-gray-600 font-semibold">
                            {alloc.dispatched_quantity || 0}
                          </td>

                          <td className="py-3 px-4 text-center text-emerald-700 font-semibold">
                            {alloc.delivered_quantity || 0}
                          </td>

                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenAdjust(kit, alloc)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => handleOpenInward(kit, alloc)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Inward
                            </button>
                            {alloc.inventory_id && (
                              <button
                                onClick={() => handleOpenHistory(alloc.inventory_id)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                History
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* VENDOR INWARD MODAL */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FaTruckLoading className="text-emerald-600" /> Record Vendor Inward
              </h3>
              <button onClick={() => setShowInwardModal(false)} className="cursor-pointer"><FiX /></button>
            </div>

            <form onSubmit={handleInwardSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Configured Combo Kit</label>
                <select
                  value={inwardForm.combo_kit_id}
                  onChange={(e) => {
                    const selected = comboKits.find(k => (k.combo_kit_id || k._id) === e.target.value);
                    setInwardForm({
                      ...inwardForm,
                      combo_kit_id: e.target.value,
                      kit_type: selected ? selected.name : inwardForm.kit_type
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  {comboKits.map((k) => (
                    <option key={k.combo_kit_id || k._id} value={k.combo_kit_id || k._id}>
                      {k.name} ({k.capacity} kW)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Destination Warehouse</label>
                <select
                  required
                  value={inwardForm.warehouse_id}
                  onChange={(e) => setInwardForm({ ...inwardForm, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.warehouse_name || w.warehouse_code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardForm.quantity_received}
                    onChange={(e) => setInwardForm({ ...inwardForm, quantity_received: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={inwardForm.vendor_name}
                    onChange={(e) => setInwardForm({ ...inwardForm, vendor_name: e.target.value })}
                    placeholder="e.g. Havells / L&T"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Remarks</label>
                <input
                  type="text"
                  value={inwardForm.remarks}
                  onChange={(e) => setInwardForm({ ...inwardForm, remarks: e.target.value })}
                  placeholder="PO / Invoice ref..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Confirm Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {showAdjustModal && selectedAdjustmentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FiSliders className="text-blue-600" /> Adjust Available Stock
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="cursor-pointer"><FiX /></button>
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs space-y-1">
              <div><span className="font-semibold text-gray-600">Kit:</span> {selectedAdjustmentTarget.kit_name}</div>
              <div><span className="font-semibold text-gray-600">Warehouse:</span> {selectedAdjustmentTarget.warehouse_name}</div>
              <div><span className="font-semibold text-gray-600">Current Available:</span> <strong className="text-emerald-700">{selectedAdjustmentTarget.available_stock} Units</strong></div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Adjustment Type</label>
                <select
                  value={adjustForm.adjustment_type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  <option value="increase_adjustment">Increase Stock (+)</option>
                  <option value="decrease_adjustment">Decrease Stock (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustForm.quantity_change}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Reason / Remarks (Required for Audit)</label>
                <textarea
                  required
                  rows="2"
                  value={adjustForm.remarks}
                  onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                  placeholder="Physical audit discrepancy, damaged stock, etc..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FaHistory className="text-blue-600" /> Trial Kit Stock Allocation History
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="cursor-pointer"><FiX /></button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-gray-500">Loading history logs...</div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">No stock history records found.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Operation</th>
                      <th className="py-2 px-3">Kit</th>
                      <th className="py-2 px-3">Warehouse</th>
                      <th className="py-2 px-3 text-center">Change</th>
                      <th className="py-2 px-3 text-center">Prev $\to$ New</th>
                      <th className="py-2 px-3">User &amp; Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyList.map((h) => (
                      <tr key={h._id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 whitespace-nowrap text-gray-500">
                          {new Date(h.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold capitalize text-gray-800">
                          {h.adjustment_type?.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">{h.kit_type}</td>
                        <td className="py-2.5 px-3 text-gray-600">{h.warehouse_name}</td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={h.quantity_change > 0 ? "text-emerald-700" : "text-red-700"}
                          >
                            {h.quantity_change > 0 ? `+${h.quantity_change}` : h.quantity_change}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-600 font-mono text-[11px]">
                          {h.previous_available_stock} $\to$ {h.new_available_stock}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-800">{h.user_name}</div>
                          <div className="text-[10px] text-gray-400 italic truncate max-w-[200px]" title={h.remarks}>
                            {h.remarks || "-"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
