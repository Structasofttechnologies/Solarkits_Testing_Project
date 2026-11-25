/**
 * LocationDrillDown.jsx
 *
 * Clickable location cards + drill-down table for the current hierarchy level.
 * Shows only immediate children of the current level.
 *
 * Columns vary by level:
 *   India/Cluster/State/District → Location, Target FPOs, Active FPOs, Remaining, Active WHs, Shops, Kit Target, Kits Sold, Achievement %, Status, View
 *   Franchisee → Warehouse list with operational details
 *   Warehouse  → Detail view in drawer
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronRight, FiEye, FiMapPin, FiUsers, FiHome, FiShoppingBag } from 'react-icons/fi';
import { ProgressBar } from './VisionCharts';
import { visionApi } from './visionDashboardApi';

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ pct, noTarget = false }) {
  if (noTarget) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-text-muted border border-border">
      No Target
    </span>
  );
  const { label, cls } = pct >= 100
    ? { label: '✓ Achieved', cls: 'bg-success-soft text-success border-success/20' }
    : pct >= 75
      ? { label: '↑ On Track', cls: 'bg-info-soft text-info border-info/20' }
      : pct >= 40
        ? { label: '⚠ Behind', cls: 'bg-warning-soft text-warning border-warning/20' }
        : { label: '✗ Low', cls: 'bg-danger-soft text-danger border-danger/20' };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
  );
}

// ── Location Row (table row) ──────────────────────────────────────────────────

function LocationRow({ item, onDrillInto, onViewDetail, drillLevel }) {
  const isLast = drillLevel === 'franchisee';
  const pct = item.achievement_pct ?? 0;
  const hasTarget = item.kit_target > 0;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="border-b border-border hover:bg-surface-hover transition-colors group"
    >
      {/* Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FiMapPin size={12} className="text-primary shrink-0" />
          <button
            type="button"
            onClick={() => !isLast && onDrillInto(item.next_level, item._id || item.id, item.name)}
            className={`text-sm font-medium text-left ${!isLast ? 'text-primary hover:underline cursor-pointer' : 'text-text-primary cursor-default'}`}
          >
            {item.name}
          </button>
        </div>
      </td>

      {/* Target FPOs */}
      <td className="px-4 py-3 text-sm text-text-secondary text-center">{item.target_fpos ?? '—'}</td>

      {/* Active FPOs */}
      <td className="px-4 py-3 text-sm font-medium text-text-primary text-center">{item.active_fpos ?? '—'}</td>

      {/* Remaining target */}
      <td className="px-4 py-3 text-sm text-text-secondary text-center">
        {item.target_fpos != null && item.active_fpos != null
          ? Math.max(item.target_fpos - item.active_fpos, 0)
          : '—'}
      </td>

      {/* Active Warehouses */}
      <td className="px-4 py-3 text-sm text-text-secondary text-center">{item.active_warehouses ?? '—'}</td>

      {/* Operational Shops */}
      <td className="px-4 py-3 text-sm text-text-secondary text-center">{item.operational_shops ?? '—'}</td>

      {/* Kit Target */}
      <td className="px-4 py-3 text-sm text-text-secondary text-center">{item.kit_target ?? '—'}</td>

      {/* Kits Sold */}
      <td className="px-4 py-3 text-sm font-medium text-text-primary text-center">{item.kits_sold ?? '—'}</td>

      {/* Achievement % + progress */}
      <td className="px-4 py-3 min-w-[120px]">
        {hasTarget ? (
          <div className="space-y-1">
            <span className="text-sm font-semibold">{Math.round(pct)}%</span>
            <ProgressBar value={Math.min(pct, 100)}
              colorClass={pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger'}
              height={4} />
          </div>
        ) : <span className="text-xs text-text-muted">—</span>}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge pct={pct} noTarget={!hasTarget} />
      </td>

      {/* View Details */}
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onViewDetail(item)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors opacity-0 group-hover:opacity-100"
        >
          <FiEye size={12} /> Details
        </button>
      </td>
    </motion.tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LocationDrillDown({
  drillLevel,
  drillPath,
  drillInto,
  onViewDetail,
  performanceTracker,
  franchiseeList,
  allStates,
  allDistricts = [],
  warehouses,
  loading,
}) {
  const [rows, setRows] = useState([]);
  const [sortCol, setSortCol] = useState('achievement_pct');
  const [sortDir, setSortDir] = useState('desc');

  // Build table rows from available data based on current drill level
  useEffect(() => {
    let built = [];

    if (drillLevel === 'india' || drillLevel === 'cluster') {
      // Group by state using performance tracker location data + allStates
      const stateMap = {};
      (allStates || []).forEach(s => {
        const id = String(s._id || s.id);
        stateMap[id] = {
          _id: id,
          name: s.name,
          next_level: 'state',
          active_fpos: 0,
          target_fpos: 0,
          active_warehouses: 0,
          operational_shops: 0,
          kit_target: 0,
          kits_sold: 0,
          achievement_pct: 0,
        };
      });

      // Merge franchisee data into state map
      (franchiseeList || []).forEach(f => {
        const sid = String(f.address?.state_id || '');
        if (sid && stateMap[sid]) {
          stateMap[sid].active_fpos += f.activation_status === 'active' ? 1 : 0;
          stateMap[sid].operational_shops += f.is_operational ? 1 : 0;
        }
      });

      // Merge warehouse data
      (warehouses || []).forEach(w => {
        const sid = String(w.state_id || w.level_1 || '');
        if (sid && stateMap[sid]) {
          stateMap[sid].active_warehouses += w.is_active ? 1 : 0;
        }
      });

      // Merge kit targets from performance tracker
      (performanceTracker?.franchisees || []).forEach(f => {
        const sid = String(f.franchisee_id?.address?.state_id || '');
        if (sid && stateMap[sid]) {
          stateMap[sid].kit_target += f.target_quantity || 0;
          stateMap[sid].kits_sold += f.eligible_quantity || 0;
        }
      });

      // Calculate achievement pct
      built = Object.values(stateMap).map(s => ({
        ...s,
        achievement_pct: s.kit_target > 0 ? Math.round((s.kits_sold / s.kit_target) * 100) : 0,
      }));
    } else if (drillLevel === 'state') {
      const currentStateId = String(drillPath[drillPath.length - 1]?.id || '');

      // Seed ONLY with legitimate districts of the selected state
      const distMap = {};
      (allDistricts || []).forEach(d => {
        const did = String(d._id || d.id);
        distMap[did] = {
          _id: did,
          name: d.name || 'District',
          next_level: 'district',
          active_fpos: 0,
          target_fpos: 0,
          active_warehouses: 0,
          operational_shops: 0,
          kit_target: 0,
          kits_sold: 0,
          achievement_pct: 0,
        };
      });

      // Merge franchisee data into district map ONLY if franchisee belongs to THIS state
      (franchiseeList || []).forEach(f => {
        const fStateId = String(f.address?.state_id || '');
        if (currentStateId && fStateId && fStateId !== currentStateId) {
          // Out-of-state franchisee: strictly ignore to prevent phantom district creation
          return;
        }
        const did = String(f.address?.district_id || '');
        if (!did || !distMap[did]) return; // Only count towards legitimate districts of this state!

        distMap[did].active_fpos += f.activation_status === 'active' ? 1 : 0;
        distMap[did].operational_shops += f.is_operational ? 1 : 0;
      });

      // Merge warehouse data for this state
      (warehouses || []).forEach(w => {
        const wStateId = String(w.state_id || w.level_1 || '');
        if (currentStateId && wStateId && wStateId !== currentStateId) return;
        const did = String(w.district_id || w.level_2 || '');
        if (did && distMap[did]) distMap[did].active_warehouses += w.is_active ? 1 : 0;
      });

      // Merge kit targets from performance tracker for this state
      (performanceTracker?.franchisees || []).forEach(f => {
        const fStateId = String(f.franchisee_id?.address?.state_id || '');
        if (currentStateId && fStateId && fStateId !== currentStateId) return;
        const did = String(f.franchisee_id?.address?.district_id || '');
        if (did && distMap[did]) {
          distMap[did].kit_target += f.target_quantity || 0;
          distMap[did].kits_sold += f.eligible_quantity || 0;
        }
      });

      built = Object.values(distMap).map(d => ({
        ...d,
        achievement_pct: d.kit_target > 0 ? Math.round((d.kits_sold / d.kit_target) * 100) : 0,
      }));
    } else if (drillLevel === 'district') {
      const currentDistrictId = String(drillPath[drillPath.length - 1]?.id || '');

      // Show ONLY franchisees in this district
      const perfMap = {};
      (performanceTracker?.franchisees || []).forEach(f => {
        const id = String(f.franchisee_id?._id || f.franchisee_id);
        perfMap[id] = f;
      });

      // Filter franchisees strictly by current district
      const districtFranchisees = (franchiseeList || []).filter(f => {
        const fDistId = String(f.address?.district_id || '');
        return currentDistrictId ? fDistId === currentDistrictId : true;
      });

      built = districtFranchisees.map(f => {
        const id = String(f._id || f.id);
        const perf = perfMap[id] || {};
        const whs = (warehouses || []).filter(w => String(w.reseller_id || w.franchisee_id) === id);
        return {
          ...f,
          _id: id,
          name: f.business_name,
          next_level: 'franchisee',
          active_fpos: f.activation_status === 'active' ? 1 : 0,
          target_fpos: 1,
          active_warehouses: whs.filter(w => w.is_active).length,
          operational_shops: f.is_operational ? 1 : 0,
          kit_target: perf.target_quantity || 0,
          kits_sold: perf.eligible_quantity || 0,
          achievement_pct: perf.achievement_pct || 0,
        };
      });
    } else if (drillLevel === 'franchisee') {
      // Show warehouses for this franchisee
      const fid = String(drillPath[drillPath.length - 1]?.id || '');
      const fWhs = (warehouses || []).filter(w =>
        String(w.reseller_id || w.franchisee_id) === fid
      );
      built = fWhs.map(w => ({
        ...w,
        _id: w._id || w.id,
        name: w.name || w.warehouse_name || 'Warehouse',
        next_level: 'warehouse',
        active_fpos: null,
        target_fpos: null,
        active_warehouses: w.is_active ? 1 : 0,
        operational_shops: null,
        kit_target: null,
        kits_sold: null,
        achievement_pct: 0,
      }));
    }

    setRows(built);
  }, [drillLevel, drillPath, franchiseeList, allStates, allDistricts, warehouses, performanceTracker]);

  // Sorting
  const sortedRows = [...rows].sort((a, b) => {
    const va = a[sortCol] ?? -1;
    const vb = b[sortCol] ?? -1;
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => (
    <span className="ml-1 text-[10px] text-text-muted">
      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  const levelLabel = {
    india: 'States', cluster: 'States in Cluster', state: 'Districts',
    district: 'Franchisees', franchisee: 'Warehouses', warehouse: 'Warehouse Detail',
  }[drillLevel] || 'Locations';

  if (loading?.franchisees || loading?.warehouses) {
    return (
      <div className="card p-6 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 bg-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FiMapPin size={16} className="text-primary" />
          <h3 className="font-semibold text-text-primary">{levelLabel}</h3>
          <span className="text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">{rows.length} found</span>
        </div>
        <span className="text-xs text-text-muted">Click a name to drill down →</span>
      </div>

      {/* Table */}
      {sortedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
          <FiMapPin size={32} className="opacity-30" />
          <p className="text-sm">No data available for the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-hover">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-hover">
              <tr>
                {[
                  { col: 'name', label: 'Location' },
                  { col: 'target_fpos', label: 'Target FPOs' },
                  { col: 'active_fpos', label: 'Active FPOs' },
                  { col: null, label: 'Remaining' },
                  { col: 'active_warehouses', label: 'Active WHs' },
                  { col: 'operational_shops', label: 'Op. Shops' },
                  { col: 'kit_target', label: 'Kit Target' },
                  { col: 'kits_sold', label: 'Kits Sold' },
                  { col: 'achievement_pct', label: 'Achievement' },
                  { col: null, label: 'Status' },
                  { col: null, label: '' },
                ].map(({ col, label }) => (
                  <th key={label}
                    onClick={() => col && toggleSort(col)}
                    className={`px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap
                      ${col ? 'cursor-pointer hover:text-text-primary select-none' : ''}`}
                  >
                    {label}{col && <SortIcon col={col} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sortedRows.map((item, idx) => (
                  <LocationRow
                    key={item._id ? String(item._id) : `loc-${drillLevel}-${idx}`}
                    item={item}
                    drillLevel={drillLevel}
                    onDrillInto={drillInto}
                    onViewDetail={onViewDetail}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
