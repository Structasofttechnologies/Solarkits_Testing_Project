import React, { useState } from "react";
import {
  FaTools,
  FaBoxes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaHourglassHalf,
  FaArrowRight,
  FaBarcode,
  FaLayerGroup,
  FaChevronDown,
  FaChevronUp,
  FaSearch
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function KitPreparationSection({
  data = {},
  onSelectOrder,
  onAllocateStock,
  onStartAssembly
}) {
  const navigate = useNavigate();
  const summary = data.summary || {};
  const records = data.records || [];

  const [expandedOrder, setExpandedOrder] = useState(null);
  const [search, setSearch] = useState("");

  const metricCards = [
    { label: "Awaiting Allocation", val: summary.awaiting_stock_allocation ?? 0, icon: <FaHourglassHalf />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/40" },
    { label: "Kits in Preparation", val: summary.in_preparation ?? 0, icon: <FaTools />, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10 border-cyan-200 dark:border-cyan-900/40" },
    { label: "Ready for Dispatch", val: summary.ready_for_dispatch ?? 0, icon: <FaCheckCircle />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-200 dark:border-blue-900/40" },
    { label: "Awaiting Components", val: summary.awaiting_missing_components ?? 0, icon: <FaExclamationTriangle />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-200 dark:border-rose-900/40" },
    { label: "Inventory Shortage", val: summary.inventory_shortage ?? 0, icon: <FaBoxes />, color: "text-red-700 dark:text-red-400", bg: "bg-red-500/15 border-red-300 dark:border-red-900/50" },
    { label: "Preparation Overdue", val: summary.preparation_overdue ?? 0, icon: <FaClock />, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/15 border-amber-300 dark:border-amber-900/50" }
  ];

  const filteredRecords = records.filter((r) => {
    const s = search.toLowerCase();
    return (
      !s ||
      (r.order_number || "").toLowerCase().includes(s) ||
      (r.customer_name || "").toLowerCase().includes(s) ||
      (r.kit_type || "").toLowerCase().includes(s)
    );
  });

  const toggleExpand = (ordNo) => {
    setExpandedOrder((prev) => (prev === ordNo ? null : ordNo));
  };

  return (
    <div className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaTools className="text-primary text-xl" />
            <span>Kit Preparation & Inventory Allocation (BOSKIT / ComboKit)</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Assembly & staging workstation: Match required BOM items with warehouse inventory, track component picking, verify QC, and stage kits for dispatch.
          </p>
        </div>

        <button
          onClick={() => navigate("/warehouse-management-panel/bos-kit-assembly")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all active:scale-95 self-start sm:self-auto"
        >
          <span>Open Assembly Workstation</span>
          <FaArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map((c, i) => (
          <div
            key={i}
            className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.02] ${c.bg}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary line-clamp-1">
                {c.label}
              </span>
              <span className={c.color}>{c.icon}</span>
            </div>
            <div className={`text-2xl font-black mt-2 leading-none ${c.color}`}>
              {c.val}
            </div>
          </div>
        ))}
      </div>

      {/* Search Input */}
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search kit orders, customer, kit model..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-border bg-bg/50 focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
          />
        </div>
      </div>

      {/* Kit Assembly Records */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs border border-dashed rounded-xl">
            No kit preparation records found.
          </div>
        ) : (
          filteredRecords.map((kit) => {
            const isExpanded = expandedOrder === kit.order_number;
            const hasShortage = kit.missing_quantity_total > 0;
            const isReady = kit.preparation_status === "kit_ready";

            return (
              <div
                key={kit.order_number}
                className="border border-border rounded-xl bg-bg/30 hover:border-primary/40 transition-all overflow-hidden"
              >
                {/* Order Summary Strip */}
                <div
                  onClick={() => toggleExpand(kit.order_number)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-bg/50"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <button
                      className="p-1 rounded text-text-secondary hover:text-text-primary mt-0.5 sm:mt-0"
                      title={isExpanded ? "Collapse BOM" : "View BOM Breakdown"}
                    >
                      {isExpanded ? <FaChevronUp className="w-3.5 h-3.5" /> : <FaChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-primary">{kit.order_number}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                          {kit.kit_quantity} Sets ({kit.system_capacity})
                        </span>
                        {kit.barcode && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-300">
                            <FaBarcode className="w-3 h-3" />
                            {kit.barcode}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        <span className="font-semibold text-text-primary">{kit.customer_name}</span> • Model: {kit.kit_type}
                      </div>
                    </div>
                  </div>

                  {/* Badges and Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {hasShortage ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 border border-rose-300 flex items-center gap-1">
                        <FaExclamationTriangle className="w-3 h-3" />
                        Shortage: {kit.missing_quantity_total} Pcs
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 border border-emerald-300 flex items-center gap-1">
                        <FaCheckCircle className="w-3 h-3" />
                        100% Stock Allocated
                      </span>
                    )}

                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                        isReady
                          ? "bg-blue-600 text-white"
                          : kit.preparation_status === "in_assembly"
                          ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-300"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300"
                      }`}
                    >
                      {kit.preparation_status.replace(/_/g, " ")}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/warehouse-management-panel/bos-kit-assembly");
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all"
                    >
                      Manage Kit
                    </button>
                  </div>
                </div>

                {/* Expanded BOM Component List */}
                {isExpanded && (
                  <div className="p-4 border-t border-border bg-bg/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <FaLayerGroup className="text-primary" />
                        BOM Component Reservation & Warehouse Match
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Assigned: <strong className="text-text-primary">{kit.assigned_team}</strong>
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-border/80">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-bg text-text-secondary text-[10px] uppercase font-bold tracking-wider border-b border-border">
                          <tr>
                            <th className="py-2 px-3">SKU & Component</th>
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-3 text-center">Required Qty</th>
                            <th className="py-2 px-3 text-center">Available Stock</th>
                            <th className="py-2 px-3 text-center">Reserved Stock</th>
                            <th className="py-2 px-3 text-center">Missing Qty</th>
                            <th className="py-2 px-3 text-center">QC Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {kit.bom_items.map((b, bi) => (
                            <tr key={bi} className="hover:bg-primary/5">
                              <td className="py-2 px-3">
                                <div className="font-semibold text-text-primary">{b.product_name}</div>
                                <div className="text-[10px] text-text-muted font-mono">{b.sku}</div>
                              </td>
                              <td className="py-2 px-3 text-text-secondary">{b.category || "BOS"}</td>
                              <td className="py-2 px-3 text-center font-bold text-text-primary">{b.required_qty}</td>
                              <td className="py-2 px-3 text-center text-text-primary font-semibold">{b.available_stock}</td>
                              <td className="py-2 px-3 text-center text-emerald-600 font-bold">{b.reserved_stock}</td>
                              <td className="py-2 px-3 text-center">
                                {b.missing_qty > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-300">
                                    {b.missing_qty}
                                  </span>
                                ) : (
                                  <span className="text-text-muted">0</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                  {b.qc_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

