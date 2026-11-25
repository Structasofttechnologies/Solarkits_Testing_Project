/**
 * AdminIndividualEpcBuyingAnalytics.jsx
 *
 * Full-fidelity EPC Buying Behavior & Order Analytics Suite for SolarKits Admin.
 * Exactly replicates the verified Buying Behavior UI from Solar Store Profile,
 * allowing Admin to inspect any individual EPC account's purchasing telemetry.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FiZap,
  FiActivity,
  FiClock,
  FiTrendingUp,
  FiShoppingBag,
  FiCalendar,
  FiArrowUpRight,
  FiInfo,
  FiBox,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiLayers,
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
} from 'recharts';
import { epcAnalyticsApi } from '../../../api/epcAnalyticsApi';

function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

const BAR_COLORS = [
  '#253880',
  '#F49222',
  '#0575B8',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
];

const frequencyBadgeColors = {
  'Very Frequent': 'bg-emerald-500/15 text-emerald-600 border-emerald-400/30',
  Frequent: 'bg-teal-500/15 text-teal-600 border-teal-400/30',
  Regular: 'bg-blue-500/15 text-blue-600 border-blue-400/30',
  Occasional: 'bg-amber-500/15 text-amber-600 border-amber-400/30',
  'New EPC': 'bg-purple-500/15 text-purple-600 border-purple-400/30',
};

export default function AdminIndividualEpcBuyingAnalytics({
  epcId,
  onNavigateToTelemetryTab,
}) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [dateRange, setDateRange] = useState('all'); // 'all' | '30d' | '90d' | '12m'
  const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // 'all' | 'loose' | 'po' | 'trial'

  const fetchAnalytics = useCallback(async () => {
    if (!epcId) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await epcAnalyticsApi.getEpcBuyingAnalytics(epcId, {
        range: dateRange,
        order_type: orderTypeFilter,
      });

      if (res && res.success && res.data) {
        setAnalytics(res.data);
      } else {
        setErrorMsg(res?.message || 'Failed to load EPC buying analytics.');
      }
    } catch (err) {
      console.error('Failed to load Admin EPC analytics:', err);
      setErrorMsg(
        err.response?.data?.message ||
        'Unable to load buying analytics. Please verify network or database connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [epcId, dateRange, orderTypeFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !analytics) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-10 bg-surface-subtle rounded-xl w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-44 bg-surface-subtle rounded-2xl" />
          <div className="h-44 bg-surface-subtle rounded-2xl" />
          <div className="h-44 bg-surface-subtle rounded-2xl" />
        </div>
        <div className="h-80 bg-surface-subtle rounded-2xl" />
      </div>
    );
  }

  const {
    epc_type = {},
    last_purchase = {},
    capacity_analytics = {},
    buying_frequency = {},
    quotations = {},
    po_orders = {},
    total_orders_summary = {},
    cart_activity = {},
    monthly_trends = [],
  } = analytics || {};

  const mostPurchased = capacity_analytics.most_purchased;
  const capacityBreakdown = capacity_analytics.breakdown || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── TOP FILTER BAR: Date Ranges & Order Type Selector ────────────── */}
      <div className="bg-surface rounded-2xl p-4 border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider mr-1">
            Period:
          </span>
          {[
            { id: 'all', label: 'All Time' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
            { id: '12m', label: 'Last 12 Months' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateRange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                dateRange === tab.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface hover:bg-surface-subtle text-text border border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Order Type Filter & Refresh */}
        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-xl border border-border">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'loose_order', label: 'Loose' },
              { id: 'po_order', label: 'PO Orders' },
              { id: 'trial_order', label: 'Trial' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOrderTypeFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderTypeFilter === f.id
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            title="Refresh Analytics"
            className="p-2 rounded-xl text-text hover:text-primary hover:bg-surface-subtle border border-border cursor-pointer transition-all"
          >
            <FiRefreshCw
              size={15}
              className={loading ? 'animate-spin text-primary' : ''}
            />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-200 text-rose-700 flex items-center gap-3 text-sm">
          <FiAlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── SECTION B: BUYING BEHAVIOR HIGHLIGHTS ──────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FiActivity className="text-primary text-lg" />
          <h2 className="text-base font-extrabold text-text tracking-tight">
            Buying Behavior & Purchase Highlights
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Most Frequently Purchased Kit Capacity (Feature 1) */}
          <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">
                  Most Purchased Kit
                </span>
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <FiZap size={18} />
                </span>
              </div>

              {mostPurchased ? (
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text">
                      {mostPurchased.capacity}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-400/30">
                      Rank #1
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Solar ComboKit Capacity
                  </p>

                  <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Order Frequency:</span>
                      <p className="font-extrabold text-text mt-0.5">
                        {mostPurchased.order_frequency} Orders
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Total Units:</span>
                      <p className="font-extrabold text-text mt-0.5">
                        {mostPurchased.total_quantity} Kits ({mostPurchased.total_kw} kW)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-text-muted text-xs">
                  No kit purchase records found for selected filter.
                </div>
              )}
            </div>

            {capacity_analytics.top_three?.length > 1 && (
              <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5 text-[11px] text-text-muted flex-wrap">
                <span>Top Capacities:</span>
                {capacity_analytics.top_three.map((c, i) => (
                  <span
                    key={c}
                    className="font-bold text-text px-2 py-0.5 rounded-md bg-surface-subtle border border-border"
                  >
                    #{i + 1} {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: EPC Buying Frequency (Feature 4) */}
          <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">
                  Buying Frequency
                </span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <FiTrendingUp size={18} />
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border ${
                    frequencyBadgeColors[buying_frequency.classification] ||
                    'bg-surface-subtle text-text border-border'
                  }`}
                >
                  {buying_frequency.classification || 'New EPC'}
                </span>
                {buying_frequency.avg_interval_days != null && (
                  <span className="text-xs font-semibold text-text-muted">
                    ~Every {buying_frequency.avg_interval_days} days
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                Purchasing interval pattern based on consecutive eligible orders
              </p>

              <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-surface-subtle p-2 rounded-xl">
                  <span className="text-[10px] text-text-muted block font-semibold">
                    Last 30D
                  </span>
                  <span className="text-sm font-black text-text">
                    {buying_frequency.purchases_last_30d || 0}
                  </span>
                </div>
                <div className="bg-surface-subtle p-2 rounded-xl">
                  <span className="text-[10px] text-text-muted block font-semibold">
                    Last 90D
                  </span>
                  <span className="text-sm font-black text-text">
                    {buying_frequency.purchases_last_90d || 0}
                  </span>
                </div>
                <div className="bg-surface-subtle p-2 rounded-xl">
                  <span className="text-[10px] text-text-muted block font-semibold">
                    Last 12M
                  </span>
                  <span className="text-sm font-black text-text">
                    {buying_frequency.purchases_last_12m || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
              <span>Peak Month:</span>
              <span className="font-extrabold text-text">
                {buying_frequency.most_active_month || 'N/A'}
              </span>
            </div>
          </div>

          {/* Card 3: Last Purchase (Feature 3) */}
          <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">
                  Last Purchase
                </span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <FiClock size={18} />
                </span>
              </div>

              {last_purchase.has_purchased ? (
                <div className="mt-3">
                  <div className="text-2xl font-black text-text">
                    {last_purchase.days_ago === 0
                      ? 'Today'
                      : `${last_purchase.days_ago} ${
                          last_purchase.days_ago === 1 ? 'day' : 'days'
                        } ago`}
                  </div>
                  <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                    <FiCalendar size={13} className="text-text-muted" />
                    <span>{last_purchase.formatted_date}</span>
                  </p>

                  <div className="mt-4 pt-3 border-t border-border/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Order Number:</span>
                      <span className="font-mono font-bold text-text">
                        {last_purchase.order_number || 'N/A'}
                      </span>
                    </div>
                    {last_purchase.capacity && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Kit Capacity:</span>
                        <span className="font-bold text-primary">
                          {last_purchase.capacity}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-text-muted text-xs">
                  <FiShoppingBag className="mx-auto mb-2 text-2xl text-text-muted opacity-50" />
                  <p className="font-bold">No purchases yet.</p>
                  <p className="text-[11px] mt-0.5">
                    This EPC has not placed any verified store orders yet.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              {onNavigateToTelemetryTab && (
                <button
                  type="button"
                  onClick={onNavigateToTelemetryTab}
                  className="text-primary hover:text-primary-hover font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Track Orders</span>
                  <FiArrowUpRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION C & G: TOTAL ORDERS & PO ORDERS OVERVIEW (Features 7 & 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Total Orders Matrix (Feature 8) */}
        <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider block">
                Total Orders Overview
              </span>
              <h3 className="text-lg font-black text-text mt-0.5">
                {total_orders_summary.total_orders || 0} Orders (
                {total_orders_summary.total_kw || 0} kW)
              </h3>
            </div>
            {onNavigateToTelemetryTab && (
              <button
                type="button"
                onClick={onNavigateToTelemetryTab}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <FiArrowUpRight size={13} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-surface-subtle p-3 rounded-xl border border-border/70">
              <span className="text-[11px] text-text-muted font-bold block">
                Loose Orders
              </span>
              <span className="text-xl font-black text-text mt-0.5 block">
                {total_orders_summary.loose_orders || 0}
              </span>
              <span className="text-[10px] text-text-muted">Standard Kit Runs</span>
            </div>

            <div className="bg-surface-subtle p-3 rounded-xl border border-border/70">
              <span className="text-[11px] text-text-muted font-bold block">
                PO Orders
              </span>
              <span className="text-xl font-black text-primary mt-0.5 block">
                {total_orders_summary.po_orders || 0}
              </span>
              <span className="text-[10px] text-text-muted">Quota Bookings</span>
            </div>

            <div className="bg-surface-subtle p-3 rounded-xl border border-border/70">
              <span className="text-[11px] text-text-muted font-bold block">
                Trial Orders
              </span>
              <span className="text-xl font-black text-amber-600 mt-0.5 block">
                {total_orders_summary.trial_orders || 0}
              </span>
              <span className="text-[10px] text-text-muted">Pilot Installations</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Ongoing: <b>{total_orders_summary.ongoing || 0}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Completed: <b>{total_orders_summary.completed || 0}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Cancelled: <b>{total_orders_summary.cancelled || 0}</b>
              </span>
            </div>

            <div className="font-extrabold text-text">
              Total Spend: {formatINR(total_orders_summary.total_spend_rupees)}
            </div>
          </div>
        </div>

        {/* PO Orders Analytics (Feature 7) */}
        <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider block">
                  Purchase Order (PO) Activity
                </span>
                <h3 className="text-lg font-black text-text mt-0.5">
                  {po_orders.total_po || 0} PO Commitments
                </h3>
              </div>
              {onNavigateToTelemetryTab && (
                <button
                  type="button"
                  onClick={onNavigateToTelemetryTab}
                  className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>PO History</span>
                  <FiArrowUpRight size={13} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-700 dark:text-blue-300">
                <span className="text-[11px] font-bold block">Ongoing PO</span>
                <span className="text-xl font-black mt-0.5 block">
                  {po_orders.ongoing_po || 0}
                </span>
                <span className="text-[10px] opacity-80">In Delivery / Milestones</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-700 dark:text-emerald-300">
                <span className="text-[11px] font-bold block">Completed PO</span>
                <span className="text-xl font-black mt-0.5 block">
                  {po_orders.completed_po || 0}
                </span>
                <span className="text-[10px] opacity-80">Fully Delivered</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-400/20 text-slate-700 dark:text-slate-300">
                <span className="text-[11px] font-bold block">Cancelled PO</span>
                <span className="text-xl font-black mt-0.5 block">
                  {po_orders.cancelled_po || 0}
                </span>
                <span className="text-[10px] opacity-80">Archived / Refunded</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text flex-wrap gap-2">
            <div>
              Total PO Units: <b>{po_orders.total_quantity || 0} Kits</b> (
              {po_orders.total_capacity_kw || 0} kW)
            </div>
            <div className="font-extrabold text-primary">
              PO Value: {formatINR(po_orders.total_value_rupees)}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION D: QUOTATIONS PERFORMANCE & CONVERSION (Feature 5) ─────── */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider block">
              Quotation Conversion Funnel
            </span>
            <h3 className="text-lg font-black text-text mt-0.5">
              Quotations & Conversion Ratio
            </h3>
          </div>
          {onNavigateToTelemetryTab && (
            <button
              type="button"
              onClick={onNavigateToTelemetryTab}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Quotations</span>
              <FiArrowUpRight size={13} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div className="bg-surface-subtle p-4 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-bold block">
              Total Quotes
            </span>
            <span className="text-2xl font-black text-text mt-1 block">
              {quotations.total_generated || 0}
            </span>
            <span className="text-[11px] text-text-muted">Issued to this EPC</span>
          </div>

          <div className="bg-surface-subtle p-4 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-bold block">
              Converted Quotes
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {quotations.total_converted || 0}
            </span>
            <span className="text-[11px] text-emerald-600/80 font-semibold">
              Converted into Orders
            </span>
          </div>

          <div className="bg-surface-subtle p-4 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-bold block">
              Conversion Rate
            </span>
            <span className="text-2xl font-black text-primary mt-1 block">
              {quotations.conversion_rate_pct != null
                ? `${quotations.conversion_rate_pct}%`
                : '0%'}
            </span>
            <span className="text-[11px] text-text-muted">Converted / Eligible</span>
          </div>

          <div className="bg-surface-subtle p-4 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-bold block">
              Pending / Expired
            </span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {quotations.pending || 0}{' '}
              <span className="text-xs text-text-muted font-normal">
                / {quotations.expired || 0} exp
              </span>
            </span>
            <span className="text-[11px] text-text-muted">Active Pipeline</span>
          </div>
        </div>

        {/* Conversion Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-text mb-1.5 font-bold">
            <span>Pipeline Conversion Distribution</span>
            <span>
              {quotations.total_converted || 0} of {quotations.total_generated || 0}{' '}
              Converted ({quotations.conversion_rate_pct || 0}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-subtle border border-border/60 overflow-hidden flex">
            <div
              style={{
                width: `${Math.min(100, quotations.conversion_rate_pct || 0)}%`,
              }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`Converted: ${quotations.total_converted || 0}`}
            />
            <div
              style={{
                width: `${
                  quotations.total_generated > 0
                    ? ((quotations.pending || 0) / quotations.total_generated) * 100
                    : 0
                }%`,
              }}
              className="bg-blue-400 h-full transition-all duration-500"
              title={`Pending: ${quotations.pending || 0}`}
            />
            <div
              style={{
                width: `${
                  quotations.total_generated > 0
                    ? ((quotations.expired || 0) / quotations.total_generated) * 100
                    : 0
                }%`,
              }}
              className="bg-amber-400 h-full transition-all duration-500"
              title={`Expired: ${quotations.expired || 0}`}
            />
          </div>
          <div className="flex items-center gap-4 text-[11px] text-text-muted mt-2 font-semibold flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Converted ({quotations.total_converted || 0})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              In Negotiation / Pending ({quotations.pending || 0})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Expired ({quotations.expired || 0})
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION E: ADD TO CART ATTEMPTS (Feature 6) ────────────────────── */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider block">
              Cart Engagement Tracking
            </span>
            <h3 className="text-lg font-black text-text mt-0.5">
              Add to Cart Activity
            </h3>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold flex items-center gap-1">
            <FiInfo size={12} />
            <span>Telemetry Active</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface-subtle p-4 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-bold block">
              Total Attempts
            </span>
            <span className="text-2xl font-black text-text mt-1 block">
              {cart_activity.total_attempts || 0}
            </span>
            <span className="text-[11px] text-text-muted">Total Add Clicks</span>
          </div>

          <div className="bg-surface-subtle p-4 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-bold block">
              Successful Adds
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {cart_activity.successful_attempts || 0}
            </span>
            <span className="text-[11px] text-emerald-600/80 font-semibold">
              Stock Reserved in Cart
            </span>
          </div>

          <div className="bg-surface-subtle p-4 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-bold block">
              Failed Attempts
            </span>
            <span className="text-2xl font-black text-rose-500 mt-1 block">
              {cart_activity.failed_attempts || 0}
            </span>
            <span className="text-[11px] text-text-muted">MOQ / Stock Out</span>
          </div>

          <div className="bg-surface-subtle p-4 rounded-xl border border-border">
            <span className="text-xs text-text-muted font-bold block">
              Most Added Kit
            </span>
            <span className="text-xl font-black text-amber-600 mt-1 block truncate">
              {cart_activity.most_added_capacity || 'N/A'}
            </span>
            <span className="text-[11px] text-text-muted">
              {cart_activity.unique_products || 0} Unique Products
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION F: INTERACTIVE VISUAL CHARTS (Features 1, 4, 8) ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Capacity-Wise Purchase Frequency Bar Chart (Feature 1) */}
        <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider block">
                Kit Capacity Popularity
              </span>
              <h3 className="text-base font-extrabold text-text mt-0.5">
                Purchase Frequency by Capacity (kW)
              </h3>
            </div>
            <span className="text-xs text-text-muted font-semibold">
              {orderTypeFilter === 'all' ? 'All Orders' : orderTypeFilter}
            </span>
          </div>

          {capacityBreakdown.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={capacityBreakdown}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="capacity"
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted, #64748b)' }}
                    axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted, #64748b)' }}
                    axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface, #ffffff)',
                      border: '1px solid var(--color-border, #e5e7eb)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    formatter={(val, name, item) => [
                      `${val} Orders (${item.payload.total_quantity} Kits, ${item.payload.total_kw} kW)`,
                      'Order Frequency',
                    ]}
                  />
                  <Bar
                    dataKey="order_frequency"
                    radius={[8, 8, 0, 0]}
                    name="Orders"
                  >
                    {capacityBreakdown.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={BAR_COLORS[idx % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-text-muted text-xs">
              <FiBox className="text-3xl mb-2 opacity-40" />
              <span>No kit purchases recorded for this selection.</span>
            </div>
          )}
        </div>

        {/* Chart 2: Monthly Purchasing Trends Area Chart (Feature 4) */}
        <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider block">
                Historical Trends
              </span>
              <h3 className="text-base font-extrabold text-text mt-0.5">
                Trailing 12-Month Order Trends
              </h3>
            </div>
            <span className="text-xs text-text-muted font-semibold">
              Monthly Volume
            </span>
          </div>

          {monthly_trends.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthly_trends}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#253880" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#253880" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorKw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F49222" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F49222" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted, #64748b)' }}
                    axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted, #64748b)' }}
                    axisLine={{ stroke: 'var(--color-border, #e5e7eb)' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface, #ffffff)',
                      border: '1px solid var(--color-border, #e5e7eb)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    formatter={(val, name) => [
                      name === 'orders' ? `${val} Orders` : `${val} kW`,
                      name === 'orders' ? 'Order Count' : 'Solar Capacity',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#253880"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                    name="orders"
                  />
                  <Area
                    type="monotone"
                    dataKey="kw"
                    stroke="#F49222"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorKw)"
                    name="kw"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-text-muted text-xs">
              <FiCalendar className="text-3xl mb-2 opacity-40" />
              <span>No monthly trends available yet.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
