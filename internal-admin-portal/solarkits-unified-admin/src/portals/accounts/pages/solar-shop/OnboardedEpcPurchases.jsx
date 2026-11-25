import { useState, useEffect } from "react";
import {
  MdSearch,
  MdRefresh,
  MdVisibility,
  MdFilterList,
  MdCheckCircle,
  MdPending,
  MdErrorOutline,
  MdLocalShipping,
  MdInventory2,
  MdReceipt
} from "react-icons/md";
import { FaHandshake, FaUserCheck, FaRupeeSign, FaTruckMoving } from "react-icons/fa";
import { getOnboardedEpcPurchases } from "../../api/solarshopAccounts";
import TransactionDetailsDrawer from "../../components/TransactionDetailsDrawer";
import Product8StageJourneyModal from "../../components/Product8StageJourneyModal";
import Button from "../../components/Button";

export default function OnboardedEpcPurchases() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total_onboarded_sales: 0,
    total_commissions_generated: 0,
    total_items_sold: 0
  });

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer & Journey Modal
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [journeyOrder, setJourneyOrder] = useState(null);

  useEffect(() => {
    fetchPurchases();
  }, [page]);

  useEffect(() => {
    const handlePaymentReceived = (event) => {
      console.log("⚡ [OnboardedEpcPurchases] Live payment event received, refreshing purchases...", event.detail);
      fetchPurchases();
    };

    window.addEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
    return () => window.removeEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (searchQuery) params.search = searchQuery;

      const res = await getOnboardedEpcPurchases(params);
      if (res.status === "success") {
        setItems(res.data || []);
        setTotal(res.total || 0);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Error fetching onboarded epc purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPurchases();
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

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <FaUserCheck /> Partner Network Sales
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Onboarded EPC Product Purchases
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Audit itemized equipment & combo kit purchases placed by EPCs linked to franchise partners, with commission splits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPurchases}
            className="text-xs font-semibold gap-1.5"
            disabled={loading}
          >
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Total Equipment Volume</span>
          <p className="text-lg sm:text-xl font-extrabold text-primary font-mono mt-1">
            {formatCurrency(stats.total_onboarded_sales)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Commissions Generated</span>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-600 font-mono mt-1">
            {formatCurrency(stats.total_commissions_generated)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase">Total Units / Items Sold</span>
          <p className="text-lg sm:text-xl font-extrabold text-text-primary font-mono mt-1">
            {stats.total_items_sold} Units
          </p>
        </div>
      </div>

      {/* Filter & Table Container */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <MdInventory2 className="text-primary" />
            Purchased Products & Attributed Partner Commissions
          </h2>

          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] sm:min-w-[320px]">
            <input
              type="text"
              placeholder="Search Product, Partner, EPC, Order ID..."
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
                <th className="px-4 sm:px-6 py-3.5">Order ID</th>
                <th className="px-4 py-3.5">Product / Equipment</th>
                <th className="px-4 py-3.5 text-center">Qty</th>
                <th className="px-4 py-3.5 text-right">Product Amount</th>
                <th className="px-4 py-3.5">Onboarded EPC</th>
                <th className="px-4 py-3.5">Attributed Franchise Partner</th>
                <th className="px-4 py-3.5 text-right">Partner Commission</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5">Order Date</th>
                <th className="px-4 sm:px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-text-muted">
                    <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                    Loading onboarded EPC purchases...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-text-muted">
                    No product purchases found matching criteria.
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.item_id} className="hover:bg-surface-hover/40 transition-colors">
                    {/* Order ID */}
                    <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-primary whitespace-nowrap">
                      {i.order_number}
                    </td>

                    {/* Product Name */}
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <div className="font-semibold text-text-primary truncate" title={i.product_name}>
                        {i.product_name}
                      </div>
                      <span className="text-[10px] text-text-muted capitalize">
                        Type: {i.scope_type}
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="px-4 py-3.5 text-center font-bold text-text-secondary whitespace-nowrap">
                      {i.quantity}
                    </td>

                    {/* Product Amount */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-text-primary whitespace-nowrap">
                      {formatCurrency(i.total_product_amount)}
                    </td>

                    {/* EPC Name */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text-primary truncate max-w-[150px]">
                        {i.epc_name}
                      </div>
                      <div className="text-[11px] text-text-muted font-mono">{i.epc_gstin}</div>
                    </td>

                    {/* Franchise Partner */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-primary truncate max-w-[160px]">
                        {i.franchise_partner_name}
                      </div>
                      <div className="text-[11px] text-text-muted">{i.franchise_partner_contact}</div>
                    </td>

                    {/* Partner Commission */}
                    <td className="px-4 py-3.5 text-right font-mono whitespace-nowrap">
                      <div className="font-bold text-emerald-600">
                        {formatCurrency(i.commission_amount)}
                      </div>
                      <span className="text-[10px] text-text-muted font-normal">
                        ({i.commission_rate}%)
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        i.payment_status === "Paid"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}>
                        {i.payment_status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-text-muted whitespace-nowrap text-xs">
                      {formatDate(i.order_date)}
                    </td>

                    {/* Action */}
                    <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() =>
                            setJourneyOrder({
                              _id: i.order_id,
                              id: i.order_id,
                              order_number: i.order_number,
                              product_name: i.product_name,
                              quantity: i.quantity,
                              total_transaction_amount: i.total_product_amount,
                              epc_name: i.epc_name,
                              franchise_partner_name: i.franchise_partner_name,
                              order_status: i.payment_status === "Paid" ? "confirmed" : "pending",
                              status: i.payment_status === "Paid" ? "CONFIRMED" : "PENDING",
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
                          title="Open 8-Step Product Journey"
                        >
                          <FaTruckMoving size={11} />
                          <span>8-Step Journey</span>
                        </button>
                        <Button
                          variant={i.payment_status === "Pending" ? "primary" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSelectedTxn({ id: i.order_id, type_key: "commission", transaction_type: "Franchise Onboarded EPC Order", payment_status: i.payment_status });
                            setIsDrawerOpen(true);
                          }}
                          className={`text-xs font-bold px-3 py-1 gap-1 ${
                            i.payment_status === "Pending"
                              ? "bg-amber-500 hover:bg-amber-600 text-white border-none shadow-xs animate-pulse"
                              : "border-primary/30 text-primary hover:bg-primary hover:text-white"
                          }`}
                        >
                          <MdVisibility size={14} />
                          {i.payment_status === "Pending" ? "Verify Payment" : "View"}
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
          <span>Showing {items.length} of {total} records</span>
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
        onStatusUpdated={fetchPurchases}
      />

      {/* ── PRODUCT 8-STAGE JOURNEY MODAL ──────────────────────────────────── */}
      {journeyOrder && (
        <Product8StageJourneyModal
          isOpen={!!journeyOrder}
          onClose={() => setJourneyOrder(null)}
          order={journeyOrder}
          orderType="onboarded_epc"
          onStageUpdated={() => {
            fetchPurchases();
          }}
        />
      )}
    </div>
  );
}
