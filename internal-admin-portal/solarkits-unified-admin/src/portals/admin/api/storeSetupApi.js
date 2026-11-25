/**
 * storeSetupApi.js
 *
 * API client methods for Admin Store Setup, Operations, Expansion Plans & Performance.
 */

import axios from 'axios';
import { authHeaderObj } from '../app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = (extra = {}) => ({
  headers: {
    ...authHeaderObj(),
    ...extra,
  },
});

// Helper to filter out undefined, null, or empty string values from query params
const buildCleanQuery = (params = {}, uniqueId = 'ADM_STORE_SETUP', reqFor = 'view') => {
  const clean = {
    unique_id: uniqueId,
    req_for: reqFor,
  };
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null') {
      clean[k] = v;
    }
  });
  return new URLSearchParams(clean).toString();
};

export const storeSetupApi = {
  // Dashboard stats
  getDashboardStats: async (uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.get(`${API_BASE}/store-setup/dashboard-stats?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  // List & Search Store Setups
  listStoreSetups: async (params = {}, uniqueId = 'ADM_STORE_SETUP') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/store-setup/list?${query}`, getHeaders());
    return res.data;
  },

  // Get Store Setup Detail
  getStoreSetupDetail: async (id, uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.get(`${API_BASE}/store-setup/detail/${id}?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  // Assign Employee
  assignEmployee: async (id, data, uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.post(`${API_BASE}/store-setup/assign-employee/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Review Delay Request
  reviewDelayRequest: async (delayId, data, uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.put(`${API_BASE}/store-setup/delay/review/${delayId}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Review Final Verification
  reviewFinalVerification: async (id, data, uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.put(`${API_BASE}/store-setup/verification/review/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Start Operations
  startOperations: async (id, uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.post(`${API_BASE}/store-setup/start-operations/${id}?unique_id=${uniqueId}&req_for=edit`, {}, getHeaders());
    return res.data;
  },

  // Settings
  getSettings: async (uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.get(`${API_BASE}/store-setup/settings?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  updateSettings: async (data, uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.put(`${API_BASE}/store-setup/settings?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  syncActiveSetups: async (uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.post(`${API_BASE}/store-setup/settings/sync-active?unique_id=${uniqueId}&req_for=edit`, {}, getHeaders());
    return res.data;
  },

  // Expansion Plans
  listExpansionPlans: async (params = {}, uniqueId = 'ADM_STORE_SETUP') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/store-setup/expansion-plans/list?${query}`, getHeaders());
    return res.data;
  },

  createExpansionPlan: async (data, uniqueId = 'ADM_STORE_SETUP') => {
    const res = await axios.post(`${API_BASE}/store-setup/expansion-plans/create?unique_id=${uniqueId}&req_for=add`, data, getHeaders());
    return res.data;
  },

  // Performance Ranking
  getPerformanceRanking: async (params = {}, uniqueId = 'ADM_STORE_SETUP') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/store-setup/performance/ranking?${query}`, getHeaders());
    return res.data;
  },

  // List BDE State Coordinators for employee assignment dropdown
  listEmployees: async (params = {}) => {
    const query = buildCleanQuery(params, 'ADM_STORE_SETUP', 'view');
    try {
      const res = await axios.get(`${API_BASE}/store-setup/coordinators?${query}`, getHeaders());
      return res.data?.coordinators || res.data?.data || [];
    } catch (err) {
      try {
        const res = await axios.get(`${API_BASE}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view&limit=100`, getHeaders());
        return res.data?.data || [];
      } catch (err2) {
        return [];
      }
    }
  },

  listCoordinators: async (params = {}) => {
    const query = buildCleanQuery(params, 'ADM_STORE_SETUP', 'view');
    try {
      const res = await axios.get(`${API_BASE}/store-setup/coordinators?${query}`, getHeaders());
      return res.data?.coordinators || res.data?.data || [];
    } catch (err) {
      try {
        const res = await axios.get(`${API_BASE}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view&limit=100`, getHeaders());
        return res.data?.data || [];
      } catch (err2) {
        return [];
      }
    }
  },
};
