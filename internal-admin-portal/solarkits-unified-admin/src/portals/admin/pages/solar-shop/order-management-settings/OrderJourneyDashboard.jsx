import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaChartLine,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTruck,
  FaClock,
  FaFileInvoice,
  FaUser,
  FaMapMarkerAlt,
  FaTimes,
  FaEye,
  FaLayerGroup,
  FaWarehouse,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import CustomInput from "@/components/CustomInput";
import Dialog from "@/components/Dialog";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function OrderJourneyDashboard() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [kitTypeFilter, setKitTypeFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Selected Order Drawer
  const [selectedOrder, setSelectedOrder] = useState(null);

  const now = new Date();

  const fetchLiveOrders = async () => {
    setLoading(true);
    try {
      const rawApiUrl = (
        import.meta.env.VITE_ADMIN_API_URL ||
        import.meta.env.VITE_API_URL ||
        "http://localhost:5000/admin-api"
      ).replace(/\/+$/, "");
      const apiBase = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
      const adminApi = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${apiBase}/admin-api`;

      const res = await axios.get(`${adminApi}/solarshop/epc-orders?limit=100`, {
        headers: authHeaderObj(),
      });

      const records = res.data?.data || [];
      if (Array.isArray(records)) {
        const mapped = records.map((ord) => {
          // Normalize stage
          let stage = "Processing";
          const ost = (ord.order_status || ord.status || "").toLowerCase();
          const pst = (ord.payment_status || "").toLowerCase();
          if (ost === "delivered" || ord.delivered_at) {
            stage = "Delivered";
          } else if (ost === "dispatched" || ost === "in_transit" || ord.dispatch_tracking?.dispatched_at) {
            stage = "Dispatched";
          } else if (ost === "ready_for_dispatch" || ost === "rfd") {
            stage = "Ready for Dispatch";
          } else if (pst === "pending_verification" || pst === "pending" || ost === "awaiting_payment") {
            stage = "Awaiting Payment";
          } else {
            stage = "Processing";
          }

          // Kit type name
          const kitName = ord.items?.[0]?.item_name || ord.items?.[0]?.name || ord.kit_type || "Solar Kit System";

          // Address
          const destState = ord.delivery_address?.state_name || ord.buyer_state || ord.customer?.state || ord.state || "—";
          const destDistrict = ord.delivery_address?.district_name || ord.buyer_district || ord.customer?.district || ord.district || "—";
          const custName = ord.customer?.name || ord.customer?.company_name || ord.buyer_name || ord.delivery_address?.contact_name || ord.customer_name || "Direct Customer";
          const phone = ord.customer?.phone || ord.buyer_phone || ord.delivery_address?.contact_phone || ord.contact_phone || "—";

          const assignedWh = ord.fulfillment_bifurcation?.assigned_warehouse_code || ord.warehouse || "Central Hub";
          const clusterName = ord.cluster || (destState !== "—" ? `${destState} Cluster` : "Standard Cluster");

          return {
            id: ord._id || ord.id,
            order_number: ord.order_number || ord.po_number || `ORD-${String(ord._id).slice(-6).toUpperCase()}`,
            customer_name: custName,
            contact_phone: phone,
            kit_type: kitName,
            cluster: clusterName,
            warehouse: assignedWh,
            state: destState,
            district: destDistrict,
            industry_type: ord.industry_type || (ord.is_trial_order ? "Trial Solar Kit" : "Solar Rooftop System"),
            payment_confirmed_at: ord.payment_tracking?.stage_entered_at
              ? new Date(ord.payment_tracking.stage_entered_at).toLocaleString("en-IN")
              : ord.created_at
              ? new Date(ord.created_at).toLocaleString("en-IN")
              : null,
            stage,
            expected_delivery_date: ord.expected_delivery_date
              ? new Date(ord.expected_delivery_date).toISOString().split("T")[0]
              : ord.dispatch_tracking?.estimated_delivery
              ? new Date(ord.dispatch_tracking.estimated_delivery).toISOString().split("T")[0]
              : null,
            target_sla_days: ord.payment_tracking?.configured_tat_days || 15,
            actual_delivery_date: ord.delivered_at
              ? new Date(ord.delivered_at).toISOString().split("T")[0]
              : null,
            total_amount: ord.grand_total_paise
              ? ord.grand_total_paise / 100
              : ord.grand_total || ord.total_amount || 0,
            items: (ord.items || []).map((it) => ({
              name: it.item_name || it.name || "Component Item",
              qty: it.quantity || it.qty || 1,
            })),
          };
        });
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn("Notice loading live order journey:", err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveOrders();
  }, [token]);

  // Dynamic filter options derived from live records
  const clusterOptions = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.cluster).filter(Boolean))).sort();
  }, [orders]);

  const warehouseOptions = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.warehouse).filter(Boolean))).sort();
  }, [orders]);

  const stateOptions = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.state).filter(Boolean))).sort();
  }, [orders]);

  const kitTypeOptions = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.kit_type).filter(Boolean))).sort();
  }, [orders]);

  // Compute Days Elapsed & Overdue for each order
  const enhancedOrders = useMemo(() => {
    return orders.map((ord) => {
      let daysElapsed = 0;
      let isOverdue = false;
      let overdueDays = 0;
      let daysRemaining = null;

      if (ord.payment_confirmed_at) {
        const paymentDate = new Date(ord.payment_confirmed_at.replace(" ", "T"));
        const diffMs = now - paymentDate;
        daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      if (ord.expected_delivery_date) {
        const expDate = new Date(ord.expected_delivery_date);
        const remMs = expDate - now;
        daysRemaining = Math.round(remMs / (1000 * 60 * 60 * 24));

        if (ord.stage !== "Delivered") {
          if (daysRemaining < 0) {
            isOverdue = true;
            overdueDays = Math.abs(daysRemaining);
          }
        }
      }

      return {
        ...ord,
        days_elapsed: daysElapsed,
        days_remaining: daysRemaining,
        is_overdue: isOverdue,
        overdue_days: overdueDays,
      };
    });
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return enhancedOrders.filter((ord) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQ =
          ord.order_number.toLowerCase().includes(q) ||
          ord.customer_name.toLowerCase().includes(q) ||
          ord.district.toLowerCase().includes(q);
        if (!matchesQ) return false;
      }
      if (clusterFilter && !ord.cluster.includes(clusterFilter)) return false;
      if (warehouseFilter && !ord.warehouse.includes(warehouseFilter)) return false;
      if (stateFilter && ord.state !== stateFilter) return false;
      if (stageFilter && ord.stage !== stageFilter) return false;
      if (kitTypeFilter && !ord.kit_type.includes(kitTypeFilter)) return false;
      if (overdueOnly && !ord.is_overdue) return false;

      return true;
    });
  }, [enhancedOrders, searchQuery, clusterFilter, warehouseFilter, stateFilter, stageFilter, kitTypeFilter, overdueOnly]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const total = enhancedOrders.length;
    const awaitingPay = enhancedOrders.filter((o) => o.stage === "Awaiting Payment").length;
    const processing = enhancedOrders.filter((o) => o.stage === "Processing").length;
    const readyDispatch = enhancedOrders.filter((o) => o.stage === "Ready for Dispatch").length;
    const dispatched = enhancedOrders.filter((o) => o.stage === "Dispatched").length;
    const delivered = enhancedOrders.filter((o) => o.stage === "Delivered").length;
    const overdue = enhancedOrders.filter((o) => o.is_overdue).length;

    return { total, awaitingPay, processing, readyDispatch, dispatched, delivered, overdue };
  }, [enhancedOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FaChartLine className="text-primary" /> Admin Order Journey Dashboard
        </h2>
        <p className="text-text-secondary text-sm">
          Comprehensive real-time tracking of order fulfillment lifecycles, SLA aging countdowns, bottlenecks, and overdue alerts.
        </p>
      </div>

      {/* 7 KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() => { setStageFilter(""); setOverdueOnly(false); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            stageFilter === "" && !overdueOnly
              ? "bg-primary/10 border-primary shadow-sm"
              : "bg-surface border-border hover:border-primary/50"
          }`}
        >
          <div className="text-xs text-text-secondary font-medium">Total Orders</div>
          <div className="text-2xl font-bold text-text-primary mt-1">{kpiStats.total}</div>
        </div>

        <div
          onClick={() => { setStageFilter("Awaiting Payment"); setOverdueOnly(false); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            stageFilter === "Awaiting Payment"
              ? "bg-amber-500/10 border-amber-500 shadow-sm"
              : "bg-surface border-border hover:border-amber-500/50"
          }`}
        >
          <div className="text-xs text-amber-600 font-medium">Awaiting Pay</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{kpiStats.awaitingPay}</div>
        </div>

        <div
          onClick={() => { setStageFilter("Processing"); setOverdueOnly(false); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            stageFilter === "Processing"
              ? "bg-blue-500/10 border-blue-500 shadow-sm"
              : "bg-surface border-border hover:border-blue-500/50"
          }`}
        >
          <div className="text-xs text-blue-600 font-medium">Processing</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{kpiStats.processing}</div>
        </div>

        <div
          onClick={() => { setStageFilter("Ready for Dispatch"); setOverdueOnly(false); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            stageFilter === "Ready for Dispatch"
              ? "bg-purple-500/10 border-purple-500 shadow-sm"
              : "bg-surface border-border hover:border-purple-500/50"
          }`}
        >
          <div className="text-xs text-purple-600 font-medium">Ready Dispatch</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{kpiStats.readyDispatch}</div>
        </div>

        <div
          onClick={() => { setStageFilter("Dispatched"); setOverdueOnly(false); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            stageFilter === "Dispatched"
              ? "bg-indigo-500/10 border-indigo-500 shadow-sm"
              : "bg-surface border-border hover:border-indigo-500/50"
          }`}
        >
          <div className="text-xs text-indigo-600 font-medium">Dispatched</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{kpiStats.dispatched}</div>
        </div>

        <div
          onClick={() => { setStageFilter("Delivered"); setOverdueOnly(false); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            stageFilter === "Delivered"
              ? "bg-emerald-500/10 border-emerald-500 shadow-sm"
              : "bg-surface border-border hover:border-emerald-500/50"
          }`}
        >
          <div className="text-xs text-emerald-600 font-medium">Delivered</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{kpiStats.delivered}</div>
        </div>

        <div
          onClick={() => { setOverdueOnly(!overdueOnly); setStageFilter(""); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            overdueOnly
              ? "bg-red-500/15 border-red-500 shadow-sm"
              : "bg-surface border-border hover:border-red-500/50"
          }`}
        >
          <div className="text-xs text-red-600 font-bold flex items-center gap-1">
            <FaExclamationTriangle /> Overdue
          </div>
          <div className="text-2xl font-black text-red-600 mt-1">{kpiStats.overdue}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs" />
            <input
              type="text"
              placeholder="Search Order # or Client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">All Regional Clusters</option>
            {clusterOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">All Warehouses</option>
            {warehouseOptions.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>

          <select
            value={kitTypeFilter}
            onChange={(e) => setKitTypeFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">All Kit Types</option>
            {kitTypeOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">All States</option>
            {stateOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                overdueOnly
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-bg text-red-600 border-red-500/30 hover:bg-red-500/10"
              }`}
            >
              <FaExclamationTriangle /> {overdueOnly ? "Showing Overdue" : "Overdue Only"}
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 text-primary flex items-center justify-center mx-auto text-2xl">
              <FaChartLine />
            </div>
            <h3 className="font-bold text-text-primary text-base">No Orders in Fulfillment Journey</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              {searchQuery || clusterFilter || warehouseFilter || stateFilter || stageFilter || kitTypeFilter || overdueOnly
                ? "No orders match current filter criteria. Try resetting the filters."
                : "Currently there are no active customer or EPC orders in the tracking pipeline."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                  <th className="p-4">Order # & Customer</th>
                  <th className="p-4">Kit Type & Route</th>
                  <th className="p-4">Payment Confirmed</th>
                  <th className="p-4">Days Elapsed</th>
                  <th className="p-4">Current Stage</th>
                  <th className="p-4">Expected Delivery</th>
                  <th className="p-4">SLA Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredOrders.map((ord) => {
                  // Row styling for due soon / overdue
                  const isDueSoon =
                    ord.stage !== "Delivered" &&
                    ord.days_remaining !== null &&
                    ord.days_remaining >= 0 &&
                    ord.days_remaining <= 3;
                  const rowClass = ord.is_overdue
                    ? "bg-red-500/5 hover:bg-red-500/10"
                    : isDueSoon
                    ? "bg-amber-500/5 hover:bg-amber-500/10"
                    : "hover:bg-bg/50";

                  // Days elapsed color pill
                  let elapsedBadge = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                  if (ord.days_elapsed > 30) {
                    elapsedBadge = "bg-red-500/10 text-red-600 border-red-500/20 font-bold";
                  } else if (ord.days_elapsed > 15) {
                    elapsedBadge = "bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium";
                  }

                  return (
                    <tr key={ord.id} className={`${rowClass} transition-colors`}>
                      <td className="p-4">
                        <div className="font-semibold text-text-primary">{ord.order_number}</div>
                        <div className="text-xs text-text-secondary">{ord.customer_name}</div>
                        <div className="text-[11px] text-text-secondary font-mono">{ord.contact_phone}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium text-text-primary text-xs">{ord.kit_type}</div>
                        <div className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                          <FaMapMarkerAlt className="text-primary text-[10px]" /> {ord.district}, {ord.state}
                        </div>
                        <div className="text-[10px] text-text-secondary">{ord.warehouse}</div>
                      </td>

                      <td className="p-4 text-xs font-mono text-text-secondary">
                        {ord.payment_confirmed_at || "—"}
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs border ${elapsedBadge}`}>
                          {ord.days_elapsed} Days
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            ord.stage === "Delivered"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : ord.stage === "Dispatched"
                              ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                              : ord.stage === "Ready for Dispatch"
                              ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                              : ord.stage === "Processing"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {ord.stage}
                        </span>
                      </td>

                      <td className="p-4 text-xs">
                        <div className="font-medium text-text-primary">{ord.expected_delivery_date}</div>
                        {ord.stage === "Delivered" ? (
                          <span className="text-[11px] text-emerald-600 font-medium">Delivered on {ord.actual_delivery_date}</span>
                        ) : ord.days_remaining !== null ? (
                          <span className={`text-[11px] font-medium ${ord.days_remaining < 0 ? "text-red-500" : "text-text-secondary"}`}>
                            {ord.days_remaining >= 0 ? `${ord.days_remaining} days left` : `Target passed`}
                          </span>
                        ) : null}
                      </td>

                      <td className="p-4">
                        {ord.stage === "Delivered" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <FaCheckCircle /> Completed
                          </span>
                        ) : ord.is_overdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                            <FaExclamationTriangle /> Overdue {ord.overdue_days}d
                          </span>
                        ) : isDueSoon ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <FaClock /> Due in {ord.days_remaining}d
                          </span>
                        ) : (
                          <span className="text-xs text-text-secondary font-medium">Within SLA</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-bg hover:bg-border text-primary font-medium transition-colors inline-flex items-center gap-1.5"
                        >
                          <FaEye /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Dialog
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order Journey Detail: ${selectedOrder.order_number}`}
        >
          <div className="space-y-4 text-sm">
            <div className="bg-bg/60 p-4 rounded-xl border border-border grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-secondary block">Customer:</span>
                <span className="font-bold text-text-primary">{selectedOrder.customer_name}</span>
                <span className="text-text-secondary block font-mono">{selectedOrder.contact_phone}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Fulfillment Location:</span>
                <span className="font-semibold text-text-primary">{selectedOrder.district}, {selectedOrder.state}</span>
                <span className="text-text-secondary block">{selectedOrder.warehouse}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-text-secondary tracking-wider">
                Bill of Materials & Components
              </h4>
              <div className="bg-bg rounded-lg border border-border divide-y divide-border/60">
                {selectedOrder.items?.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between text-xs">
                    <span className="font-medium text-text-primary">{it.name}</span>
                    <span className="font-bold text-text-secondary">Qty: {it.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-bg/40 p-3 rounded-lg border border-border flex justify-between items-center text-xs">
              <span>Order Value: <strong>₹{selectedOrder.total_amount?.toLocaleString("en-IN")}</strong></span>
              <span>Stage: <strong className="text-primary">{selectedOrder.stage}</strong></span>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button onClick={() => setSelectedOrder(null)}>Close</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
