import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { FiBox, FiZap, FiExternalLink, FiDollarSign, FiInfo } from 'react-icons/fi';
import DemandVerifyModal from './DemandVerifyModal';

export default function DashboardDemandSection({ data = {}, onDrillDown }) {
  const { summary = {}, demandRows = [] } = data;
  const [selectedMetric, setSelectedMetric] = useState(null);

  const totalEstQty = summary.totalEstimatedDemandQty ?? demandRows.reduce((sum, r) => sum + (r.estimatedQuantity || 0), 0);
  const confirmedQty = summary.confirmedKitDemandQty ?? demandRows.reduce((sum, r) => sum + (r.confirmedQuantity || 0), 0);
  const pendingQty = summary.pendingKitDemandQty ?? Math.max(0, totalEstQty - confirmedQty);
  const totalValueInr = summary.totalEstimatedValueInr || demandRows.reduce((sum, r) => sum + (r.estimatedOrderValue || 0), 0);

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
              Estimated kit quantity demand vs confirmed order volumes across residential & commercial segments
            </p>
          </div>
        </div>
        <button
          onClick={() => onDrillDown && onDrillDown('quotes', 'All Kit Quotations & Demand')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
        >
          <span>View Demand Records</span>
          <FiExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Card 1: Total Estimated Demand */}
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block">Total Estimated Demand</span>
            <button
              type="button"
              onClick={() => setSelectedMetric({
                title: 'Total Estimated Demand',
                displayValue: `${(totalEstQty || 0).toLocaleString()} Kits`,
                formula: 'Σ (Estimated Kit Quantity across all Configured Combo Kit Quotes)',
                equation: `${demandRows.map((r) => `${r.kitName || r.category}: ${r.estimatedQuantity}`).join(' + ')} = ${totalEstQty} Kits`,
                description: 'Total number of configured combo kits requested across all active EPC quotation records in the selected date range and geography filter.',
                dataSource: 'EPC Quotations DB (EpcQuote collection)',
                breakdownItems: demandRows.map((r) => ({
                  label: r.kitName || r.category,
                  value: `${r.estimatedQuantity} Kits`,
                  subLabel: `Capacity: ${r.capacity}`,
                })),
                drillDownTarget: 'quotes',
                drillDownLabel: 'All Kit Quotations',
              })}
              title="Inspect calculation formula"
              className="w-5 h-5 rounded-full flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <FiInfo className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xl font-black text-primary dark:text-primary-dark">{(totalEstQty || 0).toLocaleString()} Kits</span>
        </div>

        {/* Card 2: Confirmed Kit Demand */}
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block">Confirmed Kit Demand</span>
            <button
              type="button"
              onClick={() => setSelectedMetric({
                title: 'Confirmed Kit Demand',
                displayValue: `${(confirmedQty || 0).toLocaleString()} Kits`,
                formula: 'Σ (Confirmed Ordered Kit Quantities from Active Non-Cancelled Orders)',
                equation: `${demandRows.map((r) => `${r.kitName || r.category}: ${r.confirmedQuantity}`).join(' + ')} = ${confirmedQty} Kits`,
                description: 'Total number of combo kits successfully converted into confirmed, active EPC purchase orders (order status is not "cancelled").',
                dataSource: 'Confirmed Orders DB (EpcOrder collection)',
                breakdownItems: demandRows.map((r) => ({
                  label: r.kitName || r.category,
                  value: `${r.confirmedQuantity} Kits`,
                  subLabel: `Capacity: ${r.capacity}`,
                })),
                drillDownTarget: 'orders',
                drillDownLabel: 'All Confirmed Orders',
              })}
              title="Inspect calculation formula"
              className="w-5 h-5 rounded-full flex items-center justify-center text-text-secondary hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <FiInfo className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{(confirmedQty || 0).toLocaleString()} Kits</span>
        </div>

        {/* Card 3: Pending Demand Pipeline */}
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block">Pending Demand Pipeline</span>
            <button
              type="button"
              onClick={() => setSelectedMetric({
                title: 'Pending Demand Pipeline',
                displayValue: `${(pendingQty || 0).toLocaleString()} Kits`,
                formula: 'Total Estimated Demand (Kits) - Confirmed Kit Demand (Kits)',
                equation: `${totalEstQty} Kits (Estimated) - ${confirmedQty} Kits (Confirmed) = ${pendingQty} Kits`,
                description: 'Remaining unfulfilled or unconverted quotation kit demand currently progressing through the sales and fulfillment pipeline.',
                dataSource: 'Calculated Pipeline Gap (Quotations vs Confirmed Orders)',
                breakdownItems: demandRows.map((r) => ({
                  label: r.kitName || r.category,
                  value: `${Math.max(0, (r.estimatedQuantity || 0) - (r.confirmedQuantity || 0))} Kits pending`,
                  subLabel: `Est: ${r.estimatedQuantity} | Confirmed: ${r.confirmedQuantity}`,
                })),
                drillDownTarget: 'quotes',
                drillDownLabel: 'Pending Demand Pipeline',
              })}
              title="Inspect calculation formula"
              className="w-5 h-5 rounded-full flex items-center justify-center text-text-secondary hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
            >
              <FiInfo className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{(pendingQty || 0).toLocaleString()} Kits</span>
        </div>

        {/* Card 4: Potential Order Value */}
        <div className="bg-bg-light/60 dark:bg-bg-dark border border-border/60 dark:border-border-dark rounded-xl p-3">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-text-secondary dark:text-text-secondary-dark block">Potential Order Value</span>
            <button
              type="button"
              onClick={() => setSelectedMetric({
                title: 'Potential Order Value',
                displayValue: `₹${(totalValueInr || 0).toLocaleString('en-IN')}`,
                formula: 'Σ (Estimated Quotation Value in INR across all Configured Combo Kits)',
                equation: `${demandRows.map((r) => `₹${(r.estimatedOrderValue || 0).toLocaleString('en-IN')}`).join(' + ')} = ₹${(totalValueInr || 0).toLocaleString('en-IN')}`,
                description: 'Aggregated monetary quotation value of all combo kit quotes in the pipeline, calculated from total quote amounts in INR.',
                dataSource: 'EPC Quotations DB (EpcQuote total_amount_paise / 100)',
                breakdownItems: demandRows.map((r) => ({
                  label: r.kitName || r.category,
                  value: `₹${(r.estimatedOrderValue || 0).toLocaleString('en-IN')}`,
                  subLabel: `Est. Qty: ${r.estimatedQuantity} kits`,
                })),
                drillDownTarget: 'quotes',
                drillDownLabel: 'Quotation Financial Records',
              })}
              title="Inspect calculation formula"
              className="w-5 h-5 rounded-full flex items-center justify-center text-text-secondary hover:text-teal-600 hover:bg-teal-500/10 transition-colors cursor-pointer"
            >
              <FiInfo className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xl font-black text-teal-600 dark:text-teal-400">₹{(totalValueInr || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Chart: Estimated vs Confirmed Demand by Configured Kit */}
      <div className="border border-border/60 dark:border-border-dark rounded-xl p-4 mb-6">
        <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark mb-3">
          Kit Demand by Configured Combo Kit (Estimated vs Confirmed)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demandRows}>
              <XAxis dataKey="kitName" stroke="#94a3b8" fontSize={10} interval={0} angle={-10} textAnchor="end" height={45} />
              <YAxis unit=" Kits" stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="estimatedQuantity" name="Estimated Demand (Kits)" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="confirmedQuantity" name="Confirmed Orders (Kits)" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                <th className="py-2.5 px-3 font-semibold text-right">Confirmed Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right">Estimated Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {demandRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-primary/5 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-text-primary dark:text-text-primary-dark">{row.kitName || row.category}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{row.capacity}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{row.estimatedQuantity}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{row.confirmedQuantity}</td>
                  <td className="py-2.5 px-3 text-right font-bold">₹{row.estimatedOrderValue.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demand Metric Formula Verification Modal */}
      <DemandVerifyModal
        isOpen={Boolean(selectedMetric)}
        onClose={() => setSelectedMetric(null)}
        metric={selectedMetric}
        onDrillDown={onDrillDown}
      />
    </div>
  );
}
