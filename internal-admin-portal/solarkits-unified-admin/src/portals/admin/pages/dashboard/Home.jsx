/**
 * Home.jsx
 * SOLARKITS Main Admin Dashboard — Consolidated Executive Management Panel
 * Route: /admin-panel/home
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiLayers, FiAlertCircle, FiDownload, FiRefreshCw } from 'react-icons/fi';

import DashboardFilters from './main-dashboard/DashboardFilters';
import DashboardKpiCard from './main-dashboard/DashboardKpiCard';
import DashboardSectionNav from './main-dashboard/DashboardSectionNav';
import DashboardWebsiteSection from './main-dashboard/DashboardWebsiteSection';
import DashboardEnquirySection from './main-dashboard/DashboardEnquirySection';
import DashboardEpcSection from './main-dashboard/DashboardEpcSection';
import DashboardPipelineSection from './main-dashboard/DashboardPipelineSection';
import DashboardConversionSection from './main-dashboard/DashboardConversionSection';
import DashboardDemandSection from './main-dashboard/DashboardDemandSection';
import DashboardMapSection from './main-dashboard/DashboardMapSection';
import DashboardClusterMapSection from './main-dashboard/DashboardClusterMapSection';
import DashboardRevenueSection from './main-dashboard/DashboardRevenueSection';
import DashboardCampaignSection from './main-dashboard/DashboardCampaignSection';
import DashboardDrilldownDrawer from './main-dashboard/DashboardDrilldownDrawer';

import { mainDashboardApi } from '../../api/mainDashboardApi';

export default function Home() {
  // Global Filter State
  const [filters, setFilters] = useState({
    dateRange: 'last_30_days',
    startDate: '',
    endDate: '',
    state: 'all',
    district: 'all',
    epcStatus: 'all',
    kitType: 'all',
    kitCapacity: 'all',
    salesSource: 'all',
    orderStatus: 'all',
    campaignId: 'all',
  });

  // Data States
  const [bootstrapData, setBootstrapData] = useState({});
  const [overviewKpis, setOverviewKpis] = useState([]);
  const [websiteData, setWebsiteData] = useState({});
  const [enquiryData, setEnquiryData] = useState({});
  const [epcData, setEpcData] = useState({});
  const [pipelineData, setPipelineData] = useState({});
  const [conversionData, setConversionData] = useState({});
  const [demandData, setDemandData] = useState({});
  const [geographyData, setGeographyData] = useState([]);
  const [clusterGeographyData, setClusterGeographyData] = useState({});
  const [revenueData, setRevenueData] = useState({});
  const [campaignData, setCampaignData] = useState({});

  // Loading & Metadata States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(0); // 0 = off, 30, 60, 300 seconds
  const [activeSection, setActiveSection] = useState('section-overview');

  // In-Page Drill-Down Drawer State
  const [drawerConfig, setDrawerConfig] = useState({
    isOpen: false,
    section: 'enquiries',
    kpiId: null,
    title: 'Detailed Records',
  });

  const timerRef = useRef(null);

  // Filter change handler
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      dateRange: 'last_30_days',
      startDate: '',
      endDate: '',
      state: 'all',
      district: 'all',
      epcStatus: 'all',
      kitType: 'all',
      kitCapacity: 'all',
      salesSource: 'all',
      orderStatus: 'all',
      campaignId: 'all',
    });
  };

  // Fetch all dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        kpisRes,
        webRes,
        enqRes,
        epcRes,
        pipeRes,
        convRes,
        demRes,
        geoRes,
        clusterGeoRes,
        revRes,
        campRes,
      ] = await Promise.all([
        mainDashboardApi.getOverviewKpis(filters),
        mainDashboardApi.getWebsitePerformance(filters),
        mainDashboardApi.getEnquiryFunnel(filters),
        mainDashboardApi.getEpcNetwork(filters),
        mainDashboardApi.getSalesPipeline(filters),
        mainDashboardApi.getConversionAnalytics(filters),
        mainDashboardApi.getKitDemand(filters),
        mainDashboardApi.getGeographyAnalytics(filters),
        mainDashboardApi.getClusterGeographyAnalytics(filters),
        mainDashboardApi.getRevenueMargin(filters),
        mainDashboardApi.getCampaignPerformance(filters),
      ]);

      if (kpisRes?.success) setOverviewKpis(kpisRes.data || []);
      if (webRes?.success) setWebsiteData(webRes.data || {});
      if (enqRes?.success) setEnquiryData(enqRes.data || {});
      if (epcRes?.success) setEpcData(epcRes.data || {});
      if (pipeRes?.success) setPipelineData(pipeRes.data || {});
      if (convRes?.success) setConversionData(convRes.data || {});
      if (demRes?.success) setDemandData(demRes.data || {});
      if (geoRes?.success) setGeographyData(geoRes.data || []);
      if (clusterGeoRes?.success) setClusterGeographyData(clusterGeoRes || {});
      if (revRes?.success) setRevenueData(revRes.data || {});
      if (campRes?.success) setCampaignData(campRes.data || {});

      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('[MainDashboard] Load error:', err);
      setError(err.message || 'Failed to load dashboard data. Check database connections.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load bootstrap filter masters on mount
  useEffect(() => {
    mainDashboardApi
      .getBootstrap()
      .then((res) => {
        if (res?.success) setBootstrapData(res.data || {});
      })
      .catch((err) => console.warn('Bootstrap masters error:', err));
  }, []);

  // Reload data when filters change
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle auto-refresh interval timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh > 0) {
      timerRef.current = setInterval(() => {
        loadDashboardData();
      }, autoRefresh * 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, loadDashboardData]);

  // Open drill-down drawer
  const handleOpenDrillDown = (sectionKey, title, kpiId = null) => {
    setDrawerConfig({
      isOpen: true,
      section: sectionKey || 'enquiries',
      kpiId: kpiId || null,
      title: title || 'Detailed Records',
    });
  };

  // Export full dashboard summary to CSV
  const handleExportDashboard = () => {
    if (!overviewKpis || overviewKpis.length === 0) return;
    const csvContent = [
      'KPI Title,Current Value,Previous Value,Change %,Trend',
      ...overviewKpis.map(
        (k) => `"${k.title}","${k.current}","${k.previous}","${k.pct}%","${k.trend}"`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SOLARKITS_Main_Admin_Dashboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto pb-16">
      {/* Top Welcome & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary dark:text-text-primary-dark tracking-tight">
            Main Admin Dashboard
          </h1>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            Consolidated enterprise monitoring: Traffic, enquiries, EPC network, sales pipeline, conversion, kit demand, geography & revenue
          </p>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="px-3 py-1 font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Global Common Filters Bar */}
      <DashboardFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        onRefresh={loadDashboardData}
        loading={loading}
        lastUpdated={lastUpdated}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        bootstrapData={bootstrapData}
        onExport={handleExportDashboard}
      />

      {/* 2. Overview: 14 KPI Cards Grid */}
      <div id="section-overview" className="scroll-mt-20 mb-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-text-secondary-dark flex items-center gap-1.5">
            <FiLayers className="w-3.5 h-3.5 text-primary" /> Key Performance Indicators (Overview)
          </h2>
          <span className="text-[11px] text-text-secondary">Click any card to drill down</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {overviewKpis.map((card) => (
            <DashboardKpiCard
              key={card.id}
              card={card}
              onDrillDown={handleOpenDrillDown}
            />
          ))}
        </div>
      </div>

      {/* Sticky Internal Section Navigation Bar */}
      <DashboardSectionNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      {/* 3. Website Performance */}
      <DashboardWebsiteSection
        data={websiteData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* 4. Enquiry Funnel */}
      <DashboardEnquirySection
        data={enquiryData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* 5. EPC Network */}
      <DashboardEpcSection
        data={epcData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* 6. Sales Pipeline */}
      <DashboardPipelineSection
        data={pipelineData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* 7. Conversion Analytics (with Formula Verification Inspector) */}
      <DashboardConversionSection
        data={conversionData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* 8. Kit Potential & Demand */}
      <DashboardDemandSection
        data={demandData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* 9. Geography Analytics & Interactive India Map */}
      <DashboardMapSection
        data={geographyData}
        onDrillDown={handleOpenDrillDown}
        onExport={handleExportDashboard}
      />

      {/* 9B. Franchise Cluster Geography Analytics & Interactive Map */}
      <DashboardClusterMapSection
        data={clusterGeographyData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* 10. Revenue & Margin */}
      <DashboardRevenueSection
        data={revenueData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* 11. Campaign Performance */}
      <DashboardCampaignSection
        data={campaignData}
        onDrillDown={handleOpenDrillDown}
      />

      {/* In-Page Drill-Down Drawer */}
      <DashboardDrilldownDrawer
        isOpen={drawerConfig.isOpen}
        onClose={() => setDrawerConfig((prev) => ({ ...prev, isOpen: false, kpiId: null }))}
        section={drawerConfig.section}
        kpiId={drawerConfig.kpiId}
        title={drawerConfig.title}
        filters={filters}
      />
    </div>
  );
}
