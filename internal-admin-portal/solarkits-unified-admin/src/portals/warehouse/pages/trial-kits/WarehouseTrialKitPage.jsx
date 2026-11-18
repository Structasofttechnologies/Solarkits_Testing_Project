import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "../../app/authHeader";
import {
  FaBoxes,
  FaTruck,
  FaTruckLoading,
  FaCheckCircle,
  FaWarehouse,
  FaSearch
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheck } from "react-icons/fi";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/warehouse-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/warehouse-api$|\/admin-api$|\/api$/, "");
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
  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'inward'
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

  // Delivery Action Form
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryAction, setDeliveryAction] = useState(null); // 'dispatch' | 'deliver'
  const [dispatchForm, setDispatchForm] = useState({
    courier_name: "Local Fleet / Transporter",
    tracking_number: "",
    tracking_url: "",
    delivery_notes: ""
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [stockRes, ordersRes] = await Promise.all([
        axios.get(`${BASE_URL}/stock`, { headers: authHeaderObj() }),
        axios.get(`${BASE_URL}/orders`, { headers: authHeaderObj() })
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

  // Submit Delivery Action
  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await axios.put(`${BASE_URL}/orders/${selectedOrder._id}/delivery`, {
        action: deliveryAction,
        ...dispatchForm
      }, { headers: authHeaderObj() });

      if (res.data?.success) {
        setSuccess(res.data.message || "Delivery status updated.");
        setSelectedOrder(null);
        setDeliveryAction(null);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update delivery status.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaWarehouse className="text-blue-600" />
            Warehouse Trial Kit Fulfillment Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Section 1, 5 & 9: Material inward, live stock monitoring, dispatch tracking, and site delivery confirmation.
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
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <FaTruckLoading /> Inward Stock
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "orders" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Trial Orders Fulfillment ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "stock" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Warehouse Stock Summary
        </button>
      </div>

      {/* ORDERS FULFILLMENT TAB */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">EPC Name</th>
                <th className="py-3 px-4">Kit Type</th>
                <th className="py-3 px-4">Destination Address</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Tracking</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading fulfillment orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">No orders queued for this warehouse.</td></tr>
              ) : (
                orders.map((o) => {
                  const isDelivered = o.order_status === "delivered";
                  const isDispatched = o.order_status === "dispatched";
                  const isConfirmed = o.order_status === "confirmed";

                  return (
                    <tr key={o._id} className="hover:bg-gray-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">{o.order_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-800">{o.epc_company_name || o.epc_name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">GSTIN: {o.gst_number}</div>
                      </td>
                      <td className="py-3 px-4 font-medium">{o.kit_type}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {o.delivery_details?.shipping_address?.address}, {o.delivery_details?.shipping_address?.district}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          isDelivered ? "bg-emerald-100 text-emerald-800" : isDispatched ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {o.order_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                        {o.delivery_details?.tracking_number || "—"}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {isConfirmed && (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setDeliveryAction("dispatch");
                              setDispatchForm({ courier_name: "Local Fleet", tracking_number: "", tracking_url: "", delivery_notes: "" });
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
                          >
                            Dispatch
                          </button>
                        )}
                        {isDispatched && (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setDeliveryAction("deliver");
                              setDispatchForm({ courier_name: "", tracking_number: "", tracking_url: "", delivery_notes: "Delivered at site" });
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {isDelivered && (
                          <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
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
      )}

      {/* STOCK SUMMARY TAB */}
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

      {/* INWARD MODAL */}
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
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowInwardModal(false)} className="px-4 py-2 rounded-xl text-gray-600 font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold">Confirm Inward</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH / DELIVER MODAL */}
      {(deliveryAction === "dispatch" || deliveryAction === "deliver") && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                {deliveryAction === "dispatch" ? "Dispatch Shipment" : "Confirm Delivery"}
              </h3>
              <button onClick={() => { setSelectedOrder(null); setDeliveryAction(null); }}><FiX /></button>
            </div>
            <form onSubmit={handleDeliverySubmit} className="mt-4 space-y-3 text-xs">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <span className="font-bold text-gray-800">{selectedOrder.order_number}</span> &bull; {selectedOrder.kit_type}
                <p className="text-gray-500">Destination: {selectedOrder.delivery_details?.shipping_address?.district}</p>
              </div>

              {deliveryAction === "dispatch" && (
                <>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Courier / Transporter</label>
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
                </>
              )}

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={dispatchForm.delivery_notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, delivery_notes: e.target.value })}
                  placeholder="Notes..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => { setSelectedOrder(null); setDeliveryAction(null); }} className="px-4 py-2 rounded-xl text-gray-600 font-semibold">Cancel</button>
                <button type="submit" className={`px-5 py-2 rounded-xl text-white font-semibold ${
                  deliveryAction === "dispatch" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}>
                  {deliveryAction === "dispatch" ? "Confirm Dispatch" : "Confirm Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
