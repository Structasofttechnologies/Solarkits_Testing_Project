/**
 * BestSellingAreaSection.jsx
 * Section D: Best-Selling Kits by Area (Geographic demand visualization)
 */

import React, { useState } from 'react';
import { FiMapPin, FiTrendingUp, FiBox, FiDollarSign, FiSearch, FiArrowRight } from 'react-icons/fi';

export default function BestSellingAreaSection({ bestSellingData = {}, onSelectArea }) {
  const { summary = {}, areaTable = [] } = bestSellingData;
  const [search, setSearch] = useState('');

  const filteredAreas = areaTable.filter(
    (a) =>
      a.state?.toLowerCase().includes(search.toLowerCase()) ||
      a.district?.toLowerCase().includes(search.toLowerCase()) ||
      a.bestKit?.toLowerCase().includes(search.toLowerCase()) ||
      a.pincode?.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <FiMapPin size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Best-Selling Kits by Geographic Area</h2>
            <p className="text-xs text-text-muted">
              Territorial kit demand, highest revenue models, and fastest-growing regional adoption
            </p>
          </div>
        </div>
      </div>

      {/* Summary Highlight Strips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Best-Selling State</span>
          <div className="font-bold text-text mt-1">{summary.bestSellingState || 'N/A'}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Best-Selling District</span>
          <div className="font-bold text-primary mt-1">{summary.bestSellingDistrict || 'N/A'}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Fastest-Growing Kit</span>
          <div className="font-bold text-emerald-600 mt-1">{summary.fastestGrowingKit || 'N/A'}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Most Frequently Ordered</span>
          <div className="font-bold text-text mt-1">{summary.mostFrequentKit || 'N/A'}</div>
        </div>
      </div>

      {/* Area-Wise Table (Exact Document Structure D) */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-text">Territory Breakdown: State → District → Pincode</h3>
          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 text-text-muted" size={13} />
            <input
              type="text"
              placeholder="Search territory or kit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-bg text-text focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-4">District</th>
                <th className="py-2.5 px-4">Pincode Coverage</th>
                <th className="py-2.5 px-4">Best-Selling Kit</th>
                <th className="py-2.5 px-4 text-center">Kits Sold</th>
                <th className="py-2.5 px-4">Revenue</th>
                <th className="py-2.5 px-4">Gross Profit</th>
                <th className="py-2.5 px-4">Growth Rate</th>
                <th className="py-2.5 px-4 text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAreas.length > 0 ? (
                filteredAreas.map((row) => (
                  <tr
                    key={`${row.state}-${row.district}`}
                    className="hover:bg-surface-subtle transition-colors cursor-pointer group"
                    onClick={() => onSelectArea && onSelectArea(row)}
                  >
                    <td className="py-3 px-4 font-semibold text-text">{row.state}</td>
                    <td className="py-3 px-4 font-bold text-text">{row.district}</td>
                    <td className="py-3 px-4 font-mono text-text-muted">{row.pincode}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg font-bold bg-primary/10 text-primary">
                        {row.bestKit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-text">{row.kitsSold}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{row.revenue}</td>
                    <td className="py-3 px-4 font-bold text-primary">{row.profit}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">{row.growthRate}</td>
                    <td className="py-3 px-4 text-right text-primary font-semibold">
                      <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Drill <FiArrowRight size={12} />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-6 text-center text-text-muted">
                    No territory sales data recorded for the selected filter range.
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

