/**
 * AreaPotentialSection.jsx
 * Section E: Area Business Potential (Revenue, kW & Kit Quantity)
 * Highlights measured historical performance vs estimated market potential and Opportunity Gap.
 */

import React, { useState } from 'react';
import { FiTrendingUp, FiInfo, FiSliders, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { MdOutlineTrendingUp, MdLocationSearching } from 'react-icons/md';

export default function AreaPotentialSection({ areaPotentialData = {}, onSelectAreaPotential }) {
  const { methodology = {}, areas = [] } = areaPotentialData;
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
            <MdLocationSearching size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Area Business Potential & Revenue Opportunity Gap</h2>
            <p className="text-xs text-text-muted">
              Uncover untapped market capacity by comparing measured sales against estimated market potential
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface border border-border text-text hover:bg-surface-subtle transition-colors cursor-pointer"
        >
          <FiInfo size={13} className="text-primary" />
          <span>{showAssumptions ? 'Hide Methodology' : 'View Methodology & Assumptions'}</span>
        </button>
      </div>

      {/* Transparent Methodology & Assumptions Panel */}
      {showAssumptions && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-primary">
            <FiCheckCircle size={15} />
            <span>Market Potential Calculation Methodology</span>
          </div>
          <p className="text-text leading-relaxed">
            <b>Note:</b> {methodology.note || 'Potential revenue should not be presented as actual sales.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px] text-text-muted">
            <div className="p-2 rounded-xl bg-surface border border-border">
              <span className="font-bold text-text block mb-0.5">1. Demand Ingestion</span>
              Historical quotes submitted, cart inquiries & local rooftop subsidy inquiries.
            </div>
            <div className="p-2 rounded-xl bg-surface border border-border">
              <span className="font-bold text-text block mb-0.5">2. Network Coverage</span>
              Active Solar EPC network density & physical Franchisee experience stores.
            </div>
            <div className="p-2 rounded-xl bg-surface border border-border">
              <span className="font-bold text-text block mb-0.5">3. Regional Capacity</span>
              State Discom solar net-metering approval throughput and irradiation index.
            </div>
            <div className="p-2 rounded-xl bg-surface border border-border">
              <span className="font-bold text-text block mb-0.5">4. Opportunity Gap</span>
              Revenue Opportunity Gap = Estimated Potential - Actual Revenue.
            </div>
          </div>
        </div>
      )}

      {/* Area Potential Table (Exact Document Table E) */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-text">Territorial Opportunity Analysis: Actual Sales vs Potential</h3>
          <span className="text-[11px] font-semibold text-text-muted">5 Key Regional Clusters</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-text-muted font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Area / Cluster</th>
                <th className="py-2.5 px-4 text-center">Kits Sold</th>
                <th className="py-2.5 px-4">kW Sold</th>
                <th className="py-2.5 px-4">Revenue</th>
                <th className="py-2.5 px-4 text-center">Active EPCs</th>
                <th className="py-2.5 px-4 text-center">Franchisees</th>
                <th className="py-2.5 px-4">Quotes / PO</th>
                <th className="py-2.5 px-4">Conversion %</th>
                <th className="py-2.5 px-4 font-bold text-primary">Potential Revenue</th>
                <th className="py-2.5 px-4 font-bold text-danger">Opportunity Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {areas.length > 0 ? (
                areas.map((row) => (
                  <tr
                    key={row.area}
                    className="hover:bg-surface-subtle transition-colors cursor-pointer group"
                    onClick={() => onSelectAreaPotential && onSelectAreaPotential(row)}
                  >
                    <td className="py-3 px-4 font-bold text-text">{row.area}</td>
                    <td className="py-3 px-4 text-center font-semibold text-text">{row.kitsSold}</td>
                    <td className="py-3 px-4 font-medium text-text">{row.kwSold}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{row.revenue}</td>
                    <td className="py-3 px-4 text-center font-bold text-text">{row.activeEpcs}</td>
                    <td className="py-3 px-4 text-center font-bold text-text">{row.franchisees}</td>
                    <td className="py-3 px-4 text-text-muted">
                      {row.quotesGenerated} / {row.poOrdersRaised}
                    </td>
                    <td className="py-3 px-4 font-semibold text-primary">{row.conversionRatio}</td>
                    <td className="py-3 px-4 font-black text-primary bg-primary/5">{row.potentialRevenue}</td>
                    <td className="py-3 px-4 font-black text-danger">
                      <span className="px-2 py-0.5 rounded-md bg-danger/10 text-danger">
                        {row.opportunityGap}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-6 text-center text-text-muted">
                    No area potential records available for the selected filter range.
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
