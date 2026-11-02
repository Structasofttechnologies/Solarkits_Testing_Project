/**
 * EpcFilterPanel.jsx
 * Filter Controls for EPC Behavior Analytics Dashboard
 */

import React from 'react';
import { FiFilter, FiRotateCcw, FiDownload, FiSearch } from 'react-icons/fi';

export default function EpcFilterPanel({
  filters,
  setFilter,
  resetFilters,
  states = [],
  kitTypes = [],
  onExportCsv,
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
      {/* Top Title & Quick Reset */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <FiFilter className="text-primary text-sm" />
          <span className="text-xs font-bold text-text uppercase tracking-wider">
            Behavior & Attribution Filters
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <FiRotateCcw size={12} />
            <span>Reset All</span>
          </button>
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <FiDownload size={12} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
        {/* Date Horizon */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-text-muted">Time Horizon</label>
          <select
            value={filters.dateRange || 'last_30_days'}
            onChange={(e) => setFilter('dateRange', e.target.value)}
            className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days (Standard)</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="all">All Time History</option>
          </select>
        </div>

        {/* State */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-text-muted">State</label>
          <select
            value={filters.state || 'all'}
            onChange={(e) => setFilter('state', e.target.value)}
            className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
          >
            <option value="all">All States</option>
            {states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Kit Type */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-text-muted">Kit Type</label>
          <select
            value={filters.kitType || 'all'}
            onChange={(e) => setFilter('kitType', e.target.value)}
            className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
          >
            <option value="all">All Kit Capacities</option>
            {kitTypes.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {/* Order Type */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-text-muted">Order Type</label>
          <select
            value={filters.orderType || 'all'}
            onChange={(e) => setFilter('orderType', e.target.value)}
            className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
          >
            <option value="all">All Order Types</option>
            <option value="po_order">PO Order (Bulk)</option>
            <option value="loose_order">Loose Quantity (Components)</option>
            <option value="combo_kit">Combo Kit Package</option>
          </select>
        </div>

        {/* Customer Type */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-text-muted">Customer Type</label>
          <select
            value={filters.customerType || 'all'}
            onChange={(e) => setFilter('customerType', e.target.value)}
            className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary"
          >
            <option value="all">All Customer Types</option>
            <option value="Tier 1 Enterprise EPC">Tier 1 Enterprise EPC</option>
            <option value="Registered Solar EPC Installer">Registered Solar EPC</option>
            <option value="Franchisee Direct Store">Franchisee Store</option>
            <option value="Micro-Installer">Micro-Installer</option>
            <option value="Retail">Retail User</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-text-muted">Search EPC / Location</label>
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-2.5 text-text-muted text-xs" />
            <input
              type="text"
              placeholder="Company, name, district..."
              value={filters.search || ''}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-bg text-text rounded-xl border border-border focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

