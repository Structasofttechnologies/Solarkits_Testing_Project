import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getTrialKitProcurements,
  approveTrialKitProcurement,
  rejectTrialKitProcurement
} from "../../api/trialKitsApi";
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
  FaCheck,
  FaTimes,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaMoneyBillWave,
  FaShieldAlt,
  FaUserCheck
} from "react-icons/fa";
import { FiRefreshCw, FiX, FiCheck, FiAlertCircle } from "react-icons/fi";

// Canonical Warehouse Name Resolver Helper
const getWarehouseLabel = (item) => {
  if (!item) return "Warehouse";
  const code = item.warehouse_code || item.warehouse_id?.warehouse_code || "";
  const name = item.warehouse_name || item.warehouse_id?.warehouse_name || "";
  if (name && name !== code && !name.startsWith("IND_")) {
    return name;
  }
  if (code === "IND_GUJ_001") return "Ahmedabad Central Warehouse";
  if (code === "IND_GUJ_002") return "Surat Regional Warehouse";
  if (item.warehouse_id?.city || item.warehouse_id?.state) {
    return `${item.warehouse_id.city || item.warehouse_id.state} Warehouse`;
  }
  return name || code || "Warehouse";
};

export default function TrialKitProcurementPage() {
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals & Drawers
  const [reviewItem, setReviewItem] = useState(null);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getTrialKitProcurements({ limit: 150 });
      if (res?.success) {
        setProcurements(res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load procurement approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Admin Approval
  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    if (!approvalTarget) return;

    try {
      setApproving(true);
      setError("");
      const res = await approveTrialKitProcurement(approvalTarget._id, { admin_notes: adminNotes });
      if (res?.success) {
        setSuccess(res.message || "Procurement approved and stock released to warehouse inventory!");
        setApprovalTarget(null);
        setAdminNotes("");
        if (reviewItem && reviewItem._id === approvalTarget._id) {
          setReviewItem(null);
        }
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve procurement.");
    } finally {
      setApproving(false);
    }
  };

  // Handle Admin Rejection
  const handleConfirmRejection = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;

    if (!rejectionReason || !rejectionReason.trim()) {
      setError("Please provide a mandatory rejection reason.");
      return;
    }

    try {
      setRejecting(true);
      setError("");
      const res = await rejectTrialKitProcurement(rejectTarget._id, {
        rejection_reason: rejectionReason.trim(),
        admin_notes: adminNotes
      });
      if (res?.success) {
        setSuccess(res.message || "Procurement request rejected.");
        setRejectTarget(null);
        setRejectionReason("");
        setAdminNotes("");
        if (reviewItem && reviewItem._id === rejectTarget._id) {
          setReviewItem(null);
        }
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject procurement.");
    } finally {
      setRejecting(false);
    }
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    const pendingAdmin = procurements.filter((p) => p.status === "payment_recorded");
    const pendingAccounts = procurements.filter((p) => p.status === "inward_requested");
    const approved = procurements.filter((p) => p.status === "approved");
    const rejected = procurements.filter((p) => p.status === "rejected");

    const totalApprovedKits = approved.reduce((acc, p) => acc + (p.inward_quantity || 0), 0);
    const totalApprovedAmount = approved.reduce((acc, p) => acc + (p.total_payable_amount_inr || 0), 0);
    const pendingAdminAmount = pendingAdmin.reduce((acc, p) => acc + (p.total_payable_amount_inr || 0), 0);

    return {
      pendingAdminCount: pendingAdmin.length,
      pendingAdminAmount,
      pendingAccountsCount: pendingAccounts.length,
      approvedCount: approved.length,
      totalApprovedKits,
      totalApprovedAmount,
      rejectedCount: rejected.length
    };
  }, [procurements]);

  // Filtered List
  const filteredList = useMemo(() => {
    return procurements.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const prMatch = (p.procurement_number || "").toLowerCase().includes(q);
        const grnMatch = (p.grn_number || "").toLowerCase().includes(q);
        const kitMatch = (p.kit_type || "").toLowerCase().includes(q);
        const whMatch = (p.warehouse_name || "").toLowerCase().includes(q);
        const vendorMatch = (p.vendor_name || "").toLowerCase().includes(q);
        const challanMatch = (p.invoice_challan_number || "").toLowerCase().includes(q);
        const utrMatch = (p.payment_details?.transaction_utr_no || "").toLowerCase().includes(q);
        if (!prMatch && !grnMatch && !kitMatch && !whMatch && !vendorMatch && !challanMatch && !utrMatch) return false;
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
            <FaShieldAlt className="text-emerald-600" />
            Trial Kit Procurement & Inward Approvals
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span>3-Way Match Verification</span>
            <span>•</span>
            <span className="font-semibold text-emerald-700">Warehouse GRN + Accounts UTR ➔ Admin Release</span>
            <span>•</span>
            <span>Atomic Stock Integration</span>
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
          onClick={() => setStatusFilter("payment_recorded")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${statusFilter === "payment_recorded"
            ? "bg-blue-100/70 border-blue-400 ring-2 ring-blue-500/30"
            : "bg-blue-50/60 border-blue-200 hover:bg-blue-50"
            }`}
        >
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting Admin Approval</span>
            <span className="p-2 bg-blue-100 rounded-xl text-blue-800"><FaClock /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-950">{metrics.pendingAdminCount}</span>
            <span className="text-xs font-bold text-blue-700">
              (₹{metrics.pendingAdminAmount.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-[11px] text-blue-700 mt-1">Payment verified by Accounts; awaiting final authorization</p>
        </div>

        <div
          onClick={() => setStatusFilter("inward_requested")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${statusFilter === "inward_requested"
            ? "bg-amber-100/70 border-amber-400 ring-2 ring-amber-500/30"
            : "bg-amber-50/60 border-amber-200 hover:bg-amber-50"
            }`}
        >
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Accounts Payment</span>
            <span className="p-2 bg-amber-100 rounded-xl text-amber-800"><FaCreditCard /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950">{metrics.pendingAccountsCount}</span>
            <span className="text-xs font-bold text-amber-700">Requests</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Inward raised by Warehouse; pending payment entry</p>
        </div>

        <div
          onClick={() => setStatusFilter("approved")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${statusFilter === "approved"
            ? "bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-500/30"
            : "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50"
            }`}
        >
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-bold uppercase tracking-wider">Approved & Inwarded</span>
            <span className="p-2 bg-emerald-100 rounded-xl text-emerald-800"><FaCheckCircle /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950">{metrics.totalApprovedKits} Kits</span>
            <span className="text-xs font-bold text-emerald-700">
              (₹{metrics.totalApprovedAmount.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Active in warehouse trial kit inventory</p>
        </div>

        <div
          onClick={() => setStatusFilter("rejected")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${statusFilter === "rejected"
            ? "bg-red-100/70 border-red-400 ring-2 ring-red-500/30"
            : "bg-red-50/60 border-red-200 hover:bg-red-50"
            }`}
        >
          <div className="flex items-center justify-between text-red-900">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected Inwards</span>
            <span className="p-2 bg-red-100 rounded-xl text-red-800"><FaTimesCircle /></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-950">{metrics.rejectedCount}</span>
            <span className="text-xs font-bold text-red-700">Discrepancies</span>
          </div>
          <p className="text-[11px] text-red-700 mt-1">Rejected due to payment or invoice discrepancy</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          FILTERS & SEARCH BAR
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: "all", label: "All Requests", count: procurements.length },
            { id: "payment_recorded", label: "Pending Admin Approval", count: metrics.pendingAdminCount },
            { id: "inward_requested", label: "Pending Accounts Payment", count: metrics.pendingAccountsCount },
            { id: "approved", label: "Approved & Inwarded", count: metrics.approvedCount },
            { id: "rejected", label: "Rejected", count: metrics.rejectedCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${statusFilter === tab.id
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.id ? "bg-white/20 text-white" : "bg-white text-gray-700"
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search PR, GRN, Kit, Warehouse, UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-emerald-500 bg-gray-50/50"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          PROCUREMENT APPROVALS TABLE
      ───────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">PR / GRN Tracking</th>
                <th className="py-3 px-4">Combo Kit & Warehouse</th>
                <th className="py-3 px-4 text-center">Inward Qty</th>
                <th className="py-3 px-4">Accounts Payment & UTR</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    No procurement records matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((proc) => {
                  const isPendingApproval = proc.status === "payment_recorded";
                  const isPendingPayment = proc.status === "inward_requested";
                  const isApproved = proc.status === "approved";
                  const isRejected = proc.status === "rejected";

                  return (
                    <tr key={proc._id} className="hover:bg-gray-50/80 transition">
                      {/* PR / GRN Tracking */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-700 block text-xs">
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
                        <span className="font-bold text-gray-900 block text-xs">{proc.kit_type}</span>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <FaWarehouse className="text-emerald-600 text-[10px] shrink-0" />
                          <strong className="text-gray-800">{getWarehouseLabel(proc)}</strong>
                          {(proc.warehouse_code || proc.warehouse_id?.warehouse_code) && (
                            <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                              {proc.warehouse_code || proc.warehouse_id?.warehouse_code}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Inward Qty */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg text-xs border border-emerald-200">
                          +{proc.inward_quantity} Kits
                        </span>
                      </td>

                      {/* Financials & UTR */}
                      <td className="py-3 px-4">
                        {proc.total_payable_amount_inr > 0 ? (
                          <div>
                            <span className="font-extrabold text-gray-900 block text-xs">
                              ₹{proc.total_payable_amount_inr?.toLocaleString("en-IN")}
                            </span>
                            {proc.supplier_payments && proc.supplier_payments.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {proc.supplier_payments.map((sp, idx) => (
                                  <span
                                    key={idx}
                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${sp.group_type === "panel"
                                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                                      : sp.group_type === "inverter"
                                        ? "bg-blue-50 text-blue-800 border border-blue-200"
                                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      }`}
                                    title={`${sp.supplier_name} • UTR: ${sp.transaction_utr_no}`}
                                  >
                                    {sp.group_type === "panel" ? "☀️" : sp.group_type === "inverter" ? "⚡" : "🛠️"}{" "}
                                    {sp.supplier_name.split(" ")[0]}: ₹{sp.total_payable_inr?.toLocaleString("en-IN")}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <>
                                <span className="text-[10px] text-purple-700 font-mono font-bold block">
                                  UTR: {proc.payment_details?.transaction_utr_no || "N/A"}
                                </span>
                                <span className="text-[10px] text-gray-500 capitalize">
                                  {proc.payment_details?.payment_mode?.replace(/_/g, " ")}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-bold text-[10px] border border-amber-200">
                            Payment Not Entered Yet
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isPendingApproval && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            Awaiting Admin Approval
                          </span>
                        )}
                        {isPendingPayment && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Pending Accounts Payment
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
                          {isPendingApproval && (
                            <>
                              <button
                                onClick={() => { setApprovalTarget(proc); setAdminNotes("Verified and approved for warehouse inventory."); }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                                title="Approve & credit stock immediately"
                              >
                                <FaCheck /> Approve
                              </button>
                              <button
                                onClick={() => { setRejectTarget(proc); setRejectionReason(""); }}
                                className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs border border-red-200 cursor-pointer inline-flex items-center gap-1"
                                title="Reject procurement"
                              >
                                <FaTimes /> Reject
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setReviewItem(proc)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1"
                            title="3-Way Match Review Dossier"
                          >
                            <FaInfoCircle /> Review
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
          ADMIN APPROVAL CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {approvalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <FaCheckCircle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Approve Trial Kit Procurement</h3>
                  <p className="text-[11px] text-gray-500 font-mono">{approvalTarget.procurement_number}</p>
                </div>
              </div>
              <button onClick={() => setApprovalTarget(null)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <p className="font-bold">
                ⚠️ Confirm Stock Release to Warehouse Inventory:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>
                  <strong>+{approvalTarget.inward_quantity} units</strong> of <strong>{approvalTarget.kit_type}</strong> will be immediately credited to <strong>{getWarehouseLabel(approvalTarget)} ({approvalTarget.warehouse_code})</strong> available stock.
                </li>
                <li>
                  {approvalTarget.supplier_payments && approvalTarget.supplier_payments.length > 0 ? (
                    <span>
                      Verified payments across <strong>{approvalTarget.supplier_payments.length} suppliers</strong> for total{" "}
                      <strong>₹{approvalTarget.total_payable_amount_inr?.toLocaleString("en-IN")}</strong>.
                    </span>
                  ) : (
                    <span>
                      Bank UTR <strong>{approvalTarget.payment_details?.transaction_utr_no}</strong> for{" "}
                      <strong>₹{approvalTarget.total_payable_amount_inr?.toLocaleString("en-IN")}</strong> will be sealed as verified.
                    </span>
                  )}
                </li>
                <li>An immutable audit log will be appended to Trial Kit Stock History.</li>
              </ul>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Admin Approval Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Physical delivery inspected and vendor UTR verified."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setApprovalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm inline-flex items-center gap-1.5"
                >
                  {approving ? (
                    <>
                      <FiRefreshCw className="animate-spin" /> Inwarding Stock...
                    </>
                  ) : (
                    <>
                      <FaCheck /> Confirm & Credit Stock
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          ADMIN REJECTION MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-red-100 text-red-700">
                  <FaTimesCircle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Reject Procurement Request</h3>
                  <p className="text-[11px] text-gray-500 font-mono">{rejectTarget.procurement_number}</p>
                </div>
              </div>
              <button onClick={() => setRejectTarget(null)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Rejection Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Specify why this procurement is rejected (e.g. UTR reference not matching bank statement, physical box damage, incorrect kit model)..."
                  className="w-full px-3 py-2 rounded-xl border border-red-300 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm inline-flex items-center gap-1.5"
                >
                  {rejecting ? (
                    <>
                      <FiRefreshCw className="animate-spin" /> Rejecting...
                    </>
                  ) : (
                    <>
                      <FaTimes /> Reject Procurement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          3-WAY MATCH COMPLETE REVIEW DRAWER / MODAL
      ───────────────────────────────────────────────────────────────────── */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-700 text-base">{reviewItem.procurement_number}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-700 font-mono">
                    {reviewItem.grn_number}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Executive 3-Way Reconciliation Dossier</p>
              </div>
              <button onClick={() => setReviewItem(null)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Warehouse GRN */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaTruckLoading className="text-blue-600" />
                  <span>1. Warehouse Goods Receipt</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Combo Kit</span>
                  <strong className="text-gray-900">{reviewItem.kit_type}</strong>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Destination Warehouse</span>
                  <strong className="text-gray-900 block">{getWarehouseLabel(reviewItem)}</strong>
                  {reviewItem.warehouse_code && (
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">
                      {reviewItem.warehouse_code}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Inward Quantity</span>
                  <strong className="text-emerald-700 text-sm">+{reviewItem.inward_quantity} Kits</strong>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Vendor Name</span>
                  <span className="text-gray-800">{reviewItem.vendor_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Challan No. & Date</span>
                  <span className="text-gray-800 font-mono">{reviewItem.invoice_challan_number}</span>
                  <span className="text-[10px] text-gray-500 block">
                    {reviewItem.invoice_challan_date ? new Date(reviewItem.invoice_challan_date).toLocaleDateString() : ""}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Physical Inspection</span>
                  <span className={`font-semibold ${reviewItem.warehouse_inspection_status === "passed" ? "text-emerald-700" : "text-amber-700"
                    }`}>
                    {reviewItem.warehouse_inspection_status}
                  </span>
                </div>
                {reviewItem.warehouse_remarks && (
                  <div>
                    <span className="text-gray-500 text-[10px] block">Warehouse Notes</span>
                    <span className="text-gray-600 text-[11px] italic">"{reviewItem.warehouse_remarks}"</span>
                  </div>
                )}
              </div>

              {/* Card 2: Accounts Commercials & UTR */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaCreditCard className="text-purple-600" />
                  <span>2. Accounts Verification</span>
                </div>
                {reviewItem.payment_status === "unpaid" ? (
                  <div className="py-8 text-center text-amber-700 bg-amber-50 rounded-xl p-2 font-medium">
                    ⏳ Waiting for Accounts Payment Entry
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Total Amount Paid</span>
                      <strong className="text-purple-700 text-sm font-black">
                        ₹{reviewItem.total_payable_amount_inr?.toLocaleString("en-IN")}
                      </strong>
                    </div>

                    {reviewItem.supplier_payments && reviewItem.supplier_payments.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <span className="text-gray-500 text-[10px] block font-bold uppercase">
                          Supplier Allocations ({reviewItem.supplier_payments.length})
                        </span>
                        {reviewItem.supplier_payments.map((sp, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-xl border border-gray-200 text-[10px] space-y-0.5">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-gray-900">
                                {sp.group_type === "panel" ? "☀️" : sp.group_type === "inverter" ? "⚡" : "🛠️"}{" "}
                                {sp.supplier_name}
                              </span>
                              <span className="text-purple-700 font-mono font-black">₹{sp.total_payable_inr?.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-500 font-mono text-[9px]">
                              <span>Base: ₹{sp.base_amount_inr?.toLocaleString("en-IN")}</span>
                              <span>GST ({sp.gst_rate_percent}%): +₹{sp.gst_amount_inr?.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="text-gray-500 font-mono text-[9px]">
                              UTR: <strong className="text-gray-800">{sp.transaction_utr_no}</strong>
                            </div>
                            {sp.payment_receipt_url && (
                              <div>
                                <a
                                  href={sp.payment_receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-purple-700 font-bold underline inline-flex items-center gap-1 text-[9px]"
                                >
                                  <FaExternalLinkAlt size={8} /> Receipt Slip
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-gray-500 text-[10px] block">Rate & GST</span>
                          <span className="text-gray-800">
                            ₹{reviewItem.unit_cost_price_inr?.toLocaleString("en-IN")} / kit + {reviewItem.gst_rate_percent}% GST
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block">Bank UTR Number</span>
                          <strong className="text-gray-900 font-mono text-[11px]">
                            {reviewItem.payment_details?.transaction_utr_no}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block">Payment Mode & Date</span>
                          <span className="text-gray-700 capitalize">
                            {reviewItem.payment_details?.payment_mode?.replace(/_/g, " ")} •{" "}
                            {reviewItem.payment_details?.payment_date ? new Date(reviewItem.payment_details.payment_date).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] block">Debit Account</span>
                          <span className="text-gray-700">{reviewItem.payment_details?.company_bank_account || "HDFC Bank"}</span>
                        </div>
                        {reviewItem.payment_details?.payment_receipt_url && (
                          <div>
                            <a
                              href={reviewItem.payment_details.payment_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-700 font-bold underline flex items-center gap-1"
                            >
                              <FaExternalLinkAlt className="text-[10px]" /> View Payment Receipt
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Card 3: Admin Final Action & Audit */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                  <FaShieldAlt className="text-emerald-600" />
                  <span>3. Executive Decision</span>
                </div>
                {reviewItem.status === "inward_requested" ? (
                  <div className="py-8 text-center text-gray-400 bg-gray-100 rounded-xl p-2 font-medium">
                    Cannot approve yet: Waiting for Accounts payment
                  </div>
                ) : reviewItem.status === "payment_recorded" ? (
                  <div className="space-y-3 pt-2">
                    <div className="p-2 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-center font-bold">
                      Ready for Final Approval!
                    </div>
                    <button
                      onClick={() => {
                        setReviewItem(null);
                        setApprovalTarget(reviewItem);
                        setAdminNotes("Verified and approved for warehouse inventory.");
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <FaCheck /> Approve & Credit Stock
                    </button>
                    <button
                      onClick={() => {
                        setReviewItem(null);
                        setRejectTarget(reviewItem);
                        setRejectionReason("");
                      }}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <FaTimes /> Reject Request
                    </button>
                  </div>
                ) : reviewItem.status === "approved" ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-semibold text-center">
                      ✅ Inward Stock Credited!
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Approved By</span>
                      <strong className="text-gray-900">{reviewItem.admin_decision?.approved_by?.name || "Admin"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Approved On</span>
                      <span className="text-gray-700">
                        {reviewItem.admin_decision?.approved_at ? new Date(reviewItem.admin_decision.approved_at).toLocaleString() : ""}
                      </span>
                    </div>
                    {reviewItem.admin_decision?.admin_notes && (
                      <div>
                        <span className="text-gray-500 text-[10px] block">Admin Remarks</span>
                        <span className="text-gray-700 italic">"{reviewItem.admin_decision.admin_notes}"</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-red-50 rounded-xl border border-red-200 text-red-800 space-y-1">
                    <span className="font-bold block">❌ Procurement Rejected:</span>
                    <span className="italic">{reviewItem.admin_decision?.rejection_reason}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setReviewItem(null)}
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
