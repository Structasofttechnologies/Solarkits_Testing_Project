import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { FiUsers, FiShield, FiActivity, FiExternalLink, FiAward } from 'react-icons/fi';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function DashboardEpcSection({ data = {}, onDrillDown }) {
  const { summary = {}, verificationFunnel = [], topEpcs = [] } = data;

  return (
    <div id="section-epc" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FiUsers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              EPC Network Analytics
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Partner verification lifecycle, purchasing activity, regional footprint & top performers
            </p>
          </div>
        </div>
        <button
          onClick={() => onDrillDown && onDrillDown('epcs', 'All Registered EPC Contractors')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <span>View EPC Directory</span>
          <FiExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Business Rule Notice Banner */}
      <div className="mb-5 px-3.5 py-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between">
        <span>
          <strong>Approved Active Rule:</strong> Verified EPCs with activity within 30 days OR at least 1 lifetime order. Registration, verification, and activity are tracked independently.
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Registered EPCs</span>
          <span className="text-lg font-black text-text-primary dark:text-text-primary-dark">{(summary.registeredEpcs || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">GST Verified</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{(summary.verifiedEpcs || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Active EPCs</span>
          <span className="text-lg font-black text-primary dark:text-primary-dark">{(summary.activeEpcs || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Inactive EPCs</span>
          <span className="text-lg font-black text-text-secondary">{(summary.inactiveEpcs || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">With Orders</span>
          <span className="text-lg font-black text-teal-600 dark:text-teal-400">{(summary.epcsWithOrders || 0).toLocaleString()}</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Without Orders</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400">{(summary.epcsWithoutOrders || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Grid: Funnel Chart and Top EPCs Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Bar Chart */}
        <div className="border border-border/60 dark:border-border-dark rounded-xl p-4">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
            EPC Network Lifecycle Funnel
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={verificationFunnel}>
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={10} width={95} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]}>
                  {verificationFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing EPCs Table */}
        <div className="lg:col-span-2 border border-border/60 dark:border-border-dark rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-bg-light/60 dark:bg-bg-dark border-b border-border/60 dark:border-border-dark flex items-center justify-between">
            <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark flex items-center gap-1.5">
              <FiAward className="w-3.5 h-3.5 text-amber-500" /> Top Performing EPCs by Order Value
            </h3>
            <span className="text-[11px] text-text-secondary">Ranked by volume</span>
          </div>
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-light/40 dark:bg-bg-dark/40 text-text-secondary sticky top-0 border-b border-border/50">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">EPC Contractor</th>
                  <th className="py-2.5 px-3 font-semibold">State</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Orders</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Order Value</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topEpcs.length > 0 ? (
                  topEpcs.map((epc) => (
                    <tr key={epc.id} className="hover:bg-primary/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-text-primary dark:text-text-primary-dark">{epc.name}</div>
                        <div className="text-[10px] text-text-secondary">{epc.gstin}</div>
                      </td>
                      <td className="py-2.5 px-3 text-text-secondary">{epc.state}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-primary">{epc.totalOrders}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">₹{(epc.orderValue || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onDrillDown && onDrillDown('epcs', `EPC: ${epc.name}`)}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-text-secondary">No EPC orders recorded in this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
