import axios from "axios";
import { authHeaderObj } from "../app/authHeader";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api"
).replace(/\/+$/, "");

const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
const ADMIN_API = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${API_BASE}/admin-api`;
const BASE_URL = `${ADMIN_API}/email-management`;

const getHeaders = () => {
  try {
    return authHeaderObj();
  } catch {
    return {};
  }
};

export const getDashboardOverview = async () => {
  const res = await axios.get(`${BASE_URL}/dashboard/overview`, { headers: getHeaders() });
  return res.data;
};

export const getProviders = async () => {
  const res = await axios.get(`${BASE_URL}/providers`, { headers: getHeaders() });
  return res.data;
};

export const updateProviderConfig = async (providerKey, data) => {
  const res = await axios.put(`${BASE_URL}/providers/${providerKey}`, data, { headers: getHeaders() });
  return res.data;
};

export const setDefaultProvider = async (providerKey) => {
  const res = await axios.post(`${BASE_URL}/providers/${providerKey}/set-default`, {}, { headers: getHeaders() });
  return res.data;
};

export const testProviderConnection = async (providerKey) => {
  const res = await axios.post(`${BASE_URL}/providers/${providerKey}/test`, {}, { headers: getHeaders() });
  return res.data;
};

export const sendTestEmail = async (data) => {
  const res = await axios.post(`${BASE_URL}/providers/send-test-email`, data, { headers: getHeaders() });
  return res.data;
};

export const getQuotas = async () => {
  const res = await axios.get(`${BASE_URL}/quotas`, { headers: getHeaders() });
  return res.data;
};

export const updateQuotaConfig = async (provider, data) => {
  const res = await axios.put(`${BASE_URL}/quotas/${provider}`, data, { headers: getHeaders() });
  return res.data;
};

export const resetQuotaUsage = async (provider) => {
  const res = await axios.post(`${BASE_URL}/quotas/${provider}/reset`, {}, { headers: getHeaders() });
  return res.data;
};

export const getEmailLogs = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/logs${query ? `?${query}` : ""}`, { headers: getHeaders() });
  return res.data;
};

export const getEmailLogDetail = async (id) => {
  const res = await axios.get(`${BASE_URL}/logs/${id}`, { headers: getHeaders() });
  return res.data;
};

export const getResendQueue = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await axios.get(`${BASE_URL}/resend/failed-queue${query ? `?${query}` : ""}`, { headers: getHeaders() });
  return res.data;
};

export const retrySingleEmail = async (id) => {
  const res = await axios.post(`${BASE_URL}/resend/retry-single/${id}`, {}, { headers: getHeaders() });
  return res.data;
};

export const retryBulkEmails = async (data = {}) => {
  const res = await axios.post(`${BASE_URL}/resend/retry-bulk`, data, { headers: getHeaders() });
  return res.data;
};

export const getBillingSummary = async () => {
  const res = await axios.get(`${BASE_URL}/billing/summary`, { headers: getHeaders() });
  return res.data;
};

export const createInvoice = async (data) => {
  const res = await axios.post(`${BASE_URL}/billing/invoices`, data, { headers: getHeaders() });
  return res.data;
};

export const markInvoicePaid = async (id) => {
  const res = await axios.put(`${BASE_URL}/billing/invoices/${id}/pay`, {}, { headers: getHeaders() });
  return res.data;
};

export const getDeliverabilityAnalytics = async () => {
  const res = await axios.get(`${BASE_URL}/analytics/deliverability`, { headers: getHeaders() });
  return res.data;
};

export const getProviderAnalytics = async () => {
  const res = await axios.get(`${BASE_URL}/analytics/providers`, { headers: getHeaders() });
  return res.data;
};
