/**
 * CustomerBehaviorSection.jsx
 * Section I: Customer Store Behavior Analytics
 * Features Cart Abandonment Ratio, Repeat Order Ratio, and Engagement Funnel.
 */

import React from 'react';
import {
  FiEye,
  FiDownload,
  FiShoppingCart,
  FiShoppingBag,
  FiUserCheck,
  FiRepeat,
  FiAlertOctagon,
  FiTrendingDown,
} from 'react-icons/fi';

export default function CustomerBehaviorSection({ behaviorData = {} }) {
  const {
    totalStoreVisits = 0,
    uniqueVisitors = 0,
    kitCardViews = 0,
    datasheetDownloads = 0,
    addToCartEvents = 0,
    checkoutInitiated = 0,
    ordersPlaced = 0,
    abandonedCarts = 0,
    cartAbandonmentRatio = '0.0%',
    repeatOrderRatio = '0.0%',
    avgDaysBetweenRepeatOrders = 0,
    mostAbandonedKits = [],
  } = behaviorData || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
            <FiShoppingCart size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Customer Store Behavior & Cart Analytics</h2>
            <p className="text-xs text-text-muted">
              Engagement funnel, datasheet downloads, drop-offs, and repeat purchasing retention
            </p>
          </div>
        </div>
      </div>

      {/* Engagement Micro Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Store Visits</span>
          <div className="text-xl font-black text-text mt-0.5">{totalStoreVisits.toLocaleString()}</div>
          <span className="text-[10px] text-text-muted">{uniqueVisitors.toLocaleString()} unique users</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-text-muted">Kit Views</span>
          <div className="text-xl font-black text-text mt-0.5">{kitCardViews.toLocaleString()}</div>
          <span className="text-[10px] text-text-muted">High engagement</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-600">Datasheet Downloads</span>
          <div className="text-xl font-black text-blue-600 mt-0.5">{datasheetDownloads.toLocaleString()}</div>
          <span className="text-[10px] text-text-muted">Technical intent</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-indigo-600">Add to Carts</span>
          <div className="text-xl font-black text-indigo-600 mt-0.5">{addToCartEvents.toLocaleString()}</div>
          <span className="text-[10px] text-text-muted">{checkoutInitiated} checkouts</span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-3 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600">Orders Placed</span>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{ordersPlaced.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Completed checkout</span>
        </div>
      </div>

      {/* Core Ratio Cards (Cart Abandonment & Repeat Order Ratio) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cart Abandonment Ratio Card */}
        <div className="bg-surface rounded-2xl border border-danger/30 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-danger uppercase tracking-wider">Cart Abandonment Ratio</span>
              <div className="text-3xl font-black text-danger mt-1">{cartAbandonmentRatio}</div>
            </div>
            <div className="p-3 rounded-2xl bg-danger/10 text-danger">
              <FiTrendingDown size={24} />
            </div>
          </div>

          <div className="text-[11px] text-text-muted">
            <b>{abandonedCarts.toLocaleString()} carts abandoned</b> before payment out of{' '}
            <b>{addToCartEvents.toLocaleString()} created</b>.
          </div>

          <div className="text-[10px] font-mono text-danger bg-danger/5 p-1.5 rounded-lg border border-danger/20">
            Formula: (Eligible Carts Abandoned / Eligible Carts Created) × 100
          </div>

          <div className="pt-2 border-t border-border">
            <h5 className="text-[11px] font-bold text-text mb-2">Most Abandoned Kit Types:</h5>
            <div className="space-y-1.5">
              {mostAbandonedKits.map((item) => (
                <div key={item.kit} className="flex justify-between text-xs">
                  <span className="text-text-muted truncate">{item.kit}</span>
                  <span className="font-bold text-danger">
                    {item.abandonments} drops ({item.pct})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Repeat Order Ratio Card */}
        <div className="bg-surface rounded-2xl border border-emerald-500/30 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Repeat Order Ratio</span>
              <div className="text-3xl font-black text-emerald-600 mt-1">{repeatOrderRatio}</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <FiRepeat size={24} />
            </div>
          </div>

          <div className="text-[11px] text-text-muted">
            Customer retention: <b>{repeatOrderRatio}</b> of eligible first-time buyers order again.
          </div>

          <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/20">
            Formula: (Customers with Repeat Orders / Eligible First Order Customers) × 100
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-text-muted font-medium">Avg Time Between First & Repeat Order:</span>
              <span className="font-bold text-text bg-surface-subtle px-2 py-0.5 rounded-md">
                {avgDaysBetweenRepeatOrders} Days
              </span>
            </div>

            <div className="pt-2">
              <h5 className="text-[11px] font-bold text-text mb-1">Top Repeat Purchase Hubs:</h5>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-lg bg-surface-subtle text-text font-medium">Jaipur (48 repeats)</span>
                <span className="px-2 py-1 rounded-lg bg-surface-subtle text-text font-medium">Ahmedabad (39 repeats)</span>
                <span className="px-2 py-1 rounded-lg bg-surface-subtle text-text font-medium">Indore (21 repeats)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

