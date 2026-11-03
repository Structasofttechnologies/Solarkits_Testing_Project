/**
 * CartAbandonmentSection.jsx
 * Section I - Cart Abandonment Ratio Deep-Dive
 * Formula: (Eligible carts abandoned / Eligible carts created) * 100
 * Multi-dimensional analysis by kit type, order type, state/district, customer type, store/EPC.
 */

import React, { useState } from 'react';
import {
  FiShoppingCart,
  FiTrendingDown,
  FiAlertOctagon,
  FiBox,
  FiLayers,
  FiMapPin,
  FiUsers,
  FiArrowUpRight,
  FiCheckCircle,
} from 'react-icons/fi';
import { FaStore } from 'react-icons/fa';

export default function CartAbandonmentSection({ data = {} }) {
  const [activeTab, setActiveTab] = useState('byKit');

  const {
    formula = '(Eligible Carts Abandoned / Eligible Carts Created) × 100',
    totalCreated = 0,
    totalAbandoned = 0,
    ratio = '0.0%',
    detectionAlert = null,
    byKitType = [],
    byOrderType = [],
    byGeo = [],
    byCustomerType = [],
    byPartnerStore = [],
  } = data || {};

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-xs space-y-4">
      {/* Header & Formula Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
            <FiShoppingCart size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-text">Cart Abandonment Analysis</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-200/50">
                Overall: {ratio}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Identify drop-off friction points, incomplete checkouts, and high-risk kits
            </p>
          </div>
        </div>

        {/* Mathematical Formula Pill */}
        <div className="bg-rose-50/50 border border-rose-200/80 rounded-xl px-3 py-1.5 text-xs text-rose-700 flex items-center gap-2">
          <span className="font-bold text-[10px] uppercase tracking-wider text-rose-600">Formula:</span>
          <span className="font-mono text-[11px] font-semibold">{formula}</span>
        </div>
      </div>

      {/* Top Abandoned Detection Banner or Healthy Pipeline Banner */}
      {detectionAlert ? (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-rose-500/5 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <FiAlertOctagon className="text-rose-600 shrink-0 mt-0.5 text-base" />
            <div>
              <span className="font-black text-rose-800 uppercase tracking-wide text-[10px]">
                Top Drop-Off Detection Alert:
              </span>
              <div className="text-text mt-0.5">
                Highest Abandoned Kit: <b className="text-rose-700">{detectionAlert.mostAbandonedKit || 'None'}</b> | Most
                Abandoned Area: <b className="text-rose-700">{detectionAlert.mostAbandonedArea || 'None'}</b>
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                {detectionAlert.recommendedAction || 'Monitor customer checkout events'}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[10px] text-text-muted block">Total Dropped Volume</span>
            <span className="text-base font-black text-rose-600">
              {totalAbandoned} / {totalCreated} Carts
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
              <FiCheckCircle size={16} />
            </div>
            <div>
              <span className="font-black text-emerald-800 uppercase tracking-wide text-[10px]">
                Pipeline Healthy — Zero Drop-offs Detected:
              </span>
              <div className="text-text-muted mt-0.5">
                No abandoned carts detected across verified EPC accounts for this period. All active cart sessions converted smoothly.
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100/80 text-emerald-800 font-bold rounded-lg text-[10px]">
            0 Abandoned
          </span>
        </div>
      )}

      {/* Multi-Dimensional Breakdown Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('byKit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byKit'
            ? 'bg-rose-600 text-white shadow-xs'
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
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiLayers size={13} />
          <span>By Order Type</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('byGeo')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byGeo'
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiMapPin size={13} />
          <span>By State / District</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('byCustomer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byCustomer'
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiUsers size={13} />
          <span>By Customer Type</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('byStore')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${activeTab === 'byStore'
            ? 'bg-rose-600 text-white shadow-xs'
            : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FaStore size={13} />
          <span>By Store / Franchisee / EPC</span>
        </button>
      </div>

      {/* Tab 1: By Kit Type */}
      {activeTab === 'byKit' && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                  <th className="py-2.5 px-3">Kit Configuration</th>
                  <th className="py-2.5 px-3">Capacity</th>
                  <th className="py-2.5 px-3 text-right">Carts Created</th>
                  <th className="py-2.5 px-3 text-right">Carts Abandoned</th>
                  <th className="py-2.5 px-3 text-right">Orders Converted</th>
                  <th className="py-2.5 px-3 text-right">Abandonment Ratio</th>
                  <th className="py-2.5 px-3">Drop Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byKitType.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-text-muted italic">
                      No cart abandonment recorded for this time range or kit selection.
                    </td>
                  </tr>
                ) : (
                  byKitType.map((k) => (
                    <tr key={k.kit} className="hover:bg-surface-subtle/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-text">{k.kit}</td>
                      <td className="py-2.5 px-3 text-text-muted font-medium">{k.capacity}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-text">{k.cartsCreated}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">{k.cartsAbandoned}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{k.converted}</td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600">{k.ratio}</td>
                      <td className="py-2.5 px-3">
                        <div className="w-24 bg-border/40 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${k.ratioNumber > 45 ? 'bg-rose-600' : k.ratioNumber > 30 ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                            style={{ width: `${Math.min(100, k.ratioNumber)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: By Order Type */}
      {activeTab === 'byOrder' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {byOrderType.length === 0 ? (
            <div className="col-span-3 py-8 text-center text-text-muted italic bg-surface-subtle/30 rounded-xl">
              No order drop-off data found for this selection.
            </div>
          ) : (
            byOrderType.map((o) => (
              <div key={o.orderType} className="bg-surface-subtle/40 rounded-xl border border-border p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-text-muted">{o.orderType}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-rose-600">{o.ratio}</span>
                  <span className="text-xs text-text-muted font-medium">
                    {o.cartsAbandoned} dropped of {o.cartsCreated}
                  </span>
                </div>
                <div className="w-full bg-border/40 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-600 rounded-full" style={{ width: `${o.ratioNumber}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: By State / District */}
      {activeTab === 'byGeo' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                <th className="py-2.5 px-3">State / District Territory</th>
                <th className="py-2.5 px-3 text-right">Carts Created</th>
                <th className="py-2.5 px-3 text-right">Carts Abandoned</th>
                <th className="py-2.5 px-3 text-right">Abandonment Ratio</th>
                <th className="py-2.5 px-3">Geographic Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byGeo.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-text-muted italic">
                    No geographic drop-offs recorded for this selection.
                  </td>
                </tr>
              ) : (
                byGeo.map((g) => (
                  <tr key={g.area} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text flex items-center gap-1.5">
                      <FiMapPin size={12} className="text-rose-500" />
                      <span>{g.area}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-text font-medium">{g.cartsCreated}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">{g.cartsAbandoned}</td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600">{g.ratio}</td>
                    <td className="py-2.5 px-3">
                      <div className="w-24 bg-border/40 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-600 rounded-full" style={{ width: `${g.ratioNumber}%` }} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: By Customer Type */}
      {activeTab === 'byCustomer' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                <th className="py-2.5 px-3">Customer Classification</th>
                <th className="py-2.5 px-3 text-right">Carts Created</th>
                <th className="py-2.5 px-3 text-right">Carts Abandoned</th>
                <th className="py-2.5 px-3 text-right">Abandonment Ratio</th>
                <th className="py-2.5 px-3">Primary Drop Reason & Barrier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byCustomerType.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-text-muted italic">
                    No customer drop-off data available for this selection.
                  </td>
                </tr>
              ) : (
                byCustomerType.map((c) => (
                  <tr key={c.customerType} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text">{c.customerType}</td>
                    <td className="py-2.5 px-3 text-right text-text font-medium">{c.cartsCreated}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">{c.cartsAbandoned}</td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600">{c.ratio}</td>
                    <td className="py-2.5 px-3 text-text-muted italic">{c.primaryDropReason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: By Store / Franchisee / EPC */}
      {activeTab === 'byStore' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase font-bold text-text-muted bg-surface-subtle/50">
                <th className="py-2.5 px-3">Partner / Store Location</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Territory</th>
                <th className="py-2.5 px-3 text-right">Carts Created</th>
                <th className="py-2.5 px-3 text-right">Carts Abandoned</th>
                <th className="py-2.5 px-3 text-right">Abandonment Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byPartnerStore.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-text-muted italic">
                    No partner store drop-off data available for this selection.
                  </td>
                </tr>
              ) : (
                byPartnerStore.map((s, idx) => (
                  <tr key={s.name + idx} className="hover:bg-surface-subtle/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-text">{s.name}</td>
                    <td className="py-2.5 px-3 text-text-muted">{s.type}</td>
                    <td className="py-2.5 px-3 text-text-muted">
                      {s.district}, {s.state}
                    </td>
                    <td className="py-2.5 px-3 text-right text-text font-medium">{s.cartsCreated}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">{s.cartsAbandoned}</td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600">{s.ratio}</td>
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
