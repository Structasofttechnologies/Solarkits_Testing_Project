import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  FaTimes
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheck, FiSliders } from "react-icons/fi";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/warehouse-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/warehouse-api$|\/admin-api$|\/account-api$|\/api$/, "");
const BASE_URL = `${API_BASE}/warehouse-api/trial-kits`;

const KIT_TYPES = [
  "1 kW Trial Kit",
  "2 kW Trial Kit",
  "3 kW Trial Kit",
  "5 kW Trial Kit"
];

export default function WarehouseTrialKitPage() {
  const [stockList, setStockList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'stock'
  const [orderFilterTab, setOrderFilterTab] = useState("all"); // 'all' | 'ready' | 'out_for_delivery' | 'delivered'
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Inward Form
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [inwardForm, setInwardForm] = useState({
    kit_type: "1 kW Trial Kit",
    warehouse_id: "",
    quantity_received: 10,
    vendor_name: "",
    remarks: ""
  });

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [stockRes, ordersRes] = await Promise.all([
        axios.get(`${BASE_URL}/stock`, { headers: authHeaderObj() }),
        axios.get(`${BASE_URL}/orders?limit=100`, { headers: authHeaderObj() })
      ]);

      if (stockRes.data?.success) setStockList(stockRes.data.data || []);
      if (ordersRes.data?.success) setOrders(ordersRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load warehouse trial kit data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit Inward
  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await axios.post(`${BASE_URL}/stock/inward`, inwardForm, { headers: authHeaderObj() });
      if (res.data?.success) {
        setSuccess(res.data.message || "Inward stock recorded.");
        setShowInwardModal(false);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record inward.");
    }
  };

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
            <FaWarehouse className="text-blue-600" />
            Warehouse Trial Kit Fulfillment Hub
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span>Inbound Trial Orders</span>
            <span>•</span>
            <span className="font-semibold text-emerald-600">Direct Out for Delivery (No Procurement Delay)</span>
            <span>•</span>
            <span>Site Delivery Confirmation</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setInwardForm({
                kit_type: "1 kW Trial Kit",
                warehouse_id: stockList[0]?.warehouse_id?._id || stockList[0]?.warehouse_id || "",
                quantity_received: 10,
                vendor_name: "",
                remarks: ""
              });
              setShowInwardModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FaTruckLoading /> Inward Stock
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs border border-emerald-200">{success}</div>}

      {/* Main Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "orders" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FaTruck className="w-4 h-4" />
          Trial Kit Orders Fulfillment ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "stock" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FaBoxes className="w-4 h-4" />
          Warehouse Stock Summary
        </button>
      </div>

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
              {stockList.map((item) => (
                <tr key={item._id}>
                  <td className="py-3 px-4 font-bold text-gray-900">{item.kit_type}</td>
                  <td className="py-3 px-4 text-gray-700">{item.warehouse_id?.warehouse_name || item.warehouse_name}</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700">{item.available_stock}</td>
                  <td className="py-3 px-4 text-center text-amber-700">{item.reserved_stock || 0}</td>
                  <td className="py-3 px-4 text-center text-blue-700">{item.ordered_quantity || 0}</td>
                  <td className="py-3 px-4 text-center text-purple-700">{item.dispatched_quantity || 0}</td>
                  <td className="py-3 px-4 text-center text-emerald-700">{item.delivered_quantity || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          INWARD MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Record Material Inward</h3>
              <button onClick={() => setShowInwardModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleInwardSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Kit Type</label>
                <select
                  value={inwardForm.kit_type}
                  onChange={(e) => setInwardForm({ ...inwardForm, kit_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  {KIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Warehouse</label>
                <select
                  required
                  value={inwardForm.warehouse_id}
                  onChange={(e) => setInwardForm({ ...inwardForm, warehouse_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  <option value="">Select Warehouse</option>
                  {stockList.map((s) => (
                    <option key={s.warehouse_id?._id || s.warehouse_id} value={s.warehouse_id?._id || s.warehouse_id}>
                      {s.warehouse_id?.warehouse_name || s.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Quantity</label>
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
                    required
                    value={inwardForm.vendor_name}
                    onChange={(e) => setInwardForm({ ...inwardForm, vendor_name: e.target.value })}
                    placeholder="e.g. Solarkits Inward"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Save Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
