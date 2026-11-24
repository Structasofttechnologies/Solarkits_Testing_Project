/**
 * mainDashboardApi.js
 * Centralized API client for SOLARKITS Main Admin Dashboard.
 */

import axios from 'axios';
import { authHeaderObj } from '../app/authHeader';

const rawApiUrl =
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/admin-api';

const API_BASE = `${rawApiUrl.replace(/\/+$/, '')}/main-dashboard`;

const cleanQuery = (params = {}) => {
  const clean = {};
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'undefined') {
      clean[k] = v;
    }
  });
  return new URLSearchParams(clean).toString();
};

const getReq = async (endpoint, params = {}) => {
  const q = cleanQuery(params);
  const url = `${API_BASE}/${endpoint}${q ? `?${q}` : ''}`;
  const res = await axios.get(url, {
    headers: authHeaderObj(),
    timeout: 15000,
  });
  return res.data;
};

export const mainDashboardApi = {
  // 1. Master filter options (States, Districts, EPC Types, BDEs, Kits, Campaigns)
  getBootstrap: async () => {
    return getReq('bootstrap');
  },

  // 2. Overview 14 KPI Cards (Current vs Previous + % change)
  getOverviewKpis: async (params = {}) => {
    return getReq('overview', params);
  },

  // 3. Website Performance
  getWebsitePerformance: async (params = {}) => {
    return getReq('website-performance', params);
  },

  // 4. Enquiry Funnel
  getEnquiryFunnel: async (params = {}) => {
    return getReq('enquiry-funnel', params);
  },

  // 5. EPC Network
  getEpcNetwork: async (params = {}) => {
    return getReq('epc-network', params);
  },

  // 6. Sales Pipeline
  getSalesPipeline: async (params = {}) => {
    return getReq('sales-pipeline', params);
  },

  // 7. Conversion Analytics (Ratios + Verification Payloads)
  getConversionAnalytics: async (params = {}) => {
    return getReq('conversions', params);
  },

  // 8. Kit Potential & Demand
  getKitDemand: async (params = {}) => {
    return getReq('kit-demand', params);
  },

  // 9. Geography Analytics & Map Data
  getGeographyAnalytics: async (params = {}) => {
    return getReq('geography', params);
  },

  // 9B. Franchise Cluster Geography Analytics & Map Data
  getClusterGeographyAnalytics: async (params = {}) => {
    return getReq('cluster-geography', params);
  },

  // 10. Revenue & Margin
  getRevenueMargin: async (params = {}) => {
    return getReq('revenue-margin', params);
  },

  // 11. Campaign Performance
  getCampaignPerformance: async (params = {}) => {
    return getReq('campaign-performance', params);
  },

  // 12. In-Page Detailed Records Drill-Down
  getDrillDownRecords: async (params = {}) => {
    return getReq('drill-down', params);
  },

  // 13. Insights & Suggestive AI
  getInsightsAi: async (params = {}) => {
    return getReq('insights-ai', params);
  },
};
