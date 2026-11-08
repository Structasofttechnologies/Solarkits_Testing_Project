import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  FaFileInvoiceDollar,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaMoneyBillWave,
  FaUsers,
  FaEye,
  FaTimes,
  FaReceipt,
  FaBuilding,
  FaSolarPanel,
  FaBolt,
  FaBoxes,
  FaShieldAlt,
  FaInfoCircle,
  FaPhone,
  FaEnvelope,
  FaExternalLinkAlt,
  FaCheck,
  FaCopy,
  FaTruckMoving,
  FaArrowRight,
  FaLayerGroup,
  FaSyncAlt,
  FaLock,
  FaShoppingCart
} from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";
import Loader from "@/components/Loader";
import Product8StageJourneyModal from "../../components/Product8StageJourneyModal";
import PoContractModal from "@/components/PoContractModal";

const API_URL = import.meta.env.VITE_API_URL;

const parseKitCapacity = (val, name = "") => {
  if (typeof val === "number" && !isNaN(val) && val > 0) return val;
  if (val != null) {
    const s = String(val).replace(/kw/ig, "").trim();
    const match = s.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  if (name) {
    const kwMatch = String(name).match(/(\d+(?:\.\d+)?)\s*(?:k\.?\s*w\.?|kw|kilowatt)/i);
    if (kwMatch) {
      const num = parseFloat(kwMatch[1]);
      if (!isNaN(num) && num > 0) return num;
    }
    const anyMatch = String(name).match(/(\d+(?:\.\d+)?)/);
    if (anyMatch) {
      const num = parseFloat(anyMatch[1]);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 3;
};

const STATUS_BADGES = {
  DRAFT: { label: "Draft", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300" },
  SUBMITTED: { label: "Submitted", bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
  APPROVED: { label: "Approved (Awaiting Payment)", bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
  REJECTED: { label: "Rejected", bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
  AWAITING_PAYMENT: { label: "Awaiting Payment", bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
  PARTIALLY_PAID: { label: "Partially Paid", bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400" },
  VALIDATED: { label: "Validated (Active PO Quota)", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  PAID: { label: "1. Confirmed (Paid)", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  CONFIRMED: { label: "1. Confirmed", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  STOCK_ALLOCATED: { label: "2. Processing", bg: "bg-cyan-50 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400" },
  PROCESSING: { label: "2. Processing", bg: "bg-cyan-50 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400" },
  VEHICLE_ASSIGNED: { label: "3. Vehicle Assigned", bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300" },
  READY_FOR_DISPATCH: { label: "4. Ready for Dispatch", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  PARTIALLY_DISPATCHED: { label: "5. Dispatched", bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  DISPATCHED: { label: "5. Dispatched", bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  IN_TRANSIT: { label: "6. In Transit", bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  REACHED_DESTINATION: { label: "7. Reached Dest.", bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300" },
  DELIVERED: { label: "8. Delivered", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  COMPLETED: { label: "8. Settled & Completed", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400" },
};

function getStageBadgeText(status) {
  const norm = String(status || "SUBMITTED").toUpperCase();
  const map = {
    CONFIRMED: "Stage 1/8",
    PAID: "Stage 1/8",
    VALIDATED: "Stage 1/8",
    APPROVED: "Stage 1/8",
    SUBMITTED: "Stage 1/8",
    PROCESSING: "Stage 2/8",
    STOCK_ALLOCATED: "Stage 2/8",
    VEHICLE_ASSIGNED: "Stage 3/8",
    READY_FOR_DISPATCH: "Stage 4/8",
    PARTIALLY_DISPATCHED: "Stage 5/8",
    DISPATCHED: "Stage 5/8",
    IN_TRANSIT: "Stage 6/8",
    REACHED_DESTINATION: "Stage 7/8",
    DELIVERED: "Stage 8/8 ✓",
    COMPLETED: "Stage 8/8 ✓",
  };
  return map[norm] || "Stage 1/8";
}

function StatusBadge({ status }) {
  const norm = String(status || "SUBMITTED").toUpperCase();
  const cfg = STATUS_BADGES[norm] || STATUS_BADGES.SUBMITTED;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black border border-current/20 ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export default function FranchiseePoOrdersAccounts() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractModalPoId, setContractModalPoId] = useState(null);
  const [contractModalEpcId, setContractModalEpcId] = useState(null);

  const handleOpenContractModal = (poId, epcId) => {
    setContractModalPoId(poId);
    setContractModalEpcId(epcId);
    setContractModalOpen(true);
  };
  const [modalTab, setModalTab] = useState("overview"); // "overview" | "token" | "epc_pool" | "repeat_orders"

  // Parent Payment / Token Confirmation Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRefInput, setPaymentRefInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [verifyingEpcReceipt, setVerifyingEpcReceipt] = useState(null); // { poId, epcBuyerId, action }

  // Child Repeat Order Payment Confirmation Modal State
  const [childPaymentModal, setChildPaymentModal] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const handleCopyText = (text, key) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }; // childOrder object
  const [childPaymentRefInput, setChildPaymentRefInput] = useState("");

  // 8-Step Journey Modal State
  const [journeyOrder, setJourneyOrder] = useState(null);
  const [journeyProduct, setJourneyProduct] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/franchisee/po/list?unique_id=ACC_PO&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setOrders(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load accounts PO orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSingleOrder = async (orderId) => {
    try {
      const res = await axios.get(
        `${API_URL}/franchisee/po/${orderId}?unique_id=ACC_PO&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success" && res.data.data) {
        setSelectedOrder(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load single order details:", err);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handlePaymentReceived = (event) => {
      console.log("⚡ [FranchiseePoOrdersAccounts] Live payment event received, refreshing PO orders...", event.detail);
      fetchOrders();
    };

    window.addEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
    return () => window.removeEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
  }, [fetchOrders]);

  // Confirm Parent PO Token Deposit
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/franchisee/po/confirm-payment?unique_id=ACC_PO&req_for=edit`,
        {
          order_id: selectedOrder._id,
          payment_reference: paymentRefInput || `UTR-ACC-${Date.now()}`,
          payment_mode: "BANK_TRANSFER",
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setAlertMsg({ type: "success", text: "PO token deposit verified and confirmed successfully! PO Quota is active." });
        setShowPaymentModal(false);
        setPaymentRefInput("");
        await fetchSingleOrder(selectedOrder._id);
        fetchOrders();
      }
    } catch (err) {
      setAlertMsg({ type: "error", text: err.response?.data?.message || "Payment verification failed." });
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Child Repeat Order Payment
  const handleConfirmChildPayment = async (e) => {
    e.preventDefault();
    if (!childPaymentModal) return;
    setActionLoading(true);
    try {
      const isM2 = childPaymentModal.target_milestone === 2;
      const effectiveRef = isM2
        ? (childPaymentModal.offline_payment_m2?.utr_number || childPaymentModal.payment_milestones?.milestones?.find(m => m.milestone_number === 2)?.utr_number || childPaymentRefInput)
        : (childPaymentModal.payment_reference || childPaymentModal.offline_payment?.utr_number || childPaymentRefInput);

      const res = await axios.post(
        `${API_URL}/franchisee/po/confirm-payment?unique_id=ACC_PO&req_for=edit`,
        {
          order_id: childPaymentModal._id,
          milestone_number: childPaymentModal.target_milestone || 1,
          payment_reference: effectiveRef || `UTR-ACC-${Date.now()}`,
          payment_mode: "BANK_TRANSFER",
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setAlertMsg({
          type: "success",
          text: `Repeat Order ${childPaymentModal.order_number || childPaymentModal.po_number} payment verified successfully! Parent PO quota deducted & order sent to New Orders queue.`,
        });
        setChildPaymentModal(null);
        setChildPaymentRefInput("");
        if (selectedOrder?._id) {
          await fetchSingleOrder(selectedOrder._id);
        }
        fetchOrders();
      }
    } catch (err) {
      setAlertMsg({ type: "error", text: err.response?.data?.message || "Child payment verification failed." });
    } finally {
      setActionLoading(false);
    }
  };

  // Verify / Reject EPC Receipt Slip
  const handleVerifyEpcReceipt = async (poId, epcBuyerId, action, rejectionNote = "") => {
    setVerifyingEpcReceipt({ poId, epcBuyerId, action });
    try {
      const res = await axios.post(
        `${API_URL}/franchisee/po/verify-epc-receipt?unique_id=ACC_PO&req_for=edit`,
        {
          po_id: poId,
          epc_buyer_id: epcBuyerId,
          action,
          rejection_note: rejectionNote || undefined,
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setAlertMsg({
          type: "success",
          text: res.data.message || (action === "reject" ? "EPC Receipt rejected." : "EPC Payment verified successfully!"),
        });
        if (selectedOrder?._id) {
          await fetchSingleOrder(selectedOrder._id);
        }
        fetchOrders();
      } else {
        setAlertMsg({ type: "error", text: res.data?.message || "Failed to process receipt." });
      }
    } catch (err) {
      setAlertMsg({ type: "error", text: err.response?.data?.message || "Action failed." });
    } finally {
      setVerifyingEpcReceipt(null);
    }
  };

  // Financial Metrics
  const totalVolumePaise = orders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0);
  const paidVolumePaise = orders
    .filter((o) => ["PAID", "STOCK_ALLOCATED", "PROCESSING", "DISPATCHED", "DELIVERED", "COMPLETED", "VALIDATED"].includes(o.status))
    .reduce((sum, o) => sum + (o.grand_total_paise || 0), 0);
  const awaitingClearanceCount = orders.filter((o) => ["APPROVED", "AWAITING_PAYMENT", "SUBMITTED"].includes(o.status) || (o.token_amount_paise > 0 && o.token_payment_status !== "PAID")).length;
  const totalKitsCount = orders.reduce((sum, o) => sum + (o.total_booked_quantity || o.total_quantity || o.items?.[0]?.quantity || 0), 0);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === "RECEIPT_PENDING") {
        return (o.items || []).some((item) =>
          (item.epc_allocations || []).some((a) => a.payment_status === "RECEIPT_SUBMITTED")
        );
      }
      if (statusFilter && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const num = (o.po_number || "").toLowerCase();
        const fName = (o.franchisee_id?.business_name || "").toLowerCase();
        const kitName = (o.items?.[0]?.item_name || "").toLowerCase();
        return num.includes(q) || fName.includes(q) || kitName.includes(q);
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="space-y-6 pb-24">
      {/* Alert Banner */}
      {alertMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${alertMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-red-500/10 border-red-500/30 text-red-600"
            }`}
        >
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="cursor-pointer font-black text-sm">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <FaReceipt size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary">
              Franchisee PO Orders & Invoicing Hub
            </h1>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Accounts workspace for managing Franchisee POs, Escrow Token verification, Onboarded EPCs, and Linked Drawdown Repeat Orders.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="px-4 py-2.5 rounded-xl bg-surface-hover hover:bg-border text-text-primary text-xs font-bold border border-border transition-all cursor-pointer self-start sm:self-auto flex items-center gap-2 shadow-xs"
        >
          <FaSyncAlt size={12} className={loading ? "animate-spin text-primary" : ""} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/20">
            <FaMoneyBillWave size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Total PO Volume</div>
            <div className="text-xl font-black text-text-primary mt-0.5">
              ₹{(totalVolumePaise / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-text-muted">{orders.length} Purchase Orders</div>
          </div>
        </div>

        <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-600 border border-emerald-500/20">
            <FaCheckCircle size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Verified Volume</div>
            <div className="text-xl font-black text-text-primary mt-0.5">
              ₹{(paidVolumePaise / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold">Cleared via Bank/UTR</div>
          </div>
        </div>

        <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-600 border border-indigo-500/20">
            <FaClock size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Awaiting Clearance</div>
            <div className="text-xl font-black text-text-primary mt-0.5">{awaitingClearanceCount} Orders</div>
            <div className="text-[10px] text-indigo-600 font-bold">Pending Token / Settle</div>
          </div>
        </div>

        <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-600 border border-amber-500/20">
            <FaFileInvoiceDollar size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Total Units Booked</div>
            <div className="text-xl font-black text-text-primary mt-0.5">{totalKitsCount} Kits</div>
            <div className="text-[10px] text-text-muted">Master Quota Across Partners</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 border-2 border-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PO Number, Franchisee, or Kit..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-surface text-text-primary focus:outline-hidden focus:border-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer"
        >
          <option value="">All Accounts Statuses</option>
          <option value="AWAITING_PAYMENT">Awaiting Payment</option>
          <option value="APPROVED">Approved (Pending Payment)</option>
          <option value="VALIDATED">Validated (Active Quota)</option>
          <option value="PAID">Payment Verified (Paid)</option>
          <option value="PROCESSING">Processing</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="DELIVERED">Delivered</option>
          <option value="COMPLETED">Settled & Completed</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader text="Loading Franchisee PO Accounts Records..." />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-2">
            <FaReceipt size={32} className="mx-auto opacity-40 text-primary" />
            <p className="text-sm font-bold text-text-primary">No Franchisee Purchase Orders Found</p>
            <p className="text-xs">Franchisee PO orders with financial payment terms will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover border-b border-border text-[11px] font-black uppercase text-text-muted">
                <tr>
                  <th className="py-3.5 px-4">PO Details</th>
                  <th className="py-3.5 px-4">Franchisee Partner</th>
                  <th className="py-3.5 px-4">Product / Kit</th>
                  <th className="py-3.5 px-4">Quota Progress</th>
                  <th className="py-3.5 px-4">Token Escrow</th>
                  <th className="py-3.5 px-4">EPCs & Drawdowns</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => {
                  const item = order.items?.[0] || {};
                  const allocationsList = item.epc_allocations || [];
                  const bookedQuota = order.total_booked_quantity || order.total_quantity || item.quantity || 0;
                  const fulfilledQuota = order.fulfilled_quantity || 0;
                  const remainingQuota = order.remaining_quantity != null ? order.remaining_quantity : Math.max(0, bookedQuota - fulfilledQuota);
                  const progressPct = bookedQuota > 0 ? Math.min(100, Math.round((fulfilledQuota / bookedQuota) * 100)) : 0;
                  const tokenAmt = (order.token_amount_paise || order.token_paid_paise || 0) / 100;
                  const tokenStatus = order.token_payment_status || (["PAID", "VALIDATED", "COMPLETED"].includes(order.status) ? "PAID" : "PENDING");
                  const repeatOrdersCount = (order.linked_repeat_orders || []).length;
                  const isCombinePo = order.po_category === "COMBINE_PO";

                  const orderPenaltyRs = order.penalty_amount != null
                    ? Number(order.penalty_amount)
                    : ((order.applicable_penalty_paise || 0) / 100);

                  const orderRealizedComm = order.franchisee_realized_commission_amount != null
                    ? Number(order.franchisee_realized_commission_amount)
                    : (order.franchisee_realized_commission_paise != null
                      ? Number(order.franchisee_realized_commission_paise) / 100
                      : null);

                  return (
                    <tr key={order._id} className="hover:bg-surface-hover/50 transition-colors">
                      {/* PO Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-text-primary text-xs">
                          {order.po_number}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {new Date(order.created_at || order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${isCombinePo
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                          : allocationsList.length > 0
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
                          }`}>
                          {isCombinePo
                            ? `Combine PO (${allocationsList.length} EPCs)`
                            : allocationsList.length > 0
                              ? `Single PO (${allocationsList[0].company_name || allocationsList[0].buyer_name || "1 EPC"})`
                              : "Single PO (Warehouse)"}
                        </span>
                      </td>

                      {/* Franchisee Partner */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text-primary">
                          {order.franchisee_id?.business_name || "Franchisee Account"}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {order.franchisee_id?.mobile || order.franchisee_id?.email || "Partner"}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 max-w-[220px]">
                          <img
                            src={
                              item.kit_image ||
                              "https://res.cloudinary.com/dggmbagax/image/upload/v1788328068/solarkits/solarkits-admin-panel-backend/public/uploads/combo_kits/KIT_1788328066633_236114742.jpg"
                            }
                            alt={item.item_name || "Solar Kit"}
                            className="w-10 h-10 rounded-xl object-cover border border-border shrink-0 bg-surface shadow-xs"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://placehold.co/100x100?text=Solar+Kit";
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-text-primary text-xs truncate" title={item.item_name}>
                              {item.item_name || "Solar Kit"}
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {parseKitCapacity(item.capacity, item.item_name)} kW • {item.brand_name || "Tier-1"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Live Quota Progress */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-text-primary">{fulfilledQuota} / {bookedQuota} Kits</span>
                          <span className={`text-[10px] font-black ${remainingQuota === 0 ? "text-emerald-600" : "text-primary"}`}>
                            {remainingQuota === 0 ? "100% Complete" : `${remainingQuota} Rem.`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-1.5 shadow-inner">
                          <div
                            className={`h-full transition-all duration-300 ${remainingQuota === 0 ? "bg-emerald-500" : "bg-primary"}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="text-[9px] text-text-muted mt-1 space-y-0.5">
                          <div>Fulfilled: {fulfilledQuota} • Rem: {remainingQuota} kits</div>
                          {order.po_ending_date && (
                            <div className="text-[9px] text-text-muted font-medium">
                              Due: {new Date(order.po_ending_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          )}
                          {orderPenaltyRs > 0 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-300">
                              EPC Penalty: ₹{orderPenaltyRs.toLocaleString("en-IN")}
                            </span>
                          )}
                          {orderRealizedComm != null && orderRealizedComm > 0 && (
                            <div className="text-[9px] text-emerald-600 font-bold">
                              Comm: ₹{orderRealizedComm.toLocaleString("en-IN")} ({order.commission_completion_ratio || `${fulfilledQuota}/${bookedQuota}`})
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Token Escrow */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-text-primary text-xs">
                          ₹{tokenAmt.toLocaleString("en-IN")}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black mt-1 ${tokenStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}>
                          {tokenStatus === "PAID" ? "✓ Verified Token" : "⏳ Token Pending"}
                        </span>
                      </td>

                      {/* EPCs & Drawdowns */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-primary">
                            <FaUsers size={11} className="text-primary" /> {allocationsList.length} EPC(s) Allocated
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400">
                            <FaShoppingCart size={10} /> {repeatOrdersCount} Drawdown(s) Placed
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setModalTab("overview");
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-primary text-white hover:opacity-90 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                          >
                            Manage PO Hub
                          </button>
                          <button
                            onClick={() => {
                              setJourneyOrder(order);
                              setJourneyProduct(item);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-surface-hover hover:bg-border text-text-primary border border-border transition-all cursor-pointer whitespace-nowrap"
                            title="Product 8-Step Lifecycle"
                          >
                            <FaTruckMoving size={12} className="inline mr-1" /> Journey
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

      {/* ── UNIFIED 4-TAB MASTER PO HUB MODAL ──────────────────────────────── */}
      {selectedOrder && (() => {
        const orderItem = selectedOrder.items?.[0] || {};
        const kitCapacity = parseKitCapacity(orderItem.capacity, orderItem.item_name);
        const bookedQuota = selectedOrder.total_booked_quantity || selectedOrder.total_quantity || orderItem.quantity || 1;
        const fulfilledQuota = selectedOrder.fulfilled_quantity || 0;
        const remainingQuota = selectedOrder.remaining_quantity != null ? selectedOrder.remaining_quantity : Math.max(0, bookedQuota - fulfilledQuota);
        const progressPct = bookedQuota > 0 ? Math.min(100, Math.round((fulfilledQuota / bookedQuota) * 100)) : 0;

        const subtotalRs = (selectedOrder.subtotal_paise || 0) / 100;
        const taxRs = (selectedOrder.tax_total_paise || 0) / 100;
        const grandTotalRs = (selectedOrder.grand_total_paise || 0) / 100;
        const unitPriceRs = orderItem.unit_price_paise ? (orderItem.unit_price_paise / 100) : (subtotalRs / bookedQuota);

        const franchiseeMarginRs = selectedOrder.franchisee_commission_amount != null && Number(selectedOrder.franchisee_commission_amount) > 0
          ? Number(selectedOrder.franchisee_commission_amount)
          : (selectedOrder.total_commission_paise != null && Number(selectedOrder.total_commission_paise) > 0
            ? Number(selectedOrder.total_commission_paise) / 100
            : (orderItem.commission_method === 'TIER_FIXED' && orderItem.commission_snapshot > 0
              ? Number(orderItem.commission_snapshot) / 100
              : null));

        const effectivePerKitMargin = franchiseeMarginRs != null && bookedQuota > 0
          ? Math.round(franchiseeMarginRs / bookedQuota)
          : (selectedOrder.commission_per_kit || null);

        const realizedMarginRs = selectedOrder.franchisee_realized_commission_amount != null
          ? Number(selectedOrder.franchisee_realized_commission_amount)
          : (selectedOrder.franchisee_realized_commission_paise != null
            ? Number(selectedOrder.franchisee_realized_commission_paise) / 100
            : (franchiseeMarginRs != null ? Math.round(franchiseeMarginRs * (fulfilledQuota / (bookedQuota || 1))) : null));

        const epcPenaltyRs = selectedOrder.penalty_amount != null
          ? Number(selectedOrder.penalty_amount)
          : ((selectedOrder.applicable_penalty_paise || 0) / 100);

        const unfulfilledKits = selectedOrder.unfulfilled_quantity != null
          ? selectedOrder.unfulfilled_quantity
          : Math.max(0, bookedQuota - fulfilledQuota);

        const completionRatio = selectedOrder.commission_completion_ratio || `${fulfilledQuota}/${bookedQuota}`;
        const penaltyChargedToName = selectedOrder.penalty_charged_to_name || (allocationsList[0]?.company_name || allocationsList[0]?.epc_name || "Assigned EPC");

        const tokenRequired = (selectedOrder.token_amount_paise || 0) / 100;
        const tokenPaid = (selectedOrder.token_paid_paise || selectedOrder.token_amount_paise || 0) / 100;
        const tokenAdjusted = (selectedOrder.token_adjusted_total_paise || 0) / 100;
        const escrowBalance = Math.max(0, tokenPaid - tokenAdjusted);
        const isTokenPaid = selectedOrder.token_payment_status === "PAID" || ["PAID", "VALIDATED", "COMPLETED"].includes(selectedOrder.status);

        const allocationsList = orderItem.epc_allocations || [];
        const repeatOrdersList = selectedOrder.linked_repeat_orders || [];
        const kitImg = orderItem.kit_image || "https://res.cloudinary.com/dggmbagax/image/upload/v1788328068/solarkits/solarkits-admin-panel-backend/public/uploads/combo_kits/KIT_1788328066633_236114742.jpg";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-surface border-2 border-border shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">

              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between bg-surface-hover/40">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm sm:text-base font-black text-text-primary px-3 py-1 rounded-xl bg-surface border border-border shadow-xs">
                      {selectedOrder.po_number}
                    </span>
                    <StatusBadge status={selectedOrder.status} />
                    <span className="text-xs text-text-muted">
                      Created: {new Date(selectedOrder.created_at || selectedOrder.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-1.5 flex items-center gap-2 flex-wrap">
                    <span>Franchisee: <strong className="text-text-primary">{selectedOrder.franchisee_id?.business_name || "Franchisee Account"}</strong></span>
                    {selectedOrder.franchisee_id?.mobile && (
                      <span className="text-text-muted">• Tel: {selectedOrder.franchisee_id.mobile}</span>
                    )}
                    <span className="text-text-muted">• Type: <strong className="text-text-primary">{selectedOrder.po_category === "COMBINE_PO" ? "Combine PO" : "Single PO"}</strong></span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2.5 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              {/* 4 Tabs Bar */}
              <div className="flex items-center px-6 border-b border-border bg-surface text-xs font-bold overflow-x-auto gap-2">
                <button
                  onClick={() => setModalTab("overview")}
                  className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${modalTab === "overview"
                    ? "border-primary text-primary font-black"
                    : "border-transparent text-text-muted hover:text-text-primary"
                    }`}
                >
                  <FaLayerGroup size={13} />
                  <span>1. Live Quota & Overview</span>
                </button>

                <button
                  onClick={() => setModalTab("token")}
                  className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${modalTab === "token"
                    ? "border-primary text-primary font-black"
                    : "border-transparent text-text-muted hover:text-text-primary"
                    }`}
                >
                  <FaMoneyBillWave size={13} />
                  <span>2. Token Escrow & Verification</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${isTokenPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {isTokenPaid ? "✓ Paid" : "⏳ Pending"}
                  </span>
                </button>

                <button
                  onClick={() => setModalTab("epc_pool")}
                  className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${modalTab === "epc_pool"
                    ? "border-primary text-primary font-black"
                    : "border-transparent text-text-muted hover:text-text-primary"
                    }`}
                >
                  <FaUsers size={13} />
                  <span>3. Onboarded EPC Pool</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-text-secondary font-bold">
                    {allocationsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setModalTab("repeat_orders")}
                  className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${modalTab === "repeat_orders"
                    ? "border-primary text-primary font-black"
                    : "border-transparent text-text-muted hover:text-text-primary"
                    }`}
                >
                  <FaShoppingCart size={13} />
                  <span>4. Linked Repeat Orders / Drawdowns</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-black">
                    {repeatOrdersList.length}
                  </span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">

                {/* ── TAB 1: OVERVIEW & LIVE QUOTA TRACKER ───────────────────── */}
                {modalTab === "overview" && (
                  <div className="space-y-5">
                    {/* Quota Progress Banner */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-slate-900 border border-blue-200 dark:border-blue-900/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center gap-2">
                            <FaLayerGroup size={13} /> Master PO Quota Lock & Drawdown Status
                          </div>
                          <div className="text-base font-black text-text-primary mt-1">
                            {remainingQuota > 0 ? (
                              <span>
                                {remainingQuota} Kits Available for Drawdown <span className="text-xs font-semibold text-text-muted">({fulfilledQuota} of {bookedQuota} Kits Fulfilled)</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600">
                                ✓ Quota Fully Exhausted & Completed ({bookedQuota}/{bookedQuota} Kits)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-primary font-mono">{progressPct}%</span>
                          <span className="block text-[10px] text-text-muted">Fulfillment Rate</span>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-300 ${remainingQuota === 0 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-600 to-primary"}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center mt-4 pt-3 border-t border-border/60">
                        <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs">
                          <div className="text-[10px] text-text-muted font-bold uppercase">Total Booked Quota</div>
                          <div className="text-sm font-black text-text-primary mt-0.5">{bookedQuota} Solar Kits</div>
                        </div>
                        <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs">
                          <div className="text-[10px] text-text-muted font-bold uppercase">Fulfilled Drawdowns</div>
                          <div className="text-sm font-black text-blue-600 mt-0.5">{fulfilledQuota} Kits Drawn</div>
                        </div>
                        <div className="p-3 bg-surface rounded-xl border border-border shadow-2xs">
                          <div className="text-[10px] text-text-muted font-bold uppercase">Remaining Quota</div>
                          <div className={`text-sm font-black mt-0.5 ${remainingQuota === 0 ? "text-emerald-600" : "text-emerald-700"}`}>
                            {remainingQuota} Kits Left
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product & BOM Card */}
                    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <img
                          src={kitImg}
                          alt={orderItem.item_name}
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-border bg-slate-100 dark:bg-slate-800 shrink-0 shadow-md"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://placehold.co/120x120?text=Solar+Kit";
                          }}
                        />
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-primary/10 text-primary border border-primary/20">
                              {orderItem.brand_name || "Solar Tier-1"}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200">
                              <FaBolt className="inline mr-1" size={9} /> {kitCapacity} kW / Kit
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-text-secondary border border-border">
                              {orderItem.inverter_mode === "three" ? "Three Phase" : "Single Phase"} On-Grid String
                            </span>
                          </div>
                          <h3 className="font-black text-sm sm:text-base text-text-primary leading-snug">
                            {orderItem.item_name}
                          </h3>
                          <p className="text-xs text-text-muted line-clamp-2">
                            {orderItem.description || "Complete Mono PERC Solar System with Single-Phase String Inverter and Full BOS Protection Kit."}
                          </p>
                        </div>
                      </div>

                      {/* Hardware BOM Specs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-border/60">
                        <div className="p-3 rounded-xl bg-surface-hover/60 border border-border">
                          <div className="flex items-center gap-2 mb-1 text-primary">
                            <FaSolarPanel size={14} />
                            <span className="font-bold text-xs">Solar Modules</span>
                          </div>
                          <div className="font-black text-text-primary text-xs">
                            {6 * bookedQuota} Panels
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            6 Modules / Kit (Mono PERC)
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-surface-hover/60 border border-border">
                          <div className="flex items-center gap-2 mb-1 text-amber-600">
                            <FaBolt size={14} />
                            <span className="font-bold text-xs">Inverters</span>
                          </div>
                          <div className="font-black text-text-primary text-xs">
                            {1 * bookedQuota} Inverters
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            1 Unit / Kit (String Inverter)
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-surface-hover/60 border border-border">
                          <div className="flex items-center gap-2 mb-1 text-emerald-600">
                            <FaShieldAlt size={14} />
                            <span className="font-bold text-xs">Protection Kit</span>
                          </div>
                          <div className="font-black text-text-primary text-xs">
                            {1 * bookedQuota} Bundles
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            ACDB / DCDB, SPD, MCB Box
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-surface-hover/60 border border-border">
                          <div className="flex items-center gap-2 mb-1 text-purple-600">
                            <FaBoxes size={14} />
                            <span className="font-bold text-xs">Structure & Cable</span>
                          </div>
                          <div className="font-black text-text-primary text-xs">
                            {1 * bookedQuota} Sets
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">
                            Aluminium Rails, DC Cable
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Commercial Settlement Details */}
                    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-xs">
                      <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <FaFileInvoiceDollar size={13} className="text-primary" /> Master PO Financial & Commercial Breakdown
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 p-3.5 rounded-xl bg-surface-hover/50 border border-border">
                          <div className="flex justify-between text-text-secondary">
                            <span>Base Unit Price (Excl. Tax):</span>
                            <span className="font-bold text-text-primary">₹{unitPriceRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / Kit</span>
                          </div>
                          <div className="flex justify-between text-text-secondary">
                            <span>Booked Quantity:</span>
                            <span className="font-bold text-text-primary">{bookedQuota} Kits</span>
                          </div>
                          <div className="flex justify-between text-text-secondary">
                            <span>Subtotal Value:</span>
                            <span className="font-bold text-text-primary">₹{subtotalRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-text-secondary">
                            <span>GST ({orderItem.gst_rate || 13.8}%):</span>
                            <span className="font-bold text-text-primary">₹{taxRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-text-primary font-black text-sm pt-2 border-t border-border">
                            <span>Total Committed PO Value:</span>
                            <span className="text-primary font-mono text-base font-black">
                              ₹{grandTotalRs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 p-3.5 rounded-xl bg-surface-hover/50 border border-border">
                          <div className="text-[11px] font-bold text-text-muted uppercase">Franchisee & Settlement Terms</div>
                          <div className="flex justify-between text-text-secondary">
                            <span>Franchisee Partner:</span>
                            <span className="font-bold text-text-primary">{selectedOrder.franchisee_id?.business_name || "Franchisee"}</span>
                          </div>
                          <div className="flex justify-between text-text-secondary">
                            <span>Contact Number:</span>
                            <span className="font-bold text-text-primary">{selectedOrder.franchisee_id?.mobile || "N/A"}</span>
                          </div>
                          <div className="flex justify-between text-text-secondary">
                            <span>Settlement Rule:</span>
                            <span className="font-bold text-text-primary">{selectedOrder.token_settlement_mode || "PRO_RATA"}</span>
                          </div>
                          <div className="flex justify-between text-text-secondary items-center">
                            <span>Franchisee Margin:</span>
                            <div className="text-right">
                              {franchiseeMarginRs != null && franchiseeMarginRs > 0 ? (
                                <>
                                  <span className="font-bold text-emerald-600 font-mono text-xs">
                                    ₹{franchiseeMarginRs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  {effectivePerKitMargin != null && (
                                    <span className="block text-[10px] text-text-muted font-medium mt-0.5">
                                      ≈ ₹{effectivePerKitMargin.toLocaleString("en-IN")} / Kit ({bookedQuota} Kits Tier)
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="font-semibold text-amber-600 text-xs">
                                  Configured Rate Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Franchise Pro-Rata Commission & EPC Penalty Settlement Breakdown */}
                    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-primary/5 to-surface p-4 sm:p-5 space-y-3.5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                            <FaShieldAlt size={16} />
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-text-primary">
                              Franchise Pro-Rata Commission & EPC Penalty Settlement
                            </h4>
                            <p className="text-[11px] text-text-muted">
                              Pro-rata commission realization based on kits fulfilled by EPC and penalty attribution for unfulfilled quota past deadline.
                            </p>
                          </div>
                        </div>
                        {selectedOrder.po_ending_date && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl bg-surface border border-border">
                            <FaClock className="text-amber-500" size={13} />
                            <span className="text-text-muted">PO Ending Date:</span>
                            <span className="font-bold text-text-primary">
                              {new Date(selectedOrder.po_ending_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-3 bg-surface rounded-xl border border-border">
                          <span className="text-[10px] uppercase font-bold text-text-muted block">Booked Quota</span>
                          <span className="text-base font-extrabold text-text-primary font-mono">{bookedQuota} Kits</span>
                          <span className="text-[10px] text-text-muted block">Committed</span>
                        </div>
                        <div className="p-3 bg-surface rounded-xl border border-border">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Fulfilled by EPC</span>
                          <span className="text-base font-extrabold text-emerald-600 font-mono">{fulfilledQuota} Kits</span>
                          <span className="text-[10px] text-emerald-600/80 block font-semibold">{progressPct}% Complete</span>
                        </div>
                        <div className="p-3 bg-surface rounded-xl border border-border">
                          <span className="text-[10px] uppercase font-bold text-rose-600 block">Unfulfilled Quota</span>
                          <span className="text-base font-extrabold text-rose-600 font-mono">{unfulfilledKits} Kits</span>
                          <span className="text-[10px] text-rose-600/80 block font-semibold">{unfulfilledKits > 0 ? "Penalty Applicable" : "Completed"}</span>
                        </div>
                        <div className="p-3 bg-surface rounded-xl border border-border">
                          <span className="text-[10px] uppercase font-bold text-primary block">Pro-Rata Ratio</span>
                          <span className="text-base font-extrabold text-primary font-mono">{completionRatio}</span>
                          <span className="text-[10px] text-primary/80 block font-semibold">Realized Margin</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* EPC Penalty Card */}
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                              EPC Unfulfilled Penalty
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300">
                              Charged to EPC
                            </span>
                          </div>
                          <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                            ₹{epcPenaltyRs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                            {epcPenaltyRs > 0
                              ? `Penalty charged to ${penaltyChargedToName} for ${unfulfilledKits} unfulfilled kits past the PO ending date.`
                              : `No penalty applicable as order is fulfilled or within the active timeline.`}
                          </p>
                        </div>

                        {/* Franchise Pro-Rata Commission Card */}
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                              Franchise Pro-Rata Commission
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                              {completionRatio} Realized
                            </span>
                          </div>
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                            ₹{(realizedMarginRs || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                            Commission calculated pro-rata: {completionRatio} of total committed margin ₹{(franchiseeMarginRs || 0).toLocaleString("en-IN")}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: TOKEN DEPOSIT & ESCROW VERIFICATION ─────────────── */}
                {modalTab === "token" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-surface border-2 border-border space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="font-black text-text-primary text-sm flex items-center gap-2">
                          <FaLock className="text-primary" /> Token Deposit & Escrow Accounting
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${isTokenPaid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}>
                          {isTokenPaid ? "✓ Token Verified & Active" : "⏳ Token Pending Verification"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-3 bg-surface-hover rounded-xl border border-border">
                          <div className="text-[10px] text-text-muted font-bold">Required Token</div>
                          <div className="text-base font-black text-text-primary mt-0.5">
                            ₹{tokenRequired.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-hover rounded-xl border border-border">
                          <div className="text-[10px] text-text-muted font-bold">Token Paid</div>
                          <div className="text-base font-black text-emerald-600 mt-0.5">
                            ₹{tokenPaid.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-hover rounded-xl border border-border">
                          <div className="text-[10px] text-text-muted font-bold">Adjusted in Reorders</div>
                          <div className="text-base font-black text-blue-600 mt-0.5">
                            ₹{tokenAdjusted.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-hover rounded-xl border border-border">
                          <div className="text-[10px] text-text-muted font-bold">Current Escrow Balance</div>
                          <div className="text-base font-black text-primary mt-0.5">
                            ₹{escrowBalance.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-border space-y-2">
                        <div className="text-[11px] font-bold text-text-muted uppercase">Payment Submission Reference</div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="text-text-muted">Bank Reference / UTR: </span>
                            <span className="font-mono font-bold text-text-primary">
                              {selectedOrder.payment_reference || selectedOrder.payment_utr || selectedOrder.offline_payment?.utr_number || "Awaiting UTR"}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted">Payment Mode: </span>
                            <span className="font-bold text-text-primary">
                              {selectedOrder.offline_payment?.payment_mode || "BANK_TRANSFER"}
                            </span>
                          </div>
                          {selectedOrder.offline_payment?.payment_receipt_url && (
                            <a
                              href={selectedOrder.offline_payment.payment_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all inline-flex items-center gap-1"
                            >
                              View Slip <FaExternalLinkAlt size={10} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Token Verification Action */}
                      <div className="pt-2">
                        {!isTokenPaid ? (
                          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="font-black text-amber-900 dark:text-amber-200 text-xs">
                                ⚡ PO Quota Locked Awaiting Token Clearance
                              </div>
                              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                                Verify the ₹{tokenRequired.toLocaleString("en-IN")} token payment to activate the {bookedQuota} kits quota for repeat orders.
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setPaymentRefInput(selectedOrder.payment_reference || selectedOrder.payment_utr || "");
                                setShowPaymentModal(true);
                              }}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
                            >
                              <FaCheckCircle size={14} /> ✓ Verify Token Payment & Activate Quota
                            </button>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-2">
                            <FaCheckCircle size={15} /> Token deposit verified. Escrow balance of ₹{escrowBalance.toLocaleString("en-IN")} is held safely for repeat order drawdowns.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 3: ONBOARDED EPC POOL ──────────────────────────────── */}
                {modalTab === "epc_pool" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-text-primary text-sm flex items-center gap-2">
                          <FaUsers className="text-primary" /> Onboarded EPC Buyers Allocation Pool
                        </h4>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          List of EPC contractors allocated kits under this combine PO with payment slip clearance.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                        {allocationsList.length} Allocated Buyers
                      </span>
                    </div>

                    {allocationsList.length === 0 ? (
                      <div className="p-8 text-center text-text-muted border-2 border-dashed border-border rounded-2xl">
                        <FaUsers size={28} className="mx-auto opacity-30 text-primary mb-2" />
                        <p className="font-bold text-text-primary text-xs">Direct Franchisee Purchase</p>
                        <p className="text-[11px]">This is a Single PO directly booked for franchisee stock without EPC split.</p>
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left">
                          <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                            <tr>
                              <th className="py-2.5 px-3">EPC Buyer Company</th>
                              <th className="py-2.5 px-3">GSTIN</th>
                              <th className="py-2.5 px-3 text-center">Allocated Kits</th>
                              <th className="py-2.5 px-3 text-center">PO Contract</th>
                              <th className="py-2.5 px-3 text-center">Payment Status</th>
                              <th className="py-2.5 px-3 text-right">Verification Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {allocationsList.map((alloc, aIdx) => {
                              const buyerId = alloc.epc_buyer_id?._id || alloc.epc_buyer_id;
                              const isVerifying = verifyingEpcReceipt?.epcBuyerId === buyerId?.toString();
                              const payStatus = alloc.payment_status || "PENDING";
                              const statusBadge = {
                                PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
                                RECEIPT_SUBMITTED: { label: "Receipt Submitted", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
                                VERIFIED: { label: "Verified ✓", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
                                PAID: { label: "Paid ✓", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
                              }[payStatus] || { label: payStatus, cls: "bg-gray-100 text-gray-800" };

                              return (
                                <tr key={aIdx} className="hover:bg-surface-hover/50 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-text-primary text-xs">
                                    {alloc.company_name || alloc.buyer_name}
                                    {alloc.payment_notes && (
                                      <div className="text-[10px] text-red-600 font-medium mt-0.5">{alloc.payment_notes}</div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-text-muted text-[11px]">{alloc.gstin || "N/A"}</td>
                                  <td className="py-2.5 px-3 text-center font-black text-primary text-xs">
                                    {alloc.allocated_quantity} Kits
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {alloc.contract?.status === "SIGNED" ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenContractModal(selectedOrder._id, buyerId?.toString())}
                                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                                        title="View Digitally Signed PO Contract & OTP Verification"
                                      >
                                        <FaCheckCircle size={10} className="text-emerald-600" />
                                        <span>Signed ✓</span>
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        <FaClock size={9} /> Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.cls}`}>
                                      {statusBadge.label}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                      {alloc.payment_receipt_url && (
                                        <a
                                          href={
                                            alloc.payment_receipt_url.startsWith("http")
                                              ? alloc.payment_receipt_url
                                              : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "")}${alloc.payment_receipt_url.startsWith("/") ? "" : "/"}${alloc.payment_receipt_url}`
                                          }
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all inline-flex items-center gap-1"
                                        >
                                          View Receipt <FaExternalLinkAlt size={8} />
                                        </a>
                                      )}
                                      {payStatus === "RECEIPT_SUBMITTED" && (
                                        <>
                                          <button
                                            disabled={isVerifying}
                                            onClick={() => handleVerifyEpcReceipt(selectedOrder._id, buyerId?.toString(), "verify")}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
                                          >
                                            {isVerifying && verifyingEpcReceipt?.action === "verify" ? "..." : "✓ Verify"}
                                          </button>
                                          <button
                                            disabled={isVerifying}
                                            onClick={() => {
                                              const note = window.prompt("Rejection reason (shown to EPC buyer):");
                                              if (note !== null) handleVerifyEpcReceipt(selectedOrder._id, buyerId?.toString(), "reject", note);
                                            }}
                                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                                          >
                                            {isVerifying && verifyingEpcReceipt?.action === "reject" ? "..." : "✕ Reject"}
                                          </button>
                                        </>
                                      )}
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
                )}

                {/* ── TAB 4: LINKED REPEAT ORDERS / DRAWDOWNS ─────────────────── */}
                {modalTab === "repeat_orders" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-black text-text-primary text-sm flex items-center gap-2">
                          <FaShoppingCart className="text-primary" /> Repeat Orders (Drawdowns) against Master PO
                        </h4>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Child repeat orders placed against this PO. Accounts verifies payment here before orders route to Supplier Procurement.
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {repeatOrdersList.length} Order(s) Drawn
                      </span>
                    </div>

                    {repeatOrdersList.length === 0 ? (
                      <div className="p-10 text-center text-text-muted border-2 border-dashed border-border rounded-2xl space-y-2">
                        <FaShoppingCart size={32} className="mx-auto opacity-30 text-primary" />
                        <p className="font-bold text-text-primary text-xs">No Repeat Orders Placed Yet</p>
                        <p className="text-[11px] max-w-md mx-auto">
                          The Franchisee or allocated EPCs can draw down kits against this PO until the remaining <strong>{remainingQuota} kits</strong> are fully exhausted.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-border rounded-2xl overflow-hidden shadow-xs">
                        <table className="w-full text-left">
                          <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                            <tr>
                              <th className="py-2.5 px-3">Order # & Date</th>
                              <th className="py-2.5 px-3">Buyer Partner</th>
                              <th className="py-2.5 px-3 text-center">Kits Drawn</th>
                              <th className="py-2.5 px-3">Total Payable (₹)</th>
                              <th className="py-2.5 px-3">UTR / Slip</th>
                              <th className="py-2.5 px-3 text-center">Accounts Verification</th>
                              <th className="py-2.5 px-3 text-right">Supplier Procurement</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {repeatOrdersList.map((child, cIdx) => {
                              const childTotal = (child.net_payable_paise || child.grand_total_paise || 0) / 100;
                              const childAdjusted = (child.token_adjusted_paise || child.token_adjusted_amount_paise || 0) / 100;
                              const buyerTitle = child.po_origin?.epc_name ||
                                child.po_origin?.epc_company ||
                                (child.created_by_role === "SOLAR_EPC" || child.epc_id
                                  ? (child.epc_id?.name || child.epc_id?.company_name || child.buyer_name || "Solar EPC")
                                  : (child.franchisee_id?.business_name || child.buyer_name || "Franchisee Partner"));

                              const childMilestones = child.payment_milestones?.milestones || [];
                              const m1 = childMilestones.find(m => m.milestone_number === 1);
                              const m2 = childMilestones.find(m => m.milestone_number === 2);
                              const childAdvPct = child.payment_milestones?.advance_percentage || m1?.percentage || 30;
                              const childRemPct = child.payment_milestones?.remaining_percentage || m2?.percentage || (100 - childAdvPct);
                              const m1Amount = child.payment_milestones?.advance_amount || Math.round(childTotal * (childAdvPct / 100));
                              const m2Amount = child.payment_milestones?.remaining_amount || Math.max(0, childTotal - m1Amount);

                              const isM1Approved = ["PAID", "CONFIRMED", "ADVANCE_PAID", "STOCK_ALLOCATED", "PROCESSING", "VEHICLE_ASSIGNED", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT", "REACHED_DESTINATION", "DELIVERED", "COMPLETED"].includes(child.status) ||
                                m1?.payment_status === "approved" ||
                                m1?.payment_status === "verified" ||
                                child.payment_status === "advance_paid" ||
                                child.payment_status === "paid" ||
                                child.offline_payment?.verification_status === "approved" ||
                                child.payment_milestones?.milestone_verification_status === "advance_verified" ||
                                child.payment_milestones?.milestone_verification_status === "fully_paid";

                              const isM2Approved = child.status === "PAID" ||
                                m2?.payment_status === "approved" ||
                                m2?.payment_status === "verified" ||
                                child.payment_status === "paid" ||
                                child.payment_milestones?.milestone_verification_status === "fully_paid";

                              const isM2Submitted = !isM2Approved && (
                                m2?.payment_status === "pending_verification" ||
                                child.milestone_verification_status === "final_payment_pending_verification" ||
                                child.payment_milestones?.milestone_verification_status === "final_payment_pending_verification" ||
                                child.status === "FINAL_PAYMENT_SUBMITTED" ||
                                Boolean(m2?.utr_number || child.offline_payment_m2?.utr_number)
                              );

                              const m1Utr = m1?.utr_number || child.payment_reference || child.offline_payment?.utr_number || child.payment_utr || "—";
                              const m2Utr = m2?.utr_number || child.offline_payment_m2?.utr_number;

                              const rawSlip1 = child.offline_payment?.receipt_url || child.offline_payment?.payment_receipt_url || child.payment_receipt_url || child.receipt_url;
                              const slip1Url = rawSlip1
                                ? (rawSlip1.startsWith("http")
                                  ? rawSlip1
                                  : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "")}${rawSlip1.startsWith("/") ? "" : "/"}${rawSlip1}`)
                                : null;

                              const rawSlip2 = child.offline_payment_m2?.receipt_url || m2?.receipt_url;
                              const slip2Url = rawSlip2
                                ? (rawSlip2.startsWith("http")
                                  ? rawSlip2
                                  : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "")}${rawSlip2.startsWith("/") ? "" : "/"}${rawSlip2}`)
                                : null;

                              return (
                                <tr key={cIdx} className="hover:bg-surface-hover/50 transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-xs text-text-primary">
                                    {child.order_number || child.po_number}
                                    <div className="text-[9px] text-text-muted font-normal font-sans">
                                      {new Date(child.created_at || child.createdAt).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric"
                                      })}
                                    </div>
                                    <div className="text-[9px] text-primary font-bold">
                                      {child.fulfillment_mode === "warehouse_pickup" ? "EPC Depot" : "Direct Site"}
                                    </div>
                                  </td>

                                  <td className="py-2.5 px-3 font-bold text-xs text-text-primary">
                                    {buyerTitle}
                                    <span className="block text-[9px] text-text-muted font-normal">
                                      {child.delivery_address?.contact_phone || child.customer_details?.phone || child.franchisee_id?.mobile || ""}
                                    </span>
                                  </td>

                                  <td className="py-2.5 px-3 text-center font-black text-primary text-xs">
                                    {child.total_quantity || child.items?.[0]?.quantity || 1} Kits
                                  </td>

                                  <td className="py-2.5 px-3 font-mono">
                                    <div className="font-black text-text-primary text-xs">
                                      ₹{childTotal.toLocaleString("en-IN")}
                                    </div>
                                    {childAdjusted > 0 && (
                                      <div className="text-[9px] text-emerald-600 font-bold">
                                        Token -₹{childAdjusted.toLocaleString("en-IN")}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-text-muted pt-1 space-y-0.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <span>M1 (30%):</span>
                                        <strong className={isM1Approved ? "text-emerald-600" : "text-amber-600"}>₹{m1Amount.toLocaleString("en-IN")}</strong>
                                      </div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span>M2 (70%):</span>
                                        <strong className={isM2Approved ? "text-emerald-600" : isM2Submitted ? "text-blue-600" : "text-purple-600"}>₹{m2Amount.toLocaleString("en-IN")}</strong>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-2.5 px-3 text-xs">
                                    <div className="flex flex-col gap-1.5">
                                      {/* M1 Proof */}
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-500/10 px-1 rounded">M1</span>
                                        <span className="font-mono font-bold text-text-primary text-[10px] bg-surface-hover px-1.5 py-0.2 rounded border border-border/80 select-all" title={m1Utr}>
                                          {m1Utr}
                                        </span>
                                        {slip1Url && (
                                          <a
                                            href={slip1Url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[9px] font-bold text-primary underline"
                                          >
                                            Slip
                                          </a>
                                        )}
                                      </div>

                                      {/* M2 Proof */}
                                      {(m2Utr || isM2Submitted || isM2Approved) && (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[9px] font-bold text-purple-700 bg-purple-500/10 px-1 rounded">M2</span>
                                          <span className="font-mono font-bold text-text-primary text-[10px] bg-surface-hover px-1.5 py-0.2 rounded border border-border/80 select-all" title={m2Utr || "Paid"}>
                                            {m2Utr || "Verified"}
                                          </span>
                                          {slip2Url && (
                                            <a
                                              href={slip2Url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-[9px] font-bold text-purple-600 underline"
                                            >
                                              Slip
                                            </a>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-2.5 px-3 text-center">
                                    {isM2Approved ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300">
                                        ✓ Fully Paid
                                      </span>
                                    ) : isM2Submitted ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-300">
                                        ⏳ M2 In Review
                                      </span>
                                    ) : isM1Approved ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-300">
                                        ✓ M1 Verified
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300">
                                        ⏳ M1 Pending
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-2.5 px-3 text-right">
                                    {!isM1Approved ? (
                                      <button
                                        onClick={() => {
                                          setChildPaymentModal({ ...child, target_milestone: 1 });
                                          setChildPaymentRefInput(m1Utr !== "—" ? m1Utr : "");
                                        }}
                                        className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                      >
                                        ✓ Verify M1 Advance
                                      </button>
                                    ) : isM2Submitted ? (
                                      <button
                                        onClick={() => {
                                          setChildPaymentModal({ ...child, target_milestone: 2 });
                                          setChildPaymentRefInput(m2Utr || "");
                                        }}
                                        className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-purple-600 text-white hover:bg-purple-700 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                      >
                                        ✓ Verify M2 Final
                                      </button>
                                    ) : isM2Approved ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200">
                                        ✓ Ready for Dispatch
                                      </span>
                                    ) : (
                                      <div className="flex flex-col items-end gap-0.5">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200">
                                          ✓ In Procurement
                                        </span>
                                        <span className="text-[9px] text-amber-600 font-bold">
                                          M2 Balance ₹{m2Amount.toLocaleString("en-IN")} Due
                                        </span>
                                      </div>
                                    )}
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
            </div>
          </div>
        );
      })()}

      {/* ── PARENT PO TOKEN CONFIRMATION SUB-MODAL ──────────────────────────── */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface border-2 border-border shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-text-primary flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-600" /> Verify PO Token Deposit
            </h3>
            <p className="text-xs text-text-muted">
              Enter Bank / UTR Reference for PO <strong>{selectedOrder.po_number}</strong> (Token Deposit: <strong>₹{((selectedOrder.token_amount_paise || 0) / 100).toLocaleString("en-IN")}</strong>).
            </p>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  Bank / UTR Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={paymentRefInput}
                  onChange={(e) => setPaymentRefInput(e.target.value)}
                  placeholder="e.g. UTR-HDFC-2026-981122"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-border text-text-muted hover:bg-surface-hover cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Verifying..." : "Verify & Activate PO Quota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CHILD REPEAT ORDER PAYMENT VERIFICATION SUB-MODAL ───────────────── */}
      {childPaymentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface border-2 border-border shadow-2xl p-6 space-y-4">
            {(() => {
              const isM2 = childPaymentModal.target_milestone === 2;
              const totalVal = Math.round((childPaymentModal.net_payable_paise || childPaymentModal.grand_total_paise || 0) / 100);
              const m1Milestone = childPaymentModal.payment_milestones?.milestones?.find(m => m.milestone_number === 1);
              const m2Milestone = childPaymentModal.payment_milestones?.milestones?.find(m => m.milestone_number === 2);
              const advPct = childPaymentModal.payment_milestones?.advance_percentage || m1Milestone?.percentage || 30;
              const remPct = childPaymentModal.payment_milestones?.remaining_percentage || m2Milestone?.percentage || (100 - advPct);
              const targetAmount = isM2
                ? (childPaymentModal.payment_milestones?.remaining_amount || Math.round(totalVal * (remPct / 100)))
                : (childPaymentModal.payment_milestones?.advance_amount || Math.round(totalVal * (advPct / 100)));

              const targetUtr = isM2
                ? (childPaymentModal.offline_payment_m2?.utr_number || m2Milestone?.utr_number || childPaymentRefInput)
                : (childPaymentModal.payment_reference || childPaymentModal.offline_payment?.utr_number || childPaymentRefInput);

              const rawSlip = isM2
                ? (childPaymentModal.offline_payment_m2?.receipt_url || m2Milestone?.receipt_url)
                : (childPaymentModal.offline_payment?.receipt_url || childPaymentModal.offline_payment?.payment_receipt_url || childPaymentModal.payment_receipt_url || childPaymentModal.receipt_url);

              const slipUrl = rawSlip
                ? (rawSlip.startsWith("http")
                  ? rawSlip
                  : `${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "")}${rawSlip.startsWith("/") ? "" : "/"}${rawSlip}`)
                : null;

              return (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isM2 ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                        {isM2 ? `Milestone 2 Verification (${remPct}% Final)` : `Milestone 1 Verification (${advPct}% Advance)`}
                      </span>
                      <h3 className="text-base font-black text-text-primary mt-1">
                        {isM2 ? "Verify Milestone 2 Final Payment" : "Verify Milestone 1 Advance Payment"}
                      </h3>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-hover text-xs space-y-1.5 border border-border">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Order Number:</span>
                      <strong className="font-mono text-text-primary">{childPaymentModal.order_number || childPaymentModal.po_number}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Kits Ordered:</span>
                      <strong className="text-primary">{childPaymentModal.total_quantity || childPaymentModal.items?.[0]?.quantity || 1} Kits</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Total Order Value:</span>
                      <span className="font-mono font-bold text-text-primary">₹{totalVal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border font-bold text-sm">
                      <span className={isM2 ? "text-purple-700 dark:text-purple-300" : "text-amber-700 dark:text-amber-300"}>
                        {isM2 ? `Milestone 2 (${remPct}%) to Verify:` : `Milestone 1 (${advPct}%) to Verify:`}
                      </span>
                      <span className={`font-mono font-black ${isM2 ? "text-purple-700 dark:text-purple-300" : "text-emerald-600"}`}>
                        ₹{Number(targetAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleConfirmChildPayment} className="space-y-4">
                    {/* Read-Only UTR Card with Copy Button */}
                    <div className="p-3.5 rounded-xl bg-surface-hover/80 border border-border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          {isM2 ? "Milestone 2 UTR Reference" : "Milestone 1 UTR Reference"}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Read-Only Check
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="font-mono font-black text-sm text-text-primary select-all">
                          {targetUtr || "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(targetUtr, "modal-utr")}
                          className="px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          title="Copy UTR to check in Bank Portal"
                        >
                          {copiedField === "modal-utr" ? (
                            <>
                              <FaCheck size={11} className="text-emerald-500" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <FaCopy size={11} />
                              <span>Copy UTR</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Payment Slip Preview Card */}
                    <div className="p-3.5 rounded-xl bg-surface-hover/80 border border-border space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        {isM2 ? "Milestone 2 Transfer Slip" : "Milestone 1 Transfer Slip"}
                      </span>
                      {slipUrl ? (
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                              📄 Slip
                            </span>
                            <span className="text-xs text-text-primary font-bold truncate">
                              {rawSlip.split("/").pop() || "Receipt.png"}
                            </span>
                          </div>
                          <a
                            href={slipUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-all flex items-center gap-1 shrink-0"
                          >
                            <span>View Slip</span>
                            <FaExternalLinkAlt size={9} />
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          ⚠️ No receipt attached by buyer. Please verify UTR against bank statement.
                        </div>
                      )}
                    </div>

                    <div className={`p-3 rounded-xl border text-[11px] ${isM2 ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40 text-purple-800 dark:text-purple-300" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300"}`}>
                      {isM2 ? (
                        <span>🚀 <strong>Final Payment Approval:</strong> Approving Milestone 2 marks the order FULLY_PAID and unlocks final warehouse dispatch clearance.</span>
                      ) : (
                        <span>⚡ <strong>Milestone 1 Approval:</strong> Parent PO quota will be deducted and this order will transfer to <strong>New Orders Queue</strong> for Supplier Procurement.</span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setChildPaymentModal(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-border text-text-muted hover:bg-surface-hover cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className={`px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer disabled:opacity-50 ${isM2 ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                      >
                        {actionLoading ? "Confirming..." : (isM2 ? "✓ Verify M2 & Release for Dispatch" : "✓ Verify M1 & Release to Supplier")}
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── PRODUCT 8-STAGE JOURNEY MODAL ──────────────────────────────────── */}
      {journeyOrder && (
        <Product8StageJourneyModal
          isOpen={!!journeyOrder}
          onClose={() => {
            setJourneyOrder(null);
            setJourneyProduct(null);
          }}
          order={journeyOrder}
          product={journeyProduct}
          orderType="po"
          onStageUpdated={() => {
            fetchOrders();
          }}
        />
      )}

      {/* Universal PO Legal Contract Modal */}
      <PoContractModal
        isOpen={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        poId={contractModalPoId}
        epcBuyerId={contractModalEpcId}
      />
    </div>
  );
}
