import axios from "axios";
import { authHeaderObj } from "../app/authHeader";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
const ADMIN_API = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${API_BASE}/admin-api`;
const BASE_URL = `${ADMIN_API}/trial-kits`;

export const getTrialKitStock = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/stock${query ? `?${query}` : ""}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const allocateTrialKitStock = async (data) => {
  const res = await axios.post(`${BASE_URL}/stock/allocate`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const inwardTrialKitStock = async (data) => {
  const res = await axios.post(`${BASE_URL}/stock/inward`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const adjustTrialKitStock = async (data) => {
  const res = await axios.post(`${BASE_URL}/stock/adjust`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getTrialKitStockHistory = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/stock/history${query ? `?${query}` : ""}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getTrialKitOrders = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/orders${query ? `?${query}` : ""}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const updateTrialKitDelivery = async (id, data) => {
  const res = await axios.put(`${BASE_URL}/orders/${id}/delivery`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const cancelReversalTrialKitOrder = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/orders/${id}/cancel-reversal`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const reassignTrialKitBde = async (orderId, data) => {
  const res = await axios.put(`${BASE_URL}/orders/${orderId}/reassign-bde`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getTrialKitAnalyticsSummary = async () => {
  const res = await axios.get(`${BASE_URL}/analytics/summary`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getTrialKitConversionComparison = async () => {
  const res = await axios.get(`${BASE_URL}/analytics/conversion-comparison`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getHierarchyOptions = async () => {
  const res = await axios.get(`${ADMIN_API}/estimator/project-boms/hierarchy-options`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

// ── Multi-Stage Procurement & Inward Ecosystem (Warehouse ➔ Accounts ➔ Admin) ────
export const requestTrialKitInward = async (data) => {
  const res = await axios.post(`${BASE_URL}/procurement/request`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getTrialKitProcurements = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/procurement/list${query ? `?${query}` : ""}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getTrialKitProcurementDetails = async (id) => {
  const res = await axios.get(`${BASE_URL}/procurement/${id}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const recordTrialKitProcurementPayment = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/procurement/${id}/record-payment`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const approveTrialKitProcurement = async (id, data = {}) => {
  const res = await axios.post(`${BASE_URL}/procurement/${id}/approve`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const rejectTrialKitProcurement = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/procurement/${id}/reject`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getTrialKitProcurementBadgeCounts = async () => {
  const res = await axios.get(`${BASE_URL}/procurement/badge-counts`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

// ── State & District Wise Feedback Configuration APIs ────────────────────────
export const getFeedbackConfigStates = async () => {
  const res = await axios.get(`${BASE_URL}/feedback-configs/states`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getFeedbackConfigDistricts = async (stateId) => {
  const res = await axios.get(`${BASE_URL}/feedback-configs/districts?state_id=${stateId}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const saveDistrictFeedbackConfig = async (districtId, data) => {
  const res = await axios.put(`${BASE_URL}/feedback-configs/district/${districtId}`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const saveStateDefaultFeedbackConfig = async (stateId, data) => {
  const res = await axios.put(`${BASE_URL}/feedback-configs/state-default/${stateId}`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const resetDistrictFeedbackConfig = async (districtId) => {
  const res = await axios.delete(`${BASE_URL}/feedback-configs/district/${districtId}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};


