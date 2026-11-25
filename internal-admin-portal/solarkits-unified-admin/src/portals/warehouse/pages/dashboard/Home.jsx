import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  getWarehouseDashboardOverview,
  updateWarehouseDashboardTaskStatus
} from "../../api/deliveryOrders";

// Dashboard Sub-Sections
import WarehouseHeroHeader from "../../components/dashboard/WarehouseHeroHeader";
import OrderStatusOverviewSection from "../../components/dashboard/OrderStatusOverviewSection";
import WarehouseInwardSection from "../../components/dashboard/WarehouseInwardSection";
import KitPreparationSection from "../../components/dashboard/KitPreparationSection";
import VehicleBookingSection from "../../components/dashboard/VehicleBookingSection";
import DispatchTrackingSection from "../../components/dashboard/DispatchTrackingSection";
import ServiceTicketsSection from "../../components/dashboard/ServiceTicketsSection";
import DelayMonitoringSection from "../../components/dashboard/DelayMonitoringSection";
import DailyTasksSection from "../../components/dashboard/DailyTasksSection";
import MasterOrderTrackingTable from "../../components/dashboard/MasterOrderTrackingTable";
import OrderActionDrawer from "../../components/dashboard/OrderActionDrawer";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user_slice || {});

  // Dashboard Live State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warehouseMode, setWarehouseMode] = useState(
    localStorage.getItem("warehouseMode") || "master"
  );

  const [dashboardData, setDashboardData] = useState({
    order_status_counts: {},
    warehouse_inward_monitoring: { summary: {}, table: [] },
    kit_preparation_monitoring: { summary: {}, records: [] },
    vehicle_booking_monitoring: { summary: {}, table: [] },
    dispatch_delivery_tracking: { summary: {}, table: [] },
    service_returns_tickets: { summary: {}, table: [] },
    delay_metrics: {},
    delay_records: [],
    daily_tasks: [],
    master_orders: [],
    meta: {}
  });

  // Interactive Filter States
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);

  // Drawer States
  const [activeOrder, setActiveOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch Live Real Data from Backend
  const fetchDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await getWarehouseDashboardOverview({
        warehouse_mode: warehouseMode
      });
      if (res?.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch warehouse dashboard overview:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [warehouseMode]);

  useEffect(() => {
    fetchDashboard();

    // Auto-sync every 40s to keep warehouse operators aligned with real-time operations
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 40000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Real-time Event Listeners across Warehouse Workstations
  useEffect(() => {
    const handleOrdersUpdated = () => fetchDashboard(true);
    const handleInventoryUpdated = () => fetchDashboard(true);

    window.addEventListener("deliveryOrdersUpdated", handleOrdersUpdated);
    window.addEventListener("warehouseInventoryUpdated", handleInventoryUpdated);

    return () => {
      window.removeEventListener("deliveryOrdersUpdated", handleOrdersUpdated);
      window.removeEventListener("warehouseInventoryUpdated", handleInventoryUpdated);
    };
  }, [fetchDashboard]);

  // Handle Mode Change
  const handleWarehouseModeChange = (mode) => {
    localStorage.setItem("warehouseMode", mode);
    setWarehouseMode(mode);
    window.dispatchEvent(new Event("warehouseModeChanged"));
  };

  // Status Card Drill-Down Click Handler
  const handleSelectStatus = (statusKey) => {
    setSelectedStatusFilter(statusKey);
    // Smooth scroll down to Master Order Tracking Table
    const tableElem = document.getElementById("master-order-tracking");
    if (tableElem) {
      tableElem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handle Order Selection for Drawer
  const handleSelectOrder = (order) => {
    if (typeof order === "string") {
      const match = dashboardData.master_orders.find(
        (o) => o.order_number === order
      );
      if (match) {
        setActiveOrder(match);
        setIsDrawerOpen(true);
      }
    } else {
      setActiveOrder(order);
      setIsDrawerOpen(true);
    }
  };

  // Handle Daily Task Status Update
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await updateWarehouseDashboardTaskStatus(taskId, { status: newStatus });
      // Optimistic state update
      setDashboardData((prev) => ({
        ...prev,
        daily_tasks: prev.daily_tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      }));
    } catch (err) {
      console.warn("Failed to update task status:", err);
    }
  };

  // Handle Task Action Click
  const handleTaskAction = (task) => {
    if (task.action_type === "receive_goods") {
      navigate("/warehouse-management-panel/material-inward");
    } else if (task.action_type === "assemble_kit") {
      navigate("/warehouse-management-panel/bos-kit-assembly");
    } else if (task.action_type === "book_vehicle" || task.action_type === "dispatch_order") {
      navigate("/warehouse-management-panel/out-for-delivery");
    } else if (task.action_type === "upload_pod") {
      navigate("/warehouse-management-panel/track-delivery");
    } else if (task.action_type === "process_ticket") {
      navigate("/warehouse-management-panel/repair-tickets");
    } else {
      handleSelectOrder(task.order_number);
    }
  };

  return (
    <div className="min-h-screen space-y-6 pb-12">
      {/* 1. Main Hero Header with Live Metrics & Warehouse Mode */}
      <WarehouseHeroHeader
        meta={{
          ...dashboardData.meta,
          manager_name:
            (!user?.name || /super\s*admin/i.test(user?.name) || user?.role === "super_admin" || /super\s*admin/i.test(dashboardData.meta?.manager_name || ""))
              ? "Delivery Manager"
              : (user?.name || dashboardData.meta?.manager_name || "Delivery Manager")
        }}
        refreshing={refreshing}
        onRefresh={() => fetchDashboard(false)}
        totalOrders={dashboardData.master_orders.length}
        warehouseMode={warehouseMode}
        onModeChange={handleWarehouseModeChange}
      />

      {/* 2. Primary Action Queue: Daily Tasks & Action Required */}
      <DailyTasksSection
        tasks={dashboardData.daily_tasks}
        onUpdateStatus={handleUpdateTaskStatus}
        onTaskAction={handleTaskAction}
      />

      {/* 3. Section A: Order Status Overview Grid (18 Clickable Status Workstations) */}
      <OrderStatusOverviewSection
        counts={dashboardData.order_status_counts}
        selectedStatus={selectedStatusFilter}
        onSelectStatus={handleSelectStatus}
      />

      {/* 4. Section 3: Delay & Overdue SLA Monitoring (10 Categories) */}
      <DelayMonitoringSection
        metrics={dashboardData.delay_metrics}
        records={dashboardData.delay_records}
        onSelectOrder={handleSelectOrder}
      />

      {/* 5. Section B: Warehouse Inward & Supplier Goods Monitoring */}
      <WarehouseInwardSection
        data={dashboardData.warehouse_inward_monitoring}
        onSelectOrder={handleSelectOrder}
        onReceiveGoods={(row) => navigate("/warehouse-management-panel/material-inward")}
      />

      {/* 6. Section C: Kit Preparation & Inventory Allocation (BOSKIT / ComboKit) */}
      <KitPreparationSection
        data={dashboardData.kit_preparation_monitoring}
        onSelectOrder={handleSelectOrder}
        onAllocateStock={() => navigate("/warehouse-management-panel/bos-kit-assembly")}
        onStartAssembly={() => navigate("/warehouse-management-panel/bos-kit-assembly")}
      />

      {/* 7. Section D: Vehicle Booking & Delivery Charge Benchmark Approval */}
      <VehicleBookingSection
        data={dashboardData.vehicle_booking_monitoring}
        onSelectOrder={handleSelectOrder}
        onBookVehicle={() => navigate("/warehouse-management-panel/out-for-delivery")}
      />

      {/* 8. Section E: Dispatch & Delivery Tracking */}
      <DispatchTrackingSection
        data={dashboardData.dispatch_delivery_tracking}
        onSelectOrder={handleSelectOrder}
        onTrackOrder={() => navigate("/warehouse-management-panel/track-delivery")}
      />

      {/* 9. Section F: Service, Returns & Replacement Tickets */}
      <ServiceTicketsSection
        data={dashboardData.service_returns_tickets}
        onSelectTicket={(tck) => {
          if (tck.ticket_type === "Replacement") {
            navigate("/warehouse-management-panel/product-replacement");
          } else {
            navigate("/warehouse-management-panel/repair-tickets");
          }
        }}
      />

      {/* 10. Section 6: Master Order Tracking Table with 15-Facet Filters */}
      <MasterOrderTrackingTable
        orders={dashboardData.master_orders}
        selectedStatusFilter={selectedStatusFilter}
        onClearStatusFilter={() => setSelectedStatusFilter(null)}
        onSelectOrder={handleSelectOrder}
      />

      {/* Slide-Over Order Action & Inspection Drawer */}
      <OrderActionDrawer
        isOpen={isDrawerOpen}
        order={activeOrder}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
