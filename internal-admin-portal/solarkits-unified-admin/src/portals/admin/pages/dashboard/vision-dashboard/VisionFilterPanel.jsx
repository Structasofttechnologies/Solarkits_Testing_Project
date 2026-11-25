/**
 * VisionFilterPanel.jsx
 *
 * Full filter panel for the Vision Dashboard.
 * Groups: Network | Catalog | Kit | Period
 * Features: searchable dropdowns, active-filter chips, Reset Filters, period picker.
 *
 * Catalog filters are dependent — parent selection restricts child options.
 * Changing a parent clears incompatible child selections (handled in useVisionData).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFilter, FiX, FiChevronDown, FiSearch, FiRefreshCw, FiCalendar, FiCheck } from 'react-icons/fi';

// ── Searchable Dropdown ───────────────────────────────────────────────────────

function SearchDropdown({ label, value, onChange, options = [], placeholder = 'All', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      if (!open && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUp(spaceBelow < 280 && rect.top > spaceBelow);
      }
      setOpen(p => !p);
    }
  };

  const filtered = options.filter(o =>
    !query || o.label?.toLowerCase().includes(query.toLowerCase())
  );

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div ref={ref} className={`relative ${open ? 'z-[60]' : 'z-10'}`}>
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">{label}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-1 px-3 py-2 rounded-lg border text-sm
          ${disabled
            ? 'bg-surface-hover text-text-muted border-border cursor-not-allowed'
            : 'bg-surface border-border text-text-primary hover:border-primary/40 cursor-pointer'}
          transition-colors`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <FiChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: openUp ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUp ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[70] ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'} w-full min-w-[220px] max-w-[320px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden`}
          >
            {/* Search input */}
            <div className="px-2.5 py-2 border-b border-border bg-surface">
              <div className="flex items-center gap-2 bg-surface-hover rounded-lg px-2.5 py-1.5 border border-border/50">
                <FiSearch size={12} className="text-text-muted shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="bg-transparent text-xs outline-none w-full text-text-primary placeholder:text-text-muted"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="text-text-muted hover:text-text-primary">
                    <FiX size={11} />
                  </button>
                )}
              </div>
            </div>
            {/* All option */}
            <button
              type="button"
              onClick={() => { onChange(null); setQuery(''); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-surface-hover transition-colors
                ${!value ? 'text-primary font-semibold bg-primary/5' : 'text-text-secondary'}`}
            >
              <span>{placeholder || 'All'}</span>
              {!value && <FiCheck size={12} className="text-primary" />}
            </button>
            {/* Options */}
            <div className="max-h-60 overflow-y-auto scrollbar-hover divide-y divide-border/20">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-xs text-text-muted text-center">No options found</p>
              ) : filtered.map((o, idx) => {
                const isSelected = String(value) === String(o.value);
                const optKey = o.value ? String(o.value) : `opt-${idx}`;
                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => { onChange(o.value); setQuery(''); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-surface-hover transition-colors text-left
                      ${isSelected ? 'text-primary font-semibold bg-primary/10' : 'text-text-primary'}`}
                  >
                    <span className="truncate pr-2">{o.label}</span>
                    {isSelected && <FiCheck size={12} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Period Picker ─────────────────────────────────────────────────────────────

function PeriodPicker({ period, setPeriod }) {
  const tabs = [
    { value: 'this_month', label: 'Month' },
    { value: 'this_quarter', label: 'Quarter' },
    { value: 'this_year', label: 'Year' },
    { value: 'custom', label: 'Custom' },
  ];
  return (
    <div>
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">Reporting Period</p>
      <div className="flex rounded-lg overflow-hidden border border-border bg-surface-hover">
        {tabs.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setPeriod('period', t.value)}
            className={`flex-1 text-xs py-1.5 transition-colors font-medium
              ${period.period === t.value
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {period.period === 'custom' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <p className="text-[10px] text-text-muted mb-1">From</p>
            <input type="date" value={period.start_date || ''}
              onChange={e => setPeriod('start_date', e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-surface text-text-primary outline-none focus:border-primary/60" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted mb-1">To</p>
            <input type="date" value={period.end_date || ''}
              onChange={e => setPeriod('end_date', e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-surface text-text-primary outline-none focus:border-primary/60" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Active Filter Chips ───────────────────────────────────────────────────────

export function ActiveFilterChips({ chips = [], onRemove, onReset }) {
  if (!chips.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap gap-1.5 items-center"
    >
      <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">Active filters:</span>
      {chips.map(chip => (
        <span key={chip.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full border border-primary/20"
        >
          {chip.label}
          <button onClick={() => onRemove(chip.key)} className="hover:text-danger transition-colors">
            <FiX size={10} />
          </button>
        </span>
      ))}
      <button
        onClick={onReset}
        className="text-[11px] text-danger hover:text-danger-hover underline ml-1 transition-colors"
      >
        Clear all
      </button>
    </motion.div>
  );
}

// ── Main Filter Panel ─────────────────────────────────────────────────────────

export default function VisionFilterPanel({
  filters,
  setFilter,
  period,
  setPeriod,
  resetFilters,
  activeFilterChips,
  industryTypes = [],
  allStates = [],
  allDistricts = [],
  projectCategories = [],
  projectSubcategories = [],
  systemTypes = [],
  projectRanges = [],
  franchiseeList = [],
  warehouses = [],
  kits = [],
  epcTypes = [],
  loading = {},
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Convert data to dropdown options (filter out invalid or empty entries)
  const stateOptions = allStates.filter(s => s && (s._id || s.id)).map(s => ({ value: String(s._id || s.id), label: s.name }));
  const districtOptions = allDistricts.filter(d => d && (d._id || d.id)).map(d => ({ value: String(d._id || d.id), label: d.name }));
  const industryOptions = industryTypes.filter(i => i && (i._id || i.id)).map(i => ({ value: String(i._id || i.id), label: i.name }));
  const categoryOptions = projectCategories.filter(c => c && (c._id || c.id)).map(c => ({ value: String(c._id || c.id), label: c.name }));
  const subcategoryOptions = projectSubcategories.filter(s => s && (s._id || s.id)).map(s => ({ value: String(s._id || s.id), label: s.name }));
  const systemTypeOptions = systemTypes.filter(t => t && (t._id || t.id || t.subcategory_type_id)).map(t => ({ value: String(t._id || t.id || t.subcategory_type_id), label: t.name || t.type?.name || t.type }));
  const rangeOptions = projectRanges.filter(r => r && (r._id || r.id)).map(r => ({
    value: String(r._id || r.id),
    label: r.range_label || `${r.min_value}–${r.max_value} ${r.unit_symbol || r.unit_id?.symbol || 'kW'}`
  }));
  const kitOptions = kits.filter(k => k && (k._id || k.id)).map(k => ({
    value: String(k._id || k.id),
    label: k.name || k.kit_name || k.combo_name || k.title || 'Solar Kit'
  }));
  const franchiseeDropOptions = franchiseeList
    .filter(f => {
      if (f.activation_status !== 'active') return false;
      if (filters.state_id && String(f.address?.state_id || '') !== String(filters.state_id)) return false;
      if (filters.district_id && String(f.address?.district_id || '') !== String(filters.district_id)) return false;
      return true;
    })
    .map(f => ({ value: f._id || f.id, label: f.business_name }));

  const warehouseDropOptions = warehouses
    .filter(w => {
      if (!w.is_active) return false;
      if (filters.state_id && String(w.state_id || w.level_1 || '') !== String(filters.state_id)) return false;
      if (filters.district_id && String(w.district_id || w.level_2 || '') !== String(filters.district_id)) return false;
      if (filters.franchisee_id && String(w.reseller_id || w.franchisee_id || '') !== String(filters.franchisee_id)) return false;
      return true;
    })
    .map(w => ({ value: w._id || w.id, label: w.name || w.warehouse_name }));
  const epcTypeOptions = epcTypes
    .filter(et => et.is_active !== false)
    .map(et => ({ value: et._id || et.id, label: et.name }));

  // Chip remove handler
  const handleRemoveChip = useCallback((key) => {
    setFilter(key, null);
  }, [setFilter]);

  const periodLabel = {
    this_month: `Month ${period.month}/${period.year}`,
    this_quarter: `Q${Math.ceil(period.month / 3)} ${period.year}`,
    this_year: `Year ${period.year}`,
    custom: period.start_date && period.end_date
      ? `${period.start_date} → ${period.end_date}`
      : 'Custom Range',
  }[period.period] || '';

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiFilter size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Filters</h3>
          {periodLabel && (
            <span className="flex items-center gap-1 text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              <FiCalendar size={9} />
              {periodLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterChips.length > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-danger hover:text-danger-hover transition-colors"
            >
              <FiRefreshCw size={11} />
              Reset
            </button>
          )}
          <button
            onClick={() => setCollapsed(p => !p)}
            className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1"
          >
            {collapsed ? 'Show filters' : 'Hide'}
            <FiChevronDown size={12} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Period */}
            <PeriodPicker period={period} setPeriod={setPeriod} />

            <div className="h-px bg-border" />

            {/* Network Group */}
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">🌐 Network</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <SearchDropdown
                  label="Cluster"
                  value={filters.cluster_id}
                  onChange={v => setFilter('cluster_id', v)}
                  options={[]}
                  placeholder="All Clusters"
                />
                <SearchDropdown
                  label="State"
                  value={filters.state_id}
                  onChange={v => setFilter('state_id', v)}
                  options={stateOptions}
                  placeholder="All States"
                />
                <SearchDropdown
                  label="District"
                  value={filters.district_id}
                  onChange={v => setFilter('district_id', v)}
                  options={districtOptions}
                  placeholder="All Districts"
                  disabled={!filters.state_id}
                />
                <SearchDropdown
                  label="Franchisee"
                  value={filters.franchisee_id}
                  onChange={v => setFilter('franchisee_id', v)}
                  options={franchiseeDropOptions}
                  placeholder="All Franchisees"
                  disabled={!filters.district_id}
                />
                <SearchDropdown
                  label="Warehouse"
                  value={filters.warehouse_id}
                  onChange={v => setFilter('warehouse_id', v)}
                  options={warehouseDropOptions}
                  placeholder="All Warehouses"
                  disabled={!filters.franchisee_id}
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Catalog Group */}
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">📦 Catalog</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <SearchDropdown
                  label="Industry Type"
                  value={filters.industry_type_id}
                  onChange={v => setFilter('industry_type_id', v)}
                  options={industryOptions}
                  placeholder="All Industries"
                />
                <SearchDropdown
                  label="Project Category"
                  value={filters.category_id}
                  onChange={v => setFilter('category_id', v)}
                  options={categoryOptions}
                  placeholder="All Categories"
                  disabled={categoryOptions.length === 0}
                />
                <SearchDropdown
                  label="Subcategory"
                  value={filters.subcategory_id}
                  onChange={v => setFilter('subcategory_id', v)}
                  options={subcategoryOptions}
                  placeholder="All Subcategories"
                  disabled={!filters.category_id || subcategoryOptions.length === 0}
                />
                <SearchDropdown
                  label="System Type"
                  value={filters.system_type_id}
                  onChange={v => setFilter('system_type_id', v)}
                  options={systemTypeOptions}
                  placeholder="All System Types"
                  disabled={!filters.subcategory_id || systemTypeOptions.length === 0}
                />
                <SearchDropdown
                  label="Project Range"
                  value={filters.project_range_id}
                  onChange={v => setFilter('project_range_id', v)}
                  options={rangeOptions}
                  placeholder="All Ranges"
                  disabled={!filters.system_type_id || rangeOptions.length === 0}
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Kit + Additional + EPC Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Kit */}
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">⚡ Kit</p>
                <div className="grid grid-cols-2 gap-3">
                  <SearchDropdown
                    label="Kit"
                    value={filters.kit_id}
                    onChange={v => setFilter('kit_id', v)}
                    options={kitOptions}
                    placeholder="All Kits"
                  />
                  <SearchDropdown
                    label="kW Capacity"
                    value={filters.kw_capacity}
                    onChange={v => setFilter('kw_capacity', v)}
                    options={[
                      { value: '1', label: '1 kW' },
                      { value: '2', label: '2 kW' },
                      { value: '3', label: '3 kW' },
                      { value: '5', label: '5 kW' },
                      { value: '10', label: '10 kW' },
                    ]}
                    placeholder="Any kW"
                  />
                </div>
              </div>
              {/* EPC Type */}
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">🏗️ EPC</p>
                <SearchDropdown
                  label="EPC Type"
                  value={filters.epc_type_id}
                  onChange={v => setFilter('epc_type_id', v)}
                  options={epcTypeOptions}
                  placeholder="All EPC Types"
                  disabled={epcTypeOptions.length === 0}
                />
              </div>
              {/* Additional */}
              <div className="col-span-1 sm:col-span-2">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">➕ Additional</p>
                <div className="grid grid-cols-2 gap-3">
                  <SearchDropdown
                    label="Project Type"
                    value={filters.project_type_id}
                    onChange={v => setFilter('project_type_id', v)}
                    options={[]}
                    placeholder="All"
                  />
                  <SearchDropdown
                    label="Application Type"
                    value={filters.application_type_id}
                    onChange={v => setFilter('application_type_id', v)}
                    options={[]}
                    placeholder="All"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active chips always visible */}
      <AnimatePresence>
        {activeFilterChips.length > 0 && (
          <ActiveFilterChips
            chips={activeFilterChips}
            onRemove={handleRemoveChip}
            onReset={resetFilters}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
