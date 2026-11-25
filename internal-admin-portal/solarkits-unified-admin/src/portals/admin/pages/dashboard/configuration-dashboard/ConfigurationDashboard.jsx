/**
 * ConfigurationDashboard.jsx
 *
 * Master Configuration Dashboard for the entire SolarKits & SolarShop ecosystem.
 * Provides unified, searchable, clickable access to all configuration modules
 * with dynamic State & District filtering and regional context.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiRefreshCw, FiSliders, FiCheckCircle } from 'react-icons/fi';
import { MdTune } from 'react-icons/md';

import { useConfigurationData } from './useConfigurationData';
import ConfigurationSummaryKpis from './ConfigurationSummaryKpis';
import ConfigurationFilterBar from './ConfigurationFilterBar';
import RegionalContextCard from './RegionalContextCard';
import ConfigurationCardGrid from './ConfigurationCardGrid';

export default function ConfigurationDashboard() {
  const {
    selectedState,
    setSelectedState,
    selectedDistrict,
    setSelectedDistrict,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isRegionalOnly,
    setIsRegionalOnly,
    resetFilters,
    states,
    districts,
    loadingGeo,
    loadingDistricts,
    modules,
    categories,
    regionalStats,
    kpiStats,
    fetchStates,
  } = useConfigurationData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStates();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
              <MdTune className="text-primary" size={26} />
              <span>Configuration Dashboard</span>
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              <FiCheckCircle size={11} /> Project Hub
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            Centralized management hub for SolarKits, SolarShop, BDE Onboarding, Operations, Logistics & System Rules.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-sm text-text-secondary hover:text-primary hover:border-primary/40 bg-card transition-colors ${
              isRefreshing ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <FiRefreshCw size={13} className={isRefreshing ? 'animate-spin text-primary' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ─────────────────────────────────────────────── */}
      <ConfigurationSummaryKpis
        stats={kpiStats}
        onSelectCategory={(catId) => setSelectedCategory(catId)}
        onToggleRegional={() => setIsRegionalOnly(prev => !prev)}
      />

      {/* ── Interactive Filter Bar (State, District, Search, Category) ───── */}
      <ConfigurationFilterBar
        selectedState={selectedState}
        setSelectedState={setSelectedState}
        selectedDistrict={selectedDistrict}
        setSelectedDistrict={setSelectedDistrict}
        states={states}
        districts={districts}
        loadingGeo={loadingGeo}
        loadingDistricts={loadingDistricts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        isRegionalOnly={isRegionalOnly}
        setIsRegionalOnly={setIsRegionalOnly}
        resetFilters={resetFilters}
        totalResults={modules.length}
      />

      {/* ── Regional Context Card (when State or District selected) ──────── */}
      <RegionalContextCard
        selectedState={selectedState}
        selectedDistrict={selectedDistrict}
        regionalStats={regionalStats}
        onClearRegion={() => {
          setSelectedState(null);
          setSelectedDistrict(null);
        }}
      />

      {/* ── Configuration Modules Grid ────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>Configuration Modules</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-border text-text-secondary">
              {modules.length}
            </span>
          </h3>

          {selectedState && (
            <span className="text-xs text-primary font-medium">
              Highlighted modules affect {selectedDistrict ? selectedDistrict.name : selectedState.name}
            </span>
          )}
        </div>

        <ConfigurationCardGrid
          modules={modules}
          selectedState={selectedState}
          selectedDistrict={selectedDistrict}
          searchQuery={searchQuery}
        />
      </section>
    </div>
  );
}
