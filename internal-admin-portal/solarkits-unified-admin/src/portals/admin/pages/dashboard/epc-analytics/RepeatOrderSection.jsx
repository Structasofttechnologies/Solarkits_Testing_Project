/**
 * RepeatOrderSection.jsx
 * Section I - Repeat Order Ratio & Retention Deep-Dive
 * Formula: (Customers with repeat orders / Customers who placed an eligible first order) * 100
 * Multi-dimensional analysis by kit type, order type, customer/EPC, franchisee, state/district, month & quarter.
 * Also highlights the average time between first and repeat order.
 */

import React, { useState } from 'react';
import {
  FiRepeat,
  FiClock,
  FiBox,
  FiLayers,
  FiUsers,
  FiMapPin,
  FiCalendar,
  FiTrendingUp,
} from 'react-icons/fi';
import { FaStore } from 'react-icons/fa';

export default function RepeatOrderSection({ data = {} }) {
  const [activeTab, setActiveTab] = useState('byKit');

  const {
    formula = '(Customers with Repeat Orders / Customers who placed Eligible First Order) × 100',
    repeatRatio = '0.0%',
    repeatCustomersCount = 0,
    eligibleFirstOrderCount = 0,
    avgDaysBetweenRepeatOrders = '0.0',
    byKitType = [],
    byOrderType = [],
    topRepeatEpcs = [],
    byFranchisee = [],
    byGeo = [],
    cohorts = [],
  } = data || {};

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs space-y-4">
      {/* Header & Formula Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
            <FiRepeat size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-text">Repeat Order & Retention Analytics</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-200/50">
                Retention: {repeatRatio}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Customer loyalty, repeat purchasing cadence, and recurring kit volume
            </p>
          </div>
        </div>

        {/* Formula Display */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl px-3 py-1.5 text-xs text-emerald-700 flex items-center gap-2">
          <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600">Formula:</span>
          <span className="font-mono text-[11px] font-semibold">{formula}</span>
        </div>
      </div>

      {/* KPI Highlight Strip: Repeat Ratio & Average Repurchase Cadence */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-200/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
              Repeat Order Ratio
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{repeatRatio}</div>
            <span className="text-[11px] text-text-muted mt-0.5 block">
              {repeatCustomersCount} of {eligibleFirstOrderCount} first-order buyers re-ordered
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
            <FiTrendingUp size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-200/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
              Avg Time Between Repeat Orders
            </span>
            <div className="text-2xl font-black text-blue-600 mt-1">{avgDaysBetweenRepeatOrders} Days</div>
            <span className="text-[11px] text-text-muted mt-0.5 block">
              Average re-order cycle from first delivery
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
            <FiClock size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-200/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">
              Repeat Buyer Health
            </span>
            <div className="text-2xl font-black text-purple-600 mt-1">
              {repeatCustomersCount > 0 ? `${repeatCustomersCount} Buyers` : 'No Repeat Buyers'}
            </div>
            <span className="text-[11px] text-text-muted mt-0.5 block">
              {repeatCustomersCount > 0
                ? `${repeatCustomersCount} recurring solar partner account${repeatCustomersCount > 1 ? 's' : ''}`
                : 'Awaiting repeat buyer transactions'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
            <FiUsers size={24} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('byKit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byKit'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiBox size={13} />
          <span>By Kit Type</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('byOrder')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byOrder'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiLayers size={13} />
          <span>By Order Type</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('byCustomer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byCustomer'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiUsers size={13} />
          <span>Top Repeat EPCs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('byFranchisee')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byFranchisee'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FaStore size={13} />
          <span>By Franchisee</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('byGeo')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byGeo'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiMapPin size={13} />
          <span>By State / District</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('byCohort')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byCohort'
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiCalendar size={13} />
          <span>By Month & Quarter</span>
        </button>
      </div>

      {/* Tab 1: By Kit Type */}
      {activeTab === 'byKit' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                <th className="py-2.5 px-3">Kit Configuration</th>
                <th className="py-2.5 px-3 text-right">First Buyers</th>
                <th className="py-2.5 px-3 text-right">Repeat Customers</th>
                <th className="py-2.5 px-3 text-right">Repeat Rate</th>
                <th className="py-2.5 px-3 text-right">Avg Repurchase Cadence</th>
                <th className="py-2.5 px-3">Loyalty Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byKitType.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-text-muted italic">
                    No repeat orders recorded for kit configurations yet.
                  </td>
                </tr>
              ) : (
                byKitType.map((k) => (
                  <tr key={k.kit} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text">{k.kit}</td>
                    <td className="py-2.5 px-3 text-right text-text-muted font-medium">{k.totalFirstBuyers}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{k.repeatCustomers}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">{k.repeatRate}</td>
                    <td className="py-2.5 px-3 text-right text-text-muted">{k.avgCadenceDays} Days</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700">
                        High Retention
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: By Order Type */}
      {activeTab === 'byOrder' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {byOrderType.length === 0 ? (
            <div className="col-span-3 py-8 text-center text-text-muted italic bg-surface-subtle/30 rounded-xl">
              No order type repeat purchase data recorded.
            </div>
          ) : (
            byOrderType.map((o) => (
              <div key={o.orderType} className="bg-surface-subtle/40 rounded-xl border border-border p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-text-muted">{o.orderType}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-600">{o.repeatRate}</span>
                  <span className="text-xs text-text-muted font-medium">
                    {o.repeatCount} repeats ({o.firstOrderCount} first)
                  </span>
                </div>
                <div className="text-[11px] text-text-muted">
                  Avg Repeat Order Value: <b className="text-text">{o.avgValue}</b>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Top Repeat Customers / EPCs */}
      {activeTab === 'byCustomer' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                <th className="py-2.5 px-3">EPC Partner</th>
                <th className="py-2.5 px-3">Territory</th>
                <th className="py-2.5 px-3">Customer Tier</th>
                <th className="py-2.5 px-3 text-right">Repeat Orders</th>
                <th className="py-2.5 px-3 text-right">Total kW</th>
                <th className="py-2.5 px-3 text-right">Lifetime Spend</th>
                <th className="py-2.5 px-3 text-right">Days Since Last</th>
                <th className="py-2.5 px-3">Assigned BDE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topRepeatEpcs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-text-muted italic">
                    No repeat customer accounts found for this selection.
                  </td>
                </tr>
              ) : (
                topRepeatEpcs.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-text">{e.name}</div>
                      <div className="text-[10px] text-text-muted">{e.contact} • {e.mobile}</div>
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">
                      {e.district}, {e.state}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700">
                        {e.tier}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                      {e.repeatOrdersCount} orders
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-text">{e.totalKwPurchased}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-primary">{e.totalSpendFormatted}</td>
                    <td className="py-2.5 px-3 text-right text-text-muted">{e.daysSinceLastOrder}d ago</td>
                    <td className="py-2.5 px-3 text-text font-medium">{e.assignedBde}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: By Franchisee */}
      {activeTab === 'byFranchisee' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                <th className="py-2.5 px-3">Franchisee Store</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3 text-right">First Buyers</th>
                <th className="py-2.5 px-3 text-right">Repeat Customers</th>
                <th className="py-2.5 px-3 text-right">Repeat Order Rate</th>
                <th className="py-2.5 px-3">Retention Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byFranchisee.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-text-muted italic">
                    No franchisee retention records available for this selection.
                  </td>
                </tr>
              ) : (
                byFranchisee.map((f, i) => (
                  <tr key={f.franchiseeName + i} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text">{f.franchiseeName}</td>
                    <td className="py-2.5 px-3 text-text-muted">{f.location}</td>
                    <td className="py-2.5 px-3 text-right text-text-muted font-medium">{f.totalFirstBuyers}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{f.repeatCustomers}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">{f.repeatRate}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700">
                        {f.retentionScore}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: By State / District */}
      {activeTab === 'byGeo' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                <th className="py-2.5 px-3">Territory (District, State)</th>
                <th className="py-2.5 px-3 text-right">First Buyers</th>
                <th className="py-2.5 px-3 text-right">Repeat Buyers</th>
                <th className="py-2.5 px-3 text-right">Repeat Order Rate</th>
                <th className="py-2.5 px-3">Density Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byGeo.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-text-muted italic">
                    No territory repeat order data found for this selection.
                  </td>
                </tr>
              ) : (
                byGeo.map((g) => (
                  <tr key={g.district + g.state} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text flex items-center gap-1.5">
                      <FiMapPin size={12} className="text-emerald-500" />
                      <span>
                        {g.district}, {g.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-text-muted font-medium">{g.totalBuyers}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{g.repeatBuyers}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">{g.repeatRate}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700">
                        Active Cluster
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 6: By Month & Quarter */}
      {activeTab === 'byCohort' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                <th className="py-2.5 px-3">Acquisition Cohort</th>
                <th className="py-2.5 px-3 text-right">Cohort Size</th>
                <th className="py-2.5 px-3 text-right">Repeated within 30d</th>
                <th className="py-2.5 px-3 text-right">Repeated within 60d</th>
                <th className="py-2.5 px-3 text-right">Cumulative Repeat Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cohorts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-text-muted italic">
                    No cohort repeat data available for this selection.
                  </td>
                </tr>
              ) : (
                cohorts.map((c) => (
                  <tr key={c.period} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text">{c.period}</td>
                    <td className="py-2.5 px-3 text-right text-text-muted font-medium">{c.cohortSize} EPCs</td>
                    <td className="py-2.5 px-3 text-right font-medium text-text">{c.repeatedIn30d}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-text">{c.repeatedIn60d}</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">{c.totalRepeatRate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
