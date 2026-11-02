/**
 * StoreActivityMetrics.jsx
 * Section I. Customer Store Behavior Analytics - Store Activity Metrics Strip
 * Displays 10 core metrics tracking user visits, engagement, checkouts, and retention.
 */

import React from 'react';
import {
  FiUsers,
  FiUserCheck,
  FiEye,
  FiDownload,
  FiShoppingCart,
  FiShoppingBag,
  FiTrendingUp,
  FiRepeat,
  FiAlertTriangle,
  FiActivity,
} from 'react-icons/fi';

export default function StoreActivityMetrics({ metrics = {} }) {
  const {
    totalStoreVisits = 0,
    uniqueVisitors = 0,
    loggedInUsers = 0,
    kitCardViews = 0,
    datasheetDownloads = 0,
    addToCartEvents = 0,
    checkoutInitiated = 0,
    ordersPlaced = 0,
    abandonedCarts = 0,
    repeatPurchases = 0,
  } = metrics || {};

  const cards = [
    {
      label: 'Total Store Visits',
      value: totalStoreVisits.toLocaleString(),
      sub: 'All traffic sessions',
      icon: FiActivity,
      color: 'blue',
    },
    {
      label: 'Unique Visitors',
      value: uniqueVisitors.toLocaleString(),
      sub: 'Distinct device IDs',
      icon: FiUsers,
      color: 'sky',
    },
    {
      label: 'Logged-in Users',
      value: loggedInUsers.toLocaleString(),
      sub: 'EPCs & Franchisees',
      icon: FiUserCheck,
      color: 'indigo',
    },
    {
      label: 'Kit Card Views',
      value: kitCardViews.toLocaleString(),
      sub: 'Catalog interactions',
      icon: FiEye,
      color: 'teal',
    },
    {
      label: 'Datasheet Downloads',
      value: datasheetDownloads.toLocaleString(),
      sub: 'High intent downloads',
      icon: FiDownload,
      color: 'emerald',
    },
    {
      label: 'Add-to-Cart Events',
      value: addToCartEvents.toLocaleString(),
      sub: 'Carts created',
      icon: FiShoppingCart,
      color: 'purple',
    },
    {
      label: 'Checkout Initiated',
      value: checkoutInitiated.toLocaleString(),
      sub: 'Reached checkout',
      icon: FiTrendingUp,
      color: 'violet',
    },
    {
      label: 'Orders Placed',
      value: ordersPlaced.toLocaleString(),
      sub: 'Completed purchases',
      icon: FiShoppingBag,
      color: 'green',
    },
    {
      label: 'Abandoned Carts',
      value: abandonedCarts.toLocaleString(),
      sub: 'Dropped before payment',
      icon: FiAlertTriangle,
      color: 'rose',
    },
    {
      label: 'Repeat Purchases',
      value: repeatPurchases.toLocaleString(),
      sub: 'Returning buyer orders',
      icon: FiRepeat,
      color: 'amber',
    },
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'blue':
        return { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-200/50' };
      case 'sky':
        return { bg: 'bg-sky-500/10', text: 'text-sky-600', border: 'border-sky-200/50' };
      case 'indigo':
        return { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-200/50' };
      case 'teal':
        return { bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-200/50' };
      case 'emerald':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200/50' };
      case 'purple':
        return { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-200/50' };
      case 'violet':
        return { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-200/50' };
      case 'green':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200/50' };
      case 'rose':
        return { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-200/50' };
      case 'amber':
        return { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-200/50' };
      default:
        return { bg: 'bg-primary/10', text: 'text-primary', border: 'border-border' };
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-muted">
          Store Activity Metrics (Live Telemetry)
        </h3>
        <span className="text-[11px] text-text-muted">
          Tracking entire storefront conversion funnel
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
        {cards.map((c) => {
          const Icon = c.icon;
          const styling = getColorClasses(c.color);
          return (
            <div
              key={c.label}
              className={`bg-surface rounded-xl border ${styling.border} p-3 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase leading-tight line-clamp-1">
                  {c.label}
                </span>
                <div className={`p-1 rounded-md ${styling.bg} ${styling.text}`}>
                  <Icon size={12} />
                </div>
              </div>
              <div>
                <div className={`text-lg font-black tracking-tight ${styling.text}`}>
                  {c.value}
                </div>
                <div className="text-[10px] text-text-muted font-medium mt-0.5 truncate">
                  {c.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

