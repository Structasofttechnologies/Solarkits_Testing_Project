/**
 * EpcFilterPanel.jsx
 * Filter Controls for EPC Behavior Analytics Dashboard
 * Section 1: Behavior & Attribution Filters (Time Horizon, State, District, Kit Type, Order Type, Customer Type, Search)
 * Section 2: Quick Filters (5 Cascading Dropdowns: Industry Type, Category, Sub Category, System Type, Project Range + Clear Main)
 */

import React, { useMemo } from 'react';
import { FiFilter, FiRotateCcw, FiDownload, FiSearch, FiPackage } from 'react-icons/fi';

export default function EpcFilterPanel({
  filters = {},
  setFilter,
  resetFilters,
  clearQuickFilters,
  states = [],
  districts = [],
  stateDistrictsMap = {},
  kitTypes = [],
  industryTypeOptions = [{ value: 'all', text: 'All Industry Types' }],
  categoryOptions = [{ value: 'all', text: 'All Categories' }],
  subCategoryOptions = [{ value: 'all', text: 'All Sub-Categories' }],
  systemTypeOptions = [{ value: 'all', text: 'All System Types' }],
  projectRangeOptions = [{ value: 'all', text: 'All Project Ranges' }],
  onExportCsv,
}) {
  // Cascading districts based on selected state ("VAHI STATE AND DISTRICT ME")
  const availableDistricts = useMemo(() => {
    if (filters.state && filters.state !== 'all') {
      return stateDistrictsMap[filters.state] || [];
    }
    return districts || [];
  }, [filters.state, stateDistrictsMap, districts]);

  // Check if any quick filter is active
  const hasActiveQuickFilters = Boolean(
    (filters.industryType && filters.industryType !== 'all') ||
    (filters.category && filters.category !== 'all') ||
    (filters.subCategory && filters.subCategory !== 'all') ||
    (filters.systemType && filters.systemType !== 'all') ||
    (filters.projectRange && filters.projectRange !== 'all')
  );

  return (
    <div className="space-y-3">
      {/* ── CARD 1: BEHAVIOR & ATTRIBUTION FILTERS (Matching Image 1) ── */}
      <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
        {/* Top Title & Quick Actions */}
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

        {/* Filter Selectors Grid with State & District */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          {/* 1. Time Horizon */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-text-muted">Time Horizon</label>
            <select
              value={filters.dateRange || 'last_30_days'}
              onChange={(e) => setFilter('dateRange', e.target.value)}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer"
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

          {/* 2. State */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-text-muted">State</label>
            <select
              value={filters.state || 'all'}
              onChange={(e) => {
                const newState = e.target.value;
                setFilter('state', newState);
                setFilter('district', 'all');
              }}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All States</option>
              {states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 3. District (Cascades dynamically from selected State) */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-text-muted">District</label>
            <select
              value={filters.district || 'all'}
              onChange={(e) => setFilter('district', e.target.value)}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">
                {filters.state && filters.state !== 'all'
                  ? `All ${filters.state} Districts (${availableDistricts.length})`
                  : 'All Districts'}
              </option>
              {availableDistricts.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Kit Type */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-text-muted">Kit Type</label>
            <select
              value={filters.kitType || 'all'}
              onChange={(e) => setFilter('kitType', e.target.value)}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Kit Capacities</option>
              {kitTypes.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Order Type */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-text-muted">Order Type</label>
            <select
              value={filters.orderType || 'all'}
              onChange={(e) => setFilter('orderType', e.target.value)}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Order Types</option>
              <option value="po_order">PO Order (Bulk)</option>
              <option value="loose_order">Loose Quantity (Components)</option>
              <option value="combo_kit">Combo Kit Package</option>
            </select>
          </div>

          {/* 6. Customer Type */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-text-muted">Customer Type</label>
            <select
              value={filters.customerType || 'all'}
              onChange={(e) => setFilter('customerType', e.target.value)}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Customer Types</option>
              <option value="Platinum Partner">Platinum Partner</option>
              <option value="Gold Partner">Gold Partner</option>
              <option value="Silver Partner">Silver Partner</option>
              <option value="Standard EPC">Standard EPC</option>
              <option value="Tier 1 Enterprise EPC">Tier 1 Enterprise EPC</option>
              <option value="Registered Solar EPC Installer">Registered Solar EPC</option>
              <option value="Franchisee Direct Store">Franchisee Store</option>
            </select>
          </div>

          {/* 7. Search EPC / Location */}
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

      {/* ── CARD 2: QUICK FILTERS (Matching Image 2) ── */}
      <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiPackage className="text-primary text-base" />
            <h3 className="font-bold text-xs text-text uppercase tracking-wider">
              Quick Filters
            </h3>
            {hasActiveQuickFilters && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Active
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clearQuickFilters}
            className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline cursor-pointer transition-colors"
          >
            Clear Main
          </button>
        </div>

        {/* 5 Cascading Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. Industry Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text">Industry Type</label>
            <select
              value={filters.industryType || 'all'}
              onChange={(e) => {
                setFilter('industryType', e.target.value);
                setFilter('category', 'all');
                setFilter('subCategory', 'all');
                setFilter('systemType', 'all');
                setFilter('projectRange', 'all');
              }}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer"
            >
              {industryTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Category (Cascades from Industry Type) */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text">Category</label>
            <select
              value={filters.category || 'all'}
              disabled={!filters.industryType || filters.industryType === 'all'}
              onChange={(e) => {
                setFilter('category', e.target.value);
                setFilter('subCategory', 'all');
                setFilter('systemType', 'all');
                setFilter('projectRange', 'all');
              }}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Sub Category (Cascades from Category) */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text">Sub Category</label>
            <select
              value={filters.subCategory || 'all'}
              disabled={!filters.category || filters.category === 'all'}
              onChange={(e) => {
                setFilter('subCategory', e.target.value);
                setFilter('systemType', 'all');
                setFilter('projectRange', 'all');
              }}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {/* 4. System Type (Cascades from Sub Category) */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text">System Type</label>
            <select
              value={filters.systemType || 'all'}
              disabled={!filters.subCategory || filters.subCategory === 'all'}
              onChange={(e) => {
                setFilter('systemType', e.target.value);
                setFilter('projectRange', 'all');
              }}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {systemTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Project Range (Cascades from System Type) */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text">Project Range</label>
            <select
              value={filters.projectRange || 'all'}
              disabled={!filters.systemType || filters.systemType === 'all'}
              onChange={(e) => setFilter('projectRange', e.target.value)}
              className="w-full text-xs font-medium bg-bg text-text rounded-xl border border-border p-2 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {projectRangeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
