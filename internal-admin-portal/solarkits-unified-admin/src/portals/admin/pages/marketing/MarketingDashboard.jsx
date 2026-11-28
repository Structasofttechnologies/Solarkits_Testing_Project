import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaChartLine,
  FaEnvelope,
  FaWhatsapp,
  FaUsers,
  FaFunnelDollar,
  FaBullhorn,
  FaMousePointer,
  FaCheckCircle,
  FaArrowRight,
  FaPlus,
  FaCog,
  FaFilter,
  FaSyncAlt,
  FaMapMarkedAlt,
  FaCoins,
  FaGift,
  FaCopy,
  FaCheck,
  FaTimes,
  FaTag,
  FaWarehouse,
  FaClock,
  FaShieldAlt,
  FaTrophy,
  FaMedal,
  FaPercentage,
  FaBuilding,
  FaChartBar,
  FaSlidersH,
  FaLayerGroup
} from 'react-icons/fa';
import { MdTrendingUp, MdVisibility } from 'react-icons/md';
import IndiaCampaignMap from './IndiaCampaignMap';
import SegmentGroupAnalyticsPage from './SegmentGroupAnalyticsPage';
import {
  fetchLiveActiveStates,
  fetchLiveClusters,
  fetchLiveQueueStatus,
  toggleLiveCoupon,
  fetchMarketingDashboardAnalytics
} from './services/marketingDataService';
import { marketingHttp } from './services/marketingApi';

const EMPTY_DASHBOARD_DATA = {
  summary: {
    totalCampaigns: 0,
    activeCampaigns: 0,
    successfulCampaignsCount: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalRead: 0,
    totalClicks: 0,
    totalVisits: 0,
    totalLeads: 0,
    totalQualified: 0,
    totalConversions: 0,
    totalRevenue: 0,
    totalCost: 0,
    deliveryRate: '0.0',
    clickRate: '0.0',
    leadConversionRate: '0.0',
    qualifiedLeadRate: '0.0',
    salesConversionRate: '0.0',
    roi: '0.0',
    totalEpcs: 0,
    buyerEpcs: 0,
    verifiedEpcs: 0,
    registeredEpcs: 0,
    activeCouponsCount: 0,
    totalCouponsCount: 0,
    activeClustersCount: 0,
    activeStatesCount: 0,
    segmentGroupsCount: 0,
    segmentLeadsUploaded: 0,
    segmentRegistered: 0,
    segmentVerified: 0,
    segmentBuyers: 0,
    segmentRevenueInr: 0
  },
  channels: {
    email: { sent: 0, delivered: 0, read: 0, clicks: 0, visits: 0, leads: 0, conversions: 0, failed: 0 },
    whatsapp: { sent: 0, delivered: 0, read: 0, clicks: 0, visits: 0, leads: 0, conversions: 0, failed: 0 }
  },
  funnel: [],
  campaignsRanking: [],
  couponsList: [],
  epcTerritoryPerformance: []
};

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState('analytics'); // 'analytics' | 'segment-analytics' | 'map'
  const [queueStatus, setQueueStatus] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Live dynamic states & clusters from MongoDB
  const [liveStates, setLiveStates] = useState([]);
  const [liveClusters, setLiveClusters] = useState([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchLiveActiveStates(), fetchLiveClusters(), fetchLiveQueueStatus()]).then(([sList, cList, qStat]) => {
      if (!isMounted) return;
      if (Array.isArray(sList)) setLiveStates(sList);
      if (Array.isArray(cList)) setLiveClusters(cList);
      if (qStat) setQueueStatus(qStat);
    }).catch((err) => console.warn('Dashboard metadata notice:', err.message));
    return () => { isMounted = false; };
  }, []);

  // Global Dashboard Filters
  const [filterState, setFilterState] = useState('ALL');
  const [filterCluster, setFilterCluster] = useState('ALL');
  const [filterEpcType, setFilterEpcType] = useState('ALL');
  const [filterChannel, setFilterChannel] = useState('ALL');

  const [data, setData] = useState(EMPTY_DASHBOARD_DATA);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [res, qStat] = await Promise.all([
        marketingHttp.get('/analytics'),
        fetchLiveQueueStatus()
      ]);
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
      if (qStat) setQueueStatus(qStat);
    } catch (err) {
      console.warn('Analytics load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const s = data.summary || {};

  // Rank Sorted Campaigns
  const rankedCampaigns = useMemo(() => {
    const list = [...(data.campaignsRanking || [])];
    list.sort((a, b) => (b.revenue || b.sent || 0) - (a.revenue || a.sent || 0));

    return list.filter((item) => {
      const matchesState = filterState === 'ALL' || !item.state || (item.state || '').toLowerCase() === filterState.toLowerCase();
      const matchesCluster = filterCluster === 'ALL' || !item.cluster || (item.cluster || '').toLowerCase().includes(filterCluster.toLowerCase());
      const matchesChannel = filterChannel === 'ALL' || item.channel === filterChannel;
      return matchesState && matchesCluster && matchesChannel;
    });
  }, [data.campaignsRanking, filterState, filterCluster, filterChannel]);

  // Filtered Territory Performance
  const filteredTerritories = useMemo(() => {
    const list = [...(data.epcTerritoryPerformance || [])];
    return list.filter((item) => {
      const matchesState = filterState === 'ALL' || (item.state || '').toLowerCase() === filterState.toLowerCase();
      const matchesCluster = filterCluster === 'ALL' || (item.cluster || '').toLowerCase().includes(filterCluster.toLowerCase());
      const matchesType = filterEpcType === 'ALL' || item.dominantType === filterEpcType;
      return matchesState && matchesCluster && matchesType;
    });
  }, [data.epcTerritoryPerformance, filterState, filterCluster, filterEpcType]);

  // Filtered Coupons
  const displayCoupons = useMemo(() => {
    return data.couponsList || [];
  }, [data.couponsList]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCouponToggle = async (couponId) => {
    try {
      await toggleLiveCoupon(couponId);
      await fetchAnalytics();
    } catch (err) {
      console.warn('Toggle coupon notice:', err.message);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* ── Top Header & Fast Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaBullhorn className="w-3.5 h-3.5" />
            <span>SOLARKITS Marketing & Conversion Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Marketing Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor real-time omnichannel campaigns, EPC lead generation, website UTM attribution, and territory sales targets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Queue Pill */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs flex items-center gap-2 border border-slate-700 shadow-xs">
            <FaCoins className="text-amber-400" />
            <span>Dispatch Queue:</span>
            <strong className="text-emerald-400">{queueStatus?.stats?.totalSent || 0} Sent</strong>
            <span className="text-slate-400">
              • {queueStatus?.pendingInQueue || 0} Pending • {queueStatus?.stats?.totalFailed || 0} Failed
            </span>
          </div>

          {/* Dashboard View Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap">
            <button
              onClick={() => setDashboardTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dashboardTab === 'analytics'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FaChartLine />
              <span>Performance Analytics</span>
            </button>
            <button
              onClick={() => setDashboardTab('segment-analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dashboardTab === 'segment-analytics'
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FaLayerGroup />
              <span>Segment Group Analytics</span>
            </button>
            <button
              onClick={() => setDashboardTab('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dashboardTab === 'map'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FaMapMarkedAlt />
              <span>Live India Campaign Map</span>
            </button>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300 shadow-xs"
            title="Refresh Data"
          >
            <FaSyncAlt className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/marketing-panel/create-campaign')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {dashboardTab === 'map' ? (
        <IndiaCampaignMap />
      ) : dashboardTab === 'segment-analytics' ? (
        <SegmentGroupAnalyticsPage embedded />
      ) : (
        <>
          {/* ── Executive Numbers Cards (100% Dynamic Live DB Metrics) ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            
            {/* 1. Active Campaigns */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-indigo-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Campaigns</span>
                <FaBullhorn className="text-indigo-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {s.activeCampaigns ?? 0} <span className="text-xs font-normal text-slate-400">/ {s.totalCampaigns ?? 0} Total</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <MdTrendingUp /> {s.totalSent ?? 0} Messages Dispatched
              </div>
            </div>

            {/* 2. Total EPC Database + Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-blue-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total EPC Database</span>
                <FaUsers className="text-blue-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {(s.totalEpcs ?? 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-bold">{(s.buyerEpcs ?? 0).toLocaleString('en-IN')} B</span> • 
                <span className="text-blue-600 font-bold">{(s.verifiedEpcs ?? 0).toLocaleString('en-IN')} V</span> • 
                <span className="text-amber-500 font-bold">{(s.registeredEpcs ?? 0).toLocaleString('en-IN')} R</span>
              </div>
            </div>

            {/* 3. Active Coupons */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Coupons</span>
                <FaGift className="text-amber-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {s.activeCouponsCount ?? 0} <span className="text-xs font-normal text-slate-400">/ {s.totalCouponsCount ?? 0}</span>
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                {displayCoupons.reduce((acc, c) => acc + (c.redemptionsCount || 0), 0).toLocaleString('en-IN')} Redemptions
              </div>
            </div>

            {/* 4. Completed Campaigns */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-emerald-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Completed Campaigns</span>
                <FaTrophy className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                {s.successfulCampaignsCount ?? 0} <span className="text-xs font-normal text-slate-400">Finished</span>
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                {s.deliveryRate ?? '0.0'}% Delivery • {s.totalFailed ?? 0} Failed
              </div>
            </div>

            {/* 5. Segment Groups Impact */}
            <div
              onClick={() => setDashboardTab('segment-analytics')}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-violet-200/80 dark:border-violet-800 shadow-xs hover:border-violet-500 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Segment Groups</span>
                <FaLayerGroup className="text-violet-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-violet-700 dark:text-violet-300">
                {(s.segmentLeadsUploaded || 0).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">Leads</span>
              </div>
              <div className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold mt-1">
                {s.segmentRegistered || 0} Reg • {s.segmentBuyers || 0} Buyers
              </div>
            </div>

            {/* 6. Active States & Clusters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-violet-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Clusters</span>
                <FaMapMarkedAlt className="text-violet-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {liveClusters.length || s.activeClustersCount || 0} <span className="text-xs font-normal text-slate-400">Clusters</span>
              </div>
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                Across {liveStates.length || s.activeStatesCount || 0} States
              </div>
            </div>

            {/* 7. Total Sales Booked */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-emerald-500/40 dark:border-emerald-600/40 shadow-xs bg-gradient-to-br from-emerald-50/30 to-white dark:from-emerald-950/20 dark:to-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Attributed Revenue</span>
                <FaFunnelDollar className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                ₹{((s.totalRevenue ?? 0) / 100000).toFixed(2)}L
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                {s.totalConversions ?? 0} Conversions • {s.totalClicks ?? 0} Clicks
              </div>
            </div>

          </div>

          {/* ── Global Filter Bar ── */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-200">
              <FaSlidersH className="text-indigo-600" />
              <span>Dashboard Filters:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Dynamic State Filter */}
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-hidden"
              >
                <option value="ALL">All States ({liveStates.length})</option>
                {liveStates.map(st => (
                  <option key={st._id || st.name || st} value={st.name || st}>
                    {st.name || st}
                  </option>
                ))}
              </select>

              {/* Dynamic Cluster Filter */}
              <select
                value={filterCluster}
                onChange={(e) => setFilterCluster(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-hidden"
              >
                <option value="ALL">All Clusters ({liveClusters.length})</option>
                {liveClusters.map(cl => {
                  const name = cl.cluster_name || cl.name;
                  return (
                    <option key={cl._id || cl.id || name} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>

              {/* EPC Category Filter */}
              <select
                value={filterEpcType}
                onChange={(e) => setFilterEpcType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-hidden"
              >
                <option value="ALL">All EPC Types</option>
                <option value="Buyer EPC">🟢 Buyer EPCs (Ordered)</option>
                <option value="Verified EPC">🔵 Verified EPCs (GSTIN OK)</option>
                <option value="Registered EPC">🟠 Registered EPCs (Awaiting GST)</option>
              </select>

              {/* Channel Filter */}
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-hidden"
              >
                <option value="ALL">All Channels</option>
                <option value="whatsapp">WhatsApp Only</option>
                <option value="email">Email Only</option>
                <option value="both">Omnichannel (Both)</option>
              </select>

              {(filterState !== 'ALL' || filterCluster !== 'ALL' || filterEpcType !== 'ALL' || filterChannel !== 'ALL') && (
                <button
                  onClick={() => {
                    setFilterState('ALL');
                    setFilterCluster('ALL');
                    setFilterEpcType('ALL');
                    setFilterChannel('ALL');
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FaTimes /> Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* ===================== SECTION 1: CAMPAIGNS PERFORMANCE RANKING HUB ===================== */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                  <FaTrophy />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Campaigns Performance Ranking Hub (Highest to Lowest)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live descending ranking of all running and completed campaigns based on conversions, revenue generated, and ROI.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/marketing-panel/campaigns')}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>View All Campaigns</span>
                <FaArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-3 pl-4">Rank</th>
                    <th className="py-3 px-3">Campaign & Objective</th>
                    <th className="py-3 px-3">Channel</th>
                    <th className="py-3 px-3">Messages Delivered</th>
                    <th className="py-3 px-3">Link Clicks</th>
                    <th className="py-3 px-3">Qualified Leads</th>
                    <th className="py-3 px-3">Kit Orders Converted</th>
                    <th className="py-3 px-3">Revenue Booked</th>
                    <th className="py-3 px-3">Conversion Rate</th>
                    <th className="py-3 px-3 pr-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {rankedCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-semibold">
                        No live campaigns found matching the active filters. Create your first campaign to see real-time ranking.
                      </td>
                    </tr>
                  ) : rankedCampaigns.map((camp, index) => {
                    const rankNum = index + 1;
                    return (
                      <tr key={camp._id || index} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-3 pl-4">
                          <div className="flex items-center gap-1.5 font-black text-sm">
                            {rankNum === 1 ? (
                              <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                                🥇 #1
                              </span>
                            ) : rankNum === 2 ? (
                              <span className="w-7 h-7 rounded-xl bg-slate-400/20 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-400/30">
                                🥈 #2
                              </span>
                            ) : rankNum === 3 ? (
                              <span className="w-7 h-7 rounded-xl bg-amber-700/20 text-amber-700 dark:text-amber-500 flex items-center justify-center font-bold text-xs border border-amber-700/30">
                                🥉 #3
                              </span>
                            ) : (
                              <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs">
                                #{rankNum}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs">{camp.name}</div>
                          <div className="text-[10px] text-slate-400">{camp.code} • {camp.objective}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            camp.channel === 'whatsapp'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : camp.channel === 'email'
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'bg-purple-500/10 text-purple-600'
                          }`}>
                            {camp.channel === 'whatsapp' ? <FaWhatsapp /> : camp.channel === 'email' ? <FaEnvelope /> : <FaBullhorn />}
                            {camp.channel === 'whatsapp' ? 'WhatsApp' : camp.channel === 'email' ? 'Email' : 'Omnichannel'}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-semibold">
                          {(camp.delivered || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-indigo-600">{(camp.clicks || 0).toLocaleString('en-IN')}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-blue-600">{(camp.leads || 0).toLocaleString('en-IN')}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-black text-emerald-600 text-xs">
                            {camp.conversions || 0} Kits
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                            ₹{((camp.revenue || 0) / 100000).toFixed(2)}L
                          </strong>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[11px]">
                            {camp.conversionRate || '0.0%'}
                          </span>
                        </td>

                        <td className="py-3 px-3 pr-4 text-right">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            camp.status === 'running'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : camp.status === 'completed'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          }`}>
                            {camp.status === 'running' ? '● Running' : camp.status === 'completed' ? '✓ Completed' : '⏱ Scheduled'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================== SECTION 2: ACTIVE COUPONS & DISCOUNT CODING HUB ===================== */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
                  <FaGift />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Active Coupons & Promotional Voucher Coding Hub
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live tracking of active promo discount codes, kit applicability, redemption counts, and generated wholesale revenue.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/marketing-panel/seasonal-coupons')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <FaPlus className="w-3 h-3" /> Create New Coupon Code
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayCoupons.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                  No coupon offers in OfferMaster yet. Click "Create New Coupon Code" to add one.
                </div>
              ) : (
                displayCoupons.map((coupon) => {
                  const isCopied = copiedCode === coupon.code;
                  return (
                    <div
                      key={coupon._id || coupon.code}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-mono font-black text-xs border border-amber-300 dark:border-amber-800">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                              title="Copy Promo Code"
                            >
                              {isCopied ? <FaCheck className="text-emerald-500 w-3 h-3" /> : <FaCopy className="w-3 h-3" />}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => coupon._id && handleCouponToggle(coupon._id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                              coupon.status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {coupon.status}
                          </button>
                        </div>

                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-0.5">{coupon.title}</h4>
                        <p className="text-[11px] text-slate-500 mb-2">{coupon.applicableKits}</p>

                        <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">Discount Benefit:</span>
                          <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{coupon.discount}</strong>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">Attributed Redemptions:</span>
                          <strong className="text-slate-900 dark:text-white font-bold">{coupon.redemptionsCount || 0} Orders</strong>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">Revenue Attributed:</span>
                          <strong className="text-emerald-600 font-extrabold">₹{((coupon.revenueGenerated || 0) / 100000).toFixed(2)}L</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ===================== SECTION 3: EPC LEADS & AREA-WISE ORDER CONVERSION SECTION ===================== */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                  <FaBuilding />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Territory EPC Leads & Area-wise Order Conversion Overview
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cluster-wise intelligence showing where registered EPCs reside, their order conversions, and success ratios.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/marketing-panel/audience')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <FaUsers className="w-3 h-3" /> Go to Audience Hub & Map
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-3 pl-4">Cluster / Territory</th>
                    <th className="py-3 px-3">State</th>
                    <th className="py-3 px-3">Assigned Super Depot</th>
                    <th className="py-3 px-3">Total EPCs</th>
                    <th className="py-3 px-3 text-emerald-600">Buyer EPCs</th>
                    <th className="py-3 px-3 text-blue-600">Verified EPCs</th>
                    <th className="py-3 px-3 text-amber-600">Registered EPCs</th>
                    <th className="py-3 px-3">Orders Placed</th>
                    <th className="py-3 px-3">Conversion Ratio</th>
                    <th className="py-3 px-3 pr-4 text-right">Dispatch Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {filteredTerritories.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-semibold">
                        No live cluster/territory EPC metrics match the selected filters.
                      </td>
                    </tr>
                  ) : filteredTerritories.map((item, idx) => {
                    const convNum = parseFloat(item.conversionRatio) || 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-3 pl-4">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              item.dominantType === 'Buyer EPC' ? 'bg-emerald-500' : (item.dominantType === 'Verified EPC' ? 'bg-blue-500' : 'bg-amber-500')
                            }`}></span>
                            <span>{item.cluster}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {item.state}
                        </td>

                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {item.warehouse}
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {(item.totalEpcs || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 font-black text-emerald-600">
                          {(item.buyerEpcs || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 font-semibold text-blue-600">
                          {(item.verifiedEpcs || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 font-semibold text-amber-600">
                          {(item.registeredEpcs || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3">
                          <strong className="text-slate-900 dark:text-white">{item.ordersPlaced} Kits</strong>
                        </td>

                        <td className="py-3 px-3">
                          <div className="w-28 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-indigo-600">{item.conversionRatio}</span>
                              <span className="text-slate-400">Target 25%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${convNum >= 20 ? 'bg-emerald-500' : (convNum >= 15 ? 'bg-indigo-500' : 'bg-amber-500')}`}
                                style={{ width: `${Math.min(convNum * 4, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 pr-4 text-right">
                          <button
                            onClick={() => navigate('/marketing-panel/create-campaign')}
                            className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            Target Area
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Access Marketing Navigation Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => navigate('/marketing-panel/campaigns')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FaBullhorn />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Campaign Management</h4>
              <p className="text-xs text-slate-500">Listing, tracking & live campaign execution</p>
            </div>

            <div
              onClick={() => navigate('/marketing-panel/email-settings')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FaEnvelope />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Email Configuration</h4>
              <p className="text-xs text-slate-500">SMTP accounts, signatures & templates</p>
            </div>

            <div
              onClick={() => navigate('/marketing-panel/whatsapp-settings')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FaWhatsapp />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">WhatsApp Business API</h4>
              <p className="text-xs text-slate-500">WABA numbers, templates & Cloud API tokens</p>
            </div>

            <div
              onClick={() => navigate('/marketing-panel/form-mapping')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FaMousePointer />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Website Form Tracking</h4>
              <p className="text-xs text-slate-500">UTM generation, forms mapping & CRM leads</p>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
