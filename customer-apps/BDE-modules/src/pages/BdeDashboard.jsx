import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBdeAuth } from '../context/BdeAuthContext';
import api from '../services/api';
import BdeFranchiseeGoalsSection from '../components/BdeFranchiseeGoalsSection';
import BdeTerritoryViewModal from '../components/BdeTerritoryViewModal';
import {
  User,
  ShieldCheck,
  MapPin,
  Target,
  ShoppingBag,
  Store,
  Users,
  Bell,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  Calendar,
  Layers,
  Clock,
  Plus,
  Zap,
  Package,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Building2,
  FileCheck,
  ShoppingCart,
  Search,
  Globe,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function BdeDashboard() {
  const { user, canOnboardEpc, canOnboardFranchise } = useBdeAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [clusterData, setClusterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    if (window.location.hash === '#franchisee-goals-section') {
      setTimeout(() => {
        const el = document.getElementById('franchisee-goals-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, clusterRes] = await Promise.allSettled([
        api.get('/dashboard'),
        api.get('/franchise-clusters/dashboard'),
      ]);

      if (res.status === 'fulfilled' && res.value.data?.status === 'success') {
        setDashboardData(res.value.data.data);
      }
      if (clusterRes.status === 'fulfilled' && clusterRes.value.data?.status === 'success') {
        setClusterData(clusterRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load BDE dashboard data', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const [territoryModalOpen, setTerritoryModalOpen] = useState(false);
  const [selectedStateFilter, setSelectedStateFilter] = useState('all');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState('all');
  const [districtSearch, setDistrictSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const bde = dashboardData?.bde || user || {};
  const territory = dashboardData?.territory || null;
  const territories = dashboardData?.territories || [];
  const stateSummary = dashboardData?.state_summary || {};
  const districtBreakdown = dashboardData?.district_breakdown || [];
  const goals = dashboardData?.goals || {};
  const notifications = dashboardData?.notifications || [];

  const assignedStates = useMemo(() => {
    if (territory?.assigned_states && territory.assigned_states.length > 0) {
      return territory.assigned_states;
    }
    if (territories && territories.length > 0) {
      return [...new Set(territories.map((t) => t.state_name).filter(Boolean))];
    }
    if (territory?.state_name) {
      return territory.state_name.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [territory, territories]);

  const stateCount = assignedStates.length;
  const isAllIndia = territory?.is_all_india || stateCount >= 25;
  const totalDistrictsCount = territory?.district_count || districtBreakdown.length || 0;

  const selectedClusterObj = useMemo(() => {
    if (!selectedClusterFilter || selectedClusterFilter === 'all') return null;
    return (clusterData?.assigned_clusters || []).find(
      (c) => String(c.id) === String(selectedClusterFilter) || c.cluster_name === selectedClusterFilter
    );
  }, [selectedClusterFilter, clusterData]);

  // Filtered districts based on state filter, cluster filter, and search query
  const filteredDistricts = useMemo(() => {
    return districtBreakdown.filter((d) => {
      const dState = (d.state || d.state_name || '').toLowerCase();
      const matchState =
        selectedStateFilter === 'all' || dState === selectedStateFilter.toLowerCase();

      let matchCluster = true;
      if (selectedClusterObj) {
        const clusterDistNames = (selectedClusterObj.district_names || []).map((x) => x.toLowerCase().trim());
        const dName = (d.district || '').toLowerCase().trim();
        matchCluster = clusterDistNames.includes(dName);
      }

      const matchSearch =
        !districtSearch.trim() ||
        d.district?.toLowerCase().includes(districtSearch.toLowerCase().trim()) ||
        dState.includes(districtSearch.toLowerCase().trim());
      return matchState && matchCluster && matchSearch;
    });
  }, [districtBreakdown, selectedStateFilter, selectedClusterObj, districtSearch]);

  // Dynamic KPI Metrics for territory summary (Overall vs selected state vs selected cluster)
  const activeSummaryMetrics = useMemo(() => {
    if (selectedStateFilter === 'all' && !selectedClusterObj) {
      return stateSummary;
    }
    const stateDistricts = filteredDistricts;
    const totalDistricts = stateDistricts.length;
    const totalFranchisees = stateDistricts.reduce((sum, d) => sum + (d.franchisees_count || 0), 0);
    const operationalFranchisees = stateDistricts.reduce((sum, d) => sum + (d.operational_count || 0), 0);
    const franchiseesUnderSetup = Math.max(0, totalFranchisees - operationalFranchisees);
    const epcLeads = stateDistricts.reduce((sum, d) => sum + (d.epc_leads_count || 0), 0);
    const epcsOnboarded = stateDistricts.reduce((sum, d) => sum + (d.epcs_onboarded_count || 0), 0);
    const kitsOrdered = stateDistricts.reduce((sum, d) => sum + (d.kits_ordered_count || 0), 0);

    return {
      total_assigned_districts: totalDistricts,
      total_franchisees: totalFranchisees,
      operational_franchisees: operationalFranchisees,
      franchisees_under_setup: franchiseesUnderSetup,
      epc_leads: epcLeads,
      epcs_onboarded: epcsOnboarded,
      epcs_assigned: stateSummary.epcs_assigned || 0,
      total_orders: stateSummary.total_orders || 0,
      total_kits_ordered: kitsOrdered,
    };
  }, [selectedStateFilter, selectedClusterObj, filteredDistricts, stateSummary]);

  // Pagination for District Breakdown Table
  const totalPages = Math.ceil(filteredDistricts.length / itemsPerPage) || 1;
  const paginatedDistricts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDistricts.slice(start, start + itemsPerPage);
  }, [filteredDistricts, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading BDE State & District Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-6 md:p-8 shadow-xl shadow-blue-950/15 border border-blue-800/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold text-amber-300 tracking-wide border border-white/10 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> BDE Field Executive
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> KYC Verified
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Welcome back, {bde.full_name || 'BDE Executive'}!
            </h1>

            <p className="text-xs md:text-sm text-blue-200 max-w-xl">
              Territory management, EPC leads generation, GST onboarding, franchisee kit targets, and sales analytics for your assigned region.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-blue-100">
              <span className="font-mono bg-blue-950/80 px-3 py-1.5 rounded-xl border border-blue-700/40">
                BDE ID: <strong className="text-white">{bde.bde_id}</strong>
              </span>

              {/* Territory Badge with Smart Truncation & Interactive Modal */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-blue-950/80 px-3.5 py-1.5 rounded-xl border border-blue-700/40 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {isAllIndia ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-blue-200">Territory:</span>
                      <strong className="text-amber-300 font-bold">Pan India</strong>
                      <span className="text-blue-300">({stateCount} States • {totalDistrictsCount} Districts)</span>
                    </div>
                  ) : stateCount > 3 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-blue-200">States:</span>
                      <strong className="text-white">{assignedStates.slice(0, 2).join(', ')}</strong>
                      <span className="text-blue-300">+{stateCount - 2} More ({totalDistrictsCount} Districts)</span>
                    </div>
                  ) : stateCount > 1 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-blue-200">States:</span>
                      <strong className="text-white">{assignedStates.join(', ')}</strong>
                      <span className="text-blue-300">({totalDistrictsCount} Districts)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-blue-200">State:</span>
                      <strong className="text-white">{assignedStates[0] || territory?.state_name || 'Assigned Territory'}</strong>
                      <span className="text-blue-300">({totalDistrictsCount} Districts Assigned)</span>
                    </div>
                  )}
                </div>

                {/* Assigned Clusters Badge */}
                {clusterData?.assigned_clusters && clusterData.assigned_clusters.length > 0 && (
                  <div className="bg-indigo-950/80 px-3.5 py-1.5 rounded-xl border border-indigo-700/50 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-blue-200">Clusters:</span>
                    <strong className="text-white">
                      {clusterData.assigned_clusters.length} Assigned
                    </strong>
                    <span className="text-indigo-300 hidden sm:inline">
                      ({clusterData.assigned_clusters.slice(0, 2).map((c) => c.cluster_name).join(', ')}
                      {clusterData.assigned_clusters.length > 2 && ` +${clusterData.assigned_clusters.length - 2} more`})
                    </span>
                  </div>
                )}

                {stateCount > 1 && (
                  <button
                    onClick={() => setTerritoryModalOpen(true)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
                    title="View all assigned states and districts"
                  >
                    <span>View All States ({stateCount})</span>
                    <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            <button
              onClick={() => navigate('/purchase-orders')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#F49222] to-amber-400 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg shadow-amber-400/20 flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" /> Bulk PO Orders
            </button>
            {canOnboardEpc !== false && (
              <button
                onClick={() => navigate('/epc-onboarding')}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl text-xs transition flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> GST Onboard EPC
              </button>
            )}
            {canOnboardEpc !== false && (
              <button
                onClick={() => navigate('/epc-leads')}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl text-xs transition flex items-center gap-2"
              >
                <Users className="w-4 h-4" /> EPC Leads
              </button>
            )}
            {canOnboardFranchise !== false && (
              <button
                onClick={() => {
                  const el = document.getElementById('franchisee-goals-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl text-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Store className="w-4 h-4" /> Franchisee Goals
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 6.3: Franchisee Cluster & Business Support Management ── */}
      {clusterData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Assigned Franchisee Clusters & Performance Support
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {clusterData.metrics?.total_clusters || 0} Clusters • {clusterData.metrics?.total_franchisees || 0} Franchisees Mapped
            </span>
          </div>

          {/* Clusters Ribbon */}
          {clusterData.assigned_clusters && clusterData.assigned_clusters.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {clusterData.assigned_clusters.map((clu) => {
                const isSelectedCluster = selectedClusterFilter === clu.id;
                return (
                  <div
                    key={clu.id}
                    onClick={() => {
                      setSelectedClusterFilter(isSelectedCluster ? 'all' : clu.id);
                      const el = document.getElementById('territory-summary-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`p-4 rounded-2xl bg-white border-2 shadow-xs flex flex-col justify-between space-y-2.5 transition-all cursor-pointer ${isSelectedCluster
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-indigo-300'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: clu.color_code || '#2563eb' }}
                          />
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                            {clu.cluster_code}
                          </span>
                          {clu.is_primary ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Primary BDE</span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">Support BDE</span>
                          )}
                        </div>
                        <h4 className="font-black text-sm text-slate-900 mt-1.5">{clu.cluster_name}</h4>
                        <span className="text-[11px] text-slate-500 font-semibold">{clu.state_name}</span>
                      </div>
                      <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg font-bold">{clu.districts_count} Districts</span>
                    </div>

                    {clu.district_names && clu.district_names.length > 0 && (
                      <div className="text-[11px] text-slate-500 line-clamp-1 font-medium" title={clu.district_names.join(', ')}>
                        {clu.district_names.slice(0, 4).join(', ')}
                        {clu.district_names.length > 4 && ` +${clu.district_names.length - 4} more`}
                      </div>
                    )}

                    <div className="text-xs pt-2 border-t border-slate-100 flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Franchisee Store:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[150px]">{clu.franchisee_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cluster Performance KPIs (Section 6.3) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Annual EPC Onboarding */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Annual EPC Onboarding</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {clusterData.metrics?.actual_epc_onboarded || 0}
                <span className="text-xs font-bold text-slate-400 ml-1.5">/ {clusterData.metrics?.annual_epc_goal || 0} Goal</span>
              </div>
              <div className="text-[10px] text-blue-600 font-bold">
                {clusterData.metrics?.annual_epc_goal > 0
                  ? Math.round(((clusterData.metrics.actual_epc_onboarded || 0) / clusterData.metrics.annual_epc_goal) * 100)
                  : 0}% Annual Target Completed
              </div>
            </div>

            {/* Live Active EPCs */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Live Active EPCs</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {clusterData.metrics?.live_epc_count || 0}
                <span className="text-xs font-bold text-slate-400 ml-1.5">Active (90 Days)</span>
              </div>
              <div className="text-[10px] text-amber-600 font-semibold">
                Actively qualifying with repeat quotes/orders
              </div>
            </div>

            {/* Monthly Kit Sales */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Monthly Kit Sales</span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {clusterData.metrics?.actual_monthly_kits || 0}
                <span className="text-xs font-bold text-slate-400 ml-1.5">/ {clusterData.metrics?.monthly_kit_target || 0} Kits</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">
                {clusterData.metrics?.monthly_achievement_pct || 0}% Monthly Achievement
              </div>
            </div>
          </div>

          {/* Support Tickets & Agreement Expiry Alerts (Section 6.3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Open Franchisee Tickets */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Open Franchisee Tickets</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                    {clusterData.open_tickets_count || 0} Open
                  </span>
                </div>
                {clusterData.overdue_tickets_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                    ⚠️ {clusterData.overdue_tickets_count} Overdue SLA
                  </span>
                )}
              </div>

              {clusterData.open_tickets && clusterData.open_tickets.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {clusterData.open_tickets.map((t) => (
                    <div
                      key={t._id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-blue-700">{t.ticket_number}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 capitalize">
                            {t.ticket_type?.replace(/_/g, " ") || "Support"}
                          </span>
                        </div>
                        <p className="text-slate-600 font-semibold truncate max-w-xs mt-0.5">
                          {t.item_name || t.problem_description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {t.tat_deadline ? `TAT: ${new Date(t.tat_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  No pending support or replacement tickets in assigned clusters.
                </div>
              )}
            </div>

            {/* Agreements Expiring in Assigned Clusters */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Agreements Expiring Soon</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${clusterData.expiring_agreements_count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {clusterData.expiring_agreements_count || 0} Expiring (30 Days)
                </span>
              </div>

              {clusterData.expiring_agreements && clusterData.expiring_agreements.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {clusterData.expiring_agreements.map((ag) => (
                    <div
                      key={ag._id}
                      className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-black text-slate-900">
                          {ag.franchisee_id?.business_name || "Franchisee Store"}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Cluster: {ag.cluster_id?.cluster_name || "Assigned Cluster"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-black text-amber-800">
                          Expires: {new Date(ag.end_date).toLocaleDateString('en-IN')}
                        </div>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                          Follow-up Required
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  All franchisee agreements in your clusters are active and up to date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. TERRITORY PERFORMANCE SUMMARY */}
      <div id="territory-summary-section" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Territory Performance Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedClusterObj
                ? `Filtered for cluster "${selectedClusterObj.cluster_name}" (${selectedClusterObj.districts_count} districts in ${selectedClusterObj.state_name})`
                : selectedStateFilter === 'all'
                  ? isAllIndia
                    ? `Aggregated metrics across all ${stateCount} assigned states (${totalDistrictsCount} districts)`
                    : stateCount > 1
                      ? `Aggregated metrics across ${stateCount} assigned states (${totalDistrictsCount} districts)`
                      : `Statewide metrics for ${assignedStates[0] || 'assigned region'}`
                  : `Focused metrics for ${selectedStateFilter}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {stateCount > 1 && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400">State:</span>
                <select
                  value={selectedStateFilter}
                  onChange={(e) => {
                    setSelectedStateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[160px] sm:max-w-none truncate"
                >
                  <option value="all">All Assigned States ({stateCount})</option>
                  {assignedStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cluster Filter */}
            {clusterData?.assigned_clusters && clusterData.assigned_clusters.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <span className="text-[11px] font-bold text-indigo-600">Cluster:</span>
                <select
                  value={selectedClusterFilter}
                  onChange={(e) => {
                    setSelectedClusterFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[180px] sm:max-w-none truncate"
                >
                  <option value="all">All Clusters ({clusterData.assigned_clusters.length})</option>
                  {clusterData.assigned_clusters.map((clu) => (
                    <option key={clu.id} value={clu.id}>
                      {clu.cluster_name} ({clu.districts_count} Dist)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={fetchDashboardData}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-xl shadow-2xs flex items-center gap-1.5 font-semibold transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" /> Refresh Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Assigned Districts */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Districts</span>
            <div className="text-2xl font-black text-slate-900">{activeSummaryMetrics.total_assigned_districts || 0}</div>
            <span className="text-[10px] text-slate-500 font-medium">In your territory</span>
          </div>

          {/* Franchisee Network */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Franchisees</span>
            <div className="text-2xl font-black text-slate-900">{activeSummaryMetrics.total_franchisees || 0}</div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span>{activeSummaryMetrics.operational_franchisees || 0} Live</span> •{' '}
              <span className="text-amber-600">{activeSummaryMetrics.franchisees_under_setup || 0} Setup</span>
            </div>
          </div>

          {/* EPC Leads */}
          <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">EPC Leads</span>
            <div className="text-2xl font-black text-blue-700">{activeSummaryMetrics.epc_leads || 0}</div>
            <span className="text-[10px] text-blue-600 font-medium">Pipeline contacts</span>
          </div>

          {/* EPCs Onboarded & Assigned */}
          <div className="p-4 bg-white rounded-2xl border border-teal-100 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">EPCs Onboarded</span>
            <div className="text-2xl font-black text-teal-700">{activeSummaryMetrics.epcs_onboarded || 0}</div>
            <span className="text-[10px] text-teal-600 font-medium">
              {activeSummaryMetrics.epcs_assigned || 0} Assigned to Franchisees
            </span>
          </div>

          {/* Total Kits Ordered */}
          <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Kits Ordered</span>
            <div className="text-2xl font-black text-emerald-700">{activeSummaryMetrics.total_kits_ordered || 0}</div>
            <span className="text-[10px] text-emerald-600 font-medium">Across {activeSummaryMetrics.total_orders || 0} PO orders</span>
          </div>
        </div>
      </div>

      {/* 5. DISTRICT DASHBOARD TABLE — District-by-District Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900">District-by-District Territory Breakdown</h2>
            <p className="text-xs text-slate-500">
              Performance comparison of Franchisees, EPC Leads, Onboarded contractors, and actual Kits ordered by district.
            </p>
          </div>

          {/* Controls: Search, State Filter, Items Per Page */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-blue-500 focus-within:bg-white transition">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={districtSearch}
                onChange={(e) => {
                  setDistrictSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search district or state..."
                className="w-36 sm:w-48 bg-transparent text-xs text-slate-800 focus:outline-none placeholder-slate-400 font-medium"
              />
              {districtSearch && (
                <button
                  onClick={() => {
                    setDistrictSearch('');
                    setCurrentPage(1);
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {stateCount > 1 && (
              <select
                value={selectedStateFilter}
                onChange={(e) => {
                  setSelectedStateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="all">All States ({stateCount})</option>
                {assignedStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            )}

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px] font-medium">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">District</th>
                {stateCount > 1 && <th className="px-4 py-3.5">State</th>}
                <th className="px-4 py-3.5 text-center">Franchisees (Live / Setup)</th>
                <th className="px-4 py-3.5 text-center">EPC Leads</th>
                <th className="px-4 py-3.5 text-center">EPCs Onboarded</th>
                <th className="px-4 py-3.5 text-center">Kits Ordered</th>
                <th className="px-4 py-3.5 text-right">Goal Achievement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDistricts.length > 0 ? (
                paginatedDistricts.map((d, idx) => (
                  <tr key={d.district || idx} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{d.district}</span>
                    </td>
                    {stateCount > 1 && (
                      <td className="px-4 py-3.5 text-slate-600">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {d.state || d.state_name || 'Territory'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-slate-800">{d.franchisees_count}</span>
                      <span className="text-[11px] text-slate-400 ml-1">
                        ({d.operational_count} Live)
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-blue-700">{d.epc_leads_count}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-teal-700">{d.epcs_onboarded_count}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-emerald-700">{d.kits_ordered_count}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${d.goal_achievement_pct >= 100
                              ? 'bg-emerald-500'
                              : d.goal_achievement_pct >= 60
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                              }`}
                            style={{ width: `${Math.min(100, d.goal_achievement_pct)}%` }}
                          />
                        </div>
                        <span
                          className={`font-black text-xs ${d.goal_achievement_pct >= 100
                            ? 'text-emerald-700'
                            : d.goal_achievement_pct >= 60
                              ? 'text-blue-700'
                              : 'text-amber-700'
                            }`}
                        >
                          {d.goal_achievement_pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={stateCount > 1 ? 7 : 6} className="px-4 py-8 text-center text-slate-400">
                    <p className="font-medium text-xs">
                      {districtSearch || selectedStateFilter !== 'all'
                        ? 'No districts found matching your search or state filter.'
                        : 'No district breakdown records found for this territory.'}
                    </p>
                    {(districtSearch || selectedStateFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setDistrictSearch('');
                          setSelectedStateFilter('all');
                          setCurrentPage(1);
                        }}
                        className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredDistricts.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div>
              Showing{' '}
              <strong className="text-slate-900">
                {(currentPage - 1) * itemsPerPage + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(currentPage * itemsPerPage, filteredDistricts.length)}
              </strong>{' '}
              of <strong className="text-slate-900">{filteredDistricts.length}</strong> districts
              {filteredDistricts.length !== districtBreakdown.length && (
                <span className="text-slate-400 ml-1">
                  (filtered from {districtBreakdown.length} total)
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="px-3 py-1 font-bold text-slate-800 bg-slate-50 rounded-lg border border-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for All Assigned States & Districts */}
      <BdeTerritoryViewModal
        isOpen={territoryModalOpen}
        onClose={() => setTerritoryModalOpen(false)}
        territory={territory}
        territories={territories}
        onSelectState={(st) => {
          setSelectedStateFilter(st);
          setCurrentPage(1);
        }}
      />

      {/* 6. FRANCHISEE MONTHLY GOAL VS ACHIEVEMENT (MERGED) */}
      {canOnboardFranchise !== false && (
        <div id="franchisee-goals-section" className="scroll-mt-6">
          <BdeFranchiseeGoalsSection />
        </div>
      )}

      {/* Target Progress & Quick Cards Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${canOnboardFranchise !== false && canOnboardEpc !== false ? 'xl:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {/* Franchisee Signups Target */}
        {canOnboardFranchise !== false && (
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Franchisee Signups</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{goals.monthly_signup_achieved || 0}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {goals.monthly_franchisee_signup_goal || 0} target</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${goals.monthly_signup_progress_pct || 0}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold text-blue-600">{goals.monthly_signup_progress_pct || 0}% completed</p>
            </div>
          </div>
        )}

        {/* EPC Onboarding Target */}
        {canOnboardEpc !== false && (
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">EPC Onboardings</span>
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-teal-700">{goals.monthly_epc_onboarded_achieved || 0}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {goals.monthly_epc_onboard_goal || 0} target</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all"
                  style={{
                    width: `${goals.monthly_epc_onboard_goal > 0
                      ? Math.min(100, Math.round(((goals.monthly_epc_onboarded_achieved || 0) / goals.monthly_epc_onboard_goal) * 100))
                      : 0
                      }%`,
                  }}
                />
              </div>
              <p className="text-[11px] font-semibold text-teal-600">
                {goals.monthly_epc_onboard_goal > 0
                  ? Math.round(((goals.monthly_epc_onboarded_achieved || 0) / goals.monthly_epc_onboard_goal) * 100)
                  : 0}
                % verified & onboarded
              </p>
            </div>
          </div>
        )}

        {/* Network Kits Ordered Target */}
        {(canOnboardFranchise !== false || (goals.monthly_network_kit_goal || 0) > 0) && (
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Network Kit Orders</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-700">{goals.monthly_network_kits_achieved || 0}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {goals.monthly_network_kit_goal || 0} kits</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, goals.network_kit_achievement_pct || 0)}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold text-emerald-600">{goals.network_kit_achievement_pct || 0}% kit goal achievement</p>
            </div>
          </div>
        )}

        {/* EPC Trial Kits Target */}
        {(canOnboardEpc !== false || (goals.monthly_trial_kit_goal || 0) > 0) && (
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">EPC Trial Kits</span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-700">{goals.monthly_trial_kits_achieved || 0}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {goals.monthly_trial_kit_goal || 0} kits</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, goals.trial_kit_achievement_pct || 0)}%` }}
                />
              </div>
              <p className="text-[11px] font-semibold text-rose-600">{goals.trial_kit_achievement_pct || 0}% kit goal achievement</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
