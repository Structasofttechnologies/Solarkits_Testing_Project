import React, { useState, useMemo } from "react";
import {
  FaTable,
  FaSearch,
  FaFilter,
  FaSlidersH,
  FaEye,
  FaBoxes,
  FaTruck,
  FaTools,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaUser,
  FaMapMarkerAlt
} from "react-icons/fa";

export default function MasterOrderTrackingTable({
  orders = [],
  selectedStatusFilter,
  onClearStatusFilter,
  onSelectOrder
}) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [inwardFilter, setInwardFilter] = useState("all");
  const [kitPrepFilter, setKitPrepFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [overdueFilter, setOverdueFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Extract unique states and suppliers dynamically from real orders
  const uniqueStates = useMemo(() => {
    return [...new Set(orders.map((o) => o.state).filter(Boolean))];
  }, [orders]);

  const uniqueSources = useMemo(() => {
    return [...new Set(orders.map((o) => o.order_source).filter(Boolean))];
  }, [orders]);

  // Filter Pipeline
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Text Search
      const s = search.toLowerCase();
      const matchSearch =
        !s ||
        (o.order_number || "").toLowerCase().includes(s) ||
        (o.customer_name || "").toLowerCase().includes(s) ||
        (o.kit_type || "").toLowerCase().includes(s) ||
        (o.district || "").toLowerCase().includes(s);

      // 2. Global Status Card Drill-Down Filter
      let matchStatusCard = true;
      if (selectedStatusFilter) {
        switch (selectedStatusFilter) {
          case "incoming_supplier_goods":
            matchStatusCard = o.items?.some(i => i.sourcing_type === 'supplier_procurement' || i.supplier_name);
            break;
          case "pickup_pending":
            matchStatusCard = o.items?.some(i => i.supply_status === 'ready_for_pickup');
            break;
          case "supplier_dispatch_pending":
            matchStatusCard = o.items?.some(i => i.supply_status === 'pending');
            break;
          case "supplier_in_transit":
            matchStatusCard = o.items?.some(i => i.supply_status === 'in_transit');
            break;
          case "warehouse_inward_pending":
            matchStatusCard = o.inward_status === 'Pending' || o.delivery_status === 'new_order';
            break;
          case "partially_received":
            matchStatusCard = o.inward_status === 'Partial' || o.delivery_status === 'partially_inwarded';
            break;
          case "inward_completed":
            matchStatusCard = o.inward_status === 'Completed';
            break;
          case "inventory_allocation_pending":
            matchStatusCard = o.items?.some(i => (i.ordered_qty || 0) > (i.allocated_stock || 0));
            break;
          case "boskit_combokit_preparation":
            matchStatusCard = ['In Progress', 'Ready', 'in_assembly', 'ready_for_assembly'].includes(o.kit_preparation);
            break;
          case "awaiting_missing_components":
            matchStatusCard = o.kit_preparation === 'Awaiting Components';
            break;
          case "ready_for_dispatch":
            matchStatusCard = o.delivery_status === 'ready_for_dispatch';
            break;
          case "vehicle_booking_pending":
            matchStatusCard = o.vehicle_booking === 'Pending' && o.delivery_status === 'ready_for_dispatch';
            break;
          case "vehicle_booked":
            matchStatusCard = o.vehicle_booking === 'Booked';
            break;
          case "dispatched":
            matchStatusCard = ['awaiting_eway_bill', 'ready_to_initiate', 'dispatched_pending'].includes(o.delivery_status);
            break;
          case "in_transit_customer":
            matchStatusCard = o.delivery_status === 'in_transit';
            break;
          case "delivered":
            matchStatusCard = o.delivery_status === 'delivered';
            break;
          case "pod_pending":
            matchStatusCard = o.delivery_status === 'delivered' && !o.delivery_completion?.otp_verified && !o.delivery_completion?.destination_photo;
            break;
          case "completed":
            matchStatusCard = o.delivery_status === 'delivered' && (Boolean(o.delivery_completion?.otp_verified) || Boolean(o.delivery_completion?.destination_photo));
            break;
          default:
            matchStatusCard = true;
        }
      }

      // 3. Facet dropdown filters
      const matchSource = sourceFilter === "all" || o.order_source === sourceFilter;
      const matchInward = inwardFilter === "all" || o.inward_status === inwardFilter;
      const matchKitPrep = kitPrepFilter === "all" || o.kit_preparation === kitPrepFilter;
      const matchVehicle = vehicleFilter === "all" || o.vehicle_booking === vehicleFilter;
      const matchDelivery = deliveryFilter === "all" || o.delivery_status === deliveryFilter;
      const matchOverdue =
        overdueFilter === "all" ||
        (overdueFilter === "overdue" && o.overdue_days > 0) ||
        (overdueFilter === "ontime" && o.overdue_days === 0);
      const matchState = stateFilter === "all" || o.state === stateFilter;

      return (
        matchSearch &&
        matchStatusCard &&
        matchSource &&
        matchInward &&
        matchKitPrep &&
        matchVehicle &&
        matchDelivery &&
        matchOverdue &&
        matchState
      );
    });
  }, [
    orders,
    search,
    selectedStatusFilter,
    sourceFilter,
    inwardFilter,
    kitPrepFilter,
    vehicleFilter,
    deliveryFilter,
    overdueFilter,
    stateFilter
  ]);

  return (
    <div id="master-order-tracking" className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaTable className="text-primary text-xl" />
            <span>Master Order Tracking Table</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {filteredOrders.length} of {orders.length} Orders
            </span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Unified end-to-end logistics tracking table. Multi-facet filters, status indicators, and one-click order dossier inspection.
          </p>
        </div>

        {selectedStatusFilter && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold border border-primary/20">
              Filtered: {selectedStatusFilter.replace(/_/g, " ").toUpperCase()}
            </span>
            <button
              onClick={onClearStatusFilter}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-text-secondary/10 hover:bg-text-secondary/20 text-text-primary transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Primary Search & Quick Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, kit model, district..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-border bg-bg/50 focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
          />
        </div>

        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors self-start sm:self-auto ${
            showAdvancedFilters
              ? "bg-primary text-white border-primary"
              : "bg-bg border-border text-text-secondary hover:text-text-primary"
          }`}
        >
          <FaSlidersH className="w-3.5 h-3.5" />
          <span>{showAdvancedFilters ? "Hide Filters" : "15-Facet Filters"}</span>
        </button>
      </div>

      {/* Advanced Filter Bar */}
      {showAdvancedFilters && (
        <div className="p-4 rounded-xl border border-border bg-bg/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 transition-all animate-fadeIn">
          {/* Order Source */}
          <div>
            <label className="text-[10px] font-bold uppercase text-text-secondary">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full mt-1 p-1.5 rounded-lg text-xs border border-border bg-bg text-text-primary focus:outline-none"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Inward Status */}
          <div>
            <label className="text-[10px] font-bold uppercase text-text-secondary">Inward</label>
            <select
              value={inwardFilter}
              onChange={(e) => setInwardFilter(e.target.value)}
              className="w-full mt-1 p-1.5 rounded-lg text-xs border border-border bg-bg text-text-primary focus:outline-none"
            >
              <option value="all">All Inward</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Kit Prep */}
          <div>
            <label className="text-[10px] font-bold uppercase text-text-secondary">Kit Prep</label>
            <select
              value={kitPrepFilter}
              onChange={(e) => setKitPrepFilter(e.target.value)}
              className="w-full mt-1 p-1.5 rounded-lg text-xs border border-border bg-bg text-text-primary focus:outline-none"
            >
              <option value="all">All Kit Status</option>
              <option value="Ready">Ready</option>
              <option value="In Progress">In Progress</option>
              <option value="Awaiting Components">Awaiting Components</option>
            </select>
          </div>

          {/* Vehicle Booking */}
          <div>
            <label className="text-[10px] font-bold uppercase text-text-secondary">Vehicle Booking</label>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full mt-1 p-1.5 rounded-lg text-xs border border-border bg-bg text-text-primary focus:outline-none"
            >
              <option value="all">All Transport</option>
              <option value="Booked">Booked</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>

          {/* Overdue Status */}
          <div>
            <label className="text-[10px] font-bold uppercase text-text-secondary">Overdue / SLA</label>
            <select
              value={overdueFilter}
              onChange={(e) => setOverdueFilter(e.target.value)}
              className="w-full mt-1 p-1.5 rounded-lg text-xs border border-border bg-bg text-text-primary focus:outline-none"
            >
              <option value="all">All SLAs</option>
              <option value="overdue">Overdue Only</option>
              <option value="ontime">Within SLA</option>
            </select>
          </div>

          {/* State */}
          <div>
            <label className="text-[10px] font-bold uppercase text-text-secondary">State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full mt-1 p-1.5 rounded-lg text-xs border border-border bg-bg text-text-primary focus:outline-none"
            >
              <option value="all">All States</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Master Orders Table */}
      <div className="overflow-x-auto rounded-xl border border-border max-h-[500px] scrollbar-hover">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-bg/90 sticky top-0 z-10 border-b border-border text-text-secondary uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-3 px-3">Order Number</th>
              <th className="py-3 px-3">Customer</th>
              <th className="py-3 px-3">Source</th>
              <th className="py-3 px-3">Kit Details</th>
              <th className="py-3 px-3">Warehouse</th>
              <th className="py-3 px-3 text-center">Inward</th>
              <th className="py-3 px-3 text-center">Kit Prep</th>
              <th className="py-3 px-3 text-center">Vehicle</th>
              <th className="py-3 px-3 text-center">Delivery</th>
              <th className="py-3 px-3 text-center">Delay SLA</th>
              <th className="py-3 px-3">Next Action</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-text-muted text-xs">
                  No orders found matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                const isOverdue = ord.overdue_days > 0;
                return (
                  <tr
                    key={ord._id}
                    className="hover:bg-primary/5 transition-colors duration-150"
                  >
                    <td className="py-3 px-3 font-bold text-primary font-mono whitespace-nowrap">
                      {ord.order_number}
                    </td>
                    <td className="py-3 px-3 max-w-[150px]">
                      <div className="font-semibold text-text-primary truncate">{ord.customer_name}</div>
                      <div className="text-[10px] text-text-muted truncate">{ord.district}, {ord.state}</div>
                    </td>
                    <td className="py-3 px-3 text-text-secondary text-[11px] whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-bg border border-border">
                        {ord.order_source}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-[160px]">
                      <div className="font-semibold text-text-primary truncate">{ord.kit_type}</div>
                      <div className="text-[10px] text-text-muted">{ord.num_kits} Sets ({ord.system_capacity})</div>
                    </td>
                    <td className="py-3 px-3 text-text-secondary text-[11px] whitespace-nowrap">
                      {ord.warehouse_code}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          ord.inward_status === "Completed"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-300"
                            : ord.inward_status === "Partial"
                            ? "bg-amber-500/15 text-amber-600 border border-amber-300"
                            : "bg-blue-500/15 text-blue-600 border border-blue-300"
                        }`}
                      >
                        {ord.inward_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          ord.kit_preparation === "Ready"
                            ? "bg-blue-600 text-white"
                            : ord.kit_preparation === "In Progress"
                            ? "bg-cyan-500/15 text-cyan-600 border border-cyan-300"
                            : "bg-amber-500/15 text-amber-600 border border-amber-300"
                        }`}
                      >
                        {ord.kit_preparation}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.vehicle_booking === "Booked" || ord.vehicle_booking === "Confirmed"
                            ? "bg-teal-500/15 text-teal-600 border border-teal-300"
                            : "bg-amber-500/15 text-amber-600 border border-amber-300"
                        }`}
                      >
                        {ord.vehicle_booking}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          ord.delivery_status === "delivered"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-300"
                            : ord.delivery_status === "in_transit"
                            ? "bg-cyan-500/15 text-cyan-600 border border-cyan-300"
                            : "bg-purple-500/15 text-purple-600 border border-purple-300"
                        }`}
                      >
                        {ord.delivery_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isOverdue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 border border-rose-300">
                          Overdue ({ord.overdue_days}d)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600">
                          On Time
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-text-secondary text-[11px] max-w-[180px] truncate">
                      {ord.next_action}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectOrder && onSelectOrder(ord)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary text-white hover:bg-primary-hover shadow-sm transition-all"
                      >
                        View / Manage
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

