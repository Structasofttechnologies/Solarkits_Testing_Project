import React, { useState } from "react";
import {
  FaTools,
  FaSyncAlt,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaArrowRight,
  FaSearch,
  FaTicketAlt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function ServiceTicketsSection({
  data = {},
  onSelectTicket
}) {
  const navigate = useNavigate();
  const summary = data.summary || {};
  const table = data.table || [];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const metricCards = [
    { label: "New Tickets", val: summary.new_service_tickets ?? 0, icon: <FaTicketAlt />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-200 dark:border-blue-900/40" },
    { label: "Open Service Tickets", val: summary.open_service_tickets ?? 0, icon: <FaTools />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/40" },
    { label: "Replacement Requests", val: summary.replacement_requests ?? 0, icon: <FaSyncAlt />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-200 dark:border-purple-900/40" },
    { label: "Return Pickup Pending", val: summary.return_pickup_pending ?? 0, icon: <FaExchangeAlt />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-200 dark:border-orange-900/40" },
    { label: "Replacement Dispatch", val: summary.replacement_dispatch_pending ?? 0, icon: <FaShippingFastIcon />, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10 border-cyan-200 dark:border-cyan-900/40" },
    { label: "Service Overdue", val: summary.service_overdue ?? 0, icon: <FaClock />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-200 dark:border-rose-900/40" },
    { label: "Resolved Tickets", val: summary.resolved_tickets ?? 0, icon: <FaCheckCircle />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/40" }
  ];

  function FaShippingFastIcon() {
    return <FaSyncAlt className="w-4 h-4" />;
  }

  const filteredItems = table.filter((row) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      (row.ticket_number || "").toLowerCase().includes(s) ||
      (row.order_number || "").toLowerCase().includes(s) ||
      (row.customer_name || "").toLowerCase().includes(s) ||
      (row.product_name || "").toLowerCase().includes(s) ||
      (row.issue || "").toLowerCase().includes(s);

    const matchFilter =
      filter === "all" ||
      (filter === "replacement" && row.ticket_type.toLowerCase() === "replacement") ||
      (filter === "service" && row.ticket_type.toLowerCase() === "service") ||
      (filter === "return" && row.ticket_type.toLowerCase() === "return") ||
      (filter === "overdue" && row.is_overdue);

    return matchSearch && matchFilter;
  });

  return (
    <div className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaTools className="text-primary text-xl" />
            <span>Service, Returns & Replacement Tickets</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            After-sales support, reverse logistics, return inward inspection, replacement staging, and warranty claim tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => navigate("/warehouse-management-panel/repair-tickets")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <span>Service Tickets</span>
          </button>
          <button
            onClick={() => navigate("/warehouse-management-panel/product-replacement")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover transition-all shadow-sm"
          >
            <span>Replacements</span>
            <FaArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 7 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
            <div className={`text-2xl font-black mt-2 leading-none ${c.color}`}>
              {c.val}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-sm">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket #, order #, component, fault..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-border bg-bg/50 focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Tickets" },
            { id: "replacement", label: "Replacements" },
            { id: "service", label: "Service / Repair" },
            { id: "return", label: "Returns" },
            { id: "overdue", label: "Overdue SLA" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? "bg-primary text-white"
                  : "bg-bg border border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto rounded-xl border border-border max-h-96 scrollbar-hover">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-bg/80 sticky top-0 z-10 border-b border-border text-text-secondary uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Ticket Number</th>
              <th className="py-2.5 px-3">Linked Order</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Product / SKU</th>
              <th className="py-2.5 px-3">Reported Issue</th>
              <th className="py-2.5 px-3">Assigned To</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3">Due Date</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-text-muted text-xs">
                  No service or replacement tickets found matching filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((row, idx) => {
                const isOverdue = row.is_overdue;

                return (
                  <tr
                    key={idx}
                    className="hover:bg-primary/5 transition-colors duration-150"
                  >
                    <td className="py-2.5 px-3 font-bold text-primary font-mono">
                      {row.ticket_number}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary font-mono text-[11px]">
                      {row.order_number}
                    </td>
                    <td className="py-2.5 px-3 text-text-primary font-medium truncate max-w-[130px]">
                      {row.customer_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-bg border border-border">
                        {row.ticket_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-[140px] truncate text-text-primary font-semibold">
                      {row.product_name}
                    </td>
                    <td className="py-2.5 px-3 max-w-[180px] truncate text-text-secondary text-[11px]">
                      {row.issue}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary truncate max-w-[120px]">
                      {row.assigned_to}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          ['resolved', 'closed'].includes(row.status)
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-300"
                            : ['replacement_approved', 'replacement_dispatched'].includes(row.status)
                            ? "bg-purple-500/15 text-purple-600 border border-purple-300"
                            : "bg-amber-500/15 text-amber-600 border border-amber-300"
                        }`}
                      >
                        {row.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                      {row.due_date ? (
                        <span className={isOverdue ? "text-rose-600 font-bold" : "text-text-muted"}>
                          {new Date(row.due_date).toLocaleDateString()}
                          {isOverdue && " (Overdue)"}
                        </span>
                      ) : (
                        <span className="text-text-muted">Standard SLA</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (row.ticket_type.toLowerCase() === "replacement") {
                            navigate("/warehouse-management-panel/product-replacement");
                          } else {
                            navigate("/warehouse-management-panel/repair-tickets");
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        Process Ticket
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

