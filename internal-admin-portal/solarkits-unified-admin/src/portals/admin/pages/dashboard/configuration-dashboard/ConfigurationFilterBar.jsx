/**
 * ConfigurationFilterBar.jsx
 *
 * Interactive Filter Controls for Configuration Dashboard:
 * - State and District Selectors
 * - Real-time Search Input
 * - Domain Category Filter Pills
 * - "Regional Only" Toggle
 * - Clear & Reset Button
 */

import React from 'react';
import { FiSearch, FiX, FiFilter, FiMapPin, FiRotateCcw, FiLayers } from 'react-icons/fi';
import { MdLocationOn, MdTune } from 'react-icons/md';

export default function ConfigurationFilterBar({
  selectedState,
  setSelectedState,
  selectedDistrict,
  setSelectedDistrict,
  states,
  districts,
  loadingGeo,
  loadingDistricts,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  isRegionalOnly,
  setIsRegionalOnly,
  resetFilters,
  totalResults,
}) {
  const hasActiveFilters = Boolean(
    selectedState || selectedDistrict || searchQuery.trim() || selectedCategory !== 'all' || isRegionalOnly
  );

  return (
    <div className="card p-4 sm:p-5 space-y-4 bg-card border border-border/70 shadow-sm rounded-2xl">
      {/* ── Top Row: Geolocation & Search ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* State Selector */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1">
            <MdLocationOn className="text-primary" size={14} />
            <span>Filter by State</span>
          </label>
          <div className="relative">
            <select
              value={selectedState?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setSelectedState(null);
                } else {
                  const found = states.find(s => String(s.id) === String(val));
                  setSelectedState(found || null);
                }
              }}
              disabled={loadingGeo}
              className="w-full h-10 px-3 pr-8 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50"
            >
              <option value="">All States across India</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* District Selector */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1">
            <FiMapPin className="text-primary" size={13} />
            <span>Filter by District</span>
          </label>
          <div className="relative">
            <select
              value={selectedDistrict?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setSelectedDistrict(null);
                } else {
                  const found = districts.find(d => String(d.id) === String(val));
                  setSelectedDistrict(found || null);
                }
              }}
              disabled={!selectedState || loadingDistricts}
              className="w-full h-10 px-3 pr-8 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedState ? 'Select a state first' : loadingDistricts ? 'Loading districts...' : 'All Districts'}
              </option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1">
            <FiSearch className="text-primary" size={13} />
            <span>Search Configurations</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by module name, keyword, action..."
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-border bg-bg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded-full"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Regional Only Toggle & Reset */}
        <div className="md:col-span-2 flex items-end gap-2 h-full pt-6 md:pt-0">
          <button
            onClick={() => setIsRegionalOnly(!isRegionalOnly)}
            className={`flex-1 h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              isRegionalOnly
                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25'
                : 'bg-bg text-text-secondary border-border hover:border-primary/40 hover:text-primary'
            }`}
            title="Filter modules that have state or district dependencies"
          >
            <MdTune size={14} />
            <span>Regional Only</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="h-10 px-3 rounded-xl border border-danger/30 text-danger hover:bg-danger-soft text-xs font-semibold flex items-center justify-center gap-1 transition-colors shrink-0"
              title="Reset all filters"
            >
              <FiRotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Category Filter Pills ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-2 border-t border-border/50">
        <span className="text-xs font-semibold text-text-muted shrink-0 flex items-center gap-1 mr-1">
          <FiLayers size={13} /> Domain:
        </span>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-white shadow-sm font-semibold shadow-primary/20'
                  : 'bg-bg text-text-secondary border border-border/80 hover:border-primary/40 hover:text-text-primary'
              }`}
            >
              {cat.label}
            </button>
          );
        })}

        <div className="ml-auto text-xs text-text-muted shrink-0 font-medium pl-2">
          Showing <span className="font-bold text-text-primary">{totalResults}</span> modules
        </div>
      </div>
    </div>
  );
}
