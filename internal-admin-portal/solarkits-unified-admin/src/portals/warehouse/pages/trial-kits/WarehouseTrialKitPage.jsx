import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import { authHeaderObj } from "../../app/authHeader";
import {
  FaBoxes,
  FaTruck,
  FaTruckLoading,
  FaCheckCircle,
  FaWarehouse,
  FaSearch,
  FaLayerGroup,
  FaPhoneAlt,
  FaUserCheck,
  FaClock,
  FaTimes,
  FaFileInvoice,
  FaInfoCircle,
  FaCheck,
  FaExternalLinkAlt
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheck, FiSliders } from "react-icons/fi";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/warehouse-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/warehouse-api$|\/admin-api$|\/account-api$|\/api$/, "");
const BASE_URL = `${API_BASE}/warehouse-api/trial-kits`;

// Canonical Warehouse Name Resolver Helper
const getWarehouseLabel = (item) => {
  if (!item) return "Warehouse";
  const code = item.warehouse_code || item.warehouse_id?.warehouse_code || "";
  const name = item.warehouse_name || item.warehouse_id?.warehouse_name || "";
  if (name && name !== code && !name.startsWith("IND_")) {
    return name;
  }
  if (code === "IND_GUJ_001") return "Ahmedabad Central Warehouse";
  if (code === "IND_GUJ_002") return "Surat Regional Warehouse";
  if (item.warehouse_id?.city || item.warehouse_id?.state) {
    return `${item.warehouse_id.city || item.warehouse_id.state} Warehouse`;
  }
  return name || code || "Warehouse";
};

const KIT_TYPES = [
  "1 kW Trial Kit",
  "2 kW Trial Kit",
  "3 kW Trial Kit",
  "5 kW Trial Kit"
];

export default function WarehouseTrialKitPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [stockList, setStockList] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'stock' | 'procurements'
  const [orderFilterTab, setOrderFilterTab] = useState("all"); // 'all' | 'ready' | 'out_for_delivery' | 'delivered'
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Selected Procurement for Inspection/Details Drawer
  const [viewProcurement, setViewProcurement] = useState(null);

  // Direct Out for Delivery Modal
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState(null); // { order, isGroup: boolean }
  const [dispatchForm, setDispatchForm] = useState({
    courier_name: "Local Company Fleet",
    vehicle_number: "",
    driver_name: "",
    driver_phone: "",
    tracking_number: "",
    tracking_url: "",
    delivery_notes: ""
  });
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  // Mark Delivered Confirmation
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);
  const [deliveredTarget, setDeliveredTarget] = useState(null);
  const [deliveredNotes, setDeliveredNotes] = useState("Delivered successfully at site.");
  const [deliveredSubmitting, setDeliveredSubmitting] = useState(false);

  // ── Quick Filters State (for Warehouse Trial Kit Stock Summary) ──
  const [quickFilters, setQuickFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [stockSearchTerm, setStockSearchTerm] = useState("");

  const [hierarchy, setHierarchy] = useState({
    shopHierarchy: [],
    industries: [],
    categories: [],
    subcategories: [],
    types: [],
    ranges: [],
  });

  const fetchHierarchy = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin-api/estimator/project-boms/hierarchy-options`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success" && res.data.data) {
        setHierarchy(res.data.data);
      }
    } catch {
      // Gracefully fall back to dynamic stockList extraction
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const shopHierarchy = useMemo(() => hierarchy?.shopHierarchy || [], [hierarchy?.shopHierarchy]);

  // 1. Industry Type Options
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
    // Dynamic fallback: extract from loaded stockList
    if (list.length === 0 && stockList.length > 0) {
      stockList.forEach((kit) => {
        if (kit.industryType && !seen.has(kit.industryType.toLowerCase())) {
          seen.add(kit.industryType.toLowerCase());
          list.push({ value: kit.industryType, text: kit.industryType });
        }
      });
    }
    return [{ value: "all", text: "All Industry Types" }, ...list];
  }, [shopHierarchy, hierarchy, stockList]);

  // 2. Category Options
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
      if (catMap.size === 0 && stockList.length > 0) {
        stockList.forEach((kit) => {
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
    if (catMap.size === 0 && stockList.length > 0) {
      stockList.forEach((kit) => {
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
  }, [shopHierarchy, hierarchy, quickFilters.industryType, stockList]);

  // 3. Sub Category Options
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
      if (subsMap.size === 0 && stockList.length > 0) {
        stockList.forEach((kit) => {
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
    if (subsMap.size === 0 && stockList.length > 0) {
      stockList.forEach((kit) => {
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
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category, stockList]);

  // 4. System Type Options
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
      if (typesMap.size === 0 && stockList.length > 0) {
        stockList.forEach((kit) => {
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
    if (typesMap.size === 0 && stockList.length > 0) {
      stockList.forEach((kit) => {
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
  }, [shopHierarchy, hierarchy, quickFilters.industryType, quickFilters.category, quickFilters.subCategory, stockList]);

  // 5. Project Range Options
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
          const idVal = String(r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`);
          if (idVal && !rangesMap.has(idVal.toLowerCase())) {
            rangesMap.set(idVal.toLowerCase(), {
              value: r.range_label || idVal,
              text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`
            });
          }
        });
      }
      if (rangesMap.size === 0 && stockList.length > 0) {
        stockList.forEach((kit) => {
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
                    text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`
                  });
                }
              });
            }
          }
        }
      }
    }
    if (rangesMap.size === 0 && stockList.length > 0) {
      stockList.forEach((kit) => {
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
    stockList
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
      projectRange: "all"
    });
    setWarehouseFilter("all");
    setStockSearchTerm("");
  };

  const filteredStockList = useMemo(() => {
    return stockList.filter((kit) => {
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
      if (stockSearchTerm.trim()) {
        const q = stockSearchTerm.toLowerCase();
        const name = (kit.name || kit.kit_type || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [stockList, quickFilters, stockSearchTerm]);

  const displayedStockRows = useMemo(() => {
    return filteredStockList.flatMap((kit) => {
      const allocations = (kit.warehouse_allocations && kit.warehouse_allocations.length > 0)
        ? kit.warehouse_allocations.map((alloc) => ({
            ...alloc,
            kit_name: kit.name,
            capacity: kit.capacity
          }))
        : [{
            inventory_id: kit._id,
            combo_kit_id: kit.combo_kit_id || kit._id,
            kit_name: kit.name || kit.kit_type,
            capacity: kit.capacity,
            warehouse_name: kit.warehouse_id?.warehouse_name || kit.warehouse_name || "General",
            warehouse_code: kit.warehouse_id?.warehouse_code || kit.warehouse_code || "",
            available_stock: kit.available_stock || kit.total_available_stock || 0,
            reserved_stock: kit.reserved_stock || kit.total_reserved_stock || 0,
            ordered_quantity: kit.ordered_quantity || kit.total_ordered_quantity || 0,
            dispatched_quantity: kit.dispatched_quantity || 0,
            delivered_quantity: kit.delivered_quantity || kit.total_delivered_quantity || 0
          }];

      if (warehouseFilter !== "all") {
        return allocations.filter((a) =>
          String(a.warehouse_id) === String(warehouseFilter) ||
          a.warehouse_code === warehouseFilter ||
          (a.warehouse_name && a.warehouse_name.toLowerCase().includes(warehouseFilter.toLowerCase()))
        );
      }
      return allocations;
    });
  }, [filteredStockList, warehouseFilter]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [stockRes, ordersRes, procRes] = await Promise.all([
        axios.get(`${BASE_URL}/stock`, { headers: authHeaderObj() }),
        axios.get(`${BASE_URL}/orders?limit=100`, { headers: authHeaderObj() }),
        axios.get(`${BASE_URL}/procurement/list?limit=100`, { headers: authHeaderObj() }).catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (stockRes.data?.success) {
        setStockList(stockRes.data.data || []);
        setWarehouses(stockRes.data.warehouses || []);
      }
      if (ordersRes.data?.success) setOrders(ordersRes.data.data || []);
      if (procRes.data?.success) setProcurements(procRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load warehouse trial kit data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pre-populate default IDs in inwardForm when lists load
  // Synchronize tab with route or query param (e.g. /trial-kits/inward or ?tab=procurements)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "procurements" || tabParam === "inward" || location.pathname.includes("/inward")) {
      setActiveTab("procurements");
    } else if (tabParam === "stock" || location.pathname.includes("/stock")) {
      setActiveTab("stock");
    } else if (tabParam === "orders" || location.pathname.includes("/orders")) {
      setActiveTab("orders");
    }
  }, [location.pathname, searchParams]);

  // Open Direct Out for Delivery Modal
  const handleOpenDispatch = (order, isGroup = false) => {
    setDispatchTarget({ order, isGroup });
    const defaultTracking = `TRK-TK-${Date.now().toString().slice(-6)}`;
    setDispatchForm({
      courier_name: "Local Company Fleet",
      vehicle_number: "GJ-03-BW-" + Math.floor(1000 + Math.random() * 9000),
      driver_name: "Ramesh Sharma",
      driver_phone: "9825012345",
      tracking_number: defaultTracking,
      tracking_url: "",
      delivery_notes: isGroup ? `Group Batch [${order.group_id}] direct dispatch to customer site` : "Direct dispatch to customer site"
    });
    setShowDispatchModal(true);
  };

  // Submit Direct Out for Delivery
  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchTarget) return;
    setDispatchSubmitting(true);
    try {
      setError("");
      const payload = {
        courier_name: dispatchForm.courier_name,
        vehicle_number: dispatchForm.vehicle_number,
        driver_name: dispatchForm.driver_name,
        driver_phone: dispatchForm.driver_phone,
        tracking_number: dispatchForm.tracking_number,
        tracking_url: dispatchForm.tracking_url,
        delivery_notes: dispatchForm.delivery_notes,
      };

      if (dispatchTarget.isGroup && dispatchTarget.order?.group_id) {
        payload.group_id = dispatchTarget.order.group_id;
      } else {
        payload.order_id = dispatchTarget.order._id;
      }

      const res = await axios.post(`${BASE_URL}/direct-out-for-delivery`, payload, {
        headers: authHeaderObj()
      });

      if (res.data?.success) {
        setSuccess(res.data.message || "Order(s) marked Out for Delivery!");
        setShowDispatchModal(false);
        setDispatchTarget(null);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate Out for Delivery.");
    } finally {
      setDispatchSubmitting(false);
    }
  };

  // Open Mark Delivered Modal
  const handleOpenDelivered = (order, isGroup = false) => {
    setDeliveredTarget({ order, isGroup });
    setDeliveredNotes("Delivered and accepted at customer premises.");
    setShowDeliveredModal(true);
  };

  // Submit Mark Delivered
  const handleConfirmDelivered = async (e) => {
    e.preventDefault();
    if (!deliveredTarget) return;
    setDeliveredSubmitting(true);
    try {
      setError("");
      const payload = {
        delivery_notes: deliveredNotes
      };

      if (deliveredTarget.isGroup && deliveredTarget.order?.group_id) {
        payload.group_id = deliveredTarget.order.group_id;
      } else {
        payload.order_id = deliveredTarget.order._id;
      }

      const res = await axios.post(`${BASE_URL}/mark-delivered`, payload, {
        headers: authHeaderObj()
      });

      if (res.data?.success) {
        setSuccess(res.data.message || "Order marked Delivered!");
        setShowDeliveredModal(false);
        setDeliveredTarget(null);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark delivered.");
    } finally {
      setDeliveredSubmitting(false);
    }
  };

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      const isDelivered = o.order_status === "delivered";
      const isOutForDelivery = o.order_status === "out_for_delivery" || o.order_status === "dispatched";
      const isReady = !isDelivered && !isOutForDelivery;

      if (orderFilterTab === "ready" && !isReady) return false;
      if (orderFilterTab === "out_for_delivery" && !isOutForDelivery) return false;
      if (orderFilterTab === "delivered" && !isDelivered) return false;

      // Text search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesNo = (o.order_number || "").toLowerCase().includes(term);
        const matchesEpc = (o.epc_company_name || o.epc_name || "").toLowerCase().includes(term);
        const matchesGst = (o.gst_number || "").toLowerCase().includes(term);
        const matchesGroup = (o.group_id || "").toLowerCase().includes(term);
        const matchesDist = (o.delivery_details?.shipping_address?.district || "").toLowerCase().includes(term);
        if (!matchesNo && !matchesEpc && !matchesGst && !matchesGroup && !matchesDist) return false;
      }

      return true;
    });
  }, [orders, orderFilterTab, searchTerm]);

  // Order Counts
  const orderCounts = useMemo(() => {
    const ready = orders.filter((o) => o.order_status !== "delivered" && o.order_status !== "out_for_delivery" && o.order_status !== "dispatched").length;
    const out = orders.filter((o) => o.order_status === "out_for_delivery" || o.order_status === "dispatched").length;
    const delivered = orders.filter((o) => o.order_status === "delivered").length;
    return { all: orders.length, ready, out, delivered };
  }, [orders]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in">
      {/* ─────────────────────────────────────────────────────────────────────
          PAGE HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            {activeTab === "procurements" ? (
              <>
                <FaFileInvoice className="text-blue-600" />
                Trial Kit Inward Indents & Procurement Requests
              </>
            ) : activeTab === "stock" ? (
              <>
                <FaBoxes className="text-blue-600" />
                Warehouse Trial Kit Stock Summary
              </>
            ) : (
              <>
                <FaTruck className="text-blue-600" />
                Warehouse Trial Kit Orders Fulfillment
              </>
            )}
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            {activeTab === "procurements" ? (
              <span>Raise inward requests (GRN) to Accounts and track status through Admin approval</span>
            ) : activeTab === "stock" ? (
              <span>Real-time stock ledger of trial kits allocated to this warehouse</span>
            ) : (
              <>
                <span>Inbound Trial Orders</span>
                <span>•</span>
                <span className="font-semibold text-emerald-600">Direct Out for Delivery (No Procurement Delay)</span>
                <span>•</span>
                <span>Site Delivery Confirmation</span>
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs border border-emerald-200">{success}</div>}

      {/* ─────────────────────────────────────────────────────────────────────
          ORDERS FULFILLMENT TAB
      ───────────────────────────────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Sub-Filters and Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setOrderFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  orderFilterTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All Orders ({orderCounts.all})
              </button>
              <button
                onClick={() => setOrderFilterTab("ready")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  orderFilterTab === "ready" ? "bg-white text-blue-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Ready for Dispatch ({orderCounts.ready})
              </button>
              <button
                onClick={() => setOrderFilterTab("out_for_delivery")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  orderFilterTab === "out_for_delivery" ? "bg-white text-purple-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Out for Delivery ({orderCounts.out})
              </button>
              <button
                onClick={() => setOrderFilterTab("delivered")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  orderFilterTab === "delivered" ? "bg-white text-emerald-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Delivered ({orderCounts.delivered})
              </button>
            </div>

            <div className="relative w-full md:w-72">
              <FaSearch className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders, EPC, group..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8.5 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Order # & Batch</th>
                  <th className="py-3 px-4">EPC Name</th>
                  <th className="py-3 px-4">Kit Type</th>
                  <th className="py-3 px-4">Destination Address</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Driver / Tracking</th>
                  <th className="py-3 px-4 text-right">Fulfillment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading fulfillment orders...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">No orders queued under this status.</td></tr>
                ) : (
                  filteredOrders.map((o) => {
                    const isDelivered = o.order_status === "delivered";
                    const isOutForDelivery = o.order_status === "out_for_delivery" || o.order_status === "dispatched";
                    const isReady = !isDelivered && !isOutForDelivery;
                    const address = o.delivery_details?.shipping_address || o.shipping_address || {};

                    return (
                      <tr key={o._id} className="hover:bg-gray-50/70">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-gray-900">{o.order_number}</div>
                          {o.is_grouped && o.group_id ? (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-100 text-purple-800">
                              Batch: {o.group_id}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Individual Order</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-800">{o.epc_company_name || o.epc_name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">GSTIN: {o.gst_number || "—"}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{o.kit_type}</div>
                          <div className="text-[10px] text-gray-400">Complete Ready Kit</div>
                        </td>

                        <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                          <div>{address.address || address.district}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {address.district}, {address.state} - {address.pincode}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                            isDelivered
                              ? "bg-emerald-100 text-emerald-800"
                              : isOutForDelivery
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                          }`}>
                            {isDelivered
                              ? "Delivered"
                              : isOutForDelivery
                                ? "Out for Delivery"
                                : "Ready to Dispatch"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-gray-600 text-[11px]">
                          {o.delivery_details?.driver_name ? (
                            <div>
                              <div className="font-semibold text-gray-800 flex items-center gap-1">
                                <FaUserCheck className="w-2.5 h-2.5 text-blue-600" />
                                {o.delivery_details.driver_name}
                              </div>
                              <div className="text-[10px] font-mono text-gray-400">
                                {o.delivery_details.vehicle_number || o.delivery_details.courier_name}
                              </div>
                            </div>
                          ) : o.delivery_details?.tracking_number ? (
                            <span className="font-mono text-gray-700">{o.delivery_details.tracking_number}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {isReady && (
                            <>
                              <button
                                onClick={() => handleOpenDispatch(o, false)}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <FaTruck className="w-3 h-3" />
                                Direct Out for Delivery
                              </button>
                              {o.is_grouped && o.group_id && (
                                <button
                                  onClick={() => handleOpenDispatch(o, true)}
                                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                                  title="Dispatch all orders belonging to this group batch"
                                >
                                  <FaLayerGroup className="w-3 h-3" />
                                  Dispatch Batch
                                </button>
                              )}
                            </>
                          )}

                          {isOutForDelivery && (
                            <>
                              <button
                                onClick={() => handleOpenDelivered(o, false)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <FaCheckCircle className="w-3 h-3" />
                                Mark Delivered
                              </button>
                              {o.is_grouped && o.group_id && (
                                <button
                                  onClick={() => handleOpenDelivered(o, true)}
                                  className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                                  title="Mark all orders in this batch delivered"
                                >
                                  Delivered (Batch)
                                </button>
                              )}
                            </>
                          )}

                          {isDelivered && (
                            <span className="text-emerald-600 font-bold text-xs inline-flex items-center gap-1">
                              <FaCheckCircle /> Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          STOCK SUMMARY TAB
      ───────────────────────────────────────────────────────────────────── */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* ── Quick Filters Bar (Matching Screenshot 1) ── */}
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
                disabled={!hasActiveFilters && warehouseFilter === "all" && !stockSearchTerm}
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

          {/* ── Secondary Controls: Warehouse & Search Bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-xs">
            <div className="flex items-center gap-2 text-gray-600 font-semibold">
              <FaBoxes className="text-blue-600" />
              <span>
                Showing <strong className="text-gray-900">{filteredStockList.length}</strong> of <strong className="text-gray-900">{stockList.length}</strong> Trial Kits
                <span className="text-gray-400 font-normal ml-1">({displayedStockRows.length} warehouse rows)</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Warehouse Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <FaWarehouse className="text-gray-400" />
                <select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Warehouses</option>
                  {warehouses.map((wh) => (
                    <option key={wh._id || wh.warehouse_code} value={wh._id || wh.warehouse_code}>
                      {wh.warehouse_name || wh.warehouse_code} {wh.warehouse_code ? `(${wh.warehouse_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Search Input */}
              <div className="relative">
                <FaSearch className="absolute left-2.5 top-2 text-gray-400 text-[10px]" />
                <input
                  type="text"
                  placeholder="Search kit name..."
                  value={stockSearchTerm}
                  onChange={(e) => setStockSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                />
              </div>
            </div>
          </div>

          {/* ── Table Container ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Kit Type</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-center">Reserved</th>
                  <th className="py-3 px-4 text-center">Ordered</th>
                  <th className="py-3 px-4 text-center">Dispatched</th>
                  <th className="py-3 px-4 text-center">Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedStockRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">
                      <FaBoxes className="text-3xl text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold text-gray-600">No trial kits match the selected Quick Filters.</p>
                      <button
                        onClick={clearFilters}
                        className="mt-3 px-3.5 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer"
                      >
                        Clear Quick Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  displayedStockRows.map((item, idx) => (
                    <tr key={item.inventory_id || `${item.combo_kit_id}-${item.warehouse_id || idx}`} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {item.kit_name} {item.capacity ? `(${item.capacity} kW System)` : ""}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {item.warehouse_name || item.warehouse_code || "Warehouse"}
                        {item.warehouse_code && (
                          <span className="text-[10px] text-gray-400 font-mono ml-1.5">({item.warehouse_code})</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">{item.available_stock || 0}</td>
                      <td className="py-3 px-4 text-center text-amber-700">{item.reserved_stock || 0}</td>
                      <td className="py-3 px-4 text-center text-blue-700">{item.ordered_quantity || 0}</td>
                      <td className="py-3 px-4 text-center text-purple-700">{item.dispatched_quantity || 0}</td>
                      <td className="py-3 px-4 text-center text-emerald-700">{item.delivered_quantity || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          INWARD & PROCUREMENT REQUESTS TAB
      ───────────────────────────────────────────────────────────────────── */}
      {activeTab === "procurements" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
            <div>
              <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <FaFileInvoice className="text-blue-600" />
                Trial Kit Inward Indents & Procurement Requests
              </h2>
              <p className="text-xs text-blue-700 mt-0.5">
                Track trial kit inward indents, vendor payments, and final admin stock approvals.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">PR / GRN No.</th>
                  <th className="py-3 px-4">Combo Kit & Warehouse</th>
                  <th className="py-3 px-4 text-center">Inward Qty</th>
                  <th className="py-3 px-4">Inspection</th>
                  <th className="py-3 px-4 text-center">Lifecycle Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {procurements.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-gray-400">
                      No trial kit inward requests found. Click "Raise Inward Request" to initiate.
                    </td>
                  </tr>
                ) : (
                  procurements.map((proc) => {
                    let statusBadge = (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Pending Accounts Payment
                      </span>
                    );
                    if (proc.status === "payment_recorded") {
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          Payment Recorded (Pending Admin)
                        </span>
                      );
                    } else if (proc.status === "approved") {
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Approved & Inwarded
                        </span>
                      );
                    } else if (proc.status === "rejected") {
                      statusBadge = (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          Rejected
                        </span>
                      );
                    }

                    return (
                      <tr key={proc._id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-blue-600 block">{proc.procurement_number}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{proc.grn_number}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block text-xs">{proc.kit_type}</span>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <FaWarehouse className="text-blue-600 text-[10px] shrink-0" />
                            <strong className="text-gray-800">{getWarehouseLabel(proc)}</strong>
                            {(proc.warehouse_code || proc.warehouse_id?.warehouse_code) && (
                              <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md">
                                {proc.warehouse_code || proc.warehouse_id?.warehouse_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold rounded-md text-xs border border-emerald-200">
                            +{proc.inward_quantity} Kits
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            proc.warehouse_inspection_status === "passed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {proc.warehouse_inspection_status === "passed" ? "Passed" : "Damage / Partial"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">{statusBadge}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setViewProcurement(proc)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <FaInfoCircle /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          DIRECT OUT FOR DELIVERY MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {showDispatchModal && dispatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <FaTruck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {dispatchTarget.isGroup
                      ? `Direct Out for Delivery — Batch [${dispatchTarget.order?.group_id}]`
                      : `Direct Out for Delivery — Order #${dispatchTarget.order?.order_number}`}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Assign delivery fleet & initiate site delivery tracking
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowDispatchModal(false); setDispatchTarget(null); }}
                className="text-gray-400 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Transporter / Fleet Type</label>
                  <select
                    value={dispatchForm.courier_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, courier_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  >
                    <option value="Local Company Fleet">Local Company Fleet</option>
                    <option value="Dedicated Delivery Van">Dedicated Delivery Van</option>
                    <option value="Third-Party Courier (DTDC)">DTDC Courier</option>
                    <option value="Third-Party Courier (Trackon)">Trackon Logistics</option>
                    <option value="Third-Party Courier (BlueDart)">BlueDart</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Vehicle / Reg. Number</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.vehicle_number}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })}
                    placeholder="e.g. GJ-03-BW-9876"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Driver / Agent Name</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.driver_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Driver Phone Number</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.driver_phone}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driver_phone: e.target.value })}
                    placeholder="e.g. 9825012345"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Tracking Number / Docket Code</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.tracking_number}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, tracking_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Delivery Notes / Site Remarks</label>
                <textarea
                  rows={2}
                  value={dispatchForm.delivery_notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, delivery_notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowDispatchModal(false); setDispatchTarget(null); }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {dispatchSubmitting ? (
                    <>
                      <FiRefreshCw className="animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <FaTruck className="w-3.5 h-3.5" /> Confirm Out for Delivery
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          MARK DELIVERED CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {showDeliveredModal && deliveredTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <FaCheckCircle className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-gray-900 text-sm">
                  {deliveredTarget.isGroup
                    ? `Confirm Delivery for Batch [${deliveredTarget.order?.group_id}]`
                    : `Confirm Delivery for Order #${deliveredTarget.order?.order_number}`}
                </h3>
              </div>
              <button
                onClick={() => { setShowDeliveredModal(false); setDeliveredTarget(null); }}
                className="text-gray-400 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivered} className="space-y-3.5 text-xs">
              <p className="text-gray-600">
                Confirm that the customer has received and signed for this trial equipment package.
              </p>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Delivery Confirmation Remarks</label>
                <textarea
                  rows={2}
                  value={deliveredNotes}
                  onChange={(e) => setDeliveredNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowDeliveredModal(false); setDeliveredTarget(null); }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deliveredSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  {deliveredSubmitting ? (
                    <>
                      <FiRefreshCw className="animate-spin" /> Recording...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="w-3.5 h-3.5" /> Mark Delivered
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ─────────────────────────────────────────────────────────────────────
          VIEW PROCUREMENT DOSSIER MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {viewProcurement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600 text-base">{viewProcurement.procurement_number}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-700 font-mono">
                    {viewProcurement.grn_number}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Trial Kit Multi-Stage Inward & Procurement Dossier</p>
              </div>
              <button onClick={() => setViewProcurement(null)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Stage 1 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaTruckLoading className="text-blue-600" />
                  <span>Stage 1: Warehouse Inward</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Combo Kit</span>
                  <strong className="text-gray-900">{viewProcurement.kit_type}</strong>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Warehouse</span>
                  <strong className="text-gray-900 block">{getWarehouseLabel(viewProcurement)}</strong>
                  {viewProcurement.warehouse_code && (
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1 rounded">
                      {viewProcurement.warehouse_code}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Quantity Inwarded</span>
                  <strong className="text-emerald-700">+{viewProcurement.inward_quantity} Kits</strong>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Vendor / Supplier</span>
                  <span className="text-gray-800">{viewProcurement.vendor_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Challan No. & Date</span>
                  <span className="text-gray-800 font-mono">{viewProcurement.invoice_challan_number}</span>
                  <span className="text-[10px] text-gray-500 block">
                    {viewProcurement.invoice_challan_date ? new Date(viewProcurement.invoice_challan_date).toLocaleDateString() : ""}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Inspection Condition</span>
                  <span className="text-emerald-700 font-semibold">{viewProcurement.warehouse_inspection_status}</span>
                </div>
                {viewProcurement.warehouse_remarks && (
                  <div>
                    <span className="text-gray-500 text-[10px] block">Remarks</span>
                    <span className="text-gray-600 text-[11px] italic">"{viewProcurement.warehouse_remarks}"</span>
                  </div>
                )}
              </div>

              {/* Stage 2 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaFileInvoice className="text-purple-600" />
                  <span>Stage 2: Accounts Payment</span>
                </div>
                {viewProcurement.payment_status === "unpaid" ? (
                  <div className="py-6 text-center text-amber-700 bg-amber-50 rounded-xl p-2 font-medium">
                    ⏳ Pending Accounts Payment Entry
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Unit Cost (INR)</span>
                      <strong className="text-gray-900">₹{viewProcurement.unit_cost_price_inr?.toLocaleString("en-IN")}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Subtotal & GST</span>
                      <span className="text-gray-800">
                        ₹{viewProcurement.subtotal_amount_inr?.toLocaleString("en-IN")} + {viewProcurement.gst_rate_percent}% GST (₹{viewProcurement.gst_amount_inr?.toLocaleString("en-IN")})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Total Payable</span>
                      <strong className="text-purple-700 text-sm">₹{viewProcurement.total_payable_amount_inr?.toLocaleString("en-IN")}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Bank UTR / Txn No.</span>
                      <strong className="text-gray-900 font-mono text-[11px]">{viewProcurement.payment_details?.transaction_utr_no || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Payment Mode</span>
                      <span className="text-gray-700 capitalize">{viewProcurement.payment_details?.payment_mode?.replace(/_/g, " ")}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Paid By</span>
                      <span className="text-gray-700">{viewProcurement.payment_details?.paid_by?.name || "Accounts"}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Stage 3 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaCheckCircle className="text-emerald-600" />
                  <span>Stage 3: Admin Approval</span>
                </div>
                {viewProcurement.status === "inward_requested" ? (
                  <div className="py-6 text-center text-gray-400 bg-gray-100 rounded-xl p-2 font-medium">
                    Waiting for Accounts payment first
                  </div>
                ) : viewProcurement.status === "payment_recorded" ? (
                  <div className="py-6 text-center text-blue-700 bg-blue-50 rounded-xl p-2 font-medium">
                    🔔 Awaiting Admin Final Approval & Stock Release
                  </div>
                ) : viewProcurement.status === "approved" ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-semibold text-center">
                      ✅ Approved & Stock Inwarded!
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Approved By</span>
                      <strong className="text-gray-900">{viewProcurement.admin_decision?.approved_by?.name || "Super Admin"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Approved On</span>
                      <span className="text-gray-700">
                        {viewProcurement.admin_decision?.approved_at ? new Date(viewProcurement.admin_decision.approved_at).toLocaleString() : ""}
                      </span>
                    </div>
                    {viewProcurement.admin_decision?.admin_notes && (
                      <div>
                        <span className="text-gray-500 text-[10px] block">Notes</span>
                        <span className="text-gray-700 italic">"{viewProcurement.admin_decision.admin_notes}"</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-red-50 rounded-xl border border-red-200 text-red-800">
                    <strong>Rejected:</strong> {viewProcurement.admin_decision?.rejection_reason || "Requirements not met"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setViewProcurement(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl text-xs"
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
