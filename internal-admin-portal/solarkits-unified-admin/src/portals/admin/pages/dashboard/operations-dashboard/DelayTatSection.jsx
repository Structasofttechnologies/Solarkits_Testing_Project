/**
 * DelayTatSection.jsx
 * Operational Monitoring: Delay, Overdue & TAT Section
 * Strictly separates "Total overdue orders" from "Total overdue operational stages".
 */

import React, { useState } from 'react';
import {
  FiAlertTriangle,
  FiClock,
  FiAlertCircle,
  FiUserCheck,
  FiTruck,
  FiPackage,
  FiCheckCircle,
  FiSearch,
} from 'react-icons/fi';
import { MdOutlinePrecisionManufacturing, MdWarehouse, MdAssignmentLate } from 'react-icons/md';

export default function DelayTatSection({ overdueData, onSelectRecord }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const {
    totalOverdueOrders = 0,
    totalOverdueStages = 0,
    productionOverdue = 0,
    procurementOverdue = 0,
    warehouseInwardOverdue = 0,
    vehicleBookingOverdue = 0,
    dispatchOverdue = 0,
    customerDeliveryOverdue = 0,
    adminApprovalOverdue = 0,
    serviceTicketResolutionOverdue = 0,
    delayedRecords = [],
  } = overdueData || {};

  const filteredRecords = delayedRecords.filter((rec) => {
    const matchesSearch =
      rec.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.responsibleTeam?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'all' || rec.currentStage?.toLowerCase().includes(stageFilter.toLowerCase());
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-4">
      {/* Header with Critical Distinction Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-danger/10 text-danger">
              <FiAlertTriangle size={18} />
            </div>
            <h2 className="text-base font-bold text-text">Delay, Overdue & TAT Monitoring</h2>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time stage breach detection across Procurement, Production, Warehouse & Logistics
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
          <FiAlertCircle size={14} className="shrink-0" />
          <span>Note: Total overdue orders & overdue stages are tracked independently</span>
        </div>
      </div>

      {/* Primary Overdue Metrics — Big Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Overdue Orders (Distinct) */}
        <div className="bg-surface rounded-2xl border border-danger/30 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-danger/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-danger uppercase tracking-wider">Total Overdue Orders</span>
            <div className="p-2 rounded-xl bg-danger/10 text-danger">
              <MdAssignmentLate size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-text">{totalOverdueOrders}</span>
            <span className="text-xs text-text-muted font-medium">distinct orders</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">Orders having &ge; 1 delayed stage</p>
        </div>

        {/* Total Overdue Operational Stages (Cumulative) */}
        <div className="bg-surface rounded-2xl border border-amber-500/30 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Total Overdue Stages
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <FiClock size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-text">{totalOverdueStages}</span>
            <span className="text-xs text-text-muted font-medium">stage bottlenecks</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">Sum of all active stage breaches</p>
        </div>

        {/* Production Overdue */}
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Production Overdue</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
              <MdOutlinePrecisionManufacturing size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-text">{productionOverdue}</span>
            <span className="text-[11px] text-danger font-medium">(&gt; 7 days TAT)</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">OEM / Plant delays</p>
        </div>

        {/* Customer Delivery Overdue */}
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Customer Delivery Overdue</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
              <FiTruck size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-text">{customerDeliveryOverdue}</span>
            <span className="text-[11px] text-danger font-medium">(&gt; 3 days TAT)</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">Transit / Local Hub delay</p>
        </div>
      </div>

      {/* Secondary Stage-Wise Overdue Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface rounded-xl border border-border p-3">
          <span className="text-[11px] text-text-muted font-medium">Procurement Overdue</span>
          <div className="text-lg font-bold text-text mt-1">{procurementOverdue}</div>
          <span className="text-[10px] text-text-muted">Supplier sourcing pending</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3">
          <span className="text-[11px] text-text-muted font-medium">Warehouse Inward</span>
          <div className="text-lg font-bold text-text mt-1">{warehouseInwardOverdue}</div>
          <span className="text-[10px] text-text-muted">GRN & QC awaiting</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3">
          <span className="text-[11px] text-text-muted font-medium">Vehicle Booking</span>
          <div className="text-lg font-bold text-text mt-1">{vehicleBookingOverdue}</div>
          <span className="text-[10px] text-text-muted">Transport unassigned</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3">
          <span className="text-[11px] text-text-muted font-medium">Dispatch Overdue</span>
          <div className="text-lg font-bold text-text mt-1">{dispatchOverdue}</div>
          <span className="text-[10px] text-text-muted">Warehouse dock hold</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3">
          <span className="text-[11px] text-text-muted font-medium">Admin Approval Overdue</span>
          <div className="text-lg font-bold text-text mt-1">{adminApprovalOverdue}</div>
          <span className="text-[10px] text-text-muted">PO / Price margin queue</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3">
          <span className="text-[11px] text-text-muted font-medium">Service Ticket Overdue</span>
          <div className="text-lg font-bold text-text mt-1">{serviceTicketResolutionOverdue}</div>
          <span className="text-[10px] text-text-muted">Replacements pending</span>
        </div>
      </div>

      {/* Delayed Records Data Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-text">Overdue & Delayed Orders Action Queue</h3>
            <p className="text-xs text-text-muted">
              Drill-down into delayed orders with configured TAT, delay days, and responsible team
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-2.5 text-text-muted" size={14} />
              <input
                type="text"
                placeholder="Search order or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-bg text-text focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-56"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="text-xs rounded-xl border border-border bg-bg px-2.5 py-1.5 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Delayed Stages</option>
              <option value="Production">Production</option>
              <option value="Delivery">Delivery</option>
              <option value="PO">PO Approval</option>
              <option value="Inward">Inward</option>
              <option value="Vehicle">Vehicle Booking</option>
              <option value="Service">Service</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer / EPC / Franchisee</th>
                <th className="py-3 px-4">Current Order Stage</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4">Actual Date</th>
                <th className="py-3 px-4">Delay Days</th>
                <th className="py-3 px-4">Responsible Team</th>
                <th className="py-3 px-4">Next Action</th>
                <th className="py-3 px-4">Configured TAT</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-text-muted">
                    No overdue records found matching selected filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.orderNumber}
                    className="hover:bg-surface-subtle transition-colors group cursor-pointer"
                    onClick={() => onSelectRecord && onSelectRecord(rec)}
                  >
                    <td className="py-3 px-4 font-bold text-primary">{rec.orderNumber}</td>
                    <td className="py-3 px-4 font-medium text-text">{rec.customer}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {rec.currentStage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-muted">{rec.expectedCompletionDate}</td>
                    <td className="py-3 px-4">
                      <span className="text-amber-600 font-medium">{rec.actualCompletionDate}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md font-bold bg-danger/10 text-danger">
                        +{rec.delayDays} days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text">{rec.responsibleTeam}</td>
                    <td className="py-3 px-4 text-text-muted max-w-xs truncate" title={rec.nextAction}>
                      {rec.nextAction}
                    </td>
                    <td className="py-3 px-4 font-medium text-text-muted">{rec.configuredTat}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-text-inverse transition-colors cursor-pointer"
                      >
                        Escalate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
