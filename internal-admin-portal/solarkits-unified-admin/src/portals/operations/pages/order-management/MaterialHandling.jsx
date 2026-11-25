import { useState } from "react";
import { HiCube } from "react-icons/hi";
import {
  FaBoxes, FaArrowRight, FaSearch, FaFilter,
  FaCheckCircle, FaExclamationCircle, FaClock, FaPlus,
  FaDownload, FaEdit, FaTrash, FaWarehouse
} from "react-icons/fa";
import { MdLocalShipping } from "react-icons/md";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";

const mockMaterials = [
  { id: "MAT-001", name: "Solar Panel 540W Mono", sku: "SP-540M", category: "Panels", stock: 320, reserved: 80, available: 240, unit: "pcs", status: "In Stock", location: "WH-A1" },
  { id: "MAT-002", name: "Mounting Structure L-Frame", sku: "MS-LFR", category: "Structure", stock: 1200, reserved: 400, available: 800, unit: "pcs", status: "In Stock", location: "WH-B2" },
  { id: "MAT-003", name: "Inverter 5kW Hybrid", sku: "INV-5KH", category: "Inverter", stock: 48, reserved: 20, available: 28, unit: "pcs", status: "Low Stock", location: "WH-A3" },
  { id: "MAT-004", name: "DC Cable 6mm²", sku: "DC-6MM", category: "Wiring", stock: 0, reserved: 0, available: 0, unit: "mtr", status: "Out of Stock", location: "WH-C1" },
  { id: "MAT-005", name: "AC Distribution Box", sku: "ADB-32A", category: "Electrical", stock: 75, reserved: 10, available: 65, unit: "pcs", status: "In Stock", location: "WH-B1" },
  { id: "MAT-006", name: "Battery 150Ah Lithium", sku: "BAT-150L", category: "Battery", stock: 22, reserved: 12, available: 10, unit: "pcs", status: "Low Stock", location: "WH-A2" },
  { id: "MAT-007", name: "Earthing Kit Complete", sku: "EK-SET", category: "Safety", stock: 180, reserved: 30, available: 150, unit: "set", status: "In Stock", location: "WH-C2" },
  { id: "MAT-008", name: "MC4 Connector Pair", sku: "MC4-PR", category: "Connectors", stock: 5000, reserved: 800, available: 4200, unit: "pairs", status: "In Stock", location: "WH-C3" },
];

const statusConfig = {
  "In Stock": { color: "bg-success/10 text-success", dot: "bg-success" },
  "Low Stock": { color: "bg-warning/10 text-warning", dot: "bg-warning" },
  "Out of Stock": { color: "bg-danger/10 text-danger", dot: "bg-danger" },
};

const summaryStats = [
  { label: "Total Materials", value: "412", icon: FaBoxes, color: "text-primary" },
  { label: "Low Stock Alerts", value: "18", icon: FaExclamationCircle, color: "text-warning" },
  { label: "Out of Stock", value: "5", icon: FaTrash, color: "text-danger" },
  { label: "Warehouses", value: "6", icon: FaWarehouse, color: "text-success" },
];

export default function MaterialHandling() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = mockMaterials.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || m.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Material Handling"
        subtitle="Track and manage all raw materials and components across your supply chain."
        icon={HiCube}
        stats={[
          { label: "Total Materials", value: "412", description: "Active SKUs" },
          { label: "Low Stock", value: "18", description: "Needs attention" },
          { label: "Out of Stock", value: "5", description: "Reorder now" },
          { label: "Warehouses", value: "6", description: "Active locations" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<FaDownload size={12} />}>Export</Button>
            <Button variant="primary" size="sm" leftIcon={<FaPlus size={12} />}>Add Material</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4 flex items-center gap-4">
              <div className="w-11 h-11 gradient-primary-soft rounded-xl flex items-center justify-center shrink-0">
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

      {/* Filters + Table */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 flex-1 min-w-[200px]">
            <FaSearch className="text-text-muted" size={14} />
            <input
              className="bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none w-full"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="text-text-muted" size={13} />
            {["All", "In Stock", "Low Stock", "Out of Stock"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  filter === f
                    ? "gradient-primary text-white shadow-sm"
                    : "bg-bg text-text-secondary border border-border hover:border-primary/30"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">Material</th>
                <th className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">Category</th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">Total Stock</th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">Reserved</th>
                <th className="text-right px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">Available</th>
                <th className="text-center px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">Location</th>
                <th className="text-center px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((mat) => {
                const sc = statusConfig[mat.status];
                return (
                  <tr key={mat.id} className="hover:bg-surface-hover transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-text-primary text-sm">{mat.name}</div>
                      <div className="text-text-muted text-xs mt-0.5">{mat.sku} · {mat.id}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-text-secondary bg-bg border border-border px-2 py-0.5 rounded-full">{mat.category}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-text-primary text-sm font-semibold">{mat.stock.toLocaleString()} <span className="text-text-muted font-normal text-xs">{mat.unit}</span></td>
                    <td className="px-4 py-3.5 text-right text-warning text-sm font-medium">{mat.reserved.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-success text-sm font-bold">{mat.available.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xs bg-bg border border-border px-2 py-0.5 rounded-full text-text-secondary">{mat.location}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {mat.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center">
                          <FaEdit size={11} />
                        </button>
                        <button className="w-7 h-7 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all flex items-center justify-center">
                          <FaTrash size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-muted">
                    <FaBoxes className="mx-auto mb-2 opacity-30 text-3xl" />
                    <p className="text-sm">No materials found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-text-muted text-xs">Showing {filtered.length} of {mockMaterials.length} materials</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-lg text-xs border border-border text-text-secondary hover:bg-surface-hover">Previous</button>
            <button className="px-3 py-1.5 rounded-lg text-xs gradient-primary text-white">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
