/**
 * SolarEpcAnalytics.jsx
 * Section G: Solar EPC Analytics & Network Health
 * Configurable active/inactive definition transparency and performance tracking.
 */

import React from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiDollarSign, FiBox, FiSliders, FiArrowRight } from 'react-icons/fi';

const formatText = (val, fallback = 'N/A') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return val.name || val.company_name || val.title || val.label || fallback;
  }
  return String(val);
};

const formatState = (st) => {
  if (!st) return 'Regional';
  if (typeof st === 'string') return st;
  if (typeof st === 'object') return st.name || st.state || st.city || 'Regional';
  return String(st);
};

export default function SolarEpcAnalytics({
  epcData = {},
  epcActiveDaysWindow = 30,
  setEpcActiveDaysWindow,
  onSelectEpc,
}) {
  const {
    activeDefinition = '',
    totalEpcs = 0,
    activeEpcs = 0,
    inactiveEpcs = 0,
    newOnboardedEpcs = 0,
    epcsWithQuotes = 0,
    epcsWithPos = 0,
    epcsConvertedToOrders = 0,
    epcsWithRepeatOrders = 0,
    epcPerformance = [],
  } = epcData || {};

  return (
    <div className="space-y-4">
      {/* Header with Active Definition Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
            <FiUsers size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Solar EPC Network Performance & Conversion</h2>
            <p className="text-xs text-text-muted">
              Solar EPC installation partners, quotation engagement, repeat orders & active status definition
            </p>
          </div>
        </div>

        {/* Configurable Active Definition Tag */}
        <div className="flex items-center gap-2 bg-surface p-1.5 px-3 rounded-xl border border-border text-xs">
          <span className="text-text-muted">Active Window:</span>
          <select
            value={epcActiveDaysWindow}
            onChange={(e) => setEpcActiveDaysWindow && setEpcActiveDaysWindow(Number(e.target.value))}
            className="text-xs font-bold text-primary bg-bg rounded-lg px-2 py-0.5 border border-border focus:outline-none"
          >
            <option value={15}>15 Days</option>
            <option value={30}>30 Days (Standard)</option>
            <option value={60}>60 Days</option>
            <option value={90}>90 Days</option>
          </select>
        </div>
      </div>

      {/* Definition Callout */}
      <div className="px-3.5 py-2 rounded-xl bg-surface-subtle border border-border/80 text-xs text-text-muted flex items-center justify-between">
        <span>
          <b>Configured Rule:</b> {activeDefinition || `EPC is active if activity recorded within ${epcActiveDaysWindow} days.`}
        </span>
        <span className="text-emerald-600 font-bold shrink-0">
          {activeEpcs} Active ({totalEpcs > 0 ? ((activeEpcs / totalEpcs) * 100).toFixed(0) : '0'}% Engagement)
        </span>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Total EPCs</span>
          <div className="text-lg font-black text-text mt-0.5">{totalEpcs}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600">Active EPCs</span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">{activeEpcs}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-danger">Inactive EPCs</span>
          <div className="text-lg font-black text-danger mt-0.5">{inactiveEpcs}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-primary">New EPCs</span>
          <div className="text-lg font-black text-primary mt-0.5">{newOnboardedEpcs}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-600">Raised Quotes</span>
          <div className="text-lg font-black text-amber-600 mt-0.5">{epcsWithQuotes}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-purple-600">Raised POs</span>
          <div className="text-lg font-black text-purple-600 mt-0.5">{epcsWithPos}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-indigo-600">Converted</span>
          <div className="text-lg font-black text-indigo-600 mt-0.5">{epcsConvertedToOrders}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-teal-600">Repeat Buyers</span>
          <div className="text-lg font-black text-teal-600 mt-0.5">{epcsWithRepeatOrders}</div>
        </div>
      </div>

      {/* EPC Performance Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-text">Top Active Solar EPC Contractors</h3>
          <span className="text-[11px] text-text-muted">Ranked by Kits Sold & Gross Profit</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">EPC Company</th>
                <th className="py-2.5 px-4">Contact Person</th>
                <th className="py-2.5 px-4">State</th>
                <th className="py-2.5 px-4">Revenue</th>
                <th className="py-2.5 px-4">Gross Profit</th>
                <th className="py-2.5 px-4 text-center">Kits Sold</th>
                <th className="py-2.5 px-4">Conversion Ratio</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {epcPerformance.length > 0 ? (
                epcPerformance.map((epc) => (
                  <tr
                    key={epc.id}
                    className="hover:bg-surface-subtle transition-colors cursor-pointer group"
                    onClick={() => onSelectEpc && onSelectEpc(epc, epcPerformance)}
                  >
                    <td className="py-3 px-4 font-bold text-text group-hover:text-primary transition-colors">
                      {formatText(epc.name, 'Solar EPC Contractor')}
                    </td>
                    <td className="py-3 px-4 text-text-muted">{formatText(epc.contact, 'Managing Director')}</td>
                    <td className="py-3 px-4 text-text-muted">{formatState(epc.state)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{formatText(epc.revenue, '₹0')}</td>
                    <td className="py-3 px-4 font-bold text-primary">{formatText(epc.grossProfit, '₹0')}</td>
                    <td className="py-3 px-4 text-center font-bold text-text">{epc.kitsSold ?? 0}</td>
                    <td className="py-3 px-4 font-bold text-primary">{formatText(epc.conversionRatio, '0.0%')}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600">
                        {formatText(epc.status, 'Active')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-primary font-semibold">
                      <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        View Activity <FiArrowRight size={12} />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-6 text-center text-text-muted">
                    No solar EPC records found for the selected filter range.
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

