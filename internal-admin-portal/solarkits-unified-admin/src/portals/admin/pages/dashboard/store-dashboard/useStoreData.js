/**
 * useStoreData.js
 * State, Calculations, Rankings & Real-Time API Client for Store Analytics Dashboard
 * Connected to live database records via /admin-api/store-dashboard/analytics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { storeDashboardApi } from './storeDashboardApi';

const initialStoreFilters = {
  dateRange: 'last_30_days',
  state: 'all',
  district: 'all',
  pincode: '',
  kitType: 'all',
  kitCategory: 'all',
  orderType: 'all',
  industryType: 'all',
  orderOrigin: 'all',
  storeType: 'all',
  franchisee: 'all',
  bde: 'all',
  directorStore: 'all',
  epcType: 'all',
  profitMin: '',
  profitMax: '',
  revenueMin: '',
  revenueMax: '',
  orderStatus: 'all',
  customerStatus: 'all',
  cohortMonth: 'all',
};

export function useStoreData() {
  const [filters, setFilters] = useState(initialStoreFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Profitability Ranking Toggle: 'profit_amount' | 'profit_margin' | 'revenue'
  const [activeRankType, setActiveRankType] = useState('profit_amount');

  // Active EPC definition configuration
  const [epcActiveDaysWindow, setEpcActiveDaysWindow] = useState(30);

  // Real Database Analytics Data from Backend
  const [storeData, setStoreData] = useState(null);

  // Meta Options for Filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [kits, setKits] = useState([]);
  const [bdeList, setBdeList] = useState([]);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'state' && value !== prev.state) {
        next.district = 'all';
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialStoreFilters);
  }, []);

  // Fetch Meta (States, Kits, BDEs)
  useEffect(() => {
    async function loadMeta() {
      try {
        const [stRes, ktRes, bdeRes] = await Promise.allSettled([
          storeDashboardApi.getActiveStates(),
          storeDashboardApi.getSolarKits(),
          storeDashboardApi.getBdes(),
        ]);
        if (stRes.status === 'fulfilled' && stRes.value) {
          const s = Array.isArray(stRes.value.data) ? stRes.value.data : (Array.isArray(stRes.value) ? stRes.value : []);
          setStates(s);
        }
        if (ktRes.status === 'fulfilled' && ktRes.value) {
          const k = Array.isArray(ktRes.value.data) ? ktRes.value.data : (Array.isArray(ktRes.value) ? ktRes.value : []);
          setKits(k);
        }
        if (bdeRes.status === 'fulfilled' && bdeRes.value) {
          const b = Array.isArray(bdeRes.value.data) ? bdeRes.value.data : (Array.isArray(bdeRes.value) ? bdeRes.value : []);
          setBdeList(b);
        }
      } catch (err) {
        console.warn('Meta load note:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Districts when state changes
  useEffect(() => {
    if (filters.state && filters.state !== 'all') {
      storeDashboardApi.getDistrictsByState(filters.state).then((res) => {
        if (res) {
          const d = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
          setDistricts(d);
        }
      }).catch(() => setDistricts([]));
    } else {
      setDistricts([]);
    }
  }, [filters.state]);

  // Main Live Store Analytics Fetcher
  const fetchStoreData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeDashboardApi.getStoreAnalytics({
        ...filters,
        epcActiveDaysWindow,
      });

      if (res && res.status === 'success' && res.data) {
        setStoreData(res.data);
      } else {
        setStoreData(null);
        if (res && res.message) {
          setError(res.message);
        } else if (!res) {
          setError('Backend API is starting or initializing. Please retry in a moment.');
        }
      }
    } catch (err) {
      console.error('Store analytics fetch error:', err);
      setError(err.message || 'Failed to fetch store analytics');
    } finally {
      setLoading(false);
    }
  }, [filters, epcActiveDaysWindow]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData, refreshKey]);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // C. REVENUE, PROFIT & KIT SALES ANALYTICS (Real DB Data)
  // ─────────────────────────────────────────────────────────────────────────────
  const financialMetrics = useMemo(() => {
    if (!storeData?.financialMetrics) {
      return {
        totalRev: '₹0',
        totalProfit: '₹0',
        profitMarginPct: '0.0%',
        totalKitsSold: 0,
        aov: '₹0',
        avgRevPerKit: '₹0',
        kitTableData: [],
        rankedKits: [],
        byOrderType: {
          looseQuantity: { kitsSold: 0, revenue: '₹0', profit: '₹0', margin: '0%' },
          poOrder: { kitsSold: 0, revenue: '₹0', profit: '₹0', margin: '0%' },
        },
        byOrderOrigin: [],
      };
    }

    const fm = storeData.financialMetrics;
    const kitTableData = fm.kitTableData || [];

    // Profitability Rankings (3 Separate Ranking Algorithms computed on live records)
    const rankedKits = [...kitTableData].sort((a, b) => {
      if (activeRankType === 'profit_margin') {
        return (b.profitMarginPct || 0) - (a.profitMarginPct || 0);
      }
      if (activeRankType === 'revenue') {
        return (b.revenue || 0) - (a.revenue || 0);
      }
      // default: profit_amount
      return (b.grossProfit || 0) - (a.grossProfit || 0);
    });

    return {
      ...fm,
      rankedKits,
    };
  }, [storeData, activeRankType]);

  // ─────────────────────────────────────────────────────────────────────────────
  // D. BEST-SELLING KITS BY AREA (Real DB Data)
  // ─────────────────────────────────────────────────────────────────────────────
  const bestSellingByArea = useMemo(() => {
    return storeData?.bestSellingByArea || {
      summary: {
        bestSellingState: 'N/A',
        bestSellingDistrict: 'N/A',
        bestSellingPincode: 'N/A',
        highestRevenueArea: 'N/A',
        highestProfitArea: 'N/A',
        mostFrequentKit: 'N/A',
        fastestGrowingKit: 'N/A',
        popularByOrigin: 'N/A',
      },
      areaTable: [],
    };
  }, [storeData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // E. AREA BUSINESS POTENTIAL & OPPORTUNITY GAP (Real Historical Data)
  // ─────────────────────────────────────────────────────────────────────────────
  const areaPotentialData = useMemo(() => {
    return storeData?.areaPotentialData || {
      methodology: {
        note: 'Distinguishes measured historical sales from estimated potential opportunity.',
        basis: 'Historical quote & order demand, EPC network, Franchisee coverage, and rooftop capacity potential.',
      },
      areas: [],
    };
  }, [storeData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // F. FRANCHISEE STORE ANALYTICS (Real DB Records)
  // ─────────────────────────────────────────────────────────────────────────────
  const franchiseeAnalytics = useMemo(() => {
    return storeData?.franchiseeAnalytics || {
      totalStores: 0,
      activeStores: 0,
      inactiveStores: 0,
      newStores: 0,
      companyStores: 0,
      storesByType: [],
      storeList: [],
    };
  }, [storeData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // G. SOLAR EPC ANALYTICS (Real DB Records)
  // ─────────────────────────────────────────────────────────────────────────────
  const solarEpcAnalytics = useMemo(() => {
    return storeData?.solarEpcAnalytics || {
      activeDefinition: `EPC is active if activity recorded within ${epcActiveDaysWindow} days.`,
      totalEpcs: 0,
      activeEpcs: 0,
      inactiveEpcs: 0,
      newOnboardedEpcs: 0,
      epcsWithQuotes: 0,
      epcsWithPos: 0,
      epcsConvertedToOrders: 0,
      epcsWithRepeatOrders: 0,
      epcsNoRecentActivity: 0,
      epcPerformance: [],
    };
  }, [storeData, epcActiveDaysWindow]);

  // ─────────────────────────────────────────────────────────────────────────────
  // H. EPC QUOTES, PO RAISED & CONVERSION RATIO (Real DB Funnel)
  // ─────────────────────────────────────────────────────────────────────────────
  const conversionFunnel = useMemo(() => {
    return storeData?.conversionFunnel || {
      totalQuotesGenerated: 0,
      totalQuotesSubmitted: 0,
      quotesConvertedToOrders: 0,
      quotesNotConverted: 0,
      quoteToOrderRatio: '0.0%',
      totalPoOrdersRaised: 0,
      totalPoOrdersApproved: 0,
      totalPoOrdersCompleted: 0,
      poConversionRatio: '0.0%',
      totalLooseQuantityOrders: 0,
      looseQuantityConversionRatio: '0.0%',
      byKitType: [],
      cohorts: [],
    };
  }, [storeData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // I. CUSTOMER STORE BEHAVIOR ANALYTICS (Real Database Activity)
  // ─────────────────────────────────────────────────────────────────────────────
  const customerBehavior = useMemo(() => {
    return storeData?.customerBehavior || {
      totalStoreVisits: 0,
      uniqueVisitors: 0,
      loggedInUsers: 0,
      kitCardViews: 0,
      datasheetDownloads: 0,
      addToCartEvents: 0,
      checkoutInitiated: 0,
      ordersPlaced: 0,
      abandonedCarts: 0,
      cartAbandonmentRatio: '0.0%',
      repeatOrderRatio: '0.0%',
      avgDaysBetweenRepeatOrders: 0,
      mostAbandonedKits: [],
      mostAbandonedAreas: [],
    };
  }, [storeData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // J. RECENT TRANSACTION ORDERS FOR DRILL-DOWN LEDGER
  // ─────────────────────────────────────────────────────────────────────────────
  const recentOrders = useMemo(() => {
    return storeData?.recentOrders || [];
  }, [storeData]);

  return {
    filters,
    setFilter,
    resetFilters,
    loading,
    error,
    refetch,

    // Profitability Ranking Toggle
    activeRankType,
    setActiveRankType,

    // EPC active window
    epcActiveDaysWindow,
    setEpcActiveDaysWindow,

    // Data Sections
    financialMetrics,
    bestSellingByArea,
    areaPotentialData,
    franchiseeAnalytics,
    solarEpcAnalytics,
    conversionFunnel,
    customerBehavior,
    recentOrders,

    // Reference options
    states,
    districts,
    kits,
    bdeList,
  };
}
