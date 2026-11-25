import { useState } from "react";
import { FaIndustry } from "react-icons/fa";
import {
  FaTruck, FaSearch, FaFilter, FaPlus, FaDownload,
  FaCheckCircle, FaClock, FaExclamationTriangle, FaMapMarkerAlt,
} from "react-icons/fa";
import { MdLocalShipping } from "react-icons/md";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";

const mockShipments = [
  { id: "SH-0091", orderId: "PO-2041", carrier: "BlueDart", origin: "Mumbai WH", destination: "Chennai Hub", items: 8, weight: "420kg", dispatchDate: "2026-05-13", eta: "2026-05-17", status: "In Transit" },
  { id: "SH-0092", orderId: "PO-2042", carrier: "Delhivery", origin: "Delhi WH", destination: "Hyderabad", items: 15, weight: "830kg", dispatchDate: "2026-05-12", eta: "2026-05-16", status: "Delayed" },
  { id: "SH-0093", orderId: "PO-2043", carrier: "Ekart", origin: "Pune WH", destination: "Bengaluru Hub", items: 5, weight: "210kg", dispatchDate: "2026-05-14", eta: "2026-05-15", status: "Delivered" },
  { id: "SH-0094", orderId: "PO-2044", carrier: "DTDC", origin: "Mumbai WH", destination: "Kolkata", items: 22, weight: "1100kg", dispatchDate: "2026-05-15", eta: "2026-05-20", status: "Dispatched" },
  { id: "SH-0095", orderId: "PO-2045", carrier: "FedEx", origin: "Ahmedabad WH", destination: "Jaipur", items: 10, weight: "580kg", dispatchDate: "2026-05-15", eta: "2026-05-18", status: "Dispatched" },
  { id: "SH-0096", orderId: "PO-2046", carrier: "BlueDart", origin: "Chennai WH", destination: "Coimbatore", items: 3, weight: "110kg", dispatchDate: "2026-05-11", eta: "2026-05-13", status: "Delivered" },
];

const statusConfig = {
  "In Transit": { color: "bg-primary/10 text-primary", dot: "bg-primary", icon: FaTruck },
  "Delayed": { color: "bg-danger/10 text-danger", dot: "bg-danger", icon: FaExclamationTriangle },
  "Delivered": { color: "bg-success/10 text-success", dot: "bg-success", icon: FaCheckCircle },
  "Dispatched": { color: "bg-warning/10 text-warning", dot: "bg-warning", icon: MdLocalShipping },
};

export default function DispatchLogistics() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = mockShipments.filter((s) => {
    const matchSearch = s.id.toLowerCase().includes(search.toLowerCase()) || s.destination.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || s.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    total: mockShipments.length,
    inTransit: mockShipments.filter(s => s.status === "In Transit").length,
    delayed: mockShipments.filter(s => s.status === "Delayed").length,
    delivered: mockShipments.filter(s => s.status === "Delivered").length,
  };

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="Dispatch & Logistics"
        subtitle="Monitor all outbound shipments, carriers and delivery milestones in real-time."
        icon={FaIndustry}
        stats={[
          { label: "Total Shipments", value: counts.total.toString(), description: "Active orders" },
          { label: "In Transit", value: counts.inTransit.toString(), description: "On the way" },
          { label: "Delayed", value: counts.delayed.toString(), description: "Needs action" },
          { label: "Delivered", value: counts.delivered.toString(), description: "Completed" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<FaDownload size={12} />}>Export</Button>
            <Button variant="primary" size="sm" leftIcon={<FaPlus size={12} />}>New Dispatch</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "In Transit", value: counts.inTransit, icon: FaTruck, color: "text-primary", bg: "gradient-primary-soft" },
          { label: "Delayed", value: counts.delayed, icon: FaExclamationTriangle, color: "text-danger", bg: "gradient-danger-soft" },
          { label: "Dispatched Today", value: 2, icon: MdLocalShipping, color: "text-warning", bg: "gradient-warning-soft" },
          { label: "Delivered", value: counts.delivered, icon: FaCheckCircle, color: "text-success", bg: "gradient-success-soft" },
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

      {/* Shipments Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 flex-1 min-w-[200px]">
            <FaSearch className="text-text-muted" size={14} />
            <input
              className="bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none w-full"
              placeholder="Search shipment ID or destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FaFilter className="text-text-muted" size={13} />
            {["All", "In Transit", "Delayed", "Dispatched", "Delivered"].map((f) => (
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
                {["Shipment", "Order", "Carrier", "Route", "Items / Weight", "ETA", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-text-muted text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => {
                const sc = statusConfig[s.status];
                const StatusIcon = sc.icon;
                return (
                  <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-text-primary text-sm">{s.id}</div>
                      <div className="text-text-muted text-xs">{s.dispatchDate}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary font-medium">{s.orderId}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-text-secondary bg-bg border border-border px-2 py-0.5 rounded-full">{s.carrier}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <FaMapMarkerAlt className="text-text-muted" size={10} />
                        {s.origin}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-primary font-medium mt-0.5">
                        <FaMapMarkerAlt size={10} />
                        {s.destination}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-semibold text-text-primary">{s.items} items</div>
                      <div className="text-xs text-text-muted">{s.weight}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-sm text-text-primary">
                        <FaClock size={11} className="text-text-muted" />
                        {s.eta}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
                        <StatusIcon size={10} />{s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-text-muted text-xs">Showing {filtered.length} of {mockShipments.length} shipments</p>
        </div>
      </div>
    </div>
  );
}
