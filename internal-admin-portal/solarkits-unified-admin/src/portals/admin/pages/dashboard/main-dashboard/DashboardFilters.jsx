import React, { useState } from 'react';
import {
  FiFilter,
  FiRefreshCw,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiBox,
  FiShare2,
  FiCheckCircle,
  FiX,
  FiChevronDown,
  FiClock,
  FiDownload,
} from 'react-icons/fi';

export default function DashboardFilters({
  filters,
  onChange,
  onReset,
  onRefresh,
  loading,
  lastUpdated,
  autoRefresh,
  onAutoRefreshChange,
  bootstrapData = {},
  onExport,
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    states = [],
    districts = [],
    epcTypes = [],
    configuredComboKits = [],
    kitCapacities = [],
    kitTypes = [],
    salesSources = [],
    orderStatuses = [],
    campaigns = [],
  } = bootstrapData;

  const DEFAULT_INDIA_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
    'Puducherry', 'Dadra and Nagar Haveli and Daman and Diu', 'Andaman and Nicobar Islands', 'Lakshadweep'
  ];

  const stateList = states && states.length > 0
    ? states
    : DEFAULT_INDIA_STATES.map((name) => ({ id: name, name, code: name.slice(0, 2).toUpperCase() }));

  // Find active selected state object to enable both name and id matching
  const selectedStateObj = stateList.find(
    (s) => (s.name && s.name.toLowerCase() === (filters.state || '').toLowerCase()) ||
      String(s.id) === String(filters.state)
  );
  const selectedStateId = selectedStateObj ? String(selectedStateObj.id) : null;
  const selectedStateName = selectedStateObj ? selectedStateObj.name : filters.state;

  // Filter districts based on selected state
  const availableDistricts = districts.filter((d) => {
    if (!filters.state || filters.state === 'all') return true;
    const sName = d.state_name || '';
    const matchesName = selectedStateName && sName.toLowerCase() === selectedStateName.toLowerCase();
    const matchesId = selectedStateId && d.state_id && String(d.state_id) === selectedStateId;
    const directMatch = String(d.state_id) === String(filters.state) ||
      sName.toLowerCase() === (filters.state || '').toLowerCase();
    return matchesName || matchesId || directMatch;
  });

  const datePresets = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last_7_days' },
    { label: 'Last 30 Days', value: 'last_30_days' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'Custom Range', value: 'custom' },
  ];

  return (
    <div className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-4 md:p-5 shadow-xs mb-6 transition-all duration-200">
      {/* Top Header Row with Refresh and Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60 dark:border-border-dark/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
            <FiFilter className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Global Dashboard Filters
            </h2>
            <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-text-secondary-dark">
              <FiClock className="w-3.5 h-3.5" />
              <span>Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Just now'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls: Auto-refresh, Manual Refresh, Reset, Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Refresh Select */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-text-secondary-dark bg-bg-light dark:bg-bg-dark border border-border/60 dark:border-border-dark px-2.5 py-1.5 rounded-lg">
            <span>Auto-refresh:</span>
            <select
              value={autoRefresh}
              onChange={(e) => onAutoRefreshChange(Number(e.target.value))}
              className="bg-transparent font-medium text-text-primary dark:text-text-primary-dark focus:outline-hidden cursor-pointer"
            >
              <option value={0}>Off</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 transition-colors disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Export Button */}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
              title="Export filtered records"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}

          {/* Reset Filters Button */}
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-text-secondary dark:text-text-secondary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
            title="Reset filters"
          >
            <FiX className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Toggle More Filters */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-semibold text-primary px-2.5 py-1.5 hover:underline"
          >
            <span>{expanded ? 'Fewer Filters' : 'More Filters'}</span>
            <FiChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
        {/* 1. Date Range Preset */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
            <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3 text-primary" /> Date Range</span>
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => onChange('dateRange', e.target.value)}
            className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2 focus:ring-1 focus:ring-primary focus:border-primary"
          >
            {datePresets.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Custom Start & End Dates if custom range selected */}
        {filters.dateRange === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onChange('startDate', e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onChange('endDate', e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-1.5"
              />
            </div>
          </>
        )}

        {/* 2. State Geography */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
            <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3 text-primary" /> State</span>
          </label>
          <select
            value={filters.state}
            onChange={(e) => {
              onChange('state', e.target.value);
              onChange('district', 'all'); // reset district on state change
            }}
            className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2 cursor-pointer"
          >
            <option value="all">All States</option>
            {stateList
              .filter((s) => s && (s.name || typeof s === 'string'))
              .map((s) => {
                const sName = typeof s === 'string' ? s : (s.name || s.state_name);
                const sId = typeof s === 'string' ? s : (s.id || s._id || sName);
                return (
                  <option key={sId} value={sName}>
                    {sName}
                  </option>
                );
              })}
          </select>
        </div>

        {/* 3. District Geography */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
            District
          </label>
          <select
            value={filters.district}
            onChange={(e) => onChange('district', e.target.value)}
            disabled={filters.state !== 'all' && availableDistricts.length === 0}
            className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2 cursor-pointer disabled:opacity-50"
          >
            <option value="all">
              {filters.state && filters.state !== 'all'
                ? `All Districts in ${filters.state} (${availableDistricts.length})`
                : 'All Districts'}
            </option>
            {availableDistricts
              .filter((d) => d && (d.name || typeof d === 'string'))
              .map((d) => {
                const dName = typeof d === 'string' ? d : (d.name || d.district_name);
                const dId = typeof d === 'string' ? d : (d.id || d._id || dName);
                return (
                  <option key={dId} value={dName}>
                    {dName}
                  </option>
                );
              })}
          </select>
        </div>

        {/* 4. EPC Status Filter */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
            <span className="flex items-center gap-1"><FiUsers className="w-3 h-3 text-primary" /> EPC Status</span>
          </label>
          <select
            value={filters.epcStatus}
            onChange={(e) => onChange('epcStatus', e.target.value)}
            className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2"
          >
            <option value="all">All EPCs</option>
            <option value="registered">Registered EPC</option>
            <option value="verified">GST Verified EPC</option>
            <option value="active">Active EPC</option>
          </select>
        </div>

        {/* Collapsible Secondary Filters */}
        {expanded && (
          <>
            {/* 5. Product Kit Type */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
                <span className="flex items-center gap-1"><FiBox className="w-3 h-3 text-primary" /> Combo Kit</span>
              </label>
              <select
                value={filters.kitType}
                onChange={(e) => onChange('kitType', e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2"
              >
                <option value="all">All Configured Kits</option>
                {(configuredComboKits.length > 0 ? configuredComboKits : kitTypes.map((k) => ({ name: k }))).map((k) => {
                  const val = typeof k === 'string' ? k : k.name;
                  const label = typeof k === 'object' && k.capacity ? `${k.name} (${k.capacity})` : (typeof k === 'string' ? k : k.name);
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>

            {/* 6. Product Kit Capacity */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
                Kit Capacity
              </label>
              <select
                value={filters.kitCapacity}
                onChange={(e) => onChange('kitCapacity', e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2"
              >
                <option value="all">All Capacities</option>
                {kitCapacities.map((kc) => (
                  <option key={kc} value={kc}>{kc}</option>
                ))}
              </select>
            </div>

            {/* 7. Sales Source */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
                <span className="flex items-center gap-1"><FiShare2 className="w-3 h-3 text-primary" /> Sales Source</span>
              </label>
              <select
                value={filters.salesSource}
                onChange={(e) => onChange('salesSource', e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2"
              >
                <option value="all">All Sources</option>
                {salesSources.map((ss) => (
                  <option key={ss} value={ss}>{ss}</option>
                ))}
              </select>
            </div>

            {/* 8. Order Status */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
                <span className="flex items-center gap-1"><FiCheckCircle className="w-3 h-3 text-primary" /> Order Status</span>
              </label>
              <select
                value={filters.orderStatus}
                onChange={(e) => onChange('orderStatus', e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2"
              >
                <option value="all">All Statuses</option>
                {orderStatuses.map((os) => (
                  <option key={os} value={os}>{os}</option>
                ))}
              </select>
            </div>

            {/* 9. Campaign Selector */}
            {campaigns.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">
                  Campaign
                </label>
                <select
                  value={filters.campaignId}
                  onChange={(e) => onChange('campaignId', e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-border/80 dark:border-border-dark bg-bg-light/60 dark:bg-bg-dark text-text-primary dark:text-text-primary-dark px-2.5 py-2"
                >
                  <option value="all">All Campaigns</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
