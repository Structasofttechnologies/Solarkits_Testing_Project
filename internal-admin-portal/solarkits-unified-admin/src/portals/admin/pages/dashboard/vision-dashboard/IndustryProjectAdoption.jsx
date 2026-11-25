/**
 * IndustryProjectAdoption.jsx
 *
 * Industry and project-type adoption section.
 * Switchable view: Industry Type | Project Category | System Type
 *
 * Data is derived from location performance data (grouped by state)
 * and franchisee performance tracker.
 *
 * Note: "Derived from available data" — dedicated endpoint planned for backend phase.
 */

import { useState, useMemo } from 'react';
import { FiBarChart2, FiAlertCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { HorizontalBarChart } from './VisionCharts';

const VIEW_OPTIONS = [
  { value: 'state', label: 'By State' },
  { value: 'status', label: 'By Status' },
  { value: 'epc_type', label: 'By EPC Type' },
];

export default function IndustryProjectAdoption({
  locationPerformance,
  performanceTracker,
  industryTypes,
  allStates = [],
  epcTypes = [],
  loading = false,
}) {
  const [view, setView] = useState('state');

  // Build state-level data from location performance
  const stateData = useMemo(() => {
    const states = locationPerformance?.states || [];
    const stateNameMap = {};
    (allStates || []).forEach(st => {
      stateNameMap[String(st._id || st.id)] = st.name;
    });

    return states
      .map(s => ({
        label: stateNameMap[String(s.state_id)] || s.state_name || s.state_id || 'Unknown State',
        value: s.total_eligible || 0,
        count: s.count || 0,
        avg: s.avg_achievement || 0,
        low: s.low_performing || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [locationPerformance, allStates]);

  // Build status distribution from performance tracker
  const statusData = useMemo(() => {
    const summary = performanceTracker?.summary;
    if (!summary) return [];
    return [
      { label: 'Achieved / Exceeded', value: summary.achieved || 0, color: 'var(--color-success)' },
      { label: 'On Track', value: summary.on_track || 0, color: 'var(--color-info)' },
      { label: 'Behind / Low', value: summary.behind || 0, color: 'var(--color-warning)' },
      { label: 'Not Started', value: summary.no_orders || 0, color: 'var(--color-text-muted)' },
      { label: 'No Target Set', value: summary.no_target || 0, color: 'var(--color-border)' },
    ].filter(d => d.value > 0);
  }, [performanceTracker]);

  // Build EPC Type distribution (bifurcation)
  const epcData = useMemo(() => {
    return (epcTypes || [])
      .filter(t => t.is_active !== false)
      .map(t => ({
        label: t.name,
        value: t.accounts_count || 0,
        leads: t.leads_count || 0,
        requests: t.requests_count || 0,
        code: t.code,
        color: t.badge_color === 'purple' ? '#7c3aed'
          : t.badge_color === 'emerald' ? '#059669'
            : t.badge_color === 'amber' ? '#d97706'
              : t.badge_color === 'red' ? '#dc2626'
                : '#2563eb',
      }))
      .sort((a, b) => b.value - a.value);
  }, [epcTypes]);

  const displayData = view === 'state' ? stateData : view === 'status' ? statusData : epcData;
  const maxVal = Math.max(...displayData.map(d => d.value), 1);

  if (loading) return (
    <div className="card p-6 space-y-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-border rounded-lg animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FiBarChart2 size={18} className="text-primary" />
          <h2 className="text-lg font-bold text-text-primary">Adoption Breakdown</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-text-muted bg-surface-hover border border-border px-2 py-0.5 rounded-full">
            <FiAlertCircle size={9} /> Derived from performance data
          </span>
          <div className="flex rounded-lg overflow-hidden border border-border">
            {VIEW_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => setView(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                  ${view === opt.value ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-hover'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart card */}
        <div className="card p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-4">
            {view === 'state' ? 'Kits Sold by State'
              : view === 'status' ? 'Franchisee Performance Distribution'
                : 'EPC Accounts by Classification Type'}
          </h4>
          {displayData.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">No data available.</div>
          ) : (
            <HorizontalBarChart
              data={displayData}
              maxValue={maxVal}
              barHeight={22}
              gap={6}
              labelWidth={130}
              showValues
            />
          )}
        </div>

        {/* Table card */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h4 className="text-sm font-semibold text-text-primary">
              {view === 'state' ? 'State Performance'
                : view === 'status' ? 'Status Summary'
                  : 'EPC Types Classification'}
            </h4>
          </div>
          {displayData.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">No data available.</div>
          ) : (
            <div className="overflow-x-auto scrollbar-hover">
              <table className="w-full text-sm">
                <thead className="bg-surface-hover">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                      {view === 'state' ? 'State' : view === 'status' ? 'Status' : 'EPC Classification'}
                    </th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                      {view === 'state' ? 'Kits Sold' : view === 'status' ? 'Count' : 'Accounts'}
                    </th>
                    {view === 'state' && (
                      <>
                        <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted uppercase tracking-wide">FPOs</th>
                        <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted uppercase tracking-wide">Avg Achievement</th>
                      </>
                    )}
                    {view === 'epc_type' && (
                      <>
                        <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted uppercase tracking-wide">Leads</th>
                        <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-text-muted uppercase tracking-wide">Requests</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((d, i) => (
                    <motion.tr key={i}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="border-b border-border hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-4 py-2.5 text-text-primary font-medium text-xs">{d.label}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-text-primary">{d.value}</td>
                      {view === 'state' && (
                        <>
                          <td className="px-4 py-2.5 text-center text-text-secondary text-xs">{d.count}</td>
                          <td className="px-4 py-2.5 text-center text-text-secondary text-xs">{d.avg?.toFixed(1)}%</td>
                        </>
                      )}
                      {view === 'epc_type' && (
                        <>
                          <td className="px-4 py-2.5 text-center text-text-secondary text-xs">{d.leads ?? 0}</td>
                          <td className="px-4 py-2.5 text-center text-text-secondary text-xs">{d.requests ?? 0}</td>
                        </>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
