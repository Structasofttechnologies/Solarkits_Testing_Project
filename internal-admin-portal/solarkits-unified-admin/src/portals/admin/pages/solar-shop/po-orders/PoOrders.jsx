import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaFileInvoiceDollar,
  FaGlobe,
  FaMapMarkerAlt,
  FaClipboardList,
  FaEdit,
  FaUsers,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaSearch,
  FaEye,
  FaTruck,
  FaMoneyBillWave,
  FaTimes,
  FaTruckMoving,
  FaExclamationTriangle,
  FaUniversity,
  FaUndoAlt,
  FaBan,
  FaShoppingCart
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import CustomTable from "@/components/CustomTable";
import Loader from "@/components/Loader";
import { authHeaderObj } from "@/app/authHeader";
import Product8StageJourneyModal from "../../../../accounts/components/Product8StageJourneyModal";

const API_URL = import.meta.env.VITE_API_URL;

const STATUS_BADGES = {
  DRAFT: { label: "Draft", bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
  SUBMITTED: { label: "Submitted", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  PENDING_APPROVAL: { label: "Pending Approval", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
  APPROVED: { label: "Approved (Awaiting Payment)", bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  REJECTED: { label: "Rejected", bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5" },
  AWAITING_PAYMENT: { label: "Awaiting Payment", bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  PARTIALLY_PAID: { label: "Partially Paid", bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  PAID: { label: "1. Confirmed (Paid)", bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  CONFIRMED: { label: "1. Confirmed", bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  STOCK_ALLOCATED: { label: "2. Processing", bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  PROCESSING: { label: "2. Processing", bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  VEHICLE_ASSIGNED: { label: "3. Vehicle Assigned", bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  READY_FOR_DISPATCH: { label: "4. Ready for Dispatch", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  PARTIALLY_DISPATCHED: { label: "5. Dispatched", bg: "#f3e8ff", text: "#7e22ce", border: "#d8b4fe" },
  DISPATCHED: { label: "5. Dispatched", bg: "#f3e8ff", text: "#7e22ce", border: "#d8b4fe" },
  IN_TRANSIT: { label: "6. In Transit", bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
  REACHED_DESTINATION: { label: "7. Reached Dest.", bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  DELIVERED: { label: "8. Delivered", bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  COMPLETED: { label: "8. Settled & Completed", bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  CANCELLED: { label: "Cancelled", bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
};

function getStageBadgeText(status) {
  const norm = String(status || "SUBMITTED").toUpperCase();
  const map = {
    CONFIRMED: "Stage 1/8",
    PAID: "Stage 1/8",
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
  const cfg = STATUS_BADGES[norm] || { label: norm, bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-2xs"
      style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.text }} />
      {cfg.label}
    </span>
  );
}

export default function PoOrders({ moduleUniqueId }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Tab State ("franchisee_po" | "refund_requests")
  const [activeTab, setActiveTab] = useState("franchisee_po");

  // Franchisee PO Orders State
  const [fpoOrders, setFpoOrders] = useState([]);
  const [fpoLoading, setFpoLoading] = useState(false);
  const [fpoSearch, setFpoSearch] = useState("");
  const [fpoStatusFilter, setFpoStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyingEpcReceipt, setVerifyingEpcReceipt] = useState(null); // { poId, epcBuyerId, action }
  const [journeyOrder, setJourneyOrder] = useState(null);
  const [journeyProduct, setJourneyProduct] = useState(null);

  // Payment Confirmation Modal State
  const [paymentRefInput, setPaymentRefInput] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // PO Token Refund Requests State
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundSearch, setRefundSearch] = useState("");
  const [refundStatusFilter, setRefundStatusFilter] = useState("");
  const [selectedRefundApprove, setSelectedRefundApprove] = useState(null);
  const [selectedRefundReject, setSelectedRefundReject] = useState(null);
  const [viewingRefund, setViewingRefund] = useState(null);
  const [approveForm, setApproveForm] = useState({
    payment_method: "RTGS",
    payment_reference: "",
    approval_notes: "",
  });
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  // Active Countries State
  const [activeCountries, setActiveCountries] = useState([]);

  // ── Fetch Franchisee PO Orders ─────────────────────────────────────────────
  const fetchFpoOrders = useCallback(async () => {
    setFpoLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/franchisee/po/list?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setFpoOrders(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching Franchisee PO orders:", err);
    } finally {
      setFpoLoading(false);
    }
  }, [moduleUniqueId]);

  // ── Fetch PO Refund Requests ──────────────────────────────────────────────
  const fetchRefundRequests = useCallback(async () => {
    setRefundLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/franchisee/po/refund-requests?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        const payload = res.data.data;
        const list = Array.isArray(payload) ? payload : (payload?.requests || []);
        setRefundRequests(list);
      }
    } catch (err) {
      console.error("Error fetching PO refund requests:", err);
    } finally {
      setRefundLoading(false);
    }
  }, [moduleUniqueId]);

  // ── Fetch Active Countries ────────────────────────────────────────────────
  const fetchActiveCountries = useCallback(async () => {
    try {
      const countriesRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const activeCountriesList = countriesRes.data?.countries || [];
      setActiveCountries(activeCountriesList);

      if (activeCountriesList.length > 0) {
        const activeCountriesNames = activeCountriesList.map((c) => c.name.toLowerCase());
        if (!countryName) {
          const storedCountry = localStorage.getItem("selected_country_solar-shop");
          const defaultCountry = (storedCountry && activeCountriesNames.includes(storedCountry.toLowerCase()))
            ? storedCountry.toLowerCase()
            : activeCountriesList[0].name.toLowerCase();

          navigate(`/admin-panel/solar-shop/${defaultCountry}/po-orders`, { replace: true });
        }
      }
    } catch (error) {
      console.error("Error fetching active countries:", error);
    }
  }, [moduleUniqueId, countryName, navigate]);

  useEffect(() => {
    if (token) {
      fetchFpoOrders();
      fetchActiveCountries();
      fetchRefundRequests();
    }
  }, [token, countryName, fetchFpoOrders, fetchActiveCountries, fetchRefundRequests]);

  // Current Country
  const currentCountry = activeCountries.find(
    (c) => c.name.toLowerCase() === countryName?.toLowerCase()
  );

  // ── Refund Action Handlers ─────────────────────────────────────────────────
  const handleApproveRefund = async (e) => {
    e.preventDefault();
    if (!selectedRefundApprove) return;
    if (!approveForm.payment_reference) {
      dispatch(setAlert({ type: "warning", message: "Please enter Bank UTR / Payment Reference" }));
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/franchisee/po/refund-requests/${selectedRefundApprove._id}/approve?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        {
          payment_method: approveForm.payment_method,
          payment_reference: approveForm.payment_reference,
          approval_notes: approveForm.approval_notes,
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: res.data.message || "Refund request approved & settled successfully!" }));
        setSelectedRefundApprove(null);
        setApproveForm({ payment_method: "RTGS", payment_reference: "", approval_notes: "" });
        fetchRefundRequests();
        fetchFpoOrders();
        window.dispatchEvent(new Event('sidebar-counts-refresh'));
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to approve refund." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRefund = async (e) => {
    e.preventDefault();
    if (!selectedRefundReject) return;
    if (!rejectReasonInput.trim()) {
      dispatch(setAlert({ type: "warning", message: "Please enter a mandatory rejection reason" }));
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/franchisee/po/refund-requests/${selectedRefundReject._id}/reject?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        { rejection_reason: rejectReasonInput.trim() },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Refund request rejected successfully." }));
        setSelectedRefundReject(null);
        setRejectReasonInput("");
        fetchRefundRequests();
        fetchFpoOrders();
        window.dispatchEvent(new Event('sidebar-counts-refresh'));
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to reject refund." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettlePoExpiry = async (orderId) => {
    const note = window.prompt("Enter optional expiry settlement note for this PO:", "Settled & Expired by Admin");
    if (note === null) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/franchisee/po/${orderId}/settle-expiry?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        { note },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "PO marked as expired and token penalty settled successfully!" }));
        setSelectedOrder(null);
        fetchFpoOrders();
        fetchRefundRequests();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to settle PO expiry." }));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Workflow Action Handlers ───────────────────────────────────────────────
  const handleApprovePo = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_URL}/franchisee/po/approve?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        { po_id: orderId, auto_advance: true },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Purchase Order approved successfully!" }));
        setSelectedOrder(null);
        fetchFpoOrders();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to approve PO." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPo = async (orderId) => {
    const reason = prompt("Enter reason for rejection:");
    if (!reason) return;
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_URL}/franchisee/po/reject?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        { po_id: orderId, reason },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Purchase Order rejected." }));
        setSelectedOrder(null);
        fetchFpoOrders();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to reject PO." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/franchisee/po/confirm-payment?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        {
          po_id: selectedOrder._id,
          payment_reference: paymentRefInput || `PAY-${Date.now()}`,
          payment_mode: "BANK_TRANSFER",
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Payment confirmed successfully!" }));
        setShowPaymentModal(false);
        setPaymentRefInput("");
        setSelectedOrder(null);
        fetchFpoOrders();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Payment confirmation failed." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchPo = async (orderId) => {
    const tracking = prompt("Enter dispatch courier / tracking number:", "TRK-" + Math.floor(100000 + Math.random() * 900000));
    if (!tracking) return;
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_URL}/franchisee/po/dispatch?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        { po_id: orderId, tracking_number: tracking },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "PO Order marked as Dispatched!" }));
        setSelectedOrder(null);
        fetchFpoOrders();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to dispatch PO." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverPo = async (orderId) => {
    if (!confirm("Are you sure you want to mark this order as Delivered?")) return;
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_URL}/franchisee/po/deliver?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        { po_id: orderId },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "PO Order marked as Delivered!" }));
        setSelectedOrder(null);
        fetchFpoOrders();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to mark delivered." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyEpcReceipt = async (poId, epcBuyerId, action, rejectionNote = "") => {
    setVerifyingEpcReceipt({ poId, epcBuyerId, action });
    try {
      const res = await axios.post(
        `${API_URL}/franchisee/po/verify-epc-receipt?unique_id=${moduleUniqueId || "ADM_PO_ORDERS"}&req_for=edit`,
        {
          po_id: poId,
          epc_buyer_id: epcBuyerId,
          action,
          rejection_note: rejectionNote || undefined,
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: res.data.message || (action === "reject" ? "EPC Receipt rejected." : "EPC Payment verified successfully!"),
        }));
        setSelectedOrder((prev) => {
          if (!prev) return prev;
          const updatedItems = (prev.items || []).map((item) => ({
            ...item,
            epc_allocations: (item.epc_allocations || []).map((a) => {
              const bId = a.epc_buyer_id?._id || a.epc_buyer_id;
              if (bId?.toString() === epcBuyerId?.toString()) {
                return {
                  ...a,
                  payment_status: action === "reject" ? "PENDING" : "VERIFIED",
                  payment_receipt_url: action === "reject" ? null : a.payment_receipt_url,
                  payment_notes: action === "reject" ? (rejectionNote || "Receipt rejected by Admin.") : null,
                };
              }
              return a;
            }),
          }));
          return {
            ...prev,
            items: updatedItems,
            status: res.data.all_verified ? "PAID" : prev.status,
          };
        });
        fetchFpoOrders();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to process receipt." }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Action failed." }));
    } finally {
      setVerifyingEpcReceipt(null);
    }
  };

  // Filtered Franchisee PO Orders
  const filteredFpoOrders = useMemo(() => {
    return fpoOrders.filter((o) => {
      if (fpoStatusFilter === "RECEIPT_PENDING") {
        return (o.items || []).some((item) =>
          (item.epc_allocations || []).some((a) => a.payment_status === "RECEIPT_SUBMITTED")
        );
      }
      if (fpoStatusFilter && o.status !== fpoStatusFilter) return false;
      if (fpoSearch) {
        const q = fpoSearch.toLowerCase();
        const num = (o.po_number || "").toLowerCase();
        const fName = (o.franchisee_id?.business_name || "").toLowerCase();
        const kitName = (o.items?.[0]?.item_name || "").toLowerCase();
        return num.includes(q) || fName.includes(q) || kitName.includes(q);
      }
      return true;
    });
  }, [fpoOrders, fpoStatusFilter, fpoSearch]);

  // Metrics for FPO
  const totalFpoCount = fpoOrders.length;
  const pendingApprovalCount = fpoOrders.filter((o) => ["SUBMITTED", "PENDING_APPROVAL"].includes(o.status)).length;
  const awaitingPaymentCount = fpoOrders.filter((o) => o.status === "AWAITING_PAYMENT").length;
  const pendingReceiptCount = fpoOrders.filter((o) =>
    (o.items || []).some((item) => (item.epc_allocations || []).some((a) => a.payment_status === "RECEIPT_SUBMITTED"))
  ).length;
  const completedFpoCount = fpoOrders.filter((o) => ["DELIVERED", "COMPLETED"].includes(o.status)).length;

  // Metrics & Filtering for Refund Requests
  const filteredRefundRequests = useMemo(() => {
    return refundRequests.filter((r) => {
      if (refundStatusFilter && refundStatusFilter !== "ALL" && r.status !== refundStatusFilter) return false;
      if (refundSearch) {
        const q = refundSearch.toLowerCase();
        const poNum = (r.po_number || r.po_id?.po_number || "").toLowerCase();
        const name = (r.requester_name || "").toLowerCase();
        const phone = (r.requester_phone || "").toLowerCase();
        const acc = (r.bank_details?.account_number || "").toLowerCase();
        return poNum.includes(q) || name.includes(q) || phone.includes(q) || acc.includes(q);
      }
      return true;
    });
  }, [refundRequests, refundStatusFilter, refundSearch]);

  const totalRefundRequestsCount = refundRequests.length;
  const pendingRefundsCount = refundRequests.filter((r) => r.status === "PENDING").length;
  const approvedRefundsCount = refundRequests.filter((r) => ["APPROVED", "PROCESSED"].includes(r.status)).length;
  const totalSettledRefundPaise = refundRequests
    .filter((r) => ["APPROVED", "PROCESSED"].includes(r.status))
    .reduce((sum, r) => sum + (r.refundable_amount_paise || 0), 0);



  return (
    <div className="space-y-6 pb-24">
      {/* ── Top Header Banner ─────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary to-primary-end p-6 lg:p-8 text-white shadow-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
              <FaFileInvoiceDollar className="text-white text-3xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
                  Purchase Orders Workspace
                </h1>
                {currentCountry && (
                  <span className="bg-white/20 rounded-full px-3 py-0.5 text-xs font-bold uppercase border border-white/30">
                    {currentCountry.name}
                  </span>
                )}
              </div>
              <p className="text-white/90 text-xs sm:text-sm mt-1">
                Manage Franchisee & EPC Purchase Orders, repeat allocations, token escrow, and refund settlements.
              </p>
            </div>
          </div>

          {/* Top Primary Tabs */}
          <div className="flex items-center p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <button
              onClick={() => setActiveTab("franchisee_po")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === "franchisee_po"
                  ? "bg-white text-primary shadow-lg"
                  : "text-white/80 hover:text-white"
                }`}
            >
              <FaUsers size={14} />
              <span>Franchisee & EPC PO Orders ({fpoOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("refund_requests")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer relative ${activeTab === "refund_requests"
                  ? "bg-white text-primary shadow-lg"
                  : "text-white/80 hover:text-white"
                }`}
            >
              <FaUndoAlt size={13} />
              <span>PO Token Refund Requests ({refundRequests.length})</span>
              {pendingRefundsCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-black rounded-full bg-amber-400 text-amber-950 ml-0.5">
                  {pendingRefundsCount} new
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: FRANCHISEE PURCHASE ORDERS (FPO)                                   */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "franchisee_po" && (
        <div className="space-y-6">
          {/* Top FPO Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                <FaFileInvoiceDollar size={22} />
              </div>
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Total Franchisee POs</div>
                <div className="text-2xl font-black text-text-primary mt-0.5">{totalFpoCount} Orders</div>
                <div className="text-[10px] text-text-muted">All active plans</div>
              </div>
            </div>

            <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-600 border border-amber-500/20">
                <FaClock size={22} />
              </div>
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Pending Approval</div>
                <div className="text-2xl font-black text-text-primary mt-0.5">{pendingApprovalCount} Orders</div>
                <div className="text-[10px] text-amber-600 font-bold">Needs admin review</div>
              </div>
            </div>

            <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-600 border border-indigo-500/20">
                <FaMoneyBillWave size={22} />
              </div>
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Awaiting Payment</div>
                <div className="text-2xl font-black text-text-primary mt-0.5">{awaitingPaymentCount} Orders</div>
                <div className="text-[10px] text-indigo-600 font-bold">Accounts settlement</div>
              </div>
            </div>

            <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-success/10 rounded-2xl text-success border border-success/20">
                <FaCheckCircle size={22} />
              </div>
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Completed / Delivered</div>
                <div className="text-2xl font-black text-text-primary mt-0.5">{completedFpoCount} Orders</div>
                <div className="text-[10px] text-success font-bold">Fully fulfilled</div>
              </div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="card p-4 border-2 border-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={fpoSearch}
                onChange={(e) => setFpoSearch(e.target.value)}
                placeholder="Search by PO number, Franchisee, or Kit..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-surface text-text-primary"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={fpoStatusFilter}
                onChange={(e) => setFpoStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer"
              >
                <option value="">All Workflow Statuses</option>
                <option value="RECEIPT_PENDING">⚡ Pending EPC Receipts ({pendingReceiptCount})</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="AWAITING_PAYMENT">Awaiting Payment</option>
                <option value="PAID">Paid</option>
                <option value="PROCESSING">Processing</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
              </select>

              {(fpoSearch || fpoStatusFilter) && (
                <button
                  onClick={() => {
                    setFpoSearch("");
                    setFpoStatusFilter("");
                  }}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-hover border border-border transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}

              <button
                onClick={fetchFpoOrders}
                className="px-4 py-2.5 rounded-xl bg-surface-hover hover:bg-border text-text-primary text-xs font-bold border border-border transition-all cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* FPO Orders Table */}
          <CustomTable
            headers={[
              { key: "po_number", label: "PO Number & Date" },
              { key: "franchisee", label: "Franchisee Partner" },
              { key: "po_type_quota", label: "PO Type & Quota" },
              { key: "token_deposit", label: "Token Deposit" },
              { key: "product", label: "Product & Kit" },
              { key: "epc_allocations", label: "EPC Allocations" },
              { key: "total_quantity", label: "Total Quantity", align: "center" },
              { key: "grand_total", label: "Grand Total" },
              { key: "payment_confirmed", label: "Payment Date" },
              { key: "days_elapsed", label: "Days Elapsed" },
              { key: "days_remaining", label: "SLA / Overdue" },
              { key: "status", label: "Workflow Status", align: "center" },
              { key: "actions", label: "Actions", align: "right" },
            ]}
            data={filteredFpoOrders}
            loading={fpoLoading}
            emptyMessage="No Franchisee Purchase Orders Found"
            renderRow={(order, index) => {
              const item = order.items?.[0] || {};
              const allocationsList = item.epc_allocations || [];
              const grandTotal = (order.grand_total_paise || 0) / 100;
              const hasPendingReceipt = allocationsList.some((a) => a.payment_status === "RECEIPT_SUBMITTED");

              return (
                <tr
                  key={order._id || order.id || order.po_number || index}
                  className="group hover:bg-primary/[0.03] transition-colors border-b border-border/60"
                >
                  {/* PO Number & Date */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                        <FaFileInvoiceDollar size={18} />
                      </div>
                      <div>
                        <div className="font-mono font-black text-text-primary text-xs tracking-tight">
                          {order.po_number}
                        </div>
                        <div className="text-[11px] font-medium text-text-muted mt-0.5 flex items-center gap-1">
                          <FaClock size={10} className="opacity-60" />
                          {new Date(order.created_at || order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Franchisee Partner */}
                  <td className="px-5 py-4">
                    <div className="font-bold text-text-primary text-xs max-w-[170px] truncate" title={order.franchisee_id?.business_name}>
                      {order.franchisee_id?.business_name || "Franchisee Account"}
                    </div>
                    <div className="text-[11px] text-text-muted font-medium mt-0.5 max-w-[170px] truncate">
                      {order.franchisee_id?.mobile || order.franchisee_id?.email || "Partner"}
                    </div>
                  </td>

                  {/* PO Type & Quota */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {order.po_category === "COMBINE_PO" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200">
                          Combine PO ({(order.items?.[0]?.epc_allocations || []).length} EPCs)
                        </span>
                      ) : (order.items?.[0]?.epc_allocations || []).length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200">
                          Single PO ({order.items[0].epc_allocations[0].company_name || order.items[0].epc_allocations[0].buyer_name || "1 EPC"})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                          Single PO (Warehouse)
                        </span>
                      )}
                      {order.total_booked_quantity ? (
                        <div className="text-[10px] font-bold text-text-primary">
                          {order.fulfilled_quantity || 0} / {order.total_booked_quantity} Kits
                          <span className="text-emerald-600 ml-1">
                            ({order.remaining_quantity != null ? order.remaining_quantity : order.total_booked_quantity} left)
                          </span>
                        </div>
                      ) : order.parent_po_id ? (
                        <div className="text-[10px] text-text-muted">
                          Drawn from {order.parent_po_id.po_number || "Parent PO"}
                        </div>
                      ) : null}
                    </div>
                  </td>

                  {/* Token Deposit */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {order.token_amount_paise > 0 ? (
                      <div>
                        <div className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          ₹{Math.round(order.token_amount_paise / 100).toLocaleString("en-IN")}
                        </div>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black ${order.token_payment_status === "ADJUSTED"
                            ? "bg-blue-100 text-blue-800"
                            : order.token_payment_status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                          {order.token_payment_status || "PENDING"}
                        </span>
                      </div>
                    ) : order.token_adjusted_paise > 0 ? (
                      <div>
                        <div className="font-black text-emerald-600 text-xs">
                          -₹{Math.round(order.token_adjusted_paise / 100).toLocaleString("en-IN")}
                        </div>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                          Token Adjusted ✓
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-muted">—</span>
                    )}
                  </td>

                  {/* Product & Kit */}
                  <td className="px-5 py-4">
                    <div className="font-bold text-text-primary text-xs max-w-[190px] truncate" title={item.item_name}>
                      {item.item_name || "Solar Kit"}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      {item.variant_name || "Kit Package"}
                    </div>
                  </td>

                  {/* EPC Allocations */}
                  <td className="px-5 py-4">
                    {allocationsList.length > 0 ? (
                      <div className="space-y-1.5 max-w-[240px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-surface-hover text-text-primary border border-border">
                            <FaUsers size={11} className="text-primary" /> {allocationsList.length} {allocationsList.length === 1 ? "Buyer" : "Buyers"}
                          </span>
                          {hasPendingReceipt && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 animate-pulse">
                              ⚡ Receipt Verification
                            </span>
                          )}
                          {allocationsList.every((a) => ["VERIFIED", "PAID"].includes(a.payment_status)) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[11px] text-text-secondary truncate font-medium"
                          title={allocationsList.map((a) => `${a.company_name || a.buyer_name} (${a.allocated_quantity} Kits)`).join(", ")}
                        >
                          {allocationsList.map((a) => `${a.company_name || a.buyer_name} (${a.allocated_quantity})`).join(", ")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted italic">Direct Purchase</span>
                    )}
                  </td>

                  {/* Total Quantity */}
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-black bg-primary/10 text-primary border border-primary/20">
                      {order.total_quantity || item.quantity || 0} Kits
                    </span>
                  </td>

                  {/* Grand Total */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-black text-text-primary text-xs">
                      ₹{grandTotal.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5 font-medium">
                      Landed Cost Incl. GST
                    </div>
                  </td>

                  {/* Payment Confirmed Date */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {order.payment_confirmed_at || order.paid_at || (order.payment_status === "PAID" || order.status === "PAID" ? order.updated_at || order.created_at : null) ? (
                      <div>
                        <div className="text-xs font-mono font-medium text-text-primary">
                          {new Date(order.payment_confirmed_at || order.paid_at || order.updated_at || order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {new Date(order.payment_confirmed_at || order.paid_at || order.updated_at || order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted font-mono">—</span>
                    )}
                  </td>

                  {/* Days Elapsed */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {(() => {
                      const payDate = order.payment_confirmed_at || order.paid_at || (order.payment_status === "PAID" || order.status === "PAID" ? order.updated_at || order.created_at : null);
                      if (!payDate) return <span className="text-xs text-text-muted font-mono">—</span>;
                      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(payDate).getTime()) / (1000 * 60 * 60 * 24)));
                      let badgeColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                      if (elapsed > 30) badgeColor = "bg-red-500/10 text-red-600 border-red-500/20 font-black";
                      else if (elapsed > 15) badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold";
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
                          {elapsed}d elapsed
                        </span>
                      );
                    })()}
                  </td>

                  {/* SLA / Overdue */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {(() => {
                      const isDelivered = order.status === "DELIVERED" || order.status === "COMPLETED";
                      if (isDelivered) {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <FaCheckCircle size={10} /> Delivered
                          </span>
                        );
                      }
                      const payDate = order.payment_confirmed_at || order.paid_at || (order.payment_status === "PAID" || order.status === "PAID" ? order.updated_at || order.created_at : null);
                      if (!payDate) return <span className="text-xs text-text-muted">—</span>;
                      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(payDate).getTime()) / (1000 * 60 * 60 * 24)));
                      const targetDays = 20;
                      const remaining = targetDays - elapsed;
                      if (remaining < 0) {
                        return (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/10 text-red-600 border border-red-500/20">
                            <FaExclamationTriangle size={10} /> Overdue {Math.abs(remaining)}d
                          </span>
                        );
                      }
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${remaining <= 3 ? "text-amber-600 bg-amber-500/10" : "text-text-secondary"}`}>
                          {remaining}d left
                        </span>
                      );
                    })()}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <StatusBadge status={order.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setJourneyOrder(order);
                          setJourneyProduct(item);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-primary hover:opacity-95 text-white shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                        title="View 8-Step Product Journey Lifecycle"
                      >
                        <FaTruckMoving size={12} />
                        <span>8-Step Journey</span>
                        <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-extrabold">
                          {getStageBadgeText(order.status)}
                        </span>
                      </button>
                      <Button
                        onClick={() => setSelectedOrder(order)}
                        size="sm"
                        leftIcon={<FaEye size={12} />}
                        className="rounded-xl text-xs font-black py-2 px-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                      >
                        Review & Actions
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: PO TOKEN REFUND REQUESTS & ACCOUNTS SETTLEMENT                    */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "refund_requests" && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                <FaUndoAlt size={22} />
              </div>
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Total Refund Claims</div>
                <div className="text-2xl font-black text-text-primary mt-0.5">{totalRefundRequestsCount} Claims</div>
                <div className="text-[10px] text-text-muted">EPC & Franchisee POs</div>
              </div>
            </div>

            <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-600 border border-amber-500/20">
                <FaClock size={22} />
              </div>
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Pending Accounts Review</div>
                <div className="text-2xl font-black text-text-primary mt-0.5">{pendingRefundsCount} Pending</div>
                <div className="text-[10px] text-amber-600 font-bold">Needs payout approval</div>
              </div>
            </div>

            <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-600 border border-emerald-500/20">
                <FaCheckCircle size={22} />
              </div>
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Approved & Settled</div>
                <div className="text-2xl font-black text-text-primary mt-0.5">{approvedRefundsCount} Settled</div>
                <div className="text-[10px] text-emerald-600 font-bold">UTR logged & verified</div>
              </div>
            </div>

            <div className="card p-5 border-2 border-border shadow-xs flex items-center gap-4">
              <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-600 border border-indigo-500/20">
                <FaMoneyBillWave size={22} />
              </div>
              <div>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">Net Settled Payouts</div>
                <div className="text-2xl font-black text-emerald-600 mt-0.5">
                  ₹{Math.round(totalSettledRefundPaise / 100).toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] text-indigo-600 font-bold">Disbursed to partners</div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="card p-4 border-2 border-border shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                value={refundSearch}
                onChange={(e) => setRefundSearch(e.target.value)}
                placeholder="Search by PO number, partner name, phone, or bank account..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={refundStatusFilter}
                onChange={(e) => setRefundStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer focus:outline-none focus:border-primary"
              >
                <option value="">All Settlement Statuses</option>
                <option value="PENDING">⚡ Pending Review ({pendingRefundsCount})</option>
                <option value="APPROVED">Approved (Awaiting Payout)</option>
                <option value="PROCESSED">✓ Settled & Paid</option>
                <option value="REJECTED">✕ Rejected</option>
              </select>

              {(refundSearch || refundStatusFilter) && (
                <button
                  onClick={() => {
                    setRefundSearch("");
                    setRefundStatusFilter("");
                  }}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-hover border border-border transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}

              <button
                onClick={fetchRefundRequests}
                className="px-4 py-2.5 rounded-xl bg-surface-hover hover:bg-border text-text-primary text-xs font-bold border border-border transition-all cursor-pointer"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Refund Requests Table */}
          <CustomTable
            headers={[
              { key: "po_number", label: "PO Details & Date" },
              { key: "requester", label: "Requester Account" },
              { key: "quota", label: "Quota Commitment" },
              { key: "token_accounting", label: "Token Breakdown" },
              { key: "penalty", label: "Penalty Deducted" },
              { key: "net_refund", label: "Net Refund Amount" },
              { key: "bank", label: "Payout Bank Details" },
              { key: "status", label: "Status", align: "center" },
              { key: "actions", label: "Actions", align: "right" },
            ]}
            data={filteredRefundRequests}
            loading={refundLoading}
            emptyMessage="No PO Token Refund Requests Found"
            renderRow={(req, index) => {
              const statusCfg = {
                PENDING: { label: "Pending Review", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
                APPROVED: { label: "Approved (Pending UTR)", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
                PROCESSED: { label: "Settled & Paid ✓", bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
                REJECTED: { label: "Rejected ✕", bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5" },
              }[req.status] || { label: req.status, bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };

              const netRefund = (req.refundable_amount_paise || 0) / 100;
              const penaltyAmt = (req.penalty_paise || 0) / 100;

              return (
                <tr
                  key={req._id || req.id || index}
                  className="group hover:bg-primary/[0.03] transition-colors border-b border-border/60"
                >
                  {/* PO Details */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shrink-0">
                        <FaUndoAlt size={16} />
                      </div>
                      <div>
                        <div className="font-mono font-black text-text-primary text-xs tracking-tight">
                          {req.po_number || req.po_id?.po_number || "PO Order"}
                        </div>
                        <div className="text-[11px] font-medium text-text-muted mt-0.5 flex items-center gap-1">
                          <FaClock size={10} className="opacity-60" />
                          {new Date(req.created_at || req.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Requester */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.2 rounded-md text-[9px] font-black uppercase ${req.requester_role === "EPC"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-purple-100 text-purple-800 border border-purple-200"
                          }`}>
                          {req.requester_role || "Partner"}
                        </span>
                        <span className="font-bold text-text-primary text-xs truncate max-w-[150px]" title={req.requester_name}>
                          {req.requester_name || "Applicant"}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted font-medium truncate max-w-[170px]">
                        {req.requester_phone || req.requester_email || "—"}
                      </div>
                    </div>
                  </td>

                  {/* Quota */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="space-y-0.5 text-xs">
                      <div className="font-bold text-text-primary">
                        {req.committed_quantity || req.po_id?.total_booked_quantity || 0} Kits Committed
                      </div>
                      <div className="text-[10px] text-text-muted">
                        Fulfilled: <strong className="text-text-primary">{req.purchased_quantity || req.po_id?.fulfilled_quantity || 0}</strong> • Unpurchased: <strong className="text-amber-600">{req.unpurchased_quantity || 0}</strong>
                      </div>
                    </div>
                  </td>

                  {/* Token Breakdown */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs">
                    <div className="space-y-0.5">
                      <div className="text-text-muted text-[11px]">
                        Deposit: <strong className="text-text-primary">₹{Math.round((req.token_paid_paise || 0) / 100).toLocaleString("en-IN")}</strong>
                      </div>
                      {req.token_adjusted_paise > 0 && (
                        <div className="text-text-muted text-[11px]">
                          Adjusted: <strong className="text-blue-600">-₹{Math.round(req.token_adjusted_paise / 100).toLocaleString("en-IN")}</strong>
                        </div>
                      )}
                      <div className="text-[11px] font-bold text-text-primary">
                        Escrow: ₹{Math.round((req.token_escrow_balance_paise || 0) / 100).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </td>

                  {/* Penalty */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {penaltyAmt > 0 ? (
                      <div>
                        <div className="font-black text-red-600 text-xs">
                          -₹{Math.round(penaltyAmt).toLocaleString("en-IN")}
                        </div>
                        <span className="text-[9px] font-bold text-red-700 bg-red-100 dark:bg-red-950/40 px-1.5 py-0.2 rounded">
                          {req.penalty_type} {req.penalty_rate ? `(${req.penalty_rate}%)` : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600">₹0 (Zero Penalty)</span>
                    )}
                  </td>

                  {/* Net Refund Amount */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{Math.round(netRefund).toLocaleString("en-IN")}
                    </div>
                    <span className="text-[9px] font-bold text-text-muted">Net Payout Amount</span>
                  </td>

                  {/* Bank Details */}
                  <td className="px-5 py-4">
                    {req.bank_details ? (
                      <div className="text-xs space-y-0.5 max-w-[190px]">
                        <div className="font-bold text-text-primary truncate" title={req.bank_details.bank_name}>
                          {req.bank_details.bank_name || "Bank Account"}
                        </div>
                        <div className="font-mono text-[11px] text-text-secondary truncate">
                          A/C: ••••{String(req.bank_details.account_number || "").slice(-4)}
                        </div>
                        <div className="text-[10px] text-text-muted truncate">
                          IFSC: {req.bank_details.ifsc_code || "—"} • {req.bank_details.account_holder_name}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-muted italic">Bank details pending</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-2xs"
                      style={{ backgroundColor: statusCfg.bg, color: statusCfg.text, border: `1px solid ${statusCfg.border}` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusCfg.text }} />
                      {statusCfg.label}
                    </span>
                    {req.payout_details?.payment_reference && (
                      <div className="font-mono text-[10px] text-text-muted mt-1 truncate max-w-[130px] mx-auto">
                        UTR: {req.payout_details.payment_reference}
                      </div>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {req.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRefundApprove(req);
                              setApproveForm({
                                payment_method: "RTGS",
                                payment_reference: "",
                                approval_notes: `Refund approved for PO ${req.po_number || ""}`,
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                          >
                            ✓ Approve & Settle
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRefundReject(req);
                              setRejectReasonInput("");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setViewingRefund(req)}
                        className="px-3 py-1.5 rounded-xl bg-surface-hover hover:bg-border text-text-primary font-bold text-xs border border-border cursor-pointer shadow-2xs"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }}
          />
        </div>
      )}

      {/* ── ADMIN / ACCOUNTS ORDER REVIEW & ACTION MODAL ────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden z-10">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-text-primary">
                    Franchisee PO Order: {selectedOrder.po_number}
                  </h2>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Partner: <strong className="text-text-primary">{selectedOrder.franchisee_id?.business_name || "Franchisee"}</strong> • Plan: <strong className="text-primary">{selectedOrder.plan_id?.name || "Standard Plan"}</strong>
                </p>
                {/* Creator Attribution */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-text-muted font-bold">Created By:</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedOrder.created_by_role === "BDE"
                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                      : "bg-purple-100 text-purple-800 border border-purple-200"
                    }`}>
                    {selectedOrder.created_by_role === "BDE" ? "BDE" : "Franchisee Partner"}
                  </span>
                  {(selectedOrder.creator_name || selectedOrder.creator_code) && (
                    <span className="text-[11px] font-bold text-text-secondary">
                      ({selectedOrder.creator_name || selectedOrder.creator_code})
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <FaTimes size={16} />
              </button>
            </div>c

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* PO Type, Quota & Token Deposit Summary */}
              <div className="p-4 rounded-2xl bg-surface-hover/80 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                      PO Category:
                    </span>
                    {selectedOrder.po_category === "COMBINE_PO" || (selectedOrder.items?.[0]?.epc_allocations || []).length > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                        Combine PO (Multi-EPC)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                        Single PO (Hub Stock)
                      </span>
                    )}
                  </div>

                  {selectedOrder.token_amount_paise > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-muted font-bold">Escrow Token:</span>
                      <span className="font-black text-emerald-600 text-xs">
                        ₹{Math.round(selectedOrder.token_amount_paise / 100).toLocaleString("en-IN")}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${selectedOrder.token_payment_status === "ADJUSTED"
                          ? "bg-blue-100 text-blue-800"
                          : selectedOrder.token_payment_status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                        {selectedOrder.token_payment_status || "PENDING"}
                      </span>
                    </div>
                  )}
                </div>

                {selectedOrder.total_booked_quantity ? (
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/50">
                    <div className="p-2 bg-surface rounded-xl border border-border">
                      <div className="text-[10px] text-text-muted">Total Booked</div>
                      <div className="font-black text-text-primary text-xs">{selectedOrder.total_booked_quantity} Kits</div>
                    </div>
                    <div className="p-2 bg-surface rounded-xl border border-border">
                      <div className="text-[10px] text-text-muted">Fulfilled (Loose)</div>
                      <div className="font-black text-blue-600 text-xs">{selectedOrder.fulfilled_quantity || 0} Kits</div>
                    </div>
                    <div className="p-2 bg-surface rounded-xl border border-border">
                      <div className="text-[10px] text-text-muted">Remaining Quota</div>
                      <div className="font-black text-emerald-600 text-xs">
                        {selectedOrder.remaining_quantity != null ? selectedOrder.remaining_quantity : selectedOrder.total_booked_quantity} Kits
                      </div>
                    </div>
                  </div>
                ) : selectedOrder.parent_po_id ? (
                  <div className="p-2.5 bg-surface rounded-xl border border-border flex items-center justify-between">
                    <span className="text-text-muted">Linked Parent PO:</span>
                    <span className="font-mono font-bold text-primary">{selectedOrder.parent_po_id.po_number || "Parent PO"}</span>
                    {selectedOrder.is_final_po_settlement && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Token -₹{Math.round((selectedOrder.token_adjusted_paise || 0) / 100).toLocaleString("en-IN")} Adjusted ✓
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* PO Validity, Escrow Accounting & Expiry Penalty Snapshot */}
              {(() => {
                const expiryDate = selectedOrder.lock_expires_at || selectedOrder.expires_at;
                const daysLeft = expiryDate
                  ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                const tokenPaid = (selectedOrder.token_amount_paise || 0) / 100;
                const tokenAdjusted = (selectedOrder.token_adjusted_total_paise || selectedOrder.token_adjusted_paise || 0) / 100;
                const escrowBal = (selectedOrder.token_balance_paise || (selectedOrder.token_amount_paise - (selectedOrder.token_adjusted_total_paise || selectedOrder.token_adjusted_paise || 0))) / 100;
                const penaltyAmt = (selectedOrder.applicable_penalty_paise || 0) / 100;
                const refundableToken = (selectedOrder.refundable_token_paise || 0) / 100;

                return (
                  <div className="p-4 rounded-2xl bg-surface-hover/50 border-2 border-border/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <span className="font-black text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <FaClock className="text-primary" /> PO Validity, Escrow & Expiry Penalty Lifecycle
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${selectedOrder.settlement_status === "REFUNDED"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedOrder.settlement_status === "EXPIRED"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                        Settlement: {selectedOrder.settlement_status || "ACTIVE"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-surface border border-border">
                        <span className="text-[10px] text-text-muted block">Expiry Date</span>
                        <strong className="text-text-primary text-[11px]">
                          {expiryDate ? new Date(expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "30 Days SLA"}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface border border-border">
                        <span className="text-[10px] text-text-muted block">Days to Expiry</span>
                        <strong className={`text-[11px] ${daysLeft != null && daysLeft <= 0
                            ? "text-red-600 font-black"
                            : daysLeft != null && daysLeft <= 7
                              ? "text-amber-600 font-black"
                              : "text-emerald-600 font-black"
                          }`}>
                          {daysLeft != null ? (daysLeft <= 0 ? "EXPIRED" : `${daysLeft} Days Left`) : "Active"}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface border border-border">
                        <span className="text-[10px] text-text-muted block">Escrow Balance</span>
                        <strong className="text-text-primary text-[11px]">
                          ₹{Math.max(0, Math.round(escrowBal)).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface border border-border">
                        <span className="text-[10px] text-text-muted block">Applicable Penalty</span>
                        <strong className={`text-[11px] ${penaltyAmt > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {penaltyAmt > 0 ? `-₹${Math.round(penaltyAmt).toLocaleString("en-IN")}` : "₹0"}
                        </strong>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface border border-border/80 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-text-muted">Token Accounting: </span>
                        <span>Paid <strong>₹{Math.round(tokenPaid).toLocaleString("en-IN")}</strong> • Adjusted <strong>₹{Math.round(tokenAdjusted).toLocaleString("en-IN")}</strong></span>
                      </div>
                      {refundableToken > 0 && (
                        <div className="font-black text-emerald-600">
                          Refundable Escrow: ₹{Math.round(refundableToken).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Product Info */}
              <div className="space-y-2">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  Ordered Solar Kit
                </h4>
                <div className="p-3.5 rounded-xl bg-surface-hover border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-text-primary">
                      {selectedOrder.items?.[0]?.item_name || "Solar Kit"}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      Total Units: <strong className="text-text-primary">{selectedOrder.total_quantity || selectedOrder.items?.[0]?.quantity || 0} Kits</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-text-muted">Grand Total Payable</div>
                    <div className="text-base font-black text-primary">
                      ₹{((selectedOrder.grand_total_paise || 0) / 100).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {/* EPC Allocations Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FaUsers size={12} className="text-primary" /> EPC Buyer Quantity & Payment Receipt Verification
                </h4>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                      <tr>
                        <th className="py-2.5 px-3">EPC Buyer Company</th>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3 text-center">Allocated Kits</th>
                        <th className="py-2.5 px-3 text-center">Payment Status</th>
                        <th className="py-2.5 px-3 text-right">Verification Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(selectedOrder.items?.[0]?.epc_allocations || []).map((alloc, aIdx) => {
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
                                <div className="text-[10px] text-danger font-medium mt-0.5">{alloc.payment_notes}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-text-muted text-[11px]">{alloc.gstin || "N/A"}</td>
                            <td className="py-2.5 px-3 text-center font-black text-primary text-xs">
                              {alloc.allocated_quantity} Kits
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
                                    View Receipt
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
              </div>

              {/* Linked Drawdown Repeat Orders Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FaShoppingCart size={12} className="text-primary" /> Linked Drawdown Repeat Orders
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {(selectedOrder.linked_repeat_orders || []).length} Drawdown(s) Placed
                  </span>
                </div>

                {(selectedOrder.linked_repeat_orders || []).length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border text-center text-text-muted text-[11px]">
                    No drawdown repeat orders have been placed against this PO yet.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                        <tr>
                          <th className="py-2.5 px-3">Order Number & Date</th>
                          <th className="py-2.5 px-3">Buyer Partner</th>
                          <th className="py-2.5 px-3 text-center">Kits Drawn</th>
                          <th className="py-2.5 px-3">Net Payable (₹)</th>
                          <th className="py-2.5 px-3">Bank UTR</th>
                          <th className="py-2.5 px-3 text-right">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedOrder.linked_repeat_orders.map((child, cIdx) => {
                          const isChildPaid = ["PAID", "CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED", "COMPLETED"].includes(child.status);
                          const childTotal = (child.net_payable_paise || child.grand_total_paise || 0) / 100;
                          const buyerName = child.created_by_role === "SOLAR_EPC" || child.epc_id
                            ? (child.epc_id?.name || child.epc_id?.company_name || "Solar EPC")
                            : (child.franchisee_id?.business_name || "Franchisee Partner");

                          return (
                            <tr key={cIdx} className="hover:bg-surface-hover/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-xs text-text-primary">
                                {child.order_number || child.po_number}
                                <div className="text-[9px] text-text-muted font-sans font-normal">
                                  {new Date(child.created_at || child.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 font-bold text-text-primary text-xs">
                                {buyerName}
                                <span className="block text-[9px] text-text-muted font-normal">
                                  {child.created_by_role === "SOLAR_EPC" ? "Onboarded EPC" : "Franchisee"}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-center font-black text-primary text-xs">
                                {child.total_quantity || child.items?.[0]?.quantity || 1} Kits
                              </td>

                              <td className="py-2.5 px-3 font-mono font-black text-text-primary text-xs">
                                ₹{childTotal.toLocaleString("en-IN")}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted">
                                {child.payment_reference || child.offline_payment?.utr_number || "—"}
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isChildPaid
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                }`}>
                                  {isChildPaid ? "✓ Paid & Cleared" : "⏳ Pending Clearance"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Workflow Action Buttons */}
              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  Workflow Actions
                </h4>
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Approve / Reject */}
                  {["SUBMITTED", "PENDING_APPROVAL"].includes(selectedOrder.status) && (
                    <>
                      <button
                        onClick={() => handleApprovePo(selectedOrder._id)}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        ✓ Approve Purchase Order
                      </button>
                      <button
                        onClick={() => handleRejectPo(selectedOrder._id)}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        ✕ Reject PO
                      </button>
                    </>
                  )}

                  {/* Payment Confirmation */}
                  {["APPROVED", "AWAITING_PAYMENT"].includes(selectedOrder.status) && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <FaMoneyBillWave size={12} /> Confirm Accounts Payment
                    </button>
                  )}

                  {/* Dispatch */}
                  {["PAID", "STOCK_ALLOCATED", "PROCESSING"].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleDispatchPo(selectedOrder._id)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <FaTruck size={12} /> Mark as Dispatched
                    </button>
                  )}

                  {/* Deliver */}
                  {selectedOrder.status === "DISPATCHED" && (
                    <button
                      onClick={() => handleDeliverPo(selectedOrder._id)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <FaCheckCircle size={12} /> Mark Delivered
                    </button>
                  )}

                  {/* 8-Step Journey Direct Action */}
                  <button
                    onClick={() => {
                      setJourneyOrder(selectedOrder);
                      setJourneyProduct(selectedOrder.items?.[0]);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-primary hover:opacity-95 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <FaTruckMoving size={12} /> 8-Step Journey ({getStageBadgeText(selectedOrder.status)})
                  </button>

                  {/* Manual Settle & Expire PO Action */}
                  {!["EXPIRED", "CANCELLED", "COMPLETED"].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleSettlePoExpiry(selectedOrder._id)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <FaExclamationTriangle size={12} /> Settle & Expire PO
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT CONFIRMATION SUB-MODAL ──────────────────────────────────── */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black text-text-primary flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-600" /> Confirm Accounts Payment
            </h3>
            <p className="text-xs text-text-muted">
              Verify receipt of payment for PO <strong>{selectedOrder.po_number}</strong> (Amount: <strong>₹{((selectedOrder.grand_total_paise || 0) / 100).toLocaleString("en-IN")}</strong>).
            </p>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  Bank / UTR Reference Number
                </label>
                <input
                  type="text"
                  required
                  value={paymentRefInput}
                  onChange={(e) => setPaymentRefInput(e.target.value)}
                  placeholder="e.g. UTR-2026-998811"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary"
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
                  className="px-4 py-2 rounded-xl text-xs font-black bg-primary text-white hover:opacity-90 cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── APPROVE & SETTLE PO REFUND MODAL ─────────────────────────────── */}
      {selectedRefundApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface border border-border shadow-2xl p-6 space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/20">
                  <FaCheckCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary">
                    Approve & Settle Token Refund
                  </h3>
                  <div className="text-xs text-text-muted mt-0.5">
                    PO Order: <strong className="font-mono text-text-primary">{selectedRefundApprove.po_number || selectedRefundApprove.po_id?.po_number}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRefundApprove(null)}
                className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Payout Summary Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Net Approved Payout</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ₹{Math.round((selectedRefundApprove.refundable_amount_paise || 0) / 100).toLocaleString("en-IN")}
                </span>
                <div className="text-[10px] text-text-muted mt-0.5">
                  Token: ₹{Math.round((selectedRefundApprove.token_paid_paise || 0) / 100).toLocaleString("en-IN")} • Penalty: -₹{Math.round((selectedRefundApprove.penalty_paise || 0) / 100).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-text-muted font-bold block">Requester Role</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-surface text-text-primary border border-border shadow-2xs">
                  {selectedRefundApprove.requester_role || "PARTNER"}
                </span>
                <div className="text-xs font-bold text-text-primary mt-1 truncate max-w-[140px]">
                  {selectedRefundApprove.requester_name}
                </div>
              </div>
            </div>

            {/* Beneficiary Bank Details Card */}
            {selectedRefundApprove.bank_details ? (
              <div className="p-3.5 rounded-2xl bg-surface-hover border border-border space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-text-secondary font-black uppercase text-[10px] tracking-wider">
                  <FaUniversity className="text-primary" /> Verified Beneficiary Bank Account
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-text-muted block text-[10px]">Bank Name</span>
                    <strong className="text-text-primary">{selectedRefundApprove.bank_details.bank_name || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Account Holder</span>
                    <strong className="text-text-primary">{selectedRefundApprove.bank_details.account_holder_name || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">Account Number</span>
                    <strong className="font-mono text-text-primary">{selectedRefundApprove.bank_details.account_number || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px]">IFSC Code</span>
                    <strong className="font-mono text-text-primary">{selectedRefundApprove.bank_details.ifsc_code || "N/A"}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 font-medium">
                Warning: No bank details attached. Payout will be tracked manually.
              </div>
            )}

            {/* Settlement Payout Form */}
            <form onSubmit={handleApproveRefund} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-text-secondary uppercase tracking-wider mb-1">
                    Disbursement Mode *
                  </label>
                  <select
                    value={approveForm.payment_method}
                    onChange={(e) => setApproveForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer focus:outline-none focus:border-primary"
                  >
                    <option value="RTGS">RTGS Transfer</option>
                    <option value="NEFT">NEFT Transfer</option>
                    <option value="IMPS">IMPS Immediate</option>
                    <option value="UPI">UPI Direct</option>
                    <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-secondary uppercase tracking-wider mb-1">
                    Bank Transaction UTR / Ref *
                  </label>
                  <input
                    type="text"
                    required
                    value={approveForm.payment_reference}
                    onChange={(e) => setApproveForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                    placeholder="e.g. UTR-2026-998811"
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-wider mb-1">
                  Settlement & Payout Notes (Optional)
                </label>
                <input
                  type="text"
                  value={approveForm.approval_notes}
                  onChange={(e) => setApproveForm(prev => ({ ...prev, approval_notes: e.target.value }))}
                  placeholder="e.g. Disbursed post SLA audit and 10% penalty deduction"
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedRefundApprove(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-border text-text-muted hover:bg-surface-hover cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transition-all"
                >
                  {actionLoading ? "Processing..." : "Confirm & Settle Payout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REJECT PO REFUND MODAL ────────────────────────────────────────── */}
      {selectedRefundReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-surface border border-border shadow-2xl p-6 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-red-500/10 rounded-xl text-red-600 border border-red-500/20">
                  <FaBan size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary">
                    Reject Refund Request
                  </h3>
                  <div className="text-xs text-text-muted mt-0.5">
                    PO Order: <strong className="font-mono text-text-primary">{selectedRefundReject.po_number || selectedRefundReject.po_id?.po_number}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRefundReject(null)}
                className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Please enter the mandatory reason for declining this refund request. This explanation will be logged and visible to the applicant.
            </p>

            <form onSubmit={handleRejectRefund} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-wider mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="e.g. Committed kits quota not eligible for refund; PO was cancelled due to partner breach."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-border bg-surface text-text-primary focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedRefundReject(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-border text-text-muted hover:bg-surface-hover cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW REFUND DETAILS MODAL ─────────────────────────────────────── */}
      {viewingRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-text-primary">
                    Refund Claim Details: {viewingRefund.po_number || viewingRefund.po_id?.po_number}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${viewingRefund.status === "PROCESSED"
                      ? "bg-emerald-100 text-emerald-800"
                      : viewingRefund.status === "APPROVED"
                        ? "bg-blue-100 text-blue-800"
                        : viewingRefund.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                    }`}>
                    {viewingRefund.status}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Requested on {new Date(viewingRefund.created_at || viewingRefund.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => setViewingRefund(null)}
                className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Requester & Quota Information */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-hover/60 border border-border">
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-bold block">Applicant</span>
                  <div className="font-bold text-text-primary mt-0.5">{viewingRefund.requester_name}</div>
                  <div className="text-[11px] text-text-muted">{viewingRefund.requester_phone || viewingRefund.requester_email || "—"}</div>
                  <span className="inline-block mt-1 px-2 py-0.2 rounded text-[9px] font-black uppercase bg-surface text-text-primary border border-border">
                    Role: {viewingRefund.requester_role}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-bold block">Kit Fulfillment</span>
                  <div className="font-bold text-text-primary mt-0.5">
                    {viewingRefund.committed_quantity || viewingRefund.po_id?.total_booked_quantity || 0} Total Kits Committed
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold">
                    ✓ {viewingRefund.purchased_quantity || viewingRefund.po_id?.fulfilled_quantity || 0} Kits Fulfilled
                  </div>
                  <div className="text-[11px] text-amber-600 font-bold">
                    ⚡ {viewingRefund.unpurchased_quantity || 0} Kits Unpurchased
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="space-y-2">
                <h4 className="font-black text-text-primary uppercase tracking-wider text-[11px]">
                  Token Accounting & Penalty Calculation
                </h4>
                <div className="p-4 rounded-2xl bg-surface-hover/40 border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">Initial Commitment Token Paid:</span>
                    <strong className="text-text-primary">₹{Math.round((viewingRefund.token_paid_paise || 0) / 100).toLocaleString("en-IN")}</strong>
                  </div>
                  {viewingRefund.token_adjusted_paise > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Adjusted Against Previous Kits:</span>
                      <strong className="text-blue-600">-₹{Math.round(viewingRefund.token_adjusted_paise / 100).toLocaleString("en-IN")}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">Available Escrow Balance:</span>
                    <strong className="text-text-primary">₹{Math.round((viewingRefund.token_escrow_balance_paise || 0) / 100).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-border">
                    <span className="text-red-600 font-semibold">
                      Applicable Expiry Penalty ({viewingRefund.penalty_type} {viewingRefund.penalty_rate ? `@ ${viewingRefund.penalty_rate}%` : ""}):
                    </span>
                    <strong className="text-red-600">-₹{Math.round((viewingRefund.penalty_paise || 0) / 100).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-border font-black">
                    <span className="text-text-primary">Net Refundable Balance:</span>
                    <span className="text-emerald-600 text-base">
                      ₹{Math.round((viewingRefund.refundable_amount_paise || 0) / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              {viewingRefund.bank_details && (
                <div className="space-y-2">
                  <h4 className="font-black text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <FaUniversity className="text-primary" /> Payout Bank Beneficiary
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-surface-hover/80 border border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted block text-[10px]">Bank Name</span>
                      <strong className="text-text-primary">{viewingRefund.bank_details.bank_name || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">Account Holder</span>
                      <strong className="text-text-primary">{viewingRefund.bank_details.account_holder_name || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">Account Number</span>
                      <strong className="font-mono text-text-primary">{viewingRefund.bank_details.account_number || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">IFSC Code</span>
                      <strong className="font-mono text-text-primary">{viewingRefund.bank_details.ifsc_code || "N/A"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Payout Details (if approved / processed) */}
              {viewingRefund.payout_details && viewingRefund.payout_details.payment_reference && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    ✓ Accounts Settlement Record
                  </span>
                  <div className="text-xs">
                    UTR / Reference: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{viewingRefund.payout_details.payment_reference}</strong>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Mode: <strong>{viewingRefund.payout_details.payment_method || "RTGS"}</strong> • Disbursed: {viewingRefund.payout_details.processed_at ? new Date(viewingRefund.payout_details.processed_at).toLocaleString("en-IN") : "Recorded"}
                  </div>
                </div>
              )}

              {/* Rejection Note (if rejected) */}
              {viewingRefund.rejection_reason && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-1">
                  <span className="text-[10px] font-black text-red-800 dark:text-red-300 uppercase tracking-wider block">
                    ✕ Decline / Rejection Reason
                  </span>
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                    {viewingRefund.rejection_reason}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={() => setViewingRefund(null)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-primary text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
