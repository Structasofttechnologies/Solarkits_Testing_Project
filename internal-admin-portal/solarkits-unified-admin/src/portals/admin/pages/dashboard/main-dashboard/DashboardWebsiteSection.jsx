import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { FiGlobe, FiExternalLink, FiClock, FiActivity } from 'react-icons/fi';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardWebsiteSection({ data = {}, onDrillDown }) {
  const { summary = {}, trafficSources = [], topLandingPages = [], dailyTrend = [] } = data;

  return (
    <div id="section-website" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <FiGlobe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Website Performance
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Traffic trends, source attribution, session telemetry & landing page conversion
            </p>
          </div>
        </div>
        <button
          onClick={() => onDrillDown && onDrillDown('website', 'Website Visitor Records')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <span>View Detailed Records</span>
          <FiExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Total Visitors</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(summary.totalVisitors || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Unique Visitors</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(summary.uniqueVisitors || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">New Visitors</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(summary.newVisitors || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Returning</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(summary.returningVisitors || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Avg Session</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{summary.avgSessionDuration || '0m 0s'}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Bounce Rate</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{summary.bounceRate || '0.0%'}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitor Trend Area Chart */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            Visitors Trend (Daily Volume)
          </h3>
          <div className="h-56">
            {dailyTrend && dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="visitors" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#visitorGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-text-secondary">
                No visitor traffic recorded in the selected period.
              </div>
            )}
          </div>
        </div>

        {/* Traffic Sources Donut Chart */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            Traffic Source Distribution
          </h3>
          <div className="h-56">
            {trafficSources && trafficSources.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSources}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {trafficSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-text-secondary">
                No traffic source records in the selected period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Landing Pages Table */}
      <div className="mt-6 border border-border/60 dark:border-border-dark rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-bg-light/60 dark:bg-bg-dark border-b border-border/60 dark:border-border-dark flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
            Top Landing Pages & Visitor-to-Enquiry Conversion
          </h3>
          <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark">Ranked by volume</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-light/40 dark:bg-bg-dark/40 text-text-secondary border-b border-border/50">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Landing Page URL</th>
                <th className="py-2.5 px-4 font-semibold text-right">Visits</th>
                <th className="py-2.5 px-4 font-semibold text-right">Enquiries Generated</th>
                <th className="py-2.5 px-4 font-semibold text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {topLandingPages.length > 0 ? (
                topLandingPages.map((row, idx) => (
                  <tr key={idx} className="hover:bg-primary/5 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-text-primary dark:text-text-primary-dark">{row.page}</td>
                    <td className="py-2.5 px-4 text-right font-semibold">{row.visits.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-600 font-semibold">{row.enquiries.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-bold">{row.conversionPct}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-text-secondary">No landing page visits recorded for this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
