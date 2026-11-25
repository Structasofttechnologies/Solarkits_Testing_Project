/**
 * VisionDashboard.jsx
 *
 * Admin Vision Dashboard — India → Cluster → State → District → Franchisee → Warehouse
 *
 * Connected to live backend APIs.
 * Data source: real franchisee/performance/tracker, reseller-mgmt, warehouses, geolocation endpoints.
 * Client-side aggregation is used for kit-level and industry-level sections
 * (dedicated endpoints are planned for the backend phase — see implementation_plan.md).
 *
 * All sections show clear notes where data is derived vs. directly from API.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw, FiWifi, FiAlertCircle } from 'react-icons/fi';

import { useVisionData } from './useVisionData';
import VisionFilterPanel from './VisionFilterPanel';
import KpiCards from './KpiCards';
import ExpansionBreadcrumbs from './ExpansionBreadcrumbs';
import LocationDrillDown from './LocationDrillDown';
import FranchiseeGoalAchievement from './FranchiseeGoalAchievement';
import KitSalesAdoption from './KitSalesAdoption';
import IndustryProjectAdoption from './IndustryProjectAdoption';
import WarehouseShopCoverage from './WarehouseShopCoverage';
import EpcTypeBifurcation from './EpcTypeBifurcation';
import DetailDrawer from './DetailDrawer';

// ── Section wrapper with heading ─────────────────────────────────────────────

function DashSection({ id, children }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {children}
    </motion.section>
  );
}

// ── Error Banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 bg-danger-soft border border-danger/20 rounded-xl px-4 py-3 text-sm text-danger">
      <FiAlertCircle size={16} className="shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry}
          className="text-xs underline hover:text-danger-hover transition-colors shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function DashSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...Array(11)].map((_, i) => (
          <div key={i} className="h-28 bg-border rounded-xl" />
        ))}
      </div>
      <div className="h-12 bg-border rounded-xl" />
      <div className="h-64 bg-border rounded-xl" />
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function VisionDashboard() {
  // ── All data, filters, and drill-down state from master hook
  const {
    filters, setFilter, period, setPeriod, resetFilters, activeFilterChips,
    drillLevel, drillPath, drillInto, drillBackTo,
    networkSummary, performanceTracker, locationPerformance,
    franchiseeList, warehouses, industryTypes, allStates, allDistricts,
    projectCategories, projectSubcategories, systemTypes, projectRanges,
    kits,
    epcTypes, epcTypesSummary,
    kpiData,
    loading, errors,
    refetch,
  } = useVisionData();

  // ── Detail drawer state
  const [drawer, setDrawer] = useState({ open: false, type: null, item: null });
  const openDrawer = useCallback((type, item) => setDrawer({ open: true, type, item }), []);
  const closeDrawer = useCallback(() => setDrawer(d => ({ ...d, open: false })), []);

  // ── View detail handler (from drill-down table)
  const handleViewDetail = useCallback((item) => {
    const type = drillLevel === 'franchisee' || drillLevel === 'district' ? 'franchisee' : 'warehouse';
    openDrawer(type, item);
  }, [drillLevel, openDrawer]);

  const isInitialLoading = loading.summary && !networkSummary;
  const hasErrors = Object.values(errors).filter(Boolean).length > 0;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-text-primary">Vision Dashboard</h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-success bg-success-soft px-2.5 py-1 rounded-full border border-success/20">
              <FiWifi size={10} /> Live Data
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            Expansion network overview · India → Cluster → State → District → Franchisee → Warehouse
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-text-muted bg-surface-hover border border-border px-2 py-0.5 rounded-full">
              Stage: EPC Ecosystem Live
            </span>
            <span className="text-[11px] text-text-muted bg-surface-hover border border-border px-2 py-0.5 rounded-full">
              EPC Types Bifurcation Active
            </span>
          </div>
        </div>

        {/* Refresh all */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-muted">
            {currentMonth} {currentYear}
          </span>
          <button
            onClick={() => {
              refetch.summary();
              refetch.performance();
              refetch.franchisees();
              refetch.warehouses();
              refetch.epcTypes?.();
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-text-secondary
              hover:text-primary hover:border-primary/40 transition-colors
              ${(loading.summary || loading.performance || loading.epcTypes) ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <FiRefreshCw size={13} className={loading.summary || loading.performance || loading.epcTypes ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error Banners ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {errors.summary && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <ErrorBanner message={`Network summary: ${errors.summary}`} onRetry={refetch.summary} />
          </motion.div>
        )}
        {errors.performance && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <ErrorBanner message={`Performance data: ${errors.performance}`} onRetry={refetch.performance} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter Panel ─────────────────────────────────────────────────── */}
      <DashSection id="vision-filters">
        <VisionFilterPanel
          filters={filters}
          setFilter={setFilter}
          period={period}
          setPeriod={setPeriod}
          resetFilters={resetFilters}
          activeFilterChips={activeFilterChips}
          industryTypes={industryTypes}
          allStates={allStates}
          allDistricts={allDistricts}
          projectCategories={projectCategories}
          projectSubcategories={projectSubcategories}
          systemTypes={systemTypes}
          projectRanges={projectRanges}
          franchiseeList={franchiseeList}
          warehouses={warehouses}
          kits={kits}
          epcTypes={epcTypes}
          loading={loading}
        />
      </DashSection>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      {isInitialLoading ? (
        <DashSkeleton />
      ) : (
        <>
          <DashSection id="vision-kpis">
            <KpiCards
              kpiData={kpiData}
              loading={loading.summary || loading.performance}
            />
          </DashSection>

          {/* ── Drill-Down: Expansion Network ─────────────────────────── */}
          <DashSection id="vision-expansion">
            <div className="card p-4 space-y-4">
              <ExpansionBreadcrumbs
                drillLevel={drillLevel}
                drillPath={drillPath}
                drillBackTo={drillBackTo}
              />
            </div>

            <LocationDrillDown
              drillLevel={drillLevel}
              drillPath={drillPath}
              drillInto={drillInto}
              onViewDetail={handleViewDetail}
              performanceTracker={performanceTracker}
              franchiseeList={franchiseeList}
              allStates={allStates}
              allDistricts={allDistricts}
              warehouses={warehouses}
              loading={loading}
            />
          </DashSection>

          {/* ── Franchisee Goal vs Achievement ─────────────────────────── */}
          <DashSection id="vision-goal-achievement">
            <FranchiseeGoalAchievement
              performanceTracker={performanceTracker}
              loading={loading.performance}
              onViewFranchisee={(f) => openDrawer('franchisee', f)}
            />
          </DashSection>

          {/* ── Kit Sales & Adoption ─────────────────────────────────────── */}
          <DashSection id="vision-kit-adoption">
            <KitSalesAdoption
              performanceTracker={performanceTracker}
              kits={kits}
              loading={loading.performance}
            />
          </DashSection>

          {/* ── Industry / Project Adoption ───────────────────────────── */}
          <DashSection id="vision-industry-adoption">
            <IndustryProjectAdoption
              locationPerformance={locationPerformance}
              performanceTracker={performanceTracker}
              industryTypes={industryTypes}
              allStates={allStates}
              epcTypes={epcTypes}
              loading={loading.performance}
            />
          </DashSection>

          {/* ── Warehouse & Shop Coverage ─────────────────────────────── */}
          <DashSection id="vision-coverage">
            <WarehouseShopCoverage
              warehouses={warehouses}
              franchiseeList={franchiseeList}
              allStates={allStates}
              allDistricts={allDistricts}
              loading={loading.warehouses || loading.franchisees}
            />
          </DashSection>

          {/* ── EPC Type Bifurcation ─────────────────────────────────── */}
          <DashSection id="vision-epc-types">
            <EpcTypeBifurcation
              epcTypes={epcTypes}
              epcTypesSummary={epcTypesSummary}
              loading={loading.epcTypes}
              filters={filters}
              setFilter={setFilter}
              onViewEpcType={(typeItem) => openDrawer('epcType', typeItem)}
            />
          </DashSection>
        </>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      <DetailDrawer
        open={drawer.open}
        onClose={closeDrawer}
        type={drawer.type}
        item={drawer.item}
        allStates={allStates}
        allDistricts={allDistricts}
      />
    </div>
  );
}
