import React, { useState } from "react";
import {
  FaTruck,
  FaFileInvoiceDollar,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaWeightHanging,
  FaArrowRight,
  FaSearch,
  FaShieldAlt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function VehicleBookingSection({
  data = {},
  onSelectOrder,
  onBookVehicle
}) {
  const navigate = useNavigate();
  const summary = data.summary || {};
  const table = data.table || [];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const metricCards = [
    { label: "Booking Pending", val: summary.booking_pending ?? 0, icon: <FaClock />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/40" },
    { label: "Approval Pending", val: summary.delivery_charge_approval_pending ?? 0, icon: <FaFileInvoiceDollar />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-200 dark:border-orange-900/40" },
    { label: "Vehicle Booked", val: summary.vehicle_booked ?? 0, icon: <FaCheckCircle />, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10 border-teal-200 dark:border-teal-900/40" },
    { label: "Dispatch Pending", val: summary.dispatch_pending ?? 0, icon: <FaTruck />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-200 dark:border-blue-900/40" },
    { label: "Capacity Issues", val: summary.vehicle_capacity_issue ?? 0, icon: <FaWeightHanging />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-200 dark:border-purple-900/40" },
    { label: "Exceeds Benchmark", val: summary.delivery_cost_exceeding_benchmark ?? 0, icon: <FaExclamationTriangle />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-200 dark:border-rose-900/40" },
    { label: "Booking Overdue", val: summary.vehicle_booking_overdue ?? 0, icon: <FaClock />, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/15 border-amber-300 dark:border-amber-900/50" }
  ];

  const filteredItems = table.filter((row) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      (row.order_number || "").toLowerCase().includes(s) ||
      (row.destination || "").toLowerCase().includes(s) ||
      (row.vehicle_type || "").toLowerCase().includes(s) ||
      (row.vehicle_number || "").toLowerCase().includes(s);

    const matchFilter =
      filter === "all" ||
      (filter === "exceeded" && row.cost_exceeded) ||
      (filter === "pending" && row.booking_status === "Pending") ||
      (filter === "booked" && row.booking_status === "Booked") ||
      (filter === "approval" && row.admin_approval === "Pending");

    return matchSearch && matchFilter;
  });

  return (
    <div className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaTruck className="text-primary text-xl" />
            <span>Vehicle Booking & Delivery Charge Approval</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Transport arrangement & benchmark guard: If the delivery charge exceeds the configured district benchmark cost, Admin approval is strictly required before vehicle dispatch.
          </p>
        </div>

        <button
          onClick={() => navigate("/warehouse-management-panel/out-for-delivery")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all active:scale-95 self-start sm:self-auto"
        >
          <span>Open Dispatch Station</span>
          <FaArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* 7 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-sm">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, destination, vehicle..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-border bg-bg/50 focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Vehicles" },
            { id: "pending", label: "Booking Pending" },
            { id: "exceeded", label: "Cost > Benchmark" },
            { id: "approval", label: "Approval Required" },
            { id: "booked", label: "Booked" }
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

      {/* Vehicle Booking Table */}
      <div className="overflow-x-auto rounded-xl border border-border max-h-96 scrollbar-hover">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-bg/80 sticky top-0 z-10 border-b border-border text-text-secondary uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Order Number</th>
              <th className="py-2.5 px-3">Destination</th>
              <th className="py-2.5 px-3 text-center">Kit Qty & Weight</th>
              <th className="py-2.5 px-3">Delivery Method</th>
              <th className="py-2.5 px-3">Vehicle Type & Reg</th>
              <th className="py-2.5 px-3 text-right">Delivery Charge</th>
              <th className="py-2.5 px-3 text-right">Benchmark Cost</th>
              <th className="py-2.5 px-3 text-center">Admin Approval</th>
              <th className="py-2.5 px-3 text-center">Booking Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-text-muted text-xs">
                  No vehicle booking records found matching filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((row, idx) => {
                const isExceeded = row.cost_exceeded;
                const isBooked = row.booking_status === "Booked";

                return (
                  <tr
                    key={idx}
                    className="hover:bg-primary/5 transition-colors duration-150"
                  >
                    <td className="py-2.5 px-3 font-bold text-primary">
                      {row.order_number}
                    </td>
                    <td className="py-2.5 px-3 max-w-[150px]">
                      <div className="font-semibold text-text-primary truncate">{row.destination}</div>
                      <div className="text-[10px] text-text-muted truncate">{row.address}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="font-bold text-text-primary">{row.kit_quantity} Sets</div>
                      <div className="text-[10px] text-text-muted">{row.total_weight_kg} kg</div>
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary text-[11px]">
                      {row.delivery_method}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-text-primary">{row.vehicle_type}</div>
                      <div className="text-[10px] font-mono text-text-muted">{row.vehicle_number}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-text-primary">
                      ₹{row.delivery_charge.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                      ₹{row.benchmark.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isExceeded ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            row.admin_approval === "Approved"
                              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-300"
                              : "bg-rose-500/15 text-rose-600 border border-rose-300"
                          }`}
                        >
                          <FaShieldAlt className="w-2.5 h-2.5" />
                          {row.admin_approval}
                        </span>
                      ) : (
                        <span className="text-text-muted text-[10px]">Not Required</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          isBooked
                            ? "bg-teal-500/15 text-teal-600 border border-teal-300"
                            : "bg-amber-500/15 text-amber-600 border border-amber-300"
                        }`}
                      >
                        {row.booking_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate("/warehouse-management-panel/out-for-delivery")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          isBooked
                            ? "bg-bg border border-border text-text-primary hover:bg-border/30"
                            : "bg-primary text-white hover:bg-primary-hover shadow-sm"
                        }`}
                      >
                        {isBooked ? "View Details" : "Book Vehicle"}
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

