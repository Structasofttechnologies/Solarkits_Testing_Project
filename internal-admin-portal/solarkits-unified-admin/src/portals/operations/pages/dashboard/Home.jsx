import React, { useState, useMemo } from "react";
import { 
  FaHome, FaChartBar, FaBrain, FaWarehouse,
  FaBoxes, FaClock, FaExclamationTriangle, FaTruck, FaCheckCircle, FaClipboardList, FaThermometerHalf
} from "react-icons/fa";
import { MdOutlinePrecisionManufacturing, MdOutlinePendingActions, MdLocalShipping } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user_slice || {});

  // State to simulate changing data or filters
  const [filterRegion, setFilterRegion] = useState("All");

  // Mock data for the dashboard metrics
  const dashboardData = useMemo(() => {
    return {
      orderSummary: {
        totalPending: 48,
        readyForDispatch: 15,
        partiallyDispatched: 8,
        deliveredOrders: 420,
        delayedDeliveries: 4,
        replacementPending: 3,
        repairTicketsOpen: 9,
      },
      materialSummary: {
        totalInwardToday: 1500,
        totalOutwardToday: 820,
        availableStock: 24000,
        reservedStock: 4800,
        damagedStock: 120,
      },
      deliverySummary: {
        scheduledToday: 12,
        vehiclesAssigned: 10,
        outForDelivery: 3,
        deliveredToday: 9,
        avgDeliveryTime: "3.8 Hours",
      },
      alerts: [
        { id: 1, type: "Low Stock Alert", text: "540W Mono panels below safety buffer (Jaipur)", severity: "high" },
        { id: 2, type: "Delayed Supplier Delivery", text: "Waaree bifacial shipment overdue by 48 hrs", severity: "high" },
        { id: 3, type: "Overdue Tickets", text: "Ticket TCK-4001 unassigned > 24 hrs", severity: "medium" },
        { id: 4, type: "Vehicle Capacity Overload", text: "Tata Ace route GJ-01 near maximum payload limit", severity: "low" },
        { id: 5, type: "Pending Dispatch > 48 hrs", text: "Order ORD-9901 warehouse release delayed", severity: "high" },
      ]
    };
  }, []);

  const modules = [
    { name: "Order Fulfillment", desc: "Allocate warehouse releases for customer orders", icon: <FaWarehouse />, path: "/operation-management-panel/order-fulfillment" },
    { name: "Analytics Suite", desc: "Logistics, supply, and partner performance metrics", icon: <FaChartBar />, path: "/operation-management-panel/analytics-suite" },
    { name: "Demand Prediction AI", desc: "Run AI models to predict quarterly panel needs", icon: <FaBrain />, path: "/operation-management-panel/demand-prediction" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Strip */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary shadow-xl p-6 lg:p-8">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Operation Management Dashboard
            </h1>
            <p className="text-white/80 text-sm mt-1 max-w-xl">
              Welcome back, {user?.name || "Operations Manager"}. Monitor logistics routing, delivery pipelines, ticket metrics, and regional stock allocations.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 text-white text-xs font-semibold focus:outline-none backdrop-blur-md cursor-pointer"
            >
              <option className="text-text-primary" value="All">All Operations Hubs</option>
              <option className="text-text-primary" value="North">North Zone</option>
              <option className="text-text-primary" value="West">West Zone</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Widget 1: Order Summary */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 border-b border-border pb-2 uppercase tracking-wider">
            <FaClipboardList className="text-primary" />
            Order Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Total Pending Orders:</span>
              <span className="font-bold text-text-primary">{dashboardData.orderSummary.totalPending}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Ready for Dispatch:</span>
              <span className="font-bold text-success">{dashboardData.orderSummary.readyForDispatch}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Partially Dispatched:</span>
              <span className="font-bold text-warning">{dashboardData.orderSummary.partiallyDispatched}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Delivered Orders:</span>
              <span className="font-bold text-text-primary">{dashboardData.orderSummary.deliveredOrders}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Delayed Deliveries:</span>
              <span className="font-bold text-danger">{dashboardData.orderSummary.delayedDeliveries}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Replacement Pending:</span>
              <span className="font-bold text-warning">{dashboardData.orderSummary.replacementPending}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Repair Tickets Open:</span>
              <span className="font-bold text-danger">{dashboardData.orderSummary.repairTicketsOpen}</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Material Summary */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 border-b border-border pb-2 uppercase tracking-wider">
            <FaBoxes className="text-primary" />
            Material Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Total Inward Today:</span>
              <span className="font-bold text-text-primary">{dashboardData.materialSummary.totalInwardToday} pcs</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Total Outward Today:</span>
              <span className="font-bold text-text-primary">{dashboardData.materialSummary.totalOutwardToday} pcs</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Available Stock:</span>
              <span className="font-bold text-success">{dashboardData.materialSummary.availableStock.toLocaleString()} pcs</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Reserved Stock:</span>
              <span className="font-bold text-primary">{dashboardData.materialSummary.reservedStock.toLocaleString()} pcs</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Damaged Stock:</span>
              <span className="font-bold text-danger">{dashboardData.materialSummary.damagedStock} pcs</span>
            </div>
          </div>
        </div>

        {/* Widget 3: Delivery Summary */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 border-b border-border pb-2 uppercase tracking-wider">
            <FaTruck className="text-primary" />
            Delivery Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Deliveries Scheduled:</span>
              <span className="font-bold text-text-primary">{dashboardData.deliverySummary.scheduledToday}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Vehicles Assigned:</span>
              <span className="font-bold text-text-primary">{dashboardData.deliverySummary.vehiclesAssigned}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Out for Delivery:</span>
              <span className="font-bold text-warning">{dashboardData.deliverySummary.outforDelivery || 3}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Delivered Today:</span>
              <span className="font-bold text-success">{dashboardData.deliverySummary.deliveredToday}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Avg Delivery Duration:</span>
              <span className="font-bold text-text-primary">{dashboardData.deliverySummary.avgDeliveryTime}</span>
            </div>
          </div>
        </div>

        {/* Widget 4: Critical Alerts Panel */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5 border-b border-border pb-2 uppercase tracking-wider">
            <FaExclamationTriangle className="text-danger" />
            Operations Alerts
          </h3>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {dashboardData.alerts.map(a => (
              <div 
                key={a.id} 
                className={`p-2 rounded-lg border text-[10px] leading-relaxed font-semibold ${
                  a.severity === 'high' ? 'bg-danger/10 text-danger border-danger/15' :
                  a.severity === 'medium' ? 'bg-warning/10 text-warning border-warning/15' :
                  'bg-primary/10 text-primary border-primary/15'
                }`}
              >
                <div className="font-bold uppercase">{a.type}</div>
                <p className="mt-0.5">{a.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modules Quick Access Navigation */}
      <div>
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Operations Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(mod => (
            <div 
              key={mod.name}
              onClick={() => navigate(mod.path)}
              className="card p-5 hover:border-primary/45 transition-all cursor-pointer flex items-start gap-4 group"
            >
              <div className="w-10 h-10 rounded-xl gradient-primary text-white flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                {mod.icon}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-text-primary text-sm group-hover:text-primary transition-colors">{mod.name}</h4>
                <p className="text-xs text-text-secondary leading-snug">{mod.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
