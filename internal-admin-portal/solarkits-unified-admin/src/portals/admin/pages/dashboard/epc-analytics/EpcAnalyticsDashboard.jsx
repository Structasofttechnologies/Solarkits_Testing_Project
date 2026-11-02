/**
 * EpcAnalyticsDashboard.jsx
 * Admin EPC Store Behavior Analytics & EPC Profile Management Dashboard
 * Route: /admin-panel/epc-analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiDownload,
  FiTrendingUp,
  FiShoppingCart,
  FiUsers,
  FiActivity,
} from 'react-icons/fi';

import EpcFilterPanel from './EpcFilterPanel';
import StoreActivityMetrics from './StoreActivityMetrics';
import CartAbandonmentSection from './CartAbandonmentSection';
import RepeatOrderSection from './RepeatOrderSection';
import EpcDirectorySection from './EpcDirectorySection';
import EpcProfileDrawer from './EpcProfileDrawer';
import { epcAnalyticsApi } from '../../../api/epcAnalyticsApi';

export default function EpcAnalyticsDashboard() {
  const [filters, setFilters] = useState({
    dateRange: 'last_30_days',
    state: 'all',
    kitType: 'all',
    orderType: 'all',
    customerType: 'all',
    search: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [metrics, setMetrics] = useState({});
  const [cartAbandonment, setCartAbandonment] = useState({});
  const [repeatOrders, setRepeatOrders] = useState({});
  const [epcDirectory, setEpcDirectory] = useState([]);
  const [bdeList, setBdeList] = useState([]);
  const [states, setStates] = useState([]);
  const [kitTypes, setKitTypes] = useState([]);

  // Drawer state
  const [selectedEpcId, setSelectedEpcId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Active view tab (Overview, Cart Abandonment, Repeat Orders, EPC Profiles)
  const [dashboardTab, setDashboardTab] = useState('all');

  const setFilter = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: 'last_30_days',
      state: 'all',
      kitType: 'all',
      orderType: 'all',
      customerType: 'all',
      search: '',
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await epcAnalyticsApi.getBehaviorAnalytics(filters);
      if (data) {
        setMetrics(data.storeActivityMetrics || {});
        setCartAbandonment(data.cartAbandonmentSection || {});
        setRepeatOrders(data.repeatOrderSection || {});
        setEpcDirectory(data.epcDirectory || []);
        setBdeList(data.bdeList || []);
        setStates(data.states || []);
        setKitTypes(data.kitTypes || []);
      }
    } catch (err) {
      console.error('Error fetching EPC behavior analytics:', err);
      setError('Unable to load real-time analytics data: ' + (err.response?.data?.message || err.message || 'Connection error'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenEpcProfile = (id) => {
    setSelectedEpcId(id);
    setDrawerOpen(true);
  };

  const handleCloseEpcProfile = () => {
    setDrawerOpen(false);
    setSelectedEpcId(null);
  };

  const handleProfileUpdated = (id, updatedFields) => {
    // Optimistically update directory
    setEpcDirectory((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          return {
            ...e,
            behaviorStatus: updatedFields.behavior_status || e.behaviorStatus,
            customerTier: updatedFields.customer_tier || e.customerTier,
            recoveryDiscountPct: updatedFields.recovery_discount_pct ?? e.recoveryDiscountPct,
            recoveryFollowupStatus: updatedFields.recovery_followup_status || e.recoveryFollowupStatus,
            creditLimitInr: updatedFields.credit_limit_inr ?? e.creditLimitInr,
            behaviorNotes: updatedFields.behavior_notes || e.behaviorNotes,
          };
        }
        return e;
      })
    );
  };

  // CSV Export utility
  const handleExportCsv = () => {
    if (!epcDirectory.length) return;
    const headers = [
      'EPC Name',
      'Contact',
      'State',
      'District',
      'Tier',
      'Behavior Status',
      'Store Visits',
      'Datasheet Downloads',
      'Carts Created',
      'Carts Abandoned',
      'Abandonment Ratio',
      'Orders Placed',
      'Repeat Orders',
      'Assigned BDE',
    ];
    const rows = epcDirectory.map((e) => [
      `"${e.name}"`,
      `"${e.contactPerson}"`,
      `"${e.state}"`,
      `"${e.district}"`,
      `"${e.customerTier}"`,
      `"${e.behaviorStatus}"`,
      e.storeVisits,
      e.datasheetDownloads,
      e.cartsCreated,
      e.cartsAbandoned,
      `"${e.abandonmentRatio}"`,
      e.ordersCount,
      e.repeatOrders,
      `"${e.assignedBde?.name || 'Central'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `epc_behavior_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            SOLARKITS Commercial Intelligence
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-text">
            Customer Store Behavior & EPC Analytics
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Monitor store visits, cart abandonment ratios, repeat order retention, and manage EPC profiles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface border border-border text-text hover:bg-surface-subtle shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw
              size={13}
              className={loading ? 'animate-spin text-primary' : 'text-primary'}
            />
            <span>{loading ? 'Refreshing...' : 'Live Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-danger/10 border border-danger/20 text-xs text-danger">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="px-3 py-1 rounded-xl bg-danger text-white font-semibold hover:bg-danger-hover cursor-pointer text-xs"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Navigation View Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          type="button"
          onClick={() => setDashboardTab('all')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${dashboardTab === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiActivity size={14} />
          <span>Full Behavioral Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('cartAbandonment')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${dashboardTab === 'cartAbandonment'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiShoppingCart size={14} />
          <span>Cart Abandonment Ratio</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('repeatOrders')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${dashboardTab === 'repeatOrders'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiTrendingUp size={14} />
          <span>Repeat Order Ratio</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardTab('epcDirectory')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${dashboardTab === 'epcDirectory'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-muted hover:bg-surface-subtle hover:text-text'
            }`}
        >
          <FiUsers size={14} />
          <span>EPC Directory & Profiles</span>
        </button>
      </div>

      {/* Global Filter Bar */}
      <EpcFilterPanel
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        states={states}
        kitTypes={kitTypes}
        onExportCsv={handleExportCsv}
      />

      {/* 1. Store Activity Metrics Strip (Always visible or in all tab) */}
      {(dashboardTab === 'all' || dashboardTab === 'cartAbandonment' || dashboardTab === 'repeatOrders') && (
        <StoreActivityMetrics metrics={metrics} />
      )}

      {/* 2. Cart Abandonment Section */}
      {(dashboardTab === 'all' || dashboardTab === 'cartAbandonment') && (
        <CartAbandonmentSection data={cartAbandonment} />
      )}

      {/* 3. Repeat Order Section */}
      {(dashboardTab === 'all' || dashboardTab === 'repeatOrders') && (
        <RepeatOrderSection data={repeatOrders} />
      )}

      {/* 4. EPC Directory & Behavioral Profile Manager */}
      {(dashboardTab === 'all' || dashboardTab === 'epcDirectory') && (
        <EpcDirectorySection
          epcs={epcDirectory}
          onSelectEpc={handleOpenEpcProfile}
          searchQuery={filters.search}
        />
      )}

      {/* 5. EPC Profile Drawer (Slide-Over Editor) */}
      <EpcProfileDrawer
        isOpen={drawerOpen}
        onClose={handleCloseEpcProfile}
        epcId={selectedEpcId}
        bdeList={bdeList}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}

