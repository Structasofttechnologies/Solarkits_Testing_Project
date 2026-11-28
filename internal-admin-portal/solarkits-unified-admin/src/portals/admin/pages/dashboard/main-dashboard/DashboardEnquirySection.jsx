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
import { FiFileText, FiPhoneCall, FiMessageSquare, FiExternalLink, FiClock, FiCheckSquare } from 'react-icons/fi';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export default function DashboardEnquirySection({ data = {}, onDrillDown }) {
  const { metrics = {}, sourcesDistribution = [], statusDistribution = [] } = data;

  return (
    <div id="section-enquiry" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FiFileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Enquiry Funnel
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Lead ingestion, response time SLA, qualification breakdown & multi-channel sources
            </p>
          </div>
        </div>
        <button
          onClick={() => onDrillDown && onDrillDown('enquiries', 'All Customer & EPC Enquiries')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <span>View Detailed Enquiries</span>
          <FiExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Total Enquiries</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(metrics.totalEnquiries || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Website Forms</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(metrics.websiteFormEnquiries || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Call Enquiries</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(metrics.callEnquiries || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">WhatsApp Leads</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(metrics.whatsappEnquiries || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Onboarded Leads</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{(metrics.qualifiedLeads || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">First Response Time</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400">{metrics.firstResponseTime || 'N/A'}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enquiries by Source */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            Enquiries by Channel Source
          </h3>
          <div className="h-56">
            {sourcesDistribution && sourcesDistribution.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourcesDistribution}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-text-secondary">
                No channel enquiries recorded in selected period.
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            Enquiry Status Breakdown
          </h3>
          <div className="h-56">
            {statusDistribution && statusDistribution.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-text-secondary">
                No enquiry status records in selected period.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
