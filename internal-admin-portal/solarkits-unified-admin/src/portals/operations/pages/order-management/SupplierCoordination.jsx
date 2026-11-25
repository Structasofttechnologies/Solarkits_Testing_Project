import { useState } from "react";
import { FaUsers } from "react-icons/fa";
import {
  FaSearch, FaFilter, FaPlus, FaDownload, FaEdit,
  FaCheckCircle, FaClock, FaExclamationTriangle,
  FaPhoneAlt, FaEnvelope, FaStar, FaFileContract,
} from "react-icons/fa";
import { MdBusiness } from "react-icons/md";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/Button";

const mockSuppliers = [
  { id: "SUP-001", name: "Brightline Solar Pvt Ltd", category: "Panels", contact: "Rajan Mehta", email: "rajan@brightline.in", phone: "+91 98001 10001", rating: 4.8, openOrders: 5, totalOrders: 48, status: "Active" },
  { id: "SUP-002", name: "PowerLink Inverters", category: "Inverter", contact: "Anita Sharma", email: "anita@powerlink.com", phone: "+91 98002 20002", rating: 4.5, openOrders: 2, totalOrders: 30, status: "Active" },
  { id: "SUP-003", name: "WireWorld Industries", category: "Wiring", contact: "Suresh Iyer", email: "suresh@wireworld.in", phone: "+91 98003 30003", rating: 3.9, openOrders: 0, totalOrders: 12, status: "Inactive" },
  { id: "SUP-004", name: "AlphaMount Structures", category: "Structure", contact: "Priya Das", email: "priya@alphamount.com", phone: "+91 98004 40004", rating: 4.6, openOrders: 7, totalOrders: 65, status: "Active" },
  { id: "SUP-005", name: "EnerStore Batteries", category: "Battery", contact: "Kiran Nair", email: "kiran@enerstore.in", phone: "+91 98005 50005", rating: 4.2, openOrders: 3, totalOrders: 22, status: "Active" },
  { id: "SUP-006", name: "SafeElect Components", category: "Electrical", contact: "Deepak Singh", email: "deepak@safeelect.com", phone: "+91 98006 60006", rating: 4.0, openOrders: 1, totalOrders: 18, status: "On Hold" },
];

const statusConfig = {
  Active: { color: "bg-success/10 text-success", dot: "bg-success" },
  Inactive: { color: "bg-text-muted/10 text-text-muted", dot: "bg-text-muted" },
  "On Hold": { color: "bg-warning/10 text-warning", dot: "bg-warning" },
};

export default function SupplierCoordination() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filtered = mockSuppliers.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || s.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="Supplier Coordination"
        subtitle="Manage supplier relationships, purchase orders and procurement workflows."
        icon={FaUsers}
        stats={[
          { label: "Active Suppliers", value: "63", description: "Approved vendors" },
          { label: "Open POs", value: "18", description: "Pending fulfillment" },
          { label: "On Hold", value: "4", description: "Under review" },
          { label: "Avg Rating", value: "4.4", description: "Supplier score" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<FaFileContract size={12} />}>Contracts</Button>
            <Button variant="primary" size="sm" leftIcon={<FaPlus size={12} />}>Add Supplier</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Suppliers", value: mockSuppliers.filter(s => s.status === "Active").length, icon: FaUsers, color: "text-primary", bg: "gradient-primary-soft" },
          { label: "On Hold", value: mockSuppliers.filter(s => s.status === "On Hold").length, icon: FaExclamationTriangle, color: "text-warning", bg: "gradient-warning-soft" },
          { label: "Open Orders", value: mockSuppliers.reduce((a, s) => a + s.openOrders, 0), icon: FaFileContract, color: "text-success", bg: "gradient-success-soft" },
          { label: "Top Rated", value: "4.8★", icon: FaStar, color: "text-secondary", bg: "gradient-secondary" },
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

      {/* Supplier Cards Grid */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 flex-1 min-w-[200px]">
            <FaSearch className="text-text-muted" size={14} />
            <input
              className="bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none w-full"
              placeholder="Search supplier or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="text-text-muted" size={13} />
            {["All", "Active", "On Hold", "Inactive"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${filter === f ? "gradient-primary text-white shadow-sm" : "bg-bg text-text-secondary border border-border hover:border-primary/30"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
          {filtered.map((sup) => {
            const sc = statusConfig[sup.status];
            return (
              <div key={sup.id} className="border border-border rounded-xl p-4 bg-surface hover:shadow-md hover:scale-[1.01] transition-all duration-200 group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {sup.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-text-primary text-sm leading-tight">{sup.name}</p>
                      <span className="text-[10px] bg-bg border border-border text-text-secondary px-1.5 py-0.5 rounded-full">{sup.category}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sup.status}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <FaPhoneAlt className="text-text-muted" size={10} />
                    {sup.phone}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <FaEnvelope className="text-text-muted" size={10} />
                    {sup.email}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="text-center">
                    <p className="text-base font-bold text-text-primary">{sup.openOrders}</p>
                    <p className="text-[10px] text-text-muted">Open POs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-text-primary">{sup.totalOrders}</p>
                    <p className="text-[10px] text-text-muted">Total Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-warning flex items-center justify-center gap-1">
                      <FaStar size={11} />{sup.rating}
                    </p>
                    <p className="text-[10px] text-text-muted">Rating</p>
                  </div>
                  <button className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <FaEdit size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-text-muted">
              <FaUsers className="mx-auto mb-2 opacity-30 text-3xl" />
              <p className="text-sm">No suppliers found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
