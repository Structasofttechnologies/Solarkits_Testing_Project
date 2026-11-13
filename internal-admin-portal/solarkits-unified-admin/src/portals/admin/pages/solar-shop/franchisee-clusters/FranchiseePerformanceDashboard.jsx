import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';
import { authHeaderObj } from '@/app/authHeader';
import {
  FiBarChart2,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiAward,
  FiPackage,
  FiDollarSign,
  FiAlertCircle,
  FiTool,
  FiClock,
  FiDownload,
  FiFilter,
  FiSearch,
  FiChevronRight,
  FiLayers,
} from 'react-icons/fi';
import Button from '@/components/Button';
import Loader from '@/components/Loader';

export default function FranchiseePerformanceDashboard() {
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Filters
  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const initialFY =
    currentMonthNum >= 4
      ? `${currentYear}-${String(currentYear + 1).slice(2)}`
      : `${currentYear - 1}-${String(currentYear).slice(2)}`;

  const [financialYear, setFinancialYear] = useState(initialFY);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedBde, setSelectedBde] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({});
  const [tableRows, setTableRows] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [lowPerformers, setLowPerformers] = useState([]);

  // Masters
  const [states, setStates] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [bdes, setBdes] = useState([]);

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchPerformanceData();
  }, [financialYear, selectedMonth, selectedState, selectedCluster, selectedBde]);

  const fetchMasters = async () => {
    try {
      const [stRes, cluRes, bdeRes] = await Promise.all([
        axios
          .get(`${API_URL}/franchise-clusters/states`, authHeaderObj())
          .catch(() => axios.get(`${API_URL}/geolocation/get-states`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/geolocation/states`, authHeaderObj())),
        axios.get(`${API_URL}/franchise-clusters/list`, authHeaderObj()).catch(() => ({ data: { data: [] } })),
        axios
          .get(`${API_URL}/franchise-clusters/bdes`, authHeaderObj())
          .catch(() => axios.get(`${API_URL}/franchise-clusters/bde/mappings`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/store-management/bde/list?unique_id=RSL_MGMT&req_for=view`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view&limit=500`, authHeaderObj())),
      ]);
      const stateList = stRes?.data?.states || stRes?.data?.data || [];
      if (Array.isArray(stateList)) setStates(stateList);
      if (cluRes?.data?.data) setClusters(cluRes.data.data);
      const bdeList = bdeRes?.data?.data || bdeRes?.data?.bdes || [];
      if (Array.isArray(bdeList)) setBdes(bdeList);
    } catch (err) {
      console.error('Error loading masters for performance:', err);
    }
  };

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('financial_year', financialYear);
      params.append('month', selectedMonth);
      if (selectedState) params.append('state_id', selectedState);
      if (selectedCluster) params.append('cluster_id', selectedCluster);
      if (selectedBde) params.append('bde_id', selectedBde);

      const res = await axios.get(
        `${API_URL}/franchise-clusters/performance/dashboard?${params.toString()}`,
        authHeaderObj()
      );
      if (res.data?.status === 'success') {
        setKpis(res.data.kpis || {});
        setTableRows(res.data.table || []);
        setTopPerformers(res.data.top_performers || []);
        setLowPerformers(res.data.low_performers || []);
      }
    } catch (err) {
      console.error('Error loading performance data:', err);
      dispatch(setAlert({ title: 'Error', message: 'Failed to load performance metrics', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Export Table to CSV
  const handleExportCSV = () => {
    if (tableRows.length === 0) return;
    const headers = [
      'Franchisee Store',
      'Cluster Name',
      'Cluster Code',
      'State',
      'BDE',
      'Annual EPC Goal',
      'Actual EPCs',
      'EPC %',
      'Live EPC Goal',
      'Actual Live EPCs',
      'Live %',
      'Monthly Kit Goal',
      'Actual Kits Sold',
      'Kit %',
      'Monthly Revenue Goal (INR)',
      'Actual Revenue (INR)',
      'Annual Revenue (INR)',
    ];

    const rows = tableRows.map((r) => [
      `"${r.franchisee_name}"`,
      `"${r.cluster_name}"`,
      `"${r.cluster_code}"`,
      `"${r.state_name}"`,
      `"${r.bde_name}"`,
      r.epc_goal,
      r.epc_actual,
      `${r.epc_achievement_pct}%`,
      r.live_epc_goal,
      r.live_epc_actual,
      `${r.live_epc_achievement_pct}%`,
      r.monthly_kit_goal,
      r.actual_kits,
      `${r.monthly_kit_achievement_pct}%`,
      r.monthly_revenue_goal,
      r.actual_revenue_this_month,
      r.annual_revenue_actual,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Franchisee_Performance_${financialYear}_Month_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return tableRows.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.franchisee_name?.toLowerCase().includes(q) ||
        r.cluster_name?.toLowerCase().includes(q) ||
        r.cluster_code?.toLowerCase().includes(q) ||
        r.bde_name?.toLowerCase().includes(q)
      );
    });
  }, [tableRows, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <FiBarChart2 size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Franchisee Performance Dashboard</h1>
            <p className="text-xs font-semibold text-slate-500">
              Track real-time goals vs achievements across clusters, EPC conversions, and monthly kit sales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
          >
            <FiDownload size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Section 5.1: KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Franchisees */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">Franchisees</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{kpis.active_franchisees || 0}</span>
            <span className="text-[11px] font-bold text-slate-400">/ {kpis.total_franchisees || 0} Active</span>
          </div>
        </div>

        {/* EPC Onboarding Goal vs Actual */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">EPC Onboarding</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-blue-600">{kpis.epc_actual || 0}</span>
            <span className="text-[11px] font-bold text-slate-400">/ {kpis.epc_goal || 0}</span>
          </div>
          <div className="text-[10px] font-extrabold text-blue-700 mt-0.5">{kpis.epc_achievement_pct || 0}% Achieved</div>
        </div>

        {/* Live Active EPC Goal vs Actual */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">Live Active EPCs</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600">{kpis.live_epc_actual || 0}</span>
            <span className="text-[11px] font-bold text-slate-400">/ {kpis.live_epc_goal || 0}</span>
          </div>
          <div className="text-[10px] font-extrabold text-emerald-700 mt-0.5">{kpis.live_epc_achievement_pct || 0}% Live Rate</div>
        </div>

        {/* Monthly Kit Sales Goal vs Actual */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">Monthly Kits Sold</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-orange-600">{kpis.monthly_kit_actual || 0}</span>
            <span className="text-[11px] font-bold text-slate-400">/ {kpis.monthly_kit_goal || 0}</span>
          </div>
          <div className="text-[10px] font-extrabold text-orange-700 mt-0.5">{kpis.kit_achievement_pct || 0}% Quota</div>
        </div>

        {/* Total Annual Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400">Realized Revenue</span>
          <div className="mt-1 text-base font-black text-slate-900 truncate">
            ₹{((kpis.total_revenue || 0) / 100000).toFixed(1)}L
          </div>
          <div className="text-[10px] font-bold text-slate-400 mt-0.5">Net Delivered Orders</div>
        </div>

        {/* Open Tickets & Pending Renewals */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400">Support & SLA</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-black text-amber-600">{kpis.open_tickets || 0}</span>
              <span className="text-[10px] font-bold text-slate-400">Tickets</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase text-slate-400">Renewals</div>
            <div className="text-lg font-black text-purple-600">{kpis.pending_renewals || 0}</div>
          </div>
        </div>
      </div>

      {/* ── Section 5.3: Performance Filters Bar ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* FY Selector */}
        <div>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="2026-27">FY 2026–27</option>
            <option value="2025-26">FY 2025–26</option>
          </select>
        </div>

        {/* Month Selector */}
        <div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            {[
              { m: 1, name: 'Jan' },
              { m: 2, name: 'Feb' },
              { m: 3, name: 'Mar' },
              { m: 4, name: 'Apr' },
              { m: 5, name: 'May' },
              { m: 6, name: 'Jun' },
              { m: 7, name: 'Jul' },
              { m: 8, name: 'Aug' },
              { m: 9, name: 'Sep' },
              { m: 10, name: 'Oct' },
              { m: 11, name: 'Nov' },
              { m: 12, name: 'Dec' },
            ].map((mo) => (
              <option key={mo.m} value={mo.m}>
                Month: {mo.name}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="">All States</option>
            {states.map((st) => (
              <option key={st._id || st.id} value={st._id || st.id}>
                {st.name || st.state_name}
              </option>
            ))}
          </select>
        </div>

        {/* Cluster */}
        <div>
          <select
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="">All Clusters</option>
            {clusters.map((c) => (
              <option key={c._id} value={c._id}>
                {c.cluster_name}
              </option>
            ))}
          </select>
        </div>

        {/* BDE */}
        <div>
          <select
            value={selectedBde}
            onChange={(e) => setSelectedBde(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="">All BDEs</option>
            {bdes.map((b) => (
              <option key={b._id || b.id || b.bde_id} value={b._id || b.id || b.bde_id}>
                {b.full_name || b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-2 text-slate-400" size={13} />
          <input
            type="text"
            placeholder="Search franchisee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* ── Section 5.4: Top & Low Performing Franchisees Summary Cards ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Performers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-wider">
            <FiTrendingUp size={16} /> Top Performing Franchisee Clusters
          </div>
          {topPerformers.length === 0 ? (
            <div className="text-slate-400 text-xs italic py-2">No performance data recorded.</div>
          ) : (
            <div className="space-y-2">
              {topPerformers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs">
                  <div>
                    <div className="font-extrabold text-slate-900">{p.franchisee_name}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {p.cluster_name} ({p.state_name}) • BDE: {p.bde_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 text-sm">{p.monthly_kit_achievement_pct}%</span>
                    <div className="text-[10px] text-slate-500 font-semibold">{p.actual_kits} / {p.monthly_kit_goal} Kits</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Performers / Need Attention */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-wider">
            <FiTrendingDown size={16} /> Needs Attention / Underperforming
          </div>
          {lowPerformers.length === 0 ? (
            <div className="text-slate-400 text-xs italic py-2">No underperforming clusters found.</div>
          ) : (
            <div className="space-y-2">
              {lowPerformers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-xs">
                  <div>
                    <div className="font-extrabold text-slate-900">{p.franchisee_name}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {p.cluster_name} ({p.state_name}) • BDE: {p.bde_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-amber-700 text-sm">{p.monthly_kit_achievement_pct}%</span>
                    <div className="text-[10px] text-slate-500 font-semibold">{p.actual_kits} / {p.monthly_kit_goal} Kits</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 5.2: Franchisee Performance Table ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-sm">Franchisee Performance Matrix</h3>
          <span className="text-xs font-bold text-slate-500">{filteredRows.length} Franchisee Territories</span>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader text="Computing Real-Time Franchisee Performance..." />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FiBarChart2 size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No Records Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Franchisee Store</th>
                  <th className="px-4 py-3.5">Cluster & BDE</th>
                  <th className="px-4 py-3.5">EPC Goal</th>
                  <th className="px-4 py-3.5">EPC Actual</th>
                  <th className="px-4 py-3.5">Live EPC Goal</th>
                  <th className="px-4 py-3.5">Live Actual</th>
                  <th className="px-4 py-3.5">Monthly Kit Goal</th>
                  <th className="px-4 py-3.5">Actual Kits</th>
                  <th className="px-4 py-3.5 text-center">Achievement %</th>
                  <th className="px-4 py-3.5">Monthly Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    {/* Store */}
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-900">{row.franchisee_name}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{row.state_name}</div>
                    </td>

                    {/* Cluster & BDE */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{row.cluster_name}</div>
                      <div className="text-[11px] text-purple-600 font-semibold">BDE: {row.bde_name}</div>
                    </td>

                    {/* EPC Goal */}
                    <td className="px-4 py-3.5 font-bold text-slate-700">{row.epc_goal}</td>

                    {/* EPC Actual */}
                    <td className="px-4 py-3.5 font-extrabold text-blue-600">
                      {row.epc_actual} ({row.epc_achievement_pct}%)
                    </td>

                    {/* Live EPC Goal */}
                    <td className="px-4 py-3.5 font-bold text-slate-700">{row.live_epc_goal}</td>

                    {/* Live Actual */}
                    <td className="px-4 py-3.5 font-extrabold text-emerald-600">
                      {row.live_epc_actual} ({row.live_epc_achievement_pct}%)
                    </td>

                    {/* Monthly Kit Goal */}
                    <td className="px-4 py-3.5 font-bold text-slate-700">{row.monthly_kit_goal} Kits</td>

                    {/* Actual Kits */}
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{row.actual_kits} Kits</td>

                    {/* Achievement % */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                          row.monthly_kit_achievement_pct >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.monthly_kit_achievement_pct >= 75
                            ? 'bg-blue-100 text-blue-800'
                            : row.monthly_kit_achievement_pct >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {row.monthly_kit_achievement_pct}%
                      </span>
                    </td>

                    {/* Monthly Revenue */}
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-900">
                        ₹{(row.actual_revenue_this_month || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Goal: ₹{(row.monthly_revenue_goal || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
