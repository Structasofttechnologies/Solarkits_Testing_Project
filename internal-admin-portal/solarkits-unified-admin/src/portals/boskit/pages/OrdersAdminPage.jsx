import React, { useState, useEffect } from "react";
import {
  FiShoppingCart,
  FiSearch,
  FiFilter,
  FiEye,
  FiCheckCircle,
  FiTruck,
  FiXCircle,
  FiClock,
  FiRefreshCw,
  FiX,
  FiFileText,
  FiPackage,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const STATUS_TABS = [
  { id: "all", label: "All Orders" },
  { id: "new", label: "New Orders" },
  { id: "confirmed", label: "Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "packed", label: "Packed" },
  { id: "out_for_delivery", label: "Out for Delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [buyerTypeFilter, setBuyerTypeFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/boskit/v1/admin/orders?status=${activeTab}&buyer_type=${buyerTypeFilter}&search=${search}`
      );
      if (res.data?.success) {
        setOrders(res.data.data?.orders || []);
      }
    } catch (err) {
      console.error("Error loading orders:", err);
      setFeedback({ type: "error", msg: "Failed to load orders." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [activeTab, buyerTypeFilter]);

  const handleOpenDetail = async (orderId) => {
    try {
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/orders/${orderId}`);
      if (res.data?.success) {
        setSelectedOrder(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load order detail:", err);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setStatusUpdating(true);
      const res = await axios.post(`${API_BASE}/boskit/v1/admin/orders/${orderId}/status`, {
        status: newStatus,
        comment: `Order transitioned to ${newStatus} by Admin`,
      });
      if (res.data?.success) {
        setFeedback({ type: "success", msg: `Order status updated to ${newStatus}.` });
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(res.data.data);
        }
        loadOrders();
      }
    } catch (err) {
      setFeedback({ type: "error", msg: err.response?.data?.message || "Failed to update order status." });
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiShoppingCart /> Fulfillment & Invoicing
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            BOSKIT B2B Order Management
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Monitor distributor wholesale procurement and dealer network orders with immutable price snapshots.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors self-start sm:self-auto"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      {feedback.msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
          }`}
        >
          {feedback.type === "success" ? <FiCheckCircle /> : <FiXCircle />}
          {feedback.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-border pb-2 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input
            type="text"
            placeholder="Search order number or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadOrders()}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-text-muted">Buyer Role:</span>
          <select
            value={buyerTypeFilter}
            onChange={(e) => setBuyerTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:border-primary font-medium"
          >
            <option value="all">All Buyers</option>
            <option value="distributor">Distributors Only</option>
            <option value="dealer">Dealers Only</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs">
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-2">
            <FiPackage size={32} className="mx-auto text-text-muted/40" />
            <p className="text-sm font-semibold">No orders found matching this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Order Ref</th>
                  <th className="p-4">Buyer Entity</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Order Value</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-text-primary">{o.order_number}</td>
                    <td className="p-4">
                      <div className="font-bold text-text-primary">{o.billing_name}</div>
                      <div className="text-[10px] font-mono text-text-muted">{o.billing_gst}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-hover text-text-primary">
                        {o.buyer_type}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-text-primary">{o.items_count} Units</td>
                    <td className="p-4 font-bold text-emerald-600 text-sm">
                      ₹{Number(o.grand_total_inr).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          o.payment_status === "captured"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          o.order_status === "delivered" || o.order_status === "confirmed"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : o.order_status === "cancelled"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}
                      >
                        {o.order_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(o.id)}
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-primary hover:text-white transition-all text-xs font-semibold"
                      >
                        View Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-black text-xl text-text-primary">
                    {selectedOrder.order_number}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedOrder.order_status === "delivered" || selectedOrder.order_status === "confirmed"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {selectedOrder.order_status}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()} | Role: {selectedOrder.buyer_type}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Status Transition Action Bar */}
            <div className="p-4 rounded-xl bg-surface-hover/50 border border-border flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-bold text-text-primary">Advance Order Status:</div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedOrder.order_status !== "processing" && (
                  <button
                    disabled={statusUpdating}
                    onClick={() => handleUpdateStatus(selectedOrder._id, "processing")}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                  >
                    Mark Processing
                  </button>
                )}
                {selectedOrder.order_status !== "packed" && (
                  <button
                    disabled={statusUpdating}
                    onClick={() => handleUpdateStatus(selectedOrder._id, "packed")}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    Mark Packed
                  </button>
                )}
                {selectedOrder.order_status !== "out_for_delivery" && (
                  <button
                    disabled={statusUpdating}
                    onClick={() => handleUpdateStatus(selectedOrder._id, "out_for_delivery")}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20"
                  >
                    Out for Delivery
                  </button>
                )}
                {selectedOrder.order_status !== "delivered" && (
                  <button
                    disabled={statusUpdating}
                    onClick={() => handleUpdateStatus(selectedOrder._id, "delivered")}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  >
                    Mark Delivered
                  </button>
                )}
                {selectedOrder.order_status !== "cancelled" && (
                  <button
                    disabled={statusUpdating}
                    onClick={() => handleUpdateStatus(selectedOrder._id, "cancelled")}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>

            {/* Line Items with Immutable Snapshots */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Order Items & Pricing Snapshot
              </h4>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover text-text-muted font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Base Price</th>
                      <th className="p-3">GST Rate</th>
                      <th className="p-3">GST Amount</th>
                      <th className="p-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedOrder.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-semibold text-text-primary">{it.item_name}</td>
                        <td className="p-3">{it.quantity}</td>
                        <td className="p-3">₹{((it.price_snapshot?.price_before_gst_paise || 0) / 100).toLocaleString("en-IN")}</td>
                        <td className="p-3">{it.price_snapshot?.gst_pct || 18}%</td>
                        <td className="p-3">₹{(((it.price_snapshot?.gst_amount_paise || 0) * it.quantity) / 100).toLocaleString("en-IN")}</td>
                        <td className="p-3 font-bold text-text-primary text-right">
                          ₹{((it.line_total_paise || 0) / 100).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & Delivery Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="p-4 rounded-xl bg-surface-hover/30 border border-border space-y-2">
                <div className="text-xs font-bold text-text-primary">Delivery Address:</div>
                <div className="text-xs text-text-secondary leading-relaxed">
                  <div>{selectedOrder.delivery_address?.line}</div>
                  <div>{selectedOrder.delivery_address?.city}, {selectedOrder.delivery_address?.pincode}</div>
                  <div className="font-semibold text-text-primary mt-1">
                    Contact: {selectedOrder.delivery_address?.contact_name} ({selectedOrder.delivery_address?.contact_phone})
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-hover/30 border border-border space-y-2">
                <div className="text-xs font-bold text-text-primary">Financial Summary:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Taxable Value:</span>
                    <span>₹{((selectedOrder.subtotal_paise || 0) / 100).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Statutory GST:</span>
                    <span>₹{((selectedOrder.tax_total_paise || 0) / 100).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Freight / Shipping:</span>
                    <span>₹{((selectedOrder.shipping_fee_paise || 0) / 100).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-text-primary text-sm pt-2 border-t border-border">
                    <span>Grand Total:</span>
                    <span className="text-emerald-600">₹{((selectedOrder.grand_total_paise || 0) / 100).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
