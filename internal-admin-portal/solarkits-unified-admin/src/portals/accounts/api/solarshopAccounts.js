import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";

const API_BASE = import.meta.env.VITE_ACCOUNT_API_URL || import.meta.env.VITE_API_URL;
const BASE_URL = `${API_BASE}/accounts/solar-shop`;

export const getSolarShopDashboardStats = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/dashboard-stats${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getSolarShopRecentTransactions = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/recent-transactions${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getFranchisePlanPurchases = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/franchise-plans${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const updatePlanPaymentStatus = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/franchise-plans/${id}/status`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getDirectEpcTransactions = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/direct-epc-transactions${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getFranchiseCommissions = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/franchise-commissions${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const updateCommissionStatus = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/franchise-commissions/${id}/status`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getOnboardedEpcPurchases = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/onboarded-epc-purchases${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getTransactionDetails = async (type, id) => {
  const res = await axios.get(`${BASE_URL}/transaction-details/${type}/${id}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const verifyEpcOrderPayment = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/verify-payment`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const dispatchEpcOrder = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/dispatch`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const deliverEpcOrder = async (id) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/deliver`, {}, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getEpcPoPayments = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/epc-po-payments${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const verifyEpcPoPayment = async (poId, epcId, data) => {
  const res = await axios.post(`${BASE_URL}/epc-po-payments/${poId}/allocations/${epcId}/verify`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

// ─── Module 1: 8-Stage EPC Order Transition API Callers ──────────────────────

export const stageProcessing = async (id) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/stage/processing`, {}, { headers: authHeaderObj() });
  return res.data;
};

export const stageAssignVehicle = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/stage/assign-vehicle`, data, { headers: authHeaderObj() });
  return res.data;
};

export const stageReadyForDispatch = async (id) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/stage/ready-for-dispatch`, {}, { headers: authHeaderObj() });
  return res.data;
};

export const stageDispatched = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/stage/dispatched`, data, { headers: authHeaderObj() });
  return res.data;
};

export const stageInTransit = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/stage/in-transit`, data, { headers: authHeaderObj() });
  return res.data;
};

export const stageReachedDestination = async (id) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/stage/reached-destination`, {}, { headers: authHeaderObj() });
  return res.data;
};

export const stageDelivered = async (id) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/stage/delivered`, {}, { headers: authHeaderObj() });
  return res.data;
};

// ─── Module 1.1: FPO & Unified Order Stage Transition Callers ───────────────

export const stageFpoOrder = async (id, stage, data = {}) => {
  const res = await axios.post(`${BASE_URL}/fpo-orders/${id}/stage/${stage}`, data, { headers: authHeaderObj() });
  return res.data;
};

export const assignFpoVehicle = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/fpo-orders/${id}/stage/assign-vehicle`, data, { headers: authHeaderObj() });
  return res.data;
};

export const updateOrderDeliveryEta = async (orderType, id, data) => {
  const res = await axios.post(`${BASE_URL}/orders/${orderType || 'epc'}/${id}/update-eta`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const advanceOrderStage = async (orderType, id, stage, data = {}) => {
  const res = await axios.post(`${BASE_URL}/orders/${orderType || 'po'}/${id}/stage/${stage}`, data, { headers: authHeaderObj() });
  return res.data;
};

export const assignOrderVehicle = async (orderType, id, data) => {
  const res = await axios.post(`${BASE_URL}/orders/${orderType || 'po'}/${id}/stage/assign-vehicle`, data, { headers: authHeaderObj() });
  return res.data;
};

export const getWarehouseVehicles = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const queryStr = query ? `?${query}` : '';
  try {
    const res = await axios.get(`${BASE_URL}/warehouse-vehicles${queryStr}`, { headers: authHeaderObj() });
    return res.data;
  } catch (err) {
    try {
      const res = await axios.get(`${API_BASE}/warehouse/vehicles${queryStr}`, { headers: authHeaderObj() });
      return res.data;
    } catch (err2) {
      const adminApiUrl = import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';
      const res = await axios.get(`${adminApiUrl}/warehouse/vehicles${queryStr}`, { headers: authHeaderObj() });
      return res.data;
    }
  }
};

export const getOrderStageDetails = async (orderType, id) => {
  const res = await axios.get(`${BASE_URL}/orders/${orderType || 'po'}/${id}/stage-details`, { headers: authHeaderObj() });
  return res.data;
};

export const getOfflineOrdersForVerification = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/offline-orders${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const verifyFpoOrderPayment = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/fpo-orders/${id}/verify-payment`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getUnifiedEpcOrders = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/epc-orders-unified${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const checkDuplicateUtr = async (utr, excludeOrderId = null) => {
  const params = { utr };
  if (excludeOrderId) params.exclude_order_id = excludeOrderId;
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/epc-orders/check-duplicate-utr?${query}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const accountsVerifyEpcPayment = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/accounts-verify`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const adminApproveEpcPayment = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/epc-orders/${id}/admin-approve`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getPaymentTatConfig = async () => {
  const res = await axios.get(`${BASE_URL}/epc-orders/tat-config`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const updatePaymentTatConfig = async (data) => {
  const res = await axios.put(`${BASE_URL}/epc-orders/tat-config`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

// ── Customer Payment & Follow-up API Methods ────────────────────────────────
export const getCustomerPaymentFollowups = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/customer-payment-followups${query ? `?${query}` : ''}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const logCustomerPaymentFollowup = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/customer-payment-followups/${id}/log`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const recordMilestoneTwoPayment = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/customer-payment-followups/${id}/record-payment`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};



