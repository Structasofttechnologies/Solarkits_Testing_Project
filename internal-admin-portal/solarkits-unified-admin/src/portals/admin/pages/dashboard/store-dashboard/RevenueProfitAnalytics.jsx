/**
 * RevenueProfitAnalytics.jsx
 * Section C: Revenue, Profit & Kit Sales Analytics
 * Features top financial KPIs, 3 separate Profitability Rankings, and detailed Margin Table.
 */

import React from 'react';
import {
  FiDollarSign,
  FiTrendingUp,
  FiPercent,
  FiBox,
  FiShoppingBag,
  FiAward,
  FiArrowUpRight,
} from 'react-icons/fi';

export default function RevenueProfitAnalytics({
  financialData = {},
  activeRankType = 'profit_amount',
  setActiveRankType,
  onSelectKit,
}) {
  const {
    totalRev = '₹0',
    totalProfit = '₹0',
    profitMarginPct = '0.0%',
    totalKitsSold = 0,
    aov = '₹0',
    avgRevPerKit = '₹0',
    rankedKits = [],
    byOrderType = {},
    byOrderOrigin = [],
  } = financialData || {};

  return (
    <div className="space-y-4">
      {/* Top Financial KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <FiDollarSign size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-text">{totalRev}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">+18.4% QoQ</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Gross Profit</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <FiTrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-primary">{totalProfit}</div>
          <span className="text-[11px] text-text-muted">Net realized margin</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Profit Margin</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <FiPercent size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600">{profitMarginPct}</div>
          <span className="text-[11px] text-text-muted">Average gross margin</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Kits Sold</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
              <FiBox size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-text">{totalKitsSold}</div>
          <span className="text-[11px] text-text-muted">Total units dispatched</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Avg Order Value</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <FiShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-text">{aov}</div>
          <span className="text-[11px] text-text-muted">Across all channels</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Avg Rev / Kit</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
              <FiDollarSign size={18} />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-text">{avgRevPerKit}</div>
          <span className="text-[11px] text-text-muted">Unit realization</span>
        </div>
      </div>

      {/* Profitability Ranking Selector (Document Requirement: 3 Separate Rankings) */}
      <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <FiAward size={18} />
              </div>
              <h3 className="text-sm font-bold text-text">Kit Profitability & Performance Rankings</h3>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Rank kit types (1 kW, 2 kW, 3 kW, 5 kW, 10 kW) using 3 distinct commercial ranking criteria
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setActiveRankType('profit_amount')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeRankType === 'profit_amount'
                  ? 'bg-primary text-text-inverse shadow-xs'
                  : 'text-text-muted hover:text-text'
                }`}
            >
              Rank 1: Profit Amount (₹)
            </button>
            <button
              type="button"
              onClick={() => setActiveRankType('profit_margin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeRankType === 'profit_margin'
                  ? 'bg-primary text-text-inverse shadow-xs'
                  : 'text-text-muted hover:text-text'
                }`}
            >
              Rank 2: Margin %
            </button>
            <button
              type="button"
              onClick={() => setActiveRankType('revenue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeRankType === 'revenue'
                  ? 'bg-primary text-text-inverse shadow-xs'
                  : 'text-text-muted hover:text-text'
                }`}
            >
              Rank 3: Total Revenue (₹)
            </button>
          </div>
        </div>

        {/* Revenue & Profit Table (Exact Document Table C) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Rank</th>
                <th className="py-2.5 px-4">Kit Type / Model</th>
                <th className="py-2.5 px-4 text-center">Kits Sold</th>
                <th className="py-2.5 px-4">Revenue</th>
                <th className="py-2.5 px-4">Gross Profit</th>
                <th className="py-2.5 px-4">Profit Margin %</th>
                <th className="py-2.5 px-4">Avg Order Value</th>
                <th className="py-2.5 px-4 text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankedKits.map((row, idx) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface-subtle transition-colors cursor-pointer group"
                  onClick={() => onSelectKit && onSelectKit(row)}
                >
                  <td className="py-3 px-4">
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${idx === 0
                          ? 'bg-amber-500 text-white shadow-xs'
                          : idx === 1
                            ? 'bg-slate-400 text-white'
                            : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-surface-subtle text-text-muted'
                        }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-text group-hover:text-primary transition-colors">
                    {row.kit}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-text">{row.kitsSold}</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{row.revenueFormatted}</td>
                  <td className="py-3 px-4 font-bold text-primary">{row.grossProfitFormatted}</td>
                  <td className="py-3 px-4 font-black text-purple-600">{row.profitMarginPct}%</td>
                  <td className="py-3 px-4 text-text-muted">{row.avgOrderValue}</td>
                  <td className="py-3 px-4 text-right text-primary font-semibold">
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Orders <FiArrowUpRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue by Loose Qty vs PO Orders & Order Origin Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Loose Quantity vs PO Orders */}
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-text uppercase tracking-wider">Revenue: Loose Quantity vs PO Orders</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-surface-subtle border border-border space-y-1">
              <span className="text-text-muted font-medium">Loose Quantity Orders</span>
              <div className="text-lg font-black text-text">{byOrderType.looseQuantity?.revenue}</div>
              <div className="text-[11px] text-text-muted">
                {byOrderType.looseQuantity?.kitsSold} kits · Profit: <b>{byOrderType.looseQuantity?.profit}</b> ({byOrderType.looseQuantity?.margin})
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-subtle border border-border space-y-1">
              <span className="text-text-muted font-medium">PO Orders (Full Kit)</span>
              <div className="text-lg font-black text-primary">{byOrderType.poOrder?.revenue}</div>
              <div className="text-[11px] text-text-muted">
                {byOrderType.poOrder?.kitsSold} kits · Profit: <b>{byOrderType.poOrder?.profit}</b> ({byOrderType.poOrder?.margin})
              </div>
            </div>
          </div>
        </div>

        {/* Revenue by Order Origin */}
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-2">
          <h4 className="text-xs font-bold text-text uppercase tracking-wider">Revenue by Order Origin Channel</h4>
          <div className="space-y-2 text-xs">
            {byOrderOrigin.map((ch) => (
              <div key={ch.origin} className="flex items-center justify-between py-1 border-b border-border/50">
                <span className="text-text font-medium">{ch.origin}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-text">{ch.revenue}</span>
                  <span className="text-[11px] text-text-muted">{ch.kits} kits</span>
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-primary/10 text-primary font-bold">
                    {ch.pct}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

