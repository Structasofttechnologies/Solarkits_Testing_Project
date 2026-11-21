import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaBoxes, FaShoppingCart, FaSearch, FaFilter, FaTruck, FaWarehouse,
  FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaPaperPlane,
  FaRedo, FaLayerGroup, FaMapMarkerAlt, FaFileInvoice, FaBuilding,
  FaArrowRight, FaClock, FaCheck, FaInfoCircle, FaChevronRight,
  FaShieldAlt, FaExternalLinkAlt, FaTimes, FaSlidersH, FaPlus, FaEye, FaTag
} from "react-icons/fa";
import { FiRefreshCw, FiCheckCircle as FiCheckCircleOutline, FiAlertCircle } from "react-icons/fi";
import {
  getTrialKitsFilterOptions,
  getTrialKitsOrders,
  groupAndSendTrialKits,
} from "../../api/accounts";
import Button from "../../components/Button";
import Dialog from "../../components/Dialog";
import Loader from "../../components/Loader";
import CompactMultiSelectDropdown from "../../components/CompactMultiSelectDropdown";

export default function TrialKitsOrdersPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user_slice || {});

  // ───────────────────────────────────────────────────────────────────────────
  // Filter Options from Backend
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
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Active Filter States
  // ───────────────────────────────────────────────────────────────────────────
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [orderMode, setOrderMode] = useState("all"); // 'all' | 'offline' | 'online'
  const [orderOrigin, setOrderOrigin] = useState("all"); // 'all' | 'epc' | 'franchisee' | 'company'
  const [orderCategory, setOrderCategory] = useState("all"); // 'all' | 'govt_tender' | 'industry_kit'
  const [industryType, setIndustryType] = useState("");
  const [projectType, setProjectType] = useState("");
  const [kitType, setKitType] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [accountWorkflowStatus, setAccountWorkflowStatus] = useState("all");

  // Geographical Filters
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [deliveryDestination, setDeliveryDestination] = useState("all");

  // Order Selection Controls
  const [orderCountLimit, setOrderCountLimit] = useState(100); // 50 | 100 | 500 | 1000
  const [selectionMethod, setSelectionMethod] = useState("manual"); // 'auto' | 'manual'
  const [searchTerm, setSearchTerm] = useState("");

  // Live Filter Counts
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

  // ───────────────────────────────────────────────────────────────────────────
  // Orders & Selections State
  // ───────────────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Grouping & Dispatch Modals
  // ───────────────────────────────────────────────────────────────────────────
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupDispatchMode, setGroupDispatchMode] = useState("group"); // 'group' | 'individual'
  const [groupName, setGroupName] = useState("");
  const [groupNotes, setGroupNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Initial Load: Filter Options Metadata
  // ───────────────────────────────────────────────────────────────────────────
  const fetchFilterMeta = useCallback(async () => {
    try {
      const res = await getTrialKitsFilterOptions();
      if (res?.data) {
        setFilterOptions(res.data);
        if (res.data.filter_counts) {
          setFilterCounts(res.data.filter_counts);
        }
      }
    } catch (err) {
      console.error("Failed to load trial kit filter options:", err);
    }
  }, []);

  useEffect(() => {
    fetchFilterMeta();
  }, [fetchFilterMeta]);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Fetch Matching Orders
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
        account_workflow_status: accountWorkflowStatus,
        states: selectedStates.join(","),
        districts: selectedDistricts.join(","),
        pincode: pincodeSearch,
        delivery_destination: deliveryDestination,
        search: searchTerm,
        limit: orderCountLimit,
      };

      const res = await getTrialKitsOrders(params);
      if (res?.data) {
        setOrders(res.data || []);
        setTotalMatching(res.total || (res.data || []).length);
        if (res.filter_counts) {
          setFilterCounts(res.filter_counts);
        }

        // Auto select if configured
        if (selectionMethod === "auto" && Array.isArray(res.data)) {
          setSelectedOrderIds(res.data.slice(0, orderCountLimit).map((o) => o._id));
        }
      }
    } catch (err) {
      console.error("Error fetching trial kit orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [
    selectedWarehouse, orderMode, orderOrigin, orderCategory,
    industryType, projectType, kitType, orderStatus, accountWorkflowStatus,
    selectedStates, selectedDistricts, pincodeSearch, deliveryDestination,
    searchTerm, selectionMethod, orderCountLimit
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-select sync
  useEffect(() => {
    if (selectionMethod === "auto" && orders.length > 0) {
      setSelectedOrderIds(orders.slice(0, orderCountLimit).map((o) => o._id));
    }
  }, [orderCountLimit, selectionMethod, orders]);

  // ───────────────────────────────────────────────────────────────────────────
  // Selection Handlers
  // ───────────────────────────────────────────────────────────────────────────
  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length && orders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.slice(0, orderCountLimit).map((o) => o._id));
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
    setAccountWorkflowStatus("all");
    setSelectedStates([]);
    setSelectedDistricts([]);
    setPincodeSearch("");
    setDeliveryDestination("all");
    setSearchTerm("");
    setOrderCountLimit(100);
    setSelectionMethod("manual");
    setSelectedOrderIds([]);
  };

  // State Options with Counts
  const stateOptions = useMemo(() => {
    return (filterOptions.states || []).map((st) => ({
      value: st.name,
      label: st.name,
      count: filterCounts.by_state?.[st.name] || 0,
    }));
  }, [filterOptions.states, filterCounts.by_state]);

  // Available Districts (filtered by selected states)
  const availableDistricts = useMemo(() => {
    if (!filterOptions.districts || filterOptions.districts.length === 0) return [];
    if (selectedStates.length === 0) return filterOptions.districts;

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

  // Selected orders array
  const selectedOrdersList = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o._id));
  }, [orders, selectedOrderIds]);

  // ───────────────────────────────────────────────────────────────────────────
  // Group & Send to Warehouse Submission
  // ───────────────────────────────────────────────────────────────────────────
  const handleOpenGroupModal = (mode = "group") => {
    if (selectedOrderIds.length === 0) {
      showNotification("error", "Please select at least one order to proceed.");
      return;
    }
    setGroupDispatchMode(mode);
    setGroupName(mode === "group" ? `Batch ${selectedStates[0] || 'Cluster'} - ${selectedOrderIds.length} Trial Kits` : "");
    setShowGroupModal(true);
  };

  const handleConfirmSendToWarehouse = async () => {
    if (selectedOrderIds.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        order_ids: selectedOrderIds,
        dispatch_mode: groupDispatchMode,
        group_name: groupName,
        notes: groupNotes,
      };

      const res = await groupAndSendTrialKits(payload);
      if (res?.success) {
        showNotification("success", res.message || "Successfully sent trial kit orders directly to Warehouse!");
        setShowGroupModal(false);
        setSelectedOrderIds([]);
        setGroupName("");
        setGroupNotes("");
        fetchOrders();
        fetchFilterMeta();
        // Trigger global badge update
        window.dispatchEvent(new CustomEvent("accounts:badge-refresh"));
      }
    } catch (err) {
      showNotification("error", err.response?.data?.message || "Failed to send orders to Warehouse.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* ─────────────────────────────────────────────────────────────────────
          PAGE HEADER & WORKFLOW PROCESS TITLE (Matches Screenshot 1)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <FaBoxes className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-text-primary">
                  SOLARKITS — Trial Kits Order Module (Company Account Login)
                </h1>
                <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2 font-medium flex-wrap">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">Process Flow:</span>
                  <span>Filter</span>
                  <FaChevronRight className="w-2.5 h-2.5 text-text-muted" />
                  <span>Select Orders</span>
                  <FaChevronRight className="w-2.5 h-2.5 text-text-muted" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Group / Individual Batch</span>
                  <FaChevronRight className="w-2.5 h-2.5 text-text-muted" />
                  <span className="font-bold text-blue-700 dark:text-blue-300">Direct to Warehouse Out for Delivery</span>
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                    Bypasses Procurement
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
            <button
              onClick={() => { fetchOrders(); fetchFilterMeta(); }}
              disabled={loadingOrders}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
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
          (Directly matching Screenshot 2)
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
                  : filterOptions.warehouses?.find((w) => w._id === selectedWarehouse)?.warehouse_name
                    ? `Active Warehouse: ${filterOptions.warehouses.find((w) => w._id === selectedWarehouse).warehouse_name}`
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
                const whOrderCount = filterCounts.by_warehouse?.[wh._id] || 0;
                const whDisplayName = wh.warehouse_name || wh.warehouse_code || "Warehouse";
                return (
                  <option key={wh._id} value={wh._id}>
                    {whDisplayName} {wh.warehouse_code ? `(${wh.warehouse_code})` : ""} — [{whOrderCount} Orders]
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

              {/* District (Multi-Select) */}
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

            {/* Right: Order Count Selection & Direct Dispatch Strategy */}
            <div className="space-y-3 pl-0 md:pl-2 border-t md:border-t-0 md:border-l border-emerald-200/60 dark:border-emerald-900/40 pt-3 md:pt-0">
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-1.5">
                  Order Count Selection (Batch Limit)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[50, 100, 500, 1000].map((lim) => (
                    <button
                      key={lim}
                      type="button"
                      onClick={() => setOrderCountLimit(lim)}
                      className={`py-1.5 text-xs font-black rounded-lg border transition-all cursor-pointer ${orderCountLimit === lim
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-surface border-border hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-text-primary"
                        }`}
                    >
                      {lim}
                    </button>
                  ))}
                </div>
              </div>

              {/* Informational Box */}
              <div className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/30 border border-emerald-300/60 dark:border-emerald-800/40 text-[11px] text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <FaTruck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                  Direct Warehouse Fulfillment
                </div>
                <p className="text-[10px] text-emerald-800/90 dark:text-emerald-300/90 leading-tight">
                  Selected trial kits will be sent directly to the Warehouse Panel for immediate Out for Delivery, bypassing the supplier procurement cycle.
                </p>
              </div>

              {/* Selection Method */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-1.5">
                  Selection Method
                </label>
                <div className="flex items-center gap-4 text-xs font-semibold">
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
          ROW 2: SECTION 3 (SELECT ORDERS & VIEW SUMMARY)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-4.5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 mb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
              3
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-text-primary">
              Select Orders & View Summary
            </h2>
          </div>

          <div className="relative w-full md:w-80">
            <FaSearch className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search order no., customer, GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8.5 pr-3 py-2 bg-surface-hover/50 border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Summary Cards (Matches Screenshot 1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/60 to-surface dark:from-purple-950/20 dark:to-surface shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                Total Matching Orders
              </span>
              <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                <FaFileInvoice className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-black text-purple-950 dark:text-purple-100">
              {totalMatching}
            </div>
            <p className="text-[10px] text-purple-800/80 dark:text-purple-400 mt-0.5">
              Matching active filters criteria
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/60 to-surface dark:from-emerald-950/20 dark:to-surface shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Selected Orders
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <FaCheckCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
              {selectedOrderIds.length}
            </div>
            <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400 mt-0.5">
              Up to chosen limit ({orderCountLimit})
            </p>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/60 to-surface dark:from-blue-950/20 dark:to-surface shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                Total Kits (Selected Orders)
              </span>
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                <FaBoxes className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-black text-blue-950 dark:text-blue-100">
              {selectedOrderIds.length}
            </div>
            <p className="text-[10px] text-blue-800/80 dark:text-blue-400 mt-0.5">
              Combined trial equipment units
            </p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            ORDERS TABLE
        ───────────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-xl border border-border shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-hover/80 border-b border-border text-[11px] font-bold text-text-secondary uppercase">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Order # & Date</th>
                <th className="py-3 px-3">Customer / EPC</th>
                <th className="py-3 px-3">Kit Type</th>
                <th className="py-3 px-3">Origin / Category</th>
                <th className="py-3 px-3">Destination</th>
                <th className="py-3 px-3">Warehouse</th>
                <th className="py-3 px-3 text-center">Batch Group</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingOrders ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted">
                    <Loader text="Loading matching trial kit orders..." />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted">
                    <FaBoxes className="w-8 h-8 mx-auto text-text-muted/40 mb-2" />
                    <p className="font-semibold">No trial kit orders match the selected filters.</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isSelected = selectedOrderIds.includes(o._id);
                  const address = o.delivery_details?.shipping_address || o.shipping_address || {};
                  const isSentToWh = o.account_workflow_status === "sent_to_warehouse" || o.order_status === "sent_to_warehouse" || o.order_status === "ready_for_warehouse";
                  const isOutForDelivery = o.order_status === "out_for_delivery" || o.order_status === "dispatched";
                  const isDelivered = o.order_status === "delivered";

                  return (
                    <tr
                      key={o._id}
                      className={`hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors ${isSelected ? "bg-blue-50/50 dark:bg-blue-950/30" : ""
                        }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleOrder(o._id)}
                          className="rounded border-border text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-text-primary">{o.order_number}</div>
                        <div className="text-[10px] text-text-muted flex items-center gap-1">
                          <FaClock className="w-2.5 h-2.5" />
                          {new Date(o.order_date || o.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-text-primary">{o.epc_company_name || o.epc_name}</div>
                        <div className="text-[10px] font-mono text-text-muted">GST: {o.gst_number || "UNSPECIFIED"}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-text-primary">{o.kit_type}</div>
                        <div className="text-[10px] text-text-muted">1 Complete Kit</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            {o.order_origin || "EPC"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-text-secondary capitalize">
                            {o.order_type || "offline"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[180px]">
                        <div className="truncate font-medium text-text-primary">
                          {address.district || address.state ? `${address.district || ''}, ${address.state || ''}` : "Location not set"}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono truncate">
                          PIN: {address.pincode || "—"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-text-primary text-xs">
                          {o.warehouse_id?.warehouse_name || o.warehouse_name || "Ahmedabad Central Warehouse"}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {o.warehouse_id?.warehouse_code || o.warehouse_code || (o.warehouse_name?.startsWith("IND_") ? o.warehouse_name : null) || "IND_GUJ_001"}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {o.is_grouped && o.group_id ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                            {o.group_id}
                          </span>
                        ) : (
                          <span className="text-[11px] text-text-muted">Individual</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${isDelivered
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : isOutForDelivery
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : isSentToWh
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-surface-hover text-text-muted"
                            }`}
                        >
                          {isDelivered
                            ? "Delivered"
                            : isOutForDelivery
                              ? "Out for Delivery"
                              : isSentToWh
                                ? "In Warehouse"
                                : "Pending Grouping"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedOrderDetail(o)}
                          className="p-1.5 rounded-lg border border-border hover:bg-surface-hover text-text-secondary hover:text-text-primary transition"
                          title="View Order Details"
                        >
                          <FaEye className="w-3 h-3" />
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

      {/* ─────────────────────────────────────────────────────────────────────
          STICKY BOTTOM ACTION BAR (When orders are selected)
      ───────────────────────────────────────────────────────────────────── */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 bg-surface/95 backdrop-blur-md border border-blue-400 dark:border-blue-700 p-4 rounded-2xl shadow-xl z-30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              {selectedOrderIds.length}
            </span>
            <div>
              <p className="text-xs font-bold text-text-primary">
                {selectedOrderIds.length} Trial Kit Order(s) Selected
              </p>
              <p className="text-[11px] text-text-muted">
                Choose to dispatch as a consolidated Group Batch or Send Individually to Warehouse.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleOpenGroupModal("individual")}
              className="px-4 py-2 rounded-xl border border-blue-300 bg-white dark:bg-surface text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-50 transition cursor-pointer"
            >
              Send as Individual Orders
            </button>
            <button
              onClick={() => handleOpenGroupModal("group")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <FaLayerGroup className="w-3.5 h-3.5" />
              Create Group & Send to Warehouse
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          GROUP & SEND TO WAREHOUSE MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  <FaTruck className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-text-primary">
                  {groupDispatchMode === "group" ? "Create Group Batch & Send to Warehouse" : "Send Individual Orders to Warehouse"}
                </h3>
              </div>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300">
              <p className="font-bold flex items-center gap-1.5">
                <FaCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Direct Fulfillment Pipeline (No Procurement Delay)
              </p>
              <p className="text-[11px] mt-0.5 text-emerald-800/90 dark:text-emerald-400">
                These {selectedOrderIds.length} trial order(s) will arrive directly in the Warehouse Panel's Trial Kit queue for immediate Out for Delivery dispatch.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              {groupDispatchMode === "group" && (
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                    Group Batch Name / Tag
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Rajkot Cluster Batch 1"
                    className="w-full py-2 px-3 bg-surface border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    An auto-generated ID (e.g. TK-GRP-2026-XXXX) will be permanently attached.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                  Dispatch Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={groupNotes}
                  onChange={(e) => setGroupNotes(e.target.value)}
                  placeholder="e.g. Priority dispatch for upcoming site demonstrations..."
                  className="w-full py-2 px-3 bg-surface border border-border rounded-xl text-text-primary focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-hover border border-border text-[11px] space-y-1">
                <div className="flex justify-between text-text-secondary">
                  <span>Selected Orders:</span>
                  <span className="font-bold text-text-primary">{selectedOrderIds.length}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Total Equipment Units:</span>
                  <span className="font-bold text-text-primary">{selectedOrderIds.length} Trial Kits</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Dispatch Mode:</span>
                  <span className="font-bold uppercase text-blue-600 dark:text-blue-400">{groupDispatchMode}</span>
                </div>
                <div className="flex justify-between text-text-secondary items-center pt-1 border-t border-border/50">
                  <span>Warehouse Allocation:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <FaCheckCircle className="w-3 h-3" /> Origin Warehouse (Order Created Location)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-surface-hover text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendToWarehouse}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                {submitting ? (
                  <>
                    <FiRefreshCw className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="w-3 h-3" /> Confirm & Send to Warehouse
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          ORDER DETAILS DRAWER / MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Trial Kit Order #{selectedOrderDetail.order_number}
                </h3>
                <p className="text-xs text-text-muted">
                  Ordered on {new Date(selectedOrderDetail.order_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="text-text-muted hover:text-text-primary"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-hover border border-border">
                <div>
                  <span className="text-text-muted text-[10px] uppercase font-bold block">EPC / Customer</span>
                  <span className="font-bold text-text-primary">{selectedOrderDetail.epc_company_name || selectedOrderDetail.epc_name}</span>
                </div>
                <div>
                  <span className="text-text-muted text-[10px] uppercase font-bold block">GST Number</span>
                  <span className="font-mono font-bold text-text-primary">{selectedOrderDetail.gst_number || "—"}</span>
                </div>
                <div>
                  <span className="text-text-muted text-[10px] uppercase font-bold block">Kit Specification</span>
                  <span className="font-semibold text-text-primary">{selectedOrderDetail.kit_type}</span>
                </div>
                <div>
                  <span className="text-text-muted text-[10px] uppercase font-bold block">Origin & Mode</span>
                  <span className="capitalize font-medium text-text-primary">{selectedOrderDetail.order_origin} • {selectedOrderDetail.order_type}</span>
                </div>
                <div>
                  <span className="text-text-muted text-[10px] uppercase font-bold block">Fulfillment Warehouse</span>
                  <span className="font-bold text-text-primary">
                    {selectedOrderDetail.warehouse_id?.warehouse_name || selectedOrderDetail.warehouse_name || "Ahmedabad Central Warehouse"}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono block">
                    Code: {selectedOrderDetail.warehouse_id?.warehouse_code || selectedOrderDetail.warehouse_code || (selectedOrderDetail.warehouse_name?.startsWith("IND_") ? selectedOrderDetail.warehouse_name : null) || "IND_GUJ_001"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-text-muted text-[10px] uppercase font-bold block mb-1">Destination Address</span>
                <div className="p-3 rounded-xl bg-surface-hover border border-border font-medium text-text-secondary leading-relaxed">
                  <p>{selectedOrderDetail.delivery_details?.shipping_address?.address || selectedOrderDetail.shipping_address?.address || "Address not specified"}</p>
                  <p>{selectedOrderDetail.delivery_details?.shipping_address?.district || selectedOrderDetail.shipping_address?.district}, {selectedOrderDetail.delivery_details?.shipping_address?.state || selectedOrderDetail.shipping_address?.state} - {selectedOrderDetail.delivery_details?.shipping_address?.pincode || selectedOrderDetail.shipping_address?.pincode}</p>
                  <p className="text-[11px] text-text-muted mt-1">Contact: {selectedOrderDetail.delivery_details?.shipping_address?.contact_name} ({selectedOrderDetail.delivery_details?.shipping_address?.phone})</p>
                </div>
              </div>

              {selectedOrderDetail.is_grouped && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-[11px]">
                  <span className="font-bold text-purple-900 dark:text-purple-300">Group Batch: </span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{selectedOrderDetail.group_id}</span>
                  <p className="text-purple-800/80 dark:text-purple-400 mt-0.5">{selectedOrderDetail.group_name}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-hover hover:bg-border text-text-primary"
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
