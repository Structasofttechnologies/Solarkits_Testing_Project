/**
 * WarehouseShopCoverage.jsx
 *
 * Warehouse and shop coverage section.
 *
 * Key rules (from data model):
 *   - Warehouse "Active"    = warehouse.is_active === true
 *   - Shop "Operational"    = reseller.is_operational === true
 *   - These are INDEPENDENT — a warehouse being active does NOT auto-mark shop as operational
 *   - Territory "Covered"   = ≥1 active franchisee in that location
 *
 * Data: /warehouses/ for warehouse list; reseller list for shop status.
 */

import { useMemo, useState } from 'react';
import { FiHome, FiShoppingBag, FiMapPin, FiAlertTriangle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ProgressBar } from './VisionCharts';

// ── Coverage Gap Badge ────────────────────────────────────────────────────────

function CoverageGap({ wActive, shopOp }) {
  if (!wActive && !shopOp) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger-soft text-danger border border-danger/20">
      ✗ No Coverage
    </span>
  );
  if (!wActive) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning-soft text-warning border border-warning/20">
      ⚠ No Active WH
    </span>
  );
  if (!shopOp) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-info-soft text-info border border-info/20">
      ℹ WH Active, Shop Pending
    </span>
  );
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success-soft text-success border border-success/20">
      ✓ Fully Covered
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WarehouseShopCoverage({
  warehouses = [],
  franchiseeList = [],
  allStates = [],
  allDistricts = [],
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState('warehouse');

  // Warehouse stats
  const whStats = useMemo(() => {
    const total = warehouses.length;
    const active = warehouses.filter(w => w.is_active).length;
    const inactive = total - active;
    return { total, active, inactive, pct: total > 0 ? Math.round((active / total) * 100) : 0 };
  }, [warehouses]);

  // Shop stats
  const shopStats = useMemo(() => {
    const total = franchiseeList.length;
    const operational = franchiseeList.filter(f => f.is_operational).length;
    const pending = total - operational;
    return { total, operational, pending, pct: total > 0 ? Math.round((operational / total) * 100) : 0 };
  }, [franchiseeList]);

  // Build combined coverage rows (join franchisees with their warehouses)
  const coverageRows = useMemo(() => {
    return franchiseeList.slice(0, 50).map(f => {
      const id = String(f._id || f.id);
      const fWhs = warehouses.filter(w => String(w.reseller_id || w.franchisee_id) === id);
      const hasActiveWh = fWhs.some(w => w.is_active);

      // Safe state & district name resolution (populated string || cached lookup || fallback)
      const stateName = f.address?.state_name ||
        allStates.find(s => String(s._id || s.id) === String(f.address?.state_id))?.name || '—';
      const districtName = f.address?.district_name ||
        allDistricts.find(d => String(d._id || d.id) === String(f.address?.district_id))?.name || '—';

      return {
        franchisee: f.business_name || '—',
        state: stateName,
        district: districtName,
        warehouseCount: fWhs.length,
        activeWarehouses: fWhs.filter(w => w.is_active).length,
        shopOperational: f.is_operational || false,
        hasActiveWh,
        activeFranchisee: f.activation_status === 'active',
      };
    });
  }, [franchiseeList, warehouses, allStates, allDistricts]);

  if (loading) return (
    <div className="card p-6 space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-12 bg-border rounded-lg animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FiHome size={18} className="text-primary" />
        <h2 className="text-lg font-bold text-text-primary">Warehouse & Shop Coverage</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Warehouse card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FiHome size={16} className="text-primary" />
            <h4 className="font-semibold text-text-primary text-sm">Warehouse Coverage</h4>
            <span className="text-[10px] text-text-muted bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              is_active = true
            </span>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <span className="text-3xl font-bold text-text-primary">{whStats.active}</span>
              <span className="text-text-muted text-sm ml-1">/ {whStats.total}</span>
            </div>
            <div className="mb-1 text-xs text-text-muted">{whStats.inactive} inactive</div>
          </div>
          <ProgressBar value={whStats.pct}
            colorClass={whStats.pct >= 80 ? 'bg-success' : whStats.pct >= 50 ? 'bg-warning' : 'bg-danger'}
            height={6} showLabel labelPosition="right" />
          <p className="text-[11px] text-text-muted">
            Warehouse active status is independent of shop operational status.
          </p>
        </div>

        {/* Shop card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FiShoppingBag size={16} className="text-success" />
            <h4 className="font-semibold text-text-primary text-sm">Shop Coverage</h4>
            <span className="text-[10px] text-success bg-success-soft px-2 py-0.5 rounded-full">
              is_operational = true
            </span>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <span className="text-3xl font-bold text-text-primary">{shopStats.operational}</span>
              <span className="text-text-muted text-sm ml-1">/ {shopStats.total}</span>
            </div>
            <div className="mb-1 text-xs text-text-muted">{shopStats.pending} pending</div>
          </div>
          <ProgressBar value={shopStats.pct}
            colorClass={shopStats.pct >= 80 ? 'bg-success' : shopStats.pct >= 50 ? 'bg-warning' : 'bg-danger'}
            height={6} showLabel labelPosition="right" />
          <p className="text-[11px] text-text-muted">
            Based on store setup completion. A warehouse becoming active does NOT automatically mark the shop as operational.
          </p>
        </div>
      </div>

      {/* Coverage Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-text-primary">Combined Coverage per Franchisee</h4>
          {coverageRows.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-warning">
              <FiAlertTriangle size={10} />
              {coverageRows.filter(r => !r.hasActiveWh || !r.shopOperational).length} gaps found
            </div>
          )}
        </div>

        {coverageRows.length === 0 ? (
          <div className="py-16 text-center text-text-muted text-sm">No franchisee data available.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-hover">
            <table className="w-full min-w-[750px] text-sm">
              <thead className="bg-surface-hover">
                <tr>
                  {['Franchisee', 'State', 'District', 'Total WHs', 'Active WHs', 'Shop Status', 'Coverage Gap'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coverageRows.map((r, i) => (
                  <motion.tr key={i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-border hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary max-w-[140px] truncate">{r.franchisee}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{r.state}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{r.district}</td>
                    <td className="px-4 py-3 text-center text-text-secondary">{r.warehouseCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${r.activeWarehouses > 0 ? 'text-success' : 'text-danger'}`}>
                        {r.activeWarehouses}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border
                        ${r.shopOperational
                          ? 'bg-success-soft text-success border-success/20'
                          : 'bg-warning-soft text-warning border-warning/20'}`}
                      >
                        {r.shopOperational ? '✓ Operational' : '○ Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CoverageGap wActive={r.hasActiveWh} shopOp={r.shopOperational} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
