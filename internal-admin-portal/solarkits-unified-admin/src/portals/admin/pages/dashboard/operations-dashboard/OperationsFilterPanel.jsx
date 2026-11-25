/**
 * OperationsFilterPanel.jsx
 * Global Multi-Dimension Filter Bar for Operations Dashboard
 */

import React, { useState } from 'react';
import { FiFilter, FiRotateCcw, FiDownload, FiChevronDown, FiChevronUp } from 'react-icons/fi';

export default function OperationsFilterPanel({
  filters,
  setFilter,
  resetFilters,
  states = [],
  districts = [],
  warehouses = [],
  suppliers = [],
  franchisees = [],
  kits = [],
  onExportCsv,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-surface rounded-2xl border border-border p-4 shadow-sm space-y-4">
      {/* Top Filter Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <FiFilter size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Global Operations Filters</h3>
            <p className="text-xs text-text-muted">Dynamic cross-module operational filtering</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-border text-text hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <FiRotateCcw size={13} />
            Reset
          </button>

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary text-text-inverse hover:bg-primary-hover shadow-sm transition-colors cursor-pointer"
            >
              <FiDownload size={13} />
              Export Records
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl bg-surface-subtle text-text hover:bg-border transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Less Filters' : 'All Filters'}</span>
            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Row 1: Primary Dimensions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Date Range */}
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilter('dateRange', e.target.value)}
            className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Order Source */}
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Order Source
          </label>
          <select
            value={filters.orderSource}
            onChange={(e) => setFilter('orderSource', e.target.value)}
            className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Sources</option>
            <option value="Solar EPC">Solar EPC</option>
            <option value="Franchisee">Franchisee Store</option>
            <option value="Company Store">Company Store</option>
            <option value="BDE">BDE Assisted</option>
            <option value="Director Store">Director Store</option>
          </select>
        </div>

        {/* Order Type */}
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Order Type
          </label>
          <select
            value={filters.orderType}
            onChange={(e) => setFilter('orderType', e.target.value)}
            className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Order Types</option>
            <option value="Loose Quantity">Loose Quantity</option>
            <option value="PO Order">PO Order (Combo)</option>
          </select>
        </div>

        {/* Kit Type */}
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Kit Type
          </label>
          <select
            value={filters.kitType}
            onChange={(e) => setFilter('kitType', e.target.value)}
            className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Kit Capacities</option>
            <option value="1 kW">1 kW</option>
            <option value="2 kW">2 kW</option>
            <option value="3 kW">3 kW</option>
            <option value="5 kW">5 kW</option>
            <option value="10 kW">10 kW</option>
            {kits.map((k) => (
              <option key={k._id || k.id || k.name} value={k.name || k.title}>
                {k.name || k.title}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            State
          </label>
          <select
            value={filters.state}
            onChange={(e) => setFilter('state', e.target.value)}
            className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All States</option>
            {states.map((st) => (
              <option key={st._id || st.id || st.name} value={st.name || st.state_name}>
                {st.name || st.state_name}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            District
          </label>
          <select
            value={filters.district}
            onChange={(e) => setFilter('district', e.target.value)}
            disabled={filters.state === 'all'}
            className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="all">All Districts</option>
            {districts.map((dist) => (
              <option key={dist._id || dist.id || dist.name} value={dist.name || dist.district_name}>
                {dist.name || dist.district_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Secondary / Operational Extended Filters */}
      {isExpanded && (
        <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-fadeIn">
          {/* Pincode */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Pincode
            </label>
            <input
              type="text"
              placeholder="e.g. 302001"
              value={filters.pincode}
              onChange={(e) => setFilter('pincode', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Supplier
            </label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilter('supplier', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s._id || s.id || s.name} value={s.company_name || s.name}>
                  {s.company_name || s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Warehouse
            </label>
            <select
              value={filters.warehouse}
              onChange={(e) => setFilter('warehouse', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w._id || w.id || w.warehouse_name} value={w.warehouse_name || w.name}>
                  {w.warehouse_name || w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Franchisee */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Franchisee
            </label>
            <select
              value={filters.franchisee}
              onChange={(e) => setFilter('franchisee', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Franchisees</option>
              {franchisees.map((f) => (
                <option key={f._id || f.id || f.company_name} value={f.company_name || f.store_name || f.name}>
                  {f.company_name || f.store_name || f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Payment Status
            </label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilter('paymentStatus', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Fully Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="credit">Credit / Wallet</option>
            </select>
          </div>

          {/* Overdue Status */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Overdue Status
            </label>
            <select
              value={filters.overdueStatus}
              onChange={(e) => setFilter('overdueStatus', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Records</option>
              <option value="overdue_only">Overdue Only (&gt; TAT)</option>
              <option value="within_tat">Within TAT Only</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

