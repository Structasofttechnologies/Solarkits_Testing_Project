import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FaSyncAlt,
  FaExclamationTriangle,
  FaShieldAlt,
  FaClock,
  FaBoxes,
  FaCreditCard,
  FaTruck,
  FaCheckCircle,
  FaFileInvoice,
  FaLayerGroup,
  FaUserTie,
  FaBell,
  FaCalendarAlt,
} from "react-icons/fa";

import {
  getAccountDashboardOverview,
  updateDashboardTaskStatus,
} from "../api/accounts";

// Dashboard Subsections
import OrderStatusCards from "../components/dashboard/OrderStatusCards";
import DelayMonitoringSection from "../components/dashboard/DelayMonitoringSection";
import DailyTasksSection from "../components/dashboard/DailyTasksSection";
import ProductionSupplierSection from "../components/dashboard/ProductionSupplierSection";
import PaymentApprovalSection from "../components/dashboard/PaymentApprovalSection";
import ReturnsTicketsSection from "../components/dashboard/ReturnsTicketsSection";
import MasterOrderTrackingTable from "../components/dashboard/MasterOrderTrackingTable";

// Drawers & Action Modals
import OrderDetailDrawer from "../components/dashboard/OrderDetailDrawer";
import TaskActionModal from "../components/dashboard/TaskActionModal";
import TicketReviewModal from "../components/dashboard/TicketReviewModal";

export default function Home() {
  const navigate = useNavigate();
  const { user, selectedScope } = useSelector((state) => state.user_slice || {});
  const clusterName = selectedScope?.clusterName || "Coastal Andhra Hub";
  const userRole = user?.role_name || user?.role || "Account Manager";
  const isSuperAdmin =
    !user?.name ||
    /super\s*admin/i.test(user?.name || "") ||
    /super\s*admin/i.test(userRole || "") ||
    user?.role === "super_admin";
  const greetingName = isSuperAdmin ? "Account Manager" : user.name;

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    order_status_counts: {},
    delay_metrics: {},
    delay_records: [],
    daily_tasks: [],
    production_and_suppliers: { summary: {}, suppliers: [] },
    payment_and_approvals: {},
    returns_and_tickets: {},
    orders: [],
    meta: {},
  });

  // Interactive Filter States
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);

  // Modals & Drawer States
  const [activeOrder, setActiveOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [activeTask, setActiveTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [activeTicket, setActiveTicket] = useState(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Fetch Dashboard Data
  const fetchDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await getAccountDashboardOverview({
        cluster_id: clusterName,
      });
      if (res?.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch account dashboard overview:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clusterName]);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 45s for live operations
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Handle Status Card Selection -> Scroll to table
  const handleSelectStatus = (statusKey) => {
    setSelectedStatusFilter(statusKey);
    if (statusKey) {
      setTimeout(() => {
        const tableEl = document.getElementById("master-order-tracking-table");
        if (tableEl) {
          tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  // Handle Order Selection from any section (Delay, Table, Tasks, etc.)
  const handleViewOrder = (orderOrNumber) => {
    if (typeof orderOrNumber === "string") {
      const found = dashboardData.orders.find(
        (o) => o.order_number === orderOrNumber
      );
      if (found) {
        setActiveOrder(found);
        setIsDrawerOpen(true);
      } else {
        // Filter table to this order
        setSelectedStatusFilter(null);
        handleSelectStatus(null);
      }
    } else {
      setActiveOrder(orderOrNumber);
      setIsDrawerOpen(true);
    }
  };

  // Handle Task Completion / Status Update
  const handleUpdateTaskStatus = async (taskId, newStatus, remarks) => {
    try {
      await updateDashboardTaskStatus(taskId, { status: newStatus, remarks });
      // Update local state immediately
      setDashboardData((prev) => ({
        ...prev,
        daily_tasks: prev.daily_tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, tab: newStatus === "Completed" ? "completed" : t.tab }
            : t
        ),
      }));
      // Trigger sidebar badge refresh
      window.dispatchEvent(new Event("accounts:badge-refresh"));
    } catch (err) {
      console.error("Task status update failed:", err);
    }
  };

  // Handle Quick Task Complete
  const handleQuickCompleteTask = (taskId) => {
    handleUpdateTaskStatus(taskId, "Completed", "Quick-completed from dashboard");
  };

  // Handle Supplier Click -> Filter orders
  const handleSelectSupplier = (supplierName) => {
    setSelectedStatusFilter(null);
    const tableEl = document.getElementById("master-order-tracking-table");
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // High-priority overdue counts
  const overdueAlertsCount =
    (dashboardData.delay_metrics?.overdue_orders || 0) +
    (dashboardData.payment_and_approvals?.payment_related_overdue_orders || 0);

  const urgentApprovalCount =
    (dashboardData.payment_and_approvals?.offline_payments_awaiting_admin_approval || 0) +
    (dashboardData.order_status_counts?.order_approval_pending || 0);

  return (
    <div className="space-y-6 pb-12 w-full max-w-full min-w-0">
      {/* ── 1. Main Overview Header & Greeting Banner ──────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-primary-end rounded-3xl p-5 sm:p-6 text-white shadow-lg border border-white/10 w-full max-w-full">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full font-extrabold backdrop-blur-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Centralized Account Manager Dashboard</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full font-bold">
                Cluster: {clusterName}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-1 truncate">
              Hello, {greetingName}
            </h2>
            <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
              Your real-time operational control panel for order lifecycle tracking, procurement grouping, payment approvals, production progress, and daily priority tasks.
            </p>
          </div>

          {/* Quick Metrics Bar & Refresh Action */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 shrink-0">
              <FaClock className="text-secondary text-sm" />
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-white/70 block">
                  Last Live Sync
                </span>
                <span className="text-xs font-mono font-black text-white">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <button
              onClick={() => fetchDashboard(false)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-2xl bg-white text-primary hover:bg-white/90 active:scale-95 font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              title="Refresh live metrics"
            >
              <FaSyncAlt size={12} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "Refreshing..." : "Sync Live Data"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── High-Priority Critical Alert Ticker (if any overdue) ─────────────── */}
      {overdueAlertsCount > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-red-300 bg-red-50/80 dark:bg-red-950/30 dark:border-red-900/50 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 flex items-center justify-center shrink-0">
              <FaExclamationTriangle size={14} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-red-900 dark:text-red-200">
                Operational Alert: {overdueAlertsCount} Orders & Approvals Exceeding Stage TAT
              </h4>
              <p className="text-[11px] text-red-700/80 dark:text-red-300/80 mt-0.5">
                {urgentApprovalCount} orders awaiting Admin clearance & {dashboardData.delay_metrics?.overdue_orders || 0} overdue stage items require immediate attention.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const delayEl = document.getElementById("delay-monitoring-section");
              if (delayEl) delayEl.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-bold text-red-700 hover:text-red-800 underline shrink-0 px-2 cursor-pointer"
          >
            Review Overdue Queue
          </button>
        </div>
      )}

      {/* ── 2A. Order Status Overview (14 Clickable Status Cards) ────────────── */}
      <section>
        <OrderStatusCards
          counts={dashboardData.order_status_counts}
          selectedStatus={selectedStatusFilter}
          onSelectStatus={handleSelectStatus}
        />
      </section>

      {/* ── 2B. Delay & Overdue Monitoring ──────────────────────────────────── */}
      <section id="delay-monitoring-section">
        <DelayMonitoringSection
          metrics={dashboardData.delay_metrics}
          records={dashboardData.delay_records}
          onSelectOrder={handleViewOrder}
        />
      </section>

      {/* ── 2C. Daily Tasks & Action Required ────────────────────────────────── */}
      <section>
        <DailyTasksSection
          tasks={dashboardData.daily_tasks}
          onOpenTaskAction={(task) => {
            setActiveTask(task);
            setIsTaskModalOpen(true);
          }}
          onQuickCompleteTask={handleQuickCompleteTask}
          onSelectOrder={handleViewOrder}
        />
      </section>

      {/* ── 2D. Production & Supplier Monitoring ────────────────────────────── */}
      <section>
        <ProductionSupplierSection
          summary={dashboardData.production_and_suppliers?.summary}
          suppliers={dashboardData.production_and_suppliers?.suppliers}
          onSelectSupplier={handleSelectSupplier}
        />
      </section>

      {/* ── 2E. Payment & Approval Snapshot ─────────────────────────────────── */}
      <section>
        <PaymentApprovalSection
          data={dashboardData.payment_and_approvals}
          onSelectOrder={handleViewOrder}
        />
      </section>

      {/* ── 2F. Returns & Support Tickets ───────────────────────────────────── */}
      <section>
        <ReturnsTicketsSection
          data={dashboardData.returns_and_tickets}
          onSelectTicket={(ticket) => {
            setActiveTicket(ticket);
            setIsTicketModalOpen(true);
          }}
          onSelectOrder={handleViewOrder}
        />
      </section>

      {/* ── 4. Master Order Tracking Table ───────────────────────────────────── */}
      <section>
        <MasterOrderTrackingTable
          orders={dashboardData.orders}
          selectedStatusFilter={selectedStatusFilter}
          onClearStatusFilter={() => setSelectedStatusFilter(null)}
          onViewOrder={handleViewOrder}
        />
      </section>

      {/* ── Interactive Slide-Out Order Detail Drawer ────────────────────────── */}
      <OrderDetailDrawer
        order={activeOrder}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setActiveOrder(null);
        }}
      />

      {/* ── Task Action Modal ────────────────────────────────────────────────── */}
      <TaskActionModal
        task={activeTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setActiveTask(null);
        }}
        onSubmitStatus={handleUpdateTaskStatus}
      />

      {/* ── Ticket Review Modal ──────────────────────────────────────────────── */}
      <TicketReviewModal
        ticket={activeTicket}
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setActiveTicket(null);
        }}
        onActionComplete={(ticketNumber, actionType, remarks) => {
          // Update local ticket list
          setDashboardData((prev) => ({
            ...prev,
            returns_and_tickets: {
              ...prev.returns_and_tickets,
              tickets: (prev.returns_and_tickets?.tickets || []).map((tk) =>
                tk.ticket_number === ticketNumber
                  ? { ...tk, current_status: `${actionType} Completed` }
                  : tk
              ),
            },
          }));
        }}
      />
    </div>
  );
}
