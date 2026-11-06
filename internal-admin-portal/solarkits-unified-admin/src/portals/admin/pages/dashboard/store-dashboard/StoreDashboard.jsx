/**
 * StoreDashboard.jsx
 * Admin Store Dashboard — Sales, Revenue & Market Analytics
 * Complete business intelligence view of the SOLARKITS e-commerce store and kit sales.
 */

import React, { useState } from 'react';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

import { useStoreData } from './useStoreData';
import StoreFilterPanel from './StoreFilterPanel';
import RevenueProfitAnalytics from './RevenueProfitAnalytics';
import BestSellingAreaSection from './BestSellingAreaSection';
import AreaPotentialSection from './AreaPotentialSection';
import FranchiseeStoreAnalytics from './FranchiseeStoreAnalytics';
import SolarEpcAnalytics from './SolarEpcAnalytics';
import QuotesPoConversionSection from './QuotesPoConversionSection';
import CustomerBehaviorSection from './CustomerBehaviorSection';
import StoreDetailDrawer from './StoreDetailDrawer';

export default function StoreDashboard() {
  const {
    filters,
    setFilter,
    resetFilters,
    loading,
    error,
    refetch,

    activeRankType,
    setActiveRankType,

    epcActiveDaysWindow,
    setEpcActiveDaysWindow,

    financialMetrics,
    bestSellingByArea,
    areaPotentialData,
    franchiseeAnalytics,
    solarEpcAnalytics,
    conversionFunnel,
    customerBehavior,
    recentOrders,

    states,
    districts,
    kits,
    bdeList,
  } = useStoreData();

  // Drawer state for drill-downs (Section 2.J)
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    title: '',
    kpiType: '',
    data: null,
    extra: null,
  });

  const handleOpenDrawer = (kpiType, data, title, extra = null) => {
    setDrawerState({
      isOpen: true,
      title: title || `Drill-Down: ${kpiType}`,
      kpiType,
      data,
      extra,
    });
  };

  const handleCloseDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  // CSV Export utility
  const handleExportCsv = () => {
    const records = areaPotentialData.areas || [];
    if (!records.length) return;

    const headers = ['Area', 'Kits Sold', 'kW Sold', 'Revenue', 'Active EPCs', 'Franchisees', 'Potential Revenue', 'Opportunity Gap'];
    const rows = records.map((r) => [
      `"${r.area}"`,
      r.kitsSold,
      `"${r.kwSold}"`,
      `"${r.revenue}"`,
      r.activeEpcs,
      r.franchisees,
      `"${r.potentialRevenue}"`,
      `"${r.opportunityGap}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `store_market_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">SOLARKITS Commercial Intelligence</span>
          <h1 className="text-xl sm:text-2xl font-black text-text">Store & Market Analytics Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Analyze sales revenue, profit margin rankings, franchisee & EPC throughput, demand potential & customer retention
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface border border-border text-text hover:bg-surface-subtle shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={loading ? 'animate-spin text-primary' : 'text-primary'} />
            <span>{loading ? 'Refreshing...' : 'Live Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-danger/10 border border-danger/20 text-xs text-danger">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="px-3 py-1 rounded-xl bg-danger text-white font-semibold hover:bg-danger-hover cursor-pointer text-xs"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Section B: Global Store Filters */}
      <StoreFilterPanel
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        states={states}
        districts={districts}
        kits={kits}
        bdeList={bdeList}
        onExportCsv={handleExportCsv}
      />

      {/* Section C: Revenue, Profit & Kit Sales Analytics */}
      <RevenueProfitAnalytics
        financialData={financialMetrics}
        activeRankType={activeRankType}
        setActiveRankType={setActiveRankType}
        onSelectKit={(kit) => handleOpenDrawer('Kit Sales & Margin', kit, `Kit Audit: ${kit.kit}`)}
      />

      {/* Section D: Best-Selling Kits by Area */}
      <BestSellingAreaSection
        bestSellingData={bestSellingByArea}
        onSelectArea={(area) => handleOpenDrawer('Territory Orders', area, `Area Sales: ${area.district}, ${area.state}`)}
      />

      {/* Section E: Area Business Potential & Revenue Opportunity Gap */}
      <AreaPotentialSection
        areaPotentialData={areaPotentialData}
        onSelectAreaPotential={(p) => handleOpenDrawer('Area Potential Gap', p, `Opportunity Gap: ${p.area}`)}
      />

      {/* Section F: Franchisee Store Analytics */}
      <FranchiseeStoreAnalytics
        franchiseeData={franchiseeAnalytics}
        onSelectFranchisee={(f) => handleOpenDrawer('Franchisee Store Profile', f, `Store: ${f.name}`)}
      />

      {/* Section G: Solar EPC Analytics */}
      <SolarEpcAnalytics
        epcData={solarEpcAnalytics}
        epcActiveDaysWindow={epcActiveDaysWindow}
        setEpcActiveDaysWindow={setEpcActiveDaysWindow}
        onSelectEpc={(epc, epcList) =>
          handleOpenDrawer(
            'Solar EPC Account Activity',
            epc,
            `EPC Buying Analytics: ${epc.name}`,
            { epcList: epcList || solarEpcAnalytics?.epcPerformance || [] }
          )
        }
      />

      {/* Section H: EPC Quotes, PO Raised & Conversion Ratio */}
      <QuotesPoConversionSection
        conversionData={conversionFunnel}
        onSelectConversionRow={(row) => handleOpenDrawer('Conversion Funnel', row, 'Conversion Pipeline')}
      />

      {/* Section I: Customer Store Behavior Analytics */}
      <CustomerBehaviorSection
        behaviorData={customerBehavior}
      />

      {/* Section J: Master Drill-Down Slide-Over Drawer */}
      <StoreDetailDrawer
        isOpen={drawerState.isOpen}
        onClose={handleCloseDrawer}
        title={drawerState.title}
        kpiType={drawerState.kpiType}
        data={drawerState.data}
        extra={drawerState.extra}
        recentOrders={recentOrders}
      />
    </div>
  );
}

