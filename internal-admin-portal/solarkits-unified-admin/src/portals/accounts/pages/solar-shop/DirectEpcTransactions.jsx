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
  MdShoppingCart,
  MdInfoOutline,
  MdLocationOn
} from "react-icons/md";
import { FaBolt, FaRupeeSign, FaShieldAlt, FaTruckMoving } from "react-icons/fa";
import { getDirectEpcTransactions } from "../../api/solarshopAccounts";
import TransactionDetailsDrawer from "../../components/TransactionDetailsDrawer";
import Product8StageJourneyModal from "../../components/Product8StageJourneyModal";
import Button from "../../components/Button";

export default function DirectEpcTransactions() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total_direct_volume: 0,
    paid_count: 0,
    pending_count: 0,
    total_transactions: 0
  });

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer & Journey Modal
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [journeyOrder, setJourneyOrder] = useState(null);

  useEffect(() => {
    fetchDirectOrders();
  }, [page, statusFilter]);

  useEffect(() => {
    const handlePaymentReceived = (event) => {
      console.log("⚡ [DirectEpcTransactions] Live payment event received, refreshing direct orders...", event.detail);
      fetchDirectOrders();
    };

    window.addEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
    return () => window.removeEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
  }, []);

  const fetchDirectOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await getDirectEpcTransactions(params);
      if (res.status === "success") {
        setOrders(res.data || []);
        setTotal(res.total || 0);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Error fetching direct epc transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDirectOrders();
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
    if (s === "paid" || s === "captured" || s === "success") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <MdCheckCircle size={13} className="text-emerald-500" />
          Paid
        </span>
      );
    }
    if (s === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <MdPending size={13} className="text-amber-500" />
          Pending
        </span>
      );
    }
    if (s === "failed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">
          <MdErrorOutline size={13} className="text-red-500" />
          Failed
        </span>
      );
    }
    if (s === "refunded") {
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
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            <FaBolt /> Direct Sales Channel
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Direct EPC Transactions
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Track transactions made directly by EPC users without intermediary franchise partner attribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDirectOrders}
            className="text-xs font-semibold gap-1.5"
            disabled={loading}
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Policy Notice Box */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <MdInfoOutline size={18} />
        </div>
        <div className="text-xs">
          <span className="font-bold text-purple-700 dark:text-purple-300 block">
            0% Franchise Commission Applied
          </span>
          <p className="text-text-muted mt-0.5 leading-relaxed">
            As per platform commercial policy, direct orders placed by registered EPCs without territory franchise partner assignment retain full transaction value for the company and do not generate partner commission.
          </p>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Total Direct Volume</span>
          <p className="text-lg sm:text-xl font-extrabold text-purple-600 font-mono mt-1">
            {formatCurrency(stats.total_direct_volume)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Paid Direct Orders</span>
          <p className="text-lg sm:text-xl font-extrabold text-text-primary font-mono mt-1">
            {stats.paid_count}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Pending Invoices</span>
          <p className="text-lg sm:text-xl font-extrabold text-amber-600 font-mono mt-1">
            {stats.pending_count}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Total Orders</span>
          <p className="text-lg sm:text-xl font-extrabold text-text-primary font-mono mt-1">
            {stats.total_transactions}
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
                    ? "bg-purple-600 text-white shadow-sm"
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
              placeholder="Search EPC, Product, Customer, Txn ID..."
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
                <th className="px-4 py-3.5">EPC Name</th>
                <th className="px-4 py-3.5">Order / Product Name</th>
                <th className="px-4 py-3.5">Customer / Delivery Site</th>
                <th className="px-4 py-3.5 text-right">Total Amount (Paid)</th>
                <th className="px-4 py-3.5 text-right">Base Subtotal (Excl. Tax)</th>
                <th className="px-4 py-3.5 text-right">Company Net Received</th>
                <th className="px-4 py-3.5">Payment Date</th>
                <th className="px-4 py-3.5 text-center">Payment Status</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-text-muted">
                    <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                    Loading direct EPC transactions...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-text-muted">
                    No direct EPC transactions found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-hover/40 transition-colors">
                    {/* Transaction ID */}
                    <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-text-primary whitespace-nowrap">
                      {o.transaction_id}
                    </td>

                    {/* EPC Name */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text-primary truncate max-w-[160px]">
                        {o.epc_name}
                      </div>
                      <div className="text-[11px] text-text-muted font-mono">{o.epc_gstin}</div>
                    </td>

                    {/* Order or Product Name */}
                    <td className="px-4 py-3.5 max-w-[260px]">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-surface shrink-0 shadow-xs flex items-center justify-center">
                          {o.primary_image ? (
                            <img
                              src={o.primary_image}
                              alt={o.order_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="w-full h-full flex items-center justify-center bg-primary/10 text-primary"
                            style={{ display: o.primary_image ? "none" : "flex" }}
                          >
                            <MdShoppingCart size={16} />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-text-primary leading-tight line-clamp-2" title={o.order_name}>
                            {o.order_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {o.primary_capacity && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                ⚡ {o.primary_capacity}
                              </span>
                            )}
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 uppercase">
                              {o.primary_scope || 'Kit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Customer & Delivery Site */}
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <div className="font-semibold text-text-primary text-xs truncate" title={o.customer_name}>
                        {o.customer_name.split(' (Site:')[0]}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5 truncate" title={o.delivery_address?.line || 'Registered Site Address'}>
                        <MdLocationOn size={13} className="text-primary shrink-0" />
                        <span className="truncate">
                          {o.delivery_address?.line || 'Registered Site Address'}
                        </span>
                      </div>
                      <div className="text-[10px] text-text-muted font-mono flex items-center gap-2 mt-0.5">
                        <span>
                          {[o.delivery_address?.district_name, o.delivery_address?.state_name].filter(Boolean).join(', ') || 'Direct Dispatch'}
                          {o.delivery_address?.pincode ? ` (${o.delivery_address.pincode})` : ''}
                        </span>
                      </div>
                    </td>

                    {/* Total Transaction Amount Paid by EPC */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-text-primary whitespace-nowrap">
                      <div>{formatCurrency(o.total_transaction_amount)}</div>
                      <div className="text-[10px] text-text-muted font-sans font-normal">Paid by EPC (Incl. GST)</div>
                    </td>

                    {/* Base Subtotal (Excl. Tax) + Delivery breakdown */}
                    <td className="px-4 py-3.5 text-right font-mono text-text-secondary whitespace-nowrap">
                      <div>{formatCurrency(o.base_subtotal ?? o.epc_amount)}</div>
                      <div className="text-[10px] text-amber-600 font-sans font-normal">+ {formatCurrency(o.tax_amount)} GST</div>
                      {(o.delivery_amount > 0) && (
                        <div className="text-[10px] text-sky-600 font-sans font-normal">+ {formatCurrency(o.delivery_amount)} Delivery</div>
                      )}
                    </td>

                    {/* Company Net Received */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-purple-600 whitespace-nowrap">
                      <div>{formatCurrency(o.company_amount)}</div>
                      <div className="text-[10px] text-purple-500/80 font-sans font-normal">Grand Total (0% Comm.)</div>
                    </td>

                    {/* Payment Date */}
                    <td className="px-4 py-3.5 text-text-muted whitespace-nowrap text-xs">
                      {formatDate(o.payment_date)}
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {renderStatusBadge(o.payment_status)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setJourneyOrder(o)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
                          title="Open 8-Step Product Journey"
                        >
                          <FaTruckMoving size={11} />
                          <span>8-Step Journey</span>
                        </button>
                        <Button
                          variant={o.payment_status === "Pending" ? "primary" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedTxn({ ...o, type_key: "direct_epc", transaction_type: "Direct EPC Transaction" });
                            setIsDrawerOpen(true);
                          }}
                          className={`text-xs font-bold px-3 py-1 gap-1 ${
                            o.payment_status === "Pending"
                              ? "bg-amber-500 hover:bg-amber-600 text-white border-none shadow-xs animate-pulse"
                              : "border-purple-500/30 text-purple-600 hover:bg-purple-600 hover:text-white"
                          }`}
                        >
                          <MdVisibility size={14} />
                          {o.payment_status === "Pending" ? "Verify Payment" : "View Details"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <span>Showing {orders.length} of {total} records</span>
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

      {/* Transaction Details Side Drawer */}
      <TransactionDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTxn}
        onStatusUpdated={fetchDirectOrders}
      />

      {/* ── PRODUCT 8-STAGE JOURNEY MODAL ──────────────────────────────────── */}
      {journeyOrder && (
        <Product8StageJourneyModal
          isOpen={!!journeyOrder}
          onClose={() => setJourneyOrder(null)}
          order={journeyOrder}
          orderType="direct_epc"
          onStageUpdated={() => {
            fetchDirectOrders();
          }}
        />
      )}
    </div>
  );
}
