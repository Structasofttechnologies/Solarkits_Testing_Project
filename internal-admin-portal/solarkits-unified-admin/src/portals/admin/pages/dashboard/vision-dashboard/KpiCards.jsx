/**
 * KpiCards.jsx
 *
 * KPI summary cards for the Vision Dashboard.
 * Each card shows: icon, value, label, sub-stat, tooltip, optional sparkline.
 * Data comes from the useVisionData() hook's kpiData object.
 *
 * Includes EPC metrics as of the EPC-types bifurcation stage.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiMapPin, FiUsers, FiTarget, FiPackage, FiTrendingUp,
  FiShoppingBag, FiHome, FiBarChart2, FiZap, FiPercent, FiGrid,
  FiBriefcase, FiUserCheck,
} from 'react-icons/fi';
import { ProgressBar, DonutChart, MiniSparkline } from './VisionCharts';

// ── Tooltip ──────────────────────────────────────────────────────────────────

function Tip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="text-text-muted cursor-help text-[11px] border border-border rounded-full w-4 h-4 inline-flex items-center justify-center select-none">?</span>
      {show && (
        <div className="absolute z-50 bottom-full mb-1 left-1/2 -translate-x-1/2 w-52 bg-surface border border-border rounded-lg shadow-lg p-2 text-[11px] text-text-secondary pointer-events-none">
          {text}
        </div>
      )}
    </div>
  );
}

// ── Single Card ───────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  subValue = null,
  subLabel = null,
  trend = null,           // 'up' | 'down' | null
  trendValue = null,
  color = 'primary',
  progressPct = null,
  donutPct = null,
  sparkData = null,
  tooltip = null,
  loading = false,
  index = 0,
}) {
  const colorMap = {
    primary: { icon: 'text-primary bg-primary/10', bar: 'bg-primary', donut: 'var(--color-primary)' },
    success: { icon: 'text-success bg-success-soft', bar: 'bg-success', donut: 'var(--color-success)' },
    warning: { icon: 'text-warning bg-warning-soft', bar: 'bg-warning', donut: 'var(--color-warning)' },
    danger:  { icon: 'text-danger bg-danger-soft',   bar: 'bg-danger',  donut: 'var(--color-danger)'  },
    info:    { icon: 'text-info bg-info-soft',        bar: 'bg-info',    donut: 'var(--color-info)'    },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow duration-300 min-w-0"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`p-2 rounded-xl shrink-0 ${c.icon}`}>{icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-xs text-text-secondary font-medium truncate">{label}</p>
              {tooltip && <Tip text={tooltip} />}
            </div>
          </div>
        </div>
        {sparkData && <MiniSparkline data={sparkData} color={c.donut} width={64} height={28} />}
        {donutPct !== null && !sparkData && (
          <DonutChart value={donutPct} size={48} strokeWidth={5} color={c.donut}
            label={`${Math.round(donutPct)}%`} />
        )}
      </div>

      {/* Main value */}
      {loading ? (
        <div className="h-8 bg-border rounded animate-pulse w-2/3" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-text-primary leading-none">{value}</span>
          {subValue !== null && (
            <span className="text-sm text-text-secondary mb-0.5">/ {subValue}</span>
          )}
          {trendValue !== null && (
            <span className={`text-xs font-medium mb-0.5 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-muted'}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {trendValue}
            </span>
          )}
        </div>
      )}

      {/* Sub label */}
      {subLabel && <p className="text-[11px] text-text-muted -mt-2">{subLabel}</p>}

      {/* Progress bar */}
      {progressPct !== null && (
        <ProgressBar value={progressPct} colorClass={c.bar} height={5} />
      )}
    </motion.div>
  );
}

// ── KpiCards Grid ─────────────────────────────────────────────────────────────

export default function KpiCards({ kpiData, loading = false }) {
  const d = kpiData || {};

  const clusterPct = d.clusterCoverage?.planned
    ? Math.round((d.clusterCoverage.covered / d.clusterCoverage.planned) * 100) : 0;
  const statePct   = d.stateCoverage?.planned
    ? Math.round((d.stateCoverage.covered / d.stateCoverage.planned) * 100) : 0;
  const distPct    = d.districtCoverage?.planned
    ? Math.round((d.districtCoverage.covered / d.districtCoverage.planned) * 100) : 0;
  const franPct    = d.totalFranchisees
    ? Math.round((d.activeFranchisees / d.totalFranchisees) * 100) : 0;
  const kitPct     = d.kitGoal
    ? Math.round((d.kitAchievement / d.kitGoal) * 100) : 0;

  const cards = [
    {
      icon: <FiGrid size={16} />,
      label: 'Cluster Coverage',
      value: `${d.clusterCoverage?.covered ?? '—'}`,
      subValue: d.clusterCoverage?.planned ?? '—',
      subLabel: d.clusterCoverage?.note,
      progressPct: clusterPct,
      color: 'primary',
      tooltip: 'Clusters with at least one active franchisee vs. total configured clusters.',
    },
    {
      icon: <FiMapPin size={16} />,
      label: 'State Coverage',
      value: `${d.stateCoverage?.covered ?? '—'}`,
      subValue: d.stateCoverage?.planned ?? '—',
      subLabel: 'Active states / configured states',
      progressPct: statePct,
      color: 'info',
      tooltip: 'States with at least one active franchisee as a proportion of all configured states.',
    },
    {
      icon: <FiMapPin size={16} />,
      label: 'District Coverage',
      value: `${d.districtCoverage?.covered ?? '—'}`,
      subValue: d.districtCoverage?.planned ?? '—',
      subLabel: 'Active districts / configured districts',
      progressPct: distPct,
      color: 'info',
      tooltip: 'Districts with at least one active franchisee vs. total configured districts.',
    },
    {
      icon: <FiUsers size={16} />,
      label: 'Active Franchisees',
      value: d.activeFranchisees ?? '—',
      subValue: d.totalFranchisees ?? '—',
      subLabel: 'vs. total onboarded',
      progressPct: franPct,
      color: 'success',
      tooltip: 'Franchisees with activation_status = "active". Sub-value = total onboarded.',
    },
    {
      icon: <FiTarget size={16} />,
      label: 'Kit Sales Achievement',
      value: d.kitAchievement ?? '—',
      subValue: d.kitGoal ?? '—',
      subLabel: `${kitPct}% of goal (Delivered kits)`,
      progressPct: Math.min(kitPct, 100),
      color: kitPct >= 100 ? 'success' : kitPct >= 60 ? 'warning' : 'danger',
      tooltip: 'Sum of delivered kit quantities vs. sum of active kit targets for the selected period. Excludes cancelled/returned.',
    },
    {
      icon: <FiHome size={16} />,
      label: 'Active Warehouses',
      value: d.activeWarehouses ?? '—',
      subLabel: 'Company-verified active warehouses',
      color: 'primary',
      tooltip: 'Warehouses where is_active = true. Independent of franchisee shop operational status.',
    },
    {
      icon: <FiShoppingBag size={16} />,
      label: 'Operational Shops',
      value: d.operationalShops ?? '—',
      subLabel: 'Franchisee shops fully operational',
      color: 'success',
      tooltip: 'Franchisees where is_operational = true (store setup completed and operations started).',
    },
    {
      icon: <FiPackage size={16} />,
      label: 'Total Orders',
      value: d.totalOrders?.toLocaleString() ?? '—',
      subLabel: 'All qualifying orders (excludes cancelled)',
      color: 'primary',
      tooltip: 'Count of FPO orders excluding CANCELLED, EXPIRED, DRAFT, REJECTED statuses.',
    },
    {
      icon: <FiZap size={16} />,
      label: 'Kits Sold',
      value: d.kitsSold ?? '—',
      subLabel: 'Delivered kit quantity units',
      color: 'primary',
      tooltip: 'Total eligible_quantity from franchisee_target_progress: delivered − cancelled − returned.',
    },
    {
      icon: <FiPercent size={16} />,
      label: 'Kit Adoption',
      value: `${d.kitAdoptionPct ?? '—'}%`,
      donutPct: d.kitAdoptionPct ?? 0,
      color: (d.kitAdoptionPct ?? 0) >= 70 ? 'success' : (d.kitAdoptionPct ?? 0) >= 40 ? 'warning' : 'danger',
      tooltip: 'Franchisees with ≥1 delivered kit ÷ total active franchisees × 100.',
    },
    {
      icon: <FiTrendingUp size={16} />,
      label: 'Expansion Progress',
      value: `${d.expansionPct ?? '—'}%`,
      subLabel: 'Active ÷ Target franchisees × 100',
      progressPct: d.expansionPct ?? 0,
      color: (d.expansionPct ?? 0) >= 80 ? 'success' : (d.expansionPct ?? 0) >= 50 ? 'warning' : 'danger',
      tooltip: 'Franchisee expansion progress only. Territory coverage is shown separately in the Coverage section.',
    },
    // ── EPC metrics (new stage) ─────────────────────────────────────────────
    {
      icon: <FiBriefcase size={16} />,
      label: 'EPC Accounts',
      value: d.totalEpcAccounts ?? '—',
      subLabel: 'Live registered EPC contractors',
      color: 'primary',
      tooltip: 'Total EPC accounts across all classification types (Government, Tender, New, Experienced, etc.).',
    },
    {
      icon: <FiUserCheck size={16} />,
      label: 'EPC Leads',
      value: d.totalEpcLeads ?? '—',
      subLabel: `${d.classifiedEpcs ?? 0} classified · ${d.unclassifiedEpcs ?? 0} unclassified`,
      color: 'info',
      tooltip: 'Total EPC leads in the pipeline. Classified = assigned an EPC type. Unclassified = type not yet set.',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <KpiCard key={card.label} {...card} index={i} loading={loading} />
      ))}
    </div>
  );
}
