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
import { FiGlobe, FiExternalLink } from 'react-icons/fi';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const DEFAULT_BREAKDOWN = [
  {
    websiteKey: 'solarkits_main',
    siteDomain: 'solarkits.in',
    siteUrl: 'http://solarkits.in/',
    label: 'SolarKits Main',
    shortLabel: 'solarkits.in',
    color: '#2563eb',
    totalVisitors: 0,
    uniqueVisitors: 0,
    newVisitors: 0,
    returningVisitors: 0,
    pageViews: 0,
    formSubmissions: 0,
    avgSessionDuration: '0m 0s',
    bounceRate: '0%',
    sharePct: 0,
  },
  {
    websiteKey: 'solar_store',
    siteDomain: 'store.solarkits.in',
    siteUrl: 'https://store.solarkits.in/',
    label: 'Solar Store',
    shortLabel: 'store.solarkits.in',
    color: '#10b981',
    totalVisitors: 0,
    uniqueVisitors: 0,
    newVisitors: 0,
    returningVisitors: 0,
    pageViews: 0,
    formSubmissions: 0,
    avgSessionDuration: '0m 0s',
    bounceRate: '0%',
    sharePct: 0,
  },
  {
    websiteKey: 'franchise_portal',
    siteDomain: 'franchise.solarkits.in',
    siteUrl: 'https://franchise.solarkits.in/',
    label: 'Franchise Portal',
    shortLabel: 'franchise.solarkits.in',
    color: '#f59e0b',
    totalVisitors: 0,
    uniqueVisitors: 0,
    newVisitors: 0,
    returningVisitors: 0,
    pageViews: 0,
    formSubmissions: 0,
    avgSessionDuration: '0m 0s',
    bounceRate: '0%',
    sharePct: 0,
  },
];

const SITE_BADGE_MAP = {
  solarkits_main: {
    label: 'solarkits.in',
    color: '#2563eb',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/70',
  },
  solar_store: {
    label: 'store.solarkits.in',
    color: '#10b981',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/70',
  },
  franchise_portal: {
    label: 'franchise.solarkits.in',
    color: '#f59e0b',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/70',
  },
};

export default function DashboardWebsiteSection({
  data = {},
  activeWebsite = 'all',
  onWebsiteChange,
  onDrillDown,
}) {
  const {
    summary = {},
    websiteBreakdown = [],
    trafficSources = [],
    topLandingPages = [],
    dailyTrend = [],
  } = data;

  const sites = websiteBreakdown && websiteBreakdown.length > 0 ? websiteBreakdown : DEFAULT_BREAKDOWN;
  const selectedSiteMeta = activeWebsite !== 'all' ? SITE_BADGE_MAP[activeWebsite] : null;

  const handleSelectSite = (siteKey) => {
    if (!onWebsiteChange) return;
    if (siteKey === activeWebsite && siteKey !== 'all') {
      onWebsiteChange('all');
    } else {
      onWebsiteChange(siteKey);
    }
  };

  return (
    <div id="section-website" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <FiGlobe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Website Performance
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Traffic trends, source attribution, session telemetry &amp; landing page conversion across all 3 SolarKits websites
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Website Quick Switcher */}
          <div className="flex items-center gap-1 bg-bg-light/80 dark:bg-bg-dark border border-border/70 dark:border-border-dark rounded-xl p-1">
            <button
              type="button"
              onClick={() => handleSelectSite('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${activeWebsite === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:text-text-primary'
                }`}
            >
              All Websites
            </button>
            {sites.map((site) => {
              const isSelected = activeWebsite === site.websiteKey;
              return (
                <button
                  key={site.websiteKey}
                  type="button"
                  onClick={() => handleSelectSite(site.websiteKey)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${isSelected
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary dark:text-text-secondary-dark hover:text-text-primary'
                    }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#ffffff' : site.color }}
                  />
                  <span>{site.shortLabel || site.siteDomain}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() =>
              onDrillDown &&
              onDrillDown(
                'website',
                selectedSiteMeta
                  ? `Website Visitor Records — ${selectedSiteMeta.label}`
                  : 'Website Visitor Records'
              )
            }
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <span>View Detailed Records</span>
            <FiExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Per-Website Separate Traffic Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {sites.map((site) => {
          const isSelected = activeWebsite === site.websiteKey;
          return (
            <div
              key={site.websiteKey}
              onClick={() => handleSelectSite(site.websiteKey)}
              className={`rounded-xl p-3.5 border transition-all cursor-pointer ${isSelected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xs'
                  : 'border-border/70 dark:border-border-dark bg-bg-light/40 dark:bg-bg-dark/40 hover:border-primary/40'
                }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: site.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text-primary dark:text-text-primary-dark truncate">
                      {site.label}
                    </div>
                    <div className="text-[11px] font-mono text-text-secondary dark:text-text-secondary-dark truncate">
                      {site.siteUrl}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-card-dark border border-border/60 dark:border-border-dark text-text-primary dark:text-text-primary-dark shrink-0">
                  {site.sharePct || 0}% share
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50 dark:border-border-dark/50 text-center">
                <div>
                  <span className="text-[10px] text-text-secondary block">Visitors</span>
                  <span className="text-sm font-black text-text-primary dark:text-text-primary-dark">
                    {(site.totalVisitors || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Unique</span>
                  <span className="text-sm font-black text-text-primary dark:text-text-primary-dark">
                    {(site.uniqueVisitors || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Enquiries</span>
                  <span className="text-sm font-black text-emerald-600">
                    {(site.formSubmissions || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Avg Time</span>
                  <span className="text-xs font-bold text-text-primary dark:text-text-primary-dark leading-5">
                    {site.avgSessionDuration || '0m 0s'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics Row (Overall or Selected Website) */}
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
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{summary.bounceRate || '0%'}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitor Trend Area Chart */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            Visitors Trend (Daily Volume{selectedSiteMeta ? ` — ${selectedSiteMeta.label}` : ' by Website'})
          </h3>
          <div className="h-56">
            {dailyTrend && dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selectedSiteMeta?.color || '#2563eb'} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={selectedSiteMeta?.color || '#2563eb'} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  {activeWebsite === 'all' ? (
                    <>
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Area
                        type="monotone"
                        dataKey="solarkits_main"
                        name="solarkits.in"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fillOpacity={0.12}
                        fill="#2563eb"
                      />
                      <Area
                        type="monotone"
                        dataKey="solar_store"
                        name="store.solarkits.in"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={0.12}
                        fill="#10b981"
                      />
                      <Area
                        type="monotone"
                        dataKey="franchise_portal"
                        name="franchise.solarkits.in"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={0.12}
                        fill="#f59e0b"
                      />
                    </>
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      name={selectedSiteMeta?.label || 'Visitors'}
                      stroke={selectedSiteMeta?.color || '#2563eb'}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#visitorGradient)"
                    />
                  )}
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
            Top Landing Pages &amp; Visitor-to-Enquiry Conversion
          </h3>
          <span className="text-[11px] text-text-secondary dark:text-text-secondary-dark">Ranked by volume</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-light/40 dark:bg-bg-dark/40 text-text-secondary border-b border-border/50">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Website</th>
                <th className="py-2.5 px-4 font-semibold">Landing Page URL</th>
                <th className="py-2.5 px-4 font-semibold text-right">Visits</th>
                <th className="py-2.5 px-4 font-semibold text-right">Enquiries Generated</th>
                <th className="py-2.5 px-4 font-semibold text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {topLandingPages.length > 0 ? (
                topLandingPages.map((row, idx) => {
                  const badge = SITE_BADGE_MAP[row.websiteKey] || SITE_BADGE_MAP.solarkits_main;
                  return (
                    <tr key={`${row.websiteKey || 'site'}-${row.page}-${idx}`} className="hover:bg-primary/5 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.badgeClass}`}>
                          {row.siteDomain || badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-text-primary dark:text-text-primary-dark">{row.page}</td>
                      <td className="py-2.5 px-4 text-right font-semibold">{row.visits.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-600 font-semibold">{row.enquiries.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-right font-bold">{row.conversionPct}%</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-text-secondary">No landing page visits recorded for this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
