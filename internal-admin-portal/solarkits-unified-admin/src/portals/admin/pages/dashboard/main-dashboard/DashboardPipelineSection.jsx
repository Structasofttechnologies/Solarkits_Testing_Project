import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { FiTrendingUp, FiAlertOctagon, FiExternalLink, FiClock } from 'react-icons/fi';

const LOST_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6'];

export default function DashboardPipelineSection({ data = {}, onDrillDown }) {
  const { summary = {}, pipelineStages = [], lostReasonsDistribution = [] } = data;

  return (
    <div id="section-pipeline" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <FiTrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Sales Pipeline
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Lead progression stages, quotation conversion velocity & lost-deal root cause analysis
            </p>
          </div>
        </div>
        <button
          onClick={() => onDrillDown && onDrillDown('pipeline', 'CRM Sales Pipeline Leads')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <span>View Pipeline Leads</span>
          <FiExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-6">
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-2.5">
          <span className="text-[10px] font-semibold text-text-secondary block mb-1">Total Leads</span>
          <span className="text-base font-black text-text-primary dark:text-text-primary-dark">{(summary.totalLeads || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-2.5">
          <span className="text-[10px] font-semibold text-text-secondary block mb-1">Contacted</span>
          <span className="text-base font-black text-text-primary dark:text-text-primary-dark">{(summary.contacted || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-2.5">
          <span className="text-[10px] font-semibold text-text-secondary block mb-1">Onboarded</span>
          <span className="text-base font-black text-emerald-600">{(summary.qualified || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-2.5">
          <span className="text-[10px] font-semibold text-text-secondary block mb-1">Quotations</span>
          <span className="text-base font-black text-primary">{(summary.quotations || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-2.5">
          <span className="text-[10px] font-semibold text-text-secondary block mb-1">Follow-ups Due</span>
          <span className="text-base font-black text-amber-600">{(summary.followUpsDue || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-2.5">
          <span className="text-[10px] font-semibold text-text-secondary block mb-1">Trial Orders</span>
          <span className="text-base font-black text-indigo-600">{(summary.trialOrders || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-2.5">
          <span className="text-[10px] font-semibold text-text-secondary block mb-1">Confirmed Orders</span>
          <span className="text-base font-black text-teal-600">{(summary.confirmedOrders || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-2.5">
          <span className="text-[10px] font-semibold text-text-secondary block mb-1">Lost Deals</span>
          <span className="text-base font-black text-rose-600">{(summary.lostLeads || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Stage Bar Chart */}
        <div className="lg:col-span-2 border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            Lead Stage Pipeline Funnel
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineStages}>
                <XAxis dataKey="stage" stroke="#94a3b8" fontSize={10} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lost Reasons Donut Chart */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3 flex items-center gap-1.5">
            <FiAlertOctagon className="w-3.5 h-3.5 text-rose-500" /> Lost Reasons Distribution
          </h3>
          <div className="h-60">
            {lostReasonsDistribution && lostReasonsDistribution.some((r) => r.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lostReasonsDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {lostReasonsDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={LOST_COLORS[index % LOST_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-text-secondary">
                No lost leads recorded in the selected period.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
