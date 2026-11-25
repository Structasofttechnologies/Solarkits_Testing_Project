/**
 * StoreFilterPanel.jsx
 * Global Store Filters for Store & Market Analytics Dashboard
 */

import React, { useState } from 'react';
import { FiFilter, FiRotateCcw, FiDownload, FiChevronDown, FiChevronUp } from 'react-icons/fi';

export default function StoreFilterPanel({
  filters,
  setFilter,
  resetFilters,
  states = [],
  districts = [],
  kits = [],
  bdeList = [],
  onExportCsv,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-surface rounded-2xl border border-border p-4 shadow-sm space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <FiFilter size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Global Store & Market Filters</h3>
            <p className="text-xs text-text-muted">
              Filter kit sales, geographic demand, EPC cohorts, and conversion ratios
            </p>
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
              Export Analytics
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl bg-surface-subtle text-text hover:bg-border transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Less Filters' : 'All 16 Dimensions'}</span>
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
            <option value="month">Current Month</option>
            <option value="quarter">This Quarter</option>
            <option value="custom">Custom Date Range</option>
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
            {districts.map((d) => (
              <option key={d._id || d.id || d.name} value={d.name || d.district_name}>
                {d.name || d.district_name}
              </option>
            ))}
          </select>
        </div>

        {/* Kit Type */}
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Kit Capacity / Type
          </label>
          <select
            value={filters.kitType}
            onChange={(e) => setFilter('kitType', e.target.value)}
            className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Kit Types</option>
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

        {/* Kit Category */}
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
            Kit Category
          </label>
          <select
            value={filters.kitCategory}
            onChange={(e) => setFilter('kitCategory', e.target.value)}
            className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="on_grid">On-Grid Systems</option>
            <option value="off_grid">Off-Grid Systems</option>
            <option value="hybrid">Hybrid Systems</option>
            <option value="micro_inverter">Micro-Inverter Kits</option>
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
      </div>

      {/* Row 2: Secondary / Commercial Dimensions */}
      {isExpanded && (
        <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-fadeIn">
          {/* Pincode */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Pincode / Range
            </label>
            <input
              type="text"
              placeholder="e.g. 302001"
              value={filters.pincode}
              onChange={(e) => setFilter('pincode', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Industry Type */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Industry Type
            </label>
            <select
              value={filters.industryType}
              onChange={(e) => setFilter('industryType', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Industries</option>
              <option value="Residential">Residential Rooftop</option>
              <option value="Commercial">Commercial & Institutions</option>
              <option value="Industrial">Industrial MSME</option>
              <option value="Agriculture">Agriculture & Solar Pumps</option>
            </select>
          </div>

          {/* Order Origin */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Order Origin
            </label>
            <select
              value={filters.orderOrigin}
              onChange={(e) => setFilter('orderOrigin', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Origins</option>
              <option value="Solar EPC">Solar EPC</option>
              <option value="Franchisee">Franchisee Store</option>
              <option value="Company Store">Company Store</option>
              <option value="BDE">BDE Assisted</option>
              <option value="Director Store">Director Store</option>
            </select>
          </div>

          {/* Store Type */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Store Type
            </label>
            <select
              value={filters.storeType}
              onChange={(e) => setFilter('storeType', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Store Types</option>
              <option value="Company Store">Company Store</option>
              <option value="Franchisee Store">Franchisee Store</option>
            </select>
          </div>

          {/* Solar EPC Type */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Solar EPC Type
            </label>
            <select
              value={filters.epcType}
              onChange={(e) => setFilter('epcType', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All EPC Types</option>
              <option value="Residential EPC">Residential EPC</option>
              <option value="C&I EPC">C&I EPC Contractor</option>
              <option value="Franchise Partner EPC">Franchise Partner EPC</option>
            </select>
          </div>

          {/* Customer Status */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Customer Status
            </label>
            <select
              value={filters.customerStatus}
              onChange={(e) => setFilter('customerStatus', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Customers</option>
              <option value="Active">Active Customers</option>
              <option value="New">New First-Time Customers</option>
              <option value="Repeat">Repeat Order Buyers</option>
              <option value="Inactive">Inactive / Dormant</option>
            </select>
          </div>

          {/* BDE Officer */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              BDE Officer
            </label>
            <select
              value={filters.bde}
              onChange={(e) => setFilter('bde', e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All BDE Officers</option>
              {bdeList.map((b) => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.name || b.full_name || 'BDE'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

