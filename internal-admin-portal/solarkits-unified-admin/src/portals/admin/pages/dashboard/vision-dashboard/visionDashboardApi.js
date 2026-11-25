/**
 * visionDashboardApi.js
 *
 * API client for the Admin Vision Dashboard.
 * All calls follow the same pattern as bdeApi.js:
 *   axios + authHeaderObj() + VITE_API_URL base.
 *
 * Permission code: VISION_DASHBOARD (falls back to 00000000)
 */

import axios from 'axios';
import { authHeaderObj } from '../../../app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const headers = (extra = {}) => ({
  headers: { ...authHeaderObj(), ...extra },
});

const buildQuery = (params = {}, uniqueId = '00000000', reqFor = 'view') => {
  const clean = { unique_id: uniqueId, req_for: reqFor };
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null') {
      clean[k] = v;
    }
  });
  return new URLSearchParams(clean).toString();
};

export const visionApi = {

  // ── Network Summary (KPI Cards) ────────────────────────────────────────────
  getNetworkSummary: async () => {
    const res = await axios.get(
      `${API_BASE}/reseller-mgmt/analytics/dashboard?unique_id=RSL_ANALYTICS&req_for=view`,
      headers()
    );
    return res.data;
  },

  // ── Franchisee List (drill-down, filter by state/district) ────────────────
  getFranchiseeList: async (params = {}) => {
    const q = buildQuery(params, 'ADM_RESELLER', 'view');
    const res = await axios.get(`${API_BASE}/reseller-mgmt/list?${q}`, headers());
    return res.data;
  },

  // ── Performance Tracker (goal vs achievement, per period) ─────────────────
  getPerformanceTracker: async (params = {}) => {
    const q = buildQuery(params, 'FPO_ANALYTICS', 'view');
    const res = await axios.get(`${API_BASE}/franchisee/performance/tracker?${q}`, headers());
    return res.data;
  },

  // ── Location Performance (grouped by state) ───────────────────────────────
  getLocationPerformance: async (params = {}) => {
    const q = buildQuery(params, 'FPO_ANALYTICS', 'view');
    const res = await axios.get(`${API_BASE}/franchisee/performance/location?${q}`, headers());
    return res.data;
  },

  // ── Single Franchisee Performance (6-month history) ───────────────────────
  getFranchiseePerformance: async (id) => {
    const res = await axios.get(
      `${API_BASE}/franchisee/performance/franchisee/${id}?unique_id=FPO_ANALYTICS&req_for=view`,
      headers()
    );
    return res.data;
  },

  // ── Kit Target Progress (per period) ──────────────────────────────────────
  getKitTargetProgress: async (params = {}) => {
    const q = buildQuery(params, 'FPO_TARGET', 'view');
    const res = await axios.get(`${API_BASE}/franchisee/kit-targets/progress?${q}`, headers());
    return res.data;
  },

  // ── Goal Progress List (admin view) ───────────────────────────────────────
  getGoalProgress: async (params = {}) => {
    const q = buildQuery(params, 'FPO_GOAL', 'view');
    const res = await axios.get(`${API_BASE}/franchisee/goals/progress?${q}`, headers());
    return res.data;
  },

  // ── Geolocation: Active States ─────────────────────────────────────────────
  getActiveStates: async () => {
    try {
      const res = await axios.get(`${API_BASE}/geolocation/get-active-states`, headers());
      return res.data;
    } catch (e) {
      const res = await axios.get(`${API_BASE}/geolocation/active-states`, headers());
      return res.data;
    }
  },

  // ── Geolocation: Active Districts ─────────────────────────────────────────
  getActiveDistricts: async (params = {}) => {
    const q = buildQuery(params, 'ADM_CLUSTER_SETUP', 'view');
    const res = await axios.get(`${API_BASE}/geolocation/get-active-districts?${q}`, headers());
    return res.data;
  },

  // ── Geolocation: Clusters by State ────────────────────────────────────────
  getClusters: async (state_id) => {
    const res = await axios.get(
      `${API_BASE}/geolocation/clusters/${state_id}?unique_id=ADM_CLUSTER_SETUP&req_for=view`,
      headers()
    );
    return res.data;
  },

  // ── Geolocation: All Active States (for filter dropdown) ──────────────────
  getAllStates: async () => {
    const res = await axios.get(
      `${API_BASE}/geolocation/get-active-states`,
      headers()
    );
    return res.data;
  },

  // ── Geolocation: Districts by State (GET /geolocation/districts/:state_id) ──
  getDistrictsByState: async (state_id) => {
    try {
      const res = await axios.get(
        `${API_BASE}/geolocation/districts/${state_id}`,
        headers()
      );
      return res.data;
    } catch (e) {
      const res = await axios.get(
        `${API_BASE}/geolocation/get-active-districts?state_id=${state_id}`,
        headers()
      );
      return res.data;
    }
  },

  // ── Geolocation: All districts of a state (all, not just active) ──────────
  getAllDistrictsByState: async (state_id) => {
    const res = await axios.get(
      `${API_BASE}/geolocation/districts/${state_id}`,
      headers()
    );
    return res.data;
  },

  // ── Warehouses: All ───────────────────────────────────────────────────────
  getWarehouses: async () => {
    const res = await axios.get(
      `${API_BASE}/warehouses/?unique_id=ADM_WAREHOUSES&req_for=view`,
      headers()
    );
    return res.data;
  },

  // ── Warehouses: By District ───────────────────────────────────────────────
  getWarehousesByDistrict: async (district_id) => {
    const res = await axios.get(
      `${API_BASE}/warehouses/district/${district_id}?unique_id=ADM_WAREHOUSES&req_for=view`,
      headers()
    );
    return res.data;
  },

  // ── Industry Types (public endpoint has no permission restriction) ───────
  getIndustryTypes: async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/industry-types/public/list`,
        headers()
      );
      return res.data;
    } catch (e) {
      const res = await axios.get(
        `${API_BASE}/industry-types/list?unique_id=ADM_PROJ_TYPES&req_for=view`,
        headers()
      );
      return res.data;
    }
  },

  // ── Full Project Catalog Hierarchy ────────────────────────────────────────
  getProjectHierarchy: async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/project-types/get-all-hierarchy?unique_id=ADM_PROJ_TYPES&req_for=view`,
        headers()
      );
      return res.data;
    } catch (e) {
      return { status: 'error', data: [] };
    }
  },

  // ── Project Categories (filtered by industry_type_id) ─────────────────────
  getProjectCategories: async (params = {}) => {
    const q = buildQuery(params, 'ADM_PROJ_TYPES', 'view');
    const res = await axios.get(`${API_BASE}/project-types/get-categories?${q}`, headers());
    return res.data;
  },

  // ── Project Subcategories (filtered by category_id) ───────────────────────
  getProjectSubcategories: async (params = {}) => {
    const q = buildQuery(params, 'ADM_PROJ_TYPES', 'view');
    const res = await axios.get(`${API_BASE}/project-types/get-subcategories?${q}`, headers());
    return res.data;
  },

  // ── System Types (subcategory type maps) ──────────────────────────────────
  getSystemTypes: async (params = {}) => {
    const q = buildQuery(params, 'ADM_PROJ_TYPES', 'view');
    const res = await axios.get(`${API_BASE}/project-types/get-subcategory-types?${q}`, headers());
    return res.data;
  },

  // ── Project Ranges (filtered by subcategory_type_id) ─────────────────────
  getProjectRanges: async (params = {}) => {
    const q = buildQuery(params, 'ADM_PROJ_TYPES', 'view');
    const res = await axios.get(`${API_BASE}/project-types/get-ranges?${q}`, headers());
    return res.data;
  },

  // ── Kits: Combo Kits & Solar Kits ────────────────────────────────────────
  getComboKits: async () => {
    try {
      const res = await axios.get(`${API_BASE}/combo-kits/`, headers());
      return res.data;
    } catch (e) {
      const res = await axios.get(`${API_BASE}/combo-kits/get-kits?unique_id=ADM_COMBO_KITS&req_for=view`, headers());
      return res.data;
    }
  },

  getSolarKits: async () => {
    try {
      const res = await axios.get(`${API_BASE}/solar-kits/get-kits?unique_id=ADM_SOLAR_KITS&req_for=view`, headers());
      return res.data;
    } catch (e) {
      return { status: 'error', data: [] };
    }
  },

  // ── FPO Orders (for kit sales aggregation) ────────────────────────────────
  getFpoOrders: async (params = {}) => {
    const q = buildQuery(params, 'FPO_PO', 'view');
    const res = await axios.get(`${API_BASE}/franchisee/po?${q}`, headers());
    return res.data;
  },

  // ── Franchisee PO Orders (reseller procurement) ───────────────────────────
  getResellerOrders: async (params = {}) => {
    const q = buildQuery(params, 'ADM_PO_ORDERS', 'view');
    const res = await axios.get(`${API_BASE}/reseller-mgmt/orders?${q}`, headers());
    return res.data;
  },

  // ── EPC Types (classification master with live usage counts) ─────────────
  getEpcTypes: async (params = {}) => {
    const q = buildQuery(params, 'ADM_EPC_TYPES', 'view');
    const res = await axios.get(
      `${API_BASE}/epc-types/list?${q}`,
      headers()
    );
    return res.data;
  },

  // ── EPC Accounts summary (for KPI count) ─────────────────────────────────
  getEpcAccountsSummary: async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/epcs/list?unique_id=ADM_EPC_MGMT&req_for=view&limit=1`,
        headers()
      );
      return res.data;
    } catch (e) {
      return { status: 'error', data: [] };
    }
  },

  // ── Reseller Onboarded EPC Buyers ─────────────────────────────────────────
  getResellerEpcBuyers: async (resellerId) => {
    try {
      const res = await axios.get(
        `${API_BASE}/reseller-mgmt/epc-buyers/list?reseller_id=${resellerId}&unique_id=ADM_RESELLER&req_for=view`,
        headers()
      );
      return res.data;
    } catch (e) {
      return { status: 'error', data: [] };
    }
  },
};
