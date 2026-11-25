import React, { useEffect, useState } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiCheckSquare,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiExternalLink,
  FiDollarSign,
  FiFileText,
  FiUser,
  FiAlertTriangle,
  FiX,
  FiShield,
  FiArrowRight,
} from "react-icons/fi";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api"
).replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
const ADMIN_API = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${API_BASE}/admin-api`;

export default function OfflineApprovalQueue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Modals & Action States
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: "approve", // 'approve' | 'reject'
    order: null,
    remarks: "",
  });
  const [submittingAction, setSubmittingAction] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  useEffect(() => {
    fetchPendingOrders(1);
  }, [orderTypeFilter]);

  const fetchPendingOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
      });
      if (orderTypeFilter !== "all") params.append("order_type", orderTypeFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await axios.get(`${ADMIN_API}/payment-config/offline-pending?${params.toString()}`, {
        headers: authHeaderObj(),
      });

      if (res.data?.status === "success") {
        setOrders(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error("Failed to fetch pending offline orders:", err);
      showAlert("error", "Failed to load offline approval queue.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (order, type) => {
    setActionModal({
      isOpen: true,
      type,
      order,
      remarks: "",
    });
  };

  const handleCloseAction = () => {
    setActionModal({ isOpen: false, type: "approve", order: null, remarks: "" });
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    const { order, type, remarks } = actionModal;
    if (!order) return;

    if (type === "reject" && !remarks.trim()) {
      showAlert("error", "Rejection remarks are mandatory.");
      return;
    }

    setSubmittingAction(true);
    try {
      const endpoint = `${ADMIN_API}/payment-config/offline-orders/${order.order_type}/${order.id || order._id}/${type}`;
      const payload = type === "approve" ? { admin_remarks: remarks } : { rejection_reason: remarks };

      const res = await axios.post(endpoint, payload, { headers: authHeaderObj() });

      if (res.data?.status === "success") {
        showAlert("success", res.data.message || `Order successfully ${type}d.`);
        handleCloseAction();
        fetchPendingOrders(pagination.page);
      }
    } catch (err) {
      console.error(`Failed to ${type} offline order:`, err);
      const msg = err.response?.data?.message || err.message || `Failed to ${type} order.`;
      showAlert("error", msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert({ type: "", message: "" });
    }, 4500);
  };

  // Compute summary stats
  const totalValuePending = orders.reduce((sum, o) => sum + (Number(o.amount_paid) || 0), 0);
  const epcCount = orders.filter((o) => o.order_type === "epc").length;
  const fpoCount = orders.filter((o) => o.order_type === "fpo").length;
  const looseCount = orders.filter((o) => o.order_type === "loose").length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <FiCheckSquare className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              Admin Offline Payment Approval Queue
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review and approve offline bank transfers verified by Accounts before order fulfillment begins
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchPendingOrders(1)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh Queue
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
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Pending Approvals</span>
            <FiClock className="text-amber-500 text-base" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {pagination.total}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Verified by Accounts team
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Total Value Pending</span>
            <FiDollarSign className="text-emerald-500 text-base" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            ₹{totalValuePending.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Current page total amount
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>EPC Orders</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {epcCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Solar Store customer purchases
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
            <span>Franchisee & Loose</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {fpoCount + looseCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {fpoCount} PO + {looseCount} Loose
          </div>
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Queue Orders ({pagination.total})
            </span>
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
                onKeyDown={(e) => e.key === "Enter" && fetchPendingOrders(1)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-64"
              />
            </div>

            {/* Order Type Filter */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              {[
                { key: "all", label: "All" },
                { key: "epc", label: "EPC" },
                { key: "fpo", label: "FPO" },
                { key: "loose", label: "Loose" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setOrderTypeFilter(btn.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    orderTypeFilter === btn.key
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
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
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Accounts Status</th>
                <th className="py-3 px-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <FiRefreshCw className="animate-spin inline mr-2 text-base" /> Loading approval queue...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <FiCheckCircle className="inline text-emerald-500 text-xl mb-1 block mx-auto" />
                    All offline orders are cleared! No orders waiting for admin approval.
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
                      ₹{Number(o.amount_paid).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      {o.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(o.receipt_url)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-medium transition"
                        >
                          <FiEye /> View
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No file</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <FiCheckCircle /> Verified
                      </div>
                      <div className="text-[10px] text-slate-400">
                        by {o.accounts_verified_by}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAction(o, "approve")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAction(o, "reject")}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold text-xs transition"
                        >
                          Reject
                        </button>
                      </div>
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
                onClick={() => fetchPendingOrders(pagination.page - 1)}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPendingOrders(pagination.page + 1)}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Receipt Preview Modal ───────────────────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Payment Proof / Transfer Receipt Preview
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceipt}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 transition"
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

      {/* ── Action Confirmation Dialog (Approve / Reject) ──────────────────── */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {actionModal.type === "approve" ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                    <FiCheckCircle className="text-xl" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                    <FiXCircle className="text-xl" />
                  </div>
                )}
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {actionModal.type === "approve"
                    ? "Approve Offline Order Payment"
                    : "Reject Offline Order Payment"}
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

            {actionModal.type === "approve" ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Approving this order confirms payment, captures the order, and starts the warehouse packing
                and 8-stage dispatch journey.
              </p>
            ) : (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Rejecting this order marks the payment as rejected and cancels the order. A reason is
                mandatory so the customer is notified.
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {actionModal.type === "approve" ? "Admin Remarks (Optional):" : "Rejection Reason *:"}
              </label>
              <textarea
                rows={3}
                required={actionModal.type === "reject"}
                placeholder={
                  actionModal.type === "approve"
                    ? "e.g. Bank credit reconciled, approved for dispatch."
                    : "e.g. Invalid UTR reference / amount not credited to company account."
                }
                value={actionModal.remarks}
                onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseAction}
                disabled={submittingAction}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAction}
                disabled={submittingAction}
                className={`px-5 py-2 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5 ${
                  actionModal.type === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                } disabled:opacity-50`}
              >
                {submittingAction ? (
                  <>
                    <FiRefreshCw className="animate-spin" /> Processing...
                  </>
                ) : actionModal.type === "approve" ? (
                  "Confirm Approval"
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
