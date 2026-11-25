import axios from "axios";
import { authHeaderObj } from "../app/authHeader";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
const ADMIN_API = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${API_BASE}/admin-api`;
const BASE_URL = `${ADMIN_API}/solarshop/epc-orders`;

export const getAdminEpcOrders = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}${query ? `?${query}` : ""}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const checkAdminDuplicateUtr = async (utr, excludeOrderId = null) => {
  const params = { utr };
  if (excludeOrderId) params.exclude_order_id = excludeOrderId;
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/check-duplicate-utr?${query}`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const adminApproveEpcPayment = async (id, data) => {
  const res = await axios.post(`${BASE_URL}/${id}/admin-approve`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const getAdminPaymentTatConfig = async () => {
  const res = await axios.get(`${BASE_URL}/tat-config`, {
    headers: authHeaderObj(),
  });
  return res.data;
};

export const updateAdminPaymentTatConfig = async (data) => {
  const res = await axios.put(`${BASE_URL}/tat-config`, data, {
    headers: authHeaderObj(),
  });
  return res.data;
};
