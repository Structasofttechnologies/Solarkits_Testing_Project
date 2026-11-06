/**
 * AdminEpcBuyingAnalytics.jsx
 *
 * Comprehensive EPC Buying Behavior & Order Analytics Suite for SolarKits Admin.
 * Displays all 8 features calculated strictly from live database records:
 * 1. Most Frequently Purchased Kit Capacity (with Loose / PO / Trial separation)
 * 2. EPC Classification Type (with Admin real-time reclassification dropdown)
 * 3. Last Purchase: How Many Days Ago?
 * 4. EPC Buying Frequency & 12-Month Velocity
 * 5. Quotation Count & Conversion Funnel
 * 6. Add to Cart Telemetry (Attempts vs Success)
 * 7. Purchase Order (PO) Status & Capacity Breakdown
 * 8. High-Capacity (≥5 kW) & Repeat Purchasing Loyalty
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiZap,
  FiClock,
  FiShoppingBag,
  FiFileText,
  FiTrendingUp,
  FiLayers,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiFilter,
  FiBox,
  FiEdit3,
  FiCheck,
  FiChevronDown,
  FiUsers,
  FiCalendar,
} from 'react-icons/fi';
import { storeDashboardApi } from './storeDashboardApi';

const formatInr = (val) => {
  const num = Number(val) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const getClassificationBadgeClass = (classification) => {
  switch (classification) {
    case 'Very Frequent':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'Frequent':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Regular':
      return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
    case 'Occasional':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    default:
      return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  }
};

const getEpcTypeBadgeColor = (color) => {
  switch (color) {
    case 'amber':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'blue':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'purple':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'teal':
      return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
    case 'emerald':
    default:
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  }
};

export default function AdminEpcBuyingAnalytics({ epcId, initialEpc = {}, epcList = [] }) {
  const [selectedEpcId, setSelectedEpcId] = useState(epcId || initialEpc._id || initialEpc.id);
  const [timeRange, setTimeRange] = useState('all');
  const [orderType, setOrderType] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // EPC Type editing state
  const [activeEpcTypes, setActiveEpcTypes] = useState([]);
  const [isEditingType, setIsEditingType] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [updatingType, setUpdatingType] = useState(false);
  const [typeUpdateSuccess, setTypeUpdateSuccess] = useState(false);

  // Synchronize when parent prop changes
  useEffect(() => {
    const nextId = epcId || initialEpc._id || initialEpc.id;
    if (nextId && nextId !== selectedEpcId) {
      setSelectedEpcId(nextId);
    }
  }, [epcId, initialEpc]);

  // Fetch active EPC Type masters for admin reclassification
  useEffect(() => {
    async function loadEpcTypes() {
      const res = await storeDashboardApi.getActiveEpcTypes();
      if (res && res.success && Array.isArray(res.data)) {
        setActiveEpcTypes(res.data);
      }
    }
    loadEpcTypes();
  }, []);

  // Fetch Buying Analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!selectedEpcId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await storeDashboardApi.getEpcBuyingAnalytics(selectedEpcId, {
        range: timeRange,
        order_type: orderType,
      });

      if (res && res.success && res.data) {
        setAnalytics(res.data);
        if (res.data.epc_type?.id) {
          setSelectedTypeId(res.data.epc_type.id);
        }
      } else {
        setError(res?.message || 'Unable to retrieve EPC Buying Analytics.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to connect to analytics service.');
    } finally {
      setLoading(false);
    }
  }, [selectedEpcId, timeRange, orderType]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle Admin updating EPC Type
  const handleUpdateEpcType = async () => {
    if (!selectedTypeId || !selectedEpcId) return;
    setUpdatingType(true);
    setTypeUpdateSuccess(false);
    try {
      const res = await storeDashboardApi.updateEpcType(selectedEpcId, selectedTypeId);
      if (res && res.success) {
        setTypeUpdateSuccess(true);
        setIsEditingType(false);
        // Refresh analytics to show updated EPC type
        fetchAnalytics();
        setTimeout(() => setTypeUpdateSuccess(false), 3000);
      } else {
        alert(res?.message || 'Failed to update EPC type');
      }
    } catch (err) {
      alert(err.message || 'Error updating EPC type');
    } finally {
      setUpdatingType(false);
    }
  };

  const accountInfo = useMemo(() => {
    const fromApi = analytics?.account_details || {};
    const fromList = epcList.find((e) => (e.id || e._id) === selectedEpcId) || {};
    return {
      name: fromApi.name || fromList.name || initialEpc.name || 'Solar EPC Contractor',
      contact: fromApi.contact || fromList.contact || initialEpc.contact || 'Managing Director',
      mobile: fromApi.mobile || fromList.mobile || initialEpc.mobile || 'N/A',
      state: fromApi.state || fromList.state || initialEpc.state || 'Regional',
      district: fromApi.district || fromList.district || initialEpc.district || 'Regional',
      gstin: fromApi.gstin || initialEpc.gstin || 'N/A',
    };
  }, [analytics, epcList, selectedEpcId, initialEpc]);

  // Destructure metrics with safe fallbacks
  const epcType = analytics?.epc_type || {};
  const lastPurchase = analytics?.last_purchase || {};
  const capacityAnalytics = analytics?.capacity_analytics || {};
  const buyingFreq = analytics?.buying_frequency || {};
  const quotations = analytics?.quotations || {};
  const poOrders = analytics?.po_orders || {};
  const ordersSummary = analytics?.total_orders_summary || {};
  const cartActivity = analytics?.cart_activity || {};
  const monthlyTrends = analytics?.monthly_trends || [];

  const topCapacities = capacityAnalytics.top_three || [];
  const capacityBreakdown = capacityAnalytics.breakdown || [];
  const maxCapacityCount = useMemo(() => {
    if (!capacityBreakdown.length) return 1;
    return Math.max(...capacityBreakdown.map((c) => c.order_frequency || 1), 1);
  }, [capacityBreakdown]);

  const maxMonthOrders = useMemo(() => {
    if (!monthlyTrends.length) return 1;
    return Math.max(...monthlyTrends.map((m) => m.orders_count || 0), 1);
  }, [monthlyTrends]);

  return (
    <div className="space-y-6 text-xs text-text">
      {/* ── Top Context & EPC Selector Header ─────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* EPC Selector Dropdown */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <FiUsers size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                Audited EPC Contractor
              </span>
              {epcList.length > 1 ? (
                <div className="relative mt-0.5">
                  <select
                    value={selectedEpcId}
                    onChange={(e) => setSelectedEpcId(e.target.value)}
                    className="appearance-none text-sm font-black text-text bg-surface-subtle border border-border rounded-xl py-1 px-3 pr-8 focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {epcList.map((epc) => (
                      <option key={epc._id || epc.id} value={epc._id || epc.id}>
                        {epc.name} ({epc.state || 'Regional'})
                      </option>
                    ))}
                  </select>
                  <FiChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                </div>
              ) : (
                <div className="text-sm font-black text-text">{accountInfo.name}</div>
              )}
            </div>
          </div>

          {/* Quick Indicator Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Feature 2: EPC Type Badge with Admin Edit trigger */}
            <div className="flex items-center gap-1.5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${getEpcTypeBadgeColor(
                  epcType.badge_color
                )}`}
              >
                {epcType.name || 'Solar EPC Contractor'}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingType(!isEditingType)}
                title="Change EPC Classification as Admin"
                className="p-1 rounded-lg bg-surface-subtle border border-border text-text hover:text-primary transition-colors cursor-pointer"
              >
                <FiEdit3 size={12} />
              </button>
            </div>

            {/* Feature 3: Days Ago Quick Pill */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${lastPurchase.has_purchases
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                }`}
            >
              🕒 {lastPurchase.has_purchases ? `${lastPurchase.days_ago} days ago` : 'No purchases yet'}
            </span>
          </div>
        </div>

        {/* Feature 2: Admin EPC Type Modification Form (collapsible) */}
        {isEditingType && (
          <div className="p-3 rounded-xl bg-surface-subtle border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
            <div className="space-y-0.5">
              <span className="font-bold text-primary text-xs">Admin Master: Modify EPC Classification</span>
              <p className="text-[11px] text-text-muted">
                Assign business classification (Residential, Commercial, Industrial, Tender, etc.) to apply tailored margin & catalog rules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="text-xs font-semibold text-text bg-surface rounded-lg px-2.5 py-1.5 border border-border focus:outline-none"
              >
                <option value="">Select Classification Type...</option>
                {activeEpcTypes.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleUpdateEpcType}
                disabled={updatingType || !selectedTypeId}
                className="px-3 py-1.5 rounded-lg bg-primary text-text-inverse font-bold hover:bg-primary-hover disabled:opacity-50 cursor-pointer text-xs"
              >
                {updatingType ? 'Saving...' : 'Save Type'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingType(false)}
                className="px-2 py-1.5 text-xs text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {typeUpdateSuccess && (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs flex items-center gap-1.5">
            <FiCheck size={14} /> EPC Classification updated successfully in database.
          </div>
        )}

        {/* Contractor Sub-details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-[11px] text-text-muted">
          <div>
            <span className="font-medium">Contact Person:</span>{' '}
            <span className="font-bold text-text">{accountInfo.contact}</span>
          </div>
          <div>
            <span className="font-medium">Mobile / WhatsApp:</span>{' '}
            <span className="font-bold text-text">{accountInfo.mobile}</span>
          </div>
          <div>
            <span className="font-medium">Location:</span>{' '}
            <span className="font-bold text-text">
              {accountInfo.district}, {accountInfo.state}
            </span>
          </div>
          <div>
            <span className="font-medium">GSTIN Credential:</span>{' '}
            <span className="font-bold font-mono text-text">{accountInfo.gstin}</span>
          </div>
        </div>
      </div>

      {/* ── Filters Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-surface p-2.5 px-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 text-text-muted">
          <FiFilter size={14} className="text-primary" />
          <span className="font-bold text-xs text-text">Analytics Controls:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted font-medium">Time Window:</span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface-subtle">
              {[
                { id: '30d', label: '30 Days' },
                { id: '90d', label: '90 Days' },
                { id: '12m', label: '12 Months' },
                { id: 'all', label: 'All Time' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeRange(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${timeRange === tab.id ? 'bg-primary text-text-inverse shadow-xs' : 'text-text-muted hover:text-text'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Order Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted font-medium">Order Stream:</span>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="text-xs font-bold text-text bg-surface-subtle rounded-lg px-2.5 py-1 border border-border focus:outline-none"
            >
              <option value="all">All Orders</option>
              <option value="loose">Loose Orders</option>
              <option value="po">PO Orders</option>
              <option value="trial">Trial Orders</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-primary transition-colors cursor-pointer disabled:opacity-40"
            title="Refresh Live Analytics"
          >
            <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center text-text-muted flex flex-col items-center justify-center gap-2">
          <FiRefreshCw size={24} className="animate-spin text-primary" />
          <span className="text-xs font-semibold">Calculating EPC Buying Analytics from Live Records...</span>
        </div>
      )}

      {/* Error Alert */}
      {error && !loading && (
        <div className="p-3.5 rounded-2xl bg-danger/10 border border-danger/20 text-xs text-danger flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="px-3 py-1 rounded-lg bg-danger text-white font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Analytics Content */}
      {!loading && !error && (
        <div className="space-y-6">
          {/* ── Section A: High-Impact KPI Matrix ─────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Feature 1: Most Purchased Kit Card */}
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                    Feature 1: Most Purchased Kit
                  </span>
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <FiZap size={16} />
                  </div>
                </div>
                <div className="mt-2 text-xl font-black text-text">
                  {capacityAnalytics.most_purchased?.capacity || 'No Purchases'}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {capacityAnalytics.most_purchased?.total_kits
                    ? `${capacityAnalytics.most_purchased.total_kits} kits (${capacityAnalytics.most_purchased.total_kw} kW) ordered`
                    : 'Insufficient order data'}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-text-muted flex justify-between">
                <span>Order Frequency:</span>
                <span className="font-bold text-text">
                  {capacityAnalytics.most_purchased?.order_frequency || 0} orders
                </span>
              </div>
            </div>

            {/* Feature 3: Last Purchase Days Ago Card */}
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                    Feature 3: Last Purchase
                  </span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                    <FiClock size={16} />
                  </div>
                </div>
                <div className="mt-2 text-xl font-black text-text">
                  {lastPurchase.has_purchases ? `${lastPurchase.days_ago} Days Ago` : 'No Purchases Yet'}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                  {lastPurchase.has_purchases
                    ? `Latest: ${lastPurchase.latest_order_number}`
                    : 'Awaiting initial store order'}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-text-muted flex justify-between">
                <span>Purchase Date:</span>
                <span className="font-bold text-text">
                  {lastPurchase.last_purchase_date
                    ? new Date(lastPurchase.last_purchase_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Feature 4: Buying Frequency Card */}
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                    Feature 4: Buying Frequency
                  </span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <FiTrendingUp size={16} />
                  </div>
                </div>
                <div className="mt-2 text-xl font-black text-text">
                  {buyingFreq.avg_interval_days !== null
                    ? `Every ${buyingFreq.avg_interval_days} Days`
                    : 'First Purchase Stage'}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getClassificationBadgeClass(
                      buyingFreq.classification
                    )}`}
                  >
                    {buyingFreq.classification || 'New EPC'}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-text-muted flex justify-between">
                <span>Recent Volume (30d / 90d):</span>
                <span className="font-bold text-text">
                  {buyingFreq.purchases_last_30d || 0} / {buyingFreq.purchases_last_90d || 0} orders
                </span>
              </div>
            </div>

            {/* Feature 7: PO Spend & Status Card */}
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                    Feature 7: PO Procurement
                  </span>
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                    <FiShoppingBag size={16} />
                  </div>
                </div>
                <div className="mt-2 text-xl font-black text-text">
                  {formatInr(poOrders.total_value_rupees)}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {poOrders.total_po || 0} Purchase Orders ({poOrders.total_capacity_kw || 0} kW)
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 text-[10px] text-text-muted flex justify-between">
                <span>Ongoing / Completed:</span>
                <span className="font-bold text-text">
                  <span className="text-amber-600">{poOrders.ongoing_po || 0} Active</span> |{' '}
                  <span className="text-emerald-600">{poOrders.completed_po || 0} Done</span>
                </span>
              </div>
            </div>
          </div>

          {/* ── Section B: Capacity-Wise Distribution & Top 3 Ranking (Feature 1) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Capacity Frequency Bar Chart */}
            <div className="lg:col-span-2 bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                    Purchased Kit Capacity Distribution
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Order occurrences & total units ordered across standardized capacities
                  </p>
                </div>
                <span className="text-[11px] font-bold text-primary">
                  {capacityBreakdown.length} Capacities Logged
                </span>
              </div>

              {capacityBreakdown.length > 0 ? (
                <div className="space-y-2.5 pt-2">
                  {capacityBreakdown.map((item) => {
                    const pct = Math.round((item.order_frequency / maxCapacityCount) * 100);
                    return (
                      <div key={item.capacity} className="space-y-1">
                        <div className="flex items-center justify-between font-medium">
                          <span className="font-bold text-text">{item.capacity}</span>
                          <span className="text-text-muted text-[11px]">
                            <b className="text-primary">{item.order_frequency} orders</b> (
                            {item.total_quantity} kits • {item.total_capacity_kw} kW)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-subtle overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-text-muted">
                  No kit capacities purchased under the active filter selection.
                </div>
              )}
            </div>

            {/* Top 3 Capacity Leaderboard */}
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">Top 3 Preferred Capacities</h3>
                <p className="text-[11px] text-text-muted">Ranked by distinct order occurrences</p>

                <div className="mt-3 space-y-2.5">
                  {topCapacities.length > 0 ? (
                    topCapacities.map((c, idx) => (
                      <div
                        key={c.capacity}
                        className="p-2.5 rounded-xl border border-border/80 bg-surface-subtle flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${idx === 0
                              ? 'bg-amber-500 text-white'
                              : idx === 1
                                ? 'bg-slate-400 text-white'
                                : 'bg-amber-700 text-white'
                              }`}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-text">{c.capacity}</div>
                            <div className="text-[10px] text-text-muted">
                              {c.total_quantity} units ({c.total_capacity_kw} kW)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-primary">{c.order_frequency}</div>
                          <div className="text-[9px] uppercase text-text-muted">Orders</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-text-muted">No top ranking available.</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 text-[10px] text-text-muted">
                Tip: Use these preferred capacities to curate targeted bulk commercial quotes.
              </div>
            </div>
          </div>

          {/* ── Section C: Quotation Pipeline & Conversion Funnel (Feature 5) ─── */}
          <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                  Feature 5: Quotation Pipeline & Conversion Funnel
                </h3>
                <p className="text-[11px] text-text-muted">
                  Mathematical conversion tracking: (Converted Quotes / Eligible Quotes) × 100
                </p>
              </div>
              <span className="font-mono text-[10px] text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20">
                Formula: (Converted ÷ Generated) × 100
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="p-3 rounded-xl border border-border bg-surface-subtle">
                <span className="text-[10px] uppercase font-bold text-text-muted">Total Generated</span>
                <div className="text-xl font-black text-text mt-0.5">{quotations.total_generated || 0}</div>
                <span className="text-[10px] text-text-muted">Eligible EPC Quotes</span>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Converted</span>
                <div className="text-xl font-black text-emerald-600 mt-0.5">{quotations.total_converted || 0}</div>
                <span className="text-[10px] text-emerald-700/80">Closed as Store Orders</span>
              </div>

              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                <span className="text-[10px] uppercase font-bold text-primary">Conversion Rate</span>
                <div className="text-xl font-black text-primary mt-0.5">
                  {quotations.conversion_rate_pct !== undefined ? `${quotations.conversion_rate_pct}%` : '0.0%'}
                </div>
                <span className="text-[10px] text-primary/80">Conversion Efficiency</span>
              </div>

              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-[10px] uppercase font-bold text-amber-600">Pending Review</span>
                <div className="text-xl font-black text-amber-600 mt-0.5">{quotations.pending || 0}</div>
                <span className="text-[10px] text-amber-700/80">Awaiting Contractor Acceptance</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-500/20 bg-slate-500/5">
                <span className="text-[10px] uppercase font-bold text-text-muted">Expired / Lost</span>
                <div className="text-xl font-black text-text mt-0.5">
                  {(quotations.expired || 0) + (quotations.lost || 0)}
                </div>
                <span className="text-[10px] text-text-muted">Validity lapsed / rejected</span>
              </div>
            </div>
          </div>

          {/* ── Section D: Cart Telemetry & 12-Month Buying Velocity (Features 4 & 6) ─ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Feature 6: Add to Cart Telemetry */}
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                    Feature 6: Add to Cart Telemetry
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Verified shopping cart events, intent tracking & drop-off prevention
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                  <FiLayers size={16} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-xl border border-border bg-surface-subtle">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Total Attempts</span>
                  <div className="text-lg font-black text-text mt-0.5">{cartActivity.total_attempts || 0}</div>
                </div>

                <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Successful</span>
                  <div className="text-lg font-black text-emerald-600 mt-0.5">
                    {cartActivity.successful_attempts || 0}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-danger/20 bg-danger/5">
                  <span className="text-[10px] font-bold text-danger uppercase">Failed</span>
                  <div className="text-lg font-black text-danger mt-0.5">{cartActivity.failed_attempts || 0}</div>
                </div>

                <div className="p-2.5 rounded-xl border border-border bg-surface-subtle">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Unique Products</span>
                  <div className="text-lg font-black text-text mt-0.5">{cartActivity.unique_products || 0}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-muted">Most Added Kit Capacity:</span>
                  <div className="text-sm font-black text-text mt-0.5">
                    {cartActivity.most_added_capacity || 'Standard Solar ComboKit'}
                  </div>
                </div>
                <div className="text-right text-[10px] text-text-muted">
                  Telemetry Active: <span className="font-bold text-emerald-600">Live</span>
                </div>
              </div>
            </div>

            {/* Feature 4: 12-Month Purchasing Velocity Timeline */}
            <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                    Purchasing Velocity (12 Months)
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Monthly order cadence, kit volume & seasonal buying velocity
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                  <FiCalendar size={16} />
                </div>
              </div>

              {monthlyTrends.length > 0 ? (
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2 items-end h-32">
                  {monthlyTrends.map((m) => {
                    const heightPct = Math.round((m.orders_count / maxMonthOrders) * 100);
                    return (
                      <div key={m.month} className="flex flex-col items-center gap-1 group h-full justify-end">
                        <div
                          className="w-full rounded-md bg-primary/20 group-hover:bg-primary transition-all relative flex flex-col justify-end"
                          style={{ height: `${Math.max(heightPct, 8)}%` }}
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-text text-text-inverse text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                            {m.orders_count} orders ({m.total_kw} kW)
                          </div>
                        </div>
                        <span className="text-[9px] text-text-muted font-mono truncate w-full text-center">
                          {m.label?.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-text-muted">No monthly transaction trends recorded.</div>
              )}

              <div className="pt-2 border-t border-border/60 text-[10px] text-text-muted flex justify-between">
                <span>Most Active Purchasing Month:</span>
                <span className="font-bold text-text">{buyingFreq.most_active_month || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* ── Section E: PO Orders & Capacity Fulfillment Breakdown (Feature 7) ─ */}
          <div className="bg-surface rounded-2xl border border-border p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                  Feature 7: Purchase Order Fulfillment & Commercial Ledger
                </h3>
                <p className="text-[11px] text-text-muted">
                  Bulk procurement PO tracking, ongoing commitments, cancelled requests & capacity sum
                </p>
              </div>
              <span className="text-xs font-black text-emerald-600">
                {formatInr(poOrders.total_value_rupees)} Total PO Spend
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-border bg-surface-subtle">
                <span className="text-[10px] uppercase font-bold text-text-muted">Total Ordered Kits</span>
                <div className="text-xl font-black text-text mt-0.5">{poOrders.total_quantity || 0}</div>
                <span className="text-[10px] text-text-muted">Across all PO procurements</span>
              </div>

              <div className="p-3 rounded-xl border border-border bg-surface-subtle">
                <span className="text-[10px] uppercase font-bold text-text-muted">Total PO Capacity</span>
                <div className="text-xl font-black text-primary mt-0.5">{poOrders.total_capacity_kw || 0} kW</div>
                <span className="text-[10px] text-text-muted">Aggregated capacity load</span>
              </div>

              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-[10px] uppercase font-bold text-amber-600">Ongoing PO Orders</span>
                <div className="text-xl font-black text-amber-600 mt-0.5">{poOrders.ongoing_po || 0}</div>
                <span className="text-[10px] text-amber-700/80">In manufacturing / dispatch</span>
              </div>

              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Completed PO Orders</span>
                <div className="text-xl font-black text-emerald-600 mt-0.5">{poOrders.completed_po || 0}</div>
                <span className="text-[10px] text-emerald-700/80">Fully fulfilled & delivered</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

