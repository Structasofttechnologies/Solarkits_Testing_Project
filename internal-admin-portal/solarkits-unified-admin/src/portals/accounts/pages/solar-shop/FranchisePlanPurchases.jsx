import { useState, useEffect } from "react";
import {
  MdSearch,
  MdRefresh,
  MdVisibility,
  MdFilterList,
  MdCheckCircle,
  MdPending,
  MdErrorOutline,
  MdReceipt,
  MdDownload,
  MdEdit
} from "react-icons/md";
import { FaHandshake, FaRupeeSign, FaFileInvoiceDollar } from "react-icons/fa";
import { getFranchisePlanPurchases, updatePlanPaymentStatus } from "../../api/solarshopAccounts";
import TransactionDetailsDrawer from "../../components/TransactionDetailsDrawer";
import Button from "../../components/Button";

export default function FranchisePlanPurchases() {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({
    total_paid_amount: 0,
    paid_count: 0,
    pending_count: 0,
    failed_count: 0
  });

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer & Status update modal
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [updatingItem, setUpdatingItem] = useState(null);
  const [newStatus, setNewStatus] = useState("Paid");
  const [newUtr, setNewUtr] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [page, statusFilter]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await getFranchisePlanPurchases(params);
      if (res.status === "success") {
        setPlans(res.data || []);
        setTotal(res.total || 0);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Error fetching franchise plan purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPlans();
  };

  const handleOpenStatusModal = (plan) => {
    setUpdatingItem(plan);
    setNewStatus(plan.payment_status || "Paid");
    setNewUtr(plan.payment_reference !== "N/A" ? plan.payment_reference : "");
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!updatingItem) return;
    setSubmittingStatus(true);
    try {
      await updatePlanPaymentStatus(updatingItem.id, {
        payment_status: newStatus,
        payment_reference: newUtr
      });
      setStatusModalOpen(false);
      fetchPlans();
    } catch (err) {
      console.error("Error updating plan payment status:", err);
    } finally {
      setSubmittingStatus(false);
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

  const renderStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "paid" || s === "active") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <MdCheckCircle size={13} className="text-emerald-500" />
          Paid
        </span>
      );
    }
    if (s === "pending" || s === "grace") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <MdPending size={13} className="text-amber-500" />
          Pending
        </span>
      );
    }
    if (s === "failed" || s === "expired") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">
          <MdErrorOutline size={13} className="text-red-500" />
          Failed
        </span>
      );
    }
    if (s === "refunded" || s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
          <MdReceipt size={13} className="text-purple-500" />
          Refunded
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <FaHandshake /> Franchisee Financials
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Franchise Plan Purchases
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Track onboarding subscription payments, territory tier assignments, and verification receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlans}
            className="text-xs font-semibold gap-1.5"
            disabled={loading}
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Total Paid Revenue</span>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-600 font-mono mt-1">
            {formatCurrency(stats.total_paid_amount)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Paid Subscriptions</span>
          <p className="text-lg sm:text-xl font-extrabold text-text-primary font-mono mt-1">
            {stats.paid_count}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Pending Approvals</span>
          <p className="text-lg sm:text-xl font-extrabold text-amber-600 font-mono mt-1">
            {stats.pending_count}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Failed / Refunded</span>
          <p className="text-lg sm:text-xl font-extrabold text-red-500 font-mono mt-1">
            {stats.failed_count}
          </p>
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
            {["all", "paid", "pending", "failed", "refunded"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all ${
                  statusFilter === st
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-hover/70 text-text-secondary hover:text-text-primary"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] sm:min-w-[300px]">
            <input
              type="text"
              placeholder="Search Partner, Plan, Territory, Txn ID..."
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
                <th className="px-4 sm:px-6 py-3.5">Transaction ID</th>
                <th className="px-4 py-3.5">Franchise Partner</th>
                <th className="px-4 py-3.5">Plan Name</th>
                <th className="px-4 py-3.5">Territory Scope</th>
                <th className="px-4 py-3.5 text-right">Plan Amount</th>
                <th className="px-4 py-3.5">Payment Date</th>
                <th className="px-4 py-3.5">Payment Method</th>
                <th className="px-4 py-3.5 text-center">Payment Status</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-text-muted">
                    <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                    Loading franchise plan payments...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-text-muted">
                    No franchise plan payments found matching criteria.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-hover/40 transition-colors">
                    {/* Transaction ID */}
                    <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-text-primary whitespace-nowrap">
                      {p.transaction_id}
                    </td>

                    {/* Franchise Partner */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text-primary truncate max-w-[170px]">
                        {p.franchise_partner_name}
                      </div>
                      <div className="text-[11px] text-text-muted font-mono">{p.mobile}</div>
                    </td>

                    {/* Plan Name */}
                    <td className="px-4 py-3.5 font-medium text-text-primary max-w-[160px] truncate" title={p.plan_name}>
                      {p.plan_name}
                    </td>

                    {/* Territory */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/5 text-primary border border-primary/10">
                        {p.territory}
                      </span>
                    </td>

                    {/* Plan Amount */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-text-primary whitespace-nowrap">
                      {formatCurrency(p.plan_amount)}
                    </td>

                    {/* Payment Date */}
                    <td className="px-4 py-3.5 text-text-muted whitespace-nowrap text-xs">
                      {formatDate(p.payment_date)}
                    </td>

                    {/* Payment Method */}
                    <td className="px-4 py-3.5 text-text-secondary whitespace-nowrap text-xs">
                      <div>{p.payment_method}</div>
                      {p.receipt_url && (
                        <a
                          href={p.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-bold mt-0.5"
                        >
                          <MdReceipt size={12} /> Receipt Attached
                        </a>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {renderStatusBadge(p.payment_status)}
                        <button
                          onClick={() => handleOpenStatusModal(p)}
                          className="text-text-muted hover:text-primary p-1 rounded hover:bg-surface-hover transition-colors"
                          title="Change Status"
                        >
                          <MdEdit size={13} />
                        </button>
                      </div>
                    </td>

                    {/* View Details Button */}
                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTxn({ ...p, type_key: "franchise_plan", transaction_type: "Franchise Plan" });
                          setIsDrawerOpen(true);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 gap-1 border-primary/30 text-primary hover:bg-primary hover:text-white"
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
          <span>Showing {plans.length} of {total} records</span>
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

      {/* Edit Status Modal */}
      {statusModalOpen && updatingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-text-primary">
              Update Plan Payment Status
            </h3>
            <p className="text-xs text-text-muted">
              Updating status for <span className="font-semibold text-text-primary">{updatingItem.franchise_partner_name}</span> ({updatingItem.transaction_id})
            </p>

            <form onSubmit={handleSaveStatus} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1">
                  Payment Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface-hover/50 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="Paid">Paid (Active)</option>
                  <option value="Pending">Pending (Grace)</option>
                  <option value="Failed">Failed (Expired)</option>
                  <option value="Refunded">Refunded (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1">
                  Payment Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={newUtr}
                  onChange={(e) => setNewUtr(e.target.value)}
                  placeholder="e.g. UTR-20260820-9912"
                  className="w-full bg-surface-hover/50 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingStatus}
                >
                  {submittingStatus ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Details Side Drawer */}
      <TransactionDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTxn}
        onStatusUpdated={fetchPlans}
      />
    </div>
  );
}
