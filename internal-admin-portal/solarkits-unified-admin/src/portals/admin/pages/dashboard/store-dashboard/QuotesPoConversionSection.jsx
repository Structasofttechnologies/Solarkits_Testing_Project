/**
 * QuotesPoConversionSection.jsx
 * Section H: EPC Quotes, PO Raised & Conversion Ratios
 * Features mathematical formula displays, Loose vs PO separation, and Cohort Date filter.
 */

import React, { useState } from 'react';
import { FiTrendingUp, FiCheckCircle, FiFileText, FiCalendar, FiArrowRight, FiPercent } from 'react-icons/fi';

export default function QuotesPoConversionSection({ conversionData = {}, onSelectConversionRow }) {
  const {
    totalQuotesSubmitted = 0,
    quotesConvertedToOrders = 0,
    quoteToOrderRatio = '0.0%',
    totalPoOrdersRaised = 0,
    totalPoOrdersCompleted = 0,
    poConversionRatio = '0.0%',
    totalLooseQuantityOrders = 0,
    looseQuantityConversionRatio = '0.0%',
    byKitType = [],
    cohorts = [],
  } = conversionData || {};

  const [selectedCohort, setSelectedCohort] = useState('all');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
            <FiFileText size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Quotes, PO Orders & Conversion Funnel</h2>
            <p className="text-xs text-text-muted">
              Quotation pipeline throughput, purchase order closure ratios, and cohort maturity
            </p>
          </div>
        </div>

        {/* Cohort Selector to avoid treating recent quotes as failed */}
        <div className="flex items-center gap-2 bg-surface p-1.5 px-3 rounded-xl border border-border text-xs">
          <FiCalendar size={13} className="text-primary shrink-0" />
          <span className="text-text-muted font-medium">Cohort Window:</span>
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="text-xs font-bold text-text bg-bg rounded-lg px-2 py-0.5 border border-border focus:outline-none"
          >
            <option value="all">All Historical Cohorts</option>
            <option value="sep_2026">Sep 2026 (Mature)</option>
            <option value="oct_2026">Oct 2026 (Matured)</option>
            <option value="current">Current Month (In Progress)</option>
          </select>
        </div>
      </div>

      {/* 3 Core Conversion Ratios Highlight (Document Distinction) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Quote to Order Ratio */}
        <div className="bg-surface rounded-2xl border border-purple-500/30 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
              Quote-to-Order Conversion
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <FiPercent size={18} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-text">{quoteToOrderRatio}</div>
          <div className="mt-1 text-[11px] text-text-muted">
            <b>{quotesConvertedToOrders}</b> orders from <b>{totalQuotesSubmitted}</b> eligible quotes
          </div>
          <div className="mt-2 text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-500/5 p-1 rounded-md">
            Formula: (Converted Quotes / Eligible Quotes) × 100
          </div>
        </div>

        {/* PO Conversion Ratio */}
        <div className="bg-surface rounded-2xl border border-primary/30 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              PO Order Conversion
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FiCheckCircle size={18} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-primary">{poConversionRatio}</div>
          <div className="mt-1 text-[11px] text-text-muted">
            <b>{totalPoOrdersCompleted}</b> completed of <b>{totalPoOrdersRaised}</b> raised POs
          </div>
          <div className="mt-2 text-[10px] font-mono text-primary bg-primary/5 p-1 rounded-md">
            Formula: (Completed POs / Raised POs) × 100
          </div>
        </div>

        {/* Loose Quantity Conversion Ratio */}
        <div className="bg-surface rounded-2xl border border-emerald-500/30 p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Loose Quantity Conversion
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <FiTrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-600">{looseQuantityConversionRatio}</div>
          <div className="mt-1 text-[11px] text-text-muted">
            <b>{totalLooseQuantityOrders}</b> individual kit orders checked out
          </div>
          <div className="mt-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 p-1 rounded-md">
            Formula: Direct checkout cart-to-order ratio
          </div>
        </div>
      </div>

      {/* Conversion by Kit Type and Cohorts Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Conversion by Kit Type */}
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-text uppercase tracking-wider">Conversion Ratio by Kit Type</h4>
          <div className="space-y-2.5 text-xs">
            {byKitType.map((kt) => (
              <div key={kt.kit} className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-text">{kt.kit}</span>
                  <span className="font-bold text-primary">{kt.conversion} ({kt.orders} orders)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-subtle overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: kt.conversion }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quote Date Cohorts View */}
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider">Date Cohort Performance</h4>
            <span className="text-[10px] text-text-muted">Prevents unfair penalty on new leads</span>
          </div>

          <div className="space-y-2 text-xs">
            {cohorts.map((c) => (
              <div
                key={c.cohort}
                onClick={() => onSelectConversionRow && onSelectConversionRow(c)}
                className="p-2.5 rounded-xl bg-surface-subtle border border-border flex items-center justify-between hover:border-primary/50 cursor-pointer transition-colors"
              >
                <div>
                  <span className="font-bold text-text block">{c.cohort}</span>
                  <span className="text-[11px] text-text-muted">
                    {c.quotes} Quotes Generated · <b>{c.converted} Converted</b>
                  </span>
                </div>
                <span className="font-black text-primary text-sm">{c.ratio}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

