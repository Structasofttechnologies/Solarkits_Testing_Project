/**
 * storeDashboardApi.js
 * API Client for Admin Store & Market Analytics Dashboard
 */

import axios from 'axios';
import { authHeaderObj } from '../../../app/authHeader';

const ADMIN_API = import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';

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

export const storeDashboardApi = {
  // ── 0. Central Store & Market Analytics API (Real DB with Auto-Retry) ───────
  getStoreAnalytics: async (params = {}, retries = 2) => {
    const q = buildQuery(params, '00000000', 'view');
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await axios.get(`${ADMIN_API}/store-dashboard/analytics?${q}`, headers());
        return res.data;
      } catch (err) {
        if (attempt < retries && (err.code === 'ERR_NETWORK' || !err.response)) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        console.warn('getStoreAnalytics notice:', err.message || err);
        return null;
      }
    }
  },

  // ── 1. Reseller / Store Analytics ──────────────────────────────────────────
  getStoreAnalyticsSummary: async () => {
    try {
      const res = await axios.get(
        `${ADMIN_API}/reseller-mgmt/analytics/dashboard?unique_id=RSL_ANALYTICS&req_for=view`,
        headers()
      );
      return res.data;
    } catch {
      return null;
    }
  },

  // ── 2. Franchisee Performance & Location Performance ────────────────────────
  getFranchiseePerformance: async (params = {}) => {
    try {
      const q = buildQuery(params, 'FPO_ANALYTICS', 'view');
      const res = await axios.get(`${ADMIN_API}/franchisee/performance/tracker?${q}`, headers());
      return res.data;
    } catch {
      return null;
    }
  },

  getLocationPerformance: async (params = {}) => {
    try {
      const q = buildQuery(params, 'FPO_ANALYTICS', 'view');
      const res = await axios.get(`${ADMIN_API}/franchisee/performance/location?${q}`, headers());
      return res.data;
    } catch {
      return null;
    }
  },

  // ── 3. Franchisee Stores List ──────────────────────────────────────────────
  getFranchiseeStores: async (params = {}) => {
    try {
      const q = buildQuery(params, 'ADM_RESELLER', 'view');
      const res = await axios.get(`${ADMIN_API}/reseller-mgmt/list?${q}`, headers());
      return res.data;
    } catch {
      return null;
    }
  },

  // ── 4. Solar EPCs & BDEs ───────────────────────────────────────────────────
  getSolarEpcs: async (params = {}) => {
    try {
      const q = buildQuery(params, 'ADM_EPC', 'view');
      const res = await axios.get(`${ADMIN_API}/epcs?${q}`, headers());
      return res.data;
    } catch {
      return null;
    }
  },

  getEpcBuyingAnalytics: async (epcId, params = {}) => {
    try {
      const q = buildQuery(params, '00000000', 'view');
      const res = await axios.get(`${ADMIN_API}/epc-analytics/epc-buying-analytics/${epcId}?${q}`, headers());
      return res.data;
    } catch (err) {
      console.warn('getEpcBuyingAnalytics error:', err.message || err);
      return null;
    }
  },

  updateEpcType: async (epcId, epcTypeId) => {
    try {
      const res = await axios.put(
        `${ADMIN_API}/epc-analytics/epc-profile/${epcId}/epc-type`,
        { epc_type_id: epcTypeId },
        headers()
      );
      return res.data;
    } catch (err) {
      console.warn('updateEpcType error:', err.message || err);
      return null;
    }
  },

  getActiveEpcTypes: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/epc-types/active`, headers());
      return res.data;
    } catch (err) {
      console.warn('getActiveEpcTypes error:', err.message || err);
      return null;
    }
  },

  getBdes: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view`, headers());
      return res.data;
    } catch {
      return null;
    }
  },

  // ── 5. Solar Kits & Combo Kits ─────────────────────────────────────────────
  getSolarKits: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/solar-kits/get-kits?unique_id=ADM_SOLAR_KITS&req_for=view`, headers());
      return res.data;
    } catch {
      return null;
    }
  },

  getComboKits: async () => {
    try {
      const res = await axios.get(`${ADMIN_API}/combo-kits?unique_id=ADM_SOLAR_KITS&req_for=view`, headers());
      return res.data;
    } catch {
      return null;
    }
  },

  // ── 6. Geolocation ─────────────────────────────────────────────────────────
  getActiveStates: async (retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await axios.get(`${ADMIN_API}/geolocation/get-active-states`, headers());
        return res.data;
      } catch (err) {
        if (attempt < retries && (err.code === 'ERR_NETWORK' || !err.response)) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        return null;
      }
    }
  },

  getDistrictsByState: async (stateId) => {
    try {
      const res = await axios.get(`${ADMIN_API}/geolocation/districts/${stateId}`, headers());
      return res.data;
    } catch {
      return null;
    }
  },
};

