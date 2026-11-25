import { useState, useMemo } from "react";
import ReactCountryFlag from "react-country-flag";
import {
  FaWarehouse,
  FaGlobe,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaCogs,
  FaSync,
  FaSearch,
  FaBoxes,
  FaExclamationTriangle,
  FaHandshake,
  FaTruck
} from "react-icons/fa";
import Button from "@/components/Button";
import CustomTable from "@/components/CustomTable";
import Dropdown from "@/components/Dropdown";
import Loader from "@/components/Loader";

export default function WarehouseKitPartnerMappingView({
  warehouses = [],
  summary = {
    total_warehouses: 0,
    configured_warehouses: 0,
    pending_warehouses: 0,
    no_kits_warehouses: 0,
    total_live_kits: 0
  },
  activeCountries = [],
  currentCountryId,
  onSelectCountry,
  loading = false,
  refreshing = false,
  onRefresh,
  onSelectWarehouse
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'configured', 'pending', 'no_kits'

  // Identify current country object
  const currentCountry = useMemo(() => {
    if (!activeCountries.length) return { name: "India", iso2: "IN", currency_code: "INR" };
    return activeCountries.find((c) => (c.id || c._id) === currentCountryId) || activeCountries[0];
  }, [activeCountries, currentCountryId]);

  // Extract unique states for filter
  const stateOptions = useMemo(() => {
    const map = new Map();
    warehouses.forEach((w) => {
      if (w.state_name && w.state_name !== "N/A") {
        map.set(w.state_name, w.state_name);
      }
    });
    return Array.from(map.keys()).sort().map((st) => ({ value: st, text: st }));
  }, [warehouses]);

  // Filter warehouses based on search and filters
  const displayWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = w.warehouse_code?.toLowerCase().includes(q);
        const nameMatch = w.warehouse_name?.toLowerCase().includes(q);
        const addrMatch = w.address?.toLowerCase().includes(q);
        const stateMatch = w.state_name?.toLowerCase().includes(q);
        const clusterMatch = w.cluster_name?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !addrMatch && !stateMatch && !clusterMatch) {
          return false;
        }
      }

      // State Filter
      if (stateFilter && w.state_name !== stateFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "configured" && w.status !== "configured") return false;
        if (statusFilter === "pending" && (w.status !== "pending" && w.status !== "partially_configured")) return false;
        if (statusFilter === "no_kits" && w.status !== "no_kits") return false;
      }

      return true;
    });
  }, [warehouses, searchQuery, stateFilter, statusFilter]);

  // Table Headers
  const tableHeaders = [
    { key: "warehouse", label: "Warehouse" },
    { key: "address", label: "Address" },
    { key: "location", label: "State & Cluster" },
    { key: "live_kits", label: "Live Kits", align: "center" },
    { key: "mapping_status", label: "Partner Product Mapping", align: "center" },
    { key: "actions", label: "Actions", align: "right" }
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards (Identical style to Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Market */}
        <div className="card p-6 border-l-4 border-l-primary shadow-xs space-y-4 bg-surface rounded-2xl border border-border">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                Active Market
              </h3>
              <h2 className="text-lg font-black text-text-primary mt-1">
                {currentCountry?.name || "India"}
              </h2>
            </div>
            {currentCountry?.iso2 && (
              <ReactCountryFlag
                countryCode={currentCountry.iso2}
                svg
                style={{ width: "2em", height: "1.5em" }}
                className="rounded shadow-2xs"
              />
            )}
          </div>
          <div className="h-px bg-border/40" />
          <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
            <FaGlobe className="text-primary opacity-50" />
            <span>
              Currency: <strong>{currentCountry?.currency_code || "INR"}</strong>
            </span>
          </div>
        </div>

        {/* Total Warehouses */}
        <div className="card p-6 border-2 border-border shadow-xs flex items-center gap-5 bg-surface rounded-2xl">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/10">
            <FaWarehouse size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Total Warehouses
            </h3>
            <h2 className="text-2xl font-black text-text-primary mt-1">
              {summary.total_warehouses}
            </h2>
            <p className="text-[10px] text-text-secondary font-bold mt-0.5">
              In {currentCountry?.name || "selected"} market
            </p>
          </div>
        </div>

        {/* Configured Warehouses */}
        <div className="card p-6 border-2 border-border shadow-xs flex items-center gap-5 bg-surface rounded-2xl">
          <div className="p-4 bg-success/10 rounded-2xl text-success border border-success/10">
            <FaCheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Configured
            </h3>
            <h2 className="text-2xl font-black text-text-primary mt-1">
              {summary.configured_warehouses} Warehouses
            </h2>
            <p className="text-[10px] text-text-secondary font-bold mt-0.5">
              Partner products mapped
            </p>
          </div>
        </div>

        {/* Pending Setup Warehouses */}
        <div className="card p-6 border-2 border-border shadow-xs flex items-center gap-5 bg-surface rounded-2xl">
          <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/10">
            <FaExclamationTriangle size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Pending Setup
            </h3>
            <h2 className="text-2xl font-black text-text-primary mt-1">
              {summary.pending_warehouses} Pending
            </h2>
            <p className="text-[10px] text-text-secondary font-bold mt-0.5">
              {summary.total_live_kits} Total active kits across network
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-surface rounded-2xl border border-border p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-bg p-1 rounded-xl border border-border text-xs font-bold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-surface text-primary shadow-2xs font-extrabold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              All ({warehouses.length})
            </button>
            <button
              onClick={() => setStatusFilter("configured")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "configured"
                  ? "bg-emerald-500/10 text-emerald-500 shadow-2xs font-extrabold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Configured ({summary.configured_warehouses})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "pending"
                  ? "bg-amber-500/10 text-amber-500 shadow-2xs font-extrabold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Pending ({summary.pending_warehouses})
            </button>
          </div>

          {/* State Filter */}
          <div className="w-48">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary font-medium"
            >
              <option value="">All States</option>
              {stateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {(stateFilter || searchQuery || statusFilter !== "all") && (
            <button
              onClick={() => {
                setStateFilter("");
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="text-xs text-text-secondary hover:text-primary font-semibold underline px-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* Search Input & Refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none" />
            <input
              type="text"
              placeholder="Search warehouse or cluster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-bg border border-border rounded-xl focus:outline-none focus:border-primary text-text-primary placeholder:text-text-secondary/60"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="p-2.5 rounded-xl border border-border bg-bg text-text-secondary hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50 shrink-0"
            title="Refresh warehouse list"
          >
            <FaSync className={refreshing ? "animate-spin text-primary" : ""} size={13} />
          </button>
        </div>
      </div>

      {/* Warehouses Table (Identical visual structure to Image 1) */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col min-h-[350px]">
        {/* Table Banner Header */}
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
            <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
              <FaWarehouse size={13} />
            </div>
            {currentCountry?.name || "India"} Warehouses List
          </h2>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-hover px-3 py-1 rounded-lg border border-border/40">
            {displayWarehouses.length} Warehouses Listed
          </span>
        </div>

        {/* Table Content */}
        <div className="flex-1 p-4 sm:p-6">
          <CustomTable
            headers={tableHeaders}
            data={displayWarehouses}
            loading={loading || refreshing}
            emptyMessage="No warehouses match your search or filter selections."
            containerClassName="border-none shadow-none rounded-none bg-transparent"
            renderRow={(wh) => {
              return (
                <>
                  {/* 1. Warehouse Code */}
                  <td className="px-6 py-4">
                    <div className="font-black text-text-primary tracking-tight text-sm flex items-center gap-2.5">
                      <FaWarehouse className="text-primary opacity-70 shrink-0" size={14} />
                      <span className="font-mono">{wh.warehouse_code || "N/A"}</span>
                    </div>
                  </td>

                  {/* 2. Address */}
                  <td className="px-6 py-4">
                    <div
                      className="font-medium text-text-secondary text-xs truncate max-w-xs"
                      title={wh.address}
                    >
                      {wh.address || "N/A"}
                    </div>
                  </td>

                  {/* 3. State & Cluster */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-text-secondary text-xs flex flex-col gap-0.5">
                      <span className="flex items-center gap-1">
                        <FaMapMarkerAlt className="text-primary/60 text-[10px]" />
                        {wh.state_name || "N/A"}
                      </span>
                      <span className="text-text-muted pl-3.5 text-[11px]">
                        Cluster: <strong>{wh.cluster_name || "N/A"}</strong>
                      </span>
                    </div>
                  </td>

                  {/* 4. Live Kits */}
                  <td className="px-6 py-4 text-center">
                    {wh.live_kits_count > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                        <FaBoxes size={11} />
                        {wh.live_kits_count} {wh.live_kits_count === 1 ? "Kit Live" : "Kits Live"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-surface-hover text-text-muted border border-border/40">
                        Not Configured
                      </span>
                    )}
                  </td>

                  {/* 5. Mapping Status Badge */}
                  <td className="px-6 py-4 text-center">
                    {wh.status === "configured" ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-success/10 text-success border border-success/20">
                          <FaCheckCircle size={10} />
                          {wh.configured_kits_count}/{wh.live_kits_count} Active Mapped
                        </span>
                        <span className="text-[10px] text-text-muted font-bold">
                          Ready for PO & Orders
                        </span>
                      </div>
                    ) : wh.status === "partially_configured" ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <FaExclamationTriangle size={10} />
                          {wh.configured_kits_count}/{wh.live_kits_count} Kits Mapped
                        </span>
                        <span className="text-[10px] text-amber-500/80 font-bold">
                          {wh.pending_kits_count} Kits Pending
                        </span>
                      </div>
                    ) : wh.status === "pending" ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-danger/10 text-danger border border-danger/20">
                          <FaTimesCircle size={10} />
                          Pending Setup ({wh.live_kits_count} Live)
                        </span>
                        <span className="text-[10px] text-danger/80 font-bold">
                          OEM & Supplier unmapped
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-hover text-text-muted border border-border/40">
                        No Live Kits Active
                      </span>
                    )}
                  </td>

                  {/* 6. Actions Button */}
                  <td className="px-6 py-4 text-right">
                    <Button
                      onClick={() => onSelectWarehouse(wh)}
                      size="sm"
                      variant={wh.status === "configured" ? "primary" : "primary"}
                      leftIcon={<FaCogs />}
                      className={`rounded-xl text-xs font-bold uppercase tracking-wider py-2 px-4 shadow-2xs ${
                        wh.status === "configured"
                          ? "bg-primary hover:bg-primary-hover"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {wh.status === "configured" ? "Manage Activations" : "Configure"}
                    </Button>
                  </td>
                </>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
