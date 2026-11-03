/**
 * EpcAnalyticsDashboard.jsx
 * Admin EPC Store Behavior Analytics & EPC Profile Management Dashboard
 * Route: /admin-panel/epc-analytics
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    district: 'all',
    kitType: 'all',
    orderType: 'all',
    customerType: 'all',
    search: '',
    industryType: 'all',
    category: 'all',
    subCategory: 'all',
    systemType: 'all',
    projectRange: 'all',
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
  const [districts, setDistricts] = useState([]);
  const [stateDistrictsMap, setStateDistrictsMap] = useState({});
  const [kitTypes, setKitTypes] = useState([]);

  // Hierarchy for Quick Filters
  const [hierarchy, setHierarchy] = useState(null);

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
      district: 'all',
      kitType: 'all',
      orderType: 'all',
      customerType: 'all',
      search: '',
      industryType: 'all',
      category: 'all',
      subCategory: 'all',
      systemType: 'all',
      projectRange: 'all',
    });
  };

  const clearQuickFilters = () => {
    setFilters((prev) => ({
      ...prev,
      industryType: 'all',
      category: 'all',
      subCategory: 'all',
      systemType: 'all',
      projectRange: 'all',
    }));
  };

  // Load Quick Filters Shop Hierarchy on mount
  useEffect(() => {
    epcAnalyticsApi.getHierarchyOptions().then((res) => {
      if (res) {
        setHierarchy(res);
      }
    });
  }, []);

  // ─── Cascading 5 Quick Filter Options ─────────────────────────────────────
  const shopHierarchy = useMemo(() => hierarchy?.shopHierarchy || [], [hierarchy]);

  // 1. Industry Type Options
  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (shopHierarchy && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        const id = ind.id || ind._id;
        const name = ind.name;
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ value: String(id), text: name });
        }
      });
    } else if (hierarchy?.industries && hierarchy.industries.length > 0) {
      hierarchy.industries.forEach((ind) => {
        const id = ind._id || ind.id;
        const name = ind.name;
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ value: String(id), text: name });
        }
      });
    }
    return [{ value: 'all', text: 'All Industry Types' }, ...list];
  }, [shopHierarchy, hierarchy]);

  // 2. Category Options (cascading from Industry Type)
  const categoryOptions = useMemo(() => {
    if (!filters.industryType || filters.industryType === 'all') {
      return [{ value: 'all', text: 'All Categories' }];
    }
    const catMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          String(ind.id || ind._id) === String(filters.industryType) ||
          ind.name?.toLowerCase() === filters.industryType.toLowerCase()
      );
      if (selectedInd && selectedInd.categories) {
        selectedInd.categories.forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), {
              value: String(cat.id || cat._id),
              text: cat.name,
            });
          }
        });
      }
    } else if (hierarchy?.categories && hierarchy.categories.length > 0) {
      hierarchy.categories.forEach((cat) => {
        if (
          String(cat.industry_type_id) === String(filters.industryType) &&
          cat.name &&
          !catMap.has(cat.name.toLowerCase())
        ) {
          catMap.set(cat.name.toLowerCase(), {
            value: String(cat._id || cat.id),
            text: cat.name,
          });
        }
      });
    }
    return [{ value: 'all', text: 'All Categories' }, ...Array.from(catMap.values())];
  }, [shopHierarchy, hierarchy, filters.industryType]);

  // 3. Sub Category Options (cascading from Category)
  const subCategoryOptions = useMemo(() => {
    if (
      !filters.industryType ||
      filters.industryType === 'all' ||
      !filters.category ||
      filters.category === 'all'
    ) {
      return [{ value: 'all', text: 'All Sub-Categories' }];
    }
    const subsMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          String(ind.id || ind._id) === String(filters.industryType) ||
          ind.name?.toLowerCase() === filters.industryType.toLowerCase()
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            String(cat.id || cat._id) === String(filters.category) ||
            cat.name?.toLowerCase() === filters.category.toLowerCase()
        );
        if (selectedCat && selectedCat.subcategories) {
          selectedCat.subcategories.forEach((sub) => {
            if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
              subsMap.set(sub.name.toLowerCase(), {
                value: String(sub.id || sub._id),
                text: sub.name,
              });
            }
          });
        }
      }
    } else if (hierarchy?.subcategories && hierarchy.subcategories.length > 0) {
      hierarchy.subcategories.forEach((sub) => {
        if (
          String(sub.category) === String(filters.category) &&
          sub.name &&
          !subsMap.has(sub.name.toLowerCase())
        ) {
          subsMap.set(sub.name.toLowerCase(), {
            value: String(sub._id || sub.id),
            text: sub.name,
          });
        }
      });
    }
    return [{ value: 'all', text: 'All Sub-Categories' }, ...Array.from(subsMap.values())];
  }, [shopHierarchy, hierarchy, filters.industryType, filters.category]);

  // 4. System Type Options (cascading from Sub Category)
  const systemTypeOptions = useMemo(() => {
    if (
      !filters.category ||
      filters.category === 'all' ||
      !filters.subCategory ||
      filters.subCategory === 'all'
    ) {
      return [{ value: 'all', text: 'All System Types' }];
    }
    const typesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          String(ind.id || ind._id) === String(filters.industryType) ||
          ind.name?.toLowerCase() === filters.industryType.toLowerCase()
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            String(cat.id || cat._id) === String(filters.category) ||
            cat.name?.toLowerCase() === filters.category.toLowerCase()
        );
        if (selectedCat && selectedCat.subcategories) {
          const selectedSub = selectedCat.subcategories.find(
            (sub) =>
              String(sub.id || sub._id) === String(filters.subCategory) ||
              sub.name?.toLowerCase() === filters.subCategory.toLowerCase()
          );
          if (selectedSub && selectedSub.mappedTypes) {
            selectedSub.mappedTypes.forEach((mt) => {
              if (mt.name && !typesMap.has(mt.name.toLowerCase())) {
                typesMap.set(mt.name.toLowerCase(), {
                  value: String(mt.type_id || mt.id || mt._id),
                  text: mt.name,
                });
              }
            });
          }
        }
      }
    } else if (hierarchy?.types && hierarchy.types.length > 0) {
      hierarchy.types.forEach((t) => {
        if (t.name && !typesMap.has(t.name.toLowerCase())) {
          typesMap.set(t.name.toLowerCase(), {
            value: String(t._id || t.id),
            text: t.name,
          });
        }
      });
    }
    return [{ value: 'all', text: 'All System Types' }, ...Array.from(typesMap.values())];
  }, [shopHierarchy, hierarchy, filters.industryType, filters.category, filters.subCategory]);

  // 5. Project Range Options
  const projectRangeOptions = useMemo(() => {
    if (
      !filters.subCategory ||
      filters.subCategory === 'all' ||
      !filters.systemType ||
      filters.systemType === 'all'
    ) {
      return [{ value: 'all', text: 'All Project Ranges' }];
    }
    const rangesMap = new Map();
    if (shopHierarchy && shopHierarchy.length > 0) {
      const selectedInd = shopHierarchy.find(
        (ind) =>
          String(ind.id || ind._id) === String(filters.industryType) ||
          ind.name?.toLowerCase() === filters.industryType.toLowerCase()
      );
      if (selectedInd && selectedInd.categories) {
        const selectedCat = selectedInd.categories.find(
          (cat) =>
            String(cat.id || cat._id) === String(filters.category) ||
            cat.name?.toLowerCase() === filters.category.toLowerCase()
        );
        if (selectedCat && selectedCat.subcategories) {
          const selectedSub = selectedCat.subcategories.find(
            (sub) =>
              String(sub.id || sub._id) === String(filters.subCategory) ||
              sub.name?.toLowerCase() === filters.subCategory.toLowerCase()
          );
          if (selectedSub && selectedSub.mappedTypes) {
            const selectedMt = selectedSub.mappedTypes.find(
              (mt) =>
                String(mt.type_id || mt.id) === String(filters.systemType) ||
                mt.name?.toLowerCase() === filters.systemType.toLowerCase()
            );
            if (selectedMt && selectedMt.ranges) {
              selectedMt.ranges.forEach((r) => {
                const label = r.range_label || `${r.min_value} - ${r.max_value} kW`;
                if (!rangesMap.has(label)) {
                  rangesMap.set(label, {
                    value: String(r.id || r._id),
                    text: label,
                  });
                }
              });
            }
          }
        }
      }
    } else if (hierarchy?.ranges && hierarchy.ranges.length > 0) {
      hierarchy.ranges.forEach((r) => {
        const label = `${r.min_value} - ${r.max_value} kW`;
        if (!rangesMap.has(label)) {
          rangesMap.set(label, {
            value: String(r._id || r.id),
            text: label,
          });
        }
      });
    }
    return [{ value: 'all', text: 'All Project Ranges' }, ...Array.from(rangesMap.values())];
  }, [shopHierarchy, hierarchy, filters.industryType, filters.category, filters.subCategory, filters.systemType]);

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
        setDistricts(data.districts || []);
        setStateDistrictsMap(data.stateDistrictsMap || {});
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
            Commercial Analytics & CRM
          </span>
          <h1 className="text-2xl font-black text-text mt-0.5">EPC Store Behavior Analytics</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time platform activity metrics, cart drop-off ratios, repeat purchasing cadence, and EPC behavioral control.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle font-bold text-xs text-text transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <FiRefreshCw className={loading ? 'animate-spin text-primary' : ''} size={14} />
          <span>{loading ? 'Refreshing Telemetry...' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-200 text-rose-700 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="font-bold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top-Level Navigation Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs overflow-x-auto">
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

      {/* Global Filter Bar (Behavior Filters + Quick Filters) */}
      <EpcFilterPanel
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        clearQuickFilters={clearQuickFilters}
        states={states}
        districts={districts}
        stateDistrictsMap={stateDistrictsMap}
        kitTypes={kitTypes}
        industryTypeOptions={industryTypeOptions}
        categoryOptions={categoryOptions}
        subCategoryOptions={subCategoryOptions}
        systemTypeOptions={systemTypeOptions}
        projectRangeOptions={projectRangeOptions}
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
        dateRange={filters.dateRange}
        bdeList={bdeList}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}
