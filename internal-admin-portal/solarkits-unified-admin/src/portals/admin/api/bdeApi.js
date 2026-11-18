/**
 * bdeApi.js
 *
 * API client methods for Admin BDE Management module.
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
const buildCleanQuery = (params = {}, uniqueId = 'ADM_BDE_MGMT', reqFor = 'view') => {
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

export const bdeApi = {
  // Dashboard stats
  getDashboardStats: async (uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.get(`${API_BASE}/bde/dashboard-stats?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  // List & Search BDEs
  listBdes: async (params = {}, uniqueId = 'ADM_BDE_MGMT') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/bde/list?${query}`, getHeaders());
    return res.data;
  },

  // Get BDE Detail
  getBdeDetail: async (id, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.get(`${API_BASE}/bde/detail/${id}?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  // Create BDE
  createBde: async (data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/create?unique_id=${uniqueId}&req_for=add`, data, getHeaders());
    return res.data;
  },

  // Update BDE
  updateBde: async (id, data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.put(`${API_BASE}/bde/update/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Upload KYC
  uploadKyc: async (id, data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/kyc/upload/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Review KYC (Verify / Reject)
  reviewKyc: async (id, data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.put(`${API_BASE}/bde/kyc/review/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Verify KYC helper alias
  verifyKyc: async (id, data = {}, uniqueId = 'ADM_BDE_MGMT') => {
    return bdeApi.reviewKyc(id, { action: 'verify', ...data }, uniqueId);
  },

  // Reject KYC helper alias
  rejectKyc: async (id, data = {}, uniqueId = 'ADM_BDE_MGMT') => {
    return bdeApi.reviewKyc(id, { action: 'reject', ...data }, uniqueId);
  },

  // Change Status (Activate, Suspend, Deactivate)
  changeStatus: async (id, data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.put(`${API_BASE}/bde/status/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Reset Login Credentials
  resetLogin: async (id, data = {}, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/reset-login/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Territory Assignment
  assignTerritory: async (data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/territory/assign?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  getTerritory: async (bdeId, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.get(`${API_BASE}/bde/territory/${bdeId}?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  removeTerritory: async (bdeId, assignmentId, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.delete(`${API_BASE}/bde/territory/${bdeId}/${assignmentId}?unique_id=${uniqueId}&req_for=delete`, getHeaders());
    return res.data;
  },

  // Plan Assignment
  assignPlans: async (data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/plans/assign?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  getPlans: async (bdeId, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.get(`${API_BASE}/bde/plans/${bdeId}?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  // Goal Assignment
  assignGoals: async (data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/goals/assign?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  getGoals: async (bdeId, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.get(`${API_BASE}/bde/goals/${bdeId}?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  // Onboarding Decision Permissions (EPC & Franchise Onboarding)
  updatePermissions: async (id, data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.put(`${API_BASE}/bde/permissions/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  // Activity History
  getActivityHistory: async (params = {}, uniqueId = 'ADM_BDE_MGMT') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/bde/activity-history?${query}`, getHeaders());
    return res.data;
  },

  // Fetch Active States & Districts (Enabled in Admin Location Settings)
  getStates: async (uniqueId = 'ADM_BDE_MGMT') => {
    try {
      const res = await axios.post(`${API_BASE}/geolocation/active-states?unique_id=${uniqueId}&req_for=view`, {}, getHeaders());
      return res.data;
    } catch (err) {
      try {
        const res = await axios.get(`${API_BASE}/geolocation/get-active-states`, getHeaders());
        return res.data;
      } catch (err2) {
        const res = await axios.get(`${API_BASE}/geolocation/get-states`, getHeaders());
        return res.data;
      }
    }
  },

  getDistricts: async (stateId, uniqueId = 'ADM_BDE_MGMT') => {
    if (!stateId) return { districts: [], data: [] };
    try {
      const res = await axios.post(`${API_BASE}/geolocation/active-districts?unique_id=${uniqueId}&req_for=view`, { state_id: stateId }, getHeaders());
      return res.data;
    } catch (err) {
      try {
        const res = await axios.get(`${API_BASE}/geolocation/get-active-districts?state_id=${stateId}`, getHeaders());
        return res.data;
      } catch (err2) {
        const res = await axios.get(`${API_BASE}/geolocation/get-districts?state_id=${stateId}`, getHeaders());
        return res.data;
      }
    }
  },

  // Fetch Franchisee Clusters for a State
  getClustersByState: async (stateId) => {
    if (!stateId) return { data: [], count: 0 };
    try {
      const res = await axios.get(`${API_BASE}/franchise-clusters/list?state_id=${stateId}`, getHeaders());
      return res.data;
    } catch (err) {
      console.error('Failed to fetch clusters for state:', err);
      return { data: [], count: 0 };
    }
  },

  // Fetch Master Franchisee Plans
  getFranchiseePlans: async () => {
    const res = await axios.get(`${API_BASE}/reseller-mgmt/plans/list?unique_id=RSL_PLAN&req_for=view`, getHeaders());
    return res.data;
  },

  // ── Step 2: BDE Leads, Attribution, Exceptions & Funnel ───────────────────
  listLeads: async (params = {}, uniqueId = 'ADM_BDE_MGMT') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/bde/leads/list?${query}`, getHeaders());
    return res.data;
  },

  getLeadDetail: async (id, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.get(`${API_BASE}/bde/leads/detail/${id}?unique_id=${uniqueId}&req_for=view`, getHeaders());
    return res.data;
  },

  reassignLead: async (id, data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/leads/reassign/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  listAttributedFranchisees: async (params = {}, uniqueId = 'ADM_BDE_MGMT') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/bde/leads/franchisees?${query}`, getHeaders());
    return res.data;
  },

  reassignFranchisee: async (id, data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/leads/franchisees/reassign/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  listTerritoryExceptions: async (params = {}, uniqueId = 'ADM_BDE_MGMT') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/bde/leads/territory-exceptions?${query}`, getHeaders());
    return res.data;
  },

  reviewTerritoryException: async (id, data, uniqueId = 'ADM_BDE_MGMT') => {
    const res = await axios.post(`${API_BASE}/bde/leads/territory-exceptions/review/${id}?unique_id=${uniqueId}&req_for=edit`, data, getHeaders());
    return res.data;
  },

  getConversionFunnel: async (params = {}, uniqueId = 'ADM_BDE_MGMT') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/bde/leads/conversion-funnel?${query}`, getHeaders());
    return res.data;
  },

  getPerformanceDashboard: async (params = {}, uniqueId = 'ADM_BDE_MGMT') => {
    const query = buildCleanQuery(params, uniqueId, 'view');
    const res = await axios.get(`${API_BASE}/bde/performance/dashboard?${query}`, getHeaders());
    return res.data;
  },
};
