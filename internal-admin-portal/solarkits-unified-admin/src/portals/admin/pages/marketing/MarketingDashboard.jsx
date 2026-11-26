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
  FaSlidersH
} from 'react-icons/fa';
import { MdTrendingUp, MdVisibility } from 'react-icons/md';
import IndiaCampaignMap from './IndiaCampaignMap';
import axios from 'axios';
import { authHeaderObj } from '../../app/authHeader';
import {
  API_BASE_URL,
  getQuotaState,
  rechargeQuota,
  getCouponsList,
  toggleCouponStatus,
  fetchLiveActiveStates,
  fetchLiveClusters,
  ALL_36_INDIAN_STATES
} from './services/marketingDataService';

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('analytics'); // 'analytics' | 'map'
  const [quota, setQuota] = useState(() => getQuotaState());
  const [coupons, setCoupons] = useState(() => getCouponsList());
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(5000);
  const [copiedCode, setCopiedCode] = useState(null);

  // Live dynamic states & clusters from Admin Panel
  const [liveStates, setLiveStates] = useState(ALL_36_INDIAN_STATES);
  const [liveClusters, setLiveClusters] = useState([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchLiveActiveStates(), fetchLiveClusters()]).then(([sList, cList]) => {
      if (!isMounted) return;
      if (Array.isArray(sList) && sList.length > 0) setLiveStates(sList);
      if (Array.isArray(cList) && cList.length > 0) setLiveClusters(cList);
    }).catch(err => console.warn('Dashboard filters notice:', err.message));
    return () => { isMounted = false; };
  }, []);

  // Global Dashboard Filters
  const [filterState, setFilterState] = useState('ALL');
  const [filterCluster, setFilterCluster] = useState('ALL');
  const [filterEpcType, setFilterEpcType] = useState('ALL');
  const [filterChannel, setFilterChannel] = useState('ALL');

  useEffect(() => {
    const handleUpdate = () => {
      setQuota(getQuotaState());
      setCoupons(getCouponsList());
    };
    window.addEventListener('solarkits-quota-updated', handleUpdate);
    return () => window.removeEventListener('solarkits-quota-updated', handleUpdate);
  }, []);

  const [data, setData] = useState({
    summary: {
      totalCampaigns: 8,
      activeCampaigns: 3,
      successfulCampaignsCount: 5,
      totalSent: 18450,
      totalDelivered: 17200,
      totalRead: 9840,
      totalClicks: 2680,
      totalVisits: 2420,
      totalLeads: 310,
      totalQualified: 145,
      totalConversions: 42,
      totalRevenue: 3450000,
      totalCost: 125000,
      deliveryRate: '93.2',
      clickRate: '15.6',
      leadConversionRate: '12.8',
      qualifiedLeadRate: '46.8',
      salesConversionRate: '29.0',
      roi: '2660.0',
      // Boss EPC breakdown
      totalEpcs: 14250,
      buyerEpcs: 2150,
      verifiedEpcs: 3420,
      registeredEpcs: 8680,
      activeCouponsCount: 6,
      totalCouponsCount: 8,
      activeClustersCount: 7,
      activeStatesCount: 4
    },
    channels: {
      email: { sent: 11200, delivered: 10450, read: 4180, clicks: 1120, visits: 980, leads: 115, conversions: 16 },
      whatsapp: { sent: 7250, delivered: 6750, read: 5660, clicks: 1560, visits: 1440, leads: 195, conversions: 26 }
    },
    funnel: [
      { stage: '1. Campaign Audience', count: 18450, desc: 'Targeted EPCs across selected clusters' },
      { stage: '2. Messages Delivered', count: 17200, desc: '93.2% successful delivery' },
      { stage: '3. Website & Kit Visits', count: 2420, desc: 'Unique campaign URL visits' },
      { stage: '4. Form Submissions', count: 310, desc: 'Enquiries, registrations & quote requests' },
      { stage: '5. Qualified Leads', count: 145, desc: 'Accepted by BDE/Sales team' },
      { stage: '6. Confirmed Conversions', count: 42, desc: 'Paid Kit orders & Franchisee ongoings' }
    ],
    campaignsRanking: [
      {
        _id: 'cmp-b1',
        name: 'Diwali 3kW EPC Wholesale Flash Sale',
        code: 'CMP-2026-DIWALI',
        channel: 'both',
        objective: 'Kit Sales & Repeat Orders',
        state: 'Maharashtra',
        cluster: 'Bhiwandi Central',
        status: 'running',
        delivered: 4850,
        clicks: 820,
        leads: 135,
        conversions: 24,
        revenue: 2143600,
        conversionRate: '32.4%',
        deliveryRate: '95.6%',
        roi: '1240%'
      },
      {
        _id: 'cmp-b2',
        name: 'Gujarat 5kW Commercial Subsidy Push',
        code: 'CMP-2026-GUJ5KW',
        channel: 'whatsapp',
        objective: 'Discount Coupon & Promotional Offer',
        state: 'Gujarat',
        cluster: 'Surat Cluster',
        status: 'running',
        delivered: 3420,
        clicks: 640,
        leads: 92,
        conversions: 16,
        revenue: 1428000,
        conversionRate: '28.8%',
        deliveryRate: '94.2%',
        roi: '950%'
      },
      {
        _id: 'cmp-b3',
        name: 'Maharashtra Inactive EPC Reactivation',
        code: 'CMP-2026-MHREACT',
        channel: 'email',
        objective: 'Inactive EPC Reactivation',
        state: 'Maharashtra',
        cluster: 'Pune Cluster',
        status: 'running',
        delivered: 2890,
        clicks: 390,
        leads: 58,
        conversions: 9,
        revenue: 803850,
        conversionRate: '21.5%',
        deliveryRate: '91.8%',
        roi: '720%'
      },
      {
        _id: 'cmp-b4',
        name: 'Surat Diamond Cluster Onboarding Drive',
        code: 'CMP-2026-SURAT',
        channel: 'whatsapp',
        objective: 'New EPC Registration & Sign-Up Drive',
        state: 'Gujarat',
        cluster: 'Surat Cluster',
        status: 'scheduled',
        delivered: 1950,
        clicks: 280,
        leads: 41,
        conversions: 5,
        revenue: 446585,
        conversionRate: '18.2%',
        deliveryRate: '93.5%',
        roi: '540%'
      },
      {
        _id: 'cmp-b5',
        name: 'Marwar Agricultural Solar Pump Launch',
        code: 'CMP-2026-MARWAR',
        channel: 'both',
        objective: 'Product Promotion & Awareness',
        state: 'Rajasthan',
        cluster: 'Jaipur Central',
        status: 'completed',
        delivered: 1640,
        clicks: 210,
        leads: 29,
        conversions: 3,
        revenue: 267950,
        conversionRate: '15.6%',
        deliveryRate: '89.4%',
        roi: '380%'
      },
      {
        _id: 'cmp-b6',
        name: 'Bengaluru Rooftop EPC Expansion Drive',
        code: 'CMP-2026-BLRROOF',
        channel: 'both',
        objective: 'Franchisee Store Visits',
        state: 'Karnataka',
        cluster: 'Bengaluru South',
        status: 'scheduled',
        delivered: 1400,
        clicks: 190,
        leads: 19,
        conversions: 2,
        revenue: 178634,
        conversionRate: '12.4%',
        deliveryRate: '92.1%',
        roi: '290%'
      }
    ],
    couponsList: [
      {
        code: 'DIWALI3KW',
        title: 'Diwali Special ₹5,000 Flat Off',
        discount: '₹5,000 Flat',
        type: 'flat',
        value: 5000,
        applicableKits: '3kW Solarkits DCR Combokit',
        redemptionsCount: 420,
        uniqueEpcsRedeemed: 310,
        revenueGenerated: 1875600,
        status: 'Active'
      },
      {
        code: 'SURATSUMMER',
        title: 'Surat Diamond Cluster Exclusive',
        discount: '8% Off',
        type: 'percentage',
        value: 8,
        applicableKits: 'All Commercial 5kW+ Kits',
        redemptionsCount: 285,
        uniqueEpcsRedeemed: 215,
        revenueGenerated: 1420000,
        status: 'Active'
      },
      {
        code: 'TOPCON5KW',
        title: 'TopCon Premium Bifacial Introductory',
        discount: '₹7,500 Flat',
        type: 'flat',
        value: 7500,
        applicableKits: '5kW Premium Bifacial Kit',
        redemptionsCount: 195,
        uniqueEpcsRedeemed: 148,
        revenueGenerated: 980000,
        status: 'Active'
      },
      {
        code: 'REACTIVATE2026',
        title: 'Welcome Back 60-Day Re-engagement',
        discount: '5% Extra Margin',
        type: 'percentage',
        value: 5,
        applicableKits: 'Any Rooftop Solar Combo Kit',
        redemptionsCount: 160,
        uniqueEpcsRedeemed: 130,
        revenueGenerated: 780000,
        status: 'Active'
      },
      {
        code: 'FESTIVE10',
        title: 'Festive Season Bulk Order Vouchers',
        discount: '10% Off',
        type: 'percentage',
        value: 10,
        applicableKits: 'Bulk Orders (5+ Kits)',
        redemptionsCount: 95,
        uniqueEpcsRedeemed: 82,
        revenueGenerated: 620000,
        status: 'Active'
      },
      {
        code: 'MAHAPUSH',
        title: 'Maharashtra State Depot Incentive',
        discount: '₹3,000 Flat',
        type: 'flat',
        value: 3000,
        applicableKits: '1kW & 2kW Residential DCR Kits',
        redemptionsCount: 85,
        uniqueEpcsRedeemed: 70,
        revenueGenerated: 340000,
        status: 'Active'
      }
    ],
    epcTerritoryPerformance: [
      {
        cluster: 'Bhiwandi Central',
        state: 'Maharashtra',
        warehouse: 'Bhiwandi Super Depot (WH-MH-01)',
        totalEpcs: 3840,
        buyerEpcs: 920,
        verifiedEpcs: 1450,
        registeredEpcs: 1470,
        ordersPlaced: 480,
        conversionRatio: '24.0%',
        dominantType: 'Buyer EPC'
      },
      {
        cluster: 'Pune Cluster',
        state: 'Maharashtra',
        warehouse: 'Pune South Facility',
        totalEpcs: 2650,
        buyerEpcs: 610,
        verifiedEpcs: 980,
        registeredEpcs: 1060,
        ordersPlaced: 320,
        conversionRatio: '23.0%',
        dominantType: 'Verified EPC'
      },
      {
        cluster: 'Surat Cluster',
        state: 'Gujarat',
        warehouse: 'Surat Central Hub',
        totalEpcs: 2180,
        buyerEpcs: 450,
        verifiedEpcs: 820,
        registeredEpcs: 910,
        ordersPlaced: 215,
        conversionRatio: '20.6%',
        dominantType: 'Buyer EPC'
      },
      {
        cluster: 'Ahmedabad Industrial',
        state: 'Gujarat',
        warehouse: 'Ahmedabad Industrial Hub',
        totalEpcs: 1940,
        buyerEpcs: 380,
        verifiedEpcs: 710,
        registeredEpcs: 850,
        ordersPlaced: 185,
        conversionRatio: '19.6%',
        dominantType: 'Verified EPC'
      },
      {
        cluster: 'Jaipur Central',
        state: 'Rajasthan',
        warehouse: 'Jaipur Regional Depot',
        totalEpcs: 1620,
        buyerEpcs: 260,
        verifiedEpcs: 490,
        registeredEpcs: 870,
        ordersPlaced: 110,
        conversionRatio: '16.0%',
        dominantType: 'Registered EPC'
      },
      {
        cluster: 'Bengaluru South',
        state: 'Karnataka',
        warehouse: 'Bengaluru Logistics Park',
        totalEpcs: 1240,
        buyerEpcs: 190,
        verifiedEpcs: 380,
        registeredEpcs: 670,
        ordersPlaced: 85,
        conversionRatio: '15.3%',
        dominantType: 'Verified EPC'
      },
      {
        cluster: 'Nagpur East',
        state: 'Maharashtra',
        warehouse: 'Nagpur Distribution Center',
        totalEpcs: 780,
        buyerEpcs: 110,
        verifiedEpcs: 240,
        registeredEpcs: 430,
        ordersPlaced: 48,
        conversionRatio: '14.1%',
        dominantType: 'Registered EPC'
      }
    ]
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/marketing/analytics`, {
        headers: authHeaderObj(),
        timeout: 15000
      });
      const json = res.data;
      if (json?.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.warn('Notice loading marketing analytics:', err.message);
      // Retain fallback data
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
    list.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));

    return list.filter(item => {
      const matchesState = filterState === 'ALL' || (item.state || '').toLowerCase() === filterState.toLowerCase();
      const matchesCluster = filterCluster === 'ALL' || (item.cluster || '').toLowerCase().includes(filterCluster.toLowerCase());
      const matchesChannel = filterChannel === 'ALL' || item.channel === filterChannel;
      return matchesState && matchesCluster && matchesChannel;
    });
  }, [data.campaignsRanking, filterState, filterCluster, filterChannel]);

  // Filtered Territory Performance
  const filteredTerritories = useMemo(() => {
    const list = [...(data.epcTerritoryPerformance || [])];
    return list.filter(item => {
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

  const handleQuickRecharge = () => {
    rechargeQuota(Number(rechargeAmount));
    setQuota(getQuotaState());
    setShowRechargeModal(false);
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
          {/* Live Quota Pill with Recharge Action */}
          <div className="flex items-center gap-1.5">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs flex items-center gap-2 border border-slate-700 shadow-xs">
              <FaCoins className="text-amber-400" />
              <span>Message Wallet:</span>
              <strong className="text-emerald-400">{(quota?.available ?? 0).toLocaleString('en-IN')} Available</strong>
              <span className="text-slate-400">/ {(quota?.totalQuota || quota?.total || 15000).toLocaleString('en-IN')}</span>
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
            >
              <FaPlus className="w-3 h-3" /> Recharge
            </button>
          </div>

          {/* Dashboard View Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
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
      ) : (
        <>
          {/* ── Executive Numbers Cards (Boss Requirement 3) ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* 1. Active Campaigns */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-indigo-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Campaigns</span>
                <FaBullhorn className="text-indigo-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {s.activeCampaigns || 3} <span className="text-xs font-normal text-slate-400">/ {s.totalCampaigns || 8} Total</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <MdTrendingUp /> Multi-Territory Live
              </div>
            </div>

            {/* 2. Total EPC Database + Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-blue-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total EPC Database</span>
                <FaUsers className="text-blue-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {(s.totalEpcs || 14250).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-bold">{(s.buyerEpcs || 2150).toLocaleString('en-IN')} B</span> • 
                <span className="text-blue-600 font-bold">{(s.verifiedEpcs || 3420).toLocaleString('en-IN')} V</span> • 
                <span className="text-amber-500 font-bold">{(s.registeredEpcs || 8680).toLocaleString('en-IN')} R</span>
              </div>
            </div>

            {/* 3. Active Coupons */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Coupons</span>
                <FaGift className="text-amber-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {s.activeCouponsCount || 6} <span className="text-xs font-normal text-slate-400">/ {s.totalCouponsCount || 8}</span>
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                1,240 Total Redemptions
              </div>
            </div>

            {/* 4. Successful Campaigns */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-emerald-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Successful Campaigns</span>
                <FaTrophy className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                {s.successfulCampaignsCount || 5} <span className="text-xs font-normal text-slate-400">Wins</span>
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                {s.salesConversionRate || '29.0'}% Sales Win Rate
              </div>
            </div>

            {/* 5. Active States & Clusters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-violet-500/50 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Clusters</span>
                <FaMapMarkedAlt className="text-violet-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {liveClusters.length || 8} <span className="text-xs font-normal text-slate-400">Clusters</span>
              </div>
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                Across {liveStates.length || 36} Indian States
              </div>
            </div>

            {/* 6. Total Sales Booked */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-emerald-500/40 dark:border-emerald-600/40 shadow-xs bg-gradient-to-br from-emerald-50/30 to-white dark:from-emerald-950/20 dark:to-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Sales Booked</span>
                <FaFunnelDollar className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                ₹{((s.totalRevenue || 3450000) / 100000).toFixed(2)}L
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                {s.totalConversions || 42} Commercial Kits
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
                  <option key={st.name || st} value={st.name || st}>
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
                <option value="ALL">All Clusters ({liveClusters.length || 8})</option>
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
                  {rankedCampaigns.map((camp, index) => {
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
                            {camp.conversionRate || '24.5%'}
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
              {displayCoupons.map((coupon) => {
                const isCopied = copiedCode === coupon.code;
                return (
                  <div
                    key={coupon.code}
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

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          coupon.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {coupon.status}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-0.5">{coupon.title}</h4>
                      <p className="text-[11px] text-slate-500 mb-2">{coupon.applicableKits}</p>

                      <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Discount Benefit:</span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{coupon.discount}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Total Redemptions:</span>
                        <strong className="text-slate-900 dark:text-white font-bold">{coupon.redemptionsCount || 0} Orders</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Revenue Generated:</span>
                        <strong className="text-emerald-600 font-extrabold">₹{((coupon.revenueGenerated || 0) / 100000).toFixed(2)}L</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">1 Voucher per GSTIN</span>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="text-xs text-amber-600 hover:underline font-bold cursor-pointer"
                      >
                        {isCopied ? '✓ Copied!' : 'Copy Code'}
                      </button>
                    </div>
                  </div>
                );
              })}
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
                  {filteredTerritories.map((item, idx) => {
                    const convNum = parseFloat(item.conversionRatio) || 15;
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

      {/* Quick Top-up Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaCoins className="text-amber-500 w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Top-Up Message Wallet</h3>
              </div>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Current Available Balance: <strong>{(quota?.available ?? 0).toLocaleString('en-IN')} Credits</strong>. Select or enter credit package to add immediately.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[2500, 5000, 10000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setRechargeAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    rechargeAmount === amt
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  +{amt.toLocaleString('en-IN')} Credits
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Custom Credit Amount
              </label>
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickRecharge}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm & Add Credits
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
