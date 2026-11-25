import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdPayments,
  MdShoppingCart,
  MdPendingActions,
  MdCheckCircle,
  MdSearch,
  MdRefresh,
  MdVisibility,
  MdArrowForward,
  MdFilterList,
  MdCalendarToday,
  MdDownload
} from "react-icons/md";
import { FaRupeeSign, FaHandshake, FaBolt, FaCoins, FaReceipt } from "react-icons/fa";
import { getSolarShopDashboardStats, getSolarShopRecentTransactions } from "../../api/solarshopAccounts";
import TransactionDetailsDrawer from "../../components/TransactionDetailsDrawer";
import Button from "../../components/Button";

export default function SolarShopAccountsHome() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_franchise_plan_payments: 0,
    total_direct_epc_transactions: 0,
    pending_franchise_commission: 0,
    paid_franchise_commission: 0,
  });

  const [counts, setCounts] = useState({
    franchise_plans_count: 0,
    direct_epc_orders_count: 0,
    onboarded_epc_orders_count: 0,
    total_commission_transactions: 0,
  });

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh live when ICICI payment event is received
    const handlePaymentReceived = (event) => {
      console.log("⚡ [SolarShopAccountsHome] Live payment event received, refreshing data...", event.detail);
      fetchDashboardData();
    };

    window.addEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
    return () => window.removeEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
  }, []);

  useEffect(() => {
    fetchRecentTransactions();
  }, [typeFilter, statusFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await getSolarShopDashboardStats();
      if (res.status === "success" && res.data) {
        setStats(res.data.summary_cards || {});
        setCounts(res.data.counts || {});
      }
      await fetchRecentTransactions();
    } catch (err) {
      console.error("Error fetching solar shop dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    setTableLoading(true);
    try {
      const params = { limit: 20 };
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await getSolarShopRecentTransactions(params);
      if (res.status === "success" && res.data) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error("Error fetching recent transactions:", err);
    } finally {
      setTableLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecentTransactions();
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
    if (s === "paid" || s === "captured" || s === "success" || s === "active") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          Paid
        </span>
      );
    }
    if (s === "pending" || s === "grace" || s === "processing" || s === "confirmed") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Pending
        </span>
      );
    }
    if (s === "on hold" || s === "on_hold") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20">
          On Hold
        </span>
      );
    }
    if (s === "failed" || s === "expired" || s === "cancelled") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
          Failed
        </span>
      );
    }
    if (s === "refunded") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
          Refunded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        {status || "N/A"}
      </span>
    );
  };

  const renderTypeBadge = (typeKey, typeLabel) => {
    if (typeKey === "franchise_plan") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
          <FaHandshake size={11} />
          Franchise Plan
        </span>
      );
    }
    if (typeKey === "direct_epc") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
          <FaBolt size={11} />
          Direct EPC
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <FaCoins size={11} />
        Franchise Commission
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-linear-120 from-primary to-primary-end flex items-center justify-center text-white shadow-md text-base">
              <FaCoins />
            </span>
            Solar Shop Accounts Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Complete financial tracking of franchise plans, direct EPC transactions, and franchise commission settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="text-xs font-semibold gap-1.5"
            disabled={loading}
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── EXACT FOUR SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Franchise Plan Payments */}
        <div
          onClick={() => navigate("/account-panel/solar-shop/franchise-plans")}
          className="group relative bg-surface p-5 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Total Franchise Plan Payments
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
              <FaHandshake />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-text-primary font-mono tracking-tight">
              {formatCurrency(stats.total_franchise_plan_payments)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
              <span className="text-text-muted">{counts.franchise_plans_count} Plan Subscriptions</span>
              <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View All <MdArrowForward size={14} />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Direct EPC Transactions */}
        <div
          onClick={() => navigate("/account-panel/solar-shop/direct-epc-transactions")}
          className="group relative bg-surface p-5 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-purple-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Total Direct EPC Transactions
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
              <MdShoppingCart />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-text-primary font-mono tracking-tight">
              {formatCurrency(stats.total_direct_epc_transactions)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
              <span className="text-text-muted">{counts.direct_epc_orders_count} Direct Orders</span>
              <span className="text-purple-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View All <MdArrowForward size={14} />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Franchise Commission */}
        <div
          onClick={() => navigate("/account-panel/solar-shop/franchise-commissions?status=pending")}
          className="group relative bg-surface p-5 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Pending Franchise Commission
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
              <MdPendingActions />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-500 font-mono tracking-tight">
              {formatCurrency(stats.pending_franchise_commission)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
              <span className="text-text-muted">Awaiting Payout / Settlement</span>
              <span className="text-amber-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Track <MdArrowForward size={14} />
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Paid Franchise Commission */}
        <div
          onClick={() => navigate("/account-panel/solar-shop/franchise-commissions?status=paid")}
          className="group relative bg-surface p-5 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Paid Franchise Commission
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <MdCheckCircle />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-500 font-mono tracking-tight">
              {formatCurrency(stats.paid_franchise_commission)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
              <span className="text-text-muted">Successfully Disbursed</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View Ledger <MdArrowForward size={14} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SINGLE RECENT TRANSACTIONS TABLE ─── */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Table Header & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-border space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                <FaReceipt className="text-primary" />
                Recent Financial Transactions
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Real-time unified audit feed across Franchise Plans, Direct EPC Orders, and Commission Payouts.
              </p>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-[260px] sm:min-w-[320px]">
              <input
                type="text"
                placeholder="Search Txn ID, Partner, EPC, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-hover/50 border border-border rounded-xl text-xs sm:text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
              />
              <MdSearch className="absolute left-3 top-2.5 text-text-muted text-lg pointer-events-none" />
            </form>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold text-text-muted flex items-center gap-1 mr-1">
                <MdFilterList size={15} /> Type:
              </span>
              {[
                { label: "All Transactions", value: "all" },
                { label: "Franchise Plans", value: "franchise_plan" },
                { label: "Direct EPC", value: "direct_epc" },
                { label: "Franchise Commission", value: "commission" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setTypeFilter(pill.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    typeFilter === pill.value
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface-hover/70 text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Status Quick Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-text-muted">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-hover/60 border border-border text-xs rounded-xl px-2.5 py-1.5 text-text-primary font-medium focus:outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid / Settled</option>
                <option value="pending">Pending</option>
                <option value="on hold">On Hold</option>
                <option value="failed">Failed / Expired</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto scrollbar-hover">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-surface-hover/40 text-text-muted font-bold text-[11px] uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-4 sm:px-6 py-3.5">Transaction ID</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Party / Partner</th>
                <th className="px-4 py-3.5">Related Item / Scope</th>
                <th className="px-4 py-3.5 text-right">Total Amount</th>
                <th className="px-4 py-3.5 text-right">Franchise Comm.</th>
                <th className="px-4 py-3.5 text-center">Payment Status</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {tableLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-text-muted">
                    <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                    Loading recent transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-text-muted">
                    <p className="font-semibold">No transactions found matching the filter.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr
                    key={txn.id || txn.transaction_id}
                    className="hover:bg-surface-hover/40 transition-colors group"
                  >
                    {/* Transaction ID */}
                    <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-text-primary whitespace-nowrap">
                      {txn.transaction_id}
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderTypeBadge(txn.type_key, txn.transaction_type)}
                    </td>

                    {/* Party Name */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text-primary truncate max-w-[180px]">
                        {txn.party_name}
                      </div>
                      {txn.secondary_party && (
                        <div className="text-[11px] text-text-muted truncate max-w-[180px]">
                          EPC: {txn.secondary_party}
                        </div>
                      )}
                    </td>

                    {/* Related Item */}
                    <td className="px-4 py-3.5 text-text-secondary max-w-[200px] truncate" title={txn.related_item}>
                      {txn.related_item}
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-text-primary whitespace-nowrap">
                      {formatCurrency(txn.total_amount)}
                    </td>

                    {/* Franchise Commission */}
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                      {txn.type_key === "direct_epc" ? (
                        <span className="text-text-muted text-xs">₹0.00 (0%)</span>
                      ) : (
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(txn.franchise_commission)}
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {renderStatusBadge(txn.payment_status)}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-text-muted whitespace-nowrap text-xs">
                      {formatDate(txn.payment_date || txn.created_at)}
                    </td>

                    {/* Action Button */}
                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTxn(txn);
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

        {/* Table Footer Summary */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted bg-surface-hover/20">
          <span>Showing {transactions.length} most recent financial transactions</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/account-panel/solar-shop/franchise-plans")}
              className="text-primary hover:underline font-semibold"
            >
              Franchise Plans →
            </button>
            <button
              onClick={() => navigate("/account-panel/solar-shop/direct-epc-transactions")}
              className="text-primary hover:underline font-semibold"
            >
              Direct EPC Orders →
            </button>
            <button
              onClick={() => navigate("/account-panel/solar-shop/franchise-commissions")}
              className="text-primary hover:underline font-semibold"
            >
              Commission Tracking →
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Side Drawer */}
      <TransactionDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTxn}
        onStatusUpdated={fetchDashboardData}
      />
    </div>
  );
}
