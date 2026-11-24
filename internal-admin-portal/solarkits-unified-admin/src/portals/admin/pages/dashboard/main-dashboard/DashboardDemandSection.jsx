import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { FiBox, FiZap, FiExternalLink, FiDollarSign } from 'react-icons/fi';

export default function DashboardDemandSection({ data = {}, onDrillDown }) {
  const { summary = {}, demandRows = [] } = data;

  return (
    <div id="section-demand" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
            <FiZap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Kit Potential & Demand
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Estimated kW solar capacity demand vs confirmed order volumes across residential & commercial segments
            </p>
          </div>
        </div>
        <button
          onClick={() => onDrillDown && onDrillDown('quotes', 'All Kit Quotations & Demand')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <span>View Demand Records</span>
          <FiExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Total Estimated Demand</span>
          <span className="text-xl font-black text-primary dark:text-primary-dark">{(summary.totalEstimatedDemandKw || 0).toLocaleString()} kW</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Confirmed Kit Demand</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{(summary.confirmedKitDemandKw || 0).toLocaleString()} kW</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Pending Demand Pipeline</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{(summary.pendingKitDemandKw || 0).toLocaleString()} kW</span>
        </div>
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block mb-1">Potential Order Value</span>
          <span className="text-xl font-black text-teal-600 dark:text-teal-400">₹{(summary.totalEstimatedValueInr || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Chart: Estimated vs Confirmed kW Demand by Configured Kit */}
      <div className="border border-border/60 dark:border-border-dark rounded-xl p-4 mb-6">
        <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
          Solar Capacity Demand by Configured Combo Kit (Estimated vs Confirmed kW)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demandRows}>
              <XAxis dataKey="kitName" stroke="#94a3b8" fontSize={10} interval={0} angle={-10} textAnchor="end" height={45} />
              <YAxis unit=" kW" stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="estimatedKw" name="Estimated Demand (kW)" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="confirmedKw" name="Confirmed Orders (kW)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Demand Table */}
      <div className="border border-border/60 dark:border-border-dark rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-bg-light/60 dark:bg-bg-dark border-b border-border/60 dark:border-border-dark flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
            Configured Solar Combo Kits & Demand Breakdown
          </h3>
          <span className="text-[11px] text-text-secondary">Admin configured catalog registry</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-light/40 dark:bg-bg-dark/40 text-text-secondary border-b border-border/50">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Configured Combo Kit</th>
                <th className="py-2.5 px-3 font-semibold">Capacity</th>
                <th className="py-2.5 px-3 font-semibold text-right">Est. Quantity</th>
                <th className="py-2.5 px-3 font-semibold text-right">Est. kW</th>
                <th className="py-2.5 px-3 font-semibold text-right">Confirmed Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right">Confirmed kW</th>
                <th className="py-2.5 px-3 font-semibold text-right">Estimated Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {demandRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-primary/5 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-text-primary dark:text-text-primary-dark">{row.kitName || row.category}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{row.capacity}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{row.estimatedQuantity}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-orange-600">{row.estimatedKw} kW</td>
                  <td className="py-2.5 px-3 text-right font-medium">{row.confirmedQuantity}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{row.confirmedKw} kW</td>
                  <td className="py-2.5 px-3 text-right font-bold">₹{row.estimatedOrderValue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
