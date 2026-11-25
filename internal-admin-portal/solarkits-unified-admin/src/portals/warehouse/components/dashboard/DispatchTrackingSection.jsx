import React, { useState } from "react";
import {
  FaShippingFast,
  FaTruck,
  FaCalendarCheck,
  FaClock,
  FaExclamationTriangle,
  FaFileInvoice,
  FaCheckCircle,
  FaArrowRight,
  FaSearch,
  FaPhoneAlt,
  FaUser
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function DispatchTrackingSection({
  data = {},
  onSelectOrder,
  onTrackOrder
}) {
  const navigate = useNavigate();
  const summary = data.summary || {};
  const table = data.table || [];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const metricCards = [
    { label: "Ready for Dispatch", val: summary.ready_for_dispatch ?? 0, icon: <FaBoxesIcon />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-200 dark:border-blue-900/40" },
    { label: "Dispatched Today", val: summary.dispatched_today ?? 0, icon: <FaShippingFast />, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-900/40" },
    { label: "In Transit", val: summary.in_transit ?? 0, icon: <FaTruck />, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10 border-cyan-200 dark:border-cyan-900/40" },
    { label: "Delivery Due Today", val: summary.delivery_due_today ?? 0, icon: <FaCalendarCheck />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/40" },
    { label: "Delivery Overdue", val: summary.delivery_overdue ?? 0, icon: <FaClock />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-200 dark:border-rose-900/40" },
    { label: "Delivery Failed", val: summary.delivery_attempted_failed ?? 0, icon: <FaExclamationTriangle />, color: "text-red-700 dark:text-red-400", bg: "bg-red-500/15 border-red-300 dark:border-red-900/50" },
    { label: "POD Pending", val: summary.pod_pending ?? 0, icon: <FaFileInvoice />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-200 dark:border-orange-900/40" },
    { label: "Delivered Today", val: summary.delivered_today ?? 0, icon: <FaCheckCircle />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/40" }
  ];

  function FaBoxesIcon() {
    return <FaTruck className="w-4 h-4" />;
  }

  const filteredItems = table.filter((row) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      (row.order_number || "").toLowerCase().includes(s) ||
      (row.customer_name || "").toLowerCase().includes(s) ||
      (row.vehicle_number || "").toLowerCase().includes(s) ||
      (row.transporter_name || "").toLowerCase().includes(s) ||
      (row.driver_name || "").toLowerCase().includes(s);

    const matchFilter =
      filter === "all" ||
      (filter === "in_transit" && row.current_status === "in_transit") ||
      (filter === "delivered" && row.current_status === "delivered") ||
      (filter === "delayed" && row.is_delayed) ||
      (filter === "pod_pending" && row.pod_status === "Pending");

    return matchSearch && matchFilter;
  });

  return (
    <div className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaShippingFast className="text-primary text-xl" />
            <span>Dispatch & Delivery Tracking</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Active fleet movement, gate clearances, milestone logging, destination confirmation, and dual POD verification (Destination Photo / Customer 6-Digit OTP).
          </p>
        </div>

        <button
          onClick={() => navigate("/warehouse-management-panel/track-delivery")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all active:scale-95 self-start sm:self-auto"
        >
          <span>Open Track Delivery Hub</span>
          <FaArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 8 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
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
            placeholder="Search order #, customer, vehicle, driver..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-border bg-bg/50 focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Active Deliveries" },
            { id: "in_transit", label: "In Transit" },
            { id: "delayed", label: "Delayed ETA" },
            { id: "pod_pending", label: "POD Pending" },
            { id: "delivered", label: "Delivered" }
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

      {/* Delivery Tracking Table */}
      <div className="overflow-x-auto rounded-xl border border-border max-h-96 scrollbar-hover">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-bg/80 sticky top-0 z-10 border-b border-border text-text-secondary uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Order Number</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Destination</th>
              <th className="py-2.5 px-3">Vehicle & Driver</th>
              <th className="py-2.5 px-3">Transport Provider</th>
              <th className="py-2.5 px-3">Dispatch Date</th>
              <th className="py-2.5 px-3">Expected ETA</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Delay SLA</th>
              <th className="py-2.5 px-3 text-center">Dual POD</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-text-muted text-xs">
                  No tracking records found matching filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((row, idx) => {
                const isTransit = row.current_status === "in_transit";
                const isDelivered = row.current_status === "delivered";

                return (
                  <tr
                    key={idx}
                    className="hover:bg-primary/5 transition-colors duration-150"
                  >
                    <td className="py-2.5 px-3 font-bold text-primary">
                      {row.order_number}
                    </td>
                    <td className="py-2.5 px-3 max-w-[140px]">
                      <div className="font-semibold text-text-primary truncate">{row.customer_name}</div>
                      <div className="text-[10px] text-text-muted">{row.customer_phone}</div>
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary truncate max-w-[140px]">
                      {row.destination}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-text-primary font-mono text-[11px]">{row.vehicle_number}</div>
                      <div className="text-[10px] text-text-muted flex items-center gap-1">
                        <FaUser className="w-2.5 h-2.5" />
                        <span>{row.driver_name}</span>
                        {row.driver_mobile && (
                          <a
                            href={`tel:${row.driver_mobile}`}
                            className="text-primary hover:underline ml-1 inline-flex items-center gap-0.5"
                          >
                            <FaPhoneAlt className="w-2 h-2" />
                            {row.driver_mobile}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary truncate max-w-[130px]">
                      {row.transporter_name}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted text-[11px] whitespace-nowrap">
                      {row.dispatch_date
                        ? new Date(row.dispatch_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : "Pending Gate"}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted text-[11px] whitespace-nowrap">
                      {row.expected_delivery
                        ? new Date(row.expected_delivery).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : "TBD"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          isDelivered
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-300"
                            : isTransit
                            ? "bg-cyan-500/15 text-cyan-600 border border-cyan-300"
                            : "bg-blue-500/15 text-blue-600 border border-blue-300"
                        }`}
                      >
                        {row.current_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.is_delayed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 border border-rose-300">
                          Delayed ({row.delay_days}d)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600">
                          On Time
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.pod_status === "Uploaded"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-300"
                            : "bg-amber-500/15 text-amber-600 border border-amber-300"
                        }`}
                      >
                        {row.pod_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate("/warehouse-management-panel/track-delivery")}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        Track / POD
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

