import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getTrialKitOrders,
  reassignTrialKitBde
} from "../../api/trialKitsApi";
import { bdeApi } from "../../api/bdeApi";
import {
  FaUserTie,
  FaSearch,
  FaFilter,
  FaBoxes,
  FaLayerGroup,
  FaCalendarAlt,
  FaEye,
  FaCheckCircle,
  FaExclamationCircle,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaArrowRight,
  FaWarehouse,
  FaClipboardList,
  FaLock
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheck, FiChevronRight, FiClock, FiCheckCircle } from "react-icons/fi";

export default function TrialKitUnassignedLeadsPage() {
  const [orders, setOrders] = useState([]);
  const [bdes, setBdes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBdes, setLoadingBdes] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Tab: 'pending' (unassigned) | 'assigned' | 'all'
  const [activeTab, setActiveTab] = useState("pending");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState("all"); // 'all' | 'loose' | 'bulk_po' | 'both'
  const [timelineFilter, setTimelineFilter] = useState("all");

  // Assignment Modal
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);
  const [selectedBdeId, setSelectedBdeId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Detail Modal
  const [detailOrder, setDetailOrder] = useState(null);

  // Fetch all trial kit orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getTrialKitOrders({
        limit: 250
      });
      if (res?.success) {
        setOrders(res.data || []);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to load trial kit intent leads:", err);
      setError(err.response?.data?.message || "Failed to load intent leads.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch active BDEs for assignment
  const fetchBdeList = useCallback(async () => {
    try {
      setLoadingBdes(true);
      const res = await bdeApi.listBdes({ limit: 100, status: "active" });
      const rawList = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];
      setBdes(rawList);
    } catch (err) {
      console.error("Failed to load BDEs for assignment:", err);
    } finally {
      setLoadingBdes(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchBdeList();
  }, [fetchOrders, fetchBdeList]);

  // Handle BDE Assignment Submission
  const handleAssignBdeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderForAssign || !selectedBdeId) return;

    try {
      setAssigning(true);
      setError("");
      const res = await reassignTrialKitBde(selectedOrderForAssign._id, {
        new_bde_id: selectedBdeId
      });

      if (res?.success) {
        const assignedBde = bdes.find(
          (b) => (b._id || b.id)?.toString() === selectedBdeId.toString()
        );
        const bdeName = assignedBde?.full_name || assignedBde?.name || "BDE";
        setSuccess(`Lead ${selectedOrderForAssign.order_number} successfully assigned to ${bdeName}! Form answers transferred to BDE Sales Funnel.`);

        // Optimistically update order in local state so it moves out of pending instantly
        setOrders((prev) =>
          prev.map((o) =>
            o._id === selectedOrderForAssign._id
              ? {
                ...o,
                bde_id: selectedBdeId,
                bde_name: bdeName,
                is_bde_assigned: true,
                bde_assigned_at: new Date()
              }
              : o
          )
        );

        setSelectedOrderForAssign(null);
        setSelectedBdeId("");
        fetchOrders();
      } else {
        setError(res?.message || "Failed to assign BDE.");
      }
    } catch (err) {
      console.error("Assignment error:", err);
      setError(err.response?.data?.message || "Error assigning lead to BDE.");
    } finally {
      setAssigning(false);
    }
  };

  // Tab counts
  const pendingCount = useMemo(() => {
    return orders.filter((o) => !o.bde_id && !o.is_bde_assigned).length;
  }, [orders]);

  const assignedCount = useMemo(() => {
    return orders.filter((o) => Boolean(o.bde_id || o.is_bde_assigned)).length;
  }, [orders]);

  // Filtered leads based on tab, search, mode, timeline
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab matching
      const isAssigned = Boolean(order.bde_id || order.is_bde_assigned);
      if (activeTab === "pending" && isAssigned) return false;
      if (activeTab === "assigned" && !isAssigned) return false;

      // Search matching
      const s = searchTerm.toLowerCase().trim();
      const matchSearch =
        !s ||
        (order.order_number || "").toLowerCase().includes(s) ||
        (order.epc_company_name || "").toLowerCase().includes(s) ||
        (order.epc_name || "").toLowerCase().includes(s) ||
        (order.gst_number || "").toLowerCase().includes(s) ||
        (order.kit_type || "").toLowerCase().includes(s) ||
        (order.bde_name || "").toLowerCase().includes(s) ||
        (order.delivery_details?.shipping_address?.district || "").toLowerCase().includes(s) ||
        (order.delivery_details?.shipping_address?.state || "").toLowerCase().includes(s);

      // Mode matching
      const intentMode = order.future_intent?.future_purchase_mode;
      const matchMode =
        modeFilter === "all" ||
        (modeFilter === "loose" && intentMode === "loose") ||
        (modeFilter === "bulk_po" && intentMode === "bulk_po") ||
        (modeFilter === "both" && intentMode === "both");

      // Timeline matching
      const timeline = order.future_intent?.estimated_timeline || "";
      const matchTimeline =
        timelineFilter === "all" ||
        timeline.toLowerCase().includes(timelineFilter.toLowerCase());

      return matchSearch && matchMode && matchTimeline;
    });
  }, [orders, activeTab, searchTerm, modeFilter, timelineFilter]);

  // Aggregate KPI metrics across pending unassigned orders
  const metrics = useMemo(() => {
    const pendingOrders = orders.filter((o) => !o.bde_id && !o.is_bde_assigned);
    let looseCount = 0;
    let looseTotalQty = 0;
    let poCount = 0;
    let poTotalQty = 0;
    let urgentTimelineCount = 0;

    pendingOrders.forEach((o) => {
      const fi = o.future_intent;
      if (fi) {
        if (fi.future_purchase_mode === "loose" || fi.future_purchase_mode === "both") {
          looseCount++;
          looseTotalQty += Number(fi.loose_quantity || fi.expected_quantity || 0);
        }
        if (fi.future_purchase_mode === "bulk_po" || fi.future_purchase_mode === "both") {
          poCount++;
          poTotalQty += Number(fi.po_quantity || (fi.future_purchase_mode === "bulk_po" ? fi.expected_quantity : 0) || 0);
        }
        if (
          fi.estimated_timeline &&
          (fi.estimated_timeline.toLowerCase().includes("15") ||
            fi.estimated_timeline.toLowerCase().includes("immediate"))
        ) {
          urgentTimelineCount++;
        }
      }
    });

    return {
      pendingTotal: pendingOrders.length,
      assignedTotal: orders.length - pendingOrders.length,
      looseCount,
      looseTotalQty,
      poCount,
      poTotalQty,
      urgentTimelineCount
    };
  }, [orders]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md">
              <FaClipboardList className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Trial Kit Intent Leads Management
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign unassigned EPC trial kit buyer intent to active BDEs. Once assigned, leads transfer directly into the BDE&apos;s sales funnel.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span>Refresh Leads</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center justify-between border border-red-200">
          <div className="flex items-center gap-2">
            <FaExclamationCircle className="shrink-0 text-base" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold">
            <FiX size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-between border border-emerald-200">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="shrink-0 text-base text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Unassigned */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Pending BDE Assignment
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {metrics.pendingTotal} Leads
            </span>
            <span className="text-[11px] text-gray-500 font-semibold mt-0.5 block">
              {metrics.assignedTotal} Leads already assigned
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            <FaUserTie />
          </div>
        </div>

        {/* Loose Intent Volume */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Pending Loose Kits Intent
            </span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">
              {metrics.looseTotalQty} Kits
            </span>
            <span className="text-[11px] text-gray-500 font-medium mt-0.5 block">
              Across {metrics.looseCount} EPC buyer leads
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            <FaBoxes />
          </div>
        </div>

        {/* Bulk PO Intent Volume */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Pending Bulk PO Intent
            </span>
            <span className="text-2xl font-black text-purple-600 mt-1 block">
              {metrics.poTotalQty} Kits
            </span>
            <span className="text-[11px] text-gray-500 font-medium mt-0.5 block">
              Across {metrics.poCount} EPC buyer leads
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
            <FaLayerGroup />
          </div>
        </div>

        {/* Urgent Action */}
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Urgent Intent (&le;15 Days)
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {metrics.urgentTimelineCount} Leads
            </span>
            <span className="text-[11px] text-emerald-700 font-bold mt-0.5 block">
              High purchase readiness
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
            <FaCalendarAlt />
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Pending vs Assigned vs All */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === "pending"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
            }`}
        >
          <FiClock className={activeTab === "pending" ? "text-amber-500" : ""} />
          <span>Pending BDE Assignment</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "pending" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-600"
            }`}>
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assigned")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === "assigned"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
            }`}
        >
          <FiCheckCircle className={activeTab === "assigned" ? "text-emerald-500" : ""} />
          <span>Assigned to BDE (Locked)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "assigned" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
            }`}>
            {assignedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === "all"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
            }`}
        >
          <span>All Leads ({orders.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by EPC Company, Contact, Phone, GSTIN, BDE Name, Order #..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Purchase Mode:</span>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="all">All Intent Types</option>
              <option value="loose">Loose Kits Only</option>
              <option value="bulk_po">Bulk PO Only</option>
            </select>
          </div>

          {/* Timeline Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Timeline:</span>
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="all">All Timelines</option>
              <option value="15">Within 15 Days</option>
              <option value="30">15 - 30 Days</option>
              <option value="Month">1 - 3 Months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-gray-900 text-sm">
              {activeTab === "pending"
                ? `Pending Unassigned Leads (${filteredOrders.length})`
                : activeTab === "assigned"
                  ? `Assigned BDE Leads (${filteredOrders.length})`
                  : `All Trial Kit Intent Leads (${filteredOrders.length})`}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Only Paid & Confirmed Orders
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {activeTab === "pending"
              ? "Once a BDE is assigned, the lead locks and transfers to the BDE funnel"
              : "Leads actively assigned and monitored by BDE"}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <FiRefreshCw className="animate-spin text-2xl text-amber-500" />
            <span className="text-xs font-semibold">Loading trial kit leads...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <FaCheckCircle className="text-3xl text-emerald-500 mx-auto" />
            <h4 className="font-bold text-gray-700 text-sm">
              {activeTab === "pending"
                ? "No Pending Unassigned Leads!"
                : "No matching leads found."}
            </h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {activeTab === "pending"
                ? "All trial kit buyer leads currently have an assigned BDE managing their purchase intent in the sales funnel."
                : "No trial kit orders match the selected filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4"># / Order</th>
                  <th className="py-3 px-4">EPC Company / Buyer</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Trial Kit Tested</th>
                  <th className="py-3 px-4">Future Purchase Intent</th>
                  <th className="py-3 px-4 text-center">BDE Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order, idx) => {
                  const intent = order.future_intent || {};
                  const isLoose = intent.future_purchase_mode === "loose";
                  const isBulk = intent.future_purchase_mode === "bulk_po";
                  const isAssigned = Boolean(order.bde_id || order.is_bde_assigned);

                  return (
                    <tr key={order._id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Order & Index */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="text-[10px] text-gray-400 font-mono font-bold block">
                          #{idx + 1}
                        </span>
                        <span className="font-mono font-black text-gray-900 text-xs block">
                          {order.order_number}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : "Recent"}
                        </span>
                      </td>

                      {/* EPC Company & Contact */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-extrabold text-gray-900 text-xs block">
                          {order.epc_company_name || order.epc_name || "EPC Client"}
                        </span>
                        <span className="text-[11px] text-gray-600 font-medium block">
                          Contact: {order.epc_name || "N/A"}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            GSTIN: {order.gst_number}
                          </span>
                          {order.delivery_details?.shipping_address?.phone && (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <FaPhoneAlt size={9} />
                              {order.delivery_details.shipping_address.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-start gap-1.5 text-gray-700">
                          <FaMapMarkerAlt className="text-amber-500 mt-0.5 shrink-0 text-xs" />
                          <div>
                            <span className="font-bold block text-xs">
                              {order.delivery_details?.shipping_address?.district || "District"}
                            </span>
                            <span className="text-[11px] text-gray-500 block">
                              {order.delivery_details?.shipping_address?.state || "State"}
                              {order.delivery_details?.shipping_address?.pincode ? ` - ${order.delivery_details.shipping_address.pincode}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Trial Kit Details */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-bold text-gray-900 block text-xs">
                          {order.kit_type}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          Landed: ₹{Number(order.commercial_metrics?.total_inr || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="inline-block mt-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {order.order_status || "confirmed"}
                        </span>
                      </td>

                      {/* Future Purchase Intent Details */}
                      <td className="py-3.5 px-4 align-top">
                        {intent.expected_quantity > 0 || intent.loose_quantity > 0 || intent.po_quantity > 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-black text-[10px] uppercase px-2 py-0.5 rounded-md ${isLoose
                                    ? "bg-blue-100 text-blue-800"
                                    : isBulk
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                              >
                                {isLoose ? "Loose Kits" : isBulk ? "Bulk PO" : "Loose & PO"}
                              </span>
                              <span className="font-extrabold text-xs text-gray-900">
                                Planned: {intent.expected_quantity || ((intent.loose_quantity || 0) + (intent.po_quantity || 0))} Kits
                              </span>
                            </div>

                            {/* Quantities breakdown */}
                            <div className="text-[11px] text-gray-600 flex items-center gap-2">
                              {intent.loose_quantity > 0 && (
                                <span>Loose: <strong>{intent.loose_quantity}</strong></span>
                              )}
                              {intent.po_quantity > 0 && (
                                <span>PO: <strong>{intent.po_quantity}</strong></span>
                              )}
                            </div>

                            {/* Timeline */}
                            {intent.estimated_timeline && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                <FaCalendarAlt size={10} className="text-gray-400" />
                                <span>Timeline: {intent.estimated_timeline}</span>
                              </div>
                            )}

                            {intent.remarks && (
                              <p className="text-[10px] text-gray-500 italic truncate max-w-xs" title={intent.remarks}>
                                &ldquo;{intent.remarks}&rdquo;
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">No specific intent logged</span>
                        )}
                      </td>

                      {/* Action Buttons & BDE Lock Status */}
                      <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {isAssigned ? (
                            /* ONCE ASSIGNED: No "Assign BDE" option. Permanently locked badge showing assigned BDE. */
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black shadow-xs">
                              <FaCheckCircle className="text-emerald-600 text-xs shrink-0" />
                              <span>Assigned: {order.bde_name || "BDE"}</span>
                              <FaLock className="text-emerald-500 text-[10px] ml-1 opacity-70" title="BDE Assignment Locked" />
                            </div>
                          ) : (
                            /* UNASSIGNED: Show "Assign BDE" button */
                            <button
                              onClick={() => setSelectedOrderForAssign(order)}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
                              title="Assign to active BDE"
                            >
                              <FaUserTie size={11} />
                              <span>Assign BDE</span>
                            </button>
                          )}

                          <button
                            onClick={() => setDetailOrder(order)}
                            className="p-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            title="View Full Intent Details"
                          >
                            <FaEye size={12} />
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

      {/* MODAL 1: ASSIGN BDE */}
      {selectedOrderForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-gray-200 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <FaUserTie size={14} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Assign Intent Lead to BDE</h3>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Order #{selectedOrderForAssign.order_number}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForAssign(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Lead Summary Info */}
            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/70 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">EPC Buyer:</span>
                <span className="font-bold text-gray-900">
                  {selectedOrderForAssign.epc_company_name || selectedOrderForAssign.epc_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">GST Number:</span>
                <span className="font-mono font-bold text-gray-800">{selectedOrderForAssign.gst_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Trial Kit:</span>
                <span className="font-bold text-gray-800">{selectedOrderForAssign.kit_type}</span>
              </div>
              {selectedOrderForAssign.future_intent && (
                <div className="flex justify-between pt-1 border-t border-amber-200/50">
                  <span className="text-amber-900 font-bold">Future Intent:</span>
                  <span className="font-black text-amber-700">
                    {selectedOrderForAssign.future_intent.future_purchase_mode?.toUpperCase()} &bull;{" "}
                    {selectedOrderForAssign.future_intent.expected_quantity || 0} Kits
                  </span>
                </div>
              )}
            </div>

            {/* BDE Selection Form */}
            <form onSubmit={handleAssignBdeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">
                  Select Active BDE for this Territory *
                </label>
                {loadingBdes ? (
                  <p className="text-gray-400 text-xs">Loading active BDE roster...</p>
                ) : (
                  <select
                    required
                    value={selectedBdeId}
                    onChange={(e) => setSelectedBdeId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">-- Choose a BDE --</option>
                    {bdes.map((b) => (
                      <option key={b._id || b.id} value={b._id || b.id}>
                        {b.full_name || b.name} ({b.bde_id || "BDE"} - {b.district_name || b.mobile_number || "Active"})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-gray-500 mt-1.5">
                  <strong>Notice:</strong> Once assigned, this option will permanently lock. The intent form answers and EPC customer will transfer directly to this BDE&apos;s Sales Funnel.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForAssign(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedBdeId || assigning}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold flex items-center gap-2 disabled:opacity-50 shadow-md"
                >
                  {assigning ? "Assigning..." : "Confirm & Transfer to BDE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL INTENT DETAILS DRAWER */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border border-gray-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="font-mono text-xs font-bold text-gray-400">Order #{detailOrder.order_number}</span>
                <h3 className="text-lg font-black text-gray-900 mt-0.5">
                  {detailOrder.epc_company_name || detailOrder.epc_name}
                </h3>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* BDE Status if already assigned */}
            {detailOrder.bde_id && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-600 text-sm" />
                  <span className="font-bold text-emerald-900">
                    Assigned to BDE: <strong>{detailOrder.bde_name || "BDE Assigned"}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Locked
                </span>
              </div>
            )}

            {/* Future Purchase Intent Showcase */}
            <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-900 uppercase text-xs tracking-wider flex items-center gap-1.5">
                  <FaClipboardList className="text-amber-600" />
                  Pre-Order Buyer Questionnaire
                </span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                  {detailOrder.future_intent?.future_purchase_mode?.toUpperCase() || "LOOSE"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/80 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">Total Planned Qty</span>
                  <span className="text-base font-black text-amber-700">
                    {detailOrder.future_intent?.expected_quantity || 0} Kits
                  </span>
                </div>
                <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/80 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">Loose Qty</span>
                  <span className="text-sm font-bold text-gray-800">
                    {detailOrder.future_intent?.loose_quantity || 0} Kits
                  </span>
                </div>
                <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/80 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">Bulk PO Qty</span>
                  <span className="text-sm font-bold text-gray-800">
                    {detailOrder.future_intent?.po_quantity || 0} Kits
                  </span>
                </div>
                <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/80 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">Timeline</span>
                  <span className="text-xs font-bold text-gray-800">
                    {detailOrder.future_intent?.estimated_timeline || "N/A"}
                  </span>
                </div>
              </div>

              {detailOrder.future_intent?.remarks && (
                <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 text-xs">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Project Remarks:</span>
                  <p className="text-gray-800 font-medium mt-0.5">{detailOrder.future_intent.remarks}</p>
                </div>
              )}
            </div>

            {/* Shipping Address & Contact */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1.5">
              <span className="font-bold text-gray-700 block uppercase text-[10px]">Delivery Details</span>
              <p className="text-gray-900 font-medium">
                {detailOrder.delivery_details?.shipping_address?.address || "Address"}
              </p>
              <p className="text-gray-600">
                {detailOrder.delivery_details?.shipping_address?.district},{" "}
                {detailOrder.delivery_details?.shipping_address?.state} -{" "}
                {detailOrder.delivery_details?.shipping_address?.pincode}
              </p>
              <p className="text-gray-700">
                Contact: {detailOrder.delivery_details?.shipping_address?.contact_name} &bull;{" "}
                {detailOrder.delivery_details?.shipping_address?.phone}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              {!detailOrder.bde_id && (
                <button
                  type="button"
                  onClick={() => {
                    const toAssign = detailOrder;
                    setDetailOrder(null);
                    setSelectedOrderForAssign(toAssign);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  <FaUserTie size={12} />
                  <span>Assign to BDE</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50"
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
