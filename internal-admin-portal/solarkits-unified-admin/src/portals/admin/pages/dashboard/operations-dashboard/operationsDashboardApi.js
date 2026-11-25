/**
 * operationsDashboardApi.js
 * API Client for Admin Operations Dashboard
 */

import axios from 'axios';
import { authHeaderObj } from '../../../app/authHeader';

const ADMIN_API = import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';
const OPERATION_API = import.meta.env.VITE_OPERATION_API_URL || 'http://localhost:5000/operation-management-api';
const WAREHOUSE_API = import.meta.env.VITE_WAREHOUSE_API_URL || 'http://localhost:5000/warehouse-api';

const headers = (extra = {}) => ({
  headers: { ...authHeaderObj(), ...extra },
});

const buildQuery = (params = {}, uniqueId = '00000000', reqFor = 'view') => {
  const clean = { unique_id: uniqueId, req_for: reqFor };
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'undefined') {
      clean[k] = v;
    }
  });
  return new URLSearchParams(clean).toString();
};

export const operationsApi = {
  // ── Dedicated Real-Time Operations Analytics Endpoint ────────────────────
  getOperationsAnalytics: async (params = {}) => {
    try {
      const q = buildQuery(params, 'ADM_OPS_DASH', 'view');
      const res = await axios.get(`${ADMIN_API}/operations-dashboard/analytics?${q}`, headers());
      return res.data;
    } catch (err) {
      console.warn('getOperationsAnalytics error:', err.message);
      return null;
    }
  },

  // ── 1. Order Approval & Stages ─────────────────────────────────────────────
  getOrderApprovalSummary: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/order-approvals/summary`, headers());
      return res.data;
    } catch (err) {
      console.warn('Fallback for order approval summary:', err.message);
      return null;
    }
  },

  getOrderApprovalQueue: async (params = {}) => {
    try {
      const q = buildQuery(params, 'ADM_ORDER_APPROVAL', 'view');
      const res = await axios.get(`${ADMIN_API}/order-approvals/queue?${q}`, headers());
      return res.data;
    } catch (err) {
      console.warn('Fallback for order approval queue:', err.message);
      return null;
    }
  },

  getWorkflowConfig: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/order-approvals/config`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  updateWorkflowConfig: async (configData) => {
    const res = await axios.put(`${ADMIN_API}/order-approvals/config`, configData, headers());
    return res.data;
  },

  submitApprovalAction: async (stage, id, payload) => {
    const res = await axios.post(`${ADMIN_API}/order-approvals/${stage}/${id}/action`, payload, headers());
    return res.data;
  },

  // ── 2. Delivery Management Analytics & Queue ──────────────────────────────
  getDeliveryAnalytics: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/delivery-management/analytics/dashboard`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  getDeliveryQueue: async (params = {}) => {
    try {
      const q = buildQuery(params);
      const res = await axios.get(`${ADMIN_API}/delivery-management/queue?${q}`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  getDeliveryTracking: async (params = {}) => {
    try {
      const q = buildQuery(params);
      const res = await axios.get(`${ADMIN_API}/delivery-management/tracking?${q}`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  // ── 3. Service & Replacement Tickets ──────────────────────────────────────
  getServiceTicketStats: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/service-tickets/stats`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  getServiceTicketList: async (params = {}) => {
    try {
      const q = buildQuery(params);
      const res = await axios.get(`${ADMIN_API}/service-tickets/list?${q}`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  // ── 4. Geolocation, Warehouses, Suppliers & Kit Types ─────────────────────
  getWarehouses: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/warehouses/?unique_id=ADM_WAREHOUSES&req_for=view`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  getSuppliers: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/suppliers?unique_id=ADM_SUPPLIERS&req_for=view`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  getFranchisees: async (params = {}) => {
    try {
      const q = buildQuery(params, 'ADM_RESELLER', 'view');
      const res = await axios.get(`${ADMIN_API}/reseller-mgmt/list?${q}`, headers());
      return res.data;
    } catch (err) {
      return null;
    }
  },

  getActiveStates: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/geolocation/get-active-states`, headers());
      return res.data;
    } catch (e) {
      try {
        const res2 = await axios.get(`${ADMIN_API}/geolocation/active-states`, headers());
        return res2.data;
      } catch (err) {
        return null;
      }
    }
  },

  getDistrictsByState: async (state_id) => {
    try {
      const res = await axios.get(`${ADMIN_API}/geolocation/districts/${state_id}`, headers());
      return res.data;
    } catch (e) {
      return null;
    }
  },

  getSolarKits: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/solar-kits/get-kits?unique_id=ADM_SOLAR_KITS&req_for=view`, headers());
      return res.data;
    } catch (e) {
      return null;
    }
  },
};

