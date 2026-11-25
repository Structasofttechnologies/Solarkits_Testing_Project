/**
 * KitSalesAdoption.jsx
 *
 * Kit sales and adoption section for the Vision Dashboard.
 *
 * Note: Kit-level analytics are derived client-side from performance tracker data,
 * as no dedicated kit analytics endpoint exists yet.
 * Sections show a "Derived from available data" note where applicable.
 *
 * Shows:
 *   - Kit adoption trend (eligible kits sold over time from progress history)
 *   - High / Average / Low selling category breakdown
 *   - Franchisee adoption table
 *
 * Selling thresholds (frontend config — NOT confirmed business rules):
 *   HIGH: ≥50 kits sold in period
 *   AVERAGE: ≥20 kits sold
 *   LOW: <20 kits sold
 */

import { useState, useMemo } from 'react';
import { FiZap, FiTrendingUp, FiAlertCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { BarChart, ProgressBar, LineChart } from './VisionCharts';
import { SELLING_THRESHOLDS } from './useVisionData';

// ── Selling Category Badge ────────────────────────────────────────────────────

function SellingBadge({ category }) {
  const map = {
    HIGH:    { label: '🔥 High',    cls: 'bg-success-soft text-success border-success/20' },
    AVERAGE: { label: '📊 Average', cls: 'bg-info-soft text-info border-info/20' },
    LOW:     { label: '📉 Low',     cls: 'bg-warning-soft text-warning border-warning/20' },
    ZERO:    { label: '○ Zero',     cls: 'bg-surface-hover text-text-muted border-border' },
  };
  const d = map[category] || map.ZERO;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${d.cls}`}>{d.label}</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function KitSalesAdoption({ performanceTracker, kits = [], loading = false }) {
  const [sortCol, setSortCol] = useState('kits_sold');
  const [sortDir, setSortDir] = useState('desc');
  const [showTop, setShowTop] = useState(10);

  const franchisees = performanceTracker?.franchisees || [];

  // Derive per-franchisee data with selling category
  const kitRows = useMemo(() => {
    return franchisees.map((f, i) => {
      const name     = f.franchisee_id?.business_name || `FPO-${i+1}`;
      const state    = f.franchisee_id?.address?.state_name   || '—';
      const district = f.franchisee_id?.address?.district_name || '—';
      const sold     = f.eligible_quantity || 0;
      const orders   = f.ordered_quantity  || 0;
      const category = sold >= SELLING_THRESHOLDS.high    ? 'HIGH'
                     : sold >= SELLING_THRESHOLDS.average ? 'AVERAGE'
                     : sold === 0                         ? 'ZERO'
                     : 'LOW';
      return { name, state, district, kits_sold: sold, orders, category, ...f };
    });
  }, [franchisees]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { HIGH: 0, AVERAGE: 0, LOW: 0, ZERO: 0 };
    kitRows.forEach(r => counts[r.category]++);
    return counts;
  }, [kitRows]);

  // Bar chart data: top 10 franchisees by kits sold
  const barData = useMemo(() =>
    [...kitRows]
      .sort((a, b) => b.kits_sold - a.kits_sold)
      .slice(0, 10)
      .map(r => ({
        label: r.name.slice(0, 10),
        value: r.kits_sold,
        color: r.category === 'HIGH' ? 'var(--color-success)'
             : r.category === 'AVERAGE' ? 'var(--color-info)'
             : r.category === 'ZERO' ? 'var(--color-border)'
             : 'var(--color-warning)',
      })),
  [kitRows]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    return [...kitRows].sort((a, b) => {
      const va = a[sortCol] ?? -1;
      const vb = b[sortCol] ?? -1;
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [kitRows, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => sortCol === col
    ? (sortDir === 'asc' ? <FiChevronUp size={10} className="inline ml-0.5" /> : <FiChevronDown size={10} className="inline ml-0.5" />)
    : null;

  const totalSold = kitRows.reduce((s, r) => s + r.kits_sold, 0);
  const adoptingCount = kitRows.filter(r => r.kits_sold > 0).length;
  const adoptionPct = kitRows.length > 0 ? Math.round((adoptingCount / kitRows.length) * 100) : 0;

  if (loading) return (
    <div className="card p-6 space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-border rounded-lg animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FiZap size={18} className="text-primary" />
          <h2 className="text-lg font-bold text-text-primary">Kit Sales & Adoption</h2>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-text-muted bg-surface-hover border border-border px-2 py-0.5 rounded-full">
          <FiAlertCircle size={9} /> Derived from PO data
        </span>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Kits Sold',  value: totalSold,       color: 'text-primary bg-primary/10' },
          { label: 'Adopting FPOs',    value: adoptingCount,   color: 'text-success bg-success-soft' },
          { label: 'Adoption Rate',    value: `${adoptionPct}%`, color: 'text-info bg-info-soft' },
          { label: 'Zero-Selling FPOs',value: categoryCounts.ZERO, color: 'text-warning bg-warning-soft' },
        ].map((c, i) => (
          <motion.div key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-3 flex flex-col items-center text-center gap-1"
          >
            <span className={`text-xl font-bold ${c.color.split(' ')[0]}`}>{c.value}</span>
            <span className="text-[10px] text-text-muted">{c.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Selling category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { cat: 'HIGH',    label: '🔥 High Sellers',    desc: `≥${SELLING_THRESHOLDS.high} kits` },
          { cat: 'AVERAGE', label: '📊 Average Sellers', desc: `${SELLING_THRESHOLDS.average}–${SELLING_THRESHOLDS.high-1} kits` },
          { cat: 'LOW',     label: '📉 Low Sellers',     desc: `1–${SELLING_THRESHOLDS.average-1} kits` },
          { cat: 'ZERO',    label: '○ Zero Sellers',     desc: 'No sales in period' },
        ].map(({ cat, label, desc }) => (
          <div key={cat} className="card p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{categoryCounts[cat]}</p>
            <p className="text-sm font-semibold text-text-primary mt-1">{label}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{desc}</p>
            <p className="text-[9px] text-text-muted mt-2 italic">Frontend config thresholds</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {barData.length > 0 && (
        <div className="card p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Top 10 Franchisees by Kits Sold</h4>
          <div className="overflow-x-auto">
            <BarChart data={barData} height={160} />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="text-sm font-semibold text-text-primary">Franchisee Kit Adoption Table</h4>
          <p className="text-[11px] text-text-muted mt-0.5">
            Includes zero-selling franchisees. Adoption % = franchisees with ≥1 kit ÷ active franchisees.
          </p>
        </div>

        {kitRows.length === 0 ? (
          <div className="py-16 text-center text-text-muted text-sm">No data available for the selected period.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-hover">
            <table className="w-full min-w-[750px] text-sm">
              <thead className="bg-surface-hover">
                <tr>
                  {[
                    { col: 'name',      label: 'Franchisee' },
                    { col: null,        label: 'State' },
                    { col: null,        label: 'District' },
                    { col: 'kits_sold', label: 'Kits Sold' },
                    { col: 'orders',    label: 'Orders' },
                    { col: 'category',  label: 'Selling Category' },
                  ].map(({ col, label }) => (
                    <th key={label}
                      onClick={() => col && toggleSort(col)}
                      className={`px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap
                        ${col ? 'cursor-pointer hover:text-text-primary select-none' : ''}`}
                    >
                      {label}<SortIcon col={col} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.slice(0, showTop).map((r, i) => (
                  <motion.tr key={i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-border hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary max-w-[150px] truncate">{r.name}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{r.state}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{r.district}</td>
                    <td className="px-4 py-3 font-bold text-text-primary text-center">{r.kits_sold}</td>
                    <td className="px-4 py-3 text-text-secondary text-center">{r.orders}</td>
                    <td className="px-4 py-3"><SellingBadge category={r.category} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sortedRows.length > showTop && (
          <div className="px-5 py-3 border-t border-border flex justify-center">
            <button onClick={() => setShowTop(p => p + 10)} className="text-xs text-primary hover:underline">
              Show more ({sortedRows.length - showTop} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
