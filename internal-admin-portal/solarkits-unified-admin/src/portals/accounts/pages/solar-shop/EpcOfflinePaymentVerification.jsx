import React, { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEye,
  FiExternalLink,
  FiSearch,
  FiRefreshCw,
  FiDollarSign,
  FiFilter,
  FiAlertTriangle,
  FiX,
  FiShield,
  FiFileText,
} from "react-icons/fi";
import { MdOutlineVerifiedUser, MdReceipt } from "react-icons/md";
import {
  getOfflineOrdersForVerification,
  verifyEpcOrderPayment,
  verifyFpoOrderPayment,
} from "../../api/solarshopAccounts";

export default function EpcOfflinePaymentVerification() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("pending"); // 'pending' | 'approved' | 'rejected' | 'all'
  const [orderTypeFilter, setOrderTypeFilter] = useState("all"); // 'all' | 'epc' | 'fpo' | 'loose'
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Modals & Action
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    decision: "approved", // 'approved' | 'rejected'
    order: null,
    reason: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter, orderTypeFilter]);

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        status: statusFilter,
        order_type: orderTypeFilter,
      };
      if (search.trim()) params.search = search.trim();

      const res = await getOfflineOrdersForVerification(params);
      if (res?.status === "success") {
        setOrders(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error("Failed to load offline orders for verification:", err);
      showAlert("error", "Failed to load offline payment records.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (order, decision) => {
    setActionModal({
      isOpen: true,
      decision,
      order,
      reason: "",
      notes: "",
    });
  };

  const handleCloseAction = () => {
    setActionModal({ isOpen: false, decision: "approved", order: null, reason: "", notes: "" });
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    const { order, decision, reason, notes } = actionModal;
    if (!order) return;

    if (decision === "rejected" && !reason.trim()) {
      showAlert("error", "Rejection reason is mandatory.");
      return;
    }

    setSubmitting(true);
    try {
      const isMilestone2 = order.payment_milestones?.milestone_verification_status === "final_payment_pending_verification" ||
        order.payment_milestones?.milestones?.[1]?.payment_status === "pending_verification";

      const payload = {
        decision,
        rejection_reason: reason.trim(),
        notes: notes.trim(),
        milestone_number: isMilestone2 ? 2 : 1,
      };

      let res;
      if (order.order_type === "epc") {
        res = await verifyEpcOrderPayment(order.id || order._id, payload);
      } else {
        res = await verifyFpoOrderPayment(order.id || order._id, payload);
      }

      if (res?.status === "success") {
        showAlert(
          "success",
          decision === "approved"
            ? `Order #${order.order_number} verified! Moved to Admin Approval Queue.`
            : `Order #${order.order_number} payment rejected.`
        );
        handleCloseAction();
        fetchOrders(pagination.page);
      }
    } catch (err) {
      console.error("Verification submit error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to process verification.";
      showAlert("error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert({ type: "", message: "" });
    }, 4500);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <MdOutlineVerifiedUser className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              EPC & Offline Payment Verification
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Verify UTR transactions and bank transfer receipts uploaded for EPC & Franchise orders
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchOrders(1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Alert Banner ────────────────────────────────────────────────────── */}
      {alert.message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            alert.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {alert.type === "success" ? <FiCheckCircle className="text-lg flex-shrink-0" /> : <FiAlertTriangle className="text-lg flex-shrink-0" />}
          <span className="text-sm font-medium">{alert.message}</span>
        </div>
      )}

      {/* ── Summary KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("pending")}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            statusFilter === "pending"
              ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Pending Verification</span>
            <FiClock className="text-amber-500 text-base" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats.pending}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Requires bank credit check
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("approved")}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            statusFilter === "approved"
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Verified by Accounts</span>
            <FiCheckCircle className="text-emerald-500 text-base" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.approved}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sent to Admin approval queue
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("rejected")}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            statusFilter === "rejected"
              ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Rejected Payments</span>
            <FiXCircle className="text-rose-500 text-base" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {stats.rejected}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            UTR not credited / invalid proof
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("all")}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm ${
            statusFilter === "all"
              ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 ring-2 ring-slate-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>All Offline Orders</span>
            <MdReceipt className="text-indigo-500 text-base" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.total}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total offline submissions
          </div>
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white mr-2">
              Orders List ({pagination.total})
            </span>

            {/* Status Pills */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              {[
                { key: "pending", label: "Pending" },
                { key: "approved", label: "Verified" },
                { key: "rejected", label: "Rejected" },
                { key: "all", label: "All" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setStatusFilter(btn.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    statusFilter === btn.key
                      ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Search Order #, UTR, Customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchOrders(1)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition w-60"
              />
            </div>

            {/* Order Type Filter */}
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="epc">EPC Orders</option>
              <option value="fpo">Franchisee PO</option>
              <option value="loose">Loose Orders</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Customer / Partner</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">UTR Number</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Receipt Proof</th>
                <th className="py-3 px-4">Accounts Status</th>
                <th className="py-3 px-4 text-right">Verification Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <FiRefreshCw className="animate-spin inline mr-2 text-base" /> Loading offline orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No offline orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id || o._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {o.order_number}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          o.order_type === "epc"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : o.order_type === "loose"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        }`}
                      >
                        {o.order_type_label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {o.customer_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {o.customer_phone}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <div>{o.district_name}</div>
                      <div className="text-[10px] text-slate-400">{o.state_name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {o.utr_number}
                      {o.sender_bank && o.sender_bank !== "-" && (
                        <div className="text-[10px] font-sans text-slate-400">{o.sender_bank}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {o.payment_milestones && (
                        <div className="text-[10px] font-semibold mt-0.5">
                          {o.is_trial_order || o.order_type === "trial_order" || o.payment_milestones.remaining_percentage === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Full Payment (Trial)</span>
                          ) : o.payment_milestones.milestone_verification_status === "final_payment_pending_verification" ? (
                            <span className="text-purple-600 dark:text-purple-400">Milestone 2 ({o.payment_milestones.remaining_percentage || 70}% Final)</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Milestone 1 ({o.payment_milestones.advance_percentage || 30}% Adv)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {o.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(o.receipt_url)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-medium transition"
                        >
                          <FiEye /> View Proof
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No receipt</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          o.verification_status === "approved"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : o.verification_status === "rejected"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {o.verification_status === "approved" ? (
                          <FiCheckCircle />
                        ) : o.verification_status === "rejected" ? (
                          <FiXCircle />
                        ) : (
                          <FiClock />
                        )}
                        {o.verification_status}
                      </span>
                      {o.verified_by && (
                        <div className="text-[10px] text-slate-400 mt-0.5">by {o.verified_by}</div>
                      )}
                      {o.rejection_reason && (
                        <div className="text-[10px] text-rose-500 font-medium mt-0.5 max-w-xs truncate" title={o.rejection_reason}>
                          Reason: {o.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {o.verification_status === "pending" ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAction(o, "approved")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAction(o, "rejected")}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold text-xs transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {o.verification_status === "approved" ? "Sent to Admin" : "Closed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchOrders(pagination.page - 1)}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchOrders(pagination.page + 1)}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Receipt Proof Modal ─────────────────────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Payment Transfer Receipt / Screenshot
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceipt}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 transition"
                  title="Open original in new tab"
                >
                  <FiExternalLink />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 transition"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              {selectedReceipt.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={selectedReceipt}
                  title="Receipt PDF"
                  className="w-full h-[65vh] rounded-lg border border-slate-300"
                />
              ) : (
                <img
                  src={selectedReceipt}
                  alt="Receipt Preview"
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Verification Action Dialog (Verify / Reject) ────────────────────── */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {actionModal.decision === "approved" ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                    <FiCheckCircle className="text-xl" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                    <FiXCircle className="text-xl" />
                  </div>
                )}
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {actionModal.decision === "approved"
                    ? "Verify Offline Bank Transfer"
                    : "Reject Offline Bank Transfer"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseAction}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Order: <span className="font-mono font-bold">{actionModal.order?.order_number}</span> (
              {actionModal.order?.customer_name}) Amount:{" "}
              <span className="font-bold">
                ₹{Number(actionModal.order?.amount_paid).toLocaleString("en-IN")}
              </span>
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div>
                <span className="text-slate-400">UTR Reference:</span>{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {actionModal.order?.utr_number}
                </span>
              </div>
              {actionModal.order?.sender_bank && (
                <div>
                  <span className="text-slate-400">Bank Name:</span>{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {actionModal.order?.sender_bank}
                  </span>
                </div>
              )}
            </div>

            {actionModal.decision === "approved" ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirming verification will validate the bank credit and automatically forward this order
                to the <strong>Admin Offline Approval Queue</strong> for final release into operations.
              </p>
            ) : (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Please provide the specific reason why this UTR or payment proof was rejected.
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {actionModal.decision === "approved" ? "Verification Notes (Optional):" : "Rejection Reason *:"}
              </label>
              <textarea
                rows={3}
                required={actionModal.decision === "rejected"}
                placeholder={
                  actionModal.decision === "approved"
                    ? "e.g. Bank statement verified; ₹ credited on date."
                    : "e.g. UTR number not found in bank statement; amount mismatch."
                }
                value={actionModal.decision === "approved" ? actionModal.notes : actionModal.reason}
                onChange={(e) =>
                  actionModal.decision === "approved"
                    ? setActionModal({ ...actionModal, notes: e.target.value })
                    : setActionModal({ ...actionModal, reason: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseAction}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAction}
                disabled={submitting}
                className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5 ${
                  actionModal.decision === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                } disabled:opacity-50`}
              >
                {submitting ? (
                  <>
                    <FiRefreshCw className="animate-spin" /> Submitting...
                  </>
                ) : actionModal.decision === "approved" ? (
                  "Confirm Verification"
                ) : (
                  "Confirm Rejection"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
