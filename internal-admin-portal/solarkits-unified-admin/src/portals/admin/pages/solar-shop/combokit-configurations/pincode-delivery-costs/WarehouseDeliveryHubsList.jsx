import { useState, useMemo } from "react";
import ReactCountryFlag from "react-country-flag";
import {
  FaWarehouse,
  FaMapMarkerAlt,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaSync,
  FaArrowRight,
  FaGlobe,
  FaBoxOpen,
  FaExclamationTriangle,
  FaLayerGroup,
  FaCogs,
} from "react-icons/fa";
import Button from "@/components/Button";
import Dropdown from "@/components/Dropdown";
import Loader from "@/components/Loader";
import CustomTable from "@/components/CustomTable";

export default function WarehouseDeliveryHubsList({
  warehouses = [],
  activations = [],
  summaries = {},
  loading = false,
  refreshing = false,
  onSelectWarehouse,
  currentCountry,
  states = [],
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, configured, pending

  // Helper to count active kits for a warehouse from activations
  const getWarehouseActiveKitsCount = (warehouse) => {
    const whId = (warehouse.id || warehouse._id || "").toString();
    const whCode = (warehouse.warehouse_code || "").toLowerCase();

    return activations.filter((a) => {
      const aWhId = (a.warehouse_id?._id || a.warehouse_id || "").toString();
      const aWhCode = (a.warehouse_id?.warehouse_code || a.warehouse_code || "").toLowerCase();
      const matches = (whId && aWhId === whId) || (whCode && aWhCode === whCode);
      return matches && a.is_combokit_active && a.combo_kit_id && !a.combo_kit_id.is_custom;
    }).length;
  };

  // Helper to get delivery freight summary for a warehouse
  const getWarehouseDeliverySummary = (warehouse) => {
    const code = warehouse.warehouse_code;
    return summaries[code] || null;
  };

  // Filter warehouses based on search and filters
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const code = (w.warehouse_code || "").toLowerCase();
        const name = (w.warehouse_name || "").toLowerCase();
        const addr = (w.address || "").toLowerCase();
        const state = (w.state || "").toLowerCase();
        const cluster = (typeof w.cluster === "string" ? w.cluster : w.cluster?.name || "").toLowerCase();
        if (
          !code.includes(q) &&
          !name.includes(q) &&
          !addr.includes(q) &&
          !state.includes(q) &&
          !cluster.includes(q)
        ) {
          return false;
        }
      }

      if (stateFilter) {
        const stateMatches =
          (w.state_id || w.level_1)?.toString() === stateFilter.toString() ||
          (w.state && w.state.toLowerCase() === stateFilter.toLowerCase());
        if (!stateMatches) return false;
      }

      if (statusFilter !== "all") {
        const summary = getWarehouseDeliverySummary(w);
        const hasDeliveryRates = summary && summary.total_rules > 0;
        if (statusFilter === "configured" && !hasDeliveryRates) return false;
        if (statusFilter === "pending" && hasDeliveryRates) return false;
      }

      return true;
    });
  }, [warehouses, searchTerm, stateFilter, statusFilter, summaries, activations]);

  // Aggregate metrics
  const totalWarehouses = warehouses.length;
  const totalConfiguredHubs = warehouses.filter((w) => {
    const s = getWarehouseDeliverySummary(w);
    return s && s.total_rules > 0;
  }).length;
  const totalPendingHubs = totalWarehouses - totalConfiguredHubs;
  const totalRulesAcrossNetwork = Object.values(summaries).reduce(
    (sum, s) => sum + (s.total_rules || 0),
    0
  );

  const tableHeaders = [
    { key: "warehouse", label: "Warehouse" },
    { key: "address", label: "Address" },
    { key: "location", label: "State & Cluster" },
    { key: "active_kits", label: "Active Combo Kits", align: "center" },
    { key: "delivery_freight", label: "Delivery Freight Coverage", align: "center" },
    { key: "order_fulfillment", label: "Order Type Fulfillment", align: "center" },
    { key: "actions", label: "Actions", align: "right" },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Header */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)] pointer-events-none" />
        <div className="relative px-6 py-8 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                <FaTruck className="text-white text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                  Pincode Wise Delivery Cost Master
                </h1>
                <p className="text-white/90 text-sm mt-1 max-w-2xl font-medium">
                  Industry-Standard Fulfillment Hub Logistics. Select a warehouse below to view its active combo kits and configure pincode delivery freight charges.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={onRefresh}
                disabled={loading || refreshing}
                variant="secondary"
                size="sm"
                leftIcon={<FaSync className={refreshing ? "animate-spin" : ""} />}
                className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 hover:border-white/40 hover:text-white"
              >
                {refreshing ? "Refreshing..." : "Refresh Hubs"}
              </Button>
              {currentCountry && (
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 flex items-center gap-2">
                  <ReactCountryFlag
                    countryCode={currentCountry.iso2 || "IN"}
                    svg
                    className="w-5 h-5 rounded-sm object-cover"
                  />
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    {currentCountry.name || "India"} Market
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Market */}
        <div className="bg-surface rounded-2xl p-6 border-l-4 border-l-primary border-2 border-border shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">
                Active Market
              </h3>
              <h2 className="text-lg font-black text-text-primary mt-1">
                {currentCountry ? currentCountry.name : "India"}
              </h2>
            </div>
            {currentCountry && (
              <ReactCountryFlag
                countryCode={currentCountry.iso2 || "IN"}
                svg
                style={{ width: "2em", height: "1.5em" }}
                className="rounded shadow-sm"
              />
            )}
          </div>
          <div className="h-px bg-border/40" />
          <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
            <FaGlobe className="text-primary opacity-50" />
            <span>
              Currency: <strong>{currentCountry?.currency_code || "INR (₹)"}</strong>
            </span>
          </div>
        </div>

        {/* Total Hubs */}
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-sm flex items-center gap-5">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20 shrink-0">
            <FaWarehouse size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Total Fulfillment Hubs
            </h3>
            <h2 className="text-2xl font-black text-text-primary mt-1">
              {totalWarehouses}
            </h2>
            <p className="text-[10px] text-text-secondary font-bold mt-0.5">
              Available supply warehouses
            </p>
          </div>
        </div>

        {/* Configured Delivery Hubs */}
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-sm flex items-center gap-5">
          <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-600 border border-emerald-500/20 shrink-0">
            <FaCheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Configured Hubs
            </h3>
            <h2 className="text-2xl font-black text-emerald-600 mt-1">
              {totalConfiguredHubs} / {totalWarehouses}
            </h2>
            <p className="text-[10px] text-text-secondary font-bold mt-0.5">
              With delivery freight rules
            </p>
          </div>
        </div>

        {/* Network Delivery Rules */}
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-sm flex items-center gap-5">
          <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-600 border border-indigo-500/20 shrink-0">
            <FaLayerGroup size={24} />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Network Delivery Rules
            </h3>
            <h2 className="text-2xl font-black text-indigo-600 mt-1">
              {totalRulesAcrossNetwork}
            </h2>
            <p className="text-[10px] text-text-secondary font-bold mt-0.5">
              Across all fulfillment centers
            </p>
          </div>
        </div>
      </div>

      {/* Filtering Toolbar */}
      <div className="bg-surface rounded-2xl border-2 border-border/70 p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-text-muted">
            <FaSearch size={13} />
          </span>
          <input
            type="text"
            placeholder="Search warehouse by code, city, address or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none transition-colors"
          />
        </div>

        {/* State Filter */}
        <div className="w-full md:w-56">
          <Dropdown
            label="Filter by State"
            value={stateFilter}
            onChange={setStateFilter}
            placeholder="All States"
            options={[
              { value: "", text: "All States" },
              ...states.map((s) => ({ value: s.name || s.id, text: s.name })),
            ]}
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-52">
          <Dropdown
            label="Delivery Freight Status"
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            options={[
              { value: "all", text: "All Hubs" },
              { value: "configured", text: "Delivery Configured" },
              { value: "pending", text: "Pending Delivery Setup" },
            ]}
          />
        </div>

        {(searchTerm || stateFilter || statusFilter !== "all") && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setStateFilter("");
              setStatusFilter("all");
            }}
            className="h-11 px-4 text-xs font-bold shrink-0"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Warehouse Master Table (Matches Screenshot 2) */}
      <div className="bg-surface rounded-2xl border-2 border-border/70 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-inner">
              <FaWarehouse size={14} />
            </div>
            {currentCountry ? currentCountry.name : "India"} Warehouses List
          </h2>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
            {filteredWarehouses.length} Warehouses Listed
          </span>
        </div>

        <div className="flex-1 p-6">
          <CustomTable
            headers={tableHeaders}
            data={filteredWarehouses}
            loading={loading || refreshing}
            emptyMessage="No warehouses found matching current filters."
            containerClassName="border-none shadow-none rounded-none bg-transparent"
            renderRow={(warehouse) => {
              const activeKitsCount = getWarehouseActiveKitsCount(warehouse);
              const summary = getWarehouseDeliverySummary(warehouse);
              const hasDeliveryRates = summary && summary.total_rules > 0;

              return (
                <tr
                  key={warehouse.id || warehouse._id || warehouse.warehouse_code}
                  className="hover:bg-primary/5 transition-colors cursor-pointer group"
                  onClick={() => onSelectWarehouse(warehouse)}
                >
                  {/* Warehouse Code & Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                        <FaWarehouse size={14} />
                      </div>
                      <div>
                        <span className="font-black text-text-primary text-sm tracking-tight block">
                          {warehouse.warehouse_code || "N/A"}
                        </span>
                        <span className="text-[11px] font-semibold text-text-muted block truncate max-w-xs">
                          {warehouse.warehouse_name || warehouse.warehouse_code}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Address */}
                  <td className="px-6 py-4">
                    <div
                      className="font-semibold text-text-secondary text-xs truncate max-w-xs"
                      title={warehouse.address}
                    >
                      {warehouse.address || "N/A"}
                    </div>
                  </td>

                  {/* State & Cluster */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-text-secondary text-xs flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-text-primary">
                        <FaMapMarkerAlt className="text-primary text-[10px]" />
                        {warehouse.state || "N/A"}
                      </span>
                      <span className="text-text-muted pl-4 text-[11px]">
                        Cluster: <strong>{typeof warehouse.cluster === "string" ? warehouse.cluster : warehouse.cluster?.name || "N/A"}</strong>
                      </span>
                    </div>
                  </td>

                  {/* Active Combo Kits */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {activeKitsCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {activeKitsCount} Active Kit{activeKitsCount === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border/50">
                        <FaTimesCircle size={9} />
                        Not Configured
                      </span>
                    )}
                  </td>

                  {/* Delivery Freight Coverage */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {hasDeliveryRates ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                          <FaCheckCircle size={9} />
                          {summary.total_pincodes} Pincode{summary.total_pincodes === 1 ? "" : "s"} Configured
                        </span>
                        {summary.min_cost !== undefined && summary.max_cost !== undefined && (
                          <span className="text-[10px] font-bold text-text-muted">
                            ₹{summary.min_cost?.toLocaleString("en-IN")} - ₹{summary.max_cost?.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <FaExclamationTriangle size={9} />
                        Not Configured
                      </span>
                    )}
                  </td>

                  {/* Order Type Fulfillment */}
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {(() => {
                      const fulfillmentTypes = Array.isArray(warehouse.order_fulfillment_types) && warehouse.order_fulfillment_types.length > 0
                        ? warehouse.order_fulfillment_types
                        : ["po_order", "loose_order", "trial_order"];

                      return (
                        <div className="flex items-center justify-center flex-wrap gap-1 max-w-[200px] mx-auto">
                          {fulfillmentTypes.includes("po_order") && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              PO Order
                            </span>
                          )}
                          {fulfillmentTypes.includes("loose_order") && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-purple-500/10 text-purple-600 border border-purple-500/20">
                              Loose Order
                            </span>
                          )}
                          {fulfillmentTypes.includes("trial_order") && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Trial Order
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Action Button */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<FaCogs size={11} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWarehouse(warehouse);
                      }}
                      className="rounded-lg text-[10px] font-bold uppercase tracking-wider py-1.5 px-3.5 shadow-xs"
                    >
                      {hasDeliveryRates ? "Manage Rates" : "Configure"}
                    </Button>
                  </td>
                </tr>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

