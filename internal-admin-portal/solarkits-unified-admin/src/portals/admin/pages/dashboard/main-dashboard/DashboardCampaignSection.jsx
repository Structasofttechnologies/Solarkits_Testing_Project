import React from 'react';
import { FiSend, FiExternalLink, FiMail, FiMessageCircle, FiBarChart2 } from 'react-icons/fi';

const formatInr = (num) => `₹${(Number(num) || 0).toLocaleString('en-IN')}`;

export default function DashboardCampaignSection({ data = {}, onDrillDown }) {
  const { campaigns = [] } = data;

  return (
    <div id="section-campaign" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <FiSend className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Campaign Performance & Attribution
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Multi-channel Email & WhatsApp broadcast engagement, attributed leads & confirmed order conversions
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
          Connected to Marketing Module
        </div>
      </div>

      {/* Campaigns Detailed Report Table */}
      <div className="border border-border/60 dark:border-border-dark rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-bg-light/60 dark:bg-bg-dark border-b border-border/60 dark:border-border-dark flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
            Active & Concluded Campaigns Performance
          </h3>
          <span className="text-[11px] text-text-secondary">Attributed to UTM tracking & campaign codes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-light/40 dark:bg-bg-dark/40 text-text-secondary border-b border-border/50">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Campaign Name</th>
                <th className="py-2.5 px-3 font-semibold">Channel</th>
                <th className="py-2.5 px-3 font-semibold text-right">Audience</th>
                <th className="py-2.5 px-3 font-semibold text-right">Sent</th>
                <th className="py-2.5 px-3 font-semibold text-right">Delivered</th>
                <th className="py-2.5 px-3 font-semibold text-right">Clicks</th>
                <th className="py-2.5 px-3 font-semibold text-right">Enquiries</th>
                <th className="py-2.5 px-3 font-semibold text-right">Qualified</th>
                <th className="py-2.5 px-3 font-semibold text-right">Orders</th>
                <th className="py-2.5 px-3 font-semibold text-right">Revenue</th>
                <th className="py-2.5 px-3 font-semibold text-right">Conv. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {campaigns.length > 0 ? (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-primary/5 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-text-primary dark:text-text-primary-dark">{c.campaignName}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                        {c.channel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-secondary">{c.totalAudience.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{c.sent.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{c.delivered.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-sky-600">{c.clicks.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{c.enquiries.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{c.qualifiedLeads.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">{c.orders.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-black text-teal-600">{formatInr(c.revenue)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-primary">{c.conversionRate}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-4 text-center text-text-secondary">
                    No active campaign records found. Create campaigns in the Marketing module to view attribution.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
