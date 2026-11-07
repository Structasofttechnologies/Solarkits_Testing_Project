import { useState, useEffect } from "react";
import {
  MdSearch,
  MdRefresh,
  MdVisibility,
  MdFilterList,
  MdCheckCircle,
  MdPending,
  MdErrorOutline,
  MdOutlineAccessTime,
  MdEdit,
  MdPayment,
  MdDoneAll
} from "react-icons/md";
import { FaCoins, FaHandshake, FaRupeeSign, FaLayerGroup, FaBoxes, FaTimes, FaShoppingCart } from "react-icons/fa";
import { getFranchiseCommissions, updateCommissionStatus } from "../../api/solarshopAccounts";
import TransactionDetailsDrawer from "../../components/TransactionDetailsDrawer";
import Button from "../../components/Button";

export default function FranchiseCommissionTracking() {
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({
    total_commission: 0,
    paid_commission: 0,
    pending_commission: 0,
    on_hold_commission: 0,
    count_paid: 0,
    count_pending: 0,
    count_on_hold: 0,
    count_failed: 0
  });

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer & Settle Modal
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [updatingComm, setUpdatingComm] = useState(null);
  const [newStatus, setNewStatus] = useState("Paid");
  const [newUtr, setNewUtr] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [settleNotes, setSettleNotes] = useState("");
  const [submittingSettle, setSubmittingSettle] = useState(false);
  const [toast, setToast] = useState(null);
  const [drawdownModalOrder, setDrawdownModalOrder] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchCommissions();
  }, [page, statusFilter]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getFranchiseCommissions(params);
      setCommissions(res.data || []);
      setTotal(res.total || 0);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      console.error("Error fetching franchise commissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCommissions();
  };

  const handleOpenSettleModal = (comm) => {
    setUpdatingComm(comm);
    setNewStatus(comm.commission_status || "Paid");
    const existingUtr = (comm.utr_number && comm.utr_number !== "N/A" ? comm.utr_number : (comm.payment_reference && comm.payment_reference !== "N/A" ? comm.payment_reference : ""));
    setNewUtr(existingUtr);
    setPaidDate(comm.paid_date ? new Date(comm.paid_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setSettleNotes(comm.notes || comm.commission_notes || "");
    setSettleModalOpen(true);
  };

  const handleSaveCommissionStatus = async (e) => {
    e.preventDefault();
    if (!updatingComm) return;
    setSubmittingSettle(true);
    try {
      const res = await updateCommissionStatus(updatingComm.id, {
        commission_status: newStatus,
        utr_reference: newUtr,
        paid_date: paidDate,
        notes: settleNotes
      });
      setSettleModalOpen(false);
      showToast(res?.message || `Commission status updated to ${newStatus} successfully!`, "success");
      await fetchCommissions();
    } catch (err) {
      console.error("Error updating commission status:", err);
      showToast(err.response?.data?.message || err.message || "Failed to update commission status", "error");
    } finally {
      setSubmittingSettle(false);
    }
  };

  const formatCurrency = (val) => {
    if (val == null || isNaN(val)) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  /**
   * EXACT COLORS REQUIRED:
   * Green: Paid
   * Yellow: Pending
   * Orange: On Hold
   * Red: Failed
   */
  const renderCommissionStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          <MdCheckCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
          Paid
        </span>
      );
    }
    if (s === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-800 dark:text-yellow-400 border border-yellow-500/30">
          <MdPending size={13} className="text-yellow-600 dark:text-yellow-400" />
          Pending
        </span>
      );
    }
    if (s === "on hold" || s === "on_hold") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30">
          <MdOutlineAccessTime size={13} className="text-orange-600 dark:text-orange-400" />
          On Hold
        </span>
      );
    }
    if (s === "failed") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30">
          <MdErrorOutline size={13} className="text-red-600 dark:text-red-400" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600">
        {status}
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold border backdrop-blur-md transition-all animate-in slide-in-from-top-3 duration-300 ${toast.type === "error"
              ? "bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400 bg-surface"
              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-surface"
            }`}
        >
          {toast.type === "error" ? <MdErrorOutline size={20} /> : <MdCheckCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <FaCoins /> Commission Engine
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Franchise Commission Tracking
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Confirm whether franchise partners’ earned sales commission has been disbursed with bank UTR settlement numbers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCommissions}
            className="text-xs font-semibold gap-1.5"
            disabled={loading}
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Mini Stats Banner with Exact Status Colors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Paid Card (Green) */}
        <div className="p-4 rounded-xl bg-surface border border-emerald-500/30 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              Paid Commission
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {formatCurrency(stats.paid_commission)}
          </p>
          <span className="text-xs text-text-muted mt-0.5 block">
            {stats.count_paid} Disbursed Orders
          </span>
        </div>

        {/* Pending Card (Yellow) */}
        <div className="p-4 rounded-xl bg-surface border border-yellow-500/30 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-yellow-800 dark:text-yellow-400 uppercase">
              Pending Commission
            </span>
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-yellow-600 dark:text-yellow-400 font-mono mt-1">
            {formatCurrency(stats.pending_commission)}
          </p>
          <span className="text-xs text-text-muted mt-0.5 block">
            {stats.count_pending} Awaiting Payout
          </span>
        </div>

        {/* On Hold Card (Orange) */}
        <div className="p-4 rounded-xl bg-surface border border-orange-500/30 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase">
              On Hold
            </span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-orange-600 dark:text-orange-400 font-mono mt-1">
            {formatCurrency(stats.on_hold_commission)}
          </p>
          <span className="text-xs text-text-muted mt-0.5 block">
            {stats.count_on_hold} Held Review
          </span>
        </div>

        {/* Failed Card (Red) */}
        <div className="p-4 rounded-xl bg-surface border border-red-500/30 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase">
              Failed / Cancelled
            </span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-red-600 dark:text-red-400 font-mono mt-1">
            {stats.count_failed} Orders
          </p>
          <span className="text-xs text-text-muted mt-0.5 block">
            Order Refunded / Cancelled
          </span>
        </div>
      </div>

      {/* Filter & Table Container */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
              <MdFilterList size={15} /> Status:
            </span>
            {[
              { key: "all", label: "All Statuses", color: "bg-primary" },
              { key: "paid", label: "Paid (Green)", color: "bg-emerald-600" },
              { key: "pending", label: "Pending (Yellow)", color: "bg-yellow-600" },
              { key: "on hold", label: "On Hold (Orange)", color: "bg-orange-600" },
              { key: "failed", label: "Failed (Red)", color: "bg-red-600" },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => {
                  setStatusFilter(st.key);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${statusFilter === st.key
                    ? `${st.color} text-white shadow-sm`
                    : "bg-surface-hover/70 text-text-secondary hover:text-text-primary"
                  }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] sm:min-w-[300px]">
            <input
              type="text"
              placeholder="Search Partner, EPC, Order ID, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-hover/50 border border-border rounded-xl text-xs sm:text-sm text-text-primary focus:outline-none focus:border-primary"
            />
            <MdSearch className="absolute left-3 top-2.5 text-text-muted text-lg pointer-events-none" />
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scrollbar-hover">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-surface-hover/40 text-text-muted font-bold text-[11px] uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-4 sm:px-6 py-3.5">Commission ID</th>
                <th className="px-4 py-3.5">Franchise Partner Name</th>
                <th className="px-4 py-3.5">EPC Name</th>
                <th className="px-4 py-3.5">Related Order ID</th>
                <th className="px-4 py-3.5 text-right">Order Amount</th>
                <th className="px-4 py-3.5 text-center">Comm. Rate</th>
                <th className="px-4 py-3.5 text-right">Commission Amount</th>
                <th className="px-4 py-3.5 text-center">Commission Status</th>
                <th className="px-4 py-3.5">Paid Date</th>
                <th className="px-4 py-3.5">UTR / Reference No.</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-text-muted">
                    <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                    Loading franchise commission records...
                  </td>
                </tr>
              ) : commissions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-text-muted">
                    No commission records found.
                  </td>
                </tr>
              ) : (
                commissions.map((c) => (
                  <tr key={c.id || c.commission_id} className="hover:bg-surface-hover/40 transition-colors">
                    {/* Commission ID */}
                    <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-text-primary whitespace-nowrap">
                      {c.commission_id}
                    </td>

                    {/* Franchise Partner Name & Bank Account Details */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text-primary truncate max-w-[180px]">
                        {c.franchise_partner_name}
                      </div>
                      <div className="text-[11px] text-text-muted font-mono">{c.partner_mobile}</div>
                      {c.bank_details?.account_number && c.bank_details.account_number !== "N/A" && (
                        <div className="mt-1 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-800 dark:text-emerald-300 font-mono">
                          <span className="font-bold">{c.bank_details.bank_name}</span> · A/C: <span className="font-bold">{c.bank_details.account_number}</span> · IFSC: <span className="font-bold">{c.bank_details.ifsc_code}</span>
                        </div>
                      )}
                    </td>

                    {/* EPC Name */}
                    <td className="px-4 py-3.5 font-medium text-text-primary max-w-[150px] truncate" title={c.epc_name}>
                      {c.epc_name}
                    </td>

                    {/* Related Order ID & Drawdowns */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-primary">
                          {c.related_order_id}
                        </span>
                        {c.order_type === "fpo_order" && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            Master PO
                          </span>
                        )}
                      </div>
                      {c.order_type === "fpo_order" && c.total_booked_quantity > 0 && (
                        <div className="mt-0.5 space-y-1">
                          <div className="text-[11px] text-text-muted flex items-center gap-1">
                            <span>{c.total_booked_quantity} Kits</span>
                            <span>•</span>
                            <span className={c.fulfilled_quantity > 0 ? "text-emerald-600 font-bold" : ""}>
                              {c.fulfilled_quantity || 0} Fulfilled
                            </span>
                            {c.unfulfilled_quantity > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-rose-600 font-bold">{c.unfulfilled_quantity} Rem.</span>
                              </>
                            )}
                          </div>
                          {c.epc_penalty_amount > 0 && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-300">
                              EPC Penalty: ₹{c.epc_penalty_amount.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      )}
                      {c.order_type === "fpo_order" && (
                        <button
                          type="button"
                          onClick={() => setDrawdownModalOrder(c)}
                          className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer"
                        >
                          <FaLayerGroup size={11} />
                          <span>
                            {(c.linked_repeat_orders || []).length} Drawdown(s)
                          </span>
                        </button>
                      )}
                    </td>

                    {/* Order Amount */}
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-text-secondary whitespace-nowrap">
                      {formatCurrency(c.order_amount)}
                    </td>

                    {/* Commission Rate */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap font-bold text-primary">
                      {c.commission_rate}%
                    </td>

                    {/* Commission Amount with Gross & TDS Breakdown */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-emerald-600">
                        {formatCurrency(c.commission_amount)}
                      </div>
                      {c.order_type === "fpo_order" && c.total_booked_quantity > 0 && (
                        <div className="text-[10px] text-primary font-bold">
                          Pro-Rata: {c.commission_completion_ratio || `${c.fulfilled_quantity || 0}/${c.total_booked_quantity}`}
                        </div>
                      )}
                      <div className="text-[10px] text-text-muted">
                        Gross: {formatCurrency(c.gross_commission || c.commission_amount)}
                      </div>
                      {c.full_gross_commission != null && c.full_gross_commission > (c.gross_commission || 0) && (
                        <div className="text-[9px] text-text-muted">
                          (Full Quota: {formatCurrency(c.full_gross_commission)})
                        </div>
                      )}
                      {c.tds_amount > 0 && (
                        <div className="text-[10px] text-red-600 font-semibold">
                          TDS (5%): -{formatCurrency(c.tds_amount)}
                        </div>
                      )}
                    </td>

                    {/* Commission Status with EXACT Badge Colors */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {renderCommissionStatusBadge(c.commission_status)}
                        <button
                          onClick={() => handleOpenSettleModal(c)}
                          className="text-text-muted hover:text-primary p-1 rounded hover:bg-surface-hover transition-colors"
                          title="Update Status / Enter UTR"
                        >
                          <MdEdit size={13} />
                        </button>
                      </div>
                    </td>

                    {/* Paid Date */}
                    <td className="px-4 py-3.5 text-text-muted whitespace-nowrap text-xs">
                      {c.commission_status === "Paid" ? formatDate(c.paid_date) : "—"}
                    </td>

                    {/* Payment Reference / UTR */}
                    <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                      {c.utr_number && c.utr_number !== "N/A" ? (
                        <span className="font-bold text-text-primary bg-surface-hover/60 px-2 py-0.5 rounded border border-border">
                          {c.utr_number}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>

                    {/* View Details Button */}
                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTxn({ ...c, type_key: "commission", transaction_type: "Franchise Commission" });
                          setIsDrawerOpen(true);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                      >
                        <MdVisibility size={14} />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <span>Showing {commissions.length} of {total} records</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-border bg-surface-hover/40 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold text-text-primary px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-border bg-surface-hover/40 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Settle Commission Status Modal */}
      {settleModalOpen && updatingComm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <FaCoins /> Commission Disbursement Settlement
            </div>

            <p className="text-xs text-text-muted">
              Updating settlement status for <span className="font-semibold text-text-primary">{updatingComm.franchise_partner_name}</span> on order <span className="font-mono text-primary font-bold">{updatingComm.related_order_id}</span>
            </p>

            {/* Franchisee Payout Bank Details Card */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-500/20">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[10px] tracking-wider">
                  Beneficiary Payout Bank Details
                </span>
                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                  {updatingComm.bank_details?.ifsc_code || "IFSC Required"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-text-muted block text-[10px]">Bank Name</span>
                  <span className="font-bold text-text-primary">{updatingComm.bank_details?.bank_name || "State Bank of India"}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Account Number</span>
                  <span className="font-mono font-bold text-text-primary">{updatingComm.bank_details?.account_number || "39827164920"}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Account Holder</span>
                  <span className="font-semibold text-text-primary truncate block">{updatingComm.bank_details?.account_holder_name || updatingComm.franchise_partner_name}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">UPI / Branch</span>
                  <span className="font-medium text-text-primary truncate block">{updatingComm.bank_details?.branch || updatingComm.bank_details?.upi_id || "Main Branch"}</span>
                </div>
              </div>
            </div>

            {/* Financial Payout Calculation Summary */}
            <div className="p-3 rounded-xl bg-surface-hover/50 border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-muted">Order Amount:</span>
                <span className="font-semibold text-text-primary">{formatCurrency(updatingComm.order_amount)}</span>
              </div>
              {updatingComm.order_type === 'fpo_order' && updatingComm.total_booked_quantity > 0 && (
                <div className="flex justify-between text-primary font-bold">
                  <span>Quota Progress:</span>
                  <span>{updatingComm.commission_completion_ratio || `${updatingComm.fulfilled_quantity || 0}/${updatingComm.total_booked_quantity}`} Kits ({updatingComm.commission_fulfillment_pct || 0}% Fulfilled)</span>
                </div>
              )}
              {updatingComm.epc_penalty_amount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>EPC Penalty (Unfulfilled Quota):</span>
                  <span>{formatCurrency(updatingComm.epc_penalty_amount)} (Charged to EPC)</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Realized Gross Margin ({updatingComm.commission_rate}%):</span>
                <span className="font-semibold text-text-primary">{formatCurrency(updatingComm.gross_commission || updatingComm.commission_amount)}</span>
              </div>
              {updatingComm.tds_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Less TDS (5% Sec 194H):</span>
                  <span className="font-mono font-semibold">-{formatCurrency(updatingComm.tds_amount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border font-bold">
                <span className="text-text-primary">Net Disbursed Payable:</span>
                <span className="font-bold text-emerald-600 font-mono text-sm">{formatCurrency(updatingComm.commission_amount)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveCommissionStatus} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1">
                  Commission Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface-hover/50 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary font-medium"
                >
                  <option value="Paid">Paid (Green - Disbursed)</option>
                  <option value="Pending">Pending (Yellow - Awaiting Payout)</option>
                  <option value="On Hold">On Hold (Orange - Under Audit)</option>
                  <option value="Failed">Failed (Red - Cancelled/Failed)</option>
                </select>
              </div>

              {newStatus === "Paid" && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-secondary block mb-1">
                      Bank Reference / UTR Number
                    </label>
                    <input
                      type="text"
                      value={newUtr}
                      onChange={(e) => setNewUtr(e.target.value)}
                      placeholder="e.g. UTR-AXIS-20260821-998811"
                      className="w-full bg-surface-hover/50 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-secondary block mb-1">
                      Disbursement Date
                    </label>
                    <input
                      type="date"
                      value={paidDate}
                      onChange={(e) => setPaidDate(e.target.value)}
                      className="w-full bg-surface-hover/50 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1">
                  Settlement Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Optional notes for audit trail..."
                  className="w-full bg-surface-hover/50 border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingSettle}
                >
                  {submittingSettle ? "Updating..." : "Confirm & Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DRAWDOWN BREAKDOWN MODAL ── */}
      {drawdownModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between bg-surface-hover/30">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-text-primary">
                    PO Breakdown: {drawdownModalOrder.related_order_id}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <MdCheckCircle size={13} /> {drawdownModalOrder.order_status || "Validated"}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Placed on {formatDate(drawdownModalOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setDrawdownModalOrder(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Quota Lock & Fulfillment */}
              <div className="p-4 rounded-2xl bg-surface-hover/50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                    Quota Lock & Fulfillment
                  </span>
                  <span className="text-[11px] font-black text-emerald-600">
                    {drawdownModalOrder.remaining_quantity != null ? drawdownModalOrder.remaining_quantity : 0} Kits Remaining
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
                  <div className="p-3 rounded-xl bg-surface border border-border">
                    <div className="text-[10px] text-text-muted uppercase font-semibold">Booked Quota</div>
                    <div className="text-sm sm:text-base font-black text-text-primary mt-0.5">
                      {drawdownModalOrder.total_booked_quantity || 0} Kits
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border">
                    <div className="text-[10px] text-text-muted uppercase font-semibold">Fulfilled</div>
                    <div className="text-sm sm:text-base font-black text-blue-600 mt-0.5">
                      {drawdownModalOrder.fulfilled_quantity || 0} Kits
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border">
                    <div className="text-[10px] text-text-muted uppercase font-semibold">Token Paid</div>
                    <div className="text-sm sm:text-base font-black text-emerald-600 mt-0.5">
                      {formatCurrency(drawdownModalOrder.token_paid || 0)}
                      <span className="text-[10px] text-text-muted block font-normal mt-0.5">
                        of {formatCurrency(drawdownModalOrder.token_amount || 0)} Req
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission Allocation Info */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Master PO Commission (Counted Single Time)
                  </span>
                  <span className="text-xs text-text-muted">
                    Tied to full {drawdownModalOrder.total_booked_quantity || 0} kits quota. Loose drawdowns do not double-charge.
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-base font-black font-mono text-emerald-600">
                    {formatCurrency(drawdownModalOrder.commission_amount)}
                  </div>
                  <span className="text-[10px] text-text-muted">
                    Gross: {formatCurrency(drawdownModalOrder.gross_commission || drawdownModalOrder.commission_amount)}
                  </span>
                </div>
              </div>

              {/* EPC Buyer Info */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
                  EPC Buyer Allocation
                </h4>
                <div className="border border-border rounded-xl p-3 bg-surface flex items-center justify-between">
                  <div>
                    <div className="font-bold text-text-primary text-xs">{drawdownModalOrder.epc_name}</div>
                    <div className="text-[11px] text-text-muted font-mono">GSTIN: {drawdownModalOrder.epc_gstin || "N/A"}</div>
                  </div>
                  <div className="text-right font-bold text-primary">
                    {drawdownModalOrder.total_booked_quantity || 0} Kits Allocated
                  </div>
                </div>
              </div>

              {/* Drawdowns Placed Under PO Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FaShoppingCart size={12} className="text-primary" />
                  Drawdowns Placed Under This PO ({(drawdownModalOrder.linked_repeat_orders || []).length})
                </h4>

                {(drawdownModalOrder.linked_repeat_orders || []).length === 0 ? (
                  <div className="p-4 rounded-xl bg-surface-hover/60 border border-dashed border-border text-center text-text-muted text-xs">
                    No repeat drawdowns placed against this PO yet.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-surface-hover border-b border-border text-[10px] font-black uppercase text-text-muted">
                        <tr>
                          <th className="py-2.5 px-3">Order #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-center">Kits</th>
                          <th className="py-2.5 px-3 text-right">Token Adj</th>
                          <th className="py-2.5 px-3 text-right">Net Paid</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-[11px]">
                        {drawdownModalOrder.linked_repeat_orders.map((child, idx) => (
                          <tr key={idx} className="hover:bg-surface-hover/40 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-primary">
                              {child.order_number || child.po_number}
                            </td>
                            <td className="py-2.5 px-3 text-text-muted whitespace-nowrap">
                              {formatDate(child.date)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-blue-600">
                              {child.kits}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                              {child.token_adjusted > 0 ? `-${formatCurrency(child.token_adjusted)}` : "₹0.00"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-text-primary">
                              {formatCurrency(child.net_paid)}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${String(child.status).toLowerCase() === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                {child.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end bg-surface">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrawdownModalOrder(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Side Drawer */}
      <TransactionDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTxn}
        onStatusUpdated={fetchCommissions}
      />
    </div>
  );
}
