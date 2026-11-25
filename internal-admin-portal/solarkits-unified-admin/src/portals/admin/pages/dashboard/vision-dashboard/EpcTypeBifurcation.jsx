/**
 * EpcTypeBifurcation.jsx
 *
 * Vision Dashboard — EPC Type Breakdown section.
 *
 * Bifurcates the entire EPC ecosystem by classification type.
 * Shows live counts per EPC type (accounts + leads + signup requests)
 * from the /api/epc-types/list endpoint.
 *
 * Types: Government Contractor | Tender Bidder | New EPC | Experienced EPC
 *        (and any custom types created by admin)
 *
 * Data source: visionApi.getEpcTypes() → enriched with accounts_count,
 *   leads_count, requests_count per type.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBriefcase, FiUsers, FiTrendingUp, FiAlertCircle,
  FiChevronDown, FiChevronUp, FiActivity, FiEye,
} from 'react-icons/fi';
import { HorizontalBarChart, ProgressBar } from './VisionCharts';

// ── Badge color → Tailwind classes ───────────────────────────────────────────

const BADGE_STYLE = {
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', bar: '#7c3aed', border: 'border-purple-200 dark:border-purple-700/40' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', bar: '#2563eb', border: 'border-blue-200 dark:border-blue-700/40' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', bar: '#059669', border: 'border-emerald-200 dark:border-emerald-700/40' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', bar: '#d97706', border: 'border-amber-200 dark:border-amber-700/40' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', bar: '#dc2626', border: 'border-red-200 dark:border-red-700/40' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', bar: '#0d9488', border: 'border-teal-200 dark:border-teal-700/40' },
  gray: { bg: 'bg-surface-hover', text: 'text-text-secondary', bar: '#94a3b8', border: 'border-border' },
};

function badgeStyle(color) {
  return BADGE_STYLE[color] || BADGE_STYLE.gray;
}

// ── Single EPC Type Card ──────────────────────────────────────────────────────

function EpcTypeCard({ epcType, totalAccounts, index, isSelected, onSelect, onViewEpcType }) {
  const style = badgeStyle(epcType.badge_color);
  const accounts = epcType.accounts_count || 0;
  const leads = epcType.leads_count || 0;
  const requests = epcType.requests_count || 0;
  const total = accounts + leads;
  const pct = totalAccounts > 0 ? Math.round((accounts / totalAccounts) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={onSelect}
      className={`card p-4 cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm hover:border-primary/30'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`p-1.5 rounded-lg shrink-0 ${style.bg} ${style.text}`}>
            <FiBriefcase size={14} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{epcType.name}</p>
            {epcType.code && (
              <p className="text-[10px] text-text-muted font-mono">{epcType.code}</p>
            )}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-medium ${style.bg} ${style.text} ${style.border}`}>
          {pct}%
        </span>
      </div>

      {/* Counts grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-text-primary leading-none">{accounts}</p>
          <p className="text-[10px] text-text-muted mt-0.5">Accounts</p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-lg font-bold text-text-primary leading-none">{leads}</p>
          <p className="text-[10px] text-text-muted mt-0.5">Leads</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-text-primary leading-none">{requests}</p>
          <p className="text-[10px] text-text-muted mt-0.5">Requests</p>
        </div>
      </div>

      {/* Progress bar — accounts share of total */}
      <ProgressBar
        value={pct}
        colorClass="bg-primary"
        height={4}
        animated
      />

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <span className="text-[10px] text-text-muted">
          {accounts} active account{accounts !== 1 ? 's' : ''}
        </span>
        {onViewEpcType && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewEpcType(epcType);
            }}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <FiEye size={11} /> Details
          </button>
        )}
      </div>

      {epcType.description && (
        <p className="text-[10px] text-text-muted mt-2 line-clamp-2 leading-relaxed">
          {epcType.description}
        </p>
      )}
    </motion.div>
  );
}

// ── Summary Header Row ────────────────────────────────────────────────────────

function EpcSummaryStrip({ summary, epcTypes }) {
  if (!summary) return null;

  const strips = [
    { label: 'Total EPC Types', value: summary.total_types || 0, color: 'text-primary' },
    { label: 'Active Types', value: summary.active_types || 0, color: 'text-success' },
    { label: 'Total EPC Accounts', value: summary.total_accounts || 0, color: 'text-info' },
    { label: 'Total EPC Leads', value: summary.total_leads || 0, color: 'text-warning' },
    { label: 'Classified EPCs', value: summary.total_classified_epcs || 0, color: 'text-success' },
    { label: 'Unclassified EPCs', value: summary.total_unclassified_epcs || 0, color: 'text-danger' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-border rounded-xl overflow-hidden border border-border">
      {strips.map((s, i) => (
        <div key={i} className="bg-surface px-3 py-2.5 text-center">
          <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-text-muted mt-1 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Chart View ────────────────────────────────────────────────────────────────

function EpcTypeChart({ epcTypes }) {
  const [metric, setMetric] = useState('accounts');

  const chartData = useMemo(() => {
    return epcTypes
      .filter(t => t.is_active !== false)
      .map(t => ({
        label: t.name,
        value: metric === 'accounts'
          ? (t.accounts_count || 0)
          : metric === 'leads'
            ? (t.leads_count || 0)
            : (t.accounts_count || 0) + (t.leads_count || 0),
        color: badgeStyle(t.badge_color).bar,
      }))
      .sort((a, b) => b.value - a.value);
  }, [epcTypes, metric]);

  const maxVal = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-sm font-semibold text-text-primary">EPC Distribution by Type</h4>
        <div className="flex rounded-lg overflow-hidden border border-border">
          {[
            { val: 'accounts', label: 'Accounts' },
            { val: 'leads', label: 'Leads' },
            { val: 'total', label: 'Total' },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setMetric(opt.val)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors
                ${metric === opt.val ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-hover'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-10 text-center text-text-muted text-sm">No EPC type data available.</div>
      ) : (
        <HorizontalBarChart
          data={chartData}
          maxValue={maxVal}
          barHeight={26}
          gap={8}
          labelWidth={145}
          showValues
        />
      )}
    </div>
  );
}

// ── Detail Table ──────────────────────────────────────────────────────────────

function EpcTypeTable({ epcTypes, onViewEpcType }) {
  const [expanded, setExpanded] = useState(false);
  const COLS = ['Type', 'Code', 'Accounts', 'Leads', 'Requests', 'Total', 'Status', ''];

  return (
    <div className="card overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-border cursor-pointer"
        onClick={() => setExpanded(p => !p)}
      >
        <h4 className="text-sm font-semibold text-text-primary">Full EPC Type Register</h4>
        <button type="button" className="text-text-muted hover:text-text-primary transition-colors">
          {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {epcTypes.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-sm">No EPC types configured.</div>
            ) : (
              <div className="overflow-x-auto scrollbar-hover">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover">
                    <tr>
                      {COLS.map(h => (
                        <th key={h}
                          className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {epcTypes.map((t, i) => {
                      const style = badgeStyle(t.badge_color);
                      const total = (t.accounts_count || 0) + (t.leads_count || 0);
                      return (
                        <motion.tr key={t._id ? String(t._id) : (t.id ? String(t.id) : `epc-row-${i}`)}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                          className="border-b border-border hover:bg-surface-hover transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-text-primary">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full shrink-0`}
                                style={{ background: style.bar }}
                              />
                              {t.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-muted font-mono text-xs">{t.code || '—'}</td>
                          <td className="px-4 py-3 text-center font-semibold text-text-primary">{t.accounts_count || 0}</td>
                          <td className="px-4 py-3 text-center text-text-secondary">{t.leads_count || 0}</td>
                          <td className="px-4 py-3 text-center text-text-secondary">{t.requests_count || 0}</td>
                          <td className="px-4 py-3 text-center font-bold text-primary">{total}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border
                              ${t.is_active
                                ? 'bg-success-soft text-success border-success/20'
                                : 'bg-surface-hover text-text-muted border-border'}`}
                            >
                              {t.is_active ? '✓ Active' : '○ Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {onViewEpcType && (
                              <button
                                type="button"
                                onClick={() => onViewEpcType(t)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline ml-auto"
                              >
                                <FiEye size={11} /> Details
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EpcTypeBifurcation({
  epcTypes = [],
  epcTypesSummary = null,
  loading = false,
  filters,
  setFilter,
  onViewEpcType,
}) {
  const [selectedTypeId, setSelectedTypeId] = useState(null);

  const totalAccounts = epcTypesSummary?.total_accounts || 0;

  const handleSelectType = (typeId) => {
    const newId = selectedTypeId === typeId ? null : typeId;
    setSelectedTypeId(newId);
    // Optionally sync to filter — let parent decide
    if (setFilter) setFilter('epc_type_id', newId);
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 bg-border rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  if (epcTypes.length === 0) return (
    <div className="card p-8 text-center text-text-muted">
      <FiActivity size={32} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">No EPC types data available. Check API connection to /epc-types/list.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FiBriefcase size={18} className="text-primary" />
          <h2 className="text-lg font-bold text-text-primary">EPC Type Bifurcation</h2>
          <span className="text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
            {epcTypes.length} type{epcTypes.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted bg-surface-hover border border-border px-2 py-0.5 rounded-full">
          <FiAlertCircle size={9} />
          Live counts from EPC master
        </div>
      </div>

      {/* Summary strip */}
      <EpcSummaryStrip summary={epcTypesSummary} epcTypes={epcTypes} />

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {epcTypes.map((et, i) => (
          <EpcTypeCard
            key={et._id ? String(et._id) : (et.id ? String(et.id) : `epc-card-${i}`)}
            epcType={et}
            totalAccounts={totalAccounts}
            index={i}
            isSelected={selectedTypeId === String(et._id || et.id)}
            onSelect={() => handleSelectType(String(et._id || et.id))}
            onViewEpcType={onViewEpcType}
          />
        ))}
      </div>

      {/* Chart */}
      <EpcTypeChart epcTypes={epcTypes} />

      {/* Collapsible full table */}
      <EpcTypeTable epcTypes={epcTypes} onViewEpcType={onViewEpcType} />
    </div>
  );
}

