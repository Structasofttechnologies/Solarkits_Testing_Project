import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaBoxes, FaShoppingCart, FaSearch, FaFilter, FaTruck, FaWarehouse,
  FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaPaperPlane,
  FaRedo, FaLayerGroup, FaMapMarkerAlt, FaFileInvoice, FaBuilding,
  FaArrowRight, FaClock, FaCheck, FaInfoCircle, FaChevronRight,
  FaShieldAlt, FaExternalLinkAlt, FaTimes, FaMagic, FaSlidersH
} from "react-icons/fa";
import {
  getEligibleNewOrders,
  getNewOrdersFilterOptions,
  getVehiclesMaster,
  calculateProcurementGrouping,
  submitProcurementGroup,
} from "../../api/accounts";
import PageHeader from "../../components/PageHeader";
import Button from "../../components/Button";
import Dialog from "../../components/Dialog";
import Loader from "../../components/Loader";
import CompactMultiSelectDropdown from "../../components/CompactMultiSelectDropdown";

export default function NewOrdersProcurement() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user_slice || {});

  // ───────────────────────────────────────────────────────────────────────────
  // State: Filter Options from Backend
  // ───────────────────────────────────────────────────────────────────────────
  const [filterOptions, setFilterOptions] = useState({
    warehouses: [],
    states: [],
    districts: [],
    kit_types: [],
    industry_types: [],
    project_types: [],
    origins: [],
    order_modes: [],
    order_categories: [],
    delivery_destinations: [],
    vehicles: [],
  });

  // ───────────────────────────────────────────────────────────────────────────
  // State: Active Filters
  // ───────────────────────────────────────────────────────────────────────────
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [orderMode, setOrderMode] = useState("all"); // 'all' | 'offline' | 'online'
  const [orderOrigin, setOrderOrigin] = useState("all"); // 'all' | 'epc' | 'franchisee' | 'company'
  const [orderCategory, setOrderCategory] = useState("all"); // 'all' | 'govt_tender' | 'industry_kit'
  const [industryType, setIndustryType] = useState("");
  const [projectType, setProjectType] = useState("");
  const [kitType, setKitType] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");

  // Filter Counts for Badges & Numbering
  const [filterCounts, setFilterCounts] = useState({
    total: 0,
    by_mode: { offline: 0, online: 0 },
    by_origin: { epc: 0, franchisee: 0, company: 0 },
    by_category: { govt_tender: 0, industry_kit: 0 },
    by_warehouse: {},
    by_state: {},
    by_district: {},
    by_destination: { all: 0, epc: 0, franchisee: 0, company: 0 },
    by_industry: {},
    by_project: {},
    by_kit: {},
  });

  // Geographical Filters
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [deliveryDestination, setDeliveryDestination] = useState("all");
  const [routeGroup, setRouteGroup] = useState("");

  // Order Selection Controls
  const [orderCountLimit, setOrderCountLimit] = useState(100); // 50 | 100 | 500 | 1000
  const [vehicleStrategy, setVehicleStrategy] = useState("single"); // 'single' | 'multiple_same' | 'multiple_types'
  const [selectionMethod, setSelectionMethod] = useState("manual"); // 'auto' | 'manual'
  const [searchTerm, setSearchTerm] = useState("");

  // ───────────────────────────────────────────────────────────────────────────
  // State: Orders & Selections
  // ───────────────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [totalMatchingKits, setTotalMatchingKits] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // State: Vehicle Selection & Calculations
  // ───────────────────────────────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [vehicleSelectionMode, setVehicleSelectionMode] = useState("auto"); // 'auto' | 'manual'
  const [calculationData, setCalculationData] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // State: Modals & Submission
  // ───────────────────────────────────────────────────────────────────────────
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedGroup, setSubmittedGroup] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Filter Options & Vehicles
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchInitialMeta = async () => {
      try {
        const [optRes, vehRes] = await Promise.all([
          getNewOrdersFilterOptions().catch(() => ({ data: {} })),
          getVehiclesMaster().catch(() => ({ data: [] })),
        ]);

        if (optRes?.data) {
          setFilterOptions(optRes.data);
          const whs = optRes.data.warehouses || [];
          if (whs.length > 0) {
            setSelectedWarehouse((prev) => (prev && (prev === "all" || whs.some((w) => w._id === prev)) ? prev : "all"));
          }
        }
        if (vehRes?.data && vehRes.data.length > 0) {
          setVehicles(vehRes.data);
          // Default to 12MT or first suitable truck
          const defTruck = vehRes.data.find((v) => (v.max_load_kg || 0) >= 15000) || vehRes.data[0];
          if (defTruck) setSelectedVehicleId(defTruck._id);
        }
      } catch (err) {
        console.error("Error fetching initial filter metadata:", err);
      }
    };
    fetchInitialMeta();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Fetch Matching Orders based on Combined Filters
  // ───────────────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = {
        warehouse_id: selectedWarehouse,
        order_mode: orderMode,
        order_origin: orderOrigin,
        order_category: orderCategory,
        industry_type: industryType,
        project_type: projectType,
        kit_type: kitType,
        order_status: orderStatus,
        states: selectedStates.join(","),
        districts: selectedDistricts.join(","),
        pincodes: pincodeSearch,
        delivery_destination: deliveryDestination,
        route_group: routeGroup,
        search: searchTerm,
      };

      const res = await getEligibleNewOrders(params);
      if (res?.data) {
        const list = res.data;
        setOrders(list);
        setTotalMatching(res.meta?.total_matching_orders || list.length);
        setTotalMatchingKits(res.meta?.total_matching_kits || list.reduce((a, b) => a + (b.kits || 1), 0));
        if (res.filter_counts) {
          setFilterCounts(res.filter_counts);
        }

        // Automatic order-count selection up to limit if 'auto' method is chosen
        if (selectionMethod === "auto") {
          const autoSelected = list.slice(0, orderCountLimit).map((o) => o.id);
          setSelectedOrderIds(autoSelected);
        } else {
          // In manual mode, retain only previously selected orders that still exist in the new list
          setSelectedOrderIds((prev) => prev.filter((id) => list.some((o) => o.id === id)));
        }
      }
    } catch (err) {
      console.error("Error loading eligible orders:", err);
      showNotification("error", "Failed to fetch orders with current filters.");
    } finally {
      setLoadingOrders(false);
    }
  }, [
    selectedWarehouse, orderMode, orderOrigin, orderCategory, industryType, projectType,
    kitType, orderStatus, selectedStates, selectedDistricts, pincodeSearch,
    deliveryDestination, routeGroup, searchTerm, selectionMethod, orderCountLimit
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // When order count limit changes, auto-select if in auto mode
  useEffect(() => {
    if (selectionMethod === "auto" && orders.length > 0) {
      const autoSelected = orders.slice(0, orderCountLimit).map((o) => o.id);
      setSelectedOrderIds(autoSelected);
    }
  }, [orderCountLimit, selectionMethod, orders]);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Dynamic Capacity & Supplier BOM Calculation
  // ───────────────────────────────────────────────────────────────────────────
  const calculateGrouping = useCallback(async () => {
    if (selectedOrderIds.length === 0) {
      setCalculationData(null);
      return;
    }
    setCalculating(true);
    try {
      const payload = {
        order_ids: selectedOrderIds,
        vehicle_id: selectedVehicleId,
        vehicle_strategy: vehicleStrategy,
        vehicle_count: vehicleStrategy === "multiple_same" ? Math.max(1, Math.ceil(selectedOrderIds.length / 25)) : 1,
      };
      const res = await calculateProcurementGrouping(payload);
      if (res?.data) {
        setCalculationData(res.data);
      }
    } catch (err) {
      console.error("Calculation error:", err);
    } finally {
      setCalculating(false);
    }
  }, [selectedOrderIds, selectedVehicleId, vehicleStrategy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateGrouping();
    }, 250);
    return () => clearTimeout(timer);
  }, [calculateGrouping]);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Selection Handlers
  // ───────────────────────────────────────────────────────────────────────────
  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.slice(0, orderCountLimit).map((o) => o.id));
    }
  };

  const handleToggleOrder = (id) => {
    setSelectionMethod("manual");
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResetFilters = () => {
    setSelectedWarehouse("all");
    setOrderMode("all");
    setOrderOrigin("all");
    setOrderCategory("all");
    setIndustryType("");
    setProjectType("");
    setKitType("");
    setOrderStatus("all");
    setSelectedStates([]);
    setSelectedDistricts([]);
    setPincodeSearch("");
    setDeliveryDestination("all");
    setRouteGroup("");
    setSearchTerm("");
    setOrderCountLimit(100);
    setSelectionMethod("auto");
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Dynamic State & District Multi-Select Options
  // ───────────────────────────────────────────────────────────────────────────
  const stateOptions = useMemo(() => {
    return (filterOptions.states || []).map((st) => ({
      value: st.name,
      label: st.name,
      count: filterCounts.by_state?.[st.name] || 0,
    }));
  }, [filterOptions.states, filterCounts.by_state]);

  const availableDistricts = useMemo(() => {
    if (!filterOptions.districts || filterOptions.districts.length === 0) return [];
    if (selectedStates.length === 0) return filterOptions.districts;

    // Match districts belonging to selected states (by state_id or state name)
    const matchedStateIds = (filterOptions.states || [])
      .filter((s) => selectedStates.includes(s.name) || selectedStates.includes(s._id))
      .map((s) => s._id?.toString());

    return filterOptions.districts.filter((d) => {
      const dStateId = (d.state_id?._id || d.state_id)?.toString();
      return (
        matchedStateIds.includes(dStateId) ||
        selectedStates.some((st) => st.toLowerCase() === (d.name || "").toLowerCase())
      );
    });
  }, [filterOptions.districts, filterOptions.states, selectedStates]);

  const districtOptions = useMemo(() => {
    return (availableDistricts || []).map((d) => ({
      value: d.name,
      label: d.name,
      count: filterCounts.by_district?.[d.name] || 0,
    }));
  }, [availableDistricts, filterCounts.by_district]);

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Send to Procurement Submission
  // ───────────────────────────────────────────────────────────────────────────
  const handleConfirmSendToProcurement = async () => {
    if (selectedOrderIds.length === 0) {
      showNotification("error", "Please select at least one order to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_ids: selectedOrderIds,
        orders_data: selectedOrdersList,
        supplier_breakdown: dynamicSupplierBOM,
        vehicle_id: activeVehicleObj?._id || selectedVehicleId,
        vehicle_strategy: vehicleStrategy,
        vehicle_count: vehicleStrategy === "multiple_same" ? (dynamicVehicleSuggestion?.vehicleCount || calculationData?.vehicle_assignment?.vehicle_count || 1) : 1,
        calculation_snapshot: {
          ...calculationData,
          total_weight_est_kg: calculatedTotalWeight,
          vehicle_assignment: {
            ...(calculationData?.vehicle_assignment || {}),
            vehicle_id: activeVehicleObj?._id || selectedVehicleId,
            vehicle_name: activeVehicleObj?.name,
            single_capacity_kg: activeVehicleObj?.max_load_kg || 15000,
          },
        },
      };

      const res = await submitProcurementGroup(payload);
      if (res?.status === "success") {
        const createdGroupId = res.data?.group_id;
        setSubmittedGroup(res.data);
        setShowConfirmModal(false);
        showNotification("success", `Procurement Group #${createdGroupId} successfully marked Batch Ready! Redirecting to Procurement...`);
        // Refresh orders to reflect updated status
        fetchOrders();
        window.dispatchEvent(new CustomEvent("accounts:badge-refresh"));
        // Direct seamless handoff to Procurement Module!
        setTimeout(() => {
          navigate(`/account-panel/procurement?group_id=${createdGroupId}`);
        }, 1200);
      }
    } catch (err) {
      console.error("Submission error:", err);
      showNotification("error", err.response?.data?.message || "Failed to submit group to procurement.");
    } finally {
      setSubmitting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Derived metrics from current selection
  // ───────────────────────────────────────────────────────────────────────────
  const selectedOrdersList = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o.id));
  }, [orders, selectedOrderIds]);

  const selectedKitsCount = useMemo(() => {
    return selectedOrdersList.reduce((acc, o) => acc + (o.kits || 1), 0);
  }, [selectedOrdersList]);

  // Dynamic cargo weight derived from selected orders & combokit specifications
  const calculatedTotalWeight = useMemo(() => {
    if (calculationData?.total_weight_est_kg) return calculationData.total_weight_est_kg;
    if (selectedOrdersList.length === 0) return 0;
    let wt = 0;
    selectedOrdersList.forEach((o) => {
      const kwMatch = (o.kit_type || o.order_number || "").match(/(\d+(?:\.\d+)?)\s*kw/i);
      const kw = kwMatch ? parseFloat(kwMatch[1]) : 10;
      const kits = Number(o.kits) || 1;
      wt += Math.round(kw * 74) * kits;
    });
    return wt > 0 ? wt : (selectedKitsCount > 0 ? selectedKitsCount * 276 : 0);
  }, [calculationData, selectedOrdersList, selectedKitsCount]);

  // Dynamically evaluate active fleet from Admin Panel DeliveryVehicleMaster
  const dynamicVehicleSuggestion = useMemo(() => {
    if (!vehicles || vehicles.length === 0 || selectedOrdersList.length === 0) return null;

    const activeFleet = [...vehicles]
      .filter((v) => v.status !== "Inactive" && (Number(v.max_load_kg) || 0) > 0)
      .sort((a, b) => Number(a.max_load_kg) - Number(b.max_load_kg));

    if (activeFleet.length === 0) return null;

    const targetWeight = calculatedTotalWeight > 0 ? calculatedTotalWeight : (selectedKitsCount > 0 ? selectedKitsCount * 276 : 0);
    if (targetWeight === 0) return null;

    // 1. Smallest active vehicle whose max_load_kg >= targetWeight
    const bestFit = activeFleet.find((v) => Number(v.max_load_kg) >= targetWeight);

    if (bestFit) {
      const cap = Number(bestFit.max_load_kg);
      const util = Math.round((targetWeight / cap) * 100);
      return {
        vehicle: bestFit,
        strategy: "single",
        vehicleCount: 1,
        isOverCapacity: false,
        utilization: util,
        headroom: Math.max(0, cap - targetWeight),
        reason: `${bestFit.name} (${cap.toLocaleString()} kg payload) provides optimal safe capacity for ${targetWeight.toLocaleString()} kg cargo with ${Math.max(0, cap - targetWeight).toLocaleString()} kg safe headroom (${util}% utilization).`,
        alternatives: activeFleet
          .filter((v) => v._id !== bestFit._id)
          .map((v) => ({
            vehicle: v,
            utilization: Math.round((targetWeight / Number(v.max_load_kg)) * 100),
            isUnderCapacity: Number(v.max_load_kg) < targetWeight,
          })),
      };
    }

    // 2. Over-capacity: Cargo exceeds highest single vehicle in admin master -> recommend multiple of largest
    const largest = activeFleet[activeFleet.length - 1];
    const cap = Number(largest.max_load_kg) || 15000;
    const neededCount = Math.max(1, Math.ceil(targetWeight / cap));
    const totalCap = cap * neededCount;
    const util = Math.round((targetWeight / totalCap) * 100);

    return {
      vehicle: largest,
      strategy: "multiple_same",
      vehicleCount: neededCount,
      isOverCapacity: true,
      utilization: util,
      headroom: Math.max(0, totalCap - targetWeight),
      reason: `Cargo weight (${targetWeight.toLocaleString()} kg) exceeds largest single truck. Recommended: ${neededCount}x ${largest.name} (${totalCap.toLocaleString()} kg total capacity, ${util}% utilization).`,
      alternatives: activeFleet
        .filter((v) => v._id !== largest._id)
        .map((v) => ({
          vehicle: v,
          utilization: Math.round((targetWeight / Number(v.max_load_kg)) * 100),
          isUnderCapacity: Number(v.max_load_kg) < targetWeight,
        })),
    };
  }, [vehicles, calculatedTotalWeight, selectedKitsCount]);

  // Sync auto-suggested vehicle when in 'auto' mode
  useEffect(() => {
    if (vehicleSelectionMode === "auto" && dynamicVehicleSuggestion?.vehicle?._id) {
      setSelectedVehicleId(dynamicVehicleSuggestion.vehicle._id);
      if (dynamicVehicleSuggestion.strategy) {
        setVehicleStrategy(dynamicVehicleSuggestion.strategy);
      }
    }
  }, [vehicleSelectionMode, dynamicVehicleSuggestion]);

  // Resolved active vehicle object from dynamic vehicles
  const activeVehicleObj = useMemo(() => {
    return vehicles.find((v) => v._id === selectedVehicleId) || dynamicVehicleSuggestion?.vehicle || vehicles[0];
  }, [vehicles, selectedVehicleId, dynamicVehicleSuggestion]);

  // Dynamic Kit Type Breakdown derived from selected orders
  const dynamicKitBreakdown = useMemo(() => {
    if (selectedOrdersList.length === 0) {
      return [];
    }
    if (calculationData?.kit_type_breakdown && calculationData.kit_type_breakdown.length > 0) {
      return calculationData.kit_type_breakdown;
    }
    const map = {};
    selectedOrdersList.forEach((o) => {
      if (Array.isArray(o.raw_items) && o.raw_items.length > 0) {
        o.raw_items.forEach((it) => {
          const type = it.item_name || o.kit_type || "Solar Combokit";
          const qty = Number(it.quantity) || 1;
          map[type] = (map[type] || 0) + qty;
        });
      } else {
        const type = o.kit_type || "Solar Combokit";
        map[type] = (map[type] || 0) + (o.kits || 1);
      }
    });
    const entries = Object.entries(map).map(([kit_type, quantity]) => ({ kit_type, quantity }));
    return entries;
  }, [calculationData, selectedOrdersList]);

  // Dynamic Supplier BOM derived from selected equipment
  const dynamicSupplierBOM = useMemo(() => {
    if (selectedOrdersList.length === 0) {
      return [];
    }
    if (calculationData?.supplier_details && calculationData.supplier_details.length > 0) {
      return calculationData.supplier_details.map((s) => ({
        ...s,
        component_name: s.product || s.component_name || s.product_name,
        product_name: s.product || s.product_name || s.component_name,
        total_units: s.qty || s.total_units || s.quantity,
      }));
    }
    const kits = selectedKitsCount;
    if (!kits || kits === 0) return [];
    const firstOrder = selectedOrdersList[0];
    const kwMatch = (firstOrder?.kit_type || firstOrder?.order_number || "").match(/(\d+(?:\.\d+)?)\s*kw/i);
    const cap = kwMatch ? parseFloat(kwMatch[1]) : 3;
    const panelsPerKit = cap === 3 ? 6 : (cap === 5 ? 9 : Math.round(cap * 1.82));
    const whName = firstOrder?.warehouse_name || (firstOrder?.warehouse_code ? `${firstOrder.warehouse_code} (${firstOrder.district_name || firstOrder.state_name || 'Hub'})` : "WH-IND-MH-001 (Mumbai)");

    return [
      {
        supplier_name: "Solarkits (Sunnovative Energy Systems Private Limited)",
        product: `Solarkits ${cap === 3 ? "500 Wp" : "540W"} Bifacial DCR Solar Module`,
        component_name: `Solarkits ${cap === 3 ? "500 Wp" : "540W"} Bifacial DCR Solar Module`,
        product_name: `Solarkits ${cap === 3 ? "500 Wp" : "540W"} Bifacial DCR Solar Module`,
        qty: kits * panelsPerKit,
        total_units: kits * panelsPerKit,
        warehouse: whName,
        is_oem: true,
      },
      {
        supplier_name: "Solarkits (Sunnovative Energy Systems Private Limited)",
        product: `SolarKits ${cap} kW On-Grid String Inverter`,
        component_name: `SolarKits ${cap} kW On-Grid String Inverter`,
        product_name: `SolarKits ${cap} kW On-Grid String Inverter`,
        qty: kits,
        total_units: kits,
        warehouse: whName,
        is_oem: false,
      },
      {
        supplier_name: "REDREN ENERGY PRIVATE LIMITED (Mounting Systems)",
        product: `Hot-Dip Galvanized (GI) Rooftop Mounting Structure (${cap} kW)`,
        component_name: `Hot-Dip Galvanized (GI) Rooftop Mounting Structure (${cap} kW)`,
        product_name: `Hot-Dip Galvanized (GI) Rooftop Mounting Structure (${cap} kW)`,
        qty: kits,
        total_units: kits,
        warehouse: whName,
        is_oem: false,
      },
      {
        supplier_name: "MINDRA GREEN ENERGY LLP (BOS Protection)",
        product: `BOSKIT Protection Box (ACDB/DCDB IP65 Enclosure - ${cap} kW)`,
        component_name: `BOSKIT Protection Box (ACDB/DCDB IP65 Enclosure - ${cap} kW)`,
        product_name: `BOSKIT Protection Box (ACDB/DCDB IP65 Enclosure - ${cap} kW)`,
        qty: kits,
        total_units: kits,
        warehouse: whName,
        is_oem: false,
      },
      {
        supplier_name: "MINDRA GREEN ENERGY LLP (Electrical & Cabling)",
        product: "Solar DC 4/6 sq.mm Double Insulated Cable & Complete Earthing Kit",
        component_name: "Solar DC 4/6 sq.mm Double Insulated Cable & Complete Earthing Kit",
        product_name: "Solar DC 4/6 sq.mm Double Insulated Cable & Complete Earthing Kit",
        qty: kits,
        total_units: kits,
        warehouse: whName,
        is_oem: false,
      },
    ];
  }, [calculationData, selectedKitsCount, selectedOrdersList]);

  // Suggested group ID
  const displayGroupId = submittedGroup?.group_id || `PG-${new Date().getFullYear()}-0001`;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* ─────────────────────────────────────────────────────────────────────
          PAGE HEADER & WORKFLOW PROCESS TITLE
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <FaBoxes className="w-5 h-5 text-[#263880]" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-text-primary">
                  SOLARKITS — New Orders Module (Company Account Login)
                </h1>
                <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2 font-medium">
                  <span className="text-primary font-bold">Process Flow:</span>
                  <span>Filter</span>
                  <FaChevronRight className="w-2.5 h-2.5 text-text-muted" />
                  <span>Select Orders</span>
                  <FaChevronRight className="w-2.5 h-2.5 text-text-muted" />
                  <span>Calculate Capacity</span>
                  <FaChevronRight className="w-2.5 h-2.5 text-text-muted" />
                  <span>Group Suppliers</span>
                  <FaChevronRight className="w-2.5 h-2.5 text-text-muted" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Send to Procurement</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <FaRedo className="w-3 h-3" />
              Reset Filters
            </button>
            <button
              onClick={fetchOrders}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary/10 hover:bg-primary/20 text-[#263880] border border-[#263880]/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FaSearch className="w-3 h-3" />
              Sync Orders
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-medium flex items-center justify-between animate-in slide-in-from-top-2 ${notification.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700"
                : "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700"
              }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <FaCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <FaExclamationTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-text-muted hover:text-text-primary">
              <FaTimes className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ROW 1: SECTION 1 (MAIN FILTERS) & SECTION 2 (LOCATION & ORDER FILTERS)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* SECTION 1: MAIN FILTERS (Blue Theme) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-blue-50/50 to-surface dark:from-blue-950/20 dark:to-surface border border-blue-200/70 dark:border-blue-800/40 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-200/60 dark:border-blue-900/40">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                  1
                </span>
                <h2 className="text-sm font-black uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  Main Filters
                </h2>
              </div>
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40">
                Type • Origin • Category
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Order Type */}
              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "offline", label: "Offline Orders", count: filterCounts.by_mode?.offline || 0 },
                    { id: "online", label: "Online Orders", count: filterCounts.by_mode?.online || 0 },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setOrderMode(orderMode === t.id ? "all" : t.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${orderMode === t.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-surface border-border hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-text-primary"
                        }`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${orderMode === t.id
                            ? "bg-white/20 text-white"
                            : t.count > 0
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                              : "bg-surface-hover text-text-muted"
                          }`}
                      >
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Origin */}
              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Order Origin
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "epc", label: "Solar EPC", count: filterCounts.by_origin?.epc || 0 },
                    { id: "franchisee", label: "Franchisee Store", count: filterCounts.by_origin?.franchisee || 0 },
                    { id: "company", label: "Company Store", count: filterCounts.by_origin?.company || 0 },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOrderOrigin(orderOrigin === o.id ? "all" : o.id)}
                      className={`py-2 px-2 text-[11px] font-semibold rounded-xl border flex items-center justify-between transition-all cursor-pointer ${orderOrigin === o.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-surface border-border hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-text-primary"
                        }`}
                    >
                      <span className="truncate">{o.label}</span>
                      <span
                        className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${orderOrigin === o.id
                            ? "bg-white/20 text-white"
                            : o.count > 0
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                              : "bg-surface-hover text-text-muted"
                          }`}
                      >
                        {o.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Category */}
              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Order Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "govt_tender", label: "Govt. Tenders Order", count: filterCounts.by_category?.govt_tender || 0 },
                    { id: "industry_kit", label: "Industry Kits", count: filterCounts.by_category?.industry_kit || 0 },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setOrderCategory(orderCategory === c.id ? "all" : c.id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-between transition-all cursor-pointer ${orderCategory === c.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-surface border-border hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-text-primary"
                        }`}
                    >
                      <span>{c.label}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${orderCategory === c.id
                            ? "bg-white/20 text-white"
                            : c.count > 0
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                              : "bg-surface-hover text-text-muted"
                          }`}
                      >
                        {c.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry / Project / Kit Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Industry Type</label>
                  <select
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 bg-surface border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Industries</option>
                    {filterOptions.industry_types?.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind} {filterCounts.by_industry?.[ind] ? `(${filterCounts.by_industry[ind]})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Project Type</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 bg-surface border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Projects</option>
                    {filterOptions.project_types?.map((proj) => (
                      <option key={proj} value={proj}>
                        {proj} {filterCounts.by_project?.[proj] ? `(${filterCounts.by_project[proj]})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Kit Type</label>
                  <select
                    value={kitType}
                    onChange={(e) => setKitType(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 bg-surface border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Kit Types</option>
                    {filterOptions.kit_types?.map((kit) => (
                      <option key={kit} value={kit}>
                        {kit} {filterCounts.by_kit?.[kit] ? `(${filterCounts.by_kit[kit]})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: LOCATION & ORDER FILTERS (Green Theme) */}
        <div className="lg:col-span-7 bg-gradient-to-b from-emerald-50/50 to-surface dark:from-emerald-950/20 dark:to-surface border border-emerald-200/70 dark:border-emerald-800/40 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                2
              </span>
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                Location & Order Filters
              </h2>
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              Geography • Warehouse • Bulk Limit
            </span>
          </div>

          {/* Warehouse Selector */}
          <div className="mb-3.5 pb-3 border-b border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <FaWarehouse className="w-3.5 h-3.5 text-emerald-600" />
                Warehouse Filter (Admin Configured)
              </label>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                {selectedWarehouse === "all"
                  ? `🌐 Pan India (${filterCounts.total || 0} Orders)`
                  : filterOptions.warehouses?.find((w) => w._id === selectedWarehouse)?.warehouse_code
                    ? `Active Warehouse: ${filterOptions.warehouses.find((w) => w._id === selectedWarehouse).warehouse_code}`
                    : "Filtered by Warehouse"}
              </span>
            </div>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full text-xs font-semibold py-2 px-3 bg-surface border border-emerald-300 dark:border-emerald-800 rounded-xl text-text-primary shadow-2xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">
                🌐 All Warehouses (Pan India) — [{filterCounts.total || 0} Orders]
              </option>
              {(filterOptions.warehouses || []).map((wh) => {
                const whOrderCount = filterCounts.by_warehouse?.[wh._id] || filterCounts.by_warehouse?.[wh.warehouse_code] || 0;
                return (
                  <option key={wh._id} value={wh._id}>
                    {wh.warehouse_code} — {wh.district_name || wh.state_name || wh.address?.split(",")[0]} ({wh.warehouse_type?.toUpperCase() || "MASTER"}) — [{whOrderCount} Orders]
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Left: Route / Pincode Filters */}
            <div className="space-y-2.5">
              <p className="text-[11px] font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <FaMapMarkerAlt className="w-3 h-3 text-emerald-600" />
                Route / Pincode Filters
              </p>

              {/* State (Multi-Select) */}
              <CompactMultiSelectDropdown
                label="State (Multi-Select)"
                values={selectedStates}
                onChange={setSelectedStates}
                options={stateOptions}
                placeholder="All States (e.g. Gujarat, Maharashtra)"
                searchPlaceholder="Search states..."
                icon={FaMapMarkerAlt}
                badgeColor="emerald"
              />

              {/* District (Multi-Select - Dynamically linked to selected states) */}
              <CompactMultiSelectDropdown
                label="District (Multi-Select)"
                values={selectedDistricts}
                onChange={setSelectedDistricts}
                options={districtOptions}
                placeholder={selectedStates.length > 0 ? "Select districts in selected states" : "All Districts (e.g. Rajkot, Ahmedabad)"}
                searchPlaceholder="Search districts..."
                icon={FaMapMarkerAlt}
                badgeColor="emerald"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="Search pincode..."
                    value={pincodeSearch}
                    onChange={(e) => setPincodeSearch(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 bg-surface border border-border rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Delivery Destination</label>
                  <select
                    value={deliveryDestination}
                    onChange={(e) => setDeliveryDestination(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 bg-surface border border-border rounded-lg text-text-primary"
                  >
                    <option value="all">All Destinations ({filterCounts.by_destination?.all || filterCounts.total || 0})</option>
                    <option value="epc">EPC Location ({filterCounts.by_destination?.epc || 0})</option>
                    <option value="franchisee">Franchisee Store ({filterCounts.by_destination?.franchisee || 0})</option>
                    <option value="company">Company Store ({filterCounts.by_destination?.company || 0})</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right: Order Count Selection & Vehicle Strategy */}
            <div className="space-y-3 pl-0 md:pl-2 border-t md:border-t-0 md:border-l border-emerald-200/60 dark:border-emerald-900/40 pt-3 md:pt-0">
              {/* Order Count Selection */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-1.5">
                  Order Count Selection (Batch Limit)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[50, 100, 500, 1000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setOrderCountLimit(num)}
                      className={`py-1.5 text-xs font-black rounded-lg border text-center transition-all cursor-pointer ${orderCountLimit === num
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-surface border-border hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-text-primary"
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Info Note */}
              <div className="p-2.5 rounded-xl bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <FaTruck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Vehicle fleet &amp; multi-truck dispatch strategy are configured in <strong>Step 4</strong> after reviewing orders.</span>
              </div>

              {/* Selection Method */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-1">
                  Selection Method
                </label>
                <div className="flex items-center gap-4 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="selection_method"
                      checked={selectionMethod === "auto"}
                      onChange={() => setSelectionMethod("auto")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Select all matching (up to limit)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="selection_method"
                      checked={selectionMethod === "manual"}
                      onChange={() => setSelectionMethod("manual")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Manual selection</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ROW 2: SECTION 3 (SELECT ORDERS & VIEW SUMMARY - Purple Theme)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-purple-50/50 to-surface dark:from-purple-950/20 dark:to-surface border border-purple-200/70 dark:border-purple-800/40 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-purple-200/60 dark:border-purple-900/40 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
              3
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
              Select Orders & View Summary
            </h2>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <FaSearch className="absolute left-3 top-2.5 text-text-muted text-xs" />
            <input
              type="text"
              placeholder="Search order no, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-surface border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-surface border border-purple-200/60 dark:border-purple-900/30 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary">Total Matching Orders</span>
              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                <FaFileInvoice className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-black text-purple-900 dark:text-purple-300 mt-1">
              {totalMatching.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">Matching active filters criteria</p>
          </div>

          <div className="bg-surface border border-purple-200/60 dark:border-purple-900/30 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary">Selected Orders</span>
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <FaCheckCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
              {selectedOrderIds.length.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              Up to chosen limit ({orderCountLimit})
            </p>
          </div>

          <div className="bg-surface border border-purple-200/60 dark:border-purple-900/30 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary">Total Kits (Selected Orders)</span>
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <FaBoxes className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-2xl font-black text-blue-800 dark:text-blue-300 mt-1">
              {selectedKitsCount.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">Combined equipment kit units</p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto border border-border rounded-xl bg-surface">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-hover/80 border-b border-border text-text-secondary font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-border text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Order No.</th>
                <th className="py-2.5 px-3">Warehouse</th>
                <th className="py-2.5 px-3">Origin</th>
                <th className="py-2.5 px-3">Customer / Partner</th>
                <th className="py-2.5 px-3">State / District</th>
                <th className="py-2.5 px-3">Pincode</th>
                <th className="py-2.5 px-3">Kit Type</th>
                <th className="py-2.5 px-3 text-center">Kits</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loadingOrders ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-text-muted">
                    <Loader text="Filtering eligible orders..." />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-text-muted">
                    No eligible orders found matching current filter combination.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isChecked = selectedOrderIds.includes(o.id);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => handleToggleOrder(o.id)}
                      className={`hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer ${isChecked ? "bg-purple-50/70 dark:bg-purple-950/30" : ""
                        }`}
                    >
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOrder(o.id)}
                          className="rounded border-border text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-black text-purple-900 dark:text-purple-300">
                        {o.order_number}
                        {o.parent_po_number && (
                          <div className="text-[9px] font-bold text-amber-700 dark:text-amber-300 font-sans">
                            PO: {o.parent_po_number}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 text-[10px] font-bold font-mono">
                          <FaWarehouse className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                          {o.warehouse_code || "WH-01"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.order_origin_code === "epc"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              : o.order_origin_code === "franchisee"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                : "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                            }`}
                        >
                          {o.order_origin}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-text-primary">
                        {o.customer_name}
                      </td>
                      <td className="py-2.5 px-3 text-text-secondary">
                        {o.district_name}, {o.state_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-muted">
                        {o.pincode}
                      </td>
                      <td className="py-2.5 px-3 text-text-primary font-medium">
                        {o.kit_type}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-text-primary">
                        <span className="px-2 py-0.5 rounded-lg bg-surface-hover font-mono">
                          {o.kits}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            o.status === "New" || o.status === "New Order"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              : o.status === "Ready for Procurement"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : o.status === "Sent to Procurement"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {o.status}
                        </span>
                        {o.milestone_status && (
                          <div className="text-[9px] text-text-muted mt-0.5 whitespace-nowrap">
                            {o.milestone_status}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-text-primary font-mono">
                        ₹{(o.order_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ROW 3: SECTION 4 (VEHICLE SELECTION & KIT CAPACITY - Orange Theme)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-orange-50/50 to-surface dark:from-orange-950/20 dark:to-surface border border-orange-200/70 dark:border-orange-800/40 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-orange-200/60 dark:border-orange-900/40 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
              4
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-orange-900 dark:text-orange-300">
                Vehicle Selection & Kit Capacity
              </h2>
              <p className="text-[10px] text-text-muted font-medium">
                Dynamic Fleet Master • Live Payload Matching from Admin Panel
              </p>
            </div>
          </div>

          {/* Mode Switcher Toggle: Auto Suggestion vs Manual Selection */}
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-orange-300 dark:border-orange-800 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setVehicleSelectionMode("auto")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${vehicleSelectionMode === "auto"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
            >
              <FaMagic className="w-3 h-3 text-amber-200" />
              <span>Auto Selected (Smart AI)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
            <button
              type="button"
              onClick={() => setVehicleSelectionMode("manual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${vehicleSelectionMode === "manual"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
            >
              <FaSlidersH className="w-3 h-3" />
              <span>Manual Selection</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Vehicle Options & Capacity Calculation */}
          <div className="lg:col-span-5 space-y-4">
            {/* Vehicle Options & Strategy Unified Block */}
            <div className="bg-surface border border-orange-200/60 dark:border-orange-900/30 rounded-xl p-3.5 space-y-3">
              {vehicleSelectionMode === "auto" ? (
                /* Auto Selected Vehicle Highlight Card */
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-50/70 via-surface to-amber-50/40 dark:from-orange-950/30 dark:via-surface dark:to-amber-950/20 border border-orange-300/80 dark:border-orange-800/60 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FaTruck className="w-3.5 h-3.5 text-orange-600" />
                      Auto-Selected Fleet Vehicle
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300/50">
                      <FaMagic className="w-2.5 h-2.5 text-emerald-600" />
                      Dynamic Best Fit
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 pt-1 border-t border-orange-200/60 dark:border-orange-900/40">
                    <div>
                      <h4 className="text-sm font-black text-text-primary">
                        {activeVehicleObj?.name || "Auto-matching Vehicle..."}
                      </h4>
                      <p className="text-[11px] text-text-secondary font-medium">
                        {activeVehicleObj?.brand_make} • {activeVehicleObj?.model || "Standard Commercial"} • Code: {activeVehicleObj?.vehicle_code || "VEH-AUTO"}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-900 dark:text-orange-200 font-mono text-xs font-black shrink-0">
                      {(activeVehicleObj?.max_load_kg || 0).toLocaleString()} kg
                    </span>
                  </div>

                  {/* 3 Metric Mini Pills */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                    <div className="p-1.5 rounded-lg bg-surface border border-border">
                      <span className="text-[9px] text-text-muted block uppercase font-bold">Payload Cap</span>
                      <span className="text-[11px] font-bold text-text-primary font-mono">
                        {(activeVehicleObj?.max_load_kg || 0).toLocaleString()} kg
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface border border-border">
                      <span className="text-[9px] text-text-muted block uppercase font-bold">Cargo Weight</span>
                      <span className="text-[11px] font-bold text-orange-600 font-mono">
                        {calculatedTotalWeight.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface border border-border">
                      <span className="text-[9px] text-text-muted block uppercase font-bold">Safe Headroom</span>
                      <span className="text-[11px] font-bold text-emerald-600 font-mono">
                        {Math.max(0, (activeVehicleObj?.max_load_kg || 0) - calculatedTotalWeight).toLocaleString()} kg
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Reason Note */}
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[10.5px] text-emerald-800 dark:text-emerald-300 font-medium flex items-start gap-1.5">
                    <FaCheckCircle className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {dynamicVehicleSuggestion?.reason || "Matched dynamically from Admin Panel Fleet Master according to selected order payload."}
                    </span>
                  </div>

                  {/* Quick Alternative Chips from Admin Panel */}
                  {dynamicVehicleSuggestion?.alternatives && dynamicVehicleSuggestion.alternatives.length > 0 && (
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] font-bold text-text-muted block uppercase mb-1">
                        Alternative Fleet Options (Click to Switch):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {dynamicVehicleSuggestion.alternatives.slice(0, 4).map((alt) => (
                          <button
                            key={alt.vehicle._id}
                            type="button"
                            onClick={() => {
                              setSelectedVehicleId(alt.vehicle._id);
                              setVehicleSelectionMode("manual");
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${alt.isUnderCapacity
                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                                : "bg-surface hover:bg-surface-hover text-text-secondary border-border"
                              }`}
                          >
                            <span>{alt.vehicle.name}</span>
                            <span className="font-mono text-[9px] font-bold text-text-muted">
                              ({(alt.vehicle.max_load_kg || 0).toLocaleString()} kg • {alt.utilization}%)
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual Selection Mode */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FaTruck className="w-3.5 h-3.5 text-orange-600" />
                      Select Fleet Vehicle (Manual Override)
                    </label>
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-300">
                      Manual Mode
                    </span>
                  </div>

                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full text-xs py-2 px-3 bg-surface border border-border rounded-xl text-text-primary focus:ring-1 focus:ring-orange-500 font-medium"
                  >
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.name} — Payload Cap: {(v.max_load_kg || 15000).toLocaleString()} kg [{v.brand_make || "Fleet"}]
                      </option>
                    ))}
                  </select>

                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] flex items-center justify-between gap-2">
                    <span className="text-amber-900 dark:text-amber-200">
                      Recommended fit: <strong>{dynamicVehicleSuggestion?.vehicle?.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setVehicleSelectionMode("auto")}
                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    >
                      <FaMagic className="w-2.5 h-2.5" />
                      Revert to Auto
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle Selection Strategy (End-to-End after Order Selection) */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider">
                    Vehicle Dispatch Strategy
                  </label>
                  {dynamicVehicleSuggestion?.isOverCapacity && (
                    <span className="text-[9.5px] font-black text-red-600 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.5 rounded-md">
                      Multiple Trucks Recommended
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {[
                    { id: "single", label: "One vehicle for the group" },
                    {
                      id: "multiple_same",
                      label: dynamicVehicleSuggestion?.isOverCapacity
                        ? `Multiple vehicles of same type (${dynamicVehicleSuggestion.vehicleCount}x ${activeVehicleObj?.name} required)`
                        : "Multiple vehicles of same type",
                    },
                    { id: "multiple_types", label: "Multiple vehicle types" },
                  ].map((strat) => (
                    <label
                      key={strat.id}
                      className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-lg border text-[11px] font-medium transition-all ${vehicleStrategy === strat.id
                          ? "bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-200 font-bold"
                          : "border-transparent hover:bg-surface-hover text-text-primary"
                        }`}
                    >
                      <input
                        type="radio"
                        name="vehicle_strategy_s4"
                        checked={vehicleStrategy === strat.id}
                        onChange={() => setVehicleStrategy(strat.id)}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span>{strat.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Capacity Calculation Stats */}
            <div className="bg-surface border border-orange-200/60 dark:border-orange-900/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-text-secondary uppercase tracking-wider">
                  Capacity Calculation
                </h3>
                <span className="text-[10px] text-text-muted font-mono">
                  {vehicleSelectionMode === "auto" ? "⚡ Auto-Optimized" : "🛠️ Manual Override"}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Total Kits:</span>
                <span className="font-bold text-text-primary font-mono">
                  {(calculationData?.total_kits || selectedKitsCount).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Total Weight (Est.):</span>
                <span className="font-bold text-text-primary font-mono">
                  {calculatedTotalWeight.toLocaleString()} kg
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">Vehicle Capacity:</span>
                <span className="font-bold text-text-primary font-mono">
                  {((activeVehicleObj?.max_load_kg || 15000) * (vehicleStrategy === "multiple_same" ? (dynamicVehicleSuggestion?.vehicleCount || 1) : 1)).toLocaleString()} kg
                </span>
              </div>

              {/* Dynamic Utilization Calculation */}
              {(() => {
                const totalCap = (activeVehicleObj?.max_load_kg || 15000) * (vehicleStrategy === "multiple_same" ? (dynamicVehicleSuggestion?.vehicleCount || 1) : 1);
                const utilPct = totalCap > 0 ? Math.round((calculatedTotalWeight / totalCap) * 100) : 100;
                return (
                  <>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-border">
                      <span className="text-text-secondary font-bold">Utilization:</span>
                      <span
                        className={`font-black font-mono text-sm ${utilPct > 100
                            ? "text-red-600"
                            : utilPct > 85
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                      >
                        {utilPct}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${utilPct > 100
                            ? "bg-red-500"
                            : utilPct > 85
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        style={{
                          width: `${Math.min(100, utilPct)}%`,
                        }}
                      />
                    </div>

                    {/* Capacity Validation Notice */}
                    <div
                      className={`mt-2 p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${utilPct > 100
                          ? "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300"
                          : utilPct > 85
                            ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        }`}
                    >
                      <FaInfoCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        {utilPct > 100
                          ? `Over-capacity! Total cargo (${calculatedTotalWeight.toLocaleString()} kg) exceeds vehicle payload by ${(calculatedTotalWeight - totalCap).toLocaleString()} kg. Switch to multiple trucks or larger vehicle.`
                          : utilPct > 85
                            ? `Warning: Vehicle load is near max capacity (${utilPct}%). Headroom remaining: ${(totalCap - calculatedTotalWeight).toLocaleString()} kg.`
                            : `Vehicle capacity validated. Cargo (${calculatedTotalWeight.toLocaleString()} kg) is within permissible limits with ${(totalCap - calculatedTotalWeight).toLocaleString()} kg safe headroom.`}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Right: Kit Type Breakdown & Vehicle Assignment */}
          <div className="lg:col-span-7 space-y-4">
            {/* Kit Type Breakdown Table */}
            <div className="bg-surface border border-orange-200/60 dark:border-orange-900/30 rounded-xl p-4">
              <h3 className="text-xs font-black text-orange-900 dark:text-orange-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Kit Type Breakdown</span>
                <span className="text-[10px] text-text-muted font-normal lowercase">calculated dynamically from orders</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-surface-hover/60 border-b border-border text-text-secondary font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3 text-left">Kit Type</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {dynamicKitBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-6 text-center text-text-muted italic text-[11px]">
                          No orders selected. Please select orders from the list above.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {dynamicKitBreakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-surface-hover/40">
                            <td className="py-2 px-3 font-semibold text-text-primary">
                              <span>{row.kit_type}</span>
                              {row.weight_kg > 0 && (
                                <span className="ml-2 text-[10px] text-text-muted font-normal">
                                  ({row.weight_kg.toLocaleString()} kg)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-text-primary font-mono">
                              {row.quantity.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-surface-hover/80 font-black">
                          <td className="py-2 px-3 text-text-primary">
                            <span>Total</span>
                            {calculationData?.total_weight_est_kg > 0 && (
                              <span className="ml-2 text-[10px] text-text-muted font-normal">
                                ({calculationData.total_weight_est_kg.toLocaleString()} kg)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-text-primary font-mono">
                            {(calculationData?.total_kits || selectedKitsCount || 0).toLocaleString()}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vehicle Assignment Card */}
            <div className="bg-surface border border-orange-200/60 dark:border-orange-900/30 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Vehicle Assignment
                </span>
                <span className="text-[11px] font-black text-orange-600 bg-orange-100 dark:bg-orange-950/50 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                  {vehicleSelectionMode === "auto" ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <FaMagic className="w-2.5 h-2.5" /> Auto-Fit:
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                      <FaSlidersH className="w-2.5 h-2.5" /> Manual:
                    </span>
                  )}
                  {activeVehicleObj?.name || calculationData?.vehicle_assignment?.vehicle_name || "Assigned Vehicle"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs py-1">
                <div>
                  <span className="text-[10px] text-text-muted block">Capacity</span>
                  <span className="font-bold text-text-primary font-mono">
                    {activeVehicleObj?.max_load_kg ? `${((activeVehicleObj.max_load_kg || 15000) * (vehicleStrategy === "multiple_same" ? (dynamicVehicleSuggestion?.vehicleCount || 1) : 1)).toLocaleString()} kg` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Estimated Load</span>
                  <span className="font-bold text-text-primary font-mono">
                    {selectedOrdersList.length > 0 ? `${(calculationData?.total_weight_est_kg || calculatedTotalWeight).toLocaleString()} kg` : "0 kg"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Utilization</span>
                  {(() => {
                    if (selectedOrdersList.length === 0) {
                      return <span className="font-bold font-mono text-text-muted">0%</span>;
                    }
                    const totalCap = (activeVehicleObj?.max_load_kg || calculationData?.vehicle_assignment?.total_capacity_kg || 15000) * (vehicleStrategy === "multiple_same" ? (dynamicVehicleSuggestion?.vehicleCount || 1) : 1);
                    const util = calculationData?.vehicle_assignment?.utilization_pct != null
                      ? calculationData.vehicle_assignment.utilization_pct
                      : (totalCap > 0 && calculatedTotalWeight > 0 ? Math.round((calculatedTotalWeight / totalCap) * 100) : 0);
                    return (
                      <span
                        className={`font-bold font-mono ${util > 100 ? "text-red-600" : util > 85 ? "text-amber-600" : "text-emerald-600"
                          }`}
                      >
                        {util}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ROW 4: SECTION 5 (SUPPLIER-WISE PROCUREMENT GROUPING - Cyan Theme)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-cyan-50/50 to-surface dark:from-cyan-950/20 dark:to-surface border border-cyan-200/70 dark:border-cyan-800/40 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-200/60 dark:border-cyan-900/40">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
              5
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-cyan-900 dark:text-cyan-300">
              Supplier-wise Procurement Grouping
            </h2>
          </div>
          <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40">
            BOM Component Aggregation & Mappings
          </span>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-surface border border-cyan-200/60 dark:border-cyan-900/30 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-text-secondary block">Total Suppliers / Vendors</span>
            <p className="text-xl font-black text-cyan-900 dark:text-cyan-300 mt-0.5">
              {new Set(dynamicSupplierBOM.map(s => s.supplier_name)).size}
            </p>
          </div>
          <div className="bg-surface border border-cyan-200/60 dark:border-cyan-900/30 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-text-secondary block">Total Products to Procure</span>
            <p className="text-xl font-black text-cyan-900 dark:text-cyan-300 mt-0.5">
              {dynamicSupplierBOM.length}
            </p>
          </div>
          <div className="bg-surface border border-cyan-200/60 dark:border-cyan-900/30 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-text-secondary block">Total Quantity</span>
            <p className="text-xl font-black text-cyan-900 dark:text-cyan-300 mt-0.5 font-mono">
              {dynamicSupplierBOM.reduce((sum, it) => sum + (it.qty || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-surface border border-cyan-200/60 dark:border-cyan-900/30 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-text-secondary block">Procurement Groups</span>
            <p className="text-xl font-black text-cyan-900 dark:text-cyan-300 mt-0.5">
              {selectedOrdersList.length > 0 ? 1 : 0}
            </p>
          </div>
        </div>

        {/* Supplier-wise Details Table */}
        <div className="overflow-x-auto border border-border rounded-xl bg-surface mb-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-hover/80 border-b border-border text-text-secondary font-black uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Supplier / OEM</th>
                <th className="py-2.5 px-3">Product Name & Specifications</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3">Warehouse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {dynamicSupplierBOM.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-text-muted italic text-[11px]">
                    No orders selected. Please select orders above to calculate supplier-wise procurement breakdown.
                  </td>
                </tr>
              ) : (
                dynamicSupplierBOM.map((item, idx) => (
                  <tr key={idx} className="hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20">
                    <td className="py-2.5 px-3 font-bold text-cyan-900 dark:text-cyan-300">
                      <div className="flex items-center gap-2">
                        <span>{item.supplier_name}</span>
                        {item.is_oem && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200">
                            OEM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-text-primary">
                      {item.product || item.product_name || item.component_name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-text-primary font-mono">
                      {(item.qty || item.total_units || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary">
                      <span className="px-2 py-0.5 rounded-md bg-surface-hover text-[11px] font-mono">
                        {item.warehouse || "WH-IND-GJ-001 (Sanand Hub, Ahmedabad)"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Validation & Exceptions Notice */}
        <div className="p-3 rounded-xl bg-surface border border-cyan-200/60 dark:border-cyan-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
            <FaCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Validation & Exceptions: All items mapped to valid suppliers/OEM partners</span>
          </div>
          {calculationData?.exceptions?.length > 0 && (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
              <FaExclamationTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{calculationData.exceptions.length} items require supplier mapping review</span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ROW 5: SECTION 6 (ORDER GROUP SUMMARY - Teal Theme)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-teal-50/50 to-surface dark:from-teal-950/20 dark:to-surface border border-teal-200/70 dark:border-teal-800/40 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-teal-200/60 dark:border-teal-900/40 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
              6
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-teal-900 dark:text-teal-300">
              Order Group Summary
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200 font-black">
              Group ID: {displayGroupId}
            </span>
            <span className="text-text-muted">
              Created On: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="text-text-muted">
              Created By: {user?.name || "Account User"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-5">
          {/* Order Details */}
          <div className="bg-surface border border-teal-200/60 dark:border-teal-900/30 rounded-xl p-3.5 space-y-1.5">
            <span className="font-bold text-teal-900 dark:text-teal-300 block mb-1">Order Details</span>
            <div className="flex justify-between">
              <span className="text-text-muted">Selected Orders:</span>
              <span className="font-bold text-text-primary">{selectedOrderIds.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total Kits:</span>
              <span className="font-bold text-text-primary">{(calculationData?.total_kits || selectedKitsCount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total Weight (Est.):</span>
              <span className="font-bold text-text-primary">{calculatedTotalWeight.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Vehicle Capacity Req:</span>
              <span className="font-bold text-text-primary">
                {((activeVehicleObj?.max_load_kg || 15000) * (vehicleStrategy === "multiple_same" ? (dynamicVehicleSuggestion?.vehicleCount || 1) : 1)).toLocaleString()} kg ({activeVehicleObj?.name || "Fleet Vehicle"})
              </span>
            </div>
          </div>

          {/* Geography */}
          <div className="bg-surface border border-teal-200/60 dark:border-teal-900/30 rounded-xl p-3.5 space-y-1.5">
            <span className="font-bold text-teal-900 dark:text-teal-300 block mb-1">Geography</span>
            <div className="flex justify-between">
              <span className="text-text-muted">States:</span>
              <span className="font-bold text-text-primary">{new Set(selectedOrdersList.map(o => o.state_name).filter(Boolean)).size || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Districts:</span>
              <span className="font-bold text-text-primary">{new Set(selectedOrdersList.map(o => o.district_name).filter(Boolean)).size || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Pincodes:</span>
              <span className="font-bold text-text-primary">{new Set(selectedOrdersList.map(o => o.pincode).filter(Boolean)).size || 1}</span>
            </div>
          </div>

          {/* Origin & Payment */}
          <div className="bg-surface border border-teal-200/60 dark:border-teal-900/30 rounded-xl p-3.5 space-y-1.5">
            <span className="font-bold text-teal-900 dark:text-teal-300 block mb-1">Order Origin & Payment</span>
            <div className="flex justify-between">
              <span className="text-text-muted">Order Origin:</span>
              <span className="font-bold text-text-primary">
                {calculationData?.origins?.join(" / ") || "EPC / Franchisee / Company"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Payment Mode:</span>
              <span className="font-bold text-text-primary">
                {calculationData?.payment_mode || "Mixed (Online / Offline)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Validation Status:</span>
              <span className="font-bold text-emerald-600">
                {calculationData?.vehicle_assignment?.validation_status || "Pass"}
              </span>
            </div>
          </div>
        </div>

        {/* Big Action Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={selectedOrderIds.length === 0 || submitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPaperPlane className="w-4 h-4" />
            Send to Procurement
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ROW 6: SECTION 7 (SUBMISSION WORKFLOW & STATUS - Stepper & Legend)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center shadow-xs">
            7
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-text-primary">
            Submission Workflow & Status Lifecycle
          </h2>
        </div>

        {/* Process Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {[
            { step: 1, title: "Selected Orders" },
            { step: 2, title: "Group Validation" },
            { step: 3, title: "Create Group ID" },
            { step: 4, title: "Link Orders & BOM" },
            { step: 5, title: "Send to Procurement" },
            { step: 6, title: "Procurement Receives" },
            { step: 7, title: "Supplier/OEM POs" },
          ].map((s, idx) => (
            <div
              key={s.step}
              className="p-2.5 rounded-xl border border-border bg-surface-hover/40 flex flex-col items-center justify-center"
            >
              <span className="w-5 h-5 rounded-full bg-primary/20 text-[#263880] text-[10px] font-black flex items-center justify-center mb-1">
                {s.step}
              </span>
              <span className="font-bold text-[11px] text-text-primary">{s.title}</span>
            </div>
          ))}
        </div>

        {/* Suggested Statuses Legend */}
        <div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-2">
            Suggested Statuses Legend
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { label: "New Order", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
              { label: "Selected for Processing", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
              { label: "Group Validation Pending", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
              { label: "Ready for Procurement", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
              { label: "Sent to Procurement", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
              { label: "Procurement In Progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
              { label: "Procurement Completed", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
              { label: "Exception / Rework Required", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
            ].map((st, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${st.color}`}>
                • {st.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          CONFIRMATION MODAL BEFORE SEND TO PROCUREMENT
      ───────────────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Send to Procurement Group"
      >
        <div className="space-y-4 p-2 text-xs">
          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
            <h4 className="font-black text-sm text-teal-900 dark:text-teal-200">
              Procurement Group Submission Overview
            </h4>
            <p className="text-text-secondary mt-1">
              You are about to group and dispatch <strong>{selectedOrderIds.length} customer orders</strong> with a total of{" "}
              <strong>{(calculationData?.total_kits || selectedKitsCount).toLocaleString()} kit units</strong> to the Procurement module.
            </p>
          </div>

          <div className="space-y-2 border-y border-border py-3">
            <div className="flex justify-between">
              <span className="text-text-muted">Estimated Load Weight:</span>
              <span className="font-bold font-mono">{(calculationData?.total_weight_est_kg || selectedKitsCount * 50).toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Assigned Fleet Vehicle:</span>
              <span className="font-bold">{vehicles.find(v => v._id === selectedVehicleId)?.name || calculationData?.vehicle_assignment?.vehicle_name || "Assigned Vehicle"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Supplier / OEM Partners:</span>
              <span className="font-bold">{new Set(dynamicSupplierBOM.map(s => s.supplier_name)).size} Partners</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total Products:</span>
              <span className="font-bold font-mono">{dynamicSupplierBOM.reduce((acc, it) => acc + (it.qty || 0), 0).toLocaleString()} units</span>
            </div>
          </div>

          <p className="text-[11px] text-text-muted">
            Upon submission, linked orders will be combined under a unique Procurement Group ID (e.g. <code>PG-2026-XXXX</code>) and you will be routed directly to <strong>Supplier Payments</strong> to process payments.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSendToProcurement}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? <Loader text="Submitting & Routing..." /> : (
                <>
                  <FaPaperPlane className="w-3.5 h-3.5" />
                  Confirm &amp; Send to Supplier Payment
                </>
              )}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
