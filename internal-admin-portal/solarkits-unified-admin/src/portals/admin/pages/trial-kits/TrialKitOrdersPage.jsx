import React, { useState, useEffect, useCallback } from "react";
import {
  getTrialKitOrders,
  updateTrialKitDelivery,
  cancelReversalTrialKitOrder,
  reassignTrialKitBde
} from "../../api/trialKitsApi";
import {
  FaBoxes,
  FaTruck,
  FaCheckCircle,
  FaBan,
  FaUndo,
  FaUserTie,
  FaSearch,
  FaFilter
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiAlertCircle, FiCheck } from "react-icons/fi";

export default function TrialKitOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    order_status: "all",
    kit_type: "all",
    gst_number: ""
  });

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionType, setActionType] = useState(null); // 'dispatch' | 'deliver' | 'cancel_reversal' | 'reassign_bde'

  // Dispatch Form
  const [dispatchForm, setDispatchForm] = useState({
    courier_name: "Blue Dart / Trackon",
    tracking_number: "",
    tracking_url: "",
    delivery_notes: ""
  });

  // Cancellation Reversal Form (Section 4)
  const [cancelReason, setCancelReason] = useState("");

  // BDE Reassign Form
  const [newBdeId, setNewBdeId] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (filters.order_status !== "all") params.order_status = filters.order_status;
      if (filters.kit_type !== "all") params.kit_type = filters.kit_type;
      if (filters.gst_number) params.gst_number = filters.gst_number;

      const res = await getTrialKitOrders(params);
      if (res?.success) {
        setOrders(res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Execute Delivery Action (Dispatch or Deliver)
  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await updateTrialKitDelivery(selectedOrder._id, {
        action: actionType,
        ...dispatchForm
      });
      if (res?.success) {
        setSuccess(res.message || "Order updated.");
        setSelectedOrder(null);
        setActionType(null);
        fetchOrders();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update delivery.");
    }
  };

  // Execute Cancellation Reversal (Section 4)
  const handleCancelReversalSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await cancelReversalTrialKitOrder(selectedOrder._id, {
        reason: cancelReason
      });
      if (res?.success) {
        setSuccess(res.message || "Order cancelled, stock reversed and GST restriction released.");
        setSelectedOrder(null);
        setActionType(null);
        fetchOrders();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel and reverse restriction.");
    }
  };

  // Execute BDE Reassign
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await reassignTrialKitBde(selectedOrder._id, {
        new_bde_id: newBdeId
      });
      if (res?.success) {
        setSuccess(res.message || "BDE reassigned.");
        setSelectedOrder(null);
        setActionType(null);
        fetchOrders();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reassign BDE.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaTruck className="text-blue-600" />
            Trial Kit Orders & Delivery Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Section 1, 4 & 5: Manage order fulfillment, dispatch tracking, delivery confirmation, and authorized Admin cancellation reversals.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh Orders
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><FiX /></button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}><FiX /></button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-200 text-xs">
        <div>
          <label className="block text-gray-500 font-semibold mb-1">Status</label>
          <select
            value={filters.order_status}
            onChange={(e) => setFilters({ ...filters, order_status: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-300"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-500 font-semibold mb-1">Kit Type</label>
          <select
            value={filters.kit_type}
            onChange={(e) => setFilters({ ...filters, kit_type: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-gray-300"
          >
            <option value="all">All Kit Types</option>
            <option value="1 kW Trial Kit">1 kW Trial Kit</option>
            <option value="2 kW Trial Kit">2 kW Trial Kit</option>
            <option value="3 kW Trial Kit">3 kW Trial Kit</option>
            <option value="5 kW Trial Kit">5 kW Trial Kit</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-500 font-semibold mb-1">EPC GSTIN</label>
          <input
            type="text"
            placeholder="Search GSTIN..."
            value={filters.gst_number}
            onChange={(e) => setFilters({ ...filters, gst_number: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => setFilters({ search: "", order_status: "all", kit_type: "all", gst_number: "" })}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">EPC Name & GSTIN</th>
                <th className="py-3 px-4">Kit Type & Warehouse</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Delivery Tracking</th>
                <th className="py-3 px-4 text-right">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">No trial kit orders found matching criteria.</td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isDelivered = o.order_status === "delivered";
                  const isDispatched = o.order_status === "dispatched";
                  const isConfirmed = o.order_status === "confirmed";
                  const isCancelled = o.order_status === "cancelled";

                  return (
                    <tr key={o._id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{o.order_number}</td>
                      <td className="py-3.5 px-4 text-gray-500">{new Date(o.order_date).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{o.epc_company_name || o.epc_name}</div>
                        <div className="text-[11px] text-gray-500 font-mono">GSTIN: {o.gst_number}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800">{o.kit_type}</div>
                        <div className="text-[11px] font-medium text-gray-600">
                          {o.warehouse_id?.warehouse_name || o.warehouse_name || "Ahmedabad Central Warehouse"}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {o.warehouse_id?.warehouse_code || o.warehouse_code || (o.warehouse_name?.startsWith("IND_") ? o.warehouse_name : null) || "IND_GUJ_001"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          isDelivered
                            ? "bg-emerald-100 text-emerald-800"
                            : isDispatched
                            ? "bg-blue-100 text-blue-800"
                            : isCancelled
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {o.order_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {o.delivery_details?.tracking_number ? (
                          <div>
                            <span className="font-semibold">{o.delivery_details.courier_name || "Logistics"}: </span>
                            <span className="font-mono">{o.delivery_details.tracking_number}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not dispatched yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {isConfirmed && (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setActionType("dispatch");
                              setDispatchForm({
                                courier_name: "Blue Dart Logistics",
                                tracking_number: "",
                                tracking_url: "",
                                delivery_notes: ""
                              });
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs"
                          >
                            Dispatch
                          </button>
                        )}
                        {isDispatched && (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setActionType("deliver");
                              setDispatchForm({ courier_name: "", tracking_number: "", tracking_url: "", delivery_notes: "Delivered at site" });
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs"
                          >
                            Confirm Delivered
                          </button>
                        )}
                        {!isDelivered && !isCancelled && (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setActionType("cancel_reversal");
                              setCancelReason("");
                            }}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg text-xs"
                            title="Admin Cancel & Reverse Restriction"
                          >
                            Cancel & Release GST
                          </button>
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

      {/* DISPATCH / DELIVER MODAL */}
      {(actionType === "dispatch" || actionType === "deliver") && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FaTruck className="text-blue-600" />
                {actionType === "dispatch" ? "Dispatch Order Shipment" : "Confirm Order Delivery"}
              </h3>
              <button onClick={() => { setSelectedOrder(null); setActionType(null); }}><FiX /></button>
            </div>

            <form onSubmit={handleDeliverySubmit} className="mt-4 space-y-3 text-xs">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <span className="font-bold text-gray-800">{selectedOrder.order_number}</span> &bull; {selectedOrder.kit_type}
                <p className="text-gray-500">Destination: {selectedOrder.delivery_details?.shipping_address?.district} ({selectedOrder.delivery_details?.shipping_address?.pincode})</p>
              </div>

              {actionType === "dispatch" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Courier / Transporter Name</label>
                    <input
                      type="text"
                      required
                      value={dispatchForm.courier_name}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, courier_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Docket / Tracking Number</label>
                    <input
                      type="text"
                      required
                      value={dispatchForm.tracking_number}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, tracking_number: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Tracking URL (Optional)</label>
                    <input
                      type="url"
                      value={dispatchForm.tracking_url}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, tracking_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={dispatchForm.delivery_notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, delivery_notes: e.target.value })}
                  placeholder="Dispatch or delivery notes..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedOrder(null); setActionType(null); }}
                  className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-semibold ${
                    actionType === "dispatch" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {actionType === "dispatch" ? "Confirm Dispatch" : "Mark Delivered"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 4 AUTHORIZED ADMIN CANCELLATION & STOCK REVERSAL MODAL */}
      {actionType === "cancel_reversal" && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-red-900 text-sm flex items-center gap-2">
                <FaUndo className="text-red-600" /> Authorized Admin Cancellation Reversal
              </h3>
              <button onClick={() => { setSelectedOrder(null); setActionType(null); }}><FiX /></button>
            </div>

            <form onSubmit={handleCancelReversalSubmit} className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-red-50 text-red-900 rounded-xl space-y-1">
                <p className="font-bold">Mandatory Business Rule (Section 4):</p>
                <p>
                  Approving this cancellation will reverse stock (+1) back to warehouse <strong>{selectedOrder.warehouse_name}</strong> and permanently release the trial kit restriction for EPC GSTIN <strong>{selectedOrder.gst_number}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Reason for Authorized Cancellation</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Specify why this trial order is cancelled and GST restriction is being released..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedOrder(null); setActionType(null); }}
                  className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  Approve Reversal & Release GST
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
