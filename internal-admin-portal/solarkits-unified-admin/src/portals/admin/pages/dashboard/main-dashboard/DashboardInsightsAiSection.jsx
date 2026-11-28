import React, { useState, useMemo } from 'react';
import {
  FiCpu,
  FiTrendingUp,
  FiAward,
  FiTarget,
  FiUsers,
  FiBox,
  FiSend,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiFilter,
  FiExternalLink,
  FiChevronRight,
  FiActivity,
  FiShield,
  FiSearch,
} from 'react-icons/fi';

const formatInr = (num) => `₹${(Number(num) || 0).toLocaleString('en-IN')}`;

export default function DashboardInsightsAiSection({ data = {}, onDrillDown }) {
  const {
    overview = {},
    clusterPotential = [],
    campaignSuggestions = [],
    threeMonthGoals = [],
    kitRankings = {},
  } = data;

  // Active sub-tab state inside the Insights section
  const [activeSubTab, setActiveSubTab] = useState('clusters'); // 'clusters' | 'campaigns' | 'goals' | 'kits'

  // Search queries for individual sub-tabs
  const [clusterSearch, setClusterSearch] = useState('');
  const [clusterStatusFilter, setClusterStatusFilter] = useState('all');
  const [clusterStateFilter, setClusterStateFilter] = useState('all');
  const [minEpcsFilter, setMinEpcsFilter] = useState(''); // Dynamic Min EPCs threshold input tag

  // Kit ranking controls
  const [rankingGeoLevel, setRankingGeoLevel] = useState('cluster'); // 'cluster' | 'state'
  const [rankingType, setRankingType] = useState('active'); // 'active' | 'potential'
  const [selectedGeoFilter, setSelectedGeoFilter] = useState('all');
  const [kitSearch, setKitSearch] = useState('');

  // Distinct cluster states for state filter
  const availableClusterStates = useMemo(() => {
    return Array.from(new Set((clusterPotential || []).map((c) => c.state))).filter(Boolean).sort();
  }, [clusterPotential]);

  // 1. Filtered Cluster Potential rows
  const filteredClusters = useMemo(() => {
    const minThreshold = minEpcsFilter !== '' ? Number(minEpcsFilter) : null;

    return clusterPotential.filter((c) => {
      const q = clusterSearch.toLowerCase();
      const matchesSearch =
        !q ||
        c.cluster.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.franchiseeName.toLowerCase().includes(q);

      const matchesState =
        clusterStateFilter === 'all' ||
        c.state.toLowerCase() === clusterStateFilter.toLowerCase();

      const matchesMinEpcs =
        minThreshold === null ||
        isNaN(minThreshold) ||
        c.registeredEpcs >= minThreshold ||
        c.activeEpcs >= minThreshold ||
        c.misPotential >= minThreshold;

      // If user sets a dynamic threshold (e.g. 10 EPCs) and filters by opportunity,
      // evaluate any unallotted cluster reaching that threshold
      const isOpportunityWithThreshold =
        minThreshold !== null && minThreshold > 0
          ? c.franchiseeAvailability === 'Not Available' && (c.registeredEpcs >= minThreshold || c.misPotential >= minThreshold)
          : c.conditionType === 'NEW_OPPORTUNITY';

      const matchesStatus =
        clusterStatusFilter === 'all' ||
        (clusterStatusFilter === 'available' && c.franchiseeAvailability === 'Available') ||
        (clusterStatusFilter === 'not_available' && c.franchiseeAvailability === 'Not Available') ||
        (clusterStatusFilter === 'opportunity' && isOpportunityWithThreshold) ||
        (clusterStatusFilter === 'campaign' && c.conditionType === 'CAMPAIGN_REQUIRED') ||
        (clusterStatusFilter === 'achieved' && c.conditionType === 'TARGET_ACHIEVED');

      return matchesSearch && matchesState && matchesMinEpcs && matchesStatus;
    });
  }, [clusterPotential, clusterSearch, clusterStatusFilter, clusterStateFilter, minEpcsFilter]);

  // 2. Kit Rankings Geo Options list
  const availableGeoOptions = useMemo(() => {
    if (rankingGeoLevel === 'cluster') {
      const list = Array.from(new Set([
        ...(kitRankings.clusterActive || []).map((k) => k.cluster),
        ...(kitRankings.clusterPotential || []).map((k) => k.cluster),
      ])).filter(Boolean).sort();
      return list;
    }
    const list = Array.from(new Set([
      ...(kitRankings.stateActive || []).map((k) => k.state),
      ...(kitRankings.statePotential || []).map((k) => k.state),
    ])).filter(Boolean).sort();
    return list;
  }, [rankingGeoLevel, kitRankings]);

  // 3. Filtered Kit Ranking rows
  const currentKitList = useMemo(() => {
    let source = [];
    if (rankingGeoLevel === 'cluster') {
      source = rankingType === 'active' ? (kitRankings.clusterActive || []) : (kitRankings.clusterPotential || []);
    } else {
      source = rankingType === 'active' ? (kitRankings.stateActive || []) : (kitRankings.statePotential || []);
    }

    return source.filter((k) => {
      const geoMatch =
        selectedGeoFilter === 'all' ||
        (rankingGeoLevel === 'cluster' ? k.cluster === selectedGeoFilter : k.state === selectedGeoFilter);
      const q = kitSearch.toLowerCase();
      const searchMatch =
        !q ||
        (k.kitName && k.kitName.toLowerCase().includes(q)) ||
        (k.sku && k.sku.toLowerCase().includes(q)) ||
        (k.capacity && k.capacity.toLowerCase().includes(q));

      return geoMatch && searchMatch;
    });
  }, [rankingGeoLevel, rankingType, kitRankings, selectedGeoFilter, kitSearch]);

  return (
    <div
      id="section-insights-ai"
      className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20"
    >
      {/* ── Section Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
            <FiCpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-text-primary dark:text-text-primary-dark tracking-tight">
                Insights & Suggestive AI
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Decision Intelligence
              </span>
            </div>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
              Data-driven potential analysis: Cluster expansion, franchisee targets, META campaigns & kit rankings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-secondary hidden sm:inline">
            Traceable to authentic MIS & order records
          </span>
        </div>
      </div>

      {/* ── SECTION A: Executive Insight Overview Badges ────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {/* KPI 1: New Franchisee Opportunities */}
        <div
          onClick={() => { setActiveSubTab('clusters'); setClusterStatusFilter('opportunity'); }}
          className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl p-3.5 cursor-pointer hover:border-amber-400 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              New Franchisee Opps
            </span>
            <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <FiTarget className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            {overview.newFranchiseeOpportunities ?? 0}
          </div>
          <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium block mt-1">
            Met 50 EPC benchmark; unallotted
          </span>
        </div>

        {/* KPI 2: Franchisees Requiring META Campaigns */}
        <div
          onClick={() => { setActiveSubTab('campaigns'); }}
          className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 rounded-xl p-3.5 cursor-pointer hover:border-indigo-400 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              META Campaigns Needed
            </span>
            <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <FiSend className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
            {overview.franchiseesRequiringCampaigns ?? 0}
          </div>
          <span className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80 font-medium block mt-1">
            Allotted with active EPC target gap
          </span>
        </div>

        {/* KPI 3: Three-Month Active EPC Goals */}
        <div
          onClick={() => { setActiveSubTab('goals'); }}
          className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/40 rounded-xl p-3.5 cursor-pointer hover:border-teal-400 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              3-Month Goals Active
            </span>
            <div className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <FiClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-700 dark:text-teal-400">
            {overview.activeGoalsInProgress ?? 0}
          </div>
          <span className="text-[10px] text-teal-800/80 dark:text-teal-300/80 font-medium block mt-1">
            Quarterly milestone tracking
          </span>
        </div>

        {/* KPI 4: Active Kit Suggestions */}
        <div
          onClick={() => { setActiveSubTab('kits'); setRankingType('active'); }}
          className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3.5 cursor-pointer hover:border-emerald-400 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Active Kits (Sales)
            </span>
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <FiCheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {overview.activeKitsCount ?? 0} Models
          </div>
          <span className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 font-medium block mt-1">
            Proven confirmed order velocity
          </span>
        </div>

        {/* KPI 5: Potential Kit Suggestions */}
        <div
          onClick={() => { setActiveSubTab('kits'); setRankingType('potential'); }}
          className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-800/40 rounded-xl p-3.5 cursor-pointer hover:border-sky-400 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
              Potential Kits (Demand)
            </span>
            <div className="w-5 h-5 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <FiTrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-700 dark:text-sky-400">
            {overview.potentialKitsCount ?? 0} Models
          </div>
          <span className="text-[10px] text-sky-800/80 dark:text-sky-300/80 font-medium block mt-1">
            Recorded quotes & pending demand
          </span>
        </div>
      </div>

      {/* ── Sub-Tab Navigation Bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 dark:border-border-dark/60 pb-3 mb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('clusters')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'clusters'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-bg-light/80 dark:bg-bg-dark text-text-secondary hover:text-text-primary'
            }`}
          >
            <FiLayers className="w-3.5 h-3.5" />
            <span>1. Cluster Potential Analysis</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {clusterPotential.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('campaigns')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'campaigns'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-bg-light/80 dark:bg-bg-dark text-text-secondary hover:text-text-primary'
            }`}
          >
            <FiSend className="w-3.5 h-3.5" />
            <span>2. META Campaign Suggestions</span>
            {campaignSuggestions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {campaignSuggestions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('goals')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'goals'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-bg-light/80 dark:bg-bg-dark text-text-secondary hover:text-text-primary'
            }`}
          >
            <FiClock className="w-3.5 h-3.5" />
            <span>3. Three-Month EPC Goals</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {threeMonthGoals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('kits')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'kits'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-bg-light/80 dark:bg-bg-dark text-text-secondary hover:text-text-primary'
            }`}
          >
            <FiBox className="w-3.5 h-3.5" />
            <span>4. Kit Sales Potential & Rankings</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 1: Cluster & Franchisee Potential Analysis ─────────── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'clusters' && (
        <div>
          {/* Filters & Search Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
              <div className="relative w-full">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-3.5 h-3.5" />
                <input
                  type="text"
                  value={clusterSearch}
                  onChange={(e) => setClusterSearch(e.target.value)}
                  placeholder="Search cluster, state, or franchisee..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-bg-light dark:bg-bg-dark border border-border/80 dark:border-border-dark focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Dynamic Min EPCs Input Tag */}
              <div className="flex items-center gap-1.5 bg-bg-light dark:bg-bg-dark border border-border/80 dark:border-border-dark rounded-xl px-2.5 py-1 shadow-2xs">
                <span className="text-[11px] font-bold text-text-secondary whitespace-nowrap flex items-center gap-1">
                  <FiUsers className="w-3 h-3 text-primary" /> Min EPCs:
                </span>
                <input
                  type="number"
                  min="0"
                  value={minEpcsFilter}
                  onChange={(e) => setMinEpcsFilter(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-16 px-1.5 py-0.5 text-xs font-black bg-white dark:bg-card-dark border border-border/60 rounded-lg text-primary focus:outline-hidden text-center"
                />
                {/* Preset Chips */}
                <div className="flex items-center gap-1 ml-0.5">
                  {[5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMinEpcsFilter(minEpcsFilter === String(num) ? '' : String(num))}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-all ${
                        minEpcsFilter === String(num)
                          ? 'bg-primary text-white shadow-2xs'
                          : 'bg-white dark:bg-card-dark text-text-secondary hover:text-text-primary border border-border/40'
                      }`}
                    >
                      {num}+
                    </button>
                  ))}
                  {minEpcsFilter !== '' && (
                    <button
                      type="button"
                      onClick={() => setMinEpcsFilter('')}
                      className="text-[10px] text-text-secondary hover:text-rose-500 font-bold ml-0.5 px-1"
                      title="Clear threshold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* State Filter Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-text-secondary">State:</span>
                <select
                  value={clusterStateFilter}
                  onChange={(e) => setClusterStateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-bg-light dark:bg-bg-dark border border-border/80 dark:border-border-dark font-medium text-text-primary dark:text-text-primary-dark focus:outline-hidden"
                >
                  <option value="all">All States ({availableClusterStates.length})</option>
                  {availableClusterStates.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1">
                  <FiFilter className="w-3 h-3" /> Status:
                </span>
                <select
                  value={clusterStatusFilter}
                  onChange={(e) => setClusterStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-bg-light dark:bg-bg-dark border border-border/80 dark:border-border-dark font-medium text-text-primary dark:text-text-primary-dark focus:outline-hidden"
                >
                  <option value="all">All Status</option>
                  <option value="opportunity">New Franchisee Opportunity</option>
                  <option value="campaign">META Campaign Recommended</option>
                  <option value="achieved">Target Achieved</option>
                  <option value="available">Franchisee Available</option>
                  <option value="not_available">No Franchisee</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Summary Pill Bar */}
          {(minEpcsFilter !== '' || clusterStateFilter !== 'all' || clusterStatusFilter !== 'all' || clusterSearch !== '') && (
            <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-primary/5 border border-primary/15 mb-3">
              <span className="text-text-secondary font-medium">
                Showing <strong className="text-primary">{filteredClusters.length}</strong> {filteredClusters.length === 1 ? 'cluster' : 'clusters'}
                {clusterStateFilter !== 'all' ? <span> in <strong className="text-text-primary">{clusterStateFilter}</strong></span> : ''}
                {minEpcsFilter !== '' ? <span> with <strong className="text-primary">≥ {minEpcsFilter}</strong> onboarded EPCs</span> : ''}
                {clusterStatusFilter !== 'all' ? <span className="text-text-primary"> • {clusterStatusFilter.replace('_', ' ')}</span> : ''}
              </span>
              <button
                type="button"
                onClick={() => { setMinEpcsFilter(''); setClusterStateFilter('all'); setClusterStatusFilter('all'); setClusterSearch(''); }}
                className="text-[11px] font-bold text-primary hover:underline ml-2"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Table */}
          <div className="border border-border/60 dark:border-border-dark rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-light/80 dark:bg-bg-dark/80 text-text-secondary sticky top-0 z-10 border-b border-border/50 backdrop-blur-xs">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Cluster</th>
                    <th className="py-2.5 px-3 font-bold">State</th>
                    <th className="py-2.5 px-3 font-bold text-center" title="Total prospects in MIS + Registered EPCs">MIS Potential</th>
                    <th className="py-2.5 px-3 font-bold text-center">Registered</th>
                    <th className="py-2.5 px-3 font-bold text-center">Verified</th>
                    <th className="py-2.5 px-3 font-bold text-center">Active EPCs</th>
                    <th className="py-2.5 px-3 font-bold">Franchisee</th>
                    <th className="py-2.5 px-3 font-bold text-center">Target</th>
                    <th className="py-2.5 px-3 font-bold text-center">Gap</th>
                    <th className="py-2.5 px-3 font-bold">Suggested Action / Intelligence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredClusters.length > 0 ? (
                    filteredClusters.map((row) => (
                      <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                        {/* Cluster */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-text-primary dark:text-text-primary-dark">{row.cluster}</div>
                          <div className="text-[10px] text-text-secondary font-mono">{row.clusterCode}</div>
                        </td>

                        {/* State */}
                        <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{row.state}</td>

                        {/* MIS Potential */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            row.misPotential >= 50
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-bg-light text-text-primary dark:bg-bg-dark'
                          }`}>
                            {row.misPotential}
                          </span>
                        </td>

                        {/* Registered */}
                        <td className="py-2.5 px-3 text-center font-medium">
                          <span className={`inline-block px-1.5 py-0.5 rounded-md font-bold ${
                            minEpcsFilter !== '' && row.registeredEpcs >= Number(minEpcsFilter)
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : ''
                          }`}>
                            {row.registeredEpcs}
                          </span>
                        </td>

                        {/* Verified */}
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {row.verifiedEpcs}
                        </td>

                        {/* Active EPCs */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-black text-xs px-1.5 py-0.5 rounded-md ${
                            minEpcsFilter !== '' && row.activeEpcs >= Number(minEpcsFilter)
                              ? 'bg-primary/10 text-primary'
                              : 'text-primary'
                          }`}>
                            {row.activeEpcs}
                          </span>
                        </td>

                        {/* Franchisee Availability & Name */}
                        <td className="py-2.5 px-3">
                          {row.franchiseeAvailability === 'Available' ? (
                            <div>
                              <div className="font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                {row.franchiseeName}
                              </div>
                              <div className="text-[10px] text-text-secondary">{row.storeName}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                              None Assigned
                            </span>
                          )}
                        </td>

                        {/* Target */}
                        <td className="py-2.5 px-3 text-center font-bold">{row.epcTarget}</td>

                        {/* Gap */}
                        <td className="py-2.5 px-3 text-center font-bold">
                          {row.epcGap > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">{row.epcGap}</span>
                          ) : (
                            <span className="text-emerald-600">0</span>
                          )}
                        </td>

                        {/* Action Badge & Recommendation */}
                        <td className="py-2.5 px-3 max-w-sm">
                          <div className="flex flex-col gap-1">
                            <div>
                              {(row.conditionType === 'NEW_OPPORTUNITY' ||
                                (minEpcsFilter !== '' &&
                                  Number(minEpcsFilter) > 0 &&
                                  row.franchiseeAvailability === 'Not Available' &&
                                  (row.registeredEpcs >= Number(minEpcsFilter) || row.misPotential >= Number(minEpcsFilter)))) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                                  <FiAward className="w-3 h-3" /> New Franchisee Opportunity
                                </span>
                              )}
                              {row.conditionType === 'CAMPAIGN_REQUIRED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white">
                                  <FiSend className="w-3 h-3" /> META Campaign Suggested
                                </span>
                              )}
                              {row.conditionType === 'TARGET_ACHIEVED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                                  <FiCheckCircle className="w-3 h-3" /> Target Achieved
                                </span>
                              )}
                              {row.conditionType === 'BUILDING_PIPELINE' &&
                                !(minEpcsFilter !== '' && Number(minEpcsFilter) > 0 && row.registeredEpcs >= Number(minEpcsFilter)) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  <FiClock className="w-3 h-3" /> Pipeline Building
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-text-secondary leading-tight">
                              {minEpcsFilter !== '' && Number(minEpcsFilter) > 0 && row.franchiseeAvailability === 'Not Available' && (row.registeredEpcs >= Number(minEpcsFilter) || row.misPotential >= Number(minEpcsFilter))
                                ? `New Franchisee Opportunity: Cluster has reached your benchmark of ${minEpcsFilter} EPCs (${row.registeredEpcs} registered, ${row.misPotential} prospective). No franchisee is currently assigned.`
                                : row.suggestedAction}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-text-secondary">
                        No clusters found matching your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 2: EPC Growth & META Campaign Suggestions ──────────── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'campaigns' && (
        <div>
          {/* Policy Notice Box */}
          <div className="mb-4 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 flex items-start justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-300">
            <div>
              <strong>Advisory Policy:</strong> META campaign suggestions help existing franchisees bridge their active EPC target gaps within three months. Advertising budgets, creation, and spend require separate administrator execution and are not automated.
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-200/70 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 shrink-0">
              Recommendations Only
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaignSuggestions.length > 0 ? (
              campaignSuggestions.map((item) => (
                <div
                  key={item.id}
                  className="bg-bg-light/60 dark:bg-bg-dark border border-border/80 dark:border-border-dark rounded-xl p-4 shadow-2xs hover:border-indigo-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3 pb-2.5 border-b border-border/50">
                      <div>
                        <h4 className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
                          {item.franchisee}
                        </h4>
                        <p className="text-xs text-text-secondary font-medium">
                          Store: {item.store} • Cluster: <span className="text-primary font-semibold">{item.cluster}</span> ({item.state})
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                        <FiSend className="w-3 h-3" /> META Campaign
                      </span>
                    </div>

                    {/* Metrics 4-Pack */}
                    <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                      <div className="bg-white dark:bg-card-dark p-2 rounded-lg border border-border/60">
                        <span className="text-[10px] text-text-secondary block">Registered</span>
                        <span className="text-xs font-bold text-text-primary">{item.registeredEpcs}</span>
                      </div>
                      <div className="bg-white dark:bg-card-dark p-2 rounded-lg border border-border/60">
                        <span className="text-[10px] text-text-secondary block">Verified</span>
                        <span className="text-xs font-bold text-emerald-600">{item.verifiedEpcs}</span>
                      </div>
                      <div className="bg-white dark:bg-card-dark p-2 rounded-lg border border-border/60">
                        <span className="text-[10px] text-text-secondary block">Active</span>
                        <span className="text-xs font-black text-primary">{item.activeEpcs}</span>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/40">
                        <span className="text-[10px] text-amber-800 dark:text-amber-300 block font-semibold">EPC Gap</span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-400">-{item.remainingEpcTarget}</span>
                      </div>
                    </div>

                    {/* Campaign Detail */}
                    <div className="text-xs space-y-1.5 mb-3 bg-white dark:bg-card-dark p-3 rounded-xl border border-border/60">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Campaign Type:</span>
                        <span className="font-semibold text-text-primary">{item.suggestedCampaign}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Objective:</span>
                        <span className="font-semibold text-text-primary">{item.campaignObjective}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Target Timeframe:</span>
                        <span className="font-semibold text-indigo-600">{item.targetDuration}</span>
                      </div>
                      <div className="pt-2 border-t border-border/40 text-[11px] text-text-secondary">
                        <strong className="text-text-primary block mb-0.5">Recommended Strategy:</strong>
                        {item.recommendation}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <span className="text-[11px] text-text-secondary">
                      Target: {item.activeEpcs} / {item.activeEpcTarget} Active EPCs
                    </span>
                    <button
                      type="button"
                      onClick={() => onDrillDown && onDrillDown('epcs', `EPCs in ${item.cluster}`)}
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline text-[11px]"
                    >
                      <span>Inspect Cluster EPCs</span>
                      <FiExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-text-secondary border border-border/60 rounded-xl bg-bg-light/40">
                All existing franchisees have currently achieved their active EPC targets. No META campaigns required at this moment.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 3: Three-Month Active EPC Goal Tracking ────────────── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'goals' && (
        <div className="space-y-4">
          {threeMonthGoals.length > 0 ? (
            threeMonthGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-bg-light/60 dark:bg-bg-dark border border-border/80 dark:border-border-dark rounded-xl p-4 shadow-2xs"
              >
                {/* Top Title & Progress Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
                        {goal.franchisee}
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                        {goal.cluster} ({goal.state})
                      </span>
                      {goal.isAchieved && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500 text-white font-bold">
                          Achieved
                        </span>
                      )}
                      {goal.isOverdue && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500 text-white font-bold">
                          Deadline Breached
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Goal Period: <strong>{goal.goalStartDate}</strong> to <strong>{goal.goalEndDate}</strong> (90 Days)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-text-secondary font-medium">Days Remaining</div>
                      <div className={`text-base font-black ${
                        goal.remainingDays <= 15 ? 'text-rose-600' : 'text-teal-600'
                      }`}>
                        {goal.remainingDays} Days
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & KPI Stats Row */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-text-secondary">
                      Active EPC Progress: <strong className="text-text-primary">{goal.currentActiveEpcs}</strong> / {goal.activeEpcTarget} EPCs
                    </span>
                    <span className="text-primary font-black">{goal.achievementPercentage}% Achieved</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.achievementPercentage >= 100
                          ? 'bg-emerald-500'
                          : goal.achievementPercentage >= 50
                          ? 'bg-primary'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, goal.achievementPercentage)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mb-4 text-center">
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-border/60">
                    <span className="text-[10px] text-text-secondary block">Starting Active</span>
                    <span className="text-xs font-bold text-text-primary">{goal.startingActiveEpcs}</span>
                  </div>
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-border/60">
                    <span className="text-[10px] text-text-secondary block">Current Active</span>
                    <span className="text-xs font-black text-primary">{goal.currentActiveEpcs}</span>
                  </div>
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-border/60">
                    <span className="text-[10px] text-text-secondary block">New Registered</span>
                    <span className="text-xs font-bold text-text-primary">+{goal.newEpcRegistrations}</span>
                  </div>
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-border/60">
                    <span className="text-[10px] text-text-secondary block">Newly Verified</span>
                    <span className="text-xs font-bold text-emerald-600">+{goal.newlyVerifiedEpcs}</span>
                  </div>
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-border/60">
                    <span className="text-[10px] text-text-secondary block">Newly Activated</span>
                    <span className="text-xs font-bold text-indigo-600">+{goal.newlyActivatedEpcs}</span>
                  </div>
                  <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/80">
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 block font-semibold">Remaining Target</span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400">{goal.remainingEpcTarget} EPCs</span>
                  </div>
                </div>

                {/* Monthly Progress Milestone Boxes */}
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Monthly Performance Breakdown
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {goal.monthlyProgress.map((m, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-card-dark p-3 rounded-xl border border-border/60 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border/40">
                          <strong className="text-text-primary dark:text-text-primary-dark">{m.monthLabel}</strong>
                          <span className="text-[10px] text-text-secondary">{m.dayRange}</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Registrations:</span>
                            <span className="font-bold text-text-primary">{m.registrations}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Verifications:</span>
                            <span className="font-bold text-emerald-600">{m.verifications}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-secondary">Activations:</span>
                            <span className="font-black text-primary">{m.activations}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-text-secondary border border-border/60 rounded-xl bg-bg-light/40">
              No allotted franchisee goals currently tracked. Goals commence once a franchisee is mapped to a cluster.
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ── SUB-TAB 4: Kit Sales Potential & Rankings ──────────────────── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'kits' && (
        <div>
          {/* Controls Bar: Geo-level, Ranking Type, and Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-bg-light/70 dark:bg-bg-dark rounded-xl border border-border/60">
            {/* View Selector & Category Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Active vs Potential Toggle */}
              <div className="flex items-center bg-white dark:bg-card-dark p-0.5 rounded-xl border border-border/80">
                <button
                  type="button"
                  onClick={() => setRankingType('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    rankingType === 'active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Active Kits (Confirmed Sales)
                </button>
                <button
                  type="button"
                  onClick={() => setRankingType('potential')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    rankingType === 'potential'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Potential Kits (Recorded Demand)
                </button>
              </div>

              {/* Cluster vs State Toggle */}
              <div className="flex items-center bg-white dark:bg-card-dark p-0.5 rounded-xl border border-border/80">
                <button
                  type="button"
                  onClick={() => { setRankingGeoLevel('cluster'); setSelectedGeoFilter('all'); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    rankingGeoLevel === 'cluster'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Cluster-Wise
                </button>
                <button
                  type="button"
                  onClick={() => { setRankingGeoLevel('state'); setSelectedGeoFilter('all'); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    rankingGeoLevel === 'state'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  State-Wise
                </button>
              </div>
            </div>

            {/* Geography Dropdown & Kit Search */}
            <div className="flex items-center gap-2">
              <select
                value={selectedGeoFilter}
                onChange={(e) => setSelectedGeoFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-card-dark border border-border/80 text-text-primary dark:text-text-primary-dark font-medium focus:outline-hidden"
              >
                <option value="all">All {rankingGeoLevel === 'cluster' ? 'Clusters' : 'States'}</option>
                {availableGeoOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              <input
                type="text"
                value={kitSearch}
                onChange={(e) => setKitSearch(e.target.value)}
                placeholder="Filter kit..."
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-card-dark border border-border/80 w-32 focus:outline-hidden"
              >
              </input>
            </div>
          </div>

          {/* Kit Ranking Table */}
          <div className="border border-border/60 dark:border-border-dark rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-light/80 dark:bg-bg-dark/80 text-text-secondary sticky top-0 z-10 border-b border-border/50 backdrop-blur-xs">
                  {rankingType === 'active' ? (
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-center w-12">Rank</th>
                      <th className="py-2.5 px-3 font-bold">{rankingGeoLevel === 'cluster' ? 'Cluster' : 'State'}</th>
                      <th className="py-2.5 px-3 font-bold">Kit Name</th>
                      <th className="py-2.5 px-3 font-bold">Capacity</th>
                      <th className="py-2.5 px-3 font-bold">SKU</th>
                      <th className="py-2.5 px-3 font-bold text-center">Orders</th>
                      <th className="py-2.5 px-3 font-bold text-right">Confirmed Qty</th>
                      <th className="py-2.5 px-3 font-bold text-right">Confirmed kW</th>
                      <th className="py-2.5 px-3 font-bold text-right">Order Value (INR)</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-center w-12">Rank</th>
                      <th className="py-2.5 px-3 font-bold">{rankingGeoLevel === 'cluster' ? 'Cluster' : 'State'}</th>
                      <th className="py-2.5 px-3 font-bold">Kit Name</th>
                      <th className="py-2.5 px-3 font-bold">Capacity</th>
                      <th className="py-2.5 px-3 font-bold">SKU</th>
                      <th className="py-2.5 px-3 font-bold text-center">Enquiries</th>
                      <th className="py-2.5 px-3 font-bold text-center">Quotations</th>
                      <th className="py-2.5 px-3 font-bold text-right">Estimated Qty</th>
                      <th className="py-2.5 px-3 font-bold text-right">Pending Demand</th>
                      <th className="py-2.5 px-3 font-bold text-right">Potential Value (INR)</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-border/40">
                  {currentKitList.length > 0 ? (
                    currentKitList.map((k, idx) => (
                      <tr key={idx} className="hover:bg-primary/5 transition-colors">
                        {/* Rank */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-[11px] ${
                            k.rank === 1
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : k.rank === 2
                              ? 'bg-slate-400 text-white'
                              : k.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'text-text-secondary bg-bg-light dark:bg-bg-dark'
                          }`}>
                            {k.rank || idx + 1}
                          </span>
                        </td>

                        {/* Cluster or State */}
                        <td className="py-2.5 px-3 font-semibold text-text-primary dark:text-text-primary-dark">
                          {rankingGeoLevel === 'cluster' ? k.cluster : k.state}
                        </td>

                        {/* Kit Name */}
                        <td className="py-2.5 px-3 font-bold text-text-primary dark:text-text-primary-dark">
                          {k.kitName}
                        </td>

                        {/* Capacity */}
                        <td className="py-2.5 px-3 font-semibold text-indigo-600">{k.capacity}</td>

                        {/* SKU */}
                        <td className="py-2.5 px-3 font-mono text-[10px] text-text-secondary">{k.sku}</td>

                        {/* Active vs Potential Metrics */}
                        {rankingType === 'active' ? (
                          <>
                            <td className="py-2.5 px-3 text-center font-medium">{k.confirmedOrders}</td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                              {k.confirmedQuantity} Kits
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-primary">
                              {k.confirmedKw} kW
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-400">
                              {formatInr(k.confirmedOrderValue)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 text-center font-medium">{k.enquiryCount}</td>
                            <td className="py-2.5 px-3 text-center font-medium">{k.quotationCount}</td>
                            <td className="py-2.5 px-3 text-right font-medium">{k.estimatedKitDemand} Kits</td>
                            <td className="py-2.5 px-3 text-right font-black text-sky-600 dark:text-sky-400">
                              {k.pendingKitDemand} Kits
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-sky-700 dark:text-sky-400">
                              {formatInr(k.potentialOrderValue)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-text-secondary">
                        No kit records found matching the active selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
