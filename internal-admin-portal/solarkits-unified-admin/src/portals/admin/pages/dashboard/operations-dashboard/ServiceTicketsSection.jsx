/**
 * ServiceTicketsSection.jsx
 * Section G: Service & Replacement Ticket Monitoring
 * Covers ticket states, return pickup, replacement dispatch, resolution TAT, and filtering.
 */

import React, { useState } from 'react';
import {
  FiRotateCcw,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiFilter,
  FiPackage,
  FiDollarSign,
  FiTool,
} from 'react-icons/fi';

export default function ServiceTicketsSection({ serviceData = {}, onSelectTicket }) {
  const {
    totalTickets = 0,
    openTickets = 0,
    newTickets = 0,
    replacementRequests = 0,
    returnPickupPending = 0,
    replacementDispatchPending = 0,
    refundPending = 0,
    resolvedTickets = 0,
    ticketsOverdue = 0,
    avgResolutionTimeDays = 2.8,
    resolutionTatCompliancePct = '89.4%',
    ticketList = [],
  } = serviceData;

  const [filterType, setFilterType] = useState('all');

  const filteredTickets = ticketList.filter((t) => {
    if (filterType === 'all') return true;
    if (filterType === 'replacement') return t.type?.toLowerCase().includes('replace');
    if (filterType === 'overdue') return t.isOverdue;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
            <FiRotateCcw size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Service & Replacement Ticket Monitoring</h2>
            <p className="text-xs text-text-muted">
              Reverse logistics, defective item replacements, warranty claims, and resolution TAT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-muted">Resolution TAT Compliance:</span>
          <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            {resolutionTatCompliancePct}
          </span>
          <span className="text-text-muted font-medium ml-1">Avg: <b>{avgResolutionTimeDays} days</b></span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2.5">
        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Total Tickets</span>
          <div className="text-lg font-black text-text mt-0.5">{totalTickets}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-600">Open Tickets</span>
          <div className="text-lg font-black text-blue-600 mt-0.5">{openTickets}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-600">New Tickets</span>
          <div className="text-lg font-black text-purple-600 mt-0.5">{newTickets}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-600">Replacement Req.</span>
          <div className="text-lg font-black text-amber-600 mt-0.5">{replacementRequests}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-indigo-600">Return Pickup</span>
          <div className="text-lg font-black text-indigo-600 mt-0.5">{returnPickupPending}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-cyan-600">Dispatch Pending</span>
          <div className="text-lg font-black text-cyan-600 mt-0.5">{replacementDispatchPending}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-orange-600">Refund Pending</span>
          <div className="text-lg font-black text-orange-600 mt-0.5">{refundPending}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600">Resolved</span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">{resolvedTickets}</div>
        </div>

        <div className="bg-surface rounded-xl border border-danger/30 p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-danger">Overdue TAT</span>
          <div className="text-lg font-black text-danger mt-0.5">{ticketsOverdue}</div>
        </div>
      </div>

      {/* Ticket List Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-text">Service & Replacement Worklist</h3>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-primary text-text-inverse' : 'bg-surface-subtle text-text hover:bg-border'
              }`}
            >
              All Tickets
            </button>
            <button
              type="button"
              onClick={() => setFilterType('replacement')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'replacement'
                  ? 'bg-primary text-text-inverse'
                  : 'bg-surface-subtle text-text hover:bg-border'
              }`}
            >
              Replacements Only
            </button>
            <button
              type="button"
              onClick={() => setFilterType('overdue')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'overdue' ? 'bg-danger text-white' : 'bg-surface-subtle text-text hover:bg-border'
              }`}
            >
              Overdue Only
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Ticket ID</th>
                <th className="py-2.5 px-4">Customer / EPC</th>
                <th className="py-2.5 px-4">Kit / Component</th>
                <th className="py-2.5 px-4">Issue Description</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-4">Current Status</th>
                <th className="py-2.5 px-4">Age / TAT</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTickets.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-surface-subtle transition-colors cursor-pointer"
                  onClick={() => onSelectTicket && onSelectTicket(t)}
                >
                  <td className="py-2.5 px-4 font-bold text-primary">{t.id}</td>
                  <td className="py-2.5 px-4 font-medium text-text">{t.customer}</td>
                  <td className="py-2.5 px-4 text-text">{t.product}</td>
                  <td className="py-2.5 px-4 text-text-muted truncate max-w-xs">{t.issueType}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-md font-semibold bg-surface-subtle text-text">
                      {t.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-text-muted">{t.state}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={t.isOverdue ? 'text-danger font-bold' : 'text-text font-medium'}>
                      {t.daysOpen}d / {t.tatDays}d
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-surface border border-border text-text hover:bg-primary hover:text-text-inverse transition-colors cursor-pointer"
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

