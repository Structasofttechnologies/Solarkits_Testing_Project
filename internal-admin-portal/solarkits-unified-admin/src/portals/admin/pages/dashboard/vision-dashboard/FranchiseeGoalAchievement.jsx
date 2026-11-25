/**
 * FranchiseeGoalAchievement.jsx
 *
 * Target vs Achievement section for the Vision Dashboard.
 * Data source: /franchisee/performance/tracker
 *
 * Shows:
 *   - Summary cards (achieved, on-track, behind, no-target)
 *   - Grouped bar chart (goal vs actual, top N franchisees)
 *   - Sortable table with all franchisees
 *
 * Calculations (from backend — franchisee_target_progress schema):
 *   Achievement % = eligible_quantity / target_quantity × 100
 *   Remaining     = max(target_quantity - eligible_quantity, 0)
 *   Allow > 100% (exceeded)
 *   "Target not set" if performance_status === 'NO_TARGET'
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTarget, FiTrendingUp, FiAlertTriangle, FiMinus, FiChevronUp, FiChevronDown, FiEye } from 'react-icons/fi';
import { GroupedBarChart, ProgressBar } from './VisionCharts';

// ── Performance Status Badge ─────────────────────────────────────────────────

function PerfBadge({ status }) {
  const map = {
    EXCEEDED:       { label: '🚀 Exceeded',     cls: 'bg-success-soft text-success border-success/20' },
    ACHIEVED:       { label: '✓ Achieved',      cls: 'bg-success-soft text-success border-success/20' },
    ON_TRACK:       { label: '↑ On Track',      cls: 'bg-info-soft text-info border-info/20' },
    BEHIND:         { label: '⚠ Behind',        cls: 'bg-warning-soft text-warning border-warning/20' },
    LOW_PERFORMANCE:{ label: '↓ Low',           cls: 'bg-danger-soft text-danger border-danger/20' },
    NOT_STARTED:    { label: '○ Not Started',   cls: 'bg-surface-hover text-text-muted border-border' },
    NO_TARGET:      { label: '— No Target',     cls: 'bg-surface-hover text-text-muted border-border' },
    EXPIRED:        { label: '✗ Expired',       cls: 'bg-danger-soft text-danger border-danger/20' },
  };
  const d = map[status] || { label: status, cls: 'bg-surface-hover text-text-muted border-border' };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${d.cls}`}>{d.label}</span>
  );
}

// ── Summary Cards Row ─────────────────────────────────────────────────────────

function SummaryCards({ summary }) {
  if (!summary) return null;
  const cards = [
    { label: 'Total',         value: summary.total,         icon: <FiTarget size={14} />,        color: 'text-primary bg-primary/10' },
    { label: 'Achieved',      value: summary.achieved,      icon: <FiTrendingUp size={14} />,     color: 'text-success bg-success-soft' },
    { label: 'On Track',      value: summary.on_track,      icon: <FiTrendingUp size={14} />,     color: 'text-info bg-info-soft' },
    { label: 'Behind',        value: summary.behind,        icon: <FiAlertTriangle size={14} />,  color: 'text-warning bg-warning-soft' },
    { label: 'No Orders',     value: summary.no_orders,     icon: <FiMinus size={14} />,          color: 'text-text-muted bg-surface-hover' },
    { label: 'No Target',     value: summary.no_target,     icon: <FiMinus size={14} />,          color: 'text-text-muted bg-surface-hover' },
    { label: 'Avg Achievement', value: `${summary.avg_achievement?.toFixed(1) ?? 0}%`, icon: <FiTarget size={14} />, color: 'text-primary bg-primary/10' },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {cards.map((c, i) => (
        <motion.div key={c.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="card p-3 flex flex-col gap-1 text-center"
        >
          <span className={`self-center p-1.5 rounded-lg ${c.color}`}>{c.icon}</span>
          <span className="text-lg font-bold text-text-primary">{c.value}</span>
          <span className="text-[10px] text-text-muted">{c.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FranchiseeGoalAchievement({
  performanceTracker,
  loading = false,
  onViewFranchisee,
}) {
  const [sortCol, setSortCol] = useState('achievement_pct');
  const [sortDir, setSortDir] = useState('desc');
  const [search,  setSearch]  = useState('');
  const [showTop, setShowTop] = useState(10);

  const franchisees = performanceTracker?.franchisees || [];
  const summary     = performanceTracker?.summary;

  // Filtered + sorted rows
  const rows = useMemo(() => {
    let list = [...franchisees];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        (f.franchisee_id?.business_name || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const va = a[sortCol] ?? -1;
      const vb = b[sortCol] ?? -1;
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return list;
  }, [franchisees, search, sortCol, sortDir]);

  // Chart data (top 10 by goal)
  const chartData = useMemo(() =>
    [...franchisees]
      .filter(f => f.performance_status !== 'NO_TARGET')
      .sort((a, b) => b.target_quantity - a.target_quantity)
      .slice(0, 10)
      .map(f => ({
        label: (f.franchisee_id?.business_name || 'FPO').slice(0, 10),
        goal:   f.target_quantity   || 0,
        actual: f.eligible_quantity || 0,
      })),
  [franchisees]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => sortCol === col
    ? (sortDir === 'asc' ? <FiChevronUp size={10} className="inline ml-0.5" /> : <FiChevronDown size={10} className="inline ml-0.5" />)
    : null;

  const cols = [
    { col: 'franchisee_id.business_name', label: 'Franchisee' },
    { col: null, label: 'State' },
    { col: null, label: 'District' },
    { col: 'target_quantity', label: 'Kit Goal' },
    { col: 'eligible_quantity', label: 'Kits Sold' },
    { col: 'balance_quantity', label: 'Remaining' },
    { col: 'achievement_pct', label: 'Achievement' },
    { col: 'performance_status', label: 'Status' },
    { col: null, label: '' },
  ];

  if (loading) return (
    <div className="card p-6 space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-14 bg-border rounded-lg animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <FiTarget size={18} className="text-primary" />
        <h2 className="text-lg font-bold text-text-primary">Franchisee Goal vs Achievement</h2>
        <span className="text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
          {performanceTracker?.period ? `${performanceTracker.period.month}/${performanceTracker.period.year}` : 'Current Period'}
        </span>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={summary} />

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Top 10 Franchisees — Goal vs Actual</h4>
          <div className="overflow-x-auto">
            <GroupedBarChart data={chartData} height={180} showValues />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3">
          <h4 className="text-sm font-semibold text-text-primary shrink-0">All Franchisees</h4>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search franchisee…"
            className="ml-auto text-xs border border-border rounded-lg px-3 py-1.5 bg-surface outline-none focus:border-primary/60 text-text-primary placeholder:text-text-muted max-w-[200px]"
          />
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center text-text-muted text-sm">
            No franchisees found{search ? ` matching "${search}"` : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hover">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface-hover">
                <tr>
                  {cols.map(({ col, label }) => (
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
                <AnimatePresence>
                  {rows.slice(0, showTop).map((f, i) => {
                    const name   = f.franchisee_id?.business_name || `FPO-${i + 1}`;
                    const state  = f.franchisee_id?.address?.state_name   || '—';
                    const dist   = f.franchisee_id?.address?.district_name || '—';
                    const goal   = f.target_quantity    || 0;
                    const actual = f.eligible_quantity  || 0;
                    const rem    = f.balance_quantity   || Math.max(goal - actual, 0);
                    const pct    = f.achievement_pct    || 0;
                    const noTarget = f.performance_status === 'NO_TARGET';

                    return (
                      <motion.tr key={f._id || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border hover:bg-surface-hover transition-colors group"
                      >
                        <td className="px-4 py-3 font-medium text-text-primary max-w-[150px] truncate">{name}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{state}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{dist}</td>
                        <td className="px-4 py-3 text-center">{noTarget ? '—' : goal}</td>
                        <td className="px-4 py-3 text-center font-medium">{actual}</td>
                        <td className="px-4 py-3 text-center text-text-secondary">{noTarget ? '—' : rem}</td>
                        <td className="px-4 py-3 min-w-[120px]">
                          {noTarget
                            ? <span className="text-xs text-text-muted">Target not set</span>
                            : (
                              <div className="space-y-1">
                                <span className={`text-sm font-bold ${pct >= 100 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-danger'}`}>
                                  {Math.round(pct)}%
                                </span>
                                <ProgressBar value={Math.min(pct, 100)}
                                  colorClass={pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-danger'}
                                  height={4} />
                              </div>
                            )
                          }
                        </td>
                        <td className="px-4 py-3"><PerfBadge status={f.performance_status} /></td>
                        <td className="px-4 py-3">
                          <button type="button"
                            onClick={() => onViewFranchisee?.(f)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiEye size={11} /> View
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {rows.length > showTop && (
          <div className="px-5 py-3 border-t border-border flex justify-center">
            <button
              onClick={() => setShowTop(p => p + 10)}
              className="text-xs text-primary hover:underline"
            >
              Show more ({rows.length - showTop} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
