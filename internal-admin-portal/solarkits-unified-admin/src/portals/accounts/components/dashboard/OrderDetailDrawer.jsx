import React from "react";
import {
  FaTimes,
  FaBoxes,
  FaCreditCard,
  FaTruck,
  FaFileInvoice,
  FaCheckCircle,
  FaCalendarAlt,
  FaUser,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaBuilding,
  FaExternalLinkAlt,
  FaExclamationTriangle,
  FaShieldAlt,
  FaArrowRight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ORDER_STATUS_CONFIG } from "./OrderStatusCards";

export default function OrderDetailDrawer({
  order,
  isOpen,
  onClose,
}) {
  const navigate = useNavigate();
  if (!isOpen || !order) return null;

  const currentStageIndex = ORDER_STATUS_CONFIG.findIndex(
    (s) => s.key === order.current_status
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-surface h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border/80 flex items-center justify-between bg-surface-hover/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-black text-primary">
                {order.order_number}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {order.order_source}
              </span>
              {(order.overdue_days || 0) > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                  +{order.overdue_days}d Overdue
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Order Date: {order.order_date?.slice(0, 10)} • Assigned Manager: {order.assigned_account}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Customer & Location Details */}
          <div className="p-4 rounded-xl border border-border/80 bg-surface space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <FaUser className="text-primary text-xs" />
              <span>Customer & Destination</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-muted text-[11px] block">Customer / Business:</span>
                <span className="font-bold text-text-primary block mt-0.5">
                  {order.customer_name}
                </span>
                <span className="text-text-secondary text-[11px] flex items-center gap-1 mt-0.5">
                  <FaPhoneAlt size={10} className="text-text-muted" />
                  <span>{order.customer_contact || "+91 98000 00000"}</span>
                </span>
              </div>

              <div>
                <span className="text-text-muted text-[11px] block">Fulfillment Warehouse & Destination:</span>
                <span className="font-bold text-text-primary block mt-0.5">
                  {order.location?.warehouse || "Coastal Andhra Hub"}
                </span>
                <span className="text-text-secondary text-[11px] flex items-center gap-1 mt-0.5">
                  <FaMapMarkerAlt size={10} className="text-text-muted" />
                  <span>{order.location?.city}, {order.location?.state}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 14-Stage Lifecycle Journey Tracker */}
          <div className="p-4 rounded-xl border border-border/80 bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <FaBoxes className="text-primary text-xs" />
                <span>14-Stage Order Lifecycle</span>
              </h4>
              <span className="text-[11px] font-bold text-primary">
                Stage {currentStageIndex >= 0 ? currentStageIndex + 1 : 1} of 14: {order.current_status}
              </span>
            </div>

            {/* Stages Timeline Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {ORDER_STATUS_CONFIG.map((st, idx) => {
                const isPassed = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;
                return (
                  <div
                    key={st.key}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold ${
                      isCurrent
                        ? "bg-primary text-white border-primary shadow-xs"
                        : isPassed
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-surface-hover text-text-muted border-border"
                    }`}
                  >
                    <span>{idx + 1}.</span>
                    <span>{st.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial & Payment Milestones */}
          <div className="p-4 rounded-xl border border-border/80 bg-surface space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <FaCreditCard className="text-primary text-xs" />
              <span>Commercial & Supplier Payment Milestones</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-surface-hover border border-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block">
                  Total Order Value
                </span>
                <span className="text-sm font-black font-mono text-text-primary mt-1 block">
                  ₹{order.order_value?.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-text-secondary mt-0.5 block">
                  Customer Status: {order.payment_status}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-hover border border-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block">
                  Admin Price Approval
                </span>
                <span className="text-sm font-black text-emerald-600 mt-1 block">
                  {order.admin_approval_status || "Approved"}
                </span>
                <span className="text-[10px] text-text-secondary mt-0.5 block">
                  Margin Verified
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-hover border border-border">
                <span className="text-[10px] text-text-muted uppercase font-bold block">
                  Bank Disbursement Status
                </span>
                <span className="text-sm font-black text-primary mt-1 block">
                  {order.actual_payment_status || "Disbursed"}
                </span>
                <span className="text-[10px] text-text-secondary mt-0.5 block">
                  Separated from Admin decision
                </span>
              </div>
            </div>

            {/* Quick jump to Payment module */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => navigate("/account-panel/payments")}
                className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 hover:underline"
              >
                <span>Manage Supplier Invoices & UTRs in Payments Module</span>
                <FaExternalLinkAlt size={10} />
              </button>
            </div>
          </div>

          {/* Kit & BOM Items Breakdown */}
          <div className="p-4 rounded-xl border border-border/80 bg-surface space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <FaFileInvoice className="text-primary text-xs" />
              <span>Kit Components & Bill of Materials (BOM)</span>
            </h4>

            <div className="text-xs">
              <div className="font-bold text-text-primary mb-2">
                Kit Configuration: {order.kit_type} (Quantity: {order.kit_quantity})
              </div>

              <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden">
                {(order.bom_items || []).map((item, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between bg-surface hover:bg-surface-hover/50">
                    <div>
                      <span className="font-semibold text-text-primary block">{item.name}</span>
                      <span className="text-[10px] text-text-muted font-mono">
                        Qty: {item.qty} units • Rate: ₹{item.rate?.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-text-primary text-xs">
                      ₹{((item.qty || 1) * (item.rate || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Supplier Production & Logistics */}
          <div className="p-4 rounded-xl border border-border/80 bg-surface space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <FaTruck className="text-primary text-xs" />
              <span>Production & Logistics Snapshot</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-muted text-[11px] block">Allocated Supplier:</span>
                <span className="font-bold text-text-primary block mt-0.5">
                  {order.supplier_name}
                </span>
                <span className="text-[11px] text-text-secondary mt-0.5 block">
                  Production Progress: {order.production_progress || 0}% ({order.production_status})
                </span>
              </div>

              <div>
                <span className="text-text-muted text-[11px] block">Delivery Fulfillment:</span>
                <span className="font-bold text-text-primary block mt-0.5">
                  {order.delivery_status}
                </span>
                <span className="text-[11px] text-text-secondary mt-0.5 block">
                  Next Step: {order.next_action}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-border/80 bg-surface flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/account-panel/procurement")}
            className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-1.5"
          >
            <span>Procurement Indent</span>
            <FaExternalLinkAlt size={10} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                navigate("/account-panel/payments");
              }}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>Manage Payments</span>
              <FaArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

