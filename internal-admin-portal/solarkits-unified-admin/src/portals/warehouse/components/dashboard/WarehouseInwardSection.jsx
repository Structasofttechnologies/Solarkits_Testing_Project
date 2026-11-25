import React, { useState } from "react";
import {
  FaWarehouse,
  FaCalendarCheck,
  FaTruckLoading,
  FaClock,
  FaExclamationCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaSearch,
  FaBoxes,
  FaDolly
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function WarehouseInwardSection({
  data = {},
  onSelectOrder,
  onReceiveGoods
}) {
  const navigate = useNavigate();
  const summary = data.summary || {};
  const table = data.table || [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const metricCards = [
    { label: "Expected Today", val: summary.expected_today ?? 0, icon: <FaCalendarCheck />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-200 dark:border-blue-900/40" },
    { label: "Pickup Pending", val: summary.pickup_pending ?? 0, icon: <FaDolly />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/40" },
    { label: "Supplier Dispatch Pending", val: summary.supplier_dispatch_pending ?? 0, icon: <FaClock />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-200 dark:border-orange-900/40" },
    { label: "Goods in Transit", val: summary.supplier_in_transit ?? 0, icon: <FaTruckLoading />, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-900/40" },
    { label: "Inward Pending", val: summary.warehouse_inward_pending ?? 0, icon: <FaBoxes />, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10 border-sky-200 dark:border-sky-900/40" },
    { label: "Partially Received", val: summary.partially_received ?? 0, icon: <FaExclamationCircle />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-200 dark:border-purple-900/40" },
    { label: "Inward Discrepancies", val: summary.inward_discrepancies ?? 0, icon: <FaExclamationTriangle />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-200 dark:border-rose-900/40" },
    { label: "Damaged / Missing Items", val: summary.damaged_missing ?? 0, icon: <FaExclamationTriangle />, color: "text-red-700 dark:text-red-400", bg: "bg-red-500/15 border-red-300 dark:border-red-900/50" },
    { label: "Inward Overdue", val: summary.inward_overdue ?? 0, icon: <FaClock />, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/15 border-amber-300 dark:border-amber-900/50" }
  ];

  const filteredItems = table.filter((row) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      (row.order_number || "").toLowerCase().includes(s) ||
      (row.supplier_name || "").toLowerCase().includes(s) ||
      (row.po_number || "").toLowerCase().includes(s) ||
      (row.sku || "").toLowerCase().includes(s) ||
      (row.product_name || "").toLowerCase().includes(s);

    const matchStatus =
      statusFilter === "all" ||
      (row.inward_status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchSearch && matchStatus;
  });

  return (
    <div className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaWarehouse className="text-primary text-xl" />
            <span>Warehouse Inward & Supplier Goods Monitoring</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Physical receiving checkpoint: Only physically received goods are added to available stock. Discrepancies and damages are flagged separately.
          </p>
        </div>

        <button
          onClick={() => navigate("/warehouse-management-panel/material-inward")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all active:scale-95 self-start sm:self-auto"
        >
          <span>Open Material Inward Station</span>
          <FaArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 9 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
        {metricCards.map((c, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.02] ${c.bg}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary line-clamp-1">
                {c.label}
              </span>
              <span className={c.color}>{c.icon}</span>
            </div>
            <div className={`text-xl font-black mt-2 leading-none ${c.color}`}>
              {c.val}
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-sm">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, supplier, SKU, PO..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-border bg-bg/50 focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["all", "Pending", "Partial", "Completed", "Discrepancy"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === st
                  ? "bg-primary text-white"
                  : "bg-bg border border-border text-text-secondary hover:text-text-primary"
                }`}
            >
              {st === "all" ? "All Inwards" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Inward Table */}
      <div className="overflow-x-auto rounded-xl border border-border max-h-96 scrollbar-hover">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-bg/80 sticky top-0 z-10 border-b border-border text-text-secondary uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Order Number</th>
              <th className="py-2.5 px-3">Supplier / OEM</th>
              <th className="py-2.5 px-3">PO Number</th>
              <th className="py-2.5 px-3">Product / SKU</th>
              <th className="py-2.5 px-3 text-center">Expected Qty</th>
              <th className="py-2.5 px-3 text-center">Received Qty</th>
              <th className="py-2.5 px-3 text-center">Short / Damaged</th>
              <th className="py-2.5 px-3">Warehouse</th>
              <th className="py-2.5 px-3">Expected Date</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-text-muted text-xs">
                  No inward records found matching filters.
                </td>
              </tr>
            ) : (
              filteredItems.slice(0, 20).map((row, idx) => {
                const isShort = row.short_damaged > 0;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-primary/5 transition-colors duration-150"
                  >
                    <td className="py-2.5 px-3 font-bold text-primary">
                      {row.order_number}
                    </td>
                    <td className="py-2.5 px-3 text-text-primary font-medium truncate max-w-[140px]">
                      {row.supplier_name}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary font-mono text-[11px]">
                      {row.po_number}
                    </td>
                    <td className="py-2.5 px-3 max-w-[160px]">
                      <div className="font-semibold text-text-primary truncate">{row.product_name}</div>
                      <div className="text-[10px] text-text-muted font-mono">{row.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-text-primary">
                      {row.expected_qty}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {row.received_qty}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isShort ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-300">
                          {row.short_damaged}
                        </span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary text-[11px]">
                      {row.warehouse}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted text-[11px] whitespace-nowrap">
                      {row.expected_inward_date
                        ? new Date(row.expected_inward_date).toLocaleDateString()
                        : "TBD"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${row.inward_status === "Completed"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-300"
                            : row.inward_status === "Partial"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300"
                              : row.inward_status === "Discrepancy"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-300"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-300"
                          }`}
                      >
                        {row.inward_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (onReceiveGoods) onReceiveGoods(row);
                          else navigate("/warehouse-management-panel/material-inward");
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        {row.inward_status === "Completed" ? "View Inward" : "Receive Goods"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

