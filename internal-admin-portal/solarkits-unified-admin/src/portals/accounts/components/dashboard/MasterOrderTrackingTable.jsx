import React, { useState, useMemo } from "react";
import {
  FaSearch,
  FaFilter,
  FaFileDownload,
  FaBoxes,
  FaTruck,
  FaCreditCard,
  FaCogs,
  FaEye,
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaBuilding,
  FaCalendarAlt,
} from "react-icons/fa";

export default function MasterOrderTrackingTable({
  orders = [],
  selectedStatusFilter,
  onClearStatusFilter,
  onViewOrder,
}) {
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [productionFilter, setProductionFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [delayFilter, setDelayFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active status filter effective value (either card click or local dropdown)
  const effectiveStatus = selectedStatusFilter || (statusFilter !== "all" ? statusFilter : null);

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const suppliers = new Set();
    const accounts = new Set();
    const kitTypes = new Set();
    orders.forEach((o) => {
      if (o.supplier_name) suppliers.add(o.supplier_name);
      if (o.assigned_account) accounts.add(o.assigned_account);
      if (o.kit_type) kitTypes.add(o.kit_type);
    });
    return {
      suppliers: Array.from(suppliers),
      accounts: Array.from(accounts),
      kitTypes: Array.from(kitTypes),
    };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter (card click or dropdown)
      if (effectiveStatus && o.current_status !== effectiveStatus) {
        return false;
      }

      // Source filter
      if (sourceFilter !== "all" && o.order_source?.toLowerCase() !== sourceFilter.toLowerCase()) {
        return false;
      }

      // Payment filter
      if (paymentFilter !== "all") {
        if (paymentFilter === "advance" && !o.payment_status?.includes("Advance")) return false;
        if (paymentFilter === "full" && !o.payment_status?.includes("Fully")) return false;
        if (paymentFilter === "pending" && !o.payment_status?.includes("Pending")) return false;
        if (paymentFilter === "overdue" && !o.payment_status?.includes("Overdue")) return false;
      }

      // Production filter
      if (productionFilter !== "all" && o.production_status?.toLowerCase() !== productionFilter.toLowerCase()) {
        return false;
      }

      // Delivery filter
      if (deliveryFilter !== "all" && o.delivery_status?.toLowerCase() !== deliveryFilter.toLowerCase()) {
        return false;
      }

      // Delay filter
      if (delayFilter !== "all") {
        if (delayFilter === "overdue" && o.overdue_days <= 0) return false;
        if (delayFilter === "on_track" && o.overdue_days > 0) return false;
      }

      // Supplier filter
      if (supplierFilter !== "all" && o.supplier_name !== supplierFilter) {
        return false;
      }

      // Account Manager filter
      if (accountFilter !== "all" && o.assigned_account !== accountFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNum = (o.order_number || "").toLowerCase().includes(query);
        const matchCustomer = (o.customer_name || "").toLowerCase().includes(query);
        const matchKit = (o.kit_type || "").toLowerCase().includes(query);
        const matchCity = (o.location?.city || "").toLowerCase().includes(query);
        if (!matchNum && !matchCustomer && !matchKit && !matchCity) return false;
      }

      return true;
    });
  }, [
    orders,
    effectiveStatus,
    sourceFilter,
    paymentFilter,
    productionFilter,
    deliveryFilter,
    delayFilter,
    supplierFilter,
    accountFilter,
    searchTerm,
  ]);

  // Paginated records
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Order Number",
      "Source",
      "Customer",
      "Location",
      "Kit",
      "Quantity",
      "Value (INR)",
      "Current Status",
      "Production",
      "Payment",
      "Delivery",
      "Delay (Days)",
      "Next Action",
      "Account Manager",
      "Supplier",
    ];

    const rows = filteredOrders.map((o) => [
      o.order_number,
      o.order_source,
      `"${o.customer_name}"`,
      `"${o.location?.city || ''}, ${o.location?.state || ''}"`,
      `"${o.kit_type}"`,
      o.kit_quantity,
      o.order_value,
      o.current_status,
      o.production_status,
      o.payment_status,
      o.delivery_status,
      o.overdue_days || 0,
      `"${o.next_action}"`,
      `"${o.assigned_account}"`,
      `"${o.supplier_name}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solarkits_account_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSourceBadge = (source = "") => {
    switch (source.toUpperCase()) {
      case "EPC":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-300";
      case "FRANCHISEE":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300";
      case "STORE":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300";
      case "BDE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 border-purple-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusBadge = (status = "") => {
    if (status.includes("Pending")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    if (status.includes("Progress") || status.includes("Preparation")) return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200";
    if (status.includes("Delivered") || status.includes("Completed")) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
    if (status.includes("Dispatched")) return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
    if (status.includes("Cancelled") || status.includes("Returned")) return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
  };

  return (
    <div id="master-order-tracking-table" className="card p-5 space-y-4 border border-border/80 shadow-xs w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary text-sm">
              <FaBoxes />
            </span>
            <h3 className="text-sm font-black text-text-primary tracking-tight uppercase">
              Master Order Tracking Table
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
              {filteredOrders.length} Orders Displayed
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Full-spectrum operational order register with multi-criteria drill-down, SLA monitoring, and stage transitions.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-primary text-xs font-bold shadow-xs transition-all flex items-center gap-2"
        >
          <FaFileDownload size={12} className="text-primary" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Active Filter Notification Banner */}
      {selectedStatusFilter && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-text-secondary">Filtering by Status Card:</span>
            <span className="font-black text-primary uppercase tracking-wide bg-surface px-2.5 py-0.5 rounded-md border border-primary/20">
              {selectedStatusFilter}
            </span>
          </div>

          <button
            onClick={onClearStatusFilter}
            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline"
          >
            <FaTimes size={10} />
            <span>Clear Card Filter</span>
          </button>
        </div>
      )}

      {/* 12 Multi-facet Filter Bar */}
      <div className="space-y-2.5 bg-surface-hover/60 border border-border/60 p-3 rounded-2xl">
        {/* Top Row: Search + Fast Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {/* Universal Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Order #, customer, kit..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-surface text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Sources (Store, EPC, Franchisee, BDE)</option>
            <option value="epc">EPC Direct Orders</option>
            <option value="franchisee">Franchisee Orders</option>
            <option value="store">Solar Store Network</option>
            <option value="bde">BDE Assisted Orders</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatusFilter || statusFilter}
            onChange={(e) => {
              if (selectedStatusFilter) onClearStatusFilter();
              setStatusFilter(e.target.value);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All 14 Lifecycle Statuses</option>
            <option value="New Orders">New Orders</option>
            <option value="Order Approval Pending">Order Approval Pending</option>
            <option value="PO Pending">PO Pending</option>
            <option value="Procurement In Progress">Procurement In Progress</option>
            <option value="Supplier Payment Pending">Supplier Payment Pending</option>
            <option value="Production In Progress">Production In Progress</option>
            <option value="Warehouse Inward Pending">Warehouse Inward Pending</option>
            <option value="Kit Preparation">Kit Preparation</option>
            <option value="Ready for Dispatch">Ready for Dispatch</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Delivered">Delivered</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Returned">Returned</option>
          </select>

          {/* Delay Status */}
          <select
            value={delayFilter}
            onChange={(e) => setDelayFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Delay States (Green, Orange, Red)</option>
            <option value="overdue">Overdue Orders (TAT Exceeded)</option>
            <option value="on_track">On Track (Within TAT)</option>
          </select>
        </div>

        {/* Bottom Row: Additional Fine-Grained Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {/* Payment Status */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Payment: All</option>
            <option value="pending">Pending Verification</option>
            <option value="advance">Advance Paid</option>
            <option value="full">Fully Paid</option>
            <option value="overdue">Payment Overdue</option>
          </select>

          {/* Production Status */}
          <select
            value={productionFilter}
            onChange={(e) => setProductionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Production: All</option>
            <option value="not started">Not Started</option>
            <option value="in production">In Production</option>
            <option value="production completed">Completed</option>
          </select>

          {/* Delivery Status */}
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Delivery: All</option>
            <option value="pending dispatch">Pending Dispatch</option>
            <option value="ready for dispatch">Ready for Dispatch</option>
            <option value="in transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>

          {/* Supplier */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Supplier: All Tier-1 OEMs</option>
            {filterOptions.suppliers.map((sup) => (
              <option key={sup} value={sup}>
                {sup}
              </option>
            ))}
          </select>

          {/* Assigned Account Manager */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Account Manager: All</option>
            {filterOptions.accounts.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Master Table */}
      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-surface-hover border-b border-border text-[10px] uppercase font-bold text-text-muted">
            <tr>
              <th className="py-3 px-3">Order Number</th>
              <th className="py-3 px-3">Source</th>
              <th className="py-3 px-3">Customer / Location</th>
              <th className="py-3 px-3">Kit & Qty</th>
              <th className="py-3 px-3 text-right">Order Value</th>
              <th className="py-3 px-3">Current Status</th>
              <th className="py-3 px-3">Production</th>
              <th className="py-3 px-3">Payment</th>
              <th className="py-3 px-3">Delivery</th>
              <th className="py-3 px-3 text-center">Delay / TAT</th>
              <th className="py-3 px-3">Next Action</th>
              <th className="py-3 px-3">Assigned Account</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-surface">
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => {
                const isOverdue = (order.overdue_days || 0) > 0;
                return (
                  <tr
                    key={order.order_number}
                    className="hover:bg-surface-hover/70 transition-colors"
                  >
                    {/* Order Number */}
                    <td className="py-3 px-3">
                      <span
                        onClick={() => onViewOrder?.(order)}
                        className="font-mono font-black text-primary hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        {order.order_number}
                      </span>
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        {order.order_date?.slice(0, 10)}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getSourceBadge(
                          order.order_source
                        )}`}
                      >
                        {order.order_source}
                      </span>
                    </td>

                    {/* Customer & Location */}
                    <td className="py-3 px-3 max-w-xs truncate">
                      <div className="font-bold text-text-primary">{order.customer_name}</div>
                      <div className="text-[10px] text-text-secondary mt-0.5">
                        {order.location?.city}, {order.location?.state}
                      </div>
                    </td>

                    {/* Kit & Qty */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-text-primary text-[11px] truncate max-w-[160px]" title={order.kit_type}>
                        {order.kit_type}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-text-muted">
                        Qty: {order.kit_quantity}
                      </span>
                    </td>

                    {/* Order Value */}
                    <td className="py-3 px-3 text-right font-mono font-black text-text-primary">
                      ₹{order.order_value?.toLocaleString("en-IN")}
                    </td>

                    {/* Current Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(
                          order.current_status
                        )}`}
                      >
                        {order.current_status}
                      </span>
                    </td>

                    {/* Production Status */}
                    <td className="py-3 px-3">
                      <div className="text-[11px] font-bold text-text-primary">
                        {order.production_status}
                      </div>
                      <div className="w-20 bg-border/60 h-1 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${order.production_progress || 0}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-text-muted mt-0.5 block">
                        {order.supplier_name}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-hover border border-border text-text-primary block w-fit">
                        {order.payment_status}
                      </span>
                      <span className="text-[9px] text-text-muted mt-0.5 block">
                        Admin: {order.admin_approval_status || "Approved"}
                      </span>
                    </td>

                    {/* Delivery Status */}
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium text-text-primary">
                        {order.delivery_status}
                      </span>
                    </td>

                    {/* Delay / Overdue Days */}
                    <td className="py-3 px-3 text-center">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span>+{order.overdue_days}d Overdue</span>
                        </span>
                      ) : order.delay_indicator === "orange" ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Approaching</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Within TAT</span>
                        </span>
                      )}
                    </td>

                    {/* Next Action */}
                    <td className="py-3 px-3 max-w-xs truncate text-[11px] font-medium text-text-primary" title={order.next_action}>
                      {order.next_action}
                    </td>

                    {/* Assigned Account */}
                    <td className="py-3 px-3 text-[11px] text-text-secondary">
                      {order.assigned_account}
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onViewOrder?.(order)}
                        className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-primary hover:text-white hover:border-primary text-text-primary text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 ml-auto"
                      >
                        <FaEye size={10} />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={13}
                  className="py-12 text-center text-text-muted text-xs italic"
                >
                  No orders match the specified filter combination.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2">
        <div className="flex items-center gap-2 text-text-secondary">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded-lg border border-border bg-surface text-text-primary text-xs font-bold focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>per page • Total {filteredOrders.length} orders</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <FaChevronLeft size={10} />
          </button>

          <span className="px-3 py-1 font-bold text-text-primary font-mono">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-border text-text-secondary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <FaChevronRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}

