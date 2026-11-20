import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { authHeaderObj } from "../../app/authHeader";
import {
  FaBoxes,
  FaFileInvoice,
  FaCreditCard,
  FaTruckLoading,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaWarehouse,
  FaSearch,
  FaFilter,
  FaClock,
  FaCalendarAlt,
  FaCheck,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaMoneyBillWave
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheck, FiSliders } from "react-icons/fi";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/account-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/account-api$|\/admin-api$|\/api$/, "");
const BASE_URL = `${API_BASE}/account-api/trial-kits`;

export default function TrialKitsProcurementPage() {
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeProcurement, setActiveProcurement] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [dossierItem, setDossierItem] = useState(null);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    unit_cost_price_inr: 25000,
    gst_rate_percent: 13.8,
    payment_mode: "bank_transfer_neft_rtgs",
    transaction_utr_no: "",
    payment_date: new Date().toISOString().split("T")[0],
    company_bank_account: "HDFC Bank - Current A/C (Solarkits Corp)",
    vendor_bank_account: "",
    payment_receipt_url: "",
    accounts_remarks: "Verified against vendor delivery challan & inward inspection. Payment processed via NEFT."
  });

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${BASE_URL}/procurement/list?limit=150`, {
        headers: authHeaderObj()
      });
      if (res.data?.success) {
        setProcurements(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load trial kit procurement records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Payment Entry Modal
  const handleOpenPayment = (proc) => {
    setActiveProcurement(proc);
    setError("");
    const defaultUnitRate = proc.unit_cost_price_inr && proc.unit_cost_price_inr > 0
      ? proc.unit_cost_price_inr
      : (proc.capacity ? proc.capacity * 25000 : 25000);

    setPaymentForm({
      unit_cost_price_inr: defaultUnitRate,
      gst_rate_percent: proc.gst_rate_percent || 13.8,
      payment_mode: proc.payment_details?.payment_mode || "bank_transfer_neft_rtgs",
      transaction_utr_no: proc.payment_details?.transaction_utr_no || `UTR-TK-${Date.now().toString().slice(-8)}`,
      payment_date: proc.payment_details?.payment_date
        ? new Date(proc.payment_details.payment_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      company_bank_account: proc.payment_details?.company_bank_account || "HDFC Bank - Current A/C (Solarkits Corp)",
      vendor_bank_account: proc.payment_details?.vendor_bank_account || "",
      payment_receipt_url: proc.payment_details?.payment_receipt_url || "",
      accounts_remarks: proc.payment_details?.accounts_remarks || "Verified against vendor delivery challan & inward inspection."
    });
    setPaymentModalOpen(true);
  };

  // Submit Payment Record
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!activeProcurement) return;

    if (!paymentForm.transaction_utr_no || !paymentForm.transaction_utr_no.trim()) {
      setError("Bank UTR / Transaction reference number is required.");
      return;
    }

    try {
      setPaymentSubmitting(true);
      setError("");
      const res = await axios.post(
        `${BASE_URL}/procurement/${activeProcurement._id}/record-payment`,
        paymentForm,
        { headers: authHeaderObj() }
      );

      if (res.data?.success) {
        setSuccess(res.data.message || "Payment recorded successfully and submitted for Admin approval!");
        setPaymentModalOpen(false);
        setActiveProcurement(null);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Derived Totals in Payment Modal
  const calculatedAmounts = useMemo(() => {
    if (!activeProcurement) return { subtotal: 0, gst: 0, total: 0 };
    const qty = activeProcurement.inward_quantity || 0;
    const unitPrice = parseFloat(paymentForm.unit_cost_price_inr) || 0;
    const gstRate = parseFloat(paymentForm.gst_rate_percent) || 0;

    const subtotal = Math.round(qty * unitPrice * 100) / 100;
    const gst = Math.round(subtotal * (gstRate / 100) * 100) / 100;
    const total = Math.round((subtotal + gst) * 100) / 100;

    return { subtotal, gst, total };
  }, [activeProcurement, paymentForm.unit_cost_price_inr, paymentForm.gst_rate_percent]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const pendingPayment = procurements.filter(p => p.status === "inward_requested");
    const paymentRecorded = procurements.filter(p => p.status === "payment_recorded");
    const approved = procurements.filter(p => p.status === "approved");
    const rejected = procurements.filter(p => p.status === "rejected");

    const pendingPaymentKits = pendingPayment.reduce((sum, p) => sum + (p.inward_quantity || 0), 0);
    const approvedTotalAmount = approved.reduce((sum, p) => sum + (p.total_payable_amount_inr || 0), 0);

    return {
      pendingPaymentCount: pendingPayment.length,
      pendingPaymentKits,
      paymentRecordedCount: paymentRecorded.length,
      approvedCount: approved.length,
      approvedTotalAmount,
      rejectedCount: rejected.length
    };
  }, [procurements]);

  // Filtered List
  const filteredList = useMemo(() => {
    return procurements.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const prMatch = (p.procurement_number || "").toLowerCase().includes(q);
        const grnMatch = (p.grn_number || "").toLowerCase().includes(q);
        const kitMatch = (p.kit_type || "").toLowerCase().includes(q);
        const vendorMatch = (p.vendor_name || "").toLowerCase().includes(q);
        const challanMatch = (p.invoice_challan_number || "").toLowerCase().includes(q);
        const utrMatch = (p.payment_details?.transaction_utr_no || "").toLowerCase().includes(q);
        if (!prMatch && !grnMatch && !kitMatch && !vendorMatch && !challanMatch && !utrMatch) return false;
      }
      return true;
    });
  }, [procurements, statusFilter, searchTerm]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in">
      {/* ─────────────────────────────────────────────────────────────────────
          PAGE HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FaCreditCard className="text-purple-600" />
            Trial Kits Procurement & Vendor Accounts
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span>Warehouse Inward Indents</span>
            <span>•</span>
            <span className="font-semibold text-purple-700">Commercial Verification & UTR Entry</span>
            <span>•</span>
            <span>Admin Final Authorization</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-200">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs border border-emerald-200">{success}</div>}

      {/* ─────────────────────────────────────────────────────────────────────
          KPI SUMMARY CARDS
      ───────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("inward_requested")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === "inward_requested" ? "bg-amber-100/70 border-amber-400" : "bg-amber-50/60 border-amber-200 hover:bg-amber-50"
          }`}
        >
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Payment</span>
            <span className="p-2 bg-amber-100 rounded-xl text-amber-800"><FaClock /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950">{metrics.pendingPaymentCount}</span>
            <span className="text-xs font-bold text-amber-700">({metrics.pendingPaymentKits} Kits)</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Warehouse inwards waiting for payment</p>
        </div>

        <div
          onClick={() => setStatusFilter("payment_recorded")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === "payment_recorded" ? "bg-blue-100/70 border-blue-400" : "bg-blue-50/60 border-blue-200 hover:bg-blue-50"
          }`}
        >
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting Admin Approval</span>
            <span className="p-2 bg-blue-100 rounded-xl text-blue-800"><FaFileInvoice /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-950">{metrics.paymentRecordedCount}</span>
            <span className="text-xs font-bold text-blue-700">Requests</span>
          </div>
          <p className="text-[11px] text-blue-700 mt-1">Payment entered & forwarded to Admin</p>
        </div>

        <div
          onClick={() => setStatusFilter("approved")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === "approved" ? "bg-emerald-100/70 border-emerald-400" : "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-bold uppercase tracking-wider">Approved & Inwarded</span>
            <span className="p-2 bg-emerald-100 rounded-xl text-emerald-800"><FaCheckCircle /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950">{metrics.approvedCount}</span>
            <span className="text-xs font-bold text-emerald-700">
              (₹{metrics.approvedTotalAmount.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Stock active in warehouse inventory</p>
        </div>

        <div
          onClick={() => setStatusFilter("rejected")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === "rejected" ? "bg-red-100/70 border-red-400" : "bg-red-50/60 border-red-200 hover:bg-red-50"
          }`}
        >
          <div className="flex items-center justify-between text-red-900">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected Requests</span>
            <span className="p-2 bg-red-100 rounded-xl text-red-800"><FaTimesCircle /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-950">{metrics.rejectedCount}</span>
            <span className="text-xs font-bold text-red-700">Need Review</span>
          </div>
          <p className="text-[11px] text-red-700 mt-1">Discrepancy in invoice or payment</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          FILTERS & SEARCH
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: "all", label: "All Procurements", count: procurements.length },
            { id: "inward_requested", label: "Pending Payment", count: metrics.pendingPaymentCount },
            { id: "payment_recorded", label: "Submitted for Approval", count: metrics.paymentRecordedCount },
            { id: "approved", label: "Approved / Inwarded", count: metrics.approvedCount },
            { id: "rejected", label: "Rejected", count: metrics.rejectedCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === tab.id ? "bg-white/20 text-white" : "bg-white text-gray-700"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search PR, GRN, Kit, Vendor, UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-purple-500 bg-gray-50/50"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          PROCUREMENT TABLE
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">PR / GRN Details</th>
                <th className="py-3 px-4">Combo Kit & Warehouse</th>
                <th className="py-3 px-4 text-center">Inward Qty</th>
                <th className="py-3 px-4">Vendor & Challan</th>
                <th className="py-3 px-4">Financials & Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    No procurement records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((proc) => {
                  const isPendingPayment = proc.status === "inward_requested";
                  const isSubmitted = proc.status === "payment_recorded";
                  const isApproved = proc.status === "approved";
                  const isRejected = proc.status === "rejected";

                  return (
                    <tr key={proc._id} className="hover:bg-gray-50/80 transition">
                      {/* PR / GRN */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-purple-700 block text-xs">
                          {proc.procurement_number}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono block">
                          {proc.grn_number}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {proc.requested_at ? new Date(proc.requested_at).toLocaleDateString() : ""}
                        </span>
                      </td>

                      {/* Combo Kit & Warehouse */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900 block">{proc.kit_type}</span>
                        <span className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                          <FaWarehouse className="text-gray-400 text-[10px]" />
                          {proc.warehouse_name || proc.warehouse_id?.warehouse_name}
                        </span>
                      </td>

                      {/* Inward Qty */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg text-xs border border-emerald-200">
                          +{proc.inward_quantity} Kits
                        </span>
                      </td>

                      {/* Vendor & Challan */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 block">{proc.vendor_name}</span>
                        <span className="text-[11px] text-gray-500">
                          Challan: <strong className="text-gray-700 font-mono">{proc.invoice_challan_number}</strong>
                        </span>
                      </td>

                      {/* Financials & Payment */}
                      <td className="py-3 px-4">
                        {proc.total_payable_amount_inr > 0 ? (
                          <div>
                            <span className="font-extrabold text-gray-900 block text-xs">
                              ₹{proc.total_payable_amount_inr?.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              UTR: {proc.payment_details?.transaction_utr_no || "Recorded"}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-bold text-[10px] border border-amber-200">
                            Unpaid • Awaiting Entry
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isPendingPayment && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Pending Payment
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            Payment Submitted (Admin Pending)
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Approved & Inwarded
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPendingPayment && (
                            <button
                              onClick={() => handleOpenPayment(proc)}
                              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <FaCreditCard /> Record Payment
                            </button>
                          )}
                          {isSubmitted && (
                            <button
                              onClick={() => handleOpenPayment(proc)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 cursor-pointer inline-flex items-center gap-1"
                              title="Update payment details"
                            >
                              Edit Payment
                            </button>
                          )}
                          {isRejected && (
                            <button
                              onClick={() => handleOpenPayment(proc)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs border border-red-200 cursor-pointer inline-flex items-center gap-1"
                              title="Re-enter payment details"
                            >
                              Re-submit
                            </button>
                          )}
                          <button
                            onClick={() => { setDossierItem(proc); setDossierModalOpen(true); }}
                            className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1"
                            title="View complete 3-way match dossier"
                          >
                            <FaInfoCircle />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          RECORD PAYMENT MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {paymentModalOpen && activeProcurement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <FaCreditCard className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Record Trial Kit Vendor Payment
                  </h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {activeProcurement.procurement_number} • {activeProcurement.grn_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setPaymentModalOpen(false); setActiveProcurement(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Warehouse Inward Summary Snapshot */}
            <div className="mt-3 p-3 bg-purple-50/50 rounded-2xl border border-purple-100 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500 text-[10px] block">Combo Kit</span>
                <strong className="text-gray-900">{activeProcurement.kit_type}</strong>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Target Warehouse</span>
                <span className="text-gray-800">{activeProcurement.warehouse_name}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Inward Quantity</span>
                <strong className="text-emerald-700">+{activeProcurement.inward_quantity} Kits</strong>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Vendor & Challan No.</span>
                <span className="text-gray-800">
                  {activeProcurement.vendor_name} ({activeProcurement.invoice_challan_number})
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-3.5 text-xs">
              {/* Commercial Calculation Fields */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <FaMoneyBillWave className="text-purple-600" /> Commercials & GST Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Unit Cost Price (₹ / Kit) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={paymentForm.unit_cost_price_inr}
                      onChange={(e) => setPaymentForm({ ...paymentForm, unit_cost_price_inr: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">GST Scheme Rate (%)</label>
                    <select
                      value={paymentForm.gst_rate_percent}
                      onChange={(e) => setPaymentForm({ ...paymentForm, gst_rate_percent: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 font-medium bg-white"
                    >
                      <option value="13.8">13.8% (Solar Composite Scheme)</option>
                      <option value="18">18% (Standard Goods GST)</option>
                      <option value="12">12% (Concessional Solar)</option>
                      <option value="5">5% (Solar Components)</option>
                      <option value="0">0% (Nil / Exempt)</option>
                    </select>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] block">Base Subtotal:</span>
                    <strong className="text-gray-800">₹{calculatedAmounts.subtotal.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">GST ({paymentForm.gst_rate_percent}%):</span>
                    <strong className="text-gray-800">+₹{calculatedAmounts.gst.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-purple-600 text-[10px] font-bold block uppercase">Total Payable:</span>
                    <strong className="text-purple-700 font-black text-sm">
                      ₹{calculatedAmounts.total.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bank Execution Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Payment Mode *</label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  >
                    <option value="bank_transfer_neft_rtgs">NEFT / RTGS (Bank Transfer)</option>
                    <option value="upi">UPI / IMPS Corporate</option>
                    <option value="cheque">Bank Cheque</option>
                    <option value="corporate_card">Corporate Credit Card</option>
                    <option value="cash">Petty Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Bank Transaction UTR / Ref *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UTR-HDFC-991283"
                    value={paymentForm.transaction_utr_no}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_utr_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold text-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Company Debit Account</label>
                  <input
                    type="text"
                    value={paymentForm.company_bank_account}
                    onChange={(e) => setPaymentForm({ ...paymentForm, company_bank_account: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Bank Receipt / Payment Slip URL</label>
                <input
                  type="text"
                  placeholder="https://... / payment-slip.pdf"
                  value={paymentForm.payment_receipt_url}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_receipt_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Accounts Verification Remarks</label>
                <textarea
                  rows={2}
                  value={paymentForm.accounts_remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, accounts_remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setPaymentModalOpen(false); setActiveProcurement(null); }}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-sm inline-flex items-center gap-1.5"
                >
                  {paymentSubmitting ? (
                    <>
                      <FiRefreshCw className="animate-spin" /> Recording Payment...
                    </>
                  ) : (
                    <>
                      <FaCheck /> Submit Payment for Admin Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          VIEW FULL 3-WAY DOSSIER MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {dossierModalOpen && dossierItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-purple-700 text-base">{dossierItem.procurement_number}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-700 font-mono">
                    {dossierItem.grn_number}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Trial Kit Multi-Stage Procurement Dossier</p>
              </div>
              <button onClick={() => { setDossierModalOpen(false); setDossierItem(null); }} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Stage 1 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaTruckLoading className="text-blue-600" />
                  <span>Stage 1: Warehouse</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Combo Kit</span>
                  <strong className="text-gray-900">{dossierItem.kit_type}</strong>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Warehouse</span>
                  <span className="text-gray-800">{dossierItem.warehouse_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Inward Quantity</span>
                  <strong className="text-emerald-700">+{dossierItem.inward_quantity} Kits</strong>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Vendor</span>
                  <span className="text-gray-800">{dossierItem.vendor_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Challan No.</span>
                  <span className="text-gray-800 font-mono">{dossierItem.invoice_challan_number}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Inspection Condition</span>
                  <span className="text-emerald-700 font-semibold">{dossierItem.warehouse_inspection_status}</span>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaCreditCard className="text-purple-600" />
                  <span>Stage 2: Accounts Payment</span>
                </div>
                {dossierItem.payment_status === "unpaid" ? (
                  <div className="py-6 text-center text-amber-700 bg-amber-50 rounded-xl p-2 font-medium">
                    ⏳ Unpaid - Pending Accounts Entry
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Total Payable</span>
                      <strong className="text-purple-700 text-sm font-black">
                        ₹{dossierItem.total_payable_amount_inr?.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Unit Rate & GST</span>
                      <span className="text-gray-800">
                        ₹{dossierItem.unit_cost_price_inr?.toLocaleString("en-IN")} + {dossierItem.gst_rate_percent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Bank UTR No.</span>
                      <strong className="text-gray-900 font-mono text-[11px]">
                        {dossierItem.payment_details?.transaction_utr_no}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Payment Mode</span>
                      <span className="text-gray-700 capitalize">
                        {dossierItem.payment_details?.payment_mode?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Paid Date</span>
                      <span className="text-gray-700">
                        {dossierItem.payment_details?.payment_date
                          ? new Date(dossierItem.payment_details.payment_date).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Stage 3 */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaCheckCircle className="text-emerald-600" />
                  <span>Stage 3: Admin Approval</span>
                </div>
                {dossierItem.status === "inward_requested" ? (
                  <div className="py-6 text-center text-gray-400 bg-gray-100 rounded-xl p-2 font-medium">
                    Waiting for Accounts payment
                  </div>
                ) : dossierItem.status === "payment_recorded" ? (
                  <div className="py-6 text-center text-blue-700 bg-blue-50 rounded-xl p-2 font-medium">
                    🔔 Awaiting Admin Approval & Stock Credit
                  </div>
                ) : dossierItem.status === "approved" ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-semibold text-center">
                      ✅ Approved & Stock Inwarded!
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Approved By</span>
                      <strong className="text-gray-900">{dossierItem.admin_decision?.approved_by?.name || "Admin"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Approved On</span>
                      <span className="text-gray-700">
                        {dossierItem.admin_decision?.approved_at
                          ? new Date(dossierItem.admin_decision.approved_at).toLocaleString()
                          : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-red-50 rounded-xl border border-red-200 text-red-800">
                    <strong>Rejected:</strong> {dossierItem.admin_decision?.rejection_reason || "Requirements not met"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => { setDossierModalOpen(false); setDossierItem(null); }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl text-xs"
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
