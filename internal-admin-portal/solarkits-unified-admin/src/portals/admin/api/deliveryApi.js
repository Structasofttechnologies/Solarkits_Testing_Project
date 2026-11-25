/**
 * deliveryApi.js
 * API client methods for Delivery Management & Route Consolidation System.
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

const buildQuery = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '' && v !== 'null' && v !== 'undefined')
  );
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
};

export const deliveryApi = {
  // ── 1. Vehicle Master ──
  getVehicleMasters: async () => {
    const res = await axios.get(`${API_BASE}/delivery-management/vehicles/masters`, getHeaders());
    return res.data;
  },
  createVehicleMaster: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/vehicles/masters`, data, getHeaders());
    return res.data;
  },
  updateVehicleMaster: async (id, data) => {
    const res = await axios.put(`${API_BASE}/delivery-management/vehicles/masters/${id}`, data, getHeaders());
    return res.data;
  },
  deleteVehicleMaster: async (id) => {
    const res = await axios.delete(`${API_BASE}/delivery-management/vehicles/masters/${id}`, getHeaders());
    return res.data;
  },

  // ── 2. Service Providers ──
  getServiceProviders: async () => {
    const res = await axios.get(`${API_BASE}/delivery-management/providers`, getHeaders());
    return res.data;
  },
  createServiceProvider: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/providers`, data, getHeaders());
    return res.data;
  },
  updateServiceProvider: async (id, data) => {
    const res = await axios.put(`${API_BASE}/delivery-management/providers/${id}`, data, getHeaders());
    return res.data;
  },
  deleteServiceProvider: async (id) => {
    const res = await axios.delete(`${API_BASE}/delivery-management/providers/${id}`, getHeaders());
    return res.data;
  },

  // ── 3. Physical Fleet ──
  getFleetVehicles: async (params = {}) => {
    const res = await axios.get(`${API_BASE}/delivery-management/fleet/vehicles${buildQuery(params)}`, getHeaders());
    return res.data;
  },
  createFleetVehicle: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/fleet/vehicles`, data, getHeaders());
    return res.data;
  },
  updateFleetVehicle: async (id, data) => {
    const res = await axios.put(`${API_BASE}/delivery-management/fleet/vehicles/${id}`, data, getHeaders());
    return res.data;
  },

  // ── 4. ComboKit Weight Master ──
  getComboKitWeights: async () => {
    const res = await axios.get(`${API_BASE}/delivery-management/kits/weights`, getHeaders());
    return res.data;
  },
  upsertComboKitWeight: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/kits/weights/upsert`, data, getHeaders());
    return res.data;
  },
  getVehicleCapacityChart: async () => {
    const res = await axios.get(`${API_BASE}/delivery-management/kits/weights/capacity-chart`, getHeaders());
    return res.data;
  },
  getComboKits: async () => {
    try {
      const res = await axios.get(`${API_BASE}/combo-kits/india/get-kits?unique_id=ADM_COMBO_KITS&req_for=view&is_custom=false`, getHeaders());
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        return res.data.data;
      }
    } catch {
      // fallback
    }
    try {
      const res = await axios.get(`${API_BASE}/combo-kits`, getHeaders());
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        return res.data.data;
      }
    } catch {
      // fallback
    }
    try {
      const wRes = await axios.get(`${API_BASE}/delivery-management/kits/weights`, getHeaders());
      if (wRes.data?.data) {
        return wRes.data.data.map(w => ({
          _id: w.kit_id?._id || w.kit_id,
          name: w.kit_name || w.kit_id?.name || 'Combo Kit',
          capacity: w.capacity_kw || w.kit_id?.capacity || 0
        }));
      }
    } catch {}
    return [];
  },

  // ── 5. Delivery Cost Settings ──
  getBenchmarks: async (paramsOrWarehouseId = null) => {
    const params = typeof paramsOrWarehouseId === 'string' || !paramsOrWarehouseId
      ? { warehouse_id: paramsOrWarehouseId }
      : paramsOrWarehouseId;
    const res = await axios.get(`${API_BASE}/delivery-management/benchmarks${buildQuery(params)}`, getHeaders());
    return res.data;
  },
  createBenchmark: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/benchmarks`, data, getHeaders());
    return res.data;
  },
  updateBenchmark: async (id, data) => {
    const res = await axios.put(`${API_BASE}/delivery-management/benchmarks/${id}`, data, getHeaders());
    return res.data;
  },
  bulkCreateBenchmarks: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/benchmarks/bulk`, data, getHeaders());
    return res.data;
  },
  deleteBenchmark: async (id) => {
    const res = await axios.delete(`${API_BASE}/delivery-management/benchmarks/${id}`, getHeaders());
    return res.data;
  },
  bulkDeleteBenchmarks: async (ids) => {
    const res = await axios.post(`${API_BASE}/delivery-management/benchmarks/bulk-delete`, { ids }, getHeaders());
    return res.data;
  },

  // ── 6. Kit-Wise Rules ──
  getKitRules: async () => {
    const res = await axios.get(`${API_BASE}/delivery-management/kit-rules`, getHeaders());
    return res.data;
  },
  createKitRule: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/kit-rules`, data, getHeaders());
    return res.data;
  },
  updateKitRule: async (id, data) => {
    const res = await axios.put(`${API_BASE}/delivery-management/kit-rules/${id}`, data, getHeaders());
    return res.data;
  },
  deleteKitRule: async (id) => {
    const res = await axios.delete(`${API_BASE}/delivery-management/kit-rules/${id}`, getHeaders());
    return res.data;
  },
  bulkDeleteKitRules: async (ids) => {
    const res = await axios.post(`${API_BASE}/delivery-management/kit-rules/bulk-delete`, { ids }, getHeaders());
    return res.data;
  },

  // ── 7. Route & Consolidation Settings ──
  getRoutes: async (warehouseId = null) => {
    const res = await axios.get(`${API_BASE}/delivery-management/routes${buildQuery({ warehouse_id: warehouseId })}`, getHeaders());
    return res.data;
  },
  createRoute: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/routes`, data, getHeaders());
    return res.data;
  },
  updateRoute: async (id, data) => {
    const res = await axios.put(`${API_BASE}/delivery-management/routes/${id}`, data, getHeaders());
    return res.data;
  },
  deleteRoute: async (id) => {
    const res = await axios.delete(`${API_BASE}/delivery-management/routes/${id}`, getHeaders());
    return res.data;
  },

  // ── 8. Delivery Queue & Franchisee Destinations ──
  getHierarchyOptions: async () => {
    const res = await axios.get(`${API_BASE}/delivery-management/hierarchy-options`, getHeaders());
    return res.data;
  },
  getDeliveryQueue: async (params = {}) => {
    const res = await axios.get(`${API_BASE}/delivery-management/queue${buildQuery(params)}`, getHeaders());
    return res.data;
  },
  updateOrderPriority: async (orderId, data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/queue/${orderId}/priority`, data, getHeaders());
    return res.data;
  },
  getFranchiseeDestinations: async (districtId = null) => {
    const res = await axios.get(`${API_BASE}/delivery-management/destinations/franchisees${buildQuery({ district_id: districtId })}`, getHeaders());
    return res.data;
  },

  // ── 9. Fleet Matcher & Benchmark Check ──
  getEligibleFleet: async (params) => {
    const res = await axios.get(`${API_BASE}/delivery-management/eligible-fleet${buildQuery(params)}`, getHeaders());
    return res.data;
  },
  validateBenchmark: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/validate-benchmark`, data, getHeaders());
    return res.data;
  },

  // ── 10. Create Delivery Order / Master Trip ──
  createDeliveryOrder: async (data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/create`, data, getHeaders());
    return res.data;
  },

  // ── 11. Tracking & POD Confirmation ──
  getTrackingList: async (params = {}) => {
    const res = await axios.get(`${API_BASE}/delivery-management/tracking${buildQuery(params)}`, getHeaders());
    return res.data;
  },
  getTripDetails: async (id) => {
    const res = await axios.get(`${API_BASE}/delivery-management/tracking/${id}`, getHeaders());
    return res.data;
  },
  updateTripStatus: async (id, data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/tracking/${id}/status`, data, getHeaders());
    return res.data;
  },
  confirmStopPod: async (id, stopNumber, data) => {
    const res = await axios.post(`${API_BASE}/delivery-management/tracking/${id}/stops/${stopNumber}/pod`, data, getHeaders());
    return res.data;
  },

  // ── 12. Dashboard & Analytics ──
  getDashboardAnalytics: async (warehouseId = null) => {
    const res = await axios.get(`${API_BASE}/delivery-management/analytics/dashboard${buildQuery({ warehouse_id: warehouseId })}`, getHeaders());
    return res.data;
  },

  // ── 13. Company Warehouses List ──
  getWarehouses: async () => {
    const res = await axios.get(`${API_BASE}/delivery-management/warehouses`, getHeaders());
    return res.data;
  },

  // ── 14. Geolocation Helpers ──
  getStates: async (countryId = null) => {
    const query = countryId ? buildQuery({ country_id: countryId }) : '';
    try {
      const res = await axios.get(`${API_BASE}/geolocation/active-states${query}`, getHeaders());
      return res.data;
    } catch {
      const res = await axios.get(`${API_BASE}/geolocation/states${query}`, getHeaders());
      return res.data;
    }
  },
  getDistricts: async (stateId) => {
    const res = await axios.get(`${API_BASE}/geolocation/districts${buildQuery({ state_id: stateId })}`, getHeaders());
    return res.data;
  },

  // ── 15. Hierarchy Filters ──
  getIndustryTypes: async () => {
    try {
      const res = await axios.get(`${API_BASE}/industry-types/list?active_only=true`, getHeaders());
      return res.data;
    } catch (e) {
      console.error('Failed to get industry types', e);
      return { data: [] };
    }
  },
  getCategories: async (industryTypeId = null) => {
    try {
      const qs = industryTypeId ? `&industry_type_id=${industryTypeId}` : '';
      const res = await axios.get(`${API_BASE}/project-types/get-categories?req_for=view${qs}`, getHeaders());
      return res.data;
    } catch (e) {
      console.error('Failed to get categories', e);
      return { data: [] };
    }
  },
  getSubcategories: async (categoryId) => {
    if (!categoryId) return { data: [] };
    try {
      const res = await axios.get(`${API_BASE}/project-types/get-subcategories?category_id=${categoryId}`, getHeaders());
      return res.data;
    } catch (e) {
      console.error('Failed to get subcategories', e);
      return { data: [] };
    }
  },
  getSystemTypes: async (subcategoryId) => {
    if (!subcategoryId) return { data: [] };
    try {
      const res = await axios.get(`${API_BASE}/project-types/get-subcategory-types?subcategory_id=${subcategoryId}`, getHeaders());
      return res.data;
    } catch (e) {
      console.error('Failed to get system types', e);
      return { data: [] };
    }
  },
  getProjectRanges: async (subcategoryTypeId) => {
    if (!subcategoryTypeId) return { data: [] };
    try {
      const res = await axios.get(`${API_BASE}/project-types/get-ranges?subcategory_type_id=${subcategoryTypeId}`, getHeaders());
      return res.data;
    } catch (e) {
      console.error('Failed to get project ranges', e);
      return { data: [] };
    }
  },
};
