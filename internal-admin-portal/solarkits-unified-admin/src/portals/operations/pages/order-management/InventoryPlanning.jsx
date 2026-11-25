import { useState } from "react";
import { MdEngineering } from "react-icons/md";
import {
  FaSearch, FaFilter, FaPlus, FaDownload, FaEdit,
  FaExclamationTriangle, FaCheckCircle, FaSyncAlt, FaTags,
} from "react-icons/fa";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";

const mockInventory = [
  { id: "SKU-001", name: "Solar Panel 540W Mono", category: "Panels", currentStock: 320, reorderPoint: 100, maxCapacity: 600, forecastDemand: 280, leadDays: 14, status: "Healthy" },
  { id: "SKU-002", name: "Inverter 5kW Hybrid", category: "Inverter", currentStock: 28, reorderPoint: 30, maxCapacity: 100, forecastDemand: 40, leadDays: 21, status: "Reorder" },
  { id: "SKU-003", name: "DC Cable 6mm²", category: "Wiring", currentStock: 0, reorderPoint: 500, maxCapacity: 3000, forecastDemand: 800, leadDays: 7, status: "Critical" },
  { id: "SKU-004", name: "Battery 150Ah Li", category: "Battery", currentStock: 10, reorderPoint: 15, maxCapacity: 50, forecastDemand: 18, leadDays: 30, status: "Reorder" },
  { id: "SKU-005", name: "Mounting L-Frame", category: "Structure", currentStock: 800, reorderPoint: 200, maxCapacity: 1500, forecastDemand: 600, leadDays: 10, status: "Healthy" },
  { id: "SKU-006", name: "AC Distribution Box", category: "Electrical", currentStock: 65, reorderPoint: 20, maxCapacity: 120, forecastDemand: 55, leadDays: 12, status: "Healthy" },
];

const statusConfig = {
  Healthy: { color: "bg-success/10 text-success", dot: "bg-success" },
  Reorder: { color: "bg-warning/10 text-warning", dot: "bg-warning" },
  Critical: { color: "bg-danger/10 text-danger", dot: "bg-danger" },
};

export default function InventoryPlanning() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = mockInventory.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || item.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="Inventory Planning"
        subtitle="Forecast demand, monitor stock levels and plan reorder cycles with precision."
        icon={MdEngineering}
        stats={[
          { label: "Total SKUs", value: "1,830", description: "Across all categories" },
          { label: "Reorder Needed", value: "18", description: "Below reorder point" },
          { label: "Critical", value: "5", description: "Out of stock" },
          { label: "Forecast Accuracy", value: "94%", description: "30-day avg" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<FaDownload size={12} />}>Export Plan</Button>
            <Button variant="primary" size="sm" leftIcon={<FaSyncAlt size={12} />}>Refresh Forecast</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total SKUs", value: "1,830", icon: FaTags, color: "text-primary", bg: "gradient-primary-soft" },
          { label: "Reorder Needed", value: "18", icon: FaExclamationTriangle, color: "text-warning", bg: "gradient-warning-soft" },
          { label: "Critical Items", value: "5", icon: FaExclamationTriangle, color: "text-danger", bg: "gradient-danger-soft" },
          { label: "Healthy Items", value: "1,807", icon: FaCheckCircle, color: "text-success", bg: "gradient-success-soft" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4 flex items-center gap-4">
              <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`${s.color} text-lg`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{s.value}</p>
                <p className="text-text-secondary text-xs">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alerts for non-healthy items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {mockInventory.filter(i => i.status !== "Healthy").map((item) => {
          const sc = statusConfig[item.status];
          const fillPct = Math.min((item.currentStock / item.reorderPoint) * 100, 100);
          return (
            <div key={item.id} className={`card p-4 border-l-4 ${item.status === "Critical" ? "border-l-danger" : "border-l-warning"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-text-primary text-sm">{item.name}</p>
                  <p className="text-text-muted text-xs mt-0.5">{item.id} · Lead: {item.leadDays}d</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>{item.status}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>Stock: <strong className="text-text-primary">{item.currentStock}</strong></span>
                  <span>Reorder: <strong className="text-warning">{item.reorderPoint}</strong></span>
                  <span>Forecast: <strong className="text-primary">{item.forecastDemand}</strong></span>
                </div>
                <div className="w-full bg-bg rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full ${sc.dot}`} style={{ width: `${fillPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 flex-1 min-w-[200px]">
            <FaSearch className="text-text-muted" size={14} />
            <input
              className="bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none w-full"
              placeholder="Search SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="text-text-muted" size={13} />
            {["All", "Healthy", "Reorder", "Critical"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${filter === f ? "gradient-primary text-white shadow-sm" : "bg-bg text-text-secondary border border-border hover:border-primary/30"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["SKU / Name", "Category", "Current Stock", "Reorder Point", "Forecast (30d)", "Lead Days", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => {
                const sc = statusConfig[item.status];
                const fillPct = Math.min((item.currentStock / item.maxCapacity) * 100, 100);
                return (
                  <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text-primary text-sm">{item.name}</div>
                      <div className="text-text-muted text-xs">{item.id}</div>
                    </td>
                    <td className="px-4 py-3.5"><span className="text-xs text-text-secondary bg-bg border border-border px-2 py-0.5 rounded-full">{item.category}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-bold text-text-primary">{item.currentStock}</div>
                      <div className="w-20 h-1.5 bg-bg rounded-full mt-1 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${sc.dot}`} style={{ width: `${fillPct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-warning font-medium">{item.reorderPoint}</td>
                    <td className="px-4 py-3.5 text-sm text-primary font-medium">{item.forecastDemand}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{item.leadDays}d</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-text-muted text-xs">Showing {filtered.length} of {mockInventory.length} items</p>
        </div>
      </div>
    </div>
  );
}
