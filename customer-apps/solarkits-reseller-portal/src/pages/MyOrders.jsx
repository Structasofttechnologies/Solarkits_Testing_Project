import { useState, useEffect } from "react";
import api from "../services/api";
import {
  FiShoppingCart, FiCheckCircle, FiClock, FiXCircle, FiLoader,
  FiZap, FiPackage, FiTruck, FiEye, FiMapPin,
  FiFileText, FiDollarSign, FiRefreshCw, FiExternalLink, FiUser, FiX
} from "react-icons/fi";
import { FaWarehouse, FaBuilding, FaBuilding as FaBuildingSolid, FaTruckLoading } from "react-icons/fa";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_volume: 0,
    total_commission_earned: 0,
    pending_verification_count: 0,
    active_dispatch_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchEpcOrders = () => {
    setLoading(true);
    api.get("/india/v1/reseller/epc-orders/list")
      .then((ordersRes) => {
        if (ordersRes.data?.status === "success") {
          setOrders(ordersRes.data.data || []);
          if (ordersRes.data.stats) {
            setStats(ordersRes.data.stats);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load EPC orders:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEpcOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const pStatus = o.payment_info?.payment_status?.toLowerCase();
    const oStatus = o.order_status?.toLowerCase();

    if (filterTab === "pending_verification") return pStatus === "pending_verification";
    if (filterTab === "approved") return pStatus === "captured" && oStatus !== "dispatched" && oStatus !== "delivered";
    if (filterTab === "dispatched") return oStatus === "dispatched";
    if (filterTab === "delivered") return oStatus === "delivered";
    if (filterTab === "rejected") return pStatus === "rejected";
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <FiShoppingCart className="text-blue-600" size={28} />
            Onboarded EPC Orders & Real-Time Tracking
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Complete real-time tracking for purchase orders placed by your authorized EPC contractors.
          </p>
        </div>

        <button
          onClick={fetchEpcOrders}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all self-start cursor-pointer"
        >
          <FiRefreshCw className={loading ? "animate-spin text-blue-600" : ""} /> Refresh Live Feed
        </button>
      </div>


      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Orders" },
          { id: "pending_verification", label: "Pending Verification" },
          { id: "approved", label: "Payment Approved" },
          { id: "dispatched", label: "Dispatched & In Transit" },
          { id: "delivered", label: "Delivered" },
          { id: "rejected", label: "Payment Rejected" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${filterTab === tab.id
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold gap-2 text-sm">
            <FiLoader className="animate-spin text-blue-600" size={24} /> Loading real-time order feed...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm font-semibold space-y-2">
            <FiPackage className="mx-auto text-4xl text-slate-300" />
            <p>No orders found under this filter status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order ID & Date</th>
                  <th className="px-6 py-4">EPC Buyer Details</th>
                  <th className="px-6 py-4">Ordered Items & Qty</th>
                  <th className="px-6 py-4">Fulfillment Source</th>
                  <th className="px-6 py-4 text-right">Order Amount</th>
                  <th className="px-6 py-4 text-right">Your Margin (₹)</th>
                  <th className="px-6 py-4 text-center">Status & Tracking</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((o) => {
                  const isIcici = o.payment_method === "icici_ecollection" ||
                    o.payment_gateway_used === "icici_ecollection" ||
                    o.payment_info?.payment_method === "icici_ecollection" ||
                    o.payment_info?.payment_gateway_used === "icici_ecollection" ||
                    Boolean(o.payment_info?.admin_remarks?.toLowerCase().includes("icici"));

                  const pStatus = o.payment_info?.payment_status;
                  const isApproved = isIcici || pStatus === "captured" || o.order_status === "confirmed" || o.payment_info?.verification_status === "approved";
                  const isPending = !isIcici && !isApproved && pStatus === "pending_verification";
                  const isDispatched = o.order_status === "dispatched";
                  const isDelivered = o.order_status === "delivered";
                  const isRejected = pStatus === "rejected";

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Order Number & Date */}
                      <td className="px-6 py-4">
                        <div className="font-mono font-black text-slate-900 text-xs">{o.order_number}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </td>

                      {/* EPC Buyer Info */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{o.epc_buyer?.company_name || o.epc_buyer?.name}</div>
                        <div className="text-[11px] text-slate-500">{o.epc_buyer?.whatsapp || o.epc_buyer?.email}</div>
                        {o.epc_buyer?.gstin && (
                          <div className="text-[10px] font-mono font-bold text-blue-600 mt-0.5">
                            GSTIN: {o.epc_buyer.gstin}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">
                          {o.items?.[0]?.item_name || "Solar Kit Package"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Total: <strong className="text-slate-700">{o.total_kits} Kit(s)</strong>
                        </div>
                      </td>

                      {/* Fulfillment Source */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${o.fulfillment_source === "franchise_warehouse"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                          }`}>
                          {o.fulfillment_source === "franchise_warehouse" ? (
                            <>
                              <FaWarehouse size={11} /> Franchise Hub
                            </>
                          ) : (
                            <>
                              <FaBuildingSolid size={11} /> Central Hub
                            </>
                          )}
                        </span>
                      </td>

                      {/* Order Total Amount */}
                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-slate-900 text-sm">
                          ₹{o.financials?.total_amount?.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          UTR: {o.payment_info?.utr_number || "N/A"}
                        </div>
                      </td>

                      {/* Franchise Margin */}
                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-emerald-600 text-sm">
                          +₹{o.financials?.gross_margin?.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {o.financials?.wallet_status}
                        </div>
                        {o.completion_ratio && (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                            Pro-rated: {o.completion_ratio} Kits
                          </div>
                        )}
                        {o.epc_penalty_amount > 0 && (
                          <div className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-block mt-0.5">
                            EPC Pen: ₹{o.epc_penalty_amount.toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>

                      {/* Status & Logistics */}
                      <td className="px-6 py-4 text-center">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800">
                            <FiXCircle size={12} /> Payment Rejected
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                            <FiClock size={12} /> Accounts Verification
                          </span>
                        ) : isApproved && !isDispatched && !isDelivered ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                            <FiCheckCircle size={12} /> Payment Approved
                          </span>
                        ) : isDispatched ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800">
                            <FiTruck size={12} /> In Transit
                          </span>
                        ) : isDelivered ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                            <FiCheckCircle size={12} /> Delivered
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-600">{o.order_status}</span>
                        )}

                        {isDispatched && o.dispatch_tracking?.tracking_number && (
                          <div className="text-[10px] font-mono text-purple-700 font-bold mt-1">
                            {o.dispatch_tracking.tracking_number}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-xl font-extrabold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <FiEye /> Track Live
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

      {/* ── Order Live Tracking Drawer / Modal ───────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                  EPC Order Live Tracking
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1 font-mono">
                  {selectedOrder.order_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* 8-Stage Order Journey Stepper (Module 1.3) */}
            {(() => {
              const STAGE_ORDER = [
                { key: "confirmed", label: "1. Confirmed", sub: "Payment verified" },
                { key: "processing", label: "2. Processing", sub: "Warehouse picking" },
                { key: "vehicle_assigned", label: "3. Fleet Assigned", sub: "Vehicle & Driver" },
                { key: "ready_for_dispatch", label: "4. Ready", sub: "Staged at gate" },
                { key: "dispatched", label: "5. Dispatched", sub: "Out for delivery" },
                { key: "in_transit", label: "6. In Transit", sub: "En route" },
                { key: "reached_destination", label: "7. Arrived", sub: "At site / hub" },
                { key: "delivered", label: "8. Delivered", sub: "Delivery complete" },
              ];

              const rawStatus = String(selectedOrder.order_status || selectedOrder.status || "").toLowerCase();
              let stageIndex = 0;
              if (rawStatus === "delivered" || rawStatus === "completed") stageIndex = 7;
              else if (rawStatus === "reached_destination") stageIndex = 6;
              else if (rawStatus === "in_transit") stageIndex = 5;
              else if (rawStatus === "dispatched" || Boolean(selectedOrder.dispatch_tracking?.tracking_number)) stageIndex = 4;
              else if (rawStatus === "ready_for_dispatch") stageIndex = 3;
              else if (rawStatus === "vehicle_assigned" || Boolean(selectedOrder.assigned_vehicle?.vehicle_id || selectedOrder.assigned_vehicle?.vehicle_name)) stageIndex = 2;
              else if (rawStatus === "processing") stageIndex = 1;
              else if (rawStatus === "confirmed" || selectedOrder.payment_info?.payment_status === "approved" || selectedOrder.payment_status === "paid") stageIndex = 0;
              else stageIndex = 0;

              return (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  {/* Progress track */}
                  <div className="overflow-x-auto pb-2">
                    <div className="relative min-w-[560px]">
                      <div className="absolute top-4 left-5 right-5 h-1 bg-slate-200 rounded-full -z-0" />
                      <div
                        className="absolute top-4 left-5 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-500 -z-0"
                        style={{ width: `${Math.min(100, Math.max(0, (stageIndex / (STAGE_ORDER.length - 1)) * 100))}%` }}
                      />

                      <div className="grid grid-cols-8 gap-1 relative z-10">
                        {STAGE_ORDER.map((st, sIdx) => {
                          const isCompleted = sIdx < stageIndex;
                          const isCurrent = sIdx === stageIndex;

                          return (
                            <div key={st.key} className="flex flex-col items-center text-center space-y-1">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${isCompleted
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : isCurrent
                                      ? "bg-blue-600 text-white shadow-md ring-4 ring-blue-200 scale-105 animate-pulse"
                                      : "bg-white border border-slate-200 text-slate-400"
                                  }`}
                              >
                                {isCompleted ? "✓" : sIdx + 1}
                              </div>
                              <p className={`text-[10px] font-bold leading-tight ${isCurrent ? "text-blue-600 font-black" : isCompleted ? "text-emerald-700" : "text-slate-400"}`}>
                                {st.label.replace(/^\d+\.\s*/, "")}
                              </p>
                              <p className="text-[8px] text-slate-400 leading-tight">
                                {st.sub}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Assigned Fleet & Driver if assigned */}
                  {selectedOrder.assigned_vehicle?.vehicle_name && (
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <FiTruck size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900">
                              🚚 {selectedOrder.assigned_vehicle.vehicle_name}
                            </span>
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-blue-700 font-bold">
                              {selectedOrder.assigned_vehicle.vehicle_registration}
                            </span>
                            {selectedOrder.assigned_vehicle.is_recommended && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Optimal Fit
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Driver: <strong>{selectedOrder.assigned_vehicle.driver_name || "Assigned Driver"}</strong>
                            {selectedOrder.assigned_vehicle.driver_contact && (
                              <span className="ml-2 font-mono text-slate-800">📞 {selectedOrder.assigned_vehicle.driver_contact}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Load Metrics if available */}
                  {selectedOrder.order_load_metrics && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Kits</span>
                        <span className="font-extrabold text-slate-800">{selectedOrder.order_load_metrics.total_kits_count || 0} Kits</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Capacity</span>
                        <span className="font-extrabold text-blue-700">{selectedOrder.order_load_metrics.total_system_kw || 0} kW</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Payload Weight</span>
                        <span className="font-extrabold text-slate-800">{selectedOrder.order_load_metrics.total_payload_weight_kg || 0} kg</span>
                      </div>
                    </div>
                  )}

                  {/* Transit Checkpoints if available */}
                  {selectedOrder.milestones && selectedOrder.milestones.length > 0 && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Transit Checkpoints:
                      </span>
                      <div className="space-y-1">
                        {selectedOrder.milestones.map((ms, mIdx) => (
                          <div key={mIdx} className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded">
                            <span className="font-medium">📍 {ms.description || ms.status}</span>
                            <span className="text-[10px] text-slate-400">
                              {ms.timestamp ? new Date(ms.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Rejection Alert */}
            {selectedOrder.payment_info?.rejection_reason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1">
                <p className="font-extrabold text-red-700">Accounts Rejection Reason:</p>
                <p>{selectedOrder.payment_info.rejection_reason}</p>
              </div>
            )}

            {/* Buyer & Logistics Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-extrabold text-slate-700 block text-[11px] uppercase tracking-wider">EPC Buyer Profile</span>
                <p className="font-bold text-slate-900 text-sm">{selectedOrder.epc_buyer?.company_name || selectedOrder.epc_buyer?.name}</p>
                <p className="text-slate-600">Mobile: {selectedOrder.epc_buyer?.whatsapp || "N/A"}</p>
                <p className="text-slate-600">Email: {selectedOrder.epc_buyer?.email}</p>
                <p className="font-mono text-blue-600 font-bold">GSTIN: {selectedOrder.epc_buyer?.gstin || "N/A"}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-extrabold text-slate-700 block text-[11px] uppercase tracking-wider">Offline Payment Details</span>
                <p className="text-slate-600 font-mono">UTR: <strong className="text-slate-900">{selectedOrder.payment_info?.utr_number}</strong></p>
                <p className="text-slate-600">Amount Paid: <strong className="text-emerald-600 font-sans">₹{selectedOrder.financials?.total_amount?.toLocaleString("en-IN")}</strong></p>
                <p className="text-slate-600">Accounts Status: <span className="font-bold capitalize">{selectedOrder.payment_info?.payment_status}</span></p>
                {selectedOrder.payment_info?.receipt_url && (
                  <a
                    href={selectedOrder.payment_info.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold pt-1"
                  >
                    <FiExternalLink /> View Uploaded Receipt
                  </a>
                )}
              </div>
            </div>

            {/* Dispatch Tracking Section */}
            {selectedOrder.dispatch_tracking?.tracking_number && (
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-xs space-y-2 text-purple-900">
                <span className="font-extrabold block text-[11px] uppercase tracking-wider text-purple-800">
                  Logistics & Consignment Tracking
                </span>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span>Courier: <strong>{selectedOrder.dispatch_tracking.courier_name || "Express Logistics"}</strong></span>
                  <span className="font-mono font-bold">LR / Waybill: {selectedOrder.dispatch_tracking.tracking_number}</span>
                  {selectedOrder.dispatch_tracking.estimated_delivery && (
                    <span className="text-emerald-700 font-bold">
                      Est. Delivery: {new Date(selectedOrder.dispatch_tracking.estimated_delivery).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                {selectedOrder.dispatch_tracking.tracking_url && (
                  <a
                    href={selectedOrder.dispatch_tracking.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-700 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <FiExternalLink /> Track via Courier Partner Portal
                  </a>
                )}
              </div>
            )}

            {/* Commission Summary */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-emerald-800">Franchise Margin for this Order:</span>
                <p className="text-[11px] text-emerald-700">Commission Rate: {selectedOrder.financials?.commission_rate}% • {selectedOrder.financials?.wallet_status}</p>
              </div>
              <span className="text-xl font-black text-emerald-600">
                +₹{selectedOrder.financials?.gross_margin?.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
