import axios from 'axios';
import { getAuthToken } from '../../admin/app/authHeader';

const rawAdminBase =
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/admin-api';

export const ADMIN_API_BASE = String(rawAdminBase).replace(/\/+$/, '');
export const LEAD_MARKETING_API_BASE = `${ADMIN_API_BASE}/lead-marketing`;

export const leadMarketingHttp = axios.create({
  baseURL: LEAD_MARKETING_API_BASE,
  timeout: 60000
});

leadMarketingHttp.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = token;
  }
  return config;
});

export const extractError = (err, fallback = 'Request failed') =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

export const SEGMENT_LABELS = {
  franchisee_leads: 'Franchisee Leads',
  epc_signup_leads: 'EPC Signup Leads',
  epc_sales_leads: 'EPC Sales Leads'
};

export const SEGMENT_BADGE_COLORS = {
  franchisee_leads: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  epc_signup_leads: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  epc_sales_leads: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
};

export async function downloadLeadMarketingReport(type = 'lead_master', format = 'xlsx', params = {}) {
  const query = new URLSearchParams({ type, format });
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
      query.append(k, String(v));
    }
  });
  const res = await leadMarketingHttp.get(`/reports/export?${query.toString()}`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `solarkits_${type}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
