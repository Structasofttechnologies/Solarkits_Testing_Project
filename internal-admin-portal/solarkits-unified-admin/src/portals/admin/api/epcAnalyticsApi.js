/**
 * epcAnalyticsApi.js
 * API Client for Admin & BDE Customer Store Behavior & EPC Profile Analytics
 */

import axios from 'axios';
import { authHeaderObj } from '../app/authHeader';

const ADMIN_API =
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/admin-api';

const headers = (extra = {}) => ({
  headers: { ...authHeaderObj(), ...extra },
});

const buildQuery = (params = {}) => {
  const clean = { unique_id: '00000000', req_for: 'view' };
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'undefined') {
      clean[k] = v;
    }
  });
  return new URLSearchParams(clean).toString();
};

export const epcAnalyticsApi = {
  /**
   * Fetch Store Activity Metrics, Abandonment Ratios, Repeat Ratios & EPC Directory
   */
  getBehaviorAnalytics: async (params = {}) => {
    const q = buildQuery(params);
    const res = await axios.get(`${ADMIN_API}/epc-analytics/behavior?${q}`, headers());
    return res.data?.data;
  },

  /**
   * Fetch Single EPC Behavioral Profile and Telemetry Detail
   */
  getEpcProfileDetail: async (id) => {
    const res = await axios.get(`${ADMIN_API}/epc-analytics/epc-profile/${id}`, headers());
    return res.data?.data;
  },

  /**
   * Update EPC Behavioral Profile (Status, Tier, Recovery Discount, Notes, Assigned BDE)
   */
  updateEpcBehavior: async (id, payload) => {
    try {
      const res = await axios.put(
        `${ADMIN_API}/epc-analytics/epc-profile/${id}/behavior`,
        payload,
        headers()
      );
      return res.data;
    } catch (err) {
      console.error('epcAnalyticsApi.updateEpcBehavior error:', err.message || err);
      throw err;
    }
  },
};

