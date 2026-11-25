import { useState } from "react";
import { MdWarehouse } from "react-icons/md";
import {
  FaSearch, FaFilter, FaPlus, FaDownload, FaEdit,
  FaBoxes, FaCheckCircle, FaExclamationTriangle,
  FaWarehouse, FaMapMarkerAlt, FaTruck,
} from "react-icons/fa";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";

const mockWarehouses = [
  { id: "WH-A", name: "Mumbai Central WH", location: "Mumbai, MH", zones: 6, totalCapacity: 5000, usedCapacity: 4200, inbound: 42, outbound: 38, manager: "Vikram Pillai", status: "Healthy" },
  { id: "WH-B", name: "Delhi North WH", location: "Delhi, DL", zones: 4, totalCapacity: 3500, usedCapacity: 3480, inbound: 20, outbound: 15, manager: "Ritu Kapoor", status: "Near Full" },
  { id: "WH-C", name: "Chennai Hub WH", location: "Chennai, TN", zones: 5, totalCapacity: 4000, usedCapacity: 2800, inbound: 55, outbound: 62, manager: "Arjun Kumar", status: "Healthy" },
  { id: "WH-D", name: "Bengaluru East WH", location: "Bengaluru, KA", zones: 3, totalCapacity: 2500, usedCapacity: 900, inbound: 12, outbound: 8, manager: "Sneha Rao", status: "Underutilized" },
  { id: "WH-E", name: "Kolkata WH", location: "Kolkata, WB", zones: 4, totalCapacity: 3000, usedCapacity: 2100, inbound: 30, outbound: 28, manager: "Debashish Paul", status: "Healthy" },
  { id: "WH-F", name: "Hyderabad WH", location: "Hyderabad, TS", zones: 3, totalCapacity: 2000, usedCapacity: 1800, inbound: 18, outbound: 20, manager: "Kavitha Reddy", status: "Near Full" },
];

const mockOperations = [
  { id: "OP-001", type: "Inbound", ref: "PO-2041", wh: "WH-A", items: 120, status: "Receiving", time: "09:15 AM" },
  { id: "OP-002", type: "Outbound", ref: "SH-0093", wh: "WH-C", items: 45, status: "Packing", time: "10:30 AM" },
  { id: "OP-003", type: "Transfer", ref: "TR-0018", wh: "WH-B → WH-C", items: 80, status: "In Transit", time: "11:00 AM" },
  { id: "OP-004", type: "Putaway", ref: "PO-2043", wh: "WH-E", items: 60, status: "Completed", time: "08:45 AM" },
  { id: "OP-005", type: "Outbound", ref: "SH-0094", wh: "WH-A", items: 220, status: "Ready", time: "01:00 PM" },
];

const statusConfig = {
  Healthy: { color: "bg-success/10 text-success", dot: "bg-success", barColor: "bg-success" },
  "Near Full": { color: "bg-warning/10 text-warning", dot: "bg-warning", barColor: "bg-warning" },
  Underutilized: { color: "bg-primary/10 text-primary", dot: "bg-primary", barColor: "bg-primary" },
};

const opStatusConfig = {
  Receiving: "bg-primary/10 text-primary",
  Packing: "bg-warning/10 text-warning",
  "In Transit": "bg-blue-500/10 text-blue-500",
  Completed: "bg-success/10 text-success",
  Ready: "bg-purple-500/10 text-purple-500",
};

export default function WarehouseOperations() {
  const [whFilter, setWhFilter] = useState("All");

  const filteredWH = whFilter === "All" ? mockWarehouses : mockWarehouses.filter(w => w.status === whFilter);

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="Warehouse Operations"
        subtitle="Control zones, monitor capacity, and manage inbound/outbound operations across all warehouses."
        icon={MdWarehouse}
        stats={[
          { label: "Total Warehouses", value: "6", description: "Active locations" },
          { label: "Total Capacity", value: "20K", description: "Units across all WH" },
          { label: "Avg Utilization", value: "76%", description: "Current occupancy" },
          { label: "Active Ops Today", value: "48", description: "In progress" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<FaDownload size={12} />}>Report</Button>
            <Button variant="primary" size="sm" leftIcon={<FaPlus size={12} />}>New Operation</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Healthy WH", value: mockWarehouses.filter(w => w.status === "Healthy").length, icon: FaCheckCircle, color: "text-success", bg: "gradient-success-soft" },
          { label: "Near Full", value: mockWarehouses.filter(w => w.status === "Near Full").length, icon: FaExclamationTriangle, color: "text-warning", bg: "gradient-warning-soft" },
          { label: "Total Inbound", value: mockWarehouses.reduce((a, w) => a + w.inbound, 0), icon: FaBoxes, color: "text-primary", bg: "gradient-primary-soft" },
          { label: "Total Outbound", value: mockWarehouses.reduce((a, w) => a + w.outbound, 0), icon: FaTruck, color: "text-success", bg: "gradient-success-soft" },
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

      {/* Warehouse Cards */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-bold text-text-primary text-base flex items-center gap-2">
            <FaWarehouse className="text-primary" />
            Warehouse Overview
          </h2>
          <div className="flex items-center gap-2">
            <FaFilter className="text-text-muted" size={13} />
            {["All", "Healthy", "Near Full", "Underutilized"].map((f) => (
              <button key={f} onClick={() => setWhFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${whFilter === f ? "gradient-primary text-white shadow-sm" : "bg-surface text-text-secondary border border-border hover:border-primary/30"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredWH.map((wh) => {
            const sc = statusConfig[wh.status];
            const usedPct = Math.round((wh.usedCapacity / wh.totalCapacity) * 100);
            return (
              <div key={wh.id} className="card p-5 hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {wh.id}
                    </div>
                    <div>
                      <p className="font-bold text-text-primary text-sm">{wh.name}</p>
                      <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                        <FaMapMarkerAlt size={9} />{wh.location}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{wh.status}
                  </span>
                </div>

                {/* Capacity bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>Capacity Usage</span>
                    <span className="font-bold text-text-primary">{usedPct}%</span>
                  </div>
                  <div className="w-full bg-bg rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full ${sc.barColor} transition-all`} style={{ width: `${usedPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-text-muted mt-1">
                    <span>{wh.usedCapacity.toLocaleString()} used</span>
                    <span>{wh.totalCapacity.toLocaleString()} total</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div className="text-center">
                    <p className="font-bold text-text-primary text-sm">{wh.zones}</p>
                    <p className="text-[10px] text-text-muted">Zones</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-primary text-sm">+{wh.inbound}</p>
                    <p className="text-[10px] text-text-muted">Inbound</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-success text-sm">-{wh.outbound}</p>
                    <p className="text-[10px] text-text-muted">Outbound</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Operations */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-text-primary text-base flex items-center gap-2">
            <FaBoxes className="text-primary" />
            Live Operations Today
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Op ID", "Type", "Reference", "Warehouse", "Items", "Status", "Time"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockOperations.map((op) => (
                <tr key={op.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3.5 text-sm font-bold text-text-primary">{op.id}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-bg border border-border text-text-secondary px-2 py-0.5 rounded-full">{op.type}</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-primary font-medium">{op.ref}</td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{op.wh}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-text-primary">{op.items}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${opStatusConfig[op.status]}`}>{op.status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-text-muted">{op.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
