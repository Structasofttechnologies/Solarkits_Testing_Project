import { useState, useEffect, useCallback, Fragment } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '@/utils/axiosInstance';
import {
  FiCheckCircle,
  FiUploadCloud,
  FiClock,
  FiXCircle,
  FiCopy,
  FiCheck,
  FiShield,
  FiZap,
  FiLayers,
  FiPackage,
  FiUser,
  FiPhone,
  FiMail,
  FiExternalLink,
  FiBox,
  FiCalendar,
  FiUsers,
  FiPlus,
  FiAlertCircle,
  FiLoader,
  FiX,
  FiRefreshCw,
  FiEye,
  FiFileText,
  FiTrendingUp,
  FiLock,
  FiChevronDown,
  FiChevronRight,
  FiGrid,
  FiList,
  FiTruck,
  FiDollarSign,
  FiAlertTriangle,
} from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", icon: FiFileText },
  SUBMITTED: { label: "Submitted", bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: FiClock },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", icon: FiClock },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", icon: FiAlertCircle },
  APPROVED: { label: "Approved", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  REJECTED: { label: "Rejected", bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", icon: FiX },
  AWAITING_PAYMENT: { label: "Awaiting Payment", bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", icon: FaRupeeSign },
  PARTIALLY_PAID: { label: "Partially Paid", bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400", icon: FaRupeeSign },
  PAID: { label: "Paid", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  CONFIRMED: { label: "Confirmed", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  PROCESSING: { label: "Processing", bg: "bg-cyan-50 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", icon: FiRefreshCw },
  DISPATCHED: { label: "Dispatched", bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", icon: FiBox },
  DELIVERED: { label: "Delivered", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  COMPLETED: { label: "Completed", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: FiCheckCircle },
  EXPIRED: { label: "Expired", bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-600 dark:text-rose-400", icon: FiClock },
  REFUND_REQUESTED: { label: "Refund Requested", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", icon: FiClock },
  REFUND_APPROVED: { label: "Refund Approved", bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", icon: FiCheckCircle },
  REFUND_SETTLED: { label: "Refund Settled", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", icon: FaRupeeSign },
  REFUND_REJECTED: { label: "Refund Rejected", bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-600 dark:text-rose-400", icon: FiX },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400", icon: FiX },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
  const Icon = cfg.icon || FiClock;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-current/20 shadow-2xs whitespace-nowrap ${cfg.bg} ${cfg.text}`}>
      <Icon size={11} className="shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}

function PoStageStepper({ stepNumber }) {
  const steps = [
    { num: 1, label: "Booking" },
    { num: 2, label: "Token" },
    { num: 3, label: "Active" },
    { num: 4, label: "Fulfilled" },
  ];

  return (
    <div className="flex items-center gap-1 mt-1">
      {steps.map((s, idx) => {
        const isDone = stepNumber > s.num;
        const isCurrent = stepNumber === s.num;
        return (
          <Fragment key={s.num}>
            <div
              className={`flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black transition-all ${isDone
                ? "bg-emerald-500 text-white shadow-2xs"
                : isCurrent
                  ? "bg-primary text-white ring-2 ring-primary/25 scale-105"
                  : "bg-surface-hover text-text-muted border border-border"
                }`}
              title={`Stage ${s.num}: ${s.label}`}
            >
              {isDone ? <FiCheck size={9} /> : s.num}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-2 rounded-full transition-all ${stepNumber > s.num ? "bg-emerald-500" : "bg-border"
                  }`}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── PO Order Card Component for Direct EPC (11 Mandatory Fields) ─────────────
function EpcPoCardItem({ order, onSelectOrder, onOpenReorder, onOpenRefund }) {
  const item = order.items?.[0] || {};
  const booked = order.total_booked_quantity || order.total_quantity || item.quantity || 0;
  const fulfilled = order.fulfilled_quantity || 0;
  const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(0, booked - fulfilled);
  const progressPct = booked > 0 ? Math.min(100, Math.round((fulfilled / booked) * 100)) : 0;

  const tokenReqINR = Math.round((order.token_amount_paise || 0) / 100);
  const tokenPaidINR = Math.round((order.token_paid_paise || 0) / 100);
  const isTokenPaid = order.token_payment_status === "PAID" || (tokenPaidINR > 0 && tokenReqINR > 0 && tokenPaidINR >= tokenReqINR);
  const isTokenPartial = !isTokenPaid && tokenPaidINR > 0;
  const tokenAdjustedINR = Math.round((order.token_adjusted_total_paise || 0) / 100);
  const tokenBalanceINR = order.token_balance_paise != null
    ? Math.round(order.token_balance_paise / 100)
    : Math.max(0, tokenPaidINR - tokenAdjustedINR);

  const settlementMode = order.token_settlement_mode || order.penalty_rule_snapshot?.token_settlement_rule || "PRO_RATA";
  const expiryDate = order.lock_expires_at || order.expires_at;
  const isExpired = order.status === "EXPIRED" || (expiryDate && new Date(expiryDate).getTime() < Date.now());
  const daysLeft = expiryDate
    ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 30;
  const validityDays = order.po_settings_snapshot?.po_validity_days || order.po_settings_snapshot?.po_lock_days || 30;

  const penaltyPaise = order.applicable_penalty_paise || 0;
  const penaltyINR = Math.round(penaltyPaise / 100);

  // Refund Snapshot
  const refundReq = order.refund_request_snapshot;
  const hasRefundReq = Boolean(refundReq && refundReq.status);

  // Creator Attribution
  const isBdeCreated = order.created_by_role === "BDE";
  const creatorDisplay = isBdeCreated
    ? `BDE: ${order.creator_name || "Assigned BDE"}${order.creator_code ? ` (${order.creator_code})` : ""}`
    : "Solar EPC Direct";

  // Customer / Hub details
  const customerName = order.customer_details?.company_name || order.customer_details?.name || "Solar EPC Store";
  const customerLocation = [order.customer_details?.district, order.customer_details?.state].filter(Boolean).join(", ") || order.customer_details?.phone || "India";

  // Reorder & Refund eligibility
  const canReorder = remaining > 0 && !isExpired && !["CANCELLED", "REJECTED", "EXPIRED"].includes(order.status);
  const canRequestRefund = !hasRefundReq && tokenBalanceINR > 0 && (isExpired || remaining === 0);

  return (
    <div
      className="rounded-3xl border-2 p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/40 bg-surface border-border"
    >
      <div className="space-y-4">
        {/* Row 1: PO Number, Creator Badge & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-black text-sm text-text-primary px-2.5 py-1 rounded-xl bg-surface-hover border border-border">
              {order.po_number}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${isBdeCreated
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                }`}
            >
              {isBdeCreated ? <FiUsers size={11} /> : <FiShield size={11} />}
              {creatorDisplay}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <FiBox size={11} /> Direct EPC Quota
            </span>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Row 2: Customer / EPC Details & Created Date */}
        <div className="p-3 rounded-2xl bg-surface-hover/50 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              Partner / Customer Details
            </div>
            <div className="font-bold text-text-primary text-xs mt-0.5">{customerName}</div>
            <div className="text-[11px] text-text-muted">{customerLocation}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] font-black uppercase tracking-wider text-text-muted">
              Created Date
            </div>
            <div className="font-semibold text-text-secondary text-xs mt-0.5">
              {new Date(order.created_at || order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Row 3: Product Name & Committed Quantity */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-text-primary line-clamp-1">
              {item.item_name || "Solar Combo Kit Package"}
            </h3>
            <span className="text-xs font-black text-primary shrink-0 ml-2">
              {booked} Kits Committed
            </span>
          </div>
          {item.item_code && (
            <p className="text-[10px] font-mono text-text-muted mt-0.5">Code: {item.item_code}</p>
          )}
        </div>

        {/* Row 4: Purchased Qty vs Pending Qty Strip with Visual Progress Bar */}
        <div className="p-3.5 rounded-2xl border border-border bg-surface-hover space-y-2.5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                📦 Committed
              </div>
              <div className="text-sm font-black text-text-primary">{booked} Kits</div>
            </div>

            <div className="space-y-0.5 border-x border-border/60">
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                🚚 Purchased
              </div>
              <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                {fulfilled} ({progressPct}%)
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                🟢 Pending
              </div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {remaining} Kits
              </div>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-emerald-500"
              style={{ width: `${Math.min(100, Math.max(progressPct, 4))}%` }}
            />
          </div>
        </div>

        {/* Row 5: Token Paid & Amount Adjusted Strip */}
        <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
              <FaRupeeSign size={11} /> Token Escrow & Settlement
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white">
              {settlementMode === "PRO_RATA" ? "Pro-Rata Settlement" : settlementMode === "FINAL_ORDER" ? "Final Order Settlement" : "Upfront Settlement"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40 text-center">
            <div>
              <div className="text-[10px] text-text-muted">Token Paid</div>
              <div className="text-xs font-black text-text-primary">₹{tokenPaidINR.toLocaleString("en-IN")}</div>
            </div>
            <div className="border-x border-emerald-200/60 dark:border-emerald-800/40">
              <div className="text-[10px] text-text-muted">Adjusted</div>
              <div className="text-xs font-black text-blue-600">₹{tokenAdjustedINR.toLocaleString("en-IN")}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">In Escrow</div>
              <div className="text-xs font-black text-emerald-600">₹{tokenBalanceINR.toLocaleString("en-IN")}</div>
            </div>
          </div>
        </div>

        {/* Row 6: PO Validity, Expiry & Days Left */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-border bg-surface-hover/30">
            <div className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
              <FiCalendar size={11} /> Validity & Expiry
            </div>
            <div className="font-black text-text-primary text-xs mt-0.5">
              {validityDays} Days Validity
            </div>
            <div className="text-[10px] text-text-muted truncate">
              {expiryDate ? `Till ${new Date(expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Ongoing"}
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-border bg-surface-hover/30">
            <div className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
              <FiClock size={11} /> Remaining Days
            </div>
            <div className="mt-1">
              {isExpired ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  🔴 Lock Expired ({Math.abs(daysLeft)}d ago)
                </span>
              ) : daysLeft <= 5 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  🟠 Expiring Soon ({daysLeft}d left)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  🟢 Active ({daysLeft}d left)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 7: Applicable Penalty & Refund Eligibility & Status */}
        <div className="p-3 rounded-2xl border border-border/80 bg-surface-hover/40 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted font-bold flex items-center gap-1">
              <FiAlertCircle size={12} className="text-amber-500" /> Applicable Penalty:
            </span>
            <span className="font-mono font-black text-text-primary">
              {penaltyINR > 0 ? (
                <span className="text-rose-600">₹{penaltyINR.toLocaleString("en-IN")} (Applied)</span>
              ) : isExpired && remaining > 0 ? (
                <span className="text-amber-600">₹{Math.min(tokenBalanceINR, remaining * 500).toLocaleString("en-IN")} (Pending Settle)</span>
              ) : (
                <span className="text-text-muted">₹500 / kit on unpurchased</span>
              )}
            </span>
          </div>

          {isExpired && remaining > 0 && (
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-[10px] text-rose-700 dark:text-rose-300">
              ⚠️ <strong>PO Deadline Passed:</strong> You completed {fulfilled} of {booked} kits. A penalty of ₹{penaltyINR > 0 ? penaltyINR.toLocaleString("en-IN") : Math.min(tokenBalanceINR, remaining * 500).toLocaleString("en-IN")} has been charged for the {remaining} unfulfilled kits.
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
            <span className="text-text-muted font-bold flex items-center gap-1">
              <FiCheckCircle size={12} className="text-primary" /> Refund Status:
            </span>
            <span>
              {hasRefundReq ? (
                <StatusBadge status={`REFUND_${refundReq.status}`} />
              ) : isExpired || (remaining === 0 && tokenBalanceINR > 0) ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  🎁 Eligible for Refund
                </span>
              ) : (
                <span className="text-[10px] font-bold text-text-muted">
                  🔒 Locked in Escrow
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => onSelectOrder(order)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-border transition-all cursor-pointer"
        >
          View Full PO
        </button>

        <div className="flex items-center gap-2">
          {canRequestRefund && (
            <button
              onClick={() => onOpenRefund(order)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <FaRupeeSign size={12} />
              <span>Request Refund</span>
            </button>
          )}

          {canReorder && (
            <button
              onClick={() => onOpenReorder(order)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-primary text-white hover:opacity-90 transition-all shadow-md cursor-pointer transform active:scale-95"
            >
              <FiPlus size={14} />
              <span>⚡ Reorder Kits ({remaining} left)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EpcPoAllocations() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth_slice);

  // Tab State: "my_pos" vs "franchisee_allocations"
  const [activeTab, setActiveTab] = useState("my_pos");
  const [viewMode, setViewMode] = useState("table"); // 'table' by default for clean enterprise look
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Direct PO Orders State
  const [directOrders, setDirectOrders] = useState([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [selectedDirectOrder, setSelectedDirectOrder] = useState(null);

  // Reorder Modal State & 2-Step Journey
  const [reorderModal, setReorderModal] = useState(false);
  const [reorderOrder, setReorderOrder] = useState(null);
  const [reorderQty, setReorderQty] = useState(1);
  const [reorderUtr, setReorderUtr] = useState("");
  const [reorderBank, setReorderBank] = useState("");
  const [reorderDate, setReorderDate] = useState(new Date().toISOString().slice(0, 10));
  const [reorderSlipFile, setReorderSlipFile] = useState(null);
  const [reorderSlipPreview, setReorderSlipPreview] = useState(null);
  const [reorderSubmitting, setReorderSubmitting] = useState(false);
  const [reorderError, setReorderError] = useState("");
  const [reorderSuccess, setReorderSuccess] = useState(null);

  // Step 1: Delivery Fulfillment & Site Address
  const [reorderFulfillmentMode, setReorderFulfillmentMode] = useState("direct_site"); // 'direct_site' | 'epc_warehouse'
  const [reorderAddress, setReorderAddress] = useState({
    line: "",
    pincode: "",
    district_name: "",
    state_name: "",
    contact_name: "",
    contact_phone: "",
  });

  // Step 2: Payment Milestones & State-wise Online/Offline Option
  const [reorderPayFull, setReorderPayFull] = useState(false); // false = 30% Advance, true = 100% Full Order
  const [reorderPaymentMethod, setReorderPaymentMethod] = useState("offline"); // 'offline' | 'online'
  const [reorderEffectiveMode, setReorderEffectiveMode] = useState("offline"); // 'offline' | 'online' | 'both'
  const [reorderLoadingConfig, setReorderLoadingConfig] = useState(false);

  // Refund Modal State
  const [refundModal, setRefundModal] = useState(false);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundPreview, setRefundPreview] = useState(null);
  const [refundForm, setRefundForm] = useState({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    notes: ""
  });
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundSuccess, setRefundSuccess] = useState(null);

  // Franchisee Allocations State (Legacy)
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [iciciVanDetails, setIciciVanDetails] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [activeUploadOrderId, setActiveUploadOrderId] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [manualUtr, setManualUtr] = useState("");
  const [uploading, setUploading] = useState(false);

  // Escrow Token Deposit State for EPC
  const [tokenModal, setTokenModal] = useState(false);
  const [tokenOrder, setTokenOrder] = useState(null);
  const [tokenAlloc, setTokenAlloc] = useState(null);
  const [tokenAmountINR, setTokenAmountINR] = useState(50000);
  const [tokenUtr, setTokenUtr] = useState("");
  const [tokenBank, setTokenBank] = useState("");
  const [tokenDate, setTokenDate] = useState(new Date().toISOString().slice(0, 10));
  const [tokenReceiptFile, setTokenReceiptFile] = useState(null);
  const [tokenSubmitting, setTokenSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [tokenSuccess, setTokenSuccess] = useState(false);

  
  // ── PO Order Contract Signing & Mobile OTP State ──
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractOrder, setContractOrder] = useState(null);
  const [contractAlloc, setContractAlloc] = useState(null);
  const [contractDetails, setContractDetails] = useState(null);
  const [contractSignerName, setContractSignerName] = useState("");
  const [contractSignerDesignation, setContractSignerDesignation] = useState("Authorized Signatory");
  const [contractAgreed, setContractAgreed] = useState(false);
  const [contractStep, setContractStep] = useState("review"); // 'review' | 'otp' | 'signed'
  const [contractOtp, setContractOtp] = useState("");
  const [contractOtpSending, setContractOtpSending] = useState(false);
  const [contractOtpVerifying, setContractOtpVerifying] = useState(false);
  const [contractOtpCountdown, setContractOtpCountdown] = useState(0);
  const [contractMaskedMobile, setContractMaskedMobile] = useState("");
  const [contractError, setContractError] = useState("");

  // View Signed Document Modal State
  const [viewSignedModalOpen, setViewSignedModalOpen] = useState(false);
  const [viewSignedData, setViewSignedData] = useState(null);
  const [viewSignedLoading, setViewSignedLoading] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (contractOtpCountdown > 0) {
      timer = setInterval(() => setContractOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [contractOtpCountdown]);

  const handleOpenContractModal = async (order, epcAlloc, item) => {
    setContractOrder(order);
    setContractAlloc(epcAlloc);
    setContractLoading(true);
    setContractError("");
    setContractStep("review");
    setContractOtp("");
    setContractAgreed(false);
    setContractModalOpen(true);

    try {
      const res = await axiosInstance.get(`/india/v1/shop/po-allocations/${order._id}/contract`);
      if (res.data?.status === "success" && res.data.data) {
        setContractDetails(res.data.data);
        setContractSignerName(res.data.data.signer_name || res.data.data.epc?.name || "");
        setContractSignerDesignation(res.data.data.signer_designation || "Authorized Signatory");
        setContractMaskedMobile(res.data.data.epc?.masked_mobile || "");
      }
    } catch (err) {
      console.error("Failed to fetch contract details:", err);
      setContractError(err.response?.data?.message || "Failed to load contract terms. Please try again.");
    } finally {
      setContractLoading(false);
    }
  };

  const handleSendContractOtp = async () => {
    if (!contractSignerName.trim()) {
      setContractError("Please enter the full legal name of the Authorized Signatory.");
      return;
    }
    if (!contractAgreed) {
      setContractError("You must read and agree to all terms and conditions of this PO contract.");
      return;
    }

    setContractError("");
    setContractOtpSending(true);
    try {
      const res = await axiosInstance.post(
        `/india/v1/shop/po-allocations/${contractOrder._id}/send-contract-otp`,
        { signer_name: contractSignerName, signer_designation: contractSignerDesignation }
      );
      if (res.data?.status === "success") {
        setContractMaskedMobile(res.data.masked_mobile || contractMaskedMobile);
        setContractStep("otp");
        setContractOtpCountdown(60);
        toast.success(res.data.message || "OTP sent to your registered mobile number!");
      } else {
        setContractError(res.data?.message || "Failed to send OTP.");
      }
    } catch (err) {
      console.error("send_epc_contract_otp error:", err);
      setContractError(err.response?.data?.message || "Failed to dispatch OTP. Please check mobile connection.");
    } finally {
      setContractOtpSending(false);
    }
  };

  const handleVerifyContractOtp = async (e) => {
    e.preventDefault();
    if (!contractOtp.trim() || contractOtp.trim().length < 4) {
      setContractError("Please enter the complete OTP code sent to your registered mobile.");
      return;
    }

    setContractError("");
    setContractOtpVerifying(true);
    try {
      const res = await axiosInstance.post(
        `/india/v1/shop/po-allocations/${contractOrder._id}/verify-contract-otp`,
        {
          otp: contractOtp.trim(),
          signer_name: contractSignerName,
          signer_designation: contractSignerDesignation,
        }
      );
      if (res.data?.status === "success") {
        setContractStep("signed");
        toast.success("PO Contract Digitally Signed & Verified via Mobile OTP!");
        // Refresh orders list
        if (typeof fetchOrders === "function") fetchOrders();
      } else {
        setContractError(res.data?.message || "Invalid OTP code.");
      }
    } catch (err) {
      console.error("verify_epc_contract_otp error:", err);
      setContractError(err.response?.data?.message || "OTP verification failed. Please try again.");
    } finally {
      setContractOtpVerifying(false);
    }
  };

  const handleViewSignedContract = async (order, epcAlloc) => {
    setViewSignedLoading(true);
    setViewSignedModalOpen(true);
    try {
      const res = await axiosInstance.get(`/india/v1/shop/po-allocations/${order._id}/signed-contract`);
      if (res.data?.status === "success") {
        setViewSignedData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load signed contract document:", err);
      toast.error("Failed to fetch signed document");
    } finally {
      setViewSignedLoading(false);
    }
  };

const handleOpenTokenModal = (order, epcAlloc, item) => {
    setTokenOrder(order);
    setTokenAlloc(epcAlloc);
    const reqPaise = epcAlloc?.token_amount_paise || order.token_amount_paise || 5000000;
    setTokenAmountINR(Math.round(reqPaise / 100));
    setTokenUtr("");
    setTokenBank("");
    setTokenDate(new Date().toISOString().slice(0, 10));
    setTokenReceiptFile(null);
    setTokenError("");
    setTokenSuccess(false);
    setTokenModal(true);
  };

  const handleSubmitTokenPayment = async (e) => {
    e.preventDefault();
    setTokenError("");
    if (!tokenUtr.trim()) {
      setTokenError("Please enter your Bank UTR / Payment Transaction reference number.");
      return;
    }

    setTokenSubmitting(true);
    try {
      let receiptUrl = null;
      if (tokenReceiptFile) {
        const formData = new FormData();
        formData.append("files", tokenReceiptFile);
        formData.append("utr_number", tokenUtr.trim().toUpperCase());
        try {
          const uploadRes = await axiosInstance.post(
            `/india/v1/shop/po-allocations/${tokenOrder._id}/upload-receipt`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          if (uploadRes.data?.data?.url) {
            receiptUrl = uploadRes.data.data.url;
          }
        } catch (uploadErr) {
          console.warn("Receipt file upload error:", uploadErr);
        }
      }

      const payload = {
        utr_number: tokenUtr.trim().toUpperCase(),
        amount_paid: Number(tokenAmountINR),
        sender_bank_name: tokenBank.trim() || "Bank Transfer",
        payment_date: tokenDate,
        payment_receipt_url: receiptUrl,
      };

      const res = await axiosInstance.post(
        `/india/v1/shop/po-allocations/${tokenOrder._id}/pay-token`,
        payload
      );

      if (res.data?.success || res.data?.status === "success") {
        setTokenSuccess(true);
        toast.success("Token deposit recorded! Purchase Order is now officially STARTED ✓", { duration: 6000 });
        fetchAllocations();
        fetchDirectOrders();
      } else {
        setTokenError(res.data?.message || "Failed to record token payment.");
      }
    } catch (err) {
      setTokenError(err.response?.data?.message || "Failed to record token payment.");
    } finally {
      setTokenSubmitting(false);
    }
  };

  // Escrow Bank Info
  const escrowBank = {
    account_name: "SolarKits Technologies Pvt Ltd (Escrow Account)",
    bank_name: "ICICI Bank Corporate Banking",
    account_number: "000205018899",
    ifsc_code: "ICIC0000002",
    branch: "Bandra Kurla Complex, Mumbai",
    upi_id: "solarkits.token@icici",
  };

  const handleCopyText = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedField(""), 2500);
  };

  // Fetch Direct PO Orders
  const fetchDirectOrders = useCallback(async () => {
    setDirectLoading(true);
    try {
      const res = await axiosInstance.get("/india/v1/shop/po/my-orders");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDirectOrders(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load direct PO orders:", err);
    } finally {
      setDirectLoading(false);
    }
  }, []);

  // Fetch Franchisee Allocations
  const fetchAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/india/v1/shop/po-allocations");
      if (res.data?.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load PO allocations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectOrders();
    fetchAllocations();
  }, [fetchDirectOrders, fetchAllocations]);

  // ICICI Virtual Account Stream
  useEffect(() => {
    const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const baseUrl = rawApiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    const userPhone = user?.whatsapp || user?.registered_whatsapp || user?.mobile || "9876543210";

    fetch(`${baseUrl}/api/v1/payments/icici/van-details?phone=${userPhone}`)
      .then((res) => res.json())
      .then((d) => {
        if (d?.success) setIciciVanDetails(d.data);
      })
      .catch((err) => console.warn("Could not load ICICI VAN details:", err));

    const epcId = user?._id || user?.id || user?.account_id;
    const streamUrl = `${baseUrl}/api/v1/payments/icici/stream?role=epc&epc_id=${epcId || ""}`;
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ICICI_PAYMENT_CREDITED") {
          toast.success(
            `Payment of ${data.amountFormatted || "₹" + data.amount} confirmed via ICICI UTR: ${data.utr}!`,
            { duration: 7000 }
          );
          fetchAllocations();
          fetchDirectOrders();
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => es.close();
  }, [user, fetchAllocations, fetchDirectOrders]);

  // Manual Receipt Upload Handler (Franchisee Allocations)
  const handleUpload = async (poId) => {
    if (!receiptFile) {
      toast.error("Please select a receipt file to upload");
      return;
    }
    const formData = new FormData();
    formData.append("files", receiptFile);
    if (manualUtr) formData.append("utr_number", manualUtr);

    setUploading(true);
    try {
      const res = await axiosInstance.post(`/india/v1/shop/po-allocations/${poId}/upload-receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        toast.success("Receipt submitted successfully for verification");
        setReceiptFile(null);
        setManualUtr("");
        setActiveUploadOrderId(null);
        fetchAllocations();
      } else {
        toast.error(res.data?.message || "Failed to upload receipt");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  };

  // Reorder from Direct PO Handlers
  const handleOpenReorderModal = (order) => {
    setReorderOrder(order);
    const booked = order.total_booked_quantity || order.total_quantity || order.items?.[0]?.quantity || 1;
    const fulfilled = order.fulfilled_quantity || 0;
    const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(1, booked - fulfilled);

    const it = order.items?.[0] || {};
    const configuredLoose = (Array.isArray(it.loose_order_quantities) && it.loose_order_quantities.length > 0)
      ? it.loose_order_quantities
      : (Array.isArray(order.loose_order_quantities) && order.loose_order_quantities.length > 0)
        ? order.loose_order_quantities
        : [5, 10, 15, 20, 25, 30];

    const firstValid = configuredLoose.find((q) => q <= remaining) || Math.min(configuredLoose[0] || 5, remaining);
    setReorderQty(firstValid || Math.min(1, remaining));
    setReorderUtr("");
    setReorderBank("");
    setReorderDate(new Date().toISOString().slice(0, 10));
    setReorderSlipFile(null);
    setReorderSlipPreview(null);
    setReorderError("");
    setReorderSuccess(null);
    setReorderPayFull(false);
    setReorderFulfillmentMode(order.fulfillment_mode || "direct_site");

    // Pre-populate Delivery Site Address from previous order or logged-in EPC profile
    const defaultAddr = order.delivery_address || order.customer_address || order.billing_address || {};
    const initialAddress = {
      line: defaultAddr.line || defaultAddr.address_line || defaultAddr.street || user?.address || "",
      pincode: defaultAddr.pincode || defaultAddr.pin_code || user?.pincode || "",
      district_name: defaultAddr.district_name || defaultAddr.district || defaultAddr.city || user?.district || user?.city || "",
      state_name: defaultAddr.state_name || defaultAddr.state || user?.state || "Gujarat",
      contact_name: defaultAddr.contact_name || user?.name || user?.fullName || user?.contact_person || order.buyer_name || "",
      contact_phone: defaultAddr.contact_phone || user?.whatsapp || user?.phone || user?.mobile || order.buyer_phone || "",
    };
    setReorderAddress(initialAddress);

    // Resolve Region Payment Configuration for online payment support
    const distName = initialAddress.district_name;
    const stName = initialAddress.state_name;
    setReorderLoadingConfig(true);
    axiosInstance
      .get(`/payment-config/resolve?order_type=fpo_order${distName ? `&district_name=${encodeURIComponent(distName)}` : ""}${stName ? `&state_name=${encodeURIComponent(stName)}` : ""}`)
      .then((res) => {
        const cfg = res.data?.config;
        if (cfg) {
          const mode = cfg.payment_mode || "offline";
          setReorderEffectiveMode(mode);
          setReorderPaymentMethod(mode === "online" ? "online" : "offline");
        } else {
          setReorderEffectiveMode("offline");
          setReorderPaymentMethod("offline");
        }
      })
      .catch(() => {
        setReorderEffectiveMode("offline");
        setReorderPaymentMethod("offline");
      })
      .finally(() => {
        setReorderLoadingConfig(false);
      });

    setReorderModal(true);
  };

  const handleSubmitReorder = async (e) => {
    e.preventDefault();
    setReorderError("");

    // Validate Step 1 Delivery Site Address
    if (!reorderAddress.line.trim()) {
      setReorderError("Please enter the Site Street Address / Plot / Industrial Area.");
      return;
    }
    if (!reorderAddress.pincode.trim() || reorderAddress.pincode.trim().length < 6) {
      setReorderError("Please enter a valid 6-digit Delivery PIN Code.");
      return;
    }
    if (!reorderAddress.contact_phone.trim()) {
      setReorderError("Please enter the Site Contact Phone / WhatsApp number.");
      return;
    }

    // Validate Step 2 Payment Verification (for offline transfer)
    if (reorderPaymentMethod !== "online" && !reorderUtr.trim()) {
      setReorderError("Please enter the UTR / Payment Transaction reference number.");
      return;
    }

    const item = reorderOrder?.items?.[0] || {};
    // GUARANTEED PRICE LOCK: rate is strictly anchored to parent PO snapshot
    const unitPriceINR = (item.unit_price_paise || 0) / 100;
    const gstRate = item.gst_rate || 13.85;
    const subtotal = reorderQty * unitPriceINR;
    const grossTotal = Math.round(subtotal + subtotal * (gstRate / 100));

    const totalCommitted = Number(reorderOrder?.total_booked_quantity || item.quantity || 100);
    const totalToken = Math.round((reorderOrder?.token_amount_paise || reorderOrder?.token_paid_paise || 0) / 100);
    const adjustedSoFar = Math.round((reorderOrder?.token_adjusted_total_paise || 0) / 100);
    const availableToken = Math.max(0, totalToken - adjustedSoFar);
    const settlementMode = reorderOrder?.token_settlement_mode || reorderOrder?.penalty_rule_snapshot?.token_settlement_rule || "PRO_RATA";
    const currentRemaining = reorderOrder?.remaining_quantity != null ? reorderOrder.remaining_quantity : totalCommitted;

    let tokenAdjusted = 0;
    if (reorderQty === currentRemaining) {
      tokenAdjusted = Math.min(availableToken, grossTotal);
    } else if (settlementMode === "PRO_RATA") {
      const perKit = totalCommitted > 0 ? Math.floor(totalToken / totalCommitted) : 0;
      tokenAdjusted = Math.min(availableToken, reorderQty * perKit, grossTotal);
    } else if (settlementMode === "UPFRONT") {
      tokenAdjusted = Math.min(availableToken, grossTotal);
    }

    const netPayable = Math.max(0, grossTotal - tokenAdjusted);
    const advanceAmount = Math.round(netPayable * 0.30);
    const remainingAmount = Math.max(0, netPayable - advanceAmount);
    const amountDueToday = reorderPayFull ? netPayable : advanceAmount;

    setReorderSubmitting(true);
    try {
      let uploadedReceiptUrl = "";
      if (reorderSlipFile) {
        try {
          const formData = new FormData();
          formData.append("receipt", reorderSlipFile);
          const upRes = await axiosInstance.post("/india/v1/shop/po/upload-receipt", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          if (upRes.data?.success && upRes.data?.data?.receipt_url) {
            uploadedReceiptUrl = upRes.data.data.receipt_url;
          }
        } catch (upErr) {
          console.error("Receipt upload failed:", upErr);
        }
      }

      const isOnline = reorderPaymentMethod === "online";
      const payload = {
        quantity: reorderQty,
        kit_id: item.kit_id || item.product_id,
        fulfillment_mode: reorderFulfillmentMode,
        delivery_address: {
          line: reorderAddress.line.trim(),
          pincode: reorderAddress.pincode.trim(),
          district_name: reorderAddress.district_name.trim(),
          state_name: reorderAddress.state_name.trim(),
          contact_name: reorderAddress.contact_name.trim(),
          contact_phone: reorderAddress.contact_phone.trim(),
        },
        pay_full_amount: reorderPayFull,
        is_online_order: isOnline,
        payment_method: isOnline ? "icici_ecollection" : "offline_bank_transfer",
        offline_payment: {
          payment_method: isOnline ? "icici_ecollection" : "offline_bank_transfer",
          utr_number: isOnline ? ("VAN-ONLINE-" + Date.now()) : reorderUtr.trim().toUpperCase(),
          amount_paid: amountDueToday,
          payment_date: reorderDate,
          sender_bank_name: reorderBank || (isOnline ? "ICICI Virtual Account" : "Bank Transfer"),
          receipt_url: uploadedReceiptUrl,
          payment_receipt_url: uploadedReceiptUrl,
        },
        receipt_url: uploadedReceiptUrl,
        payment_receipt_url: uploadedReceiptUrl,
      };

      const res = await axiosInstance.post(`/india/v1/shop/po/${reorderOrder._id}/reorder`, payload);
      if (res.data?.success) {
        setReorderSuccess({
          orderNumber: res.data.data?.order?.po_number,
          adjusted: res.data.data?.token_adjustment?.token_adjusted_inr || tokenAdjusted,
          payable: res.data.data?.token_adjustment?.net_payable_inr || netPayable,
          paidToday: amountDueToday,
          isFull: reorderPayFull,
          isOnline: isOnline
        });
        fetchDirectOrders();
        fetchAllocations();
      } else {
        setReorderError(res.data?.message || "Failed to create repeat order.");
      }
    } catch (err) {
      setReorderError(err.response?.data?.message || "Failed to create repeat order.");
    } finally {
      setReorderSubmitting(false);
    }
  };

  // Refund Request Handlers
  const handleOpenRefundModal = async (order) => {
    setRefundOrder(order);
    setRefundError("");
    setRefundSuccess(null);
    setRefundForm({
      account_holder_name: order.customer_details?.name || order.customer_details?.company_name || "",
      bank_name: "",
      account_number: "",
      confirm_account_number: "",
      ifsc_code: "",
      notes: "PO quota completion / validity settlement",
    });
    setRefundModal(true);
    setRefundLoading(true);

    try {
      const res = await axiosInstance.get(`/india/v1/shop/po/${order._id}/penalty-preview`);
      if (res.data?.success) {
        setRefundPreview(res.data.data);
      } else {
        setRefundError(res.data?.message || "Unable to load penalty preview.");
      }
    } catch (err) {
      setRefundError(err.response?.data?.message || "Unable to load penalty preview.");
    } finally {
      setRefundLoading(false);
    }
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    setRefundError("");

    if (!refundForm.account_number.trim()) {
      setRefundError("Please enter your bank account number.");
      return;
    }
    if (refundForm.account_number.trim() !== refundForm.confirm_account_number.trim()) {
      setRefundError("Account number and confirmation do not match.");
      return;
    }
    if (!refundForm.ifsc_code.trim()) {
      setRefundError("Please enter your bank IFSC code.");
      return;
    }

    setRefundSubmitting(true);
    try {
      const payload = {
        bank_details: {
          account_holder_name: refundForm.account_holder_name.trim(),
          bank_name: refundForm.bank_name.trim(),
          account_number: refundForm.account_number.trim(),
          ifsc_code: refundForm.ifsc_code.trim().toUpperCase(),
        },
        reason: refundForm.notes.trim(),
      };

      const res = await axiosInstance.post(`/india/v1/shop/po/${refundOrder._id}/request-refund`, payload);
      if (res.data?.success) {
        setRefundSuccess("Refund request submitted successfully! Accounts team will review and process payout.");
        fetchDirectOrders();
      } else {
        setRefundError(res.data?.message || "Failed to submit refund request.");
      }
    } catch (err) {
      setRefundError(err.response?.data?.message || "Failed to submit refund request.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  // Franchisee Allocation Status Badge Helper
  const AllocationStatusBadge = ({ status, utr, poStatus }) => {
    if (status === "VERIFIED" || status === "PAID" || poStatus === "PO_STARTED" || poStatus === "VALIDATED") {
      return (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/30 shadow-xs">
            <FiCheckCircle className="mr-1 text-emerald-600" />
            TOKEN PAID & PO STARTED ✓
          </span>
          {utr && (
            <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              UTR: {utr}
            </span>
          )}
        </div>
      );
    }
    if (status === "RECEIPT_SUBMITTED") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-500/30 shadow-xs">
          <FiUploadCloud className="mr-1 text-blue-600" />
          RECEIPT SUBMITTED (VERIFICATION PENDING)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-500/30 shadow-xs animate-pulse">
        <FiClock className="mr-1 text-amber-600" />
        TOKEN DEPOSIT PENDING (PO NOT STARTED)
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header Banner */}
      <div
        className="relative rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)" }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-white/20 backdrop-blur-md border border-white/20 text-white">
                <FiShield size={12} /> Solar EPC Purchase Orders & Quotas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Purchase Orders & Token Escrow Lifecycle
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl">
              Lock bulk kit quotas with guaranteed pricing, draw repeat orders against your PO balance, and manage token settlement, penalty calculation, and escrow refunds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchDirectOrders();
                fetchAllocations();
              }}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Refresh All PO Data"
            >
              <FiRefreshCw size={17} className={directLoading || loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface border border-border shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("my_pos")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === "my_pos"
            ? "bg-primary text-white shadow-sm"
            : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }`}
        >
          <FiBox size={14} />
          <span>My Purchase Orders & Quotas</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">{directOrders.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("franchisee_allocations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === "franchisee_allocations"
            ? "bg-primary text-white shadow-sm"
            : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }`}
        >
          <FiUsers size={14} />
          <span>Franchise Partner Pooled Allocations</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">{orders.length}</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: DIRECT PURCHASE ORDERS & ESCROW QUOTAS                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "my_pos" && (
        <div className="space-y-4">
          {/* Action & View Mode Switcher Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold text-text-secondary">
              Showing <span className="text-text-primary font-black">{directOrders.length}</span> Purchase Order Quotas
            </div>

            <div className="flex items-center gap-1 p-1 bg-surface-hover rounded-xl border border-border">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "table" ? "bg-surface text-primary shadow-2xs font-bold" : "text-text-muted hover:text-text-primary"
                  }`}
                title="Table View (Full Width)"
              >
                <FiList size={15} />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "card" ? "bg-surface text-primary shadow-2xs font-bold" : "text-text-muted hover:text-text-primary"
                  }`}
                title="Card View"
              >
                <FiGrid size={15} />
              </button>
            </div>
          </div>

          {directLoading && directOrders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border bg-surface space-y-3">
              <FiLoader size={28} className="animate-spin text-primary mx-auto" />
              <p className="text-xs text-text-muted font-bold">Loading Purchase Orders...</p>
            </div>
          ) : directOrders.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-surface flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <FiPackage size={26} />
              </div>
              <h3 className="text-base font-bold text-text-primary">No Direct Purchase Orders Found</h3>
              <p className="text-xs text-text-muted max-w-sm">
                You do not have any active purchase orders booked directly. Book kits or coordinate with your Franchisee/BDE partner to initialize your quota.
              </p>
            </div>
          ) : viewMode === "table" ? (
            <div
              className="rounded-2xl border shadow-xs bg-surface transition-all overflow-hidden w-full no-scrollbar"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="w-full overflow-hidden no-scrollbar">
                <table className="w-full text-left text-xs border-collapse table-auto">
                  <thead>
                    <tr
                      className="border-b text-[10px] font-bold uppercase tracking-wider text-text-muted select-none"
                      style={{ background: "var(--color-surface-hover, #f8fafc)", borderColor: "var(--color-border)" }}
                    >
                      <th className="py-3 px-2.5 font-bold">PO# & Creator</th>
                      <th className="py-3 px-2.5 font-bold">Partner / Store</th>
                      <th className="py-3 px-2.5 font-bold">Configured ComboKit</th>
                      <th className="py-3 px-2.5 font-bold">Stage & Status</th>
                      <th className="py-3 px-2.5 font-bold">Quota & Progress</th>
                      <th className="py-3 px-2.5 font-bold">Token & Escrow</th>
                      <th className="py-3 px-2.5 font-bold">Rate Lock</th>
                      <th className="py-3 px-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {directOrders.filter((o) => !o.parent_po_id).map((order) => {
                      const item = order.items?.[0] || {};
                      const booked = order.total_booked_quantity || order.total_quantity || item.quantity || 0;
                      const fulfilled = order.fulfilled_quantity || 0;
                      const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(0, booked - fulfilled);
                      const progressPct = booked > 0 ? Math.min(100, Math.round((fulfilled / booked) * 100)) : 0;

                      const tokenReqINR = Math.round((order.token_amount_paise || 0) / 100);
                      const tokenPaidINR = Math.round((order.token_paid_paise || 0) / 100);
                      const isTokenPaid = order.token_payment_status === "PAID" || (tokenPaidINR > 0 && tokenReqINR > 0 && tokenPaidINR >= tokenReqINR);
                      const isTokenPartial = !isTokenPaid && tokenPaidINR > 0;
                      const tokenAdjustedINR = Math.round((order.token_adjusted_total_paise || 0) / 100);
                      const tokenBalanceINR = order.token_balance_paise != null
                        ? Math.round(order.token_balance_paise / 100)
                        : Math.max(0, tokenPaidINR - tokenAdjustedINR);

                      const expiryDate = order.lock_expires_at || order.expires_at;
                      const isExpired = order.status === "EXPIRED" || (expiryDate && new Date(expiryDate).getTime() < Date.now());
                      const daysLeft = expiryDate
                        ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : 30;

                      const isBdeCreated = order.created_by_role === "BDE";
                      const isExpanded = expandedRowId === order._id;

                      const isValidated = ["VALIDATED", "APPROVED", "CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(order.status);
                      const isPoStarted = order.status === "PO_STARTED";
                      const isAwaitingToken = order.status === "AWAITING_TOKEN_PAYMENT";

                      let stepNumber = 1;
                      if (isValidated) stepNumber = 4;
                      else if (isPoStarted) stepNumber = 3;
                      else if (isAwaitingToken) stepNumber = 2;

                      const customerName = order.customer_details?.company_name || order.customer_details?.name || "Direct EPC Store";
                      const customerLocation = [order.customer_details?.district, order.customer_details?.state].filter(Boolean).join(", ") || "India";

                      const canReorder = remaining > 0 && !isExpired && !["CANCELLED", "REJECTED", "EXPIRED"].includes(order.status);
                      const refundReq = order.refund_request_snapshot;
                      const hasRefundReq = Boolean(refundReq && refundReq.status);
                      const canRequestRefund = !hasRefundReq && tokenBalanceINR > 0 && (isExpired || remaining === 0);

                      return (
                        <Fragment key={order._id}>
                          <tr className={`transition-colors duration-150 ${isExpanded ? "bg-surface-hover/80" : "hover:bg-surface-hover/50"}`}>
                            {/* 1. PO# & Creator */}
                            <td className="py-3 px-2.5 align-middle">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-text-primary text-[11px] tracking-tight bg-surface-hover px-1.5 py-0.5 rounded border border-border select-all whitespace-nowrap">
                                    {order.po_number}
                                  </span>
                                  <button
                                    onClick={() => handleCopyText(order.po_number, `po-${order._id}`)}
                                    className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-surface-hover transition-colors cursor-pointer"
                                    title="Copy PO Number"
                                  >
                                    {copiedField === `po-${order._id}` ? (
                                      <FiCheck size={11} className="text-emerald-500" />
                                    ) : (
                                      <FiCopy size={11} />
                                    )}
                                  </button>
                                </div>
                                <div className="text-[10px] text-text-muted">
                                  {new Date(order.created_at || order.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                                <div>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${isBdeCreated
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                      : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                      }`}
                                  >
                                    {isBdeCreated ? `BDE: ${order.creator_name || "Officer"}` : "Direct EPC"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Partner / Store */}
                            <td className="py-3 px-2.5 align-middle">
                              <div className="flex flex-col max-w-[130px]">
                                <div className="font-bold text-text-primary text-[11px] truncate leading-tight" title={customerName}>
                                  {customerName}
                                </div>
                                <div className="text-[10px] text-text-muted truncate">
                                  {customerLocation}
                                </div>
                              </div>
                            </td>

                            {/* 3. Configured ComboKit */}
                            <td className="py-3 px-2.5 align-middle">
                              <div className="flex flex-col gap-0.5 max-w-[140px]">
                                <div className="font-bold text-text-primary text-[11px] truncate leading-tight" title={item.item_name || "Solar ComboKit"}>
                                  {item.item_name || "Solar ComboKit"}
                                </div>
                                <div className="flex items-center gap-1">
                                  {item.unit_price_paise && (
                                    <span className="font-mono font-bold text-[10px] text-text-secondary">
                                      ₹{Math.round((item.unit_price_paise || 0) / 100).toLocaleString("en-IN")}
                                      <span className="text-[9px] text-text-muted font-sans ml-0.5">/kit</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 4. Stage & Status */}
                            <td className="py-3 px-2.5 align-middle">
                              <div className="flex flex-col gap-1">
                                <StatusBadge status={order.status} />
                                <PoStageStepper stepNumber={stepNumber} />
                              </div>
                            </td>

                            {/* 5. Quota & Progress */}
                            <td className="py-3 px-2.5 align-middle">
                              <div className="flex flex-col gap-1 min-w-[100px] max-w-[130px]">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-text-primary">{booked} Kits</span>
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                    {remaining} Left
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden border border-border/80">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <div className="text-[9px] text-text-muted flex items-center justify-between">
                                  <span>{fulfilled} Fulfilled</span>
                                  <span className="font-bold text-text-secondary">{progressPct}%</span>
                                </div>
                              </div>
                            </td>

                            {/* 6. Token Escrow */}
                            <td className="py-3 px-2.5 align-middle">
                              <div className="flex flex-col gap-0.5 min-w-[90px]">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-text-primary text-[11px]">
                                    ₹{tokenReqINR.toLocaleString("en-IN")}
                                  </span>
                                  {isTokenPaid ? (
                                    <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded border border-emerald-200/60">
                                      Paid
                                    </span>
                                  ) : isTokenPartial ? (
                                    <span className="text-[8px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-1 rounded border border-teal-200/60">
                                      Partial
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 rounded border border-amber-200/60">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-text-muted">
                                  Bal: <span className="font-mono font-medium text-text-secondary">₹{tokenBalanceINR.toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                            </td>

                            {/* 7. Rate Lock */}
                            <td className="py-3 px-2.5 align-middle">
                              <div className="flex flex-col min-w-[65px]">
                                {isExpired ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400">
                                    Expired
                                  </span>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <FiLock size={10} className={daysLeft <= 15 ? "text-amber-500" : "text-text-muted"} />
                                      <span className={`text-[11px] font-bold ${daysLeft <= 15 ? "text-amber-600 dark:text-amber-400" : "text-text-primary"}`}>
                                        {daysLeft}d
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-text-muted">Price Lock</div>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* 8. Actions */}
                            <td className="py-3 px-2.5 align-middle text-right">
                              <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                                {canReorder && (
                                  <button
                                    onClick={() => handleOpenReorderModal(order)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary hover:opacity-90 text-white shadow-2xs transition-all cursor-pointer"
                                  >
                                    <FiPlus size={11} />
                                    <span>Reorder</span>
                                  </button>
                                )}

                                {canRequestRefund && (
                                  <button
                                    onClick={() => handleOpenRefundModal(order)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all cursor-pointer"
                                  >
                                    <span>Refund</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setSelectedDirectOrder(order)}
                                  className="p-1 rounded-lg text-text-secondary hover:text-text-primary bg-surface-hover hover:bg-border/60 border border-border transition-all cursor-pointer"
                                  title="Full PO Breakdown & Settlement"
                                >
                                  <FiEye size={12} />
                                </button>

                                <button
                                  onClick={() => setExpandedRowId(isExpanded ? null : order._id)}
                                  className={`p-1 rounded-lg transition-all cursor-pointer border ${isExpanded
                                    ? "bg-surface-hover text-text-primary border-border"
                                    : "text-text-muted hover:text-text-primary bg-surface-hover/60 hover:bg-surface-hover border-border/80"
                                    }`}
                                  title="Toggle Details"
                                >
                                  <FiChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Breakdown Details */}
                          {isExpanded && (
                            <tr className="bg-surface-hover/40 border-b border-border">
                              <td colSpan={8} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  {/* Partner & Customer Details */}
                                  <div className="p-3.5 rounded-2xl bg-surface border border-border shadow-2xs space-y-2">
                                    <div className="font-bold text-text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                      <FiUser size={13} className="text-primary" /> Partner & Customer Info
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                      <div className="text-text-muted flex justify-between">
                                        <span>Name / Entity:</span>
                                        <strong className="text-text-primary truncate max-w-[150px]">{customerName}</strong>
                                      </div>
                                      <div className="text-text-muted flex justify-between">
                                        <span>Location:</span>
                                        <span className="text-text-primary">{customerLocation}</span>
                                      </div>
                                      <div className="text-text-muted flex justify-between">
                                        <span>Phone:</span>
                                        <span className="text-text-primary font-mono">{order.customer_details?.phone || "Direct Registered"}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Token Escrow & Penalty Protection */}
                                  <div className="p-3.5 rounded-2xl bg-surface border border-border shadow-2xs space-y-2">
                                    <div className="font-bold text-text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                      <FiShield size={13} className="text-emerald-500" /> Token Settlement & Protection
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                      <div className="text-text-muted flex justify-between">
                                        <span>Settlement Rule:</span>
                                        <strong className="text-text-primary font-mono">{order.token_settlement_mode || "PRO_RATA"}</strong>
                                      </div>
                                      <div className="text-text-muted flex justify-between">
                                        <span>Token Adjusted:</span>
                                        <strong className="text-text-primary font-mono">₹{tokenAdjustedINR.toLocaleString("en-IN")}</strong>
                                      </div>
                                      <div className="text-text-muted flex justify-between pt-1 border-t border-border/50">
                                        <span>Available Balance:</span>
                                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹{tokenBalanceINR.toLocaleString("en-IN")}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Validity & Reorders */}
                                  <div className="p-3.5 rounded-2xl bg-surface border border-border shadow-2xs space-y-2.5">
                                    <div className="font-bold text-text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                      <FiLayers size={13} className="text-blue-500" /> Repeat Orders (Drawdowns)
                                    </div>
                                    <div className="space-y-1 text-[11px] text-text-muted">
                                      <div className="flex justify-between">
                                        <span>Linked Reorders:</span>
                                        <strong className="text-text-primary font-bold">{(order.linked_repeat_orders || []).length} Orders</strong>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Rate Validity:</span>
                                        <strong className="text-text-primary font-bold">{order.po_settings_snapshot?.po_validity_days || 30} Days Guaranteed</strong>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setSelectedDirectOrder(order)}
                                      className="w-full py-2 rounded-xl bg-surface-hover hover:bg-border text-text-primary text-[11px] font-bold border border-border transition-colors cursor-pointer text-center"
                                    >
                                      View Full Breakdown & Settlement Logs →
                                    </button>
                                  </div>
                                </div>

                                {/* ── Dedicated Nested Reorders Table Under PO Card ── */}
                                <div className="mt-4 p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                        <FiLayers size={14} />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                                          Drawdowns & Reorders Under PO: <span className="font-mono text-primary">{order.po_number}</span>
                                        </h4>
                                        <p className="text-[10px] text-text-muted">
                                          All loose kit deliveries drawn from this locked quota with pro-rata token escrow deduction.
                                        </p>
                                      </div>
                                    </div>
                                    {canReorder && (
                                      <button
                                        onClick={() => handleOpenReorderModal(order)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary hover:opacity-90 text-white shadow-xs transition-all cursor-pointer"
                                      >
                                        <FiPlus size={12} />
                                        <span> Place Reorder</span>
                                      </button>
                                    )}
                                  </div>

                                  {(order.linked_repeat_orders || []).length === 0 ? (
                                    <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-dashed border-border text-center text-[11px] text-text-muted">
                                      No drawdowns placed against this PO yet. Click "  Place Reorder" to draw kits from the {remaining} remaining quota.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto rounded-xl border border-border/80 bg-surface">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface-hover/80">
                                            <th className="py-2.5 px-3">Reorder Ref #</th>
                                            <th className="py-2.5 px-3">Order Date</th>
                                            <th className="py-2.5 px-3">Kits Drawn</th>
                                            <th className="py-2.5 px-3">Token Escrow Adjusted</th>
                                            <th className="py-2.5 px-3">Net Paid</th>
                                            <th className="py-2.5 px-3">Payment UTR</th>
                                            <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3 text-right">Track Live</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60 text-[11px]">
                                          {order.linked_repeat_orders.map((child, cIdx) => {
                                            const childQty = child.items?.[0]?.quantity || child.total_quantity || 1;
                                            const childTokenAdj = Math.round((child.token_adjusted_paise || 0) / 100);
                                            const childNetPaid = Math.round((child.net_payable_paise || child.grand_total_paise || 0) / 100);
                                            return (
                                              <tr key={child._id || cIdx} className="hover:bg-surface-hover/40 transition-colors">
                                                <td className="py-2 px-3 font-mono font-bold text-text-primary">
                                                  {child.po_number || `ORD-R${cIdx + 1}`}
                                                </td>
                                                <td className="py-2 px-3 text-text-muted">
                                                  {new Date(child.created_at || child.createdAt).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                  })}
                                                </td>
                                                <td className="py-2 px-3 font-bold text-text-primary">
                                                  <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                    {childQty} Kits
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                                  {childTokenAdj > 0 ? `-₹${childTokenAdj.toLocaleString("en-IN")}` : "₹0"}
                                                </td>
                                                <td className="py-2 px-3 font-mono font-bold text-text-primary">
                                                  ₹{childNetPaid.toLocaleString("en-IN")}
                                                </td>
                                                <td className="py-2 px-3 font-mono text-text-muted text-[10px] select-all">
                                                  {child.payment_utr || child.offline_payment?.utr_number || "—"}
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                  <StatusBadge status={child.status} />
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {directOrders.filter((o) => !o.parent_po_id).map((order) => (
                <EpcPoCardItem
                  key={order._id}
                  order={order}
                  onSelectOrder={setSelectedDirectOrder}
                  onOpenReorder={handleOpenReorderModal}
                  onOpenRefund={handleOpenRefundModal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: FRANCHISEE POOLED ALLOCATIONS (LEGACY VIEW)                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "franchisee_allocations" && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 bg-surface rounded-2xl border border-border">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#264baa]"></div>
              <p className="text-xs font-bold text-text-secondary mt-3">Loading allocated purchase orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-16 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-[#264baa]/10 flex items-center justify-center mx-auto mb-3">
                <FiPackage className="h-8 w-8 text-[#264baa]" />
              </div>
              <h3 className="text-base font-bold text-text-primary dark:text-white">No PO Allocations Found</h3>
              <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
                You do not currently have any pending purchase order allocations from your Franchise Partner.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                let epcAlloc = null;
                let allocatedItem = null;
                order.items?.forEach((item) => {
                  const match = item.epc_allocations?.find(
                    (a) => a.epc_buyer_id?.toString() === user?._id?.toString() ||
                      a.epc_buyer_id?.toString() === user?.id?.toString() ||
                      a.epc_buyer_id?.toString() === user?.account_id?.toString()
                  );
                  if (match) {
                    epcAlloc = match;
                    allocatedItem = item;
                  }
                });

                if (!epcAlloc && order.items?.[0]?.epc_allocations?.length === 1) {
                  epcAlloc = order.items[0].epc_allocations[0];
                  allocatedItem = order.items[0];
                } else if (!epcAlloc && order.items?.[0]) {
                  allocatedItem = order.items[0];
                  epcAlloc = order.items[0].epc_allocations?.[0] || { allocated_quantity: order.total_booked_quantity || 25 };
                }

                const allocatedQty = epcAlloc?.allocated_quantity || order.total_booked_quantity || 0;
                const unitPrice = (allocatedItem?.unit_price_paise || 0) / 100;
                const gstRate = allocatedItem?.gst_rate || 0;
                const totalAmount = allocatedQty * unitPrice * (1 + gstRate / 100);
                const tokenPaise = epcAlloc?.token_amount_paise || order.token_amount_paise || 5000000;
                const tokenRequiredINR = Math.round(tokenPaise / 100);
                const isPaid =
                  epcAlloc?.payment_status === "VERIFIED" ||
                  epcAlloc?.payment_status === "PAID" ||
                  order.status === "PO_STARTED" ||
                  order.status === "VALIDATED" ||
                  order.token_payment_status === "PAID" ||
                  ["APPROVED", "CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(order.status);

                const booked = order.total_booked_quantity || order.total_quantity || allocatedQty || 0;
                const fulfilled = order.fulfilled_quantity || 0;
                const remaining = order.remaining_quantity != null ? order.remaining_quantity : Math.max(0, booked - fulfilled);
                const canReorder = isPaid && remaining > 0 && !["CANCELLED", "REJECTED", "EXPIRED"].includes(order.status);

                return (
                  <div
                    key={order._id}
                    className="bg-surface border border-border rounded-2xl shadow-xs overflow-hidden transition-all hover:border-[#264baa]/40 flex flex-col justify-between"
                  >
                    <div>
                      <div className="bg-surface-hover/60 border-b border-border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#264baa]/10 text-[#264baa] flex items-center justify-center font-bold">
                            <FiLayers size={18} />
                          </div>
                          <div>
                            <div className="text-xs text-text-secondary font-mono">PO: {order.po_number}</div>
                            <div className="text-sm font-black text-text-primary dark:text-white">
                              {allocatedItem?.item_name || "Solar Combo Kit Allocation"}
                            </div>
                          </div>
                        </div>
                        <AllocationStatusBadge status={epcAlloc?.payment_status} utr={epcAlloc?.payment_utr} poStatus={order.status} />
                      </div>

                      {/* Stage 3 Notice Banner for EPC (Shown ONLY if Token Deposit NOT Paid) */}
                      {!isPaid && (
                        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-xs space-y-1">
                          <div className="flex items-center justify-between font-black text-amber-800 dark:text-amber-300">
                            <span className="flex items-center gap-1.5">
                              <FiAlertCircle className="text-amber-600 shrink-0" size={15} /> Stage 3: EPC One-Time Token Deposit Required
                            </span>
                            <span className="font-mono text-sm text-amber-700 dark:text-amber-300">
                              ₹{tokenRequiredINR.toLocaleString("en-IN")} Due
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-700 dark:text-amber-300">
                            🔒 <strong>Purchase Order will not commence until the one-time token deposit is paid.</strong> Once paid, you can draw down kit reorders seamlessly without repeating token deposit!
                          </p>
                        </div>
                      )}

                      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                          <h4 className="text-xs font-black uppercase text-text-secondary tracking-wider">
                            Allocation & Token Details
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-text-secondary">Allocated Quantity:</span>
                              <span className="font-bold text-text-primary dark:text-white">{allocatedQty} Kits</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-secondary">Remaining Quota:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{remaining} Kits</span>
                            </div>
                            <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                                <FiLock size={12} className="text-emerald-600 shrink-0" /> Guaranteed Locked Price:
                              </span>
                              <span className="font-black text-emerald-700 dark:text-emerald-200">₹{unitPrice.toLocaleString("en-IN")}/kit</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-secondary">GST Rate:</span>
                              <span className="font-bold text-text-primary dark:text-white">{gstRate}%</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-border font-black text-sm">
                              <span className="text-text-primary dark:text-white">Total Landed Amount:</span>
                              <span className="text-[#264baa] dark:text-blue-400">₹{totalAmount.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between pt-1 text-xs">
                              <span className="text-text-secondary font-bold">One-Time Token Deposit:</span>
                              <span className={`font-black ${isPaid ? "text-emerald-600" : "text-amber-700 dark:text-amber-400"}`}>
                                ₹{tokenRequiredINR.toLocaleString("en-IN")} {isPaid && "(Paid ✓)"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ICICI VAN Details & Upload Receipt (Only shown if token is NOT paid) */}
                        <div className="md:col-span-2 space-y-3">
                          {!isPaid ? (
                            <>
                              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-4 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                                    ICICI Virtual Escrow Account (Instant Settlement)
                                  </span>
                                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                                    Auto-Verify in 10s
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                                  <div className="flex justify-between bg-surface p-2 rounded border border-border">
                                    <span className="text-text-muted">A/C: {iciciVanDetails?.account_number || escrowBank.account_number}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(iciciVanDetails?.account_number || escrowBank.account_number, `acc_${order._id}`)}
                                      className="text-primary hover:underline text-[10px]"
                                    >
                                      {copiedField === `acc_${order._id}` ? "Copied!" : "Copy"}
                                    </button>
                                  </div>
                                  <div className="flex justify-between bg-surface p-2 rounded border border-border">
                                    <span className="text-text-muted">IFSC: {iciciVanDetails?.ifsc_code || escrowBank.ifsc_code}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(iciciVanDetails?.ifsc_code || escrowBank.ifsc_code, `ifsc_${order._id}`)}
                                      className="text-primary hover:underline text-[10px]"
                                    >
                                      {copiedField === `ifsc_${order._id}` ? "Copied!" : "Copy"}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {activeUploadOrderId === order._id ? (
                                <div className="space-y-2 bg-surface p-3 rounded-xl border border-border">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-text-primary">Upload Bank Transfer Receipt (UTR)</span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveUploadOrderId(null)}
                                      className="text-text-secondary hover:text-text-primary text-[11px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Enter Bank UTR / Reference No."
                                    value={manualUtr}
                                    onChange={(e) => setManualUtr(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-hover font-mono"
                                  />
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => setReceiptFile(e.target.files[0])}
                                    className="block w-full text-xs text-text-secondary file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:font-bold"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpload(order._id)}
                                    disabled={uploading}
                                    className="w-full bg-primary hover:opacity-90 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                  >
                                    {uploading ? "Submitting Receipt..." : "Submit Receipt for Accounts Verification"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveUploadOrderId(order._id)}
                                  className="w-full py-2.5 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <FiUploadCloud className="text-primary" />
                                  <span>Paid via Traditional Bank Transfer? Upload Receipt Slip / UTR</span>
                                </button>
                              )}
                            </>
                          ) : (
                            /* When Token is Paid: Show Quota Progress & Reorders Summary */
                            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                                  <FiCheckCircle className="text-emerald-600" /> Rate Lock & Quota Active
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                  Token Deposit Verified ✓
                                </span>
                              </div>
                              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                                Your price lock is guaranteed. Draw repeat kit orders anytime using the <strong>"+ Reorder Kits"</strong> button below.
                              </p>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-500/20 text-emerald-900 dark:text-emerald-300 font-bold">
                                <span>Fulfilled: {fulfilled} Kits</span>
                                <span>Remaining: {remaining} Kits</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Nested Repeat Orders Placed Under This Allocated PO */}
                      {isPaid && (
                        <div className="mx-4 sm:mx-6 mb-4 p-4 rounded-2xl bg-surface border border-border shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                <FiLayers size={14} />
                              </div>
                              <div>
                                <h4 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                                  Reorders & Drawdowns Placed Under PO: <span className="font-mono text-primary">{order.po_number}</span>
                                </h4>
                                <p className="text-[10px] text-text-muted">
                                  All loose kit deliveries drawn against this allocated quota with token adjusted pro-rata.
                                </p>
                              </div>
                            </div>
                            {canReorder && (
                              <button
                                type="button"
                                onClick={() => handleOpenReorderModal(order)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary hover:opacity-90 text-white shadow-xs transition-all cursor-pointer"
                              >
                                <FiPlus size={12} />
                                <span>+ Reorder Kits</span>
                              </button>
                            )}
                          </div>

                          {(order.linked_repeat_orders || []).length === 0 ? (
                            <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-dashed border-border text-center text-[11px] text-text-muted">
                              No repeat drawdowns placed against this PO yet. Click "+ Reorder Kits" to draw from your {remaining} remaining quota.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-border/80 bg-surface">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface-hover/80">
                                    <th className="py-2.5 px-3">Order Ref #</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3">Kits Drawn</th>
                                    <th className="py-2.5 px-3">Token Adjusted</th>
                                    <th className="py-2.5 px-3">Net Paid</th>
                                    <th className="py-2.5 px-3">Payment UTR</th>
                                    <th className="py-2.5 px-3 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 text-[11px]">
                                  {order.linked_repeat_orders.map((child, cIdx) => {
                                    const childQty = child.items?.[0]?.quantity || child.total_quantity || 1;
                                    const childTokenAdj = Math.round((child.token_adjusted_paise || 0) / 100);
                                    const childNetPaid = Math.round((child.net_payable_paise || child.grand_total_paise || 0) / 100);
                                    return (
                                      <tr key={child._id || cIdx} className="hover:bg-surface-hover/40 transition-colors">
                                        <td className="py-2 px-3 font-mono font-bold text-text-primary">
                                          {child.po_number || `ORD-R${cIdx + 1}`}
                                        </td>
                                        <td className="py-2 px-3 text-text-muted">
                                          {new Date(child.created_at || child.createdAt).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })}
                                        </td>
                                        <td className="py-2 px-3 font-bold text-text-primary">
                                          <span className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                            {childQty} Kits
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                          {childTokenAdj > 0 ? `-₹${childTokenAdj.toLocaleString("en-IN")}` : "₹0"}
                                        </td>
                                        <td className="py-2 px-3 font-mono font-bold text-text-primary">
                                          ₹{childNetPaid.toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-text-muted text-[10px] select-all">
                                          {child.payment_utr || child.offline_payment?.utr_number || "—"}
                                        </td>
                                        <td className="py-2 px-3">
                                          <StatusBadge status={child.status} />
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/track-status?tab=po_allocations&search=${encodeURIComponent(child.po_number || child._id)}`)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all cursor-pointer shadow-2xs"
                                            title="View real-time status & dispatch tracking"
                                          >
                                            <FiTruck size={12} />
                                            <span>Track Order</span>
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
                      )}
                    </div>

                    {/* Card Footer with Franchise Partner Info & Pay Token or Reorder Button */}
                    <div className="bg-surface-hover/50 border-t border-border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-text-secondary">Franchise Partner:</span>
                        <span className="font-black text-text-primary">
                          {order.franchisee_id?.business_name || order.franchisee_id?.contact_person || "SolarKits Franchise Partner"}
                        </span>
                        {order.franchisee_id?.mobile && (
                          <span className="text-text-muted">({order.franchisee_id.mobile})</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const isContractSigned = epcAlloc?.contract?.status === "SIGNED" || order.contract?.status === "SIGNED";

                          if (!isContractSigned) {
                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenContractModal(order, epcAlloc, allocatedItem)}
                                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95 transition-all shadow-md cursor-pointer transform active:scale-95 animate-pulse"
                                >
                                  <FiFileText size={14} />
                                  <span>📜 Review & Sign PO Contract (OTP)</span>
                                </button>
                                <button
                                  type="button"
                                  disabled
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                  title="Contract signature via mobile OTP required before token payment"
                                >
                                  <FiLock size={12} />
                                  <span>Token Deposit (Locked)</span>
                                </button>
                              </div>
                            );
                          }

                          if (!isPaid) {
                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewSignedContract(order, epcAlloc)}
                                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 transition-all cursor-pointer"
                                  title="View Digitally Signed Legal Contract"
                                >
                                  <FiCheckCircle size={13} className="text-emerald-600" />
                                  <span>Contract Signed ✓</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenTokenModal(order, epcAlloc, allocatedItem)}
                                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95 transition-all shadow-md cursor-pointer transform active:scale-95"
                                >
                                  <FaRupeeSign size={14} />
                                  <span>💳 Pay Token Deposit (₹{tokenRequiredINR.toLocaleString("en-IN")})</span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleViewSignedContract(order, epcAlloc)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 transition-all cursor-pointer"
                              >
                                <FiCheckCircle size={12} className="text-emerald-600" />
                                <span>Contract Signed ✓</span>
                              </button>
                            </div>
                          );
                        })()}
                        {isPaid && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/30">
                              <FiCheckCircle size={13} className="text-emerald-600" />
                              <span>Token Deposited ✓ (PO Started)</span>
                            </span>

                            {canReorder && (
                              <button
                                type="button"
                                onClick={() => handleOpenReorderModal(order)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-primary text-white hover:opacity-95 transition-all shadow-sm cursor-pointer transform active:scale-95"
                              >
                                <FiPlus size={14} />
                                <span>⚡ Reorder Kits ({remaining} left)</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL MODAL FOR DIRECT PO ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDirectOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setSelectedDirectOrder(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-border shadow-2xl overflow-hidden z-10 bg-surface"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-text-primary">
                      PO Breakdown: {selectedDirectOrder.po_number}
                    </h2>
                    <StatusBadge status={selectedDirectOrder.status} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Locked on {new Date(selectedDirectOrder.created_at || selectedDirectOrder.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDirectOrder(null)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {/* Quota & Token Progress Box */}
                <div className="p-4 rounded-2xl border border-border bg-surface-hover space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                      Quota Fulfillment & Quota Lock
                    </span>
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                      {selectedDirectOrder.remaining_quantity != null ? selectedDirectOrder.remaining_quantity : (selectedDirectOrder.total_booked_quantity || 0)} Kits Remaining
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2.5 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-text-muted">Booked Quota</div>
                      <div className="text-sm font-black text-text-primary">
                        {selectedDirectOrder.total_booked_quantity || selectedDirectOrder.total_quantity || 0} Kits
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-text-muted">Fulfilled</div>
                      <div className="text-sm font-black text-blue-600">
                        {selectedDirectOrder.fulfilled_quantity || 0} Kits
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface border border-border">
                      <div className="text-[10px] text-text-muted">Token Paid</div>
                      <div className={`text-sm font-black ${(selectedDirectOrder.token_paid_paise || 0) > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        ₹{Math.round((selectedDirectOrder.token_paid_paise || 0) / 100).toLocaleString("en-IN")}
                        <span className="text-[10px] text-text-muted block font-normal">
                          of ₹{Math.round((selectedDirectOrder.token_amount_paise || 0) / 100).toLocaleString("en-IN")} Req
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items & Product Description */}
                <div className="space-y-2">
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                    Itemized Product & Quantities
                  </h4>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                        <tr>
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-3 text-center">Quantity</th>
                          <th className="py-2.5 px-3">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedDirectOrder.items?.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-3 px-3">
                              <div className="font-bold text-text-primary">{it.item_name}</div>
                              <div className="text-[10px] text-text-muted">GST @ {it.gst_rate}%</div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold">{it.quantity} Kits</td>
                            <td className="py-3 px-3 font-mono">
                              ₹{((it.unit_price_paise || 0) / 100).toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-3 text-right font-bold font-mono">
                              ₹{((it.total_price_paise || 0) / 100).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Value */}
                <div className="p-4 rounded-xl border border-border bg-surface-hover flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Total Purchase Order Value
                    </div>
                    <div className="text-lg font-black text-text-primary">
                      ₹{((selectedDirectOrder.grand_total_paise || 0) / 100).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Settlement Mode
                    </div>
                    <span className="font-bold text-primary">
                      {selectedDirectOrder.token_settlement_mode || "PRO_RATA"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REORDER FROM PO MODAL (2-STEP JOURNEY IDENTICAL TO DIRECT EPC CHECKOUT) ── */}
      <AnimatePresence>
        {reorderModal && reorderOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => !reorderSubmitting && setReorderModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-border shadow-2xl overflow-hidden z-10 bg-surface my-auto"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/30 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <FiRefreshCw size={17} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-text-primary">
                        Place Reorder under Master PO: <span className="font-mono text-primary">{reorderOrder.po_number}</span>
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-black">
                        <FiLock size={10} /> Guaranteed Rate Lock
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Identical 2-Step EPC Order Journey: Site Address & Payment Milestones with Pro-Rata Token Settlement
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !reorderSubmitting && setReorderModal(false)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={20} />
                </button>
              </div>

              {reorderSuccess ? (
                <div className="p-8 space-y-5 text-center max-w-md mx-auto my-auto">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                    <FiCheckCircle size={40} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-black text-text-primary">
                      Repeat Order Successfully Placed!
                    </h3>
                    <p className="text-xs text-text-muted">
                      Linked Repeat Order Generated:{" "}
                      <span className="font-mono font-bold text-primary text-sm">{reorderSuccess.orderNumber}</span>
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      Sent to Accounts & Warehouse for verification under Parent PO: {reorderOrder.po_number}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-hover border border-border text-xs space-y-2.5 text-left">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Parent Master PO:</span>
                      <span className="font-mono font-bold text-text-primary">{reorderOrder.po_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Token Escrow Adjusted:</span>
                      <span className="font-bold text-emerald-600">₹{(reorderSuccess.adjusted || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Payment Preference:</span>
                      <span className="font-bold text-text-primary">
                        {reorderSuccess.isFull ? "100% Full Order" : "Milestone 1 (30% Advance)"}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-text-muted font-bold">Amount Paid Today:</span>
                      <span className="font-black text-base text-primary">₹{(reorderSuccess.paidToday || reorderSuccess.payable || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setReorderModal(false);
                      setReorderSuccess(null);
                    }}
                    className="w-full py-3 rounded-xl bg-primary text-white text-xs font-black shadow-lg hover:opacity-90 transition-all cursor-pointer"
                  >
                    Done & Return to PO List
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitReorder} className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-5">
                  {reorderError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 text-xs flex items-center gap-2">
                      <FiAlertCircle size={16} className="shrink-0" />
                      <span className="font-semibold">{reorderError}</span>
                    </div>
                  )}

                  {(() => {
                    const it = reorderOrder.items?.[0] || {};
                    // GUARANTEED PRICE LOCK: rate is strictly anchored to parent PO snapshot
                    const unitPrice = (it.unit_price_paise || 0) / 100;
                    const gstRate = it.gst_rate || 13.85;
                    const committed = Number(reorderOrder.total_booked_quantity || it.quantity || 100);
                    const fulfilled = Number(reorderOrder.fulfilled_quantity || 0);
                    const remaining = reorderOrder.remaining_quantity != null ? reorderOrder.remaining_quantity : Math.max(1, committed - fulfilled);

                    const tokenPaid = Math.round((reorderOrder.token_paid_paise || reorderOrder.token_amount_paise || 0) / 100);
                    const tokenAdjusted = Math.round((reorderOrder.token_adjusted_total_paise || 0) / 100);
                    const tokenBalance = Math.max(0, tokenPaid - tokenAdjusted);
                    const settlementMode = reorderOrder.token_settlement_mode || reorderOrder.penalty_rule_snapshot?.token_settlement_rule || "PRO_RATA";

                    const subtotal = reorderQty * unitPrice;
                    const tax = Math.round(subtotal * (gstRate / 100));
                    const grossTotal = subtotal + tax;

                    let tokenToDeduct = 0;
                    const isClosing = reorderQty === remaining;
                    if (isClosing) {
                      tokenToDeduct = Math.min(tokenBalance, grossTotal);
                    } else if (settlementMode === "PRO_RATA") {
                      const perKit = committed > 0 ? Math.floor(tokenPaid / committed) : 0;
                      tokenToDeduct = Math.min(tokenBalance, reorderQty * perKit, grossTotal);
                    } else if (settlementMode === "UPFRONT") {
                      tokenToDeduct = Math.min(tokenBalance, grossTotal);
                    }
                    const netPayable = Math.max(0, grossTotal - tokenToDeduct);

                    // Milestone breakdown: 30% Advance (M1) and 70% Final (M2)
                    const advanceAmount = Math.round(netPayable * 0.30);
                    const remainingAmount = Math.max(0, netPayable - advanceAmount);
                    const amountDueToday = reorderPayFull ? netPayable : advanceAmount;

                    const kitCapacityKw = reorderOrder.system_capacity_kw || 3;
                    const totalKw = (reorderQty * kitCapacityKw).toFixed(1);
                    const totalWeightKg = (reorderQty * 75).toFixed(0);

                    const userPhone = user?.whatsapp || user?.registered_whatsapp || user?.mobile || "9876543210";
                    const vanAccount = iciciVanDetails?.account_number || iciciVanDetails?.van_account_number || `SLRK${userPhone}`;
                    const vanIfsc = iciciVanDetails?.ifsc_code || "ICIC0000104";

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* ── LEFT COLUMN: 2-Step Order Journey (8 Cols) ── */}
                        <div className="lg:col-span-8 space-y-5">

                          {/* 1. Review Selected Solar Kits with Guaranteed Price Lock */}
                          <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                              <h3 className="font-extrabold text-sm text-text-primary flex items-center gap-2">
                                <FiPackage className="text-primary" /> Review Selected Solar Kits ({reorderQty} Units)
                              </h3>
                              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-black">
                                <FiLock size={12} className="text-emerald-600" />
                                <span>Locked Rate: ₹{unitPrice.toLocaleString("en-IN")}/kit + GST</span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-surface-hover/70 border border-border/80">
                              <div>
                                <span className="font-bold text-sm text-text-primary block">
                                  {it.item_name || "Solarkits DCR Combo Kit"}
                                </span>
                                <span className="text-[11px] text-text-muted mt-0.5 block">
                                  Basic Kit • {kitCapacityKw} kW System • Guaranteed PO Price Locked
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-black text-sm text-text-primary block">
                                  ₹{grossTotal.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-text-muted font-bold block">
                                  Qty: {reorderQty} Kits (₹{unitPrice.toLocaleString("en-IN")} ea + GST)
                                </span>
                              </div>
                            </div>

                            {/* Guaranteed Price Lock Guarantee Banner */}
                            <div className="text-[11px] text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2">
                              <span className="font-bold flex items-center gap-1.5">
                                🔒 <span>Guaranteed PO Price Lock Active:</span>
                              </span>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                                Market price fluctuations will NOT affect this order quota.
                              </span>
                            </div>

                            {/* Quota & Escrow Stats Row */}
                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60 text-center text-xs">
                              <div className="p-2 rounded-xl bg-surface-hover/50 border border-border/60">
                                <div className="text-[10px] text-text-muted font-medium">Total Committed</div>
                                <div className="font-black text-text-primary text-sm">{committed} Kits</div>
                              </div>
                              <div className="p-2 rounded-xl bg-surface-hover/50 border border-border/60">
                                <div className="text-[10px] text-text-muted font-medium">Remaining Quota</div>
                                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{remaining} Kits</div>
                              </div>
                              <div className="p-2 rounded-xl bg-surface-hover/50 border border-border/60">
                                <div className="text-[10px] text-text-muted font-medium">Escrow Balance</div>
                                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{tokenBalance.toLocaleString("en-IN")}</div>
                              </div>
                            </div>

                            {/* Configured Loose Quantity Presets */}
                            <div className="space-y-2 pt-2 border-t border-border">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black text-text-primary">
                                  Select Configured Loose Quantity:
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface border border-border text-text-muted">
                                  Mode: {settlementMode}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const configuredLoose = (Array.isArray(it.loose_order_quantities) && it.loose_order_quantities.length > 0)
                                    ? it.loose_order_quantities
                                    : (Array.isArray(reorderOrder.loose_order_quantities) && reorderOrder.loose_order_quantities.length > 0)
                                      ? reorderOrder.loose_order_quantities
                                      : [5, 10, 15, 20, 25, 30];

                                  return (
                                    <>
                                      {configuredLoose.map((lq) => {
                                        const isAvailable = lq <= remaining;
                                        const isSelected = reorderQty === lq;
                                        return (
                                          <button
                                            key={lq}
                                            type="button"
                                            disabled={!isAvailable}
                                            onClick={() => setReorderQty(lq)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${isSelected
                                              ? "bg-sky-600 text-white border-sky-600 shadow-md scale-105"
                                              : isAvailable
                                                ? "bg-sky-500/10 text-sky-800 dark:text-sky-300 hover:bg-sky-500/20 border-sky-500/30"
                                                : "bg-surface text-text-muted/40 border-border/40 cursor-not-allowed opacity-40 line-through"
                                              }`}
                                          >
                                            {lq} KITS
                                          </button>
                                        );
                                      })}
                                      {remaining > 0 && !configuredLoose.includes(remaining) && (
                                        <button
                                          type="button"
                                          onClick={() => setReorderQty(remaining)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${reorderQty === remaining
                                            ? "bg-primary text-white border-primary shadow-md scale-105"
                                            : "bg-surface hover:bg-surface-hover text-text-primary border-border"
                                            }`}
                                        >
                                          All Remaining ({remaining} KITS)
                                        </button>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* 2. Region Payment Mode Switcher (if state supports online or both) */}
                          {reorderEffectiveMode === "both" && (
                            <div className="bg-surface p-2 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={() => setReorderPaymentMethod("online")}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${reorderPaymentMethod === "online"
                                  ? "bg-[#264baa] text-white shadow-md shadow-[#264baa]/30"
                                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                  }`}
                              >
                                <FiDollarSign className="text-sm" />
                                <span>Instant Online Transfer (ICICI VAN)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setReorderPaymentMethod("offline")}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${reorderPaymentMethod === "offline"
                                  ? "bg-primary text-white shadow-md shadow-primary/30"
                                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                                  }`}
                              >
                                <FiUploadCloud className="text-sm" />
                                <span>Offline Bank Transfer (UTR + Receipt)</span>
                              </button>
                            </div>
                          )}

                          {/* 3. Official ICICI Bank eCollection Virtual Account (VAN) Card */}
                          <div className="bg-gradient-to-br from-[#264baa]/10 via-surface to-[#264baa]/5 p-5 rounded-2xl border-2 border-[#264baa]/40 shadow-xs space-y-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#264baa]/20 pb-2.5">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#264baa] dark:text-blue-400">
                                  Official ICICI Bank eCollection Virtual Account (VAN)
                                </span>
                                <h4 className="text-sm font-black text-text-primary flex items-center gap-1.5 mt-0.5">
                                  <FiDollarSign className="text-[#264baa] dark:text-blue-400" /> Transfer to ICICI Virtual Account
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                Zero Gateway Fees • Real-Time Auto Confirmation
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3 bg-surface rounded-xl border border-border">
                                <span className="text-[10px] text-text-muted uppercase font-bold block">Beneficiary Name</span>
                                <span className="font-extrabold text-text-primary text-xs truncate block mt-0.5">
                                  {iciciVanDetails?.beneficiary_name || "SolarKits Technologies Pvt Ltd"}
                                </span>
                              </div>
                              <div className="p-3 bg-surface rounded-xl border border-border">
                                <span className="text-[10px] text-text-muted uppercase font-bold block">Bank & Branch</span>
                                <span className="font-extrabold text-text-primary text-xs truncate block mt-0.5">
                                  {iciciVanDetails?.bank_name || "ICICI Bank, CMS Branch, Mumbai"}
                                </span>
                              </div>
                            </div>

                            <div className="p-3.5 bg-surface rounded-xl border border-[#264baa]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-text-muted block">
                                  Your Unique Virtual Account No (VAN)
                                </span>
                                <span className="font-mono text-base font-black text-[#264baa] dark:text-blue-400 tracking-wider">
                                  {vanAccount}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyText(vanAccount, "reorder_van")}
                                className="px-3.5 py-1.5 bg-[#264baa]/10 hover:bg-[#264baa]/20 text-[#264baa] dark:text-blue-400 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                              >
                                <FiCopy size={13} />
                                <span>{copiedField === "reorder_van" ? "Copied!" : "Copy VAN"}</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] text-text-muted uppercase font-bold block">IFSC Code</span>
                                  <span className="font-mono font-bold text-text-primary">{vanIfsc}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(vanIfsc, "reorder_ifsc")}
                                  className="text-primary hover:underline text-[11px] font-bold cursor-pointer"
                                >
                                  {copiedField === "reorder_ifsc" ? "Copied!" : "Copy"}
                                </button>
                              </div>
                              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/25 flex items-center gap-2 text-[10px] text-emerald-800 dark:text-emerald-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                                <span><strong>Real-time Listener Active:</strong> Transfer ₹{amountDueToday.toLocaleString("en-IN")} from netbanking/UPI to confirm automatically.</span>
                              </div>
                            </div>
                          </div>

                          {/* 4. Step 1: Delivery Site Address */}
                          <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                              <div>
                                <h3 className="font-black text-sm sm:text-base text-text-primary flex items-center gap-2">
                                  <FiTruck className="text-primary" /> Step 1: Delivery Site Address
                                </h3>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                  Physical site location where the solar kit equipment will be dispatched and delivered.
                                </p>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                                Required
                              </span>
                            </div>

                            {/* Select Delivery Fulfillment Mode */}
                            <div className="space-y-2.5">
                              <label className="block text-[11px] font-black uppercase tracking-wider text-text-secondary">
                                Select Delivery Fulfillment Mode <span className="text-rose-500">*</span>
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Mode 1: Direct Site Delivery */}
                                <div
                                  onClick={() => setReorderFulfillmentMode("direct_site")}
                                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${reorderFulfillmentMode === "direct_site"
                                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                                    : "border-border bg-surface hover:border-primary/50"
                                    }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-2xl">🚚</span>
                                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${reorderFulfillmentMode === "direct_site" ? "border-primary bg-primary text-white" : "border-border"}`}>
                                        {reorderFulfillmentMode === "direct_site" && <FiCheck size={10} />}
                                      </span>
                                    </div>
                                    <h4 className="font-extrabold text-xs text-text-primary">Direct Site Delivery</h4>
                                    <p className="text-[10px] text-text-secondary leading-relaxed">
                                      Transport directly unloaded at the installation site address or pincode.
                                    </p>
                                  </div>
                                  <div className="mt-2.5 pt-1.5 border-t border-border/60 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                    <FiCheckCircle size={11} /> Site Pincode Delivery
                                  </div>
                                </div>

                                {/* Mode 2: EPC Warehouse / Self Depot */}
                                <div
                                  onClick={() => setReorderFulfillmentMode("epc_warehouse")}
                                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${reorderFulfillmentMode === "epc_warehouse"
                                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                                    : "border-border bg-surface hover:border-primary/50"
                                    }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-2xl">🏭</span>
                                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${reorderFulfillmentMode === "epc_warehouse" ? "border-primary bg-primary text-white" : "border-border"}`}>
                                        {reorderFulfillmentMode === "epc_warehouse" && <FiCheck size={10} />}
                                      </span>
                                    </div>
                                    <h4 className="font-extrabold text-xs text-text-primary">EPC Warehouse / Self Depot</h4>
                                    <p className="text-[10px] text-text-secondary leading-relaxed">
                                      Direct bulk dispatch to your company depot or contractor warehouse.
                                    </p>
                                  </div>
                                  <div className="mt-2.5 pt-1.5 border-t border-border/60 text-[10px] text-text-muted">
                                    Central Direct Dispatch
                                  </div>
                                </div>
                              </div>

                              {/* Order Load Metrics Pill */}
                              <div className="bg-surface-hover/60 p-2.5 rounded-xl border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="text-text-muted font-medium">Order Load Metrics:</span>
                                <div className="flex items-center gap-3 font-semibold text-text-primary text-[11px]">
                                  <span>📦 <strong>{reorderQty}</strong> Kits</span>
                                  <span>⚡ <strong>{totalKw}</strong> kW</span>
                                  <span>⚖️ <strong>{totalWeightKg}</strong> kg Payload</span>
                                </div>
                              </div>
                            </div>

                            {/* Address Form Inputs */}
                            <div className="space-y-3 pt-2">
                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">
                                  Site Street Address / Plot / Industrial Area <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Survey No. 42, GIDC Industrial Estate, Ring Road"
                                  value={reorderAddress.line}
                                  onChange={(e) => setReorderAddress((prev) => ({ ...prev, line: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">
                                    Delivery PIN Code <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    placeholder="e.g. 380001"
                                    value={reorderAddress.pincode}
                                    onChange={(e) => setReorderAddress((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, "") }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary font-mono font-bold text-xs outline-none focus:border-primary"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">
                                    District / City
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Devbhoomi Dwarka"
                                    value={reorderAddress.district_name}
                                    onChange={(e) => setReorderAddress((prev) => ({ ...prev, district_name: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">
                                    State
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Gujarat"
                                    value={reorderAddress.state_name}
                                    onChange={(e) => setReorderAddress((prev) => ({ ...prev, state_name: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">
                                    Site Contact Person
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Receiver / Site Engineer Name"
                                    value={reorderAddress.contact_name}
                                    onChange={(e) => setReorderAddress((prev) => ({ ...prev, contact_name: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-text-primary mb-1">
                                    Site Contact Phone / WhatsApp <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. 9876543210"
                                    value={reorderAddress.contact_phone}
                                    onChange={(e) => setReorderAddress((prev) => ({ ...prev, contact_phone: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 5. Step 2: Payment Milestones & Receipt Upload */}
                          <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                              <div>
                                <h3 className="font-black text-sm sm:text-base text-text-primary flex items-center gap-2">
                                  <FiUploadCloud className="text-primary" /> Step 2: Payment Milestones & Receipt Upload
                                </h3>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                  Admin-configured payment milestones applied. Pay advance to confirm order; remaining balance due before warehouse dispatch.
                                </p>
                              </div>
                            </div>

                            {/* Official Payment Milestone Policy Schedule Card */}
                            <div className="bg-gradient-to-br from-amber-500/10 via-surface to-blue-500/10 p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md">
                                    Official Payment Milestone Policy
                                  </span>
                                  <h4 className="text-sm font-black text-text-primary mt-1">
                                    Product Payment Milestone Schedule
                                  </h4>
                                </div>
                                <span className="text-xs font-bold text-text-secondary bg-surface px-2.5 py-1 rounded-lg border border-border">
                                  Total Order Value: <strong className="text-text-primary">₹{grossTotal.toLocaleString("en-IN")}</strong>
                                </span>
                              </div>

                              {/* Milestone Stepper (M1 30% Advance & M2 70% Final) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                {/* Milestone 1 (Advance 30%) */}
                                <div className={`p-3.5 rounded-xl border-2 transition-all ${!reorderPayFull ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-xs" : "bg-surface border-border"}`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                      Milestone 1 — Advance Payment (30%)
                                    </span>
                                    <span className="font-black text-amber-800 dark:text-amber-200 text-sm">
                                      ₹{advanceAmount.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-text-secondary leading-relaxed">
                                    Advance payment to confirm order & reserve warehouse inventory.
                                  </p>
                                  <div className="mt-2 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                    ● Status: Due Now at Order Placement
                                  </div>
                                </div>

                                {/* Milestone 2 (Before Dispatch 70%) */}
                                <div className={`p-3.5 rounded-xl border transition-all ${reorderPayFull ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-xs" : "bg-surface border-border"}`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-extrabold uppercase tracking-wider text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                                      Milestone 2 — Final Payment (70%)
                                    </span>
                                    <span className="font-black text-blue-800 dark:text-blue-200 text-sm">
                                      ₹{remainingAmount.toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-text-secondary leading-relaxed">
                                    Remaining balance payable before warehouse dispatch clearance.
                                  </p>
                                  <div className="mt-2 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                                    ○ Status: Due Before Warehouse Dispatch
                                  </div>
                                </div>
                              </div>

                              {/* Milestone Selection Radio Options */}
                              <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row gap-3">
                                <label
                                  onClick={() => setReorderPayFull(false)}
                                  className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${!reorderPayFull ? "border-amber-500 bg-amber-500/5 font-bold text-amber-900 dark:text-amber-200 shadow-xs" : "border-border bg-surface text-text-secondary"}`}
                                >
                                  <input
                                    type="radio"
                                    name="reorder_payment_plan"
                                    checked={!reorderPayFull}
                                    onChange={() => setReorderPayFull(false)}
                                    className="text-amber-600 focus:ring-amber-500"
                                  />
                                  <div className="text-xs">
                                    <span className="block font-bold">Pay 30% Advance (₹{advanceAmount.toLocaleString("en-IN")})</span>
                                    <span className="text-[10px] font-normal opacity-80">Remaining ₹{remainingAmount.toLocaleString("en-IN")} payable before dispatch</span>
                                  </div>
                                </label>

                                <label
                                  onClick={() => setReorderPayFull(true)}
                                  className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${reorderPayFull ? "border-blue-500 bg-blue-500/5 font-bold text-blue-900 dark:text-blue-200 shadow-xs" : "border-border bg-surface text-text-secondary"}`}
                                >
                                  <input
                                    type="radio"
                                    name="reorder_payment_plan"
                                    checked={reorderPayFull}
                                    onChange={() => setReorderPayFull(true)}
                                    className="text-blue-600 focus:ring-blue-500"
                                  />
                                  <div className="text-xs">
                                    <span className="block font-bold">Pay 100% Full Order (₹{netPayable.toLocaleString("en-IN")})</span>
                                    <span className="text-[10px] font-normal opacity-80">Clear full payment now for direct express dispatch</span>
                                  </div>
                                </label>
                              </div>
                            </div>

                            {/* Payment Input Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">
                                  UTR / Transaction Ref No. <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required={reorderPaymentMethod !== "online"}
                                  placeholder="e.g. HDFC0001928374 or 239847192834"
                                  value={reorderUtr}
                                  onChange={(e) => setReorderUtr(e.target.value.toUpperCase())}
                                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary font-mono uppercase font-bold text-xs outline-none focus:border-primary"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[11px] font-bold text-text-primary">
                                    Amount Paid (₹) <span className="text-rose-500">*</span>
                                  </label>
                                  <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                                    🔒 Fixed / System Calculated
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  readOnly
                                  value={`₹${amountDueToday.toLocaleString("en-IN")}`}
                                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface-hover text-text-primary font-mono font-bold text-xs outline-none cursor-not-allowed"
                                />
                                <p className="text-[10px] text-text-muted mt-1">
                                  Amount locked based on preference ({!reorderPayFull ? "30% Advance" : "100% Full Payment"}).
                                </p>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">
                                  Payment Date <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={reorderDate}
                                  onChange={(e) => setReorderDate(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-text-primary mb-1">
                                  Sender Bank Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. State Bank of India / ICICI"
                                  value={reorderBank}
                                  onChange={(e) => setReorderBank(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                                />
                              </div>
                            </div>

                            {/* Payment Transfer Slip Upload Box */}
                            <div className="space-y-2 pt-1">
                              <label className="block text-[11px] font-bold text-text-primary">
                                Upload Payment Transfer Receipt / Screenshot <span className="text-rose-500">*</span>
                              </label>

                              <div className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-4 text-center transition-colors bg-surface-hover cursor-pointer relative">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setReorderSlipFile(file);
                                      if (file.type.startsWith("image/")) {
                                        setReorderSlipPreview(URL.createObjectURL(file));
                                      } else {
                                        setReorderSlipPreview(null);
                                      }
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {reorderSlipPreview ? (
                                  <div className="space-y-2">
                                    <img src={reorderSlipPreview} alt="Receipt preview" className="max-h-32 mx-auto rounded-lg object-contain border border-border" />
                                    <p className="text-xs font-bold text-primary">{reorderSlipFile?.name}</p>
                                    <p className="text-[10px] text-text-muted">Click or drag file to change receipt</p>
                                  </div>
                                ) : reorderSlipFile ? (
                                  <div className="space-y-1">
                                    <FiFileText size={24} className="mx-auto text-primary" />
                                    <p className="text-xs font-bold text-primary">{reorderSlipFile.name}</p>
                                    <p className="text-[10px] text-text-muted">Click to change receipt file</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 py-1">
                                    <FiUploadCloud size={24} className="mx-auto text-primary" />
                                    <p className="text-xs font-bold text-text-primary">
                                      Drag & Drop payment receipt or <span className="text-primary underline">browse</span>
                                    </p>
                                    <p className="text-[10px] text-text-muted">Supports JPG, PNG, PDF (Max 10MB)</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ── RIGHT COLUMN: Order Pricing Summary Sidebar (4 Cols) ── */}
                        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-0">
                          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-md space-y-4">
                            <h3 className="font-extrabold text-sm text-text-primary border-b border-border pb-2.5 flex items-center justify-between">
                              <span>Order Pricing Summary</span>
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                {reorderQty} Kits
                              </span>
                            </h3>

                            {/* Kit item snapshot */}
                            <div className="border-b border-border/60 pb-3 space-y-1">
                              <div className="font-bold text-xs text-text-primary line-clamp-1">
                                {it.item_name || "Solarkits DCR Combo Kit"}
                              </div>
                              <div className="flex justify-between text-[11px] text-text-muted">
                                <span>{reorderQty} Kits × ₹{unitPrice.toLocaleString("en-IN")}/kit</span>
                                <span className="font-mono font-medium">₹{subtotal.toLocaleString("en-IN")}</span>
                              </div>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between text-text-muted">
                                <span>Items Base Subtotal (Excl. GST)</span>
                                <span className="font-mono">₹{subtotal.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex justify-between text-text-muted">
                                <span>GST ({gstRate}%)</span>
                                <span className="font-mono">₹{tax.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex justify-between font-bold text-text-primary pt-1 border-t border-border/60">
                                <span>Subtotal (Incl. GST)</span>
                                <span className="font-mono">₹{grossTotal.toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex justify-between text-text-muted">
                                <span>Total Capacity</span>
                                <span className="font-semibold text-text-primary">{totalKw} kW</span>
                              </div>
                              <div className="flex justify-between font-black text-text-primary pt-1 border-t border-border/60">
                                <span>Total Order Value</span>
                                <span className="font-mono text-sm">₹{grossTotal.toLocaleString("en-IN")}</span>
                              </div>

                              {tokenToDeduct > 0 && (
                                <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                                  <span>Less: Escrow Token Deduction</span>
                                  <span className="font-mono">- ₹{tokenToDeduct.toLocaleString("en-IN")}</span>
                                </div>
                              )}

                              {/* Milestone schedule breakdown */}
                              <div className="p-3 rounded-xl bg-surface-hover/80 border border-border/60 space-y-1.5 mt-2 text-[11px]">
                                <div className="flex justify-between text-amber-700 dark:text-amber-300 font-bold">
                                  <span>Milestone 1 Advance Due Now (30%):</span>
                                  <span className="font-mono">₹{advanceAmount.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between text-text-muted">
                                  <span>Milestone 2 Before Dispatch (70%):</span>
                                  <span className="font-mono">₹{remainingAmount.toLocaleString("en-IN")}</span>
                                </div>
                              </div>

                              {/* Large Amount Due Today Card */}
                              <div className="p-3.5 rounded-2xl bg-primary/10 border-2 border-primary/30 text-center space-y-1 mt-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-primary block">
                                  Amount Due Today ({!reorderPayFull ? "30% Advance" : "100% Full Order"})
                                </span>
                                <div className="text-xl sm:text-2xl font-black text-primary font-mono">
                                  ₹{amountDueToday.toLocaleString("en-IN")}
                                </div>
                                <span className="text-[10px] text-text-muted block">
                                  {!reorderPayFull
                                    ? `Balance ₹${remainingAmount.toLocaleString("en-IN")} due before dispatch`
                                    : "Zero balance due. Cleared for priority dispatch."}
                                </span>
                              </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="pt-3 border-t border-border space-y-2">
                              <button
                                type="submit"
                                disabled={reorderSubmitting || (reorderPaymentMethod !== "online" && !reorderUtr.trim())}
                                className="w-full py-3 rounded-xl bg-primary text-white text-xs font-black shadow-lg hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {reorderSubmitting ? (
                                  <>
                                    <FiLoader size={15} className="animate-spin" />
                                    <span>Placing Reorder...</span>
                                  </>
                                ) : (
                                  <>
                                    <FiCheck size={15} />
                                    <span>Submit Payment for Accounts Verification</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setReorderModal(false)}
                                disabled={reorderSubmitting}
                                className="w-full py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── REQUEST TOKEN REFUND MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {refundModal && refundOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => !refundSubmitting && setRefundModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-border shadow-2xl overflow-hidden z-10 bg-surface"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                      <FaRupeeSign size={14} />
                    </span>
                    <h2 className="text-base font-black text-text-primary">
                      Request Token Refund: {refundOrder.po_number}
                    </h2>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Token settlement and penalty reconciliation for expired or fulfilled Purchase Orders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !refundSubmitting && setRefundModal(false)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {refundSuccess ? (
                <div className="p-6 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <FiCheckCircle size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-text-primary">
                      Refund Request Submitted!
                    </h3>
                    <p className="text-xs text-text-muted">
                      Your refund request has been placed in the Admin / Accounts queue for approval and payment disbursement.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setRefundModal(false);
                      setRefundSuccess(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-md hover:opacity-90 transition-all cursor-pointer"
                  >
                    Done & Return to PO List
                  </button>
                </div>
              ) : refundLoading ? (
                <div className="p-12 text-center space-y-3">
                  <FiLoader size={28} className="animate-spin text-primary mx-auto" />
                  <p className="text-xs text-text-muted">
                    Calculating penalty rules & unpurchased kit balances...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitRefund} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                  {refundError && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 text-xs flex items-center gap-2">
                      <FiAlertCircle size={15} className="shrink-0" />
                      <span>{refundError}</span>
                    </div>
                  )}

                  {/* Penalty & Settlement Metric Strip */}
                  {refundPreview && (
                    <div className="p-4 rounded-2xl bg-surface-hover border border-border space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                        Settlement & Penalty Reconciliation
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-surface border border-border">
                          <div className="text-[10px] text-text-muted">Committed</div>
                          <div className="font-black text-text-primary">{refundPreview.total_committed_qty} Kits</div>
                        </div>
                        <div className="p-2 rounded-xl bg-surface border border-border">
                          <div className="text-[10px] text-blue-600">Purchased</div>
                          <div className="font-black text-blue-600">{refundPreview.total_purchased_qty} Kits</div>
                        </div>
                        <div className="p-2 rounded-xl bg-surface border border-border">
                          <div className="text-[10px] text-rose-600">Unpurchased</div>
                          <div className="font-black text-rose-600">{refundPreview.unpurchased_qty} Kits</div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex justify-between text-text-muted">
                          <span>Token Paid Initially:</span>
                          <span>₹{(refundPreview.token_paid_paise / 100).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                          <span>Token Already Adjusted on Orders:</span>
                          <span>- ₹{(refundPreview.token_adjusted_total_paise / 100).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-text-muted">
                          <span>Escrow Token Balance Available:</span>
                          <span>₹{(refundPreview.token_balance_paise / 100).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between font-bold text-rose-600 pt-1 border-t border-border/40">
                          <span>Applicable Penalty ({refundPreview.penalty_calculation?.rule_type || "Rule"}):</span>
                          <span>- ₹{(refundPreview.applicable_penalty_paise / 100).toLocaleString("en-IN")}</span>
                        </div>
                        {refundPreview.penalty_calculation?.explanation && (
                          <div className="text-[11px] text-text-muted italic bg-surface p-2 rounded-lg border border-border/60">
                            ℹ {refundPreview.penalty_calculation.explanation}
                          </div>
                        )}
                        <div className="flex justify-between font-black text-sm text-emerald-600 dark:text-emerald-400 pt-2 border-t-2 border-border">
                          <span>Net Refundable Token Amount:</span>
                          <span className="font-mono text-base">₹{(refundPreview.refundable_token_paise / 100).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank Account Details Form */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-text-primary">
                      Payout Bank Account Details
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-text-muted mb-1">
                          Account Holder Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={refundForm.account_holder_name}
                          onChange={(e) => setRefundForm({ ...refundForm, account_holder_name: e.target.value })}
                          placeholder="e.g. Apex Solar Solutions"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-text-muted mb-1">
                          Bank Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={refundForm.bank_name}
                          onChange={(e) => setRefundForm({ ...refundForm, bank_name: e.target.value })}
                          placeholder="e.g. HDFC Bank"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-text-muted mb-1">
                          Account Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={refundForm.account_number}
                          onChange={(e) => setRefundForm({ ...refundForm, account_number: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary font-mono text-xs outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-text-muted mb-1">
                          Confirm Account Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={refundForm.confirm_account_number}
                          onChange={(e) => setRefundForm({ ...refundForm, confirm_account_number: e.target.value })}
                          placeholder="Confirm Account No."
                          className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary font-mono text-xs outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Bank IFSC Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={refundForm.ifsc_code}
                        onChange={(e) => setRefundForm({ ...refundForm, ifsc_code: e.target.value })}
                        placeholder="e.g. HDFC0001234"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary font-mono text-xs uppercase outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-muted mb-1">
                        Notes / Remarks
                      </label>
                      <input
                        type="text"
                        value={refundForm.notes}
                        onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                        placeholder="Optional remarks for accounts team"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setRefundModal(false)}
                      disabled={refundSubmitting}
                      className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={refundSubmitting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-lg hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {refundSubmitting ? (
                        <>
                          <FiLoader size={14} className="animate-spin" />
                          <span>Submitting Request...</span>
                        </>
                      ) : (
                        <>
                          <FiCheck size={14} />
                          <span>Submit Token Refund Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EPC TOKEN DEPOSIT MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {tokenModal && tokenOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => !tokenSubmitting && setTokenModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10 bg-surface border-border"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Stage 3 of 4
                    </span>
                    <h2 className="text-base font-black text-text-primary flex items-center gap-1.5">
                      <FaRupeeSign className="text-emerald-600" /> Pay EPC Token Deposit
                    </h2>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    PO Order: <strong className="font-mono text-text-primary">{tokenOrder.po_number}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTokenModal(false)}
                  disabled={tokenSubmitting}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {tokenSuccess ? (
                <div className="p-8 space-y-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md">
                    <FiCheckCircle size={32} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-text-primary">
                      Token Deposit Recorded Successfully!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                      PO is now Officially STARTED (Stage 3 Complete ✓)
                    </p>
                    <p className="text-xs text-text-muted max-w-md mx-auto">
                      Your token deposit of ₹{tokenAmountINR.toLocaleString("en-IN")} has been credited to escrow. Your quota prices are now locked.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTokenModal(false);
                      setTokenSuccess(false);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                  >
                    Close & View Order
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitTokenPayment} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                  {/* Strict Workflow Rule */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                    <div className="font-black flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <FiAlertCircle size={15} className="shrink-0 text-amber-600" />
                      Strict Workflow Rule:
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      <strong>Purchase Order will not commence until the token deposit is paid.</strong> The onboarded EPC Partner must complete their token deposit first. Once received, the PO will officially start.
                    </p>
                  </div>

                  {tokenError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                      <FiAlertCircle size={16} className="shrink-0" />
                      <span>{tokenError}</span>
                    </div>
                  )}

                  {/* Escrow Bank Account Card */}
                  <div className="p-4 rounded-2xl bg-surface-hover/80 border border-border text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase tracking-wider text-[10px] text-text-muted flex items-center gap-1">
                        <FiShield size={12} className="text-emerald-500" /> Official Escrow Account
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">Verified ICICI Corporate</span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Account Name:</span>
                        <span className="font-bold text-text-primary">{escrowBank.account_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted">Account Number:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-text-primary">
                            {iciciVanDetails?.account_number || escrowBank.account_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(iciciVanDetails?.account_number || escrowBank.account_number, "modal_acc")}
                            className="text-primary hover:underline text-[10px] font-bold"
                          >
                            {copiedField === "modal_acc" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted">IFSC Code:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-text-primary">
                            {iciciVanDetails?.ifsc_code || escrowBank.ifsc_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(iciciVanDetails?.ifsc_code || escrowBank.ifsc_code, "modal_ifsc")}
                            className="text-primary hover:underline text-[10px] font-bold"
                          >
                            {copiedField === "modal_ifsc" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted">UPI ID:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-text-primary">{escrowBank.upi_id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(escrowBank.upi_id, "modal_upi")}
                            className="text-primary hover:underline text-[10px] font-bold"
                          >
                            {copiedField === "modal_upi" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Token Deposit Amount (INR) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={tokenAmountINR}
                        onChange={(e) => setTokenAmountINR(Math.max(1, parseInt(e.target.value, 10) || 0))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary font-black text-sm outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Payment UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ICIC123456789 or 20261008001"
                        value={tokenUtr}
                        onChange={(e) => setTokenUtr(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary font-mono text-xs uppercase outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-text-primary mb-1">
                          Sender Bank Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Bank, SBI"
                          value={tokenBank}
                          onChange={(e) => setTokenBank(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-text-primary mb-1">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          value={tokenDate}
                          onChange={(e) => setTokenDate(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">
                        Payment Receipt Slip / Screenshot (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setTokenReceiptFile(e.target.files[0] || null)}
                        className="block w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-bold cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setTokenModal(false)}
                      disabled={tokenSubmitting}
                      className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={tokenSubmitting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-lg hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {tokenSubmitting ? (
                        <>
                          <FiLoader size={14} className="animate-spin" />
                          <span>Recording Deposit...</span>
                        </>
                      ) : (
                        <>
                          <FiCheck size={14} />
                          <span>Confirm & Submit Token Deposit</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

      {/* ── 1. PO ORDER CONTRACT & MOBILE OTP SIGNING MODAL ────────────────── */}
      <AnimatePresence>
        {contractModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
                    <FiFileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-primary">
                      {contractStep === "review" && "Review & Digitally Sign PO Contract"}
                      {contractStep === "otp" && "Mobile OTP Verification"}
                      {contractStep === "signed" && "PO Contract Signed & Verified ✓"}
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      PO Reference: <span className="font-mono font-bold text-text-primary">{contractOrder?.po_number}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContractModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center text-text-muted hover:text-text-primary transition-all cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {contractLoading ? (
                  <div className="py-20 text-center space-y-3">
                    <FiLoader className="animate-spin text-primary mx-auto" size={32} />
                    <p className="text-xs text-text-muted">Loading official PO contract terms...</p>
                  </div>
                ) : contractError ? (
                  <div className="p-4 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 text-xs flex items-start gap-2.5">
                    <FiAlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold">Notice:</div>
                      <div>{contractError}</div>
                    </div>
                  </div>
                ) : null}

                {/* STEP 1: REVIEW CONTRACT & ENTER SIGNATORY DETAILS */}
                {contractStep === "review" && contractDetails && (
                  <div className="space-y-5">
                    {/* Legal Document Container */}
                    <div className="p-5 rounded-2xl bg-white text-slate-800 border border-slate-300 shadow-inner text-xs font-serif leading-relaxed space-y-4 max-h-[380px] overflow-y-auto">
                      <div className="text-center pb-3 border-b border-slate-300">
                        <div className="text-[10px] font-sans font-black tracking-widest text-emerald-700 uppercase">SOLARKITS OFFICIAL PO AGREEMENT</div>
                        <div className="text-sm font-sans font-black text-slate-900 mt-0.5">{contractDetails.contract_content?.contract_title}</div>
                        <div className="text-[10px] font-sans text-slate-500 mt-0.5">PO Ref: {contractOrder?.po_number} • Version {contractDetails.contract_content?.contract_version}</div>
                      </div>

                      {/* Parties */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-sans grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 block uppercase">Franchise Partner:</span>
                          <span className="font-bold text-slate-900">{contractDetails.franchisee?.business_name}</span>
                          <span className="block text-[10px] text-slate-500">{contractDetails.franchisee?.mobile}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 block uppercase">Solar EPC Contractor:</span>
                          <span className="font-bold text-slate-900">{contractDetails.epc?.company_name}</span>
                          <span className="block text-[10px] text-slate-500">Reg: {contractDetails.epc?.masked_mobile}</span>
                        </div>
                      </div>

                      {/* Preamble */}
                      <p className="text-[11px] text-slate-700 italic border-l-2 border-emerald-600 pl-2.5 py-0.5">
                        {contractDetails.contract_content?.terms_introduction}
                      </p>

                      {/* Committed Kits & Token */}
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-300 font-sans text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Product / Combo Kit:</span>
                          <span className="font-bold text-slate-900">{contractDetails.item_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Allocated Commitment Quantity:</span>
                          <span className="font-black text-emerald-800">{contractDetails.allocated_quantity} Combo Kit(s)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Required Token Commitment Deposit:</span>
                          <span className="font-black text-emerald-800">₹{contractDetails.token_amount_inr?.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500">Commitment Validity Window:</span>
                          <span className="font-bold text-slate-700">{contractDetails.contract_content?.validity_days} Days from Execution</span>
                        </div>
                      </div>

                      {/* Clauses */}
                      <div className="space-y-3 pt-1">
                        {(contractDetails.contract_content?.clauses || []).map((c, i) => (
                          <div key={i} className="space-y-0.5">
                            <div className="font-sans font-bold text-slate-900 text-xs flex items-center justify-between">
                              <span>{c.title}</span>
                              {c.is_mandatory && <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">Mandatory</span>}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal pl-2 border-l border-slate-200">
                              {c.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Signatory Inputs Form */}
                    <div className="p-4 rounded-2xl bg-surface-hover/50 border border-border space-y-3.5">
                      <div className="text-xs font-bold text-text-primary flex items-center gap-2">
                        <FiUser size={14} className="text-primary" /> Authorized Signatory Information
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-text-secondary mb-1">
                            Signatory Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={contractSignerName}
                            onChange={(e) => setContractSignerName(e.target.value)}
                            placeholder="Enter your full legal name"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-text-secondary mb-1">Designation</label>
                          <input
                            type="text"
                            value={contractSignerDesignation}
                            onChange={(e) => setContractSignerDesignation(e.target.value)}
                            placeholder="e.g. Managing Director / Partner"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>

                      {/* Registered Mobile Notice */}
                      <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] flex items-center gap-2">
                        <FiPhone size={14} className="shrink-0 text-blue-600" />
                        <span>
                          6-digit OTP will be dispatched to your registered mobile number:{" "}
                          <strong className="font-mono">{contractDetails.epc?.masked_mobile || "Registered Mobile"}</strong>
                        </span>
                      </div>

                      {/* Agreement Checkbox */}
                      <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={contractAgreed}
                          onChange={(e) => setContractAgreed(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs text-text-secondary">
                          I confirm that I am an authorized representative of <strong>{contractDetails.epc?.company_name}</strong>. I have read, understood, and irrevocably agree to all clauses, token commitments, and terms of this Purchase Order Contract.
                        </span>
                      </label>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setContractModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSendContractOtp}
                        disabled={contractOtpSending || !contractAgreed || !contractSignerName.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black shadow-lg hover:opacity-95 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {contractOtpSending ? <FiLoader className="animate-spin" size={14} /> : <FiShield size={14} />}
                        <span>{contractOtpSending ? "Dispatching OTP..." : "Proceed to Mobile OTP Verification →"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: ENTER OTP & DIGITALLY VERIFY */}
                {contractStep === "otp" && (
                  <form onSubmit={handleVerifyContractOtp} className="space-y-6 py-4 max-w-md mx-auto text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                      <FiShield size={32} />
                    </div>

                    <div>
                      <h4 className="text-base font-black text-text-primary">Enter Mobile Verification Code</h4>
                      <p className="text-xs text-text-muted mt-1">
                        We have dispatched a 6-digit OTP to your registered mobile number:{" "}
                        <strong className="text-text-primary font-mono">{contractMaskedMobile}</strong>
                      </p>
                    </div>

                    {contractError && (
                      <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                        {contractError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={contractOtp}
                        onChange={(e) => setContractOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        autoFocus
                        className="w-48 text-center py-3 text-2xl font-mono tracking-widest rounded-2xl border-2 border-primary/40 bg-surface text-text-primary focus:outline-none focus:border-primary shadow-sm mx-auto block"
                      />
                      <div className="text-[11px] text-text-muted">
                        Code expires in 10 minutes.
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs">
                      {contractOtpCountdown > 0 ? (
                        <span className="text-text-muted">Resend OTP in <strong>{contractOtpCountdown}s</strong></span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendContractOtp}
                          disabled={contractOtpSending}
                          className="font-bold text-primary hover:underline cursor-pointer"
                        >
                          Resend Mobile OTP Code
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setContractStep("review")}
                        className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
                      >
                        ← Back to Terms
                      </button>
                      <button
                        type="submit"
                        disabled={contractOtpVerifying || contractOtp.length < 4}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-lg hover:opacity-95 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {contractOtpVerifying ? <FiLoader className="animate-spin" size={14} /> : <FiCheckCircle size={14} />}
                        <span>{contractOtpVerifying ? "Verifying..." : "Verify & Digitally Sign Contract"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: SUCCESS STATE */}
                {contractStep === "signed" && (
                  <div className="py-8 text-center space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                      <FiCheckCircle size={36} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-emerald-700 dark:text-emerald-400">PO Contract Digitally Signed & Sealed!</h4>
                      <p className="text-xs text-text-muted mt-1">
                        Your electronic signature has been verified and permanently bound to Purchase Order <strong>{contractOrder?.po_number}</strong>.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 text-left font-mono space-y-1">
                      <div>Signer: <strong>{contractSignerName}</strong> ({contractSignerDesignation})</div>
                      <div>Mobile: <strong>{contractMaskedMobile}</strong> (OTP Verified)</div>
                      <div>Status: <strong>AUTHENTICATED ✓</strong></div>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setContractModalOpen(false);
                          if (contractOrder && contractAlloc) {
                            handleOpenTokenModal(contractOrder, contractAlloc);
                          }
                        }}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-lg hover:opacity-95 transition-all cursor-pointer"
                      >
                        💳 Proceed to Pay Token Deposit Now →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 2. VIEW SIGNED CONTRACT DOCUMENT MODAL ───────────────────────── */}
      <AnimatePresence>
        {viewSignedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                    <FiShield size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-text-primary">Digitally Signed Purchase Order Contract</h3>
                    <p className="text-[11px] text-text-muted">
                      Contract Ref: <span className="font-mono font-bold text-emerald-600">{viewSignedData?.contract?.contract_number || "CNT-SOLARKITS"}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewSignedModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-surface-hover flex items-center justify-center text-text-muted hover:text-text-primary transition-all cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {viewSignedLoading ? (
                  <div className="py-20 text-center">
                    <FiLoader className="animate-spin text-primary mx-auto" size={32} />
                    <p className="text-xs text-text-muted mt-2">Loading signed contract document...</p>
                  </div>
                ) : viewSignedData ? (
                  <div className="space-y-4">
                    {/* Legal Document Container */}
                    <div className="p-6 rounded-2xl bg-white text-slate-800 border border-slate-300 shadow-inner text-xs font-serif leading-relaxed space-y-4">
                      <div className="text-center pb-3 border-b border-slate-300">
                        <div className="text-[10px] font-sans font-black tracking-widest text-emerald-700 uppercase">SOLARKITS EXECUTED PURCHASE ORDER CONTRACT</div>
                        <div className="text-base font-sans font-black text-slate-900 mt-1">{viewSignedData.rendered_content?.contract_title}</div>
                        <div className="text-[10px] font-sans text-slate-500 mt-0.5">PO Ref: {viewSignedData.po_number} • Contract No: {viewSignedData.contract?.contract_number}</div>
                      </div>

                      {/* Parties */}
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-sans grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 block uppercase">Franchise Partner:</span>
                          <span className="font-bold text-slate-900">{viewSignedData.franchisee?.business_name || "SolarKits Partner"}</span>
                          <span className="block text-[10px] text-slate-500">{viewSignedData.franchisee?.mobile}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 block uppercase">Solar EPC Contractor:</span>
                          <span className="font-bold text-slate-900">{viewSignedData.epc?.company_name || viewSignedData.epc?.name}</span>
                          <span className="block text-[10px] text-slate-500">GST: {viewSignedData.epc?.gstin || "N/A"}</span>
                        </div>
                      </div>

                      {/* Preamble */}
                      <p className="text-[11px] text-slate-700 italic border-l-2 border-emerald-600 pl-2.5 py-0.5">
                        {viewSignedData.rendered_content?.terms_introduction}
                      </p>

                      {/* Committed Details */}
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-300 font-sans text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Product / Combo Kit:</span>
                          <span className="font-bold text-slate-900">{viewSignedData.item_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Committed Quantity:</span>
                          <span className="font-black text-emerald-800">{viewSignedData.allocated_quantity} Combo Kit(s)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Committed Token Deposit:</span>
                          <span className="font-black text-emerald-800">₹{viewSignedData.token_amount_inr?.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Clauses */}
                      <div className="space-y-3 pt-1">
                        {(viewSignedData.rendered_content?.clauses || []).map((c, i) => (
                          <div key={i} className="space-y-0.5">
                            <div className="font-sans font-bold text-slate-900 text-xs flex items-center justify-between">
                              <span>{c.title}</span>
                              {c.is_mandatory && <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">Mandatory</span>}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal pl-2 border-l border-slate-200">
                              {c.body}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Digital Seal & Stamp Block */}
                      <div className="mt-6 pt-4 border-t-2 border-slate-300 font-sans grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 rounded-xl border border-dashed border-slate-300 text-center space-y-1">
                          <div className="font-bold text-slate-700">Franchise Partner</div>
                          <div className="text-[10px] text-slate-500">{viewSignedData.franchisee?.business_name}</div>
                          <div className="text-[9px] text-emerald-600 font-bold">ALLOCATED & COMMITTED</div>
                        </div>
                        <div className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 text-center space-y-1">
                          <div className="font-black text-emerald-900">Digitally Signed & Sealed ✓</div>
                          <div className="text-[10px] font-bold text-slate-800">{viewSignedData.contract?.signer_name}</div>
                          <div className="text-[9px] text-slate-500">{viewSignedData.contract?.signer_designation}</div>
                          <div className="text-[9px] font-mono text-emerald-700 font-bold">
                            OTP Verified: {viewSignedData.contract?.otp_verified_at ? new Date(viewSignedData.contract.otp_verified_at).toLocaleString("en-IN") : "Verified"}
                          </div>
                          <div className="text-[8px] text-slate-400 font-mono">IP: {viewSignedData.contract?.signed_ip || "127.0.0.1"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-surface-hover/30">
                <span className="text-[10px] text-text-muted">Legally binding under IT Act 2000.</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-primary hover:bg-surface-hover transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>🖨️ Print / Save Document</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </AnimatePresence>
    </div>
  );
}
