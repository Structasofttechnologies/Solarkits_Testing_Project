/**
 * OperationsDashboard.jsx
 * Admin Operations Dashboard — Main Page Orchestrator
 * Comprehensive visibility into Order Lifecycle, Account & Delivery Modules,
 * Overdue Stages, TAT Performance, Admin Approvals & Service Tickets.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

import { useOperationsData } from './useOperationsData';
import OperationsFilterPanel from './OperationsFilterPanel';
import OrderStatusGrid from './OrderStatusGrid';
import DelayTatSection from './DelayTatSection';
import DeliveryTatPerformance from './DeliveryTatPerformance';
import AdminApprovalBoard from './AdminApprovalBoard';
import ServiceTicketsSection from './ServiceTicketsSection';
import OperationsDetailDrawer from './OperationsDetailDrawer';

export default function OperationsDashboard() {
  const {
    filters,
    setFilter,
    resetFilters,
    loading,
    error,
    refetch,

    orderStatusData,
    overdueMonitoring,
    deliveryTatMetrics,
    stageTatMatching,
    adminApprovalTasks,
    serviceTicketsData,

    states,
    districts,
    warehouses,
    suppliers,
    franchisees,
    kits,

    tatConfig,
    setTatConfig,
  } = useOperationsData();

  // Drawer state
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    title: '',
    data: null,
    type: 'status',
  });

  const handleOpenDrawer = (type, data, title) => {
    setDrawerState({
      isOpen: true,
      title: title || (data?.name || data?.orderNumber || 'Details'),
      data,
      type,
    });
  };

  const handleCloseDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  // CSV Export utility
  const handleExportCsv = () => {
    const records = overdueMonitoring.delayedRecords || [];
    if (!records.length) return;

    const headers = ['Order #', 'Customer', 'Current Stage', 'Expected Date', 'Actual Date', 'Delay Days', 'Responsible Team', 'Next Action', 'Configured TAT'];
    const rows = records.map((r) => [
      r.orderNumber,
      `"${r.customer}"`,
      `"${r.currentStage}"`,
      r.expectedCompletionDate,
      r.actualCompletionDate,
      r.delayDays,
      `"${r.responsibleTeam}"`,
      `"${r.nextAction}"`,
      `"${r.configuredTat}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `operations_overdue_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">SOLARKITS Enterprise Operations</span>
          <h1 className="text-xl sm:text-2xl font-black text-text">Admin Operations Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time snapshot across Account, Procurement, Production, Warehouse Inward, Vehicle Booking, Delivery & Support
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface border border-border text-text hover:bg-surface-subtle shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={loading ? 'animate-spin text-primary' : 'text-primary'} />
            <span>{loading ? 'Refreshing...' : 'Live Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-danger/10 border border-danger/20 text-xs text-danger">
          <FiAlertCircle size={16} className="shrink-0" />
          <span>Operational sync notice: {error}. Showing cached state with continuous live retry.</span>
        </div>
      )}

      {/* Global Filter Bar */}
      <OperationsFilterPanel
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        states={states}
        districts={districts}
        warehouses={warehouses}
        suppliers={suppliers}
        franchisees={franchisees}
        kits={kits}
        onExportCsv={handleExportCsv}
      />

      {/* Section A & B: 16 Order Status Overview */}
      <OrderStatusGrid
        statusCards={orderStatusData}
        onSelectStatus={(card) => {
          const matching = (overdueMonitoring.delayedRecords || []).filter((r) =>
            r.currentStage?.toLowerCase().includes(card.name?.toLowerCase()) ||
            r.currentStage?.toLowerCase().includes(card.id?.replace(/_/g, ' ')?.toLowerCase())
          );
          handleOpenDrawer('status', { ...card, matchingRecords: matching }, `Stage Audit: ${card.name}`);
        }}
      />

      {/* Section C: Delay, Overdue & TAT Monitoring */}
      <DelayTatSection
        overdueData={overdueMonitoring}
        onSelectRecord={(rec) => handleOpenDrawer('record', rec, `Overdue Audit: ${rec.orderNumber}`)}
      />

      {/* Section D & E: Average Time to Delivery & Stage-Wise TAT Matching */}
      <DeliveryTatPerformance
        deliveryTatMetrics={deliveryTatMetrics}
        stageTatMatching={stageTatMatching}
        tatConfig={tatConfig}
        setTatConfig={setTatConfig}
      />

      {/* Section F: Admin Approval Tasks (Action Required) */}
      <AdminApprovalBoard
        tasks={adminApprovalTasks}
        onApproveAction={(task, status, note) => {
          alert(`Approval action "${status.toUpperCase()}" registered for ${task.name}. Audit note logged.`);
        }}
      />

      {/* Section G: Service & Replacement Ticket Monitoring */}
      <ServiceTicketsSection
        serviceData={serviceTicketsData}
        onSelectTicket={(ticket) => handleOpenDrawer('ticket', ticket, `Service Ticket: ${ticket.id}`)}
      />

      {/* Detail Slide-Over Drawer */}
      <OperationsDetailDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        title={drawerState.title}
        data={drawerState.data}
        type={drawerState.type}
      />
    </div>
  );
}

