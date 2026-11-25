import React from "react";
import {
  FaTimes,
  FaBoxes,
  FaTruck,
  FaTools,
  FaShippingFast,
  FaCheckCircle,
  FaFileInvoice,
  FaBarcode,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaArrowRight
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function OrderActionDrawer({
  isOpen = false,
  order = null,
  onClose
}) {
  const navigate = useNavigate();

  if (!isOpen || !order) return null;

  const items = order.items || [];
  const transport = order.transport_details || {};
  const eway = order.eway_bill || {};
  const completion = order.delivery_completion || {};

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-bg border-l border-border shadow-2xl h-full flex flex-col z-10 overflow-hidden animate-slideLeft">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-bg to-primary/5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-lg text-primary">
                {order.order_number}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {order.delivery_status?.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Customer: <strong className="text-text-primary">{order.customer_name}</strong> • Phone: {order.customer_phone}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hover">
          {/* Section 1: Overview & Location */}
          <div className="p-4 rounded-xl border border-border bg-bg/40 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FaMapMarkerAlt className="text-primary" />
              <span>Destination & Kit Specifications</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-muted">Delivery Address:</span>
                <p className="font-semibold text-text-primary mt-0.5">{order.address || order.district}</p>
                <p className="text-text-muted text-[11px]">{order.district}, {order.state} - {order.pincode}</p>
              </div>
              <div>
                <span className="text-text-muted">Kit Specification:</span>
                <p className="font-bold text-text-primary mt-0.5">{order.kit_type}</p>
                <p className="text-primary font-semibold text-[11px]">{order.num_kits} Sets ({order.system_capacity})</p>
              </div>
            </div>
          </div>

          {/* Section 2: BOM Items Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FaBoxes className="text-primary" />
              <span>BOM Components & Stock Allocation ({items.length})</span>
            </h4>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-bg text-text-secondary text-[10px] uppercase font-bold border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Component / SKU</th>
                    <th className="py-2 px-3 text-center">Ordered</th>
                    <th className="py-2 px-3 text-center">Received</th>
                    <th className="py-2 px-3 text-center">Allocated</th>
                    <th className="py-2 px-3 text-center">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-primary/5">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-text-primary">{it.product_name}</div>
                        <div className="text-[10px] text-text-muted font-mono">{it.sku}</div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold">{it.ordered_qty}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">{it.received_qty || 0}</td>
                      <td className="py-2 px-3 text-center font-bold text-blue-600">{it.allocated_stock || 0}</td>
                      <td className="py-2 px-3 text-center">
                        {(it.pending_qty || 0) > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-300">
                            {it.pending_qty}
                          </span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Transport & Fleet Details */}
          <div className="p-4 rounded-xl border border-border bg-bg/40 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FaTruck className="text-primary" />
              <span>Transport & Vehicle Assignment</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-text-muted">Vehicle Number:</span>
                <p className="font-mono font-bold text-text-primary mt-0.5">
                  {transport.vehicle_number || "Unassigned"}
                </p>
              </div>
              <div>
                <span className="text-text-muted">Driver:</span>
                <p className="font-semibold text-text-primary mt-0.5">
                  {transport.driver_name || "TBD"}
                  {transport.driver_mobile && ` (${transport.driver_mobile})`}
                </p>
              </div>
              <div>
                <span className="text-text-muted">Transporter:</span>
                <p className="font-semibold text-text-primary mt-0.5">
                  {transport.transporter_name || "Direct Hire"}
                </p>
              </div>
              <div>
                <span className="text-text-muted">Dispatch Date:</span>
                <p className="text-text-primary mt-0.5 font-medium">
                  {transport.dispatch_date ? new Date(transport.dispatch_date).toLocaleDateString() : "Pending"}
                </p>
              </div>
              <div>
                <span className="text-text-muted">Expected Delivery:</span>
                <p className="text-text-primary mt-0.5 font-medium">
                  {transport.expected_delivery_date ? new Date(transport.expected_delivery_date).toLocaleDateString() : "TBD"}
                </p>
              </div>
              <div>
                <span className="text-text-muted">E-Way Bill:</span>
                <p className="font-mono text-text-primary mt-0.5">
                  {eway.eway_bill_number || "Not Attached"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Dual POD Status */}
          <div className="p-4 rounded-xl border border-border bg-bg/40 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FaCheckCircle className="text-emerald-500" />
              <span>Dual Proof of Delivery (POD)</span>
            </h4>
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-text-muted">OTP Verification:</span>
                <p className="font-bold text-text-primary mt-0.5">
                  {completion.otp_verified ? "Verified via 6-Digit OTP" : "Pending OTP"}
                </p>
              </div>
              <div>
                <span className="text-text-muted">Destination Drop Photo:</span>
                <p className="font-bold text-text-primary mt-0.5">
                  {completion.destination_photo ? "Photo Attached" : "Pending Photo"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border bg-bg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                navigate("/warehouse-management-panel/material-inward");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-bg border border-border hover:bg-border/30 text-text-primary transition-colors"
            >
              Inward Screen
            </button>
            <button
              onClick={() => {
                onClose();
                navigate("/warehouse-management-panel/bos-kit-assembly");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-bg border border-border hover:bg-border/30 text-text-primary transition-colors"
            >
              BOS Station
            </button>
            <button
              onClick={() => {
                onClose();
                navigate("/warehouse-management-panel/out-for-delivery");
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-bg border border-border hover:bg-border/30 text-text-primary transition-colors"
            >
              Dispatch Gate
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              navigate("/warehouse-management-panel/track-delivery");
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>Track Trip & POD</span>
            <FaArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

